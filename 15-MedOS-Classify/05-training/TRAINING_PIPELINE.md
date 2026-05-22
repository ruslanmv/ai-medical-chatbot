# MedOS Classify — Training Pipeline

This document describes the engineering layout of the MedOS Classify training repository, the Hugging Face artifacts it produces, and the training jobs themselves. The actual training code is **not** added in this PR — only the design and contracts.

---

## 1. Repository layout

The training code lives in its own repository (suggested name `medos-classify-train`) so it can be released to Hugging Face Hub and Spaces without coupling to the main MedOS app.

```text
medos-classify-train/
├── README.md
├── pyproject.toml
├── data/
│   ├── raw/                   # ingested public + clinician data, never edited in place
│   ├── processed/             # cleaned, schema-validated cases
│   └── label_maps/            # taxonomy YAMLs (infection_type, body_system, …)
├── src/
│   ├── extraction/            # symptom extractor (encoder + seq-to-JSON)
│   ├── rules/                 # red-flag rule engine + tests
│   ├── training/              # multi-head risk model trainers
│   ├── evaluation/            # safety-first metrics, calibration, subgroups
│   ├── inference/             # ONNX export, latency benches, schema validators
│   ├── rag/                   # guideline ingestion + indexing
│   └── mcp_server/            # MCP server entry point (Python or TS)
├── models/                    # local registry; canonical artifacts go to HF Hub
├── configs/                   # YAML configs per training run
├── tests/                     # unit + clinical-rule + golden-output tests
├── model_card.md              # template
├── dataset_card.md            # template
└── docs/
    ├── extractor.md
    ├── risk_model.md
    └── deployment.md
```

---

## 2. Hugging Face artifacts

The pipeline produces a coherent set of artifacts under the MedOS organization on Hugging Face:

```text
HF Dataset:  medos/medos-classify-public-seed         # Level-1 public data
HF Dataset:  medos/medos-classify-triage-dataset      # Level-2/3, access-controlled
HF Model:    medos/medos-classify-symptom-extractor   # encoder + seq-to-JSON
HF Model:    medos/medos-classify-risk-model          # multi-head tabular classifier
HF Space:    medos/medos-classify-demo                # no-PHI demo, public seed only
```

Each artifact ships with a model card or dataset card following Hugging Face conventions and the WHO/FDA expectations on AI-medical-software documentation.

### Mandatory model-card sections

- Intended use and **out-of-scope** use.
- Training data, including the public/clinical split.
- Performance metrics, including subgroup tables.
- Calibration plots (reliability diagrams).
- Known failure modes.
- Versioning, changelog, and last clinician review date.
- Disclaimer: "Clinical decision support — does not replace a clinician."

### Mandatory dataset-card sections

- Provenance per source.
- Consent and ethics review.
- Schema with field-level documentation.
- Per-label and per-subgroup counts.
- Known biases.
- Access policy.

---

## 3. Training jobs

### 3.1 Symptom extractor

**Input:** free text (English / Italian / mixed).
**Output:** JSON object validated against the extraction schema.

```text
Baby has fever for 5 days, cough, runny nose, red eyes, feeding ok.
        ↓
{
  "fever_days": 5,
  "cough": true,
  "runny_nose": true,
  "red_eyes": true,
  "feeding_status": "normal"
}
```

Two heads on a shared encoder:

- Token classification (NER over clinical features).
- Constrained-decoding seq-to-JSON.

Loss is a weighted sum of token-classification CE and JSON-validity-aware generation loss. Validation rejects any output that doesn't conform to the schema.

### 3.2 Multi-head risk model

**Input:** structured features + extracted symptoms + age + vitals.
**Output:** per-head probabilities (infection type, body system, probable condition, triage).

First production candidate is **LightGBM** with one calibrated booster per head (or a single multi-output model with isotonic calibration applied per head). A transformer-based variant is trained in parallel and only adopted if it beats the tree model on **safety metrics**.

Pipeline:

```text
features → impute (with missingness flags) → LightGBM heads → calibrate (isotonic) → export ONNX
```

### 3.3 RAG index build

```text
Curated guideline corpus → chunk (semantic + heading-aware) → embed → vector index
```

Re-built on a schedule when a source publishes an update. Index version is stamped into every `classify_illness` audit record.

### 3.4 Explanation generator

A small instruction-tuned LLM with a **strict** system prompt and post-validation. Training data: clinician-written explanations grounded in the same SHAP / rule / RAG context the runtime will see, so the model learns to cite, not invent.

---

## 4. Experiment tracking

```text
MLflow or Weights & Biases   metrics, configs, artifacts
DVC                           dataset versioning (or HF Datasets versioning)
GitHub Actions                CI: schema tests, rule tests, smoke training
Hugging Face Hub              canonical model + dataset registry
```

Every training run records:

- Git SHA of the training code.
- Dataset commit / HF dataset revision.
- Config hash.
- Random seeds.
- Hardware.
- Final metrics, including subgroup tables and calibration error.

---

## 5. Release gate

A new model version is **only** released when the following all hold:

1. Schema tests pass (golden inputs → expected JSON).
2. Rule-engine unit tests pass (every rule has at least one positive and one negative test).
3. Subgroup metrics meet the thresholds in `06-evaluation/EVALUATION.md`.
4. Calibration error is below the configured ceiling.
5. A clinical reviewer has signed off on the model card and the changelog.

If any check fails, the release is blocked. There is no "ship anyway" path.

---

## 6. Deployment topology

```text
Hugging Face Inference Endpoints
  ├── medos-classify-symptom-extractor (GPU for LLM, CPU/ONNX for encoder)
  └── medos-classify-explainer

Self-hosted (or HF Spaces with a private GPU)
  ├── MCP server (FastAPI or TypeScript MCP SDK)
  ├── Risk model (LightGBM via ONNX, CPU-only)
  ├── Rule engine (in-process)
  └── RAG (Postgres + pgvector or Qdrant)

Audit log
  └── append-only Postgres + outbox to S3 / MinIO
```

The MCP server is the only public surface. Models behind it are reachable only over the internal network.

---

## 7. Cost shape

- **Symptom extraction** is the most expensive call (LLM); cached aggressively per input hash.
- **Risk model** is essentially free (LightGBM ONNX on CPU, low-millisecond latency).
- **Rules** are free.
- **RAG** is cheap if the index fits in memory.
- **Explanation** is the second most expensive call; only invoked when the agent asks for `explain_result`.

This shape lets us run the high-volume `red_flag_check` and `classify_illness` calls cheaply, and pay for LLM only when free text or human-readable explanations are actually needed.
