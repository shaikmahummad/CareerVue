import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select, extract, and_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.dependencies import AdminUser
from app.models.course import Course, CourseApproval
from app.models.enrollment import Enrollment
from app.models.payment import Payment
from app.models.user import Profile, Student, Tutor

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Request bodies ────────────────────────────────────────────────────────────

class RejectionBody(BaseModel):
    rejection_note: Optional[str] = None


class RoleUpdate(BaseModel):
    role: str  # "student" | "tutor" | "admin"


# ── Helpers ───────────────────────────────────────────────────────────────────

def _course_dict(course: Course, tutor_profile: Profile | None = None) -> dict:
    data: dict = {
        "id": str(course.id),
        "title": course.title,
        "description": course.description,
        "category": course.category,
        "tags": course.tags or [],
        "level": course.level,
        "status": course.status,
        "rejection_note": course.rejection_note,
        "is_free": course.is_free,
        "price": float(course.price) if course.price is not None else 0.0,
        "enrolled_count": course.enrolled_count or 0,
        "avg_rating": float(course.avg_rating) if course.avg_rating is not None else 0.0,
        "tutor_id": str(course.tutor_id),
        "created_at": course.created_at.isoformat() if course.created_at else None,
        "updated_at": course.updated_at.isoformat() if course.updated_at else None,
    }
    if tutor_profile:
        data["tutor"] = {
            "id": str(tutor_profile.id),
            "full_name": tutor_profile.full_name,
            "email": tutor_profile.email,
            "avatar_url": tutor_profile.avatar_url,
        }
    return data


