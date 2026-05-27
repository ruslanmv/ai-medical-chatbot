import { describe, it, expect } from "vitest";
import {
  deriveConversationState,
  type WireMessage,
} from "@/lib/medos-orchestrator/conversation-state";
import { buildDoctorSummary } from "@/lib/medos-orchestrator/doctor-summary-builder";
import { route } from "@/lib/medos-orchestrator/action-router";
import { classifyContextSwitch } from "@/lib/medos-orchestrator/context-switch-classifier";

/** Build a synthetic chest-pain consultation that ends right after the
 *  next_steps card appears — i.e. the exact moment the user clicks
 *  "Create doctor summary" in the screenshots. */
function chestPainTranscript(): WireMessage[] {
  return [
    { role: "user", content: "I have chest pain" },
    {
      role: "assistant",
      content:
        '[card:safety_check]\n{"kind":"safety_check","title":"Chest pain","question":"Are any of these happening now?","on_positive":"emergency","options":[' +
        '{"label":"Pain radiating to arm, jaw, or neck","value":"rf:cardio:radiation"},' +
        '{"label":"Shortness of breath","value":"rf:cardio:dyspnea"},' +
        '{"label":"Crushing or pressure-like pain","value":"rf:cardio:pressure"},' +
        '{"label":"None of these","value":"rf:none"},' +
        '{"label":"Not sure","value":"rf:unsure"}]}\n[/card]',
    },
    {
      role: "user",
      content:
        '<action type="select" value="rf:unsure" label="Not sure"/>\nNot sure',
    },
    {
      role: "assistant",
      content:
        '[card:intake]\n{"kind":"intake","title":"How long?","question":"How long has it been happening?","input_type":"chips","progress":0.5,"options":[' +
        '{"label":"Today","value":"selected:duration:today"},' +
        '{"label":"1\\u20133 days","value":"selected:duration:1-3d"}]}\n[/card]',
    },
    {
      role: "user",
      content:
        '<action type="select" value="selected:duration:1-3d" label="1–3 days"/>\n1–3 days',
    },
    {
      role: "assistant",
      content:
        '[card:intake]\n{"kind":"intake","title":"How severe?","question":"On a scale from 0 to 10, how severe is it?","input_type":"slider","progress":0.75,"slider":{"min":0,"max":10}}\n[/card]',
    },
    { role: "user", content: "Severity 1/10" },
    {
      role: "assistant",
      content:
        '[card:guidance]\n{"kind":"guidance","title":"Chest pain","care_level":"self-care","why":"Your answers do not show red-flag features.","what_now":["Rest","Note onset and triggers"],"seek_care_if":["Pain radiates to arm or jaw","Shortness of breath develops"],"sources":["WHO","CDC","NHS"]}\n[/card]\n' +
        '[card:next_steps]\n{"kind":"next_steps","title":"Next steps","actions":[{"label":"Create doctor summary","value":"action:doctor_summary","style":"primary"}]}\n[/card]',
    },
  ];
}

describe("deriveConversationState — chest-pain transcript", () => {
  it("picks the first user message as the chief complaint", () => {
    const s = deriveConversationState(chestPainTranscript());
    expect(s.chief_complaint).toBe("I have chest pain");
  });

  it("captures the active topic from the latest assistant card", () => {
    const s = deriveConversationState(chestPainTranscript());
    expect(s.active_topic).toBe("Chest pain");
  });

  it("records the red-flag option list as 'checked'", () => {
    const s = deriveConversationState(chestPainTranscript());
    expect(s.red_flags_checked).toEqual(
      expect.arrayContaining([
        "Pain radiating to arm, jaw, or neck",
        "Shortness of breath",
        "Crushing or pressure-like pain",
      ]),
    );
    // None of these / Not sure must NEVER appear in the checked list.
    expect(s.red_flags_checked).not.toContain("None of these");
    expect(s.red_flags_checked).not.toContain("Not sure");
  });

  it("treats 'Not sure' as no warning signs present", () => {
    const s = deriveConversationState(chestPainTranscript());
    expect(s.warning_signs_present).toEqual([]);
  });

  it("extracts the duration intake answer", () => {
    const s = deriveConversationState(chestPainTranscript());
    const dur = s.intake_answers.find((a) => /how\s*long/i.test(a.question));
    expect(dur?.answer).toBe("1–3 days");
  });

  it("extracts the severity number from the slider reply", () => {
    const s = deriveConversationState(chestPainTranscript());
    expect(s.severity).toBe(1);
  });

  it("snapshots the latest guidance card", () => {
    const s = deriveConversationState(chestPainTranscript());
    expect(s.guidance?.care_level).toBe("self-care");
    expect(s.guidance?.seek_care_if.length).toBeGreaterThan(0);
  });

  it("flags has_started_flow once a safety_check has been emitted", () => {
    const s = deriveConversationState(chestPainTranscript());
    expect(s.has_started_flow).toBe(true);
  });
});

