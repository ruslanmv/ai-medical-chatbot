# MedOS Connect — OAuth, Security and Privacy

This document defines how MedOS Connect handles OAuth tokens, audit logs, family permissions, and user controls. Privacy and consent are first-class requirements.

---

## 1. OAuth tokens

### Encryption

- Tokens are **never** stored in plain text.
- `connected_accounts.access_token_encrypted` and `connected_accounts.refresh_token_encrypted` are encrypted with a server-side key (`TOKEN_ENCRYPTION_KEY`).
- Recommended algorithm: AES-256-GCM with a per-record IV stored alongside the ciphertext.
- The encryption key is loaded from environment configuration only and is rotated according to the operations runbook.

### Token lifecycle

```text
authorize → exchange → encrypt → store
         ↓
       refresh on demand or when token_expires_at is near
         ↓
       revoke on disconnect
```

### State / CSRF

- The `state` parameter passed to provider authorization endpoints is opaque, single-use, and bound to the current MedOS user/session.
- Callback handlers reject any request whose `state` is missing, expired, or not bound to the active user.

---

## 2. Data minimization

- Only request OAuth scopes needed for vitals (e.g., for Withings: `user.metrics`, plus `user.activity` if/when activity is added).
- Do not request scopes for data we do not display.
- Raw payloads stored in `vital_reading_raw_payloads` retain only what the provider already returned for the requested scopes.

---

## 3. Family permission model

### Adults

Adult data is **consent-based**.

```text
Family Admin cannot see adult vitals unless the adult has shared them.
```

### Children

Child Mode is **guardian-managed**.

```text
Family Admin can manage and monitor child vitals, medicines, reminders, appointments, and records.
```

### Caregivers

Caregiver access is configurable per family/member:

```text
View only
Can add readings
Can manage reminders
Can receive notifications
Can export doctor summaries
```

### Permission checks

Every API path performs explicit checks before reading or writing member data:

```ts
canReadMemberHealthData(userId, memberId)
canWriteMemberHealthData(userId, memberId)
canManageChildProfile(userId, memberId)
canReceiveNotifications(userId, memberId)
```

These are implemented in `lib/services/family-permission-service.ts` and are required, not optional.

---

## 4. Audit logs

Audit events are written for every privacy-sensitive action:

```text
connected_account.created
connected_account.synced
connected_account.disconnected
vital.imported
vital.viewed
vital.deleted
adult_consent.updated
child_profile.updated
reminder.created
reminder.updated
dose.marked_taken
dose.marked_skipped
dose.marked_missed
export.generated
```

Each audit entry includes: actor user id, target member id, family id (if any), event type, timestamp, IP/user-agent (when available), and a short structured context payload. Audit entries are append-only.

---

## 5. User controls

The user must be able to:

```text
Disconnect Withings (and any other connector)
Delete imported readings
Pause sync
Choose family member mapping
Revoke adult sharing
Export their data
```

Disconnect is a hard action: tokens are revoked at the provider when possible, and the `connected_accounts.status` is set to `disconnected`. Already-imported readings remain unless the user explicitly deletes them.

---

## 6. Boundaries

MedOS Connect is **not** a clinical product:

- It does not diagnose.
- It does not prescribe.
- It does not change medication frequency or dosage.
- It does not perform automated treatment decisions.

The AI assistant in the existing MedOS app may help organize user-provided or prescription-provided schedules, but never recommend or modify dosing.

---

## 7. Webhook security

For provider webhooks (e.g., `POST /api/connect/withings/webhook`):

- Verify the provider's signature/secret on every request.
- Reject requests with missing or invalid signatures.
- Treat the webhook payload as untrusted; only use it to enqueue a sync job for the affected account/range, not to write vitals directly.
