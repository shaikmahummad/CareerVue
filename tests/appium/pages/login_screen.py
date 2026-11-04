from __future__ import annotations

from appium.webdriver.common.appiumby import AppiumBy
from .base_screen import BaseScreen


class SplashScreen(BaseScreen):
    SPLASH_LOGO = (AppiumBy.XPATH, "//*[@text='CareerVue']")
    SIGN_IN_BUTTON = (AppiumBy.XPATH, "//*[@text='Sign In']")
    GET_STARTED_BUTTON = (AppiumBy.XPATH, "//*[@text='Get Started']")

    def tap_sign_in(self) -> None:
        self.click(*self.SIGN_IN_BUTTON)

    def tap_get_started(self) -> None:
        self.click(*self.GET_STARTED_BUTTON)


class LoginScreen(BaseScreen):
    EMAIL_INPUT = (AppiumBy.CLASS_NAME, "android.widget.EditText")
    SIGN_IN_BUTTON = (AppiumBy.XPATH, "//*[@text='Sign In']")
    FORGOT_PASSWORD_LINK = (AppiumBy.XPATH, "//*[contains(@text, 'Forgot')]")
    REGISTER_LINK = (AppiumBy.XPATH, "//*[contains(@text, 'Create one')]")
    ALERT_TITLE = (AppiumBy.XPATH, "//*[@text='Check your details']")

    def enter_credentials(self, email: str, password: str) -> None:
        if self.driver:
            fields = self.driver.find_elements(*self.EMAIL_INPUT)
            if len(fields) >= 2:
                fields[0].send_keys(email)
                fields[1].send_keys(password)

    def tap_sign_in(self) -> None:
        self.click(*self.SIGN_IN_BUTTON)


class RegisterScreen(BaseScreen):
    ROLE_STUDENT = (AppiumBy.XPATH, "//*[@text='Student']")
    ROLE_TUTOR = (AppiumBy.XPATH, "//*[@text='Tutor']")
    CONTINUE_BUTTON = (AppiumBy.XPATH, "//*[@text='Continue']")

    def select_role(self, role: str = "Student") -> None:
        target = self.ROLE_STUDENT if role.lower() == "student" else self.ROLE_TUTOR
        self.click(*target)
        self.click(*self.CONTINUE_BUTTON)