describe("buildDoctorSummary", () => {
  it("turns the derived state into a doctor_summary card with real slots", () => {
    const s = deriveConversationState(chestPainTranscript());
    const card = buildDoctorSummary(s);
    expect(card.kind).toBe("doctor_summary");
    expect(card.chief_complaint).toBe("I have chest pain");
    expect(card.duration).toBe("1–3 days");
    expect(card.severity).toBe(1);
    expect(card.warning_signs_present).toEqual([]);
    expect(card.current_guidance.startsWith("SELF-CARE")).toBe(true);
    expect(card.seek_care_if.length).toBeGreaterThan(0);
    expect(card.generated_at).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it("never fills warning_signs_present with the 'None of these' option", () => {
    const s = deriveConversationState(chestPainTranscript());
    const card = buildDoctorSummary(s);
    expect(card.warning_signs_present).not.toContain("None of these");
    expect(card.warning_signs_present).not.toContain("Not sure");
  });
});

describe("action-router — doctor_summary never loops to chest-pain flow", () => {
  it("returns a handled doctor_summary SSE without forwarding to the LLM", () => {
    const s = deriveConversationState(chestPainTranscript());
    const decision = route({ type: "doctor_summary" }, s);
    expect(decision.kind).toBe("handled");
    if (decision.kind !== "handled") return;
    expect(decision.sse).toContain("[card:doctor_summary]");
    // The card JSON is nested inside the SSE envelope's `delta.content`
    // string, so its quotes appear escaped in the wire frame.
    expect(decision.sse).toContain('\\"chief_complaint\\":\\"I have chest pain\\"');
    expect(decision.sse).toContain('\\"duration\\":\\"1–3 days\\"');
  });

  it("rejects doctor_summary on a cold conversation gracefully", () => {
    const s = deriveConversationState([
      { role: "user", content: "hi" },
    ]);
    const decision = route({ type: "doctor_summary" }, s);
    expect(decision.kind).toBe("reject");
    if (decision.kind !== "reject") return;
    expect(decision.sse).toMatch(/nothing to summarise/i);
  });

  it("forwards select/chip clicks to the LLM", () => {
    const s = deriveConversationState(chestPainTranscript());
    const decision = route(
      { type: "select", value: "rf:cardio:radiation", label: "Radiation" },
      s,
    );
    expect(decision.kind).toBe("forward");
  });
});

describe("classifyContextSwitch", () => {
  it("flags adult chest pain → child fever as a likely switch", () => {
    const s = deriveConversationState(chestPainTranscript());
    const hint = classifyContextSwitch("My child has a fever", s);
    expect(hint.likelihood).toBeGreaterThan(0.5);
    expect(hint.new_patient_likely).toBe(true);
  });

  it("does not flag a chip selection as a switch", () => {
    const s = deriveConversationState(chestPainTranscript());
    const hint = classifyContextSwitch(
      '<action type="select" value="rf:cardio:radiation" label="Radiation"/>',
      s,
    );
    expect(hint.likelihood).toBeLessThan(0.2);
  });

  it("does not flag a continuation of the same symptom", () => {
    const s = deriveConversationState(chestPainTranscript());
    const hint = classifyContextSwitch("Now the pain moved to my arm", s);
    // pain keyword matches "Chest pain" topic → suppressed
    expect(hint.likelihood).toBeLessThan(0.5);
  });

  it("returns zero likelihood when there's no prior flow", () => {
    const s = deriveConversationState([{ role: "user", content: "hi" }]);
    const hint = classifyContextSwitch("My head hurts", s);
    expect(hint.likelihood).toBe(0);
  });
});
