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
3. **同步**：本站内容每 24 小时自动从上游仓库同步，同步日志见 [docs/COMPLIANCE.md](docs/COMPLIANCE.md)

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

```bash
# 克隆仓库
git clone https://github.com/housheng-lu/housheng-lu.git
cd housheng-lu

# 安装依赖
pnpm install

# 拉取上游并解析为 JSON（首次需要）
pnpm sync

# 启动开发服务
pnpm dev

# 打开 http://localhost:3000
```

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

- [docs/BRAND.md](docs/BRAND.md) —— 品牌系统（名字、slogan、配色、字体、视觉隐喻）
- [docs/DESIGN.md](docs/DESIGN.md) —— 视觉设计规范（间距、动效、字体尺度、组件）
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) —— 技术架构（模块、数据流、构建、部署）
- [docs/COMPLIANCE.md](docs/COMPLIANCE.md) —— 合规白皮书（CC BY 4.0 三义务、自动同步方案）
- [docs/ROADMAP.md](docs/ROADMAP.md) —— 路线图（MVP / V1.0 / V2.0 / 长期）
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) —— 贡献指南

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
