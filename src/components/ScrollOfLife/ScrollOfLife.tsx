'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { allEntries } from '@/lib/entries';

interface ScrollOfLifeProps {
  className?: string;
}

/**
 * 长卷组件 - 首页核心视觉
 * 横向 SVG 长卷，从左到右是人生阶段，每条建议是一个印章
 */
export function ScrollOfLife({ className = '' }: ScrollOfLifeProps) {
  const entries = allEntries;

  const sections = useMemo(() => {
    // 按章节聚合, 选每章前若干条
    const grouped: Record<number, typeof entries> = {};
    entries.forEach((e) => {
      if (!grouped[e.section]) grouped[e.section] = [];
      grouped[e.section].push(e);
    });
    return Object.entries(grouped).map(([section, list]) => ({
      section: parseInt(section, 10),
      entries: list.slice(0, 3), // 每章前 3 条
    }));
  }, [entries]);

  const stageLabels = [
    '备孕', '0-3 岁', '上学', '18+', '工作',
    '结婚', '怀孕', '中年', '退休', '临终',
  ];

  const ITEM_WIDTH = 64;
  const SECTION_GAP = 48;
  const PADDING = 80;
  const totalWidth = PADDING * 2 + sections.reduce((sum, s, i) => sum + s.entries.length * ITEM_WIDTH + (i < sections.length - 1 ? SECTION_GAP : 0), 0);

  return (
    <div className={`overflow-x-auto scrollbar-hidden bg-bg-alt border-y border-border py-8 ${className}`}>
      <div style={{ minWidth: `${totalWidth}px`, padding: `0 ${PADDING}px` }}>
        {/* 阶段标签 */}
        <div className="flex justify-between mb-4 px-4">
          {stageLabels.map((label, i) => (
            <div key={i} className="text-xs text-ink-soft tracking-guo-sm" style={{ minWidth: '80px', textAlign: 'center' }}>
              {label}
            </div>
          ))}
        </div>

        {/* 长卷主图 */}
        <svg
          viewBox={`0 0 ${totalWidth} 200`}
          width={totalWidth}
          height={200}
          className="block"
        >
          {/* 竹纸底 */}
          <rect x="0" y="0" width={totalWidth} height="200" fill="#F2E8D5" />

          {/* 上下双横线 (仿朱丝栏) */}
          <line x1="0" y1="50" x2={totalWidth} y2="50" stroke="#8B3A3A" strokeWidth="1" opacity="0.4" />
          <line x1="0" y1="150" x2={totalWidth} y2="150" stroke="#8B3A3A" strokeWidth="1" opacity="0.4" />

          {/* 印章序列 */}
          {sections.reduce<{ x: number; nodes: React.ReactNode[] }>(
            (acc, s, sectionIdx) => {
              s.entries.forEach((entry, i) => {
                const sealX = acc.x + i * ITEM_WIDTH;
                const sealY = 100 - 20;

                acc.nodes.push(
                  <Link key={entry.id} href={`/book/${entry.id}`} style={{ borderBottom: 'none' }}>
                    <g style={{ cursor: 'pointer' }}>
                      {/* 印章方框 */}
                      <rect
                        x={sealX}
                        y={sealY}
                        width="40"
                        height="40"
                        fill="none"
                        stroke="#B73229"
                        strokeWidth="1.5"
                      />
                      {/* 编号 */}
                      <text
                        x={sealX + 20}
                        y={sealY + 18}
                        textAnchor="middle"
                        fontFamily="JetBrains Mono, monospace"
                        fontSize="9"
                        fill="#B73229"
                      >
                        {entry.id}
                      </text>
                      {/* 等级 */}
                      <text
                        x={sealX + 20}
                        y={sealY + 32}
                        textAnchor="middle"
                        fontFamily="LXGW WenKai TC, serif"
                        fontSize="11"
                        fontWeight="900"
                        fill="#B73229"
                      >
                        {entry.evidenceLevel}
                      </text>
                      {/* 标题悬停提示 (用 title) */}
                      <title>{entry.title}</title>
                    </g>
                  </Link>,
                );

                // 章节分隔小竖线
                if (i === s.entries.length - 1 && sectionIdx < sections.length - 1) {
                  acc.nodes.push(
                    <line
                      key={`sep-${s.section}`}
                      x1={acc.x + (i + 1) * ITEM_WIDTH + SECTION_GAP / 2 - 8}
                      y1="80"
                      x2={acc.x + (i + 1) * ITEM_WIDTH + SECTION_GAP / 2 - 8}
                      y2="120"
                      stroke="#6B5D4A"
                      strokeWidth="0.5"
                      strokeDasharray="2,2"
                    />,
                  );
                }
              });

              // 章节标题 (在印章组下方)
              const sectionX = acc.x + (s.entries.length * ITEM_WIDTH) / 2 - 30;
              acc.nodes.push(
                <text
                  key={`sec-${s.section}-label`}
                  x={sectionX}
                  y="170"
                  textAnchor="middle"
                  fontFamily="LXGW WenKai TC, serif"
                  fontSize="11"
                  fill="#2A2418"
                  fontWeight="600"
                >
                  第{String(s.section).padStart(2, '0')}节
                </text>,
              );

              acc.x += s.entries.length * ITEM_WIDTH + SECTION_GAP;
              return acc;
            },
            { x: 0, nodes: [] },
          ).nodes}
        </svg>

        <div className="text-center mt-4 text-xs text-ink-soft italic" style={{ fontFamily: 'var(--font-en-heading)' }}>
          Scroll of Life · {entries.length} seals, 34 chapters
        </div>
      </div>
    </div>
  );
}
