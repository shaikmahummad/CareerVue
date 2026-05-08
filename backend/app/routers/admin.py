from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated
from uuid import UUID
from app.database import get_db
from app.middleware.auth import require_admin
from app.models.course import Course
from app.models.user import User
from app.schemas.course import CourseOut, CourseApprovalUpdate
from app.schemas.user import UserOut

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/courses/pending", response_model=list[CourseOut])
async def list_pending_courses(
    _: Annotated[dict, Depends(require_admin)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Course).where(Course.status == "pending_approval"))
    return result.scalars().all()


@router.patch("/courses/{course_id}/approval", response_model=CourseOut)
async def approve_or_reject_course(
    course_id: UUID,
    body: CourseApprovalUpdate,
    _: Annotated[dict, Depends(require_admin)],
    db: AsyncSession = Depends(get_db),
):
    course = await db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course.status = body.status
    course.rejection_reason = body.rejection_reason
    await db.commit()
    await db.refresh(course)
    return course


@router.get("/users", response_model=list[UserOut])
async def list_users(
    _: Annotated[dict, Depends(require_admin)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User))
    return result.scalars().all()


@router.patch("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: UUID,
    _: Annotated[dict, Depends(require_admin)],
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    await db.commit()
    return {"message": f"User {user_id} deactivated"}
