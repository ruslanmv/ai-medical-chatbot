/**
 * Shared server configuration loader.
 *
 * Reads admin-editable settings from a JSON file on disk with environment
 * variable fallbacks. Used by both /api/admin/config (GET/PUT) and by other
 * admin routes that need to read provider credentials.
 *
 * Why a shared module instead of importing from the route file?
 *   Next.js App Router only allows HTTP method exports from route.ts files,
 *   so helpers must live in a separate module.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Resolve a writable persistence directory.
 *
 * Order: `PERSISTENT_DIR` env (operator override) → `/data` (HF Spaces
 * paid tier + Docker volume mounts) → `/tmp/medos` (always writable but
 * ephemeral, used as last-resort fallback on free-tier HF Spaces where
 * /data is absent). Cached on first call so we never probe twice in
 * the same process.
 *
 * If the chosen dir is ephemeral, persistence still "works" within the
 * container's lifetime — the OllaBridge URL and API key the admin saves
 * remain in effect until the Space sleeps/restarts. The admin GET
 * response surfaces `persistencePath` + `persistencePersistent` so the
 * operator can SEE whether their save is durable.
 */
let _persistenceDirCache: { path: string; persistent: boolean } | null = null;

function isDirWritable(p: string): boolean {
  try {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    const probe = path.join(p, `.write-probe-${process.pid}`);
    fs.writeFileSync(probe, '');
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

function resolvePersistenceDir(): { path: string; persistent: boolean } {
  if (_persistenceDirCache) return _persistenceDirCache;
  const envDir = process.env.PERSISTENT_DIR;
  const candidates: Array<{ path: string; persistent: boolean }> = [];
  if (envDir) candidates.push({ path: envDir, persistent: true });
  candidates.push(
    { path: '/data', persistent: true },
    { path: path.join(os.tmpdir(), 'medos'), persistent: false },
  );
  for (const c of candidates) {
    if (isDirWritable(c.path)) {
      _persistenceDirCache = c;
      if (!c.persistent) {
        console.warn(
          `[Config] /data not writable — falling back to ephemeral ${c.path}. ` +
            `Saved settings survive within the container but are lost on Space restart. ` +
            `Set PERSISTENT_DIR or mount /data to make persistence durable.`,
        );
      } else {
        console.log(`[Config] persistence dir: ${c.path}`);
      }
      return c;
    }
  }
  // Final fallback — even tmpdir failed. Surface the error rather than
  // silently dropping writes.
  throw new Error('No writable persistence directory available');
}

export function getPersistenceStatus(): { path: string; persistent: boolean } {
  const dir = resolvePersistenceDir();
  return { path: path.join(dir.path, 'medos-config.json'), persistent: dir.persistent };
}

/** Lazy getter — resolves once, then memoized via the dir cache. */
export function getConfigPath(): string {
  return path.join(resolvePersistenceDir().path, 'medos-config.json');
}

// Eager export for legacy callers (system-info route). Safe because
// it triggers the dir probe at module load time; resolvePersistenceDir
// is idempotent so subsequent calls just hit the cache.
export const CONFIG_PATH = getConfigPath();

export interface ServerConfig {
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
    fromEmail: string;
    recoveryEmail: string;
  };
  llm: {
    defaultPreset: string;
    ollamaUrl: string;
    hfDefaultModel: string;
    hfToken: string;
    /**
     * Hugging Face token with "Make calls to Inference Providers" permission.
     * Used SERVER-SIDE ONLY by the medicine-scanner proxy at /api/scan.
     * Never leaves the backend, never appears in any HTTP response body.
     */
    hfTokenInference: string;
    ollabridgeUrl: string;
    ollabridgeApiKey: string;
    openaiApiKey: string;
    anthropicApiKey: string;
    groqApiKey: string;
    watsonxApiKey: string;
    watsonxProjectId: string;
    watsonxUrl: string;
    // Additional providers (v3). Purely additive — routes that don't know
    // about these fields continue to work unchanged because loadConfig()
    // merges defaults for any missing key.
    geminiApiKey: string;
    openrouterApiKey: string;
    togetherApiKey: string;
    mistralApiKey: string;
    /** Public URL of the Medicine-Scanner HF Space. */
    scannerUrl: string;
    /** Public URL of the MetaEngine-Nearby HF Space. */
    nearbyUrl: string;
  };
  app: {
    appUrl: string;
    allowedOrigins: string;
  };
}

export function getDefaultConfig(): ServerConfig {
  return {
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      fromEmail: process.env.FROM_EMAIL || 'MedOS <noreply@medos.health>',
      recoveryEmail: process.env.RECOVERY_EMAIL || '',
    },
    llm: {
      defaultPreset: process.env.DEFAULT_PRESET || 'free-best',
      ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      hfDefaultModel:
        process.env.HF_DEFAULT_MODEL || 'meta-llama/Llama-3.3-70B-Instruct',
      // Secrets hold the REAL env value — routes using this loader get the
      // actual token. Admin GET responses pass through a redact() filter.
      hfToken: process.env.HF_TOKEN || '',
      hfTokenInference: process.env.HF_TOKEN_INFERENCE || '',
      ollabridgeUrl: process.env.OLLABRIDGE_URL || '',
      // `OB_TOKEN` is the canonical name used in OllaBridge Cloud admin
      // documentation; `OLLABRIDGE_API_KEY` is the legacy env name that
      // shipped first. Accept either so a freshly-minted `ob_…` key from
      // the cloud admin tab works without renaming.
      ollabridgeApiKey:
        process.env.OLLABRIDGE_API_KEY || process.env.OB_TOKEN || '',
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
      groqApiKey: process.env.GROQ_API_KEY || '',
      watsonxApiKey: process.env.WATSONX_API_KEY || '',
      watsonxProjectId: process.env.WATSONX_PROJECT_ID || '',
      watsonxUrl: process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com',
      geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
      openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
      togetherApiKey: process.env.TOGETHER_API_KEY || '',
      mistralApiKey: process.env.MISTRAL_API_KEY || '',
      scannerUrl:
        process.env.SCANNER_URL || 'https://ruslanmv-medicine-scanner.hf.space',
      nearbyUrl:
        process.env.NEARBY_URL || 'https://ruslanmv-metaengine-nearby.hf.space',
    },
    app: {
      appUrl: process.env.APP_URL || 'https://ruslanmv-medibot.hf.space',
      allowedOrigins: process.env.ALLOWED_ORIGINS || '',
    },
  };
}

export function loadConfig(): ServerConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const saved = JSON.parse(raw);
      const defaults = getDefaultConfig();
      return {
        smtp: { ...defaults.smtp, ...saved.smtp },
        llm: { ...defaults.llm, ...saved.llm },
        app: { ...defaults.app, ...saved.app },
      };
    }
  } catch (e) {
    console.error('[Config] Failed to load config file:', e);
  }
  return getDefaultConfig();
}

export function saveConfig(config: ServerConfig): void {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Config] Failed to save config file:', e);
    throw new Error('Failed to save configuration');
  }
}
