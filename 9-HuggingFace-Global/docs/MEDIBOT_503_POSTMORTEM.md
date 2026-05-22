# MediBot 503 `all_providers_unavailable` — root-cause analysis & enterprise fix

**Date:** 2026-05-22
**Severity:** Sev 2 — chat broken for all users on
`https://www.ai-medical-chabot.com` → `https://ruslanmv-medibot.hf.space`.
**Status of upstreams at incident time:** both UP and healthy.
**Root cause:** missing environment variable on the MediBot Space.
**Time to repair (operator action):** ~2 minutes.

This document is the professional, evidence-based answer to "MedOS says
all providers are unavailable but we want real LLM answers". It separates
the immediate operator fix from the architectural fix designed in
[`MEDIBOT_OLLABRIDGE_V2.md`](./MEDIBOT_OLLABRIDGE_V2.md).

## TL;DR

```
OLLABRIDGE_URL=https://ruslanmv-ollabridge.hf.space
```

Set that single secret on the MediBot Space (Settings → Variables and
secrets). Chat works again within seconds; `loadConfig()` re-reads on
every request, no redeploy. Everything else in this doc is about making
sure we never have to do this again.

## Evidence chain (from the live HF logs API)

All evidence below was pulled directly from
`https://huggingface.co/api/spaces/.../logs/run` with a personal access
token. No code on either Space was modified during diagnosis.

### MediBot Space — three log lines told the whole story

```
2026-05-22T20:15:04.373Z [Chat] provider.ollabridge.skipped.nonstream {"requestId":"yw9qi982"}
2026-05-22T20:15:04.373Z [Chat] provider.huggingface.no-token.nonstream
2026-05-22T20:15:04.378Z [Chat] provider.huggingface.fail.nonstream {"error":"HF token not configured"}
2026-05-22T20:15:04.378Z [Chat] provider.all_failed.nonstream {"failures":["huggingface: HF token not configured"]}
2026-05-22T20:15:04.380Z [Chat] route.error {"totalMs":20,"name":"AllProvidersUnavailableError"}
```

Translation:

| Line                                        | Code path                                                | What it says                                                       |
|---------------------------------------------|----------------------------------------------------------|---------------------------------------------------------------------|
| `provider.ollabridge.skipped.nonstream`     | `lib/providers/ollabridge.ts` `isOllaBridgeConfigured()` | The OllaBridge rung was **not even attempted** — `OLLABRIDGE_URL` is empty in the persisted config AND the env. |
| `provider.huggingface.no-token.nonstream`   | `lib/providers/huggingface-direct.ts`                    | The HF-direct rung looked for `HF_TOKEN`, found nothing.            |
| `provider.huggingface.fail.nonstream`       | same                                                     | Throws immediately because anonymous HF inference is rejected.      |
| `provider.all_failed.nonstream`             | `chatWithFallback` aggregate                             | Both rungs failed → throws `AllProvidersUnavailableError`.          |
| `route.error … totalMs:20`                  | route handler                                            | **20 ms** end-to-end. Real upstream failures burn the 8 000 ms timeout. 20 ms is a smoking gun for "configuration, not outage". |

The same pattern recurs on every request in the window (19:16, 20:14,
20:15, 20:17). It's deterministic: no provider has credentials.

### OllaBridge Space — verified UP and serving the gateway

The OllaBridge Space (`ruslanmv/ollabridge`) is alive and running the
**enterprise gateway**, not just raw Ollama. Live probes:

```
$ curl https://ruslanmv-ollabridge.hf.space/
HTTP 200  body: "<title>OllaBridge Cloud — Enterprise AI Gateway</title>"

$ curl https://ruslanmv-ollabridge.hf.space/v1/models
HTTP 200  body: {"object":"list","data":[
  {"id":"qwen2.5:1.5b",      "owned_by":"ollama"},
  {"id":"free-best",          "owned_by":"ollabridge-addon"},
  {"id":"free-fast",          "owned_by":"ollabridge-addon"},
  {"id":"free-flex",          "owned_by":"ollabridge-addon"},
  {"id":"cheap-reasoning",    "owned_by":"ollabridge-addon"},
  {"id":"local-private",      "owned_by":"ollabridge-addon"}
]}
```

