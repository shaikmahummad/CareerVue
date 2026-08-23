import unittest
from collections import Counter

import seed_question_banks as bank
from app.services.question_bank_service import BankQuestion, assemble_quiz


ADVERTISED_CAREERS = {
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "Data Scientist",
    "Machine Learning Engineer",
    "DevOps Engineer",
    "Android Developer",
    "Cloud Architect",
    "UI/UX Designer",
    "Cybersecurity Analyst",
    "Product Manager",
}
DIFFICULTIES = {"beginner", "intermediate", "advanced"}


def candidates_for(career_slug: str) -> list[BankQuestion]:
    skill_rows = bank.CAREERS[career_slug][2]
    order = {skill_slug: index for index, (skill_slug, *_) in enumerate(skill_rows, 1)}
    importance = {
        skill_slug: importance
        for skill_slug, _target, importance, _required in skill_rows
    }
    skill_names = {slug: name for slug, name, *_ in bank.SKILLS}
    questions = []
    for index, question in enumerate(bank.QUESTIONS):
        skill_slug, difficulty, prompt, a, b, c, d, correct, explanation = question
        if skill_slug not in order:
            continue
        questions.append(BankQuestion(
            id=f"{career_slug}-{index}",
            skill_name=skill_names[skill_slug],
            career_order=order[skill_slug],
            importance=importance[skill_slug],
            prompt=prompt,
            options={"A": a, "B": b, "C": c, "D": d},
            correct_option=correct,
            explanation=explanation,
            difficulty=difficulty,
        ))
    return questions


class AllQuestionBanksTests(unittest.TestCase):
    def test_every_advertised_career_has_a_bank(self):
        self.assertEqual(
            {career[0] for career in bank.CAREERS.values()},
            ADVERTISED_CAREERS,
        )

    def test_every_skill_has_source_backed_leveled_questions(self):
        skill_slugs = {skill[0] for skill in bank.SKILLS}
        counts = Counter((question[0], question[1]) for question in bank.QUESTIONS)

        self.assertEqual(set(bank.SKILL_SOURCES), skill_slugs)
        for skill_slug in skill_slugs:
            source_key = bank.SKILL_SOURCES[skill_slug]
            self.assertIn(source_key, bank.SOURCES)
            self.assertTrue(bank.SOURCES[source_key][2].startswith("https://"))
            for difficulty in DIFFICULTIES:
                self.assertEqual(counts[(skill_slug, difficulty)], 1)

    def test_every_career_has_twelve_skills_and_all_levels(self):
        for career_slug in bank.CAREERS:
            candidates = candidates_for(career_slug)
            counts = Counter(question.difficulty for question in candidates)
            self.assertEqual(len(bank.CAREERS[career_slug][2]), 12, career_slug)
            self.assertEqual(len(candidates), 36, career_slug)
            for difficulty in DIFFICULTIES:
                self.assertEqual(counts[difficulty], 12, career_slug)

    def test_every_career_assembles_all_three_assessment_profiles(self):
        expected_mix = {
            "beginner": Counter({"beginner": 12, "intermediate": 8}),
            "intermediate": Counter({"intermediate": 12, "advanced": 8}),
            "advanced": Counter({"advanced": 12, "intermediate": 8}),
        }
        for career_slug in bank.CAREERS:
            candidates = candidates_for(career_slug)
            for level in DIFFICULTIES:
                quiz = assemble_quiz(candidates, level)
                self.assertIsNotNone(quiz, f"{career_slug}:{level}")
                self.assertEqual(len(quiz["questions"]), 20)
                self.assertEqual(quiz["questions"][0]["difficulty"], level)
                self.assertEqual(
                    Counter(question["difficulty"] for question in quiz["questions"]),
                    expected_mix[level],
                    f"{career_slug}:{level}",
                )

    def test_question_contract_and_answer_positions(self):
        prompts = set()
        answer_counts = Counter()
        for question in bank.QUESTIONS:
            skill, difficulty, prompt, a, b, c, d, correct, explanation = question
            self.assertIn(skill, {row[0] for row in bank.SKILLS})
            self.assertIn(difficulty, DIFFICULTIES)
            self.assertNotIn(prompt, prompts)
            self.assertEqual(len({a, b, c, d}), 4)
            self.assertIn(correct, "ABCD")
            self.assertGreaterEqual(len(explanation), 20)
            prompts.add(prompt)
            answer_counts[correct] += 1

        self.assertLessEqual(max(answer_counts.values()) - min(answer_counts.values()), 1)

    def test_taxonomy_references_known_distinct_skills(self):
        known = {skill[0] for skill in bank.SKILLS}
        for career_slug, (_, _, career_skills) in bank.CAREERS.items():
            mapped = [row[0] for row in career_skills]
            self.assertEqual(len(mapped), len(set(mapped)), career_slug)
            self.assertTrue(set(mapped).issubset(known))
        for skill_slug, prerequisite_slug in bank.PREREQUISITES:
            self.assertIn(skill_slug, known)
            self.assertIn(prerequisite_slug, known)
            self.assertNotEqual(skill_slug, prerequisite_slug)


if __name__ == "__main__":
    unittest.main()
