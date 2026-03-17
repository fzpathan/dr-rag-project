"""
Service layer for payments and Razorpay orchestration.
"""
import json
import time
import hmac
import hashlib
from datetime import datetime
from typing import List, Optional

import httpx
from sqlalchemy.orm import Session

from api.config import api_config
from api.database import Payment
from api.models.payment import (
    PlanSchema,
    CreateOrderResponse,
    CreateOrderRequest,
    VerifyPaymentResponse,
    PaymentRecordResponse,
)


class PaymentService:
    """Payment workflow helpers."""

    PLAN_CATALOG = [
        {
            "plan_id": "basic_monthly",
            "name": "Basic",
            "interval": "monthly",
            "price_inr": 499.0,
            "description": "Access to query history + basic support.",
        },
        {
            "plan_id": "pro_monthly",
            "name": "Pro",
            "interval": "monthly",
            "price_inr": 999.0,
            "description": "Voice assistant, analytics, and priority support.",
        },
        {
            "plan_id": "pro_yearly",
            "name": "Pro Annual",
            "interval": "yearly",
            "price_inr": 9999.0,
            "description": "One-year Pro access with two months free.",
        },
    ]

    @classmethod
    def list_plans(cls) -> List[PlanSchema]:
        return [PlanSchema(**plan) for plan in cls.PLAN_CATALOG]

    @classmethod
    def _find_plan(cls, plan_id: str) -> dict:
        for plan in cls.PLAN_CATALOG:
            if plan["plan_id"] == plan_id:
                return plan
        raise ValueError(f"Plan '{plan_id}' not found")

    @classmethod
    def _assert_provider_ready(cls) -> None:
        if not api_config.payment_provider_ready():
            raise RuntimeError("Payment provider not configured")

    @classmethod
    def create_order(cls, db: Session, user, request: CreateOrderRequest) -> CreateOrderResponse:
        cls._assert_provider_ready()
        plan = cls._find_plan(request.plan_id)
        amount_in_paise = int(plan["price_inr"] * 100)
        payload = {
            "amount": amount_in_paise,
            "currency": "INR",
            "receipt": f"{user.id}-{plan['plan_id']}-{int(time.time())}",
            "payment_capture": 1,
            "notes": {"plan": plan["plan_id"], "user": user.email},
        }

        try:
            with httpx.Client(
                base_url=api_config.RAZORPAY_BASE_URL,
                auth=(api_config.RAZORPAY_KEY_ID, api_config.RAZORPAY_KEY_SECRET),
                timeout=15.0,
            ) as client:
                response = client.post("/orders", json=payload)
                response.raise_for_status()
                order_data = response.json()
        except httpx.HTTPError as exc:
            raise RuntimeError(f"Failed to create payment order: {exc}") from exc

        payment = Payment(
            user_id=user.id,
            plan_id=plan["plan_id"],
            plan_name=plan["name"],
            provider=api_config.PAYMENT_PROVIDER,
            provider_order_id=order_data.get("id"),
            amount=amount_in_paise,
            currency=order_data.get("currency", "INR"),
            status="created",
            metadata_json=json.dumps({"order_payload": payload, "order_data": order_data}),
        )

        db.add(payment)
        db.commit()
        db.refresh(payment)

        return CreateOrderResponse(
            order_id=payment.id,
            amount_inr=payment.amount / 100,
            currency=payment.currency,
            provider=payment.provider,
            provider_order_id=payment.provider_order_id or "",
            upi_vpa=api_config.PAYMENT_UPI_VPA,
        )

    @classmethod
    def verify_payment(cls, db: Session, user, order_id: str, payment_id: str, signature: str) -> VerifyPaymentResponse:
        cls._assert_provider_ready()
        payment = (
            db.query(Payment)
            .filter(Payment.provider_order_id == order_id)
            .first()
        )

        if not payment:
            return VerifyPaymentResponse(success=False, message="Order not found")

        if payment.user_id != user.id:
            return VerifyPaymentResponse(success=False, message="Order does not belong to user")

        payload = f"{order_id}|{payment_id}"
        expected_signature = hmac.new(
            api_config.RAZORPAY_KEY_SECRET.encode(),
            payload.encode(),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected_signature, signature):
            payment.status = "failed"
            db.add(payment)
            db.commit()
            return VerifyPaymentResponse(success=False, message="Invalid signature")

        payment.status = "paid"
        payment.provider_payment_id = payment_id
        metadata = {}
        if payment.metadata_json:
            try:
                metadata = json.loads(payment.metadata_json)
            except json.JSONDecodeError:
                metadata = {}
        metadata.update({"verified_at": datetime.utcnow().isoformat()})
        payment.metadata_json = json.dumps(metadata)
        db.add(payment)
        db.commit()

        return VerifyPaymentResponse(success=True, message="Payment verified", payment_id=payment_id)

    @classmethod
    def list_user_payments(cls, db: Session, user) -> List[PaymentRecordResponse]:
        payments = (
            db.query(Payment)
            .filter(Payment.user_id == user.id)
            .order_by(Payment.created_at.desc())
            .all()
        )
        records = []
        for payment in payments:
            metadata = {}
            if payment.metadata_json:
                try:
                    metadata = json.loads(payment.metadata_json)
                except json.JSONDecodeError:
                    metadata = {}
            records.append(
                PaymentRecordResponse(
                    id=payment.id,
                    plan_id=payment.plan_id,
                    plan_name=payment.plan_name,
                    provider=payment.provider,
                    amount=payment.amount / 100,
                    currency=payment.currency,
                    status=payment.status,
                    provider_order_id=payment.provider_order_id,
                    provider_payment_id=payment.provider_payment_id,
                    metadata=metadata,
                    created_at=payment.created_at,
                    updated_at=payment.updated_at,
                )
            )
        return records
