# MedOS Research & Development — Domain Model

The MedOS Research domain is intentionally small and explicit. The fields that matter most to safety (`peerReviewStatus`, `evidenceStage`, `confidence`, `safetyReviewStatus`, `humanUseWarning`, `riskClass`) are first-class so they are deterministic to filter, audit, and display.

---

## ResearchProject

```ts
export interface ResearchProject {
  id: string;
  ownerUserId: string;
  title: string;
  diseaseArea?: string;
  target?: string;
  description?: string;
  status: "draft" | "active" | "paused" | "completed" | "archived";
  createdAt: string;
  updatedAt: string;
}
```

---

## LiteratureRecord

```ts
export type EvidenceStage =
  | "in_silico"
  | "in_vitro"
  | "animal"
  | "clinical"
  | "guideline"
  | "review"
  | "meta_analysis"
  | "unknown";

export interface LiteratureRecord {
  id: string;
  projectId: string;
  source:
    | "pubmed"
    | "arxiv"
    | "biorxiv"
    | "medrxiv"
    | "clinical_trials"
    | "crossref"
    | "openalex"
    | "semantic_scholar";
  title: string;
  authors: string[];
  year?: number;
  doi?: string;
  url?: string;
  abstract?: string;
  publicationType?: string;
  peerReviewStatus: "peer_reviewed" | "preprint" | "unknown";
  evidenceStage: EvidenceStage;
  importedAt: string;
}
```

`peerReviewStatus` and `evidenceStage` are **required** for every record. They drive the evidence-grading semantics throughout the system.

---

## ResearchHypothesis

```ts
export interface ResearchHypothesis {
  id: string;
  projectId: string;
  statement: string;
  rationale: string;
  supportingLiteratureIds: string[];
  contradictingLiteratureIds: string[];
  confidence: "low" | "medium" | "high";
  status:
    | "proposed"
    | "under_review"
    | "approved_for_simulation"
    | "rejected"
    | "completed";
  safetyReviewStatus:
    | "not_reviewed"
    | "passed"
    | "needs_revision"
    | "blocked";
  createdAt: string;
  updatedAt: string;
}
```

A hypothesis cannot transition to `approved_for_simulation` without `safetyReviewStatus = "passed"`.

---

## CandidateMedicine

```ts
export interface CandidateMedicine {
  id: string;
  projectId: string;
  name: string;
  type:
    | "approved_drug"
    | "investigational_drug"
    | "compound"
    | "biologic"
    | "natural_product"
    | "unknown";
  mechanismOfAction?: string;
  target?: string;
  evidenceSummary?: string;
  knownRisks?: string[];
  regulatoryStatus?: string;
  humanUseWarning: string;
  createdAt: string;
  updatedAt: string;
}
```

`humanUseWarning` is required on every candidate. It is the field the UI renders prominently to make sure the user does not read a comparison table as a treatment recommendation.

---

## SimulationPlan

```ts
export interface SimulationPlan {
  id: string;
  projectId: string;
  hypothesisId?: string;
  candidateId?: string;
  simulationType:
    | "molecular_docking"
    | "admet"
    | "qsar"
    | "pkpd"
    | "network_pharmacology"
    | "trial_simulation"
    | "other";
  objective: string;
  inputs: string[];
  method: string;
  assumptions: string[];
  limitations: string[];
  reproducibilityNotes: string;
  status:
    | "draft"
    | "review_required"
    | "approved"
    | "running"
    | "completed"
    | "rejected";
  riskClass: "R0" | "R1" | "R2" | "R3" | "R4" | "R5";
  createdAt: string;
  updatedAt: string;
}
```

A plan with `riskClass = "R5"` cannot be created in MVP — the API rejects it. `R4` plans require human clinical, ethics, and regulatory sign-off recorded in audit before they can transition to `approved`.

---

## EvidenceMatrixEntry

```ts
export interface EvidenceMatrixEntry {
  id: string;
  projectId: string;
  claim: string;
  supportingLiteratureIds: string[];
  contradictingLiteratureIds: string[];
  netEvidence: "for" | "against" | "mixed" | "insufficient";
  evidenceLevel: EvidenceStage;
  notes?: string;
}
```

The evidence matrix is the structured backbone the Publication Assistant uses to draft methods, results, and limitations.

---

## ResearchAuditEvent

```ts
export interface ResearchAuditEvent {
  id: string;
  projectId?: string;
  userId: string;
  eventType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}
```

Event types include (non-exhaustive):

```text
research_project.created
literature.search
paper.summarized
hypothesis.created
hypothesis.safety_reviewed
candidate.compared
candidate.safety_reviewed
simulation.plan_created
simulation.plan_classified
safety.claim_blocked
publication.draft_created
publication.safety_reviewed
publication.exported
fabricated_citation_detected
```

Audit entries are append-only and never store raw PHI.
