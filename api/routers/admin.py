"""
Admin endpoints for app settings and user management.
"""
import json
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.database import get_db, User
from api.dependencies import get_current_user, get_admin_user

router = APIRouter(prefix="/admin", tags=["Admin"])

SETTINGS_FILE = Path("/app/admin_settings.json")

DEFAULT_SETTINGS = {
    "show_advanced_options": True,
    "show_citations": True,
    "show_history": True,
    "show_saved_rubrics": True,
    "show_processing_time": True,
    "show_analysis": True,
    "theme": "default",
}


class AppSettings(BaseModel):
    show_advanced_options: bool = True
    show_citations: bool = True
    show_history: bool = True
    show_saved_rubrics: bool = True
    show_processing_time: bool = True
    show_analysis: bool = True
    theme: str = "default"


class UserSummary(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool
    is_admin: bool
    created_at: str

    class Config:
        from_attributes = True


def load_settings() -> dict:
    try:
        if SETTINGS_FILE.exists():
            return json.loads(SETTINGS_FILE.read_text())
    except Exception:
        pass
    return DEFAULT_SETTINGS.copy()


def save_settings(settings: dict):
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SETTINGS_FILE.write_text(json.dumps(settings, indent=2))


@router.get("/settings", response_model=AppSettings)
async def get_settings(current_user=Depends(get_current_user)):
    """Get current app settings. Readable by all authenticated users."""
    return load_settings()


@router.post("/settings", response_model=AppSettings)
async def update_settings(
    settings: AppSettings,
    admin=Depends(get_admin_user),
):
    """Update app settings. Admin only."""
    save_settings(settings.model_dump())
    return settings


@router.get("/users", response_model=List[UserSummary])
async def list_users(
    admin=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """List all users. Admin only."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        UserSummary(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            is_active=u.is_active,
            is_admin=u.is_admin,
            created_at=u.created_at.isoformat(),
        )
        for u in users
    ]
