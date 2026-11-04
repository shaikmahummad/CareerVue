import unittest
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient

from app.dependencies import get_current_user
from app.routers import quiz


class ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class FakeSession:
    def __init__(self, profile):
        self.profile = profile
        self.commits = 0

    async def execute(self, _statement):
        self.execute_count = getattr(self, "execute_count", 0) + 1
        return ScalarResult(self.profile if self.execute_count == 1 else None)

    async def commit(self):
        self.commits += 1


class AuthenticationGuardTests(unittest.TestCase):
    def test_missing_bearer_token_returns_structured_401(self):
        app = FastAPI()
        app.include_router(quiz.router, prefix="/api/v1")

        with TestClient(app) as client:
            response = client.post(
                "/api/v1/quiz/attempt/start/Frontend%20Developer"
            )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.headers["www-authenticate"], "Bearer")
        self.assertEqual(response.json()["detail"]["code"], "UNAUTHORIZED")


class VerifiedSessionTests(unittest.IsolatedAsyncioTestCase):
    async def test_unconfirmed_provider_session_is_rejected(self):
        user = SimpleNamespace(
            id=str(uuid.uuid4()),
            email_confirmed_at=None,
            confirmed_at=None,
        )
        with (
            patch("app.dependencies.supabase_admin.auth.get_user", return_value=SimpleNamespace(user=user)),
            self.assertRaises(HTTPException) as raised,
        ):
            await get_current_user(
                HTTPAuthorizationCredentials(scheme="Bearer", credentials="token"),
                FakeSession(None),
            )
        self.assertEqual(raised.exception.status_code, 403)
        self.assertEqual(raised.exception.detail["code"], "ACCOUNT_NOT_VERIFIED")

    async def test_confirmed_provider_repairs_profile_mirror(self):
        user_id = uuid.uuid4()
        user = SimpleNamespace(
            id=str(user_id),
            email_confirmed_at=datetime.now(timezone.utc),
        )
        profile = SimpleNamespace(
            id=user_id,
            email="user@gmail.com",
            role="student",
            email_verified=False,
        )
        db = FakeSession(profile)
        with patch(
            "app.dependencies.supabase_admin.auth.get_user",
            return_value=SimpleNamespace(user=user),
        ):
            result = await get_current_user(
                HTTPAuthorizationCredentials(scheme="Bearer", credentials="token"),
                db,
            )
        self.assertIs(result, profile)
        self.assertTrue(profile.email_verified)
        self.assertEqual(db.commits, 1)


if __name__ == "__main__":
    unittest.main()
