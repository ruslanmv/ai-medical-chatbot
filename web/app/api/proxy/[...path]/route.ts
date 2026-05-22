import { NextRequest, NextResponse } from 'next/server';

/**
 * Thin proxy: forwards /api/proxy/* on Vercel to the HF Space backend.
 *
 * Why a proxy instead of direct CORS calls?
 *   - Same-origin from the browser's perspective (no preflight per call).
 *   - The auth token lives in an httpOnly cookie — the browser cannot
 *     read it from JS, and the proxy injects it into the outbound
 *     Authorization header.
 *   - Zero secrets on Vercel — the proxy just forwards.
 *   - Clean URL separation: /api/proxy/auth/login → HF /api/auth/login.
 *
 * Body handling: the request body is read in full (as an ArrayBuffer)
 * before being forwarded. We used to stream req.body straight through
 * with `duplex: 'half'`, but that path is unreliable on Vercel's Node
 * runtime — POST bodies occasionally arrive empty at the upstream,
 * which surfaces to the user as a generic "Backend unavailable" with
 * no clue what actually broke. Request bodies on this app are small
 * JSON payloads (login, chat prompt, vitals), so buffering them is
 * cheap and correct.
 *
 * Response handling: still streamed end-to-end so SSE on /api/chat
 * preserves real-time tokens.
 *
 * Cold-start handling: HF Spaces sleep after inactivity. The first
 * request after a sleep can take 20-40s to wake the container. We set
 * a 50s AbortController timeout (vercel.json caps the function at 60s),
 * and surface a distinct 504 + "Backend is waking up — please retry"
 * so the UI can show a friendlier message than a generic failure.
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://ruslanmv-medibot.hf.space';

const TIMEOUT_MS = 50_000;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handler(
  req: NextRequest,
  { params }: { params: { path: string[] } },
): Promise<Response> {
  const path = params.path.join('/');
  const url = new URL(req.url);
  const targetUrl = `${BACKEND_URL}/api/${path}${url.search}`;

  // ---- Outbound headers ----
  const headers = new Headers();
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);

  // Auth token: prefer the httpOnly cookie set on login; fall back to
  // an explicit Authorization header (useful for direct API callers
  // and the auth/me probe which doesn't have the cookie on first load).
  const cookieToken = req.cookies.get('medos_token')?.value;
  const explicitAuth = req.headers.get('authorization');
  if (cookieToken) {
    headers.set('Authorization', `Bearer ${cookieToken}`);
  } else if (explicitAuth) {
    headers.set('Authorization', explicitAuth);
  }

  // Forward the originating IP so the backend's audit log + rate limiter
  // see the real user, not Vercel's edge IP.
  const fwd =
    req.headers.get('x-forwarded-for') ||
    req.headers.get('x-real-ip') ||
    '';
  if (fwd) headers.set('X-Forwarded-For', fwd);

  // ---- Body: buffer in full (small JSON payloads only on this app) ----
  let body: BodyInit | undefined = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      const buf = await req.arrayBuffer();
      if (buf.byteLength > 0) body = buf;
    } catch {
      // If the body can't be read, forward without one — the upstream
      // will reject with a clean 400 rather than hanging here.
      body = undefined;
    }
  }

  // ---- Fetch with timeout ----
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      signal: controller.signal,
      // Cache-bypass: this is a proxy, never a cache.
      cache: 'no-store',
    });

    // Pipe response headers through, dropping hop-by-hop ones.
    const responseHeaders = new Headers();
    res.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (
        k !== 'transfer-encoding' &&
        k !== 'connection' &&
        k !== 'keep-alive' &&
        k !== 'content-encoding' &&
        k !== 'content-length'
      ) {
        responseHeaders.set(key, value);
      }
    });
    responseHeaders.set('Cache-Control', 'no-store');

    return new Response(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    const aborted = error?.name === 'AbortError';
    // Distinguish cold-start timeout from a hard "can't reach backend"
    // failure so the UI can guide the user to retry.
    const status = aborted ? 504 : 502;
    const message = aborted
      ? 'Backend is waking up. Please try again in a few seconds.'
      : 'Backend unreachable. The Hugging Face Space may be sleeping or down.';

    console.error(
      `[Proxy] ${req.method} ${targetUrl} → ${status}: ${error?.message || error}`,
    );

    return NextResponse.json(
      {
        error: message,
        code: aborted ? 'backend_cold_start' : 'backend_unreachable',
        backend: BACKEND_URL,
      },
      { status, headers: { 'Cache-Control': 'no-store' } },
    );
  } finally {
    clearTimeout(timer);
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
