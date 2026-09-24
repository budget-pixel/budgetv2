import { chromium } from "playwright";
import QRCode from "qrcode";

const BUDGET_EXPLORER_URL = "https://final2027.budget-waltoncountyfl.com/";
const BUDGET_EXPLORER_QR = await QRCode.toDataURL(BUDGET_EXPLORER_URL, {
  margin: 4,
  width: 220,
  color: { dark: "#003f28", light: "#ffffff" }
});

// Builds the FY 2027 Budget Book's "Budget in Brief" -- a single-page,
// at-a-glance infographic summarizing the whole budget for residents, the
// way GFOA award-winning budget books typically pair a detailed
// transmittal letter with a condensed one-page citizen summary. All
// figures are the same real, verified FY2027 numbers used in the
// Transmittal Letter (see build-transmittal-letter.mjs) and Fund
// Highlights.

// Entity-based, not the broad functional-activity categories (Public
// Safety, General Government, etc.) -- those bundle dozens of unrelated
// departments together and don't tell a resident much. Sheriff first (by
// far the single largest budget in the county), then the rest of the
// Constitutional Officers as one line, then Capital, then the largest
// individual Board departments (eleven named departments/entities in
// total, matching the twelve-row Revenue Portfolio table on the facing
// side), with everything smaller rolled into "All Other Departments &
// Agencies". Figures from the same live Budget Change Summary dataset
// used to build that page (see build-budget-change-summary.mjs) -- Sheriff
// $114,116,228; Total Constitutional Officers $147,191,886 (so "other"
// Constitutional Officers = $33,075,658); funded FY 2027 capital program
// $43,795,734;
// department totals from the Board Department Operating and Personnel
// Budgets list, including Building Construction & Maintenance
// ($8,596,305), Planning ($6,839,111), and Code Compliance ($4,811,854).
const EXPENSE_CATEGORIES = [
  ["Sheriff's Office", 114.12],
  ["Other Constitutional Officers", 33.08],
  ["Funded Capital Program", 43.80],
  ["Tourism Administration", 29.67],
  ["Environmental Services", 23.51],
  ["Public Works", 20.83],
  ["Beach Operations", 16.08],
  ["County Administration Offices", 10.89],
  ["Building Construction & Maintenance", 8.60],
  ["Planning", 6.84],
  ["Code Compliance", 4.81],
  ["All Other Departments & Agencies", 32.97]
];
const EXPENSE_TOTAL = 345.2;

// Convert the expense shares to whole cents while ensuring the displayed
// allocation totals exactly $1.00. Largest-remainder allocation avoids the
// confusing 99- or 101-cent totals produced by independently rounding rows.
const allocateCents = (categories, total) => {
  const exact = categories.map(([, value]) => (value / total) * 100);
  const cents = exact.map(Math.floor);
  let remaining = 100 - cents.reduce((sum, value) => sum + value, 0);
  exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder)
    .slice(0, remaining)
    .forEach(({ index }) => { cents[index] += 1; });
  return cents;
};
const expenseCents = allocateCents(EXPENSE_CATEGORIES, EXPENSE_TOTAL);

// The same eleven highlighted revenue sources shown on the Revenue
// Portfolio table (see build-gfoa-enhancements.mjs's revenueSources),
// plus a reconciling All Other Revenue line. Appropriated Fund Balance is
// a draw on reserves, not revenue, so it is not listed as a source. The
// next-largest revenue source, Ambulance Fees, takes its place so this
// page and the Revenue Portfolio show the same major sources.
const REVENUE_SOURCES = [
  ["Property Taxes", 152.48],
  ["Tourist Development Taxes", 58.97],
  ["Discretionary Sales Surtax", 40.0],
  ["Local Government 1/2 Cent Sales Tax", 16.8],
  ["Interest & Investment Earnings", 5.25],
  ["Indirect Administrative Fees", 4.11],
  ["Local Option Fuel Tax", 4.01],
  ["State Revenue Share Proceeds", 3.73],
  ["Housing Prisoners Revenue", 3.5],
  ["Federal Grant - Economic Environment", 3.06],
  ["Ambulance Fees", 3.0],
  ["All Other Revenue", 50.29]
];
const REVENUE_TOTAL = 345.2;
const revenueCents = allocateCents(REVENUE_SOURCES, REVENUE_TOTAL);

