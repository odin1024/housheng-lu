'use client';

import { create } from '@/lib/toast-store';

/**
 * 全局 toast 容器, 放在 layout 里一次
 * 调用 toast(msg) 显示一条提示, 2.4s 自动消失
 */
export function ToastContainer() {
  const { items, dismiss } = create.useStore();

  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-6 left-0 right-0 z-[1000] flex flex-col items-center gap-2 pointer-events-none"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className="toast pointer-events-auto"
          role="status"
          onClick={() => dismiss(t.id)}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}
