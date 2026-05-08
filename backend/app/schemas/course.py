from pydantic import BaseModel, UUID4
from typing import Literal
from datetime import datetime


class CourseModuleBase(BaseModel):
    title: str
    order_index: int
    video_url: str | None = None
    pdf_url: str | None = None
    duration_minutes: int | None = None


class CourseModuleOut(CourseModuleBase):
    id: UUID4
    course_id: UUID4

    model_config = {"from_attributes": True}


class CourseBase(BaseModel):
    title: str
    description: str | None = None
    is_free: bool = True
    price: float = 0.0
    skill_tags: str | None = None


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    thumbnail_url: str | None = None
    is_free: bool | None = None
    price: float | None = None
    skill_tags: str | None = None


class CourseOut(CourseBase):
    id: UUID4
    tutor_id: UUID4 | None
    thumbnail_url: str | None
    status: str
    rejection_reason: str | None
    created_at: datetime
    updated_at: datetime
    modules: list[CourseModuleOut] = []

    model_config = {"from_attributes": True}


class CourseApprovalUpdate(BaseModel):
    status: Literal["approved", "rejected"]
    rejection_reason: str | None = None


class EnrollmentOut(BaseModel):
    id: UUID4
    student_id: UUID4
    course_id: UUID4
    enrolled_at: datetime
    progress_pct: int
    completed_at: datetime | None

    model_config = {"from_attributes": True}
