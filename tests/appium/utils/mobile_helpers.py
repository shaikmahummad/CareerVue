from __future__ import annotations

import time
from typing import Any


def swipe_up(driver: Any, duration_ms: int = 800) -> None:
    if driver and hasattr(driver, "get_window_size"):
        try:
            size = driver.get_window_size()
            start_x = size["width"] // 2
            start_y = int(size["height"] * 0.8)
            end_y = int(size["height"] * 0.2)
            driver.swipe(start_x, start_y, start_x, end_y, duration_ms)
        except Exception:
            pass


def swipe_down(driver: Any, duration_ms: int = 800) -> None:
    if driver and hasattr(driver, "get_window_size"):
        try:
            size = driver.get_window_size()
            start_x = size["width"] // 2
            start_y = int(size["height"] * 0.2)
            end_y = int(size["height"] * 0.8)
            driver.swipe(start_x, start_y, start_x, end_y, duration_ms)
        except Exception:
            pass

