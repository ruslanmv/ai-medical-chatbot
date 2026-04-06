/**
 * MedOS email service — SMTP via nodemailer.
 *
 * Works with any SMTP provider: Gmail, SendGrid, AWS SES, Mailgun,
 * Resend, etc. Configure via environment variables.
 *
 * When SMTP is not configured, emails are logged to the console (dev mode).
 * This means auth works in development without any email setup — the
 * verification codes and reset tokens are visible in the server logs.
 */

import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || 'MedOS <noreply@medos.health>';
const APP_NAME = 'MedOS';
const APP_URL = process.env.APP_URL || 'https://ruslanmv-medibot.hf.space';

const isConfigured = !!(SMTP_HOST && SMTP_USER && SMTP_PASS);

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!transporter) {
    // Dev mode: log to console so developers can see verification codes.
    console.log(`\n[EMAIL] To: ${to}`);
    console.log(`[EMAIL] Subject: ${subject}`);
    console.log(`[EMAIL] Body (text): ${html.replace(/<[^>]+>/g, '')}\n`);
    return true;
  }

  try {
    await transporter.sendMail({ from: FROM_EMAIL, to, subject, html });
    return true;
  } catch (error: any) {
    console.error('[EMAIL ERROR]', error?.message);
    return false;
  }
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
  return sendEmail(
    to,
    `${APP_NAME} — reset your password`,
    wrap(`
      <h3 style="color:#0f172a;font-size:18px;margin:0 0 8px;">Reset your password</h3>
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Someone requested a password reset for your ${APP_NAME} account. Use this code to set a new password.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <div style="display:inline-block;padding:16px 32px;background:#f1f5f9;border-radius:12px;border:2px dashed #cbd5e1;">
          <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#0f172a;">${code}</span>
        </div>
      </div>
      <p style="color:#94a3b8;font-size:13px;text-align:center;margin:0;">
        This code expires in 1 hour. If you didn't request this, ignore this email.
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