def _profile_dict(profile: Profile) -> dict:
    return {
        "id": str(profile.id),
        "role": profile.role,
        "full_name": profile.full_name,
        "email": profile.email,
        "avatar_url": profile.avatar_url,
        "phone": profile.phone,
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
    }


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard")
async def get_dashboard(
    current_user: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Return 6 high-level platform statistics:
      total_users, total_students, total_tutors, total_courses,
      total_revenue (INR, completed payments), total_enrollments
    """
    total_users = (
        await db.execute(select(func.count()).select_from(Profile))
    ).scalar_one()

    total_students = (
        await db.execute(select(func.count()).select_from(Student))
    ).scalar_one()

    total_tutors = (
        await db.execute(select(func.count()).select_from(Tutor))
    ).scalar_one()

    total_courses = (
        await db.execute(select(func.count()).select_from(Course))
    ).scalar_one()

    total_revenue_raw = (
        await db.execute(
            select(func.sum(Payment.amount)).where(Payment.status == "completed")
        )
    ).scalar_one()
    total_revenue = float(total_revenue_raw) if total_revenue_raw is not None else 0.0

    total_enrollments = (
        await db.execute(select(func.count()).select_from(Enrollment))
    ).scalar_one()

    return {
        "success": True,
        "message": "Dashboard stats fetched",
        "data": {
            "total_users": total_users,
            "total_students": total_students,
            "total_tutors": total_tutors,
            "total_courses": total_courses,
            "total_revenue": total_revenue,
            "total_enrollments": total_enrollments,
        },
    }


# ── Course management ─────────────────────────────────────────────────────────

@router.get("/courses/pending")
async def list_pending_courses(
    current_user: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """List all courses awaiting admin approval."""
    stmt = (
        select(Course, Profile)
        .join(Profile, Course.tutor_id == Profile.id)
        .where(Course.status == "pending_approval")
        .order_by(Course.created_at.desc())
    )
    rows = (await db.execute(stmt)).all()

    return {
        "success": True,
        "message": "Pending courses fetched",
        "data": [_course_dict(c, p) for c, p in rows],
    }


@router.get("/courses")
async def list_all_courses(
    current_user: AdminUser,
    db: AsyncSession = Depends(get_db),
    status: Optional[str] = None,
    category: Optional[str] = None,
    tutor_id: Optional[str] = None,
):
    """
    List all courses with optional filters.

    Query params: status, category, tutor_id
    """
    stmt = select(Course, Profile).join(Profile, Course.tutor_id == Profile.id)

    if status:
        stmt = stmt.where(Course.status == status)
    if category:
        stmt = stmt.where(Course.category == category)
    if tutor_id:
        try:
            tid = uuid.UUID(tutor_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid tutor_id")
        stmt = stmt.where(Course.tutor_id == tid)

    stmt = stmt.order_by(Course.created_at.desc())
    rows = (await db.execute(stmt)).all()

    return {
        "success": True,
        "message": "Courses fetched",
        "data": [_course_dict(c, p) for c, p in rows],
    }


@router.put("/courses/{course_id}/approve")
async def approve_course(
    course_id: str,
    current_user: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Approve a course — sets status to 'approved' and records a CourseApproval entry."""
    try:
        cid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course_id")

    course = await db.get(Course, cid)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    course.status = "approved"
    course.rejection_note = None

    approval = CourseApproval(
        course_id=cid,
        reviewed_by=current_user.id,
        status="approved",
        reviewed_at=datetime.now(timezone.utc),
    )
    db.add(approval)
    await db.commit()
    await db.refresh(course)

    return {
        "success": True,
        "message": "Course approved",
        "data": _course_dict(course),
    }


@router.put("/courses/{course_id}/reject")
async def reject_course(
    course_id: str,
    body: RejectionBody,
    current_user: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Reject a course — sets status to 'rejected' and stores the rejection note."""
    try:
        cid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course_id")

    course = await db.get(Course, cid)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    course.status = "rejected"
    course.rejection_note = body.rejection_note

    approval = CourseApproval(
        course_id=cid,
        reviewed_by=current_user.id,
        status="rejected",
        notes=body.rejection_note,
        reviewed_at=datetime.now(timezone.utc),
    )
    db.add(approval)
    await db.commit()
    await db.refresh(course)

    return {
        "success": True,
        "message": "Course rejected",
        "data": _course_dict(course),
    }


# ── User management ───────────────────────────────────────────────────────────

@router.get("/users")
async def list_users(
    current_user: AdminUser,
    db: AsyncSession = Depends(get_db),
    role: Optional[str] = None,
    search: Optional[str] = None,
):
    """
    List all user profiles with optional filters.

    Query params:
      role   — filter by exact role ("student" | "tutor" | "admin")
      search — substring match against full_name or email (case-insensitive)
    """
    stmt = select(Profile)

    if role:
        stmt = stmt.where(Profile.role == role)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            Profile.full_name.ilike(pattern) | Profile.email.ilike(pattern)
        )

    stmt = stmt.order_by(Profile.created_at.desc())
    users = (await db.execute(stmt)).scalars().all()

    return {
        "success": True,
        "message": "Users fetched",
        "data": [_profile_dict(u) for u in users],
    }


@router.put("/users/{user_id}/role")
async def change_user_role(
    user_id: str,
    body: RoleUpdate,
    current_user: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Change a user's role. Allowed values: student, tutor, admin."""
    valid_roles = {"student", "tutor", "admin"}
    if body.role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{body.role}'. Must be one of: {sorted(valid_roles)}",
        )

    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id")

    profile = await db.get(Profile, uid)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")

    profile.role = body.role
    await db.commit()
    await db.refresh(profile)

    return {
        "success": True,
        "message": f"User role updated to '{body.role}'",
        "data": _profile_dict(profile),
    }


@router.delete("/users/{user_id}")
async def deactivate_user(
    user_id: str,
    current_user: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Soft-delete / deactivate a user by setting their role to 'deactivated'.

    We do not physically delete the Profile row because it is referenced by
    courses, enrollments, payments, and other records.  Setting role to
    'deactivated' prevents login (all role-guard dependencies will reject it).
    """
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id")

    if uid == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    profile = await db.get(Profile, uid)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")

    profile.role = "deactivated"
    await db.commit()

    return {
        "success": True,
        "message": f"User {user_id} deactivated",
        "data": None,
    }


# ── Analytics ─────────────────────────────────────────────────────────────────

@router.get("/analytics")
async def get_analytics(
    current_user: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Return two analytics datasets:
      - revenue_by_month: monthly completed payment totals (last 12 months)
      - enrollments_by_category: enrollment counts grouped by course category
    """
    # ── Revenue by month ──────────────────────────────────────────────────────
    # Group completed payments by (year, month) using DB-side extraction
    revenue_stmt = (
        select(
            extract("year", Payment.paid_at).label("year"),
            extract("month", Payment.paid_at).label("month"),
            func.sum(Payment.amount).label("revenue"),
            func.count(Payment.id).label("payment_count"),
        )
        .where(Payment.status == "completed")
        .where(Payment.paid_at.isnot(None))
        .group_by(
            extract("year", Payment.paid_at),
            extract("month", Payment.paid_at),
        )
        .order_by(
            extract("year", Payment.paid_at).desc(),
            extract("month", Payment.paid_at).desc(),
        )
        .limit(12)
    )
    revenue_rows = (await db.execute(revenue_stmt)).all()

    revenue_by_month = [
        {
            "year": int(row.year),
            "month": int(row.month),
            "revenue": float(row.revenue) if row.revenue is not None else 0.0,
            "payment_count": int(row.payment_count),
        }
        for row in revenue_rows
    ]

    # ── Enrollments by category ───────────────────────────────────────────────
    enroll_stmt = (
        select(
            Course.category,
            func.count(Enrollment.id).label("enrollments"),
        )
        .join(Course, Enrollment.course_id == Course.id)
        .where(Course.category.isnot(None))
        .group_by(Course.category)
        .order_by(func.count(Enrollment.id).desc())
    )
    enroll_rows = (await db.execute(enroll_stmt)).all()

    enrollments_by_category = [
        {
            "category": row.category,
            "enrollments": int(row.enrollments),
        }
        for row in enroll_rows
    ]

    # ── Top courses by enrollment ─────────────────────────────────────────────
    top_courses_stmt = (
        select(Course)
        .where(Course.status == "approved")
        .order_by(Course.enrolled_count.desc())
        .limit(10)
    )
    top_courses = (await db.execute(top_courses_stmt)).scalars().all()

    top_courses_data = [
        {
            "id": str(c.id),
            "title": c.title,
            "category": c.category,
            "level": c.level,
            "enrolled_count": c.enrolled_count or 0,
            "avg_rating": float(c.avg_rating) if c.avg_rating is not None else 0.0,
        }
        for c in top_courses
    ]

    return {
        "success": True,
        "message": "Analytics fetched",
        "data": {
            "revenue_by_month": revenue_by_month,
            "enrollments_by_category": enrollments_by_category,
            "top_courses": top_courses_data,
        },
    }
