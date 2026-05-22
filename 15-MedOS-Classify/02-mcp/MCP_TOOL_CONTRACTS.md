# MedOS Classify — MCP Tool Contracts

MedOS Classify ships as an **MCP (Model Context Protocol) server** so any MCP-aware agent — Claude, Claude Code, the existing MedOS chatbot, or a third-party agent — can call it as a tool. The server exposes five tools.

```text
extract_symptoms        free text → structured features
red_flag_check          deterministic safety rules
classify_illness        the multi-head clinical model
recommend_next_data     what to ask next to reduce uncertainty
explain_result          clinician-style and patient-style explanations
```

All tool inputs/outputs are validated with JSON Schema (Zod in TypeScript, Pydantic in Python). Every call is audit-logged with input hash, model versions, rule fires, and output hash.

---

## 1. `extract_symptoms`

Convert free-form patient/parent/clinician text into structured clinical features.

### Input

```json
{
  "text": "Baby 6 months, fever 5 days, cough, runny nose, red eyes, mucus in stool, breastfeeding ok, no blue lips.",
  "language": "mixed_it_en"
}
```

### Output

```json
{
  "age_months": 6,
  "weight_kg": null,
  "fever_days": 5,
  "max_temp_c": null,
  "current_temp_c": null,
  "cough": true,
  "runny_nose": true,
  "red_eyes": true,
  "mucus_stool": true,
  "feeding_status": "normal",
  "blue_lips": false,
  "breathing_difficulty": false,
  "source_confidence": {
    "age_months": 0.99,
    "fever_days": 0.95,
    "feeding_status": 0.82
  }
}
```

The `source_confidence` map is a per-field score from the extractor. Fields not mentioned in the input are left `null`, never invented.

### Languages

