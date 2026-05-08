from pydantic import BaseModel, EmailStr, UUID4
from typing import Literal
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    role: Literal["student", "tutor"]


class UserOut(UserBase):
    id: UUID4
    role: str
    avatar_url: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class StudentProfileOut(BaseModel):
    id: UUID4
    career_goal: str | None
    placement_ready: bool

    model_config = {"from_attributes": True}


class TutorProfileOut(BaseModel):
    id: UUID4
    bio: str | None
    expertise: str | None
    is_verified: bool

    model_config = {"from_attributes": True}


class CareerGoalUpdate(BaseModel):
    career_goal: str
