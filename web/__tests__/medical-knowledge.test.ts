import { describe, it, expect } from "vitest";
import {
  buildMedicalSystemPrompt,
  defaultUnits,
  GLOBAL_SOURCES,
  RED_FLAGS,
} from "@/lib/medical-knowledge";

describe("medical-knowledge", () => {
  it("defaultUnits() returns imperial for US/LR/MM and metric elsewhere", () => {
    expect(defaultUnits("US")).toBe("imperial");
    expect(defaultUnits("LR")).toBe("imperial");
    expect(defaultUnits("MM")).toBe("imperial");
    expect(defaultUnits("FR")).toBe("metric");
    expect(defaultUnits("JP")).toBe("metric");
    expect(defaultUnits("BR")).toBe("metric");
  });

  it("buildMedicalSystemPrompt injects the caller's language, country, and emergency number", () => {
    const prompt = buildMedicalSystemPrompt({
      country: "JP",
      language: "ja",
      emergencyNumber: "119",
    });
    expect(prompt).toContain("日本語");
    expect(prompt).toContain("JP");
    expect(prompt).toContain("119");
    expect(prompt).toContain("metric");
  });

  it("buildMedicalSystemPrompt uses imperial units for US", () => {
    const prompt = buildMedicalSystemPrompt({
      country: "US",
      language: "en",
      emergencyNumber: "911",
    });
    expect(prompt).toContain("imperial");
    expect(prompt).toContain("911");
  });

  it("allows explicit units override", () => {
    const prompt = buildMedicalSystemPrompt({
      country: "US",
      language: "en",
      emergencyNumber: "911",
      units: "metric",
    });
    expect(prompt).toContain("metric");
    expect(prompt).not.toMatch(/Use the imperial measurement/);
  });

  it("references the main authoritative sources", () => {
    expect(GLOBAL_SOURCES.join(" ")).toMatch(/WHO|World Health Organization/);
    expect(GLOBAL_SOURCES.join(" ")).toMatch(/CDC/);
    expect(GLOBAL_SOURCES.join(" ")).toMatch(/NHS/);
    expect(GLOBAL_SOURCES.join(" ")).toMatch(/ICD-11/);
  });

  it("exposes red-flag clusters for every major category", () => {
    expect(Object.keys(RED_FLAGS)).toEqual(
      expect.arrayContaining([
        "cardiac",
        "neurological",
        "respiratory",
        "obstetric",
        "pediatric",
        "mentalHealth",
        "other",
      ]),
    );
  });
});
