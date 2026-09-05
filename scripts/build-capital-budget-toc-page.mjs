import { chromium } from "playwright";

// Guide/TOC page for the new "Capital Budget" chapter -- the Capital
// Improvement Plan and its six supporting fund ledgers, pulled out of
// the Financial Plan chapter into their own top-level section. Also
// carries the trailing Glossary/Back Cover pointers, since Capital
// Budget is now the last operating chapter before reference material.

const ITEMS = [
  ["Capital Improvement Plan", 93],
  ["Machinery, Vehicles, and Equipment Ledger", 96],
  ["Transportation and Infrastructure Capital Ledger", 98],
  ["Tourist Development Fund Capital Ledger", 100],
  ["Sheriff Capital Project Ledger", 101],
  ["Recreation Plat Fee Fund Capital Ledger", 102],
  ["Sidewalk Fund Capital Ledger", 103]
];
const TRAILING = [
  ["Glossary, Acronyms, and Frequently Asked Questions", 104],
  ["Back Cover", 113]
];

const css = `
  @page{ size:letter portrait; margin:0; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ font-family:Arial, Helvetica, sans-serif; color:#173229; }
  section{ position:relative; width:8.5in; height:11in; padding:.52in .625in .58in; background:#ffffff; }
  header{ display:flex; justify-content:space-between; padding-bottom:9px; border-bottom:1px solid #63736b; color:#53665d; font-size:8pt; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
  header em{ font-style:normal; }
  small.kicker{ display:block; margin-top:.4in; color:#b89521; font-size:8pt; font-weight:900; letter-spacing:.14em; text-transform:uppercase; }
  h1{ margin:8px 0 .1in; color:#003f28; font:800 29pt/1.05 Georgia, "Times New Roman", serif; letter-spacing:-.02em; }
  p.intro{ max-width:6.6in; margin:0 0 .22in; color:#54665e; font-size:9pt; line-height:1.45; }
  .row{ display:flex; justify-content:space-between; align-items:baseline; padding:7.5px 0; border-bottom:1px solid #e4ebe7; font-size:9.2pt; }
  .row span{ color:#173229; font-weight:700; }
  .row b{ color:#006231; font-weight:700; font-size:9pt; }
  .trailing{ margin-top:.3in; padding-top:.06in; border-top:2px solid #d1be78; }
  footer{ position:absolute; left:.625in; right:.625in; bottom:.3in; display:flex; justify-content:space-between; border-top:1px solid #cbd8d1; padding-top:7px; color:#68786f; font-size:7.5pt; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
`;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>TOC</title><style>${css}</style></head>
<body>
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Budget Book Guide</small>
    <h1>Capital Budget</h1>
    <p class="intro">Walton County's Capital Improvement Plan and the fund-specific ledgers that finance it &mdash; machinery, vehicles and equipment, transportation and infrastructure, tourist development, Sheriff facilities, recreation plat fees, and sidewalks.</p>
    ${ITEMS.map(([label, num]) => `<div class="row"><span>${label}</span><b>${num}</b></div>`).join("")}
    <div class="trailing">
      ${TRAILING.map(([label, num]) => `<div class="row"><span>${label}</span><b>${num}</b></div>`).join("")}
    </div>
    <footer><span>FY 2027 Annual Budget</span><b>10</b></footer>
  </section>
</body></html>`;

const outPath = process.argv[2] || "/private/tmp/toc-capital-budget.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
