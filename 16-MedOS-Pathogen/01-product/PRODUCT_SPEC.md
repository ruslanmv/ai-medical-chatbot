# MedOS Pathogen — Product Specification

## 1. Vision

**MedOS Pathogen** is a pathogen-identification and imaging-pattern engine exposed as an MCP server. Where MedOS Classify reasons over the patient's *clinical picture*, MedOS Pathogen interprets the *artifact*: a microscopy slide, a chest X-ray, or a genomic sequence. It returns calibrated probabilities, visual or sequence-level evidence, and a recommended next step.

It is **clinical decision support**, not autonomous diagnosis. The architecture and posture follow the same WHO/FDA-aligned principles as MedOS Classify: human oversight, transparency, governance, calibrated uncertainty, and audit.

### Tagline

> *Looks at the slide, the X-ray, or the sequence; reports a calibrated probability with visible evidence; recommends the safest next step.*

---

## 2. Supported modalities (MVP)

| Modality | Inputs | Output heads |
|---|---|---|
| **Microscopy** | Single image (gram-stain, thin/thick blood smear, light microscopy) | `morphology_class`, `pathogen_or_finding`, `quality` |
| **Chest X-ray** | Single frontal radiograph (DICOM or PNG/JPEG) | `pneumonia_present`, `pattern_class` (bacterial / viral / atypical / other), `tb_screen`, `covid_pattern` |
| **Sequence** | FASTA/FASTQ; assembled or short reads | `kingdom_class` (virus / bacterium / fungus / unknown), `taxon_top_k`, `confidence` |

Out of MVP scope: histopathology, dermatology, ophthalmology imaging, CT/MRI, full-genome metagenomics. These are documented as future extensions but not built first.

---

## 3. Output contract

### 3.1 Microscopy

```json
{
  "modality": "microscopy",
  "morphology_class": {
    "gram_positive_cocci_clusters": 0.71,
    "gram_positive_cocci_chains": 0.08,
    "gram_negative_rods": 0.05,
    "yeast": 0.02,
    "other_or_unclear": 0.14
  },
  "pathogen_or_finding": [
    { "label": "Staphylococcus-like (gram-positive cocci in clusters)", "probability": 0.71, "confidence": "medium" },
    { "label": "Streptococcus-like (gram-positive cocci in chains)", "probability": 0.08, "confidence": "low" }
  ],
  "quality": {
    "in_focus": 0.93,
    "stain_quality": "acceptable",
    "field_useable": true
  },
  "evidence": {
    "saliency_png_url": "…",
    "nearest_neighbors": [
      { "training_id": "DIBaS_xxx", "label": "Staphylococcus aureus", "similarity": 0.81 }
    ]
  },
  "recommendation": "Suggestive only; confirm with culture and clinician review.",
  "disclaimer": "This is clinical decision support and does not replace laboratory confirmation."
}
```

### 3.2 Chest X-ray

```json
{
  "modality": "chest_xray",
  "pneumonia_present": { "probability": 0.78, "confidence": "medium" },
  "pattern_class": {
    "bacterial": 0.62,
    "viral": 0.31,
    "atypical": 0.04,
    "other_or_unclear": 0.03
  },
  "tb_screen": { "probability": 0.06, "confidence": "low" },
  "covid_pattern": { "probability": 0.09, "confidence": "low" },
  "evidence": {
    "gradcam_png_url": "…",
    "highlighted_regions": ["right_lower_lobe"]
  },
  "image_quality": {
    "view": "PA",
    "rotation_ok": true,
    "exposure": "acceptable"
  },
  "recommendation": "Findings consistent with pneumonia; pattern more suggestive of bacterial than viral. Correlate clinically and with labs.",
  "disclaimer": "This is clinical decision support and does not replace radiologist or clinician interpretation."
}
```

### 3.3 Sequence

