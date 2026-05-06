# MedOS Connect — Domain Model

This document defines the persistence layer, the normalization layer, and the connector interface for MedOS Connect. Everything here is **additive**: new tables only, no destructive changes to existing schemas.

---

## 1. Database design rules

- Use additive tables only.
- Do not modify existing tables unless absolutely necessary.
- If existing tables exist for related concepts (e.g., users), use foreign keys / mapping tables rather than altering them.
- All timestamps stored as ISO-8601 strings in UTC (with offset preserved when source provides one).
- All tokens stored encrypted (`*_encrypted` columns) using a server-side `TOKEN_ENCRYPTION_KEY`.

---

## 2. Tables

### `connected_accounts`

Stores external connected accounts (Withings, Apple Health, etc.).

```sql
CREATE TABLE connected_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',

  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TEXT,

  scopes TEXT,
  connected_at TEXT NOT NULL,
  last_sync_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Provider examples:

```text
withings
apple_health
android_health_connect
omron
manual
```

---

### `connector_devices`

Detected devices linked to a connected account.

```sql
CREATE TABLE connector_devices (
  id TEXT PRIMARY KEY,
  connected_account_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_device_id TEXT,
  device_name TEXT,
  device_model TEXT,
  device_type TEXT,
  last_seen_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Examples:

```text
Withings Body Smart
Withings BPM Connect
Withings Thermo
Withings BeamO
```

---

### `vital_readings`

Normalized vitals.

```sql
CREATE TABLE vital_readings (
  id TEXT PRIMARY KEY,

  user_id TEXT NOT NULL,
  family_id TEXT,
  member_id TEXT,

  type TEXT NOT NULL,
  value REAL,
  unit TEXT,

  systolic REAL,
  diastolic REAL,
  heart_rate REAL,

  source TEXT NOT NULL,
  provider TEXT,
  provider_measure_id TEXT,
  device_id TEXT,
  device_name TEXT,

  measured_at TEXT NOT NULL,
  synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  notes TEXT
);
```

Vital types stored in `type`:

```text
weight
blood_pressure
blood_glucose
temperature
heart_rate
oxygen_saturation
ecg
stethoscope
body_composition
```

`source` values: `manual`, `withings`, `apple_health`, `android_health_connect`, `omron`, etc.

A unique index on `(provider, provider_measure_id)` prevents duplicate imports.

---

### `vital_reading_raw_payloads`

Raw provider payloads kept separately for debugging and future reprocessing.

```sql
CREATE TABLE vital_reading_raw_payloads (
  id TEXT PRIMARY KEY,
  vital_reading_id TEXT,
  provider TEXT NOT NULL,
  raw_payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

This is important because provider data (e.g., Withings) may include fields MedOS does not yet use.

---

### `family_member_device_mappings`

Maps an external account/device/user to a MedOS Family member.

```sql
CREATE TABLE family_member_device_mappings (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  connected_account_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT,
  provider_device_id TEXT,
  rule_type TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Rule types:

```text
all_readings_to_member
device_to_member
provider_user_to_member
manual_review_required
```

---

### `sync_jobs`

Tracks each sync run.

```sql
CREATE TABLE sync_jobs (
  id TEXT PRIMARY KEY,
  connected_account_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,

  started_at TEXT NOT NULL,
  completed_at TEXT,
  error_message TEXT,

  records_found INTEGER DEFAULT 0,
  records_imported INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0
);
```

Sync types: `manual`, `scheduled`, `webhook`, `initial_backfill`.
Status: `queued`, `running`, `succeeded`, `failed`, `partial`.

---

### `medication_reminders`

```sql
CREATE TABLE medication_reminders (
  id TEXT PRIMARY KEY,
  family_id TEXT,
  member_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,

  medicine_name TEXT NOT NULL,
  dose TEXT,
  form TEXT,

  start_datetime TEXT NOT NULL,
  frequency_type TEXT NOT NULL,
  frequency_value INTEGER,
  frequency_unit TEXT,

  duration_type TEXT NOT NULL,
  end_datetime TEXT,
  total_doses INTEGER,

  instructions TEXT,
  prescribed_by TEXT,

  status TEXT NOT NULL DEFAULT 'active',

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

### `medication_dose_logs`

```sql
CREATE TABLE medication_dose_logs (
  id TEXT PRIMARY KEY,
  reminder_id TEXT NOT NULL,
  member_id TEXT NOT NULL,

  scheduled_for TEXT NOT NULL,
  action TEXT NOT NULL,
  action_at TEXT,
  recorded_by_user_id TEXT,

  notes TEXT,
  created_at TEXT NOT NULL
);
```

Actions: `taken`, `skipped`, `snoozed`, `missed`.

---

### `notification_targets`

```sql
CREATE TABLE notification_targets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Platforms: `pwa`, `ios`, `android`, `email`, `sms_future`.

---

### `notification_events`

```sql
CREATE TABLE notification_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  family_id TEXT,
  member_id TEXT,

  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,

  scheduled_for TEXT,
  sent_at TEXT,
  status TEXT NOT NULL,

  related_entity_type TEXT,
  related_entity_id TEXT,

  created_at TEXT NOT NULL
);
```

Notification types: `medicine_due`, `medicine_missed`, `new_vital_synced`, `high_temperature_logged`, `appointment_due`, `daily_family_summary`.
Status: `pending`, `sent`, `failed`, `read`, `dismissed`.

---

## 3. Normalization layer

Location: `lib/normalizers/vitals.ts`.

Purpose:

> Convert provider-specific measurements into MedOS `VitalReading` records.

```ts
export type NormalizedVitalType =
  | "weight"
  | "blood_pressure"
  | "blood_glucose"
  | "temperature"
  | "heart_rate"
  | "oxygen_saturation"
  | "ecg"
  | "stethoscope";

export interface NormalizedVitalReading {
  id?: string;
  userId: string;
  familyId?: string;
  memberId?: string;

  type: NormalizedVitalType;
  value?: number;
  unit?: string;

  systolic?: number;
  diastolic?: number;
  heartRate?: number;

  source: "manual" | "withings" | "apple_health" | "android_health_connect";
  provider?: string;
  providerMeasureId?: string;
  deviceName?: string;

  measuredAt: string;
  syncedAt?: string;
  raw?: unknown;
}
```

Each connector provides its own mapper into `NormalizedVitalReading`. Units are normalized (e.g., kg for weight, °C for temperature, mmHg for blood pressure, % for SpO₂). Raw payloads are saved separately via `vital_reading_raw_payloads`.

---

## 4. Connector interface

All future connectors implement the same interface so the rest of MedOS Connect can stay provider-agnostic.

```ts
export interface HealthConnector {
  provider: string;

  getAuthorizationUrl(userId: string): Promise<string>;

  handleOAuthCallback(params: {
    code: string;
    state: string;
  }): Promise<ConnectedAccount>;

  refreshToken(account: ConnectedAccount): Promise<ConnectedAccount>;

  syncVitals(params: {
    accountId: string;
    from: string;
    to: string;
  }): Promise<SyncResult>;

  disconnect(accountId: string): Promise<void>;
}
```

Concrete implementations to add over time:

```text
WithingsConnector
AppleHealthConnector
AndroidHealthConnectConnector
OmronConnector
GlucoseConnector
```

---

## 5. Recommended folder structure

This documentation describes a suggested code layout inside the existing Next.js app at `9-HuggingFace-Global/`. No code is created here yet — only the design.

```text
9-HuggingFace-Global/
├── app/api/connect/withings/
├── app/api/vitals/
├── app/api/family/
├── app/api/reminders/
├── lib/connectors/withings/
├── lib/connectors/apple-health/
├── lib/connectors/health-connect/
├── lib/normalizers/vitals.ts
├── lib/services/vitals-service.ts
├── lib/services/reminder-service.ts
├── lib/services/notification-service.ts
└── lib/services/family-permission-service.ts
```

The MedOS Connect documentation lives in this folder (`14-MedOS-Connect/`).

---

## 6. Background jobs

Required jobs:

```text
withings_sync_job
token_refresh_job
medication_reminder_job
missed_dose_job
daily_family_summary_job
```

MVP can start without a full job queue:

```text
Manual sync button
Sync on login
Sync on webhook
Simple interval job if hosting supports it
```

Later:

```text
BullMQ / Redis
Cron jobs
Serverless scheduled functions
Queue workers
```
