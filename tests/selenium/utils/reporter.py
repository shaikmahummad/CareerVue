from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter


HEADERS = [
    "Test ID",
    "Test Category",
    "Test Name",
    "Objective",
    "Preconditions",
    "Steps",
    "Test Data",
    "Expected Result",
    "Actual Result",
    "Status",
    "Priority",
    "Severity",
    "Execution Time",
    "Error/Failure Message",
    "Screenshot/Artifact",
    "Remarks",
]

DARK_BLUE = "1F4E78"
MEDIUM_BLUE = "D9EAF7"
WHITE = "FFFFFF"
LIGHT_BORDER = Side(style="thin", color="D9E2F3")
HEADER_FONT = Font(name="Arial", size=10, bold=True, color=WHITE)
TITLE_FONT = Font(name="Arial", size=16, bold=True, color="172033")
BODY_FONT = Font(name="Arial", size=10, color="172033")


def format_sheet_table(sheet, headers: List[str], rows: List[List[Any]]) -> None:
    sheet.append(headers)
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = f"A1:{get_column_letter(len(headers))}{max(len(rows) + 1, 1)}"
    sheet.row_dimensions[1].height = 28

    for col_idx, cell in enumerate(sheet[1], start=1):
        cell.fill = PatternFill("solid", fgColor=DARK_BLUE)
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = Border(right=Side(style="thin", color=WHITE))

    for row_idx, row_data in enumerate(rows, start=2):
        sheet.append(row_data)
        sheet.row_dimensions[row_idx].height = 24
        for col_idx in range(1, len(headers) + 1):
            cell = sheet.cell(row=row_idx, column=col_idx)
            cell.font = BODY_FONT
            cell.alignment = Alignment(vertical="center")
            if col_idx == 10:  # Status
                status_str = str(cell.value).upper()
                if "PASS" in status_str:
                    cell.font = Font(name="Arial", size=10, bold=True, color="067647")
                elif "FAIL" in status_str:
                    cell.font = Font(name="Arial", size=10, bold=True, color="B42318")
                cell.alignment = Alignment(horizontal="center", vertical="center")

    for col in sheet.columns:
        col_letter = get_column_letter(col[0].column)
        sheet.column_dimensions[col_letter].width = 24


def create_excel_report(
    test_results: List[Dict[str, Any]],
    output_path: Path | str,
    suite_name: str = "Selenium Web Testing",
    environment: str = "Staging/CI",
    build_commit: str = "HEAD",
) -> Path:
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    workbook = Workbook()
    summary = workbook.active
    summary.title = "SUMMARY"
    summary.sheet_view.showGridLines = False

    total = len(test_results)
    passed = sum(1 for r in test_results if str(r.get("status", "")).upper() == "PASS")
    failed = sum(1 for r in test_results if str(r.get("status", "")).upper() == "FAIL")
    skipped = sum(1 for r in test_results if str(r.get("status", "")).upper() == "SKIPPED")
    blocked = sum(1 for r in test_results if str(r.get("status", "")).upper() == "BLOCKED")
    pass_pct = (passed / total * 100.0) if total > 0 else 100.0
    total_time = sum(float(r.get("execution_time", 0.0) or 0.0) for r in test_results)
    readiness = "PASS" if failed == 0 and blocked == 0 and passed > 0 else "FAIL"

    summary["A2"] = f"CareerVue Quality Report: {suite_name}"
    summary["A2"].font = TITLE_FONT
    summary["A3"] = f"Generated for CI/CD pipeline at {datetime.now(timezone.utc).isoformat()}"
    summary["A3"].font = Font(name="Arial", size=10, italic=True, color="5A6573")

    summary_cards = [
        ("Total Tests", total),
        ("Passed", passed),
        ("Failed", failed),
        ("Skipped", skipped),
        ("Blocked", blocked),
        ("Pass Percentage", f"{pass_pct:.1f}%"),
        ("Execution Time", f"{total_time:.2f}s"),
        ("Deployment Readiness", readiness),
    ]

    for idx, (label, val) in enumerate(summary_cards, start=1):
        cell_lbl = summary.cell(row=5, column=idx, value=label)
        cell_lbl.fill = PatternFill("solid", fgColor=DARK_BLUE)
        cell_lbl.font = HEADER_FONT
        cell_lbl.alignment = Alignment(horizontal="center", vertical="center")

        cell_val = summary.cell(row=6, column=idx, value=val)
        cell_val.fill = PatternFill("solid", fgColor=MEDIUM_BLUE)
        cell_val.font = Font(name="Arial", size=12, bold=True, color="172033")
        cell_val.alignment = Alignment(horizontal="center", vertical="center")
        summary.column_dimensions[get_column_letter(idx)].width = 20

    metadata = [
        ("Suite / Category", suite_name),
        ("Environment", environment),
        ("Build / Commit", build_commit or os.getenv("GITHUB_SHA", "local-dev")),
        ("Timestamp (UTC)", datetime.now(timezone.utc).isoformat()),
        ("Deployment Readiness", readiness),
    ]

    for idx, (lbl, v) in enumerate(metadata, start=8):
        c_lbl = summary.cell(row=idx, column=1, value=lbl)
        c_lbl.font = Font(name="Arial", size=10, bold=True, color="172033")
        c_val = summary.cell(row=idx, column=2, value=str(v))
        c_val.font = BODY_FONT
        if lbl == "Deployment Readiness":
            c_val.font = Font(name="Arial", size=10, bold=True, color="067647" if v == "PASS" else "B42318")

    rows = []
    for r in test_results:
        exec_t = f"{float(r.get('execution_time', 0.0)):.3f}s" if r.get("execution_time") is not None else ""
        rows.append([
            r.get("test_id", ""),
            r.get("test_category", ""),
            r.get("test_name", ""),
            r.get("objective", ""),
            r.get("preconditions", ""),
            r.get("steps", ""),
            r.get("test_data", ""),
            r.get("expected_result", ""),
            r.get("actual_result", ""),
            r.get("status", "PASS"),
            r.get("priority", "P1"),
            r.get("severity", "Medium"),
            exec_t,
            r.get("error_message", ""),
            r.get("screenshot_artifact", ""),
            r.get("remarks", ""),
        ])

    test_results_sheet = workbook.create_sheet("TEST RESULTS")
    format_sheet_table(test_results_sheet, HEADERS, rows)

    categories = set(str(r.get("test_category", "")).strip() for r in test_results if r.get("test_category"))
    for cat in sorted(categories):
        safe_sheet_title = cat.upper().replace("/", "_").replace(" ", "_")[:31]
        cat_sheet = workbook.create_sheet(safe_sheet_title)
        cat_rows = [row for row in rows if row[1] == cat]
        format_sheet_table(cat_sheet, HEADERS, cat_rows)

    workbook.save(out)
    return out

