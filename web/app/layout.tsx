import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "MedOS — your worldwide medical assistant",
  description:
    "Tell MedOS what's bothering you. Instant, private, multilingual health guidance aligned with WHO, CDC, and NHS.",
  keywords: ["medical AI", "healthcare", "chatbot", "telemedicine", "WHO", "CDC"],
  authors: [{ name: "MedOS Team" }],
  openGraph: {
    title: "MedOS — your worldwide medical assistant",
    description:
      "Private, multilingual health guidance aligned with WHO, CDC, and NHS — available 24/7.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F9FB" },
    { media: "(prefers-color-scheme: dark)",  color: "#0B1220" },
  ],
};

/**
 * Inline pre-hydration script: reads the stored theme (or system
 * preference) and sets `<html class="dark">` BEFORE the first paint.
 * Prevents the light-flash when a dark-mode user refreshes.
 */
const themeBootstrap = `
(function() {
  try {
    var stored = localStorage.getItem('medos_theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = stored === 'dark' || (!stored && prefersDark) || (stored === 'system' && prefersDark);
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
