import { chromium } from "playwright";

// New chapter: "Long-Term Outlook" -- closes the Financial Plan and
// Capital Program chapter (placed after the Debt Ledger, before the
// Back Cover). Addresses a GFOA Distinguished Budget Presentation
// scoring category this book had no dedicated synthesis chapter for.
//
// Every number here already exists elsewhere in this book and is
// reproduced, not recomputed from a new source: the FY22-FY29
// consolidated Fund Financial Ledger forecast, the FY 2027-FY 2031
// five-year Capital Improvement Plan trend, the Debt Ledger's payoff
// schedule and pay-as-you-go policy statement, the Statistical &
// Supplemental Information page's Census figures, and the Transmittal
// Letter's own "Looking Ahead" paragraph. The only net-new figures are
// two derived ratios computed directly from numbers already in the book
// (General Fund reserve as a share of General Fund spending, and a
// month-equivalent), and a 4-year countywide operating millage rate
// history (FY 2024-FY 2027) confirmed via public reporting (Walton County
// did not have a citable, confirmed FY 2023 rate, so that year is
// intentionally omitted rather than guessed).

const sharedCss = `
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
    margin-top:.22in;
    color:#b89521;
    font-size:8pt;
    font-weight:900;
    letter-spacing:.14em;
    text-transform:uppercase;
  }
  h1{
    margin:8px 0 .08in;
    color:#003f28;
    font:800 22pt/1.05 Georgia, "Times New Roman", serif;
    letter-spacing:-.02em;
  }
  h1.continued{ font-size:16pt; margin-top:.4in; }
  .outlook-continuation h2{ margin-top:.08in; }
  h1 span.sub{ color:#68786f; font-size:9.5pt; font-weight:400; }
  p.intro{
    max-width:7.3in;
    margin:0 0 .16in;
    color:#33453c;
    font-size:8.8pt;
    line-height:1.42;
  }
  h2{
    margin:.14in 0 .06in;
    color:#003f28;
    font:800 11.5pt/1.2 Georgia, serif;
    padding-bottom:.05in;
    border-bottom:2px solid #d1be78;
  }
  h2:first-of-type{ margin-top:.05in; }
  p.body{
    margin:0 0 .1in;
    color:#33453c;
    font-size:8.2pt;
    line-height:1.42;
  }
  .stat-strip{ display:grid; grid-template-columns:repeat(4,1fr); gap:.12in; margin:.06in 0 .12in; }
  .stat-card{ padding:.11in .1in; border-radius:10px; background:#003f28; text-align:center; }
  .stat-card b{ display:block; color:#fff; font:800 13pt/1.1 Georgia, serif; }
  .stat-card span{ display:block; margin-top:.03in; color:#e7c95f; font-size:6.1pt; font-weight:800; letter-spacing:.02em; text-transform:uppercase; line-height:1.25; }
  .chart-wrap{ margin:.08in 0 .06in; }
  .chart{ display:flex; align-items:flex-end; justify-content:center; gap:.5in; height:1in; padding:0 .1in; border-bottom:1.5px solid #003f28; }
  .bar-col{ flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; max-width:1.1in; }
  .bar-col .amt{ font-size:6.6pt; font-weight:800; color:#003f28; margin-bottom:.03in; }
  .bar{ width:55%; border-radius:3px 3px 0 0; background:#0b7741; }
  .bar-col .yr{ margin-top:.05in; font-size:6.4pt; color:#68786f; font-weight:700; }
  .cip-chart{ display:flex; align-items:flex-end; gap:.1in; height:.85in; padding:0 .1in; border-bottom:1.5px solid #003f28; }
  .cip-bar-col{ flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; }
  .cip-bar-col .amt{ font-size:6.2pt; font-weight:800; color:#003f28; margin-bottom:.02in; }
  .cip-bar{ width:60%; border-radius:3px 3px 0 0; background:#c9d6cd; }
  .cip-bar.peak{ background:#0b7741; }
  .cip-bar-col .yr{ margin-top:.04in; font-size:6pt; color:#68786f; font-weight:700; }
  p.trend{
    margin:.08in 0;
    padding:.1in .14in;
    background:#f9f8f2;
    border:1px solid #d1be78;
    border-radius:9px;
    color:#173229;
    font-size:8pt;
    font-weight:700;
    line-height:1.4;
  }
  p.warn{
    margin:.08in 0;
    padding:.1in .14in;
    background:#fbf3ee;
    border-left:4px solid #a24b1e;
    border-radius:0 9px 9px 0;
    color:#173229;
    font-size:7.8pt;
    line-height:1.42;
  }
  p.warn b{ display:block; color:#a24b1e; font-size:6.6pt; font-weight:800; text-transform:uppercase; letter-spacing:.03em; margin-bottom:.03in; }
  .fcast-table{ border-top:2px solid #d1be78; margin-top:.06in; font-size:7pt; }
  .frow{ display:grid; grid-template-columns:1.9in repeat(4,1fr); gap:.06in; align-items:center; padding:.055in 0; border-bottom:1px solid #eef1ee; text-align:right; }
  .frow.head{ border-bottom:1px solid #003f28; color:#68786f; font-size:6.1pt; font-weight:800; letter-spacing:.01em; text-transform:uppercase; }
  .frow div:first-child{ text-align:left; color:#173229; font-weight:700; }
  .frow.head div:first-child{ color:#68786f; font-weight:800; }
  .frow b{ color:#003f28; font-variant-numeric:tabular-nums; }
  .frow b.neg{ color:#a24b1e; }
  .two-col{ display:grid; grid-template-columns:1fr 1fr; gap:.24in; margin:.06in 0 .1in; }
  .info-card{ padding:.1in .12in; border:1px solid #e4ebe7; border-radius:9px; background:#fbfcfa; }
  .info-card b{ display:block; color:#003f28; font:800 7.8pt Georgia, serif; margin-bottom:.02in; }
  .info-card span{ display:block; color:#33453c; font-size:6.9pt; line-height:1.36; }
  .outlook-continuation h2{ margin:.055in 0 .04in; }
  .outlook-continuation p.body{ margin-bottom:.065in; font-size:7.8pt; line-height:1.32; }
  .outlook-continuation .two-col{ gap:.2in; margin:.04in 0 .065in; }
  .outlook-continuation .info-card{ padding:.075in .1in; }
  .outlook-continuation .info-card span{ font-size:6.45pt; line-height:1.29; }
  .outlook-continuation p.warn{ margin:.05in 0; padding:.075in .12in; font-size:7.35pt; line-height:1.32; }
  .outlook-continuation .stat-strip{ margin:.04in 0 .075in; }
  .outlook-continuation .stat-card{ padding:.08in .08in; }
  .outlook-continuation .cip-chart{ height:.75in; }
  .outlook-continuation p.trend{ margin:.05in 0; padding:.075in .12in; font-size:7.5pt; line-height:1.32; }
  .quote-box{ margin:.08in 0; padding:.12in .16in; background:#003f28; border-radius:9px; }
  .quote-box p{ margin:0; color:#e4ede8; font-size:7.6pt; font-style:italic; line-height:1.45; }
  .quote-box cite{ display:block; margin-top:.06in; color:#e7c95f; font-size:6.4pt; font-weight:800; text-transform:uppercase; letter-spacing:.03em; font-style:normal; }
  p.footnote{
    margin:.06in 0 0;
    color:#68786f;
    font-size:6.9pt;
    line-height:1.4;
    font-style:italic;
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
`;

