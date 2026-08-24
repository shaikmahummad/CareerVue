import unittest
import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.database import get_db
from app.routers import auth
from app.schemas.auth import LoginRequest, RegisterStudentRequest


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

    async def rollback(self):
        self.rollbacks += 1


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
            patch.object(auth.supabase_anon.auth, "sign_up") as sign_up,
        ):
            response = client.post(
                "/api/v1/auth/register/student",
                json={**VALID_SIGNUP, "email": "test@mail"},
            )
        self.assertEqual(response.status_code, 422)
        self.assertIsInstance(response.json()["detail"], list)
        sign_up.assert_not_called()
        self.assertEqual(session.execute_count, 0)

    def test_api_registers_normalized_valid_user_and_requests_verification(self):
        session = FakeSession()
        user_id = uuid.uuid4()
        auth_response = SimpleNamespace(
            user=SimpleNamespace(id=str(user_id), identities=[{"id": "identity"}])
        )
        with (
            client_for(session) as client,
            patch.object(auth.supabase_anon.auth, "sign_up", return_value=auth_response) as sign_up,
        ):
            response = client.post(
                "/api/v1/auth/register/student",
                json={
                    **VALID_SIGNUP,
                    "email": " USER@Gmail.com ",
                    "full_name": "  Shaik   Mahummad ",
                    "email_redirect_to": "http://localhost:3000/auth/callback",
                },
            )
        self.assertEqual(response.status_code, 201)
        self.assertIn("verify", response.json()["message"].lower())
        signup_payload = sign_up.call_args.args[0]
        self.assertEqual(signup_payload["email"], "user@gmail.com")
        self.assertNotIn("email_confirm", signup_payload)
        self.assertEqual(
            signup_payload["options"]["email_redirect_to"],
            "http://localhost:3000/auth/callback",
        )
        self.assertEqual(session.commits, 1)

    def test_duplicate_profile_email_returns_clear_conflict(self):
        session = FakeSession(existing_profile=uuid.uuid4())
        with (
            client_for(session) as client,
            patch.object(auth.supabase_anon.auth, "sign_up") as sign_up,
        ):
            response = client.post(
                "/api/v1/auth/register/student",
                json={**VALID_SIGNUP, "email": " USER@GMAIL.COM "},
            )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["detail"], "An account with this email already exists.")
        sign_up.assert_not_called()

    def test_obfuscated_duplicate_auth_response_returns_clear_conflict(self):
        session = FakeSession()
        auth_response = SimpleNamespace(
            user=SimpleNamespace(id=str(uuid.uuid4()), identities=[])
        )
        with (
            client_for(session) as client,
            patch.object(auth.supabase_anon.auth, "sign_up", return_value=auth_response),
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
        response = SimpleNamespace(
            session=SimpleNamespace(
                access_token="access",
                refresh_token="refresh",
                expires_in=3600,
            ),
            user=SimpleNamespace(
                id=str(uuid.uuid4()),
                email="user@gmail.com",
                user_metadata={"role": "student", "full_name": "Student"},
            ),
        )
        with patch.object(auth.supabase_admin.auth, "sign_in_with_password", return_value=response):
            result = __import__("asyncio").run(login_result({"email": " USER@Gmail.com ", "password": "secret1"}))
        self.assertEqual(result["data"]["access_token"], "access")

    def test_wrong_password_unknown_or_unverified_user_gets_safe_401(self):
        for provider_error in ("Invalid login credentials", "Email not confirmed", "User missing"):
            with (
                self.subTest(provider_error=provider_error),
                patch.object(auth.supabase_admin.auth, "sign_in_with_password", side_effect=Exception(provider_error)),
                self.assertRaises(HTTPException) as raised,
            ):
                __import__("asyncio").run(login_result({"email": "user@gmail.com", "password": "wrongpw"}))
            self.assertEqual(raised.exception.status_code, 401)
            self.assertNotIn(provider_error, raised.exception.detail)


async def login_result(payload):
    return await auth.login(LoginRequest.model_validate(payload))


if __name__ == "__main__":
    unittest.main()
