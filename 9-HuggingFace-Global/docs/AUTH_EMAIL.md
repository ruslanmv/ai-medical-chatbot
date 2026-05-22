# Auth email — verification & password reset

MedOS sends two transactional emails:

| Email | Trigger | Code expiry |
|---|---|---|
| Verify email | `POST /api/auth/register` (or `/resend-verification`) | 15 min |
| Reset password | `POST /api/auth/forgot-password` | 1 hour |

Both go through `lib/email.ts`. The code path is always wired — what
determines whether real email gets sent is which **transport** is
configured.

## The three transports

`lib/email.ts` picks at runtime, first match wins:

| Order | Transport | When chosen | Notes |
|---|---|---|---|
| 1 | **Resend HTTP API** | `RESEND_API_KEY` is set | Recommended on HF Spaces / Vercel. Uses HTTPS to `api.resend.com`. |
| 2 | **SMTP (nodemailer)** | `SMTP_HOST` + `SMTP_USER` + `SMTP_PASS` all set | Works with any provider. |
| 3 | **Console fallback** | nothing above is set | Emails are logged to stdout. **They never reach a real inbox.** |

The console fallback is the state that produces "Account created!
Check your email" with no email ever arriving. The API returns 200/201
either way (this is deliberate to avoid email enumeration), so the
only signal is in the Space's container logs.

## Confirm which transport is active (one curl)

As an authenticated admin:

```bash
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://ruslanmv-medibot.hf.space/api/admin/email-status
# → {"transport":"resend","from":"...","appUrl":"..."}
# → {"transport":"smtp","from":"...","appUrl":"..."}
# → {"transport":"console","from":"...","appUrl":"..."}  ← nothing reaches inboxes
```

You can also stream the Space's container logs and grep:

```bash
curl -N -H "Authorization: Bearer $HF_TOKEN" \
  "https://huggingface.co/api/spaces/<owner>/<space>/logs/run" | grep -E '\[EMAIL|\[Register'
```

Every register / forgot-password / resend-verification call now prints
the transport name and the outcome:

```
[Register] queued verification email via transport=resend to=user@example.com
[EMAIL Resend] ok id=abc123 to=user@example.com subject="MedOS — verify your email"
```

If you see `transport=console`, no email has been sent.

## Wiring Resend (recommended)

1. Sign up at [resend.com](https://resend.com).
2. Create an API key in the dashboard.
3. (Optional) Verify a sending domain. Until you do, the `FROM_EMAIL`
   must use `onboarding@resend.dev` — Resend rejects other senders for
   unverified domains.
4. On the **HF Space → Settings → Variables and secrets**, set:

   | Key | Type | Value |
   |---|---|---|
   | `RESEND_API_KEY` | secret | your Resend API key |
   | `FROM_EMAIL` | variable | `MedOS <onboarding@resend.dev>` (or `noreply@your-verified-domain`) |
   | `APP_URL` | variable | `https://ruslanmv-medibot.hf.space` (or your Vercel URL) |

5. Restart the Space so the new env loads.
6. Hit `GET /api/admin/email-status` — it should return `{"transport":"resend",…}`.

`APP_URL` matters for the password-reset email: the email contains a
one-click link `${APP_URL}?action=reset&email=…&code=…` that drops the
user straight into the "set new password" step. If `APP_URL` is wrong
the email's code-paste path still works as a fallback.

## Wiring SMTP (alternate)

Only used if `RESEND_API_KEY` is **not** set. Pick a provider:

| Provider | `SMTP_HOST` | `SMTP_PORT` | `SMTP_USER` | `SMTP_PASS` | Free tier |
|---|---|---|---|---|---|
| Resend (SMTP gateway) | `smtp.resend.com` | `465` | `resend` | API key | 3,000/mo |
| SendGrid | `smtp.sendgrid.net` | `587` | `apikey` (literal) | API key | 100/day |
| Mailgun | `smtp.mailgun.org` | `587` | `postmaster@<domain>` | SMTP password | 100/day for 30 days |
| AWS SES | `email-smtp.<region>.amazonaws.com` | `587` | IAM SMTP user | IAM SMTP password | Free from EC2 |
| Gmail | `smtp.gmail.com` | `587` | Gmail address | App password (NOT account password) | Personal only |

Any SMTP provider works — `lib/email.ts` doesn't hard-code anyone.

## How the password-reset flow runs end-to-end

1. User clicks **Forgot password?** → enters email → POST `/api/auth/forgot-password`.
2. Backend looks up the user, generates a 6-digit code, stores it in
   `users.reset_token` with a 1-hour expiry, and calls
   `sendPasswordResetEmail(email, code)`.
3. Email arrives with two ways to act:
   - **Click the Reset password button** — opens `${APP_URL}?action=reset&email=…&code=…`.
     The frontend (`usePasswordResetLink` hook + MedOSApp) parses
     those params on mount, switches the LoginView to its `reset`
     step with email and code pre-filled, and strips the params from
     the URL so they don't sit in browser history.
   - **Paste the 6-digit code manually** — for mail clients that strip
     query strings or for users on a different device.
4. User sets a new password → POST `/api/auth/reset-password`.
5. Backend validates the code + expiry, bcrypts the new password,
   wipes all existing sessions for that user (security best practice),
   issues a new session token, returns it.
6. Frontend stores the token → user is logged in with the new password.

## Operational notes

- The reset code is stored as plaintext in `users.reset_token` today.
  Codes expire in 1h and are invalidated on use, so the window is
  small, but if you ever dump the DB while one is pending, treat it
  as exposed.
- There is no in-product rate limit on `/api/auth/forgot-password`
  today. If you start hitting the email provider's quota or seeing
  abusive patterns in the audit log, that's the place to add one.
- The "user not found" branch returns the same success message as the
  "user found" branch — this is deliberate, to prevent email
  enumeration. Don't change this.
- `register/route.ts` historically had `sendVerificationEmail(…).catch(() => {})`
  which swallowed every email error silently. That's been replaced
  with a `.then(ok => …)` that logs failures — if a Resend or SMTP
  call fails, you'll see `[Register] verification email FAILED to=…`
  in the container logs.
