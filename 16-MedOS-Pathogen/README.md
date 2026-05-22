# MedOS Pathogen

**MedOS Pathogen** is the pathogen-identification and imaging-pattern layer of the MedOS ecosystem. Where **MedOS Classify** reasons over the patient's clinical picture (symptoms + vitals + history), **MedOS Pathogen** identifies the **organism or radiological pattern itself** from images and genomic sequences:

- **Microscopy** — gram-stain bacterial morphology, malaria-parasitized red blood cells, blood-cell subtypes.
- **Imaging** — bacterial vs viral pneumonia pattern on chest X-ray, COVID-19 radiographic findings, tuberculosis screening.
- **Sequence** — virus / bacterium identification from short genomic reads or assembled sequences.

It is **clinical decision support, not autonomous diagnosis.** It returns calibrated probabilities, visual evidence (Grad-CAM / saliency / nearest-neighbor matches), and a recommended next step. It never makes a final call.

> Internal name: `medos-pathogen`

---

## 1. Why this exists, and how it differs from MedOS Classify

| | **MedOS Classify** (15) | **MedOS Pathogen** (16) |
|---|---|---|
| **Input** | Symptoms (text), structured features, vitals | Images (microscopy, X-ray) and genomic sequences |
| **Output** | Infection type, body system, probable condition, triage | Organism / imaging-pattern probabilities with visual evidence |
| **Model family** | LLM extractor + tabular gradient boosting + rules + RAG | CNNs / Vision Transformers; sequence transformers and k-mer ML |
| **Decision style** | "What's likely going on with this patient?" | "What does this slide / X-ray / sequence look like?" |
| **Regulatory exposure** | Higher than text-only; advisory triage | Highest among MedOS modules — image-based diagnostic AI sits squarely in SaMD territory |

The two modules are **complementary**. MedOS Classify orchestrates the clinical conversation and may *recommend* a chest X-ray or microscopy; MedOS Pathogen provides the specialized image/sequence interpretation; MedOS Classify then re-runs with the new evidence.

---

## 2. Position in the MedOS ecosystem

```text
MedOS App
├── Existing local health tracker
├── MedOS Family            (13-MedOS-Family)
├── MedOS Connect           (14-MedOS-Connect)
├── MedOS Classify          (15-MedOS-Classify)
└── MedOS Pathogen          (this module)
    ├── MCP server
    │   ├── classify_microscopy
    │   ├── classify_chest_xray
    │   ├── identify_pathogen_sequence
    │   ├── explain_pathogen_result
    │   └── nearest_neighbor_review
    ├── HF models
    │   ├── medos-pathogen-microscopy
    │   ├── medos-pathogen-chest-xray
    │   └── medos-pathogen-sequence
    ├── HF datasets (curated splits / model-card-only mirrors)
    └── Guideline RAG (WHO TB / WHO malaria / RSNA / IDSA pneumonia)
```

Like every MedOS module since 13-Family, MedOS Pathogen is **additive**:

- No existing file, table, or API is modified.
- It is feature-flagged at the MCP server boundary.
- It can be removed in one operation without affecting the rest of MedOS.

---

## 3. End-to-end interaction

```text
Clinician opens patient case in MedOS Family
   ↓
Clinician uploads chest X-ray
   ↓
MedOS Pathogen: classify_chest_xray
   ├── pneumonia probability 0.78
   ├── pattern more consistent with bacterial 0.62 / viral 0.31 / other 0.07
   ├── Grad-CAM heatmap pinning right lower lobe
   └── nearest training-set examples for clinician review
   ↓
Result fed back into MedOS Classify
   ↓
MedOS Classify updates triage + explanation, includes the X-ray finding
   ↓
Clinician confirms / rejects / annotates
```

---

## 4. Documentation map

| File | Purpose |
|---|---|
| [`01-product/PRODUCT_SPEC.md`](01-product/PRODUCT_SPEC.md) | Vision, scope, supported modalities, output contract. |
| [`02-mcp/MCP_TOOL_CONTRACTS.md`](02-mcp/MCP_TOOL_CONTRACTS.md) | MCP tools, JSON schemas, image/sequence ingestion, audit. |
| [`03-models/MODEL_ARCHITECTURE.md`](03-models/MODEL_ARCHITECTURE.md) | CNN / ViT / sequence-model architectures, calibration, evidence generation. |
| [`04-data/DATASET_STRATEGY.md`](04-data/DATASET_STRATEGY.md) | Public seed datasets and the path to a clinician-curated dataset. |
| [`05-training/TRAINING_PIPELINE.md`](05-training/TRAINING_PIPELINE.md) | Repo layout, Hugging Face artifacts, training jobs, model cards. |
| [`06-evaluation/EVALUATION.md`](06-evaluation/EVALUATION.md) | Safety-first metrics, subgroup analysis, calibration, OOD detection. |
| [`07-safety/SAFETY_AND_COMPLIANCE.md`](07-safety/SAFETY_AND_COMPLIANCE.md) | Hard rules, license compliance, GDPR/HIPAA/EU MDR/FDA SaMD posture. |
| [`08-integration-medos/INTEGRATION_PLAN.md`](08-integration-medos/INTEGRATION_PLAN.md) | How MedOS Pathogen plugs into Classify, Family, Connect, and external agents. |
| [`09-roadmap/ROADMAP.md`](09-roadmap/ROADMAP.md) | Phase 0–3 rollout from research demo to clinician-supervised pilot. |

---

## 5. Public seed datasets (Phase 0 only)

These datasets seed the prototype phase and the public Hugging Face Space demo. They are **not** sufficient for clinical deployment.

**Microscopy / blood smear:**

- **DIBaS** — Digital Images of Bacterial Species (33 genera, gram-stain microscopy).
- **NIH Malaria Cell Images** — thin blood-smear, parasitized vs uninfected RBCs.
- **BBBC** — Broad Bioimage Benchmark Collection, several bacterial sets.

**Chest X-ray:**

- **NIH ChestX-ray14** — large multi-label X-ray dataset.
- **RSNA Pneumonia Detection Challenge** — bounding-box pneumonia.
- **CheXpert (Stanford)** — labeled chest radiographs with uncertainty.
- **COVIDx / COVID-19 Radiography Database (Kaggle)** — COVID-19 X-rays.
- **Shenzhen and Montgomery TB X-ray sets (NIH/NLM)** — tuberculosis screening.

**Genomic sequence:**

- **NCBI RefSeq / GenBank** — viral and bacterial reference genomes.
- **ViPR / BV-BRC** — virus and bacteria pathogen resource.

Each dataset's license, intended use, and access constraints are documented in [`04-data/DATASET_STRATEGY.md`](04-data/DATASET_STRATEGY.md). GISAID is **not** included in MVP because of access controls; it can be added later as a credentialed source for influenza / SARS-CoV-2 work.

---

## 6. Boundaries

MedOS Pathogen will **not**:

- Make a final diagnosis.
- Override clinician judgment.
- Trigger antibiotic prescribing.
- Output a finding without uncertainty and visual evidence.
- Process images or sequences without a permission check from MedOS Family.

Every output is wrapped with a disclaimer:

> *"This is clinical decision support and does not replace a clinician or laboratory confirmation."*

---

## 7. Cross-references

- [`../13-MedOS-Family/README.md`](../13-MedOS-Family/README.md) — family permission and consent rules.
- [`../14-MedOS-Connect/README.md`](../14-MedOS-Connect/README.md) — vitals context.
- [`../15-MedOS-Classify/README.md`](../15-MedOS-Classify/README.md) — clinical reasoning module that calls MedOS Pathogen for image/sequence evidence.
