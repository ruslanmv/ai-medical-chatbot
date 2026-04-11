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

async function testModel(model: string, token: string): Promise<{
  model: string;
  status: 'ok' | 'error';
  latencyMs: number;
  response?: string;
  error?: string;
  httpStatus?: number;
}> {
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

export async function GET(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  // Prefer admin-configured token, fall back to env var.
  const config = loadConfig();
  const token = config.llm.hfToken || process.env.HF_TOKEN || '';

  if (!token) {
    // Still return a well-formed response so the UI can render an empty-state
    // Provider Status panel with a helpful error banner.
    return NextResponse.json({
      error: 'HF_TOKEN not configured — set it in Admin → Server → HuggingFace.',
      models: MODELS_TO_TEST.map((model) => ({
        model,
        status: 'error' as const,
        latencyMs: 0,
        error: 'No HF token configured',
      })),
      summary: {
        total: MODELS_TO_TEST.length,
        ok: 0,
        error: MODELS_TO_TEST.length,
        testedAt: new Date().toISOString(),
      },
    });
  }

  // Test all models in parallel for speed.
  const results = await Promise.all(
    MODELS_TO_TEST.map((model) => testModel(model, token))
  );

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
