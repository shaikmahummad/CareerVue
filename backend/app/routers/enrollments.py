import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import StudentUser
from app.models.course import Course, CourseModule
from app.models.enrollment import Certificate, Enrollment, ModuleProgress
from app.models.payment import Payment
from app.models.user import Student

router = APIRouter(prefix="/enrollments", tags=["enrollments"])


# ── Request bodies ────────────────────────────────────────────────────────────

class EnrollBody(BaseModel):
    course_id: str


class ModuleProgressBody(BaseModel):
    module_id: str


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_student(db: AsyncSession, profile_id: uuid.UUID) -> Student:
    student = (
        await db.execute(select(Student).where(Student.profile_id == profile_id))
    ).scalar_one_or_none()
    if not student:
        student = Student(profile_id=profile_id)
        db.add(student)
        await db.commit()
        await db.refresh(student)
    return student


def _enrollment_dict(e: Enrollment, course: Course | None = None) -> dict:
    data: dict = {
        "id": str(e.id),
        "student_id": str(e.student_id),
        "course_id": str(e.course_id),
        "enrolled_at": e.enrolled_at.isoformat() if e.enrolled_at else None,
        "completed_at": e.completed_at.isoformat() if e.completed_at else None,
        "progress_pct": e.progress_pct or 0,
    }
    if course:
        data["course"] = {
            "id": str(course.id),
            "title": course.title,
            "thumbnail_url": course.thumbnail_url,
            "category": course.category,
            "level": course.level,
            "is_free": course.is_free,
            "price": float(course.price) if course.price is not None else 0.0,
        }
    return data


