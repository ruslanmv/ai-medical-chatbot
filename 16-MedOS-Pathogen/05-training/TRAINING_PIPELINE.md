# MedOS Pathogen — Training Pipeline

This document describes the engineering layout of the MedOS Pathogen training repository, the Hugging Face artifacts it produces, and the training jobs themselves. The actual training code is **not** added in this PR — only the design and contracts.

---

## 1. Repository layout

The training code lives in its own repository (suggested name `medos-pathogen-train`) so it can be released to Hugging Face Hub and Spaces without coupling to the main MedOS app.

```text
medos-pathogen-train/
├── README.md
├── pyproject.toml
├── data/
│   ├── raw/
│   │   ├── microscopy/        # ingested public + clinician sources
│   │   ├── xray/
│   │   └── sequence/
│   ├── processed/             # de-identified, schema-validated artifacts
│   └── label_maps/            # taxonomies (morphology, pattern, kingdom, …)
├── src/
│   ├── deid/                  # DICOM PHI strip, EXIF strip, FASTA header normalize
│   ├── quality/               # blur / view / exposure / sequence-length screens
│   ├── microscopy/            # backbone + heads + training + eval
│   ├── xray/
│   ├── sequence/
│   ├── ood/                   # OOD detectors per modality
│   ├── evidence/              # Grad-CAM, saliency, k-mer signatures, NN search
│   ├── rag/                   # guideline ingestion + indexing
│   ├── calibration/           # isotonic / temperature scaling
│   ├── inference/             # ONNX export, latency benches, schema validators
│   └── mcp_server/            # MCP server entry point (Python or TS)
├── models/                    # local registry; canonical artifacts go to HF Hub
├── configs/                   # YAML configs per training run
├── tests/                     # unit + clinical-rule + golden-output tests
├── model_card.md              # template
├── dataset_card.md            # template
└── docs/
    ├── microscopy.md
    ├── xray.md
    ├── sequence.md
    └── deployment.md
```

---

## 2. Hugging Face artifacts

```text
HF Dataset:  medos/medos-pathogen-public-seed              # Level-1 splits, license-clean
HF Dataset:  medos/medos-pathogen-clinician-curated        # Level-2/3, access-controlled
HF Model:    medos/medos-pathogen-microscopy
HF Model:    medos/medos-pathogen-chest-xray
HF Model:    medos/medos-pathogen-sequence
HF Space:    medos/medos-pathogen-demo                     # public, no PHI
```

Each artifact ships with a model / dataset card following the template inherited from MedOS Classify:

- Intended use and **out-of-scope** use.
- Training data with the public/clinical split called out.
- Performance metrics, including subgroup tables and OOD detection metrics.
- Calibration plots (reliability diagrams).
- Known failure modes (single-vendor X-ray bias, microscopy stain shift, sequence reference drift).
- Versioning, changelog, last clinician review date.
- Disclaimer: "Clinical decision support — does not replace a clinician or laboratory confirmation."

---

## 3. Training jobs

### 3.1 Microscopy

Pipeline:

```text
images
  → de-identify (EXIF strip)
  → tile / center-crop / augment (color jitter, rotation, scale, mild blur)
  → backbone (ConvNeXt-Tiny / ViT-B)
  → multi-head (morphology, finding, quality)
  → calibrate (isotonic per head)
  → export ONNX
  → register in HF Hub
```

Loss: weighted cross-entropy for the morphology head, focal loss for the finding head (class imbalance), small auxiliary loss for the quality head.

Augmentations are stain-aware: training includes color-jitter perturbations that mimic stain variation. We do not synthetically convert between stains.

### 3.2 Chest X-ray

Pipeline:

```text
DICOM (or PNG)
  → DICOM read + PHI strip
  → burned-in text detection + redaction
  → resize / pad to model input
  → augment (rotation, contrast, crop)
  → backbone (ConvNeXt-Base / DenseNet-121 / ViT-B)
  → multi-head (pneumonia, pattern, tb, covid, image_quality)
  → calibrate (isotonic + temperature scaling, per head)
  → export ONNX
  → register in HF Hub
```

Multi-stage training:

