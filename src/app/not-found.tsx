import Link from 'next/link';
import { stats } from '@/lib/stats';

export const metadata = {
  title: '此叶已佚',
  description: '找不到这一页',
};

/**
 * 404 - 善本语境: 长卷缺了一叶
 * (此前没有自定义 404, 用户看到的是 Next 默认的英文页, 与全站风格断裂)
 */
export default function NotFound() {
  return (
    <article className="max-w-narrow mx-auto px-4 md:px-6 py-16 md:py-24 text-center">
      <p className="text-xs text-ink-soft tracking-guo-sm mb-4">〔 四〇四 〕</p>
      <h1 className="title-juanmu">此 叶 已 佚</h1>
      <p className="title-juanmu-sub">找 不 到 这 一 页</p>

      <hr className="zhu-si-lan" />

      <p className="leading-loose text-ink-soft mb-8">
        你要找的条目或章节不在本卷中。
        可能是链接打错了, 也可能是上游原书调整过章节编号。
      </p>

      <nav className="flex flex-wrap justify-center gap-3 text-sm" aria-label="404 页面导航">
        <Link
          href="/"
          className="px-4 py-2 border border-seal text-seal hover:bg-bg-alt"
          style={{ borderBottom: '1px solid var(--color-seal)' }}
        >
          回卷端
        </Link>
        <Link
          href="/explore"
          // 关预取: /explore 的客户端包含 2.4MB 数据块, 404 页没必要替访客预下载
          prefetch={false}
          className="px-4 py-2 border border-border text-ink-soft hover:border-vermillion hover:text-vermillion"
        >
          去检索 {''}
          <span className="font-mono text-xs">{stats.totalEntries}</span> 条
        </Link>
        <Link
          href="/emergency"
          className="px-4 py-2 border border-vermillion text-vermillion hover:bg-bg-alt"
        >
          急方（离线可用）
        </Link>
      </nav>

      <div className="juan-end mt-12">〔 厚生錄 · 佚叶 〕</div>
    </article>
  );
}
