'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * 根级错误边界 (渲染/数据异常时兜底)
 * 此前没有 error.tsx, 出错只能看到 Next 的默认页
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 只记录可定位的信息, 不打用户数据 (日志脱敏)
    console.error('[app] render error:', error.name, error.digest ?? '');
  }, [error]);

  return (
    <article className="max-w-narrow mx-auto px-4 md:px-6 py-16 md:py-24 text-center">
      <p className="text-xs text-ink-soft tracking-guo-sm mb-4">〔 卷 有 残 损 〕</p>
      <h1 className="title-juanmu">这 一 叶 出 错 了</h1>
      <p className="title-juanmu-sub">页 面 未 能 正 常 展 开</p>

      <hr className="zhu-si-lan" />

      <p className="leading-loose text-ink-soft mb-2">
        可能是数据文件异常, 或浏览器缓存了旧版本资源。
        可以先点「重新展开」; 若仍不行, 请强制刷新（Ctrl/Cmd + Shift + R）。
      </p>
      {error.digest && (
        <p className="text-xs text-ink-soft font-mono mb-8">错误编号: {error.digest}</p>
      )}

      <div className="flex flex-wrap justify-center gap-3 text-sm mt-6">
        <button
          onClick={reset}
          className="px-4 py-2 border border-seal text-seal hover:bg-bg-alt"
          style={{ borderBottom: '1px solid var(--color-seal)' }}
        >
          重新展开
        </button>
        <Link
          href="/"
          className="px-4 py-2 border border-border text-ink-soft hover:border-vermillion hover:text-vermillion"
        >
          回卷端
        </Link>
        <Link href="/emergency" className="px-4 py-2 border border-vermillion text-vermillion hover:bg-bg-alt">
          急方（离线可用）
        </Link>
      </div>

      <div className="juan-end mt-12">〔 厚生錄 · 残卷 〕</div>
    </article>
  );
}
