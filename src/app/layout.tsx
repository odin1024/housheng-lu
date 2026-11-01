import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';
import { ToastContainer } from '@/components/Toast/Toast';
import { ScrollToTop } from '@/components/ScrollToTop/ScrollToTop';
import { attribution } from '@/lib/compliance';
import { asset } from '@/lib/site-meta';

/**
 * 站点来源(origin)
 *
 * 为什么不用固定域名: 本项目有多种部署形态(根域名自建 / GitHub Pages 子路径)。
 * metadataBase 只放 origin, 路径部分用 asset() 带上 basePath —— 否则会拼成
 * https://host/housheng-lu/housheng-lu/og-image.png 这种重复前缀。
 * 自建时用 NEXT_PUBLIC_SITE_ORIGIN 覆盖。
 */
const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_ORIGIN || 'https://odin1024.github.io';
/** 站点首页的完整 URL (含 basePath) */
const SITE_URL = `${SITE_ORIGIN}${asset('/')}`;

export const metadata: Metadata = {
  title: {
    default: `${attribution.projectName} · ${attribution.projectTagline}`,
    template: `%s · ${attribution.projectName}`,
  },
  description: `${attribution.projectSubtitle}。七百余条循证生活建议, 每条写明花掉什么、换回什么、证据有多硬。`,
  keywords: ['高性价比人生指南', '循证', '生活指南', '厚生錄', 'HowToLiveBetter', 'HouSheng Lu'],
  authors: [{ name: '厚生錄 Contributors' }],
  creator: '厚生錄 Contributors',
  metadataBase: new URL(SITE_ORIGIN),
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: SITE_URL,
    siteName: attribution.projectName,
    title: `${attribution.projectName} · ${attribution.projectTagline}`,
    description: attribution.projectSubtitle,
    // 分享卡片: public/og-image.png (1200x630, 由 tests/shots-readme.spec.ts 生成)
    images: [
      {
        url: asset('/og-image.png'),
        width: 1200,
        height: 630,
        alt: `${attribution.projectName} · ${attribution.projectTagline}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: attribution.projectName,
    description: attribution.projectSubtitle,
    images: [asset('/og-image.png')],
  },
  icons: {
    icon: asset('/favicon.svg'),
    apple: asset('/logo/seal-square.svg'),
  },
  manifest: asset('/manifest.json'),
  alternates: {
    canonical: SITE_URL,
  },
  other: {
    'theme-color': '#B73229',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-title': '厚生錄',
    'apple-mobile-web-app-status-bar-style': 'default',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <a href="#main-content" className="skip-link">
          跳到主内容
        </a>
        <ServiceWorkerRegistrar />
        <ToastContainer />
        <ScrollToTop />
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
