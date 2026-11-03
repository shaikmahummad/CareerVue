from __future__ import annotations

import os
from pathlib import Path

import pytest
from appium import webdriver
from appium.options.android import UiAutomator2Options


ARTIFACT_DIR = Path(os.getenv("APPIUM_ARTIFACT_DIR", "artifacts/appium"))


@pytest.fixture
def driver(request: pytest.FixtureRequest):
    app_path = os.getenv("ANDROID_APP_PATH")
    if not app_path:
        pytest.fail("ANDROID_APP_PATH must point to the APK under test")
    ARTIFACT_DIR.joinpath("screenshots").mkdir(parents=True, exist_ok=True)
    ARTIFACT_DIR.joinpath("logs").mkdir(parents=True, exist_ok=True)
    options = UiAutomator2Options().load_capabilities(
        {
            "platformName": "Android",
            "automationName": "UiAutomator2",
            "deviceName": os.getenv("ANDROID_DEVICE_NAME", "Android Emulator"),
            "app": str(Path(app_path).resolve()),
            "appPackage": "com.careervue.mobile",
            "appWaitActivity": "*",
            "autoGrantPermissions": True,
            "newCommandTimeout": 120,
            "uiautomator2ServerInstallTimeout": int(
                os.getenv("UIAUTOMATOR2_SERVER_INSTALL_TIMEOUT_MS", "120000")
            ),
        }
    )
    instance = webdriver.Remote(
        os.getenv("APPIUM_SERVER_URL", "http://127.0.0.1:4723"), options=options
    )
    yield instance
    safe_name = request.node.nodeid.replace("/", "_").replace("::", "__")
    if getattr(request.node, "rep_call", None) and request.node.rep_call.failed:
        instance.save_screenshot(str(ARTIFACT_DIR / "screenshots" / f"{safe_name}.png"))
    try:
        logs = instance.get_log("logcat")
        (ARTIFACT_DIR / "logs" / f"{safe_name}-logcat.txt").write_text(
            "\n".join(str(entry) for entry in logs), encoding="utf-8"
        )
    except Exception:
        pass
    instance.quit()


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    setattr(item, f"rep_{outcome.get_result().when}", outcome.get_result())
