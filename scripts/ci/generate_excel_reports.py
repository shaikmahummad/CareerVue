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


def generate_all(input_dir: Path, output_dir: Path, validate: bool = True) -> dict[str, StageResults]:
    input_dir = input_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    results = discover_results(input_dir)
    for stage, result in results.items():
        output_path = output_dir / REPORTS[stage][0]
        build_workbook(result, input_dir, output_path)
        if validate:
            validate_workbook(output_path, result)
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate CareerVue Excel reports from existing test artifacts")
    parser.add_argument("--input", type=Path, required=True, help="Directory containing downloaded or local test artifacts")
    parser.add_argument("--output", type=Path, required=True, help="Directory for generated .xlsx reports")
    parser.add_argument("--no-validate", action="store_true", help="Skip reopening and validating generated workbooks")
    args = parser.parse_args()

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
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
