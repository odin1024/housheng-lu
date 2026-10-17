import Link from 'next/link';
import { allEntries, allSections, stats } from '@/lib/entries';
import { caliberLabel, caliberColor, CALIBERS } from '@/lib/labels';
import { ScrollPan, type SectionTick } from './ScrollPan';

const ITEM_WIDTH = 56;
const SECTION_GAP = 32;
// 引首/拖尾留白: 首尾印章不再紧贴框边 (原来 80, 加装裱后需要更宽)
const PADDING = 120;
const PER_SECTION = 4;

// 卷面几何: 上下两道朱丝栏之间放印章, 印章垂直居中于两栏之间
// (原来 SVG 高 220 而印章只占 48px = 22%, 上下各空 46px, 天地头过大)
const SEAL_SIZE = 48;
const RULE_TOP = 28;
const RULE_BOTTOM = 152;
const SEAL_Y = Math.round((RULE_TOP + RULE_BOTTOM) / 2 - SEAL_SIZE / 2); // = 66
const LABEL_Y = 174;
const SVG_HEIGHT = 196;

/**
 * 长卷组件 - 整个 SVG 在 server 端渲染
 * 客户端只接收「章节刻度坐标」这一组数字 (见 ScrollPan), 765 条数据不进 client bundle
 */
