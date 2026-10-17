'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * 长卷的交互外壳 (客户端)
 *
 * 关键约束: 长卷本体 (SVG + 765 条数据) 是**服务端**渲染的, 通过 children 传进来,
 * 所以这里的客户端 bundle 里只有 34 个章节刻度坐标, 不含任何条目数据。
 *
 * 提供: 拖拽展卷 / 键盘浏览 / 章节刻度跳转 / 展开进度 / 自动展卷(默认关)
 */
export interface SectionTick {
  n: number;
  x: number;
}

export function ScrollPan({
  children,
  ticks,
}: {
  children: ReactNode;
  ticks: SectionTick[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [currentSection, setCurrentSection] = useState<number>(ticks[0]?.n ?? 1);
  const [auto, setAuto] = useState(false);
  const [dragging, setDragging] = useState(false);
  // 点刻度后"钉住"的章节: 末尾几节推不到左缘, 光靠几何推算会显示错章节
  const [pinned, setPinned] = useState<number | null>(null);
  const dragState = useRef({ active: false, startX: 0, startScroll: 0, moved: 0 });
  const [reduced, setReduced] = useState(false);

  // 尊重"减少动效"偏好
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const p = max > 0 ? el.scrollLeft / max : 0;
    setProgress(p);
    // 当前章节
    // 注意: 末尾若干节永远推不到视口左缘 (总宽 8832, 视口 1280 → 最后 4 节只能出现在右半屏),
    // 若只按"左缘刻度"判断, 读数会永远卡在第 30 节, 点 31~34 像坏掉一样 → 到末尾直接归为末节
    const left = el.scrollLeft;
    let cur = ticks[0]?.n ?? 1;
    if (p > 0.995) {
      cur = ticks[ticks.length - 1]?.n ?? cur;
    } else {
      for (const t of ticks) {
        if (t.x <= left + 24) cur = t.n;
        else break;
      }
    }
    setCurrentSection(cur);
  }, [ticks]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    sync();
    el.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      el.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [sync]);

  // 自动展卷: 默认关闭; 悬停/聚焦/拖动时暂停; 到底自动停
  // 注意: 自动展卷期间必须关掉 scroll-behavior:smooth 与 scroll-snap,
  //      否则每帧的微小位移会被"平滑动画 + 章节吸附"互相抵消 → 看起来完全没反应 (实测 Δ=0)
  useEffect(() => {
    if (!auto || reduced) return;
    let raf = 0;
    const step = () => {
      const el = ref.current;
      if (el && !el.matches(':hover') && !el.matches(':focus-within') && !dragState.current.active) {
        const max = el.scrollWidth - el.clientWidth;
        if (el.scrollLeft >= max - 1) {
          el.scrollLeft = max; // 精确停在卷尾, 进度读数才是 100%
          setAuto(false);
          return;
        }
        el.scrollLeft += 1.2; // ≈72px/s
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [auto, reduced]);

  const jumpTo = (x: number) => {
    const el = ref.current;
    if (!el) return;
    // 目标位置必须夹到可滚动范围内; 否则点末尾刻度会被浏览器夹住而"完全不动"
    const max = el.scrollWidth - el.clientWidth;
    el.scrollTo({ left: Math.max(0, Math.min(x, max)), behavior: reduced ? 'auto' : 'smooth' });
  };

  // 点刻度: 钉住该节读数 (即使视口已推到最右, 也要给出反馈)
  const onTick = (t: SectionTick) => {
    setPinned(t.n);
    jumpTo(t.x - 8);
  };

  // 开关自动展卷; 关闭时平滑吸附到最近的节起点, 再交还给 scroll-snap
  const toggleAuto = () => {
    const el = ref.current;
    const next = !auto;
    if (!next && el && ticks.length) {
      const nearest = ticks.reduce(
        (best, t) => (Math.abs(t.x - el.scrollLeft) < Math.abs(best - el.scrollLeft) ? t.x : best),
        ticks[0].x,
      );
      const left = Math.max(0, nearest - 8);
      el.scrollTo({ left, behavior: reduced ? 'auto' : 'smooth' });
    }
    setAuto(next);
  };

  // 拖拽展卷 (像拉纸卷)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    setPinned(null); // 手动操作后交还给几何推算
    if (e.pointerType === 'touch') return; // 触屏用原生滚动
    dragState.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: 0 };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    const d = dragState.current;
    if (!el || !d.active) return;
    const dx = e.clientX - d.startX;
    d.moved = Math.max(d.moved, Math.abs(dx));
    el.scrollLeft = d.startScroll - dx;
    if (d.moved > 4) el.style.cursor = 'grabbing';
  };
  const endDrag = () => {
    const el = ref.current;
    if (dragState.current.active && dragState.current.moved > 4) {
      // 拖动超过阈值时, 抑制随后的点击(避免误跳转)
      const suppress = (ev: MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      el?.addEventListener('click', suppress, { capture: true, once: true });
      window.setTimeout(() => el?.removeEventListener('click', suppress, { capture: true } as never), 0);
    }
    dragState.current.active = false;
    setDragging(false);
    if (el) el.style.cursor = '';
  };

  // 键盘浏览
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    setPinned(null);
    const page = Math.max(240, el.clientWidth * 0.8);
    if (e.key === 'ArrowRight') {
      el.scrollLeft += 120;
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      el.scrollLeft -= 120;
      e.preventDefault();
    } else if (e.key === 'PageDown') {
      el.scrollLeft += page;
      e.preventDefault();
    } else if (e.key === 'PageUp') {
      el.scrollLeft -= page;
      e.preventDefault();
    } else if (e.key === 'Home') {
      el.scrollLeft = 0;
      e.preventDefault();
    } else if (e.key === 'End') {
      el.scrollLeft = el.scrollWidth;
      e.preventDefault();
    }
  };

  // 阈值放宽到 2%: 原来 0.2% 时, 只要吸附带来几个像素的偏移, 首尾渐隐就会误亮,
  // 把开头/结尾的印章压暗 (视觉上像被裁掉)
  const atStart = progress <= 0.02;
  const atEnd = progress >= 0.98;
  const shownSection = pinned ?? currentSection;

  return (
    <div>
      {/* 装裱: 双线边栏 + 天地头 + 两端轴头 (轴头固定在视口边缘, 不随内容滚动) */}
      <div className="scroll-frame">
        <div
          ref={ref}
          tabIndex={0}
          role="region"
          aria-label="长卷: 横向浏览, 可用左右方向键、Home/End, 或按住拖动"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onWheel={() => pinned !== null && setPinned(null)}
          onKeyDown={onKeyDown}
          className={`scroll-pan scrollbar-hidden overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-seal ${
            dragging ? 'is-dragging' : ''
          } ${atStart ? 'at-start' : ''} ${atEnd ? 'at-end' : ''} ${auto ? 'is-auto' : ''}`}
          style={{
            cursor: 'grab',
            // 自动展卷 / 到末尾时必须关掉吸附与平滑:
            //   运行中 → 每帧位移会被抵消 (见上)
            //   末尾   → 恢复吸附会把卷尾往回拽 48px (实测 Δ=-48)
            scrollSnapType: reduced || auto || atEnd ? 'none' : 'x proximity',
            scrollBehavior: auto ? 'auto' : undefined,
          }}
        >
          <div style={{ minWidth: `${ticks[ticks.length - 1]?.x ?? 0}px` }}>{children}</div>
        </div>
        <span className="scroll-roller scroll-roller--left" aria-hidden="true" />
        <span className="scroll-roller scroll-roller--right" aria-hidden="true" />
      </div>

      {/* 卷轴刻度 + 进度 */}
      <div className="mt-4" data-testid="scroll-chrome">
        {/* 刻度尺与"自动展卷"放在同一行: 按钮不再混在下方的灰色小字里,
            而是与刻度并排、自成一组控件 (实测原来只有 78×20px 且是淡墨色, 读者发现不了) */}
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0 flex items-end gap-[3px] h-6" aria-hidden="true">
            {ticks.map((t) => {
              const active = t.n === shownSection;
              return (
                <button
                  key={t.n}
                  onClick={() => onTick(t)}
                  tabIndex={-1}
                  title={`第 ${t.n} 节`}
                  className={`flex-1 min-w-[2px] transition-all ${
                    active ? 'bg-seal h-5' : 'bg-border h-2 hover:bg-vermillion'
                  }`}
                />
              );
            })}
          </div>

          {atEnd ? (
            <button
              onClick={() => {
                setPinned(null);
                setAuto(false);
                jumpTo(0);
              }}
              className="flex-shrink-0 text-sm px-3 py-1.5 min-h-[36px] border border-seal text-seal hover:bg-seal hover:text-bg transition-colors"
              title="已到卷尾, 点此回到卷首"
            >
              ⟲ 回到卷首
            </button>
          ) : (
            <button
              onClick={toggleAuto}
              disabled={reduced}
              aria-pressed={auto}
              // 朱砂深 #8B3A3A 在 bg-alt 上 5.58:1 (达标); 运行中反白填充, 状态一眼可见
              className={`flex-shrink-0 text-sm px-3 py-1.5 min-h-[36px] border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                auto
                  ? 'bg-seal border-seal text-bg'
                  : 'border-vermillion text-vermillion hover:bg-vermillion hover:text-bg'
              }`}
              title={reduced ? '系统已开启"减少动效", 自动展卷不可用' : '缓慢自动向右展卷（鼠标移上去会暂停）'}
            >
              {auto ? '⏸ 暂停展卷' : '▶ 自动展卷'}
            </button>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft">
          <span>
            第 <strong className="text-seal">{String(shownSection).padStart(2, '0')}</strong> 节 /
            共 {ticks.length} 节
          </span>
          <span className="hidden sm:inline">拖动 · 方向键 · Home/End 浏览 · 点刻度跳节</span>
          <span className="tabular-nums">{Math.round(progress * 100)}%</span>
        </div>
        {/* 进度条 (朱丝栏) */}
        <div className="mt-2 h-px bg-border relative" aria-hidden="true">
          <div
            className="absolute left-0 top-0 h-px bg-seal transition-[width] duration-150"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="sr-only">{`长卷共 ${ticks.length} 节, 当前第 ${shownSection} 节`}</p>
      </div>
    </div>
  );
}
