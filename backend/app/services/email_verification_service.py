import asyncio
import hashlib
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
    recipient: str, raw_token: str, recipient_name: str = ""
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

    if settings.smtp_port == 465:
        with smtplib.SMTP_SSL(
            settings.smtp_host,
            settings.smtp_port,
            context=ssl.create_default_context(),
        ) as smtp:
            smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
    else:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as smtp:
            smtp.ehlo()
            smtp.starttls(context=ssl.create_default_context())
            smtp.ehlo()
            smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)


async def send_verification_email(
    recipient: str, raw_token: str, recipient_name: str = ""
) -> None:
    await asyncio.to_thread(
        _send_verification_email_sync, recipient, raw_token, recipient_name
    )


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
