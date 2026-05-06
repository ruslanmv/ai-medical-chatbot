# MedOS R&D — Pipelines

Four core pipelines. Each pipeline is auditable end-to-end, and each pipeline ends at — or routes through — the Clinical Safety Reviewer.

---

## Pipeline 1: Literature → Hypothesis

```text
Question / disease / target
→ Search literature (Evidence Researcher)
→ Summarize key papers
→ Compare methods and findings
→ Extract mechanisms and gaps (Target Biology Analyst)
→ Generate hypotheses
→ Safety review (Clinical Safety Reviewer)
→ Human approval
```

### Worked example: Tinnitus

```text
Query: "central auditory gain modulation, tinnitus, candidate mechanisms"
→ retrieve 32 records (PubMed 18, ClinicalTrials.gov 4, bioRxiv 6, OpenAlex 4)
→ summarize and grade evidence
→ map themes:
   - cochlear deafferentation
   - central gain
   - GABAergic dysregulation
   - vascular contributors
→ identify gaps:
   - few RCTs targeting central gain
   - heterogeneous outcome measures
   - small sample sizes in preprints
→ propose hypotheses (low confidence, marked):
   - H1: Modulating central gain via target Y reduces tinnitus loudness in animal models.
→ safety review: passes (no cure claim, no dose, no patient advice)
→ human approval recorded in audit
```

---

## Pipeline 2: Candidate Medicine Comparison

```text
Candidate list
→ Mechanism lookup (Candidate Medicine Analyst)
→ Evidence mapping
→ Safety-signal review
→ Clinical-trial status lookup
→ Compare table
→ Research-only conclusion (Clinical Safety Reviewer)
```

### Worked example: Cancer (solid-tumor immunotherapy combinations)

The pipeline produces a comparison table with one row per candidate. Each row carries a `humanUseWarning` and an evidence map. The Safety Reviewer rewrites any cell that drifts into treatment-recommendation language — for example, a phrase like *"use this with chemotherapy in metastatic patients"* becomes *"reported in combination with chemotherapy in metastatic-setting trials \[ref]"*. The reviewer's edits are themselves audit-logged.

---

## Pipeline 3: Simulation Planning

```text
Approved hypothesis
→ Select simulation method (Simulation Planner)
→ Define inputs
→ Define assumptions
→ Define limitations
→ Reproducibility checklist
→ Safety review + risk classification (Clinical Safety Reviewer)
→ Human approval
```

### Worked example: Autoimmune hepatitis

```text
Hypothesis: Compound Z modulates regulatory T-cell signaling in an
            in-vitro autoimmune-hepatitis model.
→ Simulation type: network pharmacology + ADMET prediction
→ Inputs: target list, compound SMILES, immune-pathway database snapshot
→ Method: documented (with the toolkit version pinned)
→ Assumptions: pathway-database completeness, in-vitro relevance
→ Limitations: no human evidence, no in-vivo evidence, model coverage gaps
→ Risk class: R2 (in-silico simulation plan)
→ Safety review: passes; reviewer adds an explicit
                  "research-only, hypothesis-generating" disclaimer
→ Human approval
```

R3+ plans (preclinical protocol drafts) require additional human reviews and ethics sign-off before they can be marked `approved`.

---

## Pipeline 4: Publication Workflow

```text
Project evidence
→ Literature matrix (Publication Assistant)
→ Results summary
→ Limitations
→ Safety language review (Clinical Safety Reviewer)
→ Citation check
→ Manuscript draft
→ Human author approval
```

### Worked example: Diabetes (repurposing brief)

```text
Goal: a research brief comparing approved-for-other-indication candidates
      with documented effects on insulin sensitivity or β-cell function.
→ Pull longitudinal evidence from the project's LiteratureRecord set
→ Build evidence matrix (per claim: for/against/mixed/insufficient)
→ Draft brief
→ Citation check: every factual claim links to a LiteratureRecord;
                   preprints flagged; conflicts disclosed
→ Safety review: blocks any sentence that reads as
                  patient-treatment guidance; flags missing limitations
→ Human author approval recorded in audit
→ Export
```

The export gate refuses to produce the final artifact unless the citation check, the safety review, and the human author approval are all green.
