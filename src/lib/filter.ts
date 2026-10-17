import type { Entry, Filter } from '@/types';

export function applyFilter(entries: Entry[], filter: Partial<Filter>): Entry[] {
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
      const inText =
        e.title.toLowerCase().includes(q) ||
        e.plainLanguage.toLowerCase().includes(q) ||
        e.benefit.toLowerCase().includes(q);
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
