# MedOS Pathogen — Dataset Strategy

A diagnostic-imaging classifier is only as trustworthy as its data **and its license posture**. Image and sequence datasets carry stricter intended-use, access, and re-distribution constraints than text datasets, so this strategy is explicit about what each dataset can and cannot be used for.

```text
Level 1   Public seed datasets — prototype only, no clinical claims
Level 2   Clinician-curated dataset — production candidate
Level 3   Verified labels (culture / PCR / radiologist consensus) — release gate
```

---

## 1. Level 1 — Public seed datasets

These datasets are used for the prototype, the public Hugging Face Space demo, and CI fixtures. They are **not** sufficient for clinical deployment.

### 1.1 Microscopy / blood smear

| Dataset | Source | Contents | MVP role |
|---|---|---|---|
| **DIBaS** | Digital Images of Bacterial Species | 33 bacterial genera, gram-stain microscopy | Train morphology head + nearest-neighbor reference bank |
| **NIH Malaria Cell Images** | Kaggle / NIH LHNCBC | Thin blood-smear, parasitized vs uninfected RBCs | Train parasitized-RBC head + screening pipeline |
| **MicrobIA / BCCD** | Public bioimage repos | Blood cell / microbe morphology | Auxiliary pretraining, blood-cell context |
| **BBBC (Broad Bioimage Benchmark Collection)** | Broad Institute | Multiple bacterial sets and cell-imaging benchmarks | Auxiliary pretraining, OOD negatives |

### 1.2 Chest X-ray

| Dataset | Source | Contents | MVP role |
|---|---|---|---|
| **NIH ChestX-ray14** | NIH Clinical Center | ~112k frontal radiographs, 14 weak labels | Backbone pretraining, multi-label features |
| **RSNA Pneumonia Detection Challenge** | RSNA / Kaggle | Frontal radiographs with pneumonia bounding boxes | Train pneumonia head with localization signal |
| **CheXpert** | Stanford ML Group | ~224k radiographs, multi-label with uncertainty | Backbone fine-tuning, calibration data |
| **COVIDx / COVID-19 Radiography Database** | Public, Kaggle-hosted | COVID / non-COVID chest radiographs | Train COVID-pattern head |
| **Shenzhen TB X-ray set** | NIH / NLM | TB-positive vs normal radiographs | Train tb_screen head |
| **Montgomery County TB X-ray set** | NIH / NLM | TB-positive vs normal radiographs | Held-out test set for tb_screen |

> Important: every dataset's **license** and **intended use** must be reviewed before use. Some sets are research-only, some forbid commercial use, some require attribution. The dataset card records the license per source. If a license forbids inclusion, it stays out.

### 1.3 Genomic sequence

| Dataset | Source | Contents | MVP role |
|---|---|---|---|
| **NCBI RefSeq** | NCBI | Curated reference genomes (viral + bacterial + fungal) | Reference bank for sequence ID |
| **GenBank** | NCBI | Broader sequence repository | Auxiliary references, curated subsets |
| **ViPR** | BV-BRC | Virus pathogen resource | Augment viral reference coverage |
| **BV-BRC (formerly PATRIC)** | BV-BRC | Bacterial / viral pathogen resource | Augment bacterial reference coverage |

GISAID is intentionally **not** in MVP because of credentialed-access requirements. It can be added later as a credentialed source for influenza and SARS-CoV-2 work without changing the architecture.

### 1.4 What these datasets can and cannot do

- They can train a **prototype** model good enough for a research/educational demo.
- They can be released as a curated, license-clean public seed dataset (`medos/medos-pathogen-public-seed`).
- They cannot, on their own, support a clinical claim. They have known biases (single-site, single-vendor, limited demographic coverage, label noise) that must be addressed in Level 2.

---

## 2. Level 2 — Clinician-curated dataset (production candidate)

A real, multi-site, consented dataset is the path to a clinically credible MedOS Pathogen.

### 2.1 What we collect

```text
Microscopy:
  - Slides from collaborating microbiology labs (gram stain, blood smear)
  - Whole slide image (WSI) when possible, otherwise representative fields
  - Per-field clinician/microbiologist label (morphology + finding + final culture)
  - Linked culture / sensitivity result when available

Chest X-ray:
  - Frontal radiographs from collaborating sites
  - DICOM with PHI stripped; original under access control with consent
  - Radiologist read (structured) + radiologist label set
  - Linked microbiological / clinical confirmation when available

Sequence:
  - Sequencing runs from collaborating labs
  - Pathogen confirmation (PCR, culture)
  - Run metadata (platform, read length, kit, sample type)
```

