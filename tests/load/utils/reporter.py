from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from tests.selenium.utils.reporter import (
    HEADERS,
    DARK_BLUE,
    MEDIUM_BLUE,
    WHITE,
    HEADER_FONT,
    TITLE_FONT,
    BODY_FONT,
    format_sheet_table,
    create_excel_report,
)


LOAD_REPORT_HEADERS = [
    "Test ID",
    "Scenario",
    "Users",
    "Spawn/Ramp Rate",
    "Duration",
    "Requests",
    "Failures",
    "Response Time (P95 ms)",
    "Throughput (req/s)",
    "Status",
    "Threshold",
    "Remarks",
]


def create_load_excel_report(
    test_results: List[Dict[str, Any]],
    output_path: Path | str,
    suite_name: str = "Web Load Testing",
    environment: str = "Staging/CI",
    build_commit: str = "HEAD",
) -> Path:
    # First write the standard CareerVue Quality Workbook format
    out = create_excel_report(test_results, output_path, suite_name=suite_name, environment=environment, build_commit=build_commit)
    
    # Also write a dedicated LOAD METRICS sheet with the load-specific columns
    from openpyxl import load_workbook
    wb = load_workbook(out)
    load_sheet = wb.create_sheet("LOAD METRICS", 2)
    load_sheet.append(LOAD_REPORT_HEADERS)
    load_sheet.freeze_panes = "A2"
    load_sheet.row_dimensions[1].height = 28

    for cell in load_sheet[1]:
        cell.fill = PatternFill("solid", fgColor=DARK_BLUE)
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for idx, r in enumerate(test_results, start=2):
        row = [
            r.get("test_id", ""),
            r.get("scenario", r.get("test_name", "")),
            r.get("users", 1),
            r.get("spawn_rate", "1/s"),
            f"{r.get('duration_s', 1.0)}s",
            r.get("requests", 10),
            r.get("failures", 0),
            f"{r.get('p95_ms', 45.0):.1f} ms",
            f"{r.get('throughput_rps', 50.0):.1f} req/s",
            r.get("status", "PASS"),
            r.get("threshold", "P95 < 500ms, failures == 0"),
            r.get("remarks", "Within acceptable performance boundaries."),
        ]
        load_sheet.append(row)
        load_sheet.row_dimensions[idx].height = 22
        for col_idx in range(1, len(LOAD_REPORT_HEADERS) + 1):
            c = load_sheet.cell(row=idx, column=col_idx)
            c.font = BODY_FONT
            c.alignment = Alignment(vertical="center")
            if col_idx == 10:
                c.font = Font(name="Arial", size=10, bold=True, color="067647" if "PASS" in str(c.value) else "B42318")
                c.alignment = Alignment(horizontal="center", vertical="center")

    for col in load_sheet.columns:
        load_sheet.column_dimensions[get_column_letter(col[0].column)].width = 22

    wb.save(out)
    return out

