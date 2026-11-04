from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from xml.etree import ElementTree

from openpyxl import Workbook, load_workbook
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo


REPORTS = {
    "api": ("API_Testing_Report.xlsx", "API Testing Report", "API"),
    "selenium": ("Selenium_Testing_Report.xlsx", "Selenium Testing Report", "SELENIUM"),
    "appium": ("Appium_Testing_Report.xlsx", "Appium Testing Report", "APPIUM"),
}

FINAL_WORKBOOK_NAME = "FINAL_TEST_SUMMARY.xlsx"
FINAL_SUITES = {
    "selenium": ("Selenium Web", "SELENIUM"),
    "appium": ("Appium Mobile", "APPIUM"),
    "performance": ("Load Performance", "LOAD"),
    "security": ("DAST Security", "DAST"),
}

FINAL_COLUMNS = (
    "Test ID",
    "Suite",
    "Category",
    "Test Name",
    "Objective",
    "Expected Result",
    "Actual Result",
    "Status",
    "Priority",
    "Severity",
    "Duration",
)

DETAIL_COLUMNS = (
    "Test Case ID",
    "Test Case Name / Description",
    "Test Steps",
    "Expected Result",
    "Actual Result",
    "Status (PASS / FAIL / SKIPPED)",
    "Execution Duration",
    "Error Details",
)

STATUS_JSON_NAMES = {"status.json", "web-build-status.json", "mobile-build-status.json"}


@dataclass(frozen=True)
class TestCase:
    name: str
    description: str = ""
    steps: str = ""
    expected: str = ""
    actual: str = ""
    status: str = "PASS"
    duration: float | None = None
    error: str = ""
    category: str = ""
    objective: str = ""
    priority: str = ""
    severity: str = ""


@dataclass
class StageResults:
    stage: str
    tests: list[TestCase]
    source_files: list[Path]
    status_files: list[Path]
    declared_test_count: int | None = None

    @property
    def counts(self) -> Counter:
        return Counter(test.status for test in self.tests)


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _clean(value: object) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def _multiline(value: object) -> str:
    if value is None:
        return ""
    return str(value).replace("\r\n", "\n").replace("\r", "\n").strip()


def _property_map(testcase: ElementTree.Element) -> dict[str, str]:
    properties: dict[str, str] = {}
    for child in testcase:
        if _local_name(child.tag) != "properties":
            continue
        for item in child:
            if _local_name(item.tag) != "property":
                continue
            name = _clean(item.get("name")).lower()
            value = item.get("value") if item.get("value") is not None else item.text
            if name:
                properties[name] = _multiline(value)
    return properties


def _first_property(properties: dict[str, str], *names: str) -> str:
    return next((properties[name] for name in names if properties.get(name)), "")


def parse_junit(path: Path) -> tuple[list[TestCase], int | None]:
    root = ElementTree.parse(path).getroot()
    if _local_name(root.tag) not in {"testsuite", "testsuites"}:
        return [], None

    cases: list[TestCase] = []
    for testcase in (element for element in root.iter() if _local_name(element.tag) == "testcase"):
        properties = _property_map(testcase)
        failure_nodes = [
            child for child in testcase if _local_name(child.tag) in {"failure", "error"}
        ]
        skipped_nodes = [child for child in testcase if _local_name(child.tag) == "skipped"]
        if failure_nodes:
            status = "FAIL"
        elif skipped_nodes:
            status = "SKIPPED"
        else:
            status = "PASS"

        detail_nodes = failure_nodes or skipped_nodes
        error_parts: list[str] = []
        for node in detail_nodes:
            heading = " ".join(
                part for part in (_clean(node.get("type")), _clean(node.get("message"))) if part
            )
            body = _multiline(node.text)
            error_parts.append("\n".join(part for part in (heading, body) if part))

        system_output = "\n".join(
            _multiline(child.text)
            for child in testcase
            if _local_name(child.tag) in {"system-out", "system-err"} and _multiline(child.text)
        )
        raw_duration = testcase.get("time")
        try:
            duration = float(raw_duration) if raw_duration not in (None, "") else None
        except ValueError:
            duration = None

        name = _clean(testcase.get("name")) or "Unnamed test case"
        classname = _clean(testcase.get("classname"))
        description = _first_property(properties, "description", "test_description")
        display_name = description or name
        if classname:
            display_name = f"{display_name} ({classname})"

        cases.append(
            TestCase(
                name=name,
                description=display_name,
                steps=_first_property(properties, "test_steps", "steps"),
                expected=_first_property(properties, "expected_result", "expected"),
                actual=_first_property(properties, "actual_result", "actual") or system_output,
                status=status,
                duration=duration,
                error="\n\n".join(part for part in error_parts if part),
            )
        )

    declared = None
    raw_declared = root.get("tests")
    if raw_declared is not None:
        try:
            declared = int(raw_declared)
        except ValueError:
            pass
    elif _local_name(root.tag) == "testsuites":
        direct_suites = [child for child in root if _local_name(child.tag) == "testsuite"]
        values: list[int] = []
        for suite in direct_suites:
            try:
                values.append(int(suite.get("tests", "")))
            except ValueError:
                values = []
                break
        if values:
            declared = sum(values)
    return cases, declared


