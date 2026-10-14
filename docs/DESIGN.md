# 厚生錄 · 视觉设计规范

> 版本：v0.1 · 2026-10

本文档是 [BRAND.md](BRAND.md) 的延伸，定义具体的组件规范、间距尺度、字体尺度、动效时长。**前端实现必须以本文档为准**。

---

## 一、设计 Token（CSS Variables）

```css
:root {
  /* 颜色 */
  --color-bg: #F2E8D5;
  --color-bg-alt: #E8DCC0;
  --color-ink: #2A2418;
  --color-ink-soft: #6B5D4A;
  --color-vermillion: #8B3A3A;
  --color-indigo: #2C4A6B;
  --color-seal: #B73229;
  --color-border: #C9B894;

  /* 字体 */
  --font-zh-heading: "LXGW WenKai TC", "Songti SC", serif;
  --font-zh-body: "LXGW WenKai TC", "Songti SC", serif;
  --font-en-heading: "EB Garamond", Georgia, serif;
  --font-en-body: "EB Garamond", Georgia, serif;
  --font-mono: "JetBrains Mono", "SF Mono", monospace;

  /* 字号 */
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-md: 18px;
  --text-lg: 22px;
  --text-xl: 28px;
  --text-2xl: 36px;
  --text-3xl: 48px;
  --text-display: 72px;

  /* 行高 */
  --leading-tight: 1.2;
  --leading-normal: 1.6;
  --leading-loose: 2.0;

  /* 间距 (8 倍数) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-8: 48px;
  --space-10: 64px;
  --space-12: 96px;

  /* 圆角 (几乎不用) */
  --radius-sm: 2px;
  --radius-md: 4px;

  /* 阴影 (几乎不用) */
  --shadow-fold: 0 1px 0 var(--color-border);

  /* 缓动 */
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --duration-slow: 320ms;

  /* 容器 */
  --container-narrow: 720px;
  --container-base: 960px;
  --container-wide: 1200px;
}
```

---

## 二、字体尺度

### 标题

| 等级 | 字号 | 字重 | 行高 | 用途 |
|---|---|---|---|---|
| H1 (回目) | 36-48px | Heavy | 1.2 | 单节回目标题 |
| H2 (条目标题) | 22-28px | Bold | 1.3 | 条目标题 |
| H3 (段落标题) | 18-22px | Regular | 1.4 | 卡片内分块标题 |

### 正文

| 类型 | 字号 | 行高 | 用途 |
|---|---|---|---|
| 大字正文 | 18-22px | 1.8 | "说人话" 块 |
| 标准正文 | 16px | 1.8 | 一般说明 |
| 小字 | 14px | 1.6 | 备注、出处 |
| 注脚 | 12px | 1.5 | 章节号、来源 DOI |

### 强调

- "说人话" 用大字正文（22px）+ 居中
- "成本 / 收益 / 证据" 用 14px + 双行夹注排版
- DOI / 来源链接用 12px JetBrains Mono

---

## 三、间距系统

所有间距必须是 4 的倍数，优先使用 8 的倍数。

| 用途 | 间距 |
|---|---|
| 卡片内边距 | 24px (space-5) |
| 卡片之间 | 32px (space-6) |
| 段落之间 | 16px (space-4) |
| 节标题上下 | 48px (space-8) |
| 页面边距 (桌面) | 48-64px |
| 页面边距 (手机) | 16-24px |

---

## 四、组件规范

### 4.1 条目卡片 (EntryCard)

#### 默认态（说人话层）

```
┌─────────────────────────────────────────────┐
│ [A 级] [极高] [寿命] [¥0] [📌 藏] [✓] [传] │ ← 顶栏 12px 徽章
│                                             │
│   第 X 条 · 系安全带, 前排后排都系             │ ← 22px 粗体
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │  坐前排系上安全带, 出车祸时被撞死的       │ │ ← 22px 居中
│ │  概率大约降一半。坐轻型卡车前排的降六成。   │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│   ──── 朱丝栏 1px ────                      │ ← 分隔线
│                                             │
│   出处 · NHTSA 2022 · n=... · [DOI ↗]        │ ← 12px 灰
└─────────────────────────────────────────────┘
```

