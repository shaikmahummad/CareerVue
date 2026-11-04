from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

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

