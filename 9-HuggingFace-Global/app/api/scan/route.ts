import { NextResponse } from 'next/server';

/**
 * POST /api/scan — Server-side proxy to the Medicine Scanner Space.
 *
 * Why proxy instead of calling from the browser:
 *   - HF_TOKEN_INFERENCE stays server-side (never in the JS bundle)
 *   - Same-origin request from the browser (no CORS preflight)
 *   - Backend injects the token and forwards to the Scanner Space
 *   - If the Scanner Space is sleeping, this request wakes it
 *
 * The Scanner Space receives:
 *   - The image as multipart/form-data (passthrough)
 *   - Authorization: Bearer header with the inference token
 *   - Returns structured JSON with medicine data
 */

const SCANNER_URL =
  process.env.SCANNER_URL || 'https://ruslanmv-medicine-scanner.hf.space';
const INFERENCE_TOKEN = process.env.HF_TOKEN_INFERENCE || '';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Read the incoming form data (image file from the frontend)
    const formData = await req.formData();

    // Build outbound headers — inject the inference token server-side
    const headers: Record<string, string> = {};
    if (INFERENCE_TOKEN) {
      headers['Authorization'] = `Bearer ${INFERENCE_TOKEN}`;
    }

    // Forward to the Medicine Scanner Space
    const response = await fetch(`${SCANNER_URL}/api/scan`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('[Scan Proxy]', error?.message);
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
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${SCANNER_URL}/api/health`, {
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
