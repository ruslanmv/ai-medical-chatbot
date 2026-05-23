import { ImageResponse } from "next/og";

// Dynamic OpenGraph card. Next.js automatically wires this file into
// <meta property="og:image"> at /opengraph-image. It runs at the edge
// at request time so we don't have to ship a binary asset and the
// branding can evolve without regenerating PNGs.

export const runtime = "edge";

export const alt = "MedOS — your worldwide medical assistant";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background:
            "linear-gradient(135deg, #0EA5E9 0%, #2563EB 45%, #7C3AED 100%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: 700,
            }}
          >
            +
          </div>
          <div
            style={{
              fontSize: "30px",
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            MedOS
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              fontSize: "72px",
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              maxWidth: "950px",
            }}
          >
            Your worldwide medical assistant.
          </div>
          <div
            style={{
              fontSize: "30px",
              opacity: 0.92,
              lineHeight: 1.3,
              maxWidth: "900px",
              fontWeight: 400,
            }}
          >
            Private, multilingual health guidance aligned with WHO, CDC, and
            NHS — available 24/7.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: "22px",
            opacity: 0.85,
            fontWeight: 500,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <span>WHO</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>CDC</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>NHS</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
