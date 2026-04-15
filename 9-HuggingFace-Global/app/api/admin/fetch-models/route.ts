import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { loadConfig } from '@/lib/server-config';

/**
 * GET /api/admin/fetch-models — Aggregate available models from every
 * configured provider into one list for the admin model picker.
 *
 * Queries, in parallel:
 *   - OllaBridge Cloud            /v1/models         (OpenAI-compatible)
 *   - HuggingFace Inference       /v1/models         (via router.huggingface.co)
 *   - Groq                        /openai/v1/models  (free/cheap tier)
 *   - OpenAI                      /v1/models         (paid enterprise)
 *   - Anthropic                   /v1/models         (paid enterprise)
 *   - IBM WatsonX                 /ml/v1/foundation_model_specs (paid enterprise)
 *
 * Each provider block returns:
 *   { provider, configured, ok, error?, models: [{id, name, ownedBy, context?}] }
 *
 * Providers that aren't configured still appear in the response so the UI
 * can show them as "not configured" with a link to set them up. This keeps
 * the client-side model picker uniform across providers.
 *
 * Admin-only endpoint.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ModelInfo {
  id: string;
  name: string;
  ownedBy?: string;
  context?: number;
  pricing?: 'free' | 'paid' | 'cheap' | 'local';
}

interface ProviderBlock {
  provider: string;
  label: string;
  configured: boolean;
  ok: boolean;
  error?: string;
  pricing: 'free' | 'paid' | 'cheap' | 'local';
  models: ModelInfo[];
}

/** Default 10s timeout for any provider discovery call. */
function withTimeout(ms = 10000) {
  return AbortSignal.timeout(ms);
}

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// ---- Provider fetchers ---------------------------------------------------

async function fetchOllaBridge(
  url: string,
  apiKey: string,
): Promise<ProviderBlock> {
  const block: ProviderBlock = {
    provider: 'ollabridge',
    label: 'OllaBridge Cloud',
    configured: !!url,
    ok: false,
    pricing: 'free',
    models: [],
  };
  if (!url) {
    block.error = 'Not configured — set OllaBridge URL in Server tab';
    return block;
  }
  try {
    const cleanBase = url.replace(/\/+$/, '');
    const res = await fetch(`${cleanBase}/v1/models`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      signal: withTimeout(),
    });
    if (!res.ok) {
      block.error = `HTTP ${res.status}`;
      return block;
    }
    const data = await safeJson(res);
    const list = Array.isArray(data?.data) ? data.data : [];
    block.models = list.map((m: any) => ({
      id: String(m.id ?? 'unknown'),
      name: String(m.id ?? 'unknown'),
      ownedBy: m.owned_by || 'ollabridge',
      pricing:
        String(m.id ?? '').startsWith('free-')
          ? 'free'
          : String(m.id ?? '').startsWith('cheap-')
            ? 'cheap'
            : 'local',
    }));
    block.ok = true;
  } catch (e: any) {
    block.error = e?.name === 'TimeoutError' ? 'Timeout (10s)' : e?.message?.slice(0, 100) || 'Request failed';
  }
  return block;
}

async function fetchHuggingFace(token: string): Promise<ProviderBlock> {
  const block: ProviderBlock = {
    provider: 'huggingface',
    label: 'HuggingFace Inference',
    configured: !!token,
    ok: false,
    pricing: 'free',
    models: [],
  };
  if (!token) {
    block.error = 'Not configured — set HF token in Server tab';
    // Still provide the curated fallback chain as suggestions so users can
    // pick a model even before the token is set.
    block.models = CURATED_HF_MODELS.map((id) => ({
      id,
      name: id.split('/').pop() || id,
      ownedBy: id.split('/')[0],
      pricing: 'free',
    }));
    return block;
  }
  try {
    const res = await fetch('https://router.huggingface.co/v1/models', {
      headers: { Authorization: `Bearer ${token}` },
      signal: withTimeout(),
    });
    if (!res.ok) {
      block.error = `HTTP ${res.status}`;
      // Still return curated list so the UI has something to show.
      block.models = CURATED_HF_MODELS.map((id) => ({
        id,
        name: id.split('/').pop() || id,
        ownedBy: id.split('/')[0],
        pricing: 'free',
      }));
      return block;
    }
    const data = await safeJson(res);
    const list = Array.isArray(data?.data) ? data.data : [];
    block.models = list
      .filter((m: any) => typeof m?.id === 'string')
      .map((m: any) => ({
        id: String(m.id),
        name: String(m.id).split('/').pop() || String(m.id),
        ownedBy: m.owned_by || String(m.id).split('/')[0],
        pricing: 'free' as const,
      }));
    block.ok = true;
  } catch (e: any) {
    block.error = e?.name === 'TimeoutError' ? 'Timeout (10s)' : e?.message?.slice(0, 100) || 'Request failed';
    block.models = CURATED_HF_MODELS.map((id) => ({
      id,
      name: id.split('/').pop() || id,
      ownedBy: id.split('/')[0],
      pricing: 'free',
    }));
  }
  return block;
}

