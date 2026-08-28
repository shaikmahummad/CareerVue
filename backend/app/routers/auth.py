import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import CurrentUser
from app.models.user import EmailVerificationToken, Profile, Student, Tutor
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    ResendVerificationRequest,
    RegisterStudentRequest,
    RegisterTutorRequest,
    VerifyOtpRequest,
)
from app.utils.supabase import supabase_admin, supabase_anon
from app.services.email_verification_service import (
    RESEND_COOLDOWN,
    hash_verification_token,
    invalidate_unused_tokens,
    issue_verification_token,
    latest_token_for_user,
    send_verification_email,
)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


def _registration_options(body, role: str) -> dict:
    options = {"data": {"full_name": body.full_name, "role": role}}
    if body.email_redirect_to:
        options["email_redirect_to"] = body.email_redirect_to
    return options


def _is_duplicate_auth_error(exc: Exception) -> bool:
    code = str(getattr(exc, "code", "")).lower()
    message = str(exc).lower()
    return code in {"email_exists", "user_already_exists"} or any(
        marker in message
        for marker in ("already registered", "already exists", "email_exists")
    )


async def _email_exists(db: AsyncSession, email: str) -> bool:
    result = await db.execute(
        select(Profile.id).where(func.lower(Profile.email) == email)
    )
    return result.scalar_one_or_none() is not None


def _signup_with_verification(body, role: str) -> uuid.UUID:
    try:
        response = supabase_anon.auth.sign_up({
            "email": body.email,
            "password": body.password,
            "options": _registration_options(body, role),
        })
    except Exception as exc:
        if _is_duplicate_auth_error(exc):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            ) from None
        logger.warning("Supabase registration failed: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration could not be completed. Please check your details.",
        ) from None

    user = response.user
    # Supabase may deliberately return an obfuscated user for an existing email.
    if not user or getattr(user, "identities", None) == []:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )
    return uuid.UUID(user.id)


def _delete_auth_user(user_id: uuid.UUID) -> None:
    try:
        supabase_admin.auth.admin.delete_user(str(user_id))
    except Exception:
        logger.exception("Failed to clean up auth user after registration rollback")


async def _persist_student(
    db: AsyncSession, body: RegisterStudentRequest, user_id: uuid.UUID
) -> None:
    await db.execute(
        pg_insert(Profile).values(
            id=user_id,
            role="student",
            full_name=body.full_name,
            email=body.email,
            phone=body.phone,
        ).on_conflict_do_update(
            index_elements=["id"],
            set_={
                "role": "student",
                "full_name": body.full_name,
                "email": body.email,
                "phone": body.phone,
            },
        )
    )
    existing_student = (
        await db.execute(select(Student).where(Student.profile_id == user_id))
    ).scalar_one_or_none()
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
            profile_id=user_id,
            college_name=body.college,
            branch=body.branch,
            year_of_study=body.year_of_study,
            graduation_year=body.graduation_year,
            city=body.city,
            linkedin_url=body.linkedin_url,
            github_url=body.github_url,
        ))


async def _persist_tutor(
    db: AsyncSession, body: RegisterTutorRequest, user_id: uuid.UUID
) -> None:
    await db.execute(
        pg_insert(Profile).values(
            id=user_id,
            role="tutor",
            full_name=body.full_name,
            email=body.email,
            phone=body.phone,
        ).on_conflict_do_update(
            index_elements=["id"],
            set_={
                "role": "tutor",
                "full_name": body.full_name,
                "email": body.email,
                "phone": body.phone,
            },
        )
    )
    existing_tutor = (
        await db.execute(select(Tutor).where(Tutor.profile_id == user_id))
    ).scalar_one_or_none()
    if existing_tutor:
        existing_tutor.bio = body.bio
        existing_tutor.expertise_tags = body.expertise_tags or []
        existing_tutor.qualification = body.qualification
        existing_tutor.experience_years = body.years_experience
        existing_tutor.linkedin_url = body.linkedin_url
        existing_tutor.website_url = body.website_url
    else:
        db.add(Tutor(
            profile_id=user_id,
            bio=body.bio,
            expertise_tags=body.expertise_tags or [],
            qualification=body.qualification,
            experience_years=body.years_experience,
            linkedin_url=body.linkedin_url,
            website_url=body.website_url,
        ))


async def _persist_registration(db, body, user_id, persist) -> None:
    try:
        await persist(db, body, user_id)
        raw_token = await issue_verification_token(db, user_id)
        await db.flush()
        await send_verification_email(body.email, raw_token, body.full_name)
        await db.commit()
        return raw_token
    except IntegrityError:
        await db.rollback()
        _delete_auth_user(user_id)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        ) from None
    except Exception:
        await db.rollback()
        _delete_auth_user(user_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration could not be completed. Please try again.",
        ) from None


