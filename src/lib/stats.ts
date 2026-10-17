import statsData from '@data/stats.json';
import sectionsData from '@data/sections.json';
import type { Section, Stats } from '@/types';

/**
 * 轻量模块: 只包含统计与章节元信息, **不含 765 条条目数据**
 *
 * 为什么单独拆出来: `@/lib/entries` 静态导入 entries.json (2.4MB),
 * 任何 'use client' 组件只要从它那里引入 `stats` 一个数字, 就会把整包数据
 * 拖进客户端 bundle (实测 chunk 202 = 2447KB raw / ~890KB gzip)。
 * 需要 stats / 章节列表的客户端组件请从这里引入。
 */
export const stats = statsData as unknown as Stats;
export const allSections = sectionsData as unknown as Section[];

const sectionCaliber = new Map<number, Section['caliber']>(
  allSections.map((s) => [s.id, s.caliber]),
);

/** 章节口径 (sections.json 的真实字段) */
export function getSectionCaliber(sectionId: number): Section['caliber'] {
  return sectionCaliber.get(sectionId) ?? 'life';
}
