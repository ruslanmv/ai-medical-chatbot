import { NextResponse } from 'next/server';

/**
 * POST /api/nearby — Proxy to MetaEngine Nearby Finder.
 * GET  /api/nearby — Health check.
 *
 * Calls the Gradio API endpoint (2-step: submit → fetch result).
 * Handles sleeping Spaces, timeouts, and Overpass errors gracefully.
 */

const NEARBY_URL =
  process.env.NEARBY_URL || 'https://ruslanmv-metaengine-nearby.hf.space';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lat, lon, radius_m = 3000, entity_type = 'all', limit = 25 } = body;

    // Step 1: Submit to Gradio API
    const submitRes = await fetch(`${NEARBY_URL}/gradio_api/call/search_ui`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [String(lat), String(lon), radius_m, entity_type, limit],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!submitRes.ok) {
      const ct = submitRes.headers.get('content-type') || '';
      if (!ct.includes('json')) {
        return NextResponse.json(
          { error: 'Nearby finder is waking up. Please try again in a moment.', count: 0, results: [] },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: 'Search submission failed', count: 0, results: [] }, { status: 502 });
    }

    const { event_id } = await submitRes.json();
    if (!event_id) {
      return NextResponse.json({ error: 'No event ID received', count: 0, results: [] }, { status: 502 });
    }

    // Step 2: Fetch result via SSE
    const resultRes = await fetch(
      `${NEARBY_URL}/gradio_api/call/search_ui/${event_id}`,
      { signal: AbortSignal.timeout(30000) },
    );

    const text = await resultRes.text();

    // Parse SSE data line: "data: [summary, table, json_string]"
    const dataLine = text.split('\n').find((l: string) => l.startsWith('data: '));
    if (!dataLine) {
      return NextResponse.json({ error: 'Empty response from search', count: 0, results: [] });
    }

    const gradioData = JSON.parse(dataLine.slice(6));
    // gradioData = [summary_text, table_array, json_string]
    const jsonStr = gradioData?.[2];
    if (!jsonStr) {
      return NextResponse.json({ error: 'No results', count: 0, results: [] });
    }

    try {
      const parsed = JSON.parse(jsonStr);
      return NextResponse.json(parsed);
    } catch {
      // If the json_str is an error message, return it
      return NextResponse.json({ error: jsonStr, count: 0, results: [] });
    }
  } catch (error: any) {
    console.error('[Nearby Proxy]', error?.name, error?.message?.slice(0, 100));
    const msg =
      error?.name === 'TimeoutError' || error?.name === 'AbortError'
        ? 'Search timed out. The service may be starting up — please try again.'
        : 'Nearby finder unavailable. Please try again.';
    return NextResponse.json({ error: msg, count: 0, results: [] }, { status: 502 });
  }
}

export async function GET() {
  try {
    const res = await fetch(NEARBY_URL, { signal: AbortSignal.timeout(8000) });
    if (res.ok) return NextResponse.json({ status: 'ok' });
    return NextResponse.json({ status: 'waking' }, { status: 503 });
  } catch {
    return NextResponse.json({ status: 'sleeping' }, { status: 503 });
  }
}
