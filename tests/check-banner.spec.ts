// 开源宣传横幅: 出图 + 无障碍核验
import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

test('开源横幅: 可见、可点、对比度与触控达标(桌面/手机)', async ({ page }) => {
  for (const vp of [
    { w: 1280, h: 900, name: 'desktop' },
    { w: 390, h: 844, name: 'mobile' },
  ]) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.goto(BASE + '/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);

    const banner = page.locator('aside[aria-label="开源信息"]');
    await expect(banner).toBeVisible();
    const link = banner.locator('a[href*="github.com/odin1024/housheng-lu"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('rel', /noopener/);

    const info = await page.evaluate(() => {
      const b = document.querySelector('aside[aria-label="开源信息"]') as HTMLElement;
      const a = b.querySelector('a[href*="github.com"]') as HTMLElement;
      const r = a.getBoundingClientRect();
      const cs = getComputedStyle(a);
      const lum = (hex: string) => {
        const c = hex.match(/\d+/g)!.slice(0, 3).map((v) => Number(v) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      };
      const bg = getComputedStyle(document.body).backgroundColor;
      const l1 = lum(cs.color);
      const l2 = lum(bg);
      return {
        linkH: Math.round(r.height),
        linkW: Math.round(r.width),
        color: cs.color,
        contrast: Number(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2)),
        text: (b.textContent || '').replace(/\s+/g, ' ').trim(),
        bannerTop: Math.round(b.getBoundingClientRect().top),
      };
    });
    console.log(`【${vp.name}】`, JSON.stringify(info));

    expect(info.linkH, '链接高度需 ≥24 (WCAG 2.2 AA)').toBeGreaterThanOrEqual(24);
    expect(info.contrast, '链接对比度需 ≥4.5').toBeGreaterThanOrEqual(4.5);
    expect(info.text).toContain('开源');
    expect(info.text).toContain('CC BY 4.0');
    // 横幅必须在首屏顶部(hero 之上)
    expect(info.bannerTop).toBeLessThan(200);

    await page.locator('aside[aria-label="开源信息"]').screenshot({
      path: `tests/screenshots/out-banner-${vp.name}.png`,
    });
    await page.screenshot({ path: `tests/screenshots/out-first-screen-${vp.name}.png` });
  }
});
