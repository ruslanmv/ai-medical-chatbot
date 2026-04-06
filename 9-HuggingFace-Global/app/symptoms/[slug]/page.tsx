import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ShieldCheck, ChevronLeft, ArrowRight } from 'lucide-react';
import {
  getSymptomBySlug,
  getAllSymptomSlugs,
  type Symptom,
} from '@/lib/symptoms';

const SITE_URL = 'https://ruslanmv-medibot.hf.space';

interface Params {
  params: { slug: string };
}

/**
 * Pre-generate every symptom page at build time so they are fully static
 * (and cacheable by HF Spaces' CDN / every downstream proxy).
 */
export function generateStaticParams() {
  return getAllSymptomSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  const symptom = getSymptomBySlug(params.slug);
  if (!symptom) return { title: 'Symptom not found — MedOS' };

  const ogUrl = `${SITE_URL}/api/og?q=${encodeURIComponent(symptom.headline)}`;
  const canonical = `${SITE_URL}/symptoms/${symptom.slug}`;

  return {
    title: symptom.title,
    description: symptom.metaDescription,
    alternates: { canonical },
    openGraph: {
      title: symptom.title,
      description: symptom.metaDescription,
      url: canonical,
      siteName: 'MedOS',
      type: 'article',
      images: [{ url: ogUrl, width: 1200, height: 630, alt: symptom.headline }],
    },
    twitter: {
      card: 'summary_large_image',
      title: symptom.title,
      description: symptom.metaDescription,
      images: [ogUrl],
    },
  };
}

export default function SymptomPage({ params }: Params) {
  const symptom = getSymptomBySlug(params.slug);
  if (!symptom) return notFound();

  // Per-page FAQPage JSON-LD so Google can mine each entry as a rich
  // snippet independently from the root layout's global FAQPage.
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: symptom.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  // MedicalCondition JSON-LD — helps Google classify the page for the
  // Health Knowledge Graph.
  const medicalConditionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MedicalCondition',
    name: symptom.headline,
    description: symptom.summary,
    signOrSymptom: symptom.redFlags.map((r) => ({
      '@type': 'MedicalSymptom',
      name: r,
    })),
    possibleTreatment: symptom.selfCare.map((s) => ({
      '@type': 'MedicalTherapy',
      name: s,
    })),
  };

  const chatDeepLink = `/?q=${encodeURIComponent(
    `I want to ask about ${symptom.headline.toLowerCase()}`,
  )}`;

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(medicalConditionJsonLd) }}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-32">
        {/* Back link */}
        <Link
          href="/symptoms"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-teal-300 transition-colors mb-6"
        >
          <ChevronLeft size={16} />
          All symptoms
        </Link>

        {/* Hero */}
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-400 mb-2">
            Symptom guide
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-50 tracking-tight mb-4">
            {symptom.headline}
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            {symptom.summary}
          </p>
          <div className="mt-6 inline-flex items-center gap-1.5 text-xs text-teal-300 bg-teal-500/10 border border-teal-500/30 px-3 py-1.5 rounded-full font-semibold">
            <ShieldCheck size={12} />
            Aligned with WHO · CDC · NHS guidance
          </div>
        </header>

        {/* Red flags — first, highest visual priority */}
        <Section title="When to seek emergency care" danger>
          <ul className="space-y-2">
            {symptom.redFlags.map((r) => (
              <li key={r} className="flex items-start gap-2 text-slate-200">
                <AlertTriangle
                  size={16}
                  className="flex-shrink-0 text-red-400 mt-0.5"
                />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Safe self-care at home">
          <ul className="space-y-2">
            {symptom.selfCare.map((s) => (
              <li key={s} className="flex items-start gap-2 text-slate-200">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="When to see a clinician">
          <ul className="space-y-2">
            {symptom.whenToSeekCare.map((w) => (
              <li key={w} className="flex items-start gap-2 text-slate-200">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* FAQ — also rendered for humans, not just search engines */}
        <Section title="Frequently asked questions">
          <div className="space-y-5">
            {symptom.faqs.map((f) => (
              <div key={f.q}>
                <h3 className="font-bold text-slate-100 mb-1">{f.q}</h3>
                <p className="text-slate-300 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Primary CTA into the live chatbot */}
        <div className="mt-10 rounded-2xl border border-teal-500/30 bg-gradient-to-br from-blue-900/40 to-teal-900/30 p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-2">
            Ask the live assistant
          </p>
          <h2 className="text-2xl font-bold text-slate-50 mb-2 tracking-tight">
            Get a personalized answer in your language.
          </h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            MedOS is free, private, and takes no account. Describe your
            situation and get step-by-step guidance.
          </p>
          <Link
            href={chatDeepLink}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 text-white font-bold hover:brightness-110 transition-all shadow-lg shadow-blue-500/30"
          >
            Ask about {symptom.headline.toLowerCase()}
            <ArrowRight size={18} />
          </Link>
        </div>

        <p className="mt-8 text-xs text-slate-500 leading-relaxed">
          This page is general patient education aligned with WHO, CDC, and
          NHS public guidance. It is not a diagnosis, prescription, or
          substitute for care from a licensed clinician. If symptoms are
          severe, worsening, or you are in doubt, contact a healthcare
          provider or your local emergency number immediately.
        </p>
      </div>
    </main>
  );
}

function Section({
  title,
  danger,
  children,
}: {
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`mt-8 rounded-2xl border p-5 ${
        danger
          ? 'border-red-500/40 bg-red-950/30'
          : 'border-slate-700/60 bg-slate-800/40'
      }`}
    >
      <h2
        className={`text-lg font-bold mb-3 tracking-tight ${
          danger ? 'text-red-300' : 'text-slate-100'
        }`}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
