# UI string i18n migration plan

This document tracks the move from scattered, in-code translations to a single managed catalog. **The medical locale packs in this folder are already the canonical source of regional medical data** — that work is complete. What remains is migrating the **UI strings** out of components into the catalog.

This is a multi-week, contributor-friendly migration. Doing it in one big PR would touch every component and would be unreviewable. Instead, we split it by surface, run the migration incrementally, and gate each PR on a small CI check.

## Scope

- **In scope.** UI strings in `web/`, `9-HuggingFace-Global/`, `13-MedOS-Family/frontend/`, `17-MedOS-Research/frontend/`.
- **Out of scope here.** Medical regional data — already lives in `config/locales/*.medical.json` and is loaded by `lib/safety/locale-pack.ts`.

## Tooling decision

**Recommendation: Weblate** (self-hostable, OSS-aligned, GitLab/GitHub PR integration). Crowdin is a strong second; their OSS plan is generous.

- Source format: **i18next-flat JSON** (single key tree per locale).
- Frontend library: **i18next + react-i18next** in the Next.js apps.
- One translation namespace per surface (`web.app`, `family.frontend`, `research.frontend`, `medos-global.api`) so PRs stay focused.

## Target directory layout

```text
web/locales/
  en-US/
    common.json
    chat.json
    health-tracker.json
    medicines.json
    auth.json
  es-MX/
    common.json
    ...
  it-IT/
    ...

9-HuggingFace-Global/locales/
  en-US/common.json
  ...

13-MedOS-Family/frontend/locales/
  en-US/common.json
  ...

17-MedOS-Research/frontend/locales/
  en-US/common.json
  ...

config/locales/                       (already done — regional medical data)
  en-US.medical.json
  es-MX.medical.json
  ...
```

The `config/locales/*.medical.json` files **stay separate**. They are not UI strings. The safety engine already loads them.

## Migration phases

### Phase A — Bootstrap (1 PR, no behavior change)

- Add `i18next` + `react-i18next` to the relevant `package.json` files.
- Add `web/locales/en-US/common.json` etc. with **the strings already in code**, copied as-is.
- Add a typed `useT()` hook wrapper.
- Add a CI lint that fails if any new component introduces a hardcoded string (eslint plugin `i18next/no-literal-string`).

No visible change. Existing strings still render exactly as today.

### Phase B — Migrate by surface (many small PRs)

One PR per surface. The contributor:

1. Replaces hardcoded strings with `t('common.welcome')` lookups in that surface only.
2. Adds the keys to `en-US/common.json` (or the relevant namespace).
3. Verifies the surface still renders identically.
4. CI checks that every key referenced in code exists in `en-US/`.

Recommended order:

| # | Surface | Estimated keys |
|---|---|---|
| 1 | Disclaimers / safety banners (highest leverage — already centralized in `lib/safety/disclaimer.ts`; refactor to read from i18n catalog) | ~40 |
| 2 | Chat surface | ~120 |
| 3 | Auth (login / register / verify / reset) | ~80 |
| 4 | Health Tracker | ~150 |
| 5 | Medicine Scanner | ~50 |
| 6 | Settings | ~70 |
| 7 | MedOS Family frontend | ~200 |
| 8 | MedOS Research frontend | ~200 |
| 9 | Errors / toasts / 404 | ~40 |

### Phase C — Open contributions (continuous)

- Connect Weblate (or Crowdin) to the repo. Translations land as PRs.
- Each new locale starts as a copy of `en-US/`; native review by the locale's Translation Lead per `GOVERNANCE.md`.
- CI gates: no missing keys, valid JSON, no markup escapes lost in translation.

### Phase D — Decommission scattered strings (one cleanup PR)

- Remove any remaining ad-hoc translation maps from code.
- Delete the bootstrap shim added in Phase A.
- Move the `eslint-plugin-i18next/no-literal-string` rule from "warn" to "error" repo-wide.

## Naming conventions

- Keys are **dot-namespaced**: `chat.placeholder`, `health.medicine.add_button`.
- Keys are **stable**; renames require a deprecation period.
- Avoid embedding HTML in values; use components with i18next interpolation slots.
- Avoid concatenation; use ICU plural and select forms (i18next supports them).

## Linking to medical packs

When the UI needs a region-specific medical phrase (emergency number, urgent-care wording, crisis line), it pulls from the medical pack at request time — **not** from the i18n catalog. The catalog is for app chrome and copy; the medical packs are for clinical-safety regional data.

Example (server-side):

```ts
import { getLocalePackForCountry } from '@/lib/safety/locale-pack';

const pack = getLocalePackForCountry('IT');
// pack.emergency.ambulance === '118'
// pack.disclaimer.general
// pack.crisis_resources[0].name
```

Example (client-side, after passing pack data through the API or layout):

```tsx
<EmergencyBanner pack={pack} />
```

The two systems are intentionally separated: a translation contributor with no medical training **cannot** edit emergency numbers; a Translation Lead reviews UI strings; safety-sensitive medical data follows the safety-sensitive review path in `GOVERNANCE.md`.

## Tracking

This plan lives in version control. As each phase completes, update this file with the PR number and date so the migration's status is always visible. Open the migration as a tracking issue in GitHub and pin it.

## What this plan deliberately does not do

- Migrate every existing string in one mega-PR. That would touch every file in the repo and be unreviewable.
- Use a translation tool that requires a paid commercial license up front.
- Move medical regional data into i18n. That data is safety-sensitive and lives separately by design.
