import unittest
from collections import Counter

import seed_frontend_knowledge as seed_data


class FrontendKnowledgeSeedTests(unittest.TestCase):
    def test_every_skill_has_one_question_at_each_difficulty(self):
        counts = Counter((question[0], question[1]) for question in seed_data.QUESTIONS)
        for skill_slug, *_ in seed_data.SKILLS:
            for difficulty in ("beginner", "intermediate", "advanced"):
                self.assertEqual(counts[(skill_slug, difficulty)], 1)

    def test_prerequisites_reference_known_distinct_skills(self):
        known = {skill[0] for skill in seed_data.SKILLS}
        for skill_slug, prerequisite_slug in seed_data.PREREQUISITES:
            self.assertIn(skill_slug, known)
            self.assertIn(prerequisite_slug, known)
            self.assertNotEqual(skill_slug, prerequisite_slug)

    def test_questions_have_four_options_and_valid_answers(self):
        prompts = set()
        for question in seed_data.QUESTIONS:
            _, _, prompt, *options, correct, explanation = question
            self.assertEqual(len(options), 4)
            self.assertIn(correct, {"A", "B", "C", "D"})
            self.assertTrue(explanation)
            self.assertNotIn(prompt, prompts)
            prompts.add(prompt)


if __name__ == "__main__":
    unittest.main()