### 2.2 Provenance and consent

- Each case carries a `provenance` block: site ID, ethics-review reference, consent version, clinician/microbiologist pseudonym.
- All artifacts are de-identified at the collection site before transfer.
- Site rotation across multiple institutions to avoid single-site overfitting.
- Demographic distribution monitored continuously; sites are added to fill gaps.

### 2.3 Inclusion / exclusion

- Include: routine clinical microbiology, frontal chest radiographs in scope, sequencing of clinically relevant respiratory / GI / blood pathogens.
- Exclude: ICU radiographs with extensive devices that confound pneumonia detection (Phase 0/1); histopathology; non-thoracic studies.

---

## 3. Level 3 — Verified labels (release gate)

Image and sequence labels alone are not enough. Confidence levels:

```yaml
confidence_level:
  - confirmed_lab        # culture, PCR, sequencing-confirmed
  - confirmed_imaging    # radiologist consensus (≥2 radiologists)
  - clinician_diagnosis  # single clinician/microbiologist label
  - probable             # suggestive but no objective confirmation
  - uncertain            # ambiguous outcome
```

Release-gate metrics (see `06-evaluation/EVALUATION.md`) are computed only on the subset with `confirmed_lab` or `confirmed_imaging`. Lower-confidence labels are still trained on (with lower sample weights) but excluded from the safety release metrics.

---

## 4. Labeling taxonomy

```yaml
microscopy:
  morphology_class:
    - gram_positive_cocci_clusters
    - gram_positive_cocci_chains
    - gram_positive_rods
    - gram_negative_rods
    - gram_negative_cocci
    - yeast
    - parasitized_rbc
    - uninfected_rbc
    - other_or_unclear
  finding_class:
    - staphylococcus_like
    - streptococcus_like
    - enterobacteriaceae_like
    - mycobacterium_like
    - candida_like
    - plasmodium_like
    - other_or_unclear

chest_xray:
  pneumonia_present: [true, false]
  pattern_class: [bacterial, viral, atypical, other_or_unclear]
  tb_screen: [positive, negative]
  covid_pattern: [present, absent]
  view: [PA, AP, lateral, unsupported]

sequence:
  kingdom_class: [virus, bacterium, fungus, unknown]
  taxon_rank: [species, genus, family]
  confidence_level: [high, medium, low]

cross_modality:
  ood_label: [in_distribution, near_ood, far_ood]
  quality_label: [acceptable, marginal, rejected]
```

---

## 5. Hugging Face dataset artifacts

```text
medos/medos-pathogen-public-seed
  - Curated, license-clean splits derived from Level-1 sources.
  - Public, with a comprehensive dataset card.
  - Used for the demo Space and Phase 0 baselines.

medos/medos-pathogen-clinician-curated
  - Level-2 dataset, access-controlled.
  - Available only to credentialed researchers under a data-use agreement.
  - Used for production candidate training and the release gate.
```

Each artifact ships with a full dataset card:

- Per-source license summary.
- Schema and label dictionary.
- Per-label and per-subgroup counts.
- Known biases (single-vendor effects, demographic skew, label noise).
- Versioning and changelog.

---

## 6. License and ethics posture

- **No dataset is included in MedOS Pathogen training without a positive license review.**
- Datasets that forbid model redistribution allow model training but block re-uploading raw images via Hugging Face artifacts.
- Datasets that forbid commercial use restrict the resulting model's downstream license.
- Each Hugging Face artifact lists the license terms inherited from its sources.

If two datasets impose conflicting redistribution terms, they are kept in **separate** artifacts so downstream users can pick a compatible subset.

---

## 7. From data to model

```text
Level 1 (public seed)        →  baseline backbones + demo Space; no clinical claims
Level 2 (clinician curated)  →  production candidates per modality; internal pilot
Level 3 (verified labels)    →  compute release-gate metrics; clinician sign-off
```

This data plan is what enables Phase 0 → Phase 3 in `09-roadmap/ROADMAP.md` to happen safely and lawfully.
