import { capturePublicationHtml, assertPublicationFits } from "./publication-print.mjs";
import { chromium } from "playwright";
import { newPage } from "./readers-guide.mjs"; // in-text page references follow the Reader's Guide numbering
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

// The outlook summarizes the live site's six-fund Forecast Explorer and
// broader CIP inventory. Its scenario balances have a different scope and
// basis from the countywide Fund Financial Ledger; keep that distinction explicit.
const outlook = JSON.parse(readFileSync(new URL("../data/forecast-outlook-snapshot.json", import.meta.url), "utf8"));
assert.equal(outlook.funds.length, 6);
assert.equal(outlook.years.length, 5);
outlook.funds.forEach(fund => assert.equal(fund.endingBalances.length, outlook.years.length));
const millions = value => "$" + (value / 1e6).toFixed(1) + "M";

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
  .frow{ display:grid; grid-template-columns:1.9in repeat(5,1fr); gap:.06in; align-items:center; padding:.055in 0; border-bottom:1px solid #eef1ee; text-align:right; }
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
// Funded five-year capital plan, matching the Capital Improvement Plan chapter
// (build-capital-improvement-plan.mjs) so the book shows one capital program.
const CAPITAL_PLAN = [43.8, 42.7, 36.1, 43.2, 35.3];
assert.equal(CAPITAL_PLAN[0], outlook.fundedFy2027CipMillions);
const CIP = outlook.years.map((year, i) => ["FY" + String(year).slice(2), CAPITAL_PLAN[i], i === 0]);

const FORECAST_ROWS = outlook.funds.map(fund => [fund.name, ...fund.endingBalances.map(millions)]);

const page1 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Financial Overview</small>
    <h1>Long-Term Outlook</h1>
    <p class="intro">This chapter brings together Walton County's multi-year forecast, five-year capital plan, debt schedule, and the economic conditions that affect them.</p>

    <h2>Economic Conditions Driving the Outlook</h2>
    <p class="body">Walton County's budget planning happens against a backdrop of sustained population and visitor growth, detailed further in the Statistical &amp; Supplemental Information section of this book.</p>
    <div class="stat-strip" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card"><b>+20.2%</b><span>Population Growth, 2020–2025 (BEBR)</span></div>
      <div class="stat-card"><b>90,547</b><span>Population Estimate (BEBR, Apr. 1, 2025)</span></div>
      <div class="stat-card"><b>4.5M</b><span>Annual visitors, 2025 tourism report</span></div>
    </div>

    <h2>A Declining Operating Millage, Even as the County Grows</h2>
    <p class="body">The Board reduced the countywide operating millage in each of the last three budget cycles, from 3.6000 mills in FY 2024 to 3.2500 mills in FY 2027. Current-year sources and accumulated fund balance together support the adopted plan. The adopted plan includes operating expenses, capital investments, and transfers between funds.</p>
    <div class="chart-wrap">
      <div class="chart">${MILLAGE.map(([y, v]) => `<div class="bar-col"><div class="amt">${v.toFixed(4)}</div><div class="bar" style="height:${(v / 3.6 * 100).toFixed(0)}%"></div><div class="yr">${y}</div></div>`).join("")}</div>
    </div>
    <p class="trend">The countywide operating millage has fallen from 3.6000 mills in FY 2024 to a final 3.2500 mills in FY 2027 &mdash; a reduction of 9.7% &mdash; while the final budget adds a net 15 FTE and funds $43.8M in capital projects. The tentative-hearing comparison estimated an $8.6M revenue effect from lowering the rate; the final funding schedule budgets $8.0M of General Fund balance brought forward after all revenue updates.</p>

    <h2>The Multi-Year Financial Forecast</h2>
    <p class="body">The site's Forecast Explorer projects six major funds through FY 2031. The table below shows each fund's estimated year-end balance under that scenario. Its coverage and assumptions differ from the countywide Fund Financial Ledger.</p>
    <div class="fcast-table">
      <div class="frow head"><div>Estimated Ending Balance</div>${outlook.years.map(year => `<div>FY ${year}</div>`).join("")}</div>
      ${FORECAST_ROWS.map(r => `<div class="frow"><div>${r[0]}</div>${r.slice(1).map(amount => `<div><b>${amount}</b></div>`).join("")}</div>`).join("")}
    </div>
    <p class="body">Amounts are rounded to $0.1 million; FY 2027 is the site scenario baseline. The General Fund starts with its audited unassigned balance; other funds use total balances, including restricted resources. Tourism uses a $60.3M revenue base drawn from recent actual collections.</p>
    <p class="warn"><b>Different Funds Face Different Pressures</b>General Fund and Transportation balances recover after FY 2027 under the site's growth and capital-spending assumptions. Tourism begins using fund balance in FY 2029 because the forecast assumes spending will grow faster than revenue. These are planning assumptions, not historical trends: the forecast assumes core tourism revenue grows about 1% a year and most operating costs about 3%, which produces a $2.2M annual gap by FY 2031. Sheriff and Capital Projects balances depend on future transfers or financing being provided.</p>

    <footer><span>FY 2027 Final Budget</span><b>${startPage}</b></footer>
  </section>
`;

const page2 = `
  <section class="outlook-continuation">
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h1 class="continued">Long-Term Outlook <span class="sub">(continued)</span></h1>

    <h2 style="margin-top:.08in;">Future Reserve Pressure</h2>
    <p class="body">The General Fund is projected to end FY 2031 at $57.3M, recovering from $50.3M after FY 2027 but remaining below its $58.4M opening balance. Tourism peaks at $168.4M in FY 2028 before declining to $164.6M in FY 2031. Fund balances include different restrictions; see Reserve Position on pages ${newPage(41)}&ndash;${newPage(41.5)} for reserve targets.</p>

    <h2>Assumptions Behind the Forecast</h2>
    <p class="body">The growth rates below are planning assumptions chosen for the forecast. They are not historical growth rates, and actual results will differ.</p>
    <div class="two-col">
      <div class="info-card"><b>General Fund and Transportation</b><span>The forecast assumes General Fund revenue grows 1% and expenses 0.5% a year, with line-specific exceptions. It assumes Transportation expenses grow 2% and the shared surtax transfer 2.5% a year. Both forecasts reduce future capital spending to avoid repeating the FY 2027 use of carried-forward balances.</span></div>
      <div class="info-card"><b>Tourist Development</b><span>The site starts tourism revenue at recent collections of $60.3M, compared with the $59.0M adopted revenue budget. The forecast assumes core tourism revenue grows 1% a year and most expense lines 3%; selected items, including beach renourishment, are held flat.</span></div>
      <div class="info-card"><b>Sheriff and Capital Projects</b><span>The Sheriff transfer is calculated to support projected expenses after other revenues. Capital Projects spending follows the CIP and the model supplies matching financing. Future budgets must identify and approve funding in the sending funds.</span></div>
      <div class="info-card"><b>Solid Waste</b><span>The forecast assumes modest annual gains, reaching $52.1M in FY 2031. Actual results depend on revenue growth, service costs, and the transfers the fund provides to other County funds.</span></div>
    </div>

    <h2>Recurring Commitments and Annual Monitoring</h2>
    <div class="two-col">
      <div class="info-card"><b>What FY 2027 Commits</b><span>Countywide personnel cost rises $8.54M, with a net 15-FTE increase. The change includes staffing, salaries, health insurance, retirement, and other employer costs. Personnel costs, contracts, and operation of new or expanded assets continue unless changed through a later budget.</span></div>
      <div class="info-card"><b>What Remains to Be Estimated</b><span>Capital ledgers identify whether operating effects are absorbed, immaterial, ongoing, or pending. Maintenance and operating costs marked pending &mdash; especially for future phases or newly selected projects &mdash; must be estimated before later funding decisions.</span></div>
    </div>

    <p class="warn"><b>Deferred and Contingent Items</b>No project in the $43.8M funded FY 2027 capital program was deferred. Three groups of projects are tracked outside that total: $15.3M that will proceed only if grants are awarded, $2.0M budgeted by the Sheriff's Office, and $10.25M in tourism projects funded in prior years and still under way. A $600,000 recreation allocation and a $300,000 sidewalk allocation will be assigned to specific projects during the year. Future project phases are not funded in this budget.</p>

    <h2>Debt Payoff and Future Commitments</h2>
    <p class="body">The County's existing debt is scheduled to be paid off in FY 2030, reducing future debt-service commitments. See the Debt Ledger on page ${newPage(40)} for payment amounts and funding details.</p>

    <h2>The Five-Year Capital Outlook</h2>
    <p class="cip-chart-label" style="font-size:7pt;color:#68786f;margin:0 0 .04in;">FY 2027&ndash;FY 2031 funded capital plan</p>
    <div class="cip-chart">${CIP.map(([y, v, peak]) => `<div class="cip-bar-col"><div class="amt">$${v.toFixed(1)}M</div><div class="cip-bar${peak ? " peak" : ""}" style="height:${(v / Math.max(...CAPITAL_PLAN) * 100).toFixed(0)}%"></div><div class="yr">${y}</div></div>`).join("")}</div>
    <p class="trend">The funded five-year plan moves from $43.8M in FY 2027 to $35.3M in FY 2031, with a temporary rise to $43.2M in FY 2030 as major facility and infrastructure phases are scheduled. The $51.1M FY 2027 capital budget adds vehicles, machinery, and equipment to the $43.8M in funded projects. See the Capital Improvement Plan for project detail.</p>

    <p class="warn"><b>Forecast Risks and Annual Updates</b>The forecast assumes continued revenue growth, controlled spending, and transfers between funds at planned levels. Changes in state tax law, slower sales or tourism activity, delayed grants, insurance claims, or new operating costs could change these results. The County updates the forecast each year with actual results before relying on projected balances for new commitments.</p>

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
await assertPublicationFits(page);
await capturePublicationHtml(page, outPath);
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, tagged: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
