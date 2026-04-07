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
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'microphone=(self), camera=(), geolocation=(self)',
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
