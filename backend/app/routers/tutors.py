import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import TutorUser
from app.models.course import Course
from app.models.user import Profile, Tutor

router = APIRouter(prefix="/tutors", tags=["tutors"])


# ── Request bodies ────────────────────────────────────────────────────────────

class TutorProfileUpdateBody(BaseModel):
    bio: Optional[str] = None
    expertise_tags: Optional[list[str]] = None
    qualification: Optional[str] = None
    years_experience: Optional[int] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _merge_tutor_profile(profile: Profile, tutor: Tutor) -> dict:
    return {
        "id": str(profile.id),
        "role": profile.role,
        "full_name": profile.full_name,
        "email": profile.email,
        "avatar_url": profile.avatar_url,
        "phone": profile.phone,
        "profile_created_at": profile.created_at.isoformat() if profile.created_at else None,
        "bio": tutor.bio,
        "expertise_tags": tutor.expertise_tags or [],
        "qualification": tutor.qualification,
        "years_experience": tutor.years_experience,
        "linkedin_url": tutor.linkedin_url,
        "website_url": tutor.website_url,
        "is_verified": tutor.is_verified or False,
        "total_earnings": float(tutor.total_earnings) if tutor.total_earnings is not None else 0.0,
        "tutor_created_at": tutor.created_at.isoformat() if tutor.created_at else None,
        "tutor_updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
    }


def _course_summary(course: Course) -> dict:
    return {
        "id": str(course.id),
        "title": course.title,
        "category": course.category,
        "level": course.level,
        "status": course.status,
        "is_free": course.is_free,
        "price": float(course.price) if course.price is not None else 0.0,
        "enrolled_count": course.enrolled_count or 0,
        "avg_rating": float(course.avg_rating) if course.avg_rating is not None else 0.0,
        "thumbnail_url": course.thumbnail_url,
        "created_at": course.created_at.isoformat() if course.created_at else None,
    }


async def _get_tutor_or_404(db: AsyncSession, profile_id: uuid.UUID) -> Tutor:
    tutor = (
        await db.execute(select(Tutor).where(Tutor.profile_id == profile_id))
    ).scalar_one_or_none()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    return tutor


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/profile")
async def get_tutor_profile(
    current_user: TutorUser,
    db: AsyncSession = Depends(get_db),
):
    tutor = await _get_tutor_or_404(db, current_user.id)
    data = _merge_tutor_profile(current_user, tutor)
    return {"success": True, "message": "Tutor profile fetched", "data": data}


@router.put("/profile")
async def update_tutor_profile(
    body: TutorProfileUpdateBody,
    current_user: TutorUser,
    db: AsyncSession = Depends(get_db),
):
    tutor = await _get_tutor_or_404(db, current_user.id)

    # Update profiles table columns
    profile_fields = {"phone", "avatar_url"}
    for field in profile_fields:
        value = getattr(body, field, None)
        if value is not None:
            setattr(current_user, field, value)
    current_user.updated_at = datetime.now(timezone.utc)

    # Update tutors table columns
    tutor_fields = {"bio", "expertise_tags", "qualification", "years_experience", "linkedin_url", "website_url"}
    for field in tutor_fields:
        value = getattr(body, field, None)
        if value is not None:
            setattr(tutor, field, value)
    await db.commit()
    await db.refresh(current_user)
    await db.refresh(tutor)

    data = _merge_tutor_profile(current_user, tutor)
    return {"success": True, "message": "Tutor profile updated", "data": data}


@router.get("/courses")
async def tutor_courses(
    current_user: TutorUser,
    db: AsyncSession = Depends(get_db),
):
    tutor = await _get_tutor_or_404(db, current_user.id)
    stmt = select(Course).where(Course.tutor_id == tutor.id).order_by(Course.created_at.desc())
    courses = (await db.execute(stmt)).scalars().all()
    data = [_course_summary(c) for c in courses]
    return {"success": True, "message": "Tutor courses fetched", "data": data}


@router.get("/analytics")
async def tutor_analytics(
    current_user: TutorUser,
    db: AsyncSession = Depends(get_db),
):
    tutor = await _get_tutor_or_404(db, current_user.id)

    courses_result = (
        await db.execute(select(Course).where(Course.tutor_id == tutor.id))
    ).scalars().all()

    total_students = sum(c.enrolled_count or 0 for c in courses_result)
    courses_count = len(courses_result)

    avg_rating_values = [
        float(c.avg_rating) for c in courses_result if c.avg_rating is not None and float(c.avg_rating) > 0
    ]
    avg_rating = sum(avg_rating_values) / len(avg_rating_values) if avg_rating_values else 0.0

    status_map: dict[str, int] = {"draft": 0, "pending_approval": 0, "approved": 0, "rejected": 0}
    for c in courses_result:
        s = c.status or "draft"
        if s in status_map:
            status_map[s] += 1

    data = {
        "total_students": total_students,
        "total_earnings": float(tutor.total_earnings) if tutor.total_earnings is not None else 0.0,
        "avg_rating": round(avg_rating, 2),
        "courses_count": courses_count,
        "courses_by_status": status_map,
    }
    return {"success": True, "message": "Analytics fetched", "data": data}


@router.get("/all")
async def list_all_tutors(
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Profile, Tutor)
        .join(Tutor, Profile.id == Tutor.profile_id)
        .where(Profile.role.in_(["tutor", "admin"]))
    )
    rows = (await db.execute(stmt)).all()

    # Get course counts per tutor
    course_count_stmt = (
        select(Course.tutor_id, func.count(Course.id).label("course_count"))
        .group_by(Course.tutor_id)
    )
    course_count_rows = (await db.execute(course_count_stmt)).all()
    course_count_map = {str(row.tutor_id): row.course_count for row in course_count_rows}

    data = []
    for profile, tutor in rows:
        d = _merge_tutor_profile(profile, tutor)
        d["course_count"] = course_count_map.get(str(tutor.id), 0)
        data.append(d)

    return {"success": True, "message": "All tutors fetched", "data": data}


@router.get("/{tutor_id}")
async def get_tutor_public_profile(
    tutor_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        tid = uuid.UUID(tutor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tutor_id")

    profile = await db.get(Profile, tid)
    if not profile or profile.role not in ("tutor", "admin"):
        raise HTTPException(status_code=404, detail="Tutor not found")

    tutor = (
        await db.execute(select(Tutor).where(Tutor.profile_id == tid))
    ).scalar_one_or_none()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    # Approved courses by this tutor
    courses_stmt = (
        select(Course)
        .where(Course.tutor_id == tutor.id, Course.status == "approved")
        .order_by(Course.created_at.desc())
    )
    courses = (await db.execute(courses_stmt)).scalars().all()

    profile_data = _merge_tutor_profile(profile, tutor)
    profile_data["courses"] = [_course_summary(c) for c in courses]

    return {"success": True, "message": "Tutor profile fetched", "data": profile_data}
