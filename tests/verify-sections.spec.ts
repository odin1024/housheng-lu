// 核对每个阶段章节 - 用 entry ID 而非乱码标题
import { test } from '@playwright/test';
import { LIFE_STAGES } from '../src/lib/life-stages';
import { allEntries, allSections } from '../src/lib/entries';

test('详细核对每个阶段的章节是否真的匹配', () => {
  for (const [stageName, stage] of Object.entries(LIFE_STAGES)) {
    console.log(`\n========= ${stageName} =========`);
    for (const secId of stage.sections) {
      const sec = allSections.find(s => s.id === secId);
      const entries = allEntries.filter(e => e.section === secId);
      console.log(`\n第 ${secId} 章 "${sec?.title}" (${entries.length} 条):`);
      // 列前 3 条 ID
      for (const e of entries.slice(0, 3)) {
        console.log(`  ${e.id} | ${e.title}`);
      }
    }
  }
});
