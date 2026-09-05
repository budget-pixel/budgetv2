import { chromium } from "playwright";

// Builds the FY 2027 Budget Book's "Revenue Ledger" -- rebuilt to match
// the Expenditure Ledger's exact two-page layout: a page 1 summary by
// broad revenue category (General Government Taxes, Charges for
// Services, etc.) with a six-year trend, and a page 2 two-column detail
// of all 89 individual revenue sources grouped under those same seven
// categories, FY2026 vs. FY2027.
//
// Every dollar figure (all 89 sources, all years FY2020-FY2029) comes
// directly from this book's live source (pages/revenue-ledger.html's
// own rendered table), re-fetched fresh for this rebuild -- which
// resolved a defect in the prior version of this file: 8 discontinued
// FY2027 sources whose individual names could not previously be
// recovered (only their combined $1,280,560 FY2026 total was known) are
// now identified by name: Surplus Budget Clerk of Court ($700,000),
// Contractor Registration ($30,000), Sewer Impact Fees ($164,560), White
// Sands Fee ($1,000), Sales & Promotions ($255,000), Sales & Promotions
// Out of State ($5,000), Surplus Budget Supervisor of Elections
// ($50,000), and Surplus Budget Property Appraiser ($75,000) -- all now
// shown individually rather than combined into one guessed line.
//
// Category assignment: the live site's own per-source Revenue_Type field
// was not reachable through any exposed accessor during this rebuild, so
// each of the 89 sources is classified here using Florida's Uniform
// Accounting System revenue categories (the same seven category names
// already used throughout this book on every department and
// Constitutional Officer page's own "Revenue Sources" box) applied by
// source name and county-finance convention. Every category subtotal and
// the six-year category trend were computed directly from these
// classifications and verified to reconcile exactly to this book's own
// published FY2022-FY2027 grand totals ($252,741,882 through
// $345,223,508) -- see TOTAL below.

const STATS = [
  ["$345.2M", "Total FY2027 Revenue"],
  ["+$17.3M", "Net Change from FY2026"],
  ["+5.3%", "Net Percent Change"],
  ["$159.6M", "Largest Source: Ad Valorem Taxes"]
];

const YEARS = ["FY 2022 Actual", "FY 2023 Actual", "FY 2024 Actual", "FY 2025 Actual", "FY 2026 Budget", "FY 2027 Tentative"];

// [category, FY2022, FY2023, FY2024, FY2025, FY2026, FY2027]
const ROWS = [
  ["General Government Taxes", "$218,598,479", "$236,486,085", "$257,566,876", "$277,454,100", "$272,677,953", "$285,211,491"],
  ["Charges for Services", "$14,601,788", "$15,616,872", "$14,403,343", "$15,251,527", "$19,414,205", "$19,985,657"],
  ["Other Sources", "$4,187,992", "$5,229,704", "$5,905,994", "$6,043,333", "$14,848,284", "$17,262,506"],
  ["Permits Fees and Special Assessments", "$3,620,226", "$4,265,672", "$5,974,512", "$7,032,365", "$6,004,785", "$7,783,225"],
  ["Miscellaneous Revenue", "$4,876,217", "$9,049,742", "$14,414,808", "$13,398,132", "$7,862,612", "$7,448,151"],
  ["Intergovernmental Revenues", "$6,686,791", "$7,336,263", "$11,070,692", "$9,427,484", "$6,896,622", "$7,304,978"],
  ["Judgments, Fines and Forfeits", "$170,388", "$350,704", "$280,208", "$287,597", "$240,627", "$227,500"]
];
const TOTAL = ["Total", "$252,741,882", "$278,335,039", "$309,616,429", "$328,894,534", "$327,945,088", "$345,223,508"];