def parse_pytest_json(path: Path) -> list[TestCase]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    raw_tests = payload.get("tests") if isinstance(payload, dict) else None
    if not isinstance(raw_tests, list):
        return []

    cases: list[TestCase] = []
    for raw in raw_tests:
        if not isinstance(raw, dict):
            continue
        outcome = _clean(raw.get("outcome")).lower()
        status = {"passed": "PASS", "failed": "FAIL", "skipped": "SKIPPED"}.get(outcome)
        if not status:
            continue
        call = raw.get("call") if isinstance(raw.get("call"), dict) else {}
        setup = raw.get("setup") if isinstance(raw.get("setup"), dict) else {}
        teardown = raw.get("teardown") if isinstance(raw.get("teardown"), dict) else {}
        duration_values = [
            item.get("duration") for item in (setup, call, teardown) if isinstance(item.get("duration"), (int, float))
        ]
        nodeid = _clean(raw.get("nodeid")) or "Unnamed test case"
        error = _multiline(call.get("longrepr") or setup.get("longrepr") or teardown.get("longrepr"))
        cases.append(
            TestCase(
                name=nodeid,
                description=nodeid,
                status=status,
                duration=sum(duration_values) if duration_values else None,
                error=error,
            )
        )
    return cases


def classify_path(path: Path) -> str | None:
    text = "/".join(part.lower() for part in path.parts)
    if "appium" in text:
        return "appium"
    if "selenium" in text:
        return "selenium"
    if any(token in text for token in ("backend-quality", "/backend/", "/api/", "api-test", "pytest")):
        return "api"
    return None


def discover_results(input_dir: Path) -> dict[str, StageResults]:
    stages = {
        stage: StageResults(stage=stage, tests=[], source_files=[], status_files=[])
        for stage in REPORTS
    }
    xml_by_stage: dict[str, list[Path]] = {stage: [] for stage in REPORTS}
    json_by_stage: dict[str, list[Path]] = {stage: [] for stage in REPORTS}

    if input_dir.exists():
        for path in sorted(item for item in input_dir.rglob("*") if item.is_file()):
            stage = classify_path(path)
            if not stage:
                continue
            if path.name.lower() in STATUS_JSON_NAMES or path.name.lower().endswith("status.json"):
                stages[stage].status_files.append(path)
            elif path.suffix.lower() == ".xml":
                xml_by_stage[stage].append(path)
            elif path.suffix.lower() == ".json" and (
                "pytest" in path.name.lower() or "report" in path.name.lower() or "result" in path.name.lower()
            ):
                json_by_stage[stage].append(path)

    for stage, result in stages.items():
        declared_counts: list[int] = []
        for path in xml_by_stage[stage]:
            try:
                cases, declared = parse_junit(path)
            except ElementTree.ParseError:
                continue
            if cases:
                result.tests.extend(cases)
                result.source_files.append(path)
                if declared is not None:
                    declared_counts.append(declared)
        if not result.tests:
            for path in json_by_stage[stage]:
                cases = parse_pytest_json(path)
                if cases:
                    result.tests.extend(cases)
                    result.source_files.append(path)
        if declared_counts:
            result.declared_test_count = sum(declared_counts)
    return stages


def _load_json(path: Path) -> dict | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return value if isinstance(value, dict) else None


def _stage_status(input_dir: Path, stage: str) -> tuple[str | None, Path | None]:
    for path in sorted(input_dir.rglob("*status.json")):
        payload = _load_json(path)
        if payload and payload.get("stage") == stage:
            result = _clean(payload.get("result")).lower()
            status = {
                "success": "PASS",
                "failure": "FAIL",
                "cancelled": "BLOCKED",
                "skipped": "SKIPPED",
            }.get(result)
            return status, path
    return None, None


def _discover_performance_result(input_dir: Path) -> StageResults:
    result = StageResults(stage="performance", tests=[], source_files=[], status_files=[])
    summary_path = next(iter(sorted(input_dir.rglob("performance-summary.json"))), None)
    status, status_path = _stage_status(input_dir, "performance")
    if status_path:
        result.status_files.append(status_path)
    if not summary_path:
        return result
    summary = _load_json(summary_path)
    if not summary:
        return result
    profile = _clean(summary.get("profile")) or "unspecified"
    response = summary.get("response_time_ms") if isinstance(summary.get("response_time_ms"), dict) else {}
    actual = (
        f"profile={profile}; requests={summary.get('requests')}; "
        f"failed_request_rate={summary.get('failed_request_rate')}; "
        f"p95_ms={response.get('p95')}; requests_per_second={summary.get('requests_per_second')}"
    )
    result.tests.append(
        TestCase(
            name=f"k6 {profile} performance execution",
            description=f"k6 {profile} performance execution",
            category="Performance",
            objective="Verify the executed web performance profile against its configured k6 thresholds.",
            expected="All configured k6 thresholds pass.",
            actual=actual,
            status=status or "BLOCKED",
            severity="High",
        )
    )
    result.source_files.append(summary_path)
    result.declared_test_count = 1
    return result


