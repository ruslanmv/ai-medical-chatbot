import { describe, it, expect } from "vitest";
import { PRESETS, resolvePreset, DEFAULT_PRESET } from "@/lib/providers/presets";

describe("presets", () => {
  it("exposes all six expected presets", () => {
    expect(Object.keys(PRESETS).sort()).toEqual(
      [
        "deep-reasoning",
        "free-best",
        "free-fastest",
        "free-flexible",
        "local",
        "ollabridge",
      ].sort(),
    );
  });

  it("defaults to free-best", () => {
    expect(DEFAULT_PRESET).toBe("free-best");
  });

  it("free-best pins Llama 3.3 70B via Groq and declares fallbacks", () => {
    const r = resolvePreset("free-best");
    expect(r.provider).toBe("hf");
    expect(r.model).toMatch(/Llama-3\.3-70B-Instruct:groq$/);
    expect(r.fallbacks?.length ?? 0).toBeGreaterThanOrEqual(3);
    // Fallback chain must be HF-only so a single HF_TOKEN unlocks it all
    for (const f of r.fallbacks ?? []) {
      expect(f.provider).toBe("hf");
    }
  });

  it("free-fastest is pinned with no fallback (pure latency)", () => {
    const r = resolvePreset("free-fastest");
    expect(r.model).toContain(":groq");
    expect(r.fallbacks).toBeUndefined();
  });

  it("deep-reasoning routes to DeepSeek", () => {
    const r = resolvePreset("deep-reasoning");
    expect(r.model).toMatch(/DeepSeek/i);
  });

  it("local uses the Ollama provider", () => {
    const r = resolvePreset("local");
    expect(r.provider).toBe("ollama");
  });

  it("ollabridge uses the OllaBridge provider", () => {
    const r = resolvePreset("ollabridge");
    expect(r.provider).toBe("ollabridge");
  });

  it("throws on an unknown preset", () => {
    expect(() => resolvePreset("nope" as any)).toThrow();
  });
});
