# MedOS Connect — Integration Plan with the Existing MedOS Repo

This document describes how MedOS Connect plugs into the existing MedOS repository **without breaking anything**. It is purely additive: new APIs, new tables, new service modules.

---

## 1. Existing repo at a glance

The repository already includes:

- A Next.js app under `9-HuggingFace-Global/` with API route handlers (`app/api/*`), auth flows, user settings, health-data sync patterns, and chat patterns.
- A MedOS Family design under `13-MedOS-Family/` (product spec, contracts, backend architecture, security).
- A documented vitals model covering blood pressure, glucose, temperature, weight, heart rate, and oxygen saturation.

MedOS Connect builds on that foundation rather than replacing any of it.

---

## 2. Where each piece lives

### Documentation (this folder)

```text
14-MedOS-Connect/
├── README.md
├── 01-product/CONNECTOR_SPEC.md
├── 02-api/API_CONTRACTS.md
├── 03-domain/DOMAIN_MODEL.md
├── 04-security/OAUTH_AND_PRIVACY.md
├── 05-connectors/WITHINGS_CONNECTOR.md
├── 06-notifications/NOTIFICATION_ARCHITECTURE.md
└── 07-integration-medos/INTEGRATION_PLAN.md
```

### Recommended code layout (added later under existing app)

```text
9-HuggingFace-Global/
├── app/api/connect/withings/
│   ├── start/route.ts
│   ├── callback/route.ts
│   ├── sync/route.ts
│   ├── status/route.ts
│   ├── disconnect/route.ts
│   └── webhook/route.ts
├── app/api/vitals/
│   ├── route.ts
│   └── [id]/route.ts
├── app/api/family/
│   ├── device-mappings/route.ts
│   ├── device-mappings/[id]/route.ts
│   └── [familyId]/doctor-summary/route.ts
├── app/api/reminders/
│   ├── medications/route.ts
│   ├── medications/[id]/route.ts
│   ├── medications/[id]/log/route.ts
│   ├── medications/[id]/snooze/route.ts
│   └── medications/[id]/pause/route.ts
├── app/api/notifications/
│   ├── route.ts
│   ├── register-device/route.ts
│   ├── test/route.ts
│   └── [id]/read/route.ts
├── lib/connectors/
│   ├── withings/
│   ├── apple-health/
│   └── health-connect/
├── lib/normalizers/vitals.ts
├── lib/services/
│   ├── vitals-service.ts
│   ├── reminder-service.ts
│   ├── notification-service.ts
│   └── family-permission-service.ts
└── lib/db/  (migrations for new tables only)
```

The existing routes under `app/api/*` continue to work unchanged. New routes only appear under the new namespaces.

---

## 3. Non-destructive guarantees

- No existing file is modified by introducing this folder.
- No existing table is altered, renamed, or dropped.
- No existing API contract is changed.
- The current local-first vitals experience continues to work with `source='manual'`.
- If a user never connects an external provider, MedOS behaves exactly as it does today.

If a future change really needs to touch existing structures, it should be proposed in a separate doc and reviewed against these guarantees.

---

## 4. Migration / rollout strategy

1. Land the documentation in `14-MedOS-Connect/` (this folder).
2. Add the new database tables in a fresh, additive migration.
3. Implement the connector interface (`HealthConnector`) and the Withings connector.
4. Add Withings OAuth routes and the `status` route. Ship behind a feature flag.
5. Add the vitals normalizer and the manual-sync route.
6. Wire imported readings into the existing Vitals dashboard via a read path that supports both manual and provider sources.
7. Turn on the Withings webhook once stable.
8. Add medication reminder and notification routes; integrate with the PWA push surface.
9. Add doctor-ready export endpoint and JSON output (PDF later).

Each phase corresponds to the MVP phases in `01-product/CONNECTOR_SPEC.md`.

---

## 5. Reuse of existing systems

MedOS Connect should reuse, not duplicate:

- **Auth/session** — same auth strategy as existing MedOS API routes.
- **User identity** — same user IDs as the existing app.
- **MedOS Family permission model** — the rules in `13-MedOS-Family/` are the source of truth; `family-permission-service.ts` implements them.
- **PWA shell** — Web Push uses the existing PWA installation as its first notification surface.
- **Vitals dashboard UI** — the same screens render readings regardless of `source` (`manual`, `withings`, …).

---

## 6. Reversibility

The whole module is reversible:

- Disable the feature flag → routes return 404, nothing else changes.
- Drop the new tables → no impact on existing tables.
- Remove the `lib/connectors/`, `lib/normalizers/`, and new service files → existing services keep working.

This is what "additive only" means in practice.

---

## 7. Cross-references

- Product surface and MVP phases: [`01-product/CONNECTOR_SPEC.md`](../01-product/CONNECTOR_SPEC.md)
- HTTP contracts: [`02-api/API_CONTRACTS.md`](../02-api/API_CONTRACTS.md)
- Schema, normalization, connector interface: [`03-domain/DOMAIN_MODEL.md`](../03-domain/DOMAIN_MODEL.md)
- OAuth, audit, family permissions: [`04-security/OAUTH_AND_PRIVACY.md`](../04-security/OAUTH_AND_PRIVACY.md)
- Withings specifics: [`05-connectors/WITHINGS_CONNECTOR.md`](../05-connectors/WITHINGS_CONNECTOR.md)
- Notifications: [`06-notifications/NOTIFICATION_ARCHITECTURE.md`](../06-notifications/NOTIFICATION_ARCHITECTURE.md)
- Existing MedOS Family design: [`../../13-MedOS-Family/README.md`](../../13-MedOS-Family/README.md)
