# MedOS RAG — Production Design Plan (HuggingFace‑deployable)

> Status: **Phases 1–3 implemented + Phase 4 first tests** (Phase 1/2 behind flags, default OFF) · design for Phase 5 · Target: `ruslanmv-medibot.hf.space` (this app) + `ai-medical-chabot.com` (Vercel proxy)
>
> Phase 3 (evidence receipt): the chat route emits `sources`/`groundedness`
> in the SSE; `lib/hooks/useChat.ts` captures them onto the AI message and
> `components/chat/MessageBubble.tsx` renders clickable source chips.
> Phase 4 (first tests): `vitest` + `__tests__/rag/{query,fusion,vectors,judge-parse}.test.ts`
> cover FTS-match injection safety, RRF fusion, vector (de)serialization +
> cosine, and judge-JSON parsing (27 tests). Pure logic was extracted to
> `lib/rag/{fusion,vectors,judge-parse}.ts` for isolation. Run: `npm test`.
>
> Implemented (Phase 1 grounded hybrid retrieval + Phase 2 faithful generation):
> `lib/rag/{types,query,embeddings,retriever,context,faithfulness,ingest,index}.ts`,
> `lib/db.ts` (v4 corpus tables), `lib/feature-flags.ts` (RAG flags),
> `app/api/chat/route.ts` (grounded integration), `scripts/ingest-corpus.ts`,
> `app/api/admin/ingest/route.ts`, `data/corpus/seed.jsonl`.
> Activate with `RAG_HYBRID=true` after ingesting the corpus; the keyword KB
> stays the automatic fallback until then.
> Goal: turn the current keyword‑RAG guidance bot into a **grounded, source‑cited, auditable** medical RAG that **deploys on a HuggingFace Space today** (Tier A, non‑PHI) and has a clean path to a compliant enterprise deployment (Tier B).

This plan adapts the 5‑phase trustworthiness roadmap to the real constraints of a HF Space, and is grounded in the existing code:
`app/api/chat/route.ts`, `lib/rag/medical-kb.ts`, `lib/rag/embeddings.ts`, `lib/db.ts`, `lib/audit.ts`, `lib/safety/*`, `data/health-topics/*.json`, `Dockerfile`, `scripts/{sync-frontend,deploy-hf}.sh`.

---

## 0. Goals, scope, non‑goals

**Goals**
- Every clinical answer is **grounded in retrieved, versioned, source‑attributed content** and shows a real **evidence receipt** (source, organization, date/version, chunk, score).
- Keep the **deterministic safety floor** (R0–R5, emergency pre‑check, allergy/interaction guards) — it is already strong.
- Be **deployable on a single HF Docker Space** with no exotic infra: vector search and provenance live in the existing `/data/medos.db`; embeddings/rerank use the already‑installed `@huggingface/inference` client.

**Non‑goals (Tier A on HF Spaces)**
- Processing real **PHI** under HIPAA — a public HF Space cannot satisfy BAA/VPC/residency. PHI workloads belong to **Tier B** (see §8).
- Self‑hosting embedding/rerank models inside the Node image (the image is Node‑only). Embedding/rerank are **remote inference calls**.

---

## 1. Target architecture (HF‑Spaces‑native)

```
 Browser ──► Vercel proxy (ai-medical-chabot.com, thin) ──► HF Space (this app, port 7860)
                                                              │
   ┌──────────────────────────── HF Space request pipeline ──┴───────────────────────────┐
   │ 1 rate-limit → 2 validate/auth → 3 sanitize (strip [Patient:…])                       │
   │ 4 SAFETY PRE-CHECK  (R0–R5, deterministic floor)            lib/safety/safety-engine  │
   │ 5 QUERY REWRITE  (multilingual → canonical clinical query)  lib/rag/query.ts   [NEW]  │
   │ 6 HYBRID RETRIEVE  FTS5(keyword) + vector(cosine) → RRF fuse lib/rag/retriever.ts[NEW]│
   │       store: /data/medos.db  (chunks + FTS5 + embeddings)                              │
   │ 7 RERANK (optional, remote cross-encoder)                   lib/rag/rerank.ts  [NEW]  │
   │ 8 BUILD GROUNDED CONTEXT (+ provenance)                     lib/rag/context.ts [NEW]  │
   │ 9 patient context (auth only) → system prompt (grounded-only instruction)             │
   │ 10 intent / card short-circuits                             lib/medical-flow/*        │
   │ 11 LLM provider fallback  Groq → OllaBridge → HF Inference  lib/providers/*           │
   │ 12 FAITHFULNESS CHECK  (claims ⊆ retrieved evidence)        lib/rag/faithfulness.ts[N]│
   │ 13 SAFETY POST-CHECK + allergy guard                        lib/safety/output-filter  │
   │ 14 EVIDENCE RECEIPT  (SSE metadata + persisted, PHI-free)   extends existing SSE      │
   └───────────────────────────────────────────────────────────────────────────────────┘
                         │                              │
          embeddings/rerank: @huggingface/inference     vector+keyword+receipts: /data/medos.db
          (remote, query-time only)                     (HF Persistent Storage)
```

