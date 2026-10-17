#!/usr/bin/env node
/**
 * 解析上游 markdown 为 entries.json
 * 用法: node scripts/parse-entries.mjs
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const UPSTREAM_BOOK_DIR = join(ROOT, 'content', 'upstream', 'book');
const UPSTREAM_DIR = join(ROOT, 'content', 'upstream');
const DATA_DIR = join(ROOT, 'data');

/**
 * 每条 syncDate 的取值 = **上游那次提交的日期**, 不是"今天"
 *
 * 为什么: 原来写 `new Date()`, 于是每次 parse 都会把 765 条的日期全部刷新一遍,
 * 上游明明没变也会产生 765 行 diff —— 每日同步 workflow 因此**每晚空提交一次**
 * (审计列为 P0: 非幂等时间戳)。改成取上游提交日期后, 同一个上游提交永远得到同一天,
 * parse 变成幂等的(重跑逐字节相同)。
 */
function upstreamCommitDate() {
  try {
    const d = execSync('git log -1 --format=%cs', { cwd: UPSTREAM_DIR, encoding: 'utf-8' }).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  } catch {
    /* 没有上游 git 信息时(例如只重解析已有 markdown) 退回今天 */
  }
  return new Date().toISOString().split('T')[0];
}

function log(msg) { console.log(`\x1b[36m[解析]\x1b[0m ${msg}`); }
function ok(msg) { console.log(`\x1b[32m[完成]\x1b[0m ${msg}`); }
function warn(msg) { console.log(`\x1b[33m[警告]\x1b[0m ${msg}`); }

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/**
 * 章节元数据(手工维护,与上游保持一致)
 * 顺序、口径、推荐人群等
 */
const SECTION_META = [
  { num: 1, slug: '01-不要早死', title: '不要早死', caliber: 'life' },
  { num: 2, slug: '02-不要慢慢死', title: '不要慢慢死', caliber: 'life' },
  { num: 3, slug: '03-不要浪费精力', title: '不要浪费精力', caliber: 'time' },
  { num: 4, slug: '04-不要浪费时间', title: '不要浪费时间', caliber: 'time' },
  { num: 5, slug: '05-不要浪费钱', title: '不要浪费钱', caliber: 'money' },
  { num: 6, slug: '06-反面清单', title: '反面清单', caliber: 'money' },
  { num: 7, slug: '07-没钱的时候怎么活', title: '没钱的时候怎么活', caliber: 'money' },
  { num: 8, slug: '08-别把自己搭进去', title: '别把自己搭进去', caliber: 'freedom' },
  { num: 9, slug: '09-普通人容易踩的法律红线', title: '普通人容易踩的法律红线', caliber: 'freedom' },
  { num: 10, slug: '10-恋爱和结婚划不划算', title: '恋爱和结婚划不划算', caliber: 'money' },
  { num: 11, slug: '11-程序员和技术人容易踩的红线', title: '程序员和技术人容易踩的红线', caliber: 'freedom' },
  { num: 12, slug: '12-创业与做生意', title: '创业与做生意', caliber: 'money' },
  { num: 13, slug: '13-紧急情况', title: '紧急情况：先做什么', caliber: 'life' },
  { num: 14, slug: '14-账号与信息安全', title: '账号与信息安全', caliber: 'money' },
  { num: 15, slug: '15-租房与买房', title: '租房与买房', caliber: 'money' },
  { num: 16, slug: '16-得了慢性病之后怎么活', title: '得了慢性病之后怎么活', caliber: 'life' },
  { num: 17, slug: '17-家里有老人', title: '家里有老人', caliber: 'freedom' },
  { num: 18, slug: '18-养孩子划不划算', title: '养孩子划不划算', caliber: 'money' },
  { num: 19, slug: '19-在职离职和工伤', title: '在职、离职和工伤', caliber: 'money' },
  { num: 20, slug: '20-刚出生的孩子怎么带', title: '刚出生的孩子怎么带', caliber: 'life' },
  { num: 21, slug: '21-出国旅行与境外安全', title: '出国、旅行与境外安全', caliber: 'freedom' },
  { num: 22, slug: '22-怎么放松', title: '怎么放松：娱乐场所和减压', caliber: 'time' },
  { num: 23, slug: '23-学什么技能划算', title: '学什么技能划算', caliber: 'money' },
  { num: 24, slug: '24-看病', title: '看病：怎么少花钱少走弯路', caliber: 'money' },
  { num: 25, slug: '25-人走了以后要办什么', title: '人走了以后要办什么', caliber: 'money' },
  { num: 26, slug: '26-做一个网站或平台', title: '做一个网站或平台', caliber: 'freedom' },
  { num: 27, slug: '27-怀孕和生产', title: '怀孕和生产', caliber: 'life' },
  { num: 28, slug: '28-别为了外形把身体搞坏', title: '别为了外形把身体搞坏', caliber: 'life' },
  { num: 29, slug: '29-遭遇重大打击之后', title: '遭遇重大打击之后', caliber: 'life' },
  { num: 30, slug: '30-上学以后的孩子', title: '上学以后的孩子', caliber: 'life' },
  { num: 31, slug: '31-十八岁之后有哪几条路', title: '十八岁之后有哪几条路', caliber: 'money' },
  { num: 32, slug: '32-出国留学', title: '出国留学', caliber: 'freedom' },
  { num: 33, slug: '33-残疾之后怎么活', title: '残疾之后怎么活', caliber: 'life' },
  { num: 34, slug: '34-家里的常备药别吃出事', title: '家里的常备药别吃出事', caliber: 'life' },
];

