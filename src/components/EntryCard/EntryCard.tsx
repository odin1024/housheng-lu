'use client';

import { useState } from 'react';
import type { Entry } from '@/types';
import { Seal } from '@/components/Seal';
import { addToMyList, removeFromMyList, isInMyList, updateMyListStatus } from '@/lib/storage';

interface EntryCardProps {
  entry: Entry;
  expanded?: boolean;
  onToggle?: () => void;
  showSeal?: boolean;
}

const evidenceLabel: Record<string, string> = {
  A: 'A 级',
  B: 'B 级',
  C: 'C 级',
};

const ratioLabel: Record<string, string> = {
  extreme: '极高',
  high: '高',
  normal: '一般',
};

const caliberLabel: Record<string, string> = {
  life: '寿命',
  money: '金钱',
  time: '时间精力',
  freedom: '人身自由',
};

export function EntryCard({ entry, expanded: controlledExpanded, onToggle, showSeal = true }: EntryCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = controlledExpanded ?? internalExpanded;
  const [inList, setInList] = useState(false);

  if (typeof window !== 'undefined') {
    setInList(isInMyList(entry.id));
  }

  const toggle = () => {
    if (onToggle) onToggle();
    else setInternalExpanded(!expanded);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inList) {
      removeFromMyList(entry.id);
      setInList(false);
    } else {
      addToMyList(entry.id, 'todo');
      setInList(true);
    }
  };

  const handleDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inList) addToMyList(entry.id, 'done');
    else updateMyListStatus(entry.id, 'done');
    setInList(true);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/book/${entry.id}`;
    const text = `${entry.title}\n\n${entry.plainLanguage}\n\n来源: 厚生錄 (${url})`;
    if (navigator.share) {
      navigator.share({ title: entry.title, text, url });
    } else {
      navigator.clipboard.writeText(text);
      alert('已誊录到剪贴板');
    }
  };

  return (
    <article
      className="border-b border-border py-6 transition-all duration-200"
      style={{ background: expanded ? 'var(--color-bg-alt)' : 'transparent' }}
    >
      {/* 顶栏 */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {showSeal && <Seal text={entry.id} size={28} state={inList ? 'done' : 'default'} />}
        <span className="text-xs px-2 py-0.5 border border-vermillion text-vermillion">
          {evidenceLabel[entry.evidenceLevel]}
        </span>
        <span className="text-xs px-2 py-0.5 border border-seal text-seal">
          {ratioLabel[entry.ratio]}
        </span>
        <span className="text-xs px-2 py-0.5 border border-ink-soft text-ink-soft">
          {caliberLabel[entry.caliber]}
        </span>
        <span className="text-xs text-ink-soft ml-auto">
          第 {entry.section} 节 · 第 {entry.number} 条
        </span>
      </div>

      {/* 标题 */}
      <h3
        className="text-xl font-bold mb-3 cursor-pointer"
        onClick={toggle}
        style={{ fontFamily: 'var(--font-zh-heading)' }}
      >
        {entry.title}
      </h3>

      {/* 说人话块 */}
      <div className="plain-language">
        {entry.plainLanguage}
      </div>

      {/* 展开层 */}
      {expanded && (
        <div className="mt-4 space-y-4">
          <div>
            <div className="field-label">收 益</div>
            <p className="text-base whitespace-pre-wrap">{entry.benefit}</p>
          </div>

          <div>
            <div className="field-label">成 本</div>
            <p className="text-base">{entry.cost.detail}</p>
          </div>

          <div>
            <div className="field-label">证 据</div>
            <p className="text-base">
              {evidenceLabel[entry.evidenceLevel]}
              {entry.evidenceDetail && ` · ${entry.evidenceDetail}`}
              {entry.controversy && (
                <span className="text-vermillion ml-2">· 争议</span>
              )}
            </p>
          </div>

          {entry.remark && (
            <div>
              <div className="field-label">备 注</div>
              <p className="text-sm whitespace-pre-wrap">{entry.remark}</p>
            </div>
          )}

          <div>
            <div className="field-label">出 处</div>
            <p className="text-sm font-mono">
              {entry.source}
              {entry.sourceUrl && (
                <>
                  {' · '}
                  <a href={entry.sourceUrl} target="_blank" rel="noopener">
                    原文 ↗
                  </a>
                </>
              )}
            </p>
          </div>

          <div className="text-xs text-ink-soft">
            同步日期 · {entry.syncDate}
          </div>
        </div>
      )}

      {/* 动作栏 */}
      <div className="flex items-center gap-4 mt-4 text-sm">
        <button
          onClick={toggle}
          className="text-indigo hover:text-vermillion bg-transparent border-none"
          style={{ borderBottom: 'none' }}
        >
          {expanded ? '▲ 收起' : '▶ 卷开'}
        </button>
        <button
          onClick={handleSave}
          className="text-ink-soft hover:text-seal bg-transparent border-none"
          style={{ borderBottom: 'none' }}
        >
          {inList ? '已藏' : '藏'}
        </button>
        <button
          onClick={handleDone}
          className="text-ink-soft hover:text-seal bg-transparent border-none"
          style={{ borderBottom: 'none' }}
        >
          ✓
        </button>
        <button
          onClick={handleShare}
          className="text-ink-soft hover:text-vermillion bg-transparent border-none ml-auto"
          style={{ borderBottom: 'none' }}
        >
          传
        </button>
      </div>
    </article>
  );
}
