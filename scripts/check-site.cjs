/* Read-only checks for this static site. No build or third-party service required. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const files = [];
function collect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(file);
    else if (/\.(?:html|js)$/.test(file)) files.push(file);
  }
}
for (const entry of fs.readdirSync(root)) if (/\.html$/.test(entry)) files.push(path.join(root, entry));
collect(path.join(root, 'assets'));
collect(path.join(root, 'pages'));
let scripts = 0, pages = 0;
const failures = [];
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  try {
    if (file.endsWith('.js')) { new vm.Script(source, { filename: file }); scripts++; continue; }
    pages++;
    for (const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
      if (/\bsrc\s*=|application\/(?:ld\+)?json/i.test(match[1]) || !match[2].trim()) continue;
      new vm.Script(match[2], { filename: file + ':inline' }); scripts++;
    }
    for (const match of source.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
      const ref = match[1];
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref) || /[${}<>]/.test(ref)) continue;
      const clean = ref.split(/[?#]/)[0];
      if (!clean) continue;
      const target = clean.startsWith('/') ? path.join(root, clean) : path.resolve(path.dirname(file), clean);
      if (!fs.existsSync(target)) failures.push(path.relative(root, file) + ': missing ' + clean);
    }
  } catch (error) { failures.push(error.message); }
}
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`PASS: ${pages} HTML pages, ${scripts} JavaScript files/inline blocks, and local HTML resource links.`);
