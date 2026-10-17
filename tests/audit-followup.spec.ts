// 审计: 跟进项 (侧栏截断 / 空态确认 / 0 格 / loading / 焦点指示 / seal tab 数) — 只读
import { test } from '@playwright/test';
import { BASE } from './audit-pages';

test.use({ trace: 'off', screenshot: 'off' });

const WIDTHS = [320, 375, 390, 768, 1024, 1280, 1920];

test('F1 /explore 侧栏章节名截断 (7 档)', async ({ page }) => {
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 844 });
    await page.goto(BASE + '/explore', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const r: any = await page.evaluate(() => {
      const rows: any[] = [];
      // 侧栏内所有可能被截断的文本节点
      const aside = document.querySelector('aside');
      if (!aside) return { rows, asideW: 0 };
      for (const el of aside.querySelectorAll('span.truncate, .truncate, h3')) {
        if (!el.getClientRects().length) continue;
        const clipped = el.scrollWidth > el.clientWidth + 1;
        if (!clipped) continue;
        const cs = getComputedStyle(el);
        rows.push({
          text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
          clientW: el.clientWidth,
          scrollW: el.scrollWidth,
          missing: el.scrollWidth - el.clientWidth,
          ownTitle: el.getAttribute('title'),
          parentTitle: el.parentElement?.getAttribute('title'),
          labelTitle: el.closest('label')?.getAttribute('title'),
          overflow: cs.overflowX,
          ellipsis: cs.textOverflow,
        });
      }
      // 侧栏内被 header 遮挡的元素
      const hb = document.querySelector('header')!.getBoundingClientRect();
      const covered: string[] = [];
      for (const el of aside.querySelectorAll('*')) {
        if (!el.getClientRects().length) continue;
        let own = '';
        for (const n of el.childNodes) if (n.nodeType === 3) own += n.textContent;
        if (!own.trim()) continue;
        const b = el.getBoundingClientRect();
        if (b.top < hb.bottom - 0.5) covered.push(`${(own).trim().slice(0, 18)} (top=${Math.round(b.top)} < header.bottom=${Math.round(hb.bottom)})`);
      }
      return { rows, asideW: Math.round(aside.getBoundingClientRect().width), covered };
    });
    console.log(`\n### F1 /explore 侧栏 @${w}px | aside 宽=${r.asideW}px | 被截断 ${r.rows.length} 处 | 被 header 盖住的有字元素 ${r.covered.length}`);
    for (const x of r.rows.slice(0, 8)) {
      console.log(
        `   "${x.text.slice(0, 34)}" clientW=${x.clientW} scrollW=${x.scrollW} 缺${x.missing}px | 自身title=${x.ownTitle ? '有' : '无'} 父title=${x.parentTitle ? '有' : '无'} label.title=${x.labelTitle ? '有' : '无'} | overflow-x=${x.overflow} text-overflow=${x.ellipsis}`,
      );
    }
    for (const c of r.covered.slice(0, 3)) console.log(`   !! 被遮挡: ${c}`);
    if (!r.rows.length) console.log('   无截断');
  }
});

test('F2 触屏能否读到完整章节名', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + '/explore', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const r: any = await page.evaluate(() => {
    // 找一个被截断的章节 label, 看它有没有任何可访问名/提示兜底
    const aside = document.querySelector('aside')!;
    const out: any[] = [];
    for (const sp of aside.querySelectorAll('span.truncate')) {
      if (sp.scrollWidth <= sp.clientWidth + 1) continue;
      const lab = sp.closest('label');
      const inp = lab?.querySelector('input');
      out.push({
        visibleText: (sp.textContent || '').trim(),
        fullTextAvailableAs: {
          titleAttr: lab?.getAttribute('title') ?? null,
          ariaLabelOnInput: inp?.getAttribute('aria-label') ?? null,
          ariaLabelledby: inp?.getAttribute('aria-labelledby') ?? null,
          inputAccessibleNameSource: lab ? 'wrapping <label> 的文本内容' : '无',
        },
        // 走查: 触屏无法触发 title, 只能靠长按/朗读
        touchReadableViaHover: false,
      });
    }
    return out.slice(0, 3);
  });
  console.log(`\n### F2 触屏 (390px) 被截断章节名的兜底`);
  if (!r.length) console.log('  390px 下侧栏无截断章节名');
  for (const x of r) console.log(`  "${x.visibleText.slice(0, 30)}" -> ${JSON.stringify(x.fullTextAvailableAs)}`);
});

