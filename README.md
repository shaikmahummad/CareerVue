# CareerVue

CareerVue is an npm/Turbo monorepo containing a Next.js 16 web application, an
Expo SDK 57 mobile application, a shared TypeScript API client, and a FastAPI
backend backed by PostgreSQL/Supabase.

## Local quality and build commands

Use Node.js from `.nvmrc` and Python 3.11.

```powershell
npm ci
npm run lint
npm run build --workspace=@careervue/web
python -m pip install -r backend/requirements.txt
python -m unittest discover -s backend/tests -v
```

The PostgreSQL integration tests require a disposable database whose name
contains `test`; see `backend/STAGING_PROVISIONING.md`. Never enable database
reset flags against staging or production.

## Selenium web tests

Install the test dependencies and start the web application in another shell.
Selenium Manager locates/downloads a compatible Chrome or Firefox driver.

```powershell
python -m pip install -r tests/requirements-ci.txt
npm run dev:web
$env:WEB_BASE_URL = "http://localhost:3000"
$env:E2E_BROWSER = "chrome"
npm run test:selenium
```

The required public suite covers landing navigation, login validation, password
recovery navigation, registration validation, and anonymous route protection.
Authenticated student and tutor journeys run when the `E2E_*` credentials are
provided. Set `E2E_REQUIRE_AUTH=true` to make missing credentials a failure.
Failure screenshots and JUnit/HTML output are written below
`artifacts/selenium`.

## Appium Android tests

Generate an APK, start an Android emulator and Appium 2 with the UiAutomator2
driver, then run:

```powershell
$env:ANDROID_APP_PATH = "C:\absolute\path\to\app-debug.apk"
$env:APPIUM_SERVER_URL = "http://127.0.0.1:4723"
npm run test:appium
```

The suite verifies launch, login validation, role selection, navigation, and
registration validation. It writes JUnit/HTML, screenshots, Appium logs, and
logcat output below `artifacts/appium`.

## k6 and ZAP

Only run load or security tests against an authorized staging environment.
The scripts explicitly reject the known production API hostname.

```powershell
$env:PERF_BASE_URL = "https://api.staging.example"
$env:K6_PROFILE = "smoke" # smoke, load, stress, or spike
docker run --rm -v "${PWD}:/work" -w /work -e PERF_BASE_URL -e K6_PROFILE grafana/k6:0.54.0 run tests/performance/careervue.js
```

The routine security workflow uses the pinned ZAP 2.16.1 container for passive
baseline scans. An active scan is intentionally not part of CI because it may
submit destructive requests.

## GitHub Actions configuration

`CareerVue CI/CD` runs on pull requests and pushes to `main`, `development`, or
`develop`. Pull requests run local public Selenium tests, the Android emulator
suite, backend regression, lint/type checks, and both builds. External staging
tests and deployments never run for untrusted pull requests.

Create GitHub Environments named `staging` and `production`. Configure branch
protection/reviewers on production. Repository or environment variables:

| Variable | Purpose |
|---|---|
| `STAGING_WEB_URL` | Deployed staging web origin |
| `STAGING_API_URL` | Deployed staging API origin |
| `STAGING_SUPABASE_URL` | Public staging Supabase project URL embedded in the mobile APK |
| `STAGING_SUPABASE_ANON_KEY` | Public staging Supabase anon key embedded in the mobile APK |
| `PRODUCTION_WEB_URL` | Expected production web origin |
| `RUN_STAGING_E2E` | `true` makes post-PR Selenium use staging and require credentials |
| `RUN_STAGING_SCANS` | `true` enables smoke k6 + passive ZAP on trusted pushes |
| `WEB_DEPLOY_ENABLED` | `true` enables guarded deployment jobs |
| `K6_P95_MS` | Normal-load P95 gate, default `500` |
| `K6_FAILURE_RATE` | HTTP failure-rate gate, default `0.01` |
| `ZAP_FAIL_ON` | `high`, `medium`, or `none`; default `high` |

Environment secrets:

| Secret | Environment | Purpose |
|---|---|---|
| `E2E_STUDENT_EMAIL`, `E2E_STUDENT_PASSWORD` | staging | Verified staging student |
| `E2E_TUTOR_EMAIL`, `E2E_TUTOR_PASSWORD` | staging | Verified staging tutor |
| `WEB_DEPLOY_HOOK_URL` | staging/production | Existing provider's protected deploy hook |
| `EXPO_TOKEN` | production (future) | Signed EAS build after an EAS project is linked |

Do not configure `WEB_DEPLOY_ENABLED` until the actual web provider, hostname,
deploy hook, and rollback method are reviewed. The repository currently has
Fly/Railway configuration for the backend but no web host. It also has no EAS
project ID, so CI produces an unsigned debug APK for Appium; signed release
builds remain an explicit release blocker.

Every job uploads its report even on failure. The report workflow downloads all
`*-reports` artifacts, creates `pipeline-summary.html/json`, and uploads the
complete `ci-reports.zip` bundle. See
[`docs/PRODUCT_DESIGN_DOCUMENT.md`](docs/PRODUCT_DESIGN_DOCUMENT.md) for the
architecture and acceptance criteria.