MVP: English, Italian, mixed code-switching (the trained extractor must accept Italian medical phrasing because MedOS's primary user base is Italian).

---

## 2. `red_flag_check`

**Deterministic and rule-based — never purely ML.** This is the safety floor.

### Input

```json
{
  "patient": { "age_months": 2, "weight_kg": 5.0, "sex": "female" },
  "symptoms": {
    "current_temp_c": 38.4,
    "blue_lips": false,
    "breathing_difficulty": false,
    "wet_diapers_24h": 5
  }
}
```

### Output

```json
{
  "level": "urgent",
  "fired_rules": [
    {
      "id": "infant_lt_3mo_fever_ge_38",
      "description": "Infant under 3 months with fever ≥ 38°C requires urgent evaluation.",
      "severity": "urgent"
    }
  ],
  "override_triage": "urgent_care_or_emergency"
}
```

### Rule examples

```text
baby <3 months + fever >=38°C       → urgent
blue lips                            → emergency
breathing difficulty / retractions   → emergency
few wet diapers / dehydration signs  → urgent
fever >=5 days in a child            → same-day clinician
sudden severe headache + fever       → urgent
neck stiffness in a child            → urgent
non-blanching rash                   → emergency
prolonged seizure                    → emergency
oxygen saturation < 92%              → urgent / emergency
```

The agent **must not** override `override_triage` from this tool. Classify will refuse to downgrade triage below what `red_flag_check` returned.

---

## 3. `classify_illness`

The main classification call. Combines the symptom extractor, the calibrated risk model, the rule engine, and the explanation layer.

### Input

```json
{
  "patient": {
    "age_months": 6,
    "weight_kg": 7.2,
    "sex": "male"
  },
  "symptoms_text": "Optional free text",
  "structured_symptoms": {
    "fever_days": 5,
    "max_temp_c": 38.9,
    "current_temp_c": 38.1,
    "cough": true,
    "runny_nose": true,
    "red_eyes": true,
    "mucus_stool": true,
    "feeding_status": "normal",
    "breathing_difficulty": false,
    "blue_lips": false
  },
  "vitals": {
    "respiratory_rate": 36,
    "oxygen_saturation": 98,
    "heart_rate": 145
  },
  "context": {
    "country": "IT",
    "language": "it",
    "setting": "home"
  }
}
```

`symptoms_text` and `structured_symptoms` are both optional, but at least one must be provided. If both are present, structured fields take precedence; the extractor only fills gaps.

### Output

```json
{
  "status": "success",
  "model_versions": {
    "extractor": "medos-classify-symptom-extractor@1.2.0",
    "risk": "medos-classify-risk-model@0.8.3",
    "rules": "redflags@2026-05-01"
  },
  "triage": "same_day_clinician_review",
  "infection_type_probabilities": {
    "viral": 0.61,
    "bacterial": 0.27,
    "fungal": 0.01,
    "parasitic": 0.00,
    "non_infectious": 0.05,
    "allergic": 0.04,
    "traumatic": 0.00,
    "unknown": 0.02
  },
  "body_system_probabilities": {
    "upper_respiratory": 0.58,
    "lower_respiratory": 0.10,
    "ENT_ear": 0.18,
    "urinary": 0.05,
    "gastrointestinal": 0.06,
    "other": 0.03
  },
  "top_conditions": [
    { "condition": "viral upper respiratory infection", "probability": 0.62, "confidence": "medium" },
    { "condition": "possible bacterial otitis media", "probability": 0.18, "confidence": "low" },
    { "condition": "possible urinary tract infection", "probability": 0.09, "confidence": "low" }
  ],
  "red_flags": [],
  "uncertainty": "moderate",
  "recommended_next_steps": [
    "clinician exam today",
    "consider urine testing if fever persists",
    "check oxygen and lung exam if cough continues"
  ],
  "disclaimer": "This is clinical decision support and does not replace a clinician."
}
```

### Hard rules at this boundary

- The triage value is the **maximum** of the model triage and the rule-engine triage. It can be escalated by rules but never de-escalated.
- If `uncertainty` is `high`, triage is at minimum `call_clinician_24h`.
- If any red flag fires with `severity = emergency`, triage is forced to `urgent_care_or_emergency`.
- If essential inputs are missing (e.g., infant age unknown), `status = "insufficient_data"` and triage defaults to `call_clinician_24h`.

---

## 4. `recommend_next_data`

Tells the agent which one or two questions would most reduce uncertainty.

### Input

The same payload as `classify_illness`, plus the previous classification (optional).

### Output

```json
{
  "next_questions": [
    "How many wet diapers in the last 24 hours?",
    "Any chest retractions or fast breathing?",
    "Was a urine test done?",
    "Any ear pulling or crying when lying down?"
  ],
  "why": "These questions reduce uncertainty between viral URI, UTI, otitis media, and pneumonia.",
  "expected_information_gain": {
    "wet_diapers_24h": 0.34,
    "retractions": 0.28,
    "urine_test_done": 0.22,
    "ear_pain": 0.16
  }
}
```

The agent picks the top 1–2, asks the user, then calls `classify_illness` again with the refined input.

---

## 5. `explain_result`

Generates two parallel explanations: one for clinicians (technical), one for lay users (plain language).

### Input

```json
{
  "classification": { /* output of classify_illness */ },
  "audience": "both"
}
```

`audience` is `"clinician"`, `"lay"`, or `"both"`.

### Output

```json
{
  "clinician": [
    "Pattern consistent with viral URI: cough + rhinorrhea + conjunctivitis + sick contact.",
    "Bacterial coinfection probability raised by fever ≥ 5 days.",
    "UTI cannot be excluded in a 6-month-old without urinalysis; consider clean-catch.",
    "Pneumonia less likely without tachypnea, retractions, or hypoxia, but auscultation indicated if symptoms progress."
  ],
  "lay": [
    "The pattern looks most like a regular viral cold.",
    "Because the fever has lasted about 5 days, the doctor should check today.",
    "A urine test is worth asking about — at this age it's a routine step when fever lasts.",
    "Call right away if breathing becomes difficult, lips turn blue, or there are very few wet diapers."
  ],
  "evidence_pointers": [
    {
      "claim": "Fever ≥ 5 days warrants clinician review in a child.",
      "guideline": "AAP / NICE pediatric fever guidance",
      "retrieved_via": "medos-classify-rag"
    }
  ]
}
```

`evidence_pointers` come from the retrieval layer over trusted guidelines (see `03-models/MODEL_ARCHITECTURE.md`). They are advisory, never the basis of the diagnosis itself.

---

## 6. Reference TypeScript signatures

```ts
server.tool("classify_illness", {
  patient: z.object({
    age_months: z.number().optional(),
    age_years:  z.number().optional(),
    weight_kg:  z.number().optional(),
    sex: z.enum(["male", "female", "unknown"]).optional()
  }),
  symptoms_text: z.string().optional(),
  structured_symptoms: z.record(z.any()).optional(),
  vitals: z.record(z.any()).optional(),
  context: z.object({
    country:  z.string().optional(),
    language: z.string().optional(),
    setting:  z.enum(["home", "clinic", "emergency"]).optional()
  }).optional()
}, async (input) => {
  const extracted   = await symptomExtractor(input);
  const redFlags    = redFlagEngine(input, extracted);
  const risk        = await riskModel.predict(input, extracted);
  const triage      = mergeTriage(risk.triage, redFlags.override_triage);
  const explanation = await explain(risk, redFlags);
  await audit.log({ input, extracted, redFlags, risk, triage });
  return { extracted, redFlags, risk, triage, explanation };
});
```

---

## 7. Audit and reproducibility

Every MCP tool call writes a tamper-evident audit record with:

- Input hash (no raw PHI in logs unless governance allows it).
- Model versions (extractor, risk, rules timestamp, RAG index version).
- Rule fires and their inputs.
- Output hash.
- Caller identity (agent + end-user where applicable).
- Latency.

This makes every classification reproducible and defensible during clinical review.

---

## 8. Failure modes

| Condition | Behavior |
|---|---|
| Extractor low confidence on a field | Field returned `null`, not invented; uncertainty bumped. |
| Risk model below quality threshold | Result returned with `uncertainty: high` and triage floor applied. |
| Critical input missing (e.g., age) | `status: "insufficient_data"`, triage = clinician within 24h. |
| Rule engine disagrees with model | Rule wins; reason included in `red_flags`. |
| RAG layer offline | Classification still returns; `evidence_pointers` empty. |
| Backing model service down | MCP tool returns explicit error; agent must surface it, not guess. |
