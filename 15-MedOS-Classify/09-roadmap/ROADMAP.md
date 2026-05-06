# MedOS Classify — Roadmap

A four-phase plan from research prototype to clinician-supervised decision support to (eventually, only after strong validation) parent-facing triage. Each phase has explicit goals, deliverables, and gates.

---

## Phase 0 — Research prototype (no clinical claims)

**Goal:** prove the architecture works end-to-end with public data.

### Build

- MCP server scaffold with all five tools wired to mock models.
- Symptom extractor trained on Level-1 public datasets:
  - `gretelai/symptom_to_diagnosis`
  - `dux-tecblic/symptom-disease-dataset`
  - `sajjadhadi/disease-diagnosis-dataset`
- Baseline risk classifier (LightGBM) on the same public data.
- Red-flag rule engine with 30+ unit-tested rules.
- Demo Hugging Face Space with the public-seed model.
- Hugging Face artifacts:
  - `medos/medos-classify-public-seed`
  - `medos/medos-classify-symptom-extractor` (v0)
  - `medos/medos-classify-risk-model` (v0)
  - `medos/medos-classify-demo`

### Out of Phase 0

- No PHI.
- No clinical claims of any kind.
- No deployment outside the demo Space.

### Gate

- Schema tests pass.
- Rule tests pass.
- Demo Space renders correctly with sample inputs.
- Model card and dataset card published.

---

## Phase 1 — Clinician-supervised pilot

**Goal:** collect a Level-2 dataset under consent and evaluate the model **silently** (predictions logged but not shown to clinicians).

### Build

- Clinical partnerships (pediatrics + general medicine).
- Consent flow, ethics review, data governance.
- Case-collection schema (see `04-data/DATASET_STRATEGY.md`).
- Site rotation across 2–3 sites.
- Outcome capture at 72 hours.

### Train

- Extractor v1 (now multilingual, EN + IT).
- Risk model v1 on Level-2 data.
- First version of the explanation generator with clinician-written training data.

### Evaluate

- Compute Phase-2 release metrics (see below) silently.
- Compare predictions with clinician final diagnosis.
- Subgroup analysis (age band, language, site).

### Gate

- Sufficient case volume per body system and per age band to make subgroup metrics meaningful.
- IRB / ethics approvals in place at each site.
- No use of model output for clinical decisions during this phase.

---

## Phase 2 — Decision support for clinicians

**Goal:** deploy MedOS Classify alongside clinicians as advisory output. Still no autonomous patient-facing role.

### Build

- Clinician dashboard inside MedOS Family.
- Side-by-side display: chart + classification + red flags + explanation.
- "Agree / disagree / annotate" feedback loop into the dataset.
- Pre-deployment release gate (see `06-evaluation/EVALUATION.md`):
  - Sensitivity for emergencies ≥ 99%.
  - Sensitivity for same-day clinician ≥ 95%.
  - Sensitivity for bacterial-confirmed ≥ 90%.
  - ECE on triage head ≤ 5%.
  - No subgroup more than 5 pp below the overall sensitivity targets.

### Operational requirements

- Audit log live.
- Drift monitoring live.
- Weekly safety review.
- Clinical advisor on call for incident response.

### Gate

- All release-gate metrics met on the held-out lab- or imaging-confirmed set.
- A clinical advisor signs off the model card and the changelog.
- Incident response runbook is in place.

---

## Phase 3 — Family/parent-facing triage (only after strong validation)

**Goal:** safely expose MedOS Classify to parents/adult users via the MedOS Family app, with conservative thresholds and aggressive red-flag escalation.

### Build

- Family-facing UI inside MedOS Family.
- Conservative triage: ambiguous cases default to "see a clinician."
- Strong red-flag banners with one-tap emergency guidance.
- Clear "not a diagnosis" language on every screen.
- Multilingual coverage (EN + IT initially; more languages added per release).

### Stricter constraints

- Triage thresholds shifted toward "clinician within 24h" / "same-day" — i.e., the family-facing version is **less likely** to recommend self-care than the clinician version, by design.
- Lower acceptable uncertainty before showing self-care guidance.
- Disclaimers shown on every screen.
- One-tap escalation to emergency services, where applicable per region.

### Gate

- Phase-2 deployment has been live for a sustained period with no critical incidents.
- Family-facing UX has been clinician-reviewed.
- Regulatory assessment for the target jurisdictions is complete and documented.

---

## What we never ship

- A "yes / no virus" answer that a parent could read as a diagnosis.
- A self-treatment recommendation.
- An antibiotic start/stop instruction.
- Any output that hides a red flag.
- Any model that hasn't passed the safety release gate.

---

## Long-term (post-Phase 3)

Optional extensions, each treated as its own product cycle with its own dataset, model card, and release gate:

```text
multimodal: cough audio classifier
multimodal: rash image classifier
multimodal: lab report OCR (CRP, WBC, urinalysis, viral PCR, cultures)
multimodal: thermometer OCR
sequence:   pathogen ID from genomic data (research only, not clinical)
expansion:  more languages, more guideline corpora, more body systems
```

Each of these reuses the same MCP boundary and the same safety / audit / evaluation framework. The architecture is designed so that adding a new modality does not require changing the contracts the agent already depends on.
