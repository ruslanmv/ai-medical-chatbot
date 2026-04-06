import type { Preset, Provider } from "../types";

/**
 * A resolved preset: one primary (provider, model) plus an optional
 * ordered fallback chain used when the primary returns 429 / 5xx.
 *
 * For HuggingFace Inference Providers we encode the routed provider
 * as a suffix on the model id (e.g. `meta-llama/Llama-3.3-70B-Instruct:groq`)
 * — this is the router's official pinning syntax.
 */
export type ResolvedPreset = {
  provider: Provider;
  model: string;
  /** Additional (provider, model) candidates to try on failure, in order. */
  fallbacks?: { provider: Provider; model: string }[];
  /** Human-readable label, used in logs & telemetry. */
  label: string;
};

const HF_DEFAULT_MODEL =
  process.env.HF_DEFAULT_MODEL || "meta-llama/Llama-3.3-70B-Instruct";

export const PRESETS: Record<Preset, ResolvedPreset> = {
  /**
   * Best quality on the free tier. Llama 3.3 70B via Groq is the
   * sweet spot (quality + sub-second TTFT). Falls back across the
   * other free HF-Inference providers before giving up.
   */
  "free-best": {
    provider: "hf",
    model: `${HF_DEFAULT_MODEL}:groq`,
    fallbacks: [
      { provider: "hf", model: `${HF_DEFAULT_MODEL}:cerebras` },
      { provider: "hf", model: `${HF_DEFAULT_MODEL}:sambanova` },
      { provider: "hf", model: `${HF_DEFAULT_MODEL}:together` },
      { provider: "hf", model: HF_DEFAULT_MODEL }, // auto-route
    ],
    label: "Llama 3.3 70B · Groq (free, best quality)",
  },

  /** Pure latency play — pin to Groq, no fallback. */
  "free-fastest": {
    provider: "hf",
    model: `${HF_DEFAULT_MODEL}:groq`,
    label: "Llama 3.3 70B · Groq (fastest)",
  },

  /** Let HF pick any free backend. Highest availability. */
  "free-flexible": {
    provider: "hf",
    model: "Qwen/Qwen2.5-72B-Instruct",
    fallbacks: [
      { provider: "hf", model: HF_DEFAULT_MODEL },
      { provider: "hf", model: "mistralai/Mistral-Small-24B-Instruct-2501" },
    ],
    label: "Qwen 2.5 72B (flexible routing)",
  },

  /** Chain-of-thought / reasoning preset. */
  "deep-reasoning": {
    provider: "hf",
    model: "deepseek-ai/DeepSeek-R1",
    fallbacks: [
      { provider: "hf", model: "deepseek-ai/DeepSeek-V3" },
    ],
    label: "DeepSeek R1 (deep reasoning)",
  },

  /** Server-side Ollama — always available if OLLAMA_BASE_URL is set. */
  local: {
    provider: "ollama",
    model: process.env.OLLAMA_DEFAULT_MODEL || "qwen2.5:7b",
    label: "Qwen 2.5 7B (local Ollama)",
  },

  /** Delegate to a user-supplied OllaBridge gateway. */
  ollabridge: {
    provider: "ollabridge",
    model: process.env.OLLABRIDGE_DEFAULT_MODEL || "free-best",
    label: "OllaBridge (custom gateway)",
  },
};

export function resolvePreset(preset: Preset): ResolvedPreset {
  const r = PRESETS[preset];
  if (!r) throw new Error(`Unknown preset: ${preset}`);
  return r;
}

export const DEFAULT_PRESET: Preset =
  (process.env.DEFAULT_PRESET as Preset) || "free-best";
