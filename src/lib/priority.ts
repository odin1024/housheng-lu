import type { Entry, Ratio } from '@/types';

/**
 * 本站派生指标 (不是原书字段)
 *
 * 原书每条只有: 成本 / 说人话 / 收益 / 证据等级 / 来源 / 备注 / 争议
 * 其中"收益"是带出处的具体数字, **没有**逐条的"收益大小/性价比"分级。
 * 所以本站不假装有"收益轴", 只基于原书真实字段做可解释的折算:
 *   证据等级 (原书字段, A/B/C) × 成本折算 (钱+时间+毅力) → 先做优先级
 * 折算规则全部写在下面的注释里, 页面也会标注"本站派生"。
 */

const COST_MONEY: Record<string, number> = { free: 0, low: 1, medium: 2, high: 3 };
const COST_TIME: Record<string, number> = { instant: 0, hours: 1, daily: 2 };
const COST_WILL: Record<string, number> = { none: 0, some: 1, high: 2 };

/** 成本分 0-7: 钱 + 时间 + 毅力 (数值越小越"顺手") */
export function costScore(e: Entry): number {
  return (
    (COST_MONEY[e.cost?.money] ?? 0) +
    (COST_TIME[e.cost?.time] ?? 0) +
    (COST_WILL[e.cost?.will] ?? 0)
  );
}

export type CostBand = 'zero' | 'low' | 'mid' | 'high';

/** 成本档: 0 分=零成本, 1 分=低成本, 2-3 分=中成本, ≥4 分=高成本 */
export function costBand(e: Entry): CostBand {
  const s = costScore(e);
  if (s === 0) return 'zero';
  if (s === 1) return 'low';
  if (s <= 3) return 'mid';
  return 'high';
}

export const COST_BAND_LABEL: Record<CostBand, string> = {
  zero: '零成本',
  low: '低成本',
  mid: '中成本',
  high: '高成本',
};

/** 成本档的通俗说明 (鼠标提示用) */
export const COST_BAND_HINT: Record<CostBand, string> = {
  zero: '不花钱、当场能做、不用毅力',
  low: '只占一点点钱或时间',
  mid: '要花钱、要花时间、或要一点毅力',
  high: '花钱又费时, 或需要长期坚持',
};

export const COST_BANDS: CostBand[] = ['zero', 'low', 'mid', 'high'];

/** 证据等级 (原书字段) 由硬到软 */
export const EVIDENCE_ROWS: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];

/**
 * 先做优先级 (本站派生)
 * 规则: 证据越硬、成本越低 → 越该先做
 *   A 级 + 零成本            → 极高
 *   A 级 + 低成本 / B 级 + 零成本 → 高
 *   其余                     → 一般
 */
export function priority(e: Entry): Ratio {
  const band = costBand(e);
  const lv = e.evidenceLevel;
  if (lv === 'A' && band === 'zero') return 'extreme';
  if ((lv === 'A' && band === 'low') || (lv === 'B' && band === 'zero')) return 'high';
  return 'normal';
}

/** 一句话解释这个优先级是怎么来的 */
export function priorityReason(e: Entry): string {
  return `${e.evidenceLevel} 级证据 + ${COST_BAND_LABEL[costBand(e)]}`;
}

/** 排序键: 优先级高→低, 同级按证据等级, 再按成本分 */
export function prioritySortKey(e: Entry): [number, number, number] {
  const p = priority(e);
  const pRank = p === 'extreme' ? 0 : p === 'high' ? 1 : 2;
  const eRank = e.evidenceLevel === 'A' ? 0 : e.evidenceLevel === 'B' ? 1 : 2;
  return [pRank, eRank, costScore(e)];
}

/** 按"先做"顺序排序 (不改原数组) */
export function sortByPriority(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    const ka = prioritySortKey(a);
    const kb = prioritySortKey(b);
    for (let i = 0; i < ka.length; i++) {
      if (ka[i] !== kb[i]) return ka[i] - kb[i];
    }
    return a.id.localeCompare(b.id);
  });
}
