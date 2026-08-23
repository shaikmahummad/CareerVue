"""Idempotently seed every CareerVue career taxonomy and question bank.

Run after migrations from the backend directory:
    python seed_question_banks.py
"""
import asyncio
import hashlib
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv()

from app.database import AsyncSessionLocal
from app.models.knowledge import (
    CareerRole,
    CareerSkill,
    QuestionSource,
    QuizQuestion,
    Skill,
    SkillPrerequisite,
)
from question_banks import (
    CAREERS as ADDITIONAL_CAREERS,
    PREREQUISITES as ADDITIONAL_PREREQUISITES,
    QUESTIONS as ADDITIONAL_QUESTIONS,
    SKILLS as ADDITIONAL_SKILLS,
    SKILL_SOURCES as ADDITIONAL_SKILL_SOURCES,
    SOURCES as ADDITIONAL_SOURCES,
)
from seed_frontend_knowledge import (
    CAREER_SKILLS as FRONTEND_CAREER_SKILLS,
    PREREQUISITES as FRONTEND_PREREQUISITES,
    QUESTIONS as FRONTEND_QUESTIONS,
    SKILLS as FRONTEND_SKILLS,
    SKILL_SOURCES as FRONTEND_SKILL_SOURCES,
    SOURCES as FRONTEND_SOURCES,
    stable_id,
    upsert,
)


FRONTEND_CAREER = {
    "frontend-developer": (
        "Frontend Developer",
        "Build accessible, tested, responsive web interfaces using modern JavaScript and component frameworks.",
        [
            (slug, target, importance, required)
            for slug, target, importance, _order, required in FRONTEND_CAREER_SKILLS
        ] + [
            ("nodejs", "beginner", 2, False),
            ("http-api", "intermediate", 4, True),
            ("authentication-security", "intermediate", 4, True),
            ("caching", "beginner", 2, False),
        ],
    )
}

CAREERS = {**FRONTEND_CAREER, **ADDITIONAL_CAREERS}
SKILLS = [*FRONTEND_SKILLS, *ADDITIONAL_SKILLS]
SOURCES = {**FRONTEND_SOURCES, **ADDITIONAL_SOURCES}
SKILL_SOURCES = {**FRONTEND_SKILL_SOURCES, **ADDITIONAL_SKILL_SOURCES}
PREREQUISITES = [*FRONTEND_PREREQUISITES, *ADDITIONAL_PREREQUISITES]
_RAW_QUESTIONS = [*FRONTEND_QUESTIONS, *ADDITIONAL_QUESTIONS]


def _balance_answer_positions(questions: list[tuple]) -> list[tuple]:
    """Distribute correct options without changing any question semantics."""
    balanced = []
    labels = "ABCD"
    for index, question in enumerate(questions):
        skill, difficulty, prompt, a, b, c, d, correct, explanation = question
        options = [a, b, c, d]
        correct_index = labels.index(correct)
        target_index = index % len(labels)
        options[correct_index], options[target_index] = (
            options[target_index],
            options[correct_index],
        )
        balanced.append((
            skill,
            difficulty,
            prompt,
            *options,
            labels[target_index],
            explanation,
        ))
    return balanced


QUESTIONS = _balance_answer_positions(_RAW_QUESTIONS)


async def seed() -> None:
    now = datetime.now(timezone.utc)
    skill_ids = {slug: stable_id("skill", slug) for slug, *_ in SKILLS}
    source_ids = {
        key: stable_id("source", values[2]) for key, values in SOURCES.items()
    }

    async with AsyncSessionLocal() as session:
        for slug, title, category, description in SKILLS:
            await upsert(session, Skill, {
                "id": skill_ids[slug],
                "slug": slug,
                "name": title,
                "category": category,
                "description": description,
                "is_active": True,
            }, ["slug"], ["name", "category", "description", "is_active", "updated_at"])

        for source_key, (title, publisher, url, license_name) in SOURCES.items():
            await upsert(session, QuestionSource, {
                "id": source_ids[source_key],
                "title": title,
                "publisher": publisher,
                "url": url,
                "license": license_name,
                "accessed_at": now,
            }, ["url"], ["title", "publisher", "license", "accessed_at"])

        for career_slug, (title, description, career_skills) in CAREERS.items():
            career_id = stable_id("career", career_slug)
            await upsert(session, CareerRole, {
                "id": career_id,
                "slug": career_slug,
                "title": title,
                "description": description,
                "is_active": True,
            }, ["slug"], ["title", "description", "is_active", "updated_at"])

            for order_index, (skill_slug, target, importance, required) in enumerate(
                career_skills, start=1
            ):
                await upsert(session, CareerSkill, {
                    "id": stable_id("career-skill", f"{career_slug}:{skill_slug}"),
                    "career_id": career_id,
                    "skill_id": skill_ids[skill_slug],
                    "target_level": target,
                    "importance": importance,
                    "order_index": order_index,
                    "is_required": required,
                }, ["career_id", "skill_id"], [
                    "target_level", "importance", "order_index", "is_required"
                ])

        for skill_slug, prerequisite_slug in PREREQUISITES:
            await upsert(session, SkillPrerequisite, {
                "id": stable_id("prerequisite", f"{skill_slug}:{prerequisite_slug}"),
                "skill_id": skill_ids[skill_slug],
                "prerequisite_skill_id": skill_ids[prerequisite_slug],
                "is_required": True,
            }, ["skill_id", "prerequisite_skill_id"], ["is_required"])

        for skill_slug, difficulty, prompt, a, b, c, d, correct, explanation in QUESTIONS:
            fingerprint = hashlib.sha256(
                f"{skill_slug}:{prompt}".lower().encode()
            ).hexdigest()
            await upsert(session, QuizQuestion, {
                "id": stable_id("question", fingerprint),
                "skill_id": skill_ids[skill_slug],
                "source_id": source_ids[SKILL_SOURCES[skill_slug]],
                "fingerprint": fingerprint,
                "prompt": prompt,
                "options": {"A": a, "B": b, "C": c, "D": d},
                "correct_option": correct,
                "explanation": explanation,
                "difficulty": difficulty,
                "status": "approved",
                "version": 1,
                "reviewed_at": now,
            }, ["fingerprint"], [
                "skill_id", "source_id", "prompt", "options", "correct_option",
                "explanation", "difficulty", "status", "version", "reviewed_at", "updated_at",
            ])

        await session.commit()
        print(
            f"Seeded {len(CAREERS)} careers, {len(SKILLS)} skills, "
            f"{len(PREREQUISITES)} prerequisites, and {len(QUESTIONS)} approved questions."
        )


if __name__ == "__main__":
    asyncio.run(seed())
