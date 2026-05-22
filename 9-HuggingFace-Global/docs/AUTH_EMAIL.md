# Auth email — verification & password reset

MedOS sends two transactional emails:

| Email | Trigger | Code expiry |
|---|---|---|
| Verify email | `POST /api/auth/register` (or `/resend-verification`) | 15 min |
| Reset password | `POST /api/auth/forgot-password` | 1 hour |

Both go through `lib/email.ts` (nodemailer). The code path is always
wired — what determines whether real email gets sent is whether SMTP
env vars are present.

## How it falls back when SMTP is not configured

If any of `SMTP_HOST`, `SMTP_USER`, or `SMTP_PASS` is missing,
`lib/email.ts` does **not** create a transporter. Instead it dumps the
email body to stdout:

```
[EMAIL] To: user@example.com
[EMAIL] Subject: MedOS — reset your password
[EMAIL] Body (text): Reset your password ... 482917 ...
```

The API still returns 200 with `"If that email is registered, a reset
code has been sent."` (this prevents email enumeration). That message
only means "we tried". The user receives nothing until you wire SMTP.

You can confirm whether emails are reaching anyone by streaming the
HF Space container logs and looking for `[EMAIL]` lines:

```bash
curl -N -H "Authorization: Bearer $HF_TOKEN" \
  "https://huggingface.co/api/spaces/<owner>/<space>/logs/run"
```

If you see `[EMAIL]` lines, SMTP is not configured. If you see no
auth-flow logs at all, the request never reached the backend.

## Wiring SMTP — recommended: Resend

Resend is purpose-built for transactional email, 3,000/month free, and
has straightforward SMTP credentials.

1. Sign up at [resend.com](https://resend.com).
2. Verify a sending domain. (Until you do, you can only send to your
   own verified address; once verified you can send to anyone.)
3. Create an API key in the Resend dashboard. It looks like `re_xxx…`.
4. On the **HF Space → Settings → Variables and secrets**, set:

   | Key | Type | Value |
   |---|---|---|
   | `SMTP_HOST` | secret | `smtp.resend.com` |
   | `SMTP_PORT` | variable | `465` |
   | `SMTP_USER` | secret | `resend` |
   | `SMTP_PASS` | secret | your `re_xxx…` API key |
   | `FROM_EMAIL` | variable | `MedOS <noreply@your-verified-domain>` |
   | `APP_URL` | variable | `https://ruslanmv-medibot.hf.space` (or your Vercel URL) |

5. Restart the Space so the new env loads.

That's it — no code changes.

`APP_URL` matters for the password-reset email: the email contains a
one-click link `${APP_URL}?action=reset&email=…&code=…` that drops the
user straight into the "set new password" step. If `APP_URL` is wrong
the email's code-paste path still works as a fallback.

## Alternatives

| Provider | `SMTP_HOST` | `SMTP_PORT` | `SMTP_USER` | `SMTP_PASS` | Free tier |
|---|---|---|---|---|---|
| Resend | `smtp.resend.com` | `465` | `resend` | API key (`re_…`) | 3,000/mo |
| SendGrid | `smtp.sendgrid.net` | `587` | `apikey` (literal) | API key (`SG.…`) | 100/day |
| Mailgun | `smtp.mailgun.org` | `587` | `postmaster@<domain>` | SMTP password | 100/day for 30 days, then paid |
| AWS SES | `email-smtp.<region>.amazonaws.com` | `587` | IAM SMTP user | IAM SMTP password | Free if from EC2, else paid |
| Gmail | `smtp.gmail.com` | `587` | Gmail address | App password (NOT account password) | Personal use only |

Any SMTP provider works — `lib/email.ts` doesn't hard-code Resend.

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
  today. If you start hitting the SMTP provider's quota or seeing
  abusive patterns in the audit log, that's the place to add one.
- The "user not found" branch returns the same success message as the
  "user found" branch — this is deliberate, to prevent email
  enumeration. Don't change this.
