from __future__ import annotations

import os
from pathlib import Path
from typing import List, Tuple
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support import expected_conditions as ec
from selenium.webdriver.support.ui import WebDriverWait


class BasePage:
    """Base Page Object providing explicit waits and robust element interactions."""

    def __init__(self, driver: WebDriver, base_url: str = "http://localhost:3000", timeout: int = 15):
        self.driver = driver
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.wait = WebDriverWait(self.driver, self.timeout)

    def open(self, path: str = "/") -> BasePage:
        url = f"{self.base_url}/{path.lstrip('/')}" if path != "/" else self.base_url
        self.driver.get(url)
        return self

    def find(self, by: By, locator: str) -> WebElement:
        return self.wait.until(ec.visibility_of_element_located((by, locator)))

    def find_all(self, by: By, locator: str) -> List[WebElement]:
        return self.driver.find_elements(by, locator)

    def click(self, by: By, locator: str) -> None:
        element = self.wait.until(ec.element_to_be_clickable((by, locator)))
        element.click()

    def send_keys(self, by: By, locator: str, text: str, clear: bool = True) -> None:
        element = self.find(by, locator)
        if clear:
            element.clear()
        element.send_keys(text)

    def text_content(self, by: By, locator: str) -> str:
        return self.find(by, locator).text

    def is_visible(self, by: By, locator: str) -> bool:
        try:
            return self.find(by, locator).is_displayed()
        except Exception:
            return False

    def page_title(self) -> str:
        return self.driver.title

    def current_path(self) -> str:
        return self.driver.current_url.replace(self.base_url, "")

    def execute_script(self, script: str, *args):
        return self.driver.execute_script(script, *args)

    def take_screenshot(self, name: str, output_dir: str = "artifacts/selenium/screenshots") -> str:
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        path = str(Path(output_dir) / f"{name}.png")
        self.driver.save_screenshot(path)
        return path

