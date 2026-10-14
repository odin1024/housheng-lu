# 厚生錄 · 路线图

> 版本：v0.1 · 2026-10

---

## 总体节奏

| 阶段 | 时间 | 目标 |
|---|---|---|
| **MVP** | 第 1-25 天 | 首页 + 检索器 + 急救 PWA + 单节阅读 + 我的清单，上线可访问 |
| **V1.0** | 第 26-45 天 | 决策矩阵 + 海报生成器 + 完整动效 + Lighthouse 95+ + SEO 完整 |
| **V2.0** | 第 46-75 天 | AI 对话 + 强引用 + 多语言骨架 + 移动 App 封装 |
| **长期** | 75 天+ | 社区化 + 印刷品 + 公开 API + 浏览器扩展 |

---

## MVP（第 1-25 天）

### 目标

- 用户能打开 `housheng.lu`（或测试域名）
- 能看长卷首页、点击印章进条目
- 能用三栏检索器按 5 维度筛选
- 能装急救 PWA、离线用
- 能保存自己的清单

### 子任务

| # | 任务 | 验收标准 |
|---|---|---|
| P0 | 辅助文档 7 份 | BRAND / DESIGN / ARCH / COMP / ROADMAP / CONTRIB / README 全部完成 |
| P0 | Logo 4 套 SVG | 朱砂方印 / 横排 / 落款 / favicon |
| P1 | 上游解析脚本 | `pnpm sync && pnpm parse` 后 data/entries.json 含 699 条 |
| P1 | 数据结构 TypeScript | Entry / Section 类型定义完整 |
| P2 | 首页长卷 | 横向 SVG 长卷, 印章可点, 移动端竖排 |
| P3 | 检索器 /explore | 三栏布局, 5 维度筛选, 实时刷新 |
| P3 | 单节阅读 /book/[id] | 仿古籍排版, 回目标题, 完整数据层 |
| P4 | 急救 PWA /emergency | 黑底朱砂急方, 离线可用, 可装主屏 |
| P5 | 我的清单 /my | localStorage, 待办/已做/收藏三栏 |
| P6 | 部署 | Cloudflare Pages + 域名 + HTTPS |
| P7 | 推广物料 | OG 图、README 截图、demo 视频 |

### 不在 MVP

- 决策矩阵（V1.0）
- 海报生成器（V1.0）
- AI 对话（V2.0）
- 多语言（V2.0 起步）
- 移动 App（V2.0）
- 浏览器扩展（长期）

---

## V1.0（第 26-45 天）

### 目标

MVP 基础上增加深度交互，达到"作品集"水准。

### 功能

- **决策矩阵可视化**：手绘长卷版，按口径切换
- **海报生成器**：选 N 条 → 生成可分享方形图
- **完整动效**：翻折、印章、藏字、章节切换全部到位
- **Lighthouse 95+**：性能、可访问性、最佳实践、SEO 全部 95+
- **SEO 完整**：sitemap.xml / robots.txt / 结构化数据 / Open Graph
- **搜索增强**：⌘K 全局搜索、高亮、跳转

### 质量

- 单元测试覆盖率 ≥ 70%
- E2E 测试覆盖关键路径
- 无 console.error / warning
- TypeScript strict 无 any
- ESLint 0 error

---

## V2.0（第 46-75 天）

### 功能

- **AI 对话 + 强引用**：用 Claude / OpenAI API，对话每句话必须引用条目编号
- **多语言骨架**：预留 i18n 目录结构
- **移动 App 封装**：用 Capacitor 打包 iOS / Android
- **离线下载**：可选下载离线包

### 增长

- 公众号适配版
- 小红书引流物料
- 微博话题运营
- GitHub Star 突破 1k

---

## 长期（75 天+）

### 社区化

- 接受 PR（条目校对、翻译、设计）
- CONTRIBUTING.md 完善
- Discord / 微信群运营

### 商业化（可选）

- 印刷品定制（按人生阶段）
- 周边（朱砂方印钥匙扣、急救卡片）
- 公开 API（给其他衍生品用）

### 跨平台

- 浏览器扩展（海报生成器 + 悬浮查阅）
- VS Code 扩展（边写代码边查）
- 微信小程序

---

## 成功指标

### MVP 上线时（第 25 天）

- [ ] 网站可访问
- [ ] Lighthouse Performance ≥ 90
- [ ] 内容合规 footer 完整
- [ ] 同步机制工作（dry-run 验证）
- [ ] 急救 PWA 离线可用

### V1.0 完成时（第 45 天）

- [ ] Lighthouse 全项 ≥ 95
- [ ] 单元测试 ≥ 70% 覆盖
- [ ] E2E 测试 100% 关键路径
- [ ] GitHub Stars ≥ 100
- [ ] 日 UV ≥ 100

### V2.0 完成时（第 75 天）

- [ ] AI 对话引用准确率 ≥ 90%
- [ ] 移动 App 上架应用市场
- [ ] GitHub Stars ≥ 1k
- [ ] 日 UV ≥ 1k
- [ ] 多语言 ≥ 2 个语种

---

## 风险与对应

| 风险 | 对应 |
|---|---|
| 上游仓库改 license | CONTRIBUTING.md 明确只能接受 CC BY 4.0 同步；定期 review |
| 上游仓库删除/私有化 | 缓存 last-known-good 版本；保留原书 PDF/EPUB 在仓库 |
| 域名无法注册 | 备选 housheng.cn / housheng.com / houshenglu.com |
| Cloudflare 政策变化 | 备选 Vercel / Netlify |
| 急救信息过时 | 显著免责声明 + 每 24h 同步 + 引导用户咨询专业急救 |
| 与三家衍生站撞车 | 视觉气质完全不同 + 互补定位 + 主动署名 |

---

**〔 厚生錄 · ROADMAP v0.1 〕**
