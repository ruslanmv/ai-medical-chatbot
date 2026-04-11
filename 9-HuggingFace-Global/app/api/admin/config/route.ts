import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { loadConfig, saveConfig, type ServerConfig } from '@/lib/server-config';

/**
 * Admin configuration management.
 *
 * GET  /api/admin/config — returns current server configuration (redacted secrets).
 * PUT  /api/admin/config — updates server configuration (persisted to config file).
 *
 * Configuration is persisted to a JSON file on disk so it survives restarts.
 * Environment variables take precedence over the config file on first boot.
 *
 * The storage/merge logic lives in @/lib/server-config so other admin routes
 * (like /api/admin/fetch-models) can read the same source of truth.
 */

/** Redact sensitive fields for GET responses. */
function redact(config: ServerConfig) {
  const hasSecret = (v: string) => !!(v && v.length > 0);
  const mask = (v: string) => (hasSecret(v) ? '••••••••' : '');
  return {
    smtp: {
      host: config.smtp.host,
      port: config.smtp.port,
      user: config.smtp.user,
      pass: mask(config.smtp.pass),
      fromEmail: config.smtp.fromEmail,
      recoveryEmail: config.smtp.recoveryEmail,
      configured: !!(config.smtp.host && config.smtp.user && config.smtp.pass),
    },
    llm: {
      defaultPreset: config.llm.defaultPreset,
      ollamaUrl: config.llm.ollamaUrl,
      hfDefaultModel: config.llm.hfDefaultModel,
      hfToken: mask(config.llm.hfToken),
      ollabridgeUrl: config.llm.ollabridgeUrl,
      ollabridgeApiKey: mask(config.llm.ollabridgeApiKey),
      openaiApiKey: mask(config.llm.openaiApiKey),
      anthropicApiKey: mask(config.llm.anthropicApiKey),
      groqApiKey: mask(config.llm.groqApiKey),
      watsonxApiKey: mask(config.llm.watsonxApiKey),
      watsonxProjectId: config.llm.watsonxProjectId,
      watsonxUrl: config.llm.watsonxUrl,
      // Computed status flags — derived server-side so UI can show chips.
      ollabridgeConfigured: !!config.llm.ollabridgeUrl,
      hfConfigured: hasSecret(config.llm.hfToken),
      openaiConfigured: hasSecret(config.llm.openaiApiKey),
      anthropicConfigured: hasSecret(config.llm.anthropicApiKey),
      groqConfigured: hasSecret(config.llm.groqApiKey),
      watsonxConfigured: hasSecret(config.llm.watsonxApiKey) && !!config.llm.watsonxProjectId,
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
      // Non-secret fields — assign directly.
      if (body.llm.defaultPreset !== undefined) current.llm.defaultPreset = body.llm.defaultPreset;
      if (body.llm.ollamaUrl !== undefined) current.llm.ollamaUrl = body.llm.ollamaUrl;
      if (body.llm.hfDefaultModel !== undefined) current.llm.hfDefaultModel = body.llm.hfDefaultModel;
      if (body.llm.ollabridgeUrl !== undefined) current.llm.ollabridgeUrl = body.llm.ollabridgeUrl;
      if (body.llm.watsonxProjectId !== undefined) current.llm.watsonxProjectId = body.llm.watsonxProjectId;
      if (body.llm.watsonxUrl !== undefined) current.llm.watsonxUrl = body.llm.watsonxUrl;

      // Secret fields — skip if value is the redacted placeholder.
      const setSecret = (field: keyof ServerConfig['llm'], value: any) => {
        if (value !== undefined && value !== '••••••••') {
          (current.llm as any)[field] = value;
        }
      };
      setSecret('hfToken', body.llm.hfToken);
      setSecret('ollabridgeApiKey', body.llm.ollabridgeApiKey);
      setSecret('openaiApiKey', body.llm.openaiApiKey);
      setSecret('anthropicApiKey', body.llm.anthropicApiKey);
      setSecret('groqApiKey', body.llm.groqApiKey);
      setSecret('watsonxApiKey', body.llm.watsonxApiKey);
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
