from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated
from uuid import UUID
from app.database import get_db
from app.middleware.auth import get_current_user, require_student
from app.models.user import StudentProfile
from app.schemas.user import StudentProfileOut, CareerGoalUpdate

router = APIRouter(prefix="/students", tags=["students"])


@router.get("/me", response_model=StudentProfileOut)
async def get_my_profile(
    user: Annotated[dict, Depends(require_student)],
    db: AsyncSession = Depends(get_db),
):
    student_id = user["sub"]
    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == UUID(student_id)))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return profile


@router.patch("/me/career-goal", response_model=StudentProfileOut)
async def set_career_goal(
    body: CareerGoalUpdate,
    user: Annotated[dict, Depends(require_student)],
    db: AsyncSession = Depends(get_db),
):
    student_id = user["sub"]
    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == UUID(student_id)))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    profile.career_goal = body.career_goal
    await db.commit()
    await db.refresh(profile)
    return profile
