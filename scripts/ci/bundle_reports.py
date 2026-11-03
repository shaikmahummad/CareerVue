from __future__ import annotations

import argparse
import html
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path


STAGES = ("quality", "selenium", "appium", "performance", "security", "web-build", "mobile-build", "deployment")


def copy_artifacts(source: Path, destination: Path) -> None:
    for path in source.rglob("*"):
        if not path.is_file():
            continue
        relative = path.relative_to(source)
        parts = list(relative.parts)
        if parts and parts[0].endswith("-reports"):
            parts = parts[1:]
        target = destination.joinpath(*parts)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("ci-reports"))
    parser.add_argument("--archive", default="ci-reports")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    copy_artifacts(args.input, args.output)

    statuses = {}
    for status_path in args.output.rglob("*status.json"):
        status = load_json(status_path)
        if status and status.get("stage"):
            statuses[status["stage"]] = status
    for stage in STAGES:
        statuses.setdefault(stage, {"stage": stage, "result": "skipped", "details": "No status artifact was produced"})

    performance = next((load_json(path) for path in args.output.rglob("performance-summary.json")), None)
    security = next((load_json(path) for path in args.output.rglob("severity-summary.json")), None)
    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "stages": statuses,
        "performance": performance,
        "security": security,
    }
    summary_dir = args.output / "summary"
    summary_dir.mkdir(exist_ok=True)
    (summary_dir / "pipeline-summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    rows = "".join(
        f"<tr><td>{html.escape(stage)}</td><td class='{html.escape(item['result'])}'>{html.escape(item['result'])}</td><td>{html.escape(item.get('details', ''))}</td></tr>"
        for stage, item in statuses.items()
    )
    perf_html = html.escape(json.dumps(performance, indent=2)) if performance else "Not executed"
    security_html = html.escape(json.dumps(security, indent=2)) if security else "Not executed"
    document = f"""<!doctype html><html><head><meta charset='utf-8'><title>CareerVue CI report</title>
<style>body{{font:15px system-ui;max-width:1100px;margin:40px auto;color:#172033}}table{{border-collapse:collapse;width:100%}}th,td{{padding:10px;border:1px solid #dbe2ea;text-align:left}}.success{{color:#067647}}.failure{{color:#b42318}}.skipped{{color:#667085}}pre{{background:#f4f6f8;padding:18px;overflow:auto}}</style></head>
<body><h1>CareerVue CI/CD report</h1><table><thead><tr><th>Stage</th><th>Result</th><th>Details</th></tr></thead><tbody>{rows}</tbody></table>
<h2>Performance</h2><pre>{perf_html}</pre><h2>Security</h2><pre>{security_html}</pre></body></html>"""
    (summary_dir / "pipeline-summary.html").write_text(document, encoding="utf-8")
    shutil.make_archive(args.archive, "zip", root_dir=args.output.parent, base_dir=args.output.name)


if __name__ == "__main__":
    main()

