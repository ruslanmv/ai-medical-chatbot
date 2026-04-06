import type { MetadataRoute } from 'next';
import { getAllSymptomSlugs } from '@/lib/symptoms';

const SITE_URL = 'https://ruslanmv-medibot.hf.space';

/**
 * Static sitemap auto-generated from the symptom catalog so Google picks
 * up every SEO landing page on day one. Served at `/sitemap.xml` by Next.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL,                  lastModified: now, changeFrequency: 'daily',  priority: 1.0 },
    { url: `${SITE_URL}/symptoms`,    lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/stats`,       lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
  ];

  const symptomPages: MetadataRoute.Sitemap = getAllSymptomSlugs().map((slug) => ({
    url: `${SITE_URL}/symptoms/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticPages, ...symptomPages];
}
