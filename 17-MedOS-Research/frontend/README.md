# MedOS Research — Frontend

Production-ready Next.js + React + TypeScript implementation of the MedOS Research command center, generated from a Claude Design handoff bundle.

## Run

```bash
cd 17-MedOS-Research/frontend
npm install
npm run dev
```

Open `http://localhost:3170`.

- `/`     desktop research command center (sidebar + 10 pages, role switcher, search)
- `/m`    Android companion app (Home / Literature / Candidates / Safety & Publication)

## Pages (sidebar)

| # | Item | What it does |
|---|---|---|
| 01 | Research Dashboard | Project header, KPI strip, Literature/Evidence/Candidate/Simulation panels, Safety/Publication/Audit row, research-only footer |
| 02 | Literature Workspace | Search bar with source filters, results list, source coverage bars, evidence themes |
| 03 | Disease / Target Workspace | Disease overview + working hypothesis, biological targets, SVG pathway diagram |
| 04 | Candidate Medicines | Comparison table with evidence scores + selected-candidate detail rail |
| 05 | Simulation Lab | Simulation list with risk badges + R0–R5 risk-class scale + selected detail with sweep chart |
| 06 | Experiment Registry | KPI strip + table of registered experiments (in-vitro / animal / data / clinical*) |
| 07 | Evidence Matrix | Verdict summary + all-claims table with For/Mixed/Against distribution bars |
| 08 | Safety Review | Review queue with blocked / approved / pending + forbidden patterns + reviewers |
| 09 | Publication Studio | Manuscript section gates (citation / safety / human sign-off) + abstract preview |
| 10 | Audit Log | Immutable event stream with timestamps and user attribution |

## Stack

- Next.js 14 (App Router), React 18, TypeScript.
- **Inline styles** + a small CSS-variable token sheet (`tokens.css`) — matches the design exactly.
- Inter via `next/font`.
- Zero backend — all data is local mock data in `lib/data.ts`.

## Disclaimer

> **Research workflows only** — not diagnosis, prescription, or patient-specific treatment advice. MedOS Research is not a substitute for professional judgment.
