import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import StudentUser
from app.models.enrollment import Enrollment
from app.models.social import Notification
from app.models.user import Profile, SkillProfile, Student

router = APIRouter(prefix="/students", tags=["students"])


# ── Request bodies ────────────────────────────────────────────────────────────

class StudentProfileUpdateBody(BaseModel):
    college: Optional[str] = None
    branch: Optional[str] = None
    year_of_study: Optional[int] = None
    graduation_year: Optional[int] = None
    city: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class CareerGoalBody(BaseModel):
    career_goal: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _merge_profile(profile: Profile, student: Student) -> dict:
    return {
        "id": str(profile.id),
        "role": profile.role,
        "full_name": profile.full_name,
        "email": profile.email,
        "avatar_url": profile.avatar_url,
        "phone": profile.phone,
        "profile_created_at": profile.created_at.isoformat() if profile.created_at else None,
        "college": student.college,
        "branch": student.branch,
        "year_of_study": student.year_of_study,
        "graduation_year": student.graduation_year,
        "city": student.city,
        "linkedin_url": student.linkedin_url,
        "github_url": student.github_url,
        "career_goal": student.career_goal,
        "xp_points": student.xp_points or 0,
        "streak_days": student.streak_days or 0,
        "placement_ready": student.placement_ready or False,
        "last_active": student.last_active.isoformat() if student.last_active else None,
        "student_created_at": student.created_at.isoformat() if student.created_at else None,
        "student_updated_at": student.updated_at.isoformat() if student.updated_at else None,
    }


async def _get_student_or_404(db: AsyncSession, student_id: uuid.UUID) -> Student:
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/profile")
async def get_student_profile(
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    student = await _get_student_or_404(db, current_user.id)
    data = _merge_profile(current_user, student)
    return {"success": True, "message": "Student profile fetched", "data": data}


@router.put("/profile")
async def update_student_profile(
    body: StudentProfileUpdateBody,
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    student = await _get_student_or_404(db, current_user.id)

    # Update profiles table columns
    profile_updates = body.model_dump(include={"phone", "avatar_url"}, exclude_none=True)
    for field, value in profile_updates.items():
        setattr(current_user, field, value)
    current_user.updated_at = datetime.now(timezone.utc)

    # Update students table columns
    student_fields = {"college", "branch", "year_of_study", "graduation_year", "city", "linkedin_url", "github_url"}
    student_updates = body.model_dump(include=student_fields, exclude_none=True)
    for field, value in student_updates.items():
        setattr(student, field, value)
    student.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(current_user)
    await db.refresh(student)

    data = _merge_profile(current_user, student)
    return {"success": True, "message": "Profile updated", "data": data}


@router.put("/goal")
async def set_career_goal(
    body: CareerGoalBody,
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    student = await _get_student_or_404(db, current_user.id)
    student.career_goal = body.career_goal
    student.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(student)
    return {
        "success": True,
        "message": "Career goal updated",
        "data": {"career_goal": student.career_goal},
    }


@router.get("/skill-profile")
async def get_skill_profile(
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(SkillProfile).where(SkillProfile.student_id == current_user.id)
    skills = (await db.execute(stmt)).scalars().all()
    data = [
        {
            "id": str(s.id),
            "topic": s.topic,
            "level": s.level,
            "score_pct": s.score_pct,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        }
        for s in skills
    ]
    return {"success": True, "message": "Skill profiles fetched", "data": data}


@router.get("/stats")
async def get_student_stats(
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    student = await _get_student_or_404(db, current_user.id)

    enrolled_count = (
        await db.execute(
            select(func.count())
            .select_from(Enrollment)
            .where(Enrollment.student_id == current_user.id)
        )
    ).scalar_one()

    completed_count = (
        await db.execute(
            select(func.count())
            .select_from(Enrollment)
            .where(
                Enrollment.student_id == current_user.id,
                Enrollment.completed_at.isnot(None),
            )
        )
    ).scalar_one()

    data = {
        "xp_points": student.xp_points or 0,
        "streak_days": student.streak_days or 0,
        "enrolled_count": enrolled_count,
        "completed_count": completed_count,
    }
    return {"success": True, "message": "Student stats fetched", "data": data}


@router.get("/notifications")
async def get_notifications(
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
    )
    notifications = (await db.execute(stmt)).scalars().all()
    data = [
        {
            "id": str(n.id),
            "type": n.type,
            "title": n.title,
            "body": n.body,
            "is_read": n.is_read,
            "link": n.link,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifications
    ]
    return {"success": True, "message": "Notifications fetched", "data": data}
