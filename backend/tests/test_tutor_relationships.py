import unittest
import uuid
from types import SimpleNamespace

from app.models.course import Course
from app.models.user import Tutor
from app.routers.tutors import _get_tutor_or_404, tutor_analytics, tutor_courses


class ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value

    def scalars(self):
        return self

    def all(self):
        return self.value


class RecordingSession:
    def __init__(self, *results):
        self.results = list(results)
        self.statements = []

    async def execute(self, statement):
        self.statements.append(statement)
        return ScalarResult(self.results.pop(0))


class TutorRelationshipTests(unittest.IsolatedAsyncioTestCase):
    async def test_tutor_lookup_uses_profile_foreign_key(self):
        profile_id = uuid.uuid4()
        tutor = Tutor(id=uuid.uuid4(), profile_id=profile_id)
        db = RecordingSession(tutor)

        found = await _get_tutor_or_404(db, profile_id)

        self.assertIs(found, tutor)
        params = db.statements[0].compile().params
        self.assertIn(profile_id, params.values())
        self.assertIn("tutors.profile_id", str(db.statements[0]))

    async def test_mobile_tutor_course_list_uses_tutor_primary_key(self):
        profile_id = uuid.uuid4()
        tutor_id = uuid.uuid4()
        tutor = Tutor(id=tutor_id, profile_id=profile_id)
        db = RecordingSession(tutor, [])

        result = await tutor_courses(
            current_user=SimpleNamespace(id=profile_id),
            db=db,
        )

        self.assertEqual(result["data"], [])
        params = db.statements[1].compile().params
        self.assertIn(tutor_id, params.values())
        self.assertNotIn(profile_id, params.values())

    async def test_tutor_analytics_uses_tutor_primary_key(self):
        profile_id = uuid.uuid4()
        tutor_id = uuid.uuid4()
        tutor = Tutor(
            id=tutor_id,
            profile_id=profile_id,
            total_earnings=0,
        )
        course = Course(
            id=uuid.uuid4(),
            tutor_id=tutor_id,
            title="Course",
            status="approved",
            enrolled_count=3,
            avg_rating=4,
        )
        db = RecordingSession(tutor, [course])

        result = await tutor_analytics(
            current_user=SimpleNamespace(id=profile_id),
            db=db,
        )

        self.assertEqual(result["data"]["courses_count"], 1)
        self.assertEqual(result["data"]["total_students"], 3)
        params = db.statements[1].compile().params
        self.assertIn(tutor_id, params.values())
        self.assertNotIn(profile_id, params.values())


if __name__ == "__main__":
    unittest.main()