/** Verified-working free HF models (from lib/providers/huggingface-direct.ts). */
const CURATED_HF_MODELS = [
  'meta-llama/Llama-3.3-70B-Instruct',
  'Qwen/Qwen2.5-72B-Instruct',
  'Qwen/Qwen3-235B-A22B',
  'google/gemma-3-27b-it',
  'meta-llama/Llama-3.1-70B-Instruct',
  'deepseek-ai/DeepSeek-V3-0324',
];

async function fetchGroq(apiKey: string): Promise<ProviderBlock> {
  const block: ProviderBlock = {
    provider: 'groq',
    label: 'Groq (Free tier)',
    configured: !!apiKey,
    ok: false,
    pricing: 'free',
    models: [],
  };
  if (!apiKey) {
    block.error = 'Not configured — add Groq API key in Server tab';
    return block;
  }
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: withTimeout(),
    });
    if (!res.ok) {
      block.error = `HTTP ${res.status}`;
      return block;
    }
    const data = await safeJson(res);
    const list = Array.isArray(data?.data) ? data.data : [];
    block.models = list.map((m: any) => ({
      id: String(m.id ?? 'unknown'),
      name: String(m.id ?? 'unknown'),
      ownedBy: m.owned_by || 'groq',
      context: typeof m.context_window === 'number' ? m.context_window : undefined,
      pricing: 'free',
    }));
    block.ok = true;
  } catch (e: any) {
    block.error = e?.name === 'TimeoutError' ? 'Timeout (10s)' : e?.message?.slice(0, 100) || 'Request failed';
  }
  return block;
}

async function fetchOpenAI(apiKey: string): Promise<ProviderBlock> {
  const block: ProviderBlock = {
    provider: 'openai',
    label: 'OpenAI (Paid)',
    configured: !!apiKey,
    ok: false,
    pricing: 'paid',
    models: [],
  };
  if (!apiKey) {
    block.error = 'Not configured — add OpenAI API key in Server tab';
    return block;
  }
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: withTimeout(),
    });
    if (!res.ok) {
      block.error = `HTTP ${res.status}`;
      return block;
    }
    const data = await safeJson(res);
    const list = Array.isArray(data?.data) ? data.data : [];
    // Filter to chat-capable GPT models — the full list is noisy.
    block.models = list
      .filter((m: any) => {
        const id = String(m?.id || '');
        return /^(gpt-|o1-|o3-|chatgpt)/i.test(id);
      })
      .map((m: any) => ({
        id: String(m.id),
        name: String(m.id),
        ownedBy: m.owned_by || 'openai',
        pricing: 'paid' as const,
      }));
    block.ok = true;
  } catch (e: any) {
    block.error = e?.name === 'TimeoutError' ? 'Timeout (10s)' : e?.message?.slice(0, 100) || 'Request failed';
  }
  return block;
}

async function fetchAnthropic(apiKey: string): Promise<ProviderBlock> {
  const block: ProviderBlock = {
    provider: 'anthropic',
    label: 'Anthropic Claude (Paid)',
    configured: !!apiKey,
    ok: false,
    pricing: 'paid',
    models: [],
  };
  if (!apiKey) {
    block.error = 'Not configured — add Anthropic API key in Server tab';
    // Provide curated list as placeholder.
    block.models = CURATED_ANTHROPIC_MODELS;
    return block;
  }
  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      signal: withTimeout(),
    });
    if (!res.ok) {
      block.error = `HTTP ${res.status}`;
      block.models = CURATED_ANTHROPIC_MODELS;
      return block;
    }
    const data = await safeJson(res);
    const list = Array.isArray(data?.data) ? data.data : [];
    block.models = list.map((m: any) => ({
      id: String(m.id ?? 'unknown'),
      name: String(m.display_name || m.id || 'unknown'),
      ownedBy: 'anthropic',
      pricing: 'paid' as const,
    }));
    block.ok = true;
  } catch (e: any) {
    block.error = e?.name === 'TimeoutError' ? 'Timeout (10s)' : e?.message?.slice(0, 100) || 'Request failed';
    block.models = CURATED_ANTHROPIC_MODELS;
  }
  return block;
}

/** Fallback list so the UI can show Claude options even without a key. */
const CURATED_ANTHROPIC_MODELS: ModelInfo[] = [
  { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', ownedBy: 'anthropic', pricing: 'paid' },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', ownedBy: 'anthropic', pricing: 'paid' },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', ownedBy: 'anthropic', pricing: 'paid' },
];

