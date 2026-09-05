import { chromium } from "playwright";

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
// individual Board departments, with everything smaller rolled into "All
// Other Departments & Agencies". Figures from the same live Budget Change
// Summary dataset used to build that page (see build-budget-change-
// summary.mjs) -- Sheriff $114,116,228; Total Constitutional Officers
// $147,191,886 (so "other" Constitutional Officers = $33,075,658); Total
// Capital $53,684,150; department totals from the Board Department
// Operating and Personnel Budgets list.
const EXPENSE_CATEGORIES = [
  ["Sheriff's Office", 114.12],
  ["Other Constitutional Officers", 33.08],
  ["Capital Projects", 53.68],
  ["Tourism Administration", 29.67],
  ["Environmental Services", 23.51],
  ["Public Works", 20.83],
  ["Beach Operations", 16.08],
  ["County Administration Offices", 10.89],
  ["All Other Departments & Agencies", 41.56]
];
const EXPENSE_TOTAL = EXPENSE_CATEGORIES.reduce((s, [, v]) => s + v, 0);

// Named tax types instead of the lumped "General Government Taxes"
// bucket, plus the standard non-tax revenue categories. Source: DATA_
// SOURCES.revenues, Revenue_Type "General Government Taxes" grouped by
// Revenue_Name -- Ad Valorem (property) $161,066,332; Tourist Development
// Tax $58,965,950; Discretionary Sales Surtax $40,000,000; Fuel/Gas Taxes
// $4,810,212; Communications Services Tax $350,000 -- the smallest three
// combined into "All Other Revenue" with Permits/Fees and Fines.
const REVENUE_SOURCES = [
  ["Property Tax", 161.07],
  ["Tourist Development Tax", 58.97],
  ["Sales Surtax", 40.0],
  ["Charges for Services", 38.67],
  ["Intergovernmental Revenues", 29.32],
  ["Miscellaneous Revenue", 14.59],
  ["All Other Revenue", 8.85]
];
const REVENUE_TOTAL = REVENUE_SOURCES.reduce((s, [, v]) => s + v, 0);

const FUNDS = [
  ["General Fund", "$206.9M"],
  ["Sheriff Fund", "$114.1M"],
  ["Tourist Development", "$59.0M"],
  ["Transportation", "$30.7M"],
  ["Capital Projects", "$27.6M"],
  ["Solid Waste", "$40.7M"]
];

const barRow = (label, value, total, color) => {
  const pct = (value / total) * 100;
  return `<div class="bar-row">
    <div class="bar-label">${label}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div></div>
    <div class="bar-value">$${value.toFixed(1)}M<span>${pct.toFixed(0)}%</span></div>
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
  .stat-strip{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:.13in;
    margin:0 0 .22in;
  }
  .stat-card{
    padding:.14in .1in;
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
    margin:0 0 .12in;
    color:#003f28;
    font:800 11.5pt/1.2 Georgia, serif;
    padding-bottom:.05in;
    border-bottom:2px solid #d1be78;
  }
  .charts-row{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:.32in;
    margin:0 0 .22in;
  }
  .bar-row{
    display:grid;
    grid-template-columns:1.55in 1fr .68in;
    align-items:center;
    gap:.1in;
    margin:0 0 .1in;
  }
  .bar-label{
    color:#173229;
    font-size:7.9pt;
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
    font-size:8pt;
    font-weight:800;
  }
  .bar-value span{
    display:block;
    color:#68786f;
    font-size:6.6pt;
    font-weight:700;
  }
  .chart-total{
    margin-top:.06in;
    color:#68786f;
    font-size:7.3pt;
    font-style:italic;
  }
  .fund-strip{
    display:grid;
    grid-template-columns:repeat(6,1fr);
    gap:.1in;
    margin:0 0 .22in;
  }
  .fund-chip{
    padding:.1in .08in;
    border:1px solid #e4ebe7;
    border-radius:10px;
    background:#fbfcfa;
    text-align:center;
  }
  .fund-chip b{
    display:block;
    color:#003f28;
    font:800 10.5pt/1.1 Georgia, serif;
  }
  .fund-chip span{
    display:block;
    margin-top:.03in;
    color:#68786f;
    font-size:6.3pt;
    font-weight:700;
    letter-spacing:.02em;
    text-transform:uppercase;
    line-height:1.25;
  }
  .tax-example{
    display:flex;
    align-items:center;
    gap:.26in;
    padding:.18in .24in;
    border:1px solid #d1be78;
    border-radius:12px;
    background:#f9f8f2;
  }
  .tax-example b{
    flex:0 0 auto;
    color:#003f28;
    font:800 22pt/1 Georgia, serif;
  }
  .tax-example div p{
    margin:0;
    color:#33453c;
    font-size:8.4pt;
    line-height:1.42;
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
    <p class="intro">A one-page look at how Walton County plans to raise and spend money in Fiscal Year 2027 &mdash; the full detail behind these figures follows throughout this document.</p>

    <div class="stat-strip">
      <div class="stat-card"><b>$512.4M</b><span>Total Budget, All Funds</span></div>
      <div class="stat-card"><b>$345.2M</b><span>Net Operating Budget</span></div>
      <div class="stat-card"><b>3.4347</b><span>County Millage Rate</span></div>
      <div class="stat-card"><b>1,515</b><span>Budgeted FTE</span></div>
    </div>

    <div class="charts-row">
      <div>
        <h2>Where the Money Comes From</h2>
        ${REVENUE_SOURCES.map(([l, v]) => barRow(l, v, REVENUE_TOTAL, "#0b7741")).join("")}
        <p class="chart-total">$${REVENUE_TOTAL.toFixed(1)}M in direct revenue &mdash; excludes interfund transfers and other financing sources.</p>
      </div>
      <div>
        <h2>Where the Money Goes</h2>
        ${EXPENSE_CATEGORIES.map(([l, v]) => barRow(l, v, EXPENSE_TOTAL, "#003f28")).join("")}
        <p class="chart-total">$${EXPENSE_TOTAL.toFixed(1)}M in service delivery &mdash; excludes interfund transfers and the self-insurance fund.</p>
      </div>
    </div>

    <h2>Fund Highlights</h2>
    <div class="fund-strip">
      ${FUNDS.map(([l, v]) => `<div class="fund-chip"><b>${v}</b><span>${l}</span></div>`).join("")}
    </div>

    <div class="tax-example">
      <b>$687</b>
      <div>
        <p><strong>What a typical homeowner pays.</strong> On a $250,000 home with a $50,000 homestead exemption, the County&rsquo;s FY 2027 operating millage of 3.4347 generates approximately $687 in County property tax &mdash; one mill equals $1 for every $1,000 of taxable value.</p>
      </div>
    </div>

    <footer><span>FY 2027 Annual Budget</span><b>PAGE_A</b></footer>
  </section>
</body></html>`;

const startPage = Number(process.argv[3] || 15);
const outPath = process.argv[2] || "/private/tmp/budget-book-budget-in-brief.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html.replace("PAGE_A", startPage), { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
