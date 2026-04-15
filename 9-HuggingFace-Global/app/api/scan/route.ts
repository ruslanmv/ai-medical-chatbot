import { NextResponse } from 'next/server';
import { loadConfig } from '@/lib/server-config';
import { authenticateRequest } from '@/lib/auth-middleware';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { auditLog } from '@/lib/audit';
import { getDb, genId } from '@/lib/db';

/**
 * POST /api/scan — Server-side proxy to the Medicine Scanner Space.
 *
 * Why proxy instead of calling from the browser:
 *   - HF_TOKEN_INFERENCE stays server-side (never in the JS bundle)
 *   - Same-origin request from the browser (no CORS preflight)
 *   - Backend injects the token and forwards to the Scanner Space
 *   - If the Scanner Space is sleeping, this request wakes it
 *
 * Isolation & accounting (added in PNF10):
 *   - Authentication is REQUIRED by default. Operators can flip
 *     SCAN_REQUIRE_AUTH=false to keep the legacy open behaviour while
 *     migrating, but anonymous traffic is then capped at 5 scans/hour
 *     per IP.
 *   - Authenticated users get 30 scans/hour each (per-user key).
 *   - Every call writes one scan_log row (status, bytes, latency, model)
 *     so admins can detect abuse on the shared HF inference quota.
 *   - Authenticated calls also append an audit_log('scan') entry.
 *
 * The Scanner Space receives:
 *   - The image as multipart/form-data (passthrough)
 *   - Authorization: Bearer header with the inference token
 *   - Returns structured JSON with medicine data
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function logScan(
  userId: string | null,
  ip: string | null,
  status: number,
  bytes: number,
  latencyMs: number,
  model: string | null,
): void {
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO scan_log (id, user_id, ip, status, bytes, latency_ms, model)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(genId(), userId, ip, status, bytes, latencyMs, model);
  } catch (e: any) {
    console.error('[Scan] log failed:', e?.message);
  }
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const ip = getClientIp(req);
  const user = authenticateRequest(req);

  // Auth gate. Default-on; opt-out via SCAN_REQUIRE_AUTH=false for migration.
  const authRequired = (process.env.SCAN_REQUIRE_AUTH || 'true') !== 'false';
  if (authRequired && !user) {
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication required to scan medicines.',
        medicine: null,
      },
      { status: 401 },
    );
  }

  // Per-identity quota. Authenticated users are tracked by id (stable across
  // IPs), anonymous fallback by IP (only reachable with SCAN_REQUIRE_AUTH=false).
  const limitKey = user ? `scan:user:${user.id}` : `scan:ip:${ip}`;
  const limitMax = user ? 30 : 5;
  const limit = checkRateLimit(limitKey, limitMax, 60 * 60 * 1000);
  if (!limit.allowed) {
    logScan(user?.id || null, ip, 429, 0, Date.now() - startedAt, null);
    return NextResponse.json(
      {
        success: false,
        error: 'Scan quota exceeded. Try again later.',
        retryAfterMs: limit.retryAfterMs,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) },
      },
    );
  }

  // Resolve provider config (env at boot, admin overrides via /data/medos-config.json).
  const cfg = loadConfig();
  const token = cfg.llm.hfTokenInference;
  const scannerUrl = cfg.llm.scannerUrl;

  if (!token) {
    console.error('[Scan] HF_TOKEN_INFERENCE is not configured');
    logScan(user?.id || null, ip, 503, 0, Date.now() - startedAt, null);
    return NextResponse.json(
      {
        success: false,
        error:
          'Medicine scanner is not configured. Ask the administrator to set HF_TOKEN_INFERENCE.',
        medicine: null,
      },
      { status: 503 },
    );
  }

  try {
    // Read the incoming form data (image file from the frontend).
    const formData = await req.formData();

    // Best-effort byte accounting for usage reporting.
    let bytes = 0;
    for (const [, v] of formData.entries()) {
      if (v instanceof Blob) bytes += v.size;
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    // Forward to the Medicine Scanner Space.
    const response = await fetch(`${scannerUrl}/api/scan`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json().catch(() => ({} as any));
    const latency = Date.now() - startedAt;

    logScan(
      user?.id || null,
      ip,
      response.status,
      bytes,
      latency,
      (data as any)?.model || null,
    );

    if (user) {
      auditLog({
        userId: user.id,
        action: 'scan',
        ip,
        meta: { status: response.status, bytes, latencyMs: latency },
      });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    const latency = Date.now() - startedAt;
    console.error('[Scan Proxy]', error?.message);
    logScan(user?.id || null, ip, 502, 0, latency, null);
    return NextResponse.json(
      {
        success: false,
        error: 'Medicine scanner unavailable. Please try again.',
        medicine: null,
      },
      { status: 502 },
    );
  }
}

/**
 * GET /api/scan/health — Check if the Scanner Space is awake.
 * Used by the frontend to show "waking up" status.
 */
export async function GET() {
  const cfg = loadConfig();
  const scannerUrl = cfg.llm.scannerUrl;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${scannerUrl}/api/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    return NextResponse.json({ status: 'unavailable' }, { status: 503 });
  } catch {
    return NextResponse.json({ status: 'sleeping' }, { status: 503 });
  }
}
