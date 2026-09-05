import { chromium } from "playwright";

// Builds the FY 2027 Budget Book's "Budget Change Summary" as its own
// multi-page PDF. Content is the real FY2026-vs-FY2027 comparison from
// the live site's Consolidated Budget Changes table (assets/budget-
// data.js's renderConsolidatedBudgetChangesTable), verified against the
// live Google Sheet + Supabase data sources rather than retyped from a
// flawed raw print capture (which had lost several department names).
// The Opioid Settlement Year 4 grant is folded into Statutory & Other
// Agency Funding under Independent Agencies (matching the Independent
// Agencies Ledger), not broken out as its own "Human Services" line.

const STATS = [
  ["$345.2M", "FY2027 Tentative Budget"],
  ["+$17.3M", "Net Dollar Change"],
  ["+5.3%", "Net Percent Change"],
  ["+$5.0M", "Largest Increase: Sheriff Capital"]
];

const row = ([name, fy26, fy27, change, pct], rowClass) => {
  const isDown = change.trim().startsWith("-");
  const cls = rowClass ? ` ${rowClass}` : "";
  return `<div class="dept-row${cls}"><div class="dept-name">${name}</div><div class="num">${fy26}</div><div class="num">${fy27}</div><div class="num change${isDown ? " is-down" : ""}">${change}</div><div class="num pct${isDown ? " is-down" : ""}">${pct}</div></div>`;
};

const tableHead = `<div class="dept-row head"><div class="dept-name">Department</div><div class="num">FY 2026 Budget</div><div class="num">FY 2027 Budget</div><div class="num">Change</div><div class="num">%</div></div>`;

const CONSTITUTIONAL = [
  ["Board of County Commissioners", "$11,340,758", "$11,086,280", "-$254,478", "-2.2%"],
  ["Clerk of Court", "$5,984,728", "$6,871,175", "+$886,447", "+14.8%"],
  ["Property Appraiser", "$4,829,596", "$4,954,338", "+$124,742", "+2.6%"],
  ["Supervisor of Elections", "$1,615,107", "$1,663,865", "+$48,758", "+3.0%"],
  ["Tax Collector", "$7,900,000", "$8,500,000", "+$600,000", "+7.6%"],
  ["Walton County Sheriff's Office", "$114,116,228", "$114,116,228", "$0", "+0.0%"]
];
const CONSTITUTIONAL_TOTAL = ["Total Constitutional Officers", "$145,786,417", "$147,191,886", "+$1,405,469", "+1.0%"];

const INDEPENDENT = [
  ["Circuit Court", "$260,511", "$261,493", "+$982", "+0.4%"],
  ["County Court", "$69,956", "$70,056", "+$100", "+0.1%"],
  ["Court Innovations", "$50,000", "$43,109", "-$6,891", "-13.8%"],
  ["Court Technology - Court Administration", "$93,758", "$185,436", "+$91,678", "+97.8%"],
  ["Medical Examiner", "$1,351,698", "$881,930", "-$469,768", "-34.8%"],
  ["Non-Profit Funding Program", "$477,820", "$450,000", "-$27,820", "-5.8%"],
  ["Public Defender", "$152,439", "$290,833", "+$138,394", "+90.8%"],
  ["South Walton Fire", "$919,693", "$947,284", "+$27,591", "+3.0%"],
  ["State Attorney", "$260,633", "$297,111", "+$36,478", "+14.0%"],
  ["Statutory & Other", "$3,109,643", "$3,502,844", "+$393,201", "+12.6%"]
];
const INDEPENDENT_TOTAL = ["Total Independent Agencies", "$6,746,151", "$6,930,096", "+$183,945", "+2.7%"];

