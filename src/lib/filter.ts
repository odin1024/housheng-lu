import type { Entry, EntrySummary, Filter } from '@/types';

/**
 * 筛选: 章节 / 性价比 / 口径 / 证据等级 / 成本三维 / 关键词
 *
 * 客户端只拿到**摘要** (EntrySummary), 没有 benefit/source/remark 这些重字段。
 * 为了不损失检索能力, 摘要里保留:
 *   · title        —— 原书标题
 *   · plainLanguage —— 说人话 (原书的核心解释)
 *   · searchText   —— 额外拼一份"收益"的可检索摘要 (见 gen-entry-summaries.mjs)
 * 只搜 title+plainLanguage 会漏掉"收益里才提到"的关键词, 所以加了 searchText。
 */

/** 摘要里用于关键词检索的合并文本 */
function searchableText(e: EntrySummary): string {
  return `${e.title}\n${e.plainLanguage}\n${e.searchText ?? ''}`.toLowerCase();
}

/** 完整条目与摘要条目都能用 */
type Filterable = Entry | EntrySummary;

export function applyFilter<T extends Filterable>(entries: T[], filter: Partial<Filter>): T[] {
  if (
    !filter.sections?.length &&
    !filter.ratios?.length &&
    !filter.calibers?.length &&
    !filter.evidenceLevels?.length &&
    !filter.costMoney?.length &&
    !filter.costTime?.length &&
    !filter.costWill?.length &&
    !filter.query?.trim()
  ) {
    return entries; // 无任何筛选条件, 直接返回原引用
  }

  const q = filter.query?.toLowerCase().trim() || '';
  return entries.filter((e) => {
    if (filter.sections?.length && !filter.sections.includes(e.section)) return false;
    if (filter.ratios?.length && !filter.ratios.includes(e.ratio)) return false;
    if (filter.calibers?.length && !filter.calibers.includes(e.caliber)) return false;
    if (filter.evidenceLevels?.length && !filter.evidenceLevels.includes(e.evidenceLevel)) return false;
    if (filter.costMoney?.length && !filter.costMoney.includes(e.cost.money)) return false;
    if (filter.costTime?.length && !filter.costTime.includes(e.cost.time)) return false;
    if (filter.costWill?.length && !filter.costWill.includes(e.cost.will)) return false;
    if (q) {
      // 完整条目: 收益全文可搜; 摘要条目: 用合并后的 searchText
      const benefit = 'benefit' in e ? e.benefit : '';
      const inText =
        e.title.toLowerCase().includes(q) ||
        e.plainLanguage.toLowerCase().includes(q) ||
        benefit.toLowerCase().includes(q) ||
        searchableText(e).includes(q);
      if (!inText) return false;
    }
    return true;
  });
}

export const emptyFilter: Filter = {
  sections: [],
  ratios: [],
  calibers: [],
  evidenceLevels: [],
  costMoney: [],
  costTime: [],
  costWill: [],
  query: '',
};
