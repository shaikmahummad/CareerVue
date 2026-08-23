# Quiz hardening deployment

Production must not be the first database to receive revision
`c9d0e1f2a3b4`. Apply it to a disposable local PostgreSQL database and then to
staging before production.

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

Use a staging-only database URL. Do not substitute the production URL.

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
