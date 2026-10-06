import { chromium } from "playwright";

// Builds the FY 2027 Budget Book's "Expenditure Ledger" -- the county's
// Consolidated Expense Summary by functional classification (General
// Government, Public Safety, Physical Environment, Transportation,
// Economic Environment, Human Services, Culture and Recreation,
// Court-Related Cost, Other Uses), FY 2022 Actual through FY 2027 Proposed.
// Source: pages/summary-of-expenses.html's consolidated-expense-summary-
// table, cross-checked live by a research pass.
//
// Two things the research pass confirmed and this build deliberately
// reflects: (1) the site's own "FY 2028/FY 2029 Projected" columns are
// unpopulated placeholders (hardcoded $0, no such field exists anywhere
// in the data model) -- omitted here rather than reproduced as fake
// zeroes; (2) this section intentionally does NOT reproduce the site's
// department-level breakdown table -- that data (FY26 vs FY27 by
// department) already exists in this book's Budget Change Summary
// section, and duplicating it here added no value. What this page adds
// instead is the multi-year (FY 2022-FY 2027) trend by functional
// classification, which Budget Change Summary does not show.

const STATS = [
  ["$345.2M", "Total FY 2027 Expenses"],
  ["+$17.3M", "Change from FY 2026"],
  ["+5.3%", "Percent Change"],
  ["$126.6M", "Largest Function: Public Safety"]
];

const YEARS = ["FY 2022 Actual", "FY 2023 Actual", "FY 2024 Actual", "FY 2025 Actual", "FY 2026 Budget", "FY 2027 Final"];

// [function, FY 2022, FY 2023, FY 2024, FY 2025, FY 2026, FY 2027]
const ROWS = [
  ["General Government", "$53,689,718", "$56,037,956", "$50,769,465", "$57,653,480", "$58,963,062", "$59,410,254"],
  ["Public Safety", "$73,956,672", "$89,648,696", "$118,293,187", "$134,981,059", "$126,652,374", "$126,571,918"],
  ["Physical Environment", "$15,448,028", "$17,139,861", "$20,480,144", "$20,797,576", "$23,738,840", "$24,559,033"],
  ["Transportation", "$41,530,734", "$36,422,624", "$42,302,193", "$39,852,608", "$48,143,047", "$58,121,849"],
  ["Economic Environment", "$41,878,146", "$51,789,996", "$55,678,766", "$51,137,982", "$54,818,996", "$62,761,100"],
  ["Human Services", "$8,549,206", "$10,130,937", "$5,961,827", "$5,923,141", "$7,676,272", "$6,178,822"],
  ["Culture and Recreation", "$5,564,360", "$5,348,253", "$5,953,833", "$5,476,961", "$6,306,200", "$6,106,603"],
  ["Court-Related Cost", "$492,465", "$601,473", "$697,756", "$653,352", "$1,146,297", "$1,113,929"],
  ["Other Uses", "$0", "$0", "$0", "$0", "$500,000", "$400,000"]
];
const TOTAL = ["Department Budget Total", "$241,109,330", "$267,119,794", "$300,137,173", "$316,476,159", "$327,945,088", "$345,223,508"];

