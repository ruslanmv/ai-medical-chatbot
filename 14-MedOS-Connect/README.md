# MedOS Connect

MedOS Connect is the **additive** backend layer of the MedOS system that lets people optionally connect external electronic health devices and platforms to MedOS. It manages device connectors (Withings first, then Apple Health, Android Health Connect, glucose meters, and more), OAuth tokens, vitals imports, medicine reminders, phone notifications, family-member mapping, sync logs, audit logs, and doctor-ready exports.

It does **not** replace the existing MedOS health tracker, MedOS Family prototype, or local-first vitals. It only adds new APIs, new tables, and new services under a new namespace.

---

## Position in the MedOS system

```text
MedOS App
├── Existing local health tracker
├── MedOS Family
│   ├── Family Health Tree
│   ├── Child Mode
│   ├── Adult consent
│   └── Family Admin dashboard
└── MedOS Connect            ← this module
    ├── Withings connector
    ├── Vitals sync
    ├── Device/member mapping
    ├── Medicine reminders
    ├── Notifications
    └── Doctor-ready exports
```

MedOS Connect acts as a **health data hub**:

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

The most important idea is **normalization**. Every device gives data differently, but MedOS stores everything in one common model:

```text
VitalReading
MedicationReminder
MedicationDoseLog
ConnectedAccount
SyncJob
FamilyMember
```

---

## Additive principles

MedOS Connect is **additive only**:

- Do not delete existing code
- Do not rewrite the existing MedOS health tracker
- Do not break local-first vitals
- Do not replace the current UI
- Do not change existing APIs destructively

Instead, this module adds new APIs and services under new namespaces:

```text
/api/connect/*
/api/family/*
/api/vitals/*
/api/reminders/*
/api/notifications/*
```

And new database tables that never alter or drop existing ones:

```text
connected_accounts
connector_devices
vital_readings
vital_reading_raw_payloads
family_member_device_mappings
sync_jobs
medication_reminders
medication_dose_logs
notification_targets
notification_events
```

---

## Documentation map

| File | Purpose |
|---|---|
| [`01-product/CONNECTOR_SPEC.md`](01-product/CONNECTOR_SPEC.md) | Product spec for MedOS Connect: goals, scope, vitals, devices, MVP phases. |
| [`02-api/API_CONTRACTS.md`](02-api/API_CONTRACTS.md) | HTTP API contracts for connectors, vitals, family mapping, reminders, notifications. |
| [`03-domain/DOMAIN_MODEL.md`](03-domain/DOMAIN_MODEL.md) | Domain model, normalization layer, connector interface, database schema. |
| [`04-security/OAUTH_AND_PRIVACY.md`](04-security/OAUTH_AND_PRIVACY.md) | OAuth handling, token encryption, audit logs, data minimization, user controls. |
| [`05-connectors/WITHINGS_CONNECTOR.md`](05-connectors/WITHINGS_CONNECTOR.md) | First connector: Withings OAuth and Public API integration. |
| [`06-notifications/NOTIFICATION_ARCHITECTURE.md`](06-notifications/NOTIFICATION_ARCHITECTURE.md) | Push/PWA notifications, reminder events, daily summaries. |
| [`07-integration-medos/INTEGRATION_PLAN.md`](07-integration-medos/INTEGRATION_PLAN.md) | How MedOS Connect plugs into the existing MedOS repo without breaking it. |

---

## Implementation note for developers

> Implement a new additive backend layer called **MedOS Connect**.
>
> This backend must not destructively modify the existing MedOS health tracker or the MedOS Family prototype. It should add new connector APIs, new database tables, and new service modules for external health-data sync.
>
> The first connector is **Withings**. Use the official Withings OAuth and Public API flow. Do not extract data directly from Bluetooth devices. The user connects their Withings account, MedOS stores encrypted OAuth tokens, fetches measurements, normalizes them into `VitalReading` records, and displays them in the existing Vitals dashboard.
>
> The first supported readings are **weight, blood pressure, heart rate, temperature, and oxygen saturation**. ECG and stethoscope data are documented for future work but not implemented in the first MVP.
>
> The backend must support **MedOS Family permissions**: children are guardian-managed, adults are consent-based, caregivers have configurable access.
>
> Add medication reminder and notification tables so MedOS Family can send phone reminders for medicines and log taken, skipped, snoozed, or missed doses.
>
> All changes must be additive, namespaced, reversible, and safe.

---

## Boundaries

MedOS Connect is designed to **track, sync, remind, summarize, and export**. It does **not** diagnose or prescribe. The following are explicitly out of scope for the MVP:

```text
Direct Bluetooth extraction
ECG analysis
Stethoscope AI diagnosis
Automated medication recommendations
Automatic treatment decisions
Complex hospital/EHR integrations
Genetic risk prediction
```
