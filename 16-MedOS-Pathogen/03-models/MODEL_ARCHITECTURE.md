# MedOS Pathogen — Model Architecture

MedOS Pathogen is a **family of three specialist models** behind one MCP boundary:

```text
medos-pathogen-microscopy     CNN / ViT for microscopy + blood smear
medos-pathogen-chest-xray     CNN / ViT for chest radiographs
medos-pathogen-sequence       sequence transformer + k-mer ML for FASTA/FASTQ
```

Each model is wrapped by the same shared layers:

```text
input → de-identification → quality + OOD screen → backbone → calibrated heads
       → evidence generator (Grad-CAM / saliency / nearest neighbors / k-mer)
       → explainer (with strict RAG over guidelines)
       → audit
```

The architecture is deliberately conservative and modular: a CNN that beats a benchmark on accuracy alone is **not** adopted unless it also beats it on calibration and OOD detection.

---

## 1. Microscopy model

### 1.1 Backbone candidates

```text
ConvNeXt-Tiny / -Small        strong inductive bias on small training sets
EfficientNet-V2 (S/M)         well-tuned baseline, modest compute
DINOv2 / MAE pretraining      self-supervised pretraining on unlabeled microscopy
ResNet-50 (baseline)
```

ConvNeXt-Tiny pretrained on ImageNet, then fine-tuned on the union of DIBaS, NIH Malaria, and BBBC subsets, is the suggested starting point. A self-supervised stage on raw unlabeled microscopy tiles (when available) before fine-tuning consistently improves robustness.

### 1.2 Heads

- **morphology_class** — multi-class softmax over coarse morphology buckets:
  ```text
  gram_positive_cocci_clusters
  gram_positive_cocci_chains
  gram_positive_rods
  gram_negative_rods
  gram_negative_cocci
  yeast
  parasitized_rbc        (malaria-infected red blood cell)
  uninfected_rbc
  other_or_unclear
  ```
- **pathogen_or_finding** — multi-label suggestion conditioned on morphology (e.g., gram-positive cocci in clusters → Staphylococcus-like with calibrated probability).
- **quality** — small head for in-focus / stain quality / field useability.

### 1.3 Calibration

Per-head **isotonic regression** on a held-out calibration split. Reliability diagrams reported in the model card.

### 1.4 Evidence

- **Grad-CAM / saliency** highlighting the cells/regions that drove the prediction.
- **Nearest-neighbor retrieval** in the backbone embedding space against a curated, license-clean reference bank, returning thumbnail + label + similarity.

### 1.5 OOD detection

- **Energy-based** or **Mahalanobis-distance** OOD detector on the embedding.
- A second guard: a small classifier trained to reject "is this even microscopy?" cases.

---

## 2. Chest X-ray model

### 2.1 Backbone candidates

```text
ConvNeXt-Base / -Large
DenseNet-121 (CheXpert / ChestX-ray14 baseline reference)
Vision Transformer (ViT-B/16 or Swin-B) with chest-specific pretraining
```

Pretraining strategy:

- ImageNet → CheXpert/ChestX-ray14 multi-label fine-tune (broad chest features).
- Then task-specific heads for pneumonia / pattern / TB / COVID, trained with frozen-then-unfrozen backbone.

### 2.2 Heads

- **pneumonia_present** — binary head with calibrated probability.
- **pattern_class** — softmax over `bacterial / viral / atypical / other_or_unclear`. Trained on RSNA + COVIDx (positive pneumonia) plus curated bacterial-vs-viral subsets, with strict "uncertain" class for ambiguous cases.
- **tb_screen** — binary head trained on Shenzhen + Montgomery, evaluated on a clinician-reviewed split.
- **covid_pattern** — binary head trained on COVIDx with explicit OOD-to-normal evaluation.
- **image_quality** — view (PA / AP / lateral / non-radiograph), rotation, exposure.

### 2.3 Calibration

Per-head **isotonic regression** plus **temperature scaling** baseline; the better-calibrated method on the held-out set wins. Pediatric calibration is computed separately when sufficient pediatric data is available.

### 2.4 Evidence

- **Grad-CAM** heatmap overlaid on the radiograph.
- **Highlighted regions** mapped to anatomical labels (`right_lower_lobe`, etc.) using a simple lung-region mask.
- **Nearest-neighbor retrieval** in the backbone embedding space.

### 2.5 OOD detection

- Reject non-radiograph inputs (selfies, screenshots) using a small radiograph/non-radiograph classifier trained explicitly on negatives.
- Reject lateral and pediatric AP variants out of MVP scope, with clear `view_unsupported` errors.

---

## 3. Sequence model

### 3.1 Approach

Two complementary models:

- **k-mer + LightGBM/XGBoost** — fast, well-calibrated, strong baseline. Features are k-mer frequency vectors (k = 6–8) + sequence statistics. One classifier per head (kingdom, top-K species).
- **DNA / sequence transformer** — DNABERT2 / Nucleotide Transformer / HyenaDNA fine-tuned for kingdom and species classification. Used when context length and motif sensitivity matter more than throughput.

