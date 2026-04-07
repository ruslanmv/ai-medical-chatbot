import type { MetadataRoute } from "next";

/**
 * Next.js native manifest route. Served at /manifest.webmanifest by
 * the framework itself (not as a static file) so it bypasses Vercel's
 * Deployment Protection on preview branches.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MedOS — your medical assistant",
    short_name: "MedOS",
    description:
      "Free AI medical assistant. 20 languages. No sign-up. Private.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    theme_color: "#3B82F6",
    background_color: "#F7F9FB",
    categories: ["health", "medical", "lifestyle"],
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Ask a health question",
        short_name: "Ask",
        url: "/?source=shortcut",
      },
      {
        name: "Health Dashboard",
        short_name: "Health",
        url: "/?view=health-dashboard",
      },
    ],
    prefer_related_applications: false,
  };
}
