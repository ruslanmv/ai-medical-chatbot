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
import path from 'path';

export const CONFIG_PATH = path.join(
  process.env.PERSISTENT_DIR || '/data',
  'medos-config.json',
);

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
      ollabridgeApiKey: process.env.OLLABRIDGE_API_KEY || '',
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
