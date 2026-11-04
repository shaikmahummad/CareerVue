from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List
import pytest

from tests.appium.utils.driver_factory import get_mobile_driver
from tests.appium.utils.reporter import create_excel_report


ARTIFACT_DIR = Path(os.getenv("APPIUM_ARTIFACT_DIR", "artifacts/appium"))
EXECUTION_RESULTS: List[Dict[str, Any]] = []


@pytest.fixture(scope="session")
def mobile_driver_instance():
    ARTIFACT_DIR.joinpath("screenshots").mkdir(parents=True, exist_ok=True)
    ARTIFACT_DIR.joinpath("logs").mkdir(parents=True, exist_ok=True)
    driver = get_mobile_driver()
    yield driver
    if driver is not None:
        try:
            driver.quit()
        except Exception:
            pass


@pytest.fixture
def driver(mobile_driver_instance, request: pytest.FixtureRequest):
    yield mobile_driver_instance
    if mobile_driver_instance is not None and getattr(request.node, "rep_call", None) and request.node.rep_call.failed:
        name = request.node.nodeid.replace("/", "_").replace("::", "__")
        try:
            mobile_driver_instance.save_screenshot(str(ARTIFACT_DIR / "screenshots" / f"{name}.png"))
        except Exception:
            pass


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    rep = outcome.get_result()
    setattr(item, f"rep_{rep.when}", rep)

    if rep.when == "call":
        test_id = getattr(item, "_test_id", None) or f"MOB-{len(EXECUTION_RESULTS) + 1:04d}"
        category = getattr(item, "_test_category", None) or "Functional"
        name = getattr(item, "_test_name", None) or item.name
        objective = getattr(item, "_test_objective", None) or item.nodeid
        preconditions = getattr(item, "_test_preconditions", None) or "Mobile app installed on target"
        steps = getattr(item, "_test_steps", None) or "Execute mobile scenario"
        test_data = getattr(item, "_test_data", None) or "Standard mobile fixture"
        expected = getattr(item, "_test_expected", None) or "Expected mobile behavior verified"
        priority = getattr(item, "_test_priority", None) or "P1"
        severity = getattr(item, "_test_severity", None) or "Medium"

        status = "PASS" if rep.passed else ("SKIPPED" if rep.skipped else "FAIL")
        err_msg = str(rep.longrepr) if rep.failed else ""
        actual = "Mobile verification passed" if rep.passed else f"Failed: {err_msg[:120]}"

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
            "screenshot_artifact": f"artifacts/appium/screenshots/{item.name}.png" if rep.failed else "",
            "remarks": "Automated Appium mobile test verified for CI pipeline.",
        })


def pytest_sessionfinish(session, exitstatus):
    if not EXECUTION_RESULTS:
        return
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    report_file = ARTIFACT_DIR / "Appium_Testing_Report.xlsx"
    create_excel_report(EXECUTION_RESULTS, report_file, suite_name="Appium Mobile Testing")
    catalog_file = Path("test-cases/appium_test_cases.xlsx")
    create_excel_report(EXECUTION_RESULTS, catalog_file, suite_name="Appium Mobile Testing")
