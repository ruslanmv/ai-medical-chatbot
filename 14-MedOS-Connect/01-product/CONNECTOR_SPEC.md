# MedOS Connect — Product Specification

## 1. Main goal

Create a new backend layer called **MedOS Connect** (internally `medos-connect`) that lets users optionally connect their electronic health devices and platforms to MedOS, while keeping the existing MedOS app fully functional and local-first.

This backend manages:

```text
Device connectors
OAuth tokens
Vitals imports
Medicine reminders
Phone notifications
Family member mapping
Sync logs
Audit logs
Doctor-ready export data
```

---

## 2. Backend concept

The backend acts like a **health data hub** that normalizes data from many sources into a single MedOS health model.

```text
Withings
Apple Health
Android Health Connect
Manual entry
Medicine reminders
        │
        ▼
MedOS Connect Backend
        │
        ▼
Normalized MedOS Health Data
        │
        ▼
MedOS App / MedOS Family / Doctor Export
```

Every device gives data differently. MedOS Connect stores everything in one common model:

```text
VitalReading
MedicationReminder
MedicationDoseLog
ConnectedAccount
SyncJob
FamilyMember
```

---

## 3. Backend modules

### A. Connector module

Handles connections to external platforms. First connector is **Withings**. Later: Apple Health, Android Health Connect, Google Fit (if needed), glucose meter platforms, Omron (if needed).

Connector responsibilities:

```text
OAuth authorization
Token refresh
Fetch measurements
Receive webhooks
Normalize data
Store sync logs
Handle errors
```

### B. Vitals module

Stores all vitals from manual entry or devices.

Supported vitals at MVP:

```text
Blood Pressure
Blood Glucose
Temperature
Weight
Heart Rate
Oxygen Saturation
```

Future vitals (data model already supports them):

```text
ECG
Stethoscope signal
Respiratory rate
Sleep
Activity
Body composition
```

### C. MedOS Family module

Connects device data to the correct family member.

```text
Family Health Tree
Family Admin
Adult consent
Child guardian-managed profiles
Caregiver access
Family member mapping
```

Multi-user devices (e.g., Withings Body Smart) must support per-user mapping. Example:

```text
Withings account belongs to father
Temperature reading belongs to Child 1
Weight reading belongs to Mother
```

### D. Reminder module

```text
Medicine schedules
Dose reminders
Taken/skipped/snoozed logs
Missed-dose detection
Notification queue
Doctor-ready medicine history
```

### E. Notification module

```text
Push notifications
PWA notifications
Device tokens
Reminder alerts
Missed medicine alerts
Family admin alerts
Daily summaries
```

---

## 4. Vital types

Normalized vital types stored in `vital_readings.type`:

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

---

## 5. Withings device coverage (first connector)

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

First implementation should support:

```text
weight
blood_pressure
heart_rate
temperature
oxygen_saturation
```

Do **not** start with: ECG signal, stethoscope signal, AFib detection. These are advanced and come later.

---

## 6. MVP phases

### Phase 1 — Additive backend foundation

```text
connected_accounts
connector_devices
vital_readings
sync_jobs
Withings OAuth skeleton
GET /api/connect/withings/start
GET /api/connect/withings/callback
GET /api/connect/withings/status
```

Goal: user can connect a Withings account.

### Phase 2 — First data import: Body Smart

```text
Withings get measurements
Normalize weight
Store VitalReading
Show in Vitals > Weight
```

Goal: weight sync works end-to-end.

### Phase 3 — Blood pressure

```text
BPM Connect import
Systolic
Diastolic
Heart rate
```

Goal: Blood Pressure and Heart Rate cards auto-fill.

### Phase 4 — Temperature

```text
Thermo import
BeamO temperature import when available
```

Goal: Temperature card auto-fills.

### Phase 5 — Oxygen saturation

```text
BeamO SpO2 import
Normalize oxygen_saturation
```

Goal: Oxygen Saturation card auto-fills.

### Phase 6 — Family mapping

```text
Map Withings account/device readings to MedOS Family member
Guardian-managed child mapping
Adult consent checks
```

Goal: Family Admin can see child device readings; adult readings remain private unless shared.

### Phase 7 — Medicine reminders and notifications

```text
MedicationReminder
MedicationDoseLog
NotificationTarget
NotificationEvent
Push/PWA notifications
Taken/skipped/snoozed actions
```

Goal: phone notifications for medicine schedules.

---

## 7. What not to build first

Out of scope for MVP:

```text
Direct Bluetooth extraction
ECG analysis
Stethoscope AI diagnosis
Automated medication recommendations
Automatic treatment decisions
Complex hospital/EHR integrations
Genetic risk prediction
```

The backend should **track, sync, remind, summarize, and export** — not diagnose or prescribe.
