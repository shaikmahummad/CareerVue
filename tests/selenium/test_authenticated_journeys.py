from __future__ import annotations

import os
import uuid

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as ec
from selenium.webdriver.support.ui import Select, WebDriverWait


REQUIRE_AUTH = os.getenv("E2E_REQUIRE_AUTH", "false").lower() == "true"


def credentials(prefix: str):
    email = os.getenv(f"E2E_{prefix}_EMAIL")
    password = os.getenv(f"E2E_{prefix}_PASSWORD")
    if email and password:
        return email, password
    if REQUIRE_AUTH:
        pytest.fail(f"E2E_REQUIRE_AUTH=true but E2E_{prefix}_EMAIL/PASSWORD are unset")
    pytest.skip(f"Authenticated {prefix.lower()} journey is not enabled")


def login(driver, base_url, email, password, expected_path):
    driver.get(f"{base_url}/login")
    wait = WebDriverWait(driver, 20)
    wait.until(ec.visibility_of_element_located((By.CSS_SELECTOR, 'input[type="email"]'))).send_keys(email)
    driver.find_element(By.CSS_SELECTOR, 'input[autocomplete="current-password"]').send_keys(password)
    driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]').click()
    wait.until(ec.url_contains(expected_path))


def test_student_can_authenticate_and_open_course_catalog(driver, base_url):
    email, password = credentials("STUDENT")
    login(driver, base_url, email, password, "/dashboard")
    driver.get(f"{base_url}/courses")
    WebDriverWait(driver, 20).until(
        ec.visibility_of_element_located((By.CSS_SELECTOR, 'input[placeholder="Search courses, skills…"]'))
    )
    assert "Browse Courses" in driver.page_source


def test_tutor_can_create_draft_course(driver, base_url):
    email, password = credentials("TUTOR")
    login(driver, base_url, email, password, "/tutor/dashboard")
    driver.get(f"{base_url}/tutor/courses/new")
    wait = WebDriverWait(driver, 20)
    title = f"CI Selenium {uuid.uuid4().hex[:8]}"
    wait.until(ec.visibility_of_element_located((By.CSS_SELECTOR, 'input[placeholder="e.g. Complete React Developer Course"]'))).send_keys(title)
    driver.find_element(By.CSS_SELECTOR, 'textarea[placeholder="What will students learn? What are the prerequisites?"]').send_keys(
        "Automated staging-only course used to verify the tutor draft workflow."
    )
    driver.find_element(By.CSS_SELECTOR, 'input[placeholder="e.g. 12"]').send_keys("1")
    level = driver.find_elements(By.TAG_NAME, "select")
    if level:
        Select(level[0]).select_by_visible_text("Beginner")
    wait.until(ec.element_to_be_clickable((By.XPATH, "//button[contains(., 'Save & Continue')]"))).click()
    wait.until(lambda d: "Modules" in d.page_source or "module" in d.current_url.lower())
    assert title in driver.page_source