def _discover_security_result(input_dir: Path) -> StageResults:
    result = StageResults(stage="security", tests=[], source_files=[], status_files=[])
    summary_path = next(iter(sorted(input_dir.rglob("severity-summary.json"))), None)
    status, status_path = _stage_status(input_dir, "security")
    if status_path:
        result.status_files.append(status_path)
    if not summary_path:
        return result
    summary = _load_json(summary_path)
    if not summary:
        return result
    counts = summary.get("counts") if isinstance(summary.get("counts"), dict) else {}
    actual = (
        f"gate={summary.get('gate')}; high={counts.get('high', 0)}; "
        f"medium={counts.get('medium', 0)}; low={counts.get('low', 0)}; "
        f"informational={counts.get('informational', 0)}"
    )
    result.tests.append(
        TestCase(
            name="OWASP ZAP passive DAST execution",
            description="OWASP ZAP passive DAST execution",
            category="Security",
            objective="Verify the executed passive DAST scan against its configured severity gate.",
            expected="No findings at or above the configured failure gate.",
            actual=actual,
            status=status or "BLOCKED",
            severity="Critical",
        )
    )
    result.source_files.append(summary_path)
    result.declared_test_count = 1
    return result


def discover_final_results(input_dir: Path) -> dict[str, StageResults]:
    ordinary = discover_results(input_dir)
    return {
        "selenium": ordinary["selenium"],
        "appium": ordinary["appium"],
        "performance": _discover_performance_result(input_dir),
        "security": _discover_security_result(input_dir),
    }


def _relative_paths(paths: Iterable[Path], base: Path) -> str:
    values = []
    for path in paths:
        try:
            values.append(path.relative_to(base).as_posix())
        except ValueError:
            values.append(path.as_posix())
    return ", ".join(values)


def _missing_source_message(stage: str, status_files: list[Path], input_dir: Path) -> str:
    expected = {
        "api": "API/backend JUnit XML or a pytest JSON report",
        "selenium": "Selenium JUnit XML or a pytest JSON report",
        "appium": "Appium JUnit XML or a pytest JSON report",
    }[stage]
    status_note = ""
    if status_files:
        status_note = (
            f" Stage-only status file(s) found and intentionally not treated as test cases: "
            f"{_relative_paths(status_files, input_dir)}."
        )
    return f"Missing detailed source: {expected}.{status_note} No test cases were fabricated."


def _set_column_widths(sheet) -> None:
    widths = (18, 55, 44, 34, 34, 25, 20, 60)
    for index, width in enumerate(widths, start=1):
        sheet.column_dimensions[get_column_letter(index)].width = width