const startPage = Number(process.argv[3] || 108);

const MILLAGE = [["FY 2024", 3.6000], ["FY 2025", 3.575], ["FY 2026", 3.519], ["FY 2027", 3.2500]];
const CIP = [["FY27", 43.8, true], ["FY28", 42.7, false], ["FY29", 36.1, false], ["FY30", 43.2, false], ["FY31", 35.3, false]];

const FORECAST_ROWS = [
  ["Total Revenue & Other Sources", "$476.3M", "$467.1M", "$488.5M", "$491.2M"],
  ["Total Expenditures & Other Uses", "$468.3M", "$488.9M", "$503.6M", "$518.7M"],
  ["Change in Fund Balance", "$7.9M", "&minus;$21.8M", "&minus;$15.0M", "&minus;$27.5M", [false, true, true, true]],
  ["Estimated Ending Fund Balance", "$443.9M", "$410.0M", "$395.0M", "$367.5M"]
];

const page1 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Financial Overview</small>
    <h1>Long-Term Outlook</h1>
    <p class="intro">This chapter brings together Walton County's multi-year forecast, five-year capital plan, debt schedule, and the economic conditions that affect them.</p>

    <h2>Economic Conditions Driving the Outlook</h2>
    <p class="body">Walton County's budget planning happens against a backdrop of sustained population and visitor growth, detailed further in the Statistical &amp; Supplemental Information section of this book.</p>
    <div class="stat-strip">
      <div class="stat-card"><b>+20.2%</b><span>Population Growth, 2020–2025 (BEBR)</span></div>
      <div class="stat-card"><b>90,547</b><span>Population Estimate (BEBR, Apr. 1, 2025)</span></div>
      <div class="stat-card"><b>44.4</b><span>Median Age vs. 42.4 Statewide (2018–2022 ACS)</span></div>
      <div class="stat-card"><b>+15.9%</b><span>FY 2027 Tourist Development Fund Growth</span></div>
    </div>

    <h2>A Declining Operating Millage, Even as the County Grows</h2>
    <p class="body">The Board reduced the countywide operating millage in each of the last three budget cycles, from 3.6000 mills in FY 2024 to 3.2500 mills in FY 2027. Taxable-value growth helped offset the lower rate, but recurring revenue does not cover all adopted FY 2027 expenditures and transfers.</p>
    <div class="chart-wrap">
      <div class="chart">${MILLAGE.map(([y, v]) => `<div class="bar-col"><div class="amt">${v.toFixed(4)}</div><div class="bar" style="height:${(v / 3.6 * 100).toFixed(0)}%"></div><div class="yr">${y}</div></div>`).join("")}</div>
    </div>
    <p class="trend">The countywide operating millage has fallen from 3.6000 mills in FY 2024 to a final 3.2500 mills in FY 2027 &mdash; a reduction of 9.7% &mdash; while the final budget adds a net 15 FTE and funds $43.8M in capital projects. Reducing the tentative rate from 3.4347 to 3.2500 lowered projected property-tax revenue by $8.6M; the Board appropriated the same amount of General Fund balance to keep the expenditure plan unchanged.</p>

    <h2>The Multi-Year Financial Forecast</h2>
    <p class="body">The Fund Financial Ledger presents history through the FY 2027 final budget. The online fund forecast extends through FY 2029, while the five-year Capital Improvement Plan carries the capital planning view through FY 2031.</p>
    <div class="fcast-table">
      <div class="frow head"><div>Consolidated, All Funds</div><div>FY 2026 Budget</div><div>FY 2027 Final</div><div>FY 2028 Proj.</div><div>FY 2029 Proj.</div></div>
      ${FORECAST_ROWS.map((r) => { const neg = r[5] || [false, false, false, false]; return `<div class="frow"><div>${r[0]}</div><div><b${neg[0] ? " class=\"neg\"" : ""}>${r[1]}</b></div><div><b${neg[1] ? " class=\"neg\"" : ""}>${r[2]}</b></div><div><b${neg[2] ? " class=\"neg\"" : ""}>${r[3]}</b></div><div><b${neg[3] ? " class=\"neg\"" : ""}>${r[4]}</b></div></div>`; }).join("")}
    </div>
    <p class="warn"><b>A Trend Worth Watching</b>The consolidated budget plans a $21.8M countywide use of fund balance in FY 2027 across operating, capital, and restricted funds. The millage decision accounts for $8.6M of the General Fund appropriation. Countywide fund balance is projected to decline by another $15.0M in FY 2028 and $27.5M in FY 2029 as capital spending and transfers outpace revenue growth. These are projections under current assumptions, not current-year funding shortfalls.</p>

    <footer><span>FY 2027 Final Budget</span><b>${startPage}</b></footer>
  </section>