/**
 * 解析单条建议
 * 格式:
 *   ### 5. 把家里的食盐换成低钠盐（钾盐）
 *   - 成本：...
 *   - 说人话：...
 *   - 收益：...
 *   - 证据等级：A
 *   - 来源：...
 *   - 备注：...
 */
function parseEntry(block, sectionNum, sectionCaliber) {
  // 标准化换行(Windows CRLF → LF)
  const normalized = block.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.trim().split('\n');
  const titleLine = lines[0];

  // 提取编号和标题
  const titleMatch = titleLine.match(/^###\s+(\d+)\.\s+(.+)$/);
  if (!titleMatch) return null;

  const [, numStr, title] = titleMatch;
  const num = parseInt(numStr, 10);
  const id = `${String(sectionNum).padStart(2, '0')}-${String(num).padStart(2, '0')}`;

  const fields = {
    cost: '',
    plainLanguage: '',
    benefit: '',
    evidenceLevel: '',
    source: '',
    remark: '',
  };

  let currentField = null;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // 字段开始
    const fieldMatch = line.match(/^-\s*(成本|说人话|收益|证据等级|来源|备注|争议)\s*[:：]\s*(.*)$/);
    if (fieldMatch) {
      const [, key, value] = fieldMatch;
      const keyMap = {
        '成本': 'cost',
        '说人话': 'plainLanguage',
        '收益': 'benefit',
        '证据等级': 'evidenceLevel',
        '来源': 'source',
        '备注': 'remark',
        '争议': 'controversy',
      };
      currentField = keyMap[key];
      fields[currentField] = value;
    } else if (currentField && line.trim()) {
      // 字段延续(下一行还是同一字段)
      fields[currentField] += '\n' + line.replace(/^-\s*/, '');
    }
  }

  // 解析证据等级
  const evidenceMatch = fields.evidenceLevel.match(/^([ABC])/);
  const evidenceLevel = evidenceMatch ? evidenceMatch[1] : 'C';

  // 提取 DOI/链接
  // 注意: 原正则 `\S+` 会把 markdown 的收尾符号一起吞掉 (实测 760 条里 215 条的
  // sourceUrl 以 '>' 结尾, 占 28%), 这里显式排除 > ) ] 与中英文标点
  const doiMatch = fields.source.match(
    /(https?:\/\/[^\s>)\]}>,;，。；]+|doi\.org\/[^\s>)\]}>,;，。；]+)/,
  );
  const sourceUrl = doiMatch ? doiMatch[0] : null;

  // 简单推断成本口径(基于关键词)
  const costText = fields.cost.toLowerCase();
  const costMoney = costText.includes('几百') || costText.includes('几千') || costText.includes('几百元') ? 'medium'
    : costText.includes('几十元') || costText.includes('几十块') ? 'low'
    : costText.includes('贵') || costText.includes('千') ? 'high'
    : 'free';
  const costTime = costText.includes('每天') ? 'daily'
    : costText.includes('几小时') ? 'hours'
    : 'instant';
  const costWill = costText.includes('毅力') || costText.includes('坚持') ? 'high'
    : costText.includes('一点毅力') ? 'some'
    : 'none';

  return {
    id,
    number: num,
    section: sectionNum,
    title: title.trim(),
    cost: {
      money: costMoney,
      time: costTime,
      will: costWill,
      detail: fields.cost.trim(),
    },
    plainLanguage: fields.plainLanguage.trim(),
    benefit: fields.benefit.trim(),
    evidenceLevel,
    evidenceDetail: '',
    source: fields.source.trim(),
    sourceUrl,
    controversy: fields.controversy?.trim() || '',
    remark: fields.remark?.trim() || '',
    // 派生字段:
    //   caliber 取**章节**口径 (原书章节自带, 不是逐条字段)
    //   ratio / benefitMagnitude 原书没有对应字段, 这里只占位,
    //   真正展示用的值在 src/lib/entries.ts + src/lib/priority.ts 读入时折算
    ratio: 'normal',
    caliber: sectionCaliber || 'life',
    benefitMagnitude: 'medium',
    syncDate: upstreamCommitDate(),
  };
}

