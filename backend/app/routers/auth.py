import asyncio
import logging
import uuid
from contextlib import suppress
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal, get_db
from app.dependencies import CurrentUser
from app.models.user import (
    EmailVerificationToken,
    PendingRegistration,
    Profile,
    Student,
    Tutor,
)
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    ResendVerificationRequest,
    RegisterStudentRequest,
    RegisterTutorRequest,
    VerifyOtpRequest,
)
from app.utils.supabase import supabase_admin, supabase_auth
from app.services.email_verification_service import (
    RESEND_COOLDOWN,
    hash_verification_token,
    invalidate_unused_tokens,
    issue_verification_token,
    latest_token_for_user,
    log_auth_event,
    send_verification_email,
)
from app.services.registration_service import (
    activate_pending_registration,
    pending_registration_for_email,
    reconcile_pending_registration,
)
from app.utils.storage import BUCKETS, delete_file, ensure_public_bucket, upload_file


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])
MAX_OTP_ATTEMPTS = 5
PENDING = "PENDING"
OTP_SENT = "OTP_SENT"
OTP_SEND_FAILED = "OTP_SEND_FAILED"
MAX_AVATAR_BYTES = 5 * 1024 * 1024
AVATAR_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


def _auth_error(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={"code": code, "message": message},
    )


def _provider_error_code(exc: Exception) -> str:
    return str(getattr(exc, "code", "")).strip().lower()


def _provider_email_verified(user) -> bool:
    return bool(
        getattr(user, "email_confirmed_at", None)
        or getattr(user, "confirmed_at", None)
    )


def _safe_error(exc: Exception) -> str:
    return f"{type(exc).__name__}: {str(exc)[:200]}"


def _registration_options(body, role: str) -> dict:
    return {"full_name": body.full_name, "role": role}


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


async def _pending_registration_for_email(db: AsyncSession, email: str):
    return await pending_registration_for_email(db, email)


async def _cleanup_expired_pending_registrations(db: AsyncSession) -> None:
    # Pending registrations are retained until the user completes verification
    # or explicitly deletes the account. Individual OTPs still expire.
    return


async def cleanup_expired_pending_registrations() -> None:
    async with AsyncSessionLocal() as db:
        await _cleanup_expired_pending_registrations(db)


