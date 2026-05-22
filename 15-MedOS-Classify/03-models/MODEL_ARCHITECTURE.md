# MedOS Classify — Model Architecture

MedOS Classify is intentionally a **hybrid** system, not a single end-to-end transformer. Pure LLMs over-confidently hallucinate clinical answers; pure tabular models can't read free text; pure rules can't generalize. The combination of all three plus retrieval is what makes the output safe **and** useful.

```text
User / Clinician input
        ↓
1. Symptom extraction (LLM / biomedical encoder)
        ↓
2. Deterministic red-flag rule engine
        ↓
3. Calibrated tabular risk model (multi-head)
        ↓
4. Guideline retrieval (RAG over WHO / CDC / NHS / NICE / AAP / AIFA / EMA)
        ↓
5. Explanation generator (clinician + lay text)
        ↓
Risk scores + triage + next steps + evidence pointers
```

---

## 1. Component A — Symptom extraction

**Goal:** convert free text into a structured, typed feature vector. No invention. Confidence per field.

### Candidate base models

```text
microsoft/BiomedNLP-BiomedBERT
emilyalsentzer/Bio_ClinicalBERT
mistralai/Mistral-7B-Instruct (medical fine-tune)
meta-llama/Llama-3.x-Instruct (medical fine-tune, license permitting)
```

### Training objectives

Two complementary heads on the same encoder:

- **Token classification** — span-tag entities like `fever_days`, `temperature`, `age_months`, `meds_taken`.
- **Sequence-to-JSON** — generate the structured object directly, with constrained decoding so the output is always valid JSON.

A small **post-processor** normalizes units (°C/°F, kg/lb, days/hours), resolves negation (`"no blue lips" → blue_lips: false`), and enforces the JSON Schema. Anything ambiguous becomes `null` with a `source_confidence` value.

### Multilingual

MVP supports English + Italian (and free code-switching between them). The training dataset includes Italian medical phrasing because that's MedOS's primary user base. Additional languages added per release.

### Why an encoder, not just an LLM?

Encoder models are smaller, faster, cheaper to host on Hugging Face Inference Endpoints, and easier to evaluate on per-field accuracy. The seq-to-JSON head is small enough to run on CPU for short inputs and can be replaced by a larger LLM only when a field genuinely needs reasoning (e.g., "the fever started Tuesday and today is Sunday").

---

## 2. Component B — Red-flag rule engine

**Goal:** an immovable safety floor.

- Deterministic, **purely rule-based**, version-controlled like code.
- Rules are unit-tested with clinician-reviewed test cases.
- Each rule has an `id`, `description`, `severity`, and a triage override.
- Rules can only **escalate** triage, never de-escalate.

```yaml
# rules/redflags.yaml
- id: infant_lt_3mo_fever_ge_38
  if:
    age_months_lt: 3
    current_temp_c_ge: 38.0
  override_triage: urgent
  severity: urgent
  description: "Infant under 3 months with fever ≥ 38°C requires urgent evaluation."

- id: blue_lips
  if: { blue_lips: true }
  override_triage: emergency
  severity: emergency
  description: "Cyanosis suggests significant hypoxia."

- id: fever_ge_5d_child
  if:
    age_years_lt: 18
    fever_days_ge: 5
  override_triage: same_day
  severity: same_day
  description: "Persistent fever in a child warrants clinician assessment."
```

A change to this file is a clinical change — it goes through a separate review track involving a clinical advisor.

---

## 3. Component C — Calibrated tabular risk model

**Goal:** the multi-head clinical classifier (infection type / body system / probable condition / triage).

### Why tabular

For risk prediction over structured features, **gradient-boosted trees** are typically:

- Easier to **calibrate** than transformers.
- Easier to **explain** (SHAP per feature).
- Easier to **validate** statistically (sensitivity, specificity, AUROC, AUPRC, calibration curves).
- Robust to missing data.

### Candidates

```text
LightGBM            (default starting point)
XGBoost
CatBoost
Calibrated logistic regression (baseline / sanity check)
```

A transformer-based head (e.g., a fine-tuned biomedical encoder over a serialized feature string) is trained in parallel and only adopted if it beats the tree-based model on **safety metrics** — not just accuracy.

### Multi-head training

Each head is trained jointly via multi-task learning when using neural models, or as separate calibrated boosters per head when using LightGBM/XGBoost. Heads share the same input feature vector.

### Calibration

