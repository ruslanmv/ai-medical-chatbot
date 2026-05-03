# 13-Family-Health-Tree-App

**MyFamilyHealth** is the family layer for MedOS.

It lets a family admin create a private family health tree, invite each family member to install their own MedOS, and link every MedOS client to a shared family health space.

The first target family model is:

```text
Father / Family Admin ─── Wife / Adult Member
              │
              ├── Child 1 / Child Mode
              └── Child 2 / Child Mode
```

## Vision

Each family member owns their own MedOS profile, medicine inventory, vitals, records, appointments, and monthly timeline. The family admin can monitor shared summaries from one dashboard after consent or guardian authorization.

## Product names

- **MedOS**: the individual health assistant installed by each person.
- **MyFamilyHealth**: the family admin and shared family health dashboard.
- **Universal Health Family**: the backend concept that links multiple MedOS clients to one family graph.

## Modes

MedOS should become simpler by mode:

| Mode | User | Behavior |
|---|---|---|
| `standard` | guest or single user | simple MedOS with chat, medicines, appointments, vitals, records |
| `adult` | wife, adult child, caregiver | own MedOS profile with consent controls and optional family sharing |
| `child` | minor child | simplified UI, parent/guardian-managed sharing, school/vaccine/growth focus |
| `family-admin` | father/mother/caregiver | MyFamilyHealth dashboard, family tree, member monitoring, monthly check-ins |

## MVP scope

1. Add a `13-Family-Health-Tree-App` module after `12-MetaEngine-Nearby`.
2. Add family tree entities and monthly health records.
3. Add a Family Admin dashboard view in `9-HuggingFace-Global`.
4. Allow local linking of MedOS clients by invite code.
5. Support mode selection: standard, adult, child, family-admin.
6. Keep storage local-first for the prototype.
7. Prepare API contracts for a later shared backend.

## Non-goals for MVP

- No diagnosis.
- No automated treatment decisions.
- No third-party sale of health data.
- No hard dependency on hospital/EHR integrations.
- No genetic risk prediction.

## Recommended repository integration

```text
9-HuggingFace-Global/           Existing MedOS client
13-Family-Health-Tree-App/      New family product module and contracts
```

`9-HuggingFace-Global` receives a first additive Family Admin view using local storage. Later, `13-Family-Health-Tree-App/06-api` can become a dedicated backend service.

## First user story

As a father, I can:

1. Open MedOS.
2. Choose Family Admin mode.
3. Create my family: father, wife, two children.
4. Add monthly health notes for each person.
5. See each member's medicines, monthly health status, and alerts in one dashboard.
6. Invite my wife to link her own MedOS as an adult client.
7. Manage children profiles in child mode.

## Safety rule

MyFamilyHealth tracks, reminds, summarizes, and prepares doctor-ready information. It must not diagnose or override clinicians.
