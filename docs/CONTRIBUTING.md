# 厚生錄 · 贡献指南

> 欢迎参与厚生錄建设。我们尤其欢迎以下贡献：
> 1. 上游同步问题修复
> 2. 视觉设计迭代
> 3. 错误条目反馈
> 4. 翻译
> 5. 文档改进

---

## 一、提 issue

### 1.1 内容错误

原书内容请直接到上游仓库提 issue：
https://github.com/eternity4719/HowToLiveBetter/issues

本仓库**不接受**修改条目内容的 PR（内容由原作者维护）。

### 1.2 本仓库问题

- 同步失败
- 视觉 bug
- 性能问题
- 急救信息过时
- 文档错误
- 翻译问题

请到本仓库 issue 区：
https://github.com/odin1024/housheng-lu/issues

---

## 二、提 PR

### 2.1 分支规范

```
main              # 主分支, 受保护
feat/xxx          # 新功能
fix/xxx           # 修复
docs/xxx          # 文档
style/xxx         # 视觉/样式
refactor/xxx      # 重构
test/xxx          # 测试
```

### 2.2 Commit 规范

```
<type>(<scope>): <subject>

<body>

<footer>
```

type 取值：`feat` / `fix` / `docs` / `style` / `refactor` / `test` / `chore`

示例：
```
feat(home): add scroll-of-life component

- 实现横向 SVG 长卷
- 印章可点击进入条目
- 移动端竖排适配

Closes #12
```

### 2.3 PR 检查清单

提 PR 前确认：

- [ ] `pnpm lint` 通过
- [ ] `pnpm type-check` 通过
- [ ] `pnpm test` 通过
- [ ] 如果改了 UI, 截图附在 PR 描述里
- [ ] footer 仍含完整署名
- [ ] 没引入新的依赖（如果引入, 说明理由）

---

## 三、设计贡献

### 3.1 改 Logo

Logo 是项目核心资产，修改前请：

1. 在 issue 区开 RFC 说明改稿理由
2. 维护者讨论通过后再开 PR
3. 保留 OFL / CC BY 4.0 等上游授权

### 3.2 改配色 / 字体

配色与字体在 `docs/BRAND.md` 定义。修改前请：

1. 更新 BRAND.md
2. 同步更新 `src/styles/tokens.css`
3. 跑通测试再 PR

### 3.3 加新组件

请遵守 `docs/DESIGN.md` 的设计 token 系统。新组件必须：

- 仅使用 `src/styles/tokens.css` 中定义的 token
- 不引入新的颜色 / 字体
- 提交 Storybook 故事（可选, V1.0 后强制）

---

## 四、重拍 README 素材（横幅 / 截图 / 分享卡）

README 里的图片是**自动生成**的，界面改动后需要重拍，否则截图会和实际界面不一致。

```bash
# 1) 先构建并起生产服务（脚本会访问 http://127.0.0.1:3000）
pnpm build
node node_modules/next/dist/bin/next start -p 3000 -H 127.0.0.1

# 2) 一次性重拍全部素材
npx playwright test shots-readme --workers=1
```

| 产物 | 说明 |
|---|---|
| `docs/assets/banner.png` | 仓库首页横幅（1280×420）。**数字自动从 `data/entries.json` 读取**，上游同步后不用手改 |
| `docs/assets/shot-*.png` | 各页面截图（桌面 1280 宽 + 手机 390 宽） |
| `public/og-image.png` | 社交分享卡片（1200×630），由 `layout.tsx` 的 `openGraph.images` 引用 |

设计源在 `tests/fixtures/readme-banner.html` 与 `tests/fixtures/og-image.html`（改样式就改这两个文件）。
落款印走内联 data URL —— 因为 fixture 在 `tests/fixtures/` 下，相对路径 `public/logo/*.svg` 会失效。

> 提交前建议跑 `npx playwright test check-deployed --workers=1`（配 `PUBLIC_BASE_URL`）：
> 它能抓到"子路径部署时根相对资源 404"这类只有上线才会暴露的问题。

---

## 五、翻译

V2.0 之后开放。

---

## 六、安全问题

不要在 issue 区公开安全漏洞。请私下联系维护者邮箱（待配置）。

---

## 七、行为准则

- 尊重他人
- 建设性讨论
- 不刷 issue / PR
- 接受维护者决策

---

## 八、第一次贡献者友好

如果你第一次参与开源, 推荐从这些入手：

- [good first issue](https://github.com/odin1024/housheng-lu/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22)
- 文档错别字
- 翻译 README
- 修复一个明显的样式 bug

---

**〔 厚生錄 · CONTRIBUTING v0.1 〕**
