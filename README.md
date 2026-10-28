# 厚生錄

> **《高性价比人生指南》视觉化再刊本**
> 七百条生计，都在案头。

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![License: CC BY 4.0](https://img.shields.io/badge/正文-CC%20BY%204.0-blue)](https://creativecommons.org/licenses/by/4.0/)
[![Code: MIT](https://img.shields.io/badge/代码-MIT-green)](LICENSE-CODE)
[![Sync Status](https://img.shields.io/badge/同步-每日%2006:00%20UTC-brightgreen)](.github/workflows/sync.yml)

---

## 这是什么

**厚生錄** 是开源电子书《[高性价比人生指南](https://github.com/eternity4719/HowToLiveBetter)》的**视觉化再刊本**。

原书以 Markdown 形式收录了 699 条循证生活建议，每条写明成本、收益、证据等级与原始出处。
本项目在不改动原书内容的前提下，将其重新设计为一部**可以翻阅、可以筛查、可以离线急救**的现代古籍善本。

气质上，本项目定位为：

> **循证生活的古籍善本，不是工具站。**

## 与原书的关系

按 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 协议衍生，已尽到三项义务：

1. **署名**：每一页 footer 与每张导出图均标注「改编自 eternity4719/HowToLiveBetter」
2. **许可证**：正文采用 CC BY 4.0，代码采用 MIT
3. **同步**：`.github/workflows/sync.yml` 每日从上游同步一次，**仅在数据真的变化时提交**（解析是幂等的）；
   同步记录见 `data/sync-log.json`（含上游 commit 号），合规说明见 [docs/COMPLIANCE.md](docs/COMPLIANCE.md)

本站为**非官方衍生作品**，与原作者无合作关系。原书著作权归原作者所有，本项目的"再刊"工作（包括视觉设计、交互实现、技术实现）按 CC BY 4.0 与 MIT 协议开放。

## 主要功能

- **长卷首页** —— 一张从左到右的手绘长卷，按人生阶段排列全部条目，点击印章进入条目
- **检索器** —— 按章节、性价比、证据等级、口径、成本五维筛选
- **单节阅读** —— 仿古籍排版的单节深读体验，含回目标题、双行夹注、出处小字
- **急救 PWA** —— 黑底朱砂字"急方"卷子，可离线、可装主屏、3 步内可执行
- **我的清单** —— 全部基于 localStorage，零账号、零上传
- **同步上游** —— 每日 06:00 UTC 自动拉取原书更新

## 技术栈

- **框架**：Next.js 14 (App Router) + React Server Components
- **样式**：Tailwind CSS + CSS Variables（设计 token 化）
- **内容**：从原仓库 `book/*.md` 解析为 JSON，构建时静态生成
- **字体**：霞鹜文楷 + EB Garamond + JetBrains Mono
- **动效**：Framer Motion（克制使用）
- **部署**：Cloudflare Pages
- **PWA**：next-pwa + Workbox

## 快速开始

**数据随仓库提供**，所以克隆后即可构建，**不需要联网**：

```bash
git clone https://github.com/odin1024/housheng-lu.git
cd housheng-lu

pnpm install
pnpm dev            # 打开 http://localhost:3000
```

> **环境要求**：Node **22.13+**（本项目用 pnpm 11，它要求到此版本；CI 与 Pages 工作流都用 Node 22）。

想构建生产版本：`pnpm build && pnpm start`（`prebuild` 会检测到数据已存在并跳过联网同步）。

> **本机起服请只监听本机**：`pnpm start -- -H 127.0.0.1`（或 `node node_modules/next/dist/bin/next start -H 127.0.0.1`）。
> 原因见 [SECURITY.md](SECURITY.md)：`next@14` 有一条 critical 公告只在 **Windows 宿主**上成立，而本项目参考环境就是 Windows；
> 默认 `next start` 会绑 `0.0.0.0`，同网段可直连，没必要冒这个风险。

> **构建内存**：`next build` 会为 797 个静态页起构建 worker，**建议至少留 3GB 可用内存**。
> 实测在只剩 2.9GB 的机器上会以 `exit code 134`（V8 OOM）失败 —— 那是内存不足，不是代码问题；
> 腾出内存重跑即可通过。内存实在紧张时可在 `next.config.mjs` 临时加
> `experimental: { workerThreads: false, cpus: 1 }` 降低并发（会更慢）。

### 数据从哪来

```
上游 GitHub (CC BY 4.0)  ──pnpm sync──▶  content/upstream/  ──pnpm parse──▶  data/*.json  ──▶  站点
                             (不入库)                              (入库)
```

- `data/entries.json`（765 条，2549KB）等**派生数据已入库**，因此 clone 即用、且数据有版本历史可回滚
- `content/upstream/`（原始 markdown，6.1MB/320 文件）**不入库**：它是"原料"不是构建必需品，需要时执行 `pnpm sync` 拉取
- 想更新到最新上游：`pnpm build:data`（= `sync` + `parse`），或设 `FORCE_DATA_SYNC=1` 让构建时强制同步
- 上游由机器人每日同步：`.github/workflows/sync.yml` 会在数据**真的变化**时提交（解析是幂等的，上游没变就不会产生空提交）

### 部署

两种形态，按需要选：

#### A. GitHub Pages（零成本公网访问，纯静态）

推送到 `main` 后由 `.github/workflows/deploy-pages.yml` 自动构建并发布：

```
https://<用户名>.github.io/housheng-lu/
```

启用只需两步：
1. 仓库 **Settings → Pages → Source** 选 **GitHub Actions**
2. 推一次 `main`（或在 Actions 里手动跑一次 Deploy to GitHub Pages）

本地预览同一份静态产物：

```bash
mv src/app/api /tmp/api-backup                                # 静态导出不支持 route handler
NEXT_OUTPUT=export NEXT_BASE_PATH=/housheng-lu pnpm build     # 产物在 out/
```

> 静态托管下**没有 AI 问答**（页面自动显示「未启用（纯检索）」；检索/急方/矩阵/海报/我的全部可用）。
> 想在公网也能 AI 回答，用下面的 B。

#### B. 支持 Node 运行时的托管（含 AI）

`/api/ask` 声明了 `runtime = 'nodejs'`，其 SSRF 校验用到 `node:dns` 与 `node:net`，因此**需要 Node 运行时**：

| 方案 | 支持 API 路由 | 说明 |
|---|---|---|
| **Vercel**（推荐）| ✅ | Next.js 原生支持，环境变量在项目设置里配 |
| **自建 Node** | ✅ | `pnpm build && pnpm start -p 3000`，前面挂 Nginx/CDN |
| Cloudflare Pages | ❌ 当前不可用 | 需要 `@cloudflare/next-on-pages`，且 Workers 边缘运行时没有 `node:dns` → 要先改写 AI 路由或关闭 AI |

> 本仓库**不内置 deploy workflow**（原来的 Cloudflare 版本结构上不可能成功，已删除）。
> 部署时记得：① 在托管平台单独配置 AI 环境变量（云平台不会读你本地的 `.env.local`）；
> ② **公开部署且启用 AI 时必须在边缘做限流**，详见 [SECURITY.md](SECURITY.md)。

### 测试

```bash
# 1) 首次需要装浏览器（约 120MB）
npx playwright install chromium

# 2) 先起生产服务
node node_modules/next/dist/bin/next start -p 3000 -H 127.0.0.1

# 3) 跑测试（默认读系统浏览器缓存目录，通常不必设环境变量）
npx playwright test <spec> --workers=1
```

> 浏览器装在别处时才需要 `PLAYWRIGHT_BROWSERS_PATH=<目录>`。
> 若报 `Executable doesn't exist ... chromium_headless_shell-XXXX`，说明浏览器版本与 `@playwright/test` 不匹配，
> 重跑 `npx playwright install chromium` 即可。

约 75 个 Playwright spec：`check-*` 是带断言的回归守卫，`audit-*` 是审计用例，`shots-*` 只出图（供文档引用）。
检索质量与阈值校准类用例直接在进程内调用检索函数（毫秒级、零 token 成本）；
`check-ai-path` / `check-byok` 会真实调用上游模型，跑一次约消耗几万 token。

### 启用 AI 问答（可选，不配也能用）

不配任何环境变量时，「问卷」页自动进入**纯检索模式**：回答全部来自原书 765 条检索，
不调用任何模型，功能完整。想启用 AI 有两种方式：

**方式一：部署者配（花部署者的额度）**

```bash
cp .env.example .env.local   # 模板里有全部可填项与说明
# 编辑 .env.local，至少填两项：
#   ASK_API_BASE=https://你的中转站/v1    # OpenAI 兼容接口
#   ASK_API_KEY=sk-xxxxxxxx
pnpm dev                     # 改完要重启
```

**方式二：访问者自带 key（BYOK，不改文件、不重启）**

只要部署者配了 `ASK_API_BASE`（哪怕不填 `ASK_API_KEY`），问答页就会出现
**「⚙ AI 设置」**入口，可以填 **接口协议 / 接口地址 / 模型名 / 自己的 key** 四项：

- 用**别人的中转站**或**厂商官方 API** 都行（OpenAI 兼容填 `/chat/completions` 风格地址；Anthropic 官方选 `/messages` 协议）
- 输入框带常用地址与模型名建议（DeepSeek / OpenAI / Moonshot / 智谱 / 百炼 / 方舟），也可自行填写
- 配置只存在**访问者自己的浏览器**（localStorage），随提问发给本站服务器仅用于当次调用，服务端不记录、不存储、不回传

> **两条安全规则（不可绕过）**
> 1. **自定义地址必须同时填自己的 key。** 否则本站会拿部署者的 key 去请求访问者给的地址 ——
>    攻击者只要把地址指向自己的服务器，就能直接偷走部署者的 key。
> 2. **不允许指向本机/内网/云元数据地址。** 协议白名单 + 主机名检查 + DNS 解析后复核 IP 三层拦截
>    （含 `127.0.0.1`、`10./172.16/192.168.`、`169.254.169.254`、`::1`、`*.internal`，
>    以及 `2130706433`/`0x7f000001` 这类花式写法）。
>
> 公开部署若想彻底关掉自定义地址，设 `ASK_ALLOW_CUSTOM_BASE=0`。
>
> 对外提供 AI 回答是**要花钱的**：`/api/ask` 的限流目前是可被伪造请求头绕过的单进程内存
> 实现，公开部署请在边缘（Cloudflare WAF / KV）做持久化限流，详见
> [审计报告](docs/AUDIT-2026-10-16.md) P0-E。

## 目录结构

```
housheng-lu/
├── README.md
├── LICENSE                    # CC BY 4.0
├── LICENSE-CODE               # MIT
├── docs/                      # 全部辅助文档
│   ├── BRAND.md
│   ├── DESIGN.md
│   ├── ARCHITECTURE.md
│   ├── COMPLIANCE.md
│   ├── ROADMAP.md
│   └── CONTRIBUTING.md
├── public/                    # 静态资源
│   ├── favicon.svg
│   ├── logo.svg
│   └── logo-horizontal.svg
├── content/upstream/          # 原书仓库 (git submodule)
├── data/entries.json          # 解析后的结构化数据
├── scripts/                   # 同步 + 解析脚本
└── src/
    ├── app/                   # Next.js App Router
    ├── components/            # UI 组件
    ├── lib/                   # 工具函数
    └── styles/                # 全局样式与设计 token
```

## 文档导航

- [SECURITY.md](SECURITY.md) —— **安全说明：已知风险、缓解措施、密钥与 BYOK 边界**（部署前务必读）
- [docs/AUDIT-2026-10-16.md](docs/AUDIT-2026-10-16.md) —— 全项目审计报告（50 个维度、已修项与待办）
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) —— 技术架构（模块、数据流、构建、部署）
- [docs/COMPLIANCE.md](docs/COMPLIANCE.md) —— 合规白皮书（CC BY 4.0 三义务、自动同步方案）
- [docs/BRAND.md](docs/BRAND.md) —— 品牌系统（名字、slogan、配色、字体、视觉隐喻）
- [docs/DESIGN.md](docs/DESIGN.md) —— 视觉设计规范（间距、动效、字体尺度、组件）
- [docs/ROADMAP.md](docs/ROADMAP.md) —— 路线图（MVP / V1.0 / V2.0 / 长期）
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) —— 贡献指南
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) —— 贡献者公约

## 致谢

- **原作者** [eternity4719](https://github.com/eternity4719) 创作了这部开源电子书
- **字体** 霞鹜文楷（[LXGW WenKai](https://github.com/lxgw/LxgwWenkaiTC)，OFL 1.1 授权）
- **衍生品生态** [howtolivebetter.net](https://howtolivebetter.net) · [how-to-live-better.com](https://how-to-live-better.com) · [how2livebetter.net](https://how2livebetter.net)

## 许可证

- 正文内容：[CC BY 4.0](LICENSE)
- 代码：[MIT](LICENSE-CODE)
- 字体（霞鹜文楷）：[OFL 1.1](https://github.com/lxgw/LxgwWenkaiTC/blob/main/LICENSE)

---

**〔 厚生錄 〕**
