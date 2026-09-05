import { chromium } from "playwright";

// New chapter: "Long-Term Outlook" -- closes the Financial Plan and
// Capital Program chapter (placed after the Debt Ledger, before the
// Back Cover). Addresses a GFOA Distinguished Budget Presentation
// scoring category this book had no dedicated synthesis chapter for.
//
// Every number here already exists elsewhere in this book and is
// reproduced, not recomputed from a new source: the FY22-FY29
// consolidated Fund Financial Ledger forecast, the FY2027-FY2031
// five-year Capital Improvement Plan trend, the Debt Ledger's payoff
// schedule and pay-as-you-go policy statement, the Statistical &
// Supplemental Information page's Census figures, and the Transmittal
// Letter's own "Looking Ahead" paragraph. The only net-new figures are
// two derived ratios computed directly from numbers already in the book
// (General Fund reserve as a share of General Fund spending, and a
// month-equivalent), and a 4-year countywide operating millage rate
// history (FY2024-FY2027) confirmed via public reporting (Walton County
// did not have a citable, confirmed FY2023 rate, so that year is
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
  h1.continued{ font-size:16pt; margin-top:0; }
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
  .chart{ display:flex; align-items:flex-end; gap:.18in; height:1in; padding:0 .1in; border-bottom:1.5px solid #003f28; }
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

const MILLAGE = [["FY2024", 3.6000], ["FY2025", 3.575], ["FY2026", 3.519], ["FY2027", 3.4347]];
const CIP = [["FY27", 71.3, true], ["FY28", 49.9, false], ["FY29", 39.1, false], ["FY30", 46.2, false], ["FY31", 35.3, false]];

const FORECAST_ROWS = [
  ["Total Revenue & Other Sources", "$476.6M", "$488.9M", "$488.5M", "$491.2M"],
  ["Total Expenditures & Other Uses", "$472.2M", "$488.9M", "$503.6M", "$518.7M"],
  ["Change in Fund Balance", "$4.4M", "$0", "&minus;$15.0M", "&minus;$27.5M", [false, false, true, true]],
  ["Estimated Ending Fund Balance", "$440.4M", "$431.8M", "$416.8M", "$389.3M"]
];

const page1 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Financial Overview</small>
    <h1>Long-Term Outlook</h1>
    <p class="intro">The chapters before this one detail Walton County's finances one year, one fund, or one project at a time. This closing chapter pulls the forward-looking signal already built into those chapters &mdash; the County's own multi-year forecast, five-year capital plan, and debt schedule &mdash; into one place, alongside the economic conditions driving them.</p>

    <h2>Economic Conditions Driving the Outlook</h2>
    <p class="body">Walton County's budget planning happens against a backdrop of sustained population and visitor growth, detailed further in the Statistical &amp; Supplemental Information section of this book.</p>
    <div class="stat-strip">
      <div class="stat-card"><b>+36.8%</b><span>Population Growth Since 2010</span></div>
      <div class="stat-card"><b>75,305</b><span>Current Population (Census ACS)</span></div>
      <div class="stat-card"><b>44.4</b><span>Median Age vs. 42.4 Statewide</span></div>
      <div class="stat-card"><b>+15.9%</b><span>FY2027 Tourist Development Fund Growth</span></div>
    </div>

    <h2>A Declining Operating Millage, Even as the County Grows</h2>
    <p class="body">The Board has reduced the countywide operating millage rate for four consecutive years, even as population, visitation, and service demand have all risen &mdash; a sign the tax base itself is growing faster than the rate needed to fund it.</p>
    <div class="chart-wrap">
      <div class="chart">${MILLAGE.map(([y, v]) => `<div class="bar-col"><div class="amt">${v.toFixed(4)}</div><div class="bar" style="height:${(v / 3.6 * 100).toFixed(0)}%"></div><div class="yr">${y}</div></div>`).join("")}</div>
    </div>
    <p class="trend">The countywide operating millage has fallen from 3.6000 mills in FY2024 to a tentative 3.4347 mills in FY2027 &mdash; a reduction of 4.6% &mdash; while the tentative budget adds a net 15 FTE and proposes a $71.3M capital program.</p>

    <h2>The Multi-Year Financial Forecast</h2>
    <p class="body">The consolidated Fund Financial Ledger extends two fiscal years beyond the tentative budget, while the online fund forecast and five-year Capital Improvement Plan carry the planning view through FY2031.</p>
    <div class="fcast-table">
      <div class="frow head"><div>Consolidated, All Funds</div><div>FY2026 Budget</div><div>FY2027 Tentative</div><div>FY2028 Proj.</div><div>FY2029 Proj.</div></div>
      ${FORECAST_ROWS.map((r) => { const neg = r[5] || [false, false, false, false]; return `<div class="frow"><div>${r[0]}</div><div><b${neg[0] ? " class=\"neg\"" : ""}>${r[1]}</b></div><div><b${neg[1] ? " class=\"neg\"" : ""}>${r[2]}</b></div><div><b${neg[2] ? " class=\"neg\"" : ""}>${r[3]}</b></div><div><b${neg[3] ? " class=\"neg\"" : ""}>${r[4]}</b></div></div>`; }).join("")}
    </div>
    <p class="warn"><b>A Trend Worth Watching</b>After holding flat in FY2027, the countywide fund balance is projected to decline by $15.0M in FY2028 and a further $27.5M in FY2029 as capital spending and transfers outpace revenue growth in the out-years. This is a projection under current assumptions, not a funding shortfall today &mdash; but it is the reason the Chief Financial Officer's transmittal letter calls for "careful, ongoing monitoring" of revenue sources going into FY2027.</p>

    <footer><span>FY 2027 Annual Budget</span><b>${startPage}</b></footer>
  </section>
`;

const page2 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h1 class="continued">Long-Term Outlook <span class="sub">(continued)</span></h1>

    <h2 style="margin-top:.08in;">Reserves: How Much Cushion Does the County Have?</h2>
    <p class="body">The General Fund &mdash; the County's primary, least-restricted operating fund &mdash; is the most meaningful measure of financial cushion, since most of the $431.8M countywide ending balance sits in funds legally restricted to a specific purpose (for example, $166.5M in the Tourist Development Fund, usable only for tourism-related purposes).</p>
    <div class="two-col">
      <div class="info-card"><b>General Fund Reserve Ratio</b><span>$81.9M in estimated FY2027 General Fund ending balance is equal to 39.6% of the Fund's $206.9M in total expenditures and other uses &mdash; roughly 4.75 months of General Fund operating costs held in reserve.</span></div>
      <div class="info-card"><b>Countywide Balance Is Mostly Restricted</b><span>Of the $431.8M countywide estimated ending balance, the largest single share sits in the Tourist Development Fund ($166.5M) and Transportation Fund ($41.1M) &mdash; both legally restricted and not available to fund general operations.</span></div>
    </div>

    <h2>Debt: Minimal, and Scheduled to End in FY2030</h2>
    <p class="body">Walton County's only outstanding long-term debt is $29.5M across two notes, both repaid exclusively from the half-cent sales tax rather than property taxes, and both scheduled to be fully repaid by FY2030 &mdash; see the Debt Ledger for the complete payment schedule.</p>
    <div class="stat-strip">
      <div class="stat-card"><b>$29.5M</b><span>Total Debt Issued</span></div>
      <div class="stat-card"><b>$9.1M</b><span>Remaining Debt Service</span></div>
      <div class="stat-card"><b>$2.51M</b><span>FY2027 Debt Service</span></div>
      <div class="stat-card"><b>FY2030</b><span>Scheduled Payoff</span></div>
    </div>
    <p class="body">This is a deliberate policy choice, not a lack of options: Walton County funds the large majority of its capital program pay-as-you-go from current revenues and legally restricted funding sources, preserving borrowing capacity for a future need rather than committing it now.</p>

    <h2>The Five-Year Capital Outlook</h2>
    <p class="cip-chart-label" style="font-size:7pt;color:#68786f;margin:0 0 .04in;">FY2027&ndash;FY2031 tentative plan, from the Capital Improvement Plan chapter</p>
    <div class="cip-chart">${CIP.map(([y, v, peak]) => `<div class="cip-bar-col"><div class="amt">$${v.toFixed(1)}M</div><div class="cip-bar${peak ? " peak" : ""}" style="height:${(v / 71.3 * 100).toFixed(0)}%"></div><div class="yr">${y}</div></div>`).join("")}</div>
    <p class="trend">FY2027 is the peak year of the tentative five-year plan at $71.3M; by FY2031 the plan steps down 51% to $35.3M as the current wave of road, drainage, and public safety facility projects completes.</p>

    <h2>Risks to Monitor</h2>
    <div class="quote-box">
      <p>"As we move into Fiscal Year 2027, we remain mindful of the factors that could affect County operations in the year ahead, including legislative changes to sales and property tax policy and the broader uncertainty of economic conditions. Careful, ongoing monitoring of these revenue sources will remain essential to keeping the budget balanced."</p>
      <cite>Melissa Thomason, Chief Financial Officer &mdash; Transmittal Letter</cite>
    </div>
    <p class="footnote">The draft Walton County Strategic Plan 2027&ndash;2032 remains subject to Board action. See the Community Priorities and Organizational Challenges chapter for its six Strategic Priority Areas and how the FY2027 tentative budget supports each one.</p>

    <footer><span>FY 2027 Annual Budget</span><b>${startPage + 1}</b></footer>
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
