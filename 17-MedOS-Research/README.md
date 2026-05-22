# MedOS Research & Development

MedOS Research & Development is the additive **research layer** of the MedOS ecosystem. It is designed for biomedical literature review, hypothesis generation, candidate-medicine comparison, in-silico simulation **planning**, evidence grading, experiment tracking, and publication preparation.

This module is inspired by — and links to — two persona patterns from the [HomePilotAI/personas](https://github.com/HomePilotAI/personas) registry:

- **Researcher** (`04-researcher`) — evidence-first scholarly assistant that searches papers, reads them, summarizes findings, compares papers, and builds literature briefs.
- **General Doctor** (`10-general-doctor`) — safety-first medical information companion with red-flag screening, no diagnosis, no prescribing, and audited, governance-bound output.

The relevant persona links (used as the delivery channel for MedOS Research personas):

- [`ruslanmv/HomePilot`](https://github.com/ruslanmv/HomePilot) — the local-first GenAI host that runs personas via MCP.
- [`ruslanmv/ollabridge-cloud`](https://github.com/ruslanmv/ollabridge-cloud) — bridge / cloud delivery channel for personas.
- [`ruslanmv/medical-mcp-toolkit`](https://github.com/ruslanmv/medical-mcp-toolkit) — upstream medical MCP toolkit referenced by the General Doctor persona's MCP server.

> MedOS Research must **not** diagnose patients, prescribe medicines, run human experiments, recommend self-treatment, or claim to cure any disease. It supports scientific research workflows and keeps a clear boundary between research hypotheses, preclinical simulation, clinical evidence, and real-world medical care.

## Purpose

Help researchers and clinicians work together to:

- Search and summarize biomedical literature.
- Identify therapeutic targets and evidence gaps.
- Compare candidate compounds or interventions.
- Design safe in-silico and preclinical simulation **plans**.
- Track hypotheses, datasets, protocols, experiments, and results.
- Prepare citation-backed research briefs and manuscript drafts.
- Maintain governance, auditability, and safety review gates.

## Working examples (Phase 0 disease areas)

The MVP is exercised against a small set of diverse disease areas, chosen because each stresses a different part of the system:

| Disease area | Why it's interesting for MedOS Research |
|---|---|
| **Tinnitus** | Heterogeneous mechanisms (cochlear, neural, vascular, psychogenic); large preprint volume; few approved cures; tests evidence-grading and uncertainty handling. |
| **Cancer** | Vast literature; many subtypes; strong existing evidence base; tests target-biology mapping, candidate-medicine comparison, and the safety reviewer's ability to block unsupported cure claims. |
| **Autoimmune hepatitis** | Rare-disease characteristics; immunomodulator candidate landscape; tests rare-disease search heuristics, conflicting evidence handling, and pharmacovigilance signal awareness. |
| **Type 1 / Type 2 diabetes** | Metabolic, polygenic, large clinical-trial corpus; tests longitudinal evidence synthesis, repurposing analysis, and trial-simulation planning. |

These disease areas seed the demo project library; they are **not** clinical use cases. No claim is made that MedOS Research finds cures for them.

## Position in MedOS

```text
MedOS App
├── Existing local health tracker
├── MedOS Family            (13-MedOS-Family)
├── MedOS Connect           (14-MedOS-Connect)
├── MedOS Classify          (15-MedOS-Classify)
├── MedOS Pathogen          (16-MedOS-Pathogen)
└── MedOS Research          (this module)
    ├── Evidence Researcher (HomePilot Researcher persona, biomedical specialization)
    ├── Clinical Safety Reviewer (HomePilot General Doctor persona, R&D specialization)
    ├── Target Biology Analyst
    ├── Candidate Medicine Analyst
    ├── Simulation Planner
    └── Publication Assistant
```

Like every MedOS module since 13, MedOS Research is **additive**:

- No existing file, table, or API is modified.
- It can be removed in one operation without affecting the rest of MedOS.
- It is feature-flagged at the API and persona-loader boundary.
- Patient PHI from MedOS Family / MedOS Connect **never** flows into research projects automatically.

## MVP scope

1. Literature search and citation-backed summaries.
2. Evidence grading and research-gap detection.
3. Hypothesis registry.
4. Candidate medicine / compound comparison.
5. Simulation plan builder for non-human, in-silico research.
6. Doctor safety reviewer for medical claims, dosage language, and patient-risk language.
7. Publication draft assistant with citations and limitations.

## Non-goals

- No patient diagnosis.
- No prescription or dosage recommendation.
- No human-subject trial execution.
- No lab automation without approved human review.
- No claims that a medicine cures disease without validated clinical evidence.
- No hidden PHI or patient-data usage.

## Documentation map

| File | Purpose |
|---|---|
| [`01-product/RESEARCH_RD_SPEC.md`](01-product/RESEARCH_RD_SPEC.md) | Problem, users, screens, MVP user story, safety boundary. |
| [`02-personas/RESEARCHER_AND_DOCTOR_ANALYSIS.md`](02-personas/RESEARCHER_AND_DOCTOR_ANALYSIS.md) | Analysis of HomePilot Researcher and General Doctor personas, mapping into MedOS R&D. |
| [`03-agents/AGENT_ROLES.md`](03-agents/AGENT_ROLES.md) | The six agent roles and their responsibilities. |
| [`04-api/API_CONTRACTS.md`](04-api/API_CONTRACTS.md) | HTTP API contracts under `/api/research/*`. |
| [`05-domain/DOMAIN_MODEL.md`](05-domain/DOMAIN_MODEL.md) | TypeScript domain model. |
| [`06-pipelines/PIPELINES.md`](06-pipelines/PIPELINES.md) | The four core research pipelines. |
| [`07-simulation/MOLECULE_AND_MEDICINE_SIMULATION.md`](07-simulation/MOLECULE_AND_MEDICINE_SIMULATION.md) | Supported in-silico simulation planning areas, future tooling. |
| [`08-publication/PUBLICATION_WORKFLOW.md`](08-publication/PUBLICATION_WORKFLOW.md) | Publication Studio sections, citation rules, safety gates. |
| [`09-safety/RESEARCH_SAFETY_AND_GOVERNANCE.md`](09-safety/RESEARCH_SAFETY_AND_GOVERNANCE.md) | Blocked outputs, R0–R5 risk classes, audit events, privacy. |
| [`10-integration-medos/INTEGRATION_PLAN.md`](10-integration-medos/INTEGRATION_PLAN.md) | How MedOS Research plugs into the rest of the ecosystem. |
| [`11-backend-stubs/research-agent-interfaces.ts`](11-backend-stubs/research-agent-interfaces.ts) | Agent and reviewer TypeScript interfaces. |
| [`12-sql/medos_research_schema.sql`](12-sql/medos_research_schema.sql) | Additive SQL schema for the research module. |

## Cross-references

- [`../13-MedOS-Family/README.md`](../13-MedOS-Family/README.md) — family permission and consent rules.
- [`../14-MedOS-Connect/README.md`](../14-MedOS-Connect/README.md) — vitals/devices; explicitly **not** a research data source unless governance + de-identification are in place.
- [`../15-MedOS-Classify/README.md`](../15-MedOS-Classify/README.md) — clinical reasoning module; relevant for downstream evaluation, never as a way to bypass research safety.
- [`../16-MedOS-Pathogen/README.md`](../16-MedOS-Pathogen/README.md) — pathogen ID; relevant for targeted research projects (e.g., antimicrobial discovery).
