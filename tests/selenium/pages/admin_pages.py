from __future__ import annotations

from selenium.webdriver.common.by import By
from .base_page import BasePage


class AdminDashboardPage(BasePage):
    PLATFORM_METRICS = (By.CSS_SELECTOR, "[data-testid='admin-metrics']")

    def open_dashboard(self) -> AdminDashboardPage:
        self.open("/admin/dashboard")
        return self


class AdminUsersPage(BasePage):
    USER_TABLE = (By.TAG_NAME, "table")
    SEARCH_USER = (By.CSS_SELECTOR, "input[placeholder*='Search user']")

    def open_users(self) -> AdminUsersPage:
        self.open("/admin/users")
        return self


class AdminCoursesPage(BasePage):
    COURSE_TABLE = (By.TAG_NAME, "table")

    def open_courses(self) -> AdminCoursesPage:
        self.open("/admin/courses")
        return self


class AdminApprovalsPage(BasePage):
    PENDING_APPROVALS = (By.CSS_SELECTOR, "[data-testid='approval-card'], tr")

    def open_approvals(self) -> AdminApprovalsPage:
        self.open("/admin/approvals")
        return self

