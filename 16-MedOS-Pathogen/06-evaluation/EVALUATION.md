# MedOS Pathogen — Evaluation

For an image / sequence-based diagnostic classifier, **safety dominates accuracy**, and **calibration and OOD detection are non-negotiable**. A model that is 95% accurate on a curated test set but silently emits high-confidence outputs on a non-radiograph is unsafe. Evaluation is therefore built around safety-first metrics, subgroup performance, calibration, OOD robustness, and quality-screen reliability.

---

## 1. Primary safety metrics

These are the **release-gate** metrics per modality. A new model version cannot be promoted unless every safety metric is on or above target.

### 1.1 Microscopy

| Metric | Target |
|---|---|
| Top-1 accuracy on `morphology_class` (clinician-reviewed test) | ≥ 90% |
| Sensitivity on `parasitized_rbc` (malaria-positive) | ≥ 97% |
| ECE per head | ≤ 8% |
| Quality-screen rejection of out-of-focus / non-microscopy inputs | ≥ 95% sensitivity |
| OOD flag on far-OOD images | ≥ 90% sensitivity |

### 1.2 Chest X-ray

| Metric | Target |
|---|---|
| Pneumonia sensitivity (held-out clinician-reviewed set) | ≥ 95% |
| Pneumonia specificity | ≥ 80% |
| TB sensitivity (Shenzhen + Montgomery test split) | ≥ 95% |
| TB specificity | ≥ 90% |
| COVID-pattern AUROC | ≥ 0.85 |
| ECE per head (triage-relevant heads) | ≤ 8% |
| View classifier accuracy (PA / AP / lateral / non-radiograph) | ≥ 99% |
| OOD flag on non-radiograph inputs | ≥ 99% sensitivity |

### 1.3 Sequence

| Metric | Target |
|---|---|
| Kingdom-classification accuracy (RefSeq held-out species) | ≥ 99% |
| Top-1 species accuracy on curated pathogen set | ≥ 90% |
| ECE on kingdom head | ≤ 5% |
| Low-similarity flag sensitivity (sequences with no near reference) | ≥ 95% |
| Minimum-length rejection accuracy | ≥ 99% |

These metrics are computed on the **held-out, lab- or imaging-confirmed** subset (Level 3 in `04-data/DATASET_STRATEGY.md`). Cases with `confidence_level ∈ {confirmed_lab, confirmed_imaging}` are the ground truth for the gate.

---

## 2. Secondary metrics

```text
AUROC per head
AUPRC per head (more informative under class imbalance)
Macro-F1 across taxa
Brier score
Cohen's kappa vs clinician / radiologist label
Confusion matrix per modality, especially bacterial-vs-viral pneumonia
```

---

## 3. Subgroup analysis (mandatory)

Aggregate metrics hide harm. Every release reports the safety metrics **per subgroup**:

```text
Microscopy:
  - Stain type      (gram / giemsa / wright / wright_giemsa / other)
  - Microscope      (vendor / model when available)
  - Site / lab      (each clinical partner)
  - Specimen type   (blood smear / gram-stained slide / other)

Chest X-ray:
  - Age band        (pediatric / adult / elderly)
  - Sex             (male / female / unknown)
  - View            (PA / AP)
  - Vendor / model  (each X-ray machine when available)
  - Site            (each clinical partner)
  - Body habitus    (when label available)

Sequence:
  - Sequencing platform (Illumina / Nanopore / PacBio / other)
  - Read length band
  - Sample source       (respiratory / blood / GI / other)
  - Reference coverage  (well-covered species / under-represented species)
```

Release rule: **no subgroup may be more than 5 percentage points worse than the overall sensitivity targets above.** A subgroup gap that crosses that threshold blocks release until investigated.

Pediatric chest X-ray and rare microscopy stains are flagged as **always safety-critical** — even a passing aggregate metric is rejected if these subgroups regress.

---

