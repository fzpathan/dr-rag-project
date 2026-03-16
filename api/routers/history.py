"""
Query history endpoints — server-side persistent storage per user.
"""
import json
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.database import get_db, QueryHistory
from api.dependencies import get_current_user

router = APIRouter(prefix="/history", tags=["History"])


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class CitationOut(BaseModel):
    source: str
    page: Optional[str] = None
    excerpt: Optional[str] = None

class HistoryItemOut(BaseModel):
    id: str
    question: str
    answer: str
    citations: List[CitationOut] = []
    sources_used: List[str] = []
    cached: bool
    processing_time_ms: Optional[str] = None
    created_at: datetime

class HistoryItemIn(BaseModel):
    id: Optional[str] = None
    question: str
    answer: str
    citations: List[dict] = []
    sources_used: List[str] = []
    cached: bool = False
    processing_time_ms: Optional[str] = None


def _to_out(item: QueryHistory) -> HistoryItemOut:
    citations = []
    if item.citations_json:
        try:
            citations = [CitationOut(**c) for c in json.loads(item.citations_json)]
        except Exception:
            pass
    sources = []
    if item.sources_used:
        try:
            sources = json.loads(item.sources_used)
        except Exception:
            pass
    return HistoryItemOut(
        id=item.id,
        question=item.question,
        answer=item.answer,
        citations=citations,
        sources_used=sources,
        cached=item.cached or False,
        processing_time_ms=item.processing_time_ms,
        created_at=item.created_at,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=List[HistoryItemOut])
def get_history(
    limit: int = 100,
    offset: int = 0,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the authenticated user's query history, newest first."""
    items = (
        db.query(QueryHistory)
        .filter(QueryHistory.user_id == current_user.id)
        .order_by(QueryHistory.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [_to_out(i) for i in items]


@router.post("", response_model=HistoryItemOut, status_code=status.HTTP_201_CREATED)
def save_history_item(
    body: HistoryItemIn,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a query result to history (called by mobile after streaming completes)."""
    item = QueryHistory(
        id=body.id or None,
        user_id=current_user.id,
        question=body.question,
        answer=body.answer,
        citations_json=json.dumps(body.citations) if body.citations else None,
        sources_used=json.dumps(body.sources_used) if body.sources_used else None,
        cached=body.cached,
        processing_time_ms=body.processing_time_ms,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_out(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_history_item(
    item_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a single history entry (only the owning user can delete)."""
    item = db.query(QueryHistory).filter(
        QueryHistory.id == item_id,
        QueryHistory.user_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="History item not found")
    db.delete(item)
    db.commit()


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_history(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete all history for the current user."""
    db.query(QueryHistory).filter(QueryHistory.user_id == current_user.id).delete()
    db.commit()
