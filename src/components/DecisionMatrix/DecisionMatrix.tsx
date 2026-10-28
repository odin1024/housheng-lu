'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { allEntries } from '@/lib/entries';
import { caliberLabel, caliberColor, CALIBERS } from '@/lib/labels';
import {
  COST_BANDS,
  COST_BAND_LABEL,
  COST_BAND_HINT,
  EVIDENCE_ROWS,
  costBand,
  costScore,
  priority,
  sortByPriority,
  type CostBand,
} from '@/lib/priority';
import type { Caliber, EvidenceLevel } from '@/types';

/**
 * 决策矩阵 (证据 × 成本)
 *
 * 纵轴 = 原书字段「证据等级」(A/B/C)      —— 真实数据
 * 横轴 = 成本折算 (钱 + 时间 + 毅力 3 档) —— 本站派生, 规则见 lib/priority.ts
 * 颜色 = 章节口径 (sections.json 的真实字段)
 *
 * 为什么没有"收益"轴: 原书只给了带出处的具体收益数字, 没有逐条的
 * "收益大小/性价比"分级。硬造一个收益轴会让所有点落在同一条线上(空的),
 * 所以这里改成用真实存在、且有区分度的两个维度, 并把"该先做什么"直接给出来。
 */

const CALIBER_DOT = caliberColor;

interface Cell {
  evidence: EvidenceLevel;
  band: CostBand;
  count: number;
  entries: ReturnType<typeof sortByPriority>;
}

