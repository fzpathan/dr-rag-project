"""
Payment management endpoints.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.database import get_db
from api.dependencies import get_current_user
from api.models.payment import (
    PlanSchema,
    CreateOrderRequest,
    CreateOrderResponse,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
    PaymentRecordResponse,
)
from api.services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("/plans", response_model=List[PlanSchema])
async def get_plans():
    """Return the available plans."""
    return PaymentService.list_plans()


@router.post("/create-order", response_model=CreateOrderResponse)
async def create_order(
    request: CreateOrderRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a Razorpay order for the selected plan."""
    try:
        return PaymentService.create_order(db, current_user, request)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))


@router.post("/verify", response_model=VerifyPaymentResponse)
async def verify_payment(
    request: VerifyPaymentRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify a Razorpay payment signature and mark the payment as paid."""
    try:
        return PaymentService.verify_payment(
            db,
            current_user,
            request.order_id,
            request.payment_id,
            request.signature,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))


@router.get("/mine", response_model=List[PaymentRecordResponse])
async def list_my_payments(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return payments created by the current user."""
    return PaymentService.list_user_payments(db, current_user)
