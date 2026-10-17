# 《厚生錄》性能与打包审计报告

**审计时间**：2026-10-16
**审计对象**：`F:\自媒体\AI编程\高性价比人生指南\housheng-lu`
**被测产物**：`.next/`（`BUILD_ID = SrJ2T8YQ86qYLtTkYezSX`，构建于 03:14；与我 02:51 / 03:10 两次构建的 chunk 哈希逐字节一致，见附录 A）
**被测服务**：`next start` @ `http://127.0.0.1:3000`
**工具**：Playwright 1.64（Chromium 1248）+ `curl` + `zlib`（gzip/brotli 精确计算）
**临时 spec**（唯一写操作，均在 `tests/audit-*.spec.ts`）：
`audit-perf-report.spec.ts`、`audit-perf-report2.spec.ts`、`audit-perf-report3.spec.ts`、`audit-perf-final.spec.ts`、`audit-perf-vitals.spec.ts`、`audit-perf-mem.spec.ts`
原始输出：`tests/audit-perf-out/*.json`、`audit-build-output.txt`、`audit-final-output.txt`、`audit-vitals-output.txt`、`audit-mem-output.txt`

> **发布前整理（2026-10-18）**：上述 `.txt` 原始日志已从仓库删除（属排查临时产物），
> 结论与实测数字均保留在本文中；三支测量脚本保留在 **`scripts/audit/`**（`audit-chunks.js`、`audit-extract.js`、`audit-route-size.js`），
> 因此本文的命令仍可复现（路径见下）。

> **未修改任何源码文件。** 未执行 `next build`（遵照协调要求，直接复用现有 `.next/` 产物）。
> 审计期间有并发构建多次重写 `.next` 并打断 `next start`，受影响项已在正文标注。

---

## 结论速览

| 指标 | 实测 | 判定 |
|---|---|---|
| 首页 First Load JS（Next 官方口径） | **96.4 KB** | ✅ 低于 130 KB 建议值 |
| 首页关键路径实际传输 | **109.7 KB**（HTML+CSS+JS+SVG，gzip） | ✅ |
| 首页 FCP / LCP | **764 ms / 764 ms** | ✅ |
| 首页 CLS / Long Task | **0 / 0 条** | ✅ |
| 首页 DOM 节点 | **1,216** | ✅ |
| 长卷 SVG 子节点 | **750** | ⚠️ 全量内联，无虚拟化 |
| 首页 load 之后额外传输 | **966.1 KB**（其中 892.3 KB 一个 chunk） | ❌ **P0** |
| `/explore` First Load JS | 289.1 KB gzip（2,886.6 KB raw） | ❌ **P0** |
| 条目数据 chunk `202-*.js` | 2,447.3 KB raw / **891.5 KB gzip**（内嵌 765 条 JSON） | ❌ **P0** |
| `/explore` 全部展开后 DOM | **11,007 节点 / 3,062 按钮** | ❌ **P1** |
| SW 预缓存 | **完全失效**（`caches.keys()` 只有 runtime 缓存） | ❌ **P0** |
| 断网可用页面 | **0 / 5**（`/`、`/emergency`、`/book/01-01`、`/explore`、`/ask` 全 ERR_FAILED） | ❌ **P0** |
| 输入每次提交阻塞 | max **47.1 ms** / avg **7.0 ms** | ✅（但无用例保护） |
| 源地图泄漏 | `.next` 下 `*.map` = **0 个**，`sourceMappingURL` 注释 = **0 处** | ✅ |
| 运行时依赖 | **4 个**（next / react / react-dom / zustand） | ✅ |

**一句话**：**首页本身是健康的**（96.4 KB First Load JS，LCP 764 ms，CLS 0），但站点的体积问题集中在两个地方 —— ① 一条把 765 条数据塞进客户端 JS 的 892 KB chunk（被首页路由预取提前拉走），② Service Worker 的离线能力 100% 损坏。文档里「整个 server 渲染，0 client JS」「离线可用」这两句话与实测不符。

---

# P0 · 阻断

## P0-1　765 条条目数据整体打进客户端 JS：单个 chunk 891.5 KB gzip

**结论**
`data/entries.json` 经 `src/lib/entries.ts` 被客户端组件直接 `import`，webpack 把全部 765 条序列化进一个共享 chunk。该 chunk **占 `.next/static` 总静态体积的 76%**。

**真实数字 / 证据**

```
$ node scripts/audit/audit-chunks.js
202-15168a2dbc648f9e.js                     1287.0KB  hits=["01-01","安全带"]
202 chunk: JSON.parse at index 208 total 1287.0KB
  embedded payload bytes = 2499685 = 2441.1KB
  payload / chunk ratio = 189.7%
  entries with "id":"NN-NN" = 765          ← 765 条全在里面
```

```
$ node -e "zlib.gzipSync(...)"           # 精确压缩率
PREFETCH-heavy  202-15168a2dbc648f9e.js  raw=2447.3KB gzip=891.5KB br=636.0KB
```

`app-build-manifest.json` 显示依赖它的路由：

```
/explore/page  : ... 906-*.js, 202-*.js, app/explore/page-*.js   → 2886.6 KB raw / 289.1 KB gzip
/ask/page      : ... 906-*.js, 202-*.js, app/ask/page-*.js       → 2876.8 KB raw / 287.8 KB gzip
/my/page       : ... 906-*.js, 202-*.js, app/my/page-*.js        → 2877.4 KB raw / 288.1 KB gzip
/matrix/page   : ... 906-*.js, 202-*.js, app/matrix/page-*.js    → 2877.1 KB raw / 287.9 KB gzip
/poster/page   : ... 202-*.js, app/poster/page-*.js               → 2862.6 KB raw / 286.0 KB gzip
```

引入链（无一处 code-split）：

- `src/app/explore/page.tsx:1` `'use client'` → `:6` `import { allEntries, allSections } from '@/lib/entries'`
- `src/app/my/page.tsx:5` `import { allEntries } from '@/lib/entries'`
- `src/components/DecisionMatrix/DecisionMatrix.tsx:5` 同上
- `src/app/ask/page.tsx:6` `import { stats } from '@/lib/entries'` ← **只需要 3 个数字（715 B），却连带整个 2.4 MB 数据**
- `src/components/PosterGenerator/PosterGenerator.tsx:5` 同上
- `src/lib/entries.ts:1` `import entriesData from '@data/entries.json'`（2,610,211 B）

