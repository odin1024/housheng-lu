import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { attribution } from '@/lib/compliance';

export const metadata: Metadata = {
  title: {
    default: `${attribution.projectName} · ${attribution.projectTagline}`,
    template: `%s · ${attribution.projectName}`,
  },
  description: `${attribution.projectSubtitle}。七百条循证生活建议, 每条写明花掉什么、换回什么、证据有多硬。`,
  keywords: ['高性价比人生指南', '循证', '生活指南', '厚生錄', 'HowToLiveBetter', 'HouSheng Lu'],
  authors: [{ name: '厚生錄 Contributors' }],
  creator: '厚生錄 Contributors',
  metadataBase: new URL('https://housheng.lu'),
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: 'https://housheng.lu',
    siteName: attribution.projectName,
    title: `${attribution.projectName} · ${attribution.projectTagline}`,
    description: attribution.projectSubtitle,
    images: [
      {
        url: '/og/og-default.svg',
        width: 1200,
        height: 630,
        alt: attribution.projectName,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: attribution.projectName,
    description: attribution.projectSubtitle,
  },
  icons: {
    icon: '/favicon.svg',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
