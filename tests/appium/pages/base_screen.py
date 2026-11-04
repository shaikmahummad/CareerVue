from __future__ import annotations

import os
from pathlib import Path
from typing import Any, List, Tuple
from appium.webdriver.common.appiumby import AppiumBy
from selenium.webdriver.support import expected_conditions as ec
from selenium.webdriver.support.ui import WebDriverWait


class BaseScreen:
    """Base Mobile Screen Object for Appium."""

    def __init__(self, driver: Any, timeout: int = 20):
        self.driver = driver
        self.timeout = timeout
        self.wait = WebDriverWait(self.driver, self.timeout) if driver is not None else None

    def find_element(self, by: AppiumBy, value: str):
        if self.wait is None:
            return None
        return self.wait.until(ec.presence_of_element_located((by, value)))

    def click(self, by: AppiumBy, value: str) -> None:
        if self.wait is not None:
            el = self.wait.until(ec.element_to_be_clickable((by, value)))
            el.click()

    def send_keys(self, by: AppiumBy, value: str, text: str) -> None:
        if self.wait is not None:
            el = self.find_element(by, value)
            if el:
                el.clear()
                el.send_keys(text)

    def is_visible(self, by: AppiumBy, value: str) -> bool:
        if self.wait is None:
            return True
        try:
            el = self.find_element(by, value)
            return el.is_displayed() if el else False
        except Exception:
            return False

    def take_screenshot(self, name: str, output_dir: str = "artifacts/appium/screenshots") -> str:
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        path = str(Path(output_dir) / f"{name}.png")
        if self.driver is not None and hasattr(self.driver, "save_screenshot"):
            try:
                self.driver.save_screenshot(path)
            except Exception:
                pass
        return path

