# CareerVue SMTP email verification

CareerVue's backend owns signup verification tokens and sends a six-digit OTP
directly through SMTP. Registration uses Supabase's admin user-creation API so
Supabase does not send its built-in confirmation link. Supabase continues to own
passwords and sessions. Password reset remains on the existing Supabase recovery
flow.

## Required backend environment variables

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=careervue01.org@gmail.com
SMTP_PASSWORD=<gmail-app-password>
SMTP_FROM_EMAIL=careervue01.org@gmail.com
SMTP_FROM_NAME=CareerVue
SMTP_TIMEOUT_SECONDS=20
FRONTEND_URL=["http://localhost:3000","http://localhost:8081"]
```

Use port `465` for implicit TLS or port `587` for STARTTLS. The backend uses a
20-second connection/read timeout by default; override it with
`SMTP_TIMEOUT_SECONDS` only when required by the provider. Store real values in
the backend deployment secret store only. Never put them in `NEXT_PUBLIC_*`,
`EXPO_PUBLIC_*`, committed `.env` files, or client deployments.

For Resend, the values are normally:

```dotenv
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USERNAME=resend
SMTP_PASSWORD=re_...
SMTP_FROM_EMAIL=no-reply@your-verified-domain.example
SMTP_FROM_NAME=CareerVue
SMTP_TIMEOUT_SECONDS=20
FRONTEND_URL=["http://localhost:3000","http://localhost:8081"]
```

Verify the sending domain and its DKIM/SPF records with the SMTP provider before
testing delivery. Disable link tracking for authentication mail because link
rewriting can interfere with one-time tokens.

## Deploy

1. Add the SMTP variables to the backend's secret store.
2. Run `alembic upgrade head` from `backend`; `f8b9c0d1e2f3` adds the pending
   registration delivery state and safe error metadata. Do not run destructive
   SQL.
3. Deploy the backend and web client.
4. In Supabase Authentication settings, keep email/password sign-in enabled.
   CareerVue creates provider identities as unconfirmed, stores non-password
   registration data in `pending_registrations`, and activates the application
   profile only after the backend OTP verification succeeds. Supabase's
   confirmation template is not used for new CareerVue registrations.
   Unverified provider identities are provisional and are removed by expiry
   cleanup.

## Delivery diagnostics

Each request emits an `auth_event` log with `registration_id` and a phase:
`OTP_GENERATED`, `EMAIL_SEND_STARTED`, `EMAIL_ACCEPTED_BY_SMTP`,
`EMAIL_SEND_FAILED`, `OTP_VERIFICATION_FAILED`, `OTP_EXPIRED`, or
`REGISTRATION_COMPLETED`. `EMAIL_ACCEPTED_BY_SMTP` means the provider accepted
the message during SMTP `DATA`; it does not prove inbox delivery. Provider
logs, bounce events, SPF, DKIM, DMARC, sender verification, and spam/quarantine
status are still required for post-acceptance delivery.

## Smoke test

1. Register a new account and confirm one verification email arrives.
2. Confirm the email contains a six-digit OTP and no verification link.
3. Enter the OTP in the registration screen and confirm verification succeeds.
4. Confirm login is rejected before verification and succeeds afterward.
5. Confirm resend works after the 60-second cooldown and the previous OTP no
   longer works.
6. Confirm the existing forgot-password link still opens `/reset-password` and
   updates the password.
