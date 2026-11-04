from __future__ import annotations

from selenium.webdriver.common.by import By
from .base_page import BasePage


class LandingPage(BasePage):
    """Page Object for the CareerVue public landing page."""

    NAVBAR_LOGO = (By.CSS_SELECTOR, "a[href='/'], a.font-bold")
    SIGN_IN_LINK = (By.CSS_SELECTOR, "a[href='/login']")
    GET_STARTED_LINK = (By.CSS_SELECTOR, "a[href='/register']")
    HERO_HEADING = (By.TAG_NAME, "h1")
    FEATURES_SECTION = (By.XPATH, "//section[contains(., 'Features') or contains(., 'Empower')]")
    FOOTER = (By.TAG_NAME, "footer")

    def open_landing(self) -> LandingPage:
        self.open("/")
        return self

    def click_sign_in(self) -> None:
        self.click(*self.SIGN_IN_LINK)

    def click_get_started(self) -> None:
        self.click(*self.GET_STARTED_LINK)

    def get_hero_text(self) -> str:
        return self.text_content(*self.HERO_HEADING)

