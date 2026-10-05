import unittest
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.database import get_db
from app.models.user import EmailVerificationToken, Profile, Student
from app.routers import auth
from app.schemas.auth import (
    LoginRequest,
    RegisterStudentRequest,
    ResendVerificationRequest,
    VerifyOtpRequest,
)
from app.services import email_verification_service
from app.services.email_verification_service import hash_verification_token


VALID_SIGNUP = {
    "full_name": "Shaik Mahummad",
    "email": "user@gmail.com",
    "phone": "+91 98765 43210",
    "password": "secret1",
    "confirm_password": "secret1",
}


class ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value

    def scalars(self):
        return self

    def all(self):
        return []


class FakeSession:
    def __init__(self, *, existing_profile=None):
        self.existing_profile = existing_profile
        self.execute_count = 0
        self.added = []
        self.commits = 0
        self.rollbacks = 0

    async def execute(self, _statement):
        self.execute_count += 1
        if self.execute_count == 1:
            return ScalarResult(self.existing_profile)
        if self.execute_count == 3:
            return ScalarResult(None)
        return ScalarResult(None)

    def add(self, value):
        self.added.append(value)

    async def commit(self):
        self.commits += 1

    async def flush(self):
        pass

    async def rollback(self):
        self.rollbacks += 1


class FlowSession:
    def __init__(self, *results, profile=None):
        self.results = list(results)
        self.profile = profile
        self.added = []
        self.commits = 0
        self.rollbacks = 0
        self.deleted = []

    async def execute(self, _statement):
        value = self.results.pop(0) if self.results else None
        return ScalarResult(value)

    async def get(self, _model, _identifier, **_kwargs):
        return self.profile

    def add(self, value):
        self.added.append(value)

    async def commit(self):
        self.commits += 1

    async def rollback(self):
        self.rollbacks += 1

    async def delete(self, value):
        self.deleted.append(value)


def client_for(session: FakeSession) -> TestClient:
    app = FastAPI()
    app.include_router(auth.router, prefix="/api/v1")

    async def override_db():
        yield session

    app.dependency_overrides[get_db] = override_db
    return TestClient(app)


class RegistrationSchemaTests(unittest.TestCase):
    def parse(self, **overrides):
        return RegisterStudentRequest.model_validate({**VALID_SIGNUP, **overrides})

    def test_accepts_expected_emails(self):
        for email in (
            "user@gmail.com",
            "john.doe@gmail.com",
            "student123@outlook.com",
            "user.name+test@gmail.com",
        ):
            with self.subTest(email=email):
                self.assertEqual(self.parse(email=email).email, email)

    def test_rejects_malformed_emails(self):
        for email in (
            "test",
            "test@",
            "@mail.com",
            "test@mail",
            "test@.com",
            "test@mail.",
            "test..mail@example.com",
            "test @example.com",
            "test@example",
            "test@example.",
            "@example.com",
        ):
            with self.subTest(email=email), self.assertRaises(ValidationError):
                self.parse(email=email)

    def test_normalizes_email_case_and_surrounding_whitespace(self):
        parsed = self.parse(email="  USER@Gmail.com  ")
        self.assertEqual(parsed.email, "user@gmail.com")

    def test_accepts_and_normalizes_real_names(self):
        for name, normalized in (
            ("  Shaik   Mahummad ", "Shaik Mahummad"),
            ("Mary-Jane", "Mary-Jane"),
            ("O'Connor", "O'Connor"),
        ):
            with self.subTest(name=name):
                self.assertEqual(self.parse(full_name=name).full_name, normalized)

    def test_rejects_invalid_names(self):
        for name in ("", "   ", "12345", "Jane_123", "x" * 101):
            with self.subTest(name=name), self.assertRaises(ValidationError):
                self.parse(full_name=name)

    def test_accepts_and_normalizes_indian_mobile_formats(self):
        for phone in ("9876543210", "+919876543210", "+91 98765 43210", "09876543210"):
            with self.subTest(phone=phone):
                self.assertEqual(self.parse(phone=phone).phone, "+919876543210")

    def test_rejects_invalid_mobile_numbers(self):
        for phone in (
            "123",
            "123456",
            "abcdefghij",
            "123456789012345",
            "0000000000",
            "98765abcde",
            "98765@43210",
        ):
            with self.subTest(phone=phone), self.assertRaises(ValidationError):
                self.parse(phone=phone)

    def test_optional_phone_normalizes_blank_to_none(self):
        self.assertIsNone(self.parse(phone="   ").phone)

    def test_password_boundaries_and_confirmation(self):
        for password in ("", "short", " " * 6, "x" * 73):
            with self.subTest(password=repr(password)), self.assertRaises(ValidationError):
                self.parse(password=password, confirm_password=password)
        with self.assertRaises(ValidationError):
            self.parse(confirm_password="different")
        with self.assertRaises(ValidationError):
            self.parse(confirm_password="")

    def test_required_fields_and_incorrect_types_are_structured_validation_errors(self):
        for field in ("full_name", "email", "password", "confirm_password"):
            payload = dict(VALID_SIGNUP)
            payload.pop(field)
            with self.subTest(field=field), self.assertRaises(ValidationError):
                RegisterStudentRequest.model_validate(payload)
        for field in ("full_name", "email", "phone", "password"):
            with self.subTest(field=field), self.assertRaises(ValidationError):
                self.parse(**{field: 123})