async def _recalculate_progress(
    db: AsyncSession, enrollment: Enrollment
) -> int:
    total = (
        await db.execute(
            select(func.count())
            .select_from(CourseModule)
            .where(CourseModule.course_id == enrollment.course_id)
        )
    ).scalar_one()

    if total == 0:
        return 0

    completed = (
        await db.execute(
            select(func.count(func.distinct(ModuleProgress.module_id)))
            .select_from(ModuleProgress)
            .where(ModuleProgress.enrollment_id == enrollment.id)
        )
    ).scalar_one()

    pct = int(completed / total * 100)
    return pct


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED)
async def enroll_in_course(
    body: EnrollBody,
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    try:
        cid = uuid.UUID(body.course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course_id")

    course = await db.get(Course, cid)
    if not course or course.status != "approved":
        raise HTTPException(status_code=404, detail="Course not found or not yet approved")

    student = await _get_student(db, current_user.id)

    # Prevent duplicate enrollment
    existing = (
        await db.execute(
            select(Enrollment).where(
                Enrollment.student_id == student.id,
                Enrollment.course_id == cid,
            )
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Already enrolled in this course")

    if not course.is_free:
        payment = (
            await db.execute(
                select(Payment).where(
                    Payment.student_id == student.id,
                    Payment.course_id == cid,
                    Payment.status == "completed",
                )
            )
        ).scalar_one_or_none()
        if not payment:
            raise HTTPException(
                status_code=402,
                detail="Payment required. Complete payment before enrolling.",
            )

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
    await db.refresh(enrollment)
    return {
        "success": True,
        "message": "Enrolled successfully",
        "data": _enrollment_dict(enrollment, course),
    }


@router.get("/mine")
async def my_enrollments(
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    student = await _get_student(db, current_user.id)
    stmt = (
        select(Enrollment, Course)
        .join(Course, Enrollment.course_id == Course.id)
        .where(Enrollment.student_id == student.id)
        .order_by(Enrollment.enrolled_at.desc())
    )
    rows = (await db.execute(stmt)).all()
    data = [_enrollment_dict(e, c) for e, c in rows]
    return {"success": True, "message": "Enrollments fetched", "data": data}


@router.get("/{enrollment_id}")
async def get_enrollment(
    enrollment_id: str,
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    try:
        eid = uuid.UUID(enrollment_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid enrollment_id")

    enrollment = await db.get(Enrollment, eid)
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    student = await _get_student(db, current_user.id)
    if enrollment.student_id != student.id:
        raise HTTPException(status_code=403, detail="Not your enrollment")

    course = await db.get(Course, enrollment.course_id)

    mp_stmt = select(ModuleProgress).where(ModuleProgress.enrollment_id == eid)
    module_progresses = (await db.execute(mp_stmt)).scalars().all()

    data = _enrollment_dict(enrollment, course)
    data["module_progress"] = [
        {
            "id": str(mp.id),
            "module_id": str(mp.module_id),
            "completed_at": mp.completed_at.isoformat() if mp.completed_at else None,
        }
        for mp in module_progresses
    ]
    return {"success": True, "message": "Enrollment detail", "data": data}


@router.put("/{enrollment_id}/progress")
async def update_module_progress(
    enrollment_id: str,
    body: ModuleProgressBody,
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    try:
        eid = uuid.UUID(enrollment_id)
        mid = uuid.UUID(body.module_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid enrollment_id or module_id")

    enrollment = await db.get(Enrollment, eid)
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    student = await _get_student(db, current_user.id)
    if enrollment.student_id != student.id:
        raise HTTPException(status_code=403, detail="Not your enrollment")

    module = await db.get(CourseModule, mid)
    if not module or module.course_id != enrollment.course_id:
        raise HTTPException(status_code=404, detail="Module not found for this course")

    await db.execute(
        pg_insert(ModuleProgress)
        .values(enrollment_id=eid, module_id=mid)
        .on_conflict_do_nothing(
            index_elements=["enrollment_id", "module_id"]
        )
    )

    pct = await _recalculate_progress(db, enrollment)
    enrollment.progress_pct = pct

    await db.commit()
    await db.refresh(enrollment)
    return {
        "success": True,
        "message": "Progress updated",
        "data": {"enrollment_id": str(eid), "progress_pct": pct},
    }


@router.post("/{enrollment_id}/complete", status_code=status.HTTP_200_OK)
async def complete_course(
    enrollment_id: str,
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    try:
        eid = uuid.UUID(enrollment_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid enrollment_id")

    enrollment = (
        await db.execute(
            select(Enrollment)
            .where(Enrollment.id == eid)
            .with_for_update()
        )
    ).scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    student = await _get_student(db, current_user.id)
    if enrollment.student_id != student.id:
        raise HTTPException(status_code=403, detail="Not your enrollment")

    actual_progress = await _recalculate_progress(db, enrollment)
    enrollment.progress_pct = actual_progress
    if actual_progress < 100:
        raise HTTPException(
            status_code=409,
            detail=(
                "Complete every course module before finishing the course. "
                f"Current progress: {actual_progress}%."
            ),
        )

    already_completed = enrollment.completed_at is not None
    certificate_id = uuid.uuid4()
    created_certificate_id = (
        await db.execute(
            pg_insert(Certificate)
            .values(
                id=certificate_id,
                student_id=student.id,
                course_id=enrollment.course_id,
            )
            .on_conflict_do_nothing(
                index_elements=["student_id", "course_id"]
            )
            .returning(Certificate.id)
        )
    ).scalar_one_or_none()

    xp_awarded = not already_completed and created_certificate_id is not None
    if xp_awarded:
        await db.execute(
            update(Student)
            .where(Student.id == student.id)
            .values(xp_points=func.coalesce(Student.xp_points, 0) + 100)
        )

    if created_certificate_id is None:
        certificate_id = (
            await db.execute(
                select(Certificate.id).where(
                    Certificate.student_id == student.id,
                    Certificate.course_id == enrollment.course_id,
                )
            )
        ).scalar_one()
    else:
        certificate_id = created_certificate_id

    if not already_completed:
        enrollment.completed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(enrollment)

    return {
        "success": True,
        "message": (
            "Course completed! Certificate issued and 100 XP awarded."
            if xp_awarded
            else "Course was already completed."
        ),
        "data": {
            "enrollment_id": str(eid),
            "completed_at": enrollment.completed_at.isoformat(),
            "progress_pct": 100,
            "certificate_id": str(certificate_id),
            "xp_awarded": 100 if xp_awarded else 0,
            "already_completed": already_completed,
        },
    }
