import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth-middleware';
import { getUserSettings, upsertUserSettings } from '@/lib/user-settings';
import { auditLog } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { redact } from '@/lib/crypto';

/**
 * Per-user settings API.
 *
 *   GET  /api/user/settings  — returns this user's preferences + EHR profile.
 *                              The BYO Hugging Face token is NEVER returned
 *                              in plaintext; the response carries only a
 *                              redacted preview ('••••HiJ') and a
 *                              hasHfToken boolean. The decrypted token is
 *                              used in-process only by the LLM provider
 *                              chain (added in a follow-up batch).
 *
 *   PUT  /api/user/settings  — partial patch. Field semantics for `hfToken`:
 *                                omit       → leave token unchanged
 *                                ""        → clear stored token
 *                                "hf_xxx" → rotate to new value (encrypted)
 *
 * Every successful PUT writes an audit_log('settings_update') entry that
 * lists the changed field NAMES only — never values.
 */

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const user = authenticateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const s = getUserSettings(user.id);

  return NextResponse.json({
    settings: {
      language: s.language ?? null,
      country: s.country ?? null,
      units: s.units ?? null,
      defaultModel: s.defaultModel ?? null,
      theme: s.theme ?? null,
      ehr: s.ehr ?? {},
      hfTokenRedacted: s.hfToken ? redact(s.hfToken) : null,
      hasHfToken: !!s.hfToken,
    },
  });
}

const PutSchema = z.object({
  language: z.string().min(2).max(8).optional(),
  country: z.string().min(2).max(4).optional(),
  units: z.enum(['metric', 'imperial']).optional(),
  defaultModel: z.string().max(100).optional(),
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  // EHR is a free-form bag (the wizard owns its shape) but bounded.
  ehr: z.record(z.any()).optional(),
  // Empty string clears the token, undefined leaves it untouched.
  hfToken: z.string().max(200).optional(),
});

export async function PUT(req: Request) {
  const user = authenticateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let parsed;
  try {
    const body = await req.json();
    parsed = PutSchema.parse(body);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Reject pathological EHR payloads to keep row size sane.
  if (parsed.ehr && JSON.stringify(parsed.ehr).length > 32_000) {
    return NextResponse.json(
      { error: 'EHR payload too large (max 32 KB).' },
      { status: 413 },
    );
  }

  try {
    upsertUserSettings(user.id, parsed);
  } catch (error: any) {
    console.error('[User Settings PUT]', error?.message);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }

  auditLog({
    userId: user.id,
    action: 'settings_update',
    ip: getClientIp(req),
    meta: {
      fields: Object.keys(parsed),
      tokenRotated: parsed.hfToken !== undefined,
      ehrFieldsChanged: parsed.ehr ? Object.keys(parsed.ehr) : [],
    },
  });

  // Return the fresh, redacted view so the client can update its cache.
  const s = getUserSettings(user.id);
  return NextResponse.json({
    success: true,
    settings: {
      language: s.language ?? null,
      country: s.country ?? null,
      units: s.units ?? null,
      defaultModel: s.defaultModel ?? null,
      theme: s.theme ?? null,
      ehr: s.ehr ?? {},
      hfTokenRedacted: s.hfToken ? redact(s.hfToken) : null,
      hasHfToken: !!s.hfToken,
    },
  });
}
