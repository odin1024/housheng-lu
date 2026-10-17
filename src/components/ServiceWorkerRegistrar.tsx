'use client';

import { useEffect } from 'react';

/**
 * Service Worker 注册
 *
 * 说明: 曾试过在这里 postMessage 让 SW 预缓存全部 12 个急救场景, 但该组件在根 layout 里,
 * 于是**每次页面加载**都会触发 12 个页面抓取 → 首次访问多下载约 226KB、并且页面长期不达
 * network-idle (实测把 check-page-load 拖到超时)。已回退。
 *
 * 现在的离线能力:
 *   - SW install 阶段预缓存 /, /explore, /emergency, /about, /offline.html (见 public/sw.js)
 *   - 急救场景详情页走 network-first + runtime 缓存: 访问过即可离线再看
 *   - activate 只清旧版本缓存 (已修: 原来无条件清空把刚建好的预缓存也删了, 导致离线全废)
 * 若要让"未访问过的场景"也离线可用, 正确做法是把 12 个 URL 写进 sw.js 的
 * PRECACHE_URLS (install 只发生一次), 而不是在页面里逐次触发。
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[SW] register failed:', err);
    });
  }, []);

  return null;
}
