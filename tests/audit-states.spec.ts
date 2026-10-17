// 审计: 状态完整性 / 交互反馈 / 焦点 / 暗色 / 重叠 — 只读
import { test } from '@playwright/test';
import { BASE } from './audit-pages';

test.use({ trace: 'off', screenshot: 'off' });

test('S1 头部高度 / sticky 偏移 / 重叠', async ({ page }) => {
  for (const [w, h, label] of [
    [1280, 900, '桌面 1280'],
    [768, 900, 'iPad 768'],
    [390, 844, '手机 390'],
  ] as Array<[number, number, string]>) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(BASE + '/explore', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const r: any = await page.evaluate(() => {
      const header = document.querySelector('header')!;
      const hb = header.getBoundingClientRect();
      const hcs = getComputedStyle(header);
      const aside = document.querySelector('aside')!;
      const ab = aside.getBoundingClientRect();
      const acs = getComputedStyle(aside);
      return {
        headerH: Math.round(hb.height),
        headerPos: hcs.position,
        asidePos: acs.position,
        asideTop: acs.top,
        asideMaxH: acs.maxHeight,
        asideTopPx: Math.round(ab.top),
        hasStickyTop64: acs.top === '64px',
      };
    });
    // 滚动后再测一次, 看 aside 顶边是否被 header 覆盖
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(300);
    const r2: any = await page.evaluate(() => {
      const header = document.querySelector('header')!;
      const hb = header.getBoundingClientRect();
      const aside = document.querySelector('aside')!;
      const ab = aside.getBoundingClientRect();
      const overlap = Math.max(0, Math.min(hb.bottom, ab.bottom) - Math.max(hb.top, ab.top));
      return { headerBottom: Math.round(hb.bottom), asideTop: Math.round(ab.top), overlap: Math.round(overlap) };
    });
    console.log(
      `\n[${label}] header 高=${r.headerH}px (position=${r.headerPos}) | aside position=${r.asidePos} top=${r.asideTop} maxH=${r.asideMaxH}`,
    );
    console.log(
      `  滚动 400px 后: header.bottom=${r2.headerBottom} aside.top=${r2.asideTop} -> 重叠 ${r2.overlap}px` +
        (r2.overlap > 0 ? '  !! FilterBar 顶部被 header 盖住' : '  (无重叠)'),
    );
  }
});

test('S2 暗色模式 html/body 背景', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  for (const p of ['/', '/emergency/心脏骤停']) {
    await page.goto(BASE + p, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const r: any = await page.evaluate(() => {
      const g = (el: Element) => getComputedStyle(el);
      return {
        htmlBg: g(document.documentElement).backgroundColor,
        htmlColor: g(document.documentElement).color,
        bodyBg: g(document.body).backgroundColor,
        bodyColor: g(document.body).color,
        bodyBgImg: g(document.body).backgroundImage.slice(0, 30),
        htmlClass: document.documentElement.className,
      };
    });
    console.log(`\n[暗色 ${p}] html.bg=${r.htmlBg} color=${r.htmlColor} | body.bg=${r.bodyBg} color=${r.bodyColor}`);
    console.log(`   html.class="${r.htmlClass}" | body.background-image=${r.bodyBgImg}`);
  }
  await ctx.close();
});

test('S3 focus 可见性 (Tab 遍历)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const [path, label] of [
    ['/', '首页'],
    ['/explore', '检索'],
    ['/poster', '海报'],
    ['/matrix', '矩阵'],
  ] as Array<[string, string]>) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    let noOutline = 0;
    const samples: string[] = [];
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      const r: any = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const outlineW = parseFloat(cs.outlineWidth) || 0;
        const hasOutline = cs.outlineStyle !== 'none' && outlineW > 0;
        const shadow = cs.boxShadow;
        const ring = shadow && shadow !== 'none';
        const cls = (el.getAttribute('class') || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.');
        return {
          tag: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : ''),
          hasOutline, outlineW, outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor,
          ring,
          text: (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 18),
        };
      });
      if (!r) break;
      if (!r.hasOutline && !r.ring) {
        noOutline++;
        if (samples.length < 6) samples.push(`${r.tag} "${r.text}" (outline=${r.outlineStyle} ${r.outlineW}px, boxShadow none)`);
      }
    }
    console.log(`\n[focus ${label} ${path}] 前 25 个 Tab 落点中, 无可见焦点样式 ${noOutline} 个`);
    for (const s of samples) console.log(`   !! ${s}`);
  }
});

