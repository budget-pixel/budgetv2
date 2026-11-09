// Writes a minified copy of every site script and stylesheet in assets/
// next to its source: assets/nav.js -> assets/nav.min.js, style.css ->
// style.min.css. Pages load the .min files; edit the readable sources only.
//
// Versioned references between assets inside the minified output
// ("search-data.js?v=...") are pointed at the minified sibling
// ("search-data.min.js?v=..."); bump-asset-versions.mjs then sets their
// hashes. Normally run through bump-asset-versions.mjs, not on its own.
import fs from 'node:fs';
import path from 'node:path';
import { transformSync } from 'esbuild';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const assetsDir = path.join(root, 'assets');

export function sourceAssets() {
  return fs.readdirSync(assetsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(js|css)$/.test(entry.name) && !/\.min\.(js|css)$/.test(entry.name))
    .map((entry) => entry.name);
}

export const minName = (name) => name.replace(/\.(js|css)$/, '.min.$1');

// Returns the number of .min files that were (or, with check, would be)
// rewritten. A rewritten file keeps the ?v= values it already had, so the
// version pass that follows only has to fix references that really changed.
export function minifyAssets({ check = false } = {}) {
  const sources = sourceAssets();
  const known = new Set(sources);
  let changed = 0;
  for (const name of sources) {
    const code = fs.readFileSync(path.join(assetsDir, name), 'utf8');
    let out = transformSync(code, {
      loader: name.endsWith('.css') ? 'css' : 'js',
      minify: true,
      legalComments: 'none',
      charset: 'utf8',
      logLevel: 'error'
    }).code;
    out = out.replace(/([A-Za-z0-9_-]+\.(?:js|css))\?v=/g, (match, ref) => (known.has(ref) ? minName(ref) + '?v=' : match));
    const target = path.join(assetsDir, minName(name));
    const previous = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
    // Carry the existing hashes over so an unchanged file stays unchanged.
    if (previous !== null) {
      const oldVersions = new Map(Array.from(previous.matchAll(/([A-Za-z0-9_.-]+\.(?:js|css|json|csv))\?v=([A-Za-z0-9._-]+)/g), (m) => [m[1], m[2]]));
      out = out.replace(/([A-Za-z0-9_.-]+\.(?:js|css|json|csv))\?v=([A-Za-z0-9._-]+)/g, (match, ref) => (oldVersions.has(ref) ? ref + '?v=' + oldVersions.get(ref) : match));
    }
    if (out !== previous) {
      changed += 1;
      if (!check) fs.writeFileSync(target, out);
    }
  }
  // Remove minified copies whose source was deleted.
  for (const entry of fs.readdirSync(assetsDir)) {
    const match = entry.match(/^(.*)\.min\.(js|css)$/);
    if (match && !known.has(match[1] + '.' + match[2])) {
      changed += 1;
      if (!check) fs.unlinkSync(path.join(assetsDir, entry));
    }
  }
  return changed;
}

if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  console.log('Minified ' + minifyAssets() + ' asset(s).');
}
