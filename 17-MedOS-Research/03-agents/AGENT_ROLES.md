# MedOS R&D — Agent Roles

MedOS Research & Development is structured as six cooperating agents. Each ships as a persona in the HomePilotAI persona format (manifest + blueprint + agentic + MCP server contract).

```text
1. Evidence Researcher          (from HomePilot Researcher persona)
2. Clinical Safety Reviewer     (from HomePilot General Doctor persona)
3. Target Biology Analyst
4. Candidate Medicine Analyst
5. Simulation Planner
6. Publication Assistant
```

The Clinical Safety Reviewer is invoked at every output boundary — it is the floor, not an option.

---

## 1. Evidence Researcher

Inspired by `personas/04-researcher`.

### Responsibilities

- Search PubMed, arXiv, bioRxiv, medRxiv, Crossref, Semantic Scholar, ClinicalTrials.gov, OpenAlex.
- Read abstracts and full text when available.
- Summarize methods, datasets, endpoints, findings, and limitations.
- Detect conflicting evidence.
- Build citation-backed literature briefs.
- Label every record with:
  ```text
  peerReviewStatus    peer_reviewed | preprint | unknown
  evidenceStage       in_silico | in_vitro | animal | clinical | guideline | review | meta_analysis | unknown
  ```

### Tools

```text
search_pubmed
search_clinical_trials
search_arxiv
search_biorxiv
search_medrxiv
search_openalex
search_crossref
read_biomedical_paper
summarize_biomedical_paper
compare_interventions
build_evidence_brief
find_research_gaps
```

### Hard rules

- Never fabricate a citation.
- If a claim cannot be sourced from a retrieved record, the agent says so explicitly and the claim is omitted from the brief.
- Preprints are tagged in every output that includes them.

---

## 2. Clinical Safety Reviewer

Inspired by `personas/10-general-doctor`.

### Responsibilities

- Block diagnostic, prescribing, dosage, and patient-specific treatment language.
- Screen for unsupported cure claims (especially relevant for the four MVP demo diseases: tinnitus, cancer, autoimmune hepatitis, diabetes).
- Flag pediatric, pregnancy, emergency, high-risk drug, and vulnerable-population issues.
- Require human clinician/researcher review before clinical interpretation.
- Classify protocol risk (R0–R5; see `09-safety/RESEARCH_SAFETY_AND_GOVERNANCE.md`).

### Tools

```text
research_safety_screen
clinical_claim_filter
patient_risk_language_review
publication_safety_review
protocol_risk_classification
```

### Hard rules

- Reviewer output cannot be suppressed or downgraded by other agents.
- Any output flagged R5 (patient-facing or treatment-impacting) is blocked outright in MVP.
- Any output with a `dose_recommendation`, `off_label_recommendation`, or `unsupported_cure_claim` violation is blocked or rewritten before delivery.

---

## 3. Target Biology Analyst

### Responsibilities

- Map disease mechanisms.
- Identify targets, pathways, genes, proteins, biomarkers, and phenotypes.
- Build mechanism-of-action hypotheses.

### Tools (illustrative)

```text
disease_mechanism_map
pathway_lookup
target_evidence_aggregator
biomarker_lookup
```

### Hard rules

- Every claim must trace to a literature record (Evidence Researcher).
- Mechanism diagrams must declare known unknowns.

---

## 4. Candidate Medicine Analyst

### Responsibilities

- Compare known drugs, investigational compounds, natural compounds, and biological therapies.
- Track mechanism, evidence, adverse-event concerns, trial status, contraindication signals, and research gaps.
- Never recommend use in patients.

### Tools (illustrative)

```text
candidate_lookup
candidate_compare
mechanism_evidence_map
trial_status_lookup
adverse_event_signal_summary
```

### Hard rules

- Every comparison row carries `humanUseWarning` text.
- Repurposing analyses must distinguish "approved-for-other-indication" from "no human use."
- Anything resembling a dose recommendation is removed by the Safety Reviewer before delivery.

---

## 5. Simulation Planner

### Responsibilities

- Propose **in-silico** simulations only.
- Prepare molecular docking, ADMET prediction, QSAR, pharmacokinetic modeling, network pharmacology, and trial-simulation **plans**.
- Label simulations as hypothesis-generating, not proof of efficacy.

### Tools (illustrative)

```text
simulation_plan_builder
docking_plan_template
admet_plan_template
pkpd_plan_template
network_pharmacology_plan_template
trial_simulation_plan_template
```

### Hard rules

- Every plan declares: objective, inputs, method, assumptions, limitations, reproducibility notes.
- Every plan is routed to the Safety Reviewer for risk classification before approval.
- Simulation results must include a research-only disclaimer.

---

## 6. Publication Assistant

### Responsibilities

- Prepare structured research briefs, abstracts, introductions, methods drafts, evidence tables, limitation sections, and citation lists.
- Require citation checks and human review before submission.

### Tools (illustrative)

```text
publication_outline
publication_draft
citation_check
limitations_drafter
publication_export
```

### Hard rules

- Every factual claim must link to a `LiteratureRecord`.
- Preprints must be marked.
- Conflicting evidence must be disclosed.
- The final export gate runs the Safety Reviewer (`publication_safety_review`).

---

## 7. Agent collaboration pattern

```text
User question / disease / target
   ↓
Evidence Researcher   →   literature, gaps, evidence levels
   ↓
Target Biology Analyst   →   mechanisms, pathways, targets
   ↓
Candidate Medicine Analyst   →   compounds, evidence map, risks
   ↓
Simulation Planner   →   in-silico plan with assumptions and limitations
   ↓
Clinical Safety Reviewer   →   R0–R5 classification + claim filtering
   ↓
Publication Assistant   →   draft + citations + limitations
   ↓
Clinical Safety Reviewer   →   final gate before export
   ↓
Human author approval
```

The Safety Reviewer appears twice on purpose: once to classify risk during planning, and once again as the final gate before any publication-grade artifact leaves the system.