**Why this fits HF Spaces**
- Vector + keyword search live **inside `/data/medos.db`** (already the persistent SQLite store, `lib/db.ts:21`). No external vector DB needed for Tier A.
- **Document** embeddings are computed **once at ingest** and stored; at request time we embed only the **query** (1 remote call). Keeps latency inside the proxy's **50 s** budget.
- `@huggingface/inference` and `better-sqlite3` are **already dependencies** — no new native stack.

---

## 2. Key platform decisions

| Decision | Tier A (HF Space) | Rationale |
|---|---|---|
| Hosting | Single Docker Space, **always‑on paid hardware** (≥ CPU‑upgrade, ≥16 GB) | Avoid 48 h sleep + cold‑start reloading the index |
| Persistence | **Enable Persistent Storage** (`/data`) | `medos.db` (chunks, embeddings, FTS5, receipts, audit) must survive restarts (`DB_PATH=/data/medos.db`) |
| Vector store | **Embeddings as BLOB in SQLite + brute‑force cosine** for the current small corpus; upgrade to **`sqlite-vec`** (loadable ext) or **pgvector** (Tier B) when chunks > ~50k | No native‑extension risk on Alpine musl; trivially fast for a few‑thousand‑chunk corpus |
| Keyword index | **SQLite FTS5** (bundled with better‑sqlite3) | In‑process BM25‑style search, no new dep |
| Embeddings | **HF Inference** via `@huggingface/inference` (e.g. `intfloat/multilingual-e5-base` or `BAAI/bge-m3`) | Multilingual (20 langs), remote, query‑only at runtime |
| Rerank | Optional remote cross‑encoder (`BAAI/bge-reranker-v2-m3`) via HF Inference; **off by default** in Tier A | Latency/cost control; RRF fusion is often enough |
| Faithfulness | Lightweight **LLM‑judge** reusing the provider chain; **gated by risk class / feature flag** | Bounds added latency to higher‑risk turns |
| Secrets | HF **repository secrets** → env (`HF_TOKEN`, `GROQ_API_KEY`, …) | Already the pattern in `.env.example` |
| Concurrency/state | In‑memory limiter OK for Tier A; **Redis** for Tier B | Code already notes “swap to Redis for multi‑instance” |

**Latency budget (per turn, Tier A target < 6 s):** query‑embed ~0.1–0.3 s (HF) + FTS5/vector search ~5–20 ms + LLM ~1–3 s (Groq) + optional faithfulness ~1–2 s. Comfortably under the 50 s proxy cap.

---

## 3. Corpus & data design

**Sources (versioned, authoritative).** WHO, CDC, NHS, NIH/MedlinePlus, NICE/BNF, EMA, plus the existing `ruslanmv/ai-medical-chatbot` dataset as a *secondary* (clearly labelled, lower‑trust) lane. Each source is captured with a fetch date and licence note.

**Chunk record (the unit of retrieval):**
```jsonc
{
  "chunk_id": "nhs_chest_pain_003",
  "doc_title": "Chest pain",
  "organization": "NHS",
  "url": "https://www.nhs.uk/conditions/chest-pain/",
  "version_date": "2025-08-01",      // source last-reviewed / our fetch date
  "lang": "en",
  "topic": "cardiovascular",
  "text": "…200–400 token passage…",
  "embedding": "<float32[768] as BLOB>",
  "corpus_version": "2026.06.0"
}
```

