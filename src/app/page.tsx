import Link from 'next/link';
import { allEntries, stats } from '@/lib/entries';
import { allSections } from '@/lib/stats';
import { ScrollOfLife } from '@/components/ScrollOfLife';
import { EMERGENCY_SCENARIOS } from '@/lib/emergency-scenarios';
import { pickDaily } from '@/lib/daily-pick';
import { evidenceLabel, ratioLabel, caliberLabel } from '@/lib/labels';
import { LIFE_STAGES, UNIVERSAL_SECTIONS } from '@/lib/life-stages';
import { asset } from '@/lib/site-meta';

/** 章节号 → 标题 (卡片上要写出该阶段的专属章节名) */
const sectionTitle = new Map(allSections.map((s) => [s.id, s.title]));

export default function HomePage() {
  const todayPicks = pickDaily(allEntries, 5);

  // JSON-LD 结构化数据
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '厚生錄 · HouSheng Lu',
    alternateName: '高性价比人生指南 视觉化再刊本',
    description: '七百余条循证生活建议, 每条写明花掉什么、换回什么、证据有多硬',
    url: 'https://housheng.lu',
    inLanguage: 'zh-CN',
    dateModified: new Date().toISOString(),
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://housheng.lu/explore?query={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
    author: {
      '@type': 'Organization',
      name: '厚生錄 Contributors',
      url: 'https://github.com/odin1024/housheng-lu',
    },
    sourceOrganization: {
      '@type': 'Organization',
      name: 'eternity4719/HowToLiveBetter',
      url: 'https://github.com/eternity4719/HowToLiveBetter',
    },
    license: 'https://creativecommons.org/licenses/by/4.0/',
  };

  return (
    <>
      <script
        type="application/ld+json"
        // 转义 '<' : 防止今后把动态数据放进 JSON-LD 时 </script> 逃逸成 XSS
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      {/* 开源宣传横幅
          按"卷首题识"处理, 不做现代 SaaS 大色块: 竹纸底 + 朱砂小印 + 一行小字。
          对比度实测 ink-soft/bg 5.25:1、seal/bg 6.41:1、vermillion/bg 6.25:1, 均达 AA;
          链接给 24px 最小可点高度 (WCAG 2.2 AA 2.5.8)。 */}
      <aside aria-label="开源信息" className="border-b border-border bg-bg">
        <div className="max-w-wide mx-auto px-4 md:px-6 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs md:text-sm">
          <span className="px-1.5 py-0.5 border border-seal text-seal text-[10px] md:text-[11px] tracking-guo-sm">
            开源
          </span>
          <span className="text-ink-soft">代码 MIT · 正文 CC BY 4.0 · 可自建、可离线</span>
          <span aria-hidden className="hidden sm:inline text-ink-soft">·</span>
          <a
            href="https://github.com/odin1024/housheng-lu"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center min-h-[24px] text-vermillion underline underline-offset-2 hover:text-seal"
          >
            在 GitHub 上查看 ↗
          </a>
        </div>
      </aside>

      {/* Hero */}
      <section className="border-b border-border bg-bg-alt">
        <div className="max-w-wide mx-auto px-4 md:px-6 py-10 md:py-14 text-center">
          <div className="mb-3 md:mb-4 flex justify-center">
            <img
              src={asset('/logo/seal-end.svg')}
              alt="厚生錄"
              width={130}
              height={60}
              className="md:w-[150px] md:h-[70px]"
            />
          </div>
          <h1
            className="tracking-guo-center text-3xl sm:text-4xl md:text-7xl font-black tracking-guo mb-3 md:mb-4"
            style={{ fontFamily: 'var(--font-zh-heading)' }}
          >
            厚生錄
          </h1>
          <p className="text-base md:text-xl text-vermillion mb-2 px-2">
            七百余条生计, 都在案头。
          </p>
          <p
            className="text-xs md:text-base text-ink-soft mb-5 md:mb-6 italic px-2"
            style={{ fontFamily: 'var(--font-en-heading)' }}
          >
            HouSheng Lu · Records of Living Well
          </p>
          <hr className="zhu-si-lan w-24 md:w-32 mx-auto !my-0" />
          <p className="text-sm md:text-lg mt-4 px-2">《高性价比人生指南》视觉化再刊本</p>
          <p className="text-xs md:text-sm text-ink-soft mt-2 px-2">
            按 CC BY 4.0 衍生自 eternity4719/HowToLiveBetter
          </p>

          <div className="flex flex-wrap justify-center gap-4 md:gap-8 mt-5 md:mt-6 text-sm px-2">
            <div className="text-center min-w-[60px]">
              <div className="text-xl md:text-2xl font-bold text-seal">{stats.totalEntries}</div>
              <div className="text-ink-soft text-xs tracking-guo-sm">条目</div>
            </div>
            <div className="text-center min-w-[60px]">
              <div className="text-xl md:text-2xl font-bold text-seal">{stats.totalSections}</div>
              <div className="text-ink-soft text-xs tracking-guo-sm">章节</div>
            </div>
            <div className="text-center min-w-[60px]">
              <div className="text-xl md:text-2xl font-bold text-seal">{stats.evidenceA}</div>
              <div className="text-ink-soft text-xs tracking-guo-sm">A 级证据</div>
            </div>
          </div>

          {/* 首屏入口: 此前首屏内容区一个可点元素都没有 (实测 heroLinksInFold = 0),
              第一次来的人不知道从哪下手 —— 补两个与定位一致的动作 */}
          <div className="flex flex-wrap justify-center gap-3 mt-6 md:mt-7 px-2 text-sm">
            <Link
              href="/emergency"
              className="px-5 py-2.5 border border-vermillion text-vermillion hover:bg-vermillion hover:text-bg transition-colors"
              style={{ borderBottom: '1px solid var(--color-vermillion)' }}
            >
              急方 · 12 个场景（离线可用）
            </Link>
            <Link
              href="/matrix"
              prefetch={false}
              className="px-5 py-2.5 border border-seal text-seal hover:bg-seal hover:text-bg transition-colors"
              style={{ borderBottom: '1px solid var(--color-seal)' }}
            >
              若只做八件事
            </Link>
            <Link
              href="/explore"
              prefetch={false}
              className="px-2 py-2.5 text-ink-soft underline underline-offset-4 decoration-border hover:text-vermillion hover:decoration-vermillion transition-colors"
            >
              浏览全部 {stats.totalEntries} 条
            </Link>
          </div>
        </div>
      </section>

      {/* 长卷 - 整个 server 渲染, 0 client JS */}
      <ScrollOfLife />

      {/* 急救 + 今日必做 */}
      <section className="max-w-wide mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* 急救速查 */}
          <div className="md:col-span-1">
            <h2 className="title-juanmu-sub text-left mb-4">急方</h2>
            <ul className="space-y-3" aria-label="急救场景">
              {EMERGENCY_SCENARIOS.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/emergency/${encodeURIComponent(s.slug)}`}
                    className="block py-4 px-5 border border-vermillion text-center bg-bg hover:bg-vermillion hover:text-bg transition-all no-underline"
                  >
                    <div
                      className="text-2xl font-bold tracking-guo"
                      style={{ fontFamily: 'var(--font-zh-heading)' }}
                    >
                      {s.title}
                    </div>
                    {s.desc && <div className="text-xs mt-1 opacity-80">{s.desc}</div>}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/emergency"
              className="block mt-4 text-center py-3 text-sm border border-vermillion text-vermillion hover:bg-vermillion hover:text-bg no-underline"
            >
              ▣ 进急方卷
            </Link>
          </div>

          {/* 今日必做 */}
          <div className="md:col-span-2">
            <h2 className="title-juanmu-sub text-left mb-4">
              {/* 首页是 SSG: pickDaily 在构建时求值, 不会"每日"变 → 文案据实改为"随构建刷新" */}
              今日必做 <span className="text-ink-soft text-sm">(随构建刷新)</span>
            </h2>
            <div className="space-y-3">
              {todayPicks.map((entry, i) => (
                <Link
                  key={entry.id}
                  href={`/book/${entry.id}`}
                  className="block py-3 border-b border-border hover:bg-bg-alt transition-colors no-underline"
                >
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span
                      className="text-seal font-bold text-base md:text-lg flex-shrink-0"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span
                      className="font-bold text-sm md:text-base flex-1 min-w-0"
                      style={{ fontFamily: 'var(--font-zh-heading)' }}
                    >
                      {entry.title}
                    </span>
                    <span className="text-xs text-ink-soft flex-shrink-0">
                      {entry.evidenceLevel} · {caliberLabel[entry.caliber]}
                    </span>
                  </div>
                  <div className="text-xs md:text-sm text-ink-soft mt-1 ml-7 md:ml-8 leading-relaxed">
                    {entry.plainLanguage.slice(0, 60)}
                    {entry.plainLanguage.length > 60 ? '...' : ''}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 人生阶段入口 */}
      <section className="max-w-wide mx-auto px-4 md:px-6 py-12 border-t border-border">
        <h2 className="title-juanmu-sub mb-2">人生阶段</h2>
        {/* 说明口径: 否则读者会拿各卡片章节数相加(45)去对原书 34 章, 以为映射错了 */}
        <p className="text-xs text-ink-soft text-center mb-6 md:mb-8 leading-relaxed">
          {UNIVERSAL_SECTIONS.length} 个通用章节（不分年龄都适用）已计入每个阶段；
          各阶段另有专属章节，两者相加恰好是原书 34 章，不重不漏。
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
          {Object.entries(LIFE_STAGES).map(([key, s]) => (
            <Link
              key={key}
              href={`/explore?stage=${encodeURIComponent(key)}`}
              // /explore 会带上全部 765 条数据 (约 2.4MB raw / 890KB gzip),
              // 首页任一入口都不预取它 —— 宁可点击后多等一点, 也不要让每个访客白下 890KB
              prefetch={false}
              title={`专属章节: 第 ${s.own.join('、')} 章`}
              className="block p-4 md:p-6 border border-border text-center hover:border-vermillion hover:bg-bg-alt transition-all no-underline"
            >
              <div className="text-3xl md:text-4xl text-seal mb-1 md:mb-2">☉</div>
              <div
                className="text-sm md:text-base font-bold tracking-guo-sm"
                style={{ fontFamily: 'var(--font-zh-heading)' }}
              >
                {s.label}
              </div>
              <div className="text-xs text-ink-soft mt-1">
                专属 {s.own.length} 章
              </div>
              {/* 写出专属章节名: 否则「婴幼儿」和「上学以后」都是"专属 1 章 + 通用 9 章", 看不出区别 */}
              <div className="text-[11px] text-ink-soft mt-0.5 truncate" title={s.own.map((n) => sectionTitle.get(n) ?? '').join(' · ')}>
                {s.own
                  .map((n) => sectionTitle.get(n))
                  .filter(Boolean)
                  .join(' · ')}
              </div>
              <div className="text-[11px] text-ink-soft mt-0.5">
                + 通用 {UNIVERSAL_SECTIONS.length} 章
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="juan-end">〔 厚生錄 · 卷端 〕</div>
    </>
  );
}
