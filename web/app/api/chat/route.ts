/**
 * /api/chat — thin streaming proxy to the HF Space backend.
 *
 * Vercel hosts the UI and CDN; the HuggingFace Space at
 * `huggingface.co/spaces/ruslanmv/MediBot` (URL: `ruslanmv-medibot.hf.space`)
 * owns the entire chat pipeline — RAG, intent classification, safety
 * pre/post checks, the provider fallback chain (Groq → OllaBridge →
 * HF Inference), the admin SQLite store, and the card-emitting system
 * prompt. We forward the request body verbatim and stream the SSE
 * response back, so the browser sees exactly what HF emits.
 *
 * Why a proxy instead of running the chat on Vercel:
 *   - HF is the source of truth for backend behaviour (per the latest
 *     architecture decision).
 *   - Vercel's serverless functions can't share the Space's persistent
 *     SQLite admin store, so admin config changes wouldn't take effect.
 *   - One pipeline, one set of logs, one place to fix bugs.
 *
 * Configuration:
 *   HF_BACKEND_URL          server-only override. Defaults to
 *                           `NEXT_PUBLIC_BACKEND_URL` (which is shared
 *                           with the legacy /api/proxy/[...path] route)
 *                           and finally to the public shared instance.
 *   HF_BACKEND_TIMEOUT_MS   optional connect timeout (default 50000).
 *                           The function itself has a 60s Vercel cap.
 */

import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_BACKEND = "https://ruslanmv-medibot.hf.space";
const DEFAULT_TIMEOUT_MS = 50_000;

function resolveBackendURL(): string {
  const raw =
    process.env.HF_BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    DEFAULT_BACKEND;
  return raw.replace(/\/+$/, "");
}

export async function POST(req: NextRequest): Promise<Response> {
  const backend = resolveBackendURL();
  const upstream = `${backend}/api/chat`;

  // Read the body once as text so we can both forward it and log
  // its size without consuming the stream twice.
  const bodyText = await req.text();

  const startedAt = Date.now();
  console.log(
    `[Proxy] /api/chat → ${upstream} (${bodyText.length}B in)`,
  );

  const timeoutMs = Number(
    process.env.HF_BACKEND_TIMEOUT_MS || DEFAULT_TIMEOUT_MS,
  );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // Honor a client disconnect too.
  if (req.signal) {
    req.signal.addEventListener("abort", () => controller.abort(), {
      once: true,
    });
  }

  let res: Response;
  try {
    res = await fetch(upstream, {
      method: "POST",
      headers: buildForwardHeaders(req),
      body: bodyText,
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timer);
    const aborted = err?.name === "AbortError";
    console.error(
      `[Proxy] fetch to ${upstream} failed (${Date.now() - startedAt}ms):`,
      err?.message || err,
    );
    return jsonError(
      aborted
        ? "The medical AI took too long to respond. Please try again."
        : "Could not reach the medical AI backend. Please try again.",
      aborted ? "backend_timeout" : "backend_unreachable",
      aborted ? 504 : 502,
    );
  }
  clearTimeout(timer);

  const upstreamContentType = res.headers.get("content-type") || "";
  console.log(
    `[Proxy] ${upstream} → ${res.status} content-type=${upstreamContentType} (${Date.now() - startedAt}ms TTFB)`,
  );

  if (!res.ok) {
    // Surface the upstream body so the browser-side empty-response
    // diagnostic groups have the actual error to display.
    const text = await res.text().catch(() => "");
    console.error(
      `[Proxy] upstream error ${res.status}: ${text.slice(0, 300)}`,
    );
    return jsonError(
      `The medical AI backend returned an error (${res.status}). Please try again in a moment.`,
      "backend_error",
      res.status >= 500 ? 502 : res.status,
      { upstreamStatus: res.status, upstreamBody: text.slice(0, 500) },
    );
  }

  if (!res.body) {
    // 200 with no body — treat as an empty stream so the client
    // diagnostic logger has something parseable to report.
    return new Response("data: [DONE]\n\n", {
      status: 200,
      headers: sseHeaders(),
    });
  }

  // Stream the upstream body straight through. The HF Space already
  // emits canonical OpenAI-compatible SSE frames (its provider chain
  // re-encodes every upstream into the same shape), so the browser
  // parser in web/lib/hooks/useChat.ts works unchanged.
  return new Response(res.body, {
    status: 200,
    headers: {
      ...sseHeaders(),
      // Preserve the upstream content-type if it's something other
      // than text/event-stream (defensive — should always be SSE).
      "Content-Type": upstreamContentType || "text/event-stream",
    },
  });
}

// Bare GET is sometimes hit by health probes and link previewers.
// Returning 405 is cleaner than letting Next.js render a 500 page.
export async function GET(): Promise<Response> {
  return new Response("Method Not Allowed — use POST", { status: 405 });
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function buildForwardHeaders(req: NextRequest): HeadersInit {
  const out: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  // Pass-through session cookies so HF can authenticate the user
  // against its own session store.
  const cookie = req.headers.get("cookie");
  if (cookie) out.Cookie = cookie;
  // Pass-through Accept-Language so the HF Space can localise its
  // greeting card and safety copy.
  const acceptLang = req.headers.get("accept-language");
  if (acceptLang) out["Accept-Language"] = acceptLang;
  // Forward the original client IP for HF-side rate limiting.
  const realIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
  if (realIp) out["X-Forwarded-For"] = realIp;
  return out;
}

function sseHeaders(): Record<string, string> {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store",
    Connection: "keep-alive",
  };
}

function jsonError(
  message: string,
  code: string,
  status: number,
  extra?: Record<string, unknown>,
): Response {
  return new Response(
    JSON.stringify({ error: message, code, ...(extra ?? {}) }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}
