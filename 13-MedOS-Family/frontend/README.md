# MedOS Family — Frontend

Production-ready Next.js + React + TypeScript implementation of the MedOS Family dashboard, generated from a Claude Design handoff bundle.

## Run

```bash
cd 13-MedOS-Family/frontend
npm install
npm run dev
```

Open `http://localhost:3100`.

- `/`     desktop dashboard (sidebar + 11 pages)
- `/m`    mobile (Android) view with bottom tab bar

## Pages

| Sidebar item | Route (in-app) | What it does |
|---|---|---|
| Dashboard | `home` | Greeting + customizable widget dashboard |
| Family | `family` | Family tree + add-member wizard (manual / sync / invite) |
| Children | `children` | Child profile cards |
| Vaccines | `vaccines` | Per-child immunization checklist |
| Medicines | `medicines` | Today's doses + active prescriptions |
| Health Monitor | `monitor` | Vitals: temperature, weight, growth |
| Seasonal Watch | `seasonal` | Weather strip + pollen, flu, heat, hydration |
| Local Alerts | `alerts` | Italy-specific health advisories |
| News | `news` | Health news from ECDC / WHO / Min. della Salute / ISS / ASL |
| Reminders | `reminders` | Push + email + quiet-hours toggles |
| Records | `records` | Document vault |
| Settings | `settings` | General · Profile · Personalization · Privacy · Notifications · Linked devices · OllaBridge Cloud · Help · About · Log out |

## Stack

- Next.js 14 (App Router), React 18, TypeScript.
- **Inline styles** (matches the design exactly — no Tailwind).
- Inter + Fraunces from Google Fonts (loaded via `next/font`).
- Zero backend — all data is local mock data in `lib/data.ts`.

## Design source

Generated from the handoff bundle that included `MedOS Family.html` plus shared JSX components (`desktop.jsx`, `mobile.jsx`, `screens.jsx`, `data.jsx`, `icons.jsx`).

## Disclaimer

> MedOS Family organizes records — it does not diagnose, prescribe, or change dosage. Always confirm schedules with your pediatrician.