def build_workbook(result: StageResults, input_dir: Path, output_path: Path) -> None:
    filename, title, prefix = REPORTS[result.stage]
    assert output_path.name == filename
    counts = result.counts
    total = len(result.tests)
    source_text = _relative_paths(result.source_files, input_dir) or "No detailed test-result file available"
    availability = "AVAILABLE" if result.tests else "MISSING DETAILED RESULTS"
    assessment = (
        "Detailed test cases were parsed from existing artifacts."
        if result.tests
        else _missing_source_message(result.stage, result.status_files, input_dir)
    )

    workbook = Workbook()
    summary = workbook.active
    summary.title = "Summary"
    details = workbook.create_sheet("Detailed Test Cases")
    summary.sheet_view.showGridLines = False
    details.sheet_view.showGridLines = False
    summary.sheet_properties.tabColor = "1F4E78"
    details.sheet_properties.tabColor = "5B9BD5"

    dark_blue = "1F4E78"
    medium_blue = "D9EAF7"
    light_border = Side(style="thin", color="D9E2F3")
    title_font = Font(name="Arial", size=16, bold=True, color="172033")
    body_font = Font(name="Arial", size=10, color="172033")
    header_font = Font(name="Arial", size=10, bold=True, color="FFFFFF")

    summary["A2"] = title
    summary["A2"].font = title_font
    summary["A3"] = "CareerVue CI/CD test evidence generated from existing artifacts"
    summary["A3"].font = Font(name="Arial", size=10, italic=True, color="5A6573")
    summary["A5"] = "Data availability"
    summary["B5"] = availability
    summary["A6"] = "Detailed source file(s)"
    summary["B6"] = source_text
    summary["A8"] = "Total"
    summary["B8"] = "Passed"
    summary["C8"] = "Failed"
    summary["D8"] = "Skipped"
    summary["A9"] = total
    summary["B9"] = counts["PASS"]
    summary["C9"] = counts["FAIL"]
    summary["D9"] = counts["SKIPPED"]
    summary["A11"] = "Source assessment"
    summary["B11"] = assessment
    summary["A13"] = "Generation note"
    summary["B13"] = "No API, Selenium, or Appium tests were executed to create this workbook."
    summary["A14"] = "Generated at (UTC)"
    summary["B14"] = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    for cell in summary["A"]:
        cell.font = body_font
    for row in summary.iter_rows(min_row=1, max_row=14, min_col=1, max_col=8):
        for cell in row:
            if cell.font == Font():
                cell.font = body_font
            cell.alignment = Alignment(vertical="center")
    for cell in summary[8]:
        if cell.column <= 4:
            cell.fill = PatternFill("solid", fgColor=dark_blue)
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")
    for cell in summary[9][:4]:
        cell.fill = PatternFill("solid", fgColor=medium_blue)
        cell.font = Font(name="Arial", size=14, bold=True, color="172033")
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = Border(bottom=light_border)
    for label_row in (5, 6, 11, 13, 14):
        summary.cell(label_row, 1).font = Font(name="Arial", size=10, bold=True, color="172033")
    summary["B5"].font = Font(
        name="Arial",
        size=10,
        bold=True,
        color="067647" if result.tests else "B42318",
    )
    summary["B11"].alignment = Alignment(wrap_text=True, vertical="top")
    summary["B13"].alignment = Alignment(wrap_text=True, vertical="top")
    summary.column_dimensions["A"].width = 24
    summary.column_dimensions["B"].width = 95
    for column in ("C", "D"):
        summary.column_dimensions[column].width = 18
    summary.row_dimensions[11].height = 45
    summary.row_dimensions[13].height = 30

    details.append(DETAIL_COLUMNS)
    for index, test in enumerate(result.tests, start=1):
        details.append(
            (
                f"{prefix}-{index:03d}",
                test.description or test.name,
                test.steps,
                test.expected,
                test.actual,
                test.status,
                test.duration,
                test.error,
            )
        )
    details.freeze_panes = "A2"
    details.auto_filter.ref = f"A1:H{max(details.max_row, 1)}"
    _set_column_widths(details)
    details.row_dimensions[1].height = 34
    for cell in details[1]:
        cell.fill = PatternFill("solid", fgColor=dark_blue)
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = Border(right=Side(style="thin", color="FFFFFF"))
    for row in details.iter_rows(min_row=2, max_row=details.max_row, min_col=1, max_col=8):
        for cell in row:
            cell.font = body_font
            cell.alignment = Alignment(vertical="top", wrap_text=cell.column in {2, 3, 4, 5, 8})
        row[5].alignment = Alignment(horizontal="center", vertical="center")
        if row[6].value is not None:
            row[6].number_format = '0.000 "s"'
        details.row_dimensions[row[0].row].height = 45

    if result.tests:
        table = Table(displayName=f"{prefix.title()}TestCases", ref=f"A1:H{details.max_row}")
        table.tableStyleInfo = TableStyleInfo(
            name="TableStyleMedium2",
            showFirstColumn=False,
            showLastColumn=False,
            showRowStripes=True,
            showColumnStripes=False,
        )
        details.add_table(table)
        status_range = f"F2:F{details.max_row}"
        details.conditional_formatting.add(
            status_range,
            FormulaRule(formula=['F2="PASS"'], fill=PatternFill("solid", fgColor="C6EFCE"), font=Font(color="006100", bold=True)),
        )
        details.conditional_formatting.add(
            status_range,
            FormulaRule(formula=['F2="FAIL"'], fill=PatternFill("solid", fgColor="FFC7CE"), font=Font(color="9C0006", bold=True)),
        )
        details.conditional_formatting.add(
            status_range,
            FormulaRule(formula=['F2="SKIPPED"'], fill=PatternFill("solid", fgColor="FFF2CC"), font=Font(color="7F6000", bold=True)),
        )

    workbook.properties.title = title
    workbook.properties.subject = "CareerVue CI/CD test report"
    workbook.properties.creator = "CareerVue CI report generator"
    workbook.save(output_path)


