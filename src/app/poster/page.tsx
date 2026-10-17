import type { Metadata } from 'next';
import { PosterGenerator } from '@/components/PosterGenerator/PosterGenerator';
import { stats } from '@/lib/entries';

export const metadata: Metadata = {
  title: '海报生成器',
  description: `从 ${stats.totalEntries} 条里挑 1-9 条, 生成可分享的朱砂方印海报`,
};

export default function PosterPage() {
  return (
    <div className="max-w-narrow mx-auto px-4 md:px-6 py-8 md:py-12">
      <h1 className="title-juanmu">海报</h1>
      <p className="title-juanmu-sub">传 录 之 用</p>
      <p className="text-center text-sm text-ink-soft mb-8 max-w-narrow mx-auto leading-relaxed">
        从 {stats.totalEntries} 条原书里挑 1-9 条, 生成带朱砂方印水印的海报, 适合朋友圈/小红书传播.
      </p>

      <hr className="zhu-si-lan" />

      <PosterGenerator />

      <div className="juan-end">〔 海报 · 终 〕</div>
    </div>
  );
}
