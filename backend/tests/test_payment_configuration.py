import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException

from app.config import Settings
from app.routers.payments import _require_payments_configured
from app.services import payment_service


def _settings(**overrides) -> Settings:
    values = {
        "database_url": "sqlite+aiosqlite:///:memory:",
        "supabase_url": "https://example.test",
        "supabase_anon_key": "anon",
        "supabase_service_role_key": "service",
        "jwt_secret": "test-secret",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


class PaymentConfigurationTests(unittest.TestCase):
    def test_payment_credentials_are_optional(self):
        settings = _settings()
        self.assertFalse(settings.payments_configured)

    def test_placeholder_credentials_do_not_enable_payments(self):
        settings = _settings(
            razorpay_key_id="replace-with-staging-test-key-id",
            razorpay_key_secret="replace-with-staging-test-key-secret",
        )
        self.assertFalse(settings.payments_configured)

    def test_payment_routes_fail_closed_when_not_configured(self):
        with patch(
            "app.routers.payments.settings",
            SimpleNamespace(payments_configured=False),
        ):
            with self.assertRaises(HTTPException) as raised:
                _require_payments_configured()
        self.assertEqual(raised.exception.status_code, 503)

    def test_payment_client_is_created_lazily(self):
        configured = SimpleNamespace(
            payments_configured=True,
            razorpay_key_id="rzp_test_key",
            razorpay_key_secret="test-secret",
        )
        with (
            patch("app.services.payment_service.settings", configured),
            patch("app.services.payment_service.razorpay.Client") as client,
        ):
            payment_service._client()
        client.assert_called_once_with(auth=("rzp_test_key", "test-secret"))


if __name__ == "__main__":
    unittest.main()
