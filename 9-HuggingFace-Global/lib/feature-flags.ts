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
 * Snapshot every flag's current value. Convenience for the /api/health
 * endpoint and for logging at process startup.
 */
export function snapshotFlags(): Record<string, boolean> {
  return {
    MEDOS_PER_USER_OLLABRIDGE: perUserOllaBridgeEnabled(),
    MEDOS_OFFLINE_LITE_ENABLED: offlineLiteEnabled(),
  };
}
