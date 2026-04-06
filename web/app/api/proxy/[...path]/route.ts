import { NextRequest, NextResponse } from 'next/server';

/**
 * Thin proxy: forwards all /api/proxy/* requests to the HF Space backend.
 *
 * Why a proxy instead of direct CORS calls?
 *   - Same-origin from the browser's perspective (no preflight on every call).
 *   - The auth token lives in an httpOnly cookie — the browser can't read it
 *     via JS, and the proxy injects it into the outbound Authorization header.
 *   - Zero secrets on Vercel — the proxy just forwards.
 *   - Clean URL separation: /api/proxy/chat → HF Space /api/chat.
 *
 * Streaming is preserved end-to-end: the proxy pipes the HF response body
 * directly to the client without buffering.
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://ruslanmv-medibot.hf.space';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handler(
  req: NextRequest,
  { params }: { params: { path: string[] } },
): Promise<Response> {
  const path = params.path.join('/');
  const targetUrl = `${BACKEND_URL}/api/${path}`;

  // Forward query string if any.
  const url = new URL(req.url);
  const qs = url.search;

  // Build outbound headers — forward content-type and auth.
  const headers = new Headers();
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);

  // Inject auth token from cookie (httpOnly, set by useAuth on login).
  const token = req.cookies.get('medos_token')?.value;
  if (token) headers.set('Authorization', `Bearer ${token}`);

  // Also forward any explicit Authorization header (for direct API callers).
  const explicitAuth = req.headers.get('authorization');
  if (explicitAuth && !token) headers.set('Authorization', explicitAuth);

  try {
    const res = await fetch(`${targetUrl}${qs}`, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      // @ts-expect-error — Next.js fetch supports duplex: 'half' for streaming request bodies.
      duplex: 'half',
    });

    // Pipe the response directly — preserves SSE streaming for /api/chat.
    const responseHeaders = new Headers();
    res.headers.forEach((value, key) => {
      // Forward content-type and cache-control; skip hop-by-hop headers.
      if (
        !['transfer-encoding', 'connection', 'keep-alive'].includes(
          key.toLowerCase(),
        )
      ) {
        responseHeaders.set(key, value);
      }
    });

    return new Response(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error(`[Proxy] ${req.method} ${targetUrl}:`, error?.message);
    return NextResponse.json(
      { error: 'Backend unavailable' },
      { status: 502 },
    );
  }
}

// Support all HTTP methods.
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
