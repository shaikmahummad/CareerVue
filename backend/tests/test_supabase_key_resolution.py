import base64
import json
import unittest

from app.utils.supabase import resolve_supabase_keys


def _key(role: str) -> str:
    header = base64.urlsafe_b64encode(b'{}').decode().rstrip("=")
    payload = base64.urlsafe_b64encode(json.dumps({"role": role}).encode()).decode().rstrip("=")
    return f"{header}.{payload}.signature"


class SupabaseKeyResolutionTests(unittest.TestCase):
    def test_keeps_correctly_mapped_legacy_keys(self):
        anon = _key("anon")
        service = _key("service_role")
        self.assertEqual(resolve_supabase_keys(anon, service), (anon, service, "service_role"))

    def test_repairs_swapped_legacy_keys(self):
        anon = _key("anon")
        service = _key("service_role")
        self.assertEqual(
            resolve_supabase_keys(service, anon),
            (anon, service, "service_role_swapped"),
        )

    def test_removes_accidental_wrapping_quotes(self):
        anon = _key("anon")
        service = _key("service_role")
        self.assertEqual(
            resolve_supabase_keys(f'"{anon}"', f"'{service}'"),
            (anon, service, "service_role"),
        )

    def test_accepts_new_secret_key_format(self):
        anon = _key("anon")
        self.assertEqual(
            resolve_supabase_keys(anon, "sb_secret_example"),
            (anon, "sb_secret_example", "secret_key"),
        )


if __name__ == "__main__":
    unittest.main()
