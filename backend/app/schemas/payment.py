import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ── Payment output ────────────────────────────────────────────────────────────

class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_id: uuid.UUID
    course_id: uuid.UUID
    amount: float
    currency: Optional[str] = None
    status: Optional[str] = None
    payment_gateway: Optional[str] = None
    gateway_payment_id: Optional[str] = None
    gateway_order_id: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


# ── Order creation ────────────────────────────────────────────────────────────

class CreateOrderRequest(BaseModel):
    course_id: uuid.UUID


class CreateOrderResponse(BaseModel):
    order_id: str
    amount: int       # amount in smallest currency unit (paise for INR)
    currency: str
    key_id: str


# ── Payment verification ──────────────────────────────────────────────────────

class VerifyPaymentRequest(BaseModel):
    course_id: uuid.UUID
    gateway_order_id: str
    gateway_payment_id: str
    gateway_signature: str