After training, each head is calibrated with **isotonic regression** or **Platt scaling** on a held-out calibration set so that the probabilities are meaningful (a "0.7" means roughly 70% of similar cases turned out positive, not just rank-ordering). Expected Calibration Error is part of the release gate.

### Uncertainty

Uncertainty is reported alongside every probability:

- **Aleatoric** — input is genuinely ambiguous (e.g., common cold vs early pneumonia).
- **Epistemic** — model has rarely seen this combination (estimated via training-set density / nearest-neighbor distance / boosting variance).

The boundary mapping `uncertainty: low | moderate | high` is computed from calibration error + nearest-neighbor density + entropy of the top-3 conditions.

---

## 4. Component D — Retrieval (RAG over guidelines)

**Goal:** ground explanations in trusted guidelines, never let the LLM invent its own clinical claims.

### Sources (read-only, periodically refreshed)

```text
WHO
CDC
NHS
NICE
AAP / HealthyChildren
EMA
AIFA (Italian medicines agency)
local pediatric and primary-care guidelines
drug leaflets (for adverse-effect mentions)
```

### Pipeline

```text
Documents → chunk → embed → store in vector DB (e.g., pgvector, Qdrant)
   ↓
At inference time:
   query = top condition + body system + age band + language
   retrieve top-K chunks
   pass to explanation generator as evidence
```

### What RAG is **not** allowed to do

- Decide the diagnosis.
- Override rule engine or risk model.
- Surface a guideline that isn't in the curated, indexed list.

It only enriches `evidence_pointers` and supports the explanation generator.

---

## 5. Component E — Explanation generator

**Goal:** two parallel narratives (clinician + lay), grounded only in the rule fires, the risk-model SHAP attributions, and the retrieved guideline chunks.

### Implementation

A small instruction-tuned LLM (Mistral-7B-Instruct or similar) called with a strict prompt template:

- It receives the structured classification, the top SHAP features, the rule fires, and the retrieved guideline chunks.
- It is prompted to **not** invent any new clinical claim.
- Output is post-validated: each clinician-line must trace to a SHAP feature, a rule, or an evidence pointer.

If validation fails, the explanation falls back to a **template-based** generator that simply lists the strongest features and rule fires.

---

## 6. Component F — Multimodal extensions (later, not MVP)

The architecture leaves room for additional inputs without redesign:

```text
cough audio classifier
respiratory-rate video estimator
rash image classifier
stool image classifier
thermometer OCR (already partially handled by 11-Medicine-Scanner OCR conventions)
lab report OCR (CRP, WBC, urinalysis, viral PCR, blood culture)
```

These modules feed structured features into the same risk model. They are introduced one by one, each with its own validation set and model card.

---

## 7. Hugging Face artifacts

The system publishes a coherent set of artifacts on Hugging Face under the MedOS organization:

```text
HF Dataset:  medos/medos-classify-triage-dataset
HF Model 1:  medos/medos-classify-symptom-extractor
HF Model 2:  medos/medos-classify-risk-model
HF Space:    medos/medos-classify-demo
```

Each model and dataset ships with a **model card** / **dataset card** that documents:

- Intended use and out-of-scope use.
- Training data sources and consent.
- Metrics, including subgroup performance.
- Known failure modes.
- Versioning and changelog.

See `05-training/TRAINING_PIPELINE.md` for the training repo layout.

---

## 8. Inference deployment

```text
Symptom extractor   → Hugging Face Inference Endpoint (GPU for LLM, CPU for encoder fallback) + ONNX export
Risk model          → CPU; LightGBM exported via ONNX or native Booster
Rule engine         → in-process Python module (no network)
RAG                 → vector DB (pgvector/Qdrant) + small reranker
Explanation LLM     → HF Inference Endpoint, low-temperature, constrained decoding
MCP server          → FastAPI (Python) or TypeScript MCP SDK; horizontally scaled behind ingress
Audit log           → append-only store (e.g., Postgres + outbox to S3 / MinIO)
```

---

## 9. Why this architecture is "industry-grade"

- **Separation of concerns** — extractor, rules, risk, RAG, explainer are independently testable, versioned, and replaceable.
- **Calibrated probabilities**, not vibes.
- **Hard safety floor** via rules that no model can override.
- **Auditability** baked in at the MCP boundary.
- **Subgroup-aware evaluation** as a release gate, not an afterthought.
- **Hugging Face-native** — datasets, models, model cards, and a Space demo are first-class outputs.
- **Designed for clinical pilots**, not just for benchmarks.