export function ScrollOfLife() {
  // 在 server 端聚合
  const grouped: Record<number, typeof allEntries> = {};
  allEntries.forEach((e) => {
    if (!grouped[e.section]) grouped[e.section] = [];
    grouped[e.section].push(e);
  });
  const sections = Object.entries(grouped)
    .map(([section, list]) => ({
      section: parseInt(section, 10),
      entries: list.slice(0, PER_SECTION),
      total: list.length,
    }))
    .filter((s) => s.entries.length > 0);

  const totalSeals = sections.reduce((s, x) => s + x.entries.length, 0);
  const totalWidth =
    PADDING * 2 +
    sections.reduce(
      (sum, s, i) =>
        sum + s.entries.length * ITEM_WIDTH + (i < sections.length - 1 ? SECTION_GAP : 0),
      0,
    );

  // 章节起点 (与 SVG 同一坐标系) → 用于刻度跳转 + 阶段标签对齐
  const sectionStart = new Map<number, number>();
  let cursor = PADDING;
  sections.forEach((s, i) => {
    sectionStart.set(s.section, cursor);
    cursor += s.entries.length * ITEM_WIDTH + (i < sections.length - 1 ? SECTION_GAP : 0);
  });

  const ticks: SectionTick[] = sections.map((s) => ({
    n: s.section,
    x: sectionStart.get(s.section) ?? 0,
  }));

  // 章节的真实标题与口径 (来自 sections.json) —— 长卷横轴就是原书章节顺序,
  // 所以标注必须用章节自己的属性, 不能贴"人生阶段"(那与章节顺序无关, 会自相矛盾)
  const sectionMeta = new Map(allSections.map((s) => [s.id, s]));

  return (
    // 注意: 这里**不要**再加 border-t —— 上一个板块 (hero) 已经有 border-b,
    // 两者背景色相同, 叠在一起会形成一条 2px 的"双线接缝", 看起来像没对齐的缝
    <section className="bg-bg-alt border-b border-border py-8" aria-label="七百余条生计长卷">
      <div className="text-center mb-6">
        <p className="text-sm text-ink-soft tracking-guo-sm">
          〔 长卷 · {totalSeals} 颗印章 · {stats.totalSections} 章 〕
        </p>
        <p className="text-xs text-ink-soft mt-1">
          横轴 = 原书 {stats.totalSections} 章顺序 (第01节 → 第{stats.totalSections}节); 章名与原书一级标题一致;
          每节取前 {PER_SECTION} 条为样, 点印章可直达条目
        </p>
      </div>

      {/* 页边距: 长卷不再通栏出血, 左右各留出页面边距, 成为一个"物件" */}
      <div className="max-w-wide mx-auto px-4 md:px-6">
        <ScrollPan ticks={ticks}>
          <div className="relative pt-8" style={{ width: totalWidth }}>
          {/* 章节标注: 色条 = 该章口径, 文字 = 该章真实标题 (均来自 sections.json) */}
          {sections.map((s) => {
            const meta = sectionMeta.get(s.section);
            const x = sectionStart.get(s.section) ?? 0;
            return (
              <div
                key={`band-${s.section}`}
                className="absolute top-0"
                style={{ left: x, width: s.entries.length * ITEM_WIDTH }}
              >
                <div
                  className="h-1"
                  style={{ background: caliberColor[meta?.caliber ?? 'life'], opacity: 0.55 }}
                />
                <div
                  className="text-[11px] text-ink-soft mt-1 truncate leading-tight"
                  title={`第 ${s.section} 节 · ${meta?.title ?? ''} · ${caliberLabel[meta?.caliber ?? 'life']}`}
                >
                  <span className="font-mono text-[10px] text-ink-soft/70">
                    {String(s.section).padStart(2, '0')}
                  </span>{' '}
                  {meta?.title ?? ''}
                </div>
              </div>
            );
          })}

          {/* 章节吸附点 (拖动/滚动时按节吸附)
              首尾各补一个吸附点: 否则 scroll-snap 会把静止位置吸到第1节的 x,
              把引首/拖尾留白吃掉 (实测首枚印章贴框, 读数直接 2%) */}
          <div
            className="scroll-snap-point"
            style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 1 }}
            aria-hidden="true"
          />
          {ticks.map((t) => (
            <div
              key={`snap-${t.n}`}
              className="scroll-snap-point"
              style={{ position: 'absolute', left: t.x, top: 0, width: 1, height: 1 }}
              aria-hidden="true"
            />
          ))}
          <div
            className="scroll-snap-point"
            style={{ position: 'absolute', left: totalWidth, top: 0, width: 1, height: 1 }}
            aria-hidden="true"
          />

          <svg
            // viewBox 高必须与 CSS 高一致, 否则 SVG 会被非等比缩放
            // (曾出现 viewBox 220 / height 196 → 印章被压成 48×43 的非方形)
            viewBox={`0 0 ${totalWidth} ${SVG_HEIGHT}`}
            width={totalWidth}
            height={SVG_HEIGHT}
            className="block"
            role="img"
            aria-label={`长卷共 ${totalSeals} 颗印章, 涵盖 ${stats.totalSections} 章`}
          >
            <rect x="0" y="0" width={totalWidth} height={SVG_HEIGHT} fill="#F2E8D5" />
            <line x1="0" y1={RULE_TOP} x2={totalWidth} y2={RULE_TOP} stroke="#8B3A3A" strokeWidth="1" opacity="0.4" />
            <line x1="0" y1={RULE_BOTTOM} x2={totalWidth} y2={RULE_BOTTOM} stroke="#8B3A3A" strokeWidth="1" opacity="0.4" />

            {sections.reduce<{ x: number; nodes: React.ReactNode[] }>(
              (acc, s, sectionIdx) => {
                s.entries.forEach((entry, i) => {
                  const sealX = acc.x + i * ITEM_WIDTH;
                  const sealY = SEAL_Y;
                  const size = SEAL_SIZE;
                  const isActive = entry.evidenceLevel === 'A';

                  acc.nodes.push(
                    <Link
                      key={entry.id}
                      href={`/book/${entry.id}`}
                      className="seal-link"
                      style={{ borderBottom: 'none' }}
                      aria-label={`${entry.id} ${entry.title} (${entry.evidenceLevel} 级证据)`}
                    >
                      <g className="seal-item">
                        <rect
                          x={sealX}
                          y={sealY}
                          width={size}
                          height={size}
                          fill={isActive ? 'rgba(183, 50, 41, 0.06)' : 'transparent'}
                          stroke={isActive ? '#B73229' : '#8B3A3A'}
                          strokeWidth={isActive ? '1.8' : '1.2'}
                          opacity={isActive ? 1 : 0.7}
                        />
                        <text
                          x={sealX + size / 2}
                          y={sealY + 18}
                          textAnchor="middle"
                          fontFamily="JetBrains Mono, monospace"
                          fontSize="10"
                          fill={isActive ? '#B73229' : '#6B5D4A'}
                        >
                          {entry.id}
                        </text>
                        <text
                          x={sealX + size / 2}
                          y={sealY + 38}
                          textAnchor="middle"
                          fontFamily="LXGW WenKai TC, serif"
                          fontSize="14"
                          fontWeight="900"
                          fill={isActive ? '#B73229' : '#6B5D4A'}
                        >
                          {entry.evidenceLevel}
                        </text>
                      </g>
                    </Link>,
                  );

                  if (i === s.entries.length - 1 && sectionIdx < sections.length - 1) {
                    const sepX = acc.x + (i + 1) * ITEM_WIDTH + SECTION_GAP / 2;
                    acc.nodes.push(
                      <line
                        key={`sep-${s.section}`}
                        x1={sepX}
                        y1={SEAL_Y - 6}
                        x2={sepX}
                        y2={SEAL_Y + SEAL_SIZE + 6}
                        stroke="#6B5D4A"
                        strokeWidth="0.5"
                        strokeDasharray="2,2"
                      />,
                    );
                  }

                  if (i === s.entries.length - 1) {
                    acc.nodes.push(
                      <text
                        key={`sec-${s.section}-label`}
                        x={acc.x + (s.entries.length * ITEM_WIDTH) / 2}
                        y={LABEL_Y}
                        textAnchor="middle"
                        fontFamily="LXGW WenKai TC, serif"
                        fontSize="11"
                        fill="#2A2418"
                        fontWeight="600"
                      >
                        第{String(s.section).padStart(2, '0')}节
                        {s.total > s.entries.length ? ` (+${s.total - s.entries.length})` : ''}
                      </text>,
                    );
                  }
                });

                acc.x += s.entries.length * ITEM_WIDTH + SECTION_GAP;
                return acc;
              },
              { x: PADDING, nodes: [] },
            ).nodes}
          </svg>
          </div>
        </ScrollPan>
      </div>

      {/* 口径图例 */}
      <div className="max-w-wide mx-auto px-4 md:px-6 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft">
        <span className="text-ink-soft">色条 = 章节口径 (本站按章节主题归并, 非原书字段):</span>
        {CALIBERS.map((c) => (
          <span key={c} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-1.5" style={{ background: caliberColor[c] }} />
            {caliberLabel[c]}
          </span>
        ))}
        <span className="ml-auto">人生阶段请看下方「人生阶段」六栏</span>
      </div>
    </section>
  );
}
