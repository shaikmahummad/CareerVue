import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import StudentUser, TutorUser
from app.models.course import Course, CourseApproval, CourseModule
from app.models.enrollment import Enrollment
from app.models.social import Review
from app.models.user import Profile, Student, Tutor

_optional_bearer = HTTPBearer(auto_error=False)


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_optional_bearer),
    db: AsyncSession = Depends(get_db),
) -> Optional[Profile]:
    """Return the current Profile if a valid Bearer token is supplied, else None."""
    if credentials is None:
        return None
    # Reuse the full dependency logic by temporarily building the needed inputs
    from app.utils.supabase import supabase_admin
    import uuid as _uuid
    from sqlalchemy import select as _select
    from app.models.user import Profile as _Profile

    token = credentials.credentials
    try:
        user_response = supabase_admin.auth.get_user(token)
        supabase_user = user_response.user
        if not supabase_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "UNAUTHORIZED", "message": "Invalid session."},
            )
    except HTTPException:
        raise
    except Exception as exc:
        provider_code = str(getattr(exc, "code", "")).lower()
        is_expired = "expired" in provider_code or "expired" in str(exc).lower()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "TOKEN_EXPIRED" if is_expired else "UNAUTHORIZED",
                "message": "Your session has expired." if is_expired else "Invalid session.",
            },
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    result = await db.execute(
        _select(_Profile).where(_Profile.id == _uuid.UUID(supabase_user.id))
    )
    return result.scalar_one_or_none()

router = APIRouter(prefix="/courses", tags=["courses"])


# ── Request bodies ────────────────────────────────────────────────────────────

