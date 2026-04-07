export type Provider =
  | "hf"
  | "ollabridge"
  | "ollama"
  | "openai"
  | "gemini"
  | "claude";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

/**
 * High-level, user-facing presets. These map to a concrete
 * (provider, model) pair — plus an optional ordered fallback
 * chain — via `lib/providers/presets.ts`.
 */
export type Preset =
  | "free-best"
  | "free-fastest"
  | "free-flexible"
  | "deep-reasoning"
  | "local"
  | "ollabridge";

export type MedicalContextPayload = {
  country: string;
  language: string;
  emergencyNumber: string;
  units?: "metric" | "imperial";
};

export type ChatRequest = {
  preset?: Preset;
  provider?: Provider;
  model?: string;
  apiKey?: string;
  userHfToken?: string;
  context?: MedicalContextPayload;
  messages: ChatMessage[];
  stream?: boolean;
};

export type ProviderConfig = {
  name: string;
  displayName: string;
  requiresApiKey: boolean;
  models: {
    id: string;
    name: string;
  }[];
};

export const PROVIDER_CONFIGS: Record<Provider, ProviderConfig> = {
  hf: {
    name: "hf",
    displayName: "HuggingFace Inference (Free)",
    requiresApiKey: false,
    models: [
      { id: "meta-llama/Llama-3.3-70B-Instruct", name: "Llama 3.3 70B (default)" },
      { id: "Qwen/Qwen2.5-72B-Instruct", name: "Qwen 2.5 72B" },
      { id: "deepseek-ai/DeepSeek-R1", name: "DeepSeek R1 (reasoning)" },
    ],
  },
  ollabridge: {
    name: "ollabridge",
    displayName: "OllaBridge (Custom Gateway)",
    requiresApiKey: true,
    models: [{ id: "free-best", name: "Auto (free-best)" }],
  },
  ollama: {
    name: "ollama",
    displayName: "Ollama (Local)",
    requiresApiKey: false,
    models: [
      { id: "qwen2.5:7b", name: "Qwen 2.5 7B" },
      { id: "llama3.2", name: "Llama 3.2" },
    ],
  },
  openai: {
    name: "openai",
    displayName: "OpenAI (GPT-4)",
    requiresApiKey: true,
    models: [
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    ],
  },
  gemini: {
    name: "gemini",
    displayName: "Google (Gemini 1.5)",
    requiresApiKey: true,
    models: [
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
    ],
  },
  claude: {
    name: "claude",
    displayName: "Anthropic (Claude 3.5)",
    requiresApiKey: true,
    models: [
      { id: "claude-3-5-sonnet-latest", name: "Claude 3.5 Sonnet" },
      { id: "claude-3-5-haiku-latest", name: "Claude 3.5 Haiku" },
    ],
  },
};
