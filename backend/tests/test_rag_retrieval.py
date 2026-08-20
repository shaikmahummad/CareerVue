import unittest
import uuid

from app.rag.course_retriever import RetrievedCourse, text_relevance
from app.services.roadmap_service import _match_retrieved_course


class RetrievalTests(unittest.TestCase):
    def test_text_relevance_is_case_insensitive_and_token_based(self):
        self.assertGreater(
            text_relevance("React state management", "Managing State with React Hooks"),
            0,
        )
        self.assertEqual(text_relevance("Python", "Advanced CSS"), 0)

    def test_roadmap_item_matches_retrieved_catalog_evidence(self):
        react_id = uuid.uuid4()
        python_id = uuid.uuid4()
        courses = [
            RetrievedCourse(
                id=str(python_id),
                title="Python Foundations",
                description="",
                category="Backend",
                level="beginner",
                tags=("python",),
                modules=("Functions",),
                score=1,
            ),
            RetrievedCourse(
                id=str(react_id),
                title="Modern React",
                description="",
                category="Frontend",
                level="intermediate",
                tags=("react", "javascript"),
                modules=("State Management", "React Hooks"),
                score=8,
            ),
        ]

        matched = _match_retrieved_course(
            {
                "topic": "React state management",
                "search_keywords": ["hooks"],
                "recommended_course_type": "intermediate",
            },
            courses,
        )

        self.assertEqual(matched, react_id)


if __name__ == "__main__":
    unittest.main()
