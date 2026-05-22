# MediBot ↔ OllaBridge integration — v2 (Admin-managed LLM)

**Status:** design only. Nothing in this document changes the running app.
Implementation is staged in [Migration](#migration-from-v1-additive-rollout)
below — each phase is additive and reversible.

**Companion docs:**

- `OLLABRIDGE_INTEGRATION.md` — v1 (this doc supersedes it once landed)
- `../../../ollabridge-cloud/docs/MEDIBOT_APP_POLICY_CONTRACT.md` — the
  policy + alias contract owned by the cloud control plane

## Why a v2

The current integration (`lib/providers/index.ts`,
`lib/providers/ollabridge.ts`, `app/api/admin/config/route.ts`) lets the
Space operator configure four LLM-related secrets (`OLLABRIDGE_URL`,
`OLLABRIDGE_API_KEY`, `HF_TOKEN`, `DEFAULT_MODEL`) and lets the chat route
accept a client-supplied `model` field. That works, but:

- The user can — and the API does — pass `model` from the browser. With a
  medical product that's the wrong default; it lets a curious user route to
  an unevaluated chain.
- Four env vars and a JSON config blob is more surface than necessary.
- The HF model catalog now lives in OllaBridge (`huggingface_catalog`
  addon). Mirroring "best free models" knobs in MediBot duplicates control
  and drifts.

**v2 picks one rule:** every LLM decision belongs to OllaBridge Admin.
MediBot only consumes a stable alias. Users only see a chat box.

This matches the explicit corrected architecture:

```
End User
  | Uses MediBot UI only — no model picker, no provider picker, no key field
  v
MediBot
  | Server-side: calls OllaBridge with a fixed app alias
  | `model = medibot-free-best` (admin-managed, server-enforced)
  v
OllaBridge Admin Control Plane
  | Owns: alias chain, HF model catalog, cost guard, safety eval, health
  v
Hugging Face Inference Providers (only reached via OllaBridge)
```

## The simplest enterprise solution: one env var

The current MediBot Space defines:

```
OLLABRIDGE_URL
OLLABRIDGE_API_KEY
HF_TOKEN
DEFAULT_MODEL
```

v2 collapses that to **one** bootstrap variable:

```
OLLABRIDGE_URL=https://ruslanmv-ollabridge.hf.space
```

That's the entire LLM-side surface MediBot needs to know at boot. Every
other knob is pulled from OllaBridge on first request and cached. Concretely:

| Concern                          | v1 (today)                          | v2 (this design)                              |
|----------------------------------|-------------------------------------|-----------------------------------------------|
| Cloud endpoint                   | `OLLABRIDGE_URL` env                | `OLLABRIDGE_URL` env (only var that remains)  |
| Cloud API key                    | `OLLABRIDGE_API_KEY` env + Admin UI | one-time **paired** on first boot; persisted to `/data/medos-config.json` (already supported by `lib/server-config.ts`) |
| HF token                         | `HF_TOKEN` env + Admin UI           | **removed** — HF is reached only via the OllaBridge cloud, which owns the token in its own credential store |
| Default model                    | `DEFAULT_MODEL` env + chat-route arg | **server-fixed** to `medibot-free-best`; the alias chain is owned by OllaBridge Admin |
| Cost mode, temp, max tokens, RAG, red-flag triage | scattered code + flags | single policy object pulled from `GET /api/apps/medibot/policy`, cached 60 s |

After this change the entire `.env.example` LLM block becomes:

```
# --- LLM gateway (only required value) ---
OLLABRIDGE_URL=https://ruslanmv-ollabridge.hf.space

# (no HF token, no model name, no provider keys — admin-managed in OllaBridge)
```

The legacy variables remain **read** (additive: if present, MediBot continues
to honour them) but they are documented as deprecated and the boot logs say
so. See [Migration](#migration-from-v1-additive-rollout).

## End-to-end request flow

```
┌─ Browser ────────────────────────────────────────────────────────────┐
│ POST /api/proxy/chat                                                 │
│   { messages: [...], language: "en", countryCode: "US" }             │
│                                                                      │
│   (No `model`. No `provider`. No `apiKey`. No `hfToken`.)            │
└────────────────────┬─────────────────────────────────────────────────┘
                     │
┌─ Vercel proxy ─────▼─────────────────────────────────────────────────┐
│ Forwards to MediBot HF Space, injects httpOnly cookie auth.          │
└────────────────────┬─────────────────────────────────────────────────┘
                     │
┌─ MediBot ──────────▼─────────────────────────────────────────────────┐
│ app/api/chat/route.ts                                                │
│   1. authenticate + per-identity rate-limit (unchanged)              │
│   2. RequestSchema.parse — **drops `model` field if present**        │
│   3. preCheck() red-flag triage (unchanged)                          │
│   4. policy = await getMediBotPolicy()  ← cached for 60s             │
│   5. RAG retrieval (unchanged)                                       │
│   6. build messages with the medical system prompt                   │
│   7. callOllaBridge({                                                │
│          alias:        policy.default_alias,    // "medibot-free-best"│
│          cost_mode:    policy.cost_mode,        // "free_only"       │
│          app_id:       "medibot",                                    │
│          red_flags:    safetyDecision.audit.ruleFires,               │
│          messages,                                                   │
│          temperature:  policy.temperature,                           │
│          max_tokens:   policy.max_output_tokens,                     │
│          metadata:     { user_id_hash, language, countryCode }       │
│       })                                                             │
│   8. postCheck() safety post-pass (unchanged)                        │
│   9. stream SSE back, **stripping provider/model details** from the  │
│      public payload (kept in server logs + Admin audit only)         │
└────────────────────┬─────────────────────────────────────────────────┘
                     │
┌─ OllaBridge ───────▼─────────────────────────────────────────────────┐
│ POST /v1/apps/medibot/chat  (new — see cloud-side design doc)        │
│   • validates `app_id == medibot` and the API key                    │
│   • resolves `medibot-free-best` against the admin-owned alias chain │
│   • enforces cost guard (no paid-only providers when free_only)      │
│   • runs the routing profile + fallback                              │
│   • returns SSE with usage + provider/model in private headers       │
└──────────────────────────────────────────────────────────────────────┘
```

### What stays exactly the same

- `preCheck` / `postCheck` safety sandwich.
- RAG retrieval (`buildRAGContext`).
- Auth + rate limiting.
- `chatWithFallback` HF-direct path remains as a **last-resort** fallback
  only when `OLLABRIDGE_URL` is unset (matches today's behaviour, so the
  legacy deployment keeps working).

### What changes

- The chat-route request schema **ignores any client `model` field** when
  `app_id == medibot`. A new top-level `getMediBotPolicy()` decides what to
  pass to the gateway.
- A single `policy-client.ts` module pulls the policy object from
  OllaBridge and caches it for 60 s, with stale-while-revalidate so the
  chat path never blocks on the policy fetch.
- The Admin UI on MediBot **removes** the LLM model picker section. The
  page becomes status-only ("Gateway: paired ✓ — alias medibot-free-best
  — last sync 12 s ago — owned by OllaBridge Admin"), with a "Manage in
  OllaBridge →" deep link.
- User-facing `Settings` view drops Provider/Model/HF-token UI entirely.

## Data contracts

### 1. The policy object MediBot consumes

Returned by `GET {OLLABRIDGE_URL}/v1/apps/medibot/policy` (authenticated):

```json
{
  "app_id": "medibot",
  "display_name": "MediBot Medical Assistant",
  "managed_by": "admin",
  "default_alias": "medibot-free-best",
  "allowed_provider_ids": ["huggingface-free"],
  "cost_mode": "free_only",
  "allow_paid_fallback": false,
  "user_model_selection": false,
  "user_provider_selection": false,
  "user_api_keys_allowed": false,
  "allow_user_override": false,
  "allow_direct_hf_from_medibot": false,
  "max_input_tokens": 6000,
  "max_output_tokens": 900,
  "temperature": 0.2,
  "top_p": 0.8,
  "require_medical_system_prompt": true,
  "require_red_flag_prefilter": true,
  "policy_version": 7,
  "policy_etag": "p7-2026-05-22T18:00:00Z"
}
```

`policy_etag` is honoured by MediBot's HTTP client (`If-None-Match`) so
unchanged policies return 304 and the in-process cache is just bumped.

### 2. The chat request MediBot sends

`POST {OLLABRIDGE_URL}/v1/apps/medibot/chat`:

```json
{
  "app_id": "medibot",
  "alias": "medibot-free-best",
  "cost_mode": "free_only",
  "messages": [
    { "role": "system",  "content": "<medical system prompt>" },
    { "role": "user",    "content": "I have chest pain and shortness of breath" }
  ],
  "red_flags": ["chest_pain", "shortness_of_breath"],
  "policy_version": 7,
  "request_metadata": {
    "user_id_hash": "sha256:…",
    "language": "en",
    "country_code": "US"
  }
}
```

The `app_id` + `policy_version` pair lets the cloud reject the request if
the local policy is stale, so MediBot is forced to refresh before retrying.

### 3. The chat response MediBot exposes to the user

```json
{
  "answer": "…",
  "alias": "medibot-free-best",
  "fallback_used": false,
  "free_guard": {
    "mode": "free_only",
    "paid_fallback_used": false
  }
}
```

The actual `provider`, `model`, `latency_ms`, `usage`, and `cost` come
back in private response headers and are stored in MediBot's audit log,
never sent to the browser:

```
X-OllaBridge-Provider: huggingface-free
X-OllaBridge-Model:    meta-llama/Llama-3.3-70B-Instruct:groq
X-OllaBridge-Latency:  428
X-OllaBridge-Tokens-In: 612
X-OllaBridge-Tokens-Out: 384
```

## Server-side enforcement (defence in depth)

UI hiding is not enough — the chat route hard-codes the policy:

```ts
// app/api/chat/route.ts  (sketch)
const RequestSchema = z.object({
  messages: z.array(MessageSchema),
  language: z.string().optional().default('en'),
  countryCode: z.string().optional().default('US'),
  // `model`, `provider`, `apiKey`, `hfToken` are NOT in the schema
  // anymore — Zod will strip them on parse. If they slip in via the
  // catch-all proxy, the gateway-side enforcement below also rejects
  // them.
}).strict()

const policy = await getMediBotPolicy()
const stream = await streamWithPolicy({
  alias: policy.default_alias,    // never read from the request
  cost_mode: policy.cost_mode,
  messages: buildMessages(policy, sanitisedMessages),
  temperature: policy.temperature,
  max_tokens: policy.max_output_tokens,
})
```

On the cloud side (see companion doc) the `/v1/apps/medibot/chat`
endpoint also rejects any non-allowed `model`/`provider` field with:

```json
{
  "error": "model_selection_not_allowed",
  "message": "MediBot model selection is managed by the project administrator."
}
```

Double-locking: client → server (Zod strip) → gateway (explicit reject).
Even if a future contributor accidentally re-adds the `model` field to
the client, the gateway still refuses to honour it.

## User-facing UI rules

Anything that lets the user influence LLM routing is removed or hidden.

### Drop entirely

- `Settings → LLM Provider` dropdown.
- `Settings → Model` dropdown.
- `Settings → HF token` input.
- `Settings → "Use my own key"` checkbox.
- `Settings → Temperature / Top-p / Max tokens` advanced inputs.

### Keep (still useful to the user)

- Language, country, units.
- Voice / text-size / readability.
- Theme.
- Linked devices (cloud bridge pairing — that's a privacy lever, not a
  model lever).

### Admin view becomes status-only

`AdminView` keeps these existing tabs unchanged: Users, Audit, Server
diagnostics, Email. The **LLM tab** is replaced with a read-only summary:

```
LLM gateway
  Endpoint        ruslanmv-ollabridge.hf.space        ✓ reachable (140 ms)
  Paired since    2026-05-22 14:02 UTC                [ Re-pair ] [ Unlink ]
  Active alias    medibot-free-best                   [ Open in OllaBridge ]
  Cost mode       free-only
  Last policy     v7  ·  refreshed 12 s ago
  Last error      —
```

All knobs (alias chain, cost mode, top-N, paid fallback, safety eval)
live in OllaBridge Admin's `Medical Apps → MediBot` page. The
`Open in OllaBridge` link deep-links there with a one-time admin SSO
token (already used by the pairing flow).

## Pairing the API key (one-time, replaces the env var)

Today `OLLABRIDGE_API_KEY` is set as an env var. v2 replaces that with a
**one-click pairing** on first boot, so the operator never copies a key:

```
1. Operator opens MediBot Admin → Gateway tab.
2. Clicks [Pair with OllaBridge].
3. Browser opens https://ollabridge.../admin/apps/pair?return_url=...
4. OllaBridge admin logs in, picks MediBot from the registered apps list,
   clicks "Issue pairing code".
5. A short code (XXXX-YYYY) is shown to the operator who pastes it back
   into MediBot.
6. MediBot POSTs the code to OllaBridge `/admin/apps/pair/exchange`,
   gets back an `app_api_key`, persists it via `saveConfig({
   llm: { ollabridgeApiKey: ... } })` (the existing `lib/server-config`
   mechanism, which already writes to /data/medos-config.json).
```

This is the same TV-style flow already used for device pairing
(`/device/start` + `/device/poll`) — no new primitive. The only new
piece is the "app" pairing channel on OllaBridge, designed in the
companion doc.

## Migration from v1 (additive rollout)

Each phase is independently shippable; every phase **preserves the
working v1 behaviour** until the very last step.

### Phase 1 — additive policy client (no behaviour change)

- Add `lib/providers/policy-client.ts` (new file, not wired).
- Add `lib/providers/policy-client.types.ts` (zod schema for the policy).
- Add unit tests for cache TTL + ETag handling.

Result: nothing in production changes. The policy client is dormant.

### Phase 2 — gateway-aware chat option (opt-in via flag)

- Add a `MEDIBOT_LLM_MANAGED_BY_ADMIN` feature flag (default `false`).
- When set to `true`, the chat route bypasses the client `model` field,
  calls `getMediBotPolicy()`, and routes via the new
  `/v1/apps/medibot/chat` endpoint (with HF-direct as last resort).
- When `false` (default), behaviour is the v1 chat path. Untouched.

Result: opt-in deployments can flip the flag to validate before the
default flips. Rollback = unset the flag.

### Phase 3 — UI hiding behind the same flag

- Hide `Settings → Provider/Model/HF-token` blocks when the flag is on.
- Replace the Admin LLM tab with the status-only view, only when the
  flag is on.

Result: the legacy admin/settings UIs are still reachable for ops who
haven't migrated.

### Phase 4 — flip the default

- Default the flag to `true`.
- Update `.env.example` to drop `HF_TOKEN` / `DEFAULT_MODEL` /
  `OLLABRIDGE_API_KEY` (left in deprecation notes).
- Add boot-log warning when any of the deprecated vars are still set.

Result: new deployments get the v2 architecture out of the box; existing
deployments are unaffected until they bump the version.

### Phase 5 — remove deprecation shims

- Delete the legacy env-var fallback after one minor release.
- Delete the v1 sections of the Admin UI.

## Operational runbook

### Health check

```
GET /api/admin/llm-health        (MediBot side)
  → calls OllaBridge `/v1/health` + `/v1/apps/medibot/policy`
  → returns { gateway_reachable, policy_etag, alias_resolvable,
              probe_latency_ms, fallback_chain: [...] }
```

### "What model did MediBot use for request X?"

Audit log shows the resolved provider+model per request id; the public
SSE never reveals it. The Admin's audit tab gains a "Resolved model"
column for each chat turn (read from the X-OllaBridge-* response headers).

### Rotate the gateway key

Pair again from the Admin UI — overwrites the existing
`/data/medos-config.json` value. Old key is revoked on the OllaBridge
side automatically.

### Emergency offline mode

If OllaBridge is unreachable AND no last-resort fallback is configured,
MediBot returns the existing `AllProvidersUnavailableError` SSE event
(a clean "service unavailable" to the user — no canned answer).

## Security model

- **No LLM secrets on MediBot.** The only secret is the OllaBridge
  app-scoped API key; it can be rotated without touching the LLM
  provider keys.
- **Schema strip + gateway reject.** Client-supplied model/provider
  fields are dropped by Zod and re-rejected by the gateway. Audit logs
  record any attempt.
- **Per-app isolation.** The OllaBridge app key only authorises the
  `medibot` `app_id`; other apps on the same cloud get their own keys
  and policies.
- **Policy ETag → stale rejection.** If MediBot is more than one policy
  version behind, the gateway answers `409 policy_stale` and forces a
  refresh — operators can't accidentally run with an outdated policy.
- **Response-header isolation.** Provider/model never leak to the browser
  even on error paths.

## Why this is "enterprise-simple"

| Trait                      | This design |
|----------------------------|-------------|
| Env vars to set            | **1** (`OLLABRIDGE_URL`) |
| Secrets to copy by hand    | **0** (pairing flow) |
| Places to update for a new top free model | **1** (OllaBridge Admin) |
| User UI surface for LLM    | **0** (chat box only) |
| Code paths that can pick a model | **1** (`getMediBotPolicy().default_alias`) |
| Rollback cost              | flip one feature flag |
| Cross-team coupling        | one HTTP contract (`/v1/apps/medibot/{policy,chat}`) |

Everything else — provider catalogs, cost guards, safety eval, alias
chains, top-5 selection — happens once, in OllaBridge Admin, and every
medical app on the platform inherits it.

## Bug fix: every answer must come from the real LLM

### What's broken today

In `app/api/chat/route.ts` the safety engine short-circuits the LLM:

```ts
if (safetyDecision.kind === 'emergency_template') {
  // pushes a HARDCODED string into the SSE stream
  // the LLM is never called
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
    choices: [{ delta: { content: emergencyTemplate } }],
    provider: 'safety-engine',
    model: 'emergency-template',
  })}\n\n`))
  controller.close()
  return
}
```

That's why "I have chest pain" produces the canned "This may be a heart
attack… Call now: 911" block — `provider: safety-engine`, `model:
emergency-template`. From a safety standpoint the floor is correct
(emergency guidance must be deterministic), but the user reads this as
"MediBot doesn't actually use an LLM" — they're right that a real LLM
turn never happens.

### Design fix: safety as a banner, not a replacement

Restructure the response into **two layers** that always both appear:

```
┌─────────────────────────────────────────────────────────────────┐
│ Emergency banner  (deterministic, instant)                      │
│ • Always shown when preCheck() returns a red-flag rule fire     │
│ • Always includes the local emergency number                    │
│ • Cannot be "softened" by the LLM                               │
├─────────────────────────────────────────────────────────────────┤
│ LLM medical answer  (streamed, real)                            │
│ • Real chat completion via OllaBridge / medibot-free-best       │
│ • Prompt includes the safety augmentation from preCheck()       │
│ • Post-checked by postCheck() before delivery                   │
└─────────────────────────────────────────────────────────────────┘
```

Concretely the chat route becomes:

```ts
// 1. Run the safety pre-check (existing).
const safety = preCheck({ text: cleanUserContent, countryCode })

