import { chromium } from "playwright";

// Rebuilds the "Financial Plan and Capital Program" Table of Contents
// page (page index 6 in the shipped book) to reflect: (1) the Department
// Operating Ledger shrinking from 14 to 9 pages, (2) the new Capital
// Improvement Plan section (3 pages, did not exist before) inserted
// immediately before the Machinery, Vehicles, and Equipment Ledger, and
// (3) every subsequent entry renumbered accordingly. Matches the
// existing TOC page's exact measured styling (fonts/sizes/colors/row
// height/rule color) rather than a generic template, so this page is
// visually identical to its neighbors before and after this edit.

const ITEMS = [
  ["Financial Plan Chapter", 69],
  ["Consolidated Budget Ledger", 70],
  ["Budget Change Summary", 72],
  ["Revenue Ledger", 74],
  ["Property Tax Allocation Ledger", 77],
  ["Expenditure Ledger", 79],
  ["Personnel Ledger", 81],
  ["Contractual Services Ledger", 82],
  ["Fund Financial Ledger", 86],
  ["Interfund Transfer Ledger", 88],
  ["Debt Ledger", 89],
  ["Long-Term Outlook", 90]
];

const css = `
  @page{ size:letter portrait; margin:0; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ font-family:Arial, Helvetica, sans-serif; color:#173229; }
  section{
    position:relative;
    width:8.5in;
    height:11in;
    padding:.52in .625in .58in;
    background:#ffffff;
  }
  header{
    display:flex;
    justify-content:space-between;
    padding-bottom:9px;
    border-bottom:1px solid #63736b;
    color:#53665d;
    font-size:8pt;
    font-weight:800;
    letter-spacing:.08em;
    text-transform:uppercase;
  }
  header em{ font-style:normal; }
  small.kicker{
    display:block;
    margin-top:.4in;
    color:#b89521;
    font-size:8pt;
    font-weight:900;
    letter-spacing:.14em;
    text-transform:uppercase;
  }
  h1{
    margin:8px 0 .22in;
    color:#003f28;
    font:800 29pt/1.05 Georgia, "Times New Roman", serif;
    letter-spacing:-.02em;
  }
  .row{
    display:flex;
    justify-content:space-between;
    align-items:baseline;
    padding:7.5px 0;
    border-bottom:1px solid #e4ebe7;
    font-size:9.2pt;
  }
  .row span{ color:#173229; font-weight:700; }
  .row b{ color:#006231; font-weight:700; font-size:9pt; }
  footer{
    position:absolute;
    left:.625in;
    right:.625in;
    bottom:.3in;
    display:flex;
    justify-content:space-between;
    border-top:1px solid #cbd8d1;
    padding-top:7px;
    color:#68786f;
    font-size:7.5pt;
    font-weight:800;
    letter-spacing:.08em;
    text-transform:uppercase;
  }
`;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>TOC</title><style>${css}</style></head>
<body>
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Budget Book Guide</small>
    <h1>Financial Plan</h1>
    ${ITEMS.map(([label, num]) => `<div class="row"><span>${label}</span><b>${num}</b></div>`).join("")}
    <footer><span>FY 2027 Annual Budget</span><b>9</b></footer>
  </section>
</body></html>`;

const outPath = process.argv[2] || "/private/tmp/toc-financial-plan.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