/**
 * 读取章节的真实标题 —— 以 markdown 一级标题为准 (`# 12. 创业与做生意：别把家底赔进去`)
 * SECTION_META.title 只是短名(与文件名一致), 不能当正文标题用, 否则会丢掉副标题
 */
function readSectionTitle(filePath) {
  try {
    const t = readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const m = t.match(/^#\s*\d+\.\s*(.+)$/m);
    return m ? m[1].trim() : '';
  } catch {
    return '';
  }
}

/**
 * 解析单个章节文件
 */
function parseSectionFile(filePath, sectionNum, sectionCaliber) {
  if (!existsSync(filePath)) {
    warn(`章节文件不存在: ${filePath}`);
    return [];
  }

  const content = readFileSync(filePath, 'utf-8');

  // 用 ### 切分每条
  // 标准化换行(Windows CRLF → LF)
  const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalizedContent.split(/(?=^###\s+\d+\.\s+)/m);
  const entries = [];

  for (const block of blocks) {
    if (!block.trim().startsWith('###')) continue;
    const entry = parseEntry(block, sectionNum, sectionCaliber);
    if (entry) entries.push(entry);
  }

  return entries;
}

/**
 * 主流程
 */
function main() {
  log('开始解析上游 markdown...');

  if (!existsSync(UPSTREAM_BOOK_DIR)) {
    warn(`上游目录不存在: ${UPSTREAM_BOOK_DIR}`);
    warn('请先运行 pnpm sync');
    process.exit(1);
  }

  ensureDir(DATA_DIR);

  const allEntries = [];
  const sections = [];

  for (const meta of SECTION_META) {
    // 尝试多种文件名变体
    const candidates = [
      join(UPSTREAM_BOOK_DIR, `${meta.slug}.md`),
      join(UPSTREAM_BOOK_DIR, `${meta.num}-${meta.title}.md`),
    ];

    let parsed = [];
    let sectionTitle = meta.title;
    for (const f of candidates) {
      if (existsSync(f)) {
        parsed = parseSectionFile(f, meta.num, meta.caliber);
        // 标题以原文一级标题为准 (含副标题), 读不到才退回短名
        sectionTitle = readSectionTitle(f) || meta.title;
        break;
      }
    }

    if (parsed.length === 0) {
      warn(`章节 ${meta.num} 未解析到条目: ${meta.slug}`);
    } else {
      ok(`第 ${meta.num} 节 · ${meta.title} → ${parsed.length} 条`);
    }

    sections.push({
      id: meta.num,
      number: meta.num,
      title: sectionTitle,
      slug: meta.slug,
      caliber: meta.caliber,
      entryCount: parsed.length,
    });

    allEntries.push(...parsed);
  }

  // 写入 entries.json
  const entriesPath = join(DATA_DIR, 'entries.json');
  writeFileSync(entriesPath, JSON.stringify(allEntries, null, 2), 'utf-8');
  ok(`写入 ${entriesPath} (${allEntries.length} 条)`);

  // 写入 sections.json
  const sectionsPath = join(DATA_DIR, 'sections.json');
  writeFileSync(sectionsPath, JSON.stringify(sections, null, 2), 'utf-8');
  ok(`写入 ${sectionsPath} (${sections.length} 节)`);

  // 统计
  const stats = {
    totalEntries: allEntries.length,
    totalSections: sections.length,
    evidenceA: allEntries.filter((e) => e.evidenceLevel === 'A').length,
    evidenceB: allEntries.filter((e) => e.evidenceLevel === 'B').length,
    evidenceC: allEntries.filter((e) => e.evidenceLevel === 'C').length,
    // 同样用上游提交日期而不是"现在": 原为 new Date() → 每次 parse 都变,
    // 会让每日同步 workflow 天天产生一次无意义的 diff/提交 (与 syncDate 同一问题)
    generateDate: upstreamCommitDate(),
  };

  const statsPath = join(DATA_DIR, 'stats.json');
  writeFileSync(statsPath, JSON.stringify(stats, null, 2), 'utf-8');
  ok(`写入 ${statsPath}`);
  ok(`  A 级: ${stats.evidenceA} 条`);
  ok(`  B 级: ${stats.evidenceB} 条`);
  ok(`  C 级: ${stats.evidenceC} 条`);

  ok('解析完成');
}

main();
