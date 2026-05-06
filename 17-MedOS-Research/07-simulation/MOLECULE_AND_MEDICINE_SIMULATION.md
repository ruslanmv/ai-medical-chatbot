# Medicine Discovery and Simulation Planning

MedOS Research & Development supports **in-silico** and **research-only** simulation **planning**. It does not run wet-lab experiments, does not interact with human subjects, and does not imply that a simulation proves efficacy or safety in humans.

---

## 1. Supported simulation planning areas (MVP)

```text
Molecular docking
Binding affinity estimation
ADMET prediction
QSAR modeling
Network pharmacology
Pathway simulation
PK/PD modeling
Virtual cohort / trial simulation
Drug repurposing evidence maps
```

Out of MVP scope: any in-vivo protocol, any wet-lab automation, any patient-data simulation that uses real PHI without an approved governance pathway.

---

## 2. Required output for every simulation plan

Every plan produced by the Simulation Planner must include:

```text
Objective
Inputs
Method
Assumptions
Known limitations
Reproducibility checklist
Risk class       (R0–R5; see 09-safety/RESEARCH_SAFETY_AND_GOVERNANCE.md)
Human review status
```

The plan is rejected at the API boundary if any of those sections is missing or empty.

---

## 3. Mandatory safety language

Every simulation **result** carries this banner verbatim:

> *"This is a research-only, hypothesis-generating result. It is not evidence of clinical efficacy or safety and must not be used for patient treatment decisions."*

The banner is part of the response schema. The Clinical Safety Reviewer enforces its presence and refuses to release a result without it.

---

## 4. Worked example pointers

These are illustrative templates, not clinical use cases.

### Tinnitus

- Suitable methods: network pharmacology over auditory-pathway databases; QSAR for candidate scaffolds targeting central-gain modulators.
- Risk class: typically R2.
- Limitations to declare: pathway-database coverage, lack of validated tinnitus animal models, heterogeneity across studies.

### Cancer (solid-tumor immunotherapy)

- Suitable methods: docking for novel scaffolds against curated targets; ADMET filters; trial-simulation for cohort enrichment hypotheses.
- Risk class: typically R2; trial-simulation plans drift into R3 fast.
- Limitations to declare: single-target docking ignores tumor heterogeneity and resistance.

### Autoimmune hepatitis

- Suitable methods: network pharmacology over immune-modulator pathways; ADMET; pathway-perturbation simulations.
- Risk class: typically R2.
- Limitations to declare: rare-disease evidence base, small datasets, model-coverage gaps.

### Diabetes (Type 1 / Type 2)

- Suitable methods: PK/PD modeling for repurposing candidates; virtual-cohort trial simulation; network pharmacology around insulin-signaling and β-cell pathways.
- Risk class: typically R2; virtual-cohort plans that read as treatment-effect predictions are pushed to R3 with explicit human-review gating.
- Limitations to declare: PK/PD parameter uncertainty, cohort-simulation assumptions, no human subjects.

In every case, the produced artifact is a **plan**, not a treatment.

---

## 5. Future tooling integrations

Potential tools and data sources to integrate later, subject to license and governance review:

```text
RDKit                    cheminformatics
DeepChem                 molecular ML
AutoDock Vina            docking workflows
AlphaFold / PDB          target structure context
OpenMM                   molecular dynamics planning
Open Targets             target-disease association data
UniProt                  protein references
PubChem / ChEMBL         compound data
DrugBank                 drug-knowledge graph (subject to licensing)
ClinicalTrials.gov       trial status
WHO ICTRP                international trial registries
```

For each of these, the integration must pass:

- License compliance review (some sources forbid commercial use).
- Data-handling review (no PHI mixed into research projects).
- Reproducibility review (the toolkit version is pinned and recorded in audit).

---

## 6. What the Simulation Planner will not do

- Run human-subject protocols.
- Drive lab automation autonomously.
- Generate dosing language.
- Generate patient-specific predictions from real PHI.
- Produce R5 outputs (patient-facing or treatment-impacting) in MVP.
- Claim that a simulation proves efficacy or safety.

The system's job is to make a high-quality, auditable, safety-reviewed **plan** that a human researcher then chooses (or chooses not) to execute.