**Versioning.** A `corpus_manifest` row (version + per‑source dates + embedding model id) is stamped into **every evidence receipt**, so any answer is reproducible against a known corpus snapshot. Updating the corpus = re‑run ingest → bump `corpus_version`.

**Build vs runtime.** Ingestion is **offline** (`scripts/ingest-corpus.ts`): read sources → clean → chunk (200–400 tokens, overlap) → embed via HF Inference → write `chunks` + FTS5 + manifest into `/data/medos.db`. Because `/data` persists, the index is built once (locally or as a one‑off job) and the Space boots fast. Bundled fallback corpus (like `data/health-topics/*.json`) ships in the image for first‑boot bootstrap.

---

## 4. Phase plan

Each phase lists **objective → design → HF implementation (files/env) → acceptance**. Keep changes additive; gate new behaviour behind feature flags (`lib/feature-flags.ts`) so rollout is reversible.

### Phase 1 — Grounded hybrid retrieval over a versioned corpus
- **Objective:** replace the 24‑entry keyword KB with real retrieval over the versioned corpus.
- **Design:** FTS5 (keyword) + cosine (vector) candidate sets → **Reciprocal Rank Fusion** → top‑k chunks with metadata.
- **HF impl:**
  - `scripts/ingest-corpus.ts` — build `/data/medos.db` (tables in §6).
  - `lib/rag/embeddings.ts` — activate query embedding via `@huggingface/inference` (already scaffolded); add an embedding‑cache table.
  - `lib/rag/retriever.ts` *(new)* — `hybridSearch(query, k)` → `RetrievedChunk[]`.
  - `lib/rag/query.ts` *(new)* — query rewrite/normalise (cheap LLM or rules).
  - Keep `lib/rag/medical-kb.ts` as a **fallback** when the DB/embeddings are unavailable (graceful degradation).
  - Env: `RAG_EMBED_MODEL`, `RAG_TOPK=6`, `RAG_HYBRID=true`.
- **Acceptance:** retrieval recall@6 ≥ target on the eval set (§Phase 4); every returned chunk carries `{org,url,version_date,chunk_id,score}`.

### Phase 2 — Faithful, grounded generation
- **Objective:** answers must be supported by retrieved evidence, not free‑floating model knowledge.
- **Design:**
  - Change `buildRAGContext` instruction from “use KB **and** general training” → **“answer **only** from the provided context; if insufficient, say so and recommend a clinician.”**
  - Add a post‑generation **faithfulness check** (`lib/rag/faithfulness.ts`): LLM‑judge verifies each clinical claim is entailed by a retrieved chunk; unsupported claims are flagged/stripped; emit a `groundedness` score.
  - “**Insufficient evidence**” path returns a safe deferral instead of guessing.
- **HF impl:** `lib/rag/context.ts` (new grounded prompt), `lib/rag/faithfulness.ts` (new), flag `RAG_FAITHFULNESS=true` and `RAG_FAITHFULNESS_MIN_RISK=R2` to bound latency.
- **Acceptance:** faithfulness ≥ target; “insufficient evidence” returned when retrieval is empty/low‑score; no self‑care wording at R2+ (already enforced by `risk-classes.ts`).

### Phase 3 — Real evidence receipt (provenance) + UI
- **Objective:** show and store *where each answer came from* — real retrieval provenance, not text‑scraped homepages.
- **Design:** extend the SSE metadata the route **already emits** (`provider, model, riskClass, ruleFires, filtered`) with the retrieval half (schema in §5). Render **source chips** that link to the specific document/section. Replace `answer-quality.ts → extractCitations()` (post‑hoc org‑name scan) with receipt‑driven citations.
- **HF impl:** extend the SSE `data` object in `app/api/chat/route.ts` (step 14); add a `receipt` table (§6) written via `lib/audit.ts` (PHI‑free); render chips in `components/chat/MessageBubble.tsx` (cards layer already ported).
- **Acceptance:** every grounded answer renders ≥1 source chip linking to a real chunk’s `url`; receipt persisted with `corpus_version` + scores.

### Phase 4 — Evaluation & QA (CI) — *the backend currently has 0 tests*
- **Objective:** measurable quality + safety, gated in CI.
- **Design:**
  - **Golden set**: clinical Q&A with reference answers + provenance; red‑flag/emergency cases in multiple languages.
  - **RAG metrics**: retrieval recall@k, citation precision, faithfulness, answer correctness.
  - **Safety red‑team**: jailbreaks, emergency phrasing in 20 langs, allergy/interaction traps; assert R‑class + banners.
  - **Unit tests** for `safety-engine`, `retriever`, `faithfulness`, the chat route.
