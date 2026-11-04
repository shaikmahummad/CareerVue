from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any, Dict, List
import pytest

from tests.selenium.utils.webdriver_factory import create_driver
from tests.selenium.utils.reporter import create_excel_report


ARTIFACT_DIR = Path(os.getenv("SELENIUM_ARTIFACT_DIR", "artifacts/selenium"))
EXECUTION_RESULTS: List[Dict[str, Any]] = []


@pytest.fixture(scope="session")
def base_url() -> str:
    return os.getenv("WEB_BASE_URL", "http://localhost:3000").rstrip("/")


@pytest.fixture(scope="session")
def driver_instance():
    ARTIFACT_DIR.joinpath("screenshots").mkdir(parents=True, exist_ok=True)
    try:
        inst = create_driver()
    except Exception:
        # In environments without chrome/geckodriver installed, provide a mock driver
        inst = None
    yield inst
    if inst is not None:
        try:
            inst.quit()
        except Exception:
            pass


@pytest.fixture
def driver(driver_instance, request: pytest.FixtureRequest):
    yield driver_instance
    if driver_instance is not None and getattr(request.node, "rep_call", None) and request.node.rep_call.failed:
        name = request.node.nodeid.replace("/", "_").replace("::", "__")
        try:
            driver_instance.save_screenshot(str(ARTIFACT_DIR / "screenshots" / f"{name}.png"))
        except Exception:
            pass


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    rep = outcome.get_result()
    setattr(item, f"rep_{rep.when}", rep)

    if rep.when == "call":
        test_id = getattr(item, "_test_id", None) or f"WEB-{len(EXECUTION_RESULTS) + 1:04d}"
        category = getattr(item, "_test_category", None) or "Functional"
        name = getattr(item, "_test_name", None) or item.name
        objective = getattr(item, "_test_objective", None) or item.nodeid
        preconditions = getattr(item, "_test_preconditions", None) or "Web application is accessible"
        steps = getattr(item, "_test_steps", None) or "Execute scenario steps"
        test_data = getattr(item, "_test_data", None) or "Standard test fixture"
        expected = getattr(item, "_test_expected", None) or "Expected verification holds"
        priority = getattr(item, "_test_priority", None) or "P1"
        severity = getattr(item, "_test_severity", None) or "Medium"

        status = "PASS" if rep.passed else ("SKIPPED" if rep.skipped else "FAIL")
        err_msg = str(rep.longrepr) if rep.failed else ""
        actual = "Verification completed successfully" if rep.passed else f"Failed: {err_msg[:120]}"

        EXECUTION_RESULTS.append({
            "test_id": test_id,
            "test_category": category,
            "test_name": name,
            "objective": objective,
            "preconditions": preconditions,
            "steps": steps,
            "test_data": test_data,
            "expected_result": expected,
            "actual_result": actual,
            "status": status,
            "priority": priority,
            "severity": severity,
            "execution_time": rep.duration,
            "error_message": err_msg,
            "screenshot_artifact": f"artifacts/selenium/screenshots/{item.name}.png" if rep.failed else "",
            "remarks": "Automated Selenium test executed in CI.",
        })


def pytest_sessionfinish(session, exitstatus):
    if not EXECUTION_RESULTS:
        return
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    report_file = ARTIFACT_DIR / "Selenium_Testing_Report.xlsx"
    create_excel_report(EXECUTION_RESULTS, report_file, suite_name="Selenium Web Testing")
    catalog_file = Path("test-cases/selenium_test_cases.xlsx")
    create_excel_report(EXECUTION_RESULTS, catalog_file, suite_name="Selenium Web Testing")
