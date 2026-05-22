# Analysis of HomePilotAI Researcher and General Doctor Personas

This document analyzes the two HomePilotAI personas that seed MedOS Research & Development:

- [`personas/04-researcher`](https://github.com/HomePilotAI/personas/tree/main/personas/04-researcher)
- [`personas/10-general-doctor`](https://github.com/HomePilotAI/personas/tree/main/personas/10-general-doctor)

The analysis below is grounded in the **actual files** in those persona packages (manifest, blueprint, agentic capabilities, dependencies, MCP server contract).

---

## 1. Researcher persona (`04-researcher`)

### What's in the package

- **Class:** `scholar` · **Role:** Scholarly Research Assistant.
- **Style/tone:** evidence-first, precise, citation-heavy; measured, skeptical, thorough.
- **System prompt (verbatim):**
  > *"You are Researcher, a meticulous scholarly assistant. Always cite sources with title, authors, year and DOI/URL when available. Distinguish primary results from secondary discussion. If a question is outside the retrieved sources, say so explicitly. Prefer peer-reviewed evidence; flag preprints as such. Never fabricate citations."*
- **Tools (`tools.json`):**
  ```text
  search_arxiv
  read_paper
  summarize_paper
  compare_papers
  build_literature_brief
  ```
- **Agentic capabilities (`agentic.json`):**
  ```text
  literature_search
  paper_summary
  citation_management
  research_brief
  evidence_grading
  ```
- Backed by an MCP server (`mcp-researcher` per the persona's dependencies pattern).

### What we keep, unchanged

- Evidence-first answers.
- Citation-heavy output (title, authors, year, DOI/URL).
- Explicit uncertainty.
- Preference for peer-reviewed sources; preprints clearly flagged.
- **Never fabricate citations** — non-negotiable.
- Literature briefs grouped by themes, methods, findings, and gaps.

### MedOS adaptation: the **Evidence Researcher** role

The Researcher persona generalizes from arXiv to a biomedical-aware tool surface. We keep the same tool *shape* — search, read, summarize, compare, brief — and add biomedical sources and grading semantics.

Tool mapping (HomePilot → MedOS Research):

| HomePilot Researcher | MedOS Evidence Researcher |
|---|---|
| `search_arxiv` | `search_pubmed`, `search_clinical_trials`, `search_arxiv`, `search_biorxiv`, `search_medrxiv`, `search_openalex`, `search_crossref` |
| `read_paper` | `read_biomedical_paper` |
| `summarize_paper` | `summarize_biomedical_paper` |
| `compare_papers` | `compare_interventions` |
| `build_literature_brief` | `build_evidence_brief`, `find_research_gaps` |

Every record produced by the Evidence Researcher carries:

```text
peerReviewStatus       peer_reviewed | preprint | unknown
evidenceStage          in_silico | in_vitro | animal | clinical | guideline | review | meta_analysis | unknown
```

These are first-class fields in the MedOS R&D `LiteratureRecord` (see `05-domain/DOMAIN_MODEL.md`) so downstream evidence grading and filtering are deterministic, not vibes.

### What we explicitly do **not** copy

- The Researcher persona is general-purpose; MedOS Evidence Researcher is biomedical-specialized and refuses out-of-domain queries with a clear message rather than improvising.

---

## 2. General Doctor persona (`10-general-doctor`)

### What's in the package

- **Class:** `advisor` · **Role:** General Health Information Companion.
- **Style/tone:** safety-first, plain-language, evidence-aware; calm, reassuring, clear.
- **System prompt (verbatim):**
  > *"You are General Doctor, a general health information companion. CRITICAL SAFETY: You do NOT diagnose, prescribe, or replace a licensed clinician. Begin every health response with a brief disclaimer: 'I can share general information, but please consult a healthcare professional for personal medical advice.' Always screen for RED-FLAG symptoms (chest pain, stroke signs, severe bleeding, suicidal ideation, anaphylaxis, pediatric high fever) and direct the user to emergency services (911/112/local equivalent) immediately. Never recommend prescription medications, dosages, or off-label uses."*
- **Tools (`tools.json`):**
  ```text
  doctor_red_flags
  doctor_general_info
  doctor_self_care
  ```
- **Agentic capabilities (`agentic.json`):**
  ```text
  general_health_information
  red_flag_screening
  self_care_guidance
  preventive_health_tips
  clinician_referral_prompts
  ```
- **MCP server contract (`mcp_servers.json`):** `mcp-general-doctor` (default port 9110), Python-native MCP safety adapter that calls an upstream `medical-mcp-toolkit` (port 9090) and enforces `docs/medical/medical-ai-safety-policy.md`. The upstream toolkit is [`ruslanmv/medical-mcp-toolkit`](https://github.com/ruslanmv/medical-mcp-toolkit) and exposes `triageSymptoms`, `searchMedicalKB`.

### What we keep, unchanged

- Does not diagnose.
- Does not prescribe.
- Does not replace clinicians.
- Screens for red flags and routes to emergency services.
- Filters unsafe medical claims.
- Avoids dose / off-label recommendations.
- Audit logging without raw PHI.
- Kill-switch / rollback mindset for risky tools.

### MedOS adaptation: the **Clinical Safety Reviewer** role

The General Doctor persona is patient-facing. In MedOS Research, the **same safety posture** is repurposed to gate research output rather than answer patients. The reviewer is invoked at every R&D output boundary (hypotheses, candidate comparisons, simulation plans, publication drafts).

Tool mapping (HomePilot → MedOS Research):

| HomePilot General Doctor | MedOS Clinical Safety Reviewer |
|---|---|
| `doctor_red_flags` | `research_safety_screen` (red flags now include: cure claims without trial evidence, dose recommendations, off-label suggestions, vulnerable-population claims) |
| `doctor_general_info` | `clinical_claim_filter` (rewrites or blocks unsafe claims; preserves the underlying scientific statement) |
| `doctor_self_care` | `patient_risk_language_review` (flags anything that could be read as personal medical advice) |
| (new) | `publication_safety_review` (final gate before manuscript export) |
| (new) | `protocol_risk_classification` (assigns the R0–R5 risk class — see `09-safety/RESEARCH_SAFETY_AND_GOVERNANCE.md`) |

The reviewer's MCP server inherits the General Doctor's safety adapter pattern: a thin Python MCP layer that enforces a policy document (the MedOS R&D equivalent of `medical-ai-safety-policy.md`) on top of an upstream knowledge / NLP service.

### What we explicitly do **not** copy

- The General Doctor's *patient-facing* response surface. The Clinical Safety Reviewer in MedOS Research speaks to **researchers and authors**, not patients, and never tries to triage a real person's symptoms. If a research user accidentally describes a real symptom, the reviewer routes them out of MedOS Research and toward MedOS Family / a clinician.

---

## 3. Combined MedOS Research model

```text
Researcher                 = finds evidence, compares papers, identifies gaps.
Clinical Safety Reviewer   = blocks unsafe clinical claims, dose language,
                             cure claims, and patient-facing misuse.
```

The R&D system supports research, **not** clinical decision-making.

Correct (allowed) example output:

> *"This compound has in-silico support and limited preclinical evidence in two animal studies. Two preprints describe a candidate mechanism in autoimmune hepatitis; both are unreplicated. Significant validation, including controlled trials, would be required before any clinical claim. Citations: [12], [17], [21]."*

Incorrect (blocked) example output:

> *"This compound cures autoimmune hepatitis. Take this dose."*

The reviewer would block the second statement, label the violation type (`unsupported_cure_claim`, `dose_recommendation`), and either rewrite to a safer form or refuse.

---

## 4. Persona packaging for MedOS Research

Each MedOS Research agent role ships as a persona package that mirrors the HomePilotAI structure:

```text
medos-research-personas/
├── 01-evidence-researcher/
│   ├── README.md
│   ├── hpersona/
│   │   ├── manifest.json
│   │   ├── blueprint/
│   │   │   ├── persona_agent.json          system prompt + role
│   │   │   ├── persona_appearance.json
│   │   │   └── agentic.json                 capabilities
│   │   ├── dependencies/
│   │   │   ├── mcp_servers.json             MCP server contract
│   │   │   └── tools.json                   tool ids
│   │   └── preview/
│   │       └── card.json
│   └── gallery/
├── 02-clinical-safety-reviewer/
├── 03-target-biology-analyst/
├── 04-candidate-medicine-analyst/
├── 05-simulation-planner/
└── 06-publication-assistant/
```

This makes every MedOS Research role:

- Loadable into [`ruslanmv/HomePilot`](https://github.com/ruslanmv/HomePilot) like any other persona.
- Distributable via [`ruslanmv/ollabridge-cloud`](https://github.com/ruslanmv/ollabridge-cloud) as a persona delivery channel.
- Backed by an MCP server (Python or TypeScript) that enforces a policy document — the same architectural pattern that the General Doctor persona uses to enforce its safety policy on top of [`ruslanmv/medical-mcp-toolkit`](https://github.com/ruslanmv/medical-mcp-toolkit).

---

## 5. Why these two, and not others

The HomePilotAI registry has ten personas. We pick exactly these two because:

- **Researcher** is the best-matching evidence-first scholarly pattern. Its tool surface and "never fabricate citations" rule are exactly what biomedical research needs.
- **General Doctor** is the only persona whose explicit purpose is **safety**. Its "no diagnosis, no prescribing, red-flag screening, kill-switch" posture is the cleanest available template for a medical safety reviewer.

The other personas (Creator Muse, Style Muse, Storyteller, Personal Trainer, Room Stylist, Exam Coach, Mindfulness Coach, Secretary Pro) do not match the R&D problem and are not used.