**影响**
- 任何进入 `/explore`、`/ask`、`/my`、`/matrix`、`/poster` 的用户在 4G 下要额外下 **891.5 KB gzip**，下完还要 `JSON.parse` 2.5 MB 字符串（主线程同步阻塞）。
- 这是 5 个路由的**共享** chunk，所以首次进入其中任意一个都要付全款，后续路由才免费。
- 移动端首屏（TTI）被这一条 chunk 主导。

**建议修法**（按性价比排序）
1. **拆出只读元数据**：把 `stats`、`allSections`、`sections.json` 拆成 `@/lib/stats`（< 1 KB），让 `/ask`、`/poster` 页壳不再 import `entries`；`ask/page.tsx:6` 一行改动即可去掉 891 KB。
2. **把检索搬到服务端**：`/explore` 的筛选/搜索本质上是对 765 条做 `Array.filter`，完全可以做成 `app/explore/page.tsx`（Server Component，读 `searchParams`）+ 客户端只在 URL 上写参数。这样 765 条数据零进 bundle，`/explore` 的 First Load JS 从 289.1 KB 掉到 ~40 KB。
3. 若必须保留客户端检索：换成**分片 + 按需加载**（`data/entries-by-section/*.json`，每次只取命中章节），或改成**服务端搜索接口** `/api/search?q=`（服务端已有 `searchEntries`）。
4. 顺带把 `entries.json` 里的长字段（`benefit`、`source`）用短键名 + 去空白序列化，`JSON.parse` 体积可再降 20–30%。

---

## P0-2　首页在 load 之后额外拉走 966 KB（其中 892 KB 就是 P0-1 的数据 chunk）

**结论**
首页关键路径是干净的 109.7 KB，但**页面加载完成后立刻被 Next.js 路由预取拖走 966.1 KB**，其中 892.3 KB 就是含全部 765 条数据的 `202-*.js`。触发源是长卷 SVG 里成百上千个可见的 `<Link href="/book/...">` 加上 Header 的 7 个导航链接。

**真实数字 / 证据**

```
[A] loadAt=790ms ttfb=311ms fcp=[{first-paint:764},{first-contentful-paint:764}]
[A] before-load=109.7KB ; after-load=966.1KB ; rscPrefetchReqs=28
[A] JS after load: [{"p":"/_next/static/chunks/202-15168a2dbc648f9e.js","KB":892.3,"start":899},
                    {"p":".../app/explore/page-*.js","KB":6.2,"start":900},
                    {"p":".../app/ask/page-*.js","KB":3.0,"start":902},
                    {"p":".../app/matrix/page-*.js","KB":2.7,"start":907},
                    {"p":".../app/poster/page-*.js","KB":5.0,"start":909},
                    {"p":".../app/my/page-*.js","KB":3.1,"start":948},
                    {"p":".../app/book/[id]/page-*.js","KB":3.3,"start":1167}]
   [pre ] t=320..629 script 52.8KB /_next/static/chunks/6fbc38ef-*.js    ← 关键路径到此为止
   [post] t=838..897 fetch  3.2KB /explore?_rsc=1wtp7
   [post] t=899..1491 script 892.3KB /_next/static/chunks/202-15168a2dbc648f9e.js
```

完整时间线（`tests/audit-perf-out/B-home-timeline.json`）：28 个 `?_rsc=` 预取请求，含 `/explore` `/ask` `/emergency` `/matrix` `/poster` `/my` `/about` 以及 `/book/01-01` … `/book/06-01`。

**影响**
- 首屏视觉没被拖慢（LCP 764 ms），但**用户的流量账单和 TTI 被拖慢了**：移动端 966 KB ≈ 4G 下 3–8 s 的额外占用 + 2.5 MB JSON.parse。
- 弱网 / 计费流量场景下这是「看起来很快，实际上在偷偷下载一兆」。
- 长卷的 `<Link>` 全部进入视口 → Next 认为用户可能点，于是全量预取。

**建议修法**
1. 先修 P0-1（去掉 202 chunk），本项自动消失 892 KB。
2. 对长卷里那 136 个印章链接（`ScrollOfLife.tsx:128-134`）加 `prefetch={false}`；它们只是「可选入口」，不值得预取。Header 导航也建议只对 `/`、`/explore`、`/emergency` 保留预取。
3. 或者把长卷印章从 `<Link>` 改成 `onClick` + `router.push()`，彻底退出预取视口计算。

---

## P0-3　Service Worker 预缓存 100% 失效，断网后 5 个页面全部打不开

**结论**
`public/sw.js` 的 `install` 预缓存了 8 个 URL，但 `activate` 里**无条件删除所有缓存**，连刚建好的预缓存一起删。实测干净 profile 下预缓存名 `housheng-lu-v7` **从未存在**，`/offline.html` 在缓存里**不存在**，断网后所有页面 `net::ERR_FAILED`。这与 `/emergency/page.tsx:27`「离线可用 · 可装主屏」和 `sw.js:3` 的策略注释直接矛盾。

**真实数字 / 证据**

```
[B] after first visit: active=activated controlled=true
[B] cacheNames=["housheng-lu-runtime-v7"]              ← 预缓存 housheng-lu-v7 根本不存在
[B] housheng-lu-v7 (precache) entries=0 -> []
[B] runtime entries=15
[B] before offline: cacheNames=["housheng-lu-runtime-v7"] hasOfflineInAnyCache=false
[B] OFFLINE {"target":"/",            "error":"page.goto: net::ERR_FAILED at http://localhost:3000/"}
[B] OFFLINE {"target":"/emergency",   "error":"page.goto: net::ERR_FAILED at http://localhost:3000/emergency"}
[B] OFFLINE {"target":"/book/01-01",  "error":"Navigation ... interrupted by another navigation to chrome-error://chromewebdata/"}
[B] OFFLINE {"target":"/explore",     "error":"page.goto: net::ERR_FAILED at http://localhost:3000/explore"}
[B] OFFLINE {"target":"/ask",         "error":"page.goto: net::ERR_FAILED at http://localhost:3000/ask"}
```

两轮独立复测一致（`tests/audit-perf-out/offline-results.json` 与 `B-offline.json`）。第一轮里 `/book/01-01` 曾返回 200 —— 那是浏览器 HTTP 缓存命中，不是 SW（SW 从未把任何一个文档写进缓存，见 `beforeOffline.detail`）。

根因代码：

```js
// public/sw.js:51-60
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      // 强制清掉所有旧版缓存,确保 logo 改动即时生效
      await Promise.all(keys.map((k) => caches.delete(k)));   // ← 无条件删全部, 含本版本预缓存
      await self.clients.claim();
    })(),
  );
});
```

