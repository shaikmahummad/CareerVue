# CareerVue stabilization audit

Audit date: 2026-10-05

## Architecture and source of truth

- Web: Next.js 16 client, Supabase browser session, FastAPI JSON API.
- Mobile: Expo/React Native client, Supabase session in SecureStore, the same FastAPI JSON API.
- Backend: FastAPI, Supabase Auth, PostgreSQL through SQLAlchemy/Alembic.
- Web and mobile configuration resolve to the same API URL and Supabase project.
- Quiz questions, scoring, attempts, progress, courses, and profiles are backend-owned. Clients do not contain quiz answers or scoring logic.

## Feature inventory

| Feature | Web | Mobile | Backend/database | Result |
|---|---|---|---|---|
| Registration | Backend contract used | Backend contract used | Pending registration plus hashed OTP; profile created only after verification | Automated registration tests pass |
| Email verification | OTP entry/resend | OTP entry/resend | Provider confirmation is authoritative; `profiles.email_verified` is reconciled | Automated valid/invalid/expired/reused OTP tests pass |
| Login after verification | Session installed in Supabase client | Session installed in Supabase client | Login no longer issues tokens or sends email; verified state is never reset | Regression tests pass; live mailbox flow remains unexecuted |
| Invalid/unverified/disabled login | Structured messages | Structured messages | 401/403 codes are distinct; no login-triggered email | Regression tests pass |
| Logout | Supabase sign-out | Supabase sign-out | Provider session lifecycle | Build/type validation pass; live account test remains |
| Session persistence/refresh | Cookie session plus one refresh-and-retry | SecureStore plus one refresh-and-retry | Supabase validates each API token | Build/type validation pass |
| Student profile | Read/update screens | Read/update screens | Shared profile/student records | Contract audited; live account test remains |
| Tutor profile/courses/analytics | Shared API | Shared API | Fixed profile-ID/tutor-ID relationship errors | New relationship tests pass |
| Dashboard | API errors are visible | API errors are visible | Stats/enrollment/roadmap endpoints registered | Build/type validation pass |
| Quiz career list | Loaded from backend | Loaded from backend | 11 active seeded careers | Database count verified |
| Quiz questions | Server-issued safe payload | Server-issued safe payload | 189 reviewed questions, no correct answers before submit | Question-bank and routing tests pass |
| Quiz interaction | Select, previous/next, review, timer, submit | Select, previous/next, explicit complete submit | Server validates exact question set | Build/type validation and security tests pass |
| Quiz refresh/app reopen | Per-user unexpired draft restore | Per-user unexpired draft restore | Attempt ownership/expiry remain server-authoritative | Build/type validation pass |
| Quiz scoring/results | Results and review | Results and review | Atomic server scoring and skill-profile update | Concurrency/security tests pass |
| Quiz history | Failures shown separately from empty history | Retryable error state | Owned submitted attempts only | Backend tests and client validation pass |
| Duplicate quiz submission | Error surfaced | Retryable submission state | Row lock plus 409 duplicate rejection | Concurrency tests pass |
| Roadmaps | Read/generate/update | Read/generate/update | Owned roadmap records | Backend catalog/roadmap tests pass |
| Courses/search | Public catalog/detail | Public catalog/detail | Shared catalog API | Deployed routes return 200; production currently has 0 courses |
| Enrollment/progress/completion | Implemented | Implemented | Ownership checks, idempotent certificate/XP | Completion tests pass |
| Admin users/courses/analytics | Implemented | Implemented | Role guards and shared records | Build/type validation pass; no live admin identity available |
| Payments | Implemented | Implemented | Razorpay signature verification and configuration guard | Payment configuration tests pass; no live transaction performed |
| File uploads | URL fields only | Video upload implemented | Supabase Storage | Not live-tested; bucket policies/account unavailable |
| Notifications | No complete notification inbox UI | Notification button is not wired to inbox data | Notification CRUD routes exist | Remaining product integration issue |
| Settings/preferences | Several controls are local-only placeholders | Several controls are local-only placeholders | No preferences model/API exists | Remaining product integration issue |
| Google sign-in | Button has no OAuth handler | Not exposed | No completed OAuth flow | Remaining product integration issue |

## Production data audit

- Alembic revision: `f9c0d1e2f3a4` (repository head).
- Profiles/auth users/students/tutors: 0.
- Duplicate normalized email groups: 0.
- Auth/profile verification mismatches: 0.
- Active career roles: 11.
- Quiz questions: 189.
- Career-skill links: 132.
- Quiz templates: 7; attempts: 0.
- Courses/enrollments/roadmaps: 0.
- Ten orphan verification-token rows exist, but none are unused and unexpired. They are data-hygiene residue, not usable credentials.

## Verification performed

- Backend: 89 tests passed, 94 subtests passed after the final changes; four PostgreSQL integration tests require a dedicated resettable test database.
- Web: ESLint passed and the Next.js production build generated all 29 routes.
- Mobile: TypeScript passed and Expo Doctor passed all 21 checks.
- Deployed API: health and public course/tutor routes returned HTTP 200.
- Direct read-only Supabase audit verified migration and aggregate data state without printing user records or secrets.

## Remaining verification and deployment boundaries

1. The fixes in this worktree are not active on the deployed API until released. The currently deployed API exposes `/docs` and returns 403 rather than the fixed structured 401 for an unauthenticated quiz request.
2. A real register/OTP/login/logout/re-login cross-device run needs a controlled mailbox and test user. Production currently has no users, so no existing identity can be used.
3. The four true PostgreSQL concurrency/integration tests were not run because `QUIZ_TEST_DATABASE_URL` and explicit reset permission are not configured. Unit-level transaction/concurrency simulations pass.
4. No iOS/Android simulator or physical device was attached. Mobile validation consists of TypeScript, Expo diagnostics, shared API contract review, and backend tests.
5. Google OAuth, persisted settings/preferences, and a complete notifications inbox require product/API work beyond the currently implemented backend model and are not represented as working.