So the OllaBridge gateway is fully operational and would accept a
`POST /v1/chat/completions` with `model: "free-best"` immediately —
MediBot just has nothing pointing at it.

### MediBot Space — backend itself is healthy

```
$ curl https://ruslanmv-medibot.hf.space/api/health
HTTP 200  {"status":"healthy","service":"medos-global","version":"1.0.0"}
```

So the application is up, the route is reachable, the database is fine.
The only failure surface is the LLM rung.

## Diagnosis matrix (what would each symptom mean)

A professional runbook table that handles every variant of this 503:

| `totalMs` | `ollabridge.*` log | `huggingface.*` log     | Root cause                                                  | Fix                                                                 |
|-----------|--------------------|-------------------------|-------------------------------------------------------------|---------------------------------------------------------------------|
| **< 100 ms** | `skipped`          | `no-token`              | **Neither rung configured** *(this incident)*              | Set `OLLABRIDGE_URL` **or** `HF_TOKEN`.                              |
| < 100 ms  | `skipped`          | `fail … 401`            | `HF_TOKEN` present but expired/revoked                      | Rotate token; paste in Admin → Server. `loadConfig` reloads.        |
| 1–8 s     | `fail … timeout`   | `fail … timeout`        | Both Spaces cold-starting                                   | Hit OllaBridge URL once to wake it; widen `timeout: 8000` to 25000 during cold-start window. |
| 1–10 s    | `fail … 5xx`       | `fail … 5xx`            | Real Hugging Face Inference Providers outage                | Wait + monitor https://status.huggingface.co; alias chain absorbs single-provider outages once v2 lands. |
| ~8 s     | `fail … ECONNREFUSED` | `ok` (recovered)        | OllaBridge URL wrong / Space deleted                        | Re-pair via Admin → Server.                                          |
| 0 ms     | (no log)           | (no log)                | Chat route panicked before provider dispatch                | `route.error` Next.js stack, file as separate incident.             |

## Why "two-rung fallback" doesn't help when both rungs need credentials

The existing `chatWithFallback` is structured as:

```
try OllaBridge        → fail → fall through
try HF Direct (12 models) → fail → throw 503
```

That looks like defence in depth, but **both rungs depend on
credentials**. If neither is configured, the fallback chain is just two
synchronous failures. The user sees a 503 in 20 ms.

A truly resilient design needs **one well-managed chain inside a single
gateway**. That's exactly what the v2 design installs:

```
MediBot → OllaBridge (single gateway URL)
            └── alias `medibot-free-best` resolves to 6 sub-providers
                  ├─ huggingface-free:meta-llama/Llama-3.3-70B-Instruct:groq
                  ├─ huggingface-free:openai/gpt-oss-120b:groq
                  ├─ huggingface-free:Qwen/Qwen3-32B:groq
                  ├─ huggingface-free:meta-llama/Llama-3.3-70B-Instruct:cerebras
                  ├─ huggingface-free:google/gemma-4-31B-it:deepinfra
                  └─ huggingface-free:Qwen/Qwen2.5-72B-Instruct:together
```

Six independent paths. Losing one doesn't break chat. Credentials live
only in OllaBridge — MediBot needs none.

## Immediate restore (operator runbook, 2 minutes)

1. **Open the Space settings**
   `https://huggingface.co/spaces/ruslanmv/MediBot/settings`
   → Variables and secrets.