#### 展开态（数据层）

在默认态基础上，展开部分：

```
   ──── 收益 ────                              ← 14px 印章标签
   美国 2022 年统计, 死在车里、能查到系没系带的,
   有 50% 没系。
                                              ← 16px 间距
   ──── 成本 ────
   ¥0 · 不花钱 · 顺手 · 不用毅力
                                              ← 16px 间距
   ──── 证据 ────
   A 级 · 多项队列 · 争议: 无
                                              ← 16px 间距
   ──── 相关 ────                              ← 仅展开时显示
   第 13 节 · 急救 · 第 24 节 · 看病
```

#### 交互规范

- **hover**：背景从 `#F2E8D5` → `#E8DCC0`，无位移，无阴影
- **点击**：右半边向内翻折（rotateY -90deg）展开
- **已收藏**：右上角"藏"字变红色
- **已做**：右下角出现小印章
- **加载**：印章淡入（不旋转）

### 4.2 印章 (Seal)

```html
<div class="seal" data-state="default|active|done">
  <span class="seal-text">01-01</span>
</div>
```

```css
.seal {
  width: 32px;
  height: 32px;
  border: 1.5px solid var(--color-seal);
  color: var(--color-seal);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 11px;
  transition: all var(--duration-base) var(--ease-default);
}

.seal[data-state="active"] {
  background: var(--color-seal);
  color: var(--color-bg);
  animation: seal-stamp 300ms var(--ease-default);
}

.seal[data-state="done"] {
  background: var(--color-seal);
  color: var(--color-bg);
  opacity: 0.8;
}

@keyframes seal-stamp {
  0% { transform: scale(1.4); opacity: 0; }
  60% { transform: scale(0.95); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
```

### 4.3 长卷 (Scroll)

```html
<div class="scroll-container">
  <svg class="scroll" viewBox="...">
    <!-- 背景纹理 -->
    <!-- 印章序列 -->
    <!-- 章节分割线 -->
  </svg>
</div>
```

```css
.scroll-container {
  overflow-x: auto;
  overflow-y: hidden;
  height: 240px;
  background: var(--color-bg);
}

@media (max-width: 768px) {
  .scroll-container {
    height: auto;
    overflow-x: hidden;
    overflow-y: auto;
  }
}
```

### 4.4 筛选条 (FilterBar)

```html
<aside class="filter-bar">
  <section>
    <h3>章节</h3>
    <ul>...</ul>
  </section>
  <section>
    <h3>性价比</h3>
    <ul>...</ul>
  </section>
  ...
</aside>
```

```css
.filter-bar {
  width: 240px;
  padding: var(--space-5);
  border-right: 1px solid var(--color-border);
  background: var(--color-bg-alt);
}

.filter-bar h3 {
  font-size: 14px;
  color: var(--color-ink-soft);
  margin: var(--space-4) 0 var(--space-2);
}
```

---

## 五、关键页面布局

### 5.1 首页 (/)

#### 桌面

```
┌────────────────────────────────────────────────┐
│ Header (顶栏 64px)                              │
├────────────────────────────────────────────────┤
│ Hero (回目标题 240px)                           │
│   厚生錄                                        │
│   七百条生计, 都在案头。                         │
│   《高性价比人生指南》视觉化再刊本                │
├────────────────────────────────────────────────┤
│ 长卷 (240px 高, 横向滚动)                        │
│   印章序列从左到右: 备孕 → 临终                  │
├────────────────────────────────────────────────┤
│ 急救速查 + 今日必做 (双栏 2:1)                  │
├────────────────────────────────────────────────┤
│ 人生阶段入口 (5 个卡片)                          │
├────────────────────────────────────────────────┤
│ Footer (含 CC BY 4.0 落款)                      │
└────────────────────────────────────────────────┘
```

#### 手机