// 2. If red flags fire, emit the safety banner as the FIRST SSE frame.
//    The banner is a structured event so the UI can render it as a
//    distinct alert block, not glue it into the prose stream.
if (safety.kind === 'emergency_template') {
  emitSse(controller, {
    type: 'safety_banner',
    severity: 'emergency',
    template: safety.template,
    rule_fires: safety.audit.ruleFires,
    emergency: getEmergencyInfo(countryCode),
  })
  // DO NOT return — keep going.
}

// 3. Always call the LLM. Pass the safety augmentation so the model
//    knows about the red flag and writes the answer with that context.
const policy = await getMediBotPolicy()
const systemPrompt = buildMedicalSystemPrompt({
  country: countryCode, language,
  safetyAugmentation: safety.systemPromptAugmentation, // pinned policy
  redFlags: safety.audit.ruleFires,
})
const ragContext = await buildRAGContext(cleanUserContent)
const llmStream = await streamWithPolicy({
  alias: policy.default_alias,
  cost_mode: policy.cost_mode,
  messages: [
    { role: 'system', content: systemPrompt },
    ...(ragContext ? [{ role: 'system', content: ragContext }] : []),
    ...messages,
  ],
  temperature: policy.temperature,
  max_tokens: policy.max_output_tokens,
})

