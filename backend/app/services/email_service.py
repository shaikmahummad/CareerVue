import asyncio
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from app.config import settings


def _send_password_reset_otp(recipient: str, otp: str) -> None:
    if not settings.smtp_host or not settings.smtp_from_email:
        raise RuntimeError("SMTP is not configured")

    message = EmailMessage()
    message["Subject"] = "Your CareerVue password reset code"
    message["From"] = formataddr((settings.smtp_from_name, settings.smtp_from_email))
    message["To"] = recipient
    message.set_content(
        f"Your CareerVue password reset code is {otp}. "
        "It expires in 10 minutes. If you did not request this, you can ignore this email."
    )
    message.add_alternative(
        f"""\
        <html><body style="font-family:Arial,sans-serif;color:#191724">
          <h2>Password reset</h2>
          <p>Use this code to reset your CareerVue password:</p>
          <p style="font-size:32px;font-weight:700;letter-spacing:8px">{otp}</p>
          <p>This code expires in 10 minutes. Never share it with anyone.</p>
          <p>If you did not request this, you can safely ignore this email.</p>
        </body></html>
        """,
        subtype="html",
    )

    smtp_class = smtplib.SMTP_SSL if settings.smtp_use_ssl else smtplib.SMTP
    with smtp_class(settings.smtp_host, settings.smtp_port, timeout=15) as server:
        if settings.smtp_use_tls and not settings.smtp_use_ssl:
            server.starttls()
        if settings.smtp_username:
            server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(message)


async def send_password_reset_otp(recipient: str, otp: str) -> None:
    await asyncio.to_thread(_send_password_reset_otp, recipient, otp)
