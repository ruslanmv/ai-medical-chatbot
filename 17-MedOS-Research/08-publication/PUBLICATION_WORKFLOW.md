# MedOS R&D — Publication Workflow

MedOS R&D can help prepare research publications, but final scientific responsibility belongs to **human authors**. The Publication Assistant drafts; the Clinical Safety Reviewer gates; the human signs.

---

## 1. Publication Studio sections

```text
Title candidates
Abstract
Introduction
Methods
Results summary
Discussion
Limitations
Ethics and safety statement
References
Supplementary tables
```

Each section is generated from the project's structured artifacts (`LiteratureRecord`, `ResearchHypothesis`, `CandidateMedicine`, `SimulationPlan`, `EvidenceMatrixEntry`) — not from free-form LLM output. Anything that cannot be backed by a structured artifact is not written.

---

## 2. Citation rules

- Every factual scientific claim must link to a `LiteratureRecord`.
- Preprints must be clearly marked.
- Conflicting evidence must be disclosed in the Discussion or Limitations sections.
- **No fabricated citations.** A fabricated-citation check runs before every save and before export.
- **No unsupported cure claims.** Cure language is one of the highest-priority filters in the safety review.
- Citation style is configurable (Vancouver / AMA / APA) but the underlying record metadata is normalized.

---

## 3. Limitations section

The Limitations section is mandatory and is generated from explicit project signals:

```text
Evidence levels of cited records (in_silico / in_vitro / animal / clinical / …)
Number and quality of contradicting records
Risk class of any simulation plans referenced
Known gaps captured during literature review
Vulnerable-population coverage gaps
Geographic / demographic generalizability gaps
```

A draft cannot reach the export gate with an empty Limitations section.

---

## 4. Ethics and safety statement

Every draft includes an ethics-and-safety statement that records:

- Whether the project used any human-subject data (default: no).
- Whether any patient PHI was used (default: no).
- Whether de-identification, consent, and governance pathways were followed if any patient data was used.
- The risk class of the highest-risk simulation plan referenced (R0–R5).
- That the work is **research-only** and not a clinical recommendation.

---

## 5. Safety review gates

Before export, the system runs:

```text
citation_check                             every claim has a source; no fabrications
clinical_claim_filter                      blocks treatment-recommendation language
unsupported_cure_claim_filter              blocks "cures X" without trial evidence
dosage_or_prescribing_language_filter      blocks dose / off-label phrasing
limitations_completeness_check             blocks empty or boilerplate limitations
human_author_approval                      a named human author has signed off
```

Every gate must return `passed`. Any `needs_revision` or `blocked` result is surfaced to the author with the violating spans highlighted and a suggested rewrite.

---

## 6. Disease-specific notes (MVP demo projects)

- **Tinnitus** — block any phrasing that implies a cure or "treatment that works"; require explicit "small-N, heterogeneous outcome measures, no RCT in retrieved corpus" caveats when applicable.
- **Cancer** — block any phrasing that implies a clinical recommendation; require explicit subtype and trial-stage tagging.
- **Autoimmune hepatitis** — require explicit immunosuppression-risk caveats anywhere immunomodulators are discussed; block dose language outright.
- **Diabetes** — require explicit "not a treatment recommendation" framing on any repurposing-comparison content; block glycemic-target advice.

These are not arbitrary — each one corresponds to the failure mode the Safety Reviewer is most likely to encounter on that disease's literature shape.

---

## 7. Export

```text
POST /api/research/publications/export
```

Refuses to produce the final artifact unless all of the following are true:

- The draft is complete (all required sections non-empty).
- The citation check passes.
- The safety review passes.
- A named human author has signed off (recorded in audit with timestamp + user id).

A successful export emits an audit event:

```text
publication.exported    { projectId, draftId, format, signedOffBy, exportedAt }
```

The audit entry is the durable record that the artifact left the system in a safety-reviewed state.
