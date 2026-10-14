# 快速开始 · 上游数据同步指南

本项目每 24 小时通过 GitHub Actions 自动从上游拉取数据。
但在**第一次开发**时, 你需要手动跑一次同步让 `data/entries.json` 有数据。

## 方式一: 拉取上游原仓库 (推荐, 用于本地开发)

```bash
# 1. 初始化 submodule
git submodule add https://github.com/eternity4719/HowToLiveBetter.git content/upstream
git submodule update --init --recursive

# 2. 安装依赖
pnpm install

# 3. 解析数据
pnpm parse
```

## 方式二: 直接下载 zip (不推荐, 数据不会自动更新)

```bash
# 1. 下载原仓库
curl -L https://github.com/eternity4719/HowToLiveBetter/archive/refs/heads/main.tar.gz -o /tmp/upstream.tar.gz
tar -xzf /tmp/upstream.tar.gz -C content/
mv content/HowToLiveBetter-main content/upstream

# 2. 解析
pnpm parse
```

## 方式三: 仅使用占位数据 (最快, 用于先看 UI)

直接 `pnpm dev`, 用占位 `data/entries.json` 运行。
注意: 不会显示真实条目, 仅用于看视觉。

## 启动开发服务

```bash
pnpm dev
# 打开 http://localhost:3000
```

## 构建生产版

```bash
pnpm build
pnpm start
```

## 部署到 Cloudflare Pages

1. 在 Cloudflare 控制台创建 Pages 项目 `housheng-lu`
2. 连接 GitHub 仓库
3. 构建命令: `pnpm build`
4. 构建输出目录: `.next`
5. 添加环境变量 (如有)

或直接用 GitHub Actions:
- 配置 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID` secrets
- 推送到 main 分支自动部署

## 域名配置

在你的域名 DNS 服务商 (腾讯云 / Cloudflare) 添加:

```
housheng.lu       → CNAME  housheng-lu.pages.dev
www.housheng.lu   → CNAME  housheng-lu.pages.dev
```

然后在 Cloudflare Pages 项目设置中绑定自定义域。

## 常见问题

### Q: 同步后条目数不对?
A: 检查 `pnpm parse` 输出, 看哪个章节解析失败。原仓库格式可能调整, 需要更新 `scripts/parse-entries.mjs`。

### Q: GitHub Actions 同步失败?
A: 看 Actions 日志, 99% 是 submodule 权限问题。在 repo Settings → Actions → General → Workflow permissions 选 "Read and write permissions"。

### Q: 怎么修改 logo?
A: 见 `docs/DESIGN.md` 第六章, 修改后跑 `pnpm build` 重新构建。
