import { chromium } from "playwright";

// Builds the FY 2027 Budget Book's "Interfund Transfer Ledger" -- both
// sides of every planned FY2027 transfer between County funds. Source:
// an already-complete, internally consistent raw capture (Transfers Out
// total exactly equals Transfers In total, $143,663,984, matching the
// "Other Financial Sources/Uses" figures used throughout this book's
// other financial schedules) -- no research pass needed.

const OUT_ROWS = [
  ["E911 Fund", "E911 Revenue to Sheriff", "$460,000"],
  ["General Fund", "Property Tax (Sheriff)", "$98,004,256"],
  ["General Fund", "Debt Payment", "$2,581,997"],
  ["General Fund", "Property Tax (Capital)", "$25,035,734"],
  ["Solid Waste Fund", "Small County Surtax", "$2,581,997"],
  ["Solid Waste Fund", "Small County Surtax (Mossy Head Wastewater Treatment)", "$379,000"],
  ["Solid Waste Fund", "Small County Surtax (Transportation)", "$14,621,000"]
];
const OUT_TOTAL = "$143,663,984";

const IN_ROWS = [
  ["Capital Projects Fund", "Property Tax", "$25,035,734"],
  ["Capital Projects Fund", "Interfund Group Transfer In", "$2,581,997"],
  ["General Fund", "Small County Surtax", "$2,581,997"],
  ["Sheriff Fund", "Property Tax", "$98,004,256"],
  ["Sheriff Fund", "E911", "$460,000"],
  ["Transportation Fund", "Small County Surtax", "$379,000"],
  ["Transportation Fund", "Small County Surtax", "$14,621,000"]
];
const IN_TOTAL = "$143,663,984";

const STATS = [
  ["$143.7M", "Total Transfers, FY2027"],
  ["7", "Transfers Out"],
  ["7", "Transfers In"],
  ["3", "Funds Providing Resources"]
];

const tableHead = (fundLabel) => `<div class="lrow head"><div class="rlabel">${fundLabel}</div><div class="rdesc">Description</div><div class="rnum">Amount</div></div>`;
const row = (cells) => `<div class="lrow"><div class="rlabel">${cells[0]}</div><div class="rdesc">${cells[1]}</div><div class="rnum">${cells[2]}</div></div>`;

const startPage = Number(process.argv[3] || 210);

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Interfund Transfer Ledger</title>
<style>
  @page{ size:letter portrait; margin:0; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ font-family:Arial, Helvetica, sans-serif; color:#173229; }
  section{
    position:relative;
    width:8.5in;
    height:11in;
    padding:.56in .62in .5in;
    background:#ffffff;
    overflow:hidden;
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
  .kicker{
    display:block;
    margin-top:.26in;
    color:#b89521;
    font-size:8pt;
    font-weight:900;
    letter-spacing:.14em;
    text-transform:uppercase;
  }
  h1{
    margin:8px 0 .08in;
    color:#003f28;
    font:800 25pt/1.05 Georgia, "Times New Roman", serif;
    letter-spacing:-.02em;
  }
  p.intro{
    max-width:7.3in;
    margin:0 0 .2in;
    color:#33453c;
    font-size:9.3pt;
    line-height:1.5;
  }
  .stat-strip{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:.13in;
    margin:0 0 .28in;
  }
  .stat-card{
    padding:.14in .1in;
    border-radius:12px;
    background:#003f28;
    text-align:center;
  }
  .stat-card b{ display:block; color:#fff; font:800 14pt/1.1 Georgia, serif; }
  .stat-card span{ display:block; margin-top:.04in; color:#e7c95f; font-size:6.6pt; font-weight:800; letter-spacing:.03em; text-transform:uppercase; line-height:1.3; }
  h2{
    margin:0 0 .1in;
    color:#003f28;
    font:800 12pt/1.2 Georgia, serif;
    padding-bottom:.06in;
    border-bottom:2px solid #d1be78;
  }
  .ledger{ border-top:2px solid #d1be78; margin-bottom:.28in; }
  .lrow{
    display:grid;
    grid-template-columns:1.7in 3.7in 1.3in;
    gap:.1in;
    align-items:center;
    padding:.08in 0;
    border-bottom:1px solid #eef1ee;
  }
  .lrow.head{
    border-bottom:1px solid #003f28;
    color:#68786f;
    font-size:6.8pt;
    font-weight:800;
    letter-spacing:.02em;
    text-transform:uppercase;
    padding-bottom:.06in;
  }
  .lrow.head .rnum{ text-align:right; }
  .rlabel{ color:#003f28; font-size:8.6pt; font-weight:700; }
  .rdesc{ color:#33453c; font-size:8.4pt; }
  .rnum{ text-align:right; color:#173229; font-size:8.8pt; font-weight:700; font-variant-numeric:tabular-nums; }
  .lrow.grand{
    margin-top:.03in;
    border-top:1.5px solid #003f28;
    border-bottom:0;
    padding:.1in 0;
  }
  .lrow.grand .rlabel, .lrow.grand .rnum{ color:#003f28; font-weight:800; font-size:9.6pt; }
  footer{
    position:absolute;
    left:.62in;
    right:.62in;
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
</style></head>
<body>
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Financial Overview</small>
    <h1>Interfund Transfer Ledger</h1>
    <p class="intro">Both sides of each planned FY2027 budget transfer between County funds &mdash; which fund provides the resources and which fund receives them. Every dollar transferred out is matched by a dollar transferred in; the two tables below total the same $143,663,984.</p>

    <div class="stat-strip">${STATS.map(([v, l]) => `<div class="stat-card"><b>${v}</b><span>${l}</span></div>`).join("")}</div>

    <h2>Interfund Transfers Out</h2>
    <div class="ledger">
      ${tableHead("Fund (Transferring Out)")}
      ${OUT_ROWS.map(row).join("")}
      <div class="lrow grand"><div class="rlabel">Total</div><div class="rdesc"></div><div class="rnum">${OUT_TOTAL}</div></div>
    </div>

    <h2>Interfund Transfers In</h2>
    <div class="ledger">
      ${tableHead("Fund (Receiving)")}
      ${IN_ROWS.map(row).join("")}
      <div class="lrow grand"><div class="rlabel">Total</div><div class="rdesc"></div><div class="rnum">${IN_TOTAL}</div></div>
    </div>

    <footer><span>FY 2027 Annual Budget</span><b>${startPage}</b></footer>
  </section>
</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-interfund-transfer-ledger.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
