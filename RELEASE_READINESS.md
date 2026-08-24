# CareerVue final release gate

Last verified: 2026-08-25 (Asia/Calcutta)

## Verdict

**NO-GO for public production/store launch.** The repository is a green local
release candidate, but the operational release is not yet proven. Do not call
the application released until every P0 item below is closed and the final
commands all pass on the exact commit being deployed.

An internal web/mobile demonstration can proceed only after deploying that
commit to a named web environment and producing an EAS internal-distribution
build.

## Verified green

- Clean dependency reproduction: `npm ci` completed from `package-lock.json`.
- Monorepo quality gate: web ESLint, mobile TypeScript, and shared API-client
  TypeScript all pass through `npm run lint`.
- Web production build: Next.js 16.3.2 compiled, typechecked, and generated all
  28 pages, including `/forgot-password` and `/reset-password`.
- Mobile compatibility: Expo Doctor 1.20.3 passes 21/21 on Expo SDK 57.
- Android JavaScript release export: 2,301 modules bundled into a 6 MB Hermes
  bundle with 80 assets.
- Backend regression: 75 tests pass; four PostgreSQL integration cases skip
  locally because no disposable PostgreSQL test database is installed.
- Backend package integrity: `pip check` and Python bytecode compilation pass.
- Main-branch PostgreSQL CI for commit `0723cc5` passed on GitHub. This does not
  cover the uncommitted release-candidate changes.
- Staging database: connection passes, Alembic is at `d0e1f2a3b4c5`, all 25
  public tables are visible, normalized-email duplicates are zero, and the
  normalized-email unique index is present.
- Live API: `/health`, `/`, and the database-backed `/api/v1/courses/` endpoint
  return HTTP 200.
- Dependency audit: zero critical, four high, and eleven moderate findings.
  The remaining findings are in the supported Expo/Metro build toolchain; npm's
  suggested forced fix is an incompatible Expo 46 downgrade and must not be
  applied. See `DEPENDENCY_AUDIT.md`.

## P0 release blockers

1. **The release candidate is not committed, pushed, or green in CI.** Create a
   PR, require both `Frontend release gates` and `Quiz PostgreSQL integration`,
   merge only when both are green, and deploy the resulting immutable SHA.
2. **EAS is not configured.** The Expo login works as account `zorut0`, but
   `eas project:info` reports `EAS project not configured`. Link an existing
   project with `eas init --id <project-id> --non-interactive`, or explicitly
   authorize creation under `zorut0`. Then produce signed Android and iOS builds.
3. **No named production web deployment was discoverable.** Record the web
   hostname/provider, deploy the release SHA, and verify HTTPS, environment
   variables, server logs, and rollback procedure.
4. **Production migration revision is unknown.** Staging is current, but the
   production database's `alembic_version` was not accessible. Back up
   production, run the read-only revision/duplicate-email preflight, and only
   then execute `python -m alembic upgrade head`. Verify revision
   `d0e1f2a3b4c5` and the unique index afterward.
5. **Password recovery is not end-to-end verified.** Add the deployed web
   callback/reset URL and `careervue://reset-password` to Supabase's allowed
   redirect URLs. Request a real reset email, open it on web and one physical
   Android/iOS device, change the password, and prove old-password rejection plus
   new-password login.
6. **No signed-build physical-device smoke test exists.** Test student, tutor,
   and admin accounts on the exact signed build: registration/verification,
   login/logout, password reset, course browsing/enrollment/learning/completion,
   quiz start/submit/history, tutor course/module create-update-delete, admin
   approve/reject/deactivate, analytics, notifications, offline/error handling,
   and cold-start/deep-link behavior.
7. **Production catalog data needs approval.** The public API currently exposes
   approved courses titled `z` and `X` with placeholder descriptions. An owner
   must archive/reject placeholder records and approve the final catalog before
   launch.

## Exact final command gate

Run these on the immutable release commit with Node.js 22.13.1 and Python 3.11.
Any non-zero exit is an absolute NO-GO.

```powershell
node --version
npm ci
npm run lint
npm run build --workspace=@careervue/web
Set-Location apps/mobile
npx expo-doctor --verbose
npx expo export --platform android --output-dir dist-release-check --clear
Set-Location ../..
Set-Location backend
.\venv\Scripts\python.exe -m unittest discover -s tests -v
.\venv\Scripts\python.exe -m pip check
.\venv\Scripts\python.exe -m compileall -q app
.\venv\Scripts\python.exe inspect_staging_database.py
```

Required output:

- Node reports `v22.13.1` (or a later supported 22.x version).
- `npm ci`, lint, web build, export, `pip check`, and compileall exit 0.
- Expo Doctor reports `21/21 checks passed. No issues detected!`.
- Backend reports `Ran 75 tests` and `OK`; local skips are allowed only when the
  GitHub disposable-PostgreSQL workflow passes on the same release SHA.
- Staging reports revision `d0e1f2a3b4c5`, zero duplicate normalized emails,
  and `NORMALIZED_EMAIL_INDEX=PRESENT`.

## Post-deploy acceptance

After web/API deployment and signed mobile builds, repeat the database-backed
API probe and execute the physical-device smoke matrix. Watch API 5xx rate,
authentication failures, database connections, and mobile crashes for at least
30 minutes. Roll back immediately for any data corruption, auth bypass, repeated
5xx, crash loop, failed password recovery, or migration mismatch.

Store publication by the next day cannot be guaranteed: Apple/Google signing,
account agreements, and store review are external lead-time dependencies. A
signed internal-distribution build and a deployed web release are achievable
once the P0 configuration and verification items above are completed.