def validate_workbook(output_path: Path, result: StageResults) -> None:
    workbook = load_workbook(output_path, data_only=False, read_only=False)
    expected_sheets = ["Summary", "Detailed Test Cases"]
    if workbook.sheetnames != expected_sheets:
        raise ValueError(f"{output_path.name}: expected sheets {expected_sheets}, got {workbook.sheetnames}")
    summary = workbook["Summary"]
    details = workbook["Detailed Test Cases"]
    headers = tuple(details.cell(1, column).value for column in range(1, len(DETAIL_COLUMNS) + 1))
    if headers != DETAIL_COLUMNS:
        raise ValueError(f"{output_path.name}: unexpected detail columns {headers}")
    workbook_counts = (summary["A9"].value, summary["B9"].value, summary["C9"].value, summary["D9"].value)
    counts = result.counts
    source_counts = (len(result.tests), counts["PASS"], counts["FAIL"], counts["SKIPPED"])
    if workbook_counts != source_counts:
        raise ValueError(f"{output_path.name}: workbook counts {workbook_counts} != source counts {source_counts}")
    detail_count = max(details.max_row - 1, 0) if result.tests else 0
    if detail_count != len(result.tests):
        raise ValueError(f"{output_path.name}: detail row count {detail_count} != {len(result.tests)}")
    if result.declared_test_count is not None and result.declared_test_count != len(result.tests):
        raise ValueError(
            f"{output_path.name}: JUnit declared {result.declared_test_count} tests but {len(result.tests)} were parsed"
        )
    if details.freeze_panes != "A2":
        raise ValueError(f"{output_path.name}: detail header row is not frozen")
    if not details.auto_filter.ref:
        raise ValueError(f"{output_path.name}: detail filter is missing")
    workbook.close()


def _final_actual_result(test: TestCase) -> str:
    if test.actual:
        return test.actual
    if test.status == "PASS":
        return "The source execution report recorded this test as passed."
    if test.status == "FAIL":
        return test.error or "The source execution report recorded this test as failed."
    if test.status == "SKIPPED":
        return f"Skipped by the source test runner. {test.error}".strip()
    if test.status == "BLOCKED":
        return test.error or "Execution evidence was incomplete or unavailable."
    return test.error


def _final_rows(results: dict[str, StageResults]) -> dict[str, list[tuple]]:
    rows: dict[str, list[tuple]] = {}
    for stage, result in results.items():
        suite_name, prefix = FINAL_SUITES[stage]
        stage_rows = []
        for index, test in enumerate(result.tests, start=1):
            stage_rows.append(
                (
                    f"{prefix}-{index:03d}",
                    suite_name,
                    test.category or ("Automated UI" if stage in {"selenium", "appium"} else suite_name),
                    test.name,
                    test.objective,
                    test.expected,
                    _final_actual_result(test),
                    test.status,
                    test.priority,
                    test.severity,
                    test.duration,
                )
            )
        rows[stage] = stage_rows
    return rows


def _style_results_sheet(sheet, title: str, evidence_note: str, rows: list[tuple], table_name: str) -> None:
    dark_blue = "17365D"
    pale_blue = "DCE6F1"
    body_font = Font(name="Arial", size=10, color="172033")
    header_font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
    sheet.sheet_view.showGridLines = False
    sheet["A1"] = title
    sheet["A1"].font = Font(name="Arial", size=15, bold=True, color="17365D")
    sheet["A2"] = evidence_note
    sheet["A2"].font = Font(
        name="Arial",
        size=10,
        italic=True,
        color="44546A" if rows else "9C0006",
    )
    sheet["A2"].alignment = Alignment(wrap_text=True, vertical="top")
    sheet.row_dimensions[2].height = 32

    for column, heading in enumerate(FINAL_COLUMNS, start=1):
        cell = sheet.cell(4, column, heading)
        cell.fill = PatternFill("solid", fgColor=dark_blue)
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = Border(right=Side(style="thin", color="FFFFFF"))
    sheet.row_dimensions[4].height = 32

    for row_values in rows:
        sheet.append(row_values)
    for row in sheet.iter_rows(min_row=5, max_row=sheet.max_row, min_col=1, max_col=len(FINAL_COLUMNS)):
        for cell in row:
            cell.font = body_font
            cell.alignment = Alignment(vertical="top", wrap_text=cell.column in {4, 5, 6, 7})
        row[7].alignment = Alignment(horizontal="center", vertical="center")
        if row[10].value is not None:
            row[10].number_format = '0.000 "s"'
        sheet.row_dimensions[row[0].row].height = 48

    widths = (18, 22, 18, 42, 48, 42, 50, 14, 14, 14, 18)
    for index, width in enumerate(widths, start=1):
        sheet.column_dimensions[get_column_letter(index)].width = width
    sheet.freeze_panes = "A5"
    sheet.auto_filter.ref = f"A4:K{max(sheet.max_row, 4)}"

    if rows:
        table = Table(displayName=table_name, ref=f"A4:K{sheet.max_row}")
        table.tableStyleInfo = TableStyleInfo(
            name="TableStyleMedium2",
            showFirstColumn=False,
            showLastColumn=False,
            showRowStripes=True,
            showColumnStripes=False,
        )
        sheet.add_table(table)
        status_range = f"H5:H{sheet.max_row}"
        formats = {
            "PASS": ("C6EFCE", "006100"),
            "FAIL": ("FFC7CE", "9C0006"),
            "SKIPPED": ("FFF2CC", "7F6000"),
            "BLOCKED": ("E7E6E6", "595959"),
        }
        for status, (fill, font) in formats.items():
            sheet.conditional_formatting.add(
                status_range,
                FormulaRule(
                    formula=[f'H5="{status}"'],
                    fill=PatternFill("solid", fgColor=fill),
                    font=Font(color=font, bold=True),
                ),
            )
    else:
        sheet["A5"] = "No verified execution rows are available for this suite."
        sheet["A5"].font = Font(name="Arial", size=10, italic=True, color="9C0006")
        sheet["A5"].fill = PatternFill("solid", fgColor="FCE4D6")
        sheet["A5"].alignment = Alignment(wrap_text=True)
        sheet.merge_cells("A5:K5")
        sheet.row_dimensions[5].height = 30
        sheet.auto_filter.ref = "A4:K4"

    sheet.sheet_properties.tabColor = pale_blue
    sheet.print_title_rows = "1:4"
    sheet.page_setup.orientation = "landscape"
    sheet.sheet_properties.pageSetUpPr.fitToPage = True
    sheet.page_setup.fitToWidth = 1
    sheet.page_setup.fitToHeight = 0


