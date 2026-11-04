from .base_page import BasePage
from .landing_page import LandingPage
from .login_page import LoginPage
from .register_page import RegisterPage
from .student_pages import (
    StudentDashboardPage,
    CoursesCatalogPage,
    CourseDetailPage,
    QuizPage,
    RoadmapPage,
    AnalyticsPage,
    ProfilePage,
    SettingsPage,
)
from .tutor_pages import (
    TutorDashboardPage,
    CourseCreationPage,
    CourseEditPage,
    TutorAnalyticsPage,
    TutorProfilePage,
)
from .admin_pages import (
    AdminDashboardPage,
    AdminUsersPage,
    AdminCoursesPage,
    AdminApprovalsPage,
)

__all__ = [
    "BasePage",
    "LandingPage",
    "LoginPage",
    "RegisterPage",
    "StudentDashboardPage",
    "CoursesCatalogPage",
    "CourseDetailPage",
    "QuizPage",
    "RoadmapPage",
    "AnalyticsPage",
    "ProfilePage",
    "SettingsPage",
    "TutorDashboardPage",
    "CourseCreationPage",
    "CourseEditPage",
    "TutorAnalyticsPage",
    "TutorProfilePage",
    "AdminDashboardPage",
    "AdminUsersPage",
    "AdminCoursesPage",
    "AdminApprovalsPage",
]