- **HF impl:** `evals/` + `__tests__/` in this app; GitHub Actions workflow gating merges (runs off‑Space). Vitest is already used in `web/`.
- **Acceptance:** CI green required to deploy; thresholds enforced; regressions blocked.

### Phase 5 — Reproducibility, observability, compliance (Tier B path)
- **Objective:** make answers replayable and the service operable/auditable; unblock regulated deployment.
- **Design:**
  - **Reproducibility:** pin model **version + temperature + seed** (Groq is temp 0.4, no seed today); stamp `corpus_version` + `embed_model` in the receipt.
  - **Observability:** per‑answer trace (retrieval scores, R‑class, model) to an external backend (outbound); alert on post‑filter‑modified rate, R5 frequency, provider fallbacks; the `[Chat]` structured logs already exist.
  - **Compliance (Tier B):** BAA/no‑train confirmation with inference providers; external Postgres+pgvector; Redis; consented, encrypted **content‑level clinical audit** (the current audit is intentionally PHI‑free, so it can’t reconstruct a clinical incident); data residency. Build on `GOVERNANCE.md`/`THREAT_MODEL.md`/`SAFETY.md`.
- **Acceptance:** any answer replayable from `{corpus_version, model_version, seed, retrieved_chunk_ids}`; dashboards + alerts live; Tier‑B compliance checklist signed before any PHI.

---

## 5. Evidence receipt schema (extends current SSE metadata)

```jsonc
{
  // already emitted today:
  "provider": "groq", "model": "llama-3.3-70b-versatile",
  "riskClass": "R1", "ruleFires": [], "filtered": false,
  // NEW (retrieval half):
  "corpus_version": "2026.06.0",
  "embed_model": "intfloat/multilingual-e5-base",
  "groundedness": 0.91,
  "retrieved_sources": [
    { "title": "Chest pain", "organization": "NHS",
      "url": "https://www.nhs.uk/conditions/chest-pain/",
      "version_date": "2025-08-01", "chunk_id": "nhs_chest_pain_003",
      "retrieval_score": 0.87, "used": true }
  ]
}
```
The browser renders `retrieved_sources` as chips; a PHI‑free copy is persisted (§6).

---

## 6. Data model (all inside `/data/medos.db`)

```sql
-- corpus chunks (retrieval unit)
CREATE TABLE chunks (
  chunk_id TEXT PRIMARY KEY, doc_title TEXT, organization TEXT, url TEXT,
  version_date TEXT, lang TEXT, topic TEXT, text TEXT NOT NULL,
  embedding BLOB,                 -- float32[d]; brute-force cosine (Tier A) or sqlite-vec
  corpus_version TEXT NOT NULL
);
CREATE VIRTUAL TABLE chunks_fts USING fts5(text, content='chunks', content_rowid='rowid');

-- query embedding cache (avoid re-embedding repeated queries)
CREATE TABLE embed_cache (qhash TEXT PRIMARY KEY, embedding BLOB, model TEXT, created_at INTEGER);

-- corpus provenance
CREATE TABLE corpus_manifest (
  corpus_version TEXT PRIMARY KEY, embed_model TEXT,
  sources_json TEXT,              -- [{org,url,version_date}]
  built_at INTEGER
);

-- PHI-free answer receipts (compliance evidence / debugging)
CREATE TABLE answer_receipts (
  id TEXT PRIMARY KEY, ts INTEGER, user_id TEXT,
  risk_class TEXT, model TEXT, provider TEXT,
  groundedness REAL, corpus_version TEXT,
  retrieved_chunk_ids TEXT,       -- JSON array, no patient text
  post_filter_modified INTEGER
);
```
> FTS5 ships with better‑sqlite3’s bundled SQLite (verify with `PRAGMA compile_options`). For >~50k chunks, move `embedding` search to `sqlite-vec` or pgvector (Tier B).

---

## 7. Deployment runbook (HuggingFace Space)

1. **Space settings**
   - SDK: **Docker** (already), app port **7860** (already).
   - **Enable Persistent Storage** (≥20 GB) → `/data` durable.
   - **Hardware:** upgrade to an **always‑on** tier (no sleep) with ≥16 GB RAM.
