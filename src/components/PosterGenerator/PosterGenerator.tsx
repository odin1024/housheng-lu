'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Entry } from '@/types';
import { allEntries, getEntryById } from '@/lib/entries';
import { create as toast } from '@/lib/toast-store';

type Template = 'square' | 'story' | 'wide';

const TEMPLATES: Record<Template, { w: number; h: number; label: string; ratio: string; wpx: string }> = {
  square: { w: 1080, h: 1080, label: '方形', ratio: '1:1', wpx: '1080×1080' },
  story: { w: 1080, h: 1920, label: '竖版', ratio: '9:16', wpx: '1080×1920' },
  wide: { w: 1200, h: 630, label: '横版', ratio: '1.91:1', wpx: '1200×630' },
};

const QUICK_PICKS = [
  { ids: ['01-01'], label: '系安全带 (1)' },
  { ids: ['13-01'], label: '急救 心脏骤停 (1)' },
  { ids: ['08-08'], label: '法律 帮信罪 (1)' },
  { ids: ['02-09'], label: '健康 低钠盐 (1)' },
  { ids: ['05-05', '05-12'], label: '不浪费钱 (2)' },
  { ids: ['01-01', '13-01', '08-08'], label: '安全+急救+法律 (3)' },
];

const COLORS = {
  bg: '#F2E8D5',
  bgAlt: '#E8DCC0',
  ink: '#2A2418',
  inkSoft: '#6B5D4A',
  vermillion: '#8B3A3A',
  seal: '#B73229',
  border: '#C9B894',
};

function loadFont(): Promise<void> {
  return new Promise((resolve) => {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => resolve()).catch(() => resolve());
    } else {
      resolve();
    }
  });
}

