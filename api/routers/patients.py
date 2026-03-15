"""
Patient records endpoints — doctor-facing, strict per-user isolation.
"""
import json
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.database import get_db, Patient, PatientQuery, QueryHistory
from api.dependencies import get_current_user

router = APIRouter(prefix="/patients", tags=["Patients"])


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class PatientIn(BaseModel):
    name: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    contact: Optional[str] = None
    notes: Optional[str] = None

class PatientOut(BaseModel):
    id: str
    name: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    contact: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class PatientQueryLinkIn(BaseModel):
    query_history_id: str

class PatientQueryOut(BaseModel):
    id: str
    query_history_id: str
    question: str
    answer: str
    created_at: datetime


def _to_out(p: Patient) -> PatientOut:
    return PatientOut(
        id=p.id,
        name=p.name,
        date_of_birth=p.date_of_birth,
        gender=p.gender,
        contact=p.contact,
        notes=p.notes,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=List[PatientOut])
def list_patients(
    search: Optional[str] = Query(None, description="Search by name"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all patients belonging to the current doctor, optionally filtered by name."""
    q = db.query(Patient).filter(Patient.user_id == current_user.id)
    if search:
        q = q.filter(Patient.name.ilike(f"%{search}%"))
    return [_to_out(p) for p in q.order_by(Patient.name).all()]


@router.post("", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def create_patient(
    body: PatientIn,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new patient record."""
    patient = Patient(
        user_id=current_user.id,
        name=body.name,
        date_of_birth=body.date_of_birth,
        gender=body.gender,
        contact=body.contact,
        notes=body.notes,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return _to_out(patient)


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(
    patient_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single patient record."""
    p = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.user_id == current_user.id,
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    return _to_out(p)


@router.put("/{patient_id}", response_model=PatientOut)
def update_patient(
    patient_id: str,
    body: PatientIn,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a patient record."""
    p = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.user_id == current_user.id,
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    p.name = body.name
    p.date_of_birth = body.date_of_birth
    p.gender = body.gender
    p.contact = body.contact
    p.notes = body.notes
    p.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(p)
    return _to_out(p)


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(
    patient_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a patient and all their linked queries."""
    p = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.user_id == current_user.id,
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    db.query(PatientQuery).filter(PatientQuery.patient_id == patient_id).delete()
    db.delete(p)
    db.commit()


@router.get("/{patient_id}/queries", response_model=List[PatientQueryOut])
def get_patient_queries(
    patient_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all queries linked to a patient."""
    p = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.user_id == current_user.id,
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")

    links = (
        db.query(PatientQuery)
        .filter(PatientQuery.patient_id == patient_id)
        .order_by(PatientQuery.created_at.desc())
        .all()
    )
    result = []
    for link in links:
        qh = db.query(QueryHistory).filter(QueryHistory.id == link.query_history_id).first()
        if qh:
            result.append(PatientQueryOut(
                id=link.id,
                query_history_id=qh.id,
                question=qh.question,
                answer=qh.answer,
                created_at=link.created_at,
            ))
    return result


@router.post("/{patient_id}/queries", status_code=status.HTTP_201_CREATED)
def link_query_to_patient(
    patient_id: str,
    body: PatientQueryLinkIn,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Link an existing query history entry to a patient."""
    p = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.user_id == current_user.id,
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")

    qh = db.query(QueryHistory).filter(
        QueryHistory.id == body.query_history_id,
        QueryHistory.user_id == current_user.id,
    ).first()
    if not qh:
        raise HTTPException(status_code=404, detail="Query history item not found")

    link = PatientQuery(
        patient_id=patient_id,
        query_history_id=body.query_history_id,
        user_id=current_user.id,
    )
    db.add(link)
    db.commit()
    return {"status": "linked"}
