# Security policy

We take the security of MedOS — and the safety of its users — seriously. Because MedOS handles health-related input, **safety vulnerabilities are treated as security vulnerabilities** under the same coordinated-disclosure process.

## Reporting a vulnerability

Please **do not** open a public issue.

Email: **`security@ruslanmv.com`**
PGP key: see [`https://ruslanmv.com/security.asc`](https://ruslanmv.com/security.asc) *(placeholder until published — until then, plain email is fine)*

In your report, include:

- A clear description of the issue.
- Reproduction steps and impact.
- The MedOS surface (e.g., live chat, Medicine Scanner, MedOS Family, MedOS Connect).
- Any logs, screenshots, or proofs-of-concept.
- Whether you believe PHI / user data is at risk.

We will acknowledge receipt within **3 business days** and provide a response with severity classification and expected timeline within **7 business days**.

## What we consider in scope

- The live web app (`web/`, `9-HuggingFace-Global/`).
- Backend API routes under `9-HuggingFace-Global/app/api/`.
- The Medicine Scanner service (`11-Medicine-Scanner/`).
- The Nearby Care metaengine (`12-MetaEngine-Nearby/`).
- The frontends shipped under each MedOS module (`13-MedOS-Family/frontend/`, `17-MedOS-Research/frontend/`).
- Authentication, session handling, password storage.
- The safety sandwich (`9-HuggingFace-Global/lib/safety/`) — bypassing it is a vulnerability.
- Information leakage in logs (PHI exposure).
- Provider-key exposure on the client.

## What we consider out of scope

- Theoretical attacks requiring a privileged local position the user already controls.
- Self-XSS that requires the user to paste attacker-supplied code into their own console.
- Findings in third-party services we route to (please report those upstream).
- Findings in unsupported / archived sub-folders (`1-Environment` historical content, etc.).

## Severity levels

| Level | Examples | Response SLA |
|---|---|---|
| **Critical** | RCE, auth bypass, mass PHI / token leak, safety-sandwich bypass on R5 | Patch + advisory within **72 hours** |
| **High** | Stored XSS, server-side request forgery, ability to log raw symptoms, prompt-injection that softens R4–R5 routing | Patch within **2 weeks** |
| **Medium** | Reflected XSS, weak session config, dependency CVEs in production code | Patch within **30 days** |
| **Low** | Info disclosure with no security impact, hardening suggestions | Patch within **90 days** or noted in roadmap |

## Coordinated disclosure

We follow a **90-day coordinated-disclosure** window. We will work with you to:

1. Reproduce the issue.
2. Propose a fix.
3. Land + verify the fix.
4. Coordinate public disclosure.

We will credit you in the changelog and in `CONTRIBUTORS.md` unless you prefer to remain anonymous.

## Secrets policy

- No secrets in the repository, ever. CI runs **gitleaks** on every PR.
- Provider API keys (Groq, Hugging Face, Gemini, OpenAI, etc.) live only in server-side environment variables.
- `.env` files are never committed; the `.gitignore` enforces this.
- If you accidentally commit a secret, rotate it immediately and email the address above.
- Hugging Face Spaces deployments use the Space's environment-variable store; nothing baked into images.

## Dependency policy

- We pin direct dependencies in `package.json` files and review upgrades.
- CI runs `npm audit` (or `pnpm audit`) and **Trivy** for container/dependency CVEs.
- High/critical CVEs in production paths are fixed under the SLA above.
- Transitive vulnerabilities are tracked but lower priority unless reachable.

## How security reports are handled

1. Report received → acknowledgement within 3 business days.
2. Severity classified using the table above.
3. Reproduction in a clean environment.
4. Fix proposed; clinical advisor consulted if the issue overlaps with safety.
5. Patch landed on the security branch; tests added (golden prompts when relevant).
6. Coordinated disclosure with the reporter.
7. Public advisory + CHANGELOG entry; reporter credited.

## Hall of fame

Contributors who have responsibly disclosed issues are credited in [`CONTRIBUTORS.md`](./CONTRIBUTORS.md) under the **Security** section.

## Threat model

For the assets, threats, and mitigations we focus on, see [`THREAT_MODEL.md`](./THREAT_MODEL.md).
