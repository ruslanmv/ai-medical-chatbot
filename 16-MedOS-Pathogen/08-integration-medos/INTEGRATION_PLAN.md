# MedOS Pathogen — Integration Plan

MedOS Pathogen plugs into the existing MedOS ecosystem **without breaking anything**. It is purely additive: new MCP tools, new Hugging Face artifacts, new optional API routes. It is the image / sequence specialist that MedOS Classify can call when the clinical picture warrants imaging or microbiology evidence.

---

## 1. What it consumes from the rest of MedOS

| Source | What MedOS Pathogen reads | Purpose |
|---|---|---|
| MedOS auth/session | User identity | Permission checks. |
| `13-MedOS-Family/` permissions | Member/family/guardian/caregiver matrix | Decide whether image / sequence analysis on a specific member is allowed. |
| `14-MedOS-Connect/` vitals (optional) | Recent vitals as supporting context | Used as context when MedOS Classify is the orchestrator. |
| `15-MedOS-Classify/` orchestration | Calls into MedOS Pathogen tools | When the clinical picture warrants imaging or microbiology. |
| Object storage | Pre-signed-URL upload slots | Receive images and sequences without putting bytes in MCP arguments. |

It uses these as **read-only** consumers (other than ingesting newly uploaded artifacts). It does not alter any of those modules.

---

## 2. What it exposes to the rest of MedOS

### 2.1 MCP server (primary surface)

Five tools, defined in `02-mcp/MCP_TOOL_CONTRACTS.md`:

```text
classify_microscopy
classify_chest_xray
identify_pathogen_sequence
explain_pathogen_result
nearest_neighbor_review
```

Plus a small ingestion helper:

```text
request_upload_slot   pre-signed URL for asset upload
```

The MCP server can be consumed by:

- MedOS Classify, when its reasoning recommends imaging or microbiology.
- The existing MedOS chatbot (acts as an agent calling the tools).
- Claude / Claude Code / any external MCP-aware agent.
- A clinician-side dashboard in MedOS Family (Phase 2).

### 2.2 Optional HTTP routes (for non-MCP clients)

A thin HTTP wrapper under `/api/pathogen/*` mirrors each MCP tool for clients that don't speak MCP yet. The wrapper does not add logic — it adapts schemas only.

```text
POST /api/pathogen/upload-slot
POST /api/pathogen/microscopy
POST /api/pathogen/chest-xray
POST /api/pathogen/sequence
POST /api/pathogen/explain
POST /api/pathogen/nearest-neighbors
```

Permission and audit behavior is identical to the MCP path.

### 2.3 Hugging Face artifacts (public surface)

```text
medos/medos-pathogen-public-seed             # license-clean public splits
medos/medos-pathogen-clinician-curated       # access-controlled, post-Phase 1
medos/medos-pathogen-microscopy
medos/medos-pathogen-chest-xray
medos/medos-pathogen-sequence
medos/medos-pathogen-demo                    # public Space, no PHI
```

External developers can use the public-seed dataset and the demo Space without any access to clinical data.

---

## 3. Where the code goes

The code lives in two places:

- **Training and model code:** a separate repository, `medos-pathogen-train`. This is what publishes models and datasets to Hugging Face.
- **Runtime MCP server + thin HTTP wrapper:** added under the existing app at `9-HuggingFace-Global/`.

Suggested runtime layout (designed here, not implemented in this PR):

```text
9-HuggingFace-Global/
├── app/api/pathogen/
│   ├── upload-slot/route.ts
│   ├── microscopy/route.ts
│   ├── chest-xray/route.ts
│   ├── sequence/route.ts
│   ├── explain/route.ts
│   └── nearest-neighbors/route.ts
├── lib/pathogen/
│   ├── mcp-client.ts            # talks to the MedOS Pathogen MCP server
│   ├── permission-bridge.ts     # uses MedOS Family permission service
│   ├── classify-bridge.ts       # passes results back to MedOS Classify
│   ├── deid.ts                  # DICOM PHI strip helpers
│   └── upload.ts                # pre-signed URL helpers
└── lib/services/
    └── pathogen-service.ts      # orchestrates upload → de-id → classify → explain
```

