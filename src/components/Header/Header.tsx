'use client';

import { useState } from 'react';
import Link from 'next/link';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-border bg-bg sticky top-0 z-50">
      <div className="max-w-wide mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3" style={{ borderBottom: 'none' }}>
          <img src="/logo/seal-square.svg" alt="厚生錄" width={36} height={36} />
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-bold tracking-guo" style={{ fontFamily: 'var(--font-zh-heading)' }}>
              厚生錄
            </span>
            <span className="text-xs text-ink-soft italic" style={{ fontFamily: 'var(--font-en-heading)' }}>
              HouSheng Lu
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-base">
          <Link href="/explore" style={{ borderBottom: 'none' }} className="hover:text-vermillion">
            检索
          </Link>
          <Link href="/emergency" style={{ borderBottom: 'none' }} className="hover:text-vermillion text-vermillion">
            急方
          </Link>
          <Link href="/my" style={{ borderBottom: 'none' }} className="hover:text-vermillion">
            我的
          </Link>
          <Link href="/about" style={{ borderBottom: 'none' }} className="hover:text-vermillion">
            卷末
          </Link>
        </nav>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-2xl bg-transparent border-none px-2"
          aria-label="菜单"
        >
          ☰
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-border bg-bg-alt">
          <nav className="flex flex-col py-2">
            <Link href="/" className="px-6 py-3 hover:bg-bg" style={{ borderBottom: 'none' }} onClick={() => setMenuOpen(false)}>
              卷端
            </Link>
            <Link href="/explore" className="px-6 py-3 hover:bg-bg" style={{ borderBottom: 'none' }} onClick={() => setMenuOpen(false)}>
              检索
            </Link>
            <Link href="/emergency" className="px-6 py-3 hover:bg-bg text-vermillion" style={{ borderBottom: 'none' }} onClick={() => setMenuOpen(false)}>
              急方
            </Link>
            <Link href="/my" className="px-6 py-3 hover:bg-bg" style={{ borderBottom: 'none' }} onClick={() => setMenuOpen(false)}>
              我的
            </Link>
            <Link href="/about" className="px-6 py-3 hover:bg-bg" style={{ borderBottom: 'none' }} onClick={() => setMenuOpen(false)}>
              卷末
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
