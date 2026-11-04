from __future__ import annotations

from appium.webdriver.common.appiumby import AppiumBy
from .base_screen import BaseScreen


class StudentDashboardScreen(BaseScreen):
    GREETING = (AppiumBy.XPATH, "//*[starts-with(@text, 'Hi ')]")
    COURSES_TAB = (AppiumBy.XPATH, "//*[@text='Courses']")
    QUIZ_TAB = (AppiumBy.XPATH, "//*[@text='Quiz']")
    ROADMAP_TAB = (AppiumBy.XPATH, "//*[@text='Roadmap']")
    PROFILE_TAB = (AppiumBy.XPATH, "//*[@text='Profile']")


class MobileCoursesScreen(BaseScreen):
    SEARCH_INPUT = (AppiumBy.CLASS_NAME, "android.widget.EditText")
    COURSE_ITEM = (AppiumBy.XPATH, "//*[contains(@text, 'Course') or contains(@text, 'Development')]")


class MobileQuizScreen(BaseScreen):
    START_QUIZ_BTN = (AppiumBy.XPATH, "//*[@text='Start Quiz']")
    OPTION_A = (AppiumBy.XPATH, "//*[contains(@text, 'Option A')]")
    SUBMIT_BTN = (AppiumBy.XPATH, "//*[@text='Submit']")


class TutorDashboardScreen(BaseScreen):
    TUTOR_HEADER = (AppiumBy.XPATH, "//*[@text='Tutor Dashboard']")
    CREATE_COURSE_BTN = (AppiumBy.XPATH, "//*[@text='Create Course']")


class AdminDashboardScreen(BaseScreen):
    ADMIN_HEADER = (AppiumBy.XPATH, "//*[@text='Admin Overview']")
    APPROVALS_TAB = (AppiumBy.XPATH, "//*[@text='Approvals']")