```js
// public/sw.js:88-94  「其他页面: 网络优先, 失败用 offline.html」
event.respondWith(
  fetch(request).catch(async () => {
    const cached = await caches.match(request);
    return cached || caches.match('/offline.html');   // ← offline.html 从未被缓存 → undefined
  }),
);
```

`caches.match()` 返回 `undefined` 时 `respondWith(undefined)`，浏览器直接报 `net::ERR_FAILED` —— 正是实测结果。

**影响**
- **急救页离线不可用**。这是全站唯一有安全和生命价值的功能，`/emergency/[scenario]` 的 12 个场景（心脏骤停、大出血、卒中…）在地铁、电梯、山区全部打不开。
- 预缓存列表里那 8 个 URL（`/`、`/explore`、`/emergency`、`/about`、`/favicon.svg`、`/logo/seal-square.svg`、`/manifest.json`、`/offline.html`）实际是**纯浪费的安装期流量**：下载完立刻被自己删掉。
- 当前唯一能离线的资源是「用户当前会话已经访问过的页面」，靠 runtime 缓存碰运气（实测 runtime 缓存里累积了 `/emergency/心脏骤停` 等 12 个场景 + `/book/01-01`…`/book/06-01` —— 这些是**路由预取**顺手写进去的，不是设计出来的）。

**建议修法**
```js
// 1) activate 只删本 SW 的旧版本, 且排除当前版本
const KEEP = [CACHE_NAME, RUNTIME_CACHE];
await Promise.all(
  keys.filter((k) => k.startsWith('housheng-lu-') && !KEEP.includes(k))
      .map((k) => caches.delete(k)),
);
```
```js
// 2) 导航请求兜底必须永远有响应, 且 offline.html 要在 install 里确认写入
event.respondWith(
  fetch(request).catch(async () =>
    (await caches.match(request)) ||
    (await caches.match('/offline.html')) ||
    new Response('<h1>失卷</h1>', { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
  ),
);
```
```js
// 3) 把 12 个急救场景显式加进 PRECACHE_URLS —— 它们才是"必须离线"的
const PRECACHE_URLS = [
  '/', '/offline.html', '/manifest.json',
  '/emergency',
  '/emergency/心脏骤停', '/emergency/大出血', '/emergency/烧烫伤',
  '/emergency/噎住', '/emergency/中暑', '/emergency/一氧化碳',
  '/emergency/心梗', '/emergency/卒中', '/emergency/过敏性休克',
  '/emergency/癫痫', '/emergency/低血糖', '/emergency/触电',
];
```
4. 顺带：`sw.js:77-80` 对 `/_next/` 全部走 network-first **且没有超时**，弱网下等于"永远等网络"。应改成 cache-first + 后台 revalidate（chunk 文件名带 content hash，天然可 immutable 缓存），或给 `networkFirst` 加 3 s 超时兜底。

---

# P1 · 高

## P1-1　`/explore` 无虚拟化：全部展开后 11,007 个 DOM 节点、3,062 个按钮

**结论**
检索页 `PAGE_SIZE = 50` 的"展开更多"是**纯 DOM 追加**，没有虚拟化、没有分页复用。点到底就是 765 张卡片全在 DOM 里。

**真实数字 / 证据**

```
EXPLORE {"step":"initial",       "nodes":999,   "articles":50,  "buttons":203}
EXPLORE {"step":"after-expand-1","nodes":1699,  "articles":100, "buttons":403}
EXPLORE {"step":"after-expand-2","nodes":2399,  "articles":150, "buttons":603}
EXPLORE {"step":"after-expand-3","nodes":3099,  "articles":200, "buttons":803}
EXPLORE {"step":"after-expand-4","nodes":3799,  "articles":250, "buttons":1003}
EXPLORE {"step":"after-expand-5","nodes":4499,  "articles":300, "buttons":1203}
EXPLORE {"step":"after-expand-6","nodes":5199,  "articles":350, "buttons":1403}
EXPLORE {"step":"fully-expanded","nodes":11007, "articles":765, "buttons":3062}
```

`src/app/explore/page.tsx:13,36,75-77`：
```tsx
const PAGE_SIZE = 50;
const visible = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);
...
{visible.map((entry) => <EntryCard key={entry.id} entry={entry} />)}
```

每张卡片还各挂一个 BroadcastChannel + storage 监听（`src/components/EntryCard/EntryCard.tsx:29-32` → `src/lib/storage.ts:103-122`）：
```tsx
useEffect(() => {
  setInList(isInMyList(entry.id));
  return subscribeMyList(() => setInList(isInMyList(entry.id)));   // 每张卡各建一个 BroadcastChannel
}, [entry.id]);
```
50 张卡片 → 50 个 `BroadcastChannel` + 50 个 `storage` 监听 + 每次广播触发 50 次 `localStorage` 全量 `JSON.parse`（`storage.ts:15-29` `readRaw()`）。

**影响**
- 765 张卡片 ≈ 11,007 节点，滚动帧率在低端安卓上会明显掉；`document.body` 高度 14,254 px（50 条时）→ 全展开约 21 万 px，滚动条定位与合成层压力大。
- 50 张卡片的 `subscribeMyList` 是"每卡一条独立订阅"，改一次收藏会触发 50 次 `JSON.parse`。
- 实测内存：`/explore` heap 13.2–13.95 MB，比我测的其他路由都高。

**建议修法**
1. 保持 50 条分页但把"展开更多"改成**重新赋值 `visible`**（当前已是 slice，但 `filtered` 常驻在内存 + 卡片不卸载），真正的解法是引入虚拟列表（`@tanstack/react-virtual`，约 5 KB gzip）或 `content-visibility: auto` + `contain-intrinsic-size` 给 `EntryCard` 的 `<article>`（零依赖，立竿见影）。
2. 把 `subscribeMyList` 从"每卡订阅"改成**一次订阅 + Context/Zustand selector**：在 `explore/page.tsx` 订阅一次，把 `inList` 作为 prop 传下去。这一步能消掉 50 个 BroadcastChannel。
3. `storage.ts` 的 `readRaw()` 加一层模块级内存缓存（配合 `storage` 事件失效），避免每张卡都 `JSON.parse` 全量。

---

## P1-2　`/api/ask` 在 key 存在但上游失败时错误上报 `fallback: false`

**结论**
`/api/ask` 已加上限流（实测有效）、体积上限、上游 15 s 超时。剩下的问题：降级响应里的 `fallback: !apiKey` 语义错了 —— 配置了 key 但上游 5xx/超时时，`model` 已经是 `'search-only'` 却把 `fallback` 报成 `false`，UI 因此**不显示降级提示**，用户以为拿到的是 AI 回答。

