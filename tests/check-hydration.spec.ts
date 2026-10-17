// 全站 hydration / 控制台错误回归
//
// 原来只 console.log 不断言（审计里 70% 的 spec 都是这样，等于没有守卫）。
// hydration 不匹配在本项目是**真实发生过的 bug 类别**（<Link> 里嵌 <title>、圆圈图标等），
// 所以这里必须断言，而不是打印完就算了。
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

const ROUTES = ['/', '/explore', '/book/12-08', '/about', '/ask', '/emergency', '/matrix', '/poster', '/my'];

test('全站无 hydration 报错与控制台错误', async ({ page }) => {
  test.setTimeout(180_000);

  /** 逐路由收集错误: 单独访问才能把错误定位到具体页面 */
  const failures: string[] = [];

  for (const path of ROUTES) {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message));
    const onConsole = (msg: import('@playwright/test').ConsoleMessage) => {
      if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text());
    };
    page.on('console', onConsole);

    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    page.off('console', onConsole);

    // 过滤掉与页面无关的噪声（例如被中断的预取请求）
    const real = errors.filter(
      (e) => !/favicon|ERR_ABORTED|Download the React DevTools|net::ERR_/.test(e),
    );
    if (real.length) {
      real.forEach((e) => console.log(`   [${path}] ${e.slice(0, 180)}`));
      failures.push(`${path}: ${real.length} 条`);
    }
  }

  console.log(`检查 ${ROUTES.length} 个路由, 有问题的: ${failures.join(' | ') || '(无)'}`);
  // hydration 不匹配会以 "Hydration failed" / "did not match" / "Text content does not match" 出现
  const hydration = failures.filter((f) => /hydrat|did not match|Text content/i.test(f));
  expect(hydration, `hydration 报错: ${hydration.join(', ')}`).toEqual([]);
  expect(failures, `以下路由有控制台错误: ${failures.join(', ')}`).toEqual([]);
});
