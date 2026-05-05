# MedOS Family — Backend Architecture (MVP → v2)

## 1) Goal and scope

Design a secure backend for a **private family health-tree** product where a family admin (e.g., parent) can manage linked member profiles (spouse + children), track monthly health timelines, upload documents, generate reminders, and export doctor-ready PDFs.

This backend is designed to integrate with the existing MedOS app stack in this repository and follows the contracts and safety boundaries already documented in:

- `13-MedOS-Family/01-product/PRODUCT_SPEC.md`
- `13-MedOS-Family/02-contracts/family_contracts.md`
- `13-MedOS-Family/08-security/PRIVACY_AND_SAFETY.md`

---

## 2) Repo analysis summary (what exists now)

The repository already includes a strong frontend and API baseline in `9-HuggingFace-Global`:

- Next.js app routes and API route handlers (`app/api/*`)
- auth flows (register/login/reset/verify)
- user settings and admin endpoints
- health-data sync patterns
- chat history/session patterns

This means the lowest-friction backend implementation is:

1. Keep frontend in `9-HuggingFace-Global`
2. Add a dedicated **family backend module** (service layer + persistence)
3. Expose family APIs through `app/api/family/*` routes
4. Reuse auth/session strategy already used by current MedOS routes

---

## 3) Architecture overview

## 3.1 Components

- **API Gateway Layer**: Next.js route handlers under `app/api/family/*`
- **Family Domain Service**: business rules (family tree, check-ins, reminders, consent)
- **Document Service**: secure upload metadata, malware scanning hooks, signed URL retrieval
- **Reminder Scheduler**: computes due reminders and generates notification events
- **PDF Export Service**: generates doctor-visit summaries per member / timeframe
- **Audit & Compliance Service**: immutable audit trail for sensitive operations
- **Persistence Layer**: PostgreSQL for relational health records + object storage for files

## 3.2 High-level flow

1. User authenticates (existing auth).
2. API validates membership and role (`family_admin`, `adult_member`, `guardian`, `viewer`).
3. Request handled by domain service with policy checks (consent/guardian constraints).
4. Data persisted in PostgreSQL; documents stored in encrypted object storage.
5. Sensitive events logged to audit table.
6. Optional async jobs (reminder generation, PDF creation, virus scan) queued.

---

## 4) Recommended data model (PostgreSQL)

## 4.1 Core entities

- `users`
  - existing app identity records
- `families`
  - `id`, `name`, `created_by_user_id`, `timezone`, `created_at`
- `family_members`
  - `id`, `family_id`, `user_id (nullable for child-only profiles)`, `display_name`, `dob`, `sex`, `relation`, `member_type(adult|child)`, `status`
- `family_roles`
  - `family_id`, `user_id`, `role(family_admin|guardian|adult_member|viewer)`
- `consents`
  - `id`, `family_id`, `member_id`, `consent_type(data_share|document_share|export_share)`, `granted_by_user_id`, `granted_at`, `revoked_at`, `scope_json`

## 4.2 Monthly health timeline

- `monthly_checkins`
  - `id`, `family_id`, `member_id`, `month (YYYY-MM)`, `summary_notes`, `status(draft|submitted|locked)`, `submitted_by`, `submitted_at`
- `symptom_entries`
- `doctor_visits`
- `medication_entries`
- `vaccine_entries`
- `vitals_entries` (weight/height/bp)
- `sleep_entries`
- `lab_entries`
- `checkin_notes`

(Each table links to `monthly_checkins.id` and stores normalized fields + optional `raw_json` for extensibility.)

## 4.3 Documents and exports

- `documents`
  - `id`, `family_id`, `member_id`, `checkin_id (nullable)`, `doc_type`, `storage_key`, `mime_type`, `size_bytes`, `hash_sha256`, `uploaded_by`, `uploaded_at`, `scan_status`
- `doctor_exports`
  - `id`, `family_id`, `member_id`, `from_date`, `to_date`, `file_key`, `generated_by`, `generated_at`

## 4.4 Reminders and alerts

- `reminders`
  - `id`, `family_id`, `member_id`, `type(appointment|vaccine|medication|missing_checkin)`, `due_at`, `status(pending|sent|done|dismissed)`
