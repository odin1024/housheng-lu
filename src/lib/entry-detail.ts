'use client';

/**
 * 按需加载条目**重字段** (benefit / source / remark / cost.detail …)
 *
 * 为什么需要:
 *   完整条目数据 1326KB, 其中这三个字段占 70%, 而筛选与列表根本用不到。
 *   静态导出 (GitHub Pages) 没有运行时 API, 所以把这些字段在**构建期**切成
 *   静态分片: public/entry-detail/<id>.json (单个约 1.3KB)。
 *   展开某条时按需 fetch 那一个分片 —— 首屏不再下载 1.3MB。
 *
 * 缓存策略:
 *   · 内存 Map —— 同一条在一次会话里只 fetch 一次
 *   · 失败时**不缓存**, 下次展开会重试 (网络抖动不该永久留坑)
 *   · HTTP 层的缓存交给浏览器 (静态文件带 ETag)
 */
import type { EntryDetail } from '@/types';
import { asset } from './site-meta';

const cache = new Map<string, EntryDetail>();
const inflight = new Map<string, Promise<EntryDetail | null>>();

/** 取某条的重字段; 失败返回 null (调用方应显示"加载失败"而不是崩溃) */
export function loadEntryDetail(id: string): Promise<EntryDetail | null> {
  const cached = cache.get(id);
  if (cached) return Promise.resolve(cached);

  const pending = inflight.get(id);
  if (pending) return pending;

  const p = (async () => {
    try {
      const res = await fetch(asset(`/entry-detail/${id}.json`), {
        // 静态文件, 交给浏览器按 ETag 处理
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        console.warn('[entry-detail] 拉取失败', id, res.status);
        return null;
      }
      const detail = (await res.json()) as EntryDetail;
      cache.set(id, detail);
      return detail;
    } catch (e) {
      console.warn('[entry-detail] 拉取异常', id, e);
      return null;
    } finally {
      inflight.delete(id);
    }
  })();

  inflight.set(id, p);
  return p;
}

/** 预取一批条目的重字段 (比如鼠标悬停时) */
export function prefetchEntryDetails(ids: string[]): void {
  for (const id of ids) {
    if (!cache.has(id) && !inflight.has(id)) {
      void loadEntryDetail(id);
    }
  }
}