export function DecisionMatrix({ className = '' }: { className?: string }) {
  const [caliber, setCaliber] = useState<Caliber | 'all'>('all');
  const [selected, setSelected] = useState<{ evidence: EvidenceLevel; band: CostBand }>({
    evidence: 'A',
    band: 'zero',
  });

  const filtered = useMemo(
    () => allEntries.filter((e) => caliber === 'all' || e.caliber === caliber),
    [caliber],
  );

  const cells = useMemo<Cell[]>(() => {
    const out: Cell[] = [];
    for (const evidence of EVIDENCE_ROWS) {
      for (const band of COST_BANDS) {
        const entries = sortByPriority(
          filtered.filter((e) => e.evidenceLevel === evidence && costBand(e) === band),
        );
        out.push({ evidence, band, count: entries.length, entries });
      }
    }
    return out;
  }, [filtered]);

  const maxCount = Math.max(1, ...cells.map((c) => c.count));
  const current = cells.find(
    (c) => c.evidence === selected.evidence && c.band === selected.band,
  );
  const urgent = useMemo(() => {
    // 按"先做"排序, 但每个章节最多取 1 条, 避免整页都是同一章
    const sorted = sortByPriority(filtered);
    const seen = new Set<number>();
    const picked: typeof sorted = [];
    for (const e of sorted) {
      if (seen.has(e.section)) continue;
      seen.add(e.section);
      picked.push(e);
      if (picked.length >= 8) break;
    }
    return picked;
  }, [filtered]);
  const extremeCount = useMemo(() => filtered.filter((e) => priority(e) === 'extreme').length, [filtered]);

  const currentLabel = `${selected.evidence} 级证据 · ${COST_BAND_LABEL[selected.band]}`;

  return (
    <div className={className}>
      {/* 口径筛选 (真实字段: 章节口径) */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
        <span className="text-ink-soft">口径:</span>
        <button
          onClick={() => setCaliber('all')}
          className={`px-2 py-1 border ${
            caliber === 'all' ? 'border-seal text-seal bg-bg-alt' : 'border-border text-ink-soft hover:border-vermillion'
          }`}
        >
          全部
        </button>
        {CALIBERS.map((c) => (
          <button
            key={c}
            onClick={() => setCaliber(c)}
            className={`px-2 py-1 border ${
              caliber === c ? 'border-seal text-seal bg-bg-alt' : 'border-border text-ink-soft hover:border-vermillion'
            }`}
          >
            {caliberLabel[c]}
          </button>
        ))}
        <span className="ml-auto text-xs text-ink-soft">
          共 {filtered.length} 条 · 其中「先做」{extremeCount} 条 (A 级证据 + 零成本)
        </span>
      </div>

      {/* 矩阵 */}
      <div className="border border-border bg-bg p-3 md:p-4 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-24 p-2 text-left text-xs font-normal text-ink-soft">
                证据 ＼ 成本
              </th>
              {COST_BANDS.map((b) => (
                <th key={b} className="p-2 text-center align-bottom">
                  <div className="font-bold text-ink">{COST_BAND_LABEL[b]}</div>
                  <div className="text-[11px] font-normal text-ink-soft mt-0.5">
                    {COST_BAND_HINT[b]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EVIDENCE_ROWS.map((lv) => (
              <tr key={lv}>
                <th className="p-2 text-left align-middle">
                  <span className="inline-block px-2 py-0.5 border border-vermillion text-vermillion text-xs">
                    {lv} 级
                  </span>
                </th>
                {COST_BANDS.map((band) => {
                  const cell = cells.find((c) => c.evidence === lv && c.band === band)!;
                  const isSel = selected.evidence === lv && selected.band === band;
                  const isBest = lv === 'A' && band === 'zero';
                  const intensity = cell.count === 0 ? 0 : 0.06 + (cell.count / maxCount) * 0.22;
                  return (
                    <td key={band} className="p-1">
                      <button
                        onClick={() => setSelected({ evidence: lv, band })}
                        aria-pressed={isSel}
                        title={`${lv} 级证据 · ${COST_BAND_LABEL[band]}: ${cell.count} 条`}
                        className={`w-full h-16 md:h-20 flex flex-col items-center justify-center border transition-colors ${
                          isSel ? 'border-seal' : 'border-border hover:border-vermillion'
                        }`}
                        // 背景改为从 token 派生 (原来硬编码 rgba(183,50,41,…), 改了朱砂色不会同步)
                        style={{ background: `color-mix(in srgb, var(--color-seal) ${Math.round(intensity * 100)}%, transparent)` }}
                      >
                        {/* 24px 粗体属"大文本", 只需 3:1; 朱砂在深格底色上 3.32:1 仍达标 */}
                        <span className="text-2xl font-bold text-seal leading-none">
                          {cell.count}
                        </span>
                        {/* 11px 小字必须 ≥4.5:1 —— 淡墨在深格上只有 3.05, 改墨色后 7.35:1 */}
                        <span className="text-[11px] text-ink mt-1">条</span>
                        {isBest && cell.count > 0 && (
                          <span className="text-[11px] text-ink mt-0.5 font-bold">★ 先做这里</span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 点开口径说明 */}
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-soft">
        {CALIBERS.map((c) => (
          <span key={c} className="flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: CALIBER_DOT[c] }}
            />
            {caliberLabel[c]}
          </span>
        ))}
        <span className="ml-auto">颜色 = 条目所属章节的口径 (原书章节属性)</span>
      </div>

      {/* 选中格子里的条目 */}
      {current && current.count > 0 && (
        <section className="mt-6">
          <h3 className="text-base font-bold mb-2" style={{ fontFamily: 'var(--font-zh-heading)' }}>
            {currentLabel} · {current.count} 条
          </h3>
          <ol className="space-y-1">
            {current.entries.slice(0, 10).map((e, i) => (
              <li key={e.id} className="flex items-baseline gap-2 text-sm">
                <span className="text-seal font-mono text-xs flex-shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Link href={`/book/${e.id}`} className="flex-1 min-w-0 min-h-[24px] flex items-center hover:text-vermillion">
                  {e.title}
                </Link>
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: CALIBER_DOT[e.caliber] }}
                  title={caliberLabel[e.caliber]}
                />
                <span className="text-xs text-ink-soft flex-shrink-0">
                  第 {e.section} 节 · 成本 {costScore(e)} 分
                </span>
              </li>
            ))}
          </ol>
          {current.count > 10 && (
            <p className="text-xs text-ink-soft mt-2">
              仅列前 10 条, 其余 {current.count - 10} 条请到{' '}
              <Link href="/explore" prefetch={false} className="text-vermillion">
                检索
              </Link>{' '}
              按证据等级与成本筛选。
            </p>
          )}
        </section>
      )}

      {/* 直接给结论 */}
      <section className="mt-8 border-t border-border pt-4">
        <h3 className="text-base font-bold mb-1" style={{ fontFamily: 'var(--font-zh-heading)' }}>
          若只做八件事
        </h3>
        <p className="text-xs text-ink-soft mb-3">
          按本站「先做」派生排序取前 8 条（证据越硬、成本越低越靠前）, <strong>每章最多 1 条</strong> (本站派生排序, 不是原书结论)。
        </p>
        <ol className="space-y-1">
          {urgent.map((e, i) => (
            <li key={e.id} className="flex items-baseline gap-2 text-sm">
              <span className="text-seal font-mono text-xs flex-shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              <Link href={`/book/${e.id}`} className="flex-1 min-w-0 min-h-[24px] flex items-center hover:text-vermillion">
                {e.title}
              </Link>
              <span className="text-xs text-ink-soft flex-shrink-0">
                {e.evidenceLevel} 级 · {COST_BAND_LABEL[costBand(e)]}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