const BOARD_DEPTS = [
  ["Tourism Administration", "$27,447,176", "$29,673,729", "+$2,226,553", "+8.1%"],
  ["Environmental Services", "$23,695,761", "$23,514,014", "-$181,747", "-0.8%"],
  ["Public Works", "$20,850,672", "$20,826,000", "-$24,672", "-0.1%"],
  ["Beach Operations", "$12,971,943", "$16,082,721", "+$3,110,778", "+24.0%"],
  ["County Administration Offices", "$10,488,035", "$10,887,378", "+$399,343", "+3.8%"],
  ["Building Construction & Maintenance", "$8,639,168", "$8,596,305", "-$42,863", "-0.5%"],
  ["Planning", "$6,570,086", "$6,839,111", "+$269,025", "+4.1%"],
  ["Code Compliance", "$4,449,159", "$4,811,854", "+$362,695", "+8.2%"],
  ["Building", "$4,035,000", "$4,000,000", "-$35,000", "-0.9%"],
  ["Parks & Recreation", "$2,919,737", "$2,972,948", "+$53,211", "+1.8%"],
  ["Engineering Department", "$2,876,106", "$2,798,118", "-$77,988", "-2.7%"],
  ["Office of the County Attorney", "$1,993,475", "$1,802,925", "-$190,550", "-9.6%"],
  ["Office of Management and Budget", "$1,374,708", "$1,075,026", "-$299,682", "-21.8%"],
  ["Purchasing", "$1,033,795", "$1,026,499", "-$7,296", "-0.7%"],
  ["Emergency Management", "$804,151", "$887,455", "+$83,304", "+10.4%"]
];
const BOARD_TOTAL = ["Total Board Department Operating & Personnel", "$130,148,972", "$135,794,083", "+$5,645,111", "+4.3%"];

const CAPITAL = [
  ["Machinery, Vehicles, & Equipment", "$6,106,459", "$7,120,300", "+$1,013,841", "+16.6%"],
  ["Recreation Plat Fee Fund Capital", "$1,000,000", "$600,000", "-$400,000", "-40.0%"],
  ["Sheriff Capital Projects", "$2,000,000", "$7,000,000", "+$5,000,000", "+250.0%"],
  ["Sidewalk Fund Capital", "$75,000", "$300,000", "+$225,000", "+300.0%"],
  ["Tourist Development Fund Capital", "$10,065,000", "$11,350,000", "+$1,285,000", "+12.8%"],
  ["Transportation and Infrastructure Capital", "$24,197,677", "$27,127,731", "+$2,930,054", "+12.1%"]
];
const CAPITAL_TOTAL = ["Total Capital", "$43,444,136", "$53,498,031", "+$10,053,895", "+23.1%"];

const GRAND_TOTAL = ["Total, All Funds", "$327,945,088", "$345,223,508", "+$17,278,420", "+5.3%"];