class RegistrationApiTests(unittest.TestCase):
    def test_api_rejects_malformed_email_before_auth_or_database_write(self):
        session = FakeSession()
        with (
            client_for(session) as client,
            patch.object(auth.supabase_admin.auth.admin, "create_user") as create_user,
        ):
            response = client.post(
                "/api/v1/auth/register/student",
                json={**VALID_SIGNUP, "email": "test@mail"},
            )
        self.assertEqual(response.status_code, 422)
        self.assertIsInstance(response.json()["detail"], list)
        create_user.assert_not_called()
        self.assertEqual(session.execute_count, 0)

    def test_api_registers_normalized_valid_user_and_requests_verification(self):
        session = FakeSession()
        user_id = uuid.uuid4()
        auth_response = SimpleNamespace(
            user=SimpleNamespace(id=str(user_id), identities=[{"id": "identity"}])
        )
        with (
            client_for(session) as client,
            patch.object(
                auth.supabase_admin.auth.admin,
                "create_user",
                return_value=auth_response,
            ) as create_user,
            patch.object(auth, "send_verification_email", new_callable=AsyncMock) as send_email,
        ):
            response = client.post(
                "/api/v1/auth/register/student",
                json={
                    **VALID_SIGNUP,
                    "email": " USER@Gmail.com ",
                    "full_name": "  Shaik   Mahummad ",
                },
            )
        self.assertEqual(response.status_code, 201)
        self.assertIn("verify", response.json()["message"].lower())
        signup_payload = create_user.call_args.args[0]
        self.assertEqual(signup_payload["email"], "user@gmail.com")
        self.assertFalse(signup_payload["email_confirm"])
        self.assertEqual(signup_payload["user_metadata"]["role"], "student")
        send_email.assert_awaited_once()
        sent_token = send_email.await_args.args[1]
        token_rows = [row for row in session.added if isinstance(row, EmailVerificationToken)]
        self.assertEqual(len(token_rows), 1)
        self.assertFalse(any(isinstance(row, Profile) for row in session.added))
        self.assertEqual(token_rows[0].token_hash, hash_verification_token(sent_token))
        self.assertEqual(session.commits, 1)

    def test_duplicate_profile_email_returns_clear_conflict(self):
        session = FakeSession(existing_profile=uuid.uuid4())
        with (
            client_for(session) as client,
            patch.object(auth.supabase_admin.auth.admin, "create_user") as create_user,
        ):
            response = client.post(
                "/api/v1/auth/register/student",
                json={**VALID_SIGNUP, "email": " USER@GMAIL.COM "},
            )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["detail"], "An account with this email already exists.")
        create_user.assert_not_called()

    def test_missing_auth_user_response_returns_clear_conflict(self):
        session = FakeSession()
        auth_response = SimpleNamespace(user=None)
        with (
            client_for(session) as client,
            patch.object(
                auth.supabase_admin.auth.admin,
                "create_user",
                return_value=auth_response,
            ),
        ):
            response = client.post(
                "/api/v1/auth/register/student", json=VALID_SIGNUP
            )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["detail"], "An account with this email already exists.")