```
┌──────────────────┐
│ Header (56px)    │
├──────────────────┤
│ Hero             │
├──────────────────┤
│ 长卷 (竖向)      │
├──────────────────┤
│ 急救速查         │
├──────────────────┤
│ 今日必做         │
├──────────────────┤
│ 人生阶段入口     │
├──────────────────┤
│ Footer           │
└──────────────────┘
```

### 5.2 检索器 (/explore)

#### 桌面 (三栏 240 / flex / 320)

```
┌──────────┬──────────────────┬──────────┐
│ FilterBar│ EntryList (中)   │ EntryMeta│
│ 240px    │ flex             │ 320px    │
│          │                  │          │
│ 章节     │ [卡片]           │ 选中条目 │
│ 性价比   │ [卡片]           │ 详情     │
│ 口径     │ [卡片]           │          │
│ 证据     │ ...              │          │
│ 成本     │                  │          │
│ 场景     │                  │          │
└──────────┴──────────────────┴──────────┘
```

#### 手机 (单栏, 左右抽屉)

- FilterBar → 顶部抽屉
- EntryMeta → 卡片底部

### 5.3 单节阅读 (/book/[id])

```
┌────────────────────────────────────────────────┐
│ Header                                         │
├────────────────────────────────────────────────┤
│ ← 上一回 · 第十三回 · 紧急情况 · 下一回 →        │
├────────────────────────────────────────────────┤
│                                                │
│   第十三回                                      │ ← 48px Heavy
│   ─────────────────                            │
│   紧 急 情 况 · 先 做 什 么                      │ ← 24px 居中
│                                                │
│   ┌─ 本卷目录 ─────────────────────────┐      │
│   │  心脏骤停 · 大出血 · 烧烫伤 · ...   │      │
│   └────────────────────────────────────┘      │
│                                                │
│   ──── 第十三回 · 心脏骤停 ────                │ ← 28px
│                                                │
│   说人话:                                       │
│   ┌────────────────────────────────────┐      │
│   │  院外心脏骤停, 每多一个人会按,       │      │ ← 22px 居中
│   │  存活率就多一分。                    │      │
│   │  先按, 别等救护车。                  │      │
│   └────────────────────────────────────┘      │
│                                                │
│   ── 收益 ──                                    │ ← 14px 标签
│   中国 38,227 例院外心脏骤停...                │
│                                                │
│   ── 成本 ──                                    │
│   ¥0 · 不花钱 · 顺手 · 不用毅力                 │
│                                                │
│   ── 证据 ──                                    │
│   A 级 · 多项队列 · 争议: 无                    │
│                                                │
│   ── 出处 ──                                    │
│   NEJM 2024 · 38,227 例 · 中国多中心            │
│   doi.org/10.1056/NEJMoa2404321                 │
│                                                │
│   ─────────────────                             │
│   〔第十三回 · 心脏骤停 · 终〕                  │
│                                                │
└────────────────────────────────────────────────┘
```

### 5.4 急救 PWA (/emergency)

```
┌──────────────────┐
│ ▣ 急方 · 急救卷    │ ← 56px header
├──────────────────┤
│                  │
│   〔 急 〕        │ ← 72px 朱砂红
│                  │
│   今有人倒地,     │ ← 22px 居中
│   无呼吸, 无反应, │
│   急当如何?       │
│                  │
│   ─────────       │
│                  │
│   [心脏骤停]      │ ← 列表按钮
│   [大出血]        │
│   [烧烫伤]        │
│   [噎住]          │
│   [中暑]          │
│   [一氧化碳]      │
│                  │
│   ─────────       │
│   [📲 加入主屏]   │
│   [ⓘ 使用说明]    │
│                  │
├──────────────────┤
│ ⚠️ 内容可能过时, 仅供参考 │
└──────────────────┘
```

子页（点击"心脏骤停"后）：

```
┌──────────────────┐
│ ← 心脏骤停  ⚠️ 救命 │
├──────────────────┤
│                  │
│   〔 一 〕 按胸口  │ ← 36px Heavy
│                  │
│   ───────         │
│                  │
│   〔 二 〕 叫人打 120 │
│                  │
│   ───────         │
│                  │
│   〔 三 〕 别停    │
│                  │
│   ───────         │
│                  │
│   [📞 直接拨打 120]│
│   [▶ 视频演示]    │
│   [♻️ 重新计时]   │
│                  │
├──────────────────┤
│ 来源: NEJM 2024   │
│ ⚠️ 内容可能过时, 仅供参考 │
└──────────────────┘
```