1. ImageNet → ChestX-ray14 multi-label fine-tune (broad chest features).
2. Targeted heads: pneumonia (RSNA), pattern (curated bacterial-vs-viral), TB (Shenzhen / Montgomery), COVID (COVIDx).
3. Calibration on per-task held-out splits.
4. Pediatric calibration table (when sufficient pediatric data).

### 3.3 Sequence

Pipeline:

```text
FASTA / FASTQ
  → header normalization
  → quality filter (FASTQ quality scores, ambiguous-base ratio)
  → k-mer feature extraction (k=6..8 frequency vectors)
  → LightGBM heads (kingdom, top-K species)
  → optional transformer fine-tune (DNABERT2 / Nucleotide Transformer / HyenaDNA) for ambiguous routing
  → calibrate
  → export ONNX (LightGBM via ONNX; transformer separately)
  → register in HF Hub
```

Reference bank build:

```text
RefSeq + GenBank (curated subset) + ViPR + BV-BRC
  → species-level reference index (Faiss)
  → versioned (refseq+vipr@2026-04-15) and stamped into every audit record
```

### 3.4 RAG index build

Curated guideline corpus → chunk → embed → vector index.

Sources:

```text
RSNA radiology resources
IDSA pneumonia guidelines
WHO tuberculosis screening guidance
WHO malaria diagnostic guidance
CDC pathogen factsheets
```

Index version is stamped into every `explain_pathogen_result` audit record.

### 3.5 Explanation generator

Small instruction-tuned LLM with a strict prompt template and post-validation. Training data: clinician-written explanations grounded in the same Grad-CAM regions, NN matches, k-mer signatures, and guideline chunks the runtime will see.

---

## 4. Experiment tracking

```text
MLflow or Weights & Biases   metrics, configs, artifacts
DVC                           dataset versioning (or HF Datasets versioning)
GitHub Actions                CI: schema tests, quality-screen tests, smoke training
Hugging Face Hub              canonical model + dataset registry
```

Every training run records:

- Git SHA of the training code.
- Dataset commit / HF dataset revision per source.
- Backbone checkpoint, augmentation config, loss config.
- Random seeds.
- Hardware (model, GPU type, count).
- Final metrics, including subgroup tables, calibration error, and OOD performance.
- Reference-bank version (sequence) and RAG index version (explainer).

---

## 5. Release gate

A new model version is **only** released when all the following hold:

1. Schema and golden-input tests pass for every modality the release touches.
2. Quality-screen tests pass (a non-radiograph must be rejected; a lateral X-ray must be `view_unsupported`; an out-of-focus microscopy must be rejected).
3. Subgroup metrics meet the thresholds in `06-evaluation/EVALUATION.md`.
4. Calibration error is below the configured ceiling for every head.
5. OOD detector hits its target sensitivity/specificity on a curated OOD test set.
6. A clinical reviewer has signed off the model card and the changelog.

If any check fails, the release is blocked. There is no "ship anyway" path.

---

## 6. Deployment topology

```text
Microscopy model     ONNX, GPU-preferred / CPU fallback, on Hugging Face Endpoints
Chest X-ray model    ONNX, GPU-preferred / CPU fallback
Sequence model       LightGBM (CPU) + transformer (GPU on demand)
Reference bank       Faiss index in memory, periodic refresh
RAG index            Postgres + pgvector or Qdrant
MCP server           FastAPI (Python) or TypeScript MCP SDK, behind ingress
Audit log            append-only Postgres + outbox to S3 / MinIO
Asset store          pre-signed-URL object storage (S3-compatible)
```

The MCP server is the only public surface. Models, indexes, and asset store are internal.

---

## 7. Cost shape

- **Image inference** is the dominant cost. ONNX + GPU autoscaling keeps latency low; aggressive caching by asset hash avoids recomputation.
- **Sequence inference** is cheap when k-mer + LightGBM handles it; the transformer is invoked only for ambiguous cases.
- **Quality screens** are very cheap and run before any heavy model.
- **Explanations** are the next-most-expensive call and only fire when explicitly requested via `explain_pathogen_result`.

This shape lets Phase 0 (public demo) run on modest hardware while Phase 2+ (clinician deployment) can horizontally scale per modality.
