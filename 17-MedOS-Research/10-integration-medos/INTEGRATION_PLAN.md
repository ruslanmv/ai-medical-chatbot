# MedOS Integration Plan

MedOS Research & Development is added as a new optional module:

```text
17-MedOS-Research/
```

It does not modify the existing MedOS chatbot, MedOS Family, MedOS Connect, MedOS Classify, or MedOS Pathogen code.

---

## 1. Non-destructive guarantees

- No existing file, table, or API is modified by this folder.
- All new routes live under a new namespace: `/api/research/*`.
- All new tables are additive (see `12-sql/medos_research_schema.sql`).
- Patient PHI from MedOS Family / MedOS Connect **does not** flow into research projects automatically.
- The whole module can be disabled with a single feature flag and removed by deleting the folder + the `/api/research/*` routes.

---

## 2. Future UI entry point

```text
MedOS sidebar
└── Research & Development
    ├── Research Dashboard
    ├── Literature Workspace
    ├── Disease / Target Workspace
    ├── Candidate Medicine Workspace
    ├── Simulation Lab
    ├── Experiment Registry
    ├── Evidence Matrix
    ├── Safety Review
    ├── Publication Studio
    └── Audit Log
```

The Research & Development entry is gated by a per-user role (`researcher`, `clinical_reviewer`, `lab_scientist`, `publication_lead`). Standard MedOS users do not see it.

---

## 3. Future backend namespace

```text
/api/research/*
```

(See `04-api/API_CONTRACTS.md` for the full list.)

---

## 4. Persona delivery

MedOS Research personas mirror the HomePilotAI persona layout (manifest + blueprint + agentic + dependencies + preview). They are designed to be:

- Loaded by [`ruslanmv/HomePilot`](https://github.com/ruslanmv/HomePilot) — the local-first GenAI host.
- Distributed via [`ruslanmv/ollabridge-cloud`](https://github.com/ruslanmv/ollabridge-cloud) as a persona delivery channel.
- Backed by an MCP server pattern that mirrors the General Doctor persona's `mcp-general-doctor` adapter, which itself sits on top of [`ruslanmv/medical-mcp-toolkit`](https://github.com/ruslanmv/medical-mcp-toolkit).

Suggested persona registry (separate package):

```text
medos-research-personas/
├── 01-evidence-researcher/
├── 02-clinical-safety-reviewer/
├── 03-target-biology-analyst/
├── 04-candidate-medicine-analyst/
├── 05-simulation-planner/
└── 06-publication-assistant/
```

Each subfolder uses the same `hpersona/{manifest, blueprint, dependencies, preview, assets}` structure as `personas/04-researcher` and `personas/10-general-doctor`.

---

## 5. Relationship to other MedOS modules

```text
13-MedOS-Family    → consent / permission rules; not a research data source
14-MedOS-Connect   → device + vitals data; not a research data source
15-MedOS-Classify  → clinical reasoning; relevant for downstream evaluation only
16-MedOS-Pathogen  → image / sequence interpretation; relevant for targeted projects
17-MedOS-Research  → scientific research workflows
```

Patient or family data must not automatically flow into R&D. Any research use of patient-derived data requires explicit consent, de-identification, governance, and audit logging — the same posture used in `16-MedOS-Pathogen/07-safety/SAFETY_AND_COMPLIANCE.md` extended with a clear "research-only" boundary.

The two legitimate cross-module touchpoints:

- **R&D → Classify / Pathogen:** a research project may use Classify or Pathogen artifacts (e.g., calibration curves, model cards, public datasets) as **methodology references** in a publication. The data flow is one-way (publication consumes published artifacts).
- **Classify / Pathogen → R&D:** a research project may study **how these models perform** as a research subject, under explicit governance, with the same R0–R5 risk classification.

In neither direction does patient-level data flow into R&D without governance.

---

## 6. Reversibility

- Disable the feature flag → `/api/research/*` returns 404; the sidebar entry hides; no persona under MedOS Research can be loaded.
- Drop the new tables (see `12-sql/medos_research_schema.sql`) → no impact on existing tables.
- Delete the `17-MedOS-Research/` documentation folder → other modules are unaffected.

This matches the additive contract used in `14-MedOS-Connect/`, `15-MedOS-Classify/`, and `16-MedOS-Pathogen/`.

---

## 7. Cross-references

- [`../13-MedOS-Family/README.md`](../13-MedOS-Family/README.md)
- [`../14-MedOS-Connect/README.md`](../14-MedOS-Connect/README.md)
- [`../15-MedOS-Classify/README.md`](../15-MedOS-Classify/README.md)
- [`../16-MedOS-Pathogen/README.md`](../16-MedOS-Pathogen/README.md)
- [`02-personas/RESEARCHER_AND_DOCTOR_ANALYSIS.md`](../02-personas/RESEARCHER_AND_DOCTOR_ANALYSIS.md)
- [`09-safety/RESEARCH_SAFETY_AND_GOVERNANCE.md`](../09-safety/RESEARCH_SAFETY_AND_GOVERNANCE.md)
