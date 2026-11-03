#!/bin/sh
set -eu

mkdir -p artifacts/appium/logs

adb -s emulator-5554 wait-for-device

attempt=1
while [ "$attempt" -le 30 ]; do
  if [ "$(adb -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; then
    break
  fi
  sleep 2
  attempt=$((attempt + 1))
done

if [ "$attempt" -gt 30 ]; then
  echo "Android emulator emulator-5554 did not boot within 60 seconds" >&2
  exit 1
fi

adb -s emulator-5554 shell ls /data/local/tmp > /dev/null
appium --log artifacts/appium/logs/appium-server.log > /dev/null 2>&1 &

attempt=1
while [ "$attempt" -le 30 ]; do
  if curl --silent --show-error http://127.0.0.1:4723/status | grep -q ready; then
    break
  fi
  sleep 2
  attempt=$((attempt + 1))
done

if [ "$attempt" -gt 30 ]; then
  echo "Appium server did not become ready within 60 seconds" >&2
  exit 1
fi

python -m pytest tests/appium -v \
  --junitxml=artifacts/appium/junit-results.xml \
  --html=artifacts/appium/report.html \
  --self-contained-html
