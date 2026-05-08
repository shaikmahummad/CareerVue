from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated
from uuid import UUID
from app.database import get_db
from app.middleware.auth import require_tutor, require_any
from app.models.course import Course
from app.schemas.course import CourseCreate, CourseUpdate, CourseOut

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("/", response_model=list[CourseOut])
async def list_approved_courses(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Course).where(Course.status == "approved"))
    return result.scalars().all()


@router.post("/", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
async def create_course(
    body: CourseCreate,
    user: Annotated[dict, Depends(require_tutor)],
    db: AsyncSession = Depends(get_db),
):
    course = Course(**body.model_dump(), tutor_id=UUID(user["sub"]), status="pending_approval")
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course


@router.get("/{course_id}", response_model=CourseOut)
async def get_course(course_id: UUID, db: AsyncSession = Depends(get_db)):
    course = await db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.patch("/{course_id}", response_model=CourseOut)
async def update_course(
    course_id: UUID,
    body: CourseUpdate,
    user: Annotated[dict, Depends(require_tutor)],
    db: AsyncSession = Depends(get_db),
):
    course = await db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if str(course.tutor_id) != user["sub"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not your course")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(course, field, value)
    await db.commit()
    await db.refresh(course)
    return course