test('S4 移动端菜单焦点管理', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => document.activeElement?.tagName);
  await page.click('button[aria-label="打开菜单"]');
  await page.waitForTimeout(300);
  const afterOpen = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const menu = document.querySelector('nav[aria-label="移动端导航"]');
    return {
      active: el?.tagName + '.' + (el?.getAttribute('class') || '').split(/\s+/).slice(0, 2).join('.'),
      focusInsideMenu: !!(menu && el && menu.contains(el)),
      menuLinksFocusable: menu ? menu.querySelectorAll('a').length : 0,
      btnAriaControls: document.querySelector('button[aria-label="关闭菜单"]')?.getAttribute('aria-controls'),
    };
  });
  console.log(`\n[移动菜单] 打开前 active=${before}`);
  console.log(`  打开后 active=${afterOpen.active} | 焦点进入菜单内=${afterOpen.focusInsideMenu} | 菜单内链接=${afterOpen.menuLinksFocusable}`);
  console.log(`  菜单按钮 aria-controls=${afterOpen.btnAriaControls ?? 'null(未设置)'}`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const afterEsc = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    return { active: el?.tagName, menuExists: !!document.querySelector('nav[aria-label="移动端导航"]') };
  });
  console.log(`  Esc 后 active=${afterEsc.active} 菜单仍在=${afterEsc.menuExists} (焦点未还给菜单按钮)`);
});

test('S5 检索空结果', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + '/explore', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.fill('#filter-search', 'zzzzqqqq不存在的东西');
  await page.waitForTimeout(600);
  const r: any = await page.evaluate(() => ({
    text: (document.querySelector('main')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
    count: document.querySelectorAll('article').length,
  }));
  console.log(`\n[检索空结果] article 数=${r.count}`);
  console.log(`  可见文案: ${r.text}`);
});

