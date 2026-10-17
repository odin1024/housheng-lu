// 验证每个 life stage 章节的条目是否真的属于该阶段
import { test } from '@playwright/test';
import { LIFE_STAGES } from '../src/lib/life-stages';
import { allEntries, allSections } from '../src/lib/entries';

test('核对每个阶段的章节归属', () => {
  // 1. 收集所有阶段用到的章节
  const stageSections = new Map<number, string[]>();
  for (const [stageName, stage] of Object.entries(LIFE_STAGES)) {
    for (const sec of stage.sections) {
      if (!stageSections.has(sec)) stageSections.set(sec, []);
      stageSections.get(sec)!.push(stageName);
    }
  }
  console.log('\n=== 阶段-章节映射 ===');
  for (const [stageName, stage] of Object.entries(LIFE_STAGES)) {
    console.log(`${stageName}: ${stage.sections.join(', ')}`);
  }
  console.log('\n=== 每章节实际条目数 ===');
  for (const sec of allSections) {
    const count = allEntries.filter(e => e.section === sec.id).length;
    const inStages = stageSections.get(sec.id) || [];
    console.log(`第 ${sec.id} 章 "${sec.title}": ${count} 条, 阶段: ${inStages.join('/') || '(未映射)'}`);
  }
  console.log('\n=== 阶段汇总 ===');
  for (const [stageName, stage] of Object.entries(LIFE_STAGES)) {
    const total = stage.sections.reduce((sum, secId) => {
      return sum + allEntries.filter(e => e.section === secId).length;
    }, 0);
    console.log(`${stageName}: 共 ${total} 条 (${stage.sections.join('+')})`);
  }

  // 2. 抽样检查：每阶段抽 3-5 条，看标题是否匹配
  console.log('\n=== 抽样核对 (每阶段前 5 条标题) ===');
  for (const [stageName, stage] of Object.entries(LIFE_STAGES)) {
    console.log(`\n--- ${stageName} (${stage.description}) ---`);
    const stageEntries = allEntries.filter(e => stage.sections.includes(e.section));
    for (const e of stageEntries.slice(0, 8)) {
      console.log(`  ${e.id} [第${e.section}章] ${e.title}`);
    }
    if (stageEntries.length > 8) console.log(`  ... (共 ${stageEntries.length} 条)`);
  }
});
