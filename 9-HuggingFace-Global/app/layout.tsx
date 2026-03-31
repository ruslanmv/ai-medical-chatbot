import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MedOS Global - Free AI Medical Assistant',
  description:
    'Free AI medical chatbot for everyone. 20 languages. No sign-up. Works offline. Powered by OllaBridge-Cloud.',
  keywords: [
    'medical chatbot',
    'AI doctor',
    'free health advice',
    'medical AI',
    'symptom checker',
    'multilingual health',
  ],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MedOS',
  },
  openGraph: {
    title: 'MedOS Global - Free AI Medical Assistant',
    description:
      'Free AI medical chatbot. 20 languages. No sign-up. Works offline.',
    type: 'website',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MedOS Global - Free AI Medical Assistant',
    description:
      'Free AI medical chatbot. 20 languages. No sign-up. Works offline.',
    images: ['/og-image.png'],
  },
  robots: 'index, follow',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0f172a',
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