// 4. Pipe LLM tokens as `content` frames. Each frame is tagged with
//    the resolved provider+model so audit can correlate.
for await (const chunk of llmStream) {
  emitSse(controller, {
    type: 'content',
    delta: chunk.content,
    provider: chunk.provider,      // 'huggingface-free'
    model: chunk.model,            // resolved router id
  })
}

// 5. Post-check the assembled answer. If postCheck flags it, append
//    a soft correction frame instead of replacing the whole answer.
const post = postCheck({ answer: assembled, redFlags: safety.audit.ruleFires })
if (post.kind === 'append_disclaimer') {
  emitSse(controller, { type: 'safety_footer', text: post.text })
}
```

### Frontend rendering rule

The chat UI distinguishes the frame types:

| SSE frame `type`     | UI treatment                                       |
|----------------------|----------------------------------------------------|
| `safety_banner`      | Red banner above the message, with emergency number button — non-dismissible while the LLM streams |
| `content`            | Normal streamed prose in the message bubble        |
| `safety_footer`      | Subtle footer note below the message               |
| `tool_call` / `usage`| Hidden from the user (admin-audit only)            |

The user sees both the emergency guidance **and** a real LLM answer.
Audit logs prove the LLM was called by storing the resolved
`provider`/`model` for the request.

### What stays deterministic

- The emergency banner text and emergency number are still generated
  from the safety engine, not the LLM. A future LLM regression cannot
  remove or weaken them.
- `preCheck()` runs before any token is shipped, so the banner appears
  within ~50 ms even when the LLM cold-starts.

### What becomes LLM-driven

- The actual medical reasoning, differential possibilities, when-to-go
  language, etc. — all coming from the real model via OllaBridge.
- Non-emergency queries already work this way; this change brings the
  emergency path into line so users never see a `safety-engine` model
  name and assume MediBot is fake.

### Test cases for this fix

1. `"I have chest pain"` → SSE stream contains **both** a
   `safety_banner` frame and ≥1 `content` frame whose `model` is a real
   HF router id, not `emergency-template`.
2. `"What is paracetamol?"` → no `safety_banner` frame, only
   `content` frames with a real `model`.
3. Audit log for both cases shows a non-null `resolved_model`.
4. If the LLM call fails after the banner is emitted, the SSE stream
   still closes cleanly with `type: error` and the banner remains
   visible — the user gets the emergency guidance even on LLM outage.
5. Regression test: no SSE frame is ever emitted with
   `provider: 'safety-engine'` and `model: 'emergency-template'` —
   those values are no longer valid (the banner uses `type:
   safety_banner`, not the legacy fake-model encoding).

### Why this is safer than the current behaviour

- The user cannot misread "the AI told me to call 911" as guidance the
  LLM owns; the banner is clearly an authored safety message.
- The LLM is forced through a system prompt that *includes* the red
  flags, so its prose acknowledges them rather than ignoring them.
- `postCheck()` still has the final word on the LLM prose; a model that
  contradicts the banner gets a corrective footer appended.

## Production triage: `503 all_providers_unavailable`

Symptom (from the Vercel proxy log):

```
[Proxy] upstream 503 on POST https://ruslanmv-medibot.hf.space/api/chat:
{"error":"All LLM providers are currently unavailable. Please try again in
a moment.","code":"all_providers_unavailable"}
```

That string is thrown by `AllProvidersUnavailableError` in
`lib/providers/index.ts`, which fires when **both** rungs of the
existing fallback chain fail:

1. **OllaBridge** rung — `streamWithOllaBridge`. Skipped silently if
   `OLLABRIDGE_URL` is unset (`isOllaBridgeConfigured()` returns false).
2. **HuggingFace direct** rung — `streamWithHuggingFace` (12-model
   cascade). Returns 401 if `HF_TOKEN` is missing/expired, 404 if every
   listed model is gone, 5xx if the inference API itself is down.

So a 503 means both rungs failed simultaneously. Triage in this order:

### Tier 1 — config (covers ~80% of recurrences)

| Check                                 | How                                                                                       | Quick fix                              |
|---------------------------------------|-------------------------------------------------------------------------------------------|----------------------------------------|
| `OLLABRIDGE_URL` set on the HF Space? | Admin → Server → "OllaBridge URL"; also `printenv \| grep OLLABRIDGE` in the Space shell | Set to `https://ruslanmv-ollabridge.hf.space` (or the v2 paired equivalent) |
| OllaBridge Space awake?               | `curl -sS https://ruslanmv-ollabridge.hf.space/health` from anywhere                      | Open the Space URL in a browser once to wake it; cold-start is ≤45 s |
| `HF_TOKEN` present and valid?         | Admin → Server → "HF Token" (masked); test with `curl -H "Authorization: Bearer $HF_TOKEN" https://huggingface.co/api/whoami-v2` | Rotate at https://huggingface.co/settings/tokens, paste back into Admin |
| OllaBridge tightened timeouts         | `lib/providers/ollabridge.ts` sets `timeout: 8000, maxRetries: 0` — fine in steady state, ruthless during cold start | Temporarily widen to 25000 on the Space; revert after the bridge warms |

### Tier 2 — upstream

If both rungs look healthy locally but still 503:

- Hit Groq / Together / Cerebras status pages — HF Inference Providers
  route through them; a single sub-provider outage can knock out half
  the 12-model cascade.
- Check the `huggingface_catalog` in OllaBridge Admin → Provider Fleet:
  any models with `setup_status: broken` for >24 h should be pruned
  from the active aliases.

### Tier 3 — the architectural fix this v2 design ships

The current `chatWithFallback` is a two-rung ladder. v2 collapses both
rungs into **one well-managed alias chain** inside OllaBridge:

```
medibot-free-best:
  - huggingface-free:meta-llama/Llama-3.3-70B-Instruct:groq
  - huggingface-free:openai/gpt-oss-120b:groq
  - huggingface-free:Qwen/Qwen3-32B:groq
  - huggingface-free:meta-llama/Llama-3.3-70B-Instruct:cerebras
  - huggingface-free:google/gemma-4-31B-it:deepinfra
  - huggingface-free:Qwen/Qwen2.5-72B-Instruct:together
```

That's **6 distinct (provider, sub-provider) pairs** behind one alias.
A single sub-provider outage drops one entry; the chain keeps going.
The 503 from this design only fires when *every* entry in the chain
fails — which is rare enough to be a real incident.

### Tier 4 — fail loud and useful (no canned LLM answers)

When the chain genuinely cannot serve, the response should still be:

- **Not** a hardcoded paragraph that looks like an AI answer (today's
  `safety-engine` template is the wrong pattern here too).
- A first-class SSE `error` frame with a retry hint:

```json
{
  "type": "error",
  "code": "all_providers_unavailable",
  "message": "MedOS LLM gateway is temporarily unreachable.",
  "retry_after_seconds": 15
}
```

The chat UI renders that as a non-message error chip with a `Try again`
button — it must not look like a model reply.

### One-line operational summary

```
v2 alias chain has 6 providers, not 2 → 503 only on real outage.
When 503 happens: surface a structured retry event, never a canned answer.
```

### Reading these specific log lines

The 503 you saw was diagnosed from these four lines:

```
[Chat] provider.ollabridge.skipped.nonstream {"requestId":"yw9qi982"}
[Chat] provider.huggingface.no-token.nonstream
[Chat] provider.huggingface.fail.nonstream {"error":"HF token not configured"}
[Chat] provider.all_failed.nonstream {"failures":["huggingface: HF token not configured"]}
```

Both rungs failed for a configuration reason, not an outage:

| Log line                                | What it means                                                | Fix                                                                 |
|-----------------------------------------|--------------------------------------------------------------|---------------------------------------------------------------------|
| `provider.ollabridge.skipped.nonstream` | `isOllaBridgeConfigured()` returned `false` because neither the persisted config nor `OLLABRIDGE_URL` env var is set on the Space. The OllaBridge rung is bypassed entirely. | Set `OLLABRIDGE_URL=https://ruslanmv-ollabridge.hf.space` in the Space's repository secrets, **or** open Admin → Server and paste the URL there. |
| `provider.huggingface.no-token.nonstream` | The fallback rung tried `streamWithHuggingFace` and found no `HF_TOKEN` — anonymous HF inference is rejected at the gateway. | Generate a token at https://huggingface.co/settings/tokens, paste it in Admin → Server → "HF Token". `loadConfig()` re-reads the file on every request, no restart required. |
| `route.error … AllProvidersUnavailableError` | Both rungs are unconfigured → the public 503. The `totalMs` is ~10 ms because the failure is instant (no network round-trip). | Once either var above is set, this disappears. |

Crucially the `totalMs: 10` / `20` numbers are the smoking gun for
"misconfiguration, not outage": a real upstream failure would burn at
least the 8 000 ms timeout configured in `lib/providers/ollabridge.ts`.

### Two-minute live restore

For the running `ruslanmv-medibot.hf.space`, set **one** of the
following — either is sufficient to make chat work:

```
# Option A — preferred: route through OllaBridge (gets v2 ready too)
OLLABRIDGE_URL=https://ruslanmv-ollabridge.hf.space
# (and confirm the OllaBridge Space is awake — open its URL once)

# Option B — quick fix: direct HF fallback
HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

In the HF Space UI: **Settings → Variables and secrets → New secret**.
Both can also be set via Admin → Server in MediBot's own UI — the
`loadConfig()` machinery persists them to `/data/medos-config.json` so
they survive container restarts.

After setting either, the next `/api/chat` call should log:

```
[Chat] provider.ollabridge.ok        # or
[Chat] provider.huggingface.ok
```

and the SSE response will carry real model output.

### Why the v2 design makes this incident impossible

Under v2:

- `OLLABRIDGE_URL` is the **only** env var on MediBot, so a deploy that
  forgets it fails loudly at boot (`/api/admin/llm-health` returns red
  before the first user request).
- The `HF_TOKEN` no longer exists on MediBot at all — the gateway owns
  it. A missing HF token in MediBot becomes an impossible state.
- The Admin UI shows the gateway's `ping` status on the dashboard, so
  "OllaBridge Space asleep" surfaces as a yellow warning the operator
  can see before users.
- The fallback chain has six entries instead of two, all server-
  managed; losing one sub-provider doesn't break chat.

### Suggested additive code touches (non-destructive)

To make this exact incident impossible to ship again, add — without
touching existing code paths:

1. **Boot-time configuration check** (`lib/llm-config-check.ts` new file).
   On Next.js boot, log a single line summarising LLM configuration
   state:

   ```
   [Boot] llm.config { ollabridge: "set", hf_token: "missing" }
   ```

   If both are missing, log an explicit error:

   ```
   [Boot] llm.config.FATAL no LLM provider is configured —
       /api/chat will return 503 until OLLABRIDGE_URL or HF_TOKEN is set
   ```

2. **Distinct error code for unconfigured** (`/api/chat` route):
   When both rungs are skipped because of missing config (rather than
   actually failing), return `code: "llm_not_configured"` not
   `code: "all_providers_unavailable"`. The Admin UI banner can then
   render a setup CTA instead of a "try again" message.

3. **Admin dashboard tile** showing the current rung config status with
   one-click "Set OllaBridge URL" / "Paste HF token" deep-links.

All three are additive — they add new code, don't modify the existing
fallback chain or chat handler.

### Immediate unblock for the live `ruslanmv-medibot.hf.space` (today)

While the v2 work lands, the fastest restore for the live Space is:

1. Open the OllaBridge Space URL once to wake it.
2. Confirm `OLLABRIDGE_URL` and `HF_TOKEN` are both set in the MediBot
   Space's Admin → Server tab.
3. Hit `POST /api/admin/llm-health` (or the equivalent diagnostics
   button) and confirm both rungs return `ok`.
4. If `HF_TOKEN` is expired (most common silent failure), regenerate
   it on Hugging Face and re-save in Admin — `loadConfig()` re-reads
   the JSON on every request, so no restart is needed.

These are operator actions on existing surfaces — no code change. The
v2 design above is what prevents the next recurrence.

## Success criteria

The integration is done when:

1. A new MedOS Space deploys with `OLLABRIDGE_URL` and nothing else.
2. Operator pairs with OllaBridge in one click; key is persisted.
3. End users never see model, provider, or key UI anywhere.
4. The chat route refuses any client-supplied `model`/`provider` field
   (both Zod strip and gateway reject paths covered by tests).
5. Admin can change the active alias chain in OllaBridge without
   touching MediBot — change visible to MediBot within 60 s.
6. The audit log shows resolved provider+model per request, available
   only to admins.
7. `OLLABRIDGE_URL` is the only LLM-related env var in
   `.env.example`. `HF_TOKEN`, `DEFAULT_MODEL`, and
   `OLLABRIDGE_API_KEY` are gone (or marked deprecated).
8. The safety sandwich (`preCheck` / `postCheck`) and RAG are unchanged.
