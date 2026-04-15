/**
 * Client-side storage namespacing — per-user isolation for localStorage.
 *
 * Every MedOS health-store read/write goes through `scopedKey(suffix)`.
 * The prefix is owned by this module and derived from the active user:
 *
 *   logged-in user "u_abc"   →  "medos:u:u_abc:<suffix>"
 *   anonymous (guest/kiosk)  →  "medos:anon:<random>:<suffix>"
 *
 * Why this exists:
 *   Before Batch 6, keys were global (`medos_medications`, `medos_ehr_profile`,
 *   …). On a shared device (family laptop, kiosk, clinic workstation) the
 *   second user would read and overwrite the first user's EHR, meds and chat
 *   history — and those values were then concatenated into the LLM prompt
 *   via buildPatientContext(), producing clinically unsafe replies.
 *
 * Guarantees:
 *   - Switching user context wipes the *previous* user's scoped keys from
 *     local/sessionStorage, so account-switch on a shared browser is safe.
 *   - Anonymous sessions live only in sessionStorage and are isolated per
 *     tab; they are wiped on logout and never survive a browser restart.
 *   - Any legacy un-namespaced `medos_*` keys are migrated once on first
 *     scoped read and then removed, so existing users do not lose data.
 */

const SCOPED_PREFIX = 'medos:u:';
const ANON_PREFIX = 'medos:anon:';
const LEGACY_PREFIX = 'medos_';
const CONTEXT_KEY = 'medos:__context__'; // tracks the last-seen userId

type Ctx =
  | { kind: 'user'; userId: string; prefix: string }
  | { kind: 'anon'; anonId: string; prefix: string };

let currentCtx: Ctx | null = null;

function hasLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function hasSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function randomId(): string {
  // Not security-sensitive — just unique-enough per tab.
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  );
}

function getOrCreateAnonCtx(): Ctx {
  if (!hasSessionStorage()) {
    return { kind: 'anon', anonId: 'ssr', prefix: `${ANON_PREFIX}ssr:` };
  }
  const existing = sessionStorage.getItem('medos:__anon_id__');
  const anonId = existing || randomId();
  if (!existing) sessionStorage.setItem('medos:__anon_id__', anonId);
  return { kind: 'anon', anonId, prefix: `${ANON_PREFIX}${anonId}:` };
}

function getCtx(): Ctx {
  if (currentCtx) return currentCtx;
  // Lazy init — on first access, try to pick up a previously-stored context
  // so a page reload inside an authenticated session keeps reading the same
  // scoped keys without an explicit setStorageUserContext() call.
  if (hasLocalStorage()) {
    try {
      const raw = localStorage.getItem(CONTEXT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { userId?: string };
        if (parsed.userId) {
          currentCtx = {
            kind: 'user',
            userId: parsed.userId,
            prefix: `${SCOPED_PREFIX}${parsed.userId}:`,
          };
          return currentCtx;
        }
      }
    } catch {
      /* fall through to anon */
    }
  }
  currentCtx = getOrCreateAnonCtx();
  return currentCtx;
}

/**
 * Migrate any legacy `medos_<suffix>` key to the current scoped key, then
 * remove the legacy one. Idempotent and safe to call on every read.
 *
 * We only migrate into a *user* context — anonymous context must not inherit
 * data that belonged to a previously logged-in user on the same device.
 */
function migrateLegacyIfNeeded(suffix: string, scoped: string): void {
  if (!hasLocalStorage()) return;
  const ctx = getCtx();
  if (ctx.kind !== 'user') return;
  const legacyKey = `${LEGACY_PREFIX}${suffix}`;
  try {
    const legacyVal = localStorage.getItem(legacyKey);
    if (legacyVal == null) return;
    // Only migrate when the scoped slot is empty — don't clobber real data.
    if (localStorage.getItem(scoped) == null) {
      localStorage.setItem(scoped, legacyVal);
    }
    localStorage.removeItem(legacyKey);
  } catch {
    /* storage may be full/disabled — ignore */
  }
}

/**
 * Return the current scoped storage key for the given suffix (e.g. passing
 * `"medications"` returns `"medos:u:<userId>:medications"`).
 */
export function scopedKey(suffix: string): string {
  const ctx = getCtx();
  const scoped = `${ctx.prefix}${suffix}`;
  migrateLegacyIfNeeded(suffix, scoped);
  return scoped;
}