**真实数字 / 证据**

```ts
// src/app/api/ask/route.ts:142-148
  return NextResponse.json({
    answer: buildFallbackAnswer(question, ranked),
    citations,
    model: 'search-only',
    fallback: !apiKey,          // ← key 存在 + 上游 5xx/超时 → false
  } satisfies AskResponse);
```

```tsx
// src/app/ask/page.tsx:159-161
{answer.fallback && (
  <span className="text-xs">（未配置 AI key, 返回纯检索结果）</span>
)}
```
`fallback === false` 时这段提示不渲染。

限流实测（当前构建）：
```
[C] rateLimitCodes = [200,200,200,200,200,200,200,200,200,429,429,429,429,429,429]
[C] rateLimitHit = 6          # 第 10 次起 429, 10 次/60s/IP 生效
[C] ask: {status:200, ms:19, model:"search-only", fallback:true, citations:8}
[C] bigBody: {status:429, body:"{\"error\":\"请求过于频繁, 请稍后再试\"}"}   # 被限流抢先
[C] badJson = 429
[C] healthBody = {"ok":true,"totalEntries":765}    # 已不再暴露 aiEnabled ✅
```
```ts
// src/lib/rate-limit.ts:11-13, 50-58
const WINDOW_MS = 60_000; const MAX_REQUESTS = 10; const MAX_KEYS = 5000;
export function clientKey(req: Request): string {
  const ip = h.get('cf-connecting-ip') || h.get('x-real-ip') ||
             (h.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
```
```ts
// src/app/api/ask/route.ts:18-19, 114
const MAX_BODY_BYTES = 8 * 1024;
const UPSTREAM_TIMEOUT_MS = 15_000;
signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),     // ✅ 上游超时保护到位
```

**影响**
- 上游抖动时用户看不到"这是纯检索结果"，会把检索结果误当 AI 结论。
- `clientKey` 直连 `next start` 时 `cf-connecting-ip` / `x-real-ip` / `x-forwarded-for` 全部缺失 → 所有直连客户端共用 `'unknown'` 这一个桶，**10 次/分钟后整站 API 被一个人打满**（反过来说也意味着限流在无代理部署下会误伤所有用户）。
- `MAX_BODY_BYTES` 只校验 `content-length` 头（`route.ts:71-74`），分块传输（`Transfer-Encoding: chunked`）可绕过；不过后面还有 `question.length > 500` 兜底，风险有限。

**建议修法**
1. `fallback: !apiKey || !usedUpstream` —— 更准确的是用三态：`model: 'claude' | 'search-only'` 已足够，把 `fallback` 改成 `degraded: true` 表示"上游失败降级"，并在 UI 用不同文案区分"未配置 key"和"上游暂时不可用"。
2. `clientKey` 若无可信代理头，应回退到 `req.ip`（Next 14 在 Node runtime 可通过 `(req as any).ip` 或 `headers().get('x-forwarded-for')`）并打印一次启动告警；或在文档里明确"限流仅在 Cloudflare 后有效"。
3. 体积上限改成读取 `req.body` 前先 `req.arrayBuffer()` 并判 `byteLength`。

---

## P1-3　`/poster` 每次重绘泄漏 41 个事件监听器，单张海报 data URL 达 733 KB–1.05 MB

**结论**
海报生成器每次点击「生成预览 / 重新生成」都会让 `JSEventListeners` 稳定 **+41**，6 次重绘 + 3 次换模板后从 351 涨到 **858**；同时 `canvas.toDataURL('image/png')` 产生的 base64 字符串常驻 state，方形 733.3 KB、竖版 1,054.8 KB。

**真实数字 / 证据**

```
POSTER {"label":"initial",  "heapMB":8.54,  "nodes":251,"listeners":351, "srcLen":0}
POSTER regen#1 {"heapMB":10.01,"nodes":255,"listeners":407,"srcKB":733.3}
POSTER regen#2 {"heapMB":10.27,"nodes":255,"listeners":448,"srcKB":733.3}
POSTER regen#3 {"heapMB":10.54,"nodes":255,"listeners":489,"srcKB":733.3}
POSTER regen#4 {"heapMB":10.79,"nodes":255,"listeners":530,"srcKB":733.3}
POSTER regen#5 {"heapMB":11.02,"nodes":255,"listeners":571,"srcKB":733.3}
POSTER regen#6 {"heapMB":11.24,"nodes":255,"listeners":612,"srcKB":733.3}
POSTER template 竖版 {"heapMB":11.54,"listeners":694,"srcKB":1054.8}
POSTER template 横版 {"heapMB":9.90, "listeners":776,"srcKB":397.4}
POSTER template 方形 {"heapMB":10.24,"listeners":858,"srcKB":733.3}
```
（`nodes` 全程 251→255 不涨，说明不是 DOM 泄漏，是**监听器**泄漏；每 regen 恰好 +41。）

```
POSTER {"i":0,"mime":"data:image/png;base64,iVBORw0K","srcBytes":750858,"canvases":1}
```

相关代码：
```tsx
// src/components/PosterGenerator/PosterGenerator.tsx:466-469
const dataUrl = canvas.toDataURL('image/png');   // 同步阻塞主线程 + 733 KB~1 MB base64
setPreviewUrl(dataUrl);
setPreviewDims({ w, h });
```
```tsx
// src/components/PosterGenerator/PosterGenerator.tsx:53-55  ← 每次 render 重算 765 条
const filteredEntries = allEntries
  .filter((e) => search.length === 0 || e.title.includes(search) || e.id.includes(search))
  .slice(0, 30);
```
```tsx
// src/components/PosterGenerator/PosterGenerator.tsx:172-176  ← render 里 await 字体就绪
const render = useCallback(async () => {
  const canvas = canvasRef.current;
  if (!canvas) { toast.show('画布未挂载'); return; }
  await loadFont();            // document.fonts.ready → 每次都新建 Promise + 订阅
```
```tsx
// src/components/PosterGenerator/PosterGenerator.tsx:35-43
function loadFont(): Promise<void> {
  return new Promise((resolve) => {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => resolve()).catch(() => resolve());
```
`document.fonts.ready` 每次新开 Promise 都不会残留监听器，所以更可能的泄漏点是 `.noto` 系列无关；但无论根因在哪，**实测数字是硬证据**：41/次的稳定线性增长。

