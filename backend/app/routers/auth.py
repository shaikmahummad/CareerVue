from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
import uuid
import hashlib
import hmac
import logging
import secrets
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.utils.supabase import supabase_admin
from app.models.user import Profile, Student, Tutor, PasswordResetOtp
from app.config import settings
from app.services.email_service import send_password_reset_otp
from app.schemas.user import ProfileOut  # noqa: F401 — available for response_model use
from app.dependencies import CurrentUser

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

OTP_TTL = timedelta(minutes=10)
RESET_TOKEN_TTL = timedelta(minutes=10)
RESEND_COOLDOWN = timedelta(seconds=60)
MAX_REQUESTS_PER_HOUR = 5
MAX_OTP_ATTEMPTS = 5
GENERIC_RESET_MESSAGE = "A code is sent to your registered mail if it exists"


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


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyResetOtpRequest(BaseModel):
    email: EmailStr
    flow_id: uuid.UUID
    code: str = Field(pattern=r"^\d{6}$")


class ResetPasswordRequest(BaseModel):
    reset_token: str = Field(min_length=32, max_length=256)
    new_password: str = Field(min_length=8, max_length=72)


def _secret_hash(flow_id: uuid.UUID, value: str) -> str:
    payload = f"{flow_id}:{value}".encode()
    return hmac.new(settings.jwt_secret.encode(), payload, hashlib.sha256).hexdigest()


def _validate_password(password: str) -> None:
    if not any(c.islower() for c in password) or not any(c.isupper() for c in password) or not any(c.isdigit() for c in password):
        raise HTTPException(
            status_code=422,
            detail="Password must contain an uppercase letter, a lowercase letter, and a number",
        )


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

    try:
        # Upsert profile (trigger may have already created it)
        await db.execute(
            pg_insert(Profile).values(
                id=user_id, role="student", full_name=body.full_name,
                email=body.email, phone=body.phone,
            ).on_conflict_do_update(
                index_elements=["id"],
                set_={"role": "student", "full_name": body.full_name,
                      "email": body.email, "phone": body.phone},
            )
        )

        # Insert or update student row (profile_id has no unique constraint, use select first)
        existing_student = (await db.execute(
            select(Student).where(Student.profile_id == user_id)
        )).scalar_one_or_none()

        if existing_student:
            existing_student.college_name = body.college
            existing_student.branch = body.branch
            existing_student.year_of_study = body.year_of_study
            existing_student.graduation_year = body.graduation_year
            existing_student.city = body.city
            existing_student.linkedin_url = body.linkedin_url
            existing_student.github_url = body.github_url
        else:
            db.add(Student(
                profile_id=user_id, college_name=body.college, branch=body.branch,
                year_of_study=body.year_of_study, graduation_year=body.graduation_year,
                city=body.city, linkedin_url=body.linkedin_url, github_url=body.github_url,
            ))

        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

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

    try:
        # Upsert profile (trigger may have already created it)
        await db.execute(
            pg_insert(Profile).values(
                id=user_id, role="tutor", full_name=body.full_name,
                email=body.email, phone=body.phone,
            ).on_conflict_do_update(
                index_elements=["id"],
                set_={"role": "tutor", "full_name": body.full_name,
                      "email": body.email, "phone": body.phone},
            )
        )

        # Insert or update tutor row (profile_id has no unique constraint, use select first)
        existing_tutor = (await db.execute(
            select(Tutor).where(Tutor.profile_id == user_id)
        )).scalar_one_or_none()

        if existing_tutor:
            existing_tutor.bio = body.bio
            existing_tutor.expertise_tags = body.expertise_tags or []
            existing_tutor.qualification = body.qualification
            existing_tutor.experience_years = body.years_experience
            existing_tutor.linkedin_url = body.linkedin_url
            existing_tutor.website_url = body.website_url
        else:
            db.add(Tutor(
                profile_id=user_id, bio=body.bio, expertise_tags=body.expertise_tags or [],
                qualification=body.qualification, experience_years=body.years_experience,
                linkedin_url=body.linkedin_url, website_url=body.website_url,
            ))

        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

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


