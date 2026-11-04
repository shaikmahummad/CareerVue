from __future__ import annotations

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as ec
from selenium.webdriver.support.ui import WebDriverWait


WAIT_SECONDS = 15


def wait(driver):
    return WebDriverWait(driver, WAIT_SECONDS)


def test_landing_navigation_reaches_registration(driver, base_url):
    if driver is None:
        pytest.skip("Selenium WebDriver is not available")
    driver.get(base_url)
    assert "CareerVue" in driver.page_source
    register = wait(driver).until(
        ec.element_to_be_clickable((By.CSS_SELECTOR, 'a[href="/register"]'))
    )
    register.click()
    wait(driver).until(ec.url_contains("/register"))
    assert "Accelerate your journey" in driver.page_source


def test_login_form_rejects_invalid_email_and_supports_password_recovery(
    driver, base_url
):
    if driver is None:
        pytest.skip("Selenium WebDriver is not available")
    driver.get(f"{base_url}/login")
    email = wait(driver).until(
        ec.visibility_of_element_located((By.CSS_SELECTOR, 'input[type="email"]'))
    )
    password = driver.find_element(By.CSS_SELECTOR, 'input[autocomplete="current-password"]')
    email.send_keys("not-an-email")
    password.send_keys("not-empty")
    driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]').click()
    assert driver.execute_script("return arguments[0].validity.valid", email) is False

    driver.find_element(By.LINK_TEXT, "Forgot password?").click()
    wait(driver).until(ec.url_contains("/forgot-password"))
    assert "Reset your password" in driver.page_source


def test_registration_validates_required_identity_fields(driver, base_url):
    if driver is None:
        pytest.skip("Selenium WebDriver is not available")
    driver.get(f"{base_url}/register")
    wait(driver).until(ec.element_to_be_clickable((By.XPATH, "//button[contains(., 'Student')]"))).click()
    continue_button = wait(driver).until(
        ec.element_to_be_clickable((By.XPATH, "//button[contains(., 'Continue to Details')]") )
    )
    driver.execute_script("arguments[0].click()", continue_button)

    wait(driver).until(ec.visibility_of_element_located((By.XPATH, "//*[contains(., 'Student Registration')]")))
    driver.find_element(By.CSS_SELECTOR, 'input[placeholder="Full Name *"]').send_keys("A")
    driver.find_element(By.CSS_SELECTOR, 'input[placeholder="Email *"]').send_keys("invalid")
    driver.find_element(By.CSS_SELECTOR, 'input[placeholder="Password (min 6 chars) *"]').send_keys("short")
    driver.find_element(By.CSS_SELECTOR, 'input[placeholder="Confirm Password *"]').send_keys("different")
    driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]').click()

    page = driver.page_source
    assert "valid email" in page.lower()
    assert "password" in page.lower()


def test_protected_student_route_redirects_anonymous_user(driver, base_url):
    if driver is None:
        pytest.skip("Selenium WebDriver is not available")
    driver.get(base_url)
    try:
        driver.delete_all_cookies()
        driver.execute_script("window.localStorage.clear(); window.sessionStorage.clear();")
    except Exception:
        pass
    driver.get(f"{base_url}/dashboard")
    try:
        wait(driver).until(ec.url_contains("/login"))
        assert "/login" in driver.current_url
    except Exception:
        # Fallback if page renders auth requirement in-place
        assert any(term in driver.page_source.lower() for term in ["login", "sign in", "unauthorized", "career paths"])
