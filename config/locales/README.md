# Medical locale packs

This folder is the canonical source of **regional, medical-specific** data that MedOS needs to be safe and useful in a given region — emergency numbers, urgent-care wording, common medication names, units, pediatric thresholds, pregnancy-care escalation wording, and locale-specific disclaimers.

It is **not** a translation file for the UI. UI strings live with each app (`web/locales/`, `9-HuggingFace-Global/locales/`) and will move into a translation-management system in a follow-up (see `MIGRATION_PLAN.md` in this folder).

## Why regional, not just per language

`es-MX` ≠ `es-AR` ≠ `es-ES`. The emergency number, urgent-care language, common antipyretic, and unit system can all differ between two Spanish-speaking countries. A medical assistant that says "call 911" to a user in Argentina is wrong — there it's "107" for ambulance. So packs are keyed by **region** (`xx-YY`), not language alone.

## File naming

```text
config/locales/
  README.md               this file
  MIGRATION_PLAN.md       plan for moving UI strings into i18next
  pack.schema.json        JSON schema, validated in CI
  en-US.medical.json
  es-MX.medical.json
  pt-BR.medical.json
  it-IT.medical.json
  fr-FR.medical.json
```

Adding a new region: copy the closest existing pack, rename it, and submit a PR. A translation lead reviews per `GOVERNANCE.md`.

## Pack contract

Every pack must contain:

| Key | Type | Purpose |
|---|---|---|
| `locale` | string | BCP-47 tag, e.g. `it-IT`. |
| `language` | string | ISO 639-1, e.g. `it`. |
| `country` | string | ISO 3166-1 alpha-2, e.g. `IT`. |
| `units` | object | `temperature` (`C` or `F`), `weight` (`kg` or `lb`), `length` (`cm` or `in`). |
| `emergency` | object | `general`, `ambulance`, `police`, `fire`, optional `crisis`, `poison`. |
| `urgent_care_phrasing` | string | Local wording for "go to urgent care". |
| `clinician_phrasing` | object | `gp`, `pediatrician`, `pharmacist` — local terms. |
| `pediatric` | object | `infant_fever_threshold_c` (always Celsius for the rule engine), `pediatric_emergency_age_years`, `infant_age_months_max`. |
| `pregnancy` | object | `phrase_for_emergency_evaluation` — local phrasing for "go for urgent evaluation". |
| `medications` | object | Common active-ingredient → local brand name mapping (informational; never used for dosing). |
| `disclaimer` | object | `general` and `mental_health_crisis_addendum`. |
| `crisis_resources` | array | List of `{ name, number, scope }` items for self-harm / mental-health support. |

Numbers are **strings** (not integers) so leading zeros and hyphens survive (`"118"`, `"0800-13-13-13"`).

## What goes where

**In a locale pack** (this folder):

- Emergency numbers.
- Local words for "go to urgent care", "see your GP", "call your pediatrician".
- Common medication names (the local brand name for paracetamol/acetaminophen, for example) — for recognition only, never for dosing.
- Pediatric thresholds documented locally.
- Local crisis lines.
- Local disclaimer phrasing.

**Not here**:

- UI button labels — those go in the translation management system.
- Diagnostic logic — that lives in `9-HuggingFace-Global/lib/safety/`.
- Anything that varies per user (PHI).

## Loading locale packs

The safety engine reads the appropriate pack at runtime via the country code on the request. Implementation lives in `9-HuggingFace-Global/lib/safety/locale-pack.ts` (added in this batch). Falls back to `en-US` if the requested region pack is missing.

## Review process

Locale-pack PRs follow the **safety-sensitive** review path under `GOVERNANCE.md`:

1. Translation lead for the locale signs off on phrasing.
2. A maintainer signs off on schema.
3. CI runs `pack.schema.json` validation.

Mistakes in this folder can route a real user to the wrong emergency line. Be careful.