async function fetchWatsonx(
  apiKey: string,
  projectId: string,
  baseUrl: string,
): Promise<ProviderBlock> {
  const block: ProviderBlock = {
    provider: 'watsonx',
    label: 'IBM WatsonX (Paid)',
    configured: !!(apiKey && projectId),
    ok: false,
    pricing: 'paid',
    models: [],
  };
  if (!apiKey || !projectId) {
    block.error = 'Not configured — add WatsonX API key and project ID in Server tab';
    block.models = CURATED_WATSONX_MODELS;
    return block;
  }
  try {
    // WatsonX requires exchanging the API key for an IAM bearer token first.
    const iamRes = await fetch('https://iam.cloud.ibm.com/identity/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
        apikey: apiKey,
      }),
      signal: withTimeout(),
    });
    if (!iamRes.ok) {
      block.error = `IAM token failed: HTTP ${iamRes.status}`;
      block.models = CURATED_WATSONX_MODELS;
      return block;
    }
    const iamData = await safeJson(iamRes);
    const bearer = iamData?.access_token;
    if (!bearer) {
      block.error = 'IAM response missing access_token';
      block.models = CURATED_WATSONX_MODELS;
      return block;
    }

    // Discover available foundation models.
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const modelsRes = await fetch(
      `${cleanBase}/ml/v1/foundation_model_specs?version=2024-05-01&limit=200`,
      {
        headers: { Authorization: `Bearer ${bearer}` },
        signal: withTimeout(),
      },
    );
    if (!modelsRes.ok) {
      block.error = `HTTP ${modelsRes.status}`;
      block.models = CURATED_WATSONX_MODELS;
      return block;
    }
    const data = await safeJson(modelsRes);
    const list = Array.isArray(data?.resources) ? data.resources : [];
    block.models = list.map((m: any) => ({
      id: String(m.model_id ?? 'unknown'),
      name: String(m.label || m.model_id || 'unknown'),
      ownedBy: m.provider || 'ibm',
      pricing: 'paid' as const,
    }));
    block.ok = true;
  } catch (e: any) {
    block.error = e?.name === 'TimeoutError' ? 'Timeout (10s)' : e?.message?.slice(0, 100) || 'Request failed';
    block.models = CURATED_WATSONX_MODELS;
  }
  return block;
}

/** Common WatsonX foundation models as a fallback list. */
const CURATED_WATSONX_MODELS: ModelInfo[] = [
  { id: 'ibm/granite-3-8b-instruct', name: 'Granite 3 8B Instruct', ownedBy: 'ibm', pricing: 'paid' },
  { id: 'meta-llama/llama-3-3-70b-instruct', name: 'Llama 3.3 70B', ownedBy: 'meta', pricing: 'paid' },
  { id: 'mistralai/mistral-large', name: 'Mistral Large', ownedBy: 'mistralai', pricing: 'paid' },
];

// ---- Additional provider fetchers (v3) -----------------------------------

/**
 * Google Gemini. Uses the Generative Language API, which requires the key
 * as a query parameter rather than a bearer header.
 */
async function fetchGemini(apiKey: string): Promise<ProviderBlock> {
  const block: ProviderBlock = {
    provider: 'gemini',
    label: 'Google Gemini',
    configured: !!apiKey,
    ok: false,
    pricing: 'paid',
    models: [],
  };
  if (!apiKey) {
    block.error = 'API key not configured';
    return block;
  }
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      { signal: withTimeout() },
    );
    if (!res.ok) {
      block.error = `HTTP ${res.status}`;
      return block;
    }
    const data = await res.json().catch(() => ({}));
    const arr = Array.isArray(data?.models) ? data.models : [];
    block.ok = true;
    block.models = arr
      .filter((m: any) => typeof m?.name === 'string')
      // Gemini returns "models/gemini-1.5-flash" — strip the prefix so the
      // UI shows the bare model id like every other provider.
      .map((m: any) => ({
        id: String(m.name).replace(/^models\//, ''),
        name: m.displayName || String(m.name).replace(/^models\//, ''),
        ownedBy: 'google',
        context: typeof m.inputTokenLimit === 'number' ? m.inputTokenLimit : undefined,
        pricing: 'paid' as const,
      }));
  } catch (e: any) {
    block.error = e?.name === 'TimeoutError' ? 'Timeout (10s)' : e?.message || 'Request failed';
  }
  return block;
}

