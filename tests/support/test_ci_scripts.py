from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class CiSupportScriptTests(unittest.TestCase):
    def test_zap_summary_aggregates_and_enforces_high_findings(self):
        with tempfile.TemporaryDirectory() as directory:
            temp = Path(directory)
            report = temp / "zap.json"
            output = temp / "summary.json"
            report.write_text(
                json.dumps(
                    {
                        "site": [
                            {
                                "alerts": [
                                    {"riskcode": "3", "name": "Example high", "count": "1"},
                                    {"riskcode": "1", "name": "Example low", "count": "2"},
                                ]
                            }
                        ]
                    }
                ),
                encoding="utf-8",
            )
            result = subprocess.run(
                [
                    sys.executable,
                    str(ROOT / "scripts/ci/zap_summary.py"),
                    str(report),
                    "--output",
                    str(output),
                    "--fail-on",
                    "high",
                ],
                check=False,
            )
            self.assertEqual(result.returncode, 2)
            self.assertEqual(json.loads(output.read_text())["counts"]["high"], 1)

    def test_report_bundler_creates_html_json_and_zip(self):
        with tempfile.TemporaryDirectory() as directory:
            temp = Path(directory)
            source = temp / "downloads" / "quality-reports" / "quality"
            source.mkdir(parents=True)
            (source / "status.json").write_text(
                json.dumps({"stage": "quality", "result": "success", "details": "test"}),
                encoding="utf-8",
            )
            output = temp / "ci-reports"
            archive = temp / "bundle"
            subprocess.run(
                [
                    sys.executable,
                    str(ROOT / "scripts/ci/bundle_reports.py"),
                    "--input",
                    str(temp / "downloads"),
                    "--output",
                    str(output),
                    "--archive",
                    str(archive),
                ],
                check=True,
            )
            summary = json.loads((output / "summary/pipeline-summary.json").read_text())
            self.assertEqual(summary["stages"]["quality"]["result"], "success")
            self.assertTrue((output / "summary/pipeline-summary.html").is_file())
            self.assertTrue(archive.with_suffix(".zip").is_file())


if __name__ == "__main__":
    unittest.main()

