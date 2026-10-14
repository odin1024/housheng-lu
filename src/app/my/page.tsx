'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { allEntries } from '@/lib/entries';
import { getMyList, removeFromMyList, updateMyListStatus } from '@/lib/storage';
import type { MyListItem } from '@/types';

type Tab = 'all' | 'todo' | 'done' | 'saved';

export default function MyPage() {
  const [list, setList] = useState<MyListItem[]>([]);
  const [tab, setTab] = useState<Tab>('all');

  useEffect(() => {
    setList(getMyList());
  }, []);

  const items = list
    .map((item) => {
      const entry = allEntries.find((e) => e.id === item.entryId);
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
  const totalProgress = items.length === 0 ? 0 : Math.round((doneCount / items.length) * 100);

  const handleRemove = (id: string) => {
    removeFromMyList(id);
    setList(getMyList());
  };

  const handleStatus = (id: string, status: MyListItem['status']) => {
    updateMyListStatus(id, status);
    setList(getMyList());
  };

  return (
    <div className="max-w-base mx-auto px-4 md:px-6 py-8 md:py-12">
      <h1 className="title-juanmu">我的清单</h1>
      <p className="text-center text-sm text-ink-soft mb-8">
        localStorage · 全部数据存在你的浏览器, 不上传任何服务器
      </p>

      <hr className="zhu-si-lan" />

      {/* 进度 */}
      {items.length > 0 && (
        <div className="mb-8 p-4 border border-border bg-bg-alt">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>整体进度</span>
            <span className="text-seal font-bold">{doneCount}/{items.length} ({totalProgress}%)</span>
          </div>
          <div className="w-full h-2 bg-bg border border-border">
            <div
              className="h-full bg-seal transition-all duration-500"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-6 border-b border-border mb-6">
        {[
          { v: 'all' as Tab, l: `全部 (${items.length})` },
          { v: 'todo' as Tab, l: `待办 (${todoCount})` },
          { v: 'done' as Tab, l: `已完成 (${doneCount})` },
          { v: 'saved' as Tab, l: `已藏 (${savedCount})` },
        ].map((t) => (
          <button
            key={t.v}
            onClick={() => setTab(t.v)}
            className={`py-2 px-1 bg-transparent border-none ${tab === t.v ? 'border-b-2 border-seal text-seal' : 'text-ink-soft hover:text-ink'}`}
            style={{ borderBottom: tab === t.v ? '2px solid var(--color-seal)' : 'none' }}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* 列表 */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-ink-soft">
          <p className="text-lg">卷中尚无条目</p>
          <p className="text-sm mt-2">
            去 <Link href="/explore" style={{ borderBottom: 'none' }} className="text-indigo">检索</Link> 收藏感兴趣的建议
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map(({ item, entry }) => (
            <li
              key={entry.id}
              className="p-4 border border-border bg-bg-alt flex items-start gap-3"
            >
              <input
                type="checkbox"
                checked={item.status === 'done'}
                onChange={(e) => handleStatus(entry.id, e.target.checked ? 'done' : 'todo')}
                className="mt-1 accent-seal"
              />
              <div className="flex-1">
                <Link
                  href={`/book/${entry.id}`}
                  className="font-bold text-base hover:text-vermillion"
                  style={{ borderBottom: 'none' }}
                >
                  {entry.title}
                </Link>
                <div className="text-sm text-ink-soft mt-1">
                  {entry.plainLanguage.slice(0, 80)}
                  {entry.plainLanguage.length > 80 ? '...' : ''}
                </div>
                <div className="text-xs text-ink-soft mt-1">
                  A 级 · {entry.caliber} · {entry.id}
                </div>
              </div>
              <button
                onClick={() => handleRemove(entry.id)}
                className="text-xs text-ink-soft hover:text-seal bg-transparent border-none"
                style={{ borderBottom: 'none' }}
                title="移出清单"
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
