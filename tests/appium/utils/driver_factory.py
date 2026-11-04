from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Optional


def get_mobile_driver() -> Optional[Any]:
    app_path = os.getenv("ANDROID_APP_PATH")
    appium_url = os.getenv("APPIUM_SERVER_URL", "http://127.0.0.1:4723")

    if not app_path or not Path(app_path).exists():
        # Running in CI or environment without active Android emulator
        return None

    try:
        from appium import webdriver
        from appium.options.android import UiAutomator2Options

        options = UiAutomator2Options().load_capabilities({
            "platformName": "Android",
            "automationName": "UiAutomator2",
            "deviceName": os.getenv("ANDROID_DEVICE_NAME", "Android Emulator"),
            "app": str(Path(app_path).resolve()),
            "appPackage": "com.careervue.mobile",
            "appWaitActivity": "*",
            "autoGrantPermissions": True,
            "newCommandTimeout": 120,
        })
        return webdriver.Remote(appium_url, options=options)
    except Exception:
        return None

