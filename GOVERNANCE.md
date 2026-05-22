# Governance

MedOS is open-source and community-driven. To keep it **safe**, **trustworthy**, and **moving forward**, this document defines who can approve what, and what kind of review each change requires.

## Roles

| Role | Who | Scope |
|---|---|---|
| **Maintainer** | Repo owner + invited core contributors | Final merge authority on any branch |
| **Clinical Advisor** | Named clinician(s); see `CONTRIBUTORS.md` | Reviews all safety-sensitive changes; signs off on model upgrades |
| **Security Reviewer** | Maintainer or invited security contributor | Reviews SECURITY-related PRs and incidents |
| **Translation Lead** | Per-locale, named in `CONTRIBUTORS.md` | Reviews locale packs and translations |
| **Contributor** | Anyone who opens a PR | Sees the same review path as everyone else |

## Change classes

Every PR is classified at review time. The class determines who must approve before merge.

| Class | Examples | Required approvals |
|---|---|---|
| **Docs** | Typos, README, comments, design folder text-only changes | 1 maintainer |
| **Frontend / non-safety code** | UI, pages under `13-MedOS-Family/frontend/`, `17-MedOS-Research/frontend/`, styling in `web/` | 1 maintainer |
| **Backend / non-safety code** | API routes that don't touch the safety sandwich, database wiring, providers | 1 maintainer |
| **Safety-sensitive** | Anything in `9-HuggingFace-Global/lib/safety/`, golden prompt set, red-flag rules, refusal rules, R0–R5 thresholds, emergency-number changes, disclaimer copy | 1 maintainer **+** 1 clinical advisor |
| **Security-sensitive** | Auth flow, password hashing, session, secrets handling, CSP, CORS, audit-log shape, dependency upgrade across many packages | 1 maintainer **+** 1 security reviewer |
| **Model upgrade** | Switching default LLM, changing provider routing, fine-tuned model promotion | 1 maintainer + 1 clinical advisor + a CHANGELOG entry that names the new model and links the evaluation report |
| **Locale pack** | Files under `config/locales/*.medical.json`, region-specific emergency numbers | 1 maintainer **+** 1 translation lead for that locale |
| **Breaking schema** | DB migrations, audit-log changes, API contract changes | 1 maintainer + clear migration notes in CHANGELOG |

If a PR spans multiple classes, the strictest applies.

## Safety-sensitive review checklist

When reviewing a safety-sensitive PR, the clinical advisor verifies:

1. **Red-flag coverage hasn't regressed.** Run the golden prompt set; sensitivity for R4/R5 stays ≥ 99%.
2. **Risk-class downgrades cannot be performed by the LLM.** The deterministic floor is intact.
3. **Disclaimer text** still appears on every health response.
4. **Refusal categories** are unchanged or strictly broader (more refusals, never fewer).
5. **No PHI** ends up in logs or audit records.
6. **Pediatric / pregnancy / mental-health** branches are not weakened.

## Model upgrade process

Switching the default LLM (e.g., Llama 3.3 70B → next version) is **not** a one-line PR. It requires:

1. The model's intended-use and out-of-scope notes in the PR description.
2. A run of the full golden prompt set, with a written diff against the current production results.
3. Subgroup checks (age band, language, mental-health prompts) — no subgroup may regress more than 5 percentage points on R4/R5 sensitivity.
4. A clinical advisor sign-off, recorded by name in CHANGELOG.
5. A 7-day canary deploy at low traffic before becoming default.

If any of these fails, the upgrade is rolled back.

## Incidents

A **clinical incident** is any user-facing event where:

- A red flag was missed.
- The triage was downgraded by the LLM.
- A clinician annotates a response as materially incorrect.
- PHI appeared somewhere it shouldn't.

Incidents are handled like security incidents:

1. Lock the implicated model version from new deployments.
2. Open a tracking issue (private if PHI may have leaked).
3. Root-cause review with the clinical advisor and security reviewer.
4. Add a regression test to the golden set so the same issue cannot ship again.
5. Public post-mortem after fix lands and any affected users have been notified.

## Decision-making

For routine work, lazy consensus + 1 maintainer is enough.

For larger directional decisions — adding a new MedOS module, removing a sub-project, changing the license, switching the default model family — we run a written **proposal** thread (RFC-style) on the issue tracker, with a 7-day comment window. The maintainer takes the final call after weighing community input.

## Changing this document

Edits to `GOVERNANCE.md`, `SAFETY.md`, `PRIVACY.md`, `SECURITY.md`, or `THREAT_MODEL.md` follow the **Safety-sensitive** review path.

## Where to find names

The current roster (maintainers, clinical advisors, security reviewers, translation leads) is in [`CONTRIBUTORS.md`](./CONTRIBUTORS.md). It's a living document; updates follow the same review path as the role they affect.
