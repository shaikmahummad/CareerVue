from __future__ import annotations

import os
from pathlib import Path

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.firefox.options import Options as FirefoxOptions


ARTIFACT_DIR = Path(os.getenv("SELENIUM_ARTIFACT_DIR", "artifacts/selenium"))


def _driver() -> webdriver.Remote:
    browser = os.getenv("E2E_BROWSER", "chrome").lower()
    headless = os.getenv("E2E_HEADLESS", "true").lower() != "false"
    if browser == "firefox":
        options = FirefoxOptions()
        if headless:
            options.add_argument("-headless")
        return webdriver.Firefox(options=options)
    if browser != "chrome":
        raise ValueError(f"Unsupported E2E_BROWSER={browser!r}; use chrome or firefox")
    options = ChromeOptions()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1440,1100")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    return webdriver.Chrome(options=options)


@pytest.fixture
def base_url() -> str:
    return os.getenv("WEB_BASE_URL", "http://localhost:3000").rstrip("/")


@pytest.fixture
def driver(request: pytest.FixtureRequest):
    ARTIFACT_DIR.joinpath("screenshots").mkdir(parents=True, exist_ok=True)
    instance = _driver()
    instance.set_page_load_timeout(30)
    yield instance
    if getattr(request.node, "rep_call", None) and request.node.rep_call.failed:
        name = request.node.nodeid.replace("/", "_").replace("::", "__")
        instance.save_screenshot(str(ARTIFACT_DIR / "screenshots" / f"{name}.png"))
    instance.quit()


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    setattr(item, f"rep_{outcome.get_result().when}", outcome.get_result())

