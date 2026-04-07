import type { Preset, Provider } from "../types";

/**
 * A resolved preset: one primary (provider, model) plus an optional
 * ordered fallback chain used when the primary returns 429 / 5xx.
 *
 * For HuggingFace Inference Providers we encode the routed provider
 * as a suffix on the model id (e.g. `meta-llama/Llama-3.3-70B-Instruct:sambanova`)
 * — this is the router's official pinning syntax.
 *
 * All models verified working on free tier: 2026-04-07.
 */
export type ResolvedPreset = {
  provider: Provider;
  model: string;
  fallbacks?: { provider: Provider; model: string }[];
  label: string;
};

const HF_DEFAULT_MODEL =
  process.env.HF_DEFAULT_MODEL || "meta-llama/Llama-3.3-70B-Instruct";

export const PRESETS: Record<Preset, ResolvedPreset> = {
  /**
   * Best quality on the free tier. Llama 3.3 70B is the primary,
   * with a deep fallback chain across 8 models for maximum uptime.
   */
  "free-best": {
    provider: "hf",
    model: `${HF_DEFAULT_MODEL}:sambanova`,
    fallbacks: [
      { provider: "hf", model: `${HF_DEFAULT_MODEL}:together` },
      { provider: "hf", model: HF_DEFAULT_MODEL },       // auto-route
      { provider: "hf", model: "Qwen/Qwen2.5-72B-Instruct" },
      { provider: "hf", model: "Qwen/Qwen3-235B-A22B" },
      { provider: "hf", model: "google/gemma-3-27b-it" },
      { provider: "hf", model: "meta-llama/Llama-3.1-70B-Instruct" },
      { provider: "hf", model: "Qwen/Qwen3-32B" },
    ],
    label: "Llama 3.3 70B (best quality, deep fallback)",
  },

  /** Pure speed — pinned to SambaNova for sub-second TTFT. */
  "free-fastest": {
    provider: "hf",
    model: `${HF_DEFAULT_MODEL}:sambanova`,
    fallbacks: [
      { provider: "hf", model: `${HF_DEFAULT_MODEL}:together` },
      { provider: "hf", model: "Qwen/Qwen3-30B-A3B" },  // MoE, very fast
    ],
    label: "Llama 3.3 70B · SambaNova (fastest)",
  },

  /** Highest availability — diverse models across providers. */
  "free-flexible": {
    provider: "hf",
    model: "Qwen/Qwen2.5-72B-Instruct",
    fallbacks: [
      { provider: "hf", model: HF_DEFAULT_MODEL },
      { provider: "hf", model: "Qwen/Qwen3-235B-A22B" },
      { provider: "hf", model: "google/gemma-3-27b-it" },
      { provider: "hf", model: "deepseek-ai/DeepSeek-V3-0324" },
      { provider: "hf", model: "Qwen/Qwen3-32B" },
      { provider: "hf", model: "meta-llama/Llama-3.1-70B-Instruct" },
    ],
    label: "Qwen 2.5 72B (highest availability)",
  },

  /** Deep reasoning — chain-of-thought models. */
  "deep-reasoning": {
    provider: "hf",
    model: "deepseek-ai/DeepSeek-R1",
    fallbacks: [
      { provider: "hf", model: "deepseek-ai/DeepSeek-V3-0324" },
      { provider: "hf", model: "Qwen/Qwen3-235B-A22B" },
      { provider: "hf", model: "Qwen/Qwen3-32B" },
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
