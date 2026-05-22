# MedOS Offline-Lite

**Status:** design only. Implementation lands when a contributor picks it up.

This document describes a deliberately small, deliberately limited offline mode for MedOS. It is **not** a promise of a full offline medical AI. The deterministic safety floor is what works offline; an LLM is only added on top of it as a small-model best-effort.

Read this together with `SAFETY.md` at the repo root.

## Why "Lite"

Two honest constraints set the scope:

1. **Llama 3.3 70B does not run on a phone or a budget laptop.** Promising "offline medical AI" with a 70B model is misleading. We do not.
2. **Safety must hold offline.** The deterministic red-flag rules in `9-HuggingFace-Global/lib/safety/red-flags.ts` and the regional emergency numbers in `config/locales/*.medical.json` are pure code + pure data. Both already work offline. That is the foundation.

Offline-Lite therefore ships:

```text
Always available offline:
  - Deterministic red-flag triage (R0..R5)
  - Regional emergency numbers, crisis lines, poison-control numbers
  - Locale disclaimers + clinician-referral phrasing
  - Cached FAQ responses (already in lib/providers/cached-faq.ts)

Best-effort offline (optional, behind a flag):
  - Phi-3 mini / Gemma 2B / TinyLlama for non-clinical guidance only
  - Strictly capped at R0/R1 outputs
  - Strict post-filter
```

## What the user sees

A clearly-marked **Offline Lite** banner appears whenever the app detects no connectivity (or the user explicitly enables it):

> **You are using Offline Lite.** I can show emergency numbers, run a basic safety check on your symptoms, and answer common questions from a small, on-device model. I cannot do full medical chat without a connection. **For anything urgent, call your local emergency number.**

The banner is sticky, dismissible per session but never per app, and the local emergency number from the active locale pack is shown next to it.

## Architecture

```text
User input
   ↓
Pre-LLM safety engine        (always; pure code, works offline)
   ↓
   - R5  → emergency template, end. (NO LLM CALL.)
   - R4  → urgent template + local emergency number
   - R3  → urgent care suggestion + clinician phrasing
   - R0/R1 → small on-device model OR cached FAQ, then post-filter
   - R2  → cached FAQ + clinician referral
   ↓
Post-LLM safety filter        (always; pure code, works offline)
   ↓
Final answer + disclaimer + emergency number when required
```

## Small-model selection

| Model | Approx. size | Plausible host | License |
|---|---|---|---|
| Phi-3 mini (3.8B) | ~2.4 GB quantised | Browser via WebGPU / phone via ONNX | Permissive |
| Gemma 2B-IT | ~1.5 GB quantised | Same | Open weights, terms apply |
| TinyLlama 1.1B | ~700 MB quantised | Lightest option | Permissive |

The model **must** be:

- Routed through the existing `chatWithFallback` path (so the safety sandwich still applies).
- Pinned to **R0/R1 only**. Anything routed to R2+ uses cached responses or a clinician-referral template, **not** the small model.
- Wrapped in the **same** post-filter as the cloud path. There are no shortcuts for "the small model is on-device, so it's fine." It isn't.
- Distributed via the standard PWA caching / app-bundle path. No third-party CDN that can later silently change weights.

## Implementation outline

A contributor implementing this would touch:

1. `9-HuggingFace-Global/lib/providers/offline-lite.ts` — new provider that wraps a WebGPU / ONNX / GGUF runtime. Returns the same `ProviderResponse` shape so `chatWithFallback` can plug it in.
2. `9-HuggingFace-Global/lib/providers/index.ts` — add Offline-Lite as the **last** fallback step, after cached FAQ.
3. `9-HuggingFace-Global/lib/safety/safety-engine.ts` — when the input resolves to R2 or higher under Offline-Lite, route to a template / cached response, not the small model. Add an explicit `offline: true` audit field.
4. `web/components/OfflineBanner.tsx` (or equivalent in the live app) — the always-visible banner described above.
5. PWA / service-worker config — pre-cache `config/locales/*.medical.json` at install time. They are tiny and safety-critical.

## What Offline-Lite explicitly does NOT do

- Full medical chat.
- Diagnosis (it never does, online or offline).
- Dose recommendations.
- "You're fine, no need to see a doctor." The post-filter blocks this on every path.
- Pretending to be the same product as online MedOS. The banner is loud about the limits.

## Testing

The same `tests/safety/run_golden.ts` set runs in offline mode by mocking the provider chain to return only Offline-Lite results. The R5 / R4 floor must hold; the post-filter rules apply identically.

A few extra cases tagged `offline_lite` may be added if specific failure modes are discovered (e.g., a small model hallucinating a dose).

## Roadmap

- **Step 1.** Pre-cache the medical packs in the service worker. (Self-contained, no model.)
- **Step 2.** Add a clear Offline banner that surfaces emergency numbers regardless of model availability.
- **Step 3.** Add Offline-Lite small-model provider behind a feature flag (`MEDOS_OFFLINE_LITE_ENABLED=true`). Keep the flag off by default while validation runs.
- **Step 4.** Run the full golden set in offline mode; require the same R5/R4 sensitivity targets as the online path before flipping the flag on.

Until Step 4 passes, Offline-Lite is documented but not enabled. The deterministic safety floor + emergency numbers + cached FAQ already give users a useful, honest offline experience.
