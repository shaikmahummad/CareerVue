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
SMTP_USERNAME=CarrerVue
SMTP_PASSWORD=yxujavfdnciievhd
SMTP_FROM_EMAIL=careervue01.org@gmail.com
SMTP_FROM_NAME=careervue01.org@gmail.com
FRONTEND_URL=["http://localhost:3000","http://localhost:8081"]
```

Use port `465` for implicit TLS or port `587` for STARTTLS. Store real values in
the backend deployment secret store only. Never put them in `NEXT_PUBLIC_*`,
`EXPO_PUBLIC_*`, committed `.env` files, or client deployments.

For Resend, the values are normally:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USERNAME=resend
SMTP_PASSWORD=yxujavfdnciievhd
SMTP_FROM_EMAIL=careervue01.org@gmail.com
SMTP_FROM_NAME=careervue01.org@gmail.com
FRONTEND_URL=["http://localhost:3000","http://localhost:8081"]
```

Verify the sending domain and its DKIM/SPF records with the SMTP provider before
testing delivery. Disable link tracking for authentication mail because link
rewriting can interfere with one-time tokens.

## Deploy

1. Add the SMTP variables to the backend's secret store.
2. Run `alembic upgrade head` from `backend`; the new head is
   `f7a8b9c0d1e2`.
3. Deploy the backend and web client.
4. In Supabase Authentication settings, keep email/password sign-in enabled.
   CareerVue creates provider identities as unconfirmed, stores registration data
   in `pending_registrations`, and activates the application profile only after
   the backend OTP verification succeeds. Supabase's confirmation template is
   not used for new CareerVue registrations.

## Smoke test

1. Register a new account and confirm one verification email arrives.
2. Confirm the email contains a six-digit OTP and no verification link.
3. Enter the OTP in the registration screen and confirm verification succeeds.
4. Confirm login is rejected before verification and succeeds afterward.
5. Confirm resend works after the 60-second cooldown and the previous OTP no
   longer works.
6. Confirm the existing forgot-password link still opens `/reset-password` and
   updates the password.
