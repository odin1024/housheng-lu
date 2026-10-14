import { attribution, getAttributionText } from '@/lib/compliance';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-bg-alt">
      <div className="max-w-wide mx-auto px-4 md:px-6 py-8">
        <div className="text-center space-y-3">
          <p className="text-sm text-ink-soft leading-loose">
            本卷依据{' '}
            <a href={attribution.sourceUrl} target="_blank" rel="noopener">
              《{attribution.source}》
            </a>{' '}
            按{' '}
            <a href={attribution.licenseUrl} target="_blank" rel="noopener">
              {attribution.license}
            </a>{' '}
            视觉化再刊。
          </p>
          <p className="text-sm text-ink-soft">
            本站为非官方衍生作品, 与原作者无合作关系。
          </p>
          <p className="text-sm text-ink-soft">
            内容可能过时, 以最新上游为准。
          </p>

          <div className="flex justify-center my-6">
            <img src="/logo/seal-end.svg" alt="厚生錄" width={120} height={40} />
          </div>

          <div className="flex flex-wrap justify-center gap-4 text-xs text-ink-soft">
            <a href={attribution.sourceUrl} target="_blank" rel="noopener" style={{ borderBottom: 'none' }}>
              上游
            </a>
            <span>·</span>
            <a href="/about" style={{ borderBottom: 'none' }}>
              卷末
            </a>
            <span>·</span>
            <a href="https://github.com/housheng-lu/housheng-lu/issues" target="_blank" rel="noopener" style={{ borderBottom: 'none' }}>
              反馈
            </a>
            <span>·</span>
            <a href={attribution.licenseUrl} target="_blank" rel="noopener" style={{ borderBottom: 'none' }}>
              CC BY 4.0
            </a>
          </div>

          <div className="text-xs text-ink-soft italic" style={{ fontFamily: 'var(--font-en-heading)' }}>
            HouSheng Lu · Records of Living Well
          </div>
        </div>
      </div>
    </footer>
  );
}
