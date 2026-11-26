#!/usr/bin/env node
/**
 * 校验 .github/workflows/*.yml 能被真正解析
 *
 * 为什么需要这个:
 *   GitHub 对**语法错误的工作流文件**的处理是: 不报错、不排队、不显示 failed,
 *   只是**根本不运行**。从外部看就是"推送成功了但什么都没发生"。
 *
 *   实测踩过两次:
 *     1. `- name: 自检: 构建产物是否用了最新数据` —— name 值里有中文冒号,
 *        YAML 把它当成嵌套映射, 整个文件解析失败 → 部署静默跳过 25 分钟,
 *        期间推了 16 次都没人发现（因为 CI/同步都是独立工作流, 看起来一切正常）
 *     2. workflow_call 的 inputs 与 push 事件的 inputs 上下文混用
 *
 * 用法: node scripts/check-workflows.mjs
 * 退出码: 0 = 全部可解析; 1 = 有文件解析失败
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), '.github', 'workflows');

// yaml 是传递依赖 (通过 pnpm store 可取); 取不到就跳过并告警
let YAML;
try {
  YAML = await import('yaml');
} catch {
  console.warn('[workflows] 未找到 yaml 依赖, 跳过校验 (pnpm install 后可用)');
  process.exit(0);
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
let failed = 0;

for (const f of files) {
  const path = join(DIR, f);
  try {
    const doc = YAML.parse(readFileSync(path, 'utf8'));
    const triggers = doc.on ? Object.keys(doc.on) : [];
    const jobs = doc.jobs ? Object.keys(doc.jobs) : [];
    console.log(`[ok]   ${f.padEnd(22)} on: ${triggers.join(', ') || '(无)'}  jobs: ${jobs.join(', ')}`);
  } catch (e) {
    failed++;
    console.error(`[FAIL] ${f}`);
    console.error(`       ${e.message.split('\n')[0]}`);
    if (e.linePos) {
      console.error(`       位置: 第 ${e.linePos[0].line} 行 (GitHub 会因此完全不运行这个工作流)`);
    }
  }
}

if (failed > 0) {
  console.error(`\n[workflows] ${failed} 个工作流解析失败 —— GitHub 不会运行它们`);
  process.exit(1);
}
console.log(`\n[workflows] ${files.length} 个工作流全部可解析`);