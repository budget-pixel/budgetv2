import { chromium } from "playwright";

// Builds the FY 2027 Budget Book's "Expenditure Ledger" -- the county's
// Consolidated Expense Summary by functional classification (General
// Government, Public Safety, Physical Environment, Transportation,
// Economic Environment, Human Services, Culture and Recreation,
// Court-Related Cost, Other Uses), FY2022 Actual through FY2027 Proposed.
// Source: pages/summary-of-expenses.html's consolidated-expense-summary-
// table, cross-checked live by a research pass.
//
// Two things the research pass confirmed and this build deliberately
// reflects: (1) the site's own "FY2028/FY2029 Projected" columns are
// unpopulated placeholders (hardcoded $0, no such field exists anywhere
// in the data model) -- omitted here rather than reproduced as fake
// zeroes; (2) this section intentionally does NOT reproduce the site's
// department-level breakdown table -- that data (FY26 vs FY27 by
// department) already exists in this book's Budget Change Summary
// section, and duplicating it here added no value. What this page adds
// instead is the multi-year (FY2022-FY2027) trend by functional
// classification, which Budget Change Summary does not show.

const STATS = [
  ["$345.2M", "Total FY2027 Expenses"],
  ["+$13.5M", "Net Change from FY2026"],
  ["+4.1%", "Net Percent Change"],
  ["$126.6M", "Largest Function: Public Safety"]
];

const YEARS = ["FY 2022 Actual", "FY 2023 Actual", "FY 2024 Actual", "FY 2025 Actual", "FY 2026 Budget", "FY 2027 Tentative"];

// [function, FY2022, FY2023, FY2024, FY2025, FY2026, FY2027]
const ROWS = [
  ["General Government", "$41,601,558", "$44,384,300", "$44,139,916", "$50,167,207", "$53,830,890", "$52,357,579"],
  ["Public Safety", "$73,956,672", "$89,742,446", "$118,699,437", "$135,231,059", "$126,902,374", "$126,571,918"],
  ["Physical Environment", "$16,057,926", "$18,051,006", "$21,512,980", "$21,879,408", "$25,078,840", "$25,985,970"],
  ["Transportation", "$41,530,734", "$36,422,624", "$42,302,193", "$39,852,608", "$48,143,047", "$58,121,849"],
  ["Economic Environment", "$41,973,920", "$51,941,877", "$55,736,087", "$51,413,281", "$54,854,737", "$62,444,450"],
  ["Human Services", "$16,177,429", "$16,556,934", "$6,803,677", "$6,938,271", "$8,924,310", "$5,250,035"],
  ["Culture and Recreation", "$5,564,360", "$5,348,253", "$5,954,083", "$5,557,084", "$6,406,200", "$6,106,603"],
  ["Court-Related Cost", "$4,246,730", "$4,672,355", "$4,988,800", "$5,437,242", "$7,131,025", "$7,985,104"],
  ["Other Uses", "$0", "$0", "$0", "$0", "$500,000", "$400,000"]
];
const TOTAL = ["Total", "$241,109,330", "$267,119,794", "$300,137,173", "$316,476,159", "$331,771,423", "$345,223,508"];