@router.post("/forgot-password/request")
async def request_password_reset(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Create and email an OTP without revealing whether the account exists."""
    email = str(body.email).strip().lower()
    flow_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    profile = (await db.execute(select(Profile).where(Profile.email == email))).scalar_one_or_none()

    if profile:
        recent = (await db.execute(
            select(PasswordResetOtp)
            .where(PasswordResetOtp.email == email)
            .order_by(PasswordResetOtp.created_at.desc())
            .limit(MAX_REQUESTS_PER_HOUR)
        )).scalars().all()
        latest = recent[0] if recent else None
        hourly_count = sum(1 for item in recent if item.created_at and item.created_at >= now - timedelta(hours=1))

        if latest and not latest.consumed_at and latest.created_at and latest.created_at >= now - RESEND_COOLDOWN:
            flow_id = latest.id
        elif hourly_count < MAX_REQUESTS_PER_HOUR:
            otp = f"{secrets.randbelow(1_000_000):06d}"
            record = PasswordResetOtp(
                id=flow_id,
                user_id=profile.id,
                email=email,
                otp_hash=_secret_hash(flow_id, otp),
                expires_at=now + OTP_TTL,
            )
            await db.execute(
                update(PasswordResetOtp)
                .where(PasswordResetOtp.email == email, PasswordResetOtp.consumed_at.is_(None))
                .values(consumed_at=now)
            )
            db.add(record)
            await db.flush()
            try:
                await send_password_reset_otp(email, otp)
            except Exception:
                logger.exception("Unable to send password reset email")
                await db.delete(record)

    return {"success": True, "message": GENERIC_RESET_MESSAGE, "data": {"flow_id": str(flow_id)}}


@router.post("/forgot-password/verify")
async def verify_password_reset_otp(body: VerifyResetOtpRequest, db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    email = str(body.email).strip().lower()
    record = (await db.execute(
        select(PasswordResetOtp)
        .where(PasswordResetOtp.id == body.flow_id, PasswordResetOtp.email == email)
        .with_for_update()
    )).scalar_one_or_none()

    if not record or record.consumed_at or record.verified_at or record.expires_at <= now or record.attempts >= MAX_OTP_ATTEMPTS:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    record.attempts += 1
    if not hmac.compare_digest(record.otp_hash, _secret_hash(record.id, body.code)):
        if record.attempts >= MAX_OTP_ATTEMPTS:
            record.consumed_at = now
        await db.commit()
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    reset_token = secrets.token_urlsafe(48)
    record.verified_at = now
    record.reset_token_hash = _secret_hash(record.id, reset_token)
    record.reset_token_expires_at = now + RESET_TOKEN_TTL
    return {"success": True, "message": "Code verified", "data": {"reset_token": f"{record.id}.{reset_token}"}}


@router.post("/forgot-password/reset")
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    _validate_password(body.new_password)
    try:
        flow_text, token = body.reset_token.split(".", 1)
        flow_id = uuid.UUID(flow_text)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid or expired reset session")

    now = datetime.now(timezone.utc)
    record = (await db.execute(
        select(PasswordResetOtp).where(PasswordResetOtp.id == flow_id).with_for_update()
    )).scalar_one_or_none()
    if (
        not record or record.consumed_at or not record.verified_at
        or not record.reset_token_hash or not record.reset_token_expires_at
        or record.reset_token_expires_at <= now
        or not hmac.compare_digest(record.reset_token_hash, _secret_hash(flow_id, token))
    ):
        raise HTTPException(status_code=400, detail="Invalid or expired reset session")

    try:
        supabase_admin.auth.admin.update_user_by_id(str(record.user_id), {"password": body.new_password})
    except Exception:
        logger.exception("Unable to update password in Supabase")
        raise HTTPException(status_code=503, detail="Unable to reset password right now. Please try again.")

    record.consumed_at = now
    record.reset_token_hash = None
    return {"success": True, "message": "Password changed successfully", "data": None}


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
