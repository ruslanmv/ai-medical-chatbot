import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateCard, validateOrDrop } from "@/lib/medical-flow/validator";

describe("validateCard — schema", () => {
  it("accepts a well-formed safety_check", () => {
    const result = validateCard({
      kind: "safety_check",
      title: "Chest pain",
      question: "Are any of these happening now?",
      on_positive: "emergency",
      options: [
        { label: "Pressure or crushing chest pain", value: "rf:cardio:pressure" },
        { label: "Pain radiating to arm or jaw", value: "rf:cardio:radiation" },
        { label: "None of these", value: "rf:none", style: "ghost" },
        { label: "Not sure", value: "rf:unsure", style: "ghost" },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects an intake card with input_type=chips but no options", () => {
    const result = validateCard({
      kind: "intake",
      title: "Where is the pain?",
      question: "Where exactly do you feel it?",
      input_type: "chips",
      progress: 0.5,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects guidance with an empty seek_care_if list", () => {
    const result = validateCard({
      kind: "guidance",
      title: "Low back pain",
      care_level: "self-care",
      why: "Likely musculoskeletal.",
      what_now: ["Rest"],
      seek_care_if: [],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects unknown card kinds", () => {
    const result = validateCard({ kind: "bogus", title: "x" });
    expect(result.ok).toBe(false);
  });
});

describe("validateCard — safety repairs", () => {
  // The validator logs repairs at console.debug; silence it for the
  // assertion suite so test output stays clean.
  beforeEach(() => {
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("appends rf:none and rf:unsure to a safety_check that omits them", () => {
    const result = validateCard({
      kind: "safety_check",
      title: "Chest pain",
      question: "Are any of these happening?",
      on_positive: "emergency",
      options: [
        { label: "Pressure or crushing", value: "rf:cardio:pressure" },
        { label: "Radiation to arm", value: "rf:cardio:radiation" },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const values = (result.card as any).options.map((o: any) => o.value);
    expect(values).toContain("rf:none");
    expect(values).toContain("rf:unsure");
    expect(result.repaired.length).toBeGreaterThan(0);
  });

  it("rewrites emergency_number to match the user's country", () => {
    const result = validateCard(
      {
        kind: "emergency",
        headline: "This may be an emergency.",
        reason: "Chest pain with radiation.",
        emergency_number: "911",
        actions: [
          { label: "Call 911", value: "tel:911", style: "danger", icon: "phone" },
        ],
      },
      { country: "IT" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((result.card as any).emergency_number).toBe("112");
    const action = (result.card as any).actions[0];
    expect(action.label).toBe("Call 112");
    expect(action.value).toBe("tel:112");
  });

  it("leaves emergency_number alone when it already matches the locale", () => {
    const result = validateCard(
      {
        kind: "emergency",
        headline: "This may be an emergency.",
        reason: "Chest pain with radiation.",
        emergency_number: "911",
        actions: [
          { label: "Call 911", value: "tel:911", style: "danger", icon: "phone" },
        ],
      },
      { country: "US" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((result.card as any).emergency_number).toBe("911");
    expect(result.repaired).toHaveLength(0);
  });

  it("scrubs drug names that cross-react with declared allergies from guidance", () => {
    const result = validateCard(
      {
        kind: "guidance",
        title: "Throat infection",
        care_level: "routine",
        why: "Common bacterial cause.",
        what_now: ["Take amoxicillin as prescribed"],
        seek_care_if: ["Symptoms worsen"],
        sources: ["WHO"],
      },
      { allergies: ["penicillin"] },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((result.card as any).what_now[0]).not.toContain("amoxicillin");
    expect((result.card as any).what_now[0]).toMatch(/cross-reacts/);
  });

  it("appends a default sources chip to a guidance card that omits it", () => {
    const result = validateCard({
      kind: "guidance",
      title: "Low back pain",
      care_level: "self-care",
      why: "Likely musculoskeletal.",
      what_now: ["Rest"],
      seek_care_if: ["Pain persists"],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((result.card as any).sources).toEqual(["WHO", "CDC", "NHS"]);
  });

  it("fills doctor_summary.generated_at when missing or invalid", () => {
    const before = Date.now();
    const result = validateCard({
      kind: "doctor_summary",
      chief_complaint: "Chest pain",
      duration: "1-3 days",
      red_flags_checked: ["Radiation to arm"],
      warning_signs_present: [],
      current_guidance: "Routine evaluation reasonable.",
      seek_care_if: ["Shortness of breath"],
      generated_at: "not-a-date",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ts = Date.parse((result.card as any).generated_at);
    expect(ts).toBeGreaterThanOrEqual(before);
  });
});

describe("validateOrDrop", () => {
  beforeEach(() => {
    vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null for fatally-invalid cards", () => {
    expect(validateOrDrop({ kind: "bogus" })).toBeNull();
  });

  it("returns the (possibly repaired) card for valid input", () => {
    const card = validateOrDrop({
      kind: "greeting",
      text: "Hi, how can I help?",
      actions: [],
    });
    expect(card).not.toBeNull();
    expect(card?.kind).toBe("greeting");
  });
});
