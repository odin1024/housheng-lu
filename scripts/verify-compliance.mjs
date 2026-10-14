#!/usr/bin/env node
/**
 * 合规检查脚本
 * 检查 footer 是否含署名、LICENSE 是否存在等
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function log(msg) { console.log(`\x1b[36m[合规]\x1b[0m ${msg}`); }
function ok(msg) { console.log(`\x1b[32m[通过]\x1b[0m ${msg}`); }
function fail(msg) { console.log(`\x1b[31m[失败]\x1b[0m ${msg}`); }

let passCount = 0;
let failCount = 0;

function check(name, fn) {
  try {
    if (fn()) {
      ok(name);
      passCount++;
    } else {
      fail(name);
      failCount++;
    }
  } catch (e) {
    fail(`${name}: ${e.message}`);
    failCount++;
  }
}

// 1. LICENSE 存在
check('LICENSE 文件存在', () => existsSync(join(ROOT, 'LICENSE')));

// 2. LICENSE-CODE 存在
check('LICENSE-CODE 文件存在', () => existsSync(join(ROOT, 'LICENSE-CODE')));

// 3. README 含合规声明
check('README 含合规声明', () => {
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf-8');
  return readme.includes('CC BY 4.0') && readme.includes('eternity4719');
});

// 4. sync-log.json 存在
check('data/sync-log.json 存在', () => existsSync(join(ROOT, 'data', 'sync-log.json')));

// 5. entries.json 存在
check('data/entries.json 存在', () => existsSync(join(ROOT, 'data', 'entries.json')));

// 6. Logo 文件存在
check('Logo SVG 存在', () => {
  return existsSync(join(ROOT, 'public', 'logo', 'seal-square.svg'))
    && existsSync(join(ROOT, 'public', 'logo', 'book-cover.svg'))
    && existsSync(join(ROOT, 'public', 'logo', 'seal-end.svg'));
});

// 7. Footer 组件含署名(检查源代码或引用模块)
check('Footer 组件含署名', () => {
  const footerPath = join(ROOT, 'src', 'components', 'Footer', 'Footer.tsx');
  if (!existsSync(footerPath)) return false;
  const footer = readFileSync(footerPath, 'utf-8');
  // 检查是否引用了 attribution 模块(它包含了所有合规信息)
  const attributionPath = join(ROOT, 'src', 'lib', 'compliance.ts');
  const attribution = existsSync(attributionPath) ? readFileSync(attributionPath, 'utf-8') : '';
  return footer.includes('attribution') && attribution.includes('eternity4719');
});

console.log('');
console.log(`\x1b[1m检查完成: ${passCount} 通过, ${failCount} 失败\x1b[0m`);

if (failCount > 0) {
  process.exit(1);
}
