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
https://github.com/housheng-lu/housheng-lu/issues

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

## 四、翻译

V2.0 之后开放。

---

## 五、安全问题

不要在 issue 区公开安全漏洞。请私下联系维护者邮箱（待配置）。

---

## 六、行为准则

- 尊重他人
- 建设性讨论
- 不刷 issue / PR
- 接受维护者决策

---

## 七、第一次贡献者友好

如果你第一次参与开源, 推荐从这些入手：

- [good first issue](https://github.com/housheng-lu/housheng-lu/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22)
- 文档错别字
- 翻译 README
- 修复一个明显的样式 bug

---

**〔 厚生錄 · CONTRIBUTING v0.1 〕**