// Pages 2–3: FY 2027 department detail grouped by the published activity
// sheet. The final-budget reconciliation retains $181,500 in BCC operating
// expenses following the confirmed nonprofit budget of $268,500, leaving
// a net $41,041 moved from the Board to Human Services.
// Each function below now sums to the consolidated budget ledger.
const DEPT_GROUPS = [
  ["General Government", [
    ["Board of County Commissioners", "$12,472,780"],
    ["Building Construction and Maintenance", "$8,912,305"],
    ["Tax Collector", "$8,500,000"],
    ["Clerk of Court", "$6,871,175"],
    ["Planning", "$5,463,634"],
    ["Property Appraiser", "$4,954,338"],
    ["County Administration", "$2,260,039"],
    ["Office of the County Attorney", "$1,802,925"],
    ["Supervisor of Elections", "$1,663,865"],
    ["Planning Short-Term Rental", "$1,584,477"],
    ["Human Resources", "$1,426,936"],
    ["Procurement", "$1,076,499"],
    ["Office of Management and Budget", "$1,075,026"],
    ["Geographic Info Systems", "$839,146"],
    ["Mossy Head Wastewater Treatment Facility", "$464,000"],
    ["Court Innovations", "$43,109"],
  ]],
  ["Public Safety", [
    ["Walton County Sheriff's Office", "$114,116,228"],
    ["Building Department", "$4,000,000"],
    ["Code Compliance Beach", "$2,848,111"],
    ["Code Compliance", "$2,112,543"],
    ["South Walton Fire", "$947,284"],
    ["Emergency Management", "$912,455"],
    ["Medical Examiner", "$881,930"],
    ["Probation Services", "$370,577"],
    ["Volunteer Fire", "$350,000"],
    ["State Fire", "$32,790"],
  ]],
  ["Physical Environment", [
    ["Solid Waste", "$23,119,567"],
    ["Environmental Services", "$648,922"],
    ["Extension Office", "$597,319"],
    ["Soil Conservation", "$150,000"],
    ["MSBU", "$43,225"],
  ]],
  ["Transportation", [
    ["Public Works", "$27,825,000"],
    ["Capital Projects", "$27,617,731"],
    ["Engineering Services", "$2,379,118"],
    ["Sidewalk", "$300,000"],
  ]],
  ["Economic Environment", [
    ["Marketing", "$14,502,450"],
    ["Beach Operations", "$13,000,000"],
    ["Beach Renourishment", "$11,000,000"],
    ["Tourism Public Safety", "$5,295,000"],
    ["Beach Tram", "$5,242,221"],
    ["South Walton Fire Lifeguard Services", "$3,380,779"],
    ["Tourism Administration", "$3,290,000"],
    ["Housing & Urban Development", "$3,057,056"],
    ["Sales and Visitors Center", "$1,950,000"],
    ["Communications", "$950,000"],
    ["Economic Development Alliance", "$421,444"],
    ["North Walton Tourist Development Tax", "$355,500"],
    ["Veteran Services", "$316,650"],
  ]],
  ["Human Services", [
    ["Human Services", "$2,366,300"],
    ["Walton County Health Department", "$1,724,397"],
    ["Mosquito Control", "$1,426,937"],
    ["Non-Profit Funding Program", "$268,500"],
    ["Lakeview", "$175,000"],
    ["Gulf Coast Kid's House", "$98,100"],
    ["Mosquito Control State Aid", "$69,588"],
    ["Indigent Cremation Program", "$50,000"],
  ]],
  ["Culture and Recreation", [
    ["Libraries", "$2,155,655"],
    ["Eagle Springs Golf and Recreation Center", "$1,805,555"],
    ["Recreation", "$833,393"],
    ["Recreation Plat Fee", "$600,000"],
    ["Eagle Springs Grill", "$570,000"],
    ["Board of County Commissioners", "$100,000"],
    ["Culture and Recreation (Senior Centers & Mainstreet)", "$42,000"],
  ]],
  ["Court Related Cost", [
    ["State Attorney", "$297,111"],
    ["Public Defender", "$290,833"],
    ["Circuit Court", "$261,493"],
    ["Court Technology - Court Administration", "$185,436"],
    ["County Court", "$70,056"],
    ["Guardian Ad Litem", "$9,000"],
  ]],
  ["Other Uses", [
    ["BCC Other Uses Contingency", "$400,000"],
  ]],
];
const DEPT_TOTAL = ["Department Budget Total", "$345,223,508"];

