import openai
import json
from typing import Optional
from app.config import settings

client = openai.OpenAI(
    api_key=settings.groq_api_key,
    base_url="https://api.groq.com/openai/v1",
)
MODEL = "llama-3.3-70b-versatile"


def _extract_json(raw: str) -> str:
    """
    Robustly pull the first complete JSON object or array out of a raw LLM
    response, regardless of surrounding prose or markdown fences.
    Uses bracket matching to correctly handle nested structures.
    """
    text = raw.strip()

    # Strip markdown code fences first
    if "```" in text:
        start = text.find("```")
        end = text.rfind("```")
        if end > start:
            inner = text[start + 3: end]
            first_newline = inner.find("\n")
            if first_newline != -1:
                inner = inner[first_newline + 1:]
            text = inner.strip()

    # Pick whichever outermost structure appears first in the text
    bracket_idx = text.find('[')
    brace_idx = text.find('{')

    if bracket_idx == -1 and brace_idx == -1:
        return text

    if bracket_idx == -1:
        opener, closer, idx = '{', '}', brace_idx
    elif brace_idx == -1:
        opener, closer, idx = '[', ']', bracket_idx
    elif bracket_idx < brace_idx:
        opener, closer, idx = '[', ']', bracket_idx
    else:
        opener, closer, idx = '{', '}', brace_idx

    depth = 0
    in_string = False
    escape_next = False
    for i, char in enumerate(text[idx:], idx):
        if escape_next:
            escape_next = False
            continue
        if char == '\\' and in_string:
            escape_next = True
            continue
        if char == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if char == opener:
            depth += 1
        elif char == closer:
            depth -= 1
            if depth == 0:
                return text[idx: i + 1]

    return text


def _chat(system: str, user: str, max_tokens: int = 8000) -> str:
    response = client.chat.completions.create(
        model=MODEL,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    return response.choices[0].message.content


def generate_quiz(goal: str, num_questions: int = 20, skill_level: str = "beginner") -> dict:
    topics_per_question = num_questions // 5

    difficulty_instructions = {
        "beginner":     "Focus on foundational concepts. Mix of beginner (60%) and intermediate (40%) questions.",
        "intermediate": "Focus on applied knowledge. Mix of intermediate (60%) and advanced (40%) questions. Avoid basic recall questions.",
        "advanced":     "Focus on advanced topics, edge cases, best practices, and system design. All intermediate-to-advanced questions.",
    }.get(skill_level, "Mix of beginner (60%) and intermediate (40%) questions.")

    prompt = f"""Generate a {num_questions}-question multiple choice quiz to assess a student's current skill level for the goal: "{goal}".

Difficulty profile: {difficulty_instructions}

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

    raw = _chat(
        system="You are an expert technical educator who creates precise, relevant assessment questions. Always return valid JSON only.",
        user=prompt,
        max_tokens=8000,
    )
    return json.loads(_extract_json(raw))


def assess_skills(goal: str, questions: list[dict], answers: list[dict]) -> list[dict]:
    q_map: dict[str, dict] = {q["id"]: q for q in questions}

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

    raw = _chat(
        system="You are a career coach and curriculum designer. Return valid JSON only.",
        user=prompt,
        max_tokens=4000,
    )
    return json.loads(_extract_json(raw))


def parse_resume(resume_text: str, job_description: Optional[str] = None) -> dict:
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

    raw = _chat(
        system="You are an expert resume analyst. Return valid JSON only.",
        user=prompt,
        max_tokens=2000,
    )
    return json.loads(_extract_json(raw))
