# Integration Plan with 9-HuggingFace-Global

## Additive changes

Add the following to `9-HuggingFace-Global`:

```text
lib/family-health.ts
lib/hooks/useFamilyHealth.ts
components/views/FamilyHealthView.tsx
```

Patch:

```text
components/chat/Sidebar.tsx
components/MedOSApp.tsx
```

## Local-first prototype

For the first implementation, family data is stored in scoped localStorage. This matches the existing MedOS local-first behavior and avoids backend risk.

## Later backend

Move family data to authenticated API routes using the contracts in `02-contracts`.

## Data migration

No destructive migration is needed. Existing personal MedOS data remains untouched. Family data uses new storage keys.
