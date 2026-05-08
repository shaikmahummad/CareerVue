from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated
from uuid import UUID
from app.database import get_db
from app.middleware.auth import require_student
from app.models.course import Course, Enrollment
from app.schemas.course import EnrollmentOut

router = APIRouter(prefix="/enrollments", tags=["enrollments"])


@router.post("/{course_id}", response_model=EnrollmentOut, status_code=status.HTTP_201_CREATED)
async def enroll_in_course(
    course_id: UUID,
    user: Annotated[dict, Depends(require_student)],
    db: AsyncSession = Depends(get_db),
):
    course = await db.get(Course, course_id)
    if not course or course.status != "approved":
        raise HTTPException(status_code=404, detail="Course not found or not approved")
    if not course.is_free:
        raise HTTPException(status_code=402, detail="This is a paid course — initiate payment first")

    existing = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == UUID(user["sub"]),
            Enrollment.course_id == course_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already enrolled")

    enrollment = Enrollment(student_id=UUID(user["sub"]), course_id=course_id)
    db.add(enrollment)
    await db.commit()
    await db.refresh(enrollment)
    return enrollment


@router.get("/me", response_model=list[EnrollmentOut])
async def my_enrollments(
    user: Annotated[dict, Depends(require_student)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Enrollment).where(Enrollment.student_id == UUID(user["sub"]))
    )
    return result.scalars().all()
