# MedOS Classify — Safety and Compliance

MedOS Classify is intended for use in or alongside clinical care. It is **clinical decision support**, not autonomous medicine. This document captures the safety guardrails, the privacy controls, and the regulatory considerations that the design assumes.

> WHO and FDA both stress that AI medical software must support clinicians, not replace them, with safety, transparency, governance, human oversight, and risk management. MedOS Classify is built against those principles.

---

## 1. Hard-coded clinical safety rules

Some rules **cannot be overridden** by the agent, the LLM, or the user. They are deterministic, version-controlled, unit-tested, and signed off by a clinical advisor before any change.

```text
If age < 3 months and current_temp_c >= 38       → urgent medical evaluation
If blue_lips                                     → emergency
If breathing_difficulty / retractions            → emergency
If oxygen_saturation < 92%                       → urgent / emergency
If few wet diapers / dehydration signs           → urgent
If fever_days >= 5 in a child                    → same-day clinician assessment
If non_blanching_rash                            → emergency
If neck_stiffness in a child                     → urgent
If prolonged_seizure                             → emergency
If model uncertainty == "high"                   → at least clinician_24h
If essential field is missing (e.g., age)        → status=insufficient_data; triage>=clinician_24h
If question is about starting / stopping         → recommend clinician confirmation
   antibiotics
```

Triage merge rule:

```text
final_triage = max( model_triage, rule_engine_triage )
```

Models can only **escalate** triage. They can never de-escalate below what the rule engine returned.

---

## 2. Agent guardrails

Because MedOS Classify is called by an agentic AI, the MCP boundary enforces:

- The agent **cannot** rewrite or hide red flags from the user.
- The agent **cannot** suppress the disclaimer string.
- The agent **cannot** call `classify_illness` with structured fields the user never confirmed unless the source is the MedOS Connect / MedOS Family system of record (e.g., a synced thermometer reading).
- The agent **must** include the recommended triage and red flags verbatim in any final user-facing summary.

Violations are detected by output post-processing in the MCP server and turned into errors, not silently allowed.

---

## 3. Out-of-scope behaviors (explicit non-goals)

MedOS Classify will not:

- Diagnose definitively.
- Prescribe medication or change dosing.
- Tell a parent to start or stop antibiotics.
- Recommend a specific drug or dose.
- Estimate prognosis.
- Make end-of-life or psychiatric judgments.

If the agent asks for any of the above, the MCP server returns a structured refusal with the reason and a redirect to a clinician.

---

## 4. Privacy and data minimization

### What we store

- Audit records (input hash, model versions, rule fires, output hash, caller identity).
- Aggregated metrics for monitoring and drift.
- Clinician-supervised cases for training, only with explicit consent.

### What we do not store by default

- Raw PHI in audit logs unless the deployment's data-governance policy explicitly enables it under access controls.
- Free-text inputs longer than necessary for the request lifecycle.
- Any data outside the user's regional jurisdiction.

### Controls

- De-identification on ingestion for the training dataset.
- Field-level access control on stored cases.
- Encryption at rest (AES-256) and in transit (TLS 1.3).
- Per-region data residency.
- Configurable data-retention policy.
- Subject access and deletion endpoints (right to erasure).

---

## 5. Consent and family permissions

MedOS Classify integrates with the MedOS Family permission model defined in `13-MedOS-Family/`:

- **Adult members:** classifications on adult data can only be requested with the adult's consent.
- **Children:** classifications on child data can be requested by the legal guardian / Family Admin.
- **Caregivers:** access is configurable, mirroring the same matrix used by MedOS Connect.

Every classification call includes a permission check before any model is invoked. A failed check returns `error.permission_denied_member`, never a silent fallback.

---

## 6. Auditability

Every MCP tool call writes an append-only audit record:

```text
timestamp, caller (agent + user), tool name,
input hash, model versions, RAG index version,
rule fires, output hash, latency, result status
```

Audit records are tamper-evident (hash-chained or written to a WORM store) so that a clinician or regulator can reconstruct exactly which model, which rules, and which guideline index produced any past output.

---

## 7. Bias monitoring

```text
Per-language performance       English / Italian / mixed
Per-age-band performance       <3 mo / 3–24 mo / 2–5 y / … / 65+ y
Per-sex performance
Per-site performance           if multiple clinical partners
```

Subgroup safety metrics are reviewed weekly. A regression in any monitored subgroup pauses promotion of new model versions and opens an incident ticket.

---

## 8. Incident response

A "clinical incident" is any case where:

- A red flag was missed.
- Triage was de-escalated below the rule-engine floor.
- A clinician's annotated correct triage is more than one level higher than the system output on a case the system labeled `low` uncertainty.

Each incident:

- Triggers an alert.
- Locks the implicated model version from new deployments.
- Generates a root-cause review with the clinical advisor.
- May add a new entry to the red-flag rule set or a new test case to the golden test bank.

---

## 9. Regulatory landscape

MedOS Classify is designed to be defensible if/when it crosses regulatory thresholds. The actual classification depends on jurisdiction and on the **claims** the product makes.

### European Union

- **EU MDR** (Medical Device Regulation 2017/745): software intended to provide information used to take decisions for diagnostic or therapeutic purposes is generally a medical device.
- Risk class depends on the severity and reversibility of decisions the software supports.
- **EU AI Act**: high-risk AI systems (including safety-related medical software) carry obligations on risk management, data governance, transparency, human oversight, and post-market monitoring.
- **GDPR**: applies to any processing of personal health data; lawful basis, DPIA, and data subject rights are mandatory.

### United States

- **FDA SaMD** (Software as a Medical Device): if the product makes claims that drive clinical decisions, it is likely a SaMD subject to FDA oversight.
- **HIPAA**: applies to processing of PHI in covered-entity contexts.

### Position taken in this design

- MedOS Classify makes **no claim of diagnosis**.
- It is positioned as **decision support** that always recommends clinician involvement.
- It maintains the documentation, auditability, and post-market monitoring expected of a high-risk medical AI system, so that when a regulated deployment is targeted, the gap is paperwork and clinical validation, not architecture.

A formal regulatory assessment must be performed before any deployment that crosses from research/pilot into routine clinical use.

---

## 10. Disclaimers

Every user-facing output must include a disclaimer such as:

> *"This is clinical decision support and does not replace a clinician. Seek immediate medical attention if symptoms worsen or red flags appear."*

The disclaimer is part of the output schema and the agent cannot omit it.