def _signup_with_verification(body, role: str) -> uuid.UUID:
    try:
        # Admin creation does not trigger Supabase's built-in confirmation
        # email. Verification is owned by the application OTP flow below.
        response = supabase_admin.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": False,
            "user_metadata": _registration_options(body, role),
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
    pending = PendingRegistration(
        user_id=user_id,
        email=body.email,
        role=persist.__name__.removeprefix("_persist_"),
        registration_data=body.model_dump(
            exclude={"password", "confirm_password"}
        ),
        status=PENDING,
        expires_at=None,
    )
    committed = False
    try:
        db.add(pending)
        raw_token = await issue_verification_token(db, user_id)
        await db.flush()
        await db.commit()
        committed = True
        log_auth_event("OTP_GENERATED", user_id)
        try:
            await send_verification_email(
                body.email, raw_token, body.full_name, registration_id=user_id
            )
        except Exception as exc:
            pending.status = OTP_SEND_FAILED
            pending.last_error = _safe_error(exc)
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Verification OTP could not be sent. Please try again.",
            ) from None
        pending.status = OTP_SENT
        pending.last_error = None
    except IntegrityError:
        await db.rollback()
        logger.error(
            "Registration persistence failed after Auth user creation; "
            "retaining Auth user_id=%s for explicit account cleanup",
            user_id,
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        ) from None
    except HTTPException:
        raise
    except Exception:
        await db.rollback()
        if not committed:
            logger.error(
                "Registration setup failed after Auth user creation; "
                "retaining Auth user_id=%s for explicit account cleanup",
                user_id,
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Verification OTP could not be sent. Please try again.",
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
    await _cleanup_expired_pending_registrations(db)
    pending = await _pending_registration_for_email(db, body.email)
    if pending:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email verification is already pending for this account. Request a new OTP if needed.",
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
    await _cleanup_expired_pending_registrations(db)
    pending = await _pending_registration_for_email(db, body.email)
    if pending:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email verification is already pending for this account. Request a new OTP if needed.",
        )
    user_id = _signup_with_verification(body, "tutor")
    await _persist_registration(db, body, user_id, _persist_tutor)
    return {
        "success": True,
        "message": "Registration successful. Check your email to verify your account.",
        "data": {"user_id": str(user_id)},
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
    pending = await _pending_registration_for_email(db, body.email)
    if profile is not None and pending is not None and profile.id != pending.user_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Account registration state is inconsistent.",
        )
    user_id = profile.id if profile else pending.user_id if pending else None
    token_row = None
    if user_id:
        token_row = (
            await db.execute(
                select(EmailVerificationToken)
                .where(
                    EmailVerificationToken.user_id == user_id,
                    EmailVerificationToken.token_hash == hash_verification_token(body.otp),
                )
                .with_for_update()
            )
        ).scalar_one_or_none()
    if token_row is not None and getattr(token_row, "attempt_count", 0) >= MAX_OTP_ATTEMPTS:
        token_row.used_at = now
        await db.commit()
    if (
        user_id is None
        or (profile is not None and getattr(profile, "email_verified", False))
        or token_row is None
        or token_row.used_at is not None
        or token_row.expires_at <= now
    ):
        log_auth_event(
            "OTP_EXPIRED" if token_row is not None and token_row.expires_at <= now
            else "OTP_VERIFICATION_FAILED",
            user_id,
        )
        if user_id and token_row is None:
            latest = await latest_token_for_user(db, user_id)
            if latest:
                latest.attempt_count = getattr(latest, "attempt_count", 0) + 1
                if latest.attempt_count >= MAX_OTP_ATTEMPTS:
                    latest.used_at = now
                await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This OTP is invalid or expired.",
        )

    try:
        supabase_admin.auth.admin.update_user_by_id(
            str(user_id), {"email_confirm": True}
        )
    except Exception:
        logger.exception("Failed to confirm Supabase auth user")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email verification is temporarily unavailable.",
        ) from None

    if pending:
        profile = await activate_pending_registration(db, pending, profile)
    else:
        profile.email_verified = True
    await invalidate_unused_tokens(db, user_id, now=now)
    await db.commit()
    log_auth_event("REGISTRATION_COMPLETED", user_id)
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
    pending = None if profile else await _pending_registration_for_email(db, body.email)
    generic_response = {
        "success": True,
        "message": "If the account is awaiting verification, a new OTP is on its way.",
        "data": None,
    }
    if (profile is None and pending is None) or (
        profile and getattr(profile, "email_verified", False)
    ):
        return generic_response

    now = datetime.now(timezone.utc)
    user_id = getattr(profile, "id", None) if profile else pending.user_id
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification is required. Enter the OTP sent to your email.",
        )
    latest = await latest_token_for_user(db, user_id)
    if latest and latest.created_at + RESEND_COOLDOWN > now:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait before requesting another OTP.",
        )

    await invalidate_unused_tokens(db, user_id, now=now)
    raw_token = await issue_verification_token(db, user_id, now=now)
    if pending:
        pending.status = PENDING
        pending.last_error = None
    await db.commit()
    log_auth_event("OTP_GENERATED", user_id)
    recipient_name = (
        getattr(profile, "full_name", "")
        if profile
        else pending.registration_data["full_name"]
    )
    try:
        await send_verification_email(
            body.email, raw_token, recipient_name, registration_id=user_id
        )
    except Exception as exc:
        logger.exception("Failed to resend verification OTP")
        if pending:
            pending.status = OTP_SEND_FAILED
            pending.last_error = _safe_error(exc)
            await db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Verification OTP could not be sent. Please try again.",
        ) from None
    if pending:
        pending.status = OTP_SENT
        pending.last_error = None
    return generic_response


