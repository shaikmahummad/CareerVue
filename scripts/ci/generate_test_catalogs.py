from __future__ import annotations

import argparse
import csv
import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

from openpyxl import Workbook


ROOT = Path(__file__).resolve().parents[2]
MINIMUM_CASES = 351


@dataclass(frozen=True)
class TestCase:
    test_id: str
    test_category: str
    test_name: str
    objective: str
    preconditions: str
    steps: str
    test_data: str
    expected_result: str
    actual_result: str
    status: str
    priority: str
    severity: str
    execution_time: str
    remarks: str
    automation_status: str


def _label(path: Path, base: Path) -> str:
    relative = path.relative_to(base).with_suffix("")
    parts = [
        part
        for part in relative.parts
        if part != "_layout" and not (part.startswith("(") and part.endswith(")"))
    ]
    value = "/".join(parts) or "/"
    value = re.sub(r"\[(.+?)\]", r"<\1>", value)
    return "/" + value.lstrip("/")


def _files(base: Path, patterns: tuple[str, ...]) -> list[Path]:
    found = {path for pattern in patterns for path in base.rglob(pattern)}
    return sorted(path for path in found if path.is_file() and "__tests__" not in path.parts)


def _targets(base: Path, patterns: tuple[str, ...], fallback: Iterable[str]) -> list[str]:
    values = [_label(path, base) for path in _files(base, patterns)]
    return list(dict.fromkeys(values)) or list(fallback)


def _router_targets(base: Path) -> list[str]:
    names = {
        path.stem
        for path in _files(base, ("*.py",))
        if path.stem != "__init__"
    }
    return [f"/api/v1/{name}" for name in sorted(names)] or ["/health", "/api/v1/courses"]


def _make_cases(
    prefix: str,
    suite: str,
    targets: list[str],
    categories: tuple[tuple[str, str, str], ...],
    variants: tuple[tuple[str, str], ...],
) -> list[TestCase]:
    cases: list[TestCase] = []
    for target in targets:
        for category, objective, expected in categories:
            for variant, data in variants:
                ordinal = len(cases) + 1
                cases.append(
                    TestCase(
                        test_id=f"{prefix}-{ordinal:04d}",
                        test_category=category,
                        test_name=f"{suite}: {target} - {variant}",
                        objective=f"{objective} for the actual {target} feature.",
                        preconditions=f"{target} is available in the configured {suite.lower()} test environment.",
                        steps=f"Open or call {target}; execute the {variant.lower()} scenario; capture the result.",
                        test_data=data,
                        expected_result=expected,
                        actual_result="Not executed; catalog definition only.",
                        status="NOT_EXECUTED",
                        priority="P1" if category in {"Functional", "Security", "Performance"} else "P2",
                        severity="High" if category in {"Security", "Negative"} else "Medium",
                        execution_time="",
                        remarks="Catalog case; execution status is populated by the CI runner.",
                        automation_status="AUTOMATED_CANDIDATE",
                    )
                )
    return cases


