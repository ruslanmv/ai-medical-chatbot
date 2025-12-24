export type Provider = "openai" | "gemini" | "claude" | "watsonx" | "ollama";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatRequest = {
  provider: Provider;
  apiKey: string;
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
    displayName: "Google (Gemini 1.5 Pro)",
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
  watsonx: {
    name: "watsonx",
    displayName: "IBM (watsonx.ai)",
    requiresApiKey: true,
    models: [
      { id: "ibm/granite-13b-chat-v2", name: "Granite 13B Chat" },
    ],
  },
  ollama: {
    name: "ollama",
    displayName: "Ollama (Local)",
    requiresApiKey: false,
    models: [
      { id: "llama3.2", name: "Llama 3.2" },
      { id: "mistral", name: "Mistral" },
    ],
  },
};
