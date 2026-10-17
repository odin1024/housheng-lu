# 厚生錄 · 合规白皮书

> 版本：v0.1 · 2026-10

本文档是厚生錄项目的**法律护城河**。我们严格按 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 协议衍生原书，并主动超额履行其三项义务，避免任何法律风险。

---

## 一、原书来源

- **作者**：[eternity4719](https://github.com/eternity4719)
- **原仓库**：[github.com/eternity4719/HowToLiveBetter](https://github.com/eternity4719/HowToLiveBetter)
- **协议**：CC BY 4.0（正文）+ MIT（代码）
- **首次引入**：2026-10

## 二、CC BY 4.0 三义务的履行

CC BY 4.0 要求的三项义务：

| 义务 | 厚生錄的履行方式 |
|---|---|
| **1. 署名（Attribution）** | 每页 footer 显著位置、每张导出图、每个 PR 模板、每份文档均标注 |
| **2. 许可证链接** | 每处署名旁附 `https://creativecommons.org/licenses/by/4.0/` 链接 |
| **3. 标明改动（Indicate Changes）** | 同步日志 `data/sync-log.json` 记录每次同步；footer 标注"视觉化再刊" |

### 2.1 署名模板（强制）

出现在每个页面的 footer，以及每份衍生物料中：

```
本卷依据 《高性价比人生指南》(github.com/eternity4719/HowToLiveBetter)
按 CC BY 4.0 (creativecommons.org/licenses/by/4.0) 视觉化再刊。
本站为非官方衍生作品, 与原作者无合作关系。
内容可能过时, 以最新上游为准。
〔 厚生錄 〕
```

### 2.2 内容改动的边界

厚生錄**严格不修改原书内容**，仅做以下视觉化处理：

| 处理类型 | 是否属于"改动" |
|---|---|
| Markdown → JSON 解析 | 否（技术性处理） |
| Markdown → HTML 渲染 | 否（格式转换） |
| 添加 CSS 视觉样式 | 否（呈现层调整） |
| 添加交互组件（搜索、筛选、急救 PWA） | 否（功能性补充） |
| 增加 AI 对话引用条目编号 | 否（增强溯源） |
| 翻译为其他语言 | **是**（必须标注译者、改动日期） |
| 修改条目文字 | **是**（必须明确标注修改部分） |

如果未来要做翻译或修改条目，必须在 footer 增加如下声明：

```
本卷在 [日期] 进行了翻译/修改, 改动部分:
- ...
- ...
原版以 github.com/eternity4719/HowToLiveBetter 为准
```

## 三、同步机制（自动合规护城河）

### 3.1 同步频率

- **每 24 小时** GitHub Actions 自动同步
- 可在 settings 中调整为每 12 小时
- 紧急情况可手动触发

### 3.2 同步流程

```
1. .github/workflows/sync.yml 触发 (定时 / 手动)
2. checkout 本仓库
3. cd content/upstream
4. git fetch origin main
5. git reset --hard origin/main
6. cd ../..
7. node scripts/parse-entries.mjs
8. node scripts/build-search-index.mjs
9. 比较新 entries.json 与 git HEAD
10. 若有变化, 自动 commit + push
11. commit message: "chore(sync): upstream @ <hash>"
12. push 触发 .github/workflows/deploy.yml
13. 部署到 Cloudflare Pages
```

### 3.3 同步日志

`data/sync-log.json` 记录每次同步：

```json
{
  "lastSync": "2026-10-12T06:00:00Z",
  "upstreamHash": "abc123...",
  "upstreamUrl": "https://github.com/eternity4719/HowToLiveBetter",
  "upstreamTag": "main",
  "entriesCount": 699,
  "syncHistory": [
    { "date": "2026-10-12", "hash": "abc123...", "change": "5 new entries" },
    { "date": "2026-10-11", "hash": "def456...", "change": "no change" },
    { "date": "2026-10-10", "hash": "789ghi...", "change": "1 modified entry" }
  ]
}
```

### 3.4 同步失败的处置

- 同步失败时, 部署保留上一版本（不破坏现状）
- 失败原因写入 GitHub Issues
- 连续失败 3 次, 自动 issue 提醒维护者

## 四、关于"非官方"的反复声明

为了避免读者误以为厚生錄是原作者官方站：

| 位置 | 声明 |
|---|---|
| 顶部 nav | 无任何"官方"字样 |
| 首页 hero | 主标语下方一行小字"《高性价比人生指南》视觉化再刊本" |
| 每个页面 footer | 署名 + "本站为非官方衍生作品, 与原作者无合作关系" |
| about 页 | 大字声明 + 与原作者关系的完整说明 |
| README | 显式写明"本站为非官方衍生作品" |
| LICENSE | 显式写明"改编自 eternity4719/HowToLiveBetter" |

## 五、与三家衍生品的关系

目前围绕原书已存在的衍生站：

| 站 | 关系 |
|---|---|
| [howtolivebetter.net](https://howtolivebetter.net) | 平行衍生品, 互不干涉 |
| [how-to-live-better.com](https://how-to-live-better.com) | 平行衍生品, 互不干涉 |
| [how2livebetter.net](https://how2livebetter.net) | 平行衍生品, 互不干涉 |

厚生錄与三家是**平行**关系，不构成：

- 抄袭（视觉气质完全不同, 详见 [DESIGN.md](DESIGN.md)）
- 模仿（功能定位完全不同）
- 不正当竞争（均为非商业 CC BY 4.0 衍生品）

如收到原作者或三家衍生者的反馈, 将：

1. 24 小时内回复
2. 在 about 页公开回应
3. 如有实质问题, 立即修正

## 六、衍生与商用

CC BY 4.0 允许商用, 但厚生錄:

- 不进行任何商业活动
- 不挂广告（除上游友情链接）
- 不收集任何用户账号数据（无账号体系）
- 「我的清单」只存在用户浏览器 localStorage；问答内容在启用 AI 时会转发给 Anthropic 用于生成回答，本站不落库、不记原文
- 不提供付费服务

如未来需要商业化（如周边印刷品），将：

1. 在 LICENSE 中注明商业用途
2. 单独建一个 `commercial/` 目录与原 CC BY 4.0 内容隔离
3. 商业部分采用独立许可证

## 七、免责声明（急救相关）

急救 PWA 中的所有内容**仅供学习与参考**，不构成医疗建议。

```
本卷所列急救方法可能存在地域差异、个体差异与时效性差异。
实际急救请:
- 立即拨打 120 / 当地急救电话
- 接受专业急救人员指挥
- 以当地急救中心的指导为准

来源: NEJM 2024 等期刊文献 (见各条出处)
最后核对: [同步日期]
```

每张急救卡片的 footer 均带此声明。

## 八、内容时效

原书涉及政策、法条、补贴标准、数字, 都会随时间变化。厚生錄:

- 每 24 小时同步上游, 但上游也可能不及时
- footer 显著标注"最后核对日期"
- 不对内容时效性负责, 引导用户参考最新上游

## 九、举报与反馈

如发现合规问题或内容错误：

- GitHub Issues: github.com/housheng-lu/housheng-lu/issues
- 紧急安全问题: security@housheng.lu (待配置)
- 内容错误: 同步上游 issue tracker (原作者维护)

## 十、合规检查清单

每次部署前自动检查：

- [ ] `data/sync-log.json` 中有最近 7 天的同步记录
- [ ] footer 含完整署名模板
- [ ] LICENSE 文件存在并可访问
- [ ] about 页内容完整
- [ ] 无第三方未授权字体/图片
- [ ] OG 图含署名
- [ ] PWA manifest 含 LICENSE 引用

由 `scripts/verify-compliance.mjs` 自动执行。

---

**〔 厚生錄 · COMPLIANCE v0.1 〕**