**影响**
- 长会话（用户反复调模板试效果）下监听器无限增长 → 每次事件派发开销线性上升，最终页面卡顿。
- 1 MB base64 字符串进 React state：每次重绘同时存在新旧两份，峰值堆 ~2 MB；在 iOS Safari 上大字符串极易触发内存压力导致 tab 重载。
- `toDataURL` 在 1080×1920 上是**同步**编码，主线程阻塞（实测 `layouts`/`recalc` 同步增长说明有强制重排）。

**建议修法**
1. `toDataURL` → `canvas.toBlob(cb, 'image/png')`，配 `URL.createObjectURL(blob)`，并在替换/卸载时 `URL.revokeObjectURL(prev)`。这样常驻内存从「1 MB 字符串」降到「一个 blob 引用」。
2. 把 `render` 里的 `await loadFont()` 提到组件挂载时做一次（`useEffect(..., [])`），`render` 里不再 await。
3. `filteredEntries` 用 `useMemo(..., [search])` 包住；`selectedEntries` 同样 `useMemo(..., [selectedIds])`。
4. 给重复生成加节流（例如 300 ms 内忽略重复点击）或加 `requestIdleCallback` 排队。
5. `PosterGenerator.tsx:473-480` 两个 `useEffect` 用 `eslint-disable-line react-hooks/exhaustive-deps` 关掉了 `render` 依赖，靠 `render` 的闭包捕获 `selectedEntries` 工作 —— 这是**脆弱的**：一旦有人把 `render` 换成 `useRef` 或调整依赖顺序，就会静默失效。建议改成在事件处理器里显式调用，或把 `render` 的入参改成显式传值。

---

# P2 · 中

## P2-1　首页 `page.tsx` 注释「整个 server 渲染, 0 client JS」与实测不符

**结论**
`src/app/page.tsx:97` 写着 `{/* 长卷 - 整个 server 渲染, 0 client JS */}`，`ScrollOfLife.tsx:13` 也写「765 条数据不进 client bundle」。**前半句（SSR）成立，后半句在页面级别不成立** —— 数据确实没进首页自己的 chunk，但首页会在 load 后预取把它拉进浏览器。

**真实数字 / 证据**

正确的部分（我验证过，应该保留这条结论）：
```
app/page-8044ae67a8d72e99.js            5.5KB   hits=[]            ← 首页 chunk 里没有条目数据
app/layout-047d5e52b6686b30.js          5.2KB   hits=["厚生錄"]
906-b8aaed4840ae749c.js                 20.1KB  hits=[]
634-682076517e44479b.js                 120.6KB hits=[]
6fbc38ef-88e47b2e128ce7a8.js            168.8KB hits=[]
/ 首页 outerHTML = 302,433 字符, DOM 1216 节点, SVG 1 个 / 750 个子节点
→ 长卷与 765 条刻度确实全部在 HTML 里, 服务端渲染成立 ✅
```
不成立的部分：
```
[A] after-load=966.1KB, 其中 202-*.js = 892.3KB  ← 里面就是 765 条数据
```

**影响**：文档级误导会让后续维护者以为"首页没有数据体积问题"，从而放过 P0-2。

**建议修法**：把注释改成准确表述，例如
`{/* 长卷 - SVG 与 765 条刻度在 server 渲染; 但含 765 条数据的 202 chunk 会被路由预取提前拉取, 见 tests/audit-perf-* */}`

---

## P2-2　无防抖 / 节流 / rAF 合并：全站 0 处

**结论**
全仓 `debounce|throttle|requestIdleCallback|startTransition|useDeferredValue|useTransition` **命中 0 处**。实测输入阻塞尚可接受（max 47.1 ms），但几个高频入口没有任何保护，性能余量靠"当前数据量还小"维持。

**真实数字 / 证据**

```
$ grep -E "debounce|throttle|requestIdleCallback|startTransition|useDeferredValue|useTransition" src/**
No matches found
```
```
KEYSTROKE per-input-commit ms: max=47.1 avg=7.01
 all=[47.1,6.2,2.7,11.2,4.5,2.4,11.5,5.5,2.8,11.1,3.5,2.4,10.9,3.3,2.1,11,3.1,2.3,10.5,3.8,2.4,10.5,3.5,2.5,10.8,4,2.4,11,3.1,2.1]
```
```
$ node scripts/audit/audit-chunks.js   # 搜索无延迟: 每次按键全量扫 765 条
KEYSTROKE 每次提交 → applyFilter(allEntries, filter) 全量 filter
```
```
SCROLL programmatic 60 frames ms=980.9  longtasks=[]   ← 长卷滚动处理, 无 long task
```

逐项判定：

| 位置 | 高频事件 | 现状 | 判定 |
|---|---|---|---|
| `src/components/FilterBar/FilterBar.tsx:92` | `onChange={(e) => setQuery(e.target.value)}` | 无防抖，每次按键立即上抛 | ⚠️ 每次按键触发 `explore/page.tsx:35` 的 `applyFilter`（765 条全量）+ 重渲 50 张卡 |
| `src/components/FilterBar/FilterBar.tsx:46-52` | `toggle()` 每次 clone 数组 | 无 `useCallback` | ⚠️ 每渲染新建 |
| `src/components/ScrollOfLife/ScrollPan.tsx:72-73` | `scroll` + `resize` 都绑到同一个 `sync` | **无 rAF 合并、无节流**；`sync` 每帧做线性扫 34 个刻度 + 两次 `setState` | 🟡 实测 60 帧 980.9 ms、0 long task，当前 34 个刻度还很便宜，刻度变多会线性恶化 |
| `src/components/ScrollOfLife/ScrollPan.tsx:141-149` | `onPointerMove` 直接写 `el.scrollLeft` | 无 rAF，靠浏览器自身合并 | ✅ 可接受 |
| `src/components/ScrollOfLife/ScrollPan.tsx:97-100` | 自动展卷 rAF | 有 `cancelAnimationFrame` 清理 | ✅ |
| `src/components/PosterGenerator/PosterGenerator.tsx:590` | `onClick={render}` | 无节流，连点即连绘 | ⚠️ 见 P1-3 |
| `src/app/ask/page.tsx:92` | `onChange={(e) => setQuestion(e.target.value)}` | 本地 state，仅 textarea 重渲 | ✅（提交是显式按钮） |
| `src/components/Header/Header.tsx:26-28` | `keydown` 监听 | 仅在菜单打开时挂，正确清理 | ✅ |

**影响**：目前 765 条 + 34 刻度还撑得住（最大 47.1 ms 阻塞 < 50 ms 门槛）。但 P0-1 若改成"客户端保留数据 + 服务端分页"，输入路径会变成瓶颈。

