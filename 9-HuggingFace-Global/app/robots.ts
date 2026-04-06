import type { MetadataRoute } from 'next';

const SITE_URL = 'https://ruslanmv-medibot.hf.space';

/**
 * Permissive robots.txt — we want every crawler to index the public
 * pages (home, /symptoms, /stats). API routes are disallowed because
 * they return dynamic or privacy-sensitive data (geo lookup, chat
 * stream, session counter).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/symptoms', '/stats'],
        disallow: ['/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
