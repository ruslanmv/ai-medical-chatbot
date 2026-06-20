/**
 * MedOS feature flags.
 *
 * Single, typed, server-side source of truth for feature flags. Read once
 * per process from env vars. Any new flag must:
 *   1. Be added here.
 *   2. Default to OFF.
 *   3. Be documented in the JSDoc above its accessor.
 *   4. Be checked by tests before being flipped on in any environment.
 *
 * Do NOT add NEXT_PUBLIC_* prefixed flags. Feature flags are server-side.
 * If a flag must affect client behavior, surface it through a normal API
 * response, not a public env var.
 */

const truthy = (v: string | undefined): boolean =>
  !!v && /^(1|true|yes|on)$/i.test(v.trim());

/**
 * Per-user OllaBridge Cloud pairing.
 *
 * When ON, the chat route (and any future authenticated server path) will
 * try the authenticated user's per-user OllaBridge pairing FIRST in the
 * provider chain, before the operator-wide bridge or the Hugging Face
 * fallback. When OFF, only operator-wide pairing (the legacy
 * OLLABRIDGE_URL env) is honored.
 *
 * See: 9-HuggingFace-Global/docs/OLLABRIDGE_INTEGRATION.md
 */
export const perUserOllaBridgeEnabled = (): boolean =>
  truthy(process.env.MEDOS_PER_USER_OLLABRIDGE);

/**
 * Offline-Lite small-model provider.
 *
 * When ON, the offline-lite provider (Phi-3 mini / Gemma 2B / TinyLlama)
 * is registered in the provider fallback chain as the LAST step (after
 * cached FAQ). Outputs are pinned to R0/R1 only by the safety engine;
 * the post-filter still runs.
 *
 * The flag must remain OFF until the full golden prompt set passes in
 * offline mode with the same R5/R4 sensitivity targets as the online
 * path.
 *
 * See: 9-HuggingFace-Global/docs/OFFLINE_LITE.md
 */
export const offlineLiteEnabled = (): boolean =>
  truthy(process.env.MEDOS_OFFLINE_LITE_ENABLED);

/**
 * Emergency card emission.
 *
 * When OFF (the default), the chat route does NOT emit the dedicated
 * `[card:emergency]` UI card, and the symptom-flow state machine
 * downgrades any safety-check red-flag match from care_level `emergency`
 * to `urgent` on the guidance card.
 *
 * The DETERMINISTIC SAFETY FLOOR is preserved either way:
 *   - preCheck() still runs and still classifies risk (R0–R5)
 *   - For R5 (explicit claims like "I am having a heart attack"), the
 *     emergency banner text is still prepended to the LLM response
 *   - The local emergency number still appears in `seek_care_if`
 *     sections of guidance cards
 *
 * What changes when OFF: users with bare chest-pain / stroke-FAST
 * / similar inputs are not greeted with the alarming red emergency
 * card. They get the structured safety_check → intake → urgent
 * guidance flow instead, which still tells them what to do, just
 * less dramatically.
 *
 * Re-enable by setting MEDOS_EMERGENCY_CARD_ENABLED=true on the
 * environment for the deployment that needs it (e.g. an internal
 * clinician-supervised pilot where the alarm UI is welcome).
 */
export const emergencyCardEnabled = (): boolean =>
  truthy(process.env.MEDOS_EMERGENCY_CARD_ENABLED);

/**
 * Deterministic symptom-flow cards.
 *
 * When ON, recognized symptom mentions (headache, back pain, chest pain,
 * …) are answered by the medical-flow state machine with a fixed,
 * multi-turn card sequence — a red-flag safety_check checklist → intake
 * cards (location / duration / severity) → a guidance card — and the LLM
 * is not called for those turns.
 *
 * Default OFF. Those rigid checklists read as robotic / demo-like for a
 * conversational medical assistant, so by default non-emergency symptom
 * turns fall through to the LLM, which answers professionally and in
 * context (acknowledge → likely causes → one targeted follow-up →
 * red-flag note) per the system prompt in lib/medical-knowledge.ts.
 *
 * The safety floor is INDEPENDENT of this flag: preCheck() runs the
 * deterministic emergency / red-flag rules on the raw user text BEFORE any
 * card or LLM decision, so true emergencies ("worst headache of my life",
 * "chest pain radiating to the arm") still escalate to the emergency floor
 * whether this is ON or OFF.
 *
 * Re-enable the structured flow with MEDOS_SYMPTOM_CARDS_ENABLED=true.
 */
export const symptomCardsEnabled = (): boolean =>
  truthy(process.env.MEDOS_SYMPTOM_CARDS_ENABLED);

/**
 * Grounded hybrid RAG.
 *
 * When ON, the chat route retrieves from the versioned, source-attributed
 * corpus in `/data/medos.db` (FTS5 keyword + vector cosine, fused with
 * RRF) instead of the in-memory keyword KB. The KB remains the automatic
 * fallback whenever the corpus is not yet ingested or retrieval fails, so
 * flipping this on can never produce an empty pipeline.
 *
 * Keep OFF until `scripts/ingest-corpus.ts` (or POST /api/admin/ingest)
 * has populated the corpus on the deployment's persistent `/data` volume.
 *
 * See: 9-HuggingFace-Global/docs/RAG-PRODUCTION-DESIGN.md
 */
export const ragHybridEnabled = (): boolean =>
  truthy(process.env.RAG_HYBRID);

/**
 * Require retrieved evidence for clinical answers.
 *
 * When ON, a substantive clinical turn whose retrieval came back
 * "insufficient" (no corpus hit above the similarity floor) is answered
 * with a deterministic "I don't have verified information on this" deferral
 * instead of letting the model answer from unguarded general knowledge.
 * Emergencies are never deferred — the safety floor always runs first.
 *
 * Only meaningful with RAG_HYBRID on AND a comprehensive corpus ingested.
 * Keep OFF until the corpus covers the expected query distribution.
 */
export const ragRequireEvidence = (): boolean =>
  truthy(process.env.RAG_REQUIRE_EVIDENCE);

/**
 * Post-generation faithfulness check.
 *
 * When ON, grounded answers at or above RAG_FAITHFULNESS_MIN_RISK are
 * verified by a lightweight LLM-judge against the retrieved sources. A
 * low groundedness score appends a "could not fully verify" caveat (it
 * does NOT silently drop the answer; the safety floor is unchanged). Adds
 * one extra model call per qualifying turn, so it is risk-gated.
 */
export const faithfulnessEnabled = (): boolean =>
  truthy(process.env.RAG_FAITHFULNESS);

/**
 * Minimum risk class at which the faithfulness check runs (R0–R5).
 * Defaults to R2 so chit-chat / low-risk turns skip the extra call.
 */
export const faithfulnessMinRisk = (): string =>
  (process.env.RAG_FAITHFULNESS_MIN_RISK || 'R2').toUpperCase();

/**
 * Snapshot every flag's current value. Convenience for the /api/health
 * endpoint and for logging at process startup.
 */
export function snapshotFlags(): Record<string, boolean> {
  return {
    MEDOS_PER_USER_OLLABRIDGE: perUserOllaBridgeEnabled(),
    MEDOS_OFFLINE_LITE_ENABLED: offlineLiteEnabled(),
    MEDOS_EMERGENCY_CARD_ENABLED: emergencyCardEnabled(),
    MEDOS_SYMPTOM_CARDS_ENABLED: symptomCardsEnabled(),
    RAG_HYBRID: ragHybridEnabled(),
    RAG_REQUIRE_EVIDENCE: ragRequireEvidence(),
    RAG_FAITHFULNESS: faithfulnessEnabled(),
  };
}