class LoginTests(unittest.TestCase):
    def test_login_schema_normalizes_email_and_rejects_bad_input(self):
        parsed = LoginRequest.model_validate({"email": " USER@Gmail.com ", "password": "secret1"})
        self.assertEqual(parsed.email, "user@gmail.com")
        for payload in (
            {"email": "test@mail", "password": "secret1"},
            {"email": "user@gmail.com", "password": ""},
        ):
            with self.assertRaises(ValidationError):
                LoginRequest.model_validate(payload)

    def test_valid_verified_login_returns_tokens(self):
        profile = SimpleNamespace(
            id=uuid.uuid4(),
            email_verified=True,
            role="student",
            full_name="Student",
        )
        response = SimpleNamespace(
            session=SimpleNamespace(
                access_token="access",
                refresh_token="refresh",
                expires_in=3600,
            ),
            user=SimpleNamespace(
                id=str(uuid.uuid4()),
                email="user@gmail.com",
                email_confirmed_at=datetime.now(timezone.utc),
                user_metadata={"role": "student", "full_name": "Student"},
            ),
        )
        with patch.object(auth.supabase_admin.auth, "sign_in_with_password", return_value=response):
            result = __import__("asyncio").run(login_result(
                {"email": " USER@Gmail.com ", "password": "secret1"},
                FlowSession(profile),
            ))
        self.assertEqual(result["data"]["access_token"], "access")

    def test_wrong_password_unknown_or_unverified_user_gets_safe_401(self):
        for provider_error in ("Invalid login credentials", "Email not confirmed", "User missing"):
            with (
                self.subTest(provider_error=provider_error),
                patch.object(auth.supabase_admin.auth, "sign_in_with_password", side_effect=Exception(provider_error)),
                self.assertRaises(HTTPException) as raised,
            ):
                __import__("asyncio").run(login_result(
                    {"email": "user@gmail.com", "password": "wrongpw"},
                    FlowSession(None),
                ))
            self.assertEqual(raised.exception.status_code, 401)
            self.assertEqual(raised.exception.detail["code"], "INVALID_CREDENTIALS")

    def test_unverified_user_cannot_login(self):
        profile = SimpleNamespace(
            id=uuid.uuid4(),
            email="user@gmail.com",
            full_name="User",
            email_verified=False,
        )
        with (
            patch.object(
                auth.supabase_admin.auth,
                "sign_in_with_password",
                side_effect=Exception("Email not confirmed"),
            ) as sign_in,
            patch.object(auth, "send_verification_email", new_callable=AsyncMock) as send,
            self.assertRaises(HTTPException) as raised,
        ):
            __import__("asyncio").run(login_result(
                {"email": "user@gmail.com", "password": "secret1"},
                FlowSession(profile, None, None),
            ))
        self.assertEqual(raised.exception.status_code, 403)
        self.assertEqual(raised.exception.detail["code"], "ACCOUNT_NOT_VERIFIED")
        sign_in.assert_called_once()
        send.assert_not_awaited()

    def test_unverified_user_login_never_issues_or_sends_an_otp(self):
        profile = SimpleNamespace(
            id=uuid.uuid4(),
            email="user@gmail.com",
            full_name="User",
            email_verified=False,
        )
        with (
            patch.object(auth, "send_verification_email", new_callable=AsyncMock) as send,
            patch.object(auth, "issue_verification_token", new_callable=AsyncMock) as issue,
            patch.object(
                auth.supabase_admin.auth,
                "sign_in_with_password",
                side_effect=Exception("Email not confirmed"),
            ) as sign_in,
            self.assertRaises(HTTPException) as raised,
        ):
            __import__("asyncio").run(login_result(
                {"email": profile.email, "password": "secret1"},
                FlowSession(profile, None, None),
            ))
        self.assertEqual(raised.exception.status_code, 403)
        self.assertEqual(raised.exception.detail["code"], "ACCOUNT_NOT_VERIFIED")
        sign_in.assert_called_once()
        send.assert_not_awaited()
        issue.assert_not_awaited()

    def test_verified_profile_with_unconfirmed_provider_is_not_reverified(self):
        profile = SimpleNamespace(
            id=uuid.uuid4(),
            email="user@gmail.com",
            full_name="User",
            email_verified=True,
        )
        with (
            patch.object(
                auth.supabase_admin.auth,
                "sign_in_with_password",
                side_effect=Exception("Email not confirmed"),
            ),
            patch.object(auth, "send_verification_email", new_callable=AsyncMock) as send,
            patch.object(auth, "issue_verification_token", new_callable=AsyncMock) as issue,
            self.assertRaises(HTTPException) as raised,
        ):
            __import__("asyncio").run(login_result(
                {"email": profile.email, "password": "secret1"},
                FlowSession(profile),
            ))
        self.assertEqual(raised.exception.status_code, 503)
        self.assertEqual(raised.exception.detail["code"], "ACCOUNT_STATE_INCONSISTENT")
        send.assert_not_awaited()
        issue.assert_not_awaited()

    def test_provider_confirmation_repairs_stale_profile_verification(self):
        profile = SimpleNamespace(
            id=uuid.uuid4(),
            email_verified=False,
            role="student",
            full_name="Existing User",
        )
        response = SimpleNamespace(
            session=SimpleNamespace(
                access_token="access",
                refresh_token="refresh",
                expires_in=3600,
            ),
            user=SimpleNamespace(
                id=str(profile.id),
                email="user@gmail.com",
                email_confirmed_at=datetime.now(timezone.utc),
            ),
        )
        session = FlowSession(profile)
        with patch.object(
            auth.supabase_admin.auth,
            "sign_in_with_password",
            return_value=response,
        ):
            result = __import__("asyncio").run(login_result(
                {"email": "user@gmail.com", "password": "secret1"},
                session,
            ))
        self.assertEqual(result["data"]["access_token"], "access")
        self.assertTrue(profile.email_verified)
        self.assertEqual(session.commits, 1)

    def test_deactivated_profile_cannot_receive_a_login_session(self):
        profile = SimpleNamespace(
            id=uuid.uuid4(),
            email_verified=True,
            role="deactivated",
            full_name="Disabled User",
        )
        response = SimpleNamespace(
            session=SimpleNamespace(
                access_token="access",
                refresh_token="refresh",
                expires_in=3600,
            ),
            user=SimpleNamespace(
                id=str(profile.id),
                email="user@gmail.com",
                email_confirmed_at=datetime.now(timezone.utc),
            ),
        )
        with (
            patch.object(
                auth.supabase_admin.auth,
                "sign_in_with_password",
                return_value=response,
            ),
            self.assertRaises(HTTPException) as raised,
        ):
            __import__("asyncio").run(login_result(
                {"email": "user@gmail.com", "password": "secret1"},
                FlowSession(profile),
            ))
        self.assertEqual(raised.exception.status_code, 403)
        self.assertEqual(raised.exception.detail["code"], "ACCOUNT_DISABLED")


