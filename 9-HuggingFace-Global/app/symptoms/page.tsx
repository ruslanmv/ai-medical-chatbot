import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { SYMPTOMS } from '@/lib/symptoms';

const SITE_URL = 'https://ruslanmv-medibot.hf.space';

export const metadata: Metadata = {
  title: 'Symptom guides — free, WHO-aligned | MedOS',
  description:
    'Browse evidence-based symptom guides: causes, safe self-care, red flags, and when to seek care. Free, multilingual, and aligned with WHO, CDC, and NHS.',
  alternates: { canonical: `${SITE_URL}/symptoms` },
  openGraph: {
    title: 'Symptom guides — free, WHO-aligned | MedOS',
    description:
      'Browse evidence-based symptom guides: causes, safe self-care, red flags, and when to seek care.',
    url: `${SITE_URL}/symptoms`,
    images: [`${SITE_URL}/api/og?q=${encodeURIComponent('Symptom guides')}`],
  },
};

/**
 * Symptom catalog index. Static, cacheable, zero JS-on-load cost.
 * Works as a landing hub from organic search queries like
 * "medos symptoms" or "symptom checker".
 */
export default function SymptomsIndexPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-32">
        <header className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-400 mb-2">
            Free patient guides
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-50 tracking-tight mb-3">
            Symptom guides
          </h1>
          <p className="text-lg text-slate-300 max-w-xl mx-auto leading-relaxed">
            Clear, trustworthy answers to the most common health
            questions. Free, multilingual, and aligned with WHO, CDC,
            and NHS guidance.
          </p>
          <div className="mt-5 inline-flex items-center gap-1.5 text-xs text-teal-300 bg-teal-500/10 border border-teal-500/30 px-3 py-1.5 rounded-full font-semibold">
            <ShieldCheck size={12} />
            Reviewed against WHO · CDC · NHS public guidance
          </div>
        </header>

        <div className="grid sm:grid-cols-2 gap-3">
          {SYMPTOMS.map((s) => (
            <Link
              key={s.slug}
              href={`/symptoms/${s.slug}`}
              className="group p-5 rounded-2xl border border-slate-700/60 bg-slate-800/60 hover:border-teal-500/50 hover:bg-teal-500/5 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-slate-100 text-lg mb-1 tracking-tight">
                    {s.headline}
                  </h2>
                  <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">
                    {s.summary}
                  </p>
                </div>
                <ChevronRight
                  size={18}
                  className="flex-shrink-0 text-slate-500 group-hover:text-teal-400 transition-colors mt-1"
                />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 text-white font-bold hover:brightness-110 transition-all shadow-lg shadow-blue-500/30"
          >
            Open the live MedOS assistant
            <ChevronRight size={18} />
          </Link>
        </div>
      </div>
    </main>
  );
}
