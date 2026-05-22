# Research Safety and Governance

## 1. Core rule

MedOS Research & Development supports **research**. It does not provide patient-specific medical advice, diagnosis, prescriptions, or treatment recommendations. The Clinical Safety Reviewer (modeled on the HomePilot General Doctor persona) is invoked at every output boundary.

---

## 2. Blocked outputs

The system **blocks or rewrites** any output that contains:

```text
Claims that a medicine cures a disease without validated evidence
Dosage recommendations for patients
Off-label treatment recommendations
Instructions to bypass clinicians or ethics review
Human-subject experiment instructions without IRB / ethics framing
Patient-specific treatment plans
Fabricated citations
Hidden PHI use
```

The reviewer's response is structured:

```ts
{
  status: "passed" | "needs_revision" | "blocked",
  reasons: string[],          // e.g., ["unsupported_cure_claim", "dose_recommendation"]
  saferRewrite?: string,
}
```

If `status = "blocked"`, the original text never leaves the boundary. If `status = "needs_revision"`, the reviewer either applies the `saferRewrite` (when the rewrite preserves the underlying scientific statement) or returns the violation to the author for manual revision.

---

## 3. Risk classes

```text
R0  Literature summary only
R1  Hypothesis generation
R2  Candidate comparison / in-silico simulation plan
R3  Preclinical protocol draft
R4  Clinical protocol draft
R5  Patient-facing or treatment-impacting output
```

Gating:

- **R0–R2** — system-internal review is sufficient; human author signs off before publication export.
- **R3** — requires named preclinical reviewer + ethics review documented in audit.
- **R4** — requires named clinical, ethics, legal, and regulatory reviewers documented in audit.
- **R5** — **blocked outright in MVP.** The API rejects R5 plans with `protocol_blocked_r5`.

The R0–R5 classification is produced by the Clinical Safety Reviewer via `protocol_risk_classification` and is recorded on the artifact (e.g., `SimulationPlan.riskClass`).

---

## 4. Per-disease safety notes (MVP demo projects)

The four MVP demo diseases have specific failure modes the reviewer must catch.

| Disease | Most-likely violation | Reviewer behavior |
|---|---|---|
| Tinnitus | "cures tinnitus" cure claims; "this dose works" advice in preprint summaries | Blocks cure language, blocks any dose phrasing, requires "research-only" disclaimer. |
| Cancer | "use this in patients" recommendations; off-label combination suggestions | Blocks treatment recommendations, requires subtype + trial-stage tagging. |
| Autoimmune hepatitis | implicit "safe for everyone" framing for immunomodulators | Requires explicit immunosuppression-risk caveats, blocks vulnerable-population framing. |
| Diabetes | glycemic-target advice; insulin / oral-agent dose phrasing | Blocks any patient-target advice and any dose phrasing. |

---

## 5. Audit events

Every privacy-sensitive or safety-relevant action writes an audit event:

```text
research_project.created
research_project.archived
literature.search
paper.summarized
paper.imported
hypothesis.created
hypothesis.safety_reviewed
candidate.compared
candidate.safety_reviewed
simulation.plan_created
simulation.plan_classified
simulation.plan_approved
simulation.plan_rejected
safety.claim_blocked
safety.claim_rewritten
publication.draft_created
publication.safety_reviewed
publication.exported
fabricated_citation_detected
phi_in_research_attempt_blocked
export.generated
```

Audit entries are append-only, never store raw PHI, and include:

- Actor user id.
- Project id (when relevant).
- Event type.
- Structured metadata (no free-text dumps).
- Timestamp.

---

## 6. Privacy

- Patient PHI is **never** automatically used in research projects.
- Any research use of patient-derived data requires:
  - Documented consent.
  - Approved de-identification.
  - Governance review.
  - Audit logging of the access.
- MedOS Family / MedOS Connect data does **not** flow into research projects automatically. The integration plan (`10-integration-medos/INTEGRATION_PLAN.md`) explicitly forbids it for MVP.

If a user attempts to upload PHI into a research project, the request is blocked and audited as `phi_in_research_attempt_blocked`.

---

## 7. Persona safety inheritance

The Clinical Safety Reviewer's posture is inherited from the HomePilot General Doctor persona:

- "You do NOT diagnose, prescribe, or replace a licensed clinician."
- Begin every health-domain response with a disclaimer.
- Always screen for red flags and route to emergency services.
- Never recommend prescription medications, dosages, or off-label uses.

The reviewer's MCP server is implemented as a Python-native MCP safety adapter (the same architectural pattern as `mcp-general-doctor`) that enforces a versioned policy document — the MedOS R&D equivalent of `docs/medical/medical-ai-safety-policy.md`. Policy changes are reviewed and versioned in audit just like rule-engine changes elsewhere in MedOS.

---

## 8. Kill switch

The MCP server, the API namespace `/api/research/*`, and the persona loader can each be disabled via a single feature flag. When the flag is off:

- Existing data is preserved.
- New requests return 404.
- No persona under MedOS Research can be loaded by HomePilot.

This is the same reversibility principle every MedOS module since 13-Family follows.
