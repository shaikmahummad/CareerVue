import re
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge import CareerRole, CareerSkill, QuizQuestion, Skill


QUESTION_BANK_VERSION = 1
DEFAULT_QUESTION_COUNT = 20

_FRONTEND_ALIASES = {
    "frontend",
    "front end",
    "frontend developer",
    "front end developer",
    "frontend engineer",
    "front end engineer",
    "react developer",
    "react frontend developer",
    "web frontend developer",
}


def _normalize_goal(goal: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", " ", goal.lower()).strip()
    return re.sub(r"\s+", " ", normalized)


def resolve_career_slug(goal: str) -> str | None:
    """Resolve only deliberate aliases; broad goals continue to Groq."""
    return "frontend-developer" if _normalize_goal(goal) in _FRONTEND_ALIASES else None


def generation_key(career_slug: str, skill_level: str) -> str:
    return f"question-bank:{career_slug}:{skill_level}:v{QUESTION_BANK_VERSION}"


@dataclass(frozen=True)
class BankQuestion:
    id: str
    skill_name: str
    career_order: int
    importance: int
    prompt: str
    options: dict[str, str]
    correct_option: str
    explanation: str
    difficulty: str


_DIFFICULTY_PREFERENCE = {
    "beginner": {"beginner": 0, "intermediate": 1, "advanced": 2},
    "intermediate": {"intermediate": 0, "advanced": 1, "beginner": 2},
    "advanced": {"advanced": 0, "intermediate": 1, "beginner": 2},
}


def assemble_quiz(
    candidates: list[BankQuestion],
    skill_level: str,
    *,
    num_questions: int = DEFAULT_QUESTION_COUNT,
) -> dict | None:
    """Build a stable quiz or return None when verified coverage is insufficient."""
    if len(candidates) < num_questions:
        return None

    preference = _DIFFICULTY_PREFERENCE.get(
        skill_level, _DIFFICULTY_PREFERENCE["beginner"]
    )
    selected = sorted(
        candidates,
        key=lambda question: (
            preference.get(question.difficulty, 99),
            -question.importance,
            question.career_order,
            question.id,
        ),
    )[:num_questions]

    topic_areas = list(dict.fromkeys(question.skill_name for question in selected))
    return {
        "topic_areas": topic_areas,
        "questions": [
            {
                "id": question.id,
                "topic": question.skill_name,
                "question": question.prompt,
                "options": dict(question.options),
                "correct": question.correct_option,
                "difficulty": question.difficulty,
                "explanation": question.explanation,
            }
            for question in selected
        ],
    }


async def build_verified_quiz(
    db: AsyncSession,
    goal: str,
    skill_level: str,
    *,
    num_questions: int = DEFAULT_QUESTION_COUNT,
) -> tuple[str, str, dict] | None:
    """Load approved questions for a supported career and assemble a quiz."""
    career_slug = resolve_career_slug(goal)
    if career_slug is None:
        return None

    rows = (
        await db.execute(
            select(QuizQuestion, Skill, CareerSkill)
            .join(Skill, QuizQuestion.skill_id == Skill.id)
            .join(CareerSkill, CareerSkill.skill_id == Skill.id)
            .join(CareerRole, CareerSkill.career_id == CareerRole.id)
            .where(
                CareerRole.slug == career_slug,
                CareerRole.is_active.is_(True),
                Skill.is_active.is_(True),
                QuizQuestion.status == "approved",
                QuizQuestion.reviewed_at.is_not(None),
            )
        )
    ).all()

    candidates = [
        BankQuestion(
            id=str(question.id),
            skill_name=skill.name,
            career_order=career_skill.order_index,
            importance=career_skill.importance,
            prompt=question.prompt,
            options=question.options,
            correct_option=question.correct_option,
            explanation=question.explanation,
            difficulty=question.difficulty,
        )
        for question, skill, career_skill in rows
    ]
    quiz = assemble_quiz(candidates, skill_level, num_questions=num_questions)
    return (career_slug, "Frontend Developer", quiz) if quiz else None