The deployed system serves the k-mer model by default and routes to the transformer for ambiguous cases (nearest-reference similarity below threshold).

### 3.2 Heads

- **kingdom_class** — virus / bacterium / fungus / unknown.
- **taxon_top_k** — top-K species/strain candidates with calibrated probabilities.
- **confidence** — derived from nearest-reference similarity, top-1 vs top-2 gap, and entropy of top-K.

### 3.3 Reference bank

- **NCBI RefSeq + GenBank** for both viruses and bacteria.
- **ViPR / BV-BRC** for additional pathogen coverage.
- Reference bank versioned (`refseq+vipr@2026-04-15`) and stamped into every audit record.
- GISAID is **not** included in MVP because of access constraints, but the architecture supports adding it as a credentialed source later.

### 3.4 Evidence

- **k-mer signatures** that drove the kingdom classification.
- **Nearest reference accession** with similarity score and ambiguity flags.

### 3.5 OOD detection

- Nearest-reference similarity below floor → flagged.
- Entropy of top-K above ceiling → flagged.
- Sequence shorter than training-time minimum → rejected.

---

## 4. Shared layers

### 4.1 De-identification

- DICOM headers stripped of PHI on ingest (PatientName, PatientID, BirthDate, etc.).
- Burned-in text in radiographs detected and masked when possible (small OCR + redaction step).
- Microscopy images: EXIF metadata stripped.
- Sequence headers: identifiers normalized; user-provided free text in FASTA headers discarded.

### 4.2 Quality screen

- Microscopy: blur detection (Laplacian variance), stain quality classifier.
- X-ray: view classifier, rotation estimator, exposure check.
- Sequence: minimum length check, ambiguous-base ratio, FASTQ quality score check.

Failures terminate the pipeline early with a clear status code and never feed bad inputs into the model.

### 4.3 OOD detection

Cross-cutting OOD detector at the embedding level for image models; nearest-reference + entropy thresholds for sequences. OOD signals are surfaced in the output and force `confidence = low`.

### 4.4 RAG over guidelines

Curated, periodically refreshed corpus:

```text
RSNA radiology resources
IDSA pneumonia guidelines
WHO tuberculosis screening guidance
WHO malaria diagnostic guidance
CDC pathogen factsheets (microbiology, virology)
local clinical microbiology guidelines
```

Used **only** for explanations. The RAG layer cannot change probabilities; it can only provide `evidence_pointers` for the explainer.

### 4.5 Explanation generator

A small instruction-tuned LLM with a strict prompt template that grounds claims in:

- Grad-CAM regions / saliency / nearest-neighbor labels (image).
- k-mer signatures / nearest reference (sequence).
- Retrieved guideline chunks.

Validated post-hoc; falls back to a deterministic template generator if any clinician-line cannot be traced to a model artifact or guideline.

---

## 5. Hugging Face artifacts

```text
HF Model:    medos/medos-pathogen-microscopy
HF Model:    medos/medos-pathogen-chest-xray
HF Model:    medos/medos-pathogen-sequence
HF Dataset:  medos/medos-pathogen-public-seed              (curated splits with license info)
HF Dataset:  medos/medos-pathogen-clinician-curated        (access-controlled, post-Phase 1)
HF Space:    medos/medos-pathogen-demo                     (public demo, no PHI)
```

Each ships with a model / dataset card following the same template as MedOS Classify (intended use, out-of-scope, data sources, metrics with subgroups, calibration plots, known failure modes, last clinician review).

---

## 6. Inference deployment

```text
Microscopy model    ONNX export, GPU-preferred / CPU fallback, on Hugging Face Endpoints
Chest X-ray model   ONNX export, GPU-preferred / CPU fallback
Sequence model      k-mer + LightGBM on CPU; transformer on GPU for ambiguous routing
Reference bank      vector index (Faiss / pgvector / Qdrant), versioned
RAG index           vector DB, versioned
MCP server          FastAPI (Python) or TypeScript MCP SDK, behind ingress
Audit log           append-only Postgres + outbox to S3 / MinIO
Asset store         pre-signed-URL object storage (e.g., S3-compatible)
```

Heavy artifacts (models, indexes) are pinned to specific versions. Rollouts are gradual (canary → 100%) with automatic rollback on safety-metric regression.

---

## 7. Why this architecture is "industry-grade"

- **Three specialist models, one MCP boundary** — each modality gets the right architecture, but agents see one consistent API.
- **Calibration is a release gate**, not an afterthought.
- **Visible evidence** (Grad-CAM, nearest neighbors, k-mer signatures) on every output — clinicians can sanity-check the basis of every probability.
- **OOD detection** baked in at every endpoint.
- **De-identification before model code runs.**
- **Versioned reference banks and RAG indexes** stamped into every audit record.
- **Hugging Face-native** — datasets, models, model cards, and a Space demo are first-class outputs.
