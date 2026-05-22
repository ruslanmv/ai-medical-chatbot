/**
 * MedOS email service.
 *
 * Backend selection (first one that has its env set wins):
 *
 *   1. Resend HTTP API   — when RESEND_API_KEY is set. Preferred on
 *                          serverless because it's just HTTPS to
 *                          api.resend.com (port 443 is never blocked)
 *                          and errors come back as actionable JSON.
 *   2. nodemailer SMTP   — when SMTP_HOST + SMTP_USER + SMTP_PASS are
 *                          all set. Works with any provider.
 *   3. Console fallback  — when nothing above is configured. Dumps the
 *                          email body to stdout so dev work doesn't
 *                          require any email setup at all. The
 *                          verification code is visible in the server
 *                          logs.
 *
 * Errors from the actual send (auth rejected, domain not verified,
 * rate-limited, network) are logged to stderr with a clear prefix so
 * they're greppable in container logs. The callers (register,
 * forgot-password) treat email as best-effort and never block the
 * user on it.
 */

import nodemailer from 'nodemailer';

const FROM_EMAIL = process.env.FROM_EMAIL || 'MedOS <onboarding@resend.dev>';
const APP_NAME = 'MedOS';
const APP_URL = process.env.APP_URL || 'https://ruslanmv-medibot.hf.space';

// ---------- Resend HTTP transport ----------

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_URL = 'https://api.resend.com/emails';

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(
        `[EMAIL Resend] ${res.status} ${res.statusText} → to=${to}: ${errBody.slice(0, 300)}`,
      );
      return false;
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    console.log(`[EMAIL Resend] ok id=${data.id ?? '?'} to=${to} subject="${subject}"`);
    return true;
  } catch (err: any) {
    console.error(`[EMAIL Resend] network error to=${to}: ${err?.message ?? err}`);
    return false;
  }
}

// ---------- SMTP transport (nodemailer) ----------

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const smtpConfigured = !!(SMTP_HOST && SMTP_USER && SMTP_PASS);

const smtpTransporter = smtpConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

async function sendViaSmtp(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  if (!smtpTransporter) return false;
  try {
    const info = await smtpTransporter.sendMail({ from: FROM_EMAIL, to, subject, html });
    console.log(`[EMAIL SMTP] ok messageId=${info.messageId} to=${to} subject="${subject}"`);
    return true;
  } catch (err: any) {
    console.error(`[EMAIL SMTP] failed to=${to}: ${err?.message ?? err}`);
    return false;
  }
}

// ---------- Console fallback (dev only) ----------

function logToConsole(to: string, subject: string, html: string): boolean {
  console.log(
    `\n[EMAIL stdout-fallback] No RESEND_API_KEY or SMTP_* configured. Set one to actually send mail.`,
  );
  console.log(`[EMAIL] To: ${to}`);
  console.log(`[EMAIL] Subject: ${subject}`);
  console.log(`[EMAIL] Body (text): ${html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()}\n`);
  return true;
}

// ---------- Dispatcher ----------

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (RESEND_API_KEY) return sendViaResend(to, subject, html);
  if (smtpConfigured) return sendViaSmtp(to, subject, html);
  return logToConsole(to, subject, html);
}

/**
 * Which transport is active. Logged at boot from app/api/auth/register
 * so operators can confirm the wiring from a single container-log line
 * instead of having to guess from absent email deliveries.
 */
export function emailTransportName(): 'resend' | 'smtp' | 'console' {
  if (RESEND_API_KEY) return 'resend';
  if (smtpConfigured) return 'smtp';
  return 'console';
}

// ============================================================
// Email templates — clean, mobile-friendly, brand-consistent
// ============================================================

function wrap(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f7f9fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:40px auto;padding:32px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#3b82f6,#14b8a6);line-height:48px;font-size:24px;color:white;">♥</div>
      <h2 style="margin:12px 0 0;color:#0f172a;font-size:20px;">${APP_NAME}</h2>
    </div>
    ${content}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
    <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
      This email was sent by ${APP_NAME}. If you didn't request this, you can safely ignore it.
    </p>
  </div>
</body>
</html>`;
}

// ============================================================
// Public API
// ============================================================

export async function sendVerificationEmail(
  to: string,
  code: string,
): Promise<boolean> {
  return sendEmail(
    to,
    `${APP_NAME} — verify your email`,
    wrap(`
      <h3 style="color:#0f172a;font-size:18px;margin:0 0 8px;">Verify your email</h3>
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Enter this code in the app to verify your email address and secure your account.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <div style="display:inline-block;padding:16px 32px;background:#f1f5f9;border-radius:12px;border:2px dashed #cbd5e1;">
          <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#0f172a;">${code}</span>
        </div>
      </div>
      <p style="color:#94a3b8;font-size:13px;text-align:center;margin:0;">
        This code expires in 15 minutes.
      </p>
    `),
  );
}

export async function sendPasswordResetEmail(
  to: string,
  code: string,
): Promise<boolean> {
  // One-click reset link — the frontend (both Vercel and HF) parses
  // ?action=reset&email=…&code=… on mount and drops the user straight
  // into the "set new password" step with everything pre-filled.
  // The 6-digit code is still shown so users who can't click (some
  // mail clients strip query strings) can paste it manually.
  const linkUrl =
    `${APP_URL}?action=reset` +
    `&email=${encodeURIComponent(to)}` +
    `&code=${encodeURIComponent(code)}`;

  return sendEmail(
    to,
    `${APP_NAME} — reset your password`,
    wrap(`
      <h3 style="color:#0f172a;font-size:18px;margin:0 0 8px;">Reset your password</h3>
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Someone requested a password reset for your ${APP_NAME} account. Click the button below to set a new password, or enter the 6-digit code in the app.
      </p>
      <div style="text-align:center;margin:20px 0;">
        <a href="${linkUrl}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#3b82f6,#14b8a6);color:white;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">
          Reset password
        </a>
      </div>
      <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0 0 16px;">
        Or enter this code manually:
      </p>
      <div style="text-align:center;margin:8px 0 24px;">
        <div style="display:inline-block;padding:16px 32px;background:#f1f5f9;border-radius:12px;border:2px dashed #cbd5e1;">
          <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#0f172a;">${code}</span>
        </div>
      </div>
      <p style="color:#94a3b8;font-size:13px;text-align:center;margin:0;">
        This code expires in 1 hour. If you didn't request this, ignore this email — your password will stay the same.
      </p>
    `),
  );
}

export async function sendWelcomeEmail(to: string): Promise<boolean> {
  return sendEmail(
    to,
    `Welcome to ${APP_NAME}`,
    wrap(`
      <h3 style="color:#0f172a;font-size:18px;margin:0 0 8px;">Welcome to ${APP_NAME}</h3>
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px;">
        Your account is ready. You can now track medications, appointments, vitals,
        and access your health data from any device.
      </p>
      <div style="text-align:center;margin:20px 0;">
        <a href="${APP_URL}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#3b82f6,#14b8a6);color:white;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">
          Open ${APP_NAME}
        </a>
      </div>
      <p style="color:#94a3b8;font-size:13px;text-align:center;margin:0;">
        Free forever. Private. No ads.
      </p>
    `),
  );
}
