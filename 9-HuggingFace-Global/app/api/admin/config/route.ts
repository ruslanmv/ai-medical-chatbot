import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import fs from 'fs';
import path from 'path';

/**
 * Admin configuration management.
 *
 * GET  /api/admin/config — returns current server configuration (redacted secrets).
 * PUT  /api/admin/config — updates server configuration (persisted to config file).
 *
 * Configuration is persisted to a JSON file on disk so it survives restarts.
 * Environment variables take precedence over the config file on first boot.
 */

const CONFIG_PATH = path.join(process.env.PERSISTENT_DIR || '/data', 'medos-config.json');

interface ServerConfig {
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
    ollabridgeUrl: string;
    ollabridgeApiKey: string;
  };
  app: {
    appUrl: string;
    allowedOrigins: string;
  };
}

function getDefaultConfig(): ServerConfig {
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
      hfDefaultModel: process.env.HF_DEFAULT_MODEL || 'meta-llama/Llama-3.3-70B-Instruct',
      hfToken: process.env.HF_TOKEN ? '••••••••' : '',
      ollabridgeUrl: process.env.OLLABRIDGE_URL || '',
      ollabridgeApiKey: process.env.OLLABRIDGE_API_KEY ? '••••••••' : '',
    },
    app: {
      appUrl: process.env.APP_URL || 'https://ruslanmv-medibot.hf.space',
      allowedOrigins: process.env.ALLOWED_ORIGINS || '',
    },
  };
}

function loadConfig(): ServerConfig {
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

function saveConfig(config: ServerConfig): void {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Config] Failed to save config file:', e);
    throw new Error('Failed to save configuration');
  }
}

/** Redact sensitive fields for GET responses. */
function redact(config: ServerConfig) {
  return {
    smtp: {
      host: config.smtp.host,
      port: config.smtp.port,
      user: config.smtp.user,
      pass: config.smtp.pass ? '••••••••' : '',
      fromEmail: config.smtp.fromEmail,
      recoveryEmail: config.smtp.recoveryEmail,
      configured: !!(config.smtp.host && config.smtp.user && config.smtp.pass),
    },
    llm: {
      ...config.llm,
      hfToken: config.llm.hfToken && config.llm.hfToken !== '••••••••' ? '••••••••' : config.llm.hfToken,
      ollabridgeApiKey: config.llm.ollabridgeApiKey && config.llm.ollabridgeApiKey !== '••••••••' ? '••••••••' : config.llm.ollabridgeApiKey,
      ollabridgeConfigured: !!(config.llm.ollabridgeUrl),
      hfConfigured: !!(config.llm.hfToken || process.env.HF_TOKEN),
    },
    app: config.app,
  };
}

export async function GET(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  const config = loadConfig();
  return NextResponse.json(redact(config));
}

export async function PUT(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  try {
    const body = await req.json();
    const current = loadConfig();

    // Merge incoming changes (only update provided fields).
    if (body.smtp) {
      if (body.smtp.host !== undefined) current.smtp.host = body.smtp.host;
      if (body.smtp.port !== undefined) current.smtp.port = parseInt(body.smtp.port, 10);
      if (body.smtp.user !== undefined) current.smtp.user = body.smtp.user;
      // Only update password if it's not the redacted placeholder.
      if (body.smtp.pass !== undefined && body.smtp.pass !== '••••••••') {
        current.smtp.pass = body.smtp.pass;
      }
      if (body.smtp.fromEmail !== undefined) current.smtp.fromEmail = body.smtp.fromEmail;
      if (body.smtp.recoveryEmail !== undefined) current.smtp.recoveryEmail = body.smtp.recoveryEmail;
    }

    if (body.llm) {
      if (body.llm.defaultPreset !== undefined) current.llm.defaultPreset = body.llm.defaultPreset;
      if (body.llm.ollamaUrl !== undefined) current.llm.ollamaUrl = body.llm.ollamaUrl;
      if (body.llm.hfDefaultModel !== undefined) current.llm.hfDefaultModel = body.llm.hfDefaultModel;
      if (body.llm.hfToken !== undefined && body.llm.hfToken !== '••••••••') {
        current.llm.hfToken = body.llm.hfToken;
      }
      if (body.llm.ollabridgeUrl !== undefined) current.llm.ollabridgeUrl = body.llm.ollabridgeUrl;
      if (body.llm.ollabridgeApiKey !== undefined && body.llm.ollabridgeApiKey !== '••••••••') {
        current.llm.ollabridgeApiKey = body.llm.ollabridgeApiKey;
      }
    }

    if (body.app) {
      if (body.app.appUrl !== undefined) current.app.appUrl = body.app.appUrl;
      if (body.app.allowedOrigins !== undefined) current.app.allowedOrigins = body.app.allowedOrigins;
    }

    saveConfig(current);

    return NextResponse.json({ success: true, config: redact(current) });
  } catch (error: any) {
    console.error('[Admin Config]', error?.message);
    return NextResponse.json({ error: error?.message || 'Failed to update config' }, { status: 500 });
  }
}
