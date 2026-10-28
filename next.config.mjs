/** @type {import('next').NextConfig} */

/**
 * 静态导出模式（用于 GitHub Pages 这类纯静态托管）
 *
 * 用法: NEXT_OUTPUT=export NEXT_BASE_PATH=/housheng-lu pnpm build
 *   · output: 'export'   → 产物在 out/，可直接丢给静态托管
 *   · basePath           → 项目站点部署在 /<repo>/ 子路径下时需要
 *   · trailingSlash      → 让 /explore 落地成 /explore/index.html，静态托管才找得到
 * 注意: 静态导出**不支持** route handler，部署前要把 src/app/api 暂时移走
 *      （GitHub Pages 工作流里已经这么做；AI 问答那时自动降级为纯检索）
 */
const isExport = process.env.NEXT_OUTPUT === 'export';
const basePath = process.env.NEXT_BASE_PATH || '';

const nextConfig = {
  ...(isExport
    ? {
        output: 'export',
        ...(basePath ? { basePath } : {}),
        trailingSlash: true,
      }
    : {}),
  // 构建期把 basePath 注入客户端 (供 lib/site-meta 的 asset() 使用):
  // Next 只会给 _next 产物和 <Link> 路由自动加前缀, 原生 <img src="/..."> 不会。
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,

  /**
   * 关闭 Next 内置图片优化器。
   *
   * 理由（安全）: 优化器依赖 sharp/libheif, 命中 critical 公告 GHSA-2xp9-vwfh-vxw4
   * （"AVIF 优化导致的未授权 RCE", 修复版本 15.5.24+，14.x 无补丁）。
   * 本站**不使用 next/image**（已核验: 源码 0 处引用, 无 images 配置, 无 /_next/image 请求）,
   * 但 `/_next/image` 端点默认仍然存在、可被直接调用并传入外部 AVIF 地址 —— 关掉它即彻底移除该攻击面。
   * 关闭后 <img> 行为不变（本站图片都是直接引用 /icons 与 public 资源）。
   */
  images: { unoptimized: true },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // HTTPS 部署下强制加密 (本地 http 无副作用)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            // CSP: 本站无外部脚本/样式/字体, 全部同源
            // script 需要 'unsafe-inline' (Next 的引导脚本是内联的), 但仍能挡住外域脚本注入与数据外泄
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "worker-src 'self'",
              "manifest-src 'self'",
              "media-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/icons/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },

  // 说明: 这里原本有
  //   experimental: { optimizePackageImports: ['lucide-react', 'framer-motion'] }
  // 但这两个包**都没有安装**(dependencies 只有 next/react/react-dom/zustand),
  // 配置无效且误导后来者, 故移除。
};

export default nextConfig;
