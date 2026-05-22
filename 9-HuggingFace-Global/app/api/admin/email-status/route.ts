import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { emailTransportName } from '@/lib/email';

/**
 * GET /api/admin/email-status — which email transport is currently active.
 *
 * Returns one of:
 *   { transport: "resend"  }  — RESEND_API_KEY is set; uses Resend HTTP API.
 *   { transport: "smtp"    }  — SMTP_HOST/USER/PASS are set; uses nodemailer.
 *   { transport: "console" }  — nothing configured; emails are logged to stdout
 *                                and NEVER reach a real inbox. This is the
 *                                state that produces the "Account created!
 *                                Check your email" UX with no email ever
 *                                arriving.
 *
 * Restricted to authenticated admins — the response itself isn't sensitive
 * but there's no reason for unauthenticated callers to probe it.
 */
export async function GET(req: Request) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return NextResponse.json({
    transport: emailTransportName(),
    from: process.env.FROM_EMAIL || '(default: MedOS <onboarding@resend.dev>)',
    appUrl: process.env.APP_URL || '(default: https://ruslanmv-medibot.hf.space)',
  });
}
