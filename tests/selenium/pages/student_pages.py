from __future__ import annotations

from selenium.webdriver.common.by import By
from .base_page import BasePage


class StudentDashboardPage(BasePage):
    ENROLLED_COURSES = (By.CSS_SELECTOR, "[data-testid='enrolled-course'], .course-card")
    STATS_SECTION = (By.CSS_SELECTOR, "[data-testid='student-stats']")

    def open_dashboard(self) -> StudentDashboardPage:
        self.open("/dashboard")
        return self


class CoursesCatalogPage(BasePage):
    SEARCH_INPUT = (By.CSS_SELECTOR, "input[placeholder*='Search courses']")
    CATEGORY_FILTER = (By.CSS_SELECTOR, "button[data-filter='category'], select[name='category']")
    COURSE_CARDS = (By.CSS_SELECTOR, "a[href*='/courses/'], .course-card")

    def open_catalog(self) -> CoursesCatalogPage:
        self.open("/courses")
        return self

    def search_course(self, query: str) -> None:
        self.send_keys(*self.SEARCH_INPUT, query)


class CourseDetailPage(BasePage):
    ENROLL_BUTTON = (By.XPATH, "//button[contains(., 'Enroll') or contains(., 'Start Learning')]")
    SYLLABUS = (By.CSS_SELECTOR, "[data-testid='course-syllabus'], .modules-list")

    def open_course(self, course_id: str) -> CourseDetailPage:
        self.open(f"/courses/{course_id}")
        return self


class QuizPage(BasePage):
    QUESTION_CONTAINER = (By.CSS_SELECTOR, "[data-testid='quiz-question']")
    OPTION_BUTTONS = (By.CSS_SELECTOR, "button[data-testid*='option-']")
    SUBMIT_QUIZ_BTN = (By.XPATH, "//button[contains(., 'Submit')]")

    def open_quiz(self) -> QuizPage:
        self.open("/quiz")
        return self


class RoadmapPage(BasePage):
    ROADMAP_CONTAINER = (By.CSS_SELECTOR, "[data-testid='career-roadmap'], .roadmap-container")

    def open_roadmap(self) -> RoadmapPage:
        self.open("/roadmap")
        return self


class AnalyticsPage(BasePage):
    CHARTS = (By.CSS_SELECTOR, "canvas, svg.recharts-surface, [data-testid='analytics-chart']")

    def open_analytics(self) -> AnalyticsPage:
        self.open("/analytics")
        return self


class ProfilePage(BasePage):
    BIO_INPUT = (By.CSS_SELECTOR, "textarea[name='bio'], input[name='bio']")
    SAVE_PROFILE_BTN = (By.XPATH, "//button[contains(., 'Save')]")

    def open_profile(self) -> ProfilePage:
        self.open("/profile")
        return self


class SettingsPage(BasePage):
    NOTIFICATION_TOGGLE = (By.CSS_SELECTOR, "input[type='checkbox']")
    SAVE_SETTINGS_BTN = (By.XPATH, "//button[contains(., 'Save') or contains(., 'Update')]")

    def open_settings(self) -> SettingsPage:
        self.open("/settings")
        return self