// Page 2: every individual FY2027 revenue source, grouped by category,
// FY2026 vs FY2027, laid out as two print-style columns (89 sources
// don't fit a single column at readable type size) -- matching the
// Expenditure Ledger's department-detail page one-to-one.
const REV_GROUPS = [
  ["General Government Taxes", [
    ["Ad Valorem Taxes", "$155,698,523", "$159,639,395"],
    ["Tourist Development Tax", "$50,843,000", "$58,965,950"],
    ["Discretionary Sales Surtax", "$39,688,937", "$40,000,000"],
    ["Local Government 1/2 Cent Sales Tax", "$17,000,000", "$16,768,997"],
    ["Local Option Fuel Tax", "$3,772,033", "$4,010,212"],
    ["Constitutional Fuel Tax", "$1,750,000", "$1,750,000"],
    ["Ad Valorem Taxes (Mosquito Control Fund)", "$1,355,460", "$1,426,937"],
    ["County Fuel Tax", "$1,000,000", "$1,000,000"],
    ["9th Cent Voted Fuel Tax", "$750,000", "$800,000"],
    ["Municipal Fuel Tax", "$500,000", "$500,000"],
    ["Telecommunication and Local Communication Tax", "$320,000", "$350,000"]
  ]],
  ["Charges for Services", [
    ["Indirect Administrative Fees", "$3,442,233", "$4,112,604"],
    ["Housing Prisoners Revenue", "$3,500,000", "$3,500,000"],
    ["Ambulance Fees", "$3,000,000", "$3,000,000"],
    ["TDC Public Safety Reimbursements", "$2,448,000", "$2,244,645"],
    ["Resource Officer", "$1,370,000", "$1,370,000"],
    ["Planning Fees", "$1,400,000", "$1,200,000"],
    ["Landfill Fees", "$546,000", "$560,000"],
    ["Membership Fees", "$430,000", "$550,000"],
    ["Green Fees", "$304,000", "$430,000"],
    ["E911 Communications/Wireless", "$350,000", "$380,000"],
    ["Cart Fees", "$291,000", "$330,000"],
    ["Grill Food Revenue", "$300,000", "$295,000"],
    ["Lien Searches", "$250,000", "$250,000"],
    ["Probation Fees", "$200,000", "$215,000"],
    ["$2 Recording Fee", "$150,000", "$185,436"],
    ["Court Facilities Trust Fund Fee", "$170,000", "$150,000"],
    ["Code Enforcement Fees", "$25,000", "$150,000"],
    ["Grill Beverage Revenue", "$118,000", "$135,000"],
    ["Program &amp; Sports Fees", "$130,000", "$135,000"],
    ["Development Order Inspection", "$120,000", "$120,000"],
    ["Sewer and Wastewater Fees", "$60,000", "$85,000"],
    ["E-911 Utility Permits", "$75,000", "$80,000"],
    ["E911 Communications/Non-Wireless", "$90,000", "$80,000"],
    ["Morrison Springs Entry Fee", "$0", "$65,000"],
    ["Pro Shop Sales", "$105,000", "$60,000"],
    ["Civil Process Fees", "$60,000", "$60,000"],
    ["Prisoner Work Detail", "$58,972", "$58,972"],
    ["Park Rental Fee", "$40,000", "$45,000"],
    ["Additional Court Cost (Law Library)", "$21,500", "$20,000"],
    ["Additional Court Cost (Juvenile Justice)", "$21,500", "$20,000"],
    ["Additional Court Cost (Legal Aid)", "$21,500", "$20,000"],
    ["Additional Court Cost (Innovative Programs)", "$21,500", "$20,000"],
    ["Golf Course Non-Taxable", "$0", "$20,000"],
    ["Animal Shelter Fees", "$18,000", "$18,000"],
    ["Library Fines &amp; Fees", "$15,000", "$18,000"],
    ["Library Rentals", "$2,000", "$3,000"],
    ["Sales &amp; Promotions*", "$255,000", "$0"],
    ["Sales &amp; Promotions Out of State*", "$5,000", "$0"]
  ]],
  ["Other Sources", [
    ["Nonoperating Balance Brought Forward", "$10,460,192", "$13,211,906"],
    ["Surplus Budget Tax Collector", "$3,563,092", "$4,050,600"],
    ["Surplus Budget Clerk of Court*", "$700,000", "$0"],
    ["Surplus Budget Property Appraiser*", "$75,000", "$0"],
    ["Surplus Budget Supervisor of Elections*", "$50,000", "$0"]
  ]],
  ["Permits Fees and Special Assessments", [
    ["Beach Vending Permits", "$1,850,000", "$1,880,000"],
    ["Short-Term Rental Certificate Fee", "$1,300,000", "$2,200,000"],
    ["Daughette MSBU Fees", "$1,343,225", "$1,443,225"],
    ["Beach Bonfire Permits", "$475,000", "$750,000"],
    ["Recreation Plat Fees", "$0", "$600,000"],
    ["Special Events Permits", "$310,000", "$350,000"],
    ["Beach Dog Permits", "$190,000", "$190,000"],
    ["Beach Vehicle Permits", "$120,000", "$120,000"],
    ["Sidewalk Fees", "$75,000", "$100,000"],
    ["Alcoholic Beverage Licenses", "$80,000", "$80,000"],
    ["Mobile Home Licenses", "$38,000", "$40,000"],
    ["E-911 Plat Fee", "$20,000", "$22,000"],
    ["Coastal Armoring Fees", "$8,000", "$8,000"],
    ["Sewer Impact Fees*", "$164,560", "$0"],
    ["Contractor Registration*", "$30,000", "$0"],
    ["White Sands Fee*", "$1,000", "$0"]
  ]],
  ["Miscellaneous Revenue", [
    ["Interest", "$5,311,326", "$4,501,564"],
    ["Miscellaneous Revenue", "$781,414", "$954,887"],
    ["Interest (Sheriff)", "$500,000", "$500,000"],
    ["Surplus Equipment Sales", "$400,000", "$876,000"],
    ["Investments (Florida Local Government Investment Trust)", "$350,000", "$200,000"],
    ["Constitutional Officer Interest", "$300,000", "$250,000"],
    ["Office Rental", "$57,600", "$28,200"],
    ["Scrap Sales", "$45,660", "$40,000"],
    ["Insurance Agents LLC", "$40,000", "$40,000"],
    ["Copies and Public Records Request", "$45,612", "$2,500"],
    ["Cremation Fees", "$15,000", "$15,000"],
    ["Refund of Prior Year Expenditures", "$10,000", "$15,000"],
    ["Investments (SBA Florida Prime)", "$6,000", "$5,000"],
    ["Restaurant Non-Taxable", "$0", "$10,000"],
    ["Supplemental Fire Support", "$0", "$10,000"]
  ]],
  ["Intergovernmental Revenues", [
    ["State Revenue Share Proceeds", "$3,300,000", "$3,726,334"],
    ["Federal Grant (Economic Environment)", "$3,082,896", "$3,057,056"],
    ["Racing Tax", "$224,000", "$224,000"],
    ["Florida Boating Improvement Program Allocation", "$100,000", "$100,000"],
    ["State Payment in Lieu of Tax", "$100,000", "$100,000"],
    ["State Grant (Health)", "$61,856", "$69,588"],
    ["State Shared Cigarette Tax", "$24,870", "$25,000"],
    ["Motor Fuel Use Tax", "$3,000", "$3,000"]
  ]],
  ["Judgments, Fines and Forfeits", [
    ["Ordinance Fine (Parking)", "$190,000", "$190,000"],
    ["Ordinance Fine (Beach Activities)", "$38,127", "$25,000"],
    ["Ordinance Fine (Handicap Parking)", "$10,000", "$10,000"],
    ["Ordinance Fine (Animal Control)", "$2,500", "$2,500"]
  ]]
];
const DETAIL_TOTAL = ["Total", "$327,945,088", "$345,223,508"];

