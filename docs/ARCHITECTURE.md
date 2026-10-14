# 厚生錄 · 技术架构

> 版本：v0.1 · 2026-10

---

## 一、总体架构

```
┌────────────────────────────────────────────────────────────────┐
│                         用户浏览器                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Next.js 14 App Router (RSC + Client Components)         │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │   首页     │  │  检索器    │  │ 急救 PWA   │         │  │
│  │  │ (静态)     │  │ (客户端)   │  │ (PWA)      │         │  │
│  │  └────────────┘  └────────────┘  └────────────┘         │  │
│  └──────────────────────────────────────────────────────────┘  │
│           │                                  │                  │
│           ▼                                  ▼                  │
│  ┌─────────────────┐              ┌──────────────────┐          │
│  │  Service Worker │              │  localStorage    │          │
│  │  (急救离线)      │              │  (我的清单)       │          │
│  └─────────────────┘              └──────────────────┘          │
└────────────────────────────────────────────────────────────────┘
              │
              ▼
┌────────────────────────────────────────────────────────────────┐
│                       Cloudflare Pages                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│  │  静态 HTML │  │  JS / CSS  │  │  fonts     │               │
│  │  (SSG)     │  │            │  │  (woff2)   │               │
│  └────────────┘  └────────────┘  └────────────┘               │
│           │                                                     │
│           ▼                                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  CDN 边缘缓存 (全球)                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
              ▲
              │ (24h 同步)
              │
┌────────────────────────────────────────────────────────────────┐
│                    GitHub Actions (CI)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ sync.yml     │  │ parse.yml    │  │ deploy.yml   │         │
│  │ 拉上游       │→ │ md → json    │→ │ 部署到 CF    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────────────────────────────────────────────┘
              ▲
              │
┌────────────────────────────────────────────────────────────────┐
│            eternity4719/HowToLiveBetter (上游)                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 二、技术选型

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | Next.js 14 App Router | RSC 减少 JS 体积；SSG 部署便宜；路由清晰 |
| 样式 | Tailwind CSS + CSS Variables | 设计 token 化；与品牌文档一一对应 |
| 类型 | TypeScript strict | 数据结构稳定（entries.json） |
| 内容 | markdown-it + 自定义规则 | 解析上游 `book/*.md` |
| 搜索 | FlexSearch (客户端) | 无后端、3KB、体积小 |
| 状态 | Zustand (轻量) | localStorage 持久化 |
| 动效 | Framer Motion | 翻折、印章等需要 spring |
| 图标 | lucide-react (备用) | 不撞 Material 风 |
| 字体 | next/font (霞鹜文楷) | 自动优化、自动 subset |
| 部署 | Cloudflare Pages | 免费、HTTPS、全球 CDN |
| PWA | next-pwa | 急救 PWA 离线 |
| 测试 | Vitest + Playwright | 单元 + E2E |
| 代码规范 | ESLint + Prettier | 统一风格 |
| Git hooks | husky + lint-staged | 提交前检查 |

---

## 三、目录结构

```
housheng-lu/
├── README.md
├── LICENSE                       # CC BY 4.0 (内容)
├── LICENSE-CODE                  # MIT (代码)
├── package.json
├── pnpm-lock.yaml
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc
├── .gitignore
├── .gitmodules                   # 上游 git submodule
│
├── docs/                         # 辅助文档
│   ├── BRAND.md
│   ├── DESIGN.md
│   ├── ARCHITECTURE.md           # 本文档
│   ├── COMPLIANCE.md
│   ├── ROADMAP.md
│   └── CONTRIBUTING.md
│
├── .github/
│   └── workflows/
│       ├── sync.yml              # 拉上游
│       ├── parse.yml             # 解析 → JSON
│       ├── deploy.yml            # 部署到 CF Pages
│       └── lint.yml              # 代码质量
│
├── public/
│   ├── favicon.svg
│   ├── logo/
│   │   ├── seal-square.svg
│   │   ├── book-cover.svg
│   │   └── seal-end.svg
│   ├── og/
│   │   ├── og-default.png        # 1200×630
│   │   └── og-template.svg
│   ├── icons/                    # 篆字图标
│   └── fonts/                    # 字体自托管 (按需)
│
├── content/
│   └── upstream/                 # git submodule → 原书
│       └── book/                 # 34 个 markdown
│
├── data/
│   ├── entries.json              # 解析后的全部条目
│   ├── sections.json             # 章节列表
│   ├── search-index.json         # 预构建的搜索索引
│   └── sync-log.json             # 同步历史
│
├── scripts/
│   ├── sync-upstream.mjs         # 拉上游 → content/upstream
│   ├── parse-entries.mjs         # md → entries.json
│   ├── build-search-index.mjs    # 构建搜索索引
│   └── verify-compliance.mjs     # 验证合规标注
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # 首页 (/)
│   │   ├── globals.css
│   │   ├── explore/
│   │   │   └── page.tsx          # /explore
│   │   ├── book/
│   │   │   └── [id]/
│   │   │       └── page.tsx      # /book/[id]
│   │   ├── emergency/
│   │   │   ├── page.tsx          # /emergency
│   │   │   └── [scenario]/
│   │   │       └── page.tsx      # /emergency/[scenario]
│   │   ├── my/
│   │   │   └── page.tsx          # /my
│   │   ├── about/
│   │   │   └── page.tsx          # /about
│   │   ├── api/
│   │   │   └── og/
│   │   │       └── route.tsx     # 动态 OG 图
│   │   ├── manifest.ts           # PWA manifest
│   │   └── robots.ts
│   │
│   ├── components/
│   │   ├── Header/
│   │   ├── Footer/
│   │   ├── HamburgerMenu/
│   │   ├── Seal/                 # 印章
│   │   ├── EntryCard/            # 条目卡片
│   │   ├── FilterBar/            # 筛选
│   │   ├── ScrollOfLife/         # 长卷
│   │   ├── Emergency/            # 急救相关
│   │   ├── Stages/               # 人生阶段
│   │   └── ui/                   # 通用基础组件
│   │
│   ├── lib/
│   │   ├── entries.ts            # 数据访问
│   │   ├── search.ts             # 搜索
│   │   ├── filter.ts             # 筛选逻辑
│   │   ├── storage.ts            # localStorage 封装
│   │   └── compliance.ts         # 合规工具
│   │
│   ├── hooks/
│   │   ├── useEntries.ts
│   │   ├── useFilter.ts
│   │   ├── useMyList.ts
│   │   └── useSeal.ts
│   │
│   └── styles/
│       ├── globals.css
│       └── tokens.css            # 设计 token
│
└── tests/
    ├── unit/
    │   ├── parse-entries.test.ts
    │   └── filter.test.ts
    └── e2e/
        ├── home.spec.ts
        ├── explore.spec.ts
        └── emergency.spec.ts
```

---

## 四、数据流

### 4.1 构建时

```
1. GitHub Action 定时 (每 24h)
   ↓
2. sync-upstream.mjs
   - cd content/upstream && git pull
   - 检查更新内容
   ↓
3. parse-entries.mjs
   - 读取 content/upstream/book/*.md
   - 用 markdown-it 解析
   - 提取每条建议的字段：
     id, section, title, cost, plainLanguage,
     benefit, evidenceLevel, source, controversy, related
   - 输出 data/entries.json
   - 生成 data/sections.json
   - 生成 data/sync-log.json
   ↓
4. build-search-index.mjs
   - 用 FlexSearch 构建倒排索引
   - 输出 data/search-index.json
   ↓
5. Next.js build
   - SSG 生成全部页面
   ↓
6. 部署到 Cloudflare Pages
```

### 4.2 运行时

```
用户请求 /
  ↓
Cloudflare CDN 边缘节点
  ↓ (命中)
返回静态 HTML + RSC payload
  ↓
浏览器水合 (hydrate)
  ↓
按需加载 /explore、/emergency、/my 等客户端组件
  ↓
数据访问：
  - 服务端数据：直接 import data/entries.json (RSC)
  - 客户端数据：localStorage (我的清单)
  - 搜索：客户端 FlexSearch (data/search-index.json)
```

### 4.3 数据结构

#### Entry（单条建议）

```typescript
interface Entry {
  // 基础
  id: string;                    // "01-01"
  number: number;                // 1
  section: number;               // 1

  // 内容
  title: string;                 // "系安全带, 前排后排都系"
  cost: {
    money: 'free' | 'low' | 'medium' | 'high';
    time: 'instant' | 'hours' | 'daily';
    will: 'none' | 'some' | 'high';
    detail: string;              // "一袋比普通盐贵几元"
  };
  plainLanguage: string;         // "说人话" 块
  benefit: string;               // "收益" 块
  evidenceLevel: 'A' | 'B' | 'C';
  evidenceDetail?: string;       // "多项 RCT"
  source: string;                // "NHTSA 2022"
  sourceUrl?: string;            // DOI / 链接
  controversy?: string;          // 争议备注
  related: string[];             // ["13-1", "24-3"]

  // 派生
  ratio: 'extreme' | 'high' | 'normal';  // 性价比档
  caliber: 'life' | 'money' | 'time' | 'freedom';  // 口径
  benefitMagnitude: 'large' | 'medium' | 'small';

  // 元
  syncDate: string;              // "2026-10-06"
  upstreamHash: string;          // 内容哈希
}
```

#### Section（章节）

```typescript
interface Section {
  id: number;                    // 1
  number: number;                // 1
  title: string;                 // "不要早死"
  titleFormatted: string;        // "第 01 节 · 不要早死"
  entryCount: number;            // 42
  entries: Entry[];              // 全部条目
  description: string;           // 章节导览
}
```

---

## 五、关键模块设计

### 5.1 上游同步模块 (`scripts/sync-upstream.mjs`)

```javascript
// 拉取上游
cd content/upstream
git fetch origin
git reset --hard origin/main
cd ../..

// 检查变更
const before = readFileSync('data/sync-log.json');
const after = execSync('cd content/upstream && git rev-parse HEAD');

// 写入日志
writeFileSync('data/sync-log.json', JSON.stringify({
  lastSync: new Date().toISOString(),
  upstreamHash: after.toString().trim(),
  upstreamUrl: 'https://github.com/eternity4719/HowToLiveBetter',
  entriesCount: 699
}, null, 2));
```

### 5.2 Markdown 解析模块 (`scripts/parse-entries.mjs`)

```javascript
// 每条建议的格式：
// ### 5. 把家里的食盐换成低钠盐（钾盐）
// - 成本：...
// - 说人话：...
// - 收益：...
// - 证据等级：A
// - 来源：...
// - 备注：...

const entries = [];
const md = fs.readFileSync('book/01-不要早死.md', 'utf-8');

// 用正则切分每条
const entryBlocks = md.matchAll(
  /^### (\d+)\. (.+?)$\n([\s\S]+?)(?=^### |\n## |\n$)/gm
);

for (const match of entryBlocks) {
  const [, number, title, body] = match;
  // 解析字段...
}
```

### 5.3 合规模块 (`src/lib/compliance.ts`)

```typescript
export function getAttribution() {
  return {
    source: '高性价比人生指南',
    sourceUrl: 'https://github.com/eternity4719/HowToLiveBetter',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    syncDate: process.env.NEXT_PUBLIC_SYNC_DATE,
    isModified: true,
    modificationNote: '视觉化再刊, 内容未做实质性改动',
  };
}

export function AttributionLine() {
  const a = getAttribution();
  return (
    <p>
      本卷依据 <a href={a.sourceUrl}>{a.source}</a>
      按 <a href={a.licenseUrl}>{a.license}</a> 视觉化再刊。
      本站为非官方衍生作品, 与原作者无合作关系。
      内容可能过时, 以最新上游为准。
    </p>
  );
}
```

---

## 六、性能目标

### 6.1 Lighthouse 目标

| 指标 | 目标 |
|---|---|
| Performance | ≥ 95 |
| Accessibility | ≥ 95 |
| Best Practices | ≥ 95 |
| SEO | ≥ 95 |

### 6.2 核心 Web Vitals

| 指标 | 目标 |
|---|---|
| LCP | < 1.5s |
| FID | < 100ms |
| CLS | < 0.05 |
| TTFB | < 200ms (CDN 命中) |

### 6.3 体积控制

- 首次加载 JS ≤ 100KB (gzip)
- 字体按需 subset
- 篆字图标 ≤ 4KB 每个

---

## 七、部署流程

### 7.1 Cloudflare Pages 配置

```toml
# wrangler.toml
name = "housheng-lu"
compatibility_date = "2024-10-01"

[build]
command = "pnpm build"
output = ".next"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### 7.2 域名绑定

- `housheng.lu` (主)
- `www.housheng.lu` (重定向到主)
- DNS 走 Cloudflare
- HTTPS 自动

### 7.3 同步与部署的触发

```
定时 (每 24h):
  .github/workflows/sync.yml
  - checkout
  - pnpm install
  - pnpm sync
  - pnpm parse
  - 若有变更, commit + push
  - 触发 deploy.yml

手动触发:
  workflow_dispatch → deploy.yml
```

---

## 八、安全与隐私

| 项 | 措施 |
|---|---|
| 用户数据 | 仅 localStorage，不上传 |
| HTTPS | Cloudflare 自动 |
| CSP | 严格 CSP，禁止 inline script |
| Headers | X-Frame-Options DENY 等 |
| 第三方依赖 | 仅开源、可审计 |
| 隐私政策 | /about 页明确说明 |

---

## 九、扩展性

未来可能扩展：

- 多语言（i18n）— 准备目录结构
- 移动 App (Capacitor) — 复用 Web 代码
- API 服务 — 给其他衍生品提供数据
- 浏览器扩展 — 海报生成器、悬浮查阅
- 印刷品定制 — 按阶段生成 PDF

---

**〔 厚生錄 · ARCHITECTURE v0.1 〕**
