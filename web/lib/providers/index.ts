import { chatOpenAI, streamOpenAI } from "./openai";
import { chatGemini, streamGemini } from "./gemini";
import { chatAnthropic, streamAnthropic } from "./anthropic";
import { chatHF, streamHF } from "./hf-router";
import { chatOllaBridge, streamOllaBridge } from "./ollabridge";
import { chatOllama, streamOllama } from "./ollama";
import { resolvePreset, DEFAULT_PRESET, type ResolvedPreset } from "./presets";
import type { Provider, Preset, ChatMessage, MedicalContextPayload } from "../types";
import type { MedicalContext } from "./system-prompt";
import type { SupportedLanguage } from "../i18n";

type CallArgs = {
  provider?: Provider;
  model?: string;
  preset?: Preset;
  apiKey?: string;
  userHfToken?: string;
  context?: MedicalContextPayload;
  messages: ChatMessage[];
};

function toMedicalContext(
  payload: MedicalContextPayload | undefined,
): MedicalContext | undefined {
  if (!payload) return undefined;
  return {
    country: payload.country,
    language: payload.language as SupportedLanguage,
    emergencyNumber: payload.emergencyNumber,
    units: payload.units,
  };
}

/** Canonical default model for each provider in BYO (explicit) mode. */
const DEFAULT_MODELS: Record<Provider, string> = {
  hf: "meta-llama/Llama-3.3-70B-Instruct",
  ollabridge: "free-best",
  ollama: "qwen2.5:7b",
  openai: "gpt-4o-mini",
  gemini: "gemini-1.5-flash",
  claude: "claude-3-5-haiku-latest",
};

/** Resolve the incoming request to a concrete execution plan. */
function plan(
  args: CallArgs,
): ResolvedPreset & { apiKey?: string; userHfToken?: string } {
  if (args.provider) {
    return {
      provider: args.provider,
      model: args.model || DEFAULT_MODELS[args.provider],
      label: `${args.provider}:${args.model || DEFAULT_MODELS[args.provider]}`,
      apiKey: args.apiKey,
      userHfToken: args.userHfToken,
    };
  }
  const resolved = resolvePreset(args.preset || DEFAULT_PRESET);
  return { ...resolved, apiKey: args.apiKey, userHfToken: args.userHfToken };
}

async function callOnce(
  provider: Provider,
  model: string,
  messages: ChatMessage[],
  apiKey?: string,
  userHfToken?: string,
  context?: MedicalContext,
): Promise<string> {
  switch (provider) {
    case "hf":
      return chatHF({ apiKey: userHfToken, model, messages, context });
    case "ollabridge":
      return chatOllaBridge({ apiKey, model, messages, context });
    case "ollama":
      return chatOllama({ apiKey, model, messages, context });
    case "openai":
      return chatOpenAI({ apiKey: apiKey || "", messages, context });
    case "gemini":
      return chatGemini({ apiKey: apiKey || "", messages, context });
    case "claude":
      return chatAnthropic({ apiKey: apiKey || "", messages, context });
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function* streamOnce(
  provider: Provider,
  model: string,
  messages: ChatMessage[],
  apiKey?: string,
  userHfToken?: string,
  context?: MedicalContext,
): AsyncGenerator<string, void, unknown> {
  switch (provider) {
    case "hf":
      yield* streamHF({ apiKey: userHfToken, model, messages, context });
      return;
    case "ollabridge":
      yield* streamOllaBridge({ apiKey, model, messages, context });
      return;
    case "ollama":
      yield* streamOllama({ apiKey, model, messages, context });
      return;
    case "openai":
      yield* streamOpenAI({ apiKey: apiKey || "", messages, context });
      return;
    case "gemini":
      yield* streamGemini({ apiKey: apiKey || "", messages, context });
      return;
    case "claude":
      yield* streamAnthropic({ apiKey: apiKey || "", messages, context });
      return;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

function isTransient(err: any): boolean {
  const status = err?.status || err?.response?.status;
  if (status && (status === 429 || status >= 500)) return true;
  const msg = String(err?.message || "").toLowerCase();
  return (
    msg.includes("rate limit") ||
    msg.includes("timeout") ||
    msg.includes("overloaded") ||
    msg.includes("503")
  );
}

export async function chatWithProvider(args: CallArgs): Promise<string> {
  const p = plan(args);
  const ctx = toMedicalContext(args.context);
  const chain = [
    { provider: p.provider, model: p.model },
    ...(p.fallbacks || []),
  ];
  let lastErr: unknown;
  for (const step of chain) {
    try {
      return await callOnce(
        step.provider,
        step.model,
        args.messages,
        p.apiKey,
        p.userHfToken,
        ctx,
      );
    } catch (err) {
      lastErr = err;
      if (!isTransient(err)) throw err;
    }
  }
  throw lastErr ?? new Error("All providers failed");
}

export async function* streamWithProvider(
  args: CallArgs,
): AsyncGenerator<string, void, unknown> {
  const p = plan(args);
  const ctx = toMedicalContext(args.context);
  const chain = [
    { provider: p.provider, model: p.model },
    ...(p.fallbacks || []),
  ];
  let lastErr: unknown;
  for (const step of chain) {
    try {
      let yielded = false;
      for await (const chunk of streamOnce(
        step.provider,
        step.model,
        args.messages,
        p.apiKey,
        p.userHfToken,
        ctx,
      )) {
        yielded = true;
        yield chunk;
      }
      if (yielded) return;
    } catch (err) {
      lastErr = err;
      if (!isTransient(err)) throw err;
    }
  }
  throw lastErr ?? new Error("All providers failed");
}

export async function verifyConnection(args: CallArgs): Promise<{
  success: boolean;
  error?: string;
  label?: string;
}> {
  try {
    const p = plan(args);
    await callOnce(
      p.provider,
      p.model,
      [{ role: "user", content: "Hi" }],
      p.apiKey,
      p.userHfToken,
      toMedicalContext(args.context),
    );
    return { success: true, label: p.label };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Connection failed",
    };
  }
}

export { resolvePreset, DEFAULT_PRESET };