def build_final_workbook(input_dir: Path, output_path: Path) -> dict[str, StageResults]:
    results = discover_final_results(input_dir)
    rows_by_stage = _final_rows(results)
    all_rows = [row for stage in FINAL_SUITES for row in rows_by_stage[stage]]
    all_tests = [test for stage in FINAL_SUITES for test in results[stage].tests]
    counts = Counter(test.status for test in all_tests)
    total = len(all_tests)
    pass_rate = counts["PASS"] / total if total else 0
    complete_evidence = all(results[stage].tests for stage in FINAL_SUITES)
    all_passed = complete_evidence and all(test.status == "PASS" for test in all_tests)
    deployment_status = "READY" if all_passed else "NOT READY - INCOMPLETE OR NON-PASSING EVIDENCE"

    workbook = Workbook()
    summary = workbook.active
    summary.title = "EXECUTIVE SUMMARY"
    summary.sheet_view.showGridLines = False
    summary.sheet_properties.tabColor = "17365D"
    summary["A2"] = "CareerVue Test Execution Executive Summary"
    summary["A2"].font = Font(name="Arial", size=16, bold=True, color="17365D")
    summary["A3"] = "Consolidated strictly from available execution artifacts; missing suites are not inferred."
    summary["A3"].font = Font(name="Arial", size=10, italic=True, color="44546A")

    cards = (
        ("A5:B5", "A6:B6", "Total Verified", total, "D9EAF7", "17365D"),
        ("C5:D5", "C6:D6", "Passed", counts["PASS"], "E2F0D9", "006100"),
        ("E5:F5", "E6:F6", "Failed", counts["FAIL"], "FCE4D6", "9C0006"),
        ("G5:H5", "G6:H6", "Overall Pass Rate", pass_rate, "FFF2CC", "7F6000"),
        ("I5:K5", "I6:K6", "Deployment Readiness", deployment_status, "E7E6E6", "595959"),
    )
    for header_range, value_range, label, value, fill, color in cards:
        summary.merge_cells(header_range)
        summary.merge_cells(value_range)
        header = summary[header_range.split(":")[0]]
        value_cell = summary[value_range.split(":")[0]]
        header.value = label
        value_cell.value = value
        for row in summary[header_range]:
            for cell in row:
                cell.fill = PatternFill("solid", fgColor="17365D")
                cell.font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
                cell.alignment = Alignment(horizontal="center", vertical="center")
        for row in summary[value_range]:
            for cell in row:
                cell.fill = PatternFill("solid", fgColor=fill)
                cell.font = Font(name="Arial", size=13, bold=True, color=color)
                cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        if label == "Overall Pass Rate":
            value_cell.number_format = "0.0%"
    summary.row_dimensions[5].height = 25
    summary.row_dimensions[6].height = 42

    suite_headers = (
        "Suite",
        "Evidence",
        "Total Verified",
        "Passed",
        "Failed",
        "Skipped",
        "Blocked",
        "Pass Rate",
        "Source Artifact(s)",
    )
    for column, heading in enumerate(suite_headers, start=1):
        cell = summary.cell(8, column, heading)
        cell.fill = PatternFill("solid", fgColor="17365D")
        cell.font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    for row_index, stage in enumerate(FINAL_SUITES, start=9):
        result = results[stage]
        stage_counts = result.counts
        stage_total = len(result.tests)
        sources = _relative_paths(result.source_files, input_dir) or "Missing detailed execution source"
        values = (
            FINAL_SUITES[stage][0],
            "VERIFIED" if stage_total else "MISSING",
            stage_total,
            stage_counts["PASS"],
            stage_counts["FAIL"],
            stage_counts["SKIPPED"],
            stage_counts["BLOCKED"],
            stage_counts["PASS"] / stage_total if stage_total else None,
            sources,
        )
        for column, value in enumerate(values, start=1):
            cell = summary.cell(row_index, column, value)
            cell.font = Font(name="Arial", size=10, color="172033")
            cell.alignment = Alignment(vertical="top", wrap_text=column == 9)
            if column == 8 and value is not None:
                cell.number_format = "0.0%"
        summary.cell(row_index, 2).font = Font(
            name="Arial",
            size=10,
            bold=True,
            color="006100" if stage_total else "9C0006",
        )
        summary.row_dimensions[row_index].height = 32
    suite_table = Table(displayName="ExecutiveSuiteSummary", ref="A8:I12")
    suite_table.tableStyleInfo = TableStyleInfo(name="TableStyleMedium2", showRowStripes=True)
    summary.add_table(suite_table)

    summary["A15"] = "Deployment assessment"
    summary["A15"].font = Font(name="Arial", size=11, bold=True, color="17365D")
    summary.merge_cells("A16:K17")
    summary["A16"] = (
        "Deployment is not ready because one or more required suites have missing or non-passing execution evidence. "
        "This workbook does not infer readiness from stage metadata or test source code."
        if not all_passed
        else "All four required suites contain verified execution evidence and every recorded execution passed."
    )
    summary["A16"].fill = PatternFill("solid", fgColor="FCE4D6" if not all_passed else "E2F0D9")
    summary["A16"].font = Font(name="Arial", size=10, bold=True, color="9C0006" if not all_passed else "006100")
    summary["A16"].alignment = Alignment(wrap_text=True, vertical="center")
    summary["A19"] = "Overall status"
    summary["B19"] = "PASS" if all_passed else "INCOMPLETE / NON-PASSING"
    summary["B19"].font = Font(
        name="Arial",
        size=10,
        bold=True,
        color="006100" if all_passed else "9C0006",
    )
    summary["A20"] = "Calculation note"
    summary["A20"].font = Font(name="Arial", size=10, bold=True, color="17365D")
    summary.merge_cells("A21:K21")
    summary["A21"] = "Overall pass rate = passed / total verified executions, including skipped or blocked executions in the denominator."
    summary["A21"].font = Font(name="Arial", size=10, italic=True, color="44546A")
    summary["A23"] = "Generated at (UTC)"
    summary["B23"] = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    summary_widths = (22, 16, 16, 14, 14, 14, 14, 16, 28, 18, 18)
    for index, width in enumerate(summary_widths, start=1):
        summary.column_dimensions[get_column_letter(index)].width = width
    summary.page_setup.orientation = "landscape"
    summary.sheet_properties.pageSetUpPr.fitToPage = True
    summary.page_setup.fitToWidth = 1
    summary.page_setup.fitToHeight = 1

    consolidated = workbook.create_sheet("CONSOLIDATED RESULTS")
    _style_results_sheet(
        consolidated,
        "Consolidated Results",
        "Only verified execution rows from available artifacts are included.",
        all_rows,
        "ConsolidatedExecutionResults",
    )
    consolidated.sheet_properties.tabColor = "4472C4"

    expected_sources = {
        "selenium": "Selenium JUnit XML or pytest JSON",
        "appium": "Appium JUnit XML or pytest JSON",
        "performance": "performance-summary.json plus performance status.json",
        "security": "severity-summary.json plus security status.json",
    }
    table_names = {
        "selenium": "SeleniumWebResults",
        "appium": "AppiumMobileResults",
        "performance": "LoadPerformanceResults",
        "security": "DastSecurityResults",
    }
    for stage, (sheet_name, _) in FINAL_SUITES.items():
        result = results[stage]
        sources = _relative_paths(result.source_files, input_dir)
        note = (
            f"Verified source artifact(s): {sources}"
            if result.tests
            else f"Missing detailed execution source: {expected_sources[stage]}. No execution rows or PASS statuses were invented."
        )
        sheet = workbook.create_sheet(sheet_name.upper())
        _style_results_sheet(sheet, f"{sheet_name} Results", note, rows_by_stage[stage], table_names[stage])

    workbook.properties.title = "CareerVue Final Test Summary"
    workbook.properties.subject = "Consolidated CareerVue test execution evidence"
    workbook.properties.creator = "CareerVue CI report generator"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    workbook.save(output_path)
    return results


