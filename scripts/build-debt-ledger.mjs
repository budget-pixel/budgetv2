import { chromium } from "playwright";

// Builds the FY 2027 Budget Book's "Debt Ledger" -- Walton County's only
// outstanding long-term debt: a $27,000,000 Note Payable (2015) and a
// $2,500,000 Revenue Promissory Note (2020), both used for public
// improvements (most notably the Broadband project), repaid exclusively
// from the County's half-cent sales tax (not property taxes), scheduled
// to be fully repaid by FY2030. Source: an already-complete, internally
// consistent raw capture (Principal + Interest reconciles to Total for
// every year and in aggregate) -- no research pass needed.

const STATS = [
  ["$29.5M", "Total Debt Issued"],
  ["$9.1M", "Remaining Debt Service"],
  ["$2.51M", "FY2027 Debt Service"],
  ["FY2030", "Scheduled Payoff"]
];

const NOTES = [
  ["2015 Note Payable", "$27,000,000", "Broadband and public improvement projects"],
  ["2020 Revenue Promissory Note", "$2,500,000", "Public improvement projects"]
];

// [Year Ending Sept 30, Principal, Interest, Total]
const SCHEDULE = [
  ["2027", "$2,245,783", "$268,920", "$2,514,703"],
  ["2028", "$2,310,881", "$196,943", "$2,507,824"],
  ["2029", "$2,399,115", "$123,671", "$2,522,786"],
  ["2030", "$1,571,648", "$47,343", "$1,618,991"]
];
const SCHEDULE_TOTAL = ["Total", "$8,466,013", "$636,877", "$9,102,890"];

const row = (cells, cls) => `<div class="lrow${cls ? " " + cls : ""}"><div class="rlabel">${cells[0]}</div><div class="rnum">${cells[1]}</div><div class="rnum">${cells[2]}</div><div class="rnum">${cells[3]}</div></div>`;

const startPage = Number(process.argv[3] || 211);

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Debt Ledger</title>
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
    margin:0 0 .3in;
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
    margin:0 0 .12in;
    color:#003f28;
    font:800 12pt/1.2 Georgia, serif;
    padding-bottom:.06in;
    border-bottom:2px solid #d1be78;
  }
  .notes-grid{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:.24in;
    margin:0 0 .32in;
  }
  .note-card{
    padding:.18in .22in;
    border:1px solid #e4ebe7;
    border-radius:12px;
    background:#fbfcfa;
  }
  .note-card b{ display:block; color:#003f28; font:800 13pt Georgia, serif; margin-bottom:.04in; }
  .note-card .amt{ display:block; color:#0b7741; font:800 15pt Georgia, serif; margin-bottom:.04in; }
  .note-card span{ display:block; color:#68786f; font-size:8pt; line-height:1.4; }
  .ledger{ border-top:2px solid #d1be78; }
  .lrow{
    display:grid;
    grid-template-columns:1.6in 1fr 1fr 1fr;
    gap:.1in;
    align-items:center;
    padding:.1in 0;
    border-bottom:1px solid #eef1ee;
  }
  .lrow.head{
    border-bottom:1px solid #003f28;
    color:#68786f;
    font-size:7pt;
    font-weight:800;
    letter-spacing:.02em;
    text-transform:uppercase;
    padding-bottom:.08in;
  }
  .lrow.head .rnum{ text-align:right; }
  .rlabel{ color:#173229; font-size:9.5pt; font-weight:700; }
  .rnum{ text-align:right; color:#33453c; font-size:9.3pt; font-variant-numeric:tabular-nums; }
  .lrow.grand{
    margin-top:.05in;
    border-top:2px solid #003f28;
    border-bottom:1.5px solid #003f28;
    padding:.13in 0;
  }
  .lrow.grand .rlabel, .lrow.grand .rnum{ color:#003f28; font-weight:800; font-size:10.3pt; }
  .callout{
    margin-top:.3in;
    padding:.2in .26in;
    border:1px solid #d1be78;
    border-radius:12px;
    background:#f9f8f2;
  }
  .callout h3{ margin:0 0 .06in; color:#003f28; font:800 9.5pt Georgia, serif; }
  .callout p{ margin:0; color:#33453c; font-size:8.3pt; line-height:1.5; }
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
    <small class="kicker">Debt and Financial Forecast</small>
    <h1>Debt Ledger</h1>
    <p class="intro">Walton County's only outstanding long-term debt is a $27,000,000 Note Payable issued in 2015 and a $2,500,000 Revenue Promissory Note issued in 2020, both used to fund public improvements &mdash; most notably the Broadband project. Both notes are repaid exclusively from the County's half-cent sales tax, not property taxes, and are scheduled to be fully repaid by FY2030.</p>

    <div class="stat-strip">${STATS.map(([v, l]) => `<div class="stat-card"><b>${v}</b><span>${l}</span></div>`).join("")}</div>

    <h2>Outstanding Notes</h2>
    <div class="notes-grid">
      ${NOTES.map(([n, a, p]) => `<div class="note-card"><b>${n}</b><span class="amt">${a}</span><span>${p}</span></div>`).join("")}
    </div>

    <h2>Debt Ledger &mdash; Capital Projects Fund</h2>
    <div class="ledger">
      <div class="lrow head"><div class="rlabel">Year Ending September 30</div><div class="rnum">Principal</div><div class="rnum">Interest</div><div class="rnum">Total</div></div>
      ${SCHEDULE.map((r) => row(r)).join("")}
      ${row(SCHEDULE_TOTAL, "grand")}
    </div>

    <div class="callout">
      <h3>Why So Little Debt?</h3>
      <p>Walton County funds the large majority of its capital program on a pay-as-you-go basis from current revenues and legally restricted funding sources rather than borrowing &mdash; see the Capital Improvement Plan chapter for how the County determines the level of capital spending and when debt is used. This conservative approach preserves borrowing capacity for future needs and keeps debt service to a small share of the annual budget.</p>
    </div>

    <footer><span>FY 2027 Annual Budget</span><b>${startPage}</b></footer>
  </section>
</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-debt-ledger.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
