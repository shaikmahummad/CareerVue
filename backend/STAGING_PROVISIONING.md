# CareerVue staging provisioning runbook

## Current safety status

No staging resource has been provisioned from this workspace. `flyctl auth
whoami` reports that no access token is available, no Supabase or Railway CLI is
installed, and the repository contains no staging project identifier or staging
credentials.

The known Fly app `careervue-api` is explicitly production. The existing remote
Supabase project is unclassified. Both are prohibited targets for this runbook.

| Environment | Identified? | Safe to modify? | Reason |
| --- | --- | --- | --- |
| Development | Yes | Yes, locally | Local environment files are labelled development. |
| Test | Yes | Yes, disposable only | CI creates an isolated PostgreSQL 16 `careervue_quiz_test` database. |
| Staging | No | No, until provisioned and labelled | No project, database, credentials, or authenticated platform context exists. |
| Production | Yes | Never through this runbook | Fly app `careervue-api` declares `APP_ENV=production`. |
| Unknown Supabase | Yes | No | Nothing proves that the existing remote project is non-production staging. |

## Migration baseline

Revision `9f8e7d6c5b4a` creates the complete pre-`a1b2c3d4e5f6` application
schema. The PostgreSQL integration test starts from an empty `public` schema and
proves the full upgrade, downgrade-to-base, rebuild, legacy-data preservation,
rollback, and concurrent-submission behavior:

```powershell
Set-Location backend
$env:APP_ENV = "test"
$env:ALEMBIC_DATABASE_URL = "postgresql+asyncpg://<disposable-test-url>"
.\venv\Scripts\alembic.exe upgrade head
.\venv\Scripts\alembic.exe current
.\venv\Scripts\alembic.exe downgrade base
.\venv\Scripts\alembic.exe upgrade head
```

Do not replace this chain with ORM `create_all` and an Alembic stamp; that would
skip the committed migration history and its CI validation.

## Authorized operator provisioning steps

Perform these steps only after an operator is authenticated to the intended
organization and has confirmed in writing that every new target is staging.

1. In Supabase, create a new project named `careervue-staging`. Use a new database
   password and record its new project reference. Confirm that the reference is
   different from every development, production, and currently unknown project.
2. Label the project and billing metadata `STAGING`. Configure only staging web
   and mobile authentication redirect URLs. Keep production redirect URLs out.
3. Obtain the new project's direct or session-pooler PostgreSQL connection string,
   project URL, anon key, and service-role key. Convert the PostgreSQL scheme to
   `postgresql+asyncpg://` for the backend/Alembic setting and URL-encode the
   password.
4. Create a separate Fly app in the approved organization. The suggested name is
   `careervue-api-staging`; record the actual returned app identifier. Do not use
   or rename `careervue-api`.

```powershell
flyctl auth login
flyctl auth whoami
flyctl apps create careervue-api-staging --org <AUTHORIZED_ORG>
```

5. Put the variables from `.env.staging.example` into Fly's secret store. Generate
   a new JWT secret. Razorpay values may remain empty while payments are
   intentionally disabled. The service-role key, JWT secret, database password,
   and any future payment secret must never be exposed to web or mobile clients.

```powershell
flyctl secrets set --app <STAGING_APP_ID> `
  DATABASE_URL="<STAGING_DATABASE_URL>" `
  SUPABASE_URL="<STAGING_SUPABASE_URL>" `
  SUPABASE_ANON_KEY="<STAGING_ANON_KEY>" `
  SUPABASE_SERVICE_ROLE_KEY="<STAGING_SERVICE_ROLE_KEY>" `
  JWT_SECRET="<NEW_STAGING_JWT_SECRET>" `
  JWT_ALGORITHM="HS256" `
  APP_CORS_ORIGINS='["https://<STAGING_WEB_HOST>"]'
```

6. Migrate explicitly before starting the staging API. Confirm that
   `c9d0e1f2a3b4` is the reported head, then seed the reviewed question banks.

```powershell
Set-Location backend
$env:APP_ENV = "staging"
$env:ALEMBIC_DATABASE_URL = "<STAGING_DATABASE_URL>"
.\venv\Scripts\alembic.exe history
.\venv\Scripts\alembic.exe upgrade head
.\venv\Scripts\alembic.exe current
.\venv\Scripts\python.exe seed_question_banks.py
```

7. Deploy from the repository root with the staging-only Fly configuration. The
   `--app` argument must equal the newly returned staging identifier.

```powershell
flyctl deploy backend --config backend/fly.staging.toml `
  --dockerfile backend/Dockerfile --app <STAGING_APP_ID>
```

