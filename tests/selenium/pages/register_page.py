from __future__ import annotations

from selenium.webdriver.common.by import By
from .base_page import BasePage


class RegisterPage(BasePage):
    """Page Object for CareerVue Registration."""

    STUDENT_ROLE_BTN = (By.XPATH, "//button[contains(., 'Student')]")
    TUTOR_ROLE_BTN = (By.XPATH, "//button[contains(., 'Tutor')]")
    CONTINUE_BTN = (By.XPATH, "//button[contains(., 'Continue')]")
    NAME_INPUT = (By.CSS_SELECTOR, "input[placeholder*='Full Name'], input[name='name']")
    EMAIL_INPUT = (By.CSS_SELECTOR, "input[placeholder*='Email'], input[type='email']")
    PASSWORD_INPUT = (By.CSS_SELECTOR, "input[placeholder*='Password'], input[name='password']")
    CONFIRM_PASSWORD_INPUT = (By.CSS_SELECTOR, "input[placeholder*='Confirm Password'], input[name='confirmPassword']")
    SUBMIT_BUTTON = (By.CSS_SELECTOR, "button[type='submit']")

    def open_register(self) -> RegisterPage:
        self.open("/register")
        return self

    def select_role(self, role: str = "Student") -> None:
        btn = self.STUDENT_ROLE_BTN if role.lower() == "student" else self.TUTOR_ROLE_BTN
        self.click(*btn)
        self.click(*self.CONTINUE_BTN)

    def fill_registration(self, name: str, email: str, password: str, confirm_password: str) -> None:
        self.send_keys(*self.NAME_INPUT, name)
        self.send_keys(*self.EMAIL_INPUT, email)
        self.send_keys(*self.PASSWORD_INPUT, password)
        self.send_keys(*self.CONFIRM_PASSWORD_INPUT, confirm_password)
        self.click(*self.SUBMIT_BUTTON)