class EmailVerificationTests(unittest.TestCase):
    def token_row(self, raw_token="raw-verification-token-123456789", **overrides):
        now = datetime.now(timezone.utc)
        values = {
            "id": uuid.uuid4(),
            "user_id": uuid.uuid4(),
            "token_hash": hash_verification_token(raw_token),
            "expires_at": now + timedelta(hours=1),
            "used_at": None,
            "created_at": now - timedelta(minutes=5),
        }
        values.update(overrides)
        return SimpleNamespace(**values)

    def test_successful_otp_verification(self):
        raw_token = "123456"
        token_row = self.token_row(raw_token)
        profile = SimpleNamespace(
            id=token_row.user_id,
            email="user@gmail.com",
            email_verified=False,
        )
        session = FlowSession(profile, token_row)
        with patch.object(
            auth.supabase_admin.auth.admin, "update_user_by_id"
        ) as confirm_user:
            result = __import__("asyncio").run(
                auth.verify_otp(
                    body=VerifyOtpRequest(email=profile.email, otp=raw_token),
                    db=session,
                )
            )
        self.assertTrue(result["success"])
        self.assertTrue(profile.email_verified)
        self.assertEqual(session.commits, 1)
        confirm_user.assert_called_once_with(str(profile.id), {"email_confirm": True})

    def test_successful_otp_verification_activates_pending_registration(self):
        raw_token = "123456"
        user_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        pending = SimpleNamespace(
            user_id=user_id,
            email="pending@gmail.com",
            role="student",
            registration_data={
                "full_name": "Pending User",
                "phone": "+919876543210",
                "college": "College",
                "branch": "CS",
                "year_of_study": 2,
            },
            expires_at=now + timedelta(minutes=20),
        )
        token_row = self.token_row(raw_token, user_id=user_id)
        session = FlowSession(None, pending, token_row, None)
        with patch.object(
            auth.supabase_admin.auth.admin, "update_user_by_id"
        ) as confirm_user:
            result = __import__("asyncio").run(
                auth.verify_otp(
                    body=VerifyOtpRequest(email=pending.email, otp=raw_token),
                    db=session,
                )
            )
        self.assertTrue(result["success"])
        self.assertTrue(any(isinstance(row, Profile) for row in session.added))
        self.assertTrue(any(isinstance(row, Student) for row in session.added))
        self.assertEqual(session.deleted, [pending])
        confirm_user.assert_called_once_with(str(user_id), {"email_confirm": True})

    def test_invalid_otp(self):
        with self.assertRaises(HTTPException) as raised:
            __import__("asyncio").run(
                auth.verify_otp(
                    body=VerifyOtpRequest(email="user@gmail.com", otp="123456"),
                    db=FlowSession(None, None),
                )
            )
        self.assertEqual(raised.exception.status_code, 400)

    def test_expired_otp(self):
        token_row = self.token_row(
            raw_token="123456",
            expires_at=datetime.now(timezone.utc) - timedelta(seconds=1)
        )
        with self.assertRaises(HTTPException) as raised:
            __import__("asyncio").run(
                auth.verify_otp(
                    body=VerifyOtpRequest(email="user@gmail.com", otp="123456"),
                    db=FlowSession(None, None, token_row),
                )
            )
        self.assertEqual(raised.exception.status_code, 400)

    def test_reused_otp(self):
        token_row = self.token_row(
            raw_token="123456",
            used_at=datetime.now(timezone.utc),
        )
        with self.assertRaises(HTTPException) as raised:
            __import__("asyncio").run(
                auth.verify_otp(
                    body=VerifyOtpRequest(email="user@gmail.com", otp="123456"),
                    db=FlowSession(None, None, token_row),
                )
            )
        self.assertEqual(raised.exception.status_code, 400)

    def test_resend_invalidates_old_token_and_sends_hashed_new_token(self):
        profile = SimpleNamespace(
            id=uuid.uuid4(), email="user@gmail.com", full_name="User", email_verified=False
        )
        old_token = self.token_row(
            user_id=profile.id,
            created_at=datetime.now(timezone.utc) - timedelta(minutes=2),
        )
        session = FlowSession(profile, old_token, None)
        with patch.object(auth, "send_verification_email", new_callable=AsyncMock) as send:
            result = __import__("asyncio").run(auth.resend_verification(
                ResendVerificationRequest(email=profile.email), session
            ))
        self.assertTrue(result["success"])
        self.assertEqual(session.commits, 1)
        send.assert_awaited_once()
        raw_token = send.await_args.args[1]
        new_tokens = [row for row in session.added if isinstance(row, EmailVerificationToken)]
        self.assertEqual(len(new_tokens), 1)
        self.assertEqual(new_tokens[0].token_hash, hash_verification_token(raw_token))
        self.assertNotEqual(new_tokens[0].token_hash, raw_token)

    def test_missing_smtp_configuration_raises_clear_error(self):
        with patch.object(email_verification_service.settings, "smtp_host", ""), \
             patch.object(email_verification_service.settings, "smtp_username", ""), \
             patch.object(email_verification_service.settings, "smtp_password", ""), \
             patch.object(email_verification_service.settings, "smtp_from_email", ""), \
             patch.object(email_verification_service.settings, "smtp_from_name", ""), \
             patch.object(email_verification_service.settings, "frontend_url", ""):
            with self.assertRaises(RuntimeError) as raised:
                email_verification_service._send_verification_email_sync(
                    "user@gmail.com", "raw-token"
                )
        self.assertIn("Missing email configuration", str(raised.exception))


async def login_result(payload, db):
    return await auth.login(LoginRequest.model_validate(payload), db)


if __name__ == "__main__":
    unittest.main()
