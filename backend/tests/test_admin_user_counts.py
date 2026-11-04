import unittest
from types import SimpleNamespace

from app.routers.admin import get_user_role_counts


class RowsResult:
    def __init__(self, rows):
        self.rows = rows

    def all(self):
        return self.rows


class CountsSession:
    async def execute(self, _statement):
        return RowsResult([
            ("student", 3),
            ("tutor", 2),
            ("admin", 1),
        ])


class AdminUserCountTests(unittest.IsolatedAsyncioTestCase):
    async def test_counts_are_global_and_include_empty_roles(self):
        result = await get_user_role_counts(
            current_user=SimpleNamespace(role="admin"),
            db=CountsSession(),
        )

        self.assertEqual(result["data"], {
            "all": 6,
            "student": 3,
            "tutor": 2,
            "admin": 1,
            "deactivated": 0,
        })


if __name__ == "__main__":
    unittest.main()
