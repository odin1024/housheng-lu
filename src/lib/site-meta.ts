/**
 * 站点元信息 / 静态资源路径
 *
 * 为什么需要 asset():
 *   Next 只会给 `_next/*` 产物和 <Link> 路由自动加 basePath,
 *   **原生 `<img src="/logo/x.svg">` 不会** —— 部署到子路径(GitHub Pages 的 /housheng-lu/)时
 *   这些图会去域名根找, 全部 404(公网部署时实测到)。所以统一走这个函数。
 */

/** 构建期注入 (见 next.config.mjs 的 env), 根部署时为空串 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** 给 public/ 下的静态资源加 basePath */
export function asset(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${p}`;
}

export const REPO_URL = 'https://github.com/odin1024/housheng-lu';
export const ISSUES_URL = `${REPO_URL}/issues`;
