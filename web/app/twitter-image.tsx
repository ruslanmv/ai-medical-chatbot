// Twitter card image. Next.js wires this into
// <meta name="twitter:image"> at /twitter-image. Re-uses the same
// renderer as opengraph-image so the two stay in sync — Twitter
// renders summary_large_image at the same 1200×630 ratio.
//
// `runtime` and `contentType` are inlined as string literals (instead
// of re-exported) because Next.js's static analysis can't follow
// re-exports for those route segment config fields.

import OpengraphImage from "./opengraph-image";

export const runtime = "edge";
export const alt = "MedOS — your worldwide medical assistant";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default OpengraphImage;
