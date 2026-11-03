from __future__ import annotations

import argparse
import json
from pathlib import Path


RISK_NAMES = {"0": "informational", "1": "low", "2": "medium", "3": "high"}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("report", type=Path, nargs="+")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--fail-on", choices=("none", "medium", "high"), default="high")
    args = parser.parse_args()
    counts = {name: 0 for name in RISK_NAMES.values()}
    alerts = []
    for report_path in args.report:
        report = json.loads(report_path.read_text(encoding="utf-8"))
        for site in report.get("site", []):
            for alert in site.get("alerts", []):
                risk = RISK_NAMES.get(str(alert.get("riskcode", "0")), "informational")
                count = int(alert.get("count", len(alert.get("instances", [])) or 1))
                counts[risk] += count
                alerts.append({"source": report_path.name, "name": alert.get("name"), "risk": risk, "count": count})
    summary = {"counts": counts, "alerts": alerts, "gate": args.fail_on}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    if args.fail_on == "none":
        return 0
    if counts["high"]:
        return 2
    if args.fail_on == "medium" and counts["medium"]:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