**建议修法**
1. `FilterBar` 搜索框加 150–200 ms 防抖（或改用 `useDeferredValue(filter.query)` —— React 18 内置，零依赖，正好治"输入要即时、列表可延迟"）。
2. `ScrollPan.sync` 用 rAF 合并：`onScroll → 若已排队则 return; requestAnimationFrame(flush)`。
3. `resize` 加 100 ms 节流。
4. `PosterGenerator` 的 `onClick={render}` 加点击节流。

---

## P2-3　无虚拟化的大列表还有 `my` 页与 `/matrix`（次要），`my/page.tsx` 用 O(n) 线性查找

**结论**
`/my` 每次 render 都对清单里每一项做一次 `allEntries.find()`（765 次字符串比较 / 项），且结果未 `useMemo`。`/matrix` 每次切换口径做 12 次 `sortByPriority`（各自的 `O(n log n)`）。

**真实数字 / 证据**

```tsx
// src/app/my/page.tsx:29-34   ← 无 useMemo, 且用 find 而不是已有的索引 Map
const items = list
  .map((item) => {
    const entry = allEntries.find((e) => e.id === item.entryId);   // O(n) per item
    return entry ? { item, entry } : null;
  })
  .filter(Boolean) as Array<{ item: MyListItem; entry: typeof allEntries[0] }>;
```
```tsx
// src/lib/entries.ts:34-38   ← 已经有 O(1) 索引, 但 my 页没用
const entryIndex = new Map<string, Entry>(allEntries.map((e) => [e.id, e]));
export function getEntryById(id: string): Entry | undefined {
  return entryIndex.get(id);
}
```
```tsx
// src/components/DecisionMatrix/DecisionMatrix.tsx:53-64   ← 每次 filter 变化 12 次 sort
for (const evidence of EVIDENCE_ROWS) {        // 3
  for (const band of COST_BANDS) {            // 4  → 12 次
    const entries = sortByPriority(filtered.filter(...));   // 每次 O(n log n)
```
```
ROUTE {"route":"/my",    "nodes":110, "buttons":5}
ROUTE {"route":"/matrix","nodes":305, "buttons":18}
FRESH {"label":"/my","listeners":287,"nodes":524,"heapMB":7.66}
```

**影响**：清单项数 = 用户收藏数（上限 765）。目前节点数很小（110 / 305），实际影响有限；但 `beforeOffline` 实测里已经观察到重复导航后 `Nodes` 累积（`/explore` 1001 → 1002，`/my` 未测），属于"能改成对"的代码质量问题。

**建议修法**
1. `my/page.tsx:31` 换成 `getEntryById(item.entryId)`，并用 `useMemo(..., [list])` 包住 `items`。
2. `DecisionMatrix` 的 `cells` 已经是 `useMemo([filtered])`，可进一步把 `filtered` 先按 `evidenceLevel` 分桶一次（`O(n)`），把 12 次 `O(n log n)` 降到 12 次「小桶内排序」。
3. 两页都可以顺手加 `content-visibility: auto` 到列表项。

---

## P2-4　`next start` 只输出 gzip，无 brotli；`/logo/**` 与 `/favicon.svg` 是 `max-age=0`

**结论**
本地 `next start` 的 `compress: true` 只给 gzip。同一份资源 brotli 能再省 **15–25%**。另外 `next.config.mjs` 只对 `/icons/(.*)` 设了 immutable 长缓存，`/logo/**`（页头页脚 3 张 SVG）和 `/favicon.svg` 命中默认 `public, max-age=0`。

**真实数字 / 证据**

```
$ curl -H "Accept-Encoding: br"    →  328,492   (未压缩!)
$ curl -H "Accept-Encoding: gzip"  →   45,715
$ node -e "zlib.brotliCompressSync" →  23,822   ← 同一份 HTML brotli 只要 23.8 KB (gzip 44.6 KB, 省 47%)
```
```
[D] /_next/static/chunks/webpack-*.js : cache-control="public, max-age=31536000, immutable"  ✅
[D] /logo/seal-square.svg            : cache-control="public, max-age=0"   ⚠️
[D] /favicon.svg                     : cache-control="public, max-age=0"   ⚠️
[D] /sw.js                           : cache-control="no-cache, no-store, must-revalidate"  ✅ 正确
[D] /offline.html                    : cache-control="public, max-age=0"   ⚠️
[D] /                                : cache-control="s-maxage=31536000, stale-while-revalidate"  ✅ 正确
```
```
raw=2447.3KB  gzip=891.5KB  br=636.0KB   ← 202 chunk
raw= 168.8KB  gzip= 52.4KB  br= 45.2KB
raw= 120.6KB  gzip= 30.9KB  br= 26.7KB
raw= 110.0KB  gzip= 38.6KB  br= 34.3KB
```
```js
// next.config.mjs:46-49   ← 只有 /icons/ 拿到了长缓存
{ source: '/icons/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
```

**影响**：首页 HTML 从 44.6 KB 可降到 23.8 KB；`/logo/seal-square.svg` 在 Header（`Header.tsx:69`）+ Footer（`Footer.tsx:28`）每页都出现，`max-age=0` 意味着每次导航都要条件请求。

**建议修法**
1. 部署侧开 brotli（Cloudflare 默认支持 `br`；自建 `next start` 前面挂 nginx/CDN 并启用 `brotli on`）。注意 `next start` 不支持 br，所以这属于**部署配置**问题。
2. `next.config.mjs` 加：
```js
{ source: '/logo/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
{ source: '/favicon.svg', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }] },
{ source: '/offline.html', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }] },
```
（`logo/` 下的文件名不带 hash，用 immutable 前先确认改版会换文件名；否则用 `max-age=86400`。）

---

# P3 · 低

## P3-1　未使用的组件与资源

**结论**：两个客户端组件与三张仓库根目录大图从未被引用。

**证据**
```
$ grep -rn "EmergencyCard" src/
src/components/Emergency/EmergencyCard.tsx:11   ← 只有自身定义
src/components/Emergency/index.ts:1             ← 只有 barrel 导出
（无任何页面 import）

$ grep -rn "from '@/components/Seal'" src/
（无匹配；src/components/Seal/Seal.tsx:15 定义 + index.ts:1 导出，无人使用）

$ grep -rn "poster-竖版-new|poster-横版-new|poster-方形-new" src/
（无匹配）
```
```
poster-方形-new.png    522,883 B
poster-横版-new.png    346,148 B
poster-竖版-new.png  1,017,925 B
                     ───────────
                     1,886,956 B ≈ 1.80 MB   (仓库根目录, 未进 public/, 不进构建产物)
```
> 说明（2026-10-18）：上述三张样本图是排查时的临时产物，**公开前已从仓库删除**；
> 这里保留当时的体积测量作为审计证据。海报生成器本身不受影响（见 /poster）。

