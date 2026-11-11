// Builds every Reader's Guide page (readers-guide.mjs) into one PDF, in
// book order, and writes a manifest of where each page belongs:
//   node scripts/print/build-readers-guides.mjs [out.pdf]
// The manifest (same path, .json) lists each guide's key, its page in the
// PDF, and either the old page it follows (insertAfter) or replaces.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { capturePublicationHtml } from "./publication-print.mjs";
import { css, header, footer } from "./story-style.mjs";
import { GUIDES, guidePageHtml, guidePage } from "./readers-guide.mjs";

const outPath = process.argv[2] || "tmp/pdfs/readers-guides.pdf";
const ordered = [...GUIDES].sort((a, b) => guidePage(a) - guidePage(b));
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Reader's Guides</title><style>${css}</style></head><body>${ordered.map((g) => guidePageHtml(g, header, footer)).join("")}</body></html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await capturePublicationHtml(page, outPath);
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, tagged: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();

const manifest = ordered.map((g, i) => ({ key: g.key, sourcePage: i + 1, newPage: guidePage(g), title: g.key === "overall" ? "Reader's Guide to the FY 2027 Budget" : "Reader's Guide", section: g.kicker, ...(g.replaces ? { replaces: g.replaces } : { insertAfter: g.insertAfter }) }));
writeFileSync(outPath.replace(/\.pdf$/, ".json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`Wrote ${outPath} (${ordered.length} guides)`);
