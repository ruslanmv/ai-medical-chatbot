/**
 * Fetch available models from OllaBridge-Cloud.
 * These include model aliases (free-best, free-fast, etc.)
 * and any connected local/remote models.
 */

export interface OllaBridgeModel {
  id: string;
  name: string;
  description: string;
  category: 'free' | 'cheap' | 'local';
}

const DEFAULT_MODELS: OllaBridgeModel[] = [
  {
    id: 'free-best',
    name: 'Best Free Model',
    description: 'Routes to best available free provider (Gemini, Groq, etc.)',
    category: 'free',
  },
  {
    id: 'free-fast',
    name: 'Fastest Free Model',
    description: 'Routes to fastest free provider (Groq)',
    category: 'free',
  },
  {
    id: 'free-flex',
    name: 'Flexible Free Model',
    description: 'Routes to OpenRouter free models',
    category: 'free',
  },
  {
    id: 'cheap-reasoning',
    name: 'Advanced Reasoning',
    description: 'Routes to DeepSeek for complex medical reasoning',
    category: 'cheap',
  },
];

export async function fetchAvailableModels(): Promise<OllaBridgeModel[]> {
  const baseURL =
    process.env.OLLABRIDGE_URL ||
    'https://ruslanmv-ollabridge.hf.space';
  const apiKey = process.env.OLLABRIDGE_API_KEY || '';

  try {
    const response = await fetch(`${baseURL}/v1/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();

    if (data?.data && Array.isArray(data.data)) {
      return data.data.map((m: { id: string; owned_by?: string }) => ({
        id: m.id,
        name: m.id,
        description: m.owned_by || 'Available model',
        category: m.id.startsWith('free-')
          ? 'free'
          : m.id.startsWith('cheap-')
            ? 'cheap'
            : 'local',
      }));
    }

    return DEFAULT_MODELS;
  } catch {
    return DEFAULT_MODELS;
  }
}
