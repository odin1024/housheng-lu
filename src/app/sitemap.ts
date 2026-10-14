import type { MetadataRoute } from 'next';
import { allEntries } from '@/lib/entries';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://housheng.lu';
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/explore`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/emergency`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/my`, lastModified: now, changeFrequency: 'never', priority: 0.3 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

  const entryPages: MetadataRoute.Sitemap = allEntries.map((e) => ({
    url: `${baseUrl}/book/${e.id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticPages, ...entryPages];
}
