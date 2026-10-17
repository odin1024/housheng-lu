'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { allEntries, getEntryById } from '@/lib/entries';
import {
  getMyList,
  removeFromMyList,
  updateMyListStatus,
  clearMyList,
  subscribeMyList,
} from '@/lib/storage';
import { create as toast } from '@/lib/toast-store';
import type { MyListItem } from '@/types';

type Tab = 'all' | 'todo' | 'done' | 'saved';

export default function MyPage() {
  const [list, setList] = useState<MyListItem[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setList(getMyList());
    setHydrated(true);
    return subscribeMyList(() => setList(getMyList()));
  }, []);

  // 用 O(1) 的 id 索引 (lib/entries 已建 Map), 原来是每项 allEntries.find() = O(n)
  const items = list
    .map((item) => {
      const entry = getEntryById(item.entryId);
      return entry ? { item, entry } : null;
    })
    .filter(Boolean) as Array<{ item: MyListItem; entry: typeof allEntries[0] }>;

  const filtered = items.filter(({ item }) => {
    if (tab === 'all') return true;
    return item.status === tab;
  });

  const todoCount = items.filter(({ item }) => item.status === 'todo').length;
  const doneCount = items.filter(({ item }) => item.status === 'done').length;
  const savedCount = items.filter(({ item }) => item.status === 'saved').length;
  const totalProgress = items.length === 0 ? 0 : Math.min(100, Math.round((doneCount / items.length) * 100));

  const handleRemove = (id: string) => {
    removeFromMyList(id);
    toast.show('已移出');
  };

  const handleStatus = (id: string, status: MyListItem['status']) => {
    updateMyListStatus(id, status);
  };

  const handleClearAll = () => {
    if (items.length === 0) return;
    if (confirm(`确定清空全部 ${items.length} 项?`)) {
      clearMyList();
      toast.show('已清空');
    }
  };

  if (!hydrated) {
    return (
      <div className="max-w-base mx-auto px-4 md:px-6 py-8 md:py-12">
        <h1 className="title-juanmu">我的清单</h1>
        <p className="text-center text-ink-soft">卷开中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-base mx-auto px-4 md:px-6 py-8 md:py-12">
      <h1 className="title-juanmu">我的清单</h1>
      <p className="text-center text-sm text-ink-soft mb-8">
        localStorage · 全部数据存在你的浏览器, 不上传任何服务器
      </p>

      <hr className="zhu-si-lan" />

      {items.length > 0 && (
        <div className="mb-8 p-4 border border-border bg-bg-alt">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>整体进度</span>
            <span className="text-seal font-bold">
              {doneCount}/{items.length} ({totalProgress}%)
            </span>
          </div>
          <div
            className="w-full h-2 bg-bg border border-border"
            role="progressbar"
            aria-valuenow={totalProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-seal transition-all duration-500"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-6 border-b border-border mb-6" role="tablist">
        {[
          { v: 'all' as Tab, l: `全部 (${items.length})` },
          { v: 'todo' as Tab, l: `待办 (${todoCount})` },
          { v: 'done' as Tab, l: `已完成 (${doneCount})` },
          { v: 'saved' as Tab, l: `已藏 (${savedCount})` },
        ].map((t) => (
          <button
            key={t.v}
            onClick={() => setTab(t.v)}
            role="tab"
            aria-selected={tab === t.v}
            className={`py-2 px-1 ${tab === t.v ? 'text-seal' : 'text-ink-soft hover:text-ink'}`}
            style={{ borderBottom: tab === t.v ? '2px solid var(--color-seal)' : 'none' }}
          >
            {t.l}
          </button>
        ))}
        {items.length > 0 && (
          <button onClick={handleClearAll} className="ml-auto text-xs text-ink-soft hover:text-seal" aria-label="清空全部">
            清空
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-ink-soft">
          <p className="text-lg">{items.length === 0 ? '卷中尚无条目' : '此标签下没有条目'}</p>
          <p className="text-sm mt-2">
            去{' '}
            <Link href="/explore" className="text-indigo">
              检索
            </Link>{' '}
            收藏感兴趣的建议
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map(({ item, entry }) => (
            <li key={entry.id} className="p-4 border border-border bg-bg-alt flex items-start gap-3">
              <input
                type="checkbox"
                checked={item.status === 'done'}
                onChange={(e) => handleStatus(entry.id, e.target.checked ? 'done' : 'todo')}
                className="mt-1 accent-seal"
                aria-label={`标记 ${entry.title} 为完成`}
              />
              <div className="flex-1 min-w-0">
                <Link href={`/book/${entry.id}`} className="font-bold text-base hover:text-vermillion no-underline block">
                  {entry.title}
                </Link>
                <div className="text-sm text-ink-soft mt-1 line-clamp-2">{entry.plainLanguage}</div>
                <div className="text-xs text-ink-soft mt-1">
                  {entry.evidenceLevel} 级 · {entry.caliber} · {entry.id}
                </div>
              </div>
              <button
                onClick={() => handleRemove(entry.id)}
                className="text-xs text-ink-soft hover:text-seal"
                title="移出清单"
                aria-label={`移出 ${entry.title}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="juan-end">〔 我的清单 · 终 〕</div>
    </div>
  );
}