// Page 2: department-level detail grouped by function -- complements the
// Budget Change Summary section elsewhere in this book (which groups by
// Constitutional Officers / Independent Agencies / Board Departments /
// Capital) by showing the same FY2026-vs-FY2027 department figures
// organized instead by functional classification, matching page 1's
// groupings one-to-one. FY2026/FY2027 only (not all six years). Laid out
// as two print-style columns (65 department rows across 9 function
// groups don't fit a single column at readable type size) with no
// per-group subtotal row -- the page 1 Consolidated Expense Summary is
// the authoritative function-level total; repeating a subtotal here that
// wouldn't exactly match it (some of General Government's "Statutory &
// Other" line is reclassified by activity under other functions on page
// 1 -- see that page's callout) would need its own caveat for no benefit.
// Only the grand Total ties to both pages, since every dollar is counted
// under exactly one department here regardless of activity.
const DEPT_GROUPS = [
  ["General Government", [
    ["Board of County Commissioners", "$12,389,938", "$12,391,280"],
    ["Building Construction and Maintenance", "$9,986,168", "$8,912,305"],
    ["County Administration", "$2,219,903", "$2,260,039"],
    ["Court Innovations", "$50,000", "$43,109"],
    ["Geographic Info Systems", "$801,815", "$839,146"],
    ["Human Resources", "$1,338,993", "$1,426,936"],
    ["Mossy Head Wastewater Treatment Facility", "$1,402,528", "$464,000"],
    ["Office of Management and Budget", "$1,524,708", "$1,075,026"],
    ["Office of the County Attorney", "$1,993,475", "$1,802,925"],
    ["Planning", "$6,689,864", "$7,048,111"],
    ["Procurement", "$1,188,795", "$1,076,499"],
    ["Property Appraiser", "$4,829,596", "$4,954,338"],
    ["Statutory & Other", "$2,873,779", "$3,274,725"],
    ["Supervisor of Elections", "$1,615,107", "$1,663,865"],
    ["Tax Collector", "$7,900,000", "$8,500,000"]
  ]],
  ["Public Safety", [
    ["Building Department", "$4,200,000", "$4,000,000"],
    ["Code Compliance", "$4,863,159", "$4,960,654"],
    ["Emergency Management", "$804,151", "$912,455"],
    ["Medical Examiner", "$1,351,698", "$881,930"],
    ["Probation Services", "$364,655", "$370,577"],
    ["South Walton Fire", "$919,693", "$947,284"],
    ["State Fire", "$32,790", "$32,790"],
    ["Walton County Sheriff's Office", "$114,116,228", "$114,116,228"],
    ["E911 Fund", "$0", "$0"],
    ["Law Enforcement Trust Fund", "$0", "$0"]
  ]],
  ["Physical Environment", [
    ["Environmental Services", "$840,902", "$648,922"],
    ["Extension Office", "$600,710", "$597,319"],
    ["Mosquito Control", "$1,340,000", "$1,426,937"],
    ["Daughette MSBU", "$43,225", "$43,225"],
    ["Soil Conservation", "$143,330", "$150,000"],
    ["Solid Waste", "$22,110,673", "$23,119,567"]
  ]],
  ["Transportation", [
    ["Capital Projects", "$20,391,997", "$27,617,731"],
    ["Engineering Services", "$2,474,578", "$2,379,118"],
    ["Public Works", "$25,201,472", "$27,825,000"],
    ["Sidewalk", "$75,000", "$300,000"]
  ]],
  ["Economic Environment", [
    ["Beach Operations", "$10,471,698", "$13,000,000"],
    ["Beach Renourishment", "$10,000,000", "$11,000,000"],
    ["Beach Tram", "$3,516,126", "$5,242,221"],
    ["Communications", "$894,445", "$950,000"],
    ["Housing & Urban Development", "$3,082,896", "$3,057,056"],
    ["Marketing", "$13,834,592", "$14,502,450"],
    ["Sales and Visitors Center", "$1,790,723", "$1,950,000"],
    ["South Walton Fire Lifeguard Services", "$3,250,749", "$3,380,779"],
    ["Tourism Administration", "$2,998,667", "$3,290,000"],
    ["Tourism North Walton", "$323,000", "$355,500"],
    ["Tourism Public Safety", "$4,420,000", "$5,295,000"]
  ]],
  ["Human Services", [
    ["Human Services", "$4,072,199", "$186,119"],
    ["Mosquito Control State Aid", "$61,856", "$69,588"],
    ["Non-Profit Funding Program", "$477,820", "$450,000"],
    ["Veteran Services", "$236,100", "$316,650"],
    ["Walton County Health Department", "$1,724,397", "$1,724,397"]
  ]],
  ["Culture and Recreation", [
    ["Culture and Recreation (Senior Centers & Mainstreet)", "$0", "$42,000"],
    ["Eagle Springs Golf and Recreation Center", "$1,974,044", "$1,805,555"],
    ["Eagle Springs Grill", "$577,884", "$570,000"],
    ["Libraries", "$1,894,963", "$2,155,655"],
    ["Recreation", "$859,309", "$833,393"],
    ["Recreation Plat Fee", "$1,000,000", "$600,000"]
  ]],
  ["Court-Related Cost", [
    ["Circuit Court", "$260,511", "$261,493"],
    ["Clerk of Court", "$5,984,728", "$6,871,175"],
    ["County Court", "$69,956", "$70,056"],
    ["Court Technology - Court Administration", "$393,758", "$185,436"],
    ["Guardian Ad Litem", "$9,000", "$9,000"],
    ["Public Defender", "$152,439", "$290,833"],
    ["State Attorney", "$260,633", "$297,111"]
  ]],
  ["Other Uses", [
    ["BCC Other Uses Contingency", "$500,000", "$400,000"]
  ]]
];
const DEPT_TOTAL = ["Total", "$331,771,423", "$345,223,508"];

