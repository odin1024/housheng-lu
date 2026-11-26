/**
 * 客户端条目**摘要** —— 轻量版数据
 *
 * 为什么有这个东西:
 *   原本所有客户端组件都从 `@/lib/entries` 取数据, 那个模块 `import` 了完整的
 *   `data/entries.json` (1.3MB), webpack 就把整份塞进 client chunk ——
 *   实测单个 chunk 2527KB, 其中数据 1326KB。
 *
 *   但筛选 / 列表 / 矩阵 / 海报**根本用不到** benefit、source、remark 这三个字段,
 *   它们占了全量数据的 70%。所以:
 *     · 常驻: entry-summaries.json (256KB, 19%)
 *     · 按需: 重字段切成 public/entry-detail/<id>.json, 展开时 fetch (单个约 1.3KB)
 *
 * 见 lib/entry-detail.ts (加载器) 与 scripts/gen-entry-summaries.mjs (生成器)。
 */
import summariesData from '@data/entry-summaries.json';
import type { EntrySummary } from '@/types';
import { priority } from './priority';
import { allSections, stats } from './stats';

export { allSections, stats };

/**
 * 摘要态里的 ratio 是解析脚本填的默认值 (原书没有这个字段),
 * 这里用 priority() 重新折算 —— 与 lib/entries.ts 保持同一口径。
 */
export const allSummaries: EntrySummary[] = (summariesData as unknown as EntrySummary[]).map((e) => ({
  ...e,
  ratio: priority(e),
}));

/** id → 摘要 的索引, 避免每次 find */
const summaryIndex = new Map<string, EntrySummary>(allSummaries.map((e) => [e.id, e]));

export function getSummaryById(id: string): EntrySummary | undefined {
  return summaryIndex.get(id);
}

export function getSummariesBySection(sectionNum: number): EntrySummary[] {
  return allSummaries.filter((e) => e.section === sectionNum);
}
