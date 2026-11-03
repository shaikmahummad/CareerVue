import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const baseUrl = (__ENV.PERF_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const profile = __ENV.K6_PROFILE || "smoke";
const p95Limit = Number(__ENV.K6_P95_MS || 500);
const failureLimit = Number(__ENV.K6_FAILURE_RATE || 0.01);
const unexpectedServerErrors = new Rate("unexpected_server_errors");

const profiles = {
  smoke: { executor: "constant-vus", vus: 1, duration: __ENV.K6_SMOKE_DURATION || "30s" },
  load: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: __ENV.K6_LOAD_RAMP || "1m", target: Number(__ENV.K6_LOAD_VUS || 20) },
      { duration: __ENV.K6_LOAD_HOLD || "3m", target: Number(__ENV.K6_LOAD_VUS || 20) },
      { duration: "30s", target: 0 },
    ],
  },
  stress: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "1m", target: Number(__ENV.K6_STRESS_VUS || 50) },
      { duration: "2m", target: Number(__ENV.K6_STRESS_VUS || 50) },
      { duration: "1m", target: Number(__ENV.K6_STRESS_VUS || 100) },
      { duration: "2m", target: Number(__ENV.K6_STRESS_VUS || 100) },
      { duration: "1m", target: 0 },
    ],
  },
  spike: {
    executor: "ramping-vus",
    startVUs: 1,
    stages: [
      { duration: "15s", target: Number(__ENV.K6_SPIKE_VUS || 100) },
      { duration: "45s", target: Number(__ENV.K6_SPIKE_VUS || 100) },
      { duration: "15s", target: 1 },
    ],
  },
};

if (!profiles[profile]) throw new Error(`Unknown K6_PROFILE=${profile}`);

export const options = {
  scenarios: { [profile]: profiles[profile] },
  thresholds: {
    http_req_failed: [`rate<${failureLimit}`],
    http_req_duration: [`p(95)<${p95Limit}`],
    unexpected_server_errors: ["rate==0"],
  },
  discardResponseBodies: true,
};

export default function () {
  const health = http.get(`${baseUrl}/health`, { tags: { endpoint: "health" } });
  check(health, { "health returns 200": (response) => response.status === 200 });
  unexpectedServerErrors.add(health.status >= 500);

  const courses = http.get(`${baseUrl}/api/v1/courses/?limit=20`, {
    tags: { endpoint: "courses" },
  });
  check(courses, { "course catalog returns 200": (response) => response.status === 200 });
  unexpectedServerErrors.add(courses.status >= 500);
  sleep(Number(__ENV.K6_SLEEP_SECONDS || 1));
}

function metric(summary, name, key) {
  return summary.metrics[name] && summary.metrics[name].values[key] !== undefined
    ? summary.metrics[name].values[key]
    : null;
}

export function handleSummary(data) {
  const result = {
    profile,
    base_url: baseUrl,
    checks_rate: metric(data, "checks", "rate"),
    failed_request_rate: metric(data, "http_req_failed", "rate"),
    response_time_ms: {
      average: metric(data, "http_req_duration", "avg"),
      p90: metric(data, "http_req_duration", "p(90)"),
      p95: metric(data, "http_req_duration", "p(95)"),
    },
    requests: metric(data, "http_reqs", "count"),
    requests_per_second: metric(data, "http_reqs", "rate"),
    thresholds: Object.fromEntries(
      Object.entries(data.metrics)
        .filter(([, value]) => value.thresholds)
        .map(([name, value]) => [name, value.thresholds])
    ),
  };
  const escaped = JSON.stringify(result, null, 2).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>CareerVue k6 ${profile}</title>
  <style>body{font:16px system-ui;max-width:960px;margin:40px auto;background:#0b1020;color:#e5e7eb}pre{padding:24px;background:#151d33;border-radius:12px;overflow:auto}h1{color:#a5b4fc}</style></head>
  <body><h1>CareerVue performance report: ${profile}</h1><pre>${escaped}</pre></body></html>`;
  return {
    "artifacts/performance/performance-summary.json": JSON.stringify(result, null, 2),
    "artifacts/performance/performance-report.html": html,
    stdout: JSON.stringify(result, null, 2),
  };
}

