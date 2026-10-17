// 深度核对: 看每个章节实际内容是不是真的适合该阶段
import { test } from '@playwright/test';
import { allEntries, allSections } from '../src/lib/entries';
import fs from 'node:fs';

test('深度核对原书章节', () => {
  const out: string[] = [];
  for (const sec of allSections) {
    const entries = allEntries.filter(e => e.section === sec.id);
    out.push(`\n=== 第 ${sec.id} 章 "${sec.title}" (${entries.length} 条) ===`);
    for (const e of entries.slice(0, 5)) {
      out.push(`  ${e.id} ${e.title}`);
    }
    if (entries.length > 5) out.push(`  ... (共 ${entries.length} 条)`);
  }
  fs.writeFileSync('tests/sections-audit.txt', out.join('\n'));
  console.log('Written to tests/sections-audit.txt');
});
