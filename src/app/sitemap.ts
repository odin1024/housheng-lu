import type { MetadataRoute } from 'next';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { allEntries } from '@/lib/entries';

// 读取上游同步时间
function getLastSync(): Date {
  try {
    const syncLogPath = join(process.cwd(), 'data', 'sync-log.json');
    if (existsSync(syncLogPath)) {
      const log = JSON.parse(readFileSync(syncLogPath, 'utf-8'));
      if (log.lastSync) return new Date(log.lastSync);
    }
  } catch {}
  return new Date();
}

// 读取每个章节的最后修改时间 (从上游 git)
function getSectionModified(): Map<number, Date> {
  const map = new Map<number, Date>();
  try {
    const upstreamPath = join(process.cwd(), 'content', 'upstream');
    if (existsSync(upstreamPath)) {
      const { execSync } = require('node:child_process');
      // 拿到上游最新 commit 时间作为基准
      const hash = execSync('git rev-parse HEAD', { cwd: upstreamPath, encoding: 'utf-8' }).trim();
      const dateStr = execSync(`git show -s --format=%cI ${hash}`, { cwd: upstreamPath, encoding: 'utf-8' }).trim();
      if (dateStr) {
        const d = new Date(dateStr);
        // 每个章节共用一个时间
        for (let i = 1; i <= 34; i++) map.set(i, d);
      }
    }
  } catch {}
  return map;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://housheng.lu';
  const lastSync = getLastSync();
  const sectionDates = getSectionModified();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: lastSync, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/explore`, lastModified: lastSync, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/emergency`, lastModified: lastSync, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/my`, lastModified: lastSync, changeFrequency: 'never', priority: 0.3 },
    { url: `${baseUrl}/about`, lastModified: lastSync, changeFrequency: 'monthly', priority: 0.5 },
  ];

  const entryPages: MetadataRoute.Sitemap = allEntries.map((e) => {
    const sectionDate = sectionDates.get(e.section) ?? lastSync;
    return {
      url: `${baseUrl}/book/${e.id}`,
      lastModified: sectionDate,
      changeFrequency: 'weekly',
      priority: 0.7,
    };
  });

  return [...staticPages, ...entryPages];
}
