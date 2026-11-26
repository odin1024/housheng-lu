/**
 * 厚生錄 · 核心数据结构
 */

export type EvidenceLevel = 'A' | 'B' | 'C';
export type CostMoney = 'free' | 'low' | 'medium' | 'high';
export type CostTime = 'instant' | 'hours' | 'daily';
export type CostWill = 'none' | 'some' | 'high';
export type Caliber = 'life' | 'money' | 'time' | 'freedom';
export type Ratio = 'extreme' | 'high' | 'normal';
export type BenefitMagnitude = 'large' | 'medium' | 'small';

export interface Entry {
  id: string;
  number: number;
  section: number;
  title: string;
  cost: {
    money: CostMoney;
    time: CostTime;
    will: CostWill;
    detail: string;
  };
  plainLanguage: string;
  benefit: string;
  evidenceLevel: EvidenceLevel;
  evidenceDetail?: string;
  source: string;
  sourceUrl?: string | null;
  controversy?: string;
  remark?: string;
  ratio: Ratio;
  caliber: Caliber;
  benefitMagnitude: BenefitMagnitude;
  syncDate: string;
}

/**
 * 条目**摘要** —— 客户端常驻的那一份
 *
 * 为什么单独拆一个类型:
 *   完整 Entry 里 benefit/source/remark 三个字段占了全量数据的 70%
 *   (source 445KB + benefit 308KB + remark 175KB, 实测总计 1326KB)。
 *   而筛选、列表展示、矩阵、海报**都用不到**这三个字段。
 *
 *   客户端只带摘要 (约 238KB), 重字段改成展开时按需 fetch
 *   `public/entry-detail/<id>.json` (单个约 1.3KB) —— 见 lib/entry-detail.ts。
 */
export interface EntrySummary {
  id: string;
  number: number;
  section: number;
  title: string;
  cost: {
    money: CostMoney;
    time: CostTime;
    will: CostWill;
    /** 摘要态没有"成本详述", 展开时从分片补齐 */
    detail?: string;
  };
  plainLanguage: string;
  evidenceLevel: EvidenceLevel;
  ratio: Ratio;
  caliber: Caliber;
  syncDate: string;
  /**
   * 关键词检索用的合并文本 (标题 + 说人话 + 收益的前若干字)
   *
   * 为什么需要: 客户端只有摘要, 而"收益"是重字段(308KB) 不能常驻。
   * 但只搜标题+说人话会漏掉"收益里才提到"的关键词。
   * 所以摘要里额外存一份**截断后的**收益文本, 体积可控 (见 gen-entry-summaries.mjs)。
   */
  searchText?: string;
}

/** 按需加载的重字段 (来自 public/entry-detail/<id>.json) */
export interface EntryDetail {
  id: string;
  benefit: string;
  source: string;
  sourceUrl?: string | null;
  evidenceDetail?: string;
  controversy?: string;
  remark?: string;
  /** cost.detail 跟重字段放一起, 避免摘要态也要带它 */
  costDetail?: string;
}

/** 摘要 + 已加载详情 = 可完整渲染的条目 */
export type EntryWithDetail = EntrySummary & Partial<EntryDetail>;

export interface Section {
  id: number;
  number: number;
  title: string;
  slug: string;
  caliber: Caliber;
  entryCount: number;
}

export interface SyncLog {
  lastSync: string;
  upstreamHash: string;
  upstreamUrl: string;
  upstreamTag: string;
  syncHistory: Array<{
    date: string;
    hash: string;
    change: string;
    status: string;
  }>;
}

export interface Stats {
  totalEntries: number;
  totalSections: number;
  evidenceA: number;
  evidenceB: number;
  evidenceC: number;
  generateDate: string;
}

export interface Filter {
  sections: number[];
  ratios: Ratio[];
  calibers: Caliber[];
  evidenceLevels: EvidenceLevel[];
  costMoney: CostMoney[];
  costTime: CostTime[];
  costWill: CostWill[];
  query: string;
}

export interface MyListItem {
  entryId: string;
  status: 'todo' | 'done' | 'saved';
  addedAt: string;
}