8. Configure the staging web deployment from `apps/web/.env.staging.example` and
   the staging Expo/EAS build profile from `apps/mobile/.env.staging.example`.
   Neither client may point to `https://careervue-api.welcos.in` or the unknown
   Supabase project. Public anon keys are client-visible by design; service-role,
   JWT, database, and payment secrets are backend-only.

No SMTP or Redis setting exists in the current application configuration. Add
separate staging credentials only if those services are introduced; do not invent
or reuse production credentials.

## Schema verification

After migration, run these read-only checks in Supabase's staging SQL editor or
with a PostgreSQL client connected only to the labelled staging project:

```sql
select version_num from alembic_version;

select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

select table_name, column_name, is_nullable, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('quiz_templates', 'quiz_attempts', 'quiz_questions')
order by table_name, ordinal_position;

select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('quiz_templates', 'quiz_attempts', 'quiz_questions')
order by tablename, indexname;

select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid)
from pg_constraint
where connamespace = 'public'::regnamespace
  and conrelid::regclass::text in
      ('quiz_templates', 'quiz_attempts', 'quiz_questions')
order by table_name, conname;
```

Expected Alembic head: `c9d0e1f2a3b4`. Verify the question-bank tables, v2
template fields, authoritative attempt question-set fields, lifecycle checks,
foreign keys, and cleanup indexes against the CI assertions in
`tests/test_quiz_postgres_integration.py`.

## Smoke tests

Use a unique staging-only test account. These commands intentionally require the
operator to supply the new staging URL and credentials rather than embedding
them in source control.

```powershell
$stagingApi = "https://<STAGING_API_HOST>"
$email = "staging-smoke-$(Get-Date -Format yyyyMMddHHmmss)@example.test"
$password = "<TEMPORARY_STRONG_STAGING_PASSWORD>"

Invoke-RestMethod "$stagingApi/health"

$registerBody = @{
  email = $email
  password = $password
  full_name = "Staging Smoke Test"
} | ConvertTo-Json
Invoke-RestMethod "$stagingApi/api/v1/auth/register/student" `
  -Method Post -ContentType "application/json" -Body $registerBody

$loginBody = @{ email = $email; password = $password } | ConvertTo-Json
$login = Invoke-RestMethod "$stagingApi/api/v1/auth/login" `
  -Method Post -ContentType "application/json" -Body $loginBody
$headers = @{ Authorization = "Bearer $($login.data.access_token)" }

Invoke-RestMethod "$stagingApi/api/v1/auth/me" -Headers $headers
$issued = Invoke-RestMethod `
  "$stagingApi/api/v1/quiz/attempt/start/<SEEDED_GOAL>" `
  -Method Post -Headers $headers
```

Submit exactly one A-D answer for every returned question using the issued
`attempt_id`, confirm result retrieval, then verify skill results and roadmap
generation. Run the PostgreSQL concurrency test against a disposable clone whose
database name contains `test`; never point its reset-enabled URL at staging:

```powershell
$env:APP_ENV = "test"
$env:QUIZ_TEST_DATABASE_URL = "postgresql+asyncpg://<DISPOSABLE_STAGING_CLONE_TEST_URL>"
$env:CAREERVUE_ALLOW_TEST_DB_RESET = "1"
$env:CAREERVUE_REQUIRE_POSTGRES_TESTS = "1"
Set-Location backend
.\venv\Scripts\python.exe -m unittest tests.test_quiz_postgres_integration -v
```

## Required completion record

Before staging is considered provisioned, record without secrets:

- Supabase staging project reference
- staging database name
- Fly staging app identifier and backend URL
- staging web URL and mobile build profile
- configured environment variable names
- Alembic current revision
- schema verification output summary
- registration, login, quiz, result, skill, and roadmap smoke-test results

Production remains blocked until this record exists and the staging checks pass.
