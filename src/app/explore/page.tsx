'use client';

import { useState, useMemo, useDeferredValue, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { allEntries, allSections } from '@/lib/entries';
import { applyFilter, emptyFilter } from '@/lib/filter';
import { sortByPriority } from '@/lib/priority';
import { EntryCard } from '@/components/EntryCard';
import { FilterBar } from '@/components/FilterBar';
import { getLifeStage, UNIVERSAL_SECTIONS } from '@/lib/life-stages';
import type { Filter } from '@/types';

const PAGE_SIZE = 50;

function ExploreContent() {
  const searchParams = useSearchParams();
  const stageParam = searchParams.get('stage');
  const sectionParam = searchParams.get('section');

  // 同步从 URL 读取初始 filter, 避免 SSR 闪烁
  const initialFilter: Filter = (() => {
    if (stageParam && getLifeStage(stageParam)) {
      return { ...emptyFilter, sections: getLifeStage(stageParam)!.sections };
    }
    if (sectionParam) {
      const n = parseInt(sectionParam, 10);
      if (!isNaN(n)) return { ...emptyFilter, sections: [n] };
    }
    return emptyFilter;
  })();

  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [page, setPage] = useState(1);

  // 检索词延后一帧再参与过滤: 输入框保持即时回显, 765 条过滤不阻塞按键
  // (实测单次过滤 max 47ms, 已接近 50ms 门槛; 全站此前 0 处防抖/延后)
  const deferredQuery = useDeferredValue(filter.query);

  const effectiveFilter = useMemo(
    () => (deferredQuery === filter.query ? filter : { ...filter, query: deferredQuery }),
    [filter, deferredQuery],
  );

  const filtered = useMemo(() => applyFilter(allEntries, effectiveFilter), [effectiveFilter]);

  /**
   * 排序 (实测发现的问题与修法):
   *
   * 原实现直接 slice 前 50 —— 而 allEntries 是原书章节顺序, 于是**任何阶段页的前 50 条
   * 都只有第 1-2 章**(实测 6 个阶段的前 50 条里, 阶段专属内容 0 条; 第一条专属内容要翻到
   * 第 141~253 条)。读者点了"婴幼儿", 满屏都是"不要早死", 阶段入口等于失效。
   *
   * 修法: 阶段页里**专属章节优先**, 组内按"先做顺序"(证据越硬、成本越低越靠前);
   * 通用章节排在其后。这样点进来立刻看到这个阶段该看的东西, 通用保命内容也不丢。
   */
  const ordered = useMemo(() => {
    const stage = stageParam ? getLifeStage(stageParam) : undefined;
    if (!stage) return filtered;
    const own = new Set(stage.own);
    const mine = filtered.filter((e) => own.has(e.section));
    const rest = filtered.filter((e) => !own.has(e.section));
    return [...sortByPriority(mine), ...sortByPriority(rest)];
  }, [filtered, stageParam]);

  const visible = useMemo(() => ordered.slice(0, page * PAGE_SIZE), [ordered, page]);

  const updateFilter = (next: Filter) => {
    setFilter(next);
    setPage(1);
  };

  const stage = stageParam && getLifeStage(stageParam);

  // 「只看专属」: 只保留该阶段专属章节 (通用章节是各阶段共有的, 对比时容易看不出区别)
  const onlyOwnActive =
    !!stage &&
    stage.own.length > 0 &&
    filter.sections.length === stage.own.length &&
    stage.own.every((n) => filter.sections.includes(n));

  const ownTitles = stage
    ? stage.own
        .map((n) => allSections.find((s) => s.id === n))
        .filter((s): s is NonNullable<typeof s> => Boolean(s))
        .map((s) => `第 ${s.number} 章 ${s.title}`)
    : [];

  return (
    <div className="flex flex-col md:flex-row">
      <FilterBar
        sections={allSections}
        filter={filter}
        onChange={updateFilter}
        ownSections={stage ? stage.own : undefined}
        universalSections={stage ? UNIVERSAL_SECTIONS : undefined}
      />

      <div className="flex-1 px-4 md:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-guo-sm" style={{ fontFamily: 'var(--font-zh-heading)' }}>
            {stage ? `${stage.label} · 阶段手册` : '检 索'}
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            {/* 标签必须与实际排序一致: 原来写"按性价比排序", 但代码从未排序(就是原书章节顺序),
                属界面与实现不符; 现已按实际情况分别标注 */}
            共 {ordered.length} 条 · {stage ? '专属章节优先 · 组内按先做顺序' : '按原书章节顺序'} ·
            显示前 {visible.length} 条
            {(stage || sectionParam) && (
              <Link href="/explore" className="ml-3 text-vermillion no-underline">
                [清空]
              </Link>
            )}
          </p>
          {stage && (
            <>
              <p className="text-sm text-ink-soft mt-2 leading-relaxed">{stage.description}</p>
              {/* 明确写出这个阶段的专属章节: 否则各阶段侧栏勾选形态几乎一样, 读者看不出区别 */}
              <p className="text-sm mt-2 leading-relaxed">
                <span className="text-seal">本阶段专属 </span>
                <span className="text-ink-soft">{ownTitles.join(' · ')}</span>{' '}
                <button
                  onClick={() =>
                    updateFilter({
                      ...filter,
                      sections: onlyOwnActive ? [...stage.sections] : [...stage.own],
                    })
                  }
                  className="ml-1 text-xs px-2 py-0.5 border border-border text-ink-soft hover:border-vermillion hover:text-vermillion"
                >
                  {onlyOwnActive ? '看专属 + 通用' : '只看专属'}
                </button>
              </p>
            </>
          )}
          <hr className="zhu-si-lan" />
        </div>

        {ordered.length === 0 ? (
          <div className="text-center py-16 text-ink-soft">
            <p className="text-lg">卷中尚无条目</p>
            <p className="text-sm mt-2">请调整筛选条件</p>
          </div>
        ) : (
          <div>
            {visible.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
            {visible.length < ordered.length && (
              <div className="text-center py-6">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="px-6 py-2 border border-vermillion text-vermillion hover:bg-vermillion hover:text-bg"
                >
                  展开更多 ({ordered.length - visible.length} 条)
                </button>
              </div>
            )}
          </div>
        )}

        <div className="juan-end">〔 检 索 · 终 〕</div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <p className="text-ink-soft">卷开中...</p>
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
