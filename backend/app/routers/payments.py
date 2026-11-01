import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import StudentUser
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.payment import Payment
from app.models.user import Student
from app.services import payment_service

router = APIRouter(prefix="/payments", tags=["payments"])


# ── Request bodies ────────────────────────────────────────────────────────────

class CreateOrderBody(BaseModel):
    course_id: str


class VerifyPaymentBody(BaseModel):
    course_id: str
    gateway_order_id: str
    gateway_payment_id: str
    gateway_signature: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_payments_configured() -> None:
    if not settings.payments_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payments are not configured",
        )


async def _get_student(db: AsyncSession, profile_id: uuid.UUID) -> Student:
    student = (
        await db.execute(select(Student).where(Student.profile_id == profile_id))
    ).scalar_one_or_none()
    if not student:
        student_id = (
            await db.execute(
                pg_insert(Student)
                .values(profile_id=profile_id)
                .on_conflict_do_nothing(index_elements=["profile_id"])
                .returning(Student.id)
            )
        ).scalar_one_or_none()
        if student_id is not None:
            student = await db.get(Student, student_id)
        else:
            student = (
                await db.execute(
                    select(Student).where(Student.profile_id == profile_id)
                )
            ).scalar_one()
    return student


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/create-order", status_code=status.HTTP_201_CREATED)
async def create_order(
    body: CreateOrderBody,
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    _require_payments_configured()
    try:
        cid = uuid.UUID(body.course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course_id")

    course = await db.get(Course, cid)
    if not course or course.status != "approved":
        raise HTTPException(status_code=404, detail="Course not found or not approved")
    if course.is_free:
        raise HTTPException(status_code=400, detail="This course is free — enroll directly")

    student = await _get_student(db, current_user.id)

    existing_enr = (
        await db.execute(
            select(Enrollment).where(
                Enrollment.student_id == student.id,
                Enrollment.course_id == cid,
            )
        )
    ).scalar_one_or_none()
    if existing_enr:
        raise HTTPException(status_code=409, detail="Already enrolled in this course")

    amount_inr = float(course.price)
    receipt = f"course_{cid}_{student.id}"

    try:
        order = payment_service.create_order(amount_inr=amount_inr, receipt=receipt)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Payment gateway error: {exc}")

    payment = Payment(
        student_id=student.id,
        course_id=cid,
        amount=amount_inr,
        currency=order.get("currency", "INR"),
        status="pending",
        payment_gateway="razorpay",
        gateway_order_id=order["id"],
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    data = {
        "order_id": order["id"],
        "amount": order["amount"],
        "currency": order.get("currency", "INR"),
        "key_id": settings.razorpay_key_id,
        "payment_id": str(payment.id),
    }
    return {"success": True, "message": "Order created", "data": data}


@router.post("/verify")
async def verify_payment(
    body: VerifyPaymentBody,
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    _require_payments_configured()
    try:
        cid = uuid.UUID(body.course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course_id")

    is_valid = payment_service.verify_signature(
        order_id=body.gateway_order_id,
        payment_id=body.gateway_payment_id,
        signature=body.gateway_signature,
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    student = await _get_student(db, current_user.id)

    payment = (
        await db.execute(
            select(Payment).where(
                Payment.student_id == student.id,
                Payment.course_id == cid,
                Payment.gateway_order_id == body.gateway_order_id,
            )
        )
    ).scalar_one_or_none()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    payment.status = "completed"
    payment.gateway_payment_id = body.gateway_payment_id
    payment.paid_at = datetime.now(timezone.utc)

    existing_enr = (
        await db.execute(
            select(Enrollment).where(
                Enrollment.student_id == student.id,
                Enrollment.course_id == cid,
            )
        )
    ).scalar_one_or_none()

    if not existing_enr:
        enrollment = Enrollment(
            student_id=student.id,
            course_id=cid,
        )
        db.add(enrollment)

        await db.execute(
            update(Course)
            .where(Course.id == cid)
            .values(enrolled_count=Course.enrolled_count + 1)
        )

    await db.commit()
    await db.refresh(payment)

    data = {
        "payment_id": str(payment.id),
        "gateway_payment_id": payment.gateway_payment_id,
        "status": payment.status,
        "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
        "already_enrolled": existing_enr is not None,
    }
    return {"success": True, "message": "Payment verified and enrollment created", "data": data}


@router.get("/mine")
async def my_payments(
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    student = await _get_student(db, current_user.id)
    stmt = (
        select(Payment, Course)
        .join(Course, Payment.course_id == Course.id)
        .where(Payment.student_id == student.id)
        .order_by(Payment.created_at.desc())
    )
    rows = (await db.execute(stmt)).all()

    data = [
        {
            "id": str(p.id),
            "course_id": str(p.course_id),
            "course_title": c.title,
            "amount": float(p.amount),
            "currency": p.currency,
            "status": p.status,
            "payment_gateway": p.payment_gateway,
            "gateway_payment_id": p.gateway_payment_id,
            "gateway_order_id": p.gateway_order_id,
            "paid_at": p.paid_at.isoformat() if p.paid_at else None,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p, c in rows
    ]
    return {"success": True, "message": "Payment history fetched", "data": data}
