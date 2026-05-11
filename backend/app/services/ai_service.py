import anthropic
import json
from typing import Optional
from app.config import settings

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
MODEL = "claude-opus-4-7"


def _strip_markdown_json(raw: str) -> str:
    """Strip markdown code fences from a raw Claude response."""
    text = raw.strip()
    if text.startswith("```"):
        # Remove opening fence line
        lines = text.split("\n", 1)
        if len(lines) > 1:
            text = lines[1]
        # Remove closing fence
        if text.endswith("```"):
            text = text[: text.rfind("```")]
    return text.strip()


def generate_quiz(goal: str, num_questions: int = 20) -> dict:
    """
    Generate a num_questions-question MCQ quiz for a given career goal.

    Returns:
        {
            "topic_areas": [...],
            "questions": [
                {
                    "id": "q1",
                    "topic": "...",
                    "question": "...",
                    "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
                    "correct": "A",
                    "difficulty": "beginner|intermediate|advanced",
                    "explanation": "..."
                },
                ...
            ]
        }
    """
    topics_per_question = num_questions // 5

    prompt = f"""Generate a {num_questions}-question multiple choice quiz to assess a student's current skill level for the goal: "{goal}".

Cover exactly 5 different topic areas relevant to this goal ({topics_per_question} questions each).
Each question must have:
- 4 options labeled A, B, C, D
- Exactly one correct answer
- A difficulty level: beginner, intermediate, or advanced
- A brief explanation of the correct answer

Return ONLY valid JSON with this exact structure, no markdown:
{{
  "topic_areas": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "questions": [
    {{
      "id": "q1",
      "topic": "topic name",
      "question": "Question text here?",
      "options": {{
        "A": "Option A text",
        "B": "Option B text",
        "C": "Option C text",
        "D": "Option D text"
      }},
      "correct": "A",
      "difficulty": "beginner",
      "explanation": "Brief explanation of why A is correct"
    }}
  ]
}}"""

    message = client.messages.create(
        model=MODEL,
        max_tokens=8000,
        system=(
            "You are an expert technical educator who creates precise, relevant assessment "
            "questions. Always return valid JSON only."
        ),
        messages=[{"role": "user", "content": prompt}],
    )

    raw = _strip_markdown_json(message.content[0].text)
    data = json.loads(raw)
    return data


def assess_skills(goal: str, questions: list[dict], answers: list[dict]) -> list[dict]:
    """
    Assess skills from quiz answers.

    Args:
        goal:      The career goal string (unused in calculation, kept for signature parity).
        questions: List of question objects from the quiz template (must contain "id", "topic",
                   "correct" keys).
        answers:   List of {"question_id": str, "selected_option": str}.

    Returns:
        list of {"topic", "level", "score_pct", "correct_count", "total_count"}
    """
    # Build question lookup by id
    q_map: dict[str, dict] = {q["id"]: q for q in questions}

    # Group answers by topic
    topic_stats: dict[str, dict] = {}
    for answer in answers:
        q = q_map.get(answer["question_id"])
        if not q:
            continue
        topic = q["topic"]
        if topic not in topic_stats:
            topic_stats[topic] = {"correct": 0, "total": 0}
        topic_stats[topic]["total"] += 1
        if answer["selected_option"] == q["correct"]:
            topic_stats[topic]["correct"] += 1

    results: list[dict] = []
    for topic, stats in topic_stats.items():
        total = stats["total"]
        correct = stats["correct"]
        pct = int((correct / total) * 100) if total > 0 else 0
        level = "strong" if pct >= 75 else "intermediate" if pct >= 40 else "weak"
        results.append(
            {
                "topic": topic,
                "level": level,
                "score_pct": pct,
                "correct_count": correct,
                "total_count": total,
            }
        )

    return results


def generate_roadmap(goal: str, skill_profile: list[dict]) -> list[dict]:
    """
    Generate personalized learning roadmap items via Claude.

    Args:
        goal:          Career goal string.
        skill_profile: List of {"topic", "level", "score_pct"}.

    Returns:
        List of roadmap items:
        [
            {
                "topic": str,
                "reason": str,
                "priority": int,
                "recommended_course_type": "beginner|intermediate|advanced",
                "search_keywords": [str, ...],
                "order_index": int
            },
            ...
        ]
    """
    profile_text = json.dumps(skill_profile, indent=2)

    prompt = f"""A student's career goal is: "{goal}"

Their current skill assessment:
{profile_text}

Generate a personalized learning roadmap. Rules:
- Weak topics (score < 40%): recommend beginner fundamentals first
- Intermediate topics (score 40-74%): recommend project-based or intermediate courses
- Strong topics (score >= 75%): recommend advanced/specialization courses (optional, for depth)
- Order from foundational to advanced (weak topics usually first)
- Be specific and actionable

Return ONLY valid JSON array, no markdown:
[
  {{
    "topic": "Specific topic name",
    "reason": "Why this topic at this point in the roadmap",
    "priority": 1,
    "recommended_course_type": "beginner|intermediate|advanced",
    "search_keywords": ["keyword1", "keyword2", "keyword3"],
    "order_index": 1
  }}
]"""

    message = client.messages.create(
        model=MODEL,
        max_tokens=4000,
        system="You are a career coach and curriculum designer. Return valid JSON only.",
        messages=[{"role": "user", "content": prompt}],
    )

    raw = _strip_markdown_json(message.content[0].text)
    data = json.loads(raw)
    return data


def parse_resume(resume_text: str, job_description: Optional[str] = None) -> dict:
    """
    Parse resume and return structured data.
    If job_description is provided, also performs ATS keyword analysis.

    Returns:
        {
            "skills": [...],
            "experience": [...],
            "education": [...],
            "ats_score": int,
            "matched_keywords": [...],
            "missing_keywords": [...],
            "suggestions": [...],
            "summary": str
        }
    """
    jd_section = (
        f"\nJob Description to match against:\n{job_description}"
        if job_description
        else ""
    )

    prompt = f"""Analyze this resume{' against the provided job description' if job_description else ''}:

RESUME:
{resume_text}{jd_section}

Return ONLY valid JSON:
{{
  "skills": ["skill1", "skill2"],
  "experience": [{{"title": "...", "company": "...", "duration": "...", "highlights": ["..."]}}],
  "education": [{{"degree": "...", "institution": "...", "year": "..."}}],
  "ats_score": 75,
  "matched_keywords": ["keyword1"],
  "missing_keywords": ["keyword2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "summary": "Brief assessment of the resume"
}}"""

    message = client.messages.create(
        model=MODEL,
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = _strip_markdown_json(message.content[0].text)
    return json.loads(raw)