def validate_final_workbook(output_path: Path, results: dict[str, StageResults]) -> None:
    workbook = load_workbook(output_path, data_only=False, read_only=False)
    expected_sheets = [
        "EXECUTIVE SUMMARY",
        "CONSOLIDATED RESULTS",
        "SELENIUM WEB",
        "APPIUM MOBILE",
        "LOAD PERFORMANCE",
        "DAST SECURITY",
    ]
    if workbook.sheetnames != expected_sheets:
        raise ValueError(f"{output_path.name}: expected sheets {expected_sheets}, got {workbook.sheetnames}")
    rows_by_stage = _final_rows(results)
    total = sum(len(result.tests) for result in results.values())
    counts = Counter(test.status for result in results.values() for test in result.tests)
    summary = workbook["EXECUTIVE SUMMARY"]
    if summary["A6"].value != total or summary["C6"].value != counts["PASS"] or summary["E6"].value != counts["FAIL"]:
        raise ValueError(f"{output_path.name}: executive counts do not match source artifacts")
    deployment = summary["I6"].value
    complete_and_passed = all(results[stage].tests for stage in FINAL_SUITES) and all(
        test.status == "PASS" for result in results.values() for test in result.tests
    )
    if (deployment == "READY") != complete_and_passed:
        raise ValueError(f"{output_path.name}: deployment readiness is inconsistent with evidence")
    consolidated = workbook["CONSOLIDATED RESULTS"]
    consolidated_rows = consolidated.max_row - 4 if total else 0
    if consolidated_rows != total:
        raise ValueError(f"{output_path.name}: consolidated rows {consolidated_rows} != source rows {total}")
    headers = tuple(consolidated.cell(4, column).value for column in range(1, len(FINAL_COLUMNS) + 1))
    if headers != FINAL_COLUMNS:
        raise ValueError(f"{output_path.name}: consolidated columns do not match required columns")
    for stage, (sheet_name, _) in FINAL_SUITES.items():
        sheet = workbook[sheet_name.upper()]
        headers = tuple(sheet.cell(4, column).value for column in range(1, len(FINAL_COLUMNS) + 1))
        if headers != FINAL_COLUMNS:
            raise ValueError(f"{output_path.name}: {sheet_name} columns do not match required columns")
        actual_rows = sheet.max_row - 4 if rows_by_stage[stage] else 0
        if actual_rows != len(rows_by_stage[stage]):
            raise ValueError(
                f"{output_path.name}: {sheet_name} rows {actual_rows} != source rows {len(rows_by_stage[stage])}"
            )
        if sheet.freeze_panes != "A5" or not sheet.auto_filter.ref:
            raise ValueError(f"{output_path.name}: {sheet_name} table controls are incomplete")
    workbook.close()


