# MedOS Research & Development — Product Specification

## Problem

Medical research teams must search thousands of papers, compare conflicting evidence, evaluate candidate compounds, design simulations, maintain experimental traceability, and prepare publications — while avoiding unsafe clinical claims. Generic LLMs over-promise, fabricate citations, and quietly drift into prescribing language. We need a research system that is **evidence-first, citation-bound, safety-reviewed, and auditable**.

## Solution

Create an additive MedOS R&D module that combines:

- An **Evidence Researcher** workflow inspired by the HomePilot **Researcher** persona (`personas/04-researcher`).
- A **Clinical Safety Reviewer** workflow inspired by the HomePilot **General Doctor** persona (`personas/10-general-doctor`).

The module helps users:

- Search biomedical literature.
- Compare candidate medicines.
- Generate research hypotheses.
- Plan in-silico simulations.
- Track experiments and evidence.
- Generate doctor/scientist-readable briefs.
- Prepare manuscripts with citations and limitations.

## Main users

### Biomedical Researcher

Uses the system to find papers, compare mechanisms, generate hypotheses, and prepare experiments.

### Clinical Reviewer / Doctor

Reviews clinical relevance, safety language, patient-risk implications, and prevents diagnostic or prescribing misuse.

### Lab Scientist

Uses experiment plans, datasets, protocols, and results tracking.

### Publication Lead

Prepares manuscripts, abstracts, literature reviews, and evidence tables.

## Main screens

```text
Research Dashboard
Literature Workspace
Disease / Target Workspace
Candidate Medicine Workspace
Simulation Lab
Experiment Registry
Evidence Matrix
Safety Review
Publication Studio
Audit Log
```

## MVP user story

> *As a researcher, I can enter a disease or target, ask MedOS R&D to build a citation-backed evidence brief, identify promising mechanisms, create candidate hypotheses, compare candidate medicines, and generate an in-silico simulation plan for expert review.*

## Worked examples (Phase 0 demo projects)

The MVP ships with four demo projects, each illustrating how the pipeline behaves on a different evidence shape. They are **examples for the system**, not clinical use cases.

### Tinnitus

- Evidence shape: heterogeneous mechanisms (cochlear damage, central gain, vascular, psychogenic), large preprint volume, few approved cures.
- What MedOS Research demonstrates: literature de-duplication across mechanisms, conflict detection, evidence-gap identification, candidate-medicine table for mechanism-targeted trials, simulation planning at the QSAR / network-pharmacology level.
- Forbidden output: any statement that a medicine "cures tinnitus."

### Cancer (initial focus: solid-tumor immunotherapy combinations)

- Evidence shape: enormous literature, many subtypes, strong clinical-trial corpus.
- What MedOS Research demonstrates: target-biology mapping, candidate comparison across approved + investigational compounds, in-silico ADMET / docking planning for novel scaffolds, repurposing evidence maps.
- Forbidden output: any treatment recommendation, any patient-specific advice, any cure claim.

### Autoimmune hepatitis

- Evidence shape: rare disease, immunomodulator landscape, smaller but high-quality trial set, conflicting evidence.
- What MedOS Research demonstrates: rare-disease search heuristics, conflict surfacing, pharmacovigilance / adverse-event signal awareness, evidence-grading transparency.
- Forbidden output: any individualized immunosuppressive regimen, any dosing language.

### Diabetes (Type 1 and Type 2)

- Evidence shape: very large clinical-trial corpus, longitudinal cohort data, rich repurposing landscape.
- What MedOS Research demonstrates: longitudinal synthesis, comparative-effectiveness brief generation, trial-simulation planning, integration with structured guideline retrieval.
- Forbidden output: any blood-glucose target advice for a real patient, any insulin or oral-agent dose suggestion.

In each case, the system produces:

```text
Citation-backed evidence brief
Mechanism / target map
Candidate-medicine comparison table
Research-gap list
Simulation plan(s) with assumptions, limitations, and required human reviews
Safety-reviewed publication draft
Audit log
```

## Safety boundary

MedOS R&D may support hypothesis generation and research planning. It must not claim to cure disease, prescribe medicines, provide patient-specific treatment, or bypass human expert review, ethics approval, regulatory review, or clinical trial requirements.

The Clinical Safety Reviewer is invoked at every output boundary. Outputs that fail the reviewer are blocked or rewritten before they reach the user, the publication studio, or any external system.

## Persona delivery

MedOS Research personas are designed to be loaded into the user's local persona host:

- [`ruslanmv/HomePilot`](https://github.com/ruslanmv/HomePilot) — the local-first GenAI host that runs personas via MCP.
- [`ruslanmv/ollabridge-cloud`](https://github.com/ruslanmv/ollabridge-cloud) — bridge / cloud delivery channel.
- The persona schema mirrors the [HomePilotAI/personas](https://github.com/HomePilotAI/personas) registry (manifest + blueprint + agentic + MCP server contract).

Each MedOS Research agent role is shipped as a persona with a manifest, system prompt, agentic capabilities, tool ids, and an MCP server contract — exactly as in the existing `personas/04-researcher` and `personas/10-general-doctor` packages.
