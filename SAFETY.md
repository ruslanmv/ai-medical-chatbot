# Safety

MedOS — including the live AI Medical Chatbot, the MedOS Family / Connect / Classify / Pathogen / Research design layers, and any future module — operates under a single, non-negotiable safety contract:

> **MedOS is not a doctor.**
> MedOS does not diagnose, prescribe, or replace emergency services. It helps you understand symptoms, ask better questions, and decide when to seek professional care.

This document is the single source of truth that every contributor and every module must conform to.

## Hard rules

These rules cannot be relaxed by any model, prompt, or contributor.

1. **No diagnosis.** MedOS never tells a user "you have X." It can describe possibilities and signal urgency.
2. **No prescription, no dose changes.** MedOS never instructs a user to start, stop, or change a medication or its dose.
3. **No replacement of emergency services.** When a red flag fires, the response routes to the local emergency number for the user's region. The model cannot soften or override this.
4. **No "you don't need a doctor."** Reassurance phrases that imply care isn't needed are blocked at the output filter.
5. **No PHI in logs by default.** Audit logs record metadata (risk class, rule fires, model versions, latency, request id) — not raw symptoms, names, files, or medical history.

## How safety is enforced

MedOS uses a **safety sandwich**:

```text
User message
   ↓
Pre-LLM red-flag classifier (deterministic)
   ↓
Risk class: R0–R5
   ↓
LLM response generation, only if allowed
   ↓
Post-LLM safety filter (deterministic)
   ↓
Final user-facing answer
```

The pre-check and the post-filter are **rule-based code**, not prompts. They cannot be jailbroken by clever input.

Implementation lives in [`9-HuggingFace-Global/lib/safety/`](./9-HuggingFace-Global/lib/safety/).

## Red-flag triage

The deterministic pre-check detects, at minimum, the categories below. The full rule list is in `9-HuggingFace-Global/lib/safety/red-flags.ts`.

| Category | Sample signals | Default risk class |
|---|---|---|
| Cardiovascular emergency | chest pain, crushing pressure, jaw pain with shortness of breath | **R5** |
| Stroke | facial droop, sudden weakness, slurred speech, "FAST" symptoms | **R5** |
| Respiratory emergency | severe shortness of breath, blue lips, choking | **R5** |
| Anaphylaxis | known allergen + throat swelling, hives + breathing trouble | **R5** |
| Severe bleeding | uncontrolled bleeding, large blood loss | **R5** |
| Loss of consciousness | fainting, unresponsive person | **R5** |
| Suicidal ideation / self-harm | "want to end my life", explicit plans | **R5** + crisis line |
| Pregnancy emergency | bleeding in pregnancy, severe abdominal pain in pregnancy, decreased fetal movement | **R4** |
| Infant fever | < 3 months old + ≥ 38.0 °C | **R4** |
| Poisoning / overdose | ingested unknown substance, intentional overdose | **R5** + poison-control line |
| Severe pediatric symptoms | unresponsive child, repeated seizures, dehydration signs | **R4–R5** |

When any of these fires, the model is **not the source of truth** for the response. A template answer + the local emergency number is returned, optionally with a brief LLM-generated empathic preamble that the post-filter then re-validates.

## Risk classes (R0–R5)

```text
R0 — General wellness / low risk
R1 — Mild symptoms, self-care guidance allowed
R2 — Needs non-urgent professional care
R3 — Urgent care recommended
R4 — Emergency care recommended
R5 — Immediate emergency / crisis handling
```

The model is allowed to *explain* a risk class in plain language but cannot *downgrade* it.

## What the model is allowed to do

- Describe possible causes for a symptom in general terms.
- Suggest **what kind of clinician** might help (GP, ER, dentist, pediatrician).
- Help organize symptom history for a real consultation.
- Translate between languages while preserving the safety posture.
- Refuse politely and route to a clinician when uncertain.

## What the model is never allowed to do

- Diagnose.
- Prescribe.
- Recommend a specific dose, off-label use, or self-medication.
- Override an active red-flag rule.
- Tell a user "you don't need to see a doctor."
- Process medical advice for a third party in a way that bypasses consent (the "diagnose my partner" trap).

## Vulnerable populations

The post-filter is stricter when input mentions:

- Children, especially infants < 3 months.
- Pregnant or recently postpartum users.
- Mental-health crises.
- Elderly with multiple conditions.

Phrasing for these audiences is conservative by default; the bar to reach R0/R1 is higher.

## Where to read further

- `9-HuggingFace-Global/lib/safety/` — runtime engine.
- `tests/safety/golden_prompts.jsonl` — clinician-reviewable test set.
- `15-MedOS-Classify/02-mcp/MCP_TOOL_CONTRACTS.md` — the multi-head triage MCP design.
- `15-MedOS-Classify/06-evaluation/EVALUATION.md` — evaluation gates and subgroup metrics.
- `15-MedOS-Classify/07-safety/SAFETY_AND_COMPLIANCE.md` — extended safety policy.
- `13-MedOS-Family/08-security/PRIVACY_AND_SAFETY.md` — family / consent model.
- `THREAT_MODEL.md` — assets, threats, mitigations.
- `GOVERNANCE.md` — who can approve safety-sensitive changes.

## Reporting a safety issue

If you find a way for MedOS to give unsafe medical advice — including jailbreaks of the safety sandwich — please report it through the channel in [`SECURITY.md`](./SECURITY.md) **rather than opening a public issue**. Safety vulnerabilities are treated like security vulnerabilities: coordinated disclosure first.
