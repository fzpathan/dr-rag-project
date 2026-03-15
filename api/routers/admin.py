"""
Admin endpoints for app settings and user management.
"""
import json
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.database import get_db, User
from api.dependencies import get_current_user, get_admin_user

router = APIRouter(prefix="/admin", tags=["Admin"])

SETTINGS_FILE = Path("/app/admin_settings.json")

# ── Feature keys (ACL matrix columns) ────────────────────────────────────────
FEATURE_KEYS = [
    "show_voice",
    "show_analysis",
    "show_citations",
    "show_history",
    "show_saved_rubrics",
    "show_advanced_options",
    "show_processing_time",
]

DEFAULT_SETTINGS = {
    "show_voice": True,
    "show_advanced_options": True,
    "show_citations": True,
    "show_history": True,
    "show_saved_rubrics": True,
    "show_processing_time": True,
    "show_analysis": True,
    "theme": "default",
}


class AppSettings(BaseModel):
    show_voice: bool = True
    show_advanced_options: bool = True
    show_citations: bool = True
    show_history: bool = True
    show_saved_rubrics: bool = True
    show_processing_time: bool = True
    show_analysis: bool = True
    theme: str = "default"


class UserFeatureFlags(BaseModel):
    """Per-user ACL flags. Each key matches a FEATURE_KEY; None = inherit global."""
    show_voice: Optional[bool] = None
    show_analysis: Optional[bool] = None
    show_citations: Optional[bool] = None
    show_history: Optional[bool] = None
    show_saved_rubrics: Optional[bool] = None
    show_advanced_options: Optional[bool] = None
    show_processing_time: Optional[bool] = None


class UserSummary(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool
    is_admin: bool
    created_at: str
    feature_flags: dict   # per-user ACL flags (None values = inherit global)

    class Config:
        from_attributes = True


# ── Helpers ──────────────────────────────────────────────────────────────────

def load_settings() -> dict:
    try:
        if SETTINGS_FILE.exists():
            data = json.loads(SETTINGS_FILE.read_text())
            # Back-fill any keys added after initial save
            for k, v in DEFAULT_SETTINGS.items():
                data.setdefault(k, v)
            return data
    except Exception:
        pass
    return DEFAULT_SETTINGS.copy()


def save_settings(settings: dict):
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SETTINGS_FILE.write_text(json.dumps(settings, indent=2))


def get_user_flags(user: User) -> dict:
    """Return per-user ACL flags dict (may contain None for unset keys)."""
    try:
        if user.settings_json:
            return json.loads(user.settings_json)
    except Exception:
        pass
    return {}


def effective_settings(user: User) -> dict:
    """Merge global settings with per-user overrides (user wins)."""
    base = load_settings()
    flags = get_user_flags(user)
    for key in FEATURE_KEYS:
        if flags.get(key) is not None:
            base[key] = flags[key]
    return base


# ── Global settings endpoints ─────────────────────────────────────────────────

@router.get("/settings", response_model=AppSettings)
async def get_settings(current_user=Depends(get_current_user)):
    """Global settings. Readable by all authenticated users."""
    return load_settings()


@router.post("/settings", response_model=AppSettings)
async def update_settings(settings: AppSettings, admin=Depends(get_admin_user)):
    """Update global settings. Admin only."""
    save_settings(settings.model_dump())
    return settings


# ── Effective settings for current user ──────────────────────────────────────

@router.get("/my-settings", response_model=AppSettings)
async def my_settings(
    current_user: User = Depends(get_current_user),
):
    """Return effective settings for the calling user (global merged with per-user flags)."""
    return effective_settings(current_user)


# ── Per-user ACL endpoints (admin only) ───────────────────────────────────────

@router.get("/users", response_model=List[UserSummary])
async def list_users(
    admin=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """List all users with their per-user feature flags. Admin only."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        UserSummary(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            is_active=u.is_active,
            is_admin=u.is_admin,
            created_at=u.created_at.isoformat(),
            feature_flags=get_user_flags(u),
        )
        for u in users
    ]


@router.post("/users/{user_id}/settings")
async def set_user_settings(
    user_id: str,
    flags: UserFeatureFlags,
    admin=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Set per-user feature flags (ACL). Pass null for a key to reset it to global default."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Keep only non-None values so null = "inherit global"
    new_flags = {k: v for k, v in flags.model_dump().items() if v is not None}
    # Merge with existing flags (allows partial updates)
    existing = get_user_flags(user)
    # A key explicitly set to null in the request should be removed
    for k, v in flags.model_dump().items():
        if v is None:
            existing.pop(k, None)
        else:
            existing[k] = v

    user.settings_json = json.dumps(existing)
    db.commit()
    return {"user_id": user_id, "feature_flags": existing}
