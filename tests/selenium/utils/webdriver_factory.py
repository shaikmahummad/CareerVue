from __future__ import annotations

import os
from typing import Any


def create_driver(browser: str = None, headless: bool = None) -> Any:
    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options as ChromeOptions
        from selenium.webdriver.firefox.options import Options as FirefoxOptions
    except ImportError:
        return None

    browser = (browser or os.getenv("E2E_BROWSER", "chrome")).lower()
    if headless is None:
        headless = os.getenv("E2E_HEADLESS", "true").lower() != "false"

    if browser == "firefox":
        options = FirefoxOptions()
        if headless:
            options.add_argument("-headless")
        driver = webdriver.Firefox(options=options)
    elif browser == "chrome":
        options = ChromeOptions()
        if headless:
            options.add_argument("--headless=new")
        options.add_argument("--window-size=1440,1100")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        driver = webdriver.Chrome(options=options)
    else:
        raise ValueError(f"Unsupported browser: {browser}. Supported: 'chrome', 'firefox'.")

    driver.set_page_load_timeout(30)
    return driver
