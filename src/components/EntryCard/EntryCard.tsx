'use client';

import { useState, useEffect } from 'react';
import type { Entry } from '@/types';
import { addToMyList, removeFromMyList, isInMyList, updateMyListStatus, subscribeMyList } from '@/lib/storage';
import { evidenceLabel, ratioLabel, caliberLabel } from '@/lib/labels';
import { create as toast } from '@/lib/toast-store';

interface EntryCardProps {
  entry: Entry;
  expanded?: boolean;
  onToggle?: () => void;
  showSeal?: boolean;
  /** 详情页单条展示: "说人话"放大成引文 (仍左对齐) */
  lead?: boolean;
}

export function EntryCard({
  entry,
  expanded: controlledExpanded,
  onToggle,
  showSeal = true,
  lead = false,
}: EntryCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = controlledExpanded ?? internalExpanded;
  const [inList, setInList] = useState(false);

  useEffect(() => {
    setInList(isInMyList(entry.id));
    return subscribeMyList(() => setInList(isInMyList(entry.id)));
  }, [entry.id]);

  const toggle = () => {
    if (onToggle) onToggle();
    else setInternalExpanded(!expanded);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inList) {
      removeFromMyList(entry.id);
      setInList(false);
      toast.show('已移出');
    } else {
      addToMyList(entry.id, 'todo');
      setInList(true);
      toast.show('已藏');
    }
  };

  const handleDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateMyListStatus(entry.id, 'done');
    setInList(true);
    toast.show('已勾选');
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/book/${entry.id}`;
    const text = `${entry.title}\n\n${entry.plainLanguage}\n\n来源: 厚生錄 (${url})`;
    try {
      if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ title: entry.title })) {
        await navigator.share({ title: entry.title, text, url });
        return;
      }
    } catch {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.show('已誊录到剪贴板');
    } catch {
      toast.show('复制失败, 请手动操作');
    }
  };

  return (
    <article
      className="entry-card border-b border-border px-4 md:px-6 py-6 transition-all duration-200"
      style={{ background: expanded ? 'var(--color-bg-alt)' : 'transparent' }}
    >
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {showSeal && (
          <span
            className={`seal ${inList ? 'seal-active' : ''}`}
            style={{ minWidth: '40px', padding: '0 6px', height: '24px', fontSize: '11px', whiteSpace: 'nowrap' }}
            aria-label={inList ? `已收藏 ${entry.id}` : `条目 ${entry.id}`}
          >
            {entry.id}
          </span>
        )}
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

      <h3
        className="text-xl font-bold mb-3 cursor-pointer"
        onClick={toggle}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle())}
        tabIndex={0}
        role="button"
        aria-expanded={expanded}
        style={{ fontFamily: 'var(--font-zh-heading)' }}
      >
        {entry.title}
      </h3>

      <div className={lead ? 'plain-language plain-language--lead' : 'plain-language'}>
        {entry.plainLanguage}
      </div>

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
              {entry.controversy && <span className="text-vermillion ml-2">· 争议</span>}
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
            <p className="text-sm font-mono break-all">
              {entry.source}
              {entry.sourceUrl && (
                <>
                  {' · '}
                  <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">
                    原文 ↗
                  </a>
                </>
              )}
            </p>
          </div>
          <div className="text-xs text-ink-soft">同步日期 · {entry.syncDate}</div>
        </div>
      )}

      {/* 工具栏按钮的可点区域
          实测(390×844): 「藏/✓/传」只有 14×20、11×20, 低于 WCAG 2.2 AA(2.5.8) 的 24×24。
          统一给最小 24×24 的 inline-flex 盒子, 单字按钮居中, 视觉不变但手指可点。 */}
      <div className="flex items-center gap-4 mt-4 text-sm" role="toolbar" aria-label="条目操作">
        <button className="inline-flex items-center justify-center min-h-[24px] min-w-[24px]" onClick={toggle} aria-pressed={expanded}>
          {expanded ? '▲ 收起' : '▶ 卷开'}
        </button>
        <button className="inline-flex items-center justify-center min-h-[24px] min-w-[24px]" onClick={handleSave} aria-pressed={inList}>
          {inList ? '已藏' : '藏'}
        </button>
        <button className="inline-flex items-center justify-center min-h-[24px] min-w-[24px]" onClick={handleDone} aria-label="标记完成">
          ✓
        </button>
        <button className="ml-auto inline-flex items-center justify-center min-h-[24px] min-w-[24px]" onClick={handleShare}>
          传
        </button>
      </div>
    </article>
  );
}
