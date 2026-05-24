import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { loadConfig } from '@/lib/server-config';

/**
 * GET /api/admin/llm-health — Test all LLM providers and models.
 *
 * Sends a minimal "Say OK" prompt to each model in the fallback chain
 * and reports which ones are alive, their latency, and any errors.
 * Admin-only endpoint.
 *
 * Token resolution order:
 *   1. admin config file (set via /api/admin/config PUT)
 *   2. HF_TOKEN environment variable
 * This way an admin can fix a misconfigured Space without redeploying.
 *
 * The result also includes a synthetic "ollabridge/<alias>" row at the
 * top of the list so the Provider Health page surfaces the OllaBridge
 * Cloud gateway alongside HF models — matching the routing chain
 * documented in the "Come funziona il routing" panel (OllaBridge first,
 * then HF Inference, then enterprise providers, then cached FAQ).
 */

const HF_BASE_URL = 'https://router.huggingface.co/v1';

/** All models to test — matches the presets fallback chain. */
const MODELS_TO_TEST = [
  'meta-llama/Llama-3.3-70B-Instruct:sambanova',
  'meta-llama/Llama-3.3-70B-Instruct:together',
  'meta-llama/Llama-3.3-70B-Instruct',
  'Qwen/Qwen2.5-72B-Instruct',
  'Qwen/Qwen3-235B-A22B',
  'google/gemma-3-27b-it',
  'meta-llama/Llama-3.1-70B-Instruct',
  'Qwen/Qwen3-32B',
  'deepseek-ai/DeepSeek-V3-0324',
  'deepseek-ai/DeepSeek-R1',
  'Qwen/Qwen3-30B-A3B',
  'Qwen/Qwen2.5-Coder-32B-Instruct',
];

type ModelResult = {
  model: string;
  status: 'ok' | 'error';
  latencyMs: number;
  response?: string;
  error?: string;
  httpStatus?: number;
};

async function testModel(model: string, token: string): Promise<ModelResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${HF_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Say OK' }],
        max_tokens: 5,
        temperature: 0.1,
        stream: false,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const latencyMs = Date.now() - start;

    if (res.ok) {
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content?.trim() || '';
      return { model, status: 'ok', latencyMs, response: content.slice(0, 30) };
    } else {
      const text = await res.text().catch(() => '');
      const errorMsg = text.slice(0, 100);
      return { model, status: 'error', latencyMs, error: errorMsg, httpStatus: res.status };
    }
  } catch (e: any) {
    return {
      model,
      status: 'error',
      latencyMs: Date.now() - start,
      error: e?.name === 'TimeoutError' ? 'Timeout (15s)' : (e?.message || 'Unknown error').slice(0, 100),
    };
  }
}

/**
 * Probe the OllaBridge Cloud gateway with a minimal chat completion.
 *
 * Renders as the first row in the Provider Health table. The model id is
 * shaped `ollabridge/<alias>` on purpose: the UI splits by `/` to derive
 * an org-style subtitle, so this keeps the existing render path unchanged.
 *
 * Uses a 20s timeout — generous enough to absorb the worst-case Cloud
 * fallback chain (HF 402 cascade → local-ollama) while still capping
 * pathological hangs.
 */
async function testOllaBridge(
  baseUrl: string,
  apiKey: string,
  alias: string,
): Promise<ModelResult> {
  const start = Date.now();
  const url = `${baseUrl.replace(/\/+$/, '')}/v1/chat/completions`;
  const modelId = `ollabridge/${alias || 'gateway'}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: alias || 'free-fast',
        messages: [{ role: 'user', content: 'Say OK' }],
        max_tokens: 5,
        temperature: 0.1,
        stream: false,
      }),
      signal: AbortSignal.timeout(20000),
    });

    const latencyMs = Date.now() - start;

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const content = data?.choices?.[0]?.message?.content?.trim() || '';
      return { model: modelId, status: 'ok', latencyMs, response: content.slice(0, 30) || 'OK' };
    }
    const text = await res.text().catch(() => '');
    return {
      model: modelId,
      status: 'error',
      latencyMs,
      error: text.slice(0, 100),
      httpStatus: res.status,
    };
  } catch (e: any) {
    return {
      model: modelId,
      status: 'error',
      latencyMs: Date.now() - start,
      error: e?.name === 'TimeoutError' ? 'Timeout (20s)' : (e?.message || 'Unknown error').slice(0, 100),
    };
  }
}

export async function GET(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  // Prefer admin-configured token, fall back to env var.
  const config = loadConfig();
  const token = config.llm.hfToken || process.env.HF_TOKEN || '';
  const ollabridgeUrl = config.llm.ollabridgeUrl || process.env.OLLABRIDGE_URL || '';
  const ollabridgeKey = config.llm.ollabridgeApiKey || process.env.OLLABRIDGE_API_KEY || '';
  const ollabridgeAlias = config.llm.hfDefaultModel || 'free-fast';

  // Kick off OllaBridge probe in parallel with the HF cascade — only when
  // a URL is configured. An unconfigured OllaBridge stays absent from the
  // list rather than appearing as a permanent red row that would mislead
  // operators who are using HF-only.
  const ollabridgePromise: Promise<ModelResult | null> = ollabridgeUrl
    ? testOllaBridge(ollabridgeUrl, ollabridgeKey, ollabridgeAlias)
    : Promise.resolve(null);

  if (!token) {
    // Still return a well-formed response so the UI can render an empty-state
    // Provider Status panel with a helpful error banner. We still surface
    // the OllaBridge row when it's configured — it's independent of HF.
    const ollabridgeResult = await ollabridgePromise;
    const models: ModelResult[] = [
      ...(ollabridgeResult ? [ollabridgeResult] : []),
      ...MODELS_TO_TEST.map((model) => ({
        model,
        status: 'error' as const,
        latencyMs: 0,
        error: 'No HF token configured',
      })),
    ];
    const ok = models.filter((m) => m.status === 'ok').length;
    return NextResponse.json({
      error: 'HF_TOKEN not configured — set it in Admin → Server → HuggingFace.',
      models,
      summary: {
        total: models.length,
        ok,
        error: models.length - ok,
        testedAt: new Date().toISOString(),
      },
    });
  }

  // Test all HF models in parallel for speed; OllaBridge runs alongside.
  const [ollabridgeResult, hfResults] = await Promise.all([
    ollabridgePromise,
    Promise.all(MODELS_TO_TEST.map((model) => testModel(model, token))),
  ]);

  const results: ModelResult[] = [
    ...(ollabridgeResult ? [ollabridgeResult] : []),
    ...hfResults,
  ];
  const ok = results.filter((r) => r.status === 'ok').length;

  return NextResponse.json({
    models: results,
    summary: {
      total: results.length,
      ok,
      error: results.length - ok,
      testedAt: new Date().toISOString(),
    },
  });
}