`;

const page2 = `
  <section class="outlook-continuation">
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h1 class="continued">Long-Term Outlook <span class="sub">(continued)</span></h1>

    <h2 style="margin-top:.08in;">Reserves: How Much Cushion Does the County Have?</h2>
    <p class="body">The General Fund is the County's primary, least-restricted operating fund. Countywide balance is not interchangeable: $166.5M in the Tourist Development Fund and $41.1M in the Transportation Fund are legally restricted, while the $3.668M self-insurance reserve exceeds its separate 60-day requirement by $693,946.</p>
    <div class="two-col">
      <div class="info-card"><b>Audited FY 2025 GFOA Comparison</b><span>GFOA recommends at least two months of unrestricted budgetary General Fund operating revenues or expenditures. The FY 2025 ACFR reports $58.394M as <i>unassigned</i> General Fund balance and $185.853M of expenditures and other uses. Two months of that audited base is $30.976M. The unassigned balance equals about 3.77 months and exceeds the illustrative minimum by $27.418M. Using unassigned balance is conservative; committed, assigned, and unassigned together are the broader unrestricted categories.</span></div>
      <div class="info-card"><b>FY 2027 County Planning Benchmark</b><span>The Board has not adopted a numeric minimum. Management informally uses six months of the full FY 2027 General Fund budget, including interfund transfers and other uses: $103.4M. The projected $73.3M total ending balance equals 35.5%, or about 4.25 months, and is $30.1M below that benchmark. Because the FY 2027 projection is not classified as restricted, committed, assigned, and unassigned, it should not be presented as a direct update of the audited FY 2025 unassigned balance.</span></div>
    </div>

    <h2>Recurring Commitments and Annual Monitoring</h2>
    <div class="two-col">
      <div class="info-card"><b>What FY 2027 Commits</b><span>Countywide personnel cost rises $8.49M. Drivers include a net 15-FTE increase, a 3% cost-of-living adjustment ($1.19M Board wage impact), a 5% health-premium increase ($423,319 County impact), and other pay and benefit changes. These costs, contracts, and operation of new or expanded assets continue unless changed through a later budget.</span></div>
      <div class="info-card"><b>What Remains to Be Estimated</b><span>Capital ledgers identify whether operating effects are absorbed, immaterial, ongoing, or pending. Maintenance and operating costs marked pending &mdash; especially for future phases or newly selected projects &mdash; must be estimated before later funding decisions.</span></div>
    </div>

    <p class="warn"><b>Deferred and Contingent Items</b>No major project in the funded $43.8M FY 2027 capital program was postponed. Outside that total are $15.3M of grant-dependent projects, $2.0M of Sheriff projects funded separately, and $10.25M of prior-funded tourism work that remains active. A $600,000 recreational-plat allocation and $300,000 sidewalk allocation await project selection. Future phases and costs shown as pending are not assumed funded.</p>

    <h2>Debt: Minimal, and Scheduled to End in FY 2030</h2>
    <p class="body">Walton County's only long-term debt consists of two notes totaling $29.5M when issued, with $9.1M in remaining debt service, including principal and interest. FY 2027 payments are budgeted from the infrastructure portion of the County's one-cent Small County Surtax rather than property taxes, and the schedule ends in FY 2030 &mdash; see the Debt Ledger for the payment schedule and terminology.</p>
    <div class="stat-strip">
      <div class="stat-card"><b>$29.5M</b><span>Total Debt Issued</span></div>
      <div class="stat-card"><b>$9.1M</b><span>Remaining Debt Service</span></div>
      <div class="stat-card"><b>$2.51M</b><span>FY 2027 Debt Service</span></div>
      <div class="stat-card"><b>FY 2030</b><span>Scheduled Payoff</span></div>
    </div>

    <h2>The Five-Year Capital Outlook</h2>
    <p class="cip-chart-label" style="font-size:7pt;color:#68786f;margin:0 0 .04in;">FY 2027&ndash;FY 2031 final plan, from the Capital Improvement Plan chapter</p>
    <div class="cip-chart">${CIP.map(([y, v, peak]) => `<div class="cip-bar-col"><div class="amt">$${v.toFixed(1)}M</div><div class="cip-bar${peak ? " peak" : ""}" style="height:${(v / 43.8 * 100).toFixed(0)}%"></div><div class="yr">${y}</div></div>`).join("")}</div>
    <p class="trend">The plan moves from $43.8M in FY 2027 to $35.3M in FY 2031, with a temporary rise to $43.2M in FY 2030. These projected years do not include grant-funded projects or prior-year projects that may be rebudgeted, which are excluded throughout.</p>

    <p class="warn"><b>Sensitivity and Forecast Accountability</b>The base forecast uses the published revenue assumptions and assumes no specific Amendment 3 reduction. Downside triggers include tax-law changes, weaker sales or tourism activity, grant delays, claims, capital timing, and hiring results. If conditions change, OMB will reforecast service, capital, reserve, and millage options. Beginning with FY 2027, OMB will compare actual revenue, expenditures, capital timing, and ending balances with the forecast and report material variances in the next cycle; the current book has no historical forecast-accuracy series.</p>
    <p class="footnote">Sources: GFOA, <i>Fund Balance Guidelines for the General Fund</i> (2015); Walton County FY 2025 ACFR, Management's Discussion and Analysis and governmental fund-balance schedules.</p>

    <footer><span>FY 2027 Final Budget</span><b>${startPage + 1}</b></footer>
  </section>
`;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Long-Term Outlook</title>
<style>${sharedCss}</style></head>
<body>${page1}${page2}</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-long-term-outlook.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
