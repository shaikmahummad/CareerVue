"""Reviewed, deterministic question-bank data used by the seed command."""

from question_banks.catalog import CAREERS, PREREQUISITES, SKILLS, SKILL_SOURCES, SOURCES
from question_banks.engineering_questions import QUESTIONS as ENGINEERING_QUESTIONS
from question_banks.specialist_questions import QUESTIONS as SPECIALIST_QUESTIONS

QUESTIONS = [*ENGINEERING_QUESTIONS, *SPECIALIST_QUESTIONS]

__all__ = [
    "CAREERS",
    "PREREQUISITES",
    "QUESTIONS",
    "SKILLS",
    "SKILL_SOURCES",
    "SOURCES",
]
