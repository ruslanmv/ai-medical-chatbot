# MedOS Family

A family health coordination app for MedOS, helping families manage medicines, appointments, vitals, records, and doctor-ready summaries in one private dashboard.

MedOS Family is the family health coordination layer of MedOS. It allows a Family Admin to create a private Family Health Tree, invite family members, manage child profiles, and view shared health summaries with consent. The app helps families track medicines, appointments, vitals, medical records, monthly notes, and care alerts.

## Family model

```text
Family Admin / Family Admin ─── Adult member / MedOS Client
                      │
                      ├── Child 1 / Child Mode
                      └── Child 2 / Child Mode
```

## Modes

| Mode | User | Behavior |
|---|---|---|
| `standard` | guest or single user | simple MedOS with chat, medicines, appointments, vitals, records |
| `adult` | adult member | Adult Mode with consent controls and optional family sharing |
| `child` | minor child | Child Mode with guardian-managed sharing, school/vaccine/growth focus |
| `family-admin` | parent/guardian/caregiver | Family Admin mode for Family Health Tree, monitoring, monthly check-ins |

## Guardian and consent rules

The Family Admin is a MedOS Client who creates and manages the Family Health Tree. The admin can invite family members, manage child profiles, track medicines and appointments, and view shared health summaries based on consent or guardian authorization.

Child Mode profiles are managed by a parent or legal guardian through MedOS Family. The Family Admin can create, update, and monitor the child’s health information, medicine reminders, appointments, vitals, records, and care history.

Adult members remain consent-based users. The Family Admin cannot access adult member data unless that adult chooses to share it.

Adult members control what they share with the Family Admin. Child profiles are managed by a parent or legal guardian. MedOS Family is designed to coordinate care, organize records, and prepare doctor-ready summaries. It does not diagnose, replace clinicians, or override medical advice.

## Medicine Reminders

MedOS Family allows a Family Admin or authorized caregiver to create medicine schedules for family members.

Examples:
- Brufen every 12 hours
- Tachipirina every 6 hours
- Antibiotic every 8 hours

The system sends phone notifications when a dose is due and lets the user mark the dose as taken, skipped, snoozed, or missed.

The AI assistant may help organize user-provided or prescription-provided schedules, but it must not prescribe, recommend, or change medicine dosage or frequency.

## UX/Product Direction (MVP)

MedOS Family should be designed as a simple family health coordination experience.

The first screen should be a Family Dashboard focused on today’s actions: medicines due, missed doses, appointments, follow-ups, and family member status.

Children are guardian-managed. Adults are consent-based. Adult members control what they share with the Family Admin.
