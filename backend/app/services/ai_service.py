import anthropic
import json
from app.config import settings

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

QUIZ_SYSTEM_PROMPT = """You are an expert technical interviewer. Generate quiz questions to assess a student's skill level for their target career goal.
Return ONLY valid JSON — no markdown, no extra text."""

ROADMAP_SYSTEM_PROMPT = """You are a career coach and curriculum designer. Generate a personalized learning roadmap based on quiz results.
Return ONLY valid JSON — no markdown, no extra text."""


def generate_quiz(career_goal: str, num_questions: int = 20) -> list[dict]:
    """Generate MCQ quiz questions for a given career goal."""
    prompt = f"""Generate {num_questions} multiple-choice questions to assess skills for: "{career_goal}".

Cover 4-5 distinct topics. Each question must have exactly 4 options (A, B, C, D).

Return JSON array:
[
  {{
    "topic": "string",
    "question_text": "string",
    "options": {{"A": "string", "B": "string", "C": "string", "D": "string"}},
    "correct_option": "A|B|C|D"
  }}
]"""

    message = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=4096,
        system=QUIZ_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    return json.loads(message.content[0].text)


def generate_roadmap(career_goal: str, quiz_results: list[dict]) -> list[dict]:
    """Generate a prioritized learning roadmap based on quiz skill assessment."""
    results_text = json.dumps(quiz_results, indent=2)
    prompt = f"""Career goal: "{career_goal}"

Quiz skill assessment results:
{results_text}

Generate a prioritized learning roadmap. Prioritize weak topics first, then intermediate, then strong (for reinforcement).

Return JSON array:
[
  {{
    "topic": "string",
    "skill_level": "strong|intermediate|weak",
    "order_index": 1,
    "notes": "Brief description of what to learn/improve"
  }}
]"""

    message = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=2048,
        system=ROADMAP_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    return json.loads(message.content[0].text)


def parse_resume_ats(resume_text: str, job_description: str) -> dict:
    """Parse resume against a job description ATS-style."""
    prompt = f"""Analyze this resume against the job description.

JOB DESCRIPTION:
{job_description}

RESUME:
{resume_text}

Return JSON:
{{
  "ats_score": 0-100,
  "matched_keywords": ["string"],
  "missing_keywords": ["string"],
  "suggestions": ["string"],
  "summary": "string"
}}"""

    message = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return json.loads(message.content[0].text)
