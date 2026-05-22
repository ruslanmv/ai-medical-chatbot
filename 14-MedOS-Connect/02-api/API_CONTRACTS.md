# MedOS Connect — API Contracts

All MedOS Connect APIs are added under new namespaces:

```text
/api/connect/*
/api/family/*
/api/vitals/*
/api/reminders/*
/api/notifications/*
```

All routes are authenticated using the existing MedOS auth/session strategy. Permission checks use the family permission model defined in `04-security/OAUTH_AND_PRIVACY.md`.

---

## 1. Withings connector APIs

```text
GET  /api/connect/withings/start
GET  /api/connect/withings/callback
POST /api/connect/withings/sync
GET  /api/connect/withings/status
POST /api/connect/withings/disconnect
POST /api/connect/withings/webhook
```

### `GET /api/connect/withings/start`

Starts OAuth. Returns a redirect to the Withings authorization page. The route generates an opaque `state` and binds it to the current user/session.

**Response (302)** — redirect to Withings.

### `GET /api/connect/withings/callback`

Receives the OAuth `code` and `state` from Withings. Validates `state`, exchanges the code for tokens, encrypts the tokens, and stores a `connected_accounts` row.

**Query params**: `code`, `state`
**Response (302)** — redirect back to MedOS Connect status page.

### `POST /api/connect/withings/sync`

Manually triggers a sync window for the authenticated user's connected Withings account.

**Request body**:

```json
{
  "from": "2026-05-01T00:00:00+02:00",
  "to": "2026-05-05T23:59:59+02:00"
}
```

**Response (202)**:

```json
{
  "syncJobId": "sj_01H...",
  "status": "queued"
}
```

### `GET /api/connect/withings/status`

Returns the user's Withings connection status, including last sync time and detected devices.

**Response (200)**:

```json
{
  "connected": true,
  "providerUserId": "wid_12345",
  "displayName": "Withings — Father",
  "lastSyncAt": "2026-05-05T18:30:00+02:00",
  "scopes": ["user.metrics", "user.activity"],
  "devices": [
    { "id": "dev_1", "deviceName": "Body Smart", "deviceModel": "WBS10" }
  ]
}
```

### `POST /api/connect/withings/disconnect`

Revokes Withings tokens and marks the `connected_accounts` row `status='disconnected'`. Imported readings are kept unless the user also asks to delete them.

### `POST /api/connect/withings/webhook`

Receives Withings notifications that new measurements are available. The handler queues a sync for the affected account/range.

---

## 2. Vitals APIs

```text
GET    /api/vitals
POST   /api/vitals
GET    /api/vitals/:id
PATCH  /api/vitals/:id
DELETE /api/vitals/:id
```

### Query examples

```text
/api/vitals?memberId=child-1&type=temperature
/api/vitals?memberId=father&type=blood_pressure&from=2026-05-01
```

### Manual reading example

```json
{
  "memberId": "child-1",
  "type": "temperature",
  "value": 38.2,
  "unit": "°C",
  "measuredAt": "2026-05-05T18:30:00+02:00",
  "source": "manual"
}
```

### Blood pressure example

```json
{
  "memberId": "father",
  "type": "blood_pressure",
  "systolic": 128,
  "diastolic": 82,
  "heartRate": 71,
  "unit": "mmHg",
  "measuredAt": "2026-05-05T08:10:00+02:00",
  "source": "withings",
  "provider": "withings",
  "deviceName": "BPM Connect"
}
```

---

## 3. Family mapping APIs

```text
GET    /api/family/device-mappings
POST   /api/family/device-mappings
PATCH  /api/family/device-mappings/:id
DELETE /api/family/device-mappings/:id
```

### Create mapping example

```json
{
  "familyId": "family-123",
  "memberId": "child-1",
  "connectedAccountId": "withings-acc-123",
  "provider": "withings",
  "providerDeviceId": "thermo-123",
  "ruleType": "device_to_member"
}
```

### Rule types

```text
all_readings_to_member
device_to_member
provider_user_to_member
manual_review_required
```

---

## 4. Medication reminder APIs

```text
GET    /api/reminders/medications
POST   /api/reminders/medications
PATCH  /api/reminders/medications/:id
POST   /api/reminders/medications/:id/log
POST   /api/reminders/medications/:id/snooze
POST   /api/reminders/medications/:id/pause
```

### Create reminder example

```json
{
  "memberId": "child-1",
  "medicineName": "Tachipirina",
  "dose": "500 mg",
  "startDateTime": "2026-05-05T08:00:00+02:00",
  "frequencyType": "every_x_hours",
  "frequencyValue": 6,
  "frequencyUnit": "hours",
  "durationType": "number_of_days",
  "durationDays": 2,
  "notificationRecipients": ["father-user-id", "mother-user-id"]
}
```

### Log dose example

```json
{
  "scheduledFor": "2026-05-05T14:00:00+02:00",
  "action": "taken",
  "actionAt": "2026-05-05T14:05:00+02:00",
  "notes": "with food"
}
```

Allowed actions: `taken`, `skipped`, `snoozed`, `missed`.

---

## 5. Notification APIs

```text
POST  /api/notifications/register-device
POST  /api/notifications/test
GET   /api/notifications
PATCH /api/notifications/:id/read
```

### Register device example

```json
{
  "platform": "pwa",
  "token": "BFG...subscription-endpoint..."
}
```

Allowed platforms: `pwa`, `ios`, `android`, `email`, `sms_future`.

---

## 6. Doctor-ready export

```text
GET /api/family/:familyId/doctor-summary
```

### Query params

```text
memberId
from
to
sections=vitals,medicines,appointments,records
```

### Output

```text
JSON first
PDF later
```

### Sections

```text
Patient summary
Vitals timeline
Medicine history
Missed doses
Symptoms/monthly notes
Appointments
Records
Device sources
```

---

## 7. Error format

All error responses use a consistent shape:

```json
{
  "error": {
    "code": "withings_token_expired",
    "message": "Withings refresh token is invalid or revoked.",
    "retryable": false
  }
}
```

Common error codes:

```text
unauthorized
forbidden
not_found
validation_error
withings_token_expired
withings_rate_limited
sync_already_running
permission_denied_member
consent_required
```