test('S6 急方不存在场景 / 404', async ({ page }) => {
  for (const p of ['/emergency/不存在场景xyz', '/nonexistent-page-xyz']) {
    const resp = await page.goto(BASE + p, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const r: any = await page.evaluate(() => ({
      title: document.title,
      h1: [...document.querySelectorAll('h1')].map((h) => h.textContent?.trim()),
      text: (document.querySelector('main')?.textContent || document.body.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 140),
      header: !!document.querySelector('header nav'),
      footer: !!document.querySelector('footer'),
    }));
    console.log(`\n[${p}] HTTP=${resp?.status()} title="${r.title}" h1=${JSON.stringify(r.h1)}`);
    console.log(`  正文: ${r.text}`);
    console.log(`  站内导航 header=${r.header} footer=${r.footer}`);
  }
});

test('S7 矩阵 0 格点击', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + '/matrix', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  // 找一个 count=0 的格子
  const zero = page.locator('table button').filter({ hasText: /^0条$/ }).first();
  const n = await zero.count();
  if (n === 0) {
    console.log('\n[矩阵 0 格] 页面上没有 count=0 的格子, 无法验证');
    return;
  }
  const label = await zero.getAttribute('title');
  await zero.click();
  await page.waitForTimeout(400);
  const r: any = await page.evaluate(() => {
    const secs = [...document.querySelectorAll('main section')].map((s) =>
      (s.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
    );
    return { secs, pressed: document.querySelector('table button[aria-pressed="true"]')?.getAttribute('title') };
  });
  console.log(`\n[矩阵 0 格] 点击 title="${label}"`);
  console.log(`  点击后 aria-pressed=true 的格子: "${r.pressed}"`);
  console.log(`  页面 section 文案: ${JSON.stringify(r.secs)}`);
  console.log(`  -> 点 0 格后是否出现"该格无条目"提示: ${r.secs.some((s: string) => s.includes('无') || s.includes('0 条') || s.includes('没有')) ? '有' : '无 (列表区直接消失, 无任何反馈)'}`);
});

test('S8 问答: 加载/结果/aria-live/标题层级', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + '/ask', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.fill('#q-input', '心脏骤停怎么办');
  const t0 = Date.now();
  await page.click('button:has-text("问 卷")');
  // 立刻抓 loading 态
  await page.waitForTimeout(120);
  const loading: any = await page.evaluate(() => ({
    btnText: [...document.querySelectorAll('button')].map((b) => b.textContent?.trim()).find((t) => t?.includes('检索中')),
    btnDisabled: [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('检索中'))?.hasAttribute('disabled'),
    textareaDisabled: document.querySelector('#q-input')?.hasAttribute('disabled'),
    liveRegions: document.querySelectorAll('[aria-live],[role="status"],[role="alert"]').length,
    loadingText: (document.querySelector('main')?.textContent || '').includes('正在翻阅'),
  }));
  console.log(`\n[问答 loading@${Date.now() - t0}ms] 按钮="${loading.btnText}" disabled=${loading.btnDisabled} textarea disabled=${loading.textareaDisabled}`);
  console.log(`  "正在翻阅"文案出现=${loading.loadingText} | 页面上 aria-live/status/alert 区域数=${loading.liveRegions}`);
  await page.waitForSelector('button:has-text("问 卷")', { timeout: 30000 });
  await page.waitForTimeout(1500);
  const done: any = await page.evaluate(() => {
    const hs = [...document.querySelectorAll('h1,h2,h3,h4')].filter((h) => h.getClientRects().length).map((h) => h.tagName.toLowerCase() + ':' + (h.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 22));
    return {
      headings: hs,
      live: [...document.querySelectorAll('[aria-live],[role="status"],[role="alert"]')].map((e) => e.getAttribute('aria-live') + '/' + e.getAttribute('role') + ' "' + (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30) + '"'),
      answerSnippet: (document.querySelector('main')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 150),
      citations: document.querySelectorAll('main section ul li a[href^="/book/"]').length,
    };
  });
  console.log(`  结果后标题序列: ${done.headings.join(' | ')}`);
  console.log(`  结果后 aria-live 区域: ${JSON.stringify(done.live)}`);
  console.log(`  引用条目数=${done.citations}`);
  console.log(`  答案片段: ${done.answerSnippet}`);
});

