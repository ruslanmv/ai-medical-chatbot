# Analysis — Adding MedOS Family after 12-MetaEngine-Nearby

## Current repository situation

The repository already has:

- `9-HuggingFace-Global`: MedOS web/PWA client with chat, health dashboard, medicines, appointments, vitals, records, profile, auth, and sync hooks.
- `11-Medicine-Scanner`: medicine label scanner service.
- `12-MetaEngine-Nearby`: nearby doctor/pharmacy metaengine.

The right place for the new family product is therefore:

```text
13-MedOS-Family
```

## Recommended interpretation of the new feature

The family product should not replace MedOS. It should become a layer above individual MedOS clients:

```text
Individual MedOS client  --->  MedOS Family family space
Family Admin client     --->  Family Admin
Adult member client     --->  Adult Mode member
Child 1 MedOS/Profile   --->  Child/guardian-managed member
Child 2 MedOS/Profile   --->  Child/guardian-managed member
```

## Why modes are needed

The current MedOS app has many features. For family usage, this should be simplified by mode:

- `standard`: simple standalone MedOS.
- `adult`: full personal MedOS, with consent controls for family sharing.
- `child`: simplified guardian-managed health timeline.
- `family-admin`: family dashboard, tree, invites, monthly check-ins, exports.

## Implementation done in this package

### New module

Added:

```text
13-MedOS-Family/
```

With product, contract, domain, integration, and privacy documentation.

### MedOS integration

Added to `9-HuggingFace-Global`:

```text
lib/family-health.ts
lib/hooks/useFamilyHealth.ts
components/views/FamilyHealthView.tsx
```

Patched:

```text
components/MedOSApp.tsx
components/chat/Sidebar.tsx
README.md
```

## Prototype behavior

The prototype adds a new **MedOS Family** sidebar item. It supports:

- mode selection
- default family creation: Family Admin, Adult member, Child 1, Child 2
- family tree member cards
- Adult Mode / Child Mode / Family Admin labels
- consent status switching
- monthly health check-in per member
- invite-code generation for linking a member's own MedOS client
- JSON export of family data

## Backend recommendation

Keep the current local-first version for MVP validation. Next step is adding authenticated API routes based on `13-MedOS-Family/02-contracts/family_contracts.md`.

## Safety recommendation

MedOS Family should only track, remind, summarize, and export. It should not diagnose, change medication, or replace medical care.
