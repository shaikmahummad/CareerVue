#!/bin/sh
set -eu

mkdir -p artifacts/appium/logs

APPIUM_HOST="${APPIUM_HOST:-127.0.0.1}"
APPIUM_PORT="${APPIUM_PORT:-4723}"
APPIUM_BASE_PATH="${APPIUM_BASE_PATH:-/}"
APPIUM_LOG="artifacts/appium/logs/appium-server.log"
APPIUM_STATUS_BODY="artifacts/appium/logs/appium-status.json"
APPIUM_SERVER_URL="http://${APPIUM_HOST}:${APPIUM_PORT}${APPIUM_BASE_PATH%/}"
APPIUM_STATUS_URL="${APPIUM_SERVER_URL}/status"
export APPIUM_SERVER_URL

appium_diagnostics() {
  echo "Appium diagnostics:" >&2
  echo "  command: $(command -v appium 2>/dev/null || echo missing)" >&2
  echo "  endpoint: ${APPIUM_STATUS_URL}" >&2
  if [ -n "${APPIUM_PID:-}" ]; then
    ps -p "${APPIUM_PID}" -o pid=,ppid=,stat=,etime=,cmd= 2>/dev/null || true
  fi
  if command -v ss >/dev/null 2>&1; then
    ss -ltnp 2>/dev/null | grep ":${APPIUM_PORT}" || true
  fi
  adb -s emulator-5554 get-state 2>/dev/null || true
  echo "Last 200 Appium log lines:" >&2
  tail -n 200 "${APPIUM_LOG}" 2>/dev/null || true
}

stop_appium() {
  if [ -n "${APPIUM_PID:-}" ] && kill -0 "${APPIUM_PID}" 2>/dev/null; then
    echo "Stopping Appium server PID ${APPIUM_PID}"
    kill "${APPIUM_PID}" 2>/dev/null || true
    wait "${APPIUM_PID}" 2>/dev/null || true
  fi
}

trap stop_appium EXIT

if ! timeout 30 adb -s emulator-5554 wait-for-device; then
  echo "Android emulator emulator-5554 was not reachable within 30 seconds" >&2
  appium_diagnostics
  exit 1
fi

# android-emulator-runner already performs the boot wait before invoking this script.
# Check that invariant once instead of repeating noisy getprop polling.
boot_completed="$(adb -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')"
if [ "${boot_completed}" != "1" ]; then
  echo "Android emulator emulator-5554 is reachable but not fully booted (sys.boot_completed=${boot_completed:-unset})" >&2
  appium_diagnostics
  exit 1
fi

adb -s emulator-5554 shell ls /data/local/tmp > /dev/null

echo "Starting Appium on ${APPIUM_SERVER_URL}"
appium \
  --address "${APPIUM_HOST}" \
  --port "${APPIUM_PORT}" \
  --base-path "${APPIUM_BASE_PATH}" \
  --session-override \
  --log-no-colors \
  > "${APPIUM_LOG}" 2>&1 &
APPIUM_PID=$!
echo "Appium PID: ${APPIUM_PID}"

attempt=1
while [ "$attempt" -le 45 ]; do
  if ! kill -0 "${APPIUM_PID}" 2>/dev/null; then
    echo "Appium process ${APPIUM_PID} exited before becoming ready" >&2
    appium_diagnostics
    exit 1
  fi

  if curl --fail --silent --show-error --max-time 2 \
      "${APPIUM_STATUS_URL}" > "${APPIUM_STATUS_BODY}" 2>/dev/null && \
      grep -Eq '"ready"[[:space:]]*:[[:space:]]*true' "${APPIUM_STATUS_BODY}"; then
    break
  fi

  if [ $((attempt % 5)) -eq 0 ]; then
    echo "Waiting for Appium readiness at ${APPIUM_STATUS_URL} (attempt ${attempt}/45)"
  fi
  sleep 2
  attempt=$((attempt + 1))
done

if [ "$attempt" -gt 45 ]; then
  echo "Appium server did not become ready within 90 seconds" >&2
  appium_diagnostics
  exit 1
fi

echo "Appium is ready at ${APPIUM_STATUS_URL}:"
cat "${APPIUM_STATUS_BODY}"

if ! kill -0 "${APPIUM_PID}" 2>/dev/null; then
  echo "Appium process ${APPIUM_PID} exited before pytest started" >&2
  appium_diagnostics
  exit 1
fi

set +e
python -m pytest tests/appium -v \
  --junitxml=artifacts/appium/junit-results.xml \
  --html=artifacts/appium/report.html \
  --self-contained-html
pytest_status=$?
set -e

if ! kill -0 "${APPIUM_PID}" 2>/dev/null; then
  echo "Appium process ${APPIUM_PID} exited while pytest was running" >&2
  appium_diagnostics
  exit 1
fi

if [ "${pytest_status}" -ne 0 ]; then
  echo "Appium tests failed with exit code ${pytest_status}" >&2
  appium_diagnostics
  exit "${pytest_status}"
fi
