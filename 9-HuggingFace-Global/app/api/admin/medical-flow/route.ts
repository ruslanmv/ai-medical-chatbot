import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { summary } from '@/lib/medical-flow/audit';

/**
 * GET /api/admin/medical-flow
 *
 * Returns a counts-by-kind / counts-by-care-level / counts-by-flow
 * summary of the medical-flow audit table for the most recent 7 days
 * (or `?sinceHours=N`). Powers the admin "Card Flow" panel and feeds
 * the marketing dashboard in benchmarks/.
 *
 * Admin-only. PHI-free — only structured aggregates.
 */
export async function GET(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  const url = new URL(req.url);
  const sinceHours = parseInt(url.searchParams.get('sinceHours') || '168', 10);
  const sinceISO = new Date(
    Date.now() - Math.max(1, sinceHours) * 3600 * 1000,
  ).toISOString();
  const data = summary({ sinceISO });
  return NextResponse.json({
    window: { sinceISO, hours: sinceHours },
    ...data,
    // Derived ratios that make the table easier to scan in the UI:
    //   gate_rate    = profile_gate / (profile_gate + greeting)
    //   urgent_share = urgent + emergency / total guidance
    derived: {
      gate_rate:
        data.by_kind.profile_gate && data.by_kind.greeting
          ? Number(
              (
                data.by_kind.profile_gate /
                (data.by_kind.profile_gate + data.by_kind.greeting)
              ).toFixed(3),
            )
          : 0,
      urgent_share: (() => {
        const urg = data.by_care_level.urgent || 0;
        const emer = data.by_care_level.emergency || 0;
        const all = Object.values(data.by_care_level).reduce(
          (a, b) => a + b,
          0,
        );
        return all > 0 ? Number(((urg + emer) / all).toFixed(3)) : 0;
      })(),
    },
  });
}
