const fs = require('fs');
const dir = '.next/static/chunks/';
function rd(p) { return fs.readFileSync(dir + p, 'utf8'); }

const probes = ['01-01', '安全带', '厚生錄', '每节取前', 'seal-end'];
const files = [
  'app/page-8044ae67a8d72e99.js',
  'app/layout-047d5e52b6686b30.js',
  '906-b8aaed4840ae749c.js',
  '634-682076517e44479b.js',
  '6fbc38ef-88e47b2e128ce7a8.js',
  'webpack-a8ec645a4e87f1ae.js',
  'main-app-8188c38450df4b6d.js',
  'polyfills-42372ed130431b0a.js',
  '202-15168a2dbc648f9e.js',
  'app/explore/page-8723447864ace575.js',
  'app/ask/page-5cb2654e9f5b2734.js',
  'app/my/page-c7c9300ab7368d3a.js',
  'app/matrix/page-e9a8006dc0bfa88c.js',
  'app/poster/page-d97e646dc0790cb9.js',
  'app/book/[id]/page-0ddf08f7e5f32a18.js',
];
for (const f of files) {
  let c;
  try { c = rd(f); } catch (e) { console.log('MISSING', f); continue; }
  const hits = probes.filter((p) => c.includes(p));
  console.log(f.padEnd(46), (c.length / 1024).toFixed(1).padStart(8) + 'KB', 'hits=' + JSON.stringify(hits));
}

// 202 chunk: 提取内嵌 JSON payload 体量
const c = rd('202-15168a2dbc648f9e.js');
const idx = c.indexOf("JSON.parse('");
console.log('\n202 chunk: JSON.parse at index', idx, 'total', (c.length / 1024).toFixed(1) + 'KB');
if (idx >= 0) {
  // 找到匹配的结束 "'" —— payload 内部无未转义单引号
  const start = idx + "JSON.parse('".length;
  const end = c.indexOf("')", start);
  const payload = c.slice(start, end);
  console.log('  embedded payload bytes =', Buffer.byteLength(payload, 'utf8'), '=', (Buffer.byteLength(payload, 'utf8') / 1024).toFixed(1) + 'KB');
  console.log('  payload / chunk ratio =', ((Buffer.byteLength(payload, 'utf8') / c.length) * 100).toFixed(1) + '%');
  const tail = c.slice(end);
  console.log('  rest after payload =', (Buffer.byteLength(tail, 'utf8') / 1024).toFixed(1) + 'KB');
  // 数一下 id 出现次数
  const ids = payload.match(/"id":"\d\d-\d\d"/g) || [];
  console.log('  entries with "id":"NN-NN" =', ids.length);
}