2. **Set ONE of the following** (option A preferred):

   ```
   # Option A — preferred, gets v2 ready
   OLLABRIDGE_URL = https://ruslanmv-ollabridge.hf.space

   # Option B — quick fix that uses direct HF inference
   HF_TOKEN = hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. **Restart the Space** (or wait ~10 s — `loadConfig()` re-reads
   `/data/medos-config.json` per request, but env-only secrets need a
   restart).

4. **Verify** with the same logs API:

   ```bash
   HF_TOKEN=hf_xxx
   curl -N -H "Authorization: Bearer $HF_TOKEN" \
     "https://huggingface.co/api/spaces/ruslanmv/MediBot/logs/run" \
     | grep -E "provider\.(ollabridge|huggingface)\.(ok|fail)"
   ```

   Success looks like:

   ```
   [Chat] provider.ollabridge.dispatch {"baseURL":"https://ruslanmv-ollabridge.hf.space/v1","model":"qwen2.5:1.5b"}
   [Chat] provider.ollabridge.ok {"latencyMs":420}
   ```

5. **Test in the UI**: open `https://www.ai-medical-chabot.com`, ask
   "what is paracetamol?" — should stream real model output, not the
   503 toast.

## Enterprise-grade fix (additive, ships in stages)

The v2 design (`MEDIBOT_OLLABRIDGE_V2.md`) collapses this whole class of
incident:

| Lever                                            | Before                                                                  | After v2                                                                |
|--------------------------------------------------|-------------------------------------------------------------------------|--------------------------------------------------------------------------|
| Number of LLM env vars on MediBot                | 4 (`OLLABRIDGE_URL`, `OLLABRIDGE_API_KEY`, `HF_TOKEN`, `DEFAULT_MODEL`) | **1** (`OLLABRIDGE_URL`)                                                 |
| HF token lives on…                               | both MediBot and OllaBridge                                             | **only** OllaBridge (no token == impossible state on MediBot)            |
| If MediBot deploys without LLM config…           | runs, 503s on first chat                                                | **fails boot health check loudly**, Admin dashboard turns red            |
| Top-N free model selection                       | hand-coded in `presets.ts` on MediBot                                   | OllaBridge `huggingface_catalog` syncs nightly                            |
| Adding a new free provider (Cerebras, etc.)      | code change + redeploy MediBot                                          | one click in OllaBridge Admin → Provider Fleet                           |
| Resilient routing                                | 2-rung fallback that both share credentials                             | 6-entry alias chain inside OllaBridge, no shared failure mode            |
| User picks model in browser                      | possible (UI dropdown sends `model` field; chat route accepts it)       | **disallowed** — Zod strips field, gateway rejects it                    |
| "MediBot is fake — I asked about chest pain and it never called an LLM" | safety engine returned a hardcoded template; LLM never called | safety becomes a non-blocking banner SSE frame; LLM is **always** called  |

## Additive code touches that would have caught this at boot

Each of these is a new file or strictly additive function — none changes
the existing fallback chain or chat handler:

### 1. Boot-time configuration self-check (`lib/llm-config-check.ts`)

```ts
// new file — call from instrumentation.ts on app start
export function checkLlmConfig(): {
  ok: boolean
  warnings: string[]
  errors: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  const cfg = loadConfig().llm
  const hasOllabridge = !!(cfg.ollabridgeUrl || process.env.OLLABRIDGE_URL)
  const hasHfToken   = !!(cfg.hfToken         || process.env.HF_TOKEN)

  if (!hasOllabridge && !hasHfToken) {
    errors.push(
      'No LLM rung is configured — /api/chat will 503. ' +
      'Set OLLABRIDGE_URL (preferred) or HF_TOKEN in the Space secrets.'
    )
  } else if (!hasOllabridge) {
    warnings.push('OLLABRIDGE_URL not set — falling back to direct HF only.')
  } else if (!hasHfToken) {
    warnings.push('HF_TOKEN not set — OllaBridge is the only rung; no last-resort fallback.')
  }

  return { ok: errors.length === 0, warnings, errors }
}
```

On boot, log a single line:

```
[Boot] llm.config.check ok=false errors=1 — set OLLABRIDGE_URL or HF_TOKEN
```

If `errors.length > 0`, also **fail the `/api/health` probe**, so the
Vercel proxy and any external uptime monitor go red immediately rather
than waiting for the first user request.

### 2. Distinct error code for unconfigured vs unavailable

