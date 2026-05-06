# MedOS Pathogen — Roadmap

A four-phase plan from research prototype to clinician-supervised decision support. Each phase has explicit goals, deliverables, and gates. MedOS Pathogen is the most regulatory-sensitive MedOS module, so the gates are stricter than in MedOS Classify.

---

## Phase 0 — Research prototype (no clinical claims)

**Goal:** prove the architecture works end-to-end across all three modalities with public seed data.

### Build

- MCP server scaffold with all five tools and the `request_upload_slot` helper, wired to baseline models.
- Three baseline models trained on Level-1 public datasets:
  - **Microscopy** — ConvNeXt-Tiny on DIBaS + NIH Malaria + BBBC subsets.
  - **Chest X-ray** — DenseNet-121 / ConvNeXt-Base pretrained on ChestX-ray14, fine-tuned on RSNA + COVIDx, with TB head trained on Shenzhen.
  - **Sequence** — k-mer + LightGBM on a curated RefSeq + ViPR + BV-BRC subset.
- Quality screens and OOD detectors per modality.
- Grad-CAM / saliency / nearest-neighbor evidence.
- Demo Hugging Face Space with the public-seed models.
- Hugging Face artifacts:
  - `medos/medos-pathogen-public-seed`
  - `medos/medos-pathogen-microscopy` (v0)
  - `medos/medos-pathogen-chest-xray` (v0)
  - `medos/medos-pathogen-sequence` (v0)
  - `medos/medos-pathogen-demo`

### Out of Phase 0

- No PHI.
- No clinical claims of any kind.
- No deployment outside the demo Space.

### Gate

- Schema and quality-screen tests pass.
- OOD detection meets minimum thresholds on the curated OOD test set.
- Demo Space renders correctly with sample inputs across all three modalities.
- Each model card and the dataset card are published with full license documentation.

---

## Phase 1 — Clinician-supervised pilot

**Goal:** collect a Level-2, multi-site dataset under consent and evaluate the model **silently** (predictions logged but not shown to clinicians).

### Build

- Clinical partnerships across modalities:
  - Microbiology lab(s) for microscopy.
  - Radiology department(s) for chest X-ray.
  - Sequencing lab(s) for sequence data.
- Consent flow, ethics review, data governance per site.
- Case-collection schemas (see `04-data/DATASET_STRATEGY.md`) per modality.
- Site rotation across 2–3 sites per modality.
- Outcome capture (culture / PCR / radiologist consensus) when available.

### Train

- Per-modality production candidates (v1) trained on Level-2 data plus the public seed.
- Pediatric calibration table for chest X-ray (when sufficient pediatric data).
- Vendor-aware augmentation for chest X-ray.
- Expanded reference bank for sequence (versioned and stamped into audit).

### Evaluate

- Compute Phase-2 release metrics silently.
- Compare predictions with clinician / radiologist final labels.
- Subgroup analysis (vendor, stain, platform, age, sex, site).

### Gate

- Sufficient case volume per subgroup to make subgroup metrics meaningful.
- IRB / ethics approvals in place at each site.
- DPIA completed per the GDPR posture in `07-safety/SAFETY_AND_COMPLIANCE.md`.
- No use of model output for clinical decisions during this phase.

---

## Phase 2 — Decision support for clinicians

**Goal:** deploy MedOS Pathogen alongside clinicians as advisory output. Still no autonomous patient-facing role.

### Build

- Clinician dashboard inside MedOS Family.
- Side-by-side display: artifact + Grad-CAM / nearest neighbors / k-mer evidence + probabilities + OOD flags + recommendation.
- "Agree / disagree / annotate" feedback loop into the Level-2 dataset.
- Integration with MedOS Classify so imaging / microbiology evidence flows back into clinical reasoning automatically.

### Pre-deployment release gate

(See `06-evaluation/EVALUATION.md` for full metric definitions.)

- **Microscopy** — top-1 morphology accuracy ≥ 90%, malaria sensitivity ≥ 97%, ECE ≤ 8%, OOD sensitivity ≥ 90%.
- **Chest X-ray** — pneumonia sensitivity ≥ 95%, TB sensitivity ≥ 95%, view classifier accuracy ≥ 99%, OOD sensitivity on non-radiograph ≥ 99%.
- **Sequence** — kingdom accuracy ≥ 99%, top-1 species ≥ 90% on curated set, ECE on kingdom ≤ 5%.
- No subgroup more than 5 percentage points below the overall sensitivity targets.

### Operational requirements

- Audit log live with hash chaining or WORM storage.
- Drift monitoring live (input-feature, prediction, calibration).
- Weekly safety review across modalities.
- Clinical advisor on call for incident response per modality.
- License compliance documented per Hugging Face artifact.

### Gate

- All release-gate metrics met on the held-out lab- or imaging-confirmed set.
- A clinical advisor (and modality lead per modality) signs off the model card and the changelog.
- Incident-response runbook is in place.
- Regulatory pre-assessment for the target jurisdiction is documented.

---

## Phase 3 — Clinician-facing scaling and (cautiously) family-facing exposure

**Goal:** scale Phase-2 deployment across more sites, and — only after sustained clinician deployment with no critical incidents — consider conservative family-facing exposure.

### Clinician-facing scaling

- Roll out to additional sites with site-specific calibration.
- Add additional modalities or sub-tasks (e.g., respiratory pathogen panel for sequence) as separate, individually validated heads.
- Strengthen multimodal hand-off with MedOS Classify — let agents request imaging when reasoning warrants it and integrate the result into a single explanation.

### Family-facing exposure (optional, cautious)

If and only if Phase-2 deployment has been live across multiple sites for a sustained period without a critical incident:

- Family-facing screening for narrowly defined use cases (e.g., low-stakes microscopy education, clearly framed "this is a research tool").
- Conservative thresholds: any uncertainty defaults to "see a clinician."
- Strong red-flag escalation when MedOS Classify accompanies the result.
- Clear "not a diagnosis" language on every screen.
- No COVID / TB / pneumonia exposure to non-clinicians without explicit regulatory clearance for that specific use case.

### Gate

- Phase-2 stable across sites.
- Family-facing UX clinician-reviewed.
- Regulatory assessment for the target jurisdictions complete and documented.
- Per-jurisdiction medical-device classification confirmed.

---

## What we never ship

- A "this slide is *S. aureus*" or "this X-ray is bacterial pneumonia" stamp without uncertainty and visible evidence.
- A self-treatment recommendation derived from imaging.
- An antibiotic / antiviral / antifungal start/stop instruction.
- A model that hasn't passed the safety release gate.
- A model trained on a dataset that forbids that use.

---

## Long-term (post-Phase 3)

Each of these is its own product cycle with its own dataset, model card, and release gate:

```text
Microscopy:
  - Whole slide imaging (WSI) for tile-level + slide-level reasoning
  - Acid-fast stain support for mycobacteria
  - Stool / urinary microscopy

Imaging:
  - Pediatric AP variants with dedicated calibration
  - Frontal + lateral pairs
  - Ultrasound (e.g., lung B-line patterns)
  - CT (radiology partnership required)

Sequence:
  - Full-genome metagenomics (research)
  - Antimicrobial resistance gene detection (research)
  - Outbreak / lineage tracking (with credentialed sources like GISAID)

Cross-modality:
  - Joint reasoning across image + sequence + clinical picture
  - Long-running monitoring of subgroup drift across new sites
  - Integration with regional microbiology / radiology PACS systems
```

Each extension reuses the same MCP boundary and the same safety / audit / evaluation framework. The architecture is designed so that adding a new modality does not require changing the contracts the agent already depends on.