test('S9 海报: 空选 / 标题截断 / 生成反馈', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + '/poster', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  // 取消全部选中
  const selected = page.locator('.max-h-64 button.bg-seal');
  let n = await selected.count();
  for (let i = 0; i < n; i++) {
    await page.locator('.max-h-64 button.bg-seal').first().click();
    await page.waitForTimeout(60);
  }
  const state: any = await page.evaluate(() => {
    const gen = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('生成预览'));
    const dl = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('下载'));
    const hint = (document.querySelector('main')?.textContent || '').replace(/\s+/g, ' ');
    return {
      genDisabled: gen?.hasAttribute('disabled'),
      genTitle: gen?.getAttribute('title'),
      genAria: gen?.getAttribute('aria-describedby'),
      dlDisabled: dl?.hasAttribute('disabled'),
      hasWhyDisabled: /至少|请选|不能为空|需要选/.test(hint),
      countText: (hint.match(/已选 \d+\/9/) || ['(未找到)'])[0],
    };
  });
  console.log(`\n[海报 空选] 生成预览 disabled=${state.genDisabled} title=${state.genTitle} aria-describedby=${state.genAria}`);
  console.log(`  下载 disabled=${state.dlDisabled} | 页面有"为什么不能点"的说明=${state.hasWhyDisabled} | 计数文案="${state.countText}"`);

  // 标题截断: 有没有 title 属性兜底
  const trunc: any = await page.evaluate(() => {
    const out: any[] = [];
    for (const s of document.querySelectorAll('.max-h-64 span.truncate')) {
      if (s.scrollWidth > s.clientWidth + 1) {
        out.push({ text: (s.textContent || '').slice(0, 20), hasTitle: s.hasAttribute('title'), parentTitle: s.parentElement?.hasAttribute('title') });
      }
    }
    return { n: out.length, sample: out.slice(0, 4) };
  });
  console.log(`  被视觉截断的条目标题 ${trunc.n} 个; 其中有 title 兜底的: ${trunc.sample.filter((x: any) => x.hasTitle || x.parentTitle).length}/${trunc.sample.length}`);
  for (const s of trunc.sample) console.log(`     "${s.text}" title=${s.hasTitle} parentTitle=${s.parentTitle}`);

  // 生成预览的反馈
  await page.locator('.max-h-64 button').first().click();
  await page.waitForTimeout(200);
  await page.click('button:has-text("生成预览")');
  const during: any = await page.evaluate(() => ({
    btn: [...document.querySelectorAll('button')].map((b) => b.textContent?.trim()).filter((t) => t?.includes('生成')),
    live: document.querySelectorAll('[aria-live],[role="status"]').length,
    busy: document.querySelectorAll('[aria-busy="true"]').length,
    spinner: !!document.querySelector('[class*="animate-spin"], progress'),
  }));
  console.log(`  点生成后按钮文案=${JSON.stringify(during.btn)} | aria-live=${during.live} aria-busy=${during.busy} spinner=${during.spinner}`);
  await page.waitForTimeout(2500);
  const after: any = await page.evaluate(() => ({
    img: !!document.querySelector('img[alt^="海报预览"]'),
    dlDisabled: [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('下载'))?.hasAttribute('disabled'),
  }));
  console.log(`  生成完成: 预览图出现=${after.img} 下载按钮 enabled=${!after.dlDisabled}`);
});

test('S10 我的清单空态 / 键盘 tablist', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + '/my', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const r: any = await page.evaluate(() => ({
    text: (document.querySelector('main')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 130),
    tabs: [...document.querySelectorAll('[role="tab"]')].map((t) => ({
      label: t.textContent?.trim(),
      selected: t.getAttribute('aria-selected'),
      tabindex: t.getAttribute('tabindex'),
      controls: t.getAttribute('aria-controls'),
    })),
    panels: document.querySelectorAll('[role="tabpanel"]').length,
    live: document.querySelectorAll('[aria-live],[aria-busy]').length,
  }));
  console.log(`\n[我的清单 空态] 文案: ${r.text}`);
  console.log(`  role=tab 数=${r.tabs.length} role=tabpanel 数=${r.panels} aria-live/aria-busy 数=${r.live}`);
  for (const t of r.tabs) console.log(`     tab "${t.label}" selected=${t.selected} tabindex=${t.tabindex} aria-controls=${t.controls}`);
  // 方向键切换
  await page.focus('[role="tab"]');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  const afterArrow = await page.evaluate(() => document.activeElement?.textContent?.trim());
  console.log(`  Tab 聚焦后用 ArrowRight: activeElement="${afterArrow}" (WAI-ARIA tablist 要求方向键切换)`);
});

test('S11 prefers-reduced-motion', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const r: any = await page.evaluate(() => {
    const probe = document.querySelector('.seal-item') || document.querySelector('a');
    const cs = probe ? getComputedStyle(probe) : null;
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('自动展卷'));
    return {
      transitionDuration: cs?.transitionDuration,
      animationDuration: cs?.animationDuration,
      autoBtnDisabled: btn?.hasAttribute('disabled'),
      autoBtnTitle: btn?.getAttribute('title'),
    };
  });
  console.log(`\n[reduced-motion] 抽样元素 transition-duration=${r.transitionDuration} animation-duration=${r.animationDuration}`);
  console.log(`  自动展卷按钮 disabled=${r.autoBtnDisabled} title="${r.autoBtnTitle}"`);
  await ctx.close();
});