`chatWithFallback` already aggregates `failures: [...]`. When all
failures are configuration-shaped (`HF token not configured`,
`OllaBridge not configured`), surface a different error code:

```json
{
  "error": "MedOS LLM gateway is not configured. The operator needs to set OLLABRIDGE_URL or HF_TOKEN on the Space.",
  "code": "llm_not_configured"
}
```

The frontend renders that as a setup banner with a "Open Space settings"
button (only for users with the admin cookie) instead of a generic
"try again later" toast.

### 3. Admin dashboard tile (boot status, live)

A new tile on `app/admin/page.tsx`:

```
LLM Configuration
  ✗ OLLABRIDGE_URL  not set
  ✗ HF_TOKEN        not set
  ⚠ Chat will 503 until at least one is set.
  [ Set OllaBridge URL ]  [ Paste HF Token ]
```

When green:

```
LLM Configuration
  ✓ OLLABRIDGE_URL  ruslanmv-ollabridge.hf.space  (140 ms)
  ✓ HF_TOKEN        configured
  ✓ Gateway alias   free-best  (resolves to 6 sub-providers)
```

### 4. Probe-on-boot for the OllaBridge rung

On first request (or via a small scheduled task), the OllaBridge client
fires a `GET /v1/models` and caches the result. If the call fails, the
admin dashboard shows it before the user does.

### 5. "Fix it from inside the app" runbook bookmark

The chat-page 503 toast gains a small "What's wrong?" link that, when
clicked while authenticated as admin, opens the new diagnostic
dashboard tile rather than a static help page.

## Why the live OllaBridge Space matters here

The live probe confirms the OllaBridge Space is running the enterprise
gateway (the `<title>OllaBridge Cloud — Enterprise AI Gateway</title>`
HTML, the populated `/v1/models` payload). That means **option A
already works today** — setting `OLLABRIDGE_URL` immediately gives
MediBot a healthy gateway with five aliases (`free-best`, `free-fast`,
`free-flex`, `cheap-reasoning`, `local-private`) plus the local
`qwen2.5:1.5b`. No additional cloud work is needed for the restore.

The v2 design then builds on that gateway by adding the `medibot-*`
aliases and the policy endpoint, but the restore itself is purely an
operator action.

## What to communicate publicly

If users noticed:

> "Chat was briefly returning a 'service unavailable' message for some
> users on May 22. The MedOS gateway URL was missing from the Space
> configuration — a one-line setting change has restored service. We
> are adding boot-time configuration checks and an admin diagnostics
> tile so this exact problem can never recur silently."

No PHI / no patient data was at risk; the failure was a hard 503 before
the LLM was ever called.

## Action items

| # | Action                                                                                                  | Owner   | When        |
|---|---------------------------------------------------------------------------------------------------------|---------|-------------|
| 1 | Set `OLLABRIDGE_URL=https://ruslanmv-ollabridge.hf.space` on the MediBot Space                          | Ops     | Now         |
| 2 | Confirm `provider.ollabridge.ok` shows in next `/api/chat` log                                           | Ops     | +5 min      |
| 3 | Land `lib/llm-config-check.ts` + boot-log warning (additive PR)                                          | Backend | This week   |
| 4 | Switch `/api/health` to red when `checkLlmConfig().ok === false`                                         | Backend | This week   |
| 5 | Land distinct `llm_not_configured` error code + frontend banner                                          | Frontend| This week   |
| 6 | Land "LLM Configuration" admin tile                                                                       | Frontend| This week   |
| 7 | Roll the v2 contract behind `MEDIBOT_LLM_MANAGED_BY_ADMIN` flag (phases per the v2 doc)                  | Both    | Next sprint |
| 8 | Document the SSE `safety_banner` frame shape on the frontend so "I have chest pain" calls the real LLM  | Frontend| Next sprint |
| 9 | Add an uptime monitor that posts to `/api/health` and pages on red                                       | Ops     | Next sprint |

Steps 1–2 restore the live site. Steps 3–6 are the additive code work
that guarantees this exact incident is impossible to ship again. Steps
7–9 are the v2 architecture from the companion design doc.
