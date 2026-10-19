const fs = require('fs');
const s = fs.readFileSync(process.argv[2], 'utf8');
let depth = 0, inStr = null, inLC = false, inBC = false;
for (let i = 0; i < s.length; i++) {
  const c = s[i], n = s[i + 1];
  if (inLC) { if (c === '\n') inLC = false; continue; }
  if (inBC) { if (c === '*' && n === '/') { inBC = false; i++; } continue; }
  if (inStr) { if (c === '\\\\') { i++; continue; } if (c === inStr) inStr = null; continue; }
  if (c === '/' && n === '/') { inLC = true; i++; continue; }
  if (c === '/' && n === '*') { inBC = true; i++; continue; }
  if (c === "'" || c === '"' || c === '`') { inStr = c; continue; }
  if ('{[('.includes(c)) depth++;
  if ('}])'.includes(c)) { depth--; if (depth < 0) { console.log('NEGATIVE at char', i, 'line', s.slice(0, i).split('\n').length, 'char', c); process.exit(1); } }
}
console.log('final depth:', depth);
