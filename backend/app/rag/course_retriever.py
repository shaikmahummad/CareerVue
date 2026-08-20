import re
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.course import Course


_TOKEN_RE = re.compile(r"[a-z0-9+#.]+")


def _tokens(value: str) -> set[str]:
    return {token for token in _TOKEN_RE.findall(value.lower()) if len(token) > 1}


def text_relevance(query: str, *values: str) -> int:
    """Return a stable token-overlap score for local ranking and matching."""
    query_tokens = _tokens(query)
    return sum(len(query_tokens & _tokens(value)) for value in values if value)


@dataclass(frozen=True)
class RetrievedCourse:
    id: str
    title: str
    description: str
    category: str
    level: str
    tags: tuple[str, ...]
    modules: tuple[str, ...]
    score: float

    def as_prompt_context(self) -> dict:
        return {
            "course_id": self.id,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "level": self.level,
            "tags": list(self.tags),
            "modules": list(self.modules),
        }


def _rank_course(course: Course, query_tokens: set[str]) -> float:
    title_tokens = _tokens(course.title or "")
    tag_tokens = _tokens(" ".join(course.tags or []))
    category_tokens = _tokens(course.category or "")
    description_tokens = _tokens(course.description or "")
    module_tokens = _tokens(
        " ".join(f"{module.title} {module.description or ''}" for module in course.modules)
    )
    # Exact catalog metadata is more authoritative than long-form descriptions.
    return (
        5 * len(query_tokens & title_tokens)
        + 4 * len(query_tokens & tag_tokens)
        + 3 * len(query_tokens & category_tokens)
        + 2 * len(query_tokens & module_tokens)
        + len(query_tokens & description_tokens)
    )


async def retrieve_courses(
    db: AsyncSession,
    query: str,
    *,
    limit: int = 8,
) -> list[RetrievedCourse]:
    """Retrieve approved catalog knowledge using a deterministic lexical ranker.

    This is deliberately dependency-free. Its interface can later be backed by
    pgvector without changing the quiz or roadmap services.
    """
    query_tokens = _tokens(query)
    if not query_tokens:
        return []

    courses = (
        await db.execute(
            select(Course)
            .where(Course.status == "approved")
            .options(selectinload(Course.modules))
        )
    ).scalars().unique().all()

    ranked = sorted(
        ((course, _rank_course(course, query_tokens)) for course in courses),
        key=lambda item: (-item[1], item[0].title.lower()),
    )
    return [
        RetrievedCourse(
            id=str(course.id),
            title=course.title,
            description=course.description or "",
            category=course.category or "",
            level=course.level or "",
            tags=tuple(course.tags or []),
            modules=tuple(module.title for module in course.modules),
            score=score,
        )
        for course, score in ranked[:limit]
        if score > 0
    ]
