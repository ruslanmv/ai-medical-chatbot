import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { loadConfig } from '@/lib/server-config';

/**
 * POST /api/admin/test-connection — Test connectivity to a named provider.
 *
 * Body: { provider: "ollabridge" | "huggingface" | "openai" | "anthropic"
 *                  | "groq" | "watsonx" }
 *
 * Response:
 *   { ok: boolean, provider, latencyMs, status?, error?, details? }
 *
 * Used by the "Test Connection" button on each provider card. Mirrors the
 * `ollabridge pair` CLI check — validates that credentials are good and
 * that the provider's /v1/models (or equivalent) endpoint responds.
 *
 * Admin-only.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Provider =
  | 'ollabridge'
  | 'huggingface'
  | 'openai'
  | 'anthropic'
  | 'groq'
  | 'watsonx'
  | 'gemini'
  | 'openrouter'
  | 'together'
  | 'mistral';

interface TestResult {
  ok: boolean;
  provider: Provider;
  latencyMs: number;
  status?: number;
  error?: string;
  details?: string;
}

async function testOllaBridge(url: string, apiKey: string): Promise<Omit<TestResult, 'provider'>> {
  const start = Date.now();
  if (!url) {
    return { ok: false, latencyMs: 0, error: 'URL not configured' };
  }
  try {
    const cleanBase = url.replace(/\/+$/, '');
    const res = await fetch(`${cleanBase}/v1/models`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      signal: AbortSignal.timeout(10000),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return { ok: false, latencyMs, status: res.status, error: `HTTP ${res.status}` };
    }
    const data = await res.json().catch(() => null);
    const count = Array.isArray(data?.data) ? data.data.length : 0;
    return {
      ok: true,
      latencyMs,
      status: res.status,
      details: `${count} model${count === 1 ? '' : 's'} available`,
    };
  } catch (e: any) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: e?.name === 'TimeoutError' ? 'Timeout (10s)' : e?.message?.slice(0, 100) || 'Request failed',
    };
  }
}

async function testHuggingFace(token: string): Promise<Omit<TestResult, 'provider'>> {
  const start = Date.now();
  if (!token) return { ok: false, latencyMs: 0, error: 'HF token not configured' };
  try {
    // whoami-v2 validates that the token has API access; it's cheaper
    // than hitting the router and gives a clear permission error.
    const res = await fetch('https://huggingface.co/api/whoami-v2', {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return { ok: false, latencyMs, status: res.status, error: `HTTP ${res.status}` };
    }
    const data = await res.json().catch(() => null);
    return {
      ok: true,
      latencyMs,
      status: res.status,
      details: data?.name ? `Authenticated as ${data.name}` : 'Token valid',
    };
  } catch (e: any) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: e?.name === 'TimeoutError' ? 'Timeout (10s)' : e?.message?.slice(0, 100) || 'Request failed',
    };
  }
}

async function testOpenAI(apiKey: string): Promise<Omit<TestResult, 'provider'>> {
  const start = Date.now();
  if (!apiKey) return { ok: false, latencyMs: 0, error: 'OpenAI API key not configured' };
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) return { ok: false, latencyMs, status: res.status, error: `HTTP ${res.status}` };
    const data = await res.json().catch(() => null);
    const count = Array.isArray(data?.data) ? data.data.length : 0;
    return { ok: true, latencyMs, status: res.status, details: `${count} models visible` };
  } catch (e: any) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: e?.name === 'TimeoutError' ? 'Timeout (10s)' : e?.message?.slice(0, 100) || 'Request failed',
    };
  }
}

async function testAnthropic(apiKey: string): Promise<Omit<TestResult, 'provider'>> {
  const start = Date.now();
  if (!apiKey) return { ok: false, latencyMs: 0, error: 'Anthropic API key not configured' };
  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      signal: AbortSignal.timeout(10000),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) return { ok: false, latencyMs, status: res.status, error: `HTTP ${res.status}` };
    const data = await res.json().catch(() => null);
    const count = Array.isArray(data?.data) ? data.data.length : 0;
    return { ok: true, latencyMs, status: res.status, details: `${count} models visible` };
  } catch (e: any) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: e?.name === 'TimeoutError' ? 'Timeout (10s)' : e?.message?.slice(0, 100) || 'Request failed',
    };
  }
}

async function testGroq(apiKey: string): Promise<Omit<TestResult, 'provider'>> {
  const start = Date.now();
  if (!apiKey) return { ok: false, latencyMs: 0, error: 'Groq API key not configured' };
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) return { ok: false, latencyMs, status: res.status, error: `HTTP ${res.status}` };
    const data = await res.json().catch(() => null);
    const count = Array.isArray(data?.data) ? data.data.length : 0;
    return { ok: true, latencyMs, status: res.status, details: `${count} models visible` };
  } catch (e: any) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: e?.name === 'TimeoutError' ? 'Timeout (10s)' : e?.message?.slice(0, 100) || 'Request failed',
    };
  }
}

async function testWatsonx(
  apiKey: string,
  projectId: string,
  _baseUrl: string,
): Promise<Omit<TestResult, 'provider'>> {
  const start = Date.now();
  if (!apiKey || !projectId) {
    return { ok: false, latencyMs: 0, error: 'Missing API key or project ID' };
  }
  try {
    const res = await fetch('https://iam.cloud.ibm.com/identity/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
        apikey: apiKey,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) return { ok: false, latencyMs, status: res.status, error: `IAM HTTP ${res.status}` };
    const data = await res.json().catch(() => null);
    if (!data?.access_token) return { ok: false, latencyMs, error: 'No access_token in IAM response' };
    return { ok: true, latencyMs, status: 200, details: 'IAM token valid' };
  } catch (e: any) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: e?.name === 'TimeoutError' ? 'Timeout (10s)' : e?.message?.slice(0, 100) || 'Request failed',
    };
  }
}

// ---- Additional provider testers (v3) ------------------------------------

async function testGemini(apiKey: string): Promise<Omit<TestResult, 'provider'>> {
  const start = Date.now();
  if (!apiKey) return { ok: false, latencyMs: 0, error: 'Gemini API key not configured' };
  try {
    // Gemini uses the key as a query param, not a bearer header.
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(10000) },
    );
    const latencyMs = Date.now() - start;
    if (!res.ok) return { ok: false, latencyMs, status: res.status, error: `HTTP ${res.status}` };
    const data = await res.json().catch(() => null);
    const count = Array.isArray(data?.models) ? data.models.length : 0;
    return { ok: true, latencyMs, status: res.status, details: `${count} models visible` };
  } catch (e: any) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: e?.name === 'TimeoutError' ? 'Timeout (10s)' : e?.message?.slice(0, 100) || 'Request failed',
    };
  }
}

async function testOpenRouter(apiKey: string): Promise<Omit<TestResult, 'provider'>> {
  const start = Date.now();
  if (!apiKey) return { ok: false, latencyMs: 0, error: 'OpenRouter API key not configured' };
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) return { ok: false, latencyMs, status: res.status, error: `HTTP ${res.status}` };
    const data = await res.json().catch(() => null);
    const count = Array.isArray(data?.data) ? data.data.length : 0;
    return { ok: true, latencyMs, status: res.status, details: `${count} models visible` };
  } catch (e: any) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: e?.name === 'TimeoutError' ? 'Timeout (10s)' : e?.message?.slice(0, 100) || 'Request failed',
    };
  }
}

async function testTogether(apiKey: string): Promise<Omit<TestResult, 'provider'>> {
  const start = Date.now();
  if (!apiKey) return { ok: false, latencyMs: 0, error: 'Together API key not configured' };
  try {
    const res = await fetch('https://api.together.xyz/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) return { ok: false, latencyMs, status: res.status, error: `HTTP ${res.status}` };
    const data = await res.json().catch(() => null);
    const count = Array.isArray(data)
      ? data.length
      : Array.isArray(data?.data)
        ? data.data.length
        : 0;
    return { ok: true, latencyMs, status: res.status, details: `${count} models visible` };
  } catch (e: any) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: e?.name === 'TimeoutError' ? 'Timeout (10s)' : e?.message?.slice(0, 100) || 'Request failed',
    };
  }
}

async function testMistral(apiKey: string): Promise<Omit<TestResult, 'provider'>> {
  const start = Date.now();
  if (!apiKey) return { ok: false, latencyMs: 0, error: 'Mistral API key not configured' };
  try {
    const res = await fetch('https://api.mistral.ai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) return { ok: false, latencyMs, status: res.status, error: `HTTP ${res.status}` };
    const data = await res.json().catch(() => null);
    const count = Array.isArray(data?.data) ? data.data.length : 0;
    return { ok: true, latencyMs, status: res.status, details: `${count} models visible` };
  } catch (e: any) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: e?.name === 'TimeoutError' ? 'Timeout (10s)' : e?.message?.slice(0, 100) || 'Request failed',
    };
  }
}

export async function POST(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const provider = body?.provider as Provider;
  if (!provider) {
    return NextResponse.json({ error: 'Missing provider field' }, { status: 400 });
  }

  const config = loadConfig();
  const { llm } = config;

  let result: Omit<TestResult, 'provider'>;
  switch (provider) {
    case 'ollabridge':
      result = await testOllaBridge(llm.ollabridgeUrl, llm.ollabridgeApiKey);
      break;
    case 'huggingface':
      result = await testHuggingFace(llm.hfToken);
      break;
    case 'openai':
      result = await testOpenAI(llm.openaiApiKey);
      break;
    case 'anthropic':
      result = await testAnthropic(llm.anthropicApiKey);
      break;
    case 'groq':
      result = await testGroq(llm.groqApiKey);
      break;
    case 'watsonx':
      result = await testWatsonx(llm.watsonxApiKey, llm.watsonxProjectId, llm.watsonxUrl);
      break;
    case 'gemini':
      result = await testGemini(llm.geminiApiKey);
      break;
    case 'openrouter':
      result = await testOpenRouter(llm.openrouterApiKey);
      break;
    case 'together':
      result = await testTogether(llm.togetherApiKey);
      break;
    case 'mistral':
      result = await testMistral(llm.mistralApiKey);
      break;
    default:
      return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
  }

  return NextResponse.json({ provider, ...result });
}