@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    profile = (
        await db.execute(
            select(Profile)
            .where(func.lower(Profile.email) == body.email)
            .with_for_update()
        )
    ).scalar_one_or_none()
    pending = None if profile else await _pending_registration_for_email(db, body.email)

    # Authenticate first. Verification state must not be disclosed and OTPs
    # must not be issued until the caller has supplied the correct password.
    try:
        response = supabase_auth.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except Exception as exc:
        provider_code = _provider_error_code(exc)
        provider_message = str(exc).lower()
        if provider_code == "email_not_confirmed" or "email not confirmed" in provider_message:
            if pending or (profile is not None and not getattr(profile, "email_verified", False)):
                raise _auth_error(
                    status.HTTP_403_FORBIDDEN,
                    "ACCOUNT_NOT_VERIFIED",
                    "Email verification is required. Enter your registration OTP or request a new one.",
                ) from None
            if profile is not None and getattr(profile, "email_verified", False):
                logger.error(
                    "Verification state mismatch for user_id=%s: profile verified, provider unconfirmed",
                    profile.id,
                )
                raise _auth_error(
                    status.HTTP_503_SERVICE_UNAVAILABLE,
                    "ACCOUNT_STATE_INCONSISTENT",
                    "Your account verification state could not be confirmed. Please contact support.",
                ) from None
        raise _auth_error(
            status.HTTP_401_UNAUTHORIZED,
            "INVALID_CREDENTIALS",
            "Invalid email or password.",
        ) from None

    session = response.session
    user = response.user
    if not session or not user:
        raise _auth_error(
            status.HTTP_401_UNAUTHORIZED,
            "INVALID_CREDENTIALS",
            "Invalid email or password.",
        )
    if not _provider_email_verified(user):
        raise _auth_error(
            status.HTTP_403_FORBIDDEN,
            "ACCOUNT_NOT_VERIFIED",
            "Email verification is required. Enter your registration OTP or request a new one.",
        )
    if not profile:
        # A provider identity without an application profile cannot be safely
        # assigned a role. Never create a duplicate or guess the account type.
        raise _auth_error(
            status.HTTP_409_CONFLICT,
            "ACCOUNT_SETUP_INCOMPLETE",
            "Your account setup is incomplete. Please contact support.",
        )
    if profile.role not in {"student", "tutor", "admin"}:
        raise _auth_error(
            status.HTTP_403_FORBIDDEN,
            "ACCOUNT_DISABLED",
            "This account is disabled. Please contact support.",
        )
    profile = await reconcile_pending_registration(db, profile)
    if not getattr(profile, "email_verified", False):
        profile.email_verified = True
        log_auth_event("VERIFICATION_STATE_RECONCILED", profile.id)
    await db.commit()

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
                "role": profile.role,
                "full_name": profile.full_name,
            },
        },
    }


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


@router.post("/profile/avatar")
async def upload_profile_avatar(
    current_user: CurrentUser,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    content_type = (file.content_type or "").lower()
    extension = AVATAR_CONTENT_TYPES.get(content_type)
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile photo must be a JPG, PNG, or WebP image.",
        )

    contents = await file.read(MAX_AVATAR_BYTES + 1)
    await file.close()
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile photo cannot be empty.",
        )
    if len(contents) > MAX_AVATAR_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Profile photo must be 5 MB or smaller.",
        )

    bucket = BUCKETS["avatars"]
    path = f"profiles/{current_user.id}/{uuid.uuid4()}.{extension}"
    try:
        await asyncio.to_thread(
            ensure_public_bucket,
            bucket,
            file_size_limit=MAX_AVATAR_BYTES,
            allowed_mime_types=list(AVATAR_CONTENT_TYPES),
        )
        avatar_url = await asyncio.to_thread(
            upload_file, bucket, path, contents, content_type
        )
    except Exception:
        logger.exception("Profile avatar upload failed for user_id=%s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Profile photo upload is temporarily unavailable.",
        ) from None

    previous_url = current_user.avatar_url
    current_user.avatar_url = avatar_url
    try:
        await db.commit()
        await db.refresh(current_user)
    except Exception:
        with suppress(Exception):
            await asyncio.to_thread(delete_file, bucket, path)
        raise

    marker = f"/storage/v1/object/public/{bucket}/"
    if previous_url and marker in previous_url:
        previous_path = previous_url.split(marker, 1)[1]
        if previous_path != path:
            try:
                await asyncio.to_thread(delete_file, bucket, previous_path)
            except Exception:
                logger.warning(
                    "Could not remove previous avatar for user_id=%s",
                    current_user.id,
                )

    return {
        "success": True,
        "message": "Profile photo updated",
        "data": {"avatar_url": current_user.avatar_url},
    }


@router.post("/logout")
async def logout(current_user: CurrentUser):
    return {"success": True, "message": "Logged out successfully", "data": None}


@router.post("/refresh")
async def refresh_token(body: RefreshRequest):
    try:
        response = supabase_auth.auth.refresh_session(body.refresh_token)
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
        raise _auth_error(
            status.HTTP_401_UNAUTHORIZED,
            "REFRESH_TOKEN_INVALID",
            "Invalid or expired refresh token.",
        ) from None