def build_catalogs() -> dict[str, list[TestCase]]:
    web_targets = _targets(
        ROOT / "apps/web/app",
        ("page.tsx", "route.ts", "layout.tsx"),
        ("/", "/login", "/register", "/student/dashboard"),
    )
    mobile_targets = _targets(
        ROOT / "apps/mobile/app",
        ("*.tsx", "*.ts"),
        ("/(auth)/login", "/(student)/dashboard", "/(tutor)/dashboard"),
    )
    api_targets = _router_targets(ROOT / "backend/app/routers")

    ui_categories = (
        ("UI/UX", "Verify rendering, layout, and interaction affordances", "The feature is usable and visually consistent."),
        ("Functional", "Verify the primary feature workflow", "The requested workflow completes with the expected state."),
        ("Validation", "Verify required, invalid, boundary, and special-character input handling", "Invalid input is rejected with a useful validation message."),
        ("Negative", "Verify safe recovery from an invalid action or unavailable dependency", "The application shows a controlled error without data loss or a crash."),
        ("Regression", "Verify the feature remains compatible with related navigation and session state", "Existing related behavior remains intact."),
        ("Accessibility", "Verify keyboard, screen-reader, focus, and contrast behavior where supported", "The feature remains accessible under the supported accessibility checks."),
        ("End-to-End", "Verify the feature as part of a complete user journey", "The end-to-end journey reaches the intended outcome."),
    )
    ui_variants = (
        ("happy path", "valid representative data"),
        ("empty input", "empty values"),
        ("boundary input", "minimum and maximum supported values"),
        ("invalid input", "malformed and unsupported values"),
        ("refresh and revisit", "a refreshed session"),
        ("unauthenticated access", "no authenticated session"),
        ("slow dependency", "delayed network response"),
        ("responsive viewport", "mobile, tablet, and desktop viewport sizes"),
    )
    performance_categories = (
        ("Performance", "Measure response time and throughput under the scenario", "The scenario stays within the configured CI threshold."),
        ("Concurrency", "Measure behavior with concurrent users or requests", "Concurrent requests complete without unacceptable errors."),
        ("Recovery", "Measure recovery after a spike, timeout, or transient failure", "The service recovers and returns to the agreed baseline."),
    )
    performance_variants = (
        ("smoke request", "1 virtual user, short duration"),
        ("ramp-up", "gradual increase to the configured virtual-user count"),
        ("sustained load", "steady traffic at the configured virtual-user count"),
        ("spike", "rapid increase followed by recovery"),
        ("large page or payload", "representative large response or request"),
        ("pagination and filtering", "representative pagination and filter parameters"),
    )
    security_categories = (
        ("Security", "Check the target for the selected passive or safe active security indicator", "No unacceptable finding is reported at or above the configured severity gate."),
        ("Authentication", "Check authentication and session handling controls", "Authentication and session controls behave as configured."),
        ("Authorization", "Check access-control behavior for the target", "Unauthorized access is denied without sensitive disclosure."),
        ("Input Validation", "Check safe handling of a security-relevant input class", "The input is handled safely and errors do not disclose secrets."),
    )
    security_variants = (
        ("security headers", "standard security-header inspection"),
        ("cookie flags", "cookie attribute inspection"),
        ("cross-site request", "safe cross-site request probe"),
        ("reflected payload", "non-destructive reflected-input probe"),
        ("access-control probe", "authorized-role boundary comparison"),
        ("error disclosure", "malformed request and response inspection"),
        ("method and path probe", "safe method/path exposure check"),
    )

    catalogs = {
        "appium": _make_cases("MOB", "Appium mobile", mobile_targets, ui_categories, ui_variants),
        "selenium": _make_cases("WEB", "Selenium web", web_targets, ui_categories, ui_variants),
        "load": _make_cases("LOAD", "Load", api_targets + web_targets, performance_categories, performance_variants),
        "dast": _make_cases("DAST", "DAST", api_targets + web_targets, security_categories, security_variants),
    }
    for suite, cases in catalogs.items():
        if len(cases) < MINIMUM_CASES:
            raise RuntimeError(f"{suite} catalog contains {len(cases)} cases; at least {MINIMUM_CASES} are required")
    return catalogs


def write_catalog(name: str, cases: list[TestCase], output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    rows = [asdict(case) for case in cases]
    (output / f"{name}_test_cases.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
    with (output / f"{name}_test_cases.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)

    workbook = Workbook()
    summary = workbook.active
    summary.title = "SUMMARY"
    summary.append(["Field", "Value"])
    summary.append(["Total Tests", len(cases)])
    summary.append(["Status", "NOT_EXECUTED (catalog)"])
    summary.append(["Automation Status", "AUTOMATED_CANDIDATE"])
    summary.append(["Source", "Generated from repository routes/screens/endpoints"])
    results = workbook.create_sheet("TEST RESULTS")
    headers = list(rows[0])
    results.append(headers)
    for row in rows:
        results.append([row[header] for header in headers])
    workbook.save(output / f"{name}_test_cases.xlsx")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate repository-derived test case catalogs.")
    parser.add_argument("--output", type=Path, default=ROOT / "test-cases")
    parser.add_argument("--suite", choices=("appium", "selenium", "load", "dast"), default="")
    args = parser.parse_args()
    catalogs = build_catalogs()
    if args.suite:
        catalogs = {args.suite: catalogs[args.suite]}
    for name, cases in catalogs.items():
        write_catalog(name, cases, args.output)
    print(json.dumps({name: len(cases) for name, cases in catalogs.items()}, sort_keys=True))


if __name__ == "__main__":
    main()
