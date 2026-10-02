import asyncio
import hashlib
import logging
import secrets
import smtplib
import ssl
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import EmailVerificationToken


TOKEN_TTL = timedelta(minutes=10)
RESEND_COOLDOWN = timedelta(seconds=60)


def log_auth_event(event: str, registration_id=None, **fields) -> None:
    """Emit traceable auth events without including secrets or message content."""
    safe_fields = " ".join(
        f"{key}={value}" for key, value in fields.items()
        if key not in {"otp", "password", "access_token", "refresh_token"}
    )
    logger = logging.getLogger(__name__)
    logger.info(
        "auth_event registration_id=%s event=%s%s",
        registration_id or "unknown",
        event,
        f" {safe_fields}" if safe_fields else "",
    )


def hash_verification_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_verification_token(
    user_id,
    *,
    now: datetime | None = None,
) -> tuple[EmailVerificationToken, str]:
    now = now or datetime.now(timezone.utc)
    raw_token = f"{secrets.randbelow(1_000_000):06d}"
    return (
        EmailVerificationToken(
            user_id=user_id,
            token_hash=hash_verification_token(raw_token),
            expires_at=now + TOKEN_TTL,
            created_at=now,
        ),
        raw_token,
    )


def _send_verification_email_sync(
    recipient: str, raw_token: str, recipient_name: str = "", registration_id=None
) -> None:
    required = {
        "SMTP_HOST": settings.smtp_host,
        "SMTP_USERNAME": settings.smtp_username,
        "SMTP_PASSWORD": settings.smtp_password,
        "SMTP_FROM_EMAIL": settings.smtp_from_email,
        "SMTP_FROM_NAME": settings.smtp_from_name,
    }
    missing = [
        name for name, value in required.items() if not str(value or "").strip()
    ]
    if missing:
        raise RuntimeError(f"Missing email configuration: {', '.join(missing)}")

    message = EmailMessage()
    message["Subject"] = "Your CareerVue verification OTP"
    message["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    message["To"] = recipient
    greeting = recipient_name.strip() or "there"
    message.set_content(
        f"Hi {greeting},\n\nWelcome to CareerVue! 🎉\n\n"
        "We're excited to have you with us.\n\n"
        f"Your email verification OTP is: {raw_token}\n\n"
        "This OTP is valid for 10 minutes. Please do not share it with anyone.\n\n"
        "Once verified, you can start exploring CareerVue, assess your skills, "
        "identify skill gaps, and build your personalized learning roadmap.\n\n"
        "If you didn't create a CareerVue account, you can safely ignore this email.\n\n"
        "Best regards,\nCareerVue Team"
    )
    message.add_alternative(
        f"<h2>Hi {greeting}, welcome to CareerVue! 🎉</h2>"
        "<p>We're excited to have you with us.</p>"
        f"<p>Your email verification OTP is:</p><h1>{raw_token}</h1>"
        "<p>This OTP is valid for <strong>10 minutes</strong>. "
        "Please do not share it with anyone.</p>"
        "<p>Once verified, you can start exploring CareerVue, assess your skills, "
        "identify skill gaps, and build your personalized learning roadmap.</p>"
        "<p>If you didn't create a CareerVue account, you can safely ignore this email.</p>"
        "<p>Best regards,<br><strong>CareerVue Team</strong></p>",
        subtype="html",
    )

    log_auth_event("SMTP_CONNECTION_STARTED", registration_id)
    if settings.smtp_port == 465:
        with smtplib.SMTP_SSL(
            settings.smtp_host,
            settings.smtp_port,
            context=ssl.create_default_context(),
            timeout=settings.smtp_timeout_seconds,
        ) as smtp:
            log_auth_event("SMTP_CONNECTED", registration_id)
            log_auth_event("SMTP_AUTHENTICATION_STARTED", registration_id)
            smtp.login(settings.smtp_username, settings.smtp_password)
            log_auth_event("SMTP_AUTHENTICATED", registration_id)
            refused = smtp.send_message(message)
    else:
        with smtplib.SMTP(
            settings.smtp_host,
            settings.smtp_port,
            timeout=settings.smtp_timeout_seconds,
        ) as smtp:
            log_auth_event("SMTP_CONNECTED", registration_id)
            smtp.ehlo()
            smtp.starttls(context=ssl.create_default_context())
            smtp.ehlo()
            log_auth_event("SMTP_AUTHENTICATION_STARTED", registration_id)
            smtp.login(settings.smtp_username, settings.smtp_password)
            log_auth_event("SMTP_AUTHENTICATED", registration_id)
            refused = smtp.send_message(message)
    if refused:
        raise smtplib.SMTPRecipientsRefused(refused)
    log_auth_event("SMTP_MESSAGE_SUBMITTED", registration_id)


async def send_verification_email(
    recipient: str, raw_token: str, recipient_name: str = "", registration_id=None
) -> None:
    log_auth_event("EMAIL_SEND_STARTED", registration_id)
    try:
        await asyncio.to_thread(
            _send_verification_email_sync,
            recipient,
            raw_token,
            recipient_name,
            registration_id,
        )
    except Exception as exc:
        log_auth_event(
            "EMAIL_SEND_FAILED",
            registration_id,
            error_type=type(exc).__name__,
            error=str(exc)[:200],
        )
        raise
    log_auth_event("EMAIL_ACCEPTED_BY_SMTP", registration_id)


async def issue_verification_token(
    db: AsyncSession,
    user_id,
    *,
    now: datetime | None = None,
) -> str:
    token_row, raw_token = create_verification_token(user_id, now=now)
    db.add(token_row)
    return raw_token


async def invalidate_unused_tokens(
    db: AsyncSession,
    user_id,
    *,
    now: datetime,
) -> None:
    await db.execute(
        update(EmailVerificationToken)
        .where(
            EmailVerificationToken.user_id == user_id,
            EmailVerificationToken.used_at.is_(None),
        )
        .values(used_at=now)
    )


async def latest_token_for_user(db: AsyncSession, user_id):
    return (
        await db.execute(
            select(EmailVerificationToken)
            .where(
                EmailVerificationToken.user_id == user_id,
                EmailVerificationToken.used_at.is_(None),
            )
            .order_by(EmailVerificationToken.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
