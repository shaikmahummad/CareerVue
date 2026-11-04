from __future__ import annotations

from selenium.webdriver.common.by import By
from .base_page import BasePage


class LoginPage(BasePage):
    """Page Object for CareerVue Login."""

    EMAIL_INPUT = (By.CSS_SELECTOR, "input[type='email']")
    PASSWORD_INPUT = (By.CSS_SELECTOR, "input[type='password'], input[autocomplete='current-password']")
    SUBMIT_BUTTON = (By.CSS_SELECTOR, "button[type='submit']")
    FORGOT_PASSWORD_LINK = (By.LINK_TEXT, "Forgot password?")
    REGISTER_LINK = (By.CSS_SELECTOR, "a[href='/register']")
    ERROR_ALERT = (By.CSS_SELECTOR, "div[role='alert'], .text-red-500, .text-destructive")

    def open_login(self) -> LoginPage:
        self.open("/login")
        return self

    def login(self, email: str, password: str) -> None:
        self.send_keys(*self.EMAIL_INPUT, email)
        self.send_keys(*self.PASSWORD_INPUT, password)
        self.click(*self.SUBMIT_BUTTON)

    def click_forgot_password(self) -> None:
        self.click(*self.FORGOT_PASSWORD_LINK)

    def is_error_displayed(self) -> bool:
        return self.is_visible(*self.ERROR_ALERT)

