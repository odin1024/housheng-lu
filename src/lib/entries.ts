import entriesData from '@data/entries.json';
import type { Entry } from '@/types';
import { allSections, stats } from './stats';
import { priority } from './priority';

// stats / allSections 现在住在轻量模块 lib/stats.ts;
// 这里再导出一次是为了服务端旧引用不必全改, 客户端请直接引 @/lib/stats
export { allSections, stats };

/**
 * 数据读入时做两处校正 (数据文件里的字段是解析脚本的默认值, 不能直接用):
 *
 * 1. caliber (口径): 原书没有逐条口径, 但**章节**有明确口径
 *    (sections.json: life 11 / money 13 / time 3 / freedom 7)
 *    解析脚本早期把每条硬编码成 'life', 导致"口径"筛选形同虚设 → 这里按章节回填
 *
 * 2. ratio (性价比): 原书没有这个字段, 解析脚本填的是 'normal'
 *    → 改为用 priority() 折算, 并标注为"本站派生"(见 lib/priority.ts)
 *
 * benefitMagnitude 原书同样没有, 保留字段但不再用于展示 (见 /matrix 页面说明)
 */
const caliberOf = new Map(allSections.map((s) => [s.id, s.caliber]));

export const allEntries: Entry[] = (entriesData as unknown as Entry[]).map((e) => {
  const caliber = caliberOf.get(e.section) ?? e.caliber;
  const next: Entry = { ...e, caliber };
  next.ratio = priority(next);
  return next;
});

// 性能: 建 id 索引, 避免每次 allEntries.find
const entryIndex = new Map<string, Entry>(allEntries.map((e) => [e.id, e]));

export function getEntryById(id: string): Entry | undefined {
  return entryIndex.get(id);
}

export function getEntriesBySection(sectionNum: number): Entry[] {
  return allEntries.filter((e) => e.section === sectionNum);
}
