const fs = require('fs');
const path = require('path');
const root = '.next';
const man = JSON.parse(fs.readFileSync(path.join(root, 'app-build-manifest.json'), 'utf8'));
const buildManifest = JSON.parse(fs.readFileSync(path.join(root, 'build-manifest.json'), 'utf8'));
const rootMain = buildManifest.rootMainFiles;
const poly = buildManifest.polyfillFiles;

function size(p) {
  const f = path.join(root, p);
  // app-build-manifest paths are like "static/chunks/x.js"; .next root prefix is the same
  const real = path.join('.next', p);
  try { return fs.statSync(real).size; } catch { return null; }
}

const rows = [];
for (const [route, files] of Object.entries(man.pages)) {
  const all = [...new Set([...rootMain, ...poly, ...files])];
  let total = 0;
  const detail = [];
  for (const f of all) {
    const s = size(f);
    if (s === null) { detail.push([f, 'MISSING']); continue; }
    total += s;
    detail.push([f, s]);
  }
  rows.push({ route, total, detail });
}
rows.sort((a, b) => b.total - a.total);
console.log('route'.padEnd(34), 'FirstLoadJS');
for (const r of rows) {
  console.log(r.route.padEnd(34), (r.total / 1024).toFixed(1).padStart(8) + ' KB');
  for (const [f, s] of r.detail) console.log('      ', (s === 'MISSING' ? 'MISSING ' : ((s / 1024).toFixed(1) + ' KB').padStart(9)), f);
}
console.log('\nrootMainFiles:', rootMain);
console.log('polyfills:', poly);
// 共享基线
let shared = 0;
for (const f of [...rootMain, ...poly]) { const s = size(f); if (s) shared += s; }
console.log('shared baseline (rootMain+polyfills) =', (shared / 1024).toFixed(1), 'KB');
