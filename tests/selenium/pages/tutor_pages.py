from __future__ import annotations

from selenium.webdriver.common.by import By
from .base_page import BasePage


class TutorDashboardPage(BasePage):
    TUTOR_STATS = (By.CSS_SELECTOR, "[data-testid='tutor-stats']")
    CREATE_COURSE_BTN = (By.CSS_SELECTOR, "a[href='/tutor/courses/new']")

    def open_dashboard(self) -> TutorDashboardPage:
        self.open("/tutor/dashboard")
        return self


class CourseCreationPage(BasePage):
    TITLE_INPUT = (By.CSS_SELECTOR, "input[placeholder*='React'], input[name='title']")
    DESCRIPTION_INPUT = (By.CSS_SELECTOR, "textarea[placeholder*='learn'], textarea[name='description']")
    PRICE_INPUT = (By.CSS_SELECTOR, "input[name='price'], input[type='number']")
    SAVE_CONTINUE_BTN = (By.XPATH, "//button[contains(., 'Save & Continue') or contains(., 'Save')]")

    def open_create(self) -> CourseCreationPage:
        self.open("/tutor/courses/new")
        return self


class CourseEditPage(BasePage):
    ADD_MODULE_BTN = (By.XPATH, "//button[contains(., 'Add Module')]")
    PUBLISH_BTN = (By.XPATH, "//button[contains(., 'Publish')]")

    def open_edit(self, course_id: str) -> CourseEditPage:
        self.open(f"/tutor/courses/{course_id}/edit")
        return self


class TutorAnalyticsPage(BasePage):
    REVENUE_CHART = (By.CSS_SELECTOR, "canvas, svg, [data-testid='revenue-chart']")

    def open_analytics(self) -> TutorAnalyticsPage:
        self.open("/tutor/analytics")
        return self


class TutorProfilePage(BasePage):
    QUALIFICATIONS_INPUT = (By.CSS_SELECTOR, "textarea[name='qualifications']")

    def open_profile(self) -> TutorProfilePage:
        self.open("/tutor/profile")
        return self