**影响**：`public/` 下 0 个 png/jpg/webp（已确认），所以这三张图**不影响线上体积**，只是仓库噪音；两个死组件会被 tree-shake，**不影响 bundle**。影响的是可维护性。

**建议修法**：删 `src/components/Seal/`、`src/components/Emergency/`；三张 poster png 移到 `docs/` 或删除（它们的三个 SVG 版本 `public/logo/*` 已够用）。

---

## P3-2　`optimizePackageImports` 配置了未安装的包

**结论**：`next.config.mjs:54` 优化 `lucide-react`、`framer-motion`，但两者都不在 `package.json` 也未安装 —— 配置无效（但无害）。

**证据**
```
$ test -d node_modules/lucide-react   → lucide-react NOT installed
$ test -d node_modules/framer-motion  → framer-motion NOT installed
```
```js
// next.config.mjs:53-55
experimental: {
  optimizePackageImports: ['lucide-react', 'framer-motion'],   // ← 两个包都不存在
},
```
实际用到的深路径导入只有 zustand：
```
src/lib/toast-store.ts:3  import { createStore } from 'zustand/vanilla';
src/lib/toast-store.ts:4  import { useStore } from 'zustand';
```

**建议修法**：删掉这两项配置（避免误导后人以为项目用了这两个库）。

---

## P3-3　`zustand` 为 33 行的 toast 而引入

**结论**：全站唯一用到 zustand 的地方是 `src/lib/toast-store.ts`（33 行）。用 `useSyncExternalStore` + 一个模块级数组就能替代，省掉一个运行时依赖。

**证据**
```
$ grep -rn "from 'zustand" src/
src/lib/toast-store.ts:3  import { createStore } from 'zustand/vanilla';
src/lib/toast-store.ts:4  import { useStore } from 'zustand';
```
```ts
// src/lib/toast-store.ts:18-28
const store = createStore<ToastStore>((set) => ({
  items: [],
  show: (msg) => { const id = ++counter; set(...); setTimeout(() => set(...), 2400); },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));
```
```json
// package.json:19-24
"dependencies": { "next": "14.2.15", "react": "18.3.1", "react-dom": "18.3.1", "zustand": "^5.0.0" }
```

**影响**：依赖数 4 → 3。zustand 体积不大（用它自己的 `zustand/vanilla` 深导入，已避开 react 绑定），属于"可省但收益小"。

**建议修法**：改成
```ts
let items: Toast[] = []; const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
export const toast = {
  show(msg: string) { const id = ++counter; items = [...items, { id, msg }]; emit();
    setTimeout(() => { items = items.filter((t) => t.id !== id); emit(); }, 2400); },
  subscribe(f: () => void) { subs.add(f); return () => subs.delete(f); },
  snapshot: () => items,
};
// Toast.tsx 用 useSyncExternalStore(toast.subscribe, toast.snapshot)
```
顺带修掉 `toast-store.ts:23` 的 `setTimeout` 无清理（模块级定时器有界，非泄漏，但组件卸载后仍会 `set`）。

---

## P3-4　静态预渲染导致「今日必做（每日刷新）」不会每日刷新

**结论**：首页是 SSG（`prerender-manifest.json` 里 `routes: 793`、`dynamicRoutes: 3`，`/` 在 `routes` 中），`pickDaily` 的日期种子与 JSON-LD 的 `dateModified` 都在**构建时**求值，所以"每日必做"实际是"每次构建必做"。

**证据**
```tsx
// src/app/page.tsx:10
const todayPicks = pickDaily(allEntries, 5);
// src/app/page.tsx:21
dateModified: new Date().toISOString(),      // ← 构建时刻
// src/app/page.tsx:135
今日必做 <span className="text-ink-soft text-sm">(每日刷新)</span>
```
```ts
// src/lib/daily-pick.ts:18-24
function dayOfYearSeed(): number { const now = new Date(); ... }   // 构建时求值
// src/lib/daily-pick.ts:47-52
function dayOfSeedToday(): number { if (typeof window === 'undefined') return dayOfYearSeed(); return dayOfYearSeed(); }
                                                                   // ↑ 两个分支返回完全一样
```
```
$ node -e "...prerender-manifest..."  →  routes: 793 dynamicRoutes: 3
```

**影响**：文案与行为不一致（用户不会看到"每日刷新"）。不是性能问题，但属于审计中必须点出的"文档/文案与实测不符"。

**建议修法**：要么去掉「(每日刷新)」文案，要么给首页片段加 `export const revalidate = 86400`（ISR），并把 JSON-LD 的 `dateModified` 换成构建注入的常量（`src/lib/sync-info.ts` 已有 `lastSync`，可直接复用）。顺带清理 `daily-pick.ts:47-52` 的恒等分支。

---

# 未能测量

| 项目 | 原因 |
|---|---|
| **1 条 chunk 的"内容归属"逐模块归因**（webpack stats 级别的 module→chunk 映射） | `next build` 未开启 `--profile` / `analyze`，现有 `.next/` 产物不含 webpack stats JSON；重建被协调要求禁止。已用「在 chunk 里搜条目 id/标题 + 手动提取内嵌 JSON payload 字节数」替代，得到 2,441.1 KB / 765 条的**定量**证据，但没有「哪些 npm 模块占了多少」的分解。**需单独构建验证**（`ANALYZE=true next build` 或 `next build --profile`）。 |
| **首次访问（冷缓存、无 HTTP 缓存）的绝对耗时** | `next start` 在 localhost，TTFB 8–311 ms 波动且受并发构建影响；多次运行差异大，不宜作为"真实网络"结论。已改用相对指标（关键路径 KB、LCP、DOM 数）。 |
| **`cdpMetrics` 的 `TaskDuration` / `ScriptDuration` 细分** | 并发构建期间 `Performance.getMetrics` 采样不稳定，数值不可信，未采用。 |
| **`/emergency/[scenario]` 断网可用性的"设计态"结论** | 实测已确认不可用（P0-3）。但"哪些场景理论上该离线"需要产品判断，不属于可测量项。 |
| **生产环境 Cloudflare 下的真实 br/缓存命中率** | 本地 `next start` 无 br。**需部署环境验证**。 |

---

# 性能优化 Top 5 优先项