/**
 * Returns true if the current context is a real authenticated user. Callers
 * that write clinical data to the server should check this before syncing.
 */
export function isAuthenticatedContext(): boolean {
  return getCtx().kind === 'user';
}

/**
 * Wipe every scoped key belonging to `userId` (or every `medos:u:*` + legacy
 * `medos_*` key if no userId is given). Call this on logout.
 *
 * Anonymous (`medos:anon:*`) keys live in sessionStorage and are wiped too.
 */
export function wipeUserScopedStorage(userId?: string): void {
  if (hasLocalStorage()) {
    const victim = userId ? `${SCOPED_PREFIX}${userId}:` : SCOPED_PREFIX;
    const toDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith(victim) || k.startsWith(LEGACY_PREFIX)) toDelete.push(k);
    }
    toDelete.forEach((k) => localStorage.removeItem(k));
  }
  if (hasSessionStorage()) {
    const toDelete: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (!k) continue;
      if (k.startsWith(ANON_PREFIX) || k.startsWith('medos:')) toDelete.push(k);
    }
    toDelete.forEach((k) => sessionStorage.removeItem(k));
  }
}

/**
 * Wipe literally every MedOS key (scoped, anonymous, and legacy). Intended
 * for hard resets / delete-account flows, not routine logouts.
 */
export function wipeAllMedosStorage(): void {
  if (hasLocalStorage()) {
    const toDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (
        k.startsWith(SCOPED_PREFIX) ||
        k.startsWith(ANON_PREFIX) ||
        k.startsWith(LEGACY_PREFIX) ||
        k.startsWith('medos:')
      ) {
        toDelete.push(k);
      }
    }
    toDelete.forEach((k) => localStorage.removeItem(k));
  }
  if (hasSessionStorage()) {
    const toDelete: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (!k) continue;
      if (k.startsWith('medos:')) toDelete.push(k);
    }
    toDelete.forEach((k) => sessionStorage.removeItem(k));
  }
}

/**
 * Switch the active storage context.
 *
 *   setStorageUserContext("u_abc")  — login / session restore
 *   setStorageUserContext(null)     — logout (falls back to anonymous)
 *
 * If the incoming userId differs from the previously-active one, the
 * previous user's scoped keys are wiped so the new user starts clean on a
 * shared browser. Anonymous keys are always wiped on a context switch.
 */
export function setStorageUserContext(userId: string | null | undefined): void {
  const prev = currentCtx;
  const prevUserId = prev && prev.kind === 'user' ? prev.userId : null;

  if (userId) {
    if (prevUserId && prevUserId !== userId) {
      // Different user on the same browser — blow away the previous scope.
      wipeUserScopedStorage(prevUserId);
    }
    // Always wipe anon keys on promotion to an authenticated session.
    if (hasSessionStorage()) {
      const toDelete: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (!k) continue;
        if (k.startsWith(ANON_PREFIX) || k === 'medos:__anon_id__') toDelete.push(k);
      }
      toDelete.forEach((k) => sessionStorage.removeItem(k));
    }
    currentCtx = {
      kind: 'user',
      userId,
      prefix: `${SCOPED_PREFIX}${userId}:`,
    };
    if (hasLocalStorage()) {
      try {
        localStorage.setItem(CONTEXT_KEY, JSON.stringify({ userId }));
      } catch {
        /* non-fatal */
      }
    }
    return;
  }

  // Logout — wipe the user's scope and drop back to a fresh anon context.
  if (prevUserId) wipeUserScopedStorage(prevUserId);
  if (hasLocalStorage()) {
    try {
      localStorage.removeItem(CONTEXT_KEY);
    } catch {
      /* non-fatal */
    }
  }
  // Force a brand-new anon id so the previous anonymous browsing session
  // does not leak into the next one.
  if (hasSessionStorage()) {
    try {
      sessionStorage.removeItem('medos:__anon_id__');
    } catch {
      /* non-fatal */
    }
  }
  currentCtx = getOrCreateAnonCtx();
}

/**
 * Test-only helper — reset the in-memory context so unit tests can simulate
 * a fresh page load without polluting real storage.
 *
 * @internal
 */
export function __resetStorageNamespaceForTests(): void {
  currentCtx = null;
}
