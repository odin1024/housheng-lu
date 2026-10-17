'use client';

/**
 * 全局错误边界: 连根 layout 都挂了时的兜底 (必须自带 html/body)
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          background: '#F2E8D5',
          color: '#2A2418',
          fontFamily: '"LXGW WenKai TC", "Songti SC", serif',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '0.75rem', letterSpacing: '0.3em', color: '#6B5D4A' }}>
          〔 卷 有 残 损 〕
        </p>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>本站未能正常加载</h1>
        <p style={{ color: '#6B5D4A', lineHeight: 1.9, maxWidth: '30rem' }}>
          样式或脚本未能载入。请强制刷新（Ctrl/Cmd + Shift + R）;
          紧急情况请直接使用离线急方页。
        </p>
        {error.digest && (
          <p style={{ fontSize: '0.75rem', color: '#6B5D4A', fontFamily: 'monospace' }}>
            错误编号: {error.digest}
          </p>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #B73229',
              background: 'transparent',
              color: '#B73229',
              cursor: 'pointer',
            }}
          >
            重新展开
          </button>
          <a
            href="/emergency"
            style={{ padding: '0.5rem 1rem', border: '1px solid #8B3A3A', color: '#8B3A3A' }}
          >
            急方（离线可用）
          </a>
        </div>
      </body>
    </html>
  );
}
