import Link from 'next/link';
import { attribution } from '@/lib/compliance';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-bg-alt" role="contentinfo">
      <div className="max-w-wide mx-auto px-4 md:px-6 py-8">
        <div className="text-center space-y-3">
          <p className="text-sm text-ink-soft leading-loose">
            本卷依据{' '}
            <a href={attribution.sourceUrl} target="_blank" rel="noopener noreferrer">
              《{attribution.source}》
            </a>{' '}
            按{' '}
            <a href={attribution.licenseUrl} target="_blank" rel="noopener noreferrer">
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
            <img
              src="/logo/seal-end.svg"
              alt="厚生錄 落款印"
              width={120}
              height={40}
              className="w-24 md:w-32 h-auto"
            />
          </div>

          <nav className="flex flex-wrap justify-center gap-4 text-xs text-ink-soft" aria-label="次要导航">
            <a href={attribution.sourceUrl} target="_blank" rel="noopener noreferrer">
              上游
            </a>
            <span aria-hidden>·</span>
            {/* 用 Link 而非原生 <a>: 静态托管带 basePath 时, 根相对 href 会 404 */}
            <Link href="/about">卷末</Link>
            <span aria-hidden>·</span>
            <a
              href="https://github.com/odin1024/housheng-lu/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              反馈
            </a>
            <span aria-hidden>·</span>
            <a href={attribution.licenseUrl} target="_blank" rel="noopener noreferrer">
              CC BY 4.0
            </a>
          </nav>

          <div className="text-xs text-ink-soft italic" style={{ fontFamily: 'var(--font-en-heading)' }}>
            HouSheng Lu · Records of Living Well
          </div>
        </div>
      </div>
    </footer>
  );
}
