import { NextResponse } from 'next/server';

/**
 * POST /api/nearby — Proxy to MetaEngine Nearby Finder Space.
 * GET  /api/nearby — Health check for the Nearby Finder Space.
 *
 * Same pattern as /api/scan — backend proxies to a separate HF Space,
 * keeping the architecture modular (each service = separate Space).
 */

const NEARBY_URL =
  process.env.NEARBY_URL || 'https://ruslanmv-metaengine-nearby.hf.space';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const response = await fetch(`${NEARBY_URL}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('[Nearby Proxy]', error?.message);
    return NextResponse.json(
      { error: 'Nearby finder unavailable', count: 0, results: [] },
      { status: 502 },
    );
  }
}

export async function GET() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${NEARBY_URL}/api/health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) return NextResponse.json(await res.json());
    return NextResponse.json({ status: 'unavailable' }, { status: 503 });
  } catch {
    return NextResponse.json({ status: 'sleeping' }, { status: 503 });
  }
}