class CourseCreateBody(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    level: Optional[str] = None
    is_free: bool = True
    price: float = 0.0
    tags: list[str] = []
    language: Optional[str] = None
    duration_hours: Optional[float] = None
    thumbnail_url: Optional[str] = None


class CourseUpdateBody(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    level: Optional[str] = None
    is_free: Optional[bool] = None
    price: Optional[float] = None
    tags: Optional[list[str]] = None
    language: Optional[str] = None
    duration_hours: Optional[float] = None
    thumbnail_url: Optional[str] = None


class ModuleCreateBody(BaseModel):
    title: str
    description: Optional[str] = None
    video_url: Optional[str] = None
    pdf_url: Optional[str] = None
    duration_mins: Optional[int] = None
    order_index: int
    is_preview: bool = False


class ModuleUpdateBody(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    video_url: Optional[str] = None
    pdf_url: Optional[str] = None
    duration_mins: Optional[int] = None
    order_index: Optional[int] = None
    is_preview: Optional[bool] = None


class ReviewCreateBody(BaseModel):
    rating: int
    comment: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _course_dict(course: Course, tutor_profile: Optional[Profile] = None) -> dict:
    return {
        "id": str(course.id),
        "tutor_id": str(course.tutor_id),
        "tutor_name": tutor_profile.full_name if tutor_profile else None,
        "tutor_avatar": tutor_profile.avatar_url if tutor_profile else None,
        "title": course.title,
        "description": course.description,
        "thumbnail_url": course.thumbnail_url,
        "category": course.category,
        "tags": course.tags or [],
        "price": float(course.price) if course.price is not None else 0.0,
        "is_free": course.is_free,
        "level": course.level,
        "duration_hours": float(course.duration_hours) if course.duration_hours is not None else None,
        "language": course.language,
        "status": course.status,
        "rejection_note": course.rejection_note,
        "enrolled_count": course.enrolled_count or 0,
        "avg_rating": float(course.avg_rating) if course.avg_rating is not None else 0.0,
        "created_at": course.created_at.isoformat() if course.created_at else None,
        "updated_at": course.updated_at.isoformat() if course.updated_at else None,
    }


def _module_dict(m: CourseModule) -> dict:
    return {
        "id": str(m.id),
        "course_id": str(m.course_id),
        "title": m.title,
        "description": m.description,
        "video_url": m.video_url,
        "pdf_url": m.pdf_url,
        "duration_mins": m.duration_mins,
        "order_index": m.order_index,
        "is_preview": m.is_preview,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


async def _get_course_or_404(db: AsyncSession, course_id: uuid.UUID) -> Course:
    course = await db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


async def _assert_owner_or_admin(course: Course, user: Profile, db: AsyncSession) -> None:
    if user.role == "admin":
        return
    tutor = (await db.execute(
        select(Tutor).where(Tutor.profile_id == user.id)
    )).scalar_one_or_none()
    if not tutor or course.tutor_id != tutor.id:
        raise HTTPException(status_code=403, detail="Not your course")


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/")
async def list_approved_courses(
    category: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    price_type: Optional[str] = Query(None, description="free or paid"),
    search: Optional[str] = Query(None),
    tutor_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Course, Profile)
        .join(Tutor, Course.tutor_id == Tutor.id)
        .join(Profile, Tutor.profile_id == Profile.id)
        .where(Course.status == "approved")
    )
    if category:
        stmt = stmt.where(Course.category == category)
    if level:
        stmt = stmt.where(Course.level == level)
    if price_type == "free":
        stmt = stmt.where(Course.is_free == True)  # noqa: E712
    elif price_type == "paid":
        stmt = stmt.where(Course.is_free == False)  # noqa: E712
    if search:
        stmt = stmt.where(Course.title.ilike(f"%{search}%"))
    if tutor_id:
        try:
            tid = uuid.UUID(tutor_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid tutor_id")
        stmt = stmt.where(Course.tutor_id == tid)

    stmt = stmt.offset((page - 1) * limit).limit(limit)
    rows = (await db.execute(stmt)).all()
    courses = [_course_dict(c, p) for c, p in rows]
    return {"success": True, "message": "Courses fetched", "data": courses}


@router.get("/search")
async def search_courses(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Course, Profile)
        .join(Tutor, Course.tutor_id == Tutor.id)
        .join(Profile, Tutor.profile_id == Profile.id)
        .where(
            Course.status == "approved",
            (Course.title.ilike(f"%{q}%")) | (Course.description.ilike(f"%{q}%")),
        )
    )
    rows = (await db.execute(stmt)).all()
    courses = [_course_dict(c, p) for c, p in rows]
    return {"success": True, "message": "Search results", "data": courses}


@router.get("/my-courses")
async def my_courses(
    current_user: TutorUser,
    db: AsyncSession = Depends(get_db),
):
    tutor = (await db.execute(
        select(Tutor).where(Tutor.profile_id == current_user.id)
    )).scalar_one_or_none()
    if not tutor:
        return {"success": True, "message": "Your courses", "data": []}
    stmt = select(Course).where(Course.tutor_id == tutor.id)
    rows = (await db.execute(stmt)).scalars().all()
    data = [_course_dict(c) for c in rows]
    return {"success": True, "message": "Your courses", "data": data}


@router.get("/{course_id}")
async def get_course(
    course_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Profile] = Depends(get_optional_user),
):
    try:
        cid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course_id")

    course = await _get_course_or_404(db, cid)

    # Access control: only approved courses are public;
    # tutors may view their own drafts; admins may view all.
    if course.status != "approved":
        if current_user is None:
            raise HTTPException(status_code=404, detail="Course not found")
        if current_user.role == "admin":
            pass  # admin sees all
        elif current_user.role == "tutor":
            tutor_row = (await db.execute(
                select(Tutor).where(Tutor.profile_id == current_user.id)
            )).scalar_one_or_none()
            if not tutor_row or course.tutor_id != tutor_row.id:
                raise HTTPException(status_code=404, detail="Course not found")
            # tutor sees own course
        else:
            raise HTTPException(status_code=404, detail="Course not found")

    # Tutor info (courses.tutor_id → tutors.id → profiles.id)
    tutor_row = (await db.execute(
        select(Tutor).where(Tutor.id == course.tutor_id)
    )).scalar_one_or_none()
    tutor_profile = await db.get(Profile, tutor_row.profile_id) if tutor_row else None

    # Modules ordered by order_index
    mod_stmt = (
        select(CourseModule)
        .where(CourseModule.course_id == cid)
        .order_by(CourseModule.order_index)
    )
    modules = (await db.execute(mod_stmt)).scalars().all()

    # Enrollment status for authenticated students
    is_enrolled = False
    if current_user and current_user.role == "student":
        student = (await db.execute(
            select(Student).where(Student.profile_id == current_user.id)
        )).scalar_one_or_none()
        if student:
            enr = (await db.execute(
                select(Enrollment).where(
                    Enrollment.student_id == student.id,
                    Enrollment.course_id == cid,
                )
            )).scalar_one_or_none()
            is_enrolled = enr is not None

    course_data = _course_dict(course, tutor_profile)
    course_data["modules"] = [_module_dict(m) for m in modules]
    course_data["is_enrolled"] = is_enrolled

    return {"success": True, "message": "Course details", "data": course_data}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_course(
    body: CourseCreateBody,
    current_user: TutorUser,
    db: AsyncSession = Depends(get_db),
):
    tutor = (await db.execute(
        select(Tutor).where(Tutor.profile_id == current_user.id)
    )).scalar_one_or_none()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    price = 0.0 if body.is_free else body.price
    course = Course(
        tutor_id=tutor.id,
        title=body.title,
        description=body.description,
        category=body.category,
        level=body.level,
        price=price,
        tags=body.tags,
        language=body.language,
        duration_hours=body.duration_hours,
        thumbnail_url=body.thumbnail_url,
        status="draft",
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return {"success": True, "message": "Course created", "data": _course_dict(course)}


@router.put("/{course_id}")
async def update_course(
    course_id: str,
    body: CourseUpdateBody,
    current_user: TutorUser,
    db: AsyncSession = Depends(get_db),
):
    try:
        cid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course_id")

    course = await _get_course_or_404(db, cid)
    await _assert_owner_or_admin(course, current_user, db)

    if course.status not in ("draft", "rejected") and current_user.role != "admin":
        raise HTTPException(
            status_code=400,
            detail="Course can only be edited when in draft or rejected status",
        )

    update_data = body.model_dump(exclude_none=True, exclude={"is_free"})
    for field, value in update_data.items():
        setattr(course, field, value)
    course.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(course)
    return {"success": True, "message": "Course updated", "data": _course_dict(course)}


@router.delete("/{course_id}", status_code=status.HTTP_200_OK)
async def delete_course(
    course_id: str,
    current_user: TutorUser,
    db: AsyncSession = Depends(get_db),
):
    try:
        cid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course_id")

    course = await _get_course_or_404(db, cid)
    await _assert_owner_or_admin(course, current_user, db)

    if course.status != "draft" and current_user.role != "admin":
        raise HTTPException(status_code=400, detail="Only draft courses can be deleted")

    await db.delete(course)
    await db.commit()
    return {"success": True, "message": "Course deleted", "data": None}


@router.post("/{course_id}/submit")
async def submit_for_approval(
    course_id: str,
    current_user: TutorUser,
    db: AsyncSession = Depends(get_db),
):
    try:
        cid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course_id")

    course = await _get_course_or_404(db, cid)
    await _assert_owner_or_admin(course, current_user, db)

    if course.status not in ("draft", "rejected"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot submit a course with status '{course.status}'",
        )

    # Must have at least one module
    mod_count = (
        await db.execute(
            select(func.count()).select_from(CourseModule).where(CourseModule.course_id == cid)
        )
    ).scalar_one()
    if mod_count == 0:
        raise HTTPException(status_code=400, detail="Add at least one module before submitting")

    course.status = "pending_approval"
    course.updated_at = datetime.utcnow()

    approval = CourseApproval(
        course_id=cid,
        status="pending",
    )
    db.add(approval)
    await db.commit()
    await db.refresh(course)
    return {"success": True, "message": "Course submitted for approval", "data": _course_dict(course)}


@router.post("/{course_id}/modules", status_code=status.HTTP_201_CREATED)
async def add_module(
    course_id: str,
    body: ModuleCreateBody,
    current_user: TutorUser,
    db: AsyncSession = Depends(get_db),
):
    try:
        cid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course_id")

    course = await _get_course_or_404(db, cid)
    await _assert_owner_or_admin(course, current_user, db)

    module = CourseModule(
        course_id=cid,
        title=body.title,
        description=body.description,
        video_url=body.video_url,
        pdf_url=body.pdf_url,
        duration_mins=body.duration_mins,
        order_index=body.order_index,
        is_preview=body.is_preview,
    )
    db.add(module)
    await db.commit()
    await db.refresh(module)
    return {"success": True, "message": "Module added", "data": _module_dict(module)}


@router.put("/{course_id}/modules/{module_id}")
async def update_module(
    course_id: str,
    module_id: str,
    body: ModuleUpdateBody,
    current_user: TutorUser,
    db: AsyncSession = Depends(get_db),
):
    try:
        cid = uuid.UUID(course_id)
        mid = uuid.UUID(module_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course_id or module_id")

    course = await _get_course_or_404(db, cid)
    await _assert_owner_or_admin(course, current_user, db)

    module = await db.get(CourseModule, mid)
    if not module or module.course_id != cid:
        raise HTTPException(status_code=404, detail="Module not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(module, field, value)

    await db.commit()
    await db.refresh(module)
    return {"success": True, "message": "Module updated", "data": _module_dict(module)}


@router.delete("/{course_id}/modules/{module_id}")
async def delete_module(
    course_id: str,
    module_id: str,
    current_user: TutorUser,
    db: AsyncSession = Depends(get_db),
):
    try:
        cid = uuid.UUID(course_id)
        mid = uuid.UUID(module_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course_id or module_id")

    course = await _get_course_or_404(db, cid)
    await _assert_owner_or_admin(course, current_user, db)

    module = await db.get(CourseModule, mid)
    if not module or module.course_id != cid:
        raise HTTPException(status_code=404, detail="Module not found")

    await db.delete(module)
    await db.commit()
    return {"success": True, "message": "Module deleted", "data": None}


@router.post("/{course_id}/reviews", status_code=status.HTTP_201_CREATED)
async def add_review(
    course_id: str,
    body: ReviewCreateBody,
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    try:
        cid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course_id")

    if body.rating < 1 or body.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    student = (await db.execute(
        select(Student).where(Student.profile_id == current_user.id)
    )).scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=403, detail="Student profile not found")

    # Must be enrolled
    enr_stmt = select(Enrollment).where(
        Enrollment.student_id == student.id,
        Enrollment.course_id == cid,
    )
    enrollment = (await db.execute(enr_stmt)).scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=403, detail="You must be enrolled to review this course")

    # Upsert review
    review_stmt = select(Review).where(
        Review.student_id == student.id,
        Review.course_id == cid,
    )
    review = (await db.execute(review_stmt)).scalar_one_or_none()

    if review:
        review.rating = body.rating
        review.comment = body.comment
    else:
        review = Review(
            student_id=student.id,
            course_id=cid,
            rating=body.rating,
            comment=body.comment,
        )
        db.add(review)

    await db.flush()

    # Recalculate avg_rating
    avg_result = await db.execute(
        select(func.avg(Review.rating)).where(Review.course_id == cid)
    )
    new_avg = avg_result.scalar_one_or_none() or 0.0

    await db.execute(
        update(Course).where(Course.id == cid).values(avg_rating=new_avg)
    )

    await db.commit()
    await db.refresh(review)

    review_data = {
        "id": str(review.id),
        "student_id": str(review.student_id),
        "course_id": str(review.course_id),
        "rating": review.rating,
        "comment": review.comment,
        "created_at": review.created_at.isoformat() if review.created_at else None,
    }
    return {"success": True, "message": "Review submitted", "data": review_data}


@router.get("/{course_id}/reviews")
async def get_reviews(
    course_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        cid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course_id")

    stmt = (
        select(Review, Profile)
        .join(Student, Review.student_id == Student.id)
        .join(Profile, Student.profile_id == Profile.id)
        .where(Review.course_id == cid)
        .order_by(Review.created_at.desc())
    )
    rows = (await db.execute(stmt)).all()

    reviews = [
        {
            "id": str(r.id),
            "student_id": str(r.student_id),
            "student_name": p.full_name,
            "student_avatar": p.avatar_url,
            "course_id": str(r.course_id),
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r, p in rows
    ]
    return {"success": True, "message": "Reviews fetched", "data": reviews}