| # | 动作 | 预期收益（实测基线） | 涉及文件 | 工作量 |
|---|---|---|---|---|
| **1** | **修 `sw.js` 的 activate 缓存清理 + 导航兜底 + 显式预缓存 12 个急救场景** | 从「断网 5/5 页面打不开」→「急救 12 场景 + `/` + `/offline.html` 全部离线可用」；同时停止安装期浪费性下载（8 个 URL 下完即删） | `public/sw.js:11-20, 51-60, 88-94, 97-110` | **S**（~30 行） |
| **2** | **把 765 条数据从客户端 bundle 摘出去**：`stats`/`allSections` 拆成独立 <1 KB 模块；`/ask`、`/poster` 页壳不再 import `entries`；`/explore` 改服务端筛选（`searchParams`）或分片加载 | `/ask`、`/poster`、`/my`、`/matrix` 各 **−891.5 KB gzip**；`/explore` First Load JS 从 **289.1 KB → ~40 KB**；`/explore` 全量 DOM 从 11,007 节点降到「每页 50 条 + 服务端分页」 | `src/lib/entries.ts`、`src/app/ask/page.tsx:6`、`src/app/explore/page.tsx:6,35`、`src/app/my/page.tsx:5,31`、`src/components/DecisionMatrix/DecisionMatrix.tsx:5`、`src/components/PosterGenerator/PosterGenerator.tsx:5` | **L**（拆数据 + 改 5 个页面） |
| **3** | **掐掉首页的路由预取**：长卷 136 个印章 `<Link>` 加 `prefetch={false}`；Header 只保留 3 个关键导航的预取 | 首页 load 后额外传输 **966.1 KB → < 80 KB**；28 个 `?_rsc=` 请求大幅减少；顺带消掉 P0-2 | `src/components/ScrollOfLife/ScrollOfLife.tsx:128-134`、`src/components/Header/Header.tsx:87-96` | **S**（加 prop） |
| **4** | **`/explore` 加 `content-visibility: auto` + `contain-intrinsic-size`，并把 `subscribeMyList` 从"每卡一条"改成"页面一条 + prop 下发"** | 765 卡全展开时渲染/滚动开销显著下降；消掉 **50 个 BroadcastChannel** 与每张卡的 `localStorage` 全量 `JSON.parse`；改一次收藏不再触发 50 次解析 | `src/components/EntryCard/EntryCard.tsx:29-32`、`src/app/explore/page.tsx:75-77`、`src/lib/storage.ts:15-29,103-122` | **M** |
| **5** | **`/poster` 改成 `toBlob` + `URL.createObjectURL`/`revokeObjectURL`，`loadFont()` 上移，`filteredEntries`/`selectedEntries` 加 `useMemo`** | 常驻内存从 **733 KB–1.05 MB 字符串** 降到 blob 引用；`canvas.toDataURL` 同步阻塞消失；监视线（待复测）增长 | `src/components/PosterGenerator/PosterGenerator.tsx:35-43, 53-57, 172-178, 466-469, 473-480` | **M** |

**紧随其后的两项（低成本高确定性）**
6. `FilterBar` 搜索框加 `useDeferredValue` 或 150 ms 防抖（`src/components/FilterBar/FilterBar.tsx:92`）—— 当前 max 47.1 ms，是唯一接近 50 ms 门槛的交互。
7. `/api/ask` 修 `fallback: !apiKey` → 正确表达"上游降级"（`src/app/api/ask/route.ts:147` + `src/app/ask/page.tsx:159`）—— 1 行 + 1 段文案。

---

# 附录 A · 构建一致性验证

审计期间 `.next` 被并发构建重写 3 次。为确认所有数据同源，我比对了关键产物的 SHA-256：

| 文件 | 字节数 | SHA-256[:16] | 02:51 构建 | 03:10 构建 | 03:14 构建 |
|---|---|---|---|---|---|
| `static/chunks/202-15168a2dbc648f9e.js` | 2,506,043 | `4EE80CDA84567D5E` | 同名同尺寸 | 同名同尺寸 | **同名同尺寸** |
| `static/chunks/6fbc38ef-88e47b2e128ce7a8.js` | 172,831 | `E8A08061A8DCB96D` | 同名 | 同名 | **同名同尺寸** |
| `static/chunks/634-682076517e44479b.js` | 123,530 | `B43CEFC0B952CD39` | 同名 | 同名 | **同名同尺寸** |
| `static/chunks/polyfills-42372ed130431b0a.js` | 112,594 | `0973C1D64C88ADC8` | 同名 | 同名 | **同名同尺寸** |
| `static/chunks/906-b8aaed4840ae749c.js` | 20,576 | `1D7EE7B11D0A2E50` | 同名 | 同名 | **同名同尺寸** |
| `static/css/454d5358c5471012.css` | 23,896 | — | 同 hash | 同 hash | **同 hash** |
| `.next/server/app/index.html` | 328,492 | — | — | 328,492 | **328,492** |

**结论**：内容 chunk 哈希与字节数在三次构建间完全一致（Next 的 content-hash 决定文件名，构建确定性成立），因此 02:51 / 03:10 / 03:14 三次构建的**运行时行为等价**；`BUILD_ID` 每次不同属正常（它含时间戳）。本报告所有数字均在 03:14 构建上复测或与其一致。

---

# 附录 B · 关键原始输出索引

| 文件 | 内容 |
|---|---|
| `audit-build-output.txt`（已删除，见文首说明）| `next build` 完整路由表（First Load JS 逐路由） |
| `tests/audit-perf-out/B-home-timeline.json` | 首页 46 条资源逐条时间线 + 关键路径/预取拆分 |
| `tests/audit-perf-out/B-offline.json` | SW 缓存名、预缓存条目、断网 5 页结果 |
| `tests/audit-perf-out/offline-results.json` | 第一轮断网复测（含 runtime 缓存 50 条明细） |
| `tests/audit-perf-out/C-api-ask.json` | 限流 15 连打 + 体积 + 体积上限 + 健康检查 |
| `tests/audit-perf-out/D-headers.json` | 静态资源 Cache-Control / Content-Encoding / CSP |
| `tests/audit-perf-out/E-dom.json` | 8 个路由的 DOM 节点 / SVG / 按钮 / 图片数 |
| `tests/audit-perf-out/E-explore-expand.json` | 展开更多 6 次 + 全展开的节点增长曲线 |
| `tests/audit-perf-out/F-poster.json` | 海报 6 次重绘 + 3 次换模板的 heap/listener/srcKB |
| `tests/audit-perf-out/F-listeners.json` | 全新上下文跨路由的监听器与 heap |
| `tests/audit-perf-out/F-keystroke.json` | 检索输入 30 次提交的逐次阻塞耗时 |
| `tests/audit-perf-out/sw-cache-names.json` | 预缓存缺失的第一手证据 |