@router.post("/register/student", status_code=status.HTTP_201_CREATED)
async def register_student(
    body: RegisterStudentRequest,
    db: AsyncSession = Depends(get_db),
):
    if await _email_exists(db, body.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )
    user_id = _signup_with_verification(body, "student")
    await _persist_registration(db, body, user_id, _persist_student)
    return {
        "success": True,
        "message": "Registration successful. Check your email to verify your account.",
        "data": {"user_id": str(user_id)},
    }


@router.post("/register/tutor", status_code=status.HTTP_201_CREATED)
async def register_tutor(
    body: RegisterTutorRequest,
    db: AsyncSession = Depends(get_db),
):
    if await _email_exists(db, body.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )
    user_id = _signup_with_verification(body, "tutor")
    await _persist_registration(db, body, user_id, _persist_tutor)
    return {
        "success": True,
        "message": "Registration successful. Check your email to verify your account.",
        "data": {"user_id": str(user_id)},
    }


@router.get("/verify-email")
async def verify_email(
    token: str = Query(min_length=20, max_length=200),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    token_row = (
        await db.execute(
            select(EmailVerificationToken)
            .where(
                EmailVerificationToken.token_hash == hash_verification_token(token)
            )
            .with_for_update()
        )
    ).scalar_one_or_none()
    if (
        token_row is None
        or token_row.used_at is not None
        or token_row.expires_at <= now
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification link is invalid or expired.",
        )

    profile = await db.get(Profile, token_row.user_id, with_for_update=True)
    if profile is None or profile.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification link is invalid or expired.",
        )

    try:
        supabase_admin.auth.admin.update_user_by_id(
            str(profile.id), {"email_confirm": True}
        )
    except Exception:
        logger.exception("Failed to confirm Supabase auth user")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email verification is temporarily unavailable.",
        ) from None

    profile.email_verified = True
    await invalidate_unused_tokens(db, profile.id, now=now)
    await db.commit()
    return {
        "success": True,
        "message": "Email verified successfully.",
        "data": None,
    }


@router.post("/verify-otp")
async def verify_otp(
    body: VerifyOtpRequest,
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    profile = (
        await db.execute(
            select(Profile)
            .where(func.lower(Profile.email) == body.email)
            .with_for_update()
        )
    ).scalar_one_or_none()
    token_row = None
    if profile is not None:
        token_row = (
            await db.execute(
                select(EmailVerificationToken)
                .where(
                    EmailVerificationToken.user_id == profile.id,
                    EmailVerificationToken.token_hash == hash_verification_token(body.otp),
                )
                .with_for_update()
            )
        ).scalar_one_or_none()
    if (
        profile is None
        or profile.email_verified
        or token_row is None
        or token_row.used_at is not None
        or token_row.expires_at <= now
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This OTP is invalid or expired.",
        )

    try:
        supabase_admin.auth.admin.update_user_by_id(
            str(profile.id), {"email_confirm": True}
        )
    except Exception:
        logger.exception("Failed to confirm Supabase auth user")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email verification is temporarily unavailable.",
        ) from None

    profile.email_verified = True
    await invalidate_unused_tokens(db, profile.id, now=now)
    await db.commit()
    return {"success": True, "message": "Email verified successfully.", "data": None}


@router.post("/resend-verification")
async def resend_verification(
    body: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db),
):
    profile = (
        await db.execute(
            select(Profile)
            .where(func.lower(Profile.email) == body.email)
            .with_for_update()
        )
    ).scalar_one_or_none()
    generic_response = {
        "success": True,
        "message": "If the account is awaiting verification, a new email is on its way.",
        "data": None,
    }
    if profile is None or profile.email_verified:
        return generic_response

    now = datetime.now(timezone.utc)
    latest = await latest_token_for_user(db, profile.id)
    if latest and latest.created_at + RESEND_COOLDOWN > now:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait before requesting another verification email.",
        )

    await invalidate_unused_tokens(db, profile.id, now=now)
    raw_token = await issue_verification_token(db, profile.id, now=now)
    try:
        await send_verification_email(profile.email, raw_token, profile.full_name)
    except Exception:
        logger.exception("Failed to resend verification email")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Verification email could not be sent. Please try again.",
        ) from None
    await db.commit()
    return generic_response


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
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password, or the account is not verified.",
        ) from None


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
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        ) from None
