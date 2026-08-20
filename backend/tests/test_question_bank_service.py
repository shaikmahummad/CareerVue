import unittest

from app.services.question_bank_service import (
    BankQuestion,
    assemble_quiz,
    generation_key,
    resolve_career_slug,
)


def make_questions() -> list[BankQuestion]:
    questions = []
    for skill_index in range(1, 9):
        for difficulty in ("beginner", "intermediate", "advanced"):
            questions.append(BankQuestion(
                id=f"skill-{skill_index}-{difficulty}",
                skill_name=f"Skill {skill_index}",
                career_order=skill_index,
                importance=5 if skill_index <= 4 else 4,
                prompt=f"Question for skill {skill_index} at {difficulty}?",
                options={"A": "one", "B": "two", "C": "three", "D": "four"},
                correct_option="A",
                explanation="Verified explanation.",
                difficulty=difficulty,
            ))
    return questions


class QuestionBankServiceTests(unittest.TestCase):
    def test_resolves_only_explicit_frontend_aliases(self):
        for goal in (
            "Frontend Developer", "front-end engineer", " React Developer ", "frontend"
        ):
            self.assertEqual(resolve_career_slug(goal), "frontend-developer")
        self.assertIsNone(resolve_career_slug("Backend Developer"))
        self.assertIsNone(resolve_career_slug("Web Developer"))

    def test_assembly_is_deterministic_and_uses_existing_contract(self):
        candidates = make_questions()
        first = assemble_quiz(candidates, "beginner")
        second = assemble_quiz(list(reversed(candidates)), "beginner")

        self.assertEqual(first, second)
        self.assertIsNotNone(first)
        self.assertEqual(len(first["questions"]), 20)
        self.assertEqual(len(first["topic_areas"]), 8)
        self.assertTrue(all(
            set(question) == {
                "id", "topic", "question", "options", "correct", "difficulty", "explanation"
            }
            for question in first["questions"]
        ))
        self.assertTrue(all(
            question["difficulty"] == "beginner" for question in first["questions"][:8]
        ))

    def test_level_changes_difficulty_priority(self):
        candidates = make_questions()
        intermediate = assemble_quiz(candidates, "intermediate")
        advanced = assemble_quiz(candidates, "advanced")
        self.assertEqual(intermediate["questions"][0]["difficulty"], "intermediate")
        self.assertEqual(advanced["questions"][0]["difficulty"], "advanced")

    def test_incomplete_bank_returns_none_for_groq_fallback(self):
        self.assertIsNone(assemble_quiz(make_questions()[:19], "beginner"))

    def test_generation_key_is_versioned_and_level_specific(self):
        self.assertEqual(
            generation_key("frontend-developer", "beginner"),
            "question-bank:frontend-developer:beginner:v1",
        )
        self.assertNotEqual(
            generation_key("frontend-developer", "beginner"),
            generation_key("frontend-developer", "advanced"),
        )


if __name__ == "__main__":
    unittest.main()
