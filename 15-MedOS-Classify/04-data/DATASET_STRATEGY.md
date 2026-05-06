# MedOS Classify — Dataset Strategy

A clinical classifier is only as trustworthy as its data. MedOS Classify uses a **three-level** strategy that lets us prototype quickly with public data, then build a real, clinician-verified dataset, then progressively raise label quality over time.

```text
Level 1   Public datasets — prototype only, no clinical claims
Level 2   Real clinician-supervised cases — production candidate
Level 3   Verified labels (lab / imaging / outcome) — release gate
```

---

## 1. Level 1 — Public datasets (prototype seed)

These datasets are useful for **early NLP prototypes, baselines, and CI fixtures**. They are **not** sufficient for a deployed clinical product.

### 1.1 Symptom-to-diagnosis text datasets (Hugging Face)

| Dataset | Notes |
|---|---|
| `gretelai/symptom_to_diagnosis` | ~1,065 symptom descriptions labeled with 22 diagnoses. Small but clean. Good for early NLP classification baselines. |
| `dux-tecblic/symptom-disease-dataset` | Symptom-to-disease pairs. Useful for early experiments. |
| `sajjadhadi/disease-diagnosis-dataset` | Symptom descriptions mapped to candidate diseases. |
| `keivalya/MedQuad-MedicalQnADataset` | Medical Q&A. Useful for the **retrieval and explanation** layer, not direct diagnosis labeling. |
| `lavita/medical-qa-datasets` | Larger medical QA corpus. Useful for language pretraining/evaluation, not clean clinical diagnosis labels. |

> Honest caveat: many public symptom datasets are synthetic, noisy, or weakly labeled. They are good enough to **train an extractor** and to seed a baseline classifier, but the resulting model must not be marketed as clinical.

### 1.2 Imaging datasets (for the **future** multimodal phase only)

If/when image inputs are added (chest X-ray, blood smear, microscopy, rash), candidate public datasets include:

```text
NIH ChestX-ray14
RSNA Pneumonia Detection Challenge
CheXpert (Stanford)
COVIDx / COVID-19 Radiography Database
Shenzhen + Montgomery TB X-ray sets (NIH/NLM)
NIH Malaria Cell Images
DIBaS — Digital Images of Bacterial Species
BBBC (Broad Bioimage Benchmark Collection)
```

Each of these has its own license and intended-use restrictions; they must be reviewed before use.

### 1.3 Clinical EHR datasets (controlled access)

```text
PhysioNet — biomedical and clinical research datasets, controlled access for sensitive sets.
MIMIC-IV / MIMIC-IV-ED — emergency-department diagnoses, useful for adult triage modeling.
```

These require a credentialed-access agreement and are governed by the data-use policy of the host institution. They are appropriate for adult-medicine prototyping.

### 1.4 Sequence / pathogen datasets (future, not MVP)

```text
NCBI RefSeq / GenBank   viral and bacterial genomes
ViPR / BV-BRC           pathogen resource (combined virus and bacteria)
GISAID                  influenza / SARS-CoV-2 (research use)
```

These would only be relevant if MedOS Classify ever ingests sequence data, which is **out of MVP scope**.

---

## 2. Level 2 — Real clinician-supervised dataset (production candidate)

This is the dataset that makes MedOS Classify clinically credible. It is collected with clinical partners, under consent, and stored according to GDPR/HIPAA constraints (see `07-safety/SAFETY_AND_COMPLIANCE.md`).

### 2.1 Case schema

Each case is one JSON document:

```json
{
  "case_id": "uuid",
  "patient": {
    "age_months": 6,
    "sex": "male",
    "weight_kg": 7.2
  },
  "symptoms": {
    "fever_days": 5,
    "max_temp_c": 38.9,
    "current_temp_c": 38.1,
    "cough": true,
    "runny_nose": true,
    "red_eyes": true,
    "diarrhea": true,
    "feeding_reduced": false
  },
  "vitals": {
    "respiratory_rate": 36,
    "oxygen_saturation": 98,
    "heart_rate": 145
  },
  "exam": {
    "ears": "normal",
    "lungs": "clear",
    "throat": "mild erythema",
    "hydration": "normal"
  },
  "tests": {
    "urine_dipstick": "negative",
    "urine_culture": "not_done",
    "crp": null,
    "wbc": null,
    "viral_pcr": null,
    "blood_culture": null,
    "imaging": null
  },
  "diagnosis": {
    "primary": "viral upper respiratory infection",
    "infection_type": "viral",
    "body_system": "upper_respiratory",
    "confirmed": false
  },
  "treatment": {
    "antibiotic": false,
    "antipyretic": true
  },
  "outcome_72h": {
    "fever_resolved": true,
    "hospitalized": false,
    "antibiotic_started_later": false
  },
  "labels": {
    "infection_type": "viral",
    "body_system": "upper_respiratory",
    "triage_at_visit": "same_day_visit",
    "confidence_level": "clinician_diagnosis"
  },
  "provenance": {
    "site": "site_id_001",
    "clinician_id_pseudonym": "psn_xxx",
    "consent_version": "2026-01-01"
  }
}
```

### 2.2 What we collect

- Demographics (age, sex, weight, optional country/region).
- Symptoms (free text **and** structured fields).
- Vitals (linked from MedOS Connect when available).
- Exam findings.
- Tests when available (urinalysis, CRP, WBC, viral PCR, cultures, imaging summary).
- Treatment.
- 72-hour outcome.
- Final clinician diagnosis with a `confidence_level`.

### 2.3 Inclusion / exclusion

- Include: acute presentations across the body systems in scope.
- Exclude: oncology, psychiatry, obstetrics specifics, intensive-care patients (out of MVP scope).

### 2.4 Site rotation

Data is collected across multiple sites/regions to avoid single-site overfitting. Subgroup distribution is monitored continuously (see `06-evaluation/EVALUATION.md`).

---

## 3. Level 3 — Verified labels (release gate)

We do not label "viral vs bacterial" from symptoms alone. The label confidence is part of the schema (`labels.confidence_level`):

```yaml
confidence_level:
  - confirmed_lab        # positive culture, viral PCR, urinalysis + culture
  - confirmed_imaging    # radiology-confirmed pneumonia, etc.
  - clinician_diagnosis  # exam-supported diagnosis without lab confirmation
  - probable             # suggestive but no objective confirmation
  - uncertain            # treated empirically, outcome ambiguous
```

The release gate is computed **only** on cases with `confirmed_lab` or `confirmed_imaging`. Lower-confidence labels are still trained on, but they're weighted down and excluded from the safety release metrics.

> **Important:** antibiotic response is not proof. A child improving on amoxicillin does not retroactively prove a bacterial infection — viruses also resolve. We never use "treatment response" alone as a confirmation label.

---

## 4. Labeling taxonomy (full)

```yaml
infection_type:
  - viral
  - bacterial_confirmed
  - bacterial_probable
  - fungal
  - parasitic
  - non_infectious
  - allergic
  - traumatic
  - unknown

body_system:
  - upper_respiratory
  - lower_respiratory
  - ENT_ear
  - urinary
  - gastrointestinal
  - skin_soft_tissue
  - neurologic
  - systemic
  - eye
  - other

triage_level:
  - home_monitor
  - clinician_24h
  - same_day_visit
  - emergency_now

confidence_level:
  - confirmed_lab
  - confirmed_imaging
  - clinician_diagnosis
  - probable
  - uncertain
```

---

## 5. Hugging Face dataset artifact

The Level-2/3 dataset is published — with appropriate access controls — on Hugging Face Hub:

```text
medos/medos-classify-triage-dataset
```

It ships with a full **dataset card**:

- Source description, consent process, IRB / ethics approvals.
- Schema (the JSON above).
- Per-label counts and per-subgroup distribution.
- Known biases and limitations.
- Versioning and changelog.
- Citation policy.

Public Level-1 data is published as a **separate** dataset (`medos/medos-classify-public-seed`) so it can never be confused with the clinician-supervised set.

---

## 6. From data to model

```text
Level 1 (public)  →  Train extractor + baseline classifier  →  Demo Space, no claims
Level 2 (clinician)  →  Train production candidate          →  Internal pilot
Level 3 (verified)   →  Compute release metrics             →  Decision-support deploy
```

This data plan is what lets Phase 0 → Phase 3 in `09-roadmap/ROADMAP.md` happen safely.
