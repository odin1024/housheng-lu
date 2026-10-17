const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'tests', 'audit-perf-out');
for (const f of fs.readdirSync(dir)) {
  if (!f.startsWith('timing-')) continue;
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  console.log('\n===== ' + f + ' =====');
  console.log('loadEventEnd(ms):', Math.round(j.timing.loadEvent), ' domInteractive:', Math.round(j.timing.domInteractive), ' FCP:', j.paint.map(p=>p.name+'='+p.startTime).join(', '));
  console.log('LCP:', JSON.stringify(j.audit.lcp && {startTime: Math.round(j.audit.lcp.startTime), size: j.audit.lcp.size, element: (j.audit.lcp.element||'').slice(0,60)}));
  console.log('CLS:', j.audit.cls, ' longtasks:', JSON.stringify(j.audit.longtasks));
  console.log('resource totals: count=' + j.resourceTotals.count + ' transfer=' + j.resourceTotals.transfer + ' (' + Math.round(j.resourceTotals.transfer/1024) + ' KB) decoded=' + j.resourceTotals.decoded);
  console.log('byType:', JSON.stringify(j.byType));
}
const sw = path.join(dir, 'sw-cache-names.json');
if (fs.existsSync(sw)) {
  console.log('\n===== sw-cache-names.json =====');
  console.log(JSON.stringify(JSON.parse(fs.readFileSync(sw, 'utf8')), null, 1));
}
const off = path.join(dir, 'offline-results.json');
if (fs.existsSync(off)) {
  console.log('\n===== offline-results.json =====');
  console.log(JSON.stringify(JSON.parse(fs.readFileSync(off, 'utf8')), null, 1).slice(0, 3000));
}