export function PosterGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(['01-01']);
  const [template, setTemplate] = useState<Template>('square');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDims, setPreviewDims] = useState<{ w: number; h: number } | null>(null);
  const [search, setSearch] = useState('');

  const filteredEntries = allEntries
    .filter((e) => search.length === 0 || e.title.includes(search) || e.id.includes(search))
    .slice(0, 30);

  const selectedEntries = selectedIds.map((id) => getEntryById(id)).filter(Boolean) as Entry[];

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 9) {
        toast.show('最多 9 条');
        return prev;
      }
      return [...prev, id];
    });
  };

  const applyQuickPick = (ids: string[]) => {
    setSelectedIds(ids);
  };

  // 自适应布局 - 按条目数和模板选最优布局
  const computeLayout = (entries: Entry[], t: Template) => {
    const { w, h } = TEMPLATES[t];
    const isWide = t === 'wide';
    const isStory = t === 'story';
    const count = entries.length;
    const margin = isWide ? 50 : 60; // 画布左右边距

    // 顶部区域: 标题 70 + 副标 30 + 间距 50
    const headerHeight = 200;
    // 底部区域: 朱丝栏 + 落款
    const footerHeight = 100;
    // 印章 56x56
    const sealSize = isWide ? 48 : 56;

    const contentTop = headerHeight;
    const contentBottom = h - footerHeight;
    const contentHeight = contentBottom - contentTop;
    const availableWidth = w - margin * 2;

    // 单条布局: 印章 + 标题 + 说人话 (横向排版)
    // 多条布局: 标题 + 说人话 上下排, 印章左侧
    return {
      w, h, margin, isWide, isStory,
      headerHeight, footerHeight, sealSize,
      contentTop, contentBottom, contentHeight, availableWidth,
      count,
      // 每条高度
      itemHeight: Math.floor(contentHeight / Math.max(count, 1)),
    };
  };

  // 绘制朱砂方印 - 自适应文字大小,确保 5 字符 ID 也能装下
  const drawSeal = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, id: string, level: string) => {
    ctx.strokeStyle = COLORS.seal;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, size, size);

    // ID 字号按字符数自适应,避免截断
    const idLen = id.length; // "01-01" = 5, "13-12" = 5
    const idFontSize = idLen <= 3 ? size * 0.32 : idLen <= 4 ? size * 0.26 : size * 0.22;
    const levelFontSize = size * 0.28;

    ctx.fillStyle = COLORS.seal;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // ID 上半
    ctx.font = `bold ${Math.round(idFontSize)}px "Courier New", monospace`;
    ctx.fillText(id, x + size / 2, y + size * 0.36);
    // 等级字母 A/B/C 下半
    ctx.font = `bold ${Math.round(levelFontSize)}px serif`;
    ctx.fillText(level, x + size / 2, y + size * 0.72);
  };

  // 绘制标题 (加粗大字, 自动换行)
  const drawTitle = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    fontSize: number,
    lineHeight: number,
  ) => {
    ctx.fillStyle = COLORS.ink;
    ctx.font = `bold ${fontSize}px "Source Han Serif SC", "Songti SC", serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    return wrapTextAuto(ctx, text, x, y, maxWidth, lineHeight);
  };

  // 绘制说人话 (灰字小字, 支持 \n 分隔多行)
  const drawPlain = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    fontSize: number,
    lineHeight: number,
  ) => {
    ctx.fillStyle = COLORS.inkSoft;
    ctx.font = `${fontSize}px "Source Han Serif SC", "Songti SC", serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    // 如果 text 含 \n, 按行分别画 (truncateToRows 输出格式)
    if (text.includes('\n')) {
      const lines = text.split('\n');
      let curY = y;
      for (const ln of lines) {
        ctx.fillText(ln, x, curY);
        curY += lineHeight;
      }
      return curY;
    }
    return wrapTextAuto(ctx, text, x, y, maxWidth, lineHeight);
  };

  const render = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      toast.show('画布未挂载');
      return;
    }
    await loadFont();

    const { w, h } = TEMPLATES[template];
    canvas.width = w;
    canvas.height = h;
    // 重置 transform (避免上次渲染残留)
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const layout = computeLayout(selectedEntries, template);

    // 1. 竹纸底
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);

    // 2. 竹纸纹理 (轻)
    ctx.strokeStyle = 'rgba(200, 184, 148, 0.35)';
    ctx.lineWidth = 0.5;
    for (let i = -h; i < w; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i + h, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }

    // 3. 顶部标题区
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.ink;
    ctx.font = `bold 64px "Source Han Serif SC", "Songti SC", serif`;
    ctx.fillText('厚 生 錄', w / 2, 72);

    ctx.fillStyle = COLORS.vermillion;
    ctx.font = '24px "Source Han Serif SC", "Songti SC", serif';
    ctx.fillText('七百余条生计, 都在案头。', w / 2, 124);

    // 顶部朱丝栏
    ctx.strokeStyle = COLORS.vermillion;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(layout.margin, 168);
    ctx.lineTo(w - layout.margin, 168);
    ctx.stroke();

    // 4. 中部内容区 - 按 1/2/3 条自适应
    const count = layout.count;

    if (count === 1) {
      // 单条: 大尺寸 - 印章居中, 标题大字, 说人话展开; 整组垂直居中避免大片留白
      const entry = selectedEntries[0];
      const sealSize1 = layout.sealSize * 1.5;
      const titleMaxWidth = layout.availableWidth * 0.95;
      const titleFontSize = Math.min(56, Math.floor(layout.contentHeight * 0.18));
      const titleLineH = titleFontSize * 1.3;
      const plainFontSize = Math.min(22, Math.floor(layout.contentHeight * 0.10));
      const plainLineH = plainFontSize * 1.6;
      // 摘要左右居中 → 左右边距天然对称; 0.92 让正文更铺满
      const plainMaxWidth = Math.floor(layout.availableWidth * 0.92);

      // 标题行数 (先量后画, 用标题字体)
      ctx.font = `bold ${titleFontSize}px "Source Han Serif SC", "Songti SC", serif`;
      const titleRows = Math.max(
        1,
        Math.ceil(ctx.measureText(entry.title).width / titleMaxWidth),
      );

      // 说人话: plainLanguage + benefit + remark, 行数按剩余高度定, 最多 10 行
      const plainText = [entry.plainLanguage, entry.benefit || '', entry.remark || '']
        .filter(Boolean)
        .join(' · ');
      const fixedH = sealSize1 + 50 + titleRows * titleLineH + 30 + 30;
      const maxRowsBySpace = Math.max(
        1,
        Math.floor((layout.contentHeight - fixedH) / plainLineH),
      );
      const plainLines = truncateToRows(
        plainText,
        ctx,
        plainMaxWidth,
        plainFontSize,
        Math.min(10, maxRowsBySpace),
      ).split('\n');

      // 整组高度 → 内容区垂直居中
      const blockH = fixedH + plainLines.length * plainLineH;
      const itemY =
        layout.contentTop + Math.max(0, Math.floor((layout.contentHeight - blockH) / 2));

      // 印章居中
      const sealX = (w - sealSize1) / 2;
      drawSeal(ctx, sealX, itemY, sealSize1, entry.id, entry.evidenceLevel);

      // 标题 (居中)
      const titleY = itemY + sealSize1 + 50;
      drawTitleCentered(
        ctx,
        entry.title,
        w / 2 - titleMaxWidth / 2,
        titleY,
        titleMaxWidth,
        titleFontSize,
        titleLineH,
      );

      // 朱丝栏 - 画在标题下
      const lineY = titleY + titleRows * titleLineH + 30;
      ctx.strokeStyle = COLORS.vermillion;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(layout.margin, lineY);
      ctx.lineTo(w - layout.margin, lineY);
      ctx.stroke();

      // 说人话: 左对齐排版 (段落左对齐才好读), 整块水平居中 → 左右边距对称
      const plainY = lineY + 30;
      const plainLeft = Math.round((w - plainMaxWidth) / 2);
      ctx.fillStyle = COLORS.inkSoft;
      ctx.font = `${plainFontSize}px "Source Han Serif SC", "Songti SC", serif`;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      let curY = plainY;
      for (const ln of plainLines) {
        ctx.fillText(ln, plainLeft, curY);
        curY += plainLineH;
      }
    } else {
      // 多条: 上下排列, 每条有印章 + 标题 + 说人话
      // 按实际可用高度反推 itemH/字号,确保 1-9 条都美观
      const itemCount = count;
      // 横版 (wide) 因为宽度窄, 标题可能要 2 行, 摘要也要 2 行, 用更紧的 gap
      const itemGap = layout.isWide
        ? (itemCount <= 3 ? 12 : itemCount <= 6 ? 8 : 6)
        : (itemCount <= 3 ? 24 : itemCount <= 6 ? 16 : 12);
      // 摊开高度: 条目把内容区铺满时每条可用高度
      const spreadH = Math.floor(
        (layout.contentHeight - itemGap * (itemCount - 1)) / itemCount,
      );
      // 条目高度上限: 条目少时不要把每条拉得过散 (否则条目间留大片空白)
      const maxItemH = layout.isWide ? 110 : layout.isStory ? 220 : 190;
      const itemH = Math.min(spreadH, maxItemH);
      // 整组在内容区垂直居中, 让上下的留白对称
      const blockH = itemH * itemCount + itemGap * (itemCount - 1);
      const blockTop =
        layout.contentTop + Math.max(0, Math.floor((layout.contentHeight - blockH) / 2));

      // 印章按 itemH 自适应, 但封顶 56 封底 24 (印章调小, 给摘要更多空间)
      // 印章缩小: 给摘要让出更多横向空间
      const multiSealSize = layout.isWide
        ? Math.max(20, Math.min(28, Math.floor(itemH * 0.40)))
        : Math.max(20, Math.min(40, Math.floor(itemH * 0.40)));

      // 标题字号: 印章高度的 50-60% (标题在印章右侧, 视觉大小协调)
      const titleFontSize = layout.isWide
        ? Math.max(13, Math.min(22, Math.floor(multiSealSize * 0.45)))
        : Math.max(14, Math.min(36, Math.floor(multiSealSize * 0.55)));
      const titleLineH = titleFontSize * 1.3;

      // 标题最多 2 行, 但小字号时 1 行足够
      const maxTitleRows = titleFontSize >= 24 ? 2 : (titleFontSize >= 18 ? Math.min(2, Math.max(1, Math.floor(multiSealSize / titleLineH / 2))) : 1);
      const titleRowH = titleLineH * maxTitleRows;
      // 摘要可视高度 = itemH - 标题高度 (摘要撑满整 itemH, 不受印章限制)
      // 摘要字号优先可读, 不为行数让步
      const plainAvailH = itemH - titleRowH - 4;
      // 摘要字号: 固定合理大小, 保证可读
      // 横版 11-12 (高度紧张, 1-2 行), 方形/竖版 14-16 (3 行)
      const plainFontSize = layout.isStory
        ? (itemCount <= 3 ? 16 : itemCount <= 6 ? 15 : 14)
        : layout.isWide
          ? (itemCount <= 3 ? 12 : itemCount <= 6 ? 11 : 10)
          : (itemCount <= 3 ? 15 : itemCount <= 6 ? 14 : 13);
      const plainLineH = plainFontSize * 1.5;
      // 摘要目标行数: 方形/竖版 3 行 (固定), 横版 1 行
      const targetPlainRows = layout.isWide ? 1 : 3;
      // 摘要最大行数: 不超过目标行数 (即使空间够也不多画)
      const maxBySpace = Math.floor((plainAvailH + 2) / plainLineH);
      const maxPlainRows = Math.max(1, Math.min(targetPlainRows, maxBySpace));

      selectedEntries.forEach((entry, i) => {
        const y = blockTop + i * (itemH + itemGap);
        const sealX = layout.margin;
        const sealY = y + (itemH - multiSealSize) / 2; // 印章垂直居中

        // 印章
        drawSeal(ctx, sealX, sealY, multiSealSize, entry.id, entry.evidenceLevel);

        // 标题 + 说人话 (摘要左右边距对称: 摘要中心在画布中点)
        const textX = sealX + multiSealSize + 4;
        // textMaxWidth 让摘要从 textX 起到 (w - textX) 止, 左右 margin 对称
        const textMaxWidth = w - 2 * textX;
        const titleY = sealY - 4;
        const titleEndY = drawTitle(
          ctx,
          entry.title,
          textX,
          titleY,
          textMaxWidth,
          titleFontSize,
          titleLineH,
        );

        // 说人话 (标题下方), 显示完整 plainLanguage + benefit 关键段
        // 拼接: plainLanguage (通俗解释) + benefit (收益详情关键部分) 让内容更丰富
        const plainY = titleEndY + 6;
        // 拼接策略: plainLanguage + benefit 全文 + remark
        // 完整 plainLanguage 50-150 字, benefit 100-400 字, remark 50-200 字
        // 总长度 200-700 字, 配合 truncateToRows 按目标行数 wrap
        const combined = [
          entry.plainLanguage,
          entry.benefit || '',
          entry.remark || '',
        ].filter(Boolean).join(' · ');
        const truncated = truncateToRows(
          combined,
          ctx,
          textMaxWidth,
          plainFontSize,
          maxPlainRows,
        );
        drawPlain(
          ctx,
          truncated,
          textX,
          plainY,
          textMaxWidth,
          plainFontSize,
          plainLineH,
        );
      });
    }

    // 5. 底部朱丝栏 + 落款 + 钤印
    const footerY = h - layout.footerHeight;
    ctx.strokeStyle = COLORS.vermillion;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(layout.margin, footerY + 20);
    ctx.lineTo(w - layout.margin, footerY + 20);
    ctx.stroke();

    // 钤印 (右下角) - V3 双线椭圆, 尺寸按画布比例自适应, 留 margin 防裁切
    const sealW = Math.min(140, Math.floor(w * 0.12));
    const sealH = Math.min(64, Math.floor(h * 0.08));
    const sealX = w - sealW - layout.margin;
    const sealY = footerY + 30;
    // 文字字号按 sealH 自适应
    const sealFontSize = Math.round(sealH * 0.38);
    // 外框椭圆
    ctx.strokeStyle = COLORS.seal;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(sealX + sealW / 2, sealY + sealH / 2, sealW / 2 - 4, sealH / 2 - 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    // 内框椭圆
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(sealX + sealW / 2, sealY + sealH / 2, sealW / 2 - 14, sealH / 2 - 14, 0, 0, Math.PI * 2);
    ctx.stroke();
    // 文字 (横排)
    ctx.fillStyle = COLORS.seal;
    ctx.font = `bold ${sealFontSize}px "Source Han Serif SC", "Songti SC", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('厚生錄', sealX + sealW / 2, sealY + sealH / 2 + 2);

    // 落款 (左侧, 不与钤印重叠, 按画布宽度自适应字号)
    const textEndX = sealX - 20;
    const textStartX = layout.margin;
    const textCenter = (textStartX + textEndX) / 2;
    // 自适应落款字号
    let creditFontSize = 18;
    ctx.fillStyle = COLORS.inkSoft;
    ctx.font = `${creditFontSize}px "Source Han Serif SC", "Songti SC", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const creditText = '厚生錄 · 改编自 CC BY 4.0 · eternity4719/HowToLiveBetter';
    let creditW = ctx.measureText(creditText).width;
    const maxCreditW = textEndX - textStartX;
    if (creditW > maxCreditW) {
      creditFontSize = Math.max(12, Math.floor(creditFontSize * (maxCreditW / creditW)));
      ctx.font = `${creditFontSize}px "Source Han Serif SC", "Songti SC", serif`;
    }
    ctx.fillText(creditText, textCenter, sealY + sealH / 2);

    // 6. 生成预览 (PNG)
    const dataUrl = canvas.toDataURL('image/png');
    setPreviewUrl(dataUrl);
    setPreviewDims({ w, h });
  }, [selectedEntries, template]);

  // 模板变化自动重渲染
  useEffect(() => {
    if (previewUrl) render();
  }, [template]); // eslint-disable-line react-hooks/exhaustive-deps

  // 条目变化也重渲染
  useEffect(() => {
    if (previewUrl) render();
  }, [selectedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const download = () => {
    if (!previewUrl) {
      toast.show('请先生成预览');
      return;
    }
    const a = document.createElement('a');
    a.href = previewUrl;
    const tpl = TEMPLATES[template];
    a.download = `厚生錄-${tpl.label}-${selectedIds.join('-')}-${tpl.w}x${tpl.h}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.show(`已下载 ${tpl.w}×${tpl.h}`);
  };

  return (
    <div>
      {/* 选条目 */}
      <section className="mb-6">
        <h2 className="text-lg font-bold mb-3 tracking-guo-sm" style={{ fontFamily: 'var(--font-zh-heading)' }}>
          选条目 (1-9 条)
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {QUICK_PICKS.map((q) => (
            <button
              key={q.label}
              onClick={() => applyQuickPick(q.ids)}
              className="text-xs px-3 py-1 border border-border text-ink-soft hover:border-seal hover:text-seal"
            >
              {q.label}
            </button>
          ))}
        </div>
        {/* 补 label: 此前只有 placeholder, 屏幕阅读器只会播报"编辑框" (审计实测) */}
        <label htmlFor="poster-search" className="sr-only">
          搜索条目
        </label>
        <input
          id="poster-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜条目 (ID 或标题)..."
          className="w-full px-3 py-2 border border-border bg-bg mb-3"
        />
        <div className="max-h-64 overflow-y-auto border border-border bg-bg-alt p-2 space-y-1">
          {filteredEntries.map((e) => {
            const selected = selectedIds.includes(e.id);
            return (
              <button
                key={e.id}
                onClick={() => toggle(e.id)}
                title={`${e.id} ${e.title}`}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 ${
                  selected ? 'bg-seal text-bg' : 'hover:bg-bg'
                }`}
              >
                <span className="font-mono text-xs">{e.id}</span>
                <span
                  className={`text-xs px-1 border ${
                    selected ? 'border-bg text-bg' : 'border-vermillion text-vermillion'
                  }`}
                >
                  {e.evidenceLevel}
                </span>
                {/* 窄屏 (320px) 下标题会被截断, 实测 clientW 148 / scrollW 462,
                    单靠 CSS truncate 读不到全称 → 用 title 兜底 (悬停可见), 并让屏幕阅读器读到完整标题 */}
                <span className="flex-1 truncate" title={e.title}>
                  {e.title}
                </span>
                {selected && <span>✓</span>}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-ink-soft mt-2">
          已选 {selectedIds.length}/9
          {selectedEntries.length > 0 && (
            <span className="ml-3">
              预览尺寸: {TEMPLATES[template].w}×{TEMPLATES[template].h}
            </span>
          )}
        </p>
      </section>

      {/* 模板选择 */}
      <section className="mb-6">
        <h2 className="text-lg font-bold mb-3 tracking-guo-sm" style={{ fontFamily: 'var(--font-zh-heading)' }}>
          选模板
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(TEMPLATES) as Template[]).map((k) => {
            const t = TEMPLATES[k];
            const selected = template === k;
            return (
              <button
                key={k}
                onClick={() => setTemplate(k)}
                aria-pressed={selected}
                className={`p-3 border ${
                  selected
                    ? 'border-seal text-seal bg-bg-alt'
                    : 'border-border hover:border-vermillion text-ink-soft'
                }`}
              >
                <div className="text-base font-bold">{t.label}</div>
                {/* 去掉 opacity-80: 曾把副标签压到 3.34~3.50:1 (12px 需 4.5) */}
                <div className="text-xs mt-1">
                  {t.ratio} · {t.wpx}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 操作按钮 */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={render}
          disabled={selectedEntries.length === 0}
          className="px-6 py-2 border border-vermillion text-vermillion hover:bg-vermillion hover:text-bg disabled:opacity-40"
        >
          {previewUrl ? '重新生成' : '生成预览'}
        </button>
        <button
          onClick={download}
          disabled={!previewUrl}
          className="px-6 py-2 bg-seal text-bg hover:opacity-80 disabled:opacity-40"
        >
          下载 {TEMPLATES[template].w}×{TEMPLATES[template].h} PNG
        </button>
      </div>

      {/* 预览 */}
      <section>
        <canvas ref={canvasRef} className="hidden" />
        {previewUrl && previewDims ? (
          <div className="border border-border bg-bg-alt p-4">
            <p className="text-sm text-ink-soft mb-2">
              预览 ({previewDims.w}×{previewDims.h}, 实际下载尺寸) ·
              {previewDims.w / previewDims.h > 1.5
                ? ' 横版, 在大屏查看'
                : previewDims.w === previewDims.h
                  ? ' 方形, 适合朋友圈/小红书'
                  : ' 竖版, 适合抖音/小红书长图'}
            </p>
            <div
              className="mx-auto border border-border bg-bg"
              style={{ maxWidth: '500px' }}
            >
              <img
                src={previewUrl}
                alt={`海报预览 ${previewDims.w}×${previewDims.h}`}
                width={previewDims.w}
                height={previewDims.h}
                className="block w-full h-auto"
              />
            </div>
            <p className="text-xs text-ink-soft mt-2 text-center">
              原图尺寸: {previewDims.w}×{previewDims.h}px
            </p>
          </div>
        ) : (
          <div className="border border-dashed border-border p-8 text-center text-ink-soft">
            选好条目 + 点"生成预览"会显示在这里
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * 按 maxWidth wrap 文本, 最多 maxRows 行
 * - 内容超过 maxRows 行: 截断到 maxRows 行, 末位加 …
 * - 内容不足 maxRows 行: 重复填满 (避免视觉空行)
 * 关键: 按"视觉实际宽度"切行, 不按字符数 — 保证每行真正填满宽度
 * 返回: \n 分隔的多行字符串
 */
function truncateToRows(
  text: string,
  ctx: CanvasRenderingContext2D,
  maxWidth: number,
  fontSize: number,
  maxRows: number,
): string {
  if (maxRows < 1 || !text) return '';

  // 关键: 必须用与渲染完全一致的字体测量
  // 否则会沿用上一个 drawTitle 留下的"加粗大字号"去量, 换行提前、右边留大片空白
  ctx.font = `${fontSize}px "Source Han Serif SC", "Songti SC", serif`;

  // 贪婪 wrap: 按视觉宽度累加, 超过 maxWidth 才换行
  // 每行字符尽量贴近 maxWidth, 不会有"半行"留白
  // 短摘要自然短, 不重复凑数
  const chars = text.split('');
  const lines: string[] = [];
  let line = '';
  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i];
    if (ctx.measureText(test).width > maxWidth && line.length > 0) {
      lines.push(line);
      line = chars[i];
      if (lines.length >= maxRows) {
        // 触达 maxRows: 正好 maxRows 行, 末行收尾加 …
        const last = lines[maxRows - 1];
        lines[maxRows - 1] = last.length > 1 ? last.slice(0, -1) + '…' : last + '…';
        return lines.join('\n');
      }
    } else {
      line = test;
    }
  }
  if (line.length > 0) {
    lines.push(line);
  }
  // 超过 maxRows (兜底): 截断 + …
  if (lines.length > maxRows) {
    const truncated = lines.slice(0, maxRows);
    const last = truncated[maxRows - 1];
    truncated[maxRows - 1] = last.length > 1 ? last.slice(0, -1) + '…' : last + '…';
    return truncated.join('\n');
  }
  return lines.join('\n');
}
function wrapTextAuto(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const chars = text.split('');
  let line = '';
  const lines: string[] = [];
  for (let i = 0; i < chars.length; i++) {
    const testLine = line + chars[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line.length > 0) {
      lines.push(line);
      line = chars[i];
    } else {
      line = testLine;
    }
  }
  if (line.length > 0) lines.push(line);

  let currentY = y;
  if (ctx.textAlign === 'center') {
    for (const ln of lines) {
      ctx.fillText(ln, x, currentY);
      currentY += lineHeight;
    }
  } else {
    for (const ln of lines) {
      ctx.fillText(ln, x, currentY);
      currentY += lineHeight;
    }
  }
  return currentY;
}

/**
 * 居中绘制文本 (每行实际居中)
 */
function drawTitleCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  lineHeight: number,
): void {
  const chars = text.split('');
  let line = '';
  const lines: string[] = [];
  for (let i = 0; i < chars.length; i++) {
    const testLine = line + chars[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line.length > 0) {
      lines.push(line);
      line = chars[i];
    } else {
      line = testLine;
    }
  }
  if (line.length > 0) lines.push(line);

  // 标题用 center 对齐
  ctx.fillStyle = COLORS.ink;
  ctx.font = `bold ${fontSize}px "Source Han Serif SC", "Songti SC", serif`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  // x + maxWidth/2 是画布中心 (因为我们传入的 x 是 startX 不是 center)
  // 改成: 接受 x = 起始 x, maxWidth = 可用宽度, 我们自己算中心
  const centerX = x + maxWidth / 2;
  let cy = y;
  for (const ln of lines) {
    ctx.fillText(ln, centerX, cy);
    cy += lineHeight;
  }
  // 恢复 left (避免污染其他)
  ctx.textAlign = 'left';
}