test('F3 /explore 空结果态文案确认', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + '/explore', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.fill('#filter-search', 'zzzzqqqq');
  await page.waitForTimeout(700);
  const r: any = await page.evaluate(() => {
    const main = document.querySelector('main')!;
    // 取 aside 之后的兄弟（结果栏）
    const col = main.querySelector('.flex-1') || main;
    return {
      articles: main.querySelectorAll('article').length,
      colText: (col.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160),
      hasEmptyMsg: /卷中尚无条目|请调整筛选条件/.test(main.textContent || ''),
      hasError: /error|错误|失败/i.test(main.textContent || ''),
      loadMore: !!Array.from(main.querySelectorAll('button')).find((b) => b.textContent?.includes('展开更多')),
    };
  });
  console.log(`\n### F3 检索空结果`);
  console.log(`  article=${r.articles} 空态文案存在=${r.hasEmptyMsg} "展开更多"按钮=${r.loadMore} 错误文案=${r.hasError}`);
  console.log(`  结果栏文案: ${r.colText}`);
});

test('F4 /matrix 0 格 (逐口径扫描)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + '/matrix', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const calibers = ['全部', '寿命', '金钱', '时间精力', '人身自由'];
  let tested = 0;
  for (const c of calibers) {
    const btn = page.locator('main button', { hasText: new RegExp('^' + c + '$') }).first();
    if ((await btn.count()) === 0) continue;
    await btn.click();
    await page.waitForTimeout(400);
    const zeros = await page.evaluate(() => {
      const out: any[] = [];
      for (const b of document.querySelectorAll('table button')) {
        const t = (b.textContent || '').replace(/\s+/g, '');
        if (t.startsWith('0')) out.push({ title: b.getAttribute('title'), pressed: b.getAttribute('aria-pressed') });
      }
      return out;
    });
    if (!zeros.length) {
      console.log(`\n  [口径=${c}] 无 0 格`);
      continue;
    }
    console.log(`\n  [口径=${c}] 有 ${zeros.length} 个 0 格, 例: ${zeros[0].title}`);
    const cell = page.locator('table button').filter({ hasText: /^0条/ }).first();
    await cell.click();
    await page.waitForTimeout(400);
    const after: any = await page.evaluate(() => {
      const main = document.querySelector('main')!;
      const pressed = document.querySelector('table button[aria-pressed="true"]');
      const secs = [...main.querySelectorAll('section')].map((s) => (s.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50));
      return {
        pressedTitle: pressed?.getAttribute('title'),
        secs,
        hasNoEntriesMsg: /无条目|暂无|没有条目|该格为空|0 条/.test(main.textContent || ''),
      };
    });
    console.log(`     点击 0 格后 aria-pressed=true: "${after.pressedTitle}"`);
    console.log(`     是否出现"该格无条目"提示: ${after.hasNoEntriesMsg}`);
    console.log(`     页面 section: ${JSON.stringify(after.secs)}`);
    tested++;
    if (tested >= 2) break;
  }
  if (!tested) console.log('\n### F4 所有口径下都没有 0 格');
});

test('F5 /ask loading 态 (拦截人为延迟)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.route('**/api/ask', async (route) => {
    await new Promise((r) => setTimeout(r, 2500));
    await route.continue();
  });
  await page.goto(BASE + '/ask', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.fill('#q-input', '心脏骤停');
  await page.click('button:has-text("问 卷")');
  await page.waitForTimeout(600);
  const loading: any = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('检索中'));
    const m = document.querySelector('main')!;
    return {
      btnText: btn?.textContent?.trim() ?? null,
      btnDisabled: btn?.hasAttribute('disabled') ?? null,
      btnOpacity: btn ? getComputedStyle(btn).opacity : null,
      textareaDisabled: document.querySelector('#q-input')?.hasAttribute('disabled'),
      loadingTextShown: (m.textContent || '').includes('正在翻阅'),
      live: document.querySelectorAll('[aria-live],[role="status"],[role="alert"]').length,
      ariaBusy: document.querySelectorAll('[aria-busy="true"]').length,
      spinner: !!document.querySelector('[class*="animate-spin"], progress, [class*="animate-pulse"]'),
      exampleChipsStillClickable: [...document.querySelectorAll('button')].filter((b) => b.textContent?.includes('?')).map((b) => b.hasAttribute('disabled')),
    };
  });
  console.log(`\n### F5 /ask 加载态 (人为延迟 2.5s)`);
  console.log(`  按钮文案="${loading.btnText}" disabled=${loading.btnDisabled} opacity=${loading.btnOpacity}`);
  console.log(`  textarea disabled=${loading.textareaDisabled} | "正在翻阅"文案=${loading.loadingTextShown}`);
  console.log(`  aria-live/status/alert 数=${loading.live} aria-busy=${loading.ariaBusy} spinner/骨架=${loading.spinner}`);
  console.log(`  示例问题按钮 disabled 列表=${JSON.stringify(loading.exampleChipsStillClickable)}`);
  // 等待结果
  await page.waitForTimeout(3000);
  const done: any = await page.evaluate(() => ({
    hasAnswer: !!(document.querySelector('main')?.textContent || '').includes('原文检索') || !!(document.querySelector('main')?.textContent || '').includes('AI 引用'),
    headings: [...document.querySelectorAll('h1,h2,h3')].filter((h) => h.getClientRects().length).map((h) => h.tagName + ':' + (h.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 14)),
    live: document.querySelectorAll('[aria-live],[role="status"]').length,
    focusAfter: document.activeElement?.tagName,
  }));
  console.log(`  结果出现=${done.hasAnswer} 标题序列=${done.headings.join(' | ')} aria-live=${done.live}`);
});