- `health_alerts`
  - `id`, `family_id`, `member_id`, `severity(info|warning|critical)`, `rule_id`, `message`, `created_at`, `resolved_at`

## 4.5 Compliance

- `audit_logs`
  - immutable append-only: actor, action, target, IP/device metadata, timestamp, reason
- `data_access_logs`
  - every read/download/export of sensitive content

---

## 5) API design (MVP)

Base path: `/api/family/v1`

- `POST /families` create family
- `GET /families/:familyId` family summary
- `POST /families/:familyId/members` add member
- `PATCH /families/:familyId/members/:memberId` update member
- `POST /families/:familyId/invites` create invite code/link
- `POST /families/:familyId/checkins/:memberId/:month` upsert monthly check-in
- `GET /families/:familyId/checkins/:memberId?from=&to=` timeline query
- `POST /families/:familyId/documents/presign-upload` issue upload URL
- `POST /families/:familyId/documents/:documentId/complete` finalize + enqueue scan
- `GET /families/:familyId/dashboard` aggregate dashboard view
- `POST /families/:familyId/exports/doctor-summary` async PDF export
- `GET /families/:familyId/exports/:exportId` get signed download URL

### API conventions

- JSON schema validation (Zod/TypeBox) at route boundary
- idempotency keys for create/update endpoints
- pagination cursor for lists
- standard error envelope:
  - `code`, `message`, `details`, `request_id`

---

## 6) Authorization and privacy model

- RBAC + ABAC hybrid:
  - RBAC: family roles determine baseline permissions
  - ABAC: consent + guardian relationship + member age gates fine-grained access
- Default deny for all family data access
- Adults can revoke sharing consent at any time
- Child profiles managed by guardians only
- Read/write/download/export each checked independently

---

## 7) Security controls (MVP minimum)

- TLS everywhere
- At-rest encryption:
  - DB volume encryption
  - object storage SSE-KMS
- Row-level access checks in service layer (and optional DB RLS in v2)
- Signed URLs with short TTL for document/PDF downloads
- File validation:
  - MIME + extension allowlist
  - AV/malware scan pipeline
- Secret management through environment vault (no secrets in repo)
- Structured audit logs for all PHI operations
- Rate limits + brute-force protection on auth and upload endpoints
- Backups + restore drill plan

---

## 8) Reminder and alert engine

### Reminder sources

- upcoming appointments
- vaccine due windows
- medication schedule windows
- missing monthly check-ins

### Processing design

- Cron worker runs every hour
- Builds due reminders for each family timezone
- Deduplicates by `(member_id, type, due_window)`
- Emits notification event (push/email/in-app) via provider abstraction

### Health alerts

For MVP, keep simple rules (non-diagnostic):

- repeated missed medications
- prolonged missing check-ins
- overdue follow-up after logged doctor visit

Alert copy must recommend contacting a qualified professional, not self-diagnosing.

---

## 9) Doctor Visit Mode (PDF export)

- Input: member + date range + optional sections
- Output: clean summary with:
  - demographics
  - timeline events
  - active meds
  - vaccine history
  - vitals trend snapshot
  - attached document index
- Security:
  - async job + signed one-time link
  - export access logged in `data_access_logs`
  - optional watermark: generated timestamp + requesting user

---

## 10) Observability and operations

- Metrics:
  - API latency/error rate
  - reminder generation success
  - document scan queue depth
  - export generation time
- Logs:
  - structured JSON logs with request_id correlation
- Tracing:
  - route -> service -> DB/storage spans
- SLO examples:
  - p95 read API < 300ms
  - 99% reminder jobs complete within 10 min

---

## 11) Delivery plan

## Phase 1 (MVP)

- Family + members + roles
- Monthly check-ins
- Document upload metadata + secure storage
- Dashboard aggregation endpoint
- Basic reminders
- Doctor PDF export
- Audit logs

## Phase 2

- Advanced consent policies
- DB row-level security
- richer reminders and localized notifications
- policy-driven retention and deletion workflows

## Phase 3

- Multi-family support per user
- provider integrations (calendar, EHR import)
- deeper anomaly detection (still non-diagnostic)

