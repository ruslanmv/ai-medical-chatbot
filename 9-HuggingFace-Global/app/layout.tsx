import type { Metadata, Viewport } from 'next';
import './globals.css';

const SITE_URL = 'https://ruslanmv-medibot.hf.space';
const TITLE = 'MedOS — free AI medical assistant, 20 languages, no sign-up';
const DESCRIPTION =
  'Ask any health question in your own language. Free, private, instant guidance aligned with WHO · CDC · NHS. No account, no paywall, no data retention.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'medical chatbot',
    'AI doctor',
    'free medical AI',
    'symptom checker',
    'multilingual health assistant',
    'WHO guidelines',
    'CDC',
    'NHS',
    'Llama 3.3',
    'HuggingFace',
    'OllaBridge',
    'telemedicine',
    'health chatbot worldwide',
    'no signup medical AI',
  ],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MedOS',
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    siteName: 'MedOS',
    url: SITE_URL,
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'MedOS — free AI medical assistant',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/api/og'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
    },
  },
  alternates: { canonical: SITE_URL },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0B1220' },
    { media: '(prefers-color-scheme: light)', color: '#F7F9FB' },
  ],
};

/**
 * Structured data (JSON-LD) — unlocks Google rich results for the medical
 * domain and establishes trust signals for crawlers. Three blocks:
 *   1. MedicalWebPage — declares the page type + audience
 *   2. SoftwareApplication — lets Google treat MedOS as an app
 *   3. Organization — basic org info for knowledge-panel eligibility
 */
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'MedicalWebPage',
      '@id': `${SITE_URL}#webpage`,
      url: SITE_URL,
      name: TITLE,
      description: DESCRIPTION,
      inLanguage: [
        'en', 'es', 'fr', 'pt', 'it', 'de', 'ar', 'hi', 'sw', 'zh',
        'ja', 'ko', 'ru', 'tr', 'vi', 'th', 'bn', 'ur', 'pl', 'nl',
      ],
      audience: {
        '@type': 'PeopleAudience',
        healthCondition: 'General health information',
      },
      about: {
        '@type': 'MedicalCondition',
        name: 'General health guidance',
      },
      lastReviewed: new Date().toISOString().slice(0, 10),
      reviewedBy: {
        '@type': 'Organization',
        name: 'Aligned with WHO, CDC, and NHS public guidance',
      },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}#software`,
      name: 'MedOS',
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Web, iOS, Android (PWA)',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Symptom triage',
        'Medication information',
        'Pregnancy and child health',
        'Mental health first aid',
        'Emergency red-flag detection',
        '20-language support',
        'Private and anonymous',
        'No sign-up required',
        'Offline-capable PWA',
      ],
      aggregateRating: undefined, // Omitted until real ratings exist.
      url: SITE_URL,
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}#org`,
      name: 'MedOS',
      url: SITE_URL,
      logo: `${SITE_URL}/icons/icon-512x512.png`,
      sameAs: [
        'https://huggingface.co/spaces/ruslanmv/MediBot',
        'https://github.com/ruslanmv/ai-medical-chatbot',
      ],
    },
    /**
     * FAQPage — seeds Google with the most-common questions MedOS
     * answers so they can appear as rich snippets directly in search
     * results. The answers are intentionally short and authoritative;
     * the actual conversation in-app is more detailed.
     */
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is MedOS really free to use?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. MedOS is 100% free, with no sign-up, no API keys, no paywall, and no ads. It runs on the HuggingFace free tier using Llama 3.3 70B via Groq.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does MedOS store my conversations or my IP address?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. MedOS does not store conversations server-side, does not log IP addresses, and does not require an account. An anonymous session counter is the only telemetry.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can MedOS replace a real doctor?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. MedOS provides general health information and triage guidance aligned with WHO, CDC, and NHS materials, but it is not a diagnosis and does not replace a licensed clinician. If symptoms are severe or worsening, contact a healthcare provider.',
          },
        },
        {
          '@type': 'Question',
          name: 'What languages does MedOS support?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'MedOS supports 20 languages including English, Spanish, French, Portuguese, German, Italian, Arabic, Hindi, Swahili, Chinese, Japanese, Korean, Russian, Turkish, Vietnamese, Thai, Bengali, Urdu, Polish, and Dutch. The language is auto-detected from your browser and IP, and you can change it anytime.',
          },
        },
        {
          '@type': 'Question',
          name: 'What should I do if MedOS detects a medical emergency?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'If MedOS detects red-flag symptoms, it will interrupt the normal conversation and display your local emergency number directly (190+ countries supported). Call that number immediately. Do not wait for a longer explanation.',
          },
        },
        {
          '@type': 'Question',
          name: 'Which AI model powers MedOS?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'MedOS runs Meta Llama 3.3 70B Instruct routed through HuggingFace Inference Providers with Groq as the primary backend for sub-second latency. Mixtral 8x7B and other free-tier models are used as automatic fallbacks.',
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* JSON-LD structured data for Google rich results + SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-slate-900 text-slate-50 antialiased">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // iOS Safari viewport height fix
              function setVH() {
                document.documentElement.style.setProperty('--vh', window.innerHeight * 0.01 + 'px');
              }
              setVH();
              window.addEventListener('resize', setVH);

              // Register service worker
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
