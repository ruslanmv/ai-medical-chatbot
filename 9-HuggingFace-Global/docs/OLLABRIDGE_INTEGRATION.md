# OllaBridge Cloud — live-app integration

**Status:** the provider-side wiring already exists (`9-HuggingFace-Global/lib/providers/ollabridge.ts` + `chatWithFallback` short-circuits to OllaBridge when configured). What this document covers is the **user-facing pairing flow** in the live app, which today is only designed in `13-MedOS-Family/frontend/components/pages/SettingsPage.tsx` and not yet exposed to end users of `web/` and `9-HuggingFace-Global/`.

This is the most credible "privacy-first" lever MedOS has. With OllaBridge Cloud, the user runs Ollama on their own machine; their prompts never leave their network. The MedOS server only exchanges encrypted, authenticated requests with the user's bridge.

Read together with `PRIVACY.md` and `SAFETY.md` at the repo root.

## What changes for the user

When a user pairs their bridge, the chat route detects `OLLABRIDGE_URL` (or, in the per-user model below, the user's pairing record) and routes through `streamWithOllaBridge` / `chatWithOllaBridge` instead of the default Hugging Face path.

The safety sandwich does **not** change. `preCheck()` and `postCheck()` run on every request regardless of which provider answers. OllaBridge is just one more provider behind `chatWithFallback`.

## Two deployment modes

| Mode | Who configures | Scope |
|---|---|---|
| **Operator-wide** | The MedOS deployment owner sets `OLLABRIDGE_URL` in the server env | All requests on that deployment go through that bridge |
| **Per-user** *(new)* | Each user pairs from Settings → Linked devices → "Pair OllaBridge Cloud" | Only that user's requests route through their bridge |

Operator-wide is what `chatWithFallback` already supports today. Per-user is what this doc plans.

## Per-user pairing flow

1. User opens **Settings → Linked devices → Pair OllaBridge Cloud** in the live app (the design exists in `13-MedOS-Family/frontend/components/pages/SettingsPage.tsx`).
2. UI shows a QR code + a 9-character pair code (rotates every 5 minutes).
3. On the user's machine, they install Ollama and run `ollabridge --pair`. The CLI scans the QR or accepts the pair code.
4. Bridge and MedOS exchange a one-time short-lived secret. MedOS server stores a per-user record:

   ```ts
   ollabridge_pairings (
     user_id        TEXT PRIMARY KEY,
     bridge_url     TEXT NOT NULL,    // user's bridge endpoint, often a tunnel
     bridge_token   TEXT NOT NULL,    // bearer token, encrypted at rest
     paired_at      TEXT NOT NULL,
     last_seen_at   TEXT,
     status         TEXT NOT NULL     // active | needs_reauth | revoked
   )
   ```

5. The chat route, on every request, looks up the user's pairing. If active, it routes through their bridge first; falls through to the global path on bridge failure (see "Failure handling" below).

## Provider-routing rules

`chatWithFallback` becomes:

```text
1. Per-user OllaBridge pairing  (if user is authenticated and has an active pairing)
2. Operator-wide OllaBridge     (if OLLABRIDGE_URL is set)
3. Hugging Face Inference       (12-model cascade, today's default)
4. Cached FAQ                   (always succeeds)
```

The order matters: privacy-first (user's own bridge) > operator's (still local-ish) > shared cloud > cached.

## Configuration

Server env (operator-wide path, already supported):

```bash
OLLABRIDGE_URL=https://your-bridge.example
OLLABRIDGE_TOKEN=<bearer>
```

Server env (per-user feature flag, to be added):

```bash
MEDOS_PER_USER_OLLABRIDGE=true
```

When the flag is off, only operator-wide pairing is honoured. When on, the chat route also reads the per-user pairing record.

## Failure handling

Bridges live on someone's home machine. They will go offline.

- **Bridge offline.** Log it as a per-user metric (no PHI). Fall through to the next provider in the chain (operator-wide, then Hugging Face). The user's chat continues to work; they get a non-blocking notice in the UI: "Your local bridge isn't reachable; we'll use the cloud path until it's back."
- **Bridge returns 401.** Mark the pairing as `needs_reauth`. The user is shown the re-pair flow next time they open the app.
- **Bridge times out.** Same fallback path. Audit records the latency so we know when to lower the timeout.

## Privacy posture

- The bridge URL and token live server-side, encrypted at rest (use the existing `lib/crypto.ts` helpers).
- The pairing **does not** store any chat content; the safety engine's audit log already excludes content (`PRIVACY.md`).
- A user can revoke their pairing from Settings; revocation is immediate and audited.
- The bridge token never reaches the browser.

## Safety still applies

The safety sandwich is unchanged:

- `preCheck()` runs *before* the request leaves MedOS for the user's bridge. R5 emergencies are template-handled and never sent to any LLM, including the user's local one.
- `postCheck()` runs on the bridge's response just like any other provider's. The deterministic post-filter rules apply identically.
- Locale packs (`config/locales/*.medical.json`) are read server-side and used to compose the system prompt and the post-filter, irrespective of where the LLM physically runs.

## Implementation outline

A contributor implementing per-user pairing would touch:

1. `9-HuggingFace-Global/lib/providers/ollabridge.ts` — extend with a per-user variant that takes `(bridgeUrl, bridgeToken)` arguments.
2. `9-HuggingFace-Global/lib/providers/index.ts` — make `chatWithFallback` accept an optional `userPairing` argument and try it first.
3. `9-HuggingFace-Global/lib/db.ts` — migration adding `ollabridge_pairings` table.
4. `9-HuggingFace-Global/lib/ollabridge-pairing.ts` — service module: create pairing, load pairing, mark needs-reauth, revoke.
5. `9-HuggingFace-Global/app/api/ollabridge/pair/route.ts` — API endpoints: start pairing (returns QR + pair code), confirm pairing, revoke.
6. `web/` (and / or each app frontend) — Settings page → Linked devices → "Pair OllaBridge Cloud" UI. The MedOS Family frontend already has the design.
7. CI: a smoke test that mocks a bridge and checks the routing precedence.

## What this document explicitly does NOT do

- Promise that running Ollama is easy for everyone. It is a non-trivial install. The pairing flow assumes a technically comfortable user; the rest of MedOS continues to work for everyone else.
- Bypass the safety sandwich. There is no "trusted bridge" mode. Every request is gated by `preCheck()` and `postCheck()`.
- Move medical regional data into the bridge. Locale packs stay server-side.

## Roadmap

1. Land the per-user pairing schema + service + endpoints behind `MEDOS_PER_USER_OLLABRIDGE=false`.
2. Expose the UI in `web/` Settings.
3. Soft-launch with the flag off; flip on for opted-in users; collect failure-rate metrics (no PHI).
4. Make per-user pairing available to all users once the failure path is well-tested.