test('F6 首页长卷: tab 站数量与焦点指示', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const counts: any = await page.evaluate(() => {
    const seals = [...document.querySelectorAll('a.seal-link')];
    return {
      seals: seals.length,
      sealsTabbable: seals.filter((s) => s.getAttribute('tabindex') !== '-1').length,
      allFocusable: document.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])').length,
      firstSealAccessibleName: seals[0]?.getAttribute('aria-label'),
    };
  });
  console.log(`\n### F6 首页长卷`);
  console.log(`  a.seal-link 总数=${counts.seals} 其中可 Tab=${counts.sealsTabbable}`);
  console.log(`  首页可聚焦元素总数=${counts.allFocusable} (即按 Tab 走完需 ${counts.allFocusable} 次)`);
  console.log(`  首个印章可访问名: "${counts.firstSealAccessibleName}"`);
  // 焦点指示: 对比聚焦前后 rect 的 stroke-width / stroke
  const r: any = await page.evaluate(() => {
    const a = document.querySelector('a.seal-link') as HTMLElement;
    const rect = a.querySelector('rect') as SVGRectElement;
    const before = { sw: getComputedStyle(rect).strokeWidth, stroke: getComputedStyle(rect).stroke, outline: getComputedStyle(a).outlineStyle };
    a.focus();
    return { before, sealCount: document.querySelectorAll('a.seal-link').length };
  });
  // 用键盘制造 :focus-visible
  await page.evaluate(() => (document.querySelector('a.seal-link') as HTMLElement).blur());
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    const ok = await page.evaluate(() => document.activeElement?.classList.contains('seal-link'));
    if (ok) break;
  }
  const after: any = await page.evaluate(() => {
    const a = document.activeElement as HTMLElement;
    if (!a || !a.classList.contains('seal-link')) return { focused: false };
    const rect = a.querySelector('rect') as SVGRectElement;
    const cs = getComputedStyle(a);
    return {
      focused: true,
      outlineStyle: cs.outlineStyle,
      outlineWidth: cs.outlineWidth,
      rectStrokeWidth: getComputedStyle(rect).strokeWidth,
      rectStroke: getComputedStyle(rect).stroke,
      isA: (a.getAttribute('aria-label') || '').includes('A 级'),
      name: a.getAttribute('aria-label'),
    };
  });
  console.log(`  未聚焦时 rect stroke-width=${r.before.sw} stroke=${r.before.stroke} a.outline=${r.before.outline}`);
  console.log(`  键盘聚焦后: ${JSON.stringify(after)}`);
  console.log(`  -> outline 被显式移除, 唯一指示是 rect 描边变化 (源于 globals.css:355-361)`);
});

test('F7 软 404 状态码 (原始 HTTP)', async ({ page }) => {
  const paths = ['/emergency/不存在场景xyz', '/definitely-not-a-real-page', '/book/99-99', '/explore', '/'];
  console.log('\n### F7 HTTP 状态码');
  for (const p of paths) {
    const resp = await page.goto(BASE + p, { waitUntil: 'domcontentloaded' });
    console.log(`  ${String(resp?.status()).padEnd(4)} ${p}   title="${await page.title()}"`);
  }
});
