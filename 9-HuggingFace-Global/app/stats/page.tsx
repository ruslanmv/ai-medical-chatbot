'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Globe2,
  ShieldCheck,
  Clock4,
  ArrowRight,
  Languages,
} from 'lucide-react';
import TrustBar from '@/components/chat/TrustBar';

interface SessionsResponse {
  count: number;
  sessions: number;
  base: number;
}

const LANGUAGES = [
  'English',
  'Español',
  'Français',
  'Português',
  'Italiano',
  'Deutsch',
  'العربية',
  'हिन्दी',
  'Kiswahili',
  '中文',
  '日本語',
  '한국어',
  'Русский',
  'Türkçe',
  'Tiếng Việt',
  'ไทย',
  'বাংলা',
  'اردو',
  'Polski',
  'Nederlands',
];

/**
 * Public transparency page. Shows the anonymous global session counter,
 * supported languages, trust metrics, and the MedOS health-posture
 * summary. Drives social proof ("N people helped this session") and is
 * a natural link target from Product Hunt / Twitter / press.
 *
 * Server-rendered is tempting here, but we keep it client-side so the
 * counter animates as it loads — tiny extra bundle, big UX win.
 */
export default function StatsPage() {
  const [data, setData] = useState<SessionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/sessions', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: SessionsResponse | null) => {
        if (!cancelled && d) {
          setData(d);
          animateTo(d.count, setDisplayCount);
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-32">
        <header className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-400 mb-2">
            MedOS transparency
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-50 tracking-tight mb-3">
            The numbers behind MedOS
          </h1>
          <p className="text-lg text-slate-300 max-w-xl mx-auto leading-relaxed">
            Free health guidance, open numbers. No tracking of people —
            only a single anonymous counter that ticks once per session.
          </p>
        </header>

        {/* Hero counter */}
        <section className="mb-10 rounded-3xl border border-teal-500/30 bg-gradient-to-br from-blue-900/30 to-teal-900/20 p-8 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-300 bg-teal-500/10 border border-teal-500/30 px-3 py-1 rounded-full mb-4">
            <Activity size={12} className="animate-pulse" />
            Live session counter
          </div>
          <div className="text-6xl sm:text-7xl font-black text-slate-50 tracking-tight tabular-nums">
            {loading ? (
              <span className="text-slate-600">…</span>
            ) : (
              formatNumber(displayCount)
            )}
          </div>
          <p className="text-sm text-slate-400 mt-3">
            conversations MedOS has helped with, anonymously, since launch
          </p>
        </section>

        {/* Cards grid */}
        <section className="grid sm:grid-cols-2 gap-4 mb-10">
          <StatCard
            Icon={Globe2}
            label="Countries supported"
            value="190+"
            description="Emergency numbers localized per region"
          />
          <StatCard
            Icon={Languages}
            label="Languages"
            value="20"
            description="Auto-detected from browser and IP"
          />
          <StatCard
            Icon={ShieldCheck}
            label="Privacy"
            value="Zero PII"
            description="No accounts, no IP logging, no conversation storage"
          />
          <StatCard
            Icon={Clock4}
            label="Availability"
            value="24/7"
            description="Free forever on HuggingFace Spaces"
          />
        </section>

        {/* Languages strip */}
        <section className="mb-10 rounded-2xl border border-slate-700/60 bg-slate-800/50 p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 inline-flex items-center gap-2">
            <Languages size={14} />
            Supported languages
          </h2>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <span
                key={l}
                className="px-3 py-1.5 rounded-full text-sm font-medium text-slate-200 bg-slate-700/60 border border-slate-600/50"
              >
                {l}
              </span>
            ))}
          </div>
        </section>

        {/* Trust bar */}
        <section className="mb-10">
          <TrustBar />
        </section>

        {/* CTA */}
        <div className="rounded-2xl border border-teal-500/30 bg-gradient-to-br from-blue-900/40 to-teal-900/30 p-6 text-center">
          <h2 className="text-2xl font-bold text-slate-50 mb-2 tracking-tight">
            Ready to ask your own question?
          </h2>
          <p className="text-slate-300 mb-4">
            Free. Private. In your language. No sign-up.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 text-white font-bold hover:brightness-110 transition-all shadow-lg shadow-blue-500/30"
          >
            Open MedOS
            <ArrowRight size={18} />
          </Link>
        </div>

        {data && (
          <p className="mt-6 text-center text-xs text-slate-500">
            Counter is a single integer stored server-side at{' '}
            <code className="text-slate-400">/api/sessions</code>. No
            request is ever correlated to an individual.
          </p>
        )}
      </div>
    </main>
  );
}

function StatCard({
  Icon,
  label,
  value,
  description,
}: {
  Icon: any;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-5">
      <div className="flex items-center gap-2 text-teal-400 mb-3">
        <Icon size={16} />
        <span className="text-xs font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="text-3xl font-black text-slate-50 tracking-tight mb-1">
        {value}
      </div>
      <p className="text-sm text-slate-400 leading-snug">{description}</p>
    </div>
  );
}

/** Format a number with locale-aware thousands separators. */
function formatNumber(n: number): string {
  try {
    return new Intl.NumberFormat(undefined).format(n);
  } catch {
    return String(n);
  }
}

/**
 * Animate a counter from zero to `target` over ~1.2s using an ease-out
 * curve. Runs synchronously inside `requestAnimationFrame` so it never
 * blocks the main thread.
 */
function animateTo(target: number, setValue: (n: number) => void): void {
  if (typeof window === 'undefined') {
    setValue(target);
    return;
  }
  const duration = 1200;
  const start = performance.now();
  const step = (t: number) => {
    const elapsed = t - start;
    const progress = Math.min(1, elapsed / duration);
    const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
    setValue(Math.round(target * eased));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