---

## 六、Logo 规范

### 6.1 朱砂方印 (SealSquare)

```svg
<svg viewBox="0 0 96 96">
  <!-- 不规则仿旧印泥边 (SVG filter feTurbulence) -->
  <rect x="4" y="4" width="88" height="88" 
        fill="none" stroke="#B73229" stroke-width="3"
        filter="url(#rough)"/>
  
  <!-- 厚生录 三字九宫格排印 -->
  <text x="48" y="36" text-anchor="middle" 
        font-family="LXGW WenKai TC" font-size="22" 
        font-weight="900" fill="#B73229">厚</text>
  <text x="30" y="58" text-anchor="middle" 
        font-family="LXGW WenKai TC" font-size="22" 
        font-weight="900" fill="#B73229">生</text>
  <text x="66" y="58" text-anchor="middle" 
        font-family="LXGW WenKai TC" font-size="22" 
        font-weight="900" fill="#B73229">錄</text>
</svg>
```

### 6.2 横排书衣 (BookCover)

```svg
<svg viewBox="0 0 320 80">
  <text x="160" y="42" text-anchor="middle"
        font-family="LXGW WenKai TC" font-size="36"
        font-weight="900" fill="#2A2418">厚生錄</text>
  <line x1="40" y1="58" x2="280" y2="58" 
        stroke="#8B3A3A" stroke-width="1"/>
  <text x="160" y="74" text-anchor="middle"
        font-family="EB Garamond" font-size="14"
        font-style="italic" fill="#6B5D4A"
        letter-spacing="2">HouSheng Lu</text>
</svg>
```

### 6.3 钤印落款 (SealEnd)

```svg
<svg viewBox="0 0 120 40">
  <ellipse cx="60" cy="20" rx="56" ry="16"
           fill="none" stroke="#B73229" stroke-width="2"/>
  <text x="60" y="26" text-anchor="middle"
        font-family="LXGW WenKai TC" font-size="16"
        font-weight="900" fill="#B73229"
        letter-spacing="4">厚生錄</text>
</svg>
```

---

## 七、响应式断点

| 断点 | 宽度 | 行为 |
|---|---|---|
| mobile | < 640px | 单栏、FilterBar 抽屉、长卷竖排 |
| tablet | 640-1024px | 单栏 + 抽屉、EntryMeta 折叠 |
| desktop | 1024-1440px | 三栏、横向长卷 |
| wide | > 1440px | 三栏 + 居中容器 1200px |

---

## 八、动画缓动函数

| 名称 | 函数 | 用途 |
|---|---|---|
| 默认 | cubic-bezier(0.4, 0, 0.2, 1) | 大部分过渡 |
| 翻折 | cubic-bezier(0.7, 0, 0.3, 1) | 卡片展开 |
| 印章 | cubic-bezier(0.6, -0.1, 0.3, 1.2) | 印章盖下（带回弹） |
| 缓慢 | cubic-bezier(0.25, 0.1, 0.25, 1) | 长卷滚动、章节切换 |

---

## 九、组件清单

| 组件 | 状态 | 路径 |
|---|---|---|
| Seal | 已设计 | src/components/Seal/ |
| EntryCard | 已设计 | src/components/EntryCard/ |
| FilterBar | 已设计 | src/components/FilterBar/ |
| Scroll | 设计中 | src/components/Scroll/ |
| ScrollOfLife (长卷) | 设计中 | src/components/ScrollOfLife/ |
| EmergencyCard | 设计中 | src/components/Emergency/ |
| Header | 设计中 | src/components/Header/ |
| Footer | 设计中 | src/components/Footer/ |
| HamburgerMenu | 设计中 | src/components/HamburgerMenu/ |

---

**〔 厚生錄 · DESIGN v0.1 〕**
