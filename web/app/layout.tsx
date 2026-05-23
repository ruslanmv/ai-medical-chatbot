import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

// Canonical site URL. NEXT_PUBLIC_SITE_URL lets us override per env
// (preview deployments, staging). Falls back to the production domain.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "https://ai-medical-chabot.com";

const SITE_NAME = "MedOS";
const SITE_TITLE = "MedOS — your worldwide medical assistant";
const SITE_DESCRIPTION_LONG =
  "Tell MedOS what's bothering you. Instant, private, multilingual health guidance aligned with WHO, CDC, and NHS.";
const SITE_DESCRIPTION_SHORT =
  "Private, multilingual health guidance aligned with WHO, CDC, and NHS — available 24/7.";

export const metadata: Metadata = {
  // metadataBase is required for `openGraph.url` and `openGraph.images`
  // to resolve relative URLs (Next.js emits a warning at build otherwise
  // and falls back to localhost, which kills link previews in
  // production).
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION_LONG,
  keywords: ["medical AI", "healthcare", "chatbot", "telemedicine", "WHO", "CDC"],
  authors: [{ name: "MedOS Team" }],
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION_SHORT,
    url: SITE_URL,
    locale: "en_US",
    // Image is supplied by app/opengraph-image.tsx (dynamic), which
    // Next.js automatically wires into <meta property="og:image"> when
    // present. Listing it here is redundant but makes the intent
    // explicit and gives explorers like Twitter's card validator a
    // direct hit.
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "MedOS — your worldwide medical assistant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION_SHORT,
    images: ["/twitter-image"],
    // No personal Twitter handle to avoid stale references; can be
    // added once a brand account exists.
  },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F9FB" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1220" },
  ],
};

/**
 * Inline pre-hydration script: reads the stored theme before first paint.
 */
const themeBootstrap = `
(function() {
  try {
    var stored = localStorage.getItem('medos_theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = stored === 'dark' || (stored === 'system' && prefersDark);
    if (isDark) document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