## 4. Calibration

Each head is calibrated on a separate calibration split and reported with:

- **Reliability diagram** (10 bins, equal-frequency).
- **Expected Calibration Error (ECE).**
- **Maximum Calibration Error (MCE).**

Pediatric calibration is reported separately for chest X-ray when sufficient pediatric data is available.

> When the calibrated probability is "0.7," roughly 70% of similar cases should turn out positive. This holds even more strictly for image classifiers, which can be brittle and over-confident on visually unfamiliar inputs.

---

## 5. OOD detection

Image classifiers fail catastrophically on OOD inputs. MedOS Pathogen treats OOD detection as a first-class metric.

OOD test sets:

```text
Microscopy:
  - selfies, photos of objects, slides without microscope view (far-OOD)
  - histology slides instead of microscopy (near-OOD)
  - heavily over/under-stained microscopy (in-distribution but degraded)

Chest X-ray:
  - non-radiograph photos and screenshots (far-OOD)
  - non-thoracic radiographs: abdominal, pelvic, extremity (near-OOD)
  - lateral chest views (near-OOD; should trigger view_unsupported)
  - heavily rotated / over-exposed radiographs (in-distribution but degraded)

Sequence:
  - random nucleotide strings
  - mixed-organism / contamination-heavy reads
  - extremely short sequences below minimum length
```

OOD performance is reported in every model card, and a regression in OOD sensitivity blocks release.

---

## 6. Quality-screen reliability

The quality screens (blur / view / exposure / minimum-length) are **safety filters**, not advisory. Their reliability is itself release-gated:

| Screen | Target |
|---|---|
| Microscopy blur detector | ≥ 95% sensitivity on out-of-focus reference set |
| X-ray view classifier (lateral / non-radiograph rejection) | ≥ 99% sensitivity |
| X-ray exposure check | ≥ 90% sensitivity |
| Sequence minimum-length / ambiguous-base check | ≥ 99% sensitivity |

If a quality screen fails, the model code never runs and the user gets an actionable error.

---

## 7. Adversarial / stress tests

Curated test sets that any model must pass:

- **Quality-screen golden set** — clinician-curated rejected and accepted artifacts; the screens must call them correctly.
- **Stain-shift tests** — same field, different stains, verifies stain-aware augmentation worked.
- **Rotation / mirror tests** — radiographs rotated and mirrored should not produce wildly different predictions.
- **Vendor-shift tests** — same anatomy across different X-ray machines should not produce divergent predictions.
- **Heatmap-on-correct-region** — Grad-CAM regions should overlap clinically reasonable anatomy a clinician-reviewed proportion of the time.
- **Sequence drop / sequence noise** — small perturbations should not flip kingdom classification.
- **Prompt-injection attempts in metadata** — DICOM tag injections, FASTA header injections must not alter behavior.

---

## 8. Live monitoring (post-deploy)

Evaluation does not stop at release.

```text
Prometheus / Grafana       latency, error rates, OOD-flag rate, view rejection rate
Drift monitoring           input feature drift, prediction drift, calibration drift
Reference-bank refresh     sequence reference index version tracked per call
Outcome capture            culture / PCR / radiologist outcome label collected when possible
Clinician feedback         "agree / disagree / annotate" UI in the pilot tool
Incident reporting         any clinically significant disagreement → ticket + review
```

A weekly review dashboard shows: subgroup safety metrics, calibration drift, OOD-flag distribution, top disagreement cases, and quality-screen rejection rates per site.

If any monitored safety metric crosses a guardrail, the model is automatically rolled back to the previous validated version.

---

## 9. What we explicitly do not optimize

- Single-number "beat the benchmark" accuracy.
- Aggregate accuracy without subgroup breakdown.
- Latency at the cost of safety.
- Throughput at the cost of OOD detection.

The product is **clinical decision support that earns clinician trust over time.** The metrics here are the contract that supports that.
