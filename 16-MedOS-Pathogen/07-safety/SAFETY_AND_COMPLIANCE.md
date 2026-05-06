# MedOS Pathogen — Safety and Compliance

MedOS Pathogen interprets clinical artifacts (microscopy slides, chest radiographs, genomic sequences). That puts it in the most regulatory-sensitive part of the MedOS ecosystem. This document captures the safety guardrails, the privacy controls, the license posture, and the regulatory considerations the design assumes.

> WHO and FDA both stress that AI medical software must support clinicians, not replace them, with safety, transparency, governance, human oversight, and risk management. Image-based diagnostic AI is generally treated as **Software as a Medical Device (SaMD)** in major jurisdictions. MedOS Pathogen is built against those principles from day one.

---

## 1. Hard rules at the MCP boundary

Some rules **cannot be overridden** by the agent, the LLM, or the user. They are deterministic, version-controlled, unit-tested, and signed off by a clinical advisor before any change.

```text
If quality screen rejects the artifact            → no model output emitted
If view classifier returns "unsupported"          → status=view_unsupported
If view classifier returns "non_radiograph"       → status=image_quality_rejected, OOD logged
If OOD detector flags far-OOD                     → confidence forced to "low"
If pediatric input lacks pediatric calibration    → age_calibration_warning attached
If reference-bank similarity < floor              → confidence forced to "low",
                                                    ambiguity_flags include
                                                    low_reference_similarity
If permission check fails                         → error.permission_denied_member
If a clinician-line in the explainer cannot
   be traced to a feature/region/guideline        → fall back to template-based explainer
If the configured calibration version is stale    → response carries
                                                    stale_calibration_warning
```

No model output ever gets the `confidence: high` label unless calibration, OOD, and quality checks all pass.

---

## 2. Agent guardrails

Because MedOS Pathogen is called by an agentic AI, the MCP boundary enforces:

- The agent **cannot** suppress the disclaimer string.
- The agent **cannot** rewrite, hide, or downgrade OOD or quality flags.
- The agent **cannot** infer findings on rejected artifacts.
- The agent **must** include the recommendation and disclaimer verbatim in any final user-facing summary.
- The agent **must not** publish or share asset URLs outside the user's permission scope.

Violations are detected by output post-processing and turned into errors, not silently allowed.

---

## 3. Out-of-scope behaviors (explicit non-goals)

MedOS Pathogen will not:

- Make a final diagnosis.
- Recommend a specific antibiotic, antifungal, or antiviral.
- Output a result without uncertainty and visible evidence.
- Replace radiologist or microbiologist review.
- Process artifacts without a permission check.
- Output anything when quality / OOD / view checks fail.

If the agent asks for any of the above, the MCP server returns a structured refusal with the reason and a redirect to a clinician.

---

## 4. Privacy and de-identification

### 4.1 What we strip on ingest

**DICOM** — every PHI-carrying tag is stripped before the artifact reaches the model. Mandatory removals include (non-exhaustive):

```text
PatientName, PatientID, PatientBirthDate, PatientSex
StudyDate, StudyTime, StudyID, StudyDescription
AccessionNumber, ReferringPhysicianName
PerformingPhysicianName, OperatorsName
InstitutionName, InstitutionAddress
DeviceSerialNumber
```

Burned-in text in the pixel data is detected via lightweight OCR and redacted with a black box on a working copy. The original DICOM is kept only in an access-controlled audit store with consent.

**Images** — EXIF metadata stripped. GPS, device serial, timestamp removed.

**Sequence** — FASTA / FASTQ headers normalized. User-provided free text (which sometimes contains names or sample IDs) is discarded.

### 4.2 What we store

- Audit records (asset hashes, model versions, calibration versions, OOD/quality flags, output hashes, caller identity, latency).
- Aggregated metrics for monitoring and drift.
- Clinician-curated training cases under explicit consent and access control.

### 4.3 What we do not store by default

- Original PHI-bearing DICOMs unless the deployment's data-governance policy explicitly enables it.
- Burned-in text recovered from radiographs.
- Asset URLs after their TTL expires.
- Any data outside the user's regional jurisdiction.

### 4.4 Controls

- Encryption at rest (AES-256) and in transit (TLS 1.3).
- Per-region data residency.
- Field-level access control on stored cases.
- Configurable data-retention policy.
- Subject access and deletion endpoints (right to erasure).
- Pre-signed-URL ingestion with short TTLs to avoid long-lived asset links.

---

