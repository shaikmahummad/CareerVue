from __future__ import annotations

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

__all__ = ["create_excel_report"]