// FY 2026 original-budget records, matched to the printed department scope.
// Code Compliance's two current programs share historical accounting codes;
// present their combined budget rather than assigning shared history twice.
const FY2026_DEPARTMENT_BUDGETS = {
  "Board of County Commissioners": 12339938,
  "Building Construction and Maintenance": 9986168,
  "Tax Collector": 7900000,
  "Clerk of Court": 5984728,
  "Planning": 5750851,
  "Property Appraiser": 4829596,
  "County Administration": 2219903,
  "Office of the County Attorney": 1993475,
  "Supervisor of Elections": 1615107,
  "Planning Short-Term Rental": 939013,
  "Human Resources": 1338993,
  "Procurement": 1188795,
  "Office of Management and Budget": 1524708,
  "Geographic Info Systems": 801815,
  "Mossy Head Wastewater Treatment Facility": 1402528,
  "Court Innovations": 50000,
  "Walton County Sheriff's Office": 114116228,
  "Building Department": 4200000,
  "Code Compliance": 4873159,
  "South Walton Fire": 919693,
  "Emergency Management": 804151,
  "Medical Examiner": 1351698,
  "Probation Services": 364655,
  "Volunteer Fire": 250000,
  "State Fire": 32790,
  "Solid Waste": 22110673,
  "Environmental Services": 840902,
  "Extension Office": 600710,
  "Soil Conservation": 143330,
  "MSBU": 43225,
  "Public Works": 25201472,
  "Capital Projects": 20391997,
  "Engineering Services": 2474578,
  "Sidewalk": 75000,
  "Marketing": 13834592,
  "Beach Operations": 10471698,
  "Beach Renourishment": 10000000,
  "Tourism Public Safety": 4420000,
  "Beach Tram": 3516126,
  "South Walton Fire Lifeguard Services": 3250749,
  "Tourism Administration": 2998667,
  "Housing & Urban Development": 3082896,
  "Sales and Visitors Center": 1790723,
  "Communications": 894445,
  "Economic Development Alliance": 271841,
  "North Walton Tourist Development Tax": 323000,
  "Veteran Services": 236100,
  "Human Services": 2397802,
  "Walton County Health Department": 1724397,
  "Mosquito Control": 1340000,
  "Non-Profit Funding Program": 477820,
  "Lakeview": 150000,
  "Gulf Coast Kid's House": 40000,
  "Mosquito Control State Aid": 61856,
  "Indigent Cremation Program": 50000,
  "Libraries": 1894963,
  "Eagle Springs Golf and Recreation Center": 1974044,
  "Recreation": 859309,
  "Recreation Plat Fee": 1000000,
  "Eagle Springs Grill": 577884,
  "Culture and Recreation (Senior Centers & Mainstreet)": 0,
  "State Attorney": 260633,
  "Public Defender": 152439,
  "Circuit Court": 260511,
  "Court Technology - Court Administration": 393758,
  "County Court": 69956,
  "Guardian Ad Litem": 9000,
  "BCC Other Uses Contingency": 500000
};
const money = (amount) => "$" + amount.toLocaleString("en-US");
const amountOf = (value) => Number(String(value).replace(/[^0-9.-]/g, ""));
function priorDepartmentBudget(functionName, name) {
  if (functionName === "Culture and Recreation" && name === "Board of County Commissioners") return 0;
  if (!(name in FY2026_DEPARTMENT_BUDGETS)) throw new Error("Missing FY 2026 department budget: " + name);
  return FY2026_DEPARTMENT_BUDGETS[name];
}
const safetyRows = DEPT_GROUPS.find(([name]) => name === "Public Safety")[1];
const complianceRows = safetyRows.filter(([name]) => /^Code Compliance/.test(name));
const complianceIndex = safetyRows.findIndex(([name]) => name === "Code Compliance Beach");
safetyRows.splice(complianceIndex, complianceRows.length, ["Code Compliance", money(complianceRows.reduce((sum, row) => sum + amountOf(row[1]), 0))]);
const priorDetailTotal = DEPT_GROUPS.reduce((sum, [fn, rows]) => sum + rows.reduce((subtotal, [name]) => subtotal + priorDepartmentBudget(fn, name), 0), 0);
if (priorDetailTotal !== 327945088) throw new Error("FY 2026 department ledger does not reconcile");
// FY 2026 is presented using the same department/function grouping as the
// continuation pages; older actuals retain their published classifications.
ROWS.forEach((row) => {
  const group = DEPT_GROUPS.find(([name]) => name.replace(/[^a-z]/gi, "").toLowerCase() === row[0].replace(/[^a-z]/gi, "").toLowerCase());
  row[5] = money(group[1].reduce((sum, [name]) => sum + priorDepartmentBudget(group[0], name), 0));
});

// 65 rows across 9 function groups no longer fit a single two-column page
// at the larger, more readable type size below -- split at a natural
// group boundary into two continuation pages instead, matching the
// Revenue Ledger's REV_GROUPS_A/REV_GROUPS_B pattern.
const DEPT_GROUPS_A = DEPT_GROUPS.slice(0, 4);
const DEPT_GROUPS_B = DEPT_GROUPS.slice(4);

function deptRow(cells, functionName) {
  return `<div class="drow"><div class="dlabel">${cells[0]}</div><div class="dnum">${money(priorDepartmentBudget(functionName, cells[0]))}</div><div class="dnum">${cells[1]}</div></div>`;
}
function buildDeptSections(groups) {
  return groups.map(([fn, rows]) => `
    <div class="dgroup">${fn}</div>
    ${rows.map((r) => deptRow(r, fn)).join("")}
`).join("");
}

const row = (cells, cls) => {
  const cl = cls ? ` ${cls}` : "";
  return `<div class="lrow${cl}"><div class="rlabel">${cells[0]}</div>${cells.slice(1).map((c) => `<div class="rnum">${c}</div>`).join("")}</div>`;
};

