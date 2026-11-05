import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

from app.routers.tutors import (
    TutorProfileUpdateBody,
    _apply_tutor_updates,
    _merge_tutor_profile,
)


class TutorProfileTests(unittest.TestCase):
    def test_profile_response_maps_experience_years_to_public_field(self):
        now = datetime.now(timezone.utc)
        profile = SimpleNamespace(
            id=uuid4(),
            role="tutor",
            full_name="Tutor",
            email="tutor@example.com",
            avatar_url=None,
            phone=None,
            created_at=now,
            updated_at=now,
        )
        tutor = SimpleNamespace(
            bio=None,
            expertise_tags=None,
            qualification=None,
            experience_years=7,
            linkedin_url=None,
            website_url=None,
            is_verified=False,
            total_earnings=0,
            created_at=now,
        )

        result = _merge_tutor_profile(profile, tutor)

        self.assertEqual(result["years_experience"], 7)

    def test_profile_update_writes_public_field_to_model_column(self):
        tutor = SimpleNamespace(
            bio=None,
            expertise_tags=None,
            qualification=None,
            experience_years=None,
            linkedin_url=None,
            website_url=None,
        )
        body = TutorProfileUpdateBody(years_experience=9, qualification="Cloud Architect")

        _apply_tutor_updates(tutor, body)

        self.assertEqual(tutor.experience_years, 9)
        self.assertEqual(tutor.qualification, "Cloud Architect")
        self.assertFalse(hasattr(tutor, "years_experience"))


if __name__ == "__main__":
    unittest.main()