/** OpenRouter — OpenAI-compatible /v1/models aggregator across providers. */
async function fetchOpenRouter(apiKey: string): Promise<ProviderBlock> {
  const block: ProviderBlock = {
    provider: 'openrouter',
    label: 'OpenRouter',
    configured: !!apiKey,
    ok: false,
    pricing: 'paid',
    models: [],
  };
  if (!apiKey) {
    block.error = 'API key not configured';
    return block;
  }
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: withTimeout(),
    });
    if (!res.ok) {
      block.error = `HTTP ${res.status}`;
      return block;
    }
    const data = await res.json().catch(() => ({}));
    const arr = Array.isArray(data?.data) ? data.data : [];
    block.ok = true;
    block.models = arr.slice(0, 200).map((m: any) => ({
      id: String(m.id),
      name: m.name || String(m.id),
      ownedBy: (String(m.id).split('/')[0] as string) || undefined,
      context: typeof m.context_length === 'number' ? m.context_length : undefined,
      pricing: m?.pricing?.prompt === '0' ? 'free' : 'paid',
    }));
  } catch (e: any) {
    block.error = e?.name === 'TimeoutError' ? 'Timeout (10s)' : e?.message || 'Request failed';
  }
  return block;
}

/** Together AI — OpenAI-compatible /v1/models. */
async function fetchTogether(apiKey: string): Promise<ProviderBlock> {
  const block: ProviderBlock = {
    provider: 'together',
    label: 'Together AI',
    configured: !!apiKey,
    ok: false,
    pricing: 'paid',
    models: [],
  };
  if (!apiKey) {
    block.error = 'API key not configured';
    return block;
  }
  try {
    const res = await fetch('https://api.together.xyz/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: withTimeout(),
    });
    if (!res.ok) {
      block.error = `HTTP ${res.status}`;
      return block;
    }
    const data = await res.json().catch(() => []);
    // Together returns a bare array.
    const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    block.ok = true;
    block.models = arr.slice(0, 200).map((m: any) => ({
      id: String(m.id || m.name),
      name: m.display_name || m.id || m.name,
      ownedBy: m.organization || undefined,
      context: typeof m.context_length === 'number' ? m.context_length : undefined,
      pricing: 'paid' as const,
    }));
  } catch (e: any) {
    block.error = e?.name === 'TimeoutError' ? 'Timeout (10s)' : e?.message || 'Request failed';
  }
  return block;
}

/** Mistral AI — OpenAI-compatible /v1/models. */
async function fetchMistral(apiKey: string): Promise<ProviderBlock> {
  const block: ProviderBlock = {
    provider: 'mistral',
    label: 'Mistral AI',
    configured: !!apiKey,
    ok: false,
    pricing: 'paid',
    models: [],
  };
  if (!apiKey) {
    block.error = 'API key not configured';
    return block;
  }
  try {
    const res = await fetch('https://api.mistral.ai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: withTimeout(),
    });
    if (!res.ok) {
      block.error = `HTTP ${res.status}`;
      return block;
    }
    const data = await res.json().catch(() => ({}));
    const arr = Array.isArray(data?.data) ? data.data : [];
    block.ok = true;
    block.models = arr.map((m: any) => ({
      id: String(m.id),
      name: m.name || m.id,
      ownedBy: m.owned_by || 'mistralai',
      context:
        typeof m.max_context_length === 'number'
          ? m.max_context_length
          : typeof m.context_length === 'number'
            ? m.context_length
            : undefined,
      pricing: 'paid' as const,
    }));
  } catch (e: any) {
    block.error = e?.name === 'TimeoutError' ? 'Timeout (10s)' : e?.message || 'Request failed';
  }
  return block;
}

// ---- Route handler -------------------------------------------------------

export async function GET(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  const config = loadConfig();
  const { llm } = config;

  // Run every discovery call in parallel so the slowest provider sets the
  // total latency floor, not the sum of all calls.
  const [
    ollabridge,
    huggingface,
    groq,
    openai,
    anthropic,
    watsonx,
    gemini,
    openrouter,
    together,
    mistral,
  ] = await Promise.all([
    fetchOllaBridge(llm.ollabridgeUrl, llm.ollabridgeApiKey),
    fetchHuggingFace(llm.hfToken),
    fetchGroq(llm.groqApiKey),
    fetchOpenAI(llm.openaiApiKey),
    fetchAnthropic(llm.anthropicApiKey),
    fetchWatsonx(llm.watsonxApiKey, llm.watsonxProjectId, llm.watsonxUrl),
    fetchGemini(llm.geminiApiKey),
    fetchOpenRouter(llm.openrouterApiKey),
    fetchTogether(llm.togetherApiKey),
    fetchMistral(llm.mistralApiKey),
  ]);

  const providers = [
    ollabridge,
    huggingface,
    groq,
    openai,
    anthropic,
    watsonx,
    gemini,
    openrouter,
    together,
    mistral,
  ];
  const totalModels = providers.reduce((sum, p) => sum + p.models.length, 0);
  const okCount = providers.filter((p) => p.ok).length;

  return NextResponse.json({
    providers,
    summary: {
      providers: providers.length,
      providersOk: okCount,
      totalModels,
      fetchedAt: new Date().toISOString(),
    },
  });
}
