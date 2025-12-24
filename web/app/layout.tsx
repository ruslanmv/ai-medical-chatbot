import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedOS - Medical AI Assistant Portal",
  description: "Enterprise-grade medical AI chatbot with multi-provider support",
  keywords: ["medical AI", "healthcare", "chatbot", "telemedicine"],
  authors: [{ name: "MedOS Team" }],
  openGraph: {
    title: "MedOS - Medical AI Assistant Portal",
    description: "Enterprise-grade medical AI chatbot with multi-provider support",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
