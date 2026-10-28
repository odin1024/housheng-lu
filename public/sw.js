// 厚生錄 Service Worker
// 策略:
//   - 急救 + 单节页: 网络优先, 失败用缓存
//   - 静态资源: 缓存优先
//   - 其他页面: 网络优先, 失败返回 offline.html
// 任何 404 不阻断其他资源缓存
//
// 关于 basePath:
//   本站既可能部署在域名根(自建 Node / Vercel), 也可能部署在子路径
//   (GitHub Pages: /housheng-lu/)。写死 '/' 开头的路径在子路径部署下**全部 404**,
//   所以这里从 self.registration.scope 推导 BASE, 所有内部路径都经过 u()。

const CACHE_NAME = 'housheng-lu-v9';
const RUNTIME_CACHE = 'housheng-lu-runtime-v9';

/** '' 或 '/housheng-lu' */
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, '');
/** 拼内部路径 */
const u = (p) => BASE + p;
/** 把绝对路径name 还原成"相对站点根"的形式, 便于匹配 */
const rel = (pathname) => (BASE && pathname.startsWith(BASE) ? pathname.slice(BASE.length) || '/' : pathname);

const PRECACHE_URLS = [
  '/',
  '/explore',
  '/emergency',
  '/about',
  '/favicon.svg',
  '/logo/seal-square.svg',
  '/manifest.json',
  '/offline.html',
].map(u);

// 静态资源路径模式 (基于去掉 BASE 后的相对路径)
const STATIC_PATTERNS = [
  /^\/_next\/static\//,
  /^\/logo\//,
  /^\/icons\//,
  /^\/og\//,
  /\.(svg|css|js|woff2|png|jpg|webp)$/,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // 逐个 add, 一个失败不影响其他
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'no-cache' });
            if (res.ok) await cache.put(url, res);
          } catch (e) {
            console.warn('[SW] precache skip', url, e.message);
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      // 只清"旧版本"缓存 —— 必须保留当前两个!
      // 原实现是无条件 caches.delete(k), 把 install 刚填好的预缓存也删了,
      // 导致预缓存名从未存在、/offline.html 取不到, 断网时所有页面(含急方)全部打不开。
      await Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// 允许页面把"需要离线可用的 URL"(如全部急救场景) 交给 SW 预缓存
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'PRECACHE_URLS' || !Array.isArray(data.urls)) return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        data.urls.map(async (url) => {
          try {
            if (await cache.match(url)) return;
            const res = await fetch(url, { cache: 'no-cache' });
            if (res.ok) await cache.put(url, res);
          } catch (e) {
            console.warn('[SW] dynamic precache skip', url);
          }
        }),
      );
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 站点范围之外的请求不管 (同域但不是本站路径)
  const path = rel(url.pathname);

  // API 一律不缓存 (健康检查等动态响应不该进缓存)
  if (path.startsWith('/api/')) return;

  // 急救 + 单节: 网络优先
  if (path.startsWith('/emergency/') || path.startsWith('/book/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 构建产物 (JS/CSS chunk): 必须网络优先
  // 缓存优先会拿到旧 chunk, 和新页面里的引用对不上 → "Cannot read properties of undefined (reading 'call')"
  if (path.startsWith('/_next/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 其他静态资源 (logo/图标/字体): 缓存优先, 快且稳
  if (STATIC_PATTERNS.some((re) => re.test(path))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 其他页面: 网络优先, 失败用 offline.html
  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(request);
      return cached || caches.match(u('/offline.html'));
    }),
  );
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match(u('/offline.html'));
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // 静态资源失败, 返回 offline 页
    const offline = await caches.match(u('/offline.html'));
    if (offline) return offline;
    return new Response('Offline', { status: 504 });
  }
}
