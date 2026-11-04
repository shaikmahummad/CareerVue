from __future__ import annotations

import argparse
import html
import json
import os
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from scripts.ci.generate_excel_reports import (  # noqa: E402
    FINAL_SUITES,
    FINAL_WORKBOOK_NAME,
    StageResults,
    discover_final_results,
    generate_all,
)


SUITE_DIRECTORIES = {
    "selenium": "selenium",
    "appium": "appium",
    "load": "load-testing",
    "performance": "load-testing",
    "dast": "dast-security",
    "security": "dast-security",
    "zap": "dast-security",
}


def copy_report_sources(input_dir: Path, output_dir: Path) -> None:
    """Preserve downloaded machine-readable evidence without treating catalogs as results."""
    copied: set[tuple[Path, str]] = set()
    for source in sorted(path for path in input_dir.rglob("*") if path.is_file()):
        lowered = "/".join(part.lower() for part in source.parts)
        for token, directory in SUITE_DIRECTORIES.items():
            marker = (source, directory)
            if token in lowered and marker not in copied:
                destination = output_dir / directory / source.name
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, destination)
                copied.add(marker)


def load_stage_statuses(input_dir: Path) -> dict[str, dict]:
    statuses: dict[str, dict] = {}
    for status_path in sorted(input_dir.rglob("*status.json")):
        try:
            payload = json.loads(status_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if isinstance(payload, dict) and payload.get("stage"):
            statuses[str(payload["stage"])] = payload
    return statuses


def evidence_status(result: StageResults) -> str:
    if not result.tests:
        return "MISSING"
    counts = result.counts
    if counts["FAIL"]:
        return "FAIL"
    if counts["BLOCKED"]:
        return "BLOCKED"
    if counts["SKIPPED"]:
        return "SKIPPED" if counts["PASS"] == 0 else "INCOMPLETE"
    return "PASS" if counts["PASS"] == len(result.tests) else "INCOMPLETE"


def evidence_snapshot(results: dict[str, StageResults]) -> tuple[dict[str, dict], bool]:
    suites: dict[str, dict] = {}
    for stage, result in results.items():
        counts = result.counts
        suites[stage] = {
            "suite": FINAL_SUITES[stage][0],
            "status": evidence_status(result),
            "total_verified": len(result.tests),
            "passed": counts["PASS"],
            "failed": counts["FAIL"],
            "skipped": counts["SKIPPED"],
            "blocked": counts["BLOCKED"],
            "sources": [path.as_posix() for path in result.source_files],
            "warning": "" if result.tests else "Missing detailed execution results; no PASS status was inferred.",
        }
    ready = all(
        results[stage].tests
        and all(test.status == "PASS" for test in results[stage].tests)
        for stage in FINAL_SUITES
    )
    return suites, ready


def write_summary_html(suites: dict[str, dict], ready: bool, output_path: Path) -> None:
    total = sum(suite["total_verified"] for suite in suites.values())
    passed = sum(suite["passed"] for suite in suites.values())
    failed = sum(suite["failed"] for suite in suites.values())
    rows = []
    for suite in suites.values():
        sources = ", ".join(suite["sources"]) or suite["warning"]
        rows.append(
            "<tr>"
            f"<td>{html.escape(suite['suite'])}</td>"
            f"<td>{suite['total_verified']}</td>"
            f"<td>{suite['passed']}</td>"
            f"<td>{suite['failed']}</td>"
            f"<td>{suite['skipped']}</td>"
            f"<td>{suite['blocked']}</td>"
            f"<td>{html.escape(suite['status'])}</td>"
            f"<td>{html.escape(sources)}</td>"
            "</tr>"
        )
    readiness = "READY" if ready else "NOT READY - INCOMPLETE OR NON-PASSING EVIDENCE"
    output_path.write_text(
        "<!doctype html><html><head><meta charset='utf-8'>"
        "<title>CareerVue CI/CD Quality Report</title>"
        "<style>body{font-family:Arial,sans-serif;margin:32px;color:#172033}"
        "table{border-collapse:collapse;width:100%}th,td{border:1px solid #d9e2f3;padding:8px;text-align:left}"
        "th{background:#17365d;color:white}.warning{color:#9c0006;font-weight:bold}</style>"
        "</head><body><h1>CareerVue CI/CD Quality Summary</h1>"
        f"<p>Total verified: {total} | Passed: {passed} | Failed: {failed}</p>"
        f"<p class='warning'>Deployment readiness: {html.escape(readiness)}</p>"
        "<table><thead><tr><th>Suite</th><th>Total verified</th><th>Passed</th><th>Failed</th>"
        "<th>Skipped</th><th>Blocked</th><th>Status</th><th>Evidence</th></tr></thead><tbody>"
        + "".join(rows)
        + "</tbody></table></body></html>",
        encoding="utf-8",
    )


def write_job_summary(suites: dict[str, dict], ready: bool) -> str:
    lines = ["# Final CI/CD Quality Summary", ""]
    for suite in suites.values():
        lines.append(
            f"- **{suite['suite']}:** {suite['status']} "
            f"(verified={suite['total_verified']}, passed={suite['passed']}, "
            f"failed={suite['failed']}, skipped={suite['skipped']}, blocked={suite['blocked']})"
        )
        if suite["warning"]:
            lines.append(f"  - Warning: {suite['warning']}")
    lines.extend(
        [
            "",
            f"### Overall Testing Status: **{'PASS' if ready else 'INCOMPLETE / NON-PASSING'}**",
            f"### Deployment Status: **{'READY' if ready else 'NOT READY'}**",
            "",
        ]
    )
    summary = "\n".join(lines)
    summary_file = os.getenv("GITHUB_STEP_SUMMARY")
    if summary_file:
        with open(summary_file, "a", encoding="utf-8") as stream:
            stream.write(summary)
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Bundle existing test reports without executing tests.")
    parser.add_argument("--input", type=Path, default=Path("artifacts"))
    parser.add_argument("--output", type=Path, default=Path("reports"))
    parser.add_argument("--archive", default="bundled-reports")
    args = parser.parse_args()

    args.output.mkdir(parents=True, exist_ok=True)
    copy_report_sources(args.input, args.output)

    excel_dir = args.output / "excel"
    generate_all(args.input, excel_dir, validate=True)
    final_results = discover_final_results(args.input.resolve())
    suites, ready = evidence_snapshot(final_results)

    final_html = args.output / "FINAL_TEST_SUMMARY.html"
    write_summary_html(suites, ready, final_html)

    summary_dir = args.output / "summary"
    summary_dir.mkdir(parents=True, exist_ok=True)
    pipeline_summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "stages": load_stage_statuses(args.input),
        "suites": suites,
        "total_verified": sum(suite["total_verified"] for suite in suites.values()),
        "readiness": "READY" if ready else "NOT READY - INCOMPLETE OR NON-PASSING EVIDENCE",
    }
    (summary_dir / "pipeline-summary.json").write_text(
        json.dumps(pipeline_summary, indent=2), encoding="utf-8"
    )
    shutil.copy2(final_html, summary_dir / "pipeline-summary.html")

    archive_path = Path(args.archive)
    shutil.make_archive(
        str(archive_path.with_suffix("")),
        "zip",
        root_dir=args.output.parent,
        base_dir=args.output.name,
    )

    summary = write_job_summary(suites, ready)
    print(summary)
    print(f"final: {excel_dir / FINAL_WORKBOOK_NAME}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
