"""
Saved rubrics endpoints — bookmarked responses per user.
"""
import json
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.database import get_db, SavedRubric
from api.dependencies import get_current_user

router = APIRouter(prefix="/saved", tags=["Saved Rubrics"])


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class CitationOut(BaseModel):
    source: str
    page: Optional[str] = None
    excerpt: Optional[str] = None

class SavedRubricOut(BaseModel):
    id: str
    name: str
    question: str
    answer: str
    citations: List[CitationOut] = []
    created_at: datetime

class SavedRubricIn(BaseModel):
    name: str
    question: str
    answer: str
    citations: List[dict] = []

class RenameIn(BaseModel):
    name: str


def _to_out(item: SavedRubric) -> SavedRubricOut:
    citations = []
    if item.citations_json:
        try:
            citations = [CitationOut(**c) for c in json.loads(item.citations_json)]
        except Exception:
            pass
    return SavedRubricOut(
        id=item.id,
        name=item.name,
        question=item.question,
        answer=item.answer,
        citations=citations,
        created_at=item.created_at,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=List[SavedRubricOut])
def list_saved(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all saved rubrics for the current user, newest first."""
    items = (
        db.query(SavedRubric)
        .filter(SavedRubric.user_id == current_user.id)
        .order_by(SavedRubric.created_at.desc())
        .all()
    )
    return [_to_out(i) for i in items]


@router.post("", response_model=SavedRubricOut, status_code=status.HTTP_201_CREATED)
def create_saved(
    body: SavedRubricIn,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a rubric."""
    item = SavedRubric(
        user_id=current_user.id,
        name=body.name,
        question=body.question,
        answer=body.answer,
        citations_json=json.dumps(body.citations) if body.citations else None,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_out(item)


@router.put("/{item_id}", response_model=SavedRubricOut)
def rename_saved(
    item_id: str,
    body: RenameIn,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Rename a saved rubric."""
    item = db.query(SavedRubric).filter(
        SavedRubric.id == item_id,
        SavedRubric.user_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Saved rubric not found")
    item.name = body.name
    db.commit()
    db.refresh(item)
    return _to_out(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved(
    item_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a saved rubric."""
    item = db.query(SavedRubric).filter(
        SavedRubric.id == item_id,
        SavedRubric.user_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Saved rubric not found")
    db.delete(item)
    db.commit()
