"""
Pydantic models for payment endpoints.
"""
from datetime import datetime
from typing import Optional, Dict

from pydantic import BaseModel


class PlanSchema(BaseModel):
    plan_id: str
    name: str
    interval: str
    price_inr: float
    currency: str = "INR"
    description: str


class CreateOrderRequest(BaseModel):
    plan_id: str


class CreateOrderResponse(BaseModel):
    order_id: str
    amount_inr: float
    currency: str
    provider: str
    provider_order_id: str
    upi_vpa: Optional[str] = None
    expires_at: Optional[datetime] = None


class VerifyPaymentRequest(BaseModel):
    order_id: str
    payment_id: str
    signature: str


class VerifyPaymentResponse(BaseModel):
    success: bool
    message: str
    payment_id: Optional[str] = None


class PaymentRecordResponse(BaseModel):
    id: str
    plan_id: str
    plan_name: str
    provider: str
    amount: float
    currency: str
    status: str
    provider_order_id: Optional[str] = None
    provider_payment_id: Optional[str] = None
    metadata: Optional[Dict] = None
    created_at: datetime
    updated_at: datetime

