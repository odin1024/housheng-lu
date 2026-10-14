import entriesData from '@data/entries.json';
import sectionsData from '@data/sections.json';
import statsData from '@data/stats.json';
import type { Entry, Section, Stats } from '@/types';

export const allEntries = entriesData as unknown as Entry[];
export const allSections = sectionsData as unknown as Section[];
export const stats = statsData as unknown as Stats;

export function getEntryById(id: string): Entry | undefined {
  return allEntries.find((e) => e.id === id);
}

export function getEntriesBySection(sectionNum: number): Entry[] {
  return allEntries.filter((e) => e.section === sectionNum);
}

export function getEntriesByCaliber(caliber: string): Entry[] {
  return allEntries.filter((e) => e.caliber === caliber);
}

export function getTopEntries(limit = 50): Entry[] {
  // 优先 A 级 + 极高
  return allEntries
    .filter((e) => e.evidenceLevel === 'A')
    .slice(0, limit);
}

export function getEmergencyEntries(): Entry[] {
  return allEntries.filter((e) => e.section === 13);
}

export function getRelatedEntries(entry: Entry): Entry[] {
  return entry.remark
    ?.split(/[,，、]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/第\s*(\d+)\s*节/);
      if (m) {
        return allEntries.filter((e) => e.section === parseInt(m[1], 10)).slice(0, 3);
      }
      return [];
    })
    .flat()
    .slice(0, 5) ?? [];
}
