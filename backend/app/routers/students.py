import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
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
        "college": student.college_name,
        "branch": student.branch,
        "year_of_study": student.year_of_study,
        "graduation_year": student.graduation_year,
        "city": student.city,
        "linkedin_url": student.linkedin_url,
        "github_url": student.github_url,
        "career_goal": student.current_goal,
        "xp_points": student.xp_points or 0,
        "streak_days": student.streak_days or 0,
        "last_active": student.last_active_at.isoformat() if student.last_active_at else None,
        "student_created_at": student.created_at.isoformat() if student.created_at else None,
    }


async def _get_student_or_404(db: AsyncSession, profile_id: uuid.UUID) -> Student:
    student = (await db.execute(select(Student).where(Student.profile_id == profile_id))).scalar_one_or_none()
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

    # Update students table columns (map request field names to actual DB column names)
    if body.college is not None:
        student.college_name = body.college
    if body.branch is not None:
        student.branch = body.branch
    if body.year_of_study is not None:
        student.year_of_study = body.year_of_study
    if body.graduation_year is not None:
        student.graduation_year = body.graduation_year
    if body.city is not None:
        student.city = body.city
    if body.linkedin_url is not None:
        student.linkedin_url = body.linkedin_url
    if body.github_url is not None:
        student.github_url = body.github_url

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
    student.current_goal = body.career_goal
    await db.commit()
    await db.refresh(student)
    return {
        "success": True,
        "message": "Career goal updated",
        "data": {"career_goal": student.current_goal},
    }


@router.get("/skill-profile")
async def get_skill_profile(
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    student = await _get_student_or_404(db, current_user.id)
    skills = (await db.execute(select(SkillProfile).where(SkillProfile.student_id == student.id))).scalars().all()
    data = [
        {
            "id": str(s.id),
            "topic": s.topic,
            "level": s.level,
            "score_pct": s.score_percent,
            "assessed_at": s.assessed_at.isoformat() if s.assessed_at else None,
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

    # A streak advances once per UTC calendar day and resets after a missed day.
    now = datetime.now(timezone.utc)
    last_active = student.last_active_at
    if last_active is None:
        student.streak_days = 1
    else:
        if last_active.tzinfo is None:
            last_active = last_active.replace(tzinfo=timezone.utc)
        days = (now.date() - last_active.date()).days
        if days == 1:
            student.streak_days = (student.streak_days or 0) + 1
        elif days > 1:
            student.streak_days = 1
    student.last_active_at = now
    await db.commit()

    # Single query: count all enrollments and completed ones in one DB round-trip
    row = (
        await db.execute(
            select(
                func.count().label("enrolled_count"),
                func.count(Enrollment.completed_at).label("completed_count"),
            ).where(Enrollment.student_id == student.id)
        )
    ).one()
    enrolled_count  = row.enrolled_count
    completed_count = row.completed_count

    data = {
        "xp_points": student.xp_points or 0,
        "streak_days": student.streak_days or 0,
        "enrolled_count": enrolled_count,
        "completed_count": completed_count,
        "career_goal": student.current_goal,
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