```json
{
  "modality": "sequence",
  "kingdom_class": { "virus": 0.84, "bacterium": 0.10, "fungus": 0.02, "unknown": 0.04 },
  "taxon_top_k": [
    { "name": "Influenza A virus", "rank": "species", "probability": 0.71 },
    { "name": "Influenza B virus", "rank": "species", "probability": 0.09 }
  ],
  "confidence": "medium",
  "evidence": {
    "k_mer_signatures": ["…"],
    "nearest_reference": { "accession": "NC_xxxxx", "similarity": 0.92 }
  },
  "ambiguity_flags": [],
  "recommendation": "Sequence-level match; confirm with PCR or culture before clinical action.",
  "disclaimer": "Reference identification only. Not a clinical diagnosis."
}
```

The output **never** asserts certainty. Phrases used:

- "Findings consistent with…"
- "Suggestive of…"
- "Correlate clinically and with labs."
- "Confirm with culture / PCR / radiologist."

---

## 4. User flows

### 4.1 Clinician-in-the-loop (primary)

```text
Clinician opens patient case in MedOS Family
   ↓
Uploads X-ray or microscopy image
   ↓
MedOS Pathogen returns probabilities + heatmap + nearest neighbors
   ↓
Result is fed back into MedOS Classify, which updates triage + explanation
   ↓
Clinician confirms / rejects / annotates
   ↓
Annotation flows into the dataset (with consent)
```

### 4.2 Agentic AI flow

```text
Agent collects free-text history
   ↓
MedOS Classify recommends imaging or microscopy
   ↓
Caregiver / clinician uploads the artifact
   ↓
Agent calls MedOS Pathogen tool
   ↓
Agent calls MedOS Classify again with the new evidence
   ↓
Agent presents combined result + disclaimers
```

### 4.3 Research / education (Phase 0 demo)

```text
Public Hugging Face Space
   ↓
Anyone can upload an image
   ↓
Public-seed model runs
   ↓
Output clearly labeled "research demo, not for clinical use"
```

---

## 5. Scope

### In scope (MVP)

- Single-image inference (one DICOM/PNG/JPEG per call) for microscopy and chest X-ray.
- Single-sequence inference (one FASTA/FASTQ record up to a configurable size).
- Calibrated multi-head outputs with visual / sequence-level evidence.
- DICOM handling: read frontal radiographs, normalize to PNG, preserve metadata for audit.
- Image-quality screening (out-of-focus / poor stain / non-radiograph rejection).
- Nearest-neighbor lookup against curated training references.

### Out of scope (MVP)

- Histopathology, ophthalmology, dermatology imaging.
- CT, MRI, ultrasound.
- Full-genome metagenomics.
- Outbreak surveillance, lineage tracking.
- Real-time microscopy video streams.

---

## 6. Success criteria

A successful MedOS Pathogen deployment:

- **Pneumonia X-ray sensitivity ≥ 95%** at the configured operating point on the held-out clinician-reviewed set.
- **TB X-ray sensitivity ≥ 95%**, specificity ≥ 90% on Shenzhen+Montgomery test split.
- **Microscopy gram-class top-1 accuracy ≥ 90%** on a held-out, clinician-reviewed set.
- **Sequence kingdom-classification accuracy ≥ 99%** on RefSeq held-out species.
- **Calibration error (ECE) ≤ 8%** per head.
- **OOD detection** correctly flags ≥ 90% of clearly out-of-domain images (e.g., a non-radiograph uploaded into the X-ray endpoint).
- **Subgroup parity** — no major demographic, device, or site subgroup more than 5 pp below overall sensitivity targets.
- **Visual evidence** present and clinically reasonable on a clinician-reviewed sample.

---

## 7. What this product is not

- Not a radiologist.
- Not a microbiologist.
- Not a single-shot "this is *S. aureus*" stamp.
- Not a substitute for culture, PCR, or radiology review.
- Not a screening service that runs without consent or permission checks.

It is an **MCP tool an agentic AI or clinician can call** to compensate for the agent's lack of image and sequence reasoning, with calibrated probabilities, visible evidence, and a hard safety floor.
