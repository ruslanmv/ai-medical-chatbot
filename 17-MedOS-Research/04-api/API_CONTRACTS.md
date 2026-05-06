# MedOS Research & Development — API Contracts

All MedOS Research APIs live under a new namespace:

```text
/api/research/*
```

Existing MedOS routes are unchanged. Every route is authenticated, permission-checked, and audit-logged via `09-safety/RESEARCH_SAFETY_AND_GOVERNANCE.md`.

---

## 1. Research project APIs

```text
GET    /api/research/projects
POST   /api/research/projects
GET    /api/research/projects/:id
PATCH  /api/research/projects/:id
DELETE /api/research/projects/:id
```

### Create project example

```json
{
  "title": "Tinnitus mechanisms — central gain candidates",
  "diseaseArea": "tinnitus",
  "target": "central auditory gain modulators",
  "description": "Phase 0 demo project."
}
```

---

## 2. Literature APIs

```text
POST /api/research/literature/search
POST /api/research/literature/read
POST /api/research/literature/summarize
POST /api/research/literature/compare
POST /api/research/literature/brief
```

### Search example

```json
{
  "projectId": "project-123",
  "query": "long COVID mitochondrial dysfunction treatment",
  "sources": ["pubmed", "clinical_trials", "arxiv"],
  "limit": 20,
  "includePreprints": true
}
```

### Brief response shape (excerpt)

```json
{
  "briefId": "brief_01H...",
  "themes": [
    { "title": "Mitochondrial dysfunction as a candidate mechanism",
      "supportingRecordIds": ["lit_1", "lit_5", "lit_12"] }
  ],
  "gaps": [
    "No randomized controlled trials reported in the retrieved corpus.",
    "Heterogeneous outcome measures across studies."
  ],
  "evidenceMatrix": "evidence_matrix_01H..."
}
```

Every record cited in the brief carries `peerReviewStatus` and `evidenceStage`.

---

## 3. Hypothesis APIs

```text
GET  /api/research/hypotheses?projectId=
POST /api/research/hypotheses
POST /api/research/hypotheses/:id/evaluate
POST /api/research/hypotheses/:id/safety-review
```

### Create hypothesis example

```json
{
  "projectId": "project-123",
  "statement": "Compound X reduces central auditory gain via target Y in a tinnitus model.",
  "rationale": "Convergent evidence from preclinical studies [12,17] and one phase-I PK study [21].",
  "supportingLiteratureIds": ["lit_12", "lit_17", "lit_21"],
  "contradictingLiteratureIds": ["lit_8"],
  "confidence": "low"
}
```

---

## 4. Candidate medicine APIs

```text
GET  /api/research/candidates?projectId=
POST /api/research/candidates
POST /api/research/candidates/compare
POST /api/research/candidates/:id/evidence-map
POST /api/research/candidates/:id/safety-review
```

### Compare candidates example

```json
{
  "projectId": "project-123",
  "candidateIds": ["cand_1", "cand_2", "cand_3"],
  "axes": ["mechanism", "evidence_stage", "known_risks", "trial_status"]
}
```

The response is a comparison table with one row per candidate and one column per axis. Each cell carries supporting `LiteratureRecord` ids.

Every comparison response includes a `humanUseWarning` block at the top of the payload that the UI is **required** to render.

---

## 5. Simulation APIs

```text
POST /api/research/simulations/plans
GET  /api/research/simulations?projectId=
POST /api/research/simulations/:id/results
POST /api/research/simulations/:id/interpret
```

Simulation plan outputs must include:

```text
assumptions
input data
method
limitations
reproducibility notes
safety boundary
human-review status
```

A plan cannot transition to `approved` without a passing safety review.

---

## 6. Publication APIs

```text
POST /api/research/publications/outline
POST /api/research/publications/draft
POST /api/research/publications/citation-check
POST /api/research/publications/safety-review
POST /api/research/publications/export
```

Export will fail unless:

- `citation-check` returned no fabricated or missing citations.
- `safety-review` returned `passed`.
- A human author has signed off (recorded in audit).

---

## 7. Safety APIs

```text
POST /api/research/safety/screen-claim
POST /api/research/safety/review-protocol
POST /api/research/safety/review-publication
GET  /api/research/audit-log?projectId=
```

### `POST /api/research/safety/screen-claim`

```json
{
  "text": "Compound X cures tinnitus at 50 mg twice daily.",
  "context": "candidate_medicine_evidence_summary"
}
```

Response:

```json
{
  "status": "blocked",
  "reasons": ["unsupported_cure_claim", "dose_recommendation"],
  "saferRewrite": "Compound X has shown an effect on a tinnitus-related endpoint in two preclinical studies; clinical efficacy is unproven and no dosing recommendation can be made."
}
```

### `POST /api/research/safety/review-protocol`

Returns the R0–R5 risk class, the list of required human reviews, and any blocking reasons. R5 protocols are blocked outright in MVP.

---

## 8. Error format

All error responses use a consistent shape:

```json
{
  "error": {
    "code": "claim_blocked_unsupported_cure",
    "message": "The claim was blocked by the Clinical Safety Reviewer.",
    "retryable": false
  }
}
```

Common error codes:

```text
unauthorized
forbidden
not_found
validation_error
permission_denied_project
claim_blocked_unsupported_cure
claim_blocked_dose_recommendation
claim_blocked_off_label
protocol_blocked_r5
publication_blocked_safety_review
fabricated_citation_detected
```