const sharedCss = `
  @page{ size:letter portrait; margin:0; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ font-family:Arial, Helvetica, sans-serif; color:#173229; }
  section{
    position:relative;
    width:8.5in;
    height:11in;
    padding:.56in .62in .58in;
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
    margin:8px 0 .1in;
    color:#003f28;
    font:800 22pt/1.05 Georgia, "Times New Roman", serif;
    letter-spacing:-.02em;
  }
  h1.continued{ font-size:15pt; margin-top:.2in; }
  h1.continued span{ color:#68786f; font-size:9.5pt; font-weight:400; }
  p.intro{
    max-width:7.3in;
    margin:0 0 .18in;
    color:#33453c;
    font-size:9.3pt;
    line-height:1.45;
  }
  .stat-strip{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:.13in;
    margin:0 0 .2in;
  }
  .stat-card{
    padding:.13in .1in;
    border-radius:10px;
    background:#003f28;
    text-align:center;
  }
  .stat-card b{
    display:block;
    color:#fff;
    font:800 13pt/1.1 Georgia, serif;
  }
  .stat-card span{
    display:block;
    margin-top:.03in;
    color:#e7c95f;
    font-size:6.4pt;
    font-weight:800;
    letter-spacing:.03em;
    text-transform:uppercase;
    line-height:1.25;
  }
  h2.group{
    margin:.16in 0 .04in;
    color:#b89521;
    font-size:7.6pt;
    font-weight:900;
    letter-spacing:.1em;
    text-transform:uppercase;
  }
  .dept-table{
    border-top:2px solid #d1be78;
  }
  .dept-row{
    display:grid;
    grid-template-columns:2.55in 1.05in 1.05in 1.05in .65in;
    gap:.08in;
    padding:.055in 0;
    border-bottom:1px solid #eef1ee;
    align-items:center;
  }
  .dept-row.head{
    border-bottom:1px solid #003f28;
    color:#68786f;
    font-size:6.8pt;
    font-weight:800;
    letter-spacing:.03em;
    text-transform:uppercase;
    padding-bottom:.05in;
  }
  .dept-row.head .num{ text-align:right; }
  .dept-name{
    color:#173229;
    font-size:8.2pt;
  }
  .num{
    text-align:right;
    color:#33453c;
    font-size:8pt;
    font-variant-numeric:tabular-nums;
  }
  .change{ color:#0b7741; font-weight:700; }
  .change.is-down{ color:#a24b1e; }
  .pct{ color:#0b7741; font-weight:800; }
  .pct.is-down{ color:#a24b1e; }
  .dept-row.total{
    border-top:1.5px solid #003f28;
    border-bottom:0;
    padding-top:.07in;
  }
  .dept-row.total .dept-name{ color:#003f28; font-weight:800; }
  .dept-row.total .num{ color:#003f28; font-weight:800; }
  .dept-row.grand{
    margin-top:.1in;
    border-top:2.5px solid #003f28;
    padding-top:.09in;
  }
  .dept-row.grand .dept-name{ color:#003f28; font:800 9.5pt Georgia, serif; }
  .dept-row.grand .num{ color:#003f28; font:800 9.5pt Georgia, serif; }
  .footnote{
    margin:.14in 0 0;
    color:#68786f;
    font-size:7.1pt;
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

const pageHeader = () => `<header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>`;

const page1 = `
  <section>
    ${pageHeader()}
    <small class="kicker">Financial Summaries</small>
    <h1>Budget Change Summary</h1>
    <p class="intro">A comparison of the FY 2026 and FY 2027 budgets by Constitutional Officer, Independent Agency, Board Department, and capital fund.</p>
    <div class="stat-strip">
      ${STATS.map(([v, l]) => `<div class="stat-card"><b>${v}</b><span>${l}</span></div>`).join("")}
    </div>

    <h2 class="group">Constitutional Officers</h2>
    <div class="dept-table">
      ${tableHead}
      ${CONSTITUTIONAL.map(row).join("")}
      ${row(CONSTITUTIONAL_TOTAL, "total")}
    </div>

    <h2 class="group">Independent Agencies</h2>
    <div class="dept-table">
      ${INDEPENDENT.map(row).join("")}
      ${row(INDEPENDENT_TOTAL, "total")}
    </div>

    <footer><span>FY 2027 Annual Budget</span><b>PAGE_A</b></footer>
  </section>
`;

const page2 = `
  <section>
    ${pageHeader()}
    <h1 class="continued">Budget Change Summary <span>(continued)</span></h1>

    <h2 class="group" style="margin-top:.12in">Board Department Operating & Personnel Budgets</h2>
    <div class="dept-table">
      ${tableHead}
      ${BOARD_DEPTS.map(row).join("")}
      ${row(BOARD_TOTAL, "total")}
    </div>

    <h2 class="group">Capital</h2>
    <div class="dept-table">
      ${CAPITAL.map(row).join("")}
      ${row(CAPITAL_TOTAL, "total")}
    </div>

    ${row(GRAND_TOTAL, "grand")}

    <p class="footnote">Section subtotals do not sum exactly to the countywide total above; the difference reflects debt service, interfund transfers, and reserve balances not broken out by department in this table. Figures reflect the FY 2026 adopted budget compared to the FY 2027 tentative budget and may not sum exactly due to rounding and in-year budget amendments.</p>

    <footer><span>FY 2027 Annual Budget</span><b>PAGE_B</b></footer>
  </section>
`;

const startPage = Number(process.argv[3] || 168);
const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Budget Change Summary</title>
<style>${sharedCss}</style></head>
<body>${page1.replace("PAGE_A", startPage)}${page2.replace("PAGE_B", startPage + 1)}</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-budget-change-summary.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