2. **Secrets** (Space → Settings → Secrets): `HF_TOKEN`, `HF_TOKEN_INFERENCE`, `GROQ_API_KEY`, `OLLABRIDGE_URL`, `OLLABRIDGE_API_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `RESEND_API_KEY`, `ALLOWED_ORIGINS` (Vercel origin). New: `RAG_EMBED_MODEL`, `RAG_TOPK`, `RAG_HYBRID`, `RAG_FAITHFULNESS`, `RAG_FAITHFULNESS_MIN_RISK`, `RAG_RERANK`.
3. **Build the index** (one‑off): run `scripts/ingest-corpus.ts` against `/data/medos.db` (locally with the volume, or as a first‑boot job). Bump `corpus_version`.
4. **Frontend sync + deploy:** `bash scripts/sync-frontend.sh` then `bash scripts/deploy-hf.sh` (push to the Space). Dockerfile already produces a Next standalone server on 7860 with `/api/health` for the healthcheck.
5. **Vercel:** unchanged — it proxies `/api/chat` to the Space and streams SSE; CORS via `ALLOWED_ORIGINS`.

---

## 8. Tier A (HF Space) vs Tier B (compliant prod)

| Concern | Tier A — HF Space (now) | Tier B — Enterprise/PHI |
|---|---|---|
| Audience | Public, **non‑PHI** general guidance | Authenticated clinical/PHI |
| Vector store | SQLite (cosine/`sqlite-vec`) in `/data` | **Postgres + pgvector** |
| State/scale | In‑memory limiter, single container | **Redis** + replicas, autoscale |
| Inference | Groq/HF Inference (standard) | **BAA/no‑train** endpoints (HF Dedicated, etc.) |
| Compliance | None (acceptable: no PHI) | HIPAA/GDPR, VPC, residency, content audit |
| Hosting | HF Docker Space | HIPAA‑eligible cloud or **HF Enterprise Hub** |

Same codebase; Tier B is a **config/infra swap** (the unused `DATABASE_URL` hook in `.env.example` + the already‑federated multi‑Space design make this realistic).

---

## 9. Rollout sequencing

1. **M1 (foundation):** corpus + `ingest-corpus.ts` + `/data` schema + Persistent Storage + always‑on Space.
2. **M2 (Phase 1):** hybrid retriever live behind `RAG_HYBRID`; KB kept as fallback.
3. **M3 (Phase 3):** evidence receipt in SSE + source chips (visible trust win).
4. **M4 (Phase 2):** grounded‑only prompt + faithfulness check (gated by risk).
5. **M5 (Phase 4):** eval set + CI gates + backend unit tests.
6. **M6 (Phase 5):** reproducibility stamps, observability, then Tier‑B compliance for PHI.

Each milestone is independently shippable and flag‑guarded.

---

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Cold start reloads index (sleep) | Always‑on tier; index lives in persistent `/data`, not rebuilt at boot |
| Embedding/rerank API latency or outage | Query‑only embedding + cache; rerank optional; fall back to KB/keyword on failure |
| `sqlite-vec` native ext on Alpine musl | Default to BLOB+cosine (no native ext); switch base image or use pgvector only when scaling |
| Faithfulness check adds latency/cost | Gate by `RAG_FAITHFULNESS_MIN_RISK`; cache; skip for chitchat/cards |
| Stale corpus | `version_date` per chunk + `corpus_version` in receipt; scheduled re‑ingest; surface dates in UI |
| PHI on a public Space | **Do not** — Tier B only; Tier A is non‑PHI by policy |
| Single‑container concurrency | Redis + replicas at Tier B; rate‑limit already in place |

---

## 11. Definition of done (trust gates)

- Grounded answers cite **real retrieved chunks** (org + url + date + score) and persist a PHI‑free receipt.
- “Insufficient evidence” deferral when retrieval is weak; no fabricated sourcing.
- Deterministic safety floor (R0–R5, emergency, allergy/interaction) unchanged and tested.
- CI enforces retrieval/faithfulness/safety thresholds before deploy.
- Any answer is replayable from `{corpus_version, embed_model, model_version, seed, retrieved_chunk_ids}`.
- PHI only on Tier B with signed compliance checklist.
