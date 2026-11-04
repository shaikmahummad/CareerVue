import unittest
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

from app.routers import auth


class FakeUpload:
    def __init__(self, content_type: str, contents: bytes):
        self.content_type = content_type
        self.contents = contents
        self.closed = False

    async def read(self, size: int):
        return self.contents[:size]

    async def close(self):
        self.closed = True


class FakeSession:
    def __init__(self):
        self.commits = 0
        self.refreshed = []

    async def commit(self):
        self.commits += 1

    async def refresh(self, value):
        self.refreshed.append(value)


class AvatarUploadTests(unittest.IsolatedAsyncioTestCase):
    async def test_uploads_valid_image_and_updates_profile(self):
        profile = SimpleNamespace(id=uuid.uuid4(), avatar_url=None)
        db = FakeSession()
        upload = FakeUpload("image/png", b"valid-image")
        uploaded_url = "https://example.supabase.co/storage/v1/object/public/avatars/profile.png"

        async def run_in_thread(function, *args, **kwargs):
            if function is auth.upload_file:
                return uploaded_url
            return function(*args, **kwargs)

        with (
            patch.object(auth.asyncio, "to_thread", new=AsyncMock(side_effect=run_in_thread)),
            patch.object(auth, "ensure_public_bucket"),
        ):
            result = await auth.upload_profile_avatar(profile, upload, db)

        self.assertEqual(result["data"]["avatar_url"], uploaded_url)
        self.assertEqual(profile.avatar_url, uploaded_url)
        self.assertTrue(upload.closed)
        self.assertEqual(db.commits, 1)
        self.assertEqual(db.refreshed, [profile])

    async def test_rejects_unsupported_image_type(self):
        profile = SimpleNamespace(id=uuid.uuid4(), avatar_url=None)
        with self.assertRaises(HTTPException) as raised:
            await auth.upload_profile_avatar(
                profile,
                FakeUpload("image/gif", b"gif"),
                FakeSession(),
            )
        self.assertEqual(raised.exception.status_code, 400)

    async def test_rejects_image_larger_than_five_megabytes(self):
        profile = SimpleNamespace(id=uuid.uuid4(), avatar_url=None)
        with self.assertRaises(HTTPException) as raised:
            await auth.upload_profile_avatar(
                profile,
                FakeUpload("image/jpeg", b"x" * (auth.MAX_AVATAR_BYTES + 1)),
                FakeSession(),
            )
        self.assertEqual(raised.exception.status_code, 413)


if __name__ == "__main__":
    unittest.main()