// 89 rows across 7 groups is too dense for one two-column page at
// readable type size (unlike the Expenditure Ledger's 65 rows across 9
// groups) -- split at a natural group boundary into two continuation
// pages instead of shrinking type further.
const REV_GROUPS_A = REV_GROUPS.slice(0, 2);
const REV_GROUPS_B = REV_GROUPS.slice(2);

function money(s) { return Number(s.replace(/[$,]/g, "")) || 0; }
function fmt(n) { return (n < 0 ? "&minus;$" : "$") + Math.abs(n).toLocaleString("en-US"); }
function revChange(cells) {
  const d = money(cells[2]) - money(cells[1]);
  return d === 0 ? "$0" : fmt(d);
}
function revRow(cells) {
  const c = revChange(cells);
  const isDown = c.startsWith("&minus;");
  return `<div class="drow"><div class="dlabel">${cells[0]}</div><div class="dnum">${cells[1]}</div><div class="dnum">${cells[2]}</div><div class="dnum change${isDown ? " is-down" : ""}">${c}</div></div>`;
}
function buildRevSections(groups) {
  return groups.map(([cat, rows]) => `
    <div class="dgroup">${cat}</div>
    ${rows.map((r) => revRow(r)).join("")}
`).join("");
}

const row = (cells, cls) => {
  const cl = cls ? ` ${cls}` : "";
  return `<div class="lrow${cl}"><div class="rlabel">${cells[0]}</div>${cells.slice(1).map((c) => `<div class="rnum">${c}</div>`).join("")}</div>`;
};

