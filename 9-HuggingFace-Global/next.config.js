/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,

  // better-sqlite3 is a native module — exclude from bundling.
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },

  // Security + CORS headers
  async headers() {
    // Allow the Vercel frontend (and localhost for dev) to call our API.
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    const corsHeaders = [
      {
        key: 'Access-Control-Allow-Methods',
        value: 'GET, POST, PUT, DELETE, OPTIONS',
      },
      {
        key: 'Access-Control-Allow-Headers',
        value: 'Content-Type, Authorization',
      },
      {
        key: 'Access-Control-Allow-Credentials',
        value: 'true',
      },
      // If no ALLOWED_ORIGINS env, allow all (open API for dev/HF iframe).
      {
        key: 'Access-Control-Allow-Origin',
        value: allowedOrigins[0] || '*',
      },
    ];

    return [
      // CORS preflight for all /api/ routes
      {
        source: '/api/:path*',
        headers: corsHeaders,
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Note: HF Spaces renders apps inside an iframe — SAMEORIGIN blocks it.
          // Use CSP frame-ancestors instead (more flexible, same security).
          // { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // HSTS — only in production. Using includeSubDomains without
          // `preload` so operators can opt into the HSTS preload list
          // explicitly once they've confirmed every subdomain serves HTTPS.
          // Gated on NODE_ENV so local `next dev` over http still works.
          ...(process.env.NODE_ENV === 'production'
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains',
                },
              ]
            : []),
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' https: data: blob:",
              "connect-src 'self' https://router.huggingface.co https://api-inference.huggingface.co https://overpass-api.de https://nominatim.openstreetmap.org https://*.hf.space wss:",
              "frame-src 'self' https://www.openstreetmap.org",
              "frame-ancestors 'self' https://huggingface.co https://*.hf.space",
              "media-src 'self' blob:",
              "worker-src 'self' blob:",
            ].join('; '),
          },
          {
            key: 'Permissions-Policy',
            value: 'microphone=(self), camera=(self), geolocation=*',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
        ],
      },
    ];
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.huggingface.co' },
    ],
  },

  // Disable powered-by header
  poweredByHeader: false,

  // Compress responses
  compress: true,
};

module.exports = nextConfig;
