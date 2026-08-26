# CareerVue SMTP email verification

CareerVue's backend owns signup verification tokens and sends verification mail
directly through SMTP. Supabase continues to own passwords and sessions. Password
reset remains on the existing Supabase recovery flow.

## Required backend environment variables

```dotenv
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=no-reply@example.com
SMTP_FROM_NAME=CareerVue
FRONTEND_URL=https://your-careervue-web-host.example
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
FRONTEND_URL=https://your-careervue-web-host.example
```

Verify the sending domain and its DKIM/SPF records with the SMTP provider before
testing delivery. Disable link tracking for authentication mail because link
rewriting can interfere with one-time tokens.

## Deploy

1. Add all seven variables to the backend's secret store.
2. Run `alembic upgrade head` from `backend`; the new head is
   `e1f2a3b4c5d6`.
3. Deploy the backend and web client.
4. In Supabase Authentication settings, keep email/password sign-in enabled.
   CareerVue creates identities as unconfirmed and confirms them through the
   backend verification endpoint, so Supabase's own confirmation template is not
   used for new CareerVue registrations.

## Smoke test

1. Register a new account and confirm one verification email arrives.
2. Confirm the email link opens
   `FRONTEND_URL/verify-email?token=...` and finishes successfully.
3. Confirm the same link fails when opened again.
4. Confirm login is rejected before verification and succeeds afterward.
5. Confirm resend works after the 60-second cooldown and the previous link no
   longer works.
6. Confirm the existing forgot-password link still opens `/reset-password` and
   updates the password.
