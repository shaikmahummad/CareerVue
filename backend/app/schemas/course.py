import uuid
from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, ConfigDict


# ── CourseModule ──────────────────────────────────────────────────────────────

class CourseModuleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    video_url: Optional[str] = None
    pdf_url: Optional[str] = None
    duration_mins: Optional[int] = None
    order_index: int
    is_preview: Optional[bool] = None


class CourseModuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    course_id: uuid.UUID
    title: str
    description: Optional[str] = None
    video_url: Optional[str] = None
    pdf_url: Optional[str] = None
    duration_mins: Optional[int] = None
    order_index: int
    is_preview: Optional[bool] = None
    created_at: Optional[datetime] = None


# ── Course ────────────────────────────────────────────────────────────────────

class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    level: Optional[str] = None
    is_free: Optional[bool] = None
    price: Optional[float] = None
    tags: Optional[list[str]] = None
    language: Optional[str] = None
    duration_hours: Optional[float] = None


class CourseUpdate(BaseModel):
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
    rejection_note: Optional[str] = None


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tutor_id: uuid.UUID
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    price: Optional[float] = None
    is_free: Optional[bool] = None
    level: Optional[str] = None
    duration_hours: Optional[float] = None
    language: Optional[str] = None
    status: Optional[str] = None
    rejection_note: Optional[str] = None
    enrolled_count: Optional[int] = None
    avg_rating: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    modules: list[CourseModuleOut] = []


class CourseListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tutor_id: uuid.UUID
    title: str
    thumbnail_url: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    is_free: Optional[bool] = None
    level: Optional[str] = None
    status: Optional[str] = None
    enrolled_count: Optional[int] = None
    avg_rating: Optional[float] = None
    created_at: Optional[datetime] = None


# ── CourseApproval ────────────────────────────────────────────────────────────

class CourseApprovalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    course_id: uuid.UUID
    reviewed_by: Optional[uuid.UUID] = None
    status: str
    notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class ApprovalAction(BaseModel):
    status: Literal["approved", "rejected"]
    notes: Optional[str] = None
