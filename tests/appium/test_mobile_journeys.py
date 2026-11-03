from __future__ import annotations

import os

import pytest
from appium.webdriver.common.appiumby import AppiumBy
from selenium.webdriver.support import expected_conditions as ec
from selenium.webdriver.support.ui import WebDriverWait


def text(value: str):
    return (AppiumBy.ANDROID_UIAUTOMATOR, f'new UiSelector().text("{value}")')


def contains(value: str):
    return (AppiumBy.ANDROID_UIAUTOMATOR, f'new UiSelector().textContains("{value}")')


def wait(driver, seconds=25):
    return WebDriverWait(driver, seconds)


def open_login(driver):
    splash_sign_in = wait(driver).until(ec.element_to_be_clickable(text("Sign In")))
    splash_sign_in.click()
    return wait(driver).until(ec.visibility_of_element_located(text("Welcome back")))


def test_app_launches_and_opens_login(driver):
    assert wait(driver).until(ec.visibility_of_element_located(text("CareerVue")))
    open_login(driver)
    assert wait(driver).until(ec.visibility_of_element_located(text("Welcome back")))
    assert driver.find_element(*text("Sign In"))


def test_invalid_login_shows_validation_alert(driver):
    open_login(driver)
    driver.find_element(AppiumBy.ANDROID_UIAUTOMATOR, 'new UiSelector().className("android.widget.EditText").instance(0)').send_keys("invalid")
    driver.find_element(*text("Sign In")).click()
    assert wait(driver).until(ec.visibility_of_element_located(text("Check your details")))
    assert driver.find_element(*contains("valid email address"))
    driver.find_element(*text("OK")).click()


def test_registration_role_navigation_and_validation(driver):
    open_login(driver)
    driver.find_element(*contains("Create one")).click()
    assert wait(driver).until(ec.visibility_of_element_located(text("Who are you joining as?")))
    driver.find_element(*text("Tutor")).click()
    driver.find_element(*text("Continue")).click()
    assert wait(driver).until(ec.visibility_of_element_located(text("Your Details")))
    driver.find_element(*text("Continue")).click()
    assert wait(driver).until(ec.visibility_of_element_located(text("Check your details")))
    assert driver.find_element(*contains("highlighted fields"))


def test_verified_student_can_authenticate(driver):
    email = os.getenv("E2E_STUDENT_EMAIL")
    password = os.getenv("E2E_STUDENT_PASSWORD")
    if not email or not password:
        if os.getenv("E2E_REQUIRE_AUTH", "false").lower() == "true":
            pytest.fail("Authenticated Appium testing is required but student credentials are unset")
        pytest.skip("Authenticated Appium journey is not enabled")
    open_login(driver)
    fields = driver.find_elements(AppiumBy.CLASS_NAME, "android.widget.EditText")
    fields[0].send_keys(email)
    fields[1].send_keys(password)
    driver.find_element(*text("Sign In")).click()
    greeting = (
        AppiumBy.ANDROID_UIAUTOMATOR,
        'new UiSelector().textStartsWith("Hi ")',
    )
    assert wait(driver, 35).until(ec.visibility_of_element_located(greeting))

