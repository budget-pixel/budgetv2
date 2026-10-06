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
// Only CIP may use an external spreadsheet connection. Publication and import downloads stay local.
const cipFile = path.join(root, 'assets/cip-projects-data.js');
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  if (/https?:\/\/(?:api\.census\.gov|data\.census\.gov\/vizwidget)/i.test(source)) {
    failures.push(path.relative(root, file) + ': live Census data connection in frozen publication');
  }
  const sheetUrls = [...source.matchAll(/https?:\/\/(?:docs|sheets)\.google\.com\/spreadsheets[^\s"'<>]*/g)];
  for (const match of sheetUrls) {
    if (file !== cipFile || new URL(match[0]).searchParams.get('gid') !== '1388930304') {
      failures.push(path.relative(root, file) + ': External spreadsheet connection outside CIP');
    }
  }
}
for (const localFile of ['assets/static-data/budget.json', 'assets/static-data/budget-import-fy2027.csv']) {
  if (!fs.existsSync(path.join(root, localFile))) failures.push('Missing static publication file: ' + localFile);
}
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
const searchData = fs.readFileSync(path.join(root, 'assets/search-data.js'), 'utf8');
let searchIndexes = 0;
for (const file of files.filter((item) => item.endsWith('.html'))) {
  const source = fs.readFileSync(file, 'utf8');
  const pageIndex = source.match(/window\.wcBudgetPages = \[[\s\S]*?\];/);
  if (!pageIndex) continue;
  const pagePath = '/' + path.relative(root, file).replaceAll(path.sep, '/');
  const context = { window: { location: { pathname: pagePath } } };
  try {
    vm.createContext(context);
    vm.runInContext(pageIndex[0], context, { filename: file + ':page-index' });
    vm.runInContext(searchData, context, { filename: 'assets/search-data.js' });
    searchIndexes++;
    for (const page of context.window.wcBudgetPages) {
      if (!page.href) continue;
      const url = new URL(page.href, 'https://budget-pixel.github.io/budget-fy2027' + pagePath);
      if (url.hostname !== 'budget-pixel.github.io') continue;
      if (!url.pathname.startsWith('/budget-fy2027/')) {
        failures.push(path.relative(root, file) + ': search result escapes site: ' + page.title);
        continue;
      }
      const target = path.join(root, url.pathname.slice('/budget-fy2027/'.length));
      if (!fs.existsSync(target)) failures.push(path.relative(root, file) + ': missing search result: ' + page.title);
    }
  } catch (error) { failures.push(path.relative(root, file) + ': search index: ' + error.message); }
}
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`PASS: ${pages} HTML pages, ${scripts} JavaScript files/inline blocks, local HTML resource links, and ${searchIndexes} page search indexes.`);
