/**
 * 根级加载态 (导航到尚未就绪的路由时显示)
 * 纯 CSS, 尊重 prefers-reduced-motion (见 globals.css 的全局降级)
 */
export default function Loading() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 py-24 text-ink-soft"
      role="status"
      aria-live="polite"
    >
      <div className="flex gap-2" aria-hidden="true">
        {['寿', '富', '康', '宁'].map((ch, i) => (
          <span
            key={ch}
            className="inline-flex items-center justify-center w-8 h-8 border border-vermillion text-vermillion text-sm"
            style={{
              animation: 'seal-fade 1.6s ease-in-out infinite',
              animationDelay: `${i * 0.18}s`,
            }}
          >
            {ch}
          </span>
        ))}
      </div>
      <p className="text-xs tracking-guo-sm">展 卷 中 …</p>
    </div>
  );
}
