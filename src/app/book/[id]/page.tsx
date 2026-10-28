import { notFound } from 'next/navigation';
import Link from 'next/link';
import { allEntries, getEntryById, getEntriesBySection } from '@/lib/entries';
import { EntryCard } from '@/components/EntryCard';

export function generateStaticParams() {
  return allEntries.map((e) => ({ id: e.id }));
}

// 只允许已生成的 765 条 id: 其余一律真 404。
// 不加这行时, 由于根级 loading.tsx 会先以 200 冲刷 shell, notFound() 只能软 404 (HTTP 200),
// 既不语义正确, 又会被 sw.js 的 network-first 把 200 写进缓存 (审计发现)。
export const dynamicParams = false;

export default function BookEntryPage({ params }: { params: { id: string } }) {
  const entry = getEntryById(params.id);
  if (!entry) notFound();

  const sectionEntries = getEntriesBySection(entry.section);
  const idx = sectionEntries.findIndex((e) => e.id === entry.id);
  const prev = idx > 0 ? sectionEntries[idx - 1] : null;
  const next = idx < sectionEntries.length - 1 ? sectionEntries[idx + 1] : null;

  return (
    <article className="max-w-narrow mx-auto px-4 md:px-6 py-8 md:py-12">
      {/* 上一回 / 下一回 */}
      <nav className="flex justify-between text-sm mb-8" aria-label="上下回导航">
        {prev ? (
          <Link
            href={`/book/${prev.id}`}
            className="text-indigo hover:text-vermillion no-underline"
            title={prev.title}
          >
            ← {prev.title.length > 30 ? prev.title.slice(0, 30) + '…' : prev.title}
          </Link>
        ) : (
          <span />
        )}
        <Link
          href={`/explore?section=${entry.section}`}
          // 必须关预取: /explore 的客户端包里有 2.4MB 数据块 (raw) / ~890KB gzip。
          // 实测(Playwright 时序): 本页 319ms 预取 /explore?section=13 → 340ms 拉下 2427KB,
          // 于是"每个条目详情页"都悄悄下载了整站数据 (页面自身包只有 6 个脚本)。
          prefetch={false}
          className="text-ink-soft hover:text-vermillion no-underline"
        >
          第 {entry.section} 节
        </Link>
        {next ? (
          <Link
            href={`/book/${next.id}`}
            className="text-indigo hover:text-vermillion no-underline"
            title={next.title}
          >
            {next.title.length > 30 ? next.title.slice(0, 30) + '…' : next.title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>

      {/* 回目标题 */}
      <h1 className="title-juanmu">第 {String(entry.number).padStart(2, '0')} 条</h1>
      <h2 className="title-juanmu-sub">{entry.title}</h2>

      <hr className="zhu-si-lan" />

      <EntryCard entry={entry} expanded={true} showSeal={false} lead />

      <hr className="zhu-si-lan" />

      {/* 本卷其他条目 */}
      <section className="mt-8">
        <h3 className="text-lg font-bold tracking-guo-sm mb-4" style={{ fontFamily: 'var(--font-zh-heading)' }}>
          本卷其他条目
        </h3>
        <ul className="space-y-2">
          {sectionEntries
            .filter((e) => e.id !== entry.id)
            .map((e) => (
              <li key={e.id}>
                <Link
                  href={`/book/${e.id}`}
                  className="block py-2 hover:text-vermillion no-underline"
                  style={{ borderBottom: '1px dashed var(--color-border)' }}
                >
                  <span className="text-seal font-mono text-xs mr-3">{e.id}</span>
                  {e.title}
                </Link>
              </li>
            ))}
        </ul>
      </section>

      <div className="juan-end">
        〔 第 {String(entry.section).padStart(2, '0')} 节 · 第 {String(entry.number).padStart(2, '0')} 条 · 终 〕
      </div>
    </article>
  );
}
