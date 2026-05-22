# Privacy

MedOS is built on a **privacy-first** posture: we want to be the medical assistant your phone trusts, not the one your phone snitches to.

This document is a public, plain-language **DPIA-style summary**. It is not a legal contract; it is the source of truth that the codebase, the README, and the privacy policy must remain consistent with. If you find a discrepancy, please open an issue.

## What MedOS collects by default

Across the live chatbot (`web/`, `9-HuggingFace-Global/`) and the additive design layers, the **default** data posture is:

| Surface | What's collected | Why |
|---|---|---|
| Live chat | The current message during the request | Needed to call the LLM provider |
| Live chat | A short rolling context for the active conversation, in browser memory | To keep the conversation coherent |
| Live chat | Telemetry: timestamp, region, model used, risk class, rule fires, latency | Safety regression + capacity planning. **No raw symptoms, no PHI.** |
| Auth (when used) | Email, password hash, last login | To support optional account features |
| Health Tracker | Vitals, medicines, appointments — **stored locally on the device** by default | Local-first; user controls export/sync |
| Medicine Scanner | The image the user submits, only for the duration of the request | Returned as structured JSON; the image is not retained |
| MedOS Family / Connect / Classify / Pathogen / Research | See per-module privacy docs in their `*/04-security/` or `*/07-safety/` folders |

## What MedOS does *not* collect

- **No advertising trackers.** Ever.
- **No third-party analytics on health content.** No Google Analytics on chat pages, no pixel tracking.
- **No raw chat content in audit logs.** The audit subsystem stores metadata only (risk class, rule fires, request id, model version, latency). See `9-HuggingFace-Global/lib/safety/audit.ts`.
- **No symptom data sold or shared.** There is no commercial data path.
- **No biometric data unless the user explicitly attaches it** (e.g., Withings sync via the optional MedOS Connect module, where the user OAuth-pairs their account).
- **No data from minors collected without a guardian-managed flow** (see `13-MedOS-Family`).

## "Zero data stored" — what we actually mean

The README's "100% private, zero data stored" line refers to **the live chat conversation content**: messages and replies are not written to a database in the default deployment. They live in memory for the duration of the request and the active session, then go away.

**What is stored**, even by default:

- Safety + capacity telemetry (no PHI, see above).
- If the user creates an account: their email + password hash + email-verification flag.
- If the user uses the Health Tracker: their data, on the device they used.

The phrase "zero data stored" is therefore narrower than "we store nothing." We store no chat content; we do store minimum operational telemetry. Fixing this in the README is a Phase-0 follow-up.

## Data retention

| Data class | Retention |
|---|---|
| Live chat content | Not persisted server-side |
| Safety + capacity telemetry | 30 days rolling, then aggregated and discarded |
| Account email + password hash | Until the user deletes the account |
| Health Tracker (on-device) | Until the user deletes it |
| Audit logs | 90 days, append-only, no PHI |

## Deletion

Users can:

1. Delete their account at any time, which removes the email + password hash row.
2. Clear the Health Tracker on the device (resets local storage).
3. Email the disclosure address in [`SECURITY.md`](./SECURITY.md) for any other deletion request.

## Authentication and tokens

- Passwords are hashed with bcrypt (per `9-HuggingFace-Global` auth code).
- Session tokens are HTTP-only, SameSite, scoped per-deployment.
- Provider API keys (Groq, HF, Gemini, etc.) are server-side **only** and are never sent to the browser. See `9-HuggingFace-Global/lib/` for the routing layer.

## Third-party providers used

The live chatbot routes prompts to one or more LLM providers depending on availability. Each request goes to **one** provider per call.

| Provider | Used for | Region |
|---|---|---|
| Groq | Llama 3.3 70B inference | Provider-managed |
| Hugging Face Inference | Llama 3.x backups, fine-tuned medical Llama3 | Provider-managed |
| Gemini API | Optional fallback | Provider-managed |
| OpenStreetMap (via 12-MetaEngine-Nearby) | Nearby pharmacies / doctors | Public |

If you are deploying MedOS yourself, you choose your providers and you control your data flow. The repo's design lets you turn providers off via env var.

For privacy-conscious users, the **OllaBridge Cloud** pairing flow (designed in MedOS Family Settings, plumbed into the live app in Phase 2B) lets the user run a local Ollama instance and route their chat to it — so prompts never leave their machine.

## User rights

Per GDPR-style expectations, users have:

- **Right of access** — what we hold about them.
- **Right of rectification** — fix incorrect data.
- **Right to erasure** — delete their account.
- **Right to data portability** — JSON export from the Health Tracker is supported.
- **Right to object** — don't want telemetry counted? Local deployment.

These rights are exercised through the contact channel in [`SECURITY.md`](./SECURITY.md). Response SLA is **14 days** for data requests; faster in practice.

## Children

MedOS is not designed for unsupervised use by children. The MedOS Family layer (see `13-MedOS-Family/`) explicitly designs guardian-managed profiles, transfer-at-18 rules, and consent boundaries.

## Cross-references

- `13-MedOS-Family/08-security/PRIVACY_AND_SAFETY.md` — family + consent model.
- `14-MedOS-Connect/04-security/OAUTH_AND_PRIVACY.md` — OAuth token handling and audit.
- `15-MedOS-Classify/07-safety/SAFETY_AND_COMPLIANCE.md` — clinical-classifier privacy stance.
- `16-MedOS-Pathogen/07-safety/SAFETY_AND_COMPLIANCE.md` — DICOM PHI strip + license posture.
- `17-MedOS-Research/09-safety/RESEARCH_SAFETY_AND_GOVERNANCE.md` — research-only data posture.
- `THREAT_MODEL.md` — what we're defending against.
- `SECURITY.md` — how to reach us.
