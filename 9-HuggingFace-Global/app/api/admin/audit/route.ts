import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { queryAudit, type AuditAction } from '@/lib/audit';

/**
 * GET /api/admin/audit — page through the forensic audit log.
 *
 * Query params (all optional):
 *   userId   filter by actor or target
 *   action   one of the typed AuditAction values (e.g. "login", "scan")
 *   since    ISO timestamp lower bound
 *   limit    page size (default 50, cap 500)
 *   offset   pagination offset (default 0)
 *
 * Response:
 *   { entries: [...], limit, offset, hasMore }
 *
 * Admin-only. Uses the existing queryAudit() helper (lib/audit.ts) so the
 * schema and indexes are owned by one module.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ACTIONS = new Set<AuditAction>([
  'login',
  'login_failed',
  'logout',
  'register',
  'verify_email',
  'password_reset_request',
  'password_reset',
  'password_change',
  'delete_account',
  'admin_login',
  'admin_action',
  'admin_user_delete',
  'admin_user_reset_password',
  'admin_config_update',
  'token_rotate',
  'chat',
  'scan',
  'health_data_write',
  'health_data_delete',
  'settings_update',
  'export_data',
]);

export async function GET(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const url = new URL(req.url);
  const userId = url.searchParams.get('userId') || undefined;
  const actionRaw = url.searchParams.get('action');
  const since = url.searchParams.get('since') || undefined;
  const limit = Math.min(
    500,
    Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)),
  );
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));

  // Reject unknown action strings so typos don't silently return nothing.
  let action: AuditAction | undefined;
  if (actionRaw) {
    if (!ALLOWED_ACTIONS.has(actionRaw as AuditAction)) {
      return NextResponse.json(
        { error: `Unknown action: ${actionRaw}` },
        { status: 400 },
      );
    }
    action = actionRaw as AuditAction;
  }

  // Request one extra row so we can cheaply compute hasMore without a
  // separate COUNT(*) query.
  const entries = queryAudit({ userId, action, since, limit: limit + 1, offset });
  const hasMore = entries.length > limit;
  if (hasMore) entries.pop();

  return NextResponse.json({ entries, limit, offset, hasMore });
}
