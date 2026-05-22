# MedOS Connect — Withings Connector

Withings is the **first** connector in MedOS Connect because a single Withings account can cover most of the vitals the MedOS app already supports (weight, blood pressure, heart rate, temperature, oxygen saturation).

This document describes the Withings OAuth flow, supported devices, and how Withings data is mapped into MedOS Connect's normalized model. Implementation details are intentionally kept at the design level — actual API endpoints and parameters should be confirmed against the official Withings Public API documentation at integration time.

---

## 1. Why OAuth, not Bluetooth

MedOS Connect uses the official **Withings OAuth + Public API** flow. We do **not** extract data directly from Bluetooth devices.

Reasons:

- Withings devices sync to the Withings cloud automatically; the cloud is the canonical source of truth.
- OAuth gives MedOS access to historical and future data without re-pairing or being near the device.
- Multi-user devices (e.g., Body Smart) work consistently.
- It avoids platform-specific Bluetooth permission and lifecycle issues.

---

## 2. Sync flow

```text
User opens MedOS Family
→ Connect Withings
→ OAuth consent
→ Store encrypted tokens
→ Fetch measurements
→ Normalize to VitalReading
→ Show in Vitals screen
```

End-to-end:

```text
1. GET  /api/connect/withings/start          → redirect to Withings auth
2. GET  /api/connect/withings/callback        → exchange code → encrypted tokens stored
3. POST /api/connect/withings/sync            → fetch + normalize + store readings
4. POST /api/connect/withings/webhook         → enqueue sync job when Withings notifies us
5. GET  /api/connect/withings/status          → connection state, devices, last sync
6. POST /api/connect/withings/disconnect      → revoke tokens, mark account disconnected
```

---

## 3. Withings device → MedOS vital mapping

```text
Body Smart
→ weight
→ body composition

BPM Connect
→ blood_pressure
→ heart_rate

Thermo
→ temperature

BeamO
→ temperature
→ oxygen_saturation
→ heart_rate
→ ECG (later)
→ stethoscope (later)
```

### First implementation supports

```text
weight
blood_pressure
heart_rate
temperature
oxygen_saturation
```

### Out of scope for MVP

```text
ECG signal
stethoscope signal
AFib detection
```

These are advanced and should be designed and implemented in a later phase.

---

## 4. Tokens and refresh

- Access and refresh tokens are stored encrypted in `connected_accounts`.
- `token_expires_at` is checked before each API call; if expiry is near or passed, the connector refreshes the token before the call.
- A failed refresh marks the account `status='needs_reauth'` and surfaces a clear message in `GET /api/connect/withings/status` so the UI can prompt the user to reconnect.

---

## 5. Webhooks

Withings can notify MedOS that new measurements are available. The handler at `POST /api/connect/withings/webhook`:

1. Verifies the Withings signature/secret.
2. Identifies the affected `connected_account` (by Withings user id).
3. Enqueues a sync job (`sync_jobs.sync_type = 'webhook'`) for the relevant time window.
4. Returns 200 quickly so Withings does not retry.

The webhook handler never writes vitals directly — it only schedules a sync job.

---

## 6. Member mapping for multi-user devices

Withings devices like **Body Smart** can be used by several family members under the same Withings account. MedOS Connect resolves each measurement to a specific MedOS Family member using `family_member_device_mappings`.

Resolution order (first match wins):

1. `provider_user_to_member` — if Withings reports the in-device user identity, map directly.
2. `device_to_member` — single-user device (e.g., a personal Thermo) is bound to one member.
3. `all_readings_to_member` — bind every reading from this account to one member.
4. `manual_review_required` — readings imported but parked for the Family Admin to assign.

If no mapping resolves, the reading is stored against the connecting user only and shown in a "needs assignment" queue.

---

## 7. Idempotency

Each Withings measurement carries a stable provider-side identifier. MedOS Connect stores it in `vital_readings.provider_measure_id` with a unique index on `(provider, provider_measure_id)`. Re-running a sync over the same window never creates duplicates.

---

## 8. Error handling

Common Withings error states the connector must handle gracefully:

```text
withings_token_expired
withings_token_revoked
withings_rate_limited
withings_unavailable
withings_unexpected_payload
```

All errors are recorded on the corresponding `sync_jobs` row (`status`, `error_message`) and surfaced in `GET /api/connect/withings/status`.
