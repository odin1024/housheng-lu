'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * 路由变化时 (含 hard reload) 强制滚动到页面顶部
 * 解决 Next.js App Router 默认保持 scroll 位置的问题
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // 每次路由变化时滚动到顶部
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [pathname]);

  // 页面加载时也强制滚到顶部 (覆盖浏览器的 scroll restoration)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, []);

  return null;
}