## 5. Consent and family permissions

MedOS Pathogen integrates with the MedOS Family permission model defined in `13-MedOS-Family/`:

- **Adult members:** image / sequence analysis on adult artifacts can only be requested with the adult's consent.
- **Children:** analysis on a child's artifacts can be requested by the legal guardian / Family Admin.
- **Caregivers:** access is configurable, mirroring the matrix used by MedOS Connect and MedOS Classify.
- **Clinicians:** site-level role-based access in pilot deployments.

Every classification call performs a permission check **before** any model is invoked. A failed check returns `error.permission_denied_member`, never a silent fallback.

---

## 6. License compliance

Image and sequence datasets carry strict license terms. MedOS Pathogen treats license compliance as a safety property:

- Each public seed dataset has a recorded license review.
- The Hugging Face Space demo serves only models trained on license-clean splits and never re-distributes raw images that forbid redistribution.
- Conflicting licenses are kept in **separate** Hugging Face artifacts so downstream users can pick a compatible subset.
- Commercial-use restrictions inherited from a dataset are reflected in the resulting model's license.

---

## 7. Auditability

Every MCP tool call writes an append-only audit record:

```text
timestamp, caller (agent + user), tool name,
asset SHA-256, patient-context hash,
model version, calibration version,
reference-bank version (sequence) / RAG index version (explainer),
quality flags, OOD flags,
output hash, latency, result status
```

Audit records are tamper-evident (hash-chained or written to a WORM store) so that a clinician or regulator can reconstruct exactly which model and which calibration produced any past output.

---

## 8. Bias and drift monitoring

```text
Per-vendor / device performance     X-ray machine make + model
Per-stain performance               microscopy stain types
Per-platform performance            sequencing platform
Per-age-band performance
Per-sex performance
Per-site performance                each clinical partner
```

Subgroup safety metrics are reviewed weekly. A regression in any monitored subgroup pauses promotion of new model versions and opens an incident ticket.

Drift detectors run on:

- Input feature drift (embedding-space drift per modality).
- Prediction drift (label distribution shift).
- Calibration drift (reliability diagram drift).
- Reference-bank drift (sequence: new species coverage; X-ray: new vendors at a site).

---

## 9. Incident response

A "clinical incident" is any case where:

- A high-risk finding (TB, suspected pneumonia, malaria-positive) was missed.
- A clear OOD input produced a high-confidence label.
- A clinician's annotated correct label is materially different from the system output on a `low` uncertainty case.

Each incident:

- Triggers an alert.
- Locks the implicated model version from new deployments.
- Generates a root-cause review with the clinical advisor and modality lead.
- May add a new entry to the quality-screen / OOD test bank or a new test case to the golden test set.

---

## 10. Regulatory landscape

MedOS Pathogen is positioned as **clinical decision support**, not autonomous diagnosis. The actual classification depends on jurisdiction and on the **claims** the product makes; image-based diagnostic AI sits squarely in SaMD territory.

### European Union

- **EU MDR** (Medical Device Regulation 2017/745): software providing information used to take decisions for diagnostic or therapeutic purposes is generally a medical device. Image-based pathogen / pneumonia / TB classifiers typically fall in higher risk classes than text-only triage tools.
- **EU AI Act**: high-risk AI systems (including safety-related medical software) carry obligations on risk management, data governance, transparency, human oversight, and post-market monitoring.
- **GDPR**: applies to any processing of personal health data; lawful basis, DPIA, and data subject rights are mandatory.

### United States

- **FDA SaMD**: image-based diagnostic AI typically requires FDA clearance under the SaMD framework. Specific pathways depend on the predicate and the claims.
- **HIPAA**: applies to processing of PHI in covered-entity contexts; DICOM PHI handling must conform.

### Position taken in this design

- MedOS Pathogen makes **no claim of autonomous diagnosis**.
- It is positioned as **decision support** that always recommends clinician involvement and lab/radiologist confirmation.
- It maintains the documentation, auditability, and post-market monitoring expected of a high-risk medical AI system, so when a regulated deployment is targeted, the gap is paperwork and clinical validation, not architecture.

A formal regulatory assessment must be performed before any deployment that crosses from research/pilot into routine clinical use.

---

## 11. Disclaimers

Every user-facing output must include a disclaimer such as:

> *"This is clinical decision support and does not replace a clinician or laboratory confirmation. Findings must be correlated clinically and with appropriate tests."*

The disclaimer is part of the output schema and the agent cannot omit it.
