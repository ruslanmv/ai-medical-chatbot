# MedOS Classify — Product Specification

## 1. Vision

**MedOS Classify** is a clinical-classification and triage engine exposed as an MCP server. An agentic AI (the existing MedOS chatbot or any external MCP-aware agent) calls it with patient data and receives a structured, calibrated, explainable response.

It is **clinical decision support**, not autonomous diagnosis. WHO and FDA both stress that AI medical software must support — not replace — clinicians, with clear safety, transparency, governance, human oversight, and risk management. MedOS Classify is designed against those principles from day one.

### Tagline

> *Extracts symptoms, checks red flags, estimates probabilities, explains uncertainty, and recommends the safest next step.*

---

## 2. The output contract

A single classification call returns a JSON object the agent can render directly:

```json
{
  "top_conditions": [
    {
      "condition": "viral upper respiratory infection",
      "probability": 0.62,
      "confidence": "medium"
    },
    {
      "condition": "possible bacterial otitis media",
      "probability": 0.18,
      "confidence": "low"
    },
    {
      "condition": "possible urinary tract infection",
      "probability": 0.09,
      "confidence": "low"
    }
  ],
  "infection_type": {
    "viral": 0.64,
    "bacterial": 0.24,
    "other": 0.12
  },
  "triage": "same_day_clinician_review",
  "red_flags": [],
  "recommended_next_questions": [
    "How many wet diapers in 24 hours?",
    "Any breathing difficulty or chest retractions?",
    "Was urine tested?"
  ],
  "explanation": [
    "Viral features: cough, runny nose, red eyes, sick contact.",
    "Bacterial risk increased because fever has lasted about 5 days.",
    "UTI cannot be ruled out without urine testing."
  ],
  "disclaimer": "This is clinical decision support and does not replace a clinician."
}
```

The output **never** claims certainty. It uses language such as:

- "Likely viral pattern."
- "Bacterial infection cannot be ruled out."
- "Same-day clinician check recommended."
- "Emergency now if red flags."

---

## 3. Classification heads

MedOS Classify is a **multi-head** classifier. A single binary "virus vs bacteria" output is unsafe — it forces a decision when the responsible answer is often *"need clinician review."*

### Head A — Infection type

```text
viral
bacterial
fungal
parasitic
non-infectious inflammatory
allergic
traumatic
unknown / insufficient data
```

### Head B — Body system

```text
upper respiratory
lower respiratory
ear / ENT
urinary
gastrointestinal
skin / soft tissue
neurological
systemic / sepsis risk
eye
other
```

### Head C — Probable condition

Examples:

```text
viral URI
influenza-like illness
COVID-like illness
bronchiolitis
pneumonia
otitis media
urinary tract infection
gastroenteritis
conjunctivitis
allergic rhinitis
sepsis risk
unknown
```

### Head D — Urgency / triage

```text
self-care / monitor
pharmacist or routine care
call clinician within 24h
same-day clinician assessment
urgent care / emergency
```

The triage head is the most safety-critical and is computed from a combination of model output **and** deterministic red-flag rules (see `07-safety/SAFETY_AND_COMPLIANCE.md`).

---

## 4. User flows

### 4.1 Agentic AI flow

```text
User talks to agent
   ↓
Agent calls extract_symptoms(text)
   ↓
Agent calls red_flag_check(...)
   ↓ (if no immediate emergency)
Agent calls classify_illness(structured)
   ↓
Agent calls recommend_next_data(...)
   ↓
Agent asks user the missing high-yield question
   ↓
Agent calls classify_illness(...) again with refined data
   ↓
Agent calls explain_result(...)
   ↓
Agent presents the result + disclaimer
```

### 4.2 Clinician-in-the-loop flow

```text
Clinician opens patient case in MedOS Family
   ↓
MedOS Connect supplies recent vitals (temp, SpO2, HR, BP, weight)
   ↓
Clinician triggers MedOS Classify
   ↓
Result shown side-by-side with the chart, never as the final word
   ↓
Clinician confirms / rejects / annotates
   ↓
Annotation feeds back into the dataset (with consent)
```

### 4.3 Family/parent flow (Phase 3 only, after validation)

```text
Parent enters symptoms in MedOS Family
   ↓
MedOS Classify runs with conservative thresholds
   ↓
Output skews toward "see a clinician" when uncertain
   ↓
Red flags trigger emergency banner
```

---

## 5. Scope

### In scope (MVP)

- General medicine: adults and pediatrics.
- Acute infectious presentations (respiratory, ENT, urinary, GI, skin, eye).
- Common non-infectious differentials (allergic rhinitis, asthma exacerbation cues).
- Triage and red-flag escalation.
- Symptom extraction from free text (multilingual, starting with English + Italian).
- Explanation generation for both clinician and lay audiences.

### Explicitly out of scope (MVP)

- Oncology staging.
- Psychiatric diagnoses.
- Definitive diagnosis of any condition.
- Autonomous prescribing or dose changes.
- Direct image diagnosis (rash, X-ray, etc.) — designed for later, see `03-models/MODEL_ARCHITECTURE.md`.
- Genomic / pathogen-sequence ID — designed for later.

---

## 6. Success criteria

A successful MedOS Classify deployment looks like:

- **Sensitivity for emergencies ≥ 99%** on a held-out clinician-reviewed set.
- **Sensitivity for "clinician within 24h" ≥ 95%.**
- **Calibration error (ECE) ≤ 5%** on the triage head.
- **Subgroup parity** within 5% across age bands and languages tracked.
- **Audit trail** for every classification (inputs, model versions, rule fires, output).
- **Clinicians report** that MedOS Classify changed their next step in a meaningful fraction of pilot cases.

These targets are clinical, not just ML — see `06-evaluation/EVALUATION.md`.

---

## 7. What this product is not

- Not a doctor.
- Not a chatbot wrapping ChatGPT around medical text.
- Not a single-label "viral or bacterial" classifier.
- Not a self-prescription tool.
- Not a replacement for vital-sign monitoring or clinical exam.

It is an **MCP tool an agentic AI can call** to compensate for the agent's clinical-reasoning gaps with a calibrated, auditable, safety-rule-protected engine.
