# MedOS Classify

**MedOS Classify** is the clinical-classification and triage layer of the MedOS ecosystem. It is an **additive** module that exposes a set of MCP (Model Context Protocol) tools so that an agentic AI — or any MCP-aware client, including MedOS itself — can ask focused clinical questions and receive structured, calibrated, explainable answers.

It is **clinical decision support, not an autonomous doctor.** It never gives a final diagnosis. It returns probabilities, differentials, red flags, and a recommended next step (self-care / clinician within 24h / same-day visit / emergency).

> Internal name: `medos-classify`

---

## 1. Why this exists

Modern agentic AIs are great at conversation but bad at calibrated clinical reasoning. They:

- Sound confident even when wrong.
- Forget red flags (infant fever, blue lips, breathing distress, dehydration).
- Cannot reliably separate "viral vs bacterial" from text alone.
- Have no audit trail of what features drove a recommendation.

MedOS Classify gives the agent a **dedicated tool** to compensate for that. The agent collects data conversationally; MedOS Classify does the clinical math, the safety rules, and the explanation.

---

## 2. What it classifies

This is **not** a "virus vs bacteria" binary. It's a multi-head classifier covering:

- **Infection type** — viral, bacterial, fungal, parasitic, non-infectious inflammatory, allergic, traumatic, unknown.
- **Body system** — upper respiratory, lower respiratory, ENT/ear, urinary, GI, skin/soft tissue, neurologic, systemic/sepsis risk, eye, other.
- **Probable conditions** — viral URI, influenza-like illness, COVID-like illness, bronchiolitis, pneumonia, otitis media, UTI, gastroenteritis, conjunctivitis, allergic rhinitis, sepsis risk, unknown.
- **Triage / urgency** — self-care, pharmacist or routine care, clinician within 24h, same-day clinician, urgent care / emergency.

It works for **general medicine** (adults and pediatrics), not only infants.

---

## 3. Position in the MedOS ecosystem

```text
MedOS App
├── Existing local health tracker
├── MedOS Family            (13-MedOS-Family)
├── MedOS Connect           (14-MedOS-Connect)
└── MedOS Classify          (this module)
    ├── MCP server
    │   ├── extract_symptoms
    │   ├── classify_illness
    │   ├── red_flag_check
    │   ├── recommend_next_data
    │   └── explain_result
    ├── HF models
    │   ├── medos-classify-symptom-extractor
    │   └── medos-classify-risk-model
    ├── HF dataset
    │   └── medos-classify-triage-dataset
    └── Guideline RAG (WHO / CDC / NHS / NICE / AAP …)
```

Like MedOS Connect, MedOS Classify is **additive**:

- No existing file, table, or API is changed.
- It can be deleted in one operation without affecting the rest of MedOS.
- It is feature-flagged at the MCP server boundary.

---

## 4. Documentation map

| File | Purpose |
|---|---|
| [`01-product/PRODUCT_SPEC.md`](01-product/PRODUCT_SPEC.md) | Vision, scope, classification heads, output contract, what it is *not*. |
| [`02-mcp/MCP_TOOL_CONTRACTS.md`](02-mcp/MCP_TOOL_CONTRACTS.md) | The five MCP tools, their JSON schemas, and example calls. |
| [`03-models/MODEL_ARCHITECTURE.md`](03-models/MODEL_ARCHITECTURE.md) | Hybrid architecture: extractor LLM + tabular risk model + rules + RAG + explainer. |
| [`04-data/DATASET_STRATEGY.md`](04-data/DATASET_STRATEGY.md) | Three-level dataset plan, public datasets to seed it, labeling taxonomy. |
| [`05-training/TRAINING_PIPELINE.md`](05-training/TRAINING_PIPELINE.md) | Repo layout, Hugging Face artifacts, training jobs, model cards. |
| [`06-evaluation/EVALUATION.md`](06-evaluation/EVALUATION.md) | Safety-first metrics, subgroup analysis, calibration, missing-data robustness. |
| [`07-safety/SAFETY_AND_COMPLIANCE.md`](07-safety/SAFETY_AND_COMPLIANCE.md) | Hard-coded red flags, privacy, GDPR/HIPAA, EU MDR / FDA SaMD considerations. |
| [`08-integration-medos/INTEGRATION_PLAN.md`](08-integration-medos/INTEGRATION_PLAN.md) | How MedOS Classify plugs into MedOS, MedOS Family, MedOS Connect, and external agents. |
| [`09-roadmap/ROADMAP.md`](09-roadmap/ROADMAP.md) | Phase 0–3 rollout from research prototype to clinician-supervised pilot to triage. |

---

## 5. Core principle

> The best product is not: *"AI doctor says viral or bacterial."*
>
> The best product is: *"AI clinical risk engine that extracts symptoms, checks red flags, estimates probability, explains uncertainty, recommends the safest next step, and helps clinicians make faster decisions."*

That principle drives every design choice in this folder.

---

## 6. Boundaries

MedOS Classify will **not**:

- Diagnose definitively.
- Prescribe medication or change dosing.
- Tell a parent to start or stop antibiotics.
- Override hard-coded safety red flags.
- Operate without a "clinician review" recommendation when uncertainty is high.

It will always include a disclaimer such as:

> *"This is clinical decision support and does not replace a clinician."*

---

## 7. Cross-references

- [`../13-MedOS-Family/README.md`](../13-MedOS-Family/README.md) — family permission and consent model that gates access to per-member classifications.
- [`../14-MedOS-Connect/README.md`](../14-MedOS-Connect/README.md) — provides normalized vitals (temperature, SpO₂, heart rate, weight, blood pressure) that MedOS Classify consumes as structured input.
