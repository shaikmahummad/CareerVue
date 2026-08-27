import asyncio
import hashlib
import secrets
import smtplib
import ssl
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from urllib.parse import urlencode

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import EmailVerificationToken


TOKEN_TTL = timedelta(hours=24)
RESEND_COOLDOWN = timedelta(seconds=60)


def hash_verification_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_verification_token(
    user_id,
    *,
    now: datetime | None = None,
) -> tuple[EmailVerificationToken, str]:
    now = now or datetime.now(timezone.utc)
    raw_token = secrets.token_urlsafe(32)
    return (
        EmailVerificationToken(
            user_id=user_id,
            token_hash=hash_verification_token(raw_token),
            expires_at=now + TOKEN_TTL,
            created_at=now,
        ),
        raw_token,
    )


def _send_verification_email_sync(recipient: str, raw_token: str) -> None:
    required = {
        "SMTP_HOST": settings.smtp_host,
        "SMTP_USERNAME": settings.smtp_username,
        "SMTP_PASSWORD": settings.smtp_password,
        "SMTP_FROM_EMAIL": settings.smtp_from_email,
        "SMTP_FROM_NAME": settings.smtp_from_name,
        "FRONTEND_URL": settings.frontend_url,
    }
    missing = [
        name for name, value in required.items() if not str(value or "").strip()
    ]
    if missing:
        raise RuntimeError(f"Missing email configuration: {', '.join(missing)}")

    verification_url = (
        f"{settings.frontend_url.rstrip('/')}/verify-email?"
        f"{urlencode({'token': raw_token})}"
    )
    message = EmailMessage()
    message["Subject"] = "Verify your CareerVue email"
    message["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    message["To"] = recipient
    message.set_content(
        "Verify your CareerVue account by opening this link:\n\n"
        f"{verification_url}\n\nThis link expires in 24 hours."
    )
    message.add_alternative(
        "<h2>Verify your CareerVue email</h2>"
        "<p>Finish creating your account by verifying your email address.</p>"
        f'<p><a href="{verification_url}">Verify email address</a></p>'
        "<p>This link expires in 24 hours.</p>",
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


async def send_verification_email(recipient: str, raw_token: str) -> None:
    await asyncio.to_thread(_send_verification_email_sync, recipient, raw_token)


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
            .where(EmailVerificationToken.user_id == user_id)
            .order_by(EmailVerificationToken.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
