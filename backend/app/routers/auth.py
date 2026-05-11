from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid

from app.database import get_db
from app.utils.supabase import supabase_admin
from app.models.user import Profile, Student, Tutor
from app.schemas.user import ProfileOut  # noqa: F401 — available for response_model use
from app.dependencies import CurrentUser

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Request schemas ────────────────────────────────────────────────────────────

class RegisterStudentRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    college: Optional[str] = None
    branch: Optional[str] = None
    year_of_study: Optional[int] = None
    graduation_year: Optional[int] = None
    city: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None


class RegisterTutorRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    bio: Optional[str] = None
    expertise_tags: Optional[list[str]] = None
    qualification: Optional[str] = None
    years_experience: Optional[int] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register/student", status_code=status.HTTP_201_CREATED)
async def register_student(
    body: RegisterStudentRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        auth_response = supabase_admin.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": True,
            "user_metadata": {"full_name": body.full_name, "role": "student"},
        })
        user_id = uuid.UUID(auth_response.user.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Registration failed: {e}")

    profile = Profile(
        id=user_id,
        role="student",
        full_name=body.full_name,
        email=body.email,
        phone=body.phone,
    )
    db.add(profile)

    student = Student(
        id=user_id,
        college=body.college,
        branch=body.branch,
        year_of_study=body.year_of_study,
        graduation_year=body.graduation_year,
        city=body.city,
        linkedin_url=body.linkedin_url,
        github_url=body.github_url,
    )
    db.add(student)
    await db.commit()

    return {
        "success": True,
        "message": "Student registered successfully",
        "data": {"user_id": str(user_id)},
    }


@router.post("/register/tutor", status_code=status.HTTP_201_CREATED)
async def register_tutor(
    body: RegisterTutorRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        auth_response = supabase_admin.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": True,
            "user_metadata": {"full_name": body.full_name, "role": "tutor"},
        })
        user_id = uuid.UUID(auth_response.user.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Registration failed: {e}")

    profile = Profile(
        id=user_id,
        role="tutor",
        full_name=body.full_name,
        email=body.email,
        phone=body.phone,
    )
    db.add(profile)

    tutor = Tutor(
        id=user_id,
        bio=body.bio,
        expertise_tags=body.expertise_tags or [],
        qualification=body.qualification,
        years_experience=body.years_experience,
        linkedin_url=body.linkedin_url,
        website_url=body.website_url,
    )
    db.add(tutor)
    await db.commit()

    return {
        "success": True,
        "message": "Tutor registered successfully",
        "data": {"user_id": str(user_id)},
    }


@router.post("/login")
async def login(body: LoginRequest):
    try:
        response = supabase_admin.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
        session = response.session
        user = response.user
        return {
            "success": True,
            "message": "Login successful",
            "data": {
                "access_token": session.access_token,
                "refresh_token": session.refresh_token,
                "token_type": "bearer",
                "expires_in": session.expires_in,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "role": user.user_metadata.get("role", "student"),
                    "full_name": user.user_metadata.get("full_name", ""),
                },
            },
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Login failed: {e}")


@router.get("/me")
async def get_me(current_user: CurrentUser):
    return {
        "success": True,
        "message": "Profile fetched",
        "data": {
            "id": str(current_user.id),
            "role": current_user.role,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "avatar_url": current_user.avatar_url,
            "phone": current_user.phone,
        },
    }


@router.post("/logout")
async def logout(current_user: CurrentUser):
    return {"success": True, "message": "Logged out successfully", "data": None}


@router.post("/refresh")
async def refresh_token(body: RefreshRequest):
    try:
        response = supabase_admin.auth.refresh_session(body.refresh_token)
        session = response.session
        return {
            "success": True,
            "message": "Token refreshed",
            "data": {
                "access_token": session.access_token,
                "refresh_token": session.refresh_token,
                "expires_in": session.expires_in,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token refresh failed: {e}")