def generate_all(input_dir: Path, output_dir: Path, validate: bool = True) -> dict[str, StageResults]:
    input_dir = input_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    results = discover_results(input_dir)
    for stage, result in results.items():
        output_path = output_dir / REPORTS[stage][0]
        build_workbook(result, input_dir, output_path)
        if validate:
            validate_workbook(output_path, result)
    final_results = build_final_workbook(input_dir, output_dir / FINAL_WORKBOOK_NAME)
    if validate:
        validate_final_workbook(output_dir / FINAL_WORKBOOK_NAME, final_results)
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate CareerVue Excel reports from existing test artifacts")
    parser.add_argument("--input", type=Path, required=True, help="Directory containing downloaded or local test artifacts")
    parser.add_argument("--output", type=Path, required=True, help="Directory for generated .xlsx reports")
    parser.add_argument("--no-validate", action="store_true", help="Skip reopening and validating generated workbooks")
    parser.add_argument("--final-only", action="store_true", help="Generate only FINAL_TEST_SUMMARY.xlsx")
    args = parser.parse_args()

    if args.final_only:
        final_path = args.output / FINAL_WORKBOOK_NAME
        final_results = build_final_workbook(args.input.resolve(), final_path)
        if not args.no_validate:
            validate_final_workbook(final_path, final_results)
        for stage, result in final_results.items():
            counts = result.counts
            print(
                f"{stage}: total={len(result.tests)} pass={counts['PASS']} "
                f"fail={counts['FAIL']} skipped={counts['SKIPPED']} blocked={counts['BLOCKED']}"
            )
        print(f"final: {final_path}")
        return 0

    results = generate_all(args.input, args.output, validate=not args.no_validate)
    for stage, result in results.items():
        counts = result.counts
        source = ", ".join(path.as_posix() for path in result.source_files) or "MISSING"
        print(
            f"{stage}: total={len(result.tests)} pass={counts['PASS']} fail={counts['FAIL']} "
            f"skipped={counts['SKIPPED']} source={source}"
        )
    missing = [stage for stage, result in results.items() if not result.tests]
    if missing:
        print(
            "Missing detailed test results for: " + ", ".join(missing) + ". Placeholder workbooks were created without fabricated cases.",
            file=sys.stderr,
        )
    print(f"final: {args.output / FINAL_WORKBOOK_NAME}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