const FUNDS = [
  ["General Fund", "$206.9M"],
  ["Sheriff Fund", "$114.1M"],
  ["Tourist Development", "$59.0M"],
  ["Solid Waste", "$40.7M"],
  ["Transportation", "$30.7M"],
  ["Capital Projects", "$27.6M"],
  ["Building", "$4.0M"],
  ["Housing & Urban Development", "$3.1M"],
  ["Mosquito Control", "$1.4M"],
  ["Recreation Plat Fee", "$600K"],
  ["E911", "$460K"],
  ["Sidewalk", "$300K"],
  ["Mosquito State Aid", "$69.6K"],
  ["Daughette MSBU", "$43.2K"],
  ["Preservation", "$0"]
];

const barRow = (label, value, total, color, cents = null, exactDisplay = null) => {
  const pct = (value / total) * 100;
  const publicValue = cents === null ? `${pct.toFixed(0)}%` : `${cents}&cent; of every $1`;
  return `<div class="bar-row">
    <div class="bar-label">${label}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div></div>
    <div class="bar-value">${exactDisplay || `$${value.toFixed(1)}M`}<span>${publicValue}</span></div>
  </div>`;
};

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Budget in Brief</title>
<style>
  @page{ size:letter portrait; margin:0; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ font-family:Arial, Helvetica, sans-serif; color:#173229; }
  section{
    position:relative;
    width:8.5in;
    height:11in;
    padding:.46in .62in .5in;
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
    margin-top:.18in;
    color:#b89521;
    font-size:8pt;
    font-weight:900;
    letter-spacing:.14em;
    text-transform:uppercase;
  }
  h1{
    margin:8px 0 .06in;
    color:#003f28;
    font:800 25pt/1.05 Georgia, "Times New Roman", serif;
    letter-spacing:-.02em;
  }
  p.intro{
    max-width:7.3in;
    margin:0 0 .2in;
    color:#33453c;
    font-size:9.3pt;
    line-height:1.45;
  }
  .message-panel{
    display:grid;
    grid-template-columns:1fr .95in;
    gap:.18in;
    align-items:center;
    margin:0 0 .11in;
    padding:.1in .15in;
    border-left:4px solid #d1be78;
    border-radius:0 12px 12px 0;
    background:#f6f4eb;
  }
  .message-panel p{
    margin:0;
    color:#263d32;
    font-size:8.1pt;
    line-height:1.36;
  }
  .message-panel strong{ color:#003f28; }
  .explorer-link{
    display:block;
    color:#003f28;
    text-align:center;
    text-decoration:none;
  }
  .explorer-link img{
    display:block;
    width:.7in;
    height:.7in;
    margin:0 auto .035in;
    border:1px solid #d1be78;
    border-radius:0;
    background:#fff;
    image-rendering:pixelated;
  }
  .explorer-link b{
    display:block;
    font-size:5.9pt;
    line-height:1.18;
    letter-spacing:.03em;
    text-transform:uppercase;
  }
  .stat-strip{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:.13in;
    margin:0 0 .12in;
  }
  .stat-card{
    padding:.1in .08in;
    border-radius:12px;
    background:#003f28;
    text-align:center;
  }
  .stat-card b{
    display:block;
    color:#fff;
    font:800 15pt/1.1 Georgia, serif;
  }
  .stat-card span{
    display:block;
    margin-top:.04in;
    color:#e7c95f;
    font-size:6.8pt;
    font-weight:800;
    letter-spacing:.04em;
    text-transform:uppercase;
    line-height:1.3;
  }
  h2{
    margin:0 0 .08in;
    color:#003f28;
    font:800 11.5pt/1.2 Georgia, serif;
    padding-bottom:.05in;
    border-bottom:2px solid #d1be78;
  }
  .charts-row{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:.32in;
    margin:0 0 .12in;
  }
  .bar-row{
    display:grid;
    grid-template-columns:1.45in 1fr 1.05in;
    align-items:center;
    gap:.1in;
    margin:0 0 .05in;
  }
  .bar-label{
    color:#173229;
    font-size:7.5pt;
    font-weight:700;
  }
  .bar-track{
    height:.16in;
    border-radius:4px;
    background:#eef1ee;
    overflow:hidden;
  }
  .bar-fill{ height:100%; }
  .bar-value{
    text-align:right;
    color:#003f28;
    font-size:7.5pt;
    font-weight:800;
  }
  .bar-value span{
    display:block;
    color:#68786f;
    font-size:6.1pt;
    font-weight:700;
  }
  .chart-total{
    margin-top:.06in;
    color:#68786f;
    font-size:7.3pt;
    font-style:italic;
  }
  .dollar-callout{
    display:flex;
    align-items:baseline;
    gap:.08in;
    margin:-.03in 0 .12in;
    color:#68786f;
    font-size:7.2pt;
    font-weight:700;
  }
  .dollar-callout b{ color:#b89521; font:800 13pt/1 Georgia,serif; }
  .fund-strip{
    display:grid;
    grid-template-columns:repeat(5,1fr);
    gap:.04in .1in;
    margin:0 0 .08in;
  }
  .fund-note{
    margin:0;
    color:#68786f;
    font-size:6.3pt;
    line-height:1.35;
    font-style:italic;
  }
  .fund-chip{
    min-height:.34in;
    padding:.04in .06in;
    border:1px solid #e4ebe7;
    border-radius:10px;
    background:#fbfcfa;
    text-align:center;
  }
  .fund-chip b{
    display:block;
    color:#003f28;
    font:800 9.8pt/1.05 Georgia, serif;
  }
  .fund-chip span{
    display:block;
    margin-top:.02in;
    color:#68786f;
    font-size:5.7pt;
    font-weight:700;
    letter-spacing:.02em;
    text-transform:uppercase;
    line-height:1.25;
  }
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
    <h1>Budget in Brief</h1>
    <div class="message-panel">
      <p><strong>Walton County&rsquo;s FY2027 final budget maintains core services while lowering the County operating millage to 3.2500, investing $43.8 million in funded capital improvements, and adding targeted workforce capacity.</strong> The $345.2 million plan prioritizes public safety, infrastructure, and dependable service in a growing community while preserving long-term financial preparedness.</p>
      <a class="explorer-link" href="${BUDGET_EXPLORER_URL}"><img src="${BUDGET_EXPLORER_QR}" alt="QR code to the Walton County Budget Explorer"><b>Explore the<br>Budget Online</b></a>
    </div>

    <div class="stat-strip">
      <div class="stat-card"><b>$345.2M</b><span>Net Expenditure Budget</span></div>
      <div class="stat-card"><b>3.2500</b><span>County Millage Rate</span></div>
      <div class="stat-card"><b>667</b><span>Board Department FTE</span></div>
      <div class="stat-card"><b>848</b><span>Constitutional Officer FTE</span></div>
    </div>

    <div class="charts-row">
      <div>
        <h2>Where the Money Comes From</h2>
        <div class="dollar-callout"><b>$1.00</b><span>Every County budget funding dollar, allocated by source</span></div>
        ${REVENUE_SOURCES.map(([l, v, display], i) => barRow(l, v, REVENUE_TOTAL, "#0b7741", revenueCents[i], display)).join("")}
        <p class="chart-total">Displayed cents use the largest-remainder rounding method so the shown amounts add to exactly $1.00.</p>
      </div>
      <div>
        <h2>Where the Money Goes</h2>
        <div class="dollar-callout"><b>$1.00</b><span>Every County budget dollar, allocated by service area</span></div>
        ${EXPENSE_CATEGORIES.map(([l, v], i) => barRow(l, v, EXPENSE_TOTAL, "#003f28", expenseCents[i])).join("")}
        <p class="chart-total">Displayed cents use the largest-remainder rounding method so the shown amounts add to exactly $1.00.</p>
      </div>
    </div>

    <h2>Fund Highlights - Major and Minor Funds</h2>
    <div class="fund-strip">
      ${FUNDS.map(([l, v]) => `<div class="fund-chip"><b>${v}</b><span>${l}</span></div>`).join("")}
    </div>
    <p class="fund-note">Fund highlights present gross fund budgets and are not additive to the $345.2 million net expenditure budget. Interfund transfers appear in more than one fund and are eliminated from the net total. This Budget in Brief was distributed at the tentative and final budget hearings and posted online.</p>

    <footer><span>FY 2027 Final Budget</span><b>PAGE_A</b></footer>
  </section>
</body></html>`;

const startPage = Number(process.argv[3] || 15);
const outPath = process.argv[2] || "/private/tmp/budget-book-budget-in-brief.pdf";
const handoutPath = process.argv[4] || "output/pdf/walton-county-fy2027-budget-in-brief.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const bookHtml = html.replace("PAGE_A", startPage);
await page.setContent(bookHtml, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
const handoutHtml = bookHtml.replace(
  `<footer><span>FY 2027 Final Budget</span><b>${startPage}</b></footer>`,
  `<footer><span>FY 2027 Final Budget</span><b>Budget in Brief</b></footer>`
);
await page.setContent(handoutHtml, { waitUntil: "networkidle" });
await page.pdf({ path: handoutPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
console.log("Wrote " + handoutPath);