function money(s) { return Number(s.replace(/[$,]/g, "")) || 0; }
function fmt(n) { return (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US"); }
function deptChange(cells) {
  const d = money(cells[2]) - money(cells[1]);
  return d === 0 ? "$0" : fmt(d);
}
function deptRow(cells) {
  const c = deptChange(cells);
  const isDown = c.startsWith("-");
  return `<div class="drow"><div class="dlabel">${cells[0]}</div><div class="dnum">${cells[1]}</div><div class="dnum">${cells[2]}</div><div class="dnum change${isDown ? " is-down" : ""}">${c}</div></div>`;
}
const deptSectionsHtml = DEPT_GROUPS.map(([fn, rows]) => `
    <div class="dgroup">${fn}</div>
    ${rows.map((r) => deptRow(r)).join("")}
`).join("");

const row = (cells, cls) => {
  const cl = cls ? ` ${cls}` : "";
  return `<div class="lrow${cl}"><div class="rlabel">${cells[0]}</div>${cells.slice(1).map((c) => `<div class="rnum">${c}</div>`).join("")}</div>`;
};

const tableHead = `<div class="lrow head"><div class="rlabel">Functional Classification</div>${YEARS.map((y) => `<div class="rnum">${y}</div>`).join("")}</div>`;

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
    font:800 24pt/1.05 Georgia, "Times New Roman", serif;
    letter-spacing:-.02em;
  }
  p.intro{
    max-width:7.3in;
    margin:0 0 .2in;
    color:#33453c;
    font-size:9.2pt;
    line-height:1.45;
  }
  .stat-strip{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:.13in;
    margin:0 0 .26in;
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
    font:800 14pt/1.1 Georgia, serif;
  }
  .stat-card span{
    display:block;
    margin-top:.04in;
    color:#e7c95f;
    font-size:6.6pt;
    font-weight:800;
    letter-spacing:.03em;
    text-transform:uppercase;
    line-height:1.3;
  }
  h2{
    margin:0 0 .1in;
    color:#003f28;
    font:800 11.5pt/1.2 Georgia, serif;
    padding-bottom:.05in;
    border-bottom:2px solid #d1be78;
  }
  .ledger{ border-top:2px solid #d1be78; }
  .lrow{
    display:grid;
    grid-template-columns:1.55in repeat(6,1fr);
    gap:.07in;
    align-items:center;
    padding:.09in 0;
    border-bottom:1px solid #eef1ee;
  }
  .lrow.head{
    border-bottom:1px solid #003f28;
    color:#68786f;
    font-size:6.3pt;
    font-weight:800;
    letter-spacing:.01em;
    text-transform:uppercase;
    line-height:1.2;
    padding-bottom:.09in;
    align-items:end;
  }
  .lrow.head .rnum{ text-align:right; }
  .rlabel{ color:#173229; font-size:8.4pt; font-weight:700; }
  .rnum{
    text-align:right;
    color:#33453c;
    font-size:7.8pt;
    font-variant-numeric:tabular-nums;
  }
  .lrow.grand{
    margin-top:.05in;
    border-top:2px solid #003f28;
    border-bottom:1.5px solid #003f28;
    padding:.11in 0;
  }
  .lrow.grand .rlabel,
  .lrow.grand .rnum{ color:#003f28; font-weight:800; font-size:8.6pt; }
  .callout{
    margin-top:.3in;
    padding:.2in .26in;
    border:1px solid #d1be78;
    border-radius:12px;
    background:#f9f8f2;
  }
  .callout h3{
    margin:0 0 .06in;
    color:#003f28;
    font:800 9.5pt Georgia, serif;
  }
  .callout p{
    margin:0;
    color:#33453c;
    font-size:8.3pt;
    line-height:1.5;
  }
  h1.continued{ font-size:16pt; margin-top:.05in; }
  p.footnote{
    margin:.14in 0 0;
    color:#68786f;
    font-size:6.9pt;
    line-height:1.4;
    font-style:italic;
  }
  .dtable{
    column-count:2;
    column-gap:.34in;
    column-rule:1px solid #eef1ee;
    border-top:2px solid #d1be78;
    padding-top:.06in;
  }
  .dgroup{
    break-inside:avoid;
    break-after:avoid;
    margin-top:.1in;
    padding-bottom:.02in;
    border-bottom:1px solid #003f28;
    color:#003f28;
    font:800 7.6pt Georgia, serif;
    text-transform:uppercase;
    letter-spacing:.01em;
  }
  .dgroup:first-child{ margin-top:0; }
  .drow{
    break-inside:avoid;
    display:grid;
    grid-template-columns:1fr .82in .82in .72in;
    gap:.05in;
    align-items:center;
    padding:.03in 0;
    border-bottom:1px solid #f1f4f1;
  }
  .drow .dlabel{ color:#173229; font-size:6.3pt; line-height:1.15; }
  .drow .dnum{
    text-align:right;
    color:#33453c;
    font-size:6.1pt;
    font-variant-numeric:tabular-nums;
    white-space:nowrap;
  }
  .drow .change{ color:#0b7741; font-weight:700; }
  .drow .change.is-down{ color:#a24b1e; }
  .drow.dhead{
    border-bottom:1px solid #003f28;
    color:#68786f;
    font-size:6pt;
    font-weight:800;
    letter-spacing:.02em;
    text-transform:uppercase;
    padding-bottom:.05in;
  }
  .drow.dhead .dnum{ text-align:right; }
  .drow.grand{
    column-span:all;
    break-inside:avoid;
    margin-top:.12in;
    border-top:2px solid #003f28;
    border-bottom:1.5px solid #003f28;
    padding:.09in 0;
    grid-template-columns:1fr .82in .82in .72in;
  }
  .drow.grand .dlabel,
  .drow.grand .dnum{ color:#003f28; font-weight:800; font-size:8pt; }
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

const startPage = Number(process.argv[3] || 174);

const page1 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Financial Summaries</small>
    <h1>Expenditure Ledger</h1>
    <p class="intro">Walton County's expenditures are organized into nine functional classifications reflecting the full range of services provided to residents and visitors &mdash; from general government operations and public safety to infrastructure, tourism, and community programs. Figures below span six fiscal years to show the trend behind each FY2027 total.</p>

    <div class="stat-strip">${STATS.map(([v, l]) => `<div class="stat-card"><b>${v}</b><span>${l}</span></div>`).join("")}</div>

    <h2>Consolidated Expense Summary</h2>
    <div class="ledger">
      ${tableHead}
      ${ROWS.map((r) => row(r)).join("")}
      ${row(TOTAL, "grand")}
    </div>

    <div class="callout">
      <h3>Reading This Table</h3>
      <p>Transportation and Economic Environment show the largest year-over-year growth in FY2027, driven by capital road projects and tourism-funded initiatives. Human Services' decline reflects a one-time FY2026 grant that did not recur. Some departments' expenditures span more than one functional classification &mdash; for example, a portion of the County's "Statutory &amp; Other" administrative costs supports activities classified here under Public Safety, Economic Environment, Human Services, and Culture and Recreation rather than General Government alone.</p>
    </div>

    <footer><span>FY 2027 Annual Budget</span><b>${startPage}</b></footer>
  </section>
`;

const page2 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h1 class="continued">Expenditure Ledger <span style="color:#68786f;font-size:9.5pt;font-weight:400;">(continued)</span></h1>
    <h2 style="margin-top:.1in;">Expenses by Department</h2>
    <p class="intro" style="font-size:8pt;margin-bottom:.12in;">Every department's FY2026 and FY2027 operating budget, grouped by the functional classification shown on the previous page.</p>
    <div class="drow dhead" style="column-span:all;"><div class="dlabel">Department</div><div class="dnum">FY26 Budget</div><div class="dnum">FY27 Tentative</div><div class="dnum">+/&minus;</div></div>
    <div class="dtable">
      ${deptSectionsHtml}
    </div>
    <div class="drow grand"><div class="dlabel">Total</div><div class="dnum">${DEPT_TOTAL[1]}</div><div class="dnum">${DEPT_TOTAL[2]}</div><div class="dnum"></div></div>
    <p class="footnote">Some departments' spending spans more than one functional classification &mdash; see the Consolidated Expense Summary callout on the previous page.</p>
    <footer><span>FY 2027 Annual Budget</span><b>${startPage + 1}</b></footer>
  </section>
`;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Expenditure Ledger</title>
<style>${sharedCss}</style></head>
<body>${page1}${page2}</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-summary-of-expenses.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
