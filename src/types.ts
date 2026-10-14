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
