'use client';

import { useState, useMemo } from 'react';
import { allEntries, allSections } from '@/lib/entries';
import { applyFilter, emptyFilter } from '@/lib/filter';
import { EntryCard } from '@/components/EntryCard';
import { FilterBar } from '@/components/FilterBar';
import type { Filter } from '@/types';

export default function ExplorePage() {
  const [filter, setFilter] = useState<Filter>(emptyFilter);

  const filtered = useMemo(() => {
    return applyFilter(allEntries, filter);
  }, [filter]);

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-200px)]">
      <FilterBar
        sections={allSections}
        filter={filter}
        onChange={setFilter}
      />

      <div className="flex-1 px-4 md:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-guo-sm" style={{ fontFamily: 'var(--font-zh-heading)' }}>
            检 索
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            共 {filtered.length} 条 · 按性价比排序
          </p>
          <hr className="zhu-si-lan" />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-ink-soft">
            <p className="text-lg">卷中尚无条目</p>
            <p className="text-sm mt-2">请调整筛选条件</p>
          </div>
        ) : (
          <div>
            {filtered.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}

        <div className="juan-end">〔 检 索 · 终 〕</div>
      </div>
    </div>
  );
}
