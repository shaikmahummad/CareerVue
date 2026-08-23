# Quiz hardening deployment

Production must not be the first database to receive revision
`c9d0e1f2a3b4`. Apply it to a disposable local PostgreSQL database and then to
staging before production.

## Environment classification

| Environment | Identified? | Safe to modify? | Reason |
| --- | --- | --- | --- |
| Local | No running service | No, until provisioned | Docker, `psql`, and local PostgreSQL binaries were unavailable during validation. |
| Test | Yes, configuration only | Yes | `docker-compose.test.yml` and CI use an isolated `careervue_quiz_test` database with disposable credentials. |
| Staging | No | No | No staging URL, project, CI environment, or deployment target is identified in the repository. |
| Production | Yes, deployment configuration | Never automatically | Fly declares `careervue-api` with `APP_ENV=production`; production credentials are not used by tests. |
| Remote Supabase | Yes | No | The checked local configuration points to Supabase but does not identify the project as staging; it is classified as unknown. |

The GitHub Actions workflow `.github/workflows/quiz-postgres-integration.yml`
runs the migration/data-preservation, cleanup-locking, rollback, and concurrent
submission tests against its own PostgreSQL 16 service. It does not use repository
or deployment secrets.

## Local PostgreSQL validation

The integration test resets the complete `public` schema. Its URL must point to
a dedicated database whose name contains `test`; it also requires an explicit
reset acknowledgement.

PowerShell:

```powershell
docker compose -f backend/docker-compose.test.yml up -d --wait
$env:QUIZ_TEST_DATABASE_URL = "postgresql+asyncpg://careervue_test:careervue_test@localhost:55432/careervue_quiz_test"
$env:CAREERVUE_ALLOW_TEST_DB_RESET = "1"
Set-Location backend
.\venv\Scripts\python.exe -m unittest tests.test_quiz_postgres_integration -v
```

The test creates the current schema, downgrades it to `b8c9d0e1f2a3`, inserts a
legacy quiz attempt, applies `c9d0e1f2a3b4`, verifies schema and data preservation,
and repeats the real PostgreSQL double-submission race five times.

Remove the disposable database afterward:

```powershell
docker compose -f backend/docker-compose.test.yml down
```

## Staging deployment

Follow `STAGING_PROVISIONING.md`. Use a staging-only database URL. Do not
substitute the production URL.

Revision `9f8e7d6c5b4a` is the explicit application-schema baseline. The PostgreSQL
integration test now proves upgrade from an empty database, downgrade to base,
and rebuild before exercising the legacy-data upgrade to `c9d0e1f2a3b4`.

```powershell
Set-Location backend
$env:ALEMBIC_DATABASE_URL = "<staging-postgresql-asyncpg-url>"
.\venv\Scripts\alembic.exe current
.\venv\Scripts\alembic.exe upgrade c9d0e1f2a3b4
.\venv\Scripts\alembic.exe current
.\venv\Scripts\python.exe seed_question_banks.py
```

For destructive migration/data-preservation tests, use a disposable clone of
staging whose database name contains `test`, then run the local integration test
above against that clone. Smoke-test registration, attempt start, submission,
history, skill results, and roadmap generation on staging.

The application also runs non-destructive abandoned-attempt cleanup periodically.
A platform cron may invoke a one-shot batch instead:

```powershell
Set-Location backend
.\venv\Scripts\python.exe cleanup_abandoned_quiz_attempts.py
```

For a centralized scheduler, set `QUIZ_CLEANUP_ENABLED=false` on every API
replica and run the one-shot command every 15 minutes from the platform scheduler.
The command remains safe if invocations overlap because batches use
`FOR UPDATE SKIP LOCKED`. Until a platform scheduler is configured, leave the
replica-safe loop enabled.

Quiz controls are configurable with:

- `QUIZ_ATTEMPT_START_LIMIT` (default `5` per window)
- `QUIZ_ATTEMPT_START_WINDOW_SECS` (default `600`)
- `QUIZ_MAX_ACTIVE_ATTEMPTS` (default `2`)
- `QUIZ_ABANDONED_GRACE_SECS` (default `3600`)
- `QUIZ_CLEANUP_INTERVAL_SECS` (default `900`)
- `QUIZ_CLEANUP_BATCH_SIZE` (default `500`)
- `QUIZ_CLEANUP_ENABLED` (default `true`)

## Production deployment

Only after staging migration and PostgreSQL concurrency validation pass:

```powershell
Set-Location backend
$env:ALEMBIC_DATABASE_URL = "<production-postgresql-asyncpg-url>"
.\venv\Scripts\alembic.exe current
.\venv\Scripts\alembic.exe upgrade c9d0e1f2a3b4
.\venv\Scripts\python.exe seed_question_banks.py
```

The normal Docker/Nixpacks entrypoint already runs `alembic upgrade head` before
starting the API. An explicit migration command is preferable for a controlled
production rollout so the result can be checked before new application instances
start.
