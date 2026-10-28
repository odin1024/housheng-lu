'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { asset } from '@/lib/site-meta';

// 导航项 (桌面 + 移动共用一份, 避免两处不一致)
// 卷端 = 首页 (本站古籍用语: 卷端即卷首), 与首页结卷标记「厚生錄 · 卷端 」呼应
// heavy = 该路由的客户端组件会用到全量条目数据 (chunk 202, 约 2.4MB raw / 890KB gzip),
//        首屏预取它们会让首页白白多下载近 1MB → 这几项关闭预取
const NAV_ITEMS: Array<{ label: string; href: string; emphasis?: boolean; heavy?: boolean }> = [
  { label: '卷端', href: '/' },
  { label: '检索', href: '/explore', heavy: true },
  { label: '问卷', href: '/ask', heavy: true },
  { label: '急方', href: '/emergency', emphasis: true },
  { label: '矩阵', href: '/matrix', heavy: true },
  { label: '海报', href: '/poster', heavy: true },
  { label: '我的', href: '/my', heavy: true },
  { label: '卷末', href: '/about' },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const close = () => setMenuOpen(false);
  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname?.startsWith(href));

  // 桌面导航: "当前页"用朱丝栏下划线标示 (非纯靠颜色), 急方保留朱砂色作为优先级提示
  // 注意: globals.css 里 `header a { border-bottom: none }` 会清掉 border-style,
  // 所以必须显式加 border-solid, 否则 border-b-2 的宽度会被算成 0
  const desktopNavClass = (item: { href: string; emphasis?: boolean }) =>
    [
      'border-b-2 border-solid pb-0.5 transition-colors',
      isActive(item.href)
        ? 'border-seal text-seal font-bold'
        : item.emphasis
          ? 'border-transparent text-vermillion hover:text-seal'
          : 'border-transparent hover:text-vermillion',
    ].join(' ');

  // 移动端菜单: 同样用左侧朱线标示当前页
  // border-y-0 / border-r-0 必须写: 否则 border-solid 会让
  // `header a { border-bottom: none }` 重置出的 medium(3px) 底边显形, 菜单里会多一条红线
  const mobileNavClass = (href: string, emphasis?: boolean) =>
    [
      'border-l-2 border-y-0 border-r-0 border-solid px-6 py-3 hover:bg-bg transition-colors',
      isActive(href)
        ? 'border-seal text-seal font-bold'
        : emphasis
          ? 'border-transparent text-vermillion'
          : 'border-transparent',
    ].join(' ');

  return (
    // 注意: 这里原本是 `bg-bg/95 ... supports-[backdrop-filter]:bg-bg/80`,
    // 但 tailwind.config.ts 把颜色定义成裸 `var(--color-bg)`, Tailwind v3 无法给它套
    // alpha 修饰符 → 两个类都被**静默丢弃**, 构建产物里既无 .bg-bg\/95 也无 @supports,
    // 实测 header 背景 = rgba(0,0,0,0) (完全透明), Safari ≤17 不支持无前缀 backdrop-filter
    // 时导航文字会直接和页面内容重叠 → 改用不透明底色, 保证任何浏览器下都可读
    <header className="border-b border-border bg-bg sticky top-0 z-50">
      <div className="max-w-wide mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-3 no-underline"
          aria-label="厚生錄 首页"
        >
          {/* asset(): 部署在子路径时原生 <img> 不会自动加 basePath, 会 404 */}
          <img src={asset('/logo/seal-square.svg')} alt="" width={36} height={50} className="md:w-[44px] md:h-[60px]" />
          <div className="flex flex-col leading-tight">
            <span
              className="text-lg font-bold tracking-guo"
              style={{ fontFamily: 'var(--font-zh-heading)' }}
            >
              厚生錄
            </span>
            <span
              className="text-xs text-ink-soft italic"
              style={{ fontFamily: 'var(--font-en-heading)' }}
            >
              HouSheng Lu
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-5 text-base" aria-label="主导航">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={item.heavy ? false : undefined}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={desktopNavClass(item)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-2xl px-2"
          aria-label={menuOpen ? '关闭菜单' : '打开菜单'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-border bg-bg-alt">
          <nav className="flex flex-col py-2" aria-label="移动端导航">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={item.heavy ? false : undefined}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={mobileNavClass(item.href, item.emphasis)}
                onClick={close}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