const tableHead = `<div class="lrow head"><div class="rlabel">Functional Classification</div>${YEARS.map((y) => `<div class="rnum">${y === "FY 2027 Final" ? "FY 2027<br>Final" : y}</div>`).join("")}</div>`;

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
  .lrow.adjustment{ background:#f9f8f2; }
  .lrow.adjustment .rlabel{ color:#52665c; font-style:italic; }
  .lrow.adjustment .rnum{ color:#52665c; }
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
  h1.continued{ font-size:16pt; margin-top:.22in; }
  p.footnote{
    margin:.14in 0 0;
    color:#68786f;
    font-size:7.3pt;
    line-height:1.4;
    font-style:italic;
  }
  .dtable-head{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:.34in;
    border-top:2px solid #d1be78;
    padding-top:.06in;
  }
  .dtable{
    column-count:2;
    column-gap:.34in;
    column-rule:1px solid #eef1ee;
  }
  .dgroup{
    break-inside:avoid-column;
    break-after:avoid;
    margin-top:.14in;
    padding-bottom:.03in;
    border-bottom:1px solid #003f28;
    color:#003f28;
    font:800 9pt Georgia, serif;
    text-transform:uppercase;
    letter-spacing:.01em;
  }
  .dgroup:first-child{ margin-top:0; }
  .drow{
    break-inside:avoid-column;
    display:grid;
    grid-template-columns:minmax(0,1fr) .9in .9in;
    align-items:center;
    gap:.1in;
    padding:.05in 0;
    border-bottom:1px solid #f1f4f1;
  }
  .drow>*{ min-width:0; }
  .drow>*:nth-child(1){ flex:1 1 auto; }
  .drow>*:nth-child(2){ flex:0 0 .9in; }
  .drow .dlabel{ color:#173229; font-size:7.6pt; line-height:1.2; }
  .drow .dnum{
    text-align:right;
    color:#33453c;
    font-size:7.3pt;
    font-variant-numeric:tabular-nums;
    white-space:nowrap;
  }
  .drow .change{ color:#0b7741; font-weight:700; }
  .drow .change.is-down{ color:#a24b1e; }
  .drow.dhead{
    border-bottom:1px solid #003f28;
    color:#68786f;
    font-size:7pt;
    font-weight:800;
    letter-spacing:.02em;
    text-transform:uppercase;
    padding-bottom:.07in;
  }
  .drow.dhead .dnum{ text-align:right; }
  .drow.grand{
    column-span:all;
    break-inside:avoid;
    margin-top:.14in;
    border-top:2px solid #003f28;
    border-bottom:1.5px solid #003f28;
    padding:.11in 0;
  }
  .drow.grand .dlabel,
  .drow.grand .dnum{ color:#003f28; font-weight:800; font-size:9.5pt; }
  .drow.adjustment{ column-span:all; margin-top:.09in; background:#f9f8f2; padding:.08in .06in; }
  .drow.adjustment .dlabel{ color:#52665c; font-style:italic; }
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
    <small class="kicker">Financial Overview</small>
    <h1>Expenditure Ledger</h1>
    <p class="intro">Walton County's expenditures are organized into nine functional classifications reflecting the full range of services provided to residents and visitors &mdash; from general government operations and public safety to infrastructure, tourism, and community programs. Figures below span six fiscal years to show the trend behind each FY 2027 total.</p>

    <div class="stat-strip">${STATS.map(([v, l]) => `<div class="stat-card"><b>${v}</b><span>${l}</span></div>`).join("")}</div>

    <h2>Consolidated Expense Summary</h2>
    <div class="ledger">
      ${tableHead}
      ${ROWS.map((r) => row(r)).join("")}
      ${row(TOTAL, "grand")}
    </div>

    <div class="callout">
      <h3>Reading This Table</h3>
      <p>FY 2026 and FY 2027 budgets use the department grouping shown on the continued ledger pages. Earlier actuals retain their originally reported classifications, so a category change may affect a year-over-year comparison.</p>
    </div>

    <footer><span>FY 2027 Final Budget</span><b>${startPage}</b></footer>
  </section>
`;

const departmentHead = `<div class="drow dhead"><div class="dlabel">Department / Function</div><div class="dnum">FY 2026<br>Budget</div><div class="dnum">FY 2027<br>Final</div></div>`;
const dtableHead = `<div class="dtable-head">${departmentHead}${departmentHead}</div>`;

const page2 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h1 class="continued">Expenditure Ledger <span style="color:#68786f;font-size:9.5pt;font-weight:400;">(continued)</span></h1>
    ${dtableHead}
    <div class="dtable">
      ${buildDeptSections(DEPT_GROUPS_A)}
    </div>
    <p class="footnote"><b>Board of County Commissioners:</b> The Board's $12,972,780 total is classified as $12,472,780 General Government, $100,000 Culture and Recreation, and $400,000 Other Uses.</p>
    <footer><span>FY 2027 Final Budget</span><b>${startPage + 1}</b></footer>
  </section>
`;

const page3 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h1 class="continued">Expenditure Ledger <span style="color:#68786f;font-size:9.5pt;font-weight:400;">(continued)</span></h1>
    ${dtableHead}
    <div class="dtable">
      ${buildDeptSections(DEPT_GROUPS_B)}
    </div>
    <div class="drow grand"><div class="dlabel">${DEPT_TOTAL[0]}</div><div class="dnum">${money(priorDetailTotal)}</div><div class="dnum">${DEPT_TOTAL[1]}</div></div>
    <footer><span>FY 2027 Final Budget</span><b>${startPage + 2}</b></footer>
  </section>
`;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Expenditure Ledger</title>
<style>${sharedCss}</style></head>
<body>${page1}${page2}${page3}</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-summary-of-expenses.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
