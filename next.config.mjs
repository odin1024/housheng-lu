/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // PWA 配置 (V1.0 启用)
  // async headers() {
  //   return [
  //     {
  //       source: '/(.*)',
  //       headers: [
  //         { key: 'X-Frame-Options', value: 'DENY' },
  //         { key: 'X-Content-Type-Options', value: 'nosniff' },
  //         { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  //       ],
  //     },
  //   ]
  // },

  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

export default nextConfig;
