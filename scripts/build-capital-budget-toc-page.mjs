import { chromium } from "playwright";

// Guide/TOC page for the new "Capital Budget" chapter -- the Capital
// Improvement Plan and its six supporting fund ledgers, pulled out of
// the Financial Plan chapter into their own top-level section.
// Lists only Capital content in its final physical page order.

const ITEMS = [
  ["Capital Improvement Plan", 109],
  ["Capital Investment Map", 112],
  ["Capital Funding and Delivery Dashboard", 113],
  { category: "Fund-Specific Capital Ledgers" },
  ["Transportation and Infrastructure Capital Ledger", 114],
  ["Tourist Development Fund Capital Ledger", 116],
  ["Sheriff Capital Project Ledger", 117],
  ["Recreation Plat Fee Fund Capital Ledger", 118],
  ["Sidewalk Fund Capital Ledger", 119],
  ["Machinery, Vehicles, and Equipment Ledger", 120]
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
  .row.is-subitem span{padding-left:.2in;font-weight:600;}
  .category{margin:.12in 0 .01in;color:#006231;font-size:7.5pt;font-weight:900;letter-spacing:.08em;text-transform:uppercase;}
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
    ${ITEMS.map((item) => item.category
      ? `<div class="category">${item.category}</div>`
      : `<div class="row${item[2] ? " is-subitem" : ""}"><span>${item[0]}</span><b>${item[1]}</b></div>`).join("")}
    <footer><span>FY 2027 Final Budget</span><b>108</b></footer>
  </section>
</body></html>`;

const outPath = process.argv[2] || "/private/tmp/toc-capital-budget.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
