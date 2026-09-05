import { chromium } from "playwright";

// Guide/TOC page for the new "Other Agencies and Court-Related Functions"
// chapter (the Independent Agencies Ledger's 13 entities) -- matches
// build-departments-toc-page.mjs's exact styling. Entities sharing a
// detail page (grouped by content length) share the same page number.

const ITEMS = [
  ["Statutory &amp; Other Agency Funding", 34],
  ["Walton County Health Department", 35],
  ["South Walton Fire &amp; State Control", 35],
  ["Medical Examiner", 35],
  ["E911 Fund", 36],
  ["Non-Profit Funding Program", 36],
  ["State Attorney", 36],
  ["Public Defender", 37],
  ["Circuit Court", 37],
  ["Court Technology &amp; Innovations", 37],
  ["County Court", 38],
  ["Daughette MSBU Fund", 38],
  ["Guardian Ad Litem", 38]
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
  h1{ margin:8px 0 .1in; color:#003f28; font:800 27pt/1.05 Georgia, "Times New Roman", serif; letter-spacing:-.02em; }
  p.intro{ max-width:6.6in; margin:0 0 .18in; color:#54665e; font-size:9pt; line-height:1.45; }
  .row{ display:flex; justify-content:space-between; align-items:baseline; padding:6.1px 0; border-bottom:1px solid #e4ebe7; font-size:8.8pt; }
  .row span{ color:#173229; font-weight:700; }
  .row b{ color:#006231; font-weight:700; font-size:8.6pt; }
  footer{ position:absolute; left:.625in; right:.625in; bottom:.3in; display:flex; justify-content:space-between; border-top:1px solid #cbd8d1; padding-top:7px; color:#68786f; font-size:7.5pt; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
`;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>TOC</title><style>${css}</style></head>
<body>
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Budget Book Guide</small>
    <h1>Other Agencies and Court-Related Functions</h1>
    <p class="intro">Budget, fund, and year-over-year change for the Courts, Health Department, and other independent and autonomous entities Walton County funds outside its own Board departments and Constitutional Officers.</p>
    ${ITEMS.map(([label, num]) => `<div class="row"><span>${label}</span><b>${num}</b></div>`).join("")}
    <footer><span>FY 2027 Annual Budget</span><b>7</b></footer>
  </section>
</body></html>`;

const outPath = process.argv[2] || "/private/tmp/toc-other-agencies.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
