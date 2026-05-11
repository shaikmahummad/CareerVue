import uuid
from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, ConfigDict


# ── Profile ──────────────────────────────────────────────────────────────────

class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: str
    full_name: str
    email: str
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ── Student ───────────────────────────────────────────────────────────────────

class StudentCreate(BaseModel):
    college: Optional[str] = None
    branch: Optional[str] = None
    year_of_study: Optional[int] = None
    graduation_year: Optional[int] = None
    city: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    career_goal: Optional[str] = None


class StudentUpdate(BaseModel):
    college: Optional[str] = None
    branch: Optional[str] = None
    year_of_study: Optional[int] = None
    graduation_year: Optional[int] = None
    city: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    career_goal: Optional[str] = None
    xp_points: Optional[int] = None
    streak_days: Optional[int] = None
    last_active: Optional[datetime] = None
    placement_ready: Optional[bool] = None


class StudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    college: Optional[str] = None
    branch: Optional[str] = None
    year_of_study: Optional[int] = None
    graduation_year: Optional[int] = None
    city: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    career_goal: Optional[str] = None
    xp_points: Optional[int] = None
    streak_days: Optional[int] = None
    last_active: Optional[datetime] = None
    placement_ready: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ── Tutor ─────────────────────────────────────────────────────────────────────

class TutorCreate(BaseModel):
    bio: Optional[str] = None
    expertise_tags: Optional[list[str]] = None
    qualification: Optional[str] = None
    years_experience: Optional[int] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None


class TutorUpdate(BaseModel):
    bio: Optional[str] = None
    expertise_tags: Optional[list[str]] = None
    qualification: Optional[str] = None
    years_experience: Optional[int] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None
    is_verified: Optional[bool] = None
    total_earnings: Optional[float] = None


class TutorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    bio: Optional[str] = None
    expertise_tags: Optional[list[str]] = None
    qualification: Optional[str] = None
    years_experience: Optional[int] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None
    is_verified: Optional[bool] = None
    total_earnings: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ── Misc ──────────────────────────────────────────────────────────────────────

class SetCareerGoalRequest(BaseModel):
    career_goal: str


# ── SkillProfile ──────────────────────────────────────────────────────────────

class SkillProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_id: uuid.UUID
    topic: str
    level: str  # 'strong' | 'intermediate' | 'weak'
    score_pct: int
    updated_at: Optional[datetime] = None