const tableHead = `<div class="lrow head"><div class="rlabel">Revenue Category</div>${YEARS.map((y) => `<div class="rnum">${y}</div>`).join("")}</div>`;

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
  header{ display:flex; justify-content:space-between; padding-bottom:9px; border-bottom:1px solid #63736b; color:#53665d; font-size:8pt; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
  header em{ font-style:normal; }
  .kicker{ display:block; margin-top:.26in; color:#b89521; font-size:8pt; font-weight:900; letter-spacing:.14em; text-transform:uppercase; }
  h1{ margin:8px 0 .08in; color:#003f28; font:800 24pt/1.05 Georgia, "Times New Roman", serif; letter-spacing:-.02em; }
  p.intro{ max-width:7.3in; margin:0 0 .2in; color:#33453c; font-size:9.2pt; line-height:1.45; }
  .stat-strip{ display:grid; grid-template-columns:repeat(4,1fr); gap:.13in; margin:0 0 .26in; }
  .stat-card{ padding:.14in .1in; border-radius:12px; background:#003f28; text-align:center; }
  .stat-card b{ display:block; color:#fff; font:800 14pt/1.1 Georgia, serif; }
  .stat-card span{ display:block; margin-top:.04in; color:#e7c95f; font-size:6.6pt; font-weight:800; letter-spacing:.03em; text-transform:uppercase; line-height:1.3; }
  h2{ margin:0 0 .1in; color:#003f28; font:800 11.5pt/1.2 Georgia, serif; padding-bottom:.05in; border-bottom:2px solid #d1be78; }
  .ledger{ border-top:2px solid #d1be78; }
  .lrow{ display:grid; grid-template-columns:1.85in repeat(6,1fr); gap:.07in; align-items:center; padding:.09in 0; border-bottom:1px solid #eef1ee; }
  .lrow.head{ border-bottom:1px solid #003f28; color:#68786f; font-size:6.3pt; font-weight:800; letter-spacing:.01em; text-transform:uppercase; line-height:1.2; padding-bottom:.09in; align-items:end; }
  .lrow.head .rnum{ text-align:right; }
  .rlabel{ color:#173229; font-size:8.2pt; font-weight:700; }
  .rnum{ text-align:right; color:#33453c; font-size:7.6pt; font-variant-numeric:tabular-nums; }
  .lrow.grand{ margin-top:.05in; border-top:2px solid #003f28; border-bottom:1.5px solid #003f28; padding:.11in 0; }
  .lrow.grand .rlabel, .lrow.grand .rnum{ color:#003f28; font-weight:800; font-size:8.6pt; }
  .callout{ margin-top:.3in; padding:.2in .26in; border:1px solid #d1be78; border-radius:12px; background:#f9f8f2; }
  .callout h3{ margin:0 0 .06in; color:#003f28; font:800 9.5pt Georgia, serif; }
  .callout p{ margin:0; color:#33453c; font-size:8.3pt; line-height:1.5; }
  h1.continued{ font-size:16pt; margin-top:.05in; }
  p.footnote{ margin:.14in 0 0; color:#68786f; font-size:6.9pt; line-height:1.4; font-style:italic; }
  .dtable{ column-count:2; column-gap:.34in; column-rule:1px solid #eef1ee; border-top:2px solid #d1be78; padding-top:.06in; }
  .dgroup{ break-inside:avoid; break-after:avoid; margin-top:.1in; padding-bottom:.02in; border-bottom:1px solid #003f28; color:#003f28; font:800 7.6pt Georgia, serif; text-transform:uppercase; letter-spacing:.01em; }
  .dgroup:first-child{ margin-top:0; }
  .drow{ break-inside:avoid; display:grid; grid-template-columns:1fr .82in .82in .72in; gap:.05in; align-items:center; padding:.03in 0; border-bottom:1px solid #f1f4f1; }
  .drow .dlabel{ color:#173229; font-size:6.3pt; line-height:1.15; }
  .drow .dnum{ text-align:right; color:#33453c; font-size:6.1pt; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .drow .change{ color:#0b7741; font-weight:700; }
  .drow .change.is-down{ color:#a24b1e; }
  .drow.dhead{ border-bottom:1px solid #003f28; color:#68786f; font-size:6pt; font-weight:800; letter-spacing:.02em; text-transform:uppercase; padding-bottom:.05in; }
  .drow.dhead .dnum{ text-align:right; }
  .drow.grand{ column-span:all; break-inside:avoid; margin-top:.12in; border-top:2px solid #003f28; border-bottom:1.5px solid #003f28; padding:.09in 0; grid-template-columns:1fr .82in .82in .72in; }
  .drow.grand .dlabel, .drow.grand .dnum{ color:#003f28; font-weight:800; font-size:8pt; }
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

const startPage = Number(process.argv[3] || 72);

const page1 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Financial Overview</small>
    <h1>Revenue Ledger</h1>
    <p class="intro">Walton County's revenue is organized into seven categories under Florida's Uniform Accounting System &mdash; from locally levied taxes and charges for services to state and federal intergovernmental revenue. Figures below span six fiscal years to show the trend behind each FY2027 total; the following page details every individual revenue source within each category.</p>

    <div class="stat-strip">${STATS.map(([v, l]) => `<div class="stat-card"><b>${v}</b><span>${l}</span></div>`).join("")}</div>

    <h2>Consolidated Revenue Summary</h2>
    <div class="ledger">
      ${tableHead}
      ${ROWS.map((r) => row(r)).join("")}
      ${row(TOTAL, "grand")}
    </div>

    <div class="callout">
      <h3>Reading This Table</h3>
      <p>General Government Taxes &mdash; led by Ad Valorem property taxes and the Tourist Development Tax &mdash; funds the largest share of County services and grew steadily across all six years. Other Sources' sharp FY2026-FY2027 increase reflects a larger Nonoperating Balance Brought Forward (fund balance carried into the new year), not new revenue. Miscellaneous Revenue's FY2024 peak reflects unusually high interest earnings during a period of higher rates.</p>
    </div>

    <footer><span>FY 2027 Annual Budget</span><b>${startPage}</b></footer>
  </section>
`;

const page2 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h1 class="continued">Revenue Ledger <span style="color:#68786f;font-size:9.5pt;font-weight:400;">(continued)</span></h1>
    <h2 style="margin-top:.1in;">Revenue by Source</h2>
    <p class="intro" style="font-size:8pt;margin-bottom:.12in;">Every individual FY2026 and FY2027 revenue source, grouped by the category shown on the previous page.</p>
    <div class="drow dhead" style="column-span:all;"><div class="dlabel">Revenue Source</div><div class="dnum">FY26 Budget</div><div class="dnum">FY27 Tentative</div><div class="dnum">+/&minus;</div></div>
    <div class="dtable">
      ${buildRevSections(REV_GROUPS_A)}
    </div>
    <footer><span>FY 2027 Annual Budget</span><b>${startPage + 1}</b></footer>
  </section>
`;

const page3 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h1 class="continued">Revenue Ledger <span style="color:#68786f;font-size:9.5pt;font-weight:400;">(continued)</span></h1>
    <div class="drow dhead" style="column-span:all;"><div class="dlabel">Revenue Source</div><div class="dnum">FY26 Budget</div><div class="dnum">FY27 Tentative</div><div class="dnum">+/&minus;</div></div>
    <div class="dtable">
      ${buildRevSections(REV_GROUPS_B)}
    </div>
    <div class="drow grand"><div class="dlabel">Total</div><div class="dnum">${DETAIL_TOTAL[1]}</div><div class="dnum">${DETAIL_TOTAL[2]}</div><div class="dnum"></div></div>
    <p class="footnote">*Eight sources marked with an asterisk are discontinued or not budgeted for FY2027, together totaling $1,280,560 in FY2026.</p>
    <footer><span>FY 2027 Annual Budget</span><b>${startPage + 2}</b></footer>
  </section>
`;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Revenue Ledger</title>
<style>${sharedCss}</style></head>
<body>${page1}${page2}${page3}</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-revenue-ledger.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
