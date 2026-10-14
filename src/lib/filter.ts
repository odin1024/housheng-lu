import type { Entry, Filter } from '@/types';

export function applyFilter(entries: Entry[], filter: Partial<Filter>): Entry[] {
  let result = [...entries];

  if (filter.sections && filter.sections.length > 0) {
    result = result.filter((e) => filter.sections!.includes(e.section));
  }

  if (filter.ratios && filter.ratios.length > 0) {
    result = result.filter((e) => filter.ratios!.includes(e.ratio));
  }

  if (filter.calibers && filter.calibers.length > 0) {
    result = result.filter((e) => filter.calibers!.includes(e.caliber));
  }

  if (filter.evidenceLevels && filter.evidenceLevels.length > 0) {
    result = result.filter((e) => filter.evidenceLevels!.includes(e.evidenceLevel));
  }

  if (filter.costMoney && filter.costMoney.length > 0) {
    result = result.filter((e) => filter.costMoney!.includes(e.cost.money));
  }

  if (filter.costTime && filter.costTime.length > 0) {
    result = result.filter((e) => filter.costTime!.includes(e.cost.time));
  }

  if (filter.costWill && filter.costWill.length > 0) {
    result = result.filter((e) => filter.costWill!.includes(e.cost.will));
  }

  if (filter.query && filter.query.trim()) {
    const q = filter.query.toLowerCase().trim();
    result = result.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.plainLanguage.toLowerCase().includes(q) ||
        e.benefit.toLowerCase().includes(q),
    );
  }

  return result;
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
