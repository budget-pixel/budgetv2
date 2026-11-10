#!/usr/bin/env node
// Rewrites every "?v=..." cache-busting string for the site's own assets to
// a short hash of that asset's current contents, across all HTML pages and
// the scripts that reference other assets (e.g. nav.js -> search-data.js,
// budget-data.js -> static-data/budget.json).
//
// It also rebuilds the minified copies the pages load (assets/*.min.js and
// *.min.css, see minify-assets.mjs): sources are versioned first, then
// minified, then the minified copies are versioned.
//
// Run after changing any file in assets/:
//   node scripts/bump-asset-versions.mjs          (rewrite)
//   node scripts/bump-asset-versions.mjs --check  (exit 1 if anything is stale)
//
// An unchanged asset keeps the same version, so browsers only re-download
// files that actually changed.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { minifyAssets } from './minify-assets.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const check = process.argv.includes('--check');

function listFiles(dir, test) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true })
    .filter((entry) => entry.isFile() && test(entry.name))
    .map((entry) => path.join(dir, entry.name));
}

const listAssets = () => [
  ...listFiles('assets', (name) => /\.(js|css)$/.test(name)),
  ...listFiles('assets/static-data', (name) => /\.(json|csv)$/.test(name))
];
function computeVersions() { return new Map(listAssets().map((file) => {
  const hash = crypto.createHash('sha1').update(fs.readFileSync(path.join(root, file))).digest('hex').slice(0, 10);
  return [path.basename(file), hash];
})); }

const listTargets = () => [
  ...listFiles('.', (name) => name.endsWith('.html')),
  ...listFiles('pages', (name) => name.endsWith('.html')),
  ...listFiles('assets', (name) => name.endsWith('.js'))
];

const escapeRe = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Assets that reference other assets change when those references are
// rewritten, so repeat until every version string is stable.
let changedFiles = 0;
let changedRefs = 0;
function runPasses() {
const targets = listTargets();
for (let pass = 0; pass < 6; pass += 1) {
const versions = computeVersions();
const pattern = new RegExp('(^|[/"\'\\s])(' + Array.from(versions.keys()).map(escapeRe).join('|') + ')\\?v=[A-Za-z0-9._-]+', 'g');

let passRefs = 0;
for (const file of targets) {
  const full = path.join(root, file);
  const before = fs.readFileSync(full, 'utf8');
  const after = before.replace(pattern, (match, lead, name) => {
    const next = lead + name + '?v=' + versions.get(name);
    if (next !== match) { passRefs += 1; changedRefs += 1; }
    return next;
  });
  if (after !== before) {
    changedFiles += 1;
    if (!check) fs.writeFileSync(full, after);
  }
}
if (!passRefs || check) break;
}
}

runPasses();
const minified = minifyAssets({ check });
if (minified) changedFiles += minified;
if (!check) runPasses();
if (check && minified) changedRefs += minified;

if (check) {
  if (changedRefs) {
    console.error(changedRefs + ' stale version string(s) in ' + changedFiles + ' file(s). Run: node scripts/bump-asset-versions.mjs');
    process.exit(1);
  }
  console.log('All asset version strings are current.');
} else {
  console.log('Updated ' + changedRefs + ' version string(s) in ' + changedFiles + ' file(s).');
}
