from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated
from uuid import UUID
from pydantic import BaseModel
from app.database import get_db
from app.middleware.auth import require_student
from app.models.course import Course, Enrollment
from app.services.payment_service import create_order, verify_payment_signature

router = APIRouter(prefix="/payments", tags=["payments"])


class PaymentOrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str
    key_id: str


class PaymentVerifyRequest(BaseModel):
    course_id: UUID
    order_id: str
    payment_id: str
    signature: str


@router.post("/create-order/{course_id}", response_model=PaymentOrderResponse)
async def create_payment_order(
    course_id: UUID,
    user: Annotated[dict, Depends(require_student)],
    db: AsyncSession = Depends(get_db),
):
    course = await db.get(Course, course_id)
    if not course or course.status != "approved":
        raise HTTPException(status_code=404, detail="Course not found")
    if course.is_free:
        raise HTTPException(status_code=400, detail="This course is free — enroll directly")

    from app.config import settings
    order = create_order(float(course.price), receipt=str(course_id))
    return PaymentOrderResponse(
        order_id=order["id"],
        amount=order["amount"],
        currency=order["currency"],
        key_id=settings.razorpay_key_id,
    )


@router.post("/verify")
async def verify_and_enroll(
    body: PaymentVerifyRequest,
    user: Annotated[dict, Depends(require_student)],
    db: AsyncSession = Depends(get_db),
):
    if not verify_payment_signature(body.order_id, body.payment_id, body.signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    existing = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == UUID(user["sub"]),
            Enrollment.course_id == body.course_id,
        )
    )
    if existing.scalar_one_or_none():
        return {"message": "Already enrolled"}

    enrollment = Enrollment(
        student_id=UUID(user["sub"]),
        course_id=body.course_id,
        payment_id=body.payment_id,
    )
    db.add(enrollment)
    await db.commit()
    return {"message": "Enrolled successfully", "enrollment_id": str(enrollment.id)}
