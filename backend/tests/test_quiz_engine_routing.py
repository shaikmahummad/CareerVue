import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.quiz_service import QuizUnavailableError, get_or_create_quiz_template


QUIZ_DATA = {
    "topic_areas": ["HTML"],
    "questions": [{
        "id": "question-1",
        "topic": "HTML",
        "question": "A verified question?",
        "options": {"A": "Yes", "B": "No", "C": "Maybe", "D": "Unknown"},
        "correct": "A",
        "difficulty": "beginner",
        "explanation": "Verified explanation.",
    }],
}


class EmptyResult:
    def scalar_one_or_none(self):
        return None

    def scalars(self):
        return self

    def first(self):
        return None


def fake_db():
    db = MagicMock()
    db.execute = AsyncMock(return_value=EmptyResult())
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    return db


class QuizEngineRoutingTests(unittest.IsolatedAsyncioTestCase):
    async def test_supported_career_uses_verified_bank(self):
        db = fake_db()
        with (
            patch(
                "app.services.quiz_service.build_verified_quiz",
                new=AsyncMock(return_value=(
                    "frontend-developer", "Frontend Developer", QUIZ_DATA
                )),
            ),
        ):
            template = await get_or_create_quiz_template(db, "React Developer")

        self.assertEqual(template.goal, "Frontend Developer")
        self.assertEqual(
            template.generation_key,
            "question-bank:frontend-developer:beginner:v2",
        )
        self.assertEqual(template.questions, QUIZ_DATA["questions"])

    async def test_unsupported_career_returns_clear_availability_error(self):
        db = fake_db()
        with (
            patch(
                "app.services.quiz_service.build_verified_quiz",
                new=AsyncMock(return_value=None),
            ),
        ):
            with self.assertRaisesRegex(
                QuizUnavailableError, "verified quiz is not available"
            ):
                await get_or_create_quiz_template(db, "Backend Developer")


if __name__ == "__main__":
    unittest.main()