Plus the standalone MCP server (Python or TypeScript) under `medos-pathogen-train/src/mcp_server/`.

---

## 4. How MedOS Pathogen and MedOS Classify interlock

```text
Agent collects free-text history
   ↓
MedOS Classify runs first pass → "lower-respiratory infection,
                                  bacterial vs viral uncertainty high,
                                  consider chest X-ray"
   ↓
Clinician (or caregiver) uploads X-ray via request_upload_slot
   ↓
MedOS Pathogen.classify_chest_xray
   → pneumonia 0.78, bacterial pattern 0.62, viral 0.31, Grad-CAM, OOD ok
   ↓
MedOS Classify re-runs with the new structured evidence
   → updated triage + explanation that cites the X-ray finding
   ↓
Clinician confirms / rejects / annotates
   ↓
Annotation flows into MedOS Pathogen and MedOS Classify training datasets (with consent)
```

Same shape applies for microscopy (microbiology lab) and sequence (PCR / sequencing lab).

---

## 5. Non-destructive guarantees

- No existing file is modified by introducing this folder.
- No existing table is altered, renamed, or dropped.
- No existing API is changed.
- The current MedOS chatbot, MedOS Family, and MedOS Connect keep working unchanged. If MedOS Pathogen is disabled, nothing else is affected.
- All new routes live under new namespaces (`/api/pathogen/*`).
- Feature-flagged at the MCP server boundary: turn the flag off → tools become unavailable, nothing else changes.

---

## 6. Rollout strategy

```text
Phase 0  Land documentation in 16-MedOS-Pathogen/        (this folder)
Phase 1  Stand up MCP server with mock models             (smoke tests, contracts only)
Phase 2  Train per-modality baselines on Level-1 data, publish to HF
Phase 3  Wire MedOS Pathogen into MedOS Classify behind a flag
Phase 4  Expose HTTP wrapper routes under /api/pathogen/*
Phase 5  Begin clinician-supervised pilot with Level-2 data collection
Phase 6  Promote to decision support for clinicians (still flagged)
Phase 7  Public Hugging Face Space demo with the public-seed model
```

Each phase corresponds to milestones in `09-roadmap/ROADMAP.md`.

---

## 7. Reversibility

The whole module is reversible:

- Disable the MCP server feature flag → tools return 404, agents fall back to "no imaging tool available."
- Drop the new tables (none required at the runtime layer beyond audit logs and asset metadata) → no impact on existing data.
- Remove `lib/pathogen/` and `app/api/pathogen/*` → existing services keep working.
- Delete the `16-MedOS-Pathogen/` documentation folder → other modules are unaffected.

That is what "additive only" means in practice for MedOS Pathogen, exactly mirroring the contract used in `14-MedOS-Connect/` and `15-MedOS-Classify/`.

---

## 8. Cross-references

- [`../13-MedOS-Family/README.md`](../13-MedOS-Family/README.md) — family permission and consent rules.
- [`../14-MedOS-Connect/README.md`](../14-MedOS-Connect/README.md) — vitals consumed as context.
- [`../14-MedOS-Connect/04-security/OAUTH_AND_PRIVACY.md`](../14-MedOS-Connect/04-security/OAUTH_AND_PRIVACY.md) — privacy guarantees inherited when MedOS Pathogen reads vitals as context.
- [`../15-MedOS-Classify/README.md`](../15-MedOS-Classify/README.md) — clinical reasoning module that orchestrates calls into MedOS Pathogen.
- [`../15-MedOS-Classify/02-mcp/MCP_TOOL_CONTRACTS.md`](../15-MedOS-Classify/02-mcp/MCP_TOOL_CONTRACTS.md) — the MCP contracts MedOS Pathogen results feed back into.
- This folder's own `02-mcp/MCP_TOOL_CONTRACTS.md`, `03-models/MODEL_ARCHITECTURE.md`, `07-safety/SAFETY_AND_COMPLIANCE.md`.
