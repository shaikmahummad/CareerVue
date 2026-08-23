import unittest

from app.rag.course_retriever import RetrievedCourse
from app.services.roadmap_service import build_catalog_roadmap


class CatalogRoadmapTests(unittest.TestCase):
    def test_weakest_assessed_skill_is_prioritized(self):
        roadmap = build_catalog_roadmap(
            "Frontend Developer",
            [
                {"topic": "React", "score_pct": 80},
                {"topic": "CSS", "score_pct": 25},
            ],
            [],
        )

        self.assertEqual([item["topic"] for item in roadmap], ["CSS", "React"])
        self.assertEqual(roadmap[0]["recommended_course_type"], "beginner")
        self.assertEqual(roadmap[1]["recommended_course_type"], "advanced")

    def test_approved_catalog_drives_roadmap_without_assessment(self):
        course = RetrievedCourse(
            id="00000000-0000-0000-0000-000000000001",
            title="HTML Foundations",
            description="Learn semantic HTML.",
            category="Web Development",
            level="beginner",
            tags=("html", "frontend"),
            modules=("Semantic HTML",),
            score=5,
        )

        roadmap = build_catalog_roadmap("Frontend Developer", [], [course])

        self.assertEqual(len(roadmap), 1)
        self.assertEqual(roadmap[0]["topic"], "HTML Foundations")
        self.assertEqual(roadmap[0]["recommended_course_type"], "beginner")
        self.assertIn("html", roadmap[0]["search_keywords"])


if __name__ == "__main__":
    unittest.main()
