import { chromium } from "playwright";

// Builds the FY 2027 Budget Book's "Fund Financial Ledger" -- the
// county's combining fund financial statements, consistent with the
// Florida State Uniform Accounting System Manual for Local Governments.
// Source: pages/fund-financial-schedules.html, live-rendered and
// cross-checked by a research pass.
//
// Two things the research pass confirmed and this build reflects: (1)
// this book's original raw capture had stale FY2028/FY2029 Consolidated
// figures (likely captured before the live sheet's forecast was
// recalculated) -- the live-verified values are used here instead. (2)
// Summing all 15 individual funds' FY2027 revenue does not quite reach
// the Consolidated schedule's total -- a real, intentional $4,000,000
// gap, not a missing fund or a data error. The Building Fund's own
// single-fund schedule suppresses a $4M "balance brought forward" line
// that would otherwise double-count against its Beginning Fund Balance
// row; the Consolidated schedule correctly includes it since that
// balance genuinely flows through the countywide roll-forward. Flagged
// in a footnote below rather than left as an unexplained discrepancy.

// FY2028/FY2029 projections exist only at the countywide level -- the
// live per-fund schedules stop at FY2027 -- so this table now runs
// FY2022 Actual through FY2027 Tentative (6 years) instead of the
// 8-year countywide-only range it used before.
const YEARS = ["FY22 Actual", "FY23 Actual", "FY24 Actual", "FY25 Actual", "FY26 Budget", "FY27 Tentative"];

// [row, FY22...FY27] -- countywide rows only; Total Revenues and Total
// Expenditures are shown broken out by fund instead (see REVENUE_BY_FUND
// and EXPENDITURE_BY_FUND below).
const CONSOLIDATED_TOP = [
  ["Beginning Fund Balance", "$206,500,685", "$273,894,781", "$313,775,975", "$367,413,796", "$435,939,242", "$431,812,854"]
];
const CONSOLIDATED_MID = [
  ["Other Financial Sources", "$23,420,641", "$27,156,634", "$113,343,159", "$128,521,478", "$140,404,580", "$143,663,984"],
  ["Total Revenue and Other Sources", "$316,685,658", "$339,919,659", "$464,143,127", "$510,574,687", "$476,615,667", "$488,887,492"]
];
const CONSOLIDATED_MID2 = [
  ["Other Financial Uses", "$23,420,641", "$27,057,034", "$113,343,159", "$128,521,478", "$140,404,580", "$143,663,984"],
  ["Total Expenditures and Other Uses", "$264,529,971", "$294,176,828", "$413,480,332", "$444,997,637", "$472,176,003", "$488,887,492"]
];
const CONSOLIDATED_BOTTOM = [
  ["Change in Fund Balance", "$52,155,686", "$45,742,831", "$50,662,795", "$65,577,049", "$4,439,664", "$0"],
  ["Estimated Ending Fund Balance", "$258,656,371", "$319,637,612", "$364,438,770", "$432,990,845", "$440,378,906", "$431,812,854"]
];

// [fund, FY22...FY27] -- Total Revenues only (not Total Revenue and
// Other Sources), matching each fund's own schedule on the live site.
const REVENUE_BY_FUND = [
  ["General Fund", "$78,461,600", "$85,605,447", "$176,479,967", "$201,872,576", "$209,010,222", "$204,279,098"],
  ["Transportation Fund", "$23,662,086", "$17,491,134", "$17,011,653", "$12,997,868", "$11,132,143", "$15,668,118"],
  ["Fine & Forfeiture / Sheriff Fund", "$72,818,787", "$88,583,254", "$25,254,560", "$42,706,440", "$12,631,972", "$15,651,972"],
  ["Tourist Development Fund", "$66,975,578", "$66,999,372", "$70,236,908", "$65,403,419", "$51,500,000", "$58,965,950"],
  ["Solid Waste Fund", "$39,857,430", "$40,448,918", "$42,325,079", "$43,839,760", "$41,000,000", "$40,701,564"],
  ["Capital Projects Fund", "$1,034,410", "$1,819,434", "$5,218,763", "$2,160,857", "$306,000", "$0"],
  ["Non-Major Funds", "$10,160,164", "$10,679,927", "$13,253,306", "$12,326,494", "$6,184,362", "$5,956,806"]
];
const REVENUE_BY_FUND_TOTAL = ["Total Revenues, All Funds", "$293,265,017", "$312,763,025", "$350,799,968", "$382,053,209", "$336,211,087", "$341,223,508"];

// [fund, FY22...FY27] -- Total Expenditures only (not Total Expenditures
// and Other Uses).
const EXPENDITURE_BY_FUND = [
  ["General Fund", "$71,471,052", "$78,627,465", "$73,781,082", "$78,938,073", "$87,300,548", "$81,239,108"],
  ["Transportation Fund", "$33,094,927", "$25,881,227", "$27,037,520", "$26,230,765", "$26,604,000", "$30,668,118"],
  ["Fine & Forfeiture / Sheriff Fund", "$66,006,876", "$80,296,105", "$100,876,080", "$123,069,284", "$114,116,228", "$114,116,228"],
  ["Tourist Development Fund", "$39,299,739", "$47,968,373", "$51,432,452", "$46,991,176", "$51,500,000", "$58,965,950"],
  ["Solid Waste Fund", "$14,918,353", "$15,747,341", "$17,181,725", "$19,282,584", "$22,110,673", "$23,119,567"],
  ["Capital Projects Fund", "$8,413,918", "$10,544,329", "$13,868,195", "$12,040,906", "$20,336,997", "$27,617,731"],
  ["Non-Major Funds", "$7,592,215", "$6,922,290", "$14,930,076", "$9,178,983", "$9,802,977", "$9,496,806"]
];
const EXPENDITURE_BY_FUND_TOTAL = ["Total Expenditures, All Funds", "$241,109,330", "$267,119,794", "$300,137,173", "$316,476,159", "$331,771,423", "$345,223,508"];

// [fund, beginning, totalRevOther, totalExpOther, change, ending]
const MAJOR_FUNDS = [
  ["General Fund", "$81,910,494", "$206,861,095", "$206,861,095", "$0", "$81,910,494"],
  ["Transportation Fund", "$41,124,267", "$30,668,118", "$30,668,118", "$0", "$41,124,267"],
  ["Fine & Forfeiture / Sheriff Fund", "$49,765,273", "$114,116,228", "$114,116,228", "$0", "$49,765,273"],
  ["Tourist Development Fund", "$166,535,869", "$58,965,950", "$58,965,950", "$0", "$166,535,869"],
  ["Solid Waste Fund", "$50,601,216", "$40,701,564", "$40,701,564", "$0", "$50,601,216"],
  ["Capital Projects Fund", "$26,965,592", "$27,617,731", "$27,617,731", "$0", "$26,965,592"]
];
const NON_MAJOR_FUNDS = [
  ["Daughette MSBU Fund", "$0", "$43,225", "$43,225", "$0", "$0"],
  ["Building Fund*", "$6,594,402", "$0", "$4,000,000", "-$4,000,000", "$2,594,402"],
  ["E911 Fund", "$223,763", "$460,000", "$460,000", "$0", "$223,763"],
  ["Housing & Urban Development Fund", "$93,502", "$3,057,056", "$3,057,056", "$0", "$93,502"],
  ["Mosquito Control Fund", "$1,621,059", "$1,426,937", "$1,426,937", "$0", "$1,621,059"],
  ["Mosquito Control State Aid Fund", "$0", "$69,588", "$69,588", "$0", "$0"],
  ["Recreation Plat Fee Fund", "$4,417,138", "$600,000", "$600,000", "$0", "$4,417,138"],
  ["Preservation Fund", "$1,111,100", "$0", "$0", "$0", "$1,111,100"],
  ["Sidewalk Fund", "$849,179", "$300,000", "$300,000", "$0", "$849,179"]
];

const cRow = (cells, cls) => `<div class="crow${cls ? " " + cls : ""}"><div class="clabel">${cells[0]}</div>${cells.slice(1).map((c) => `<div class="cnum">${c}</div>`).join("")}</div>`;
const cHead = `<div class="crow head"><div class="clabel">Consolidated Fund Financial Schedule</div>${YEARS.map((y) => `<div class="cnum">${y}</div>`).join("")}</div>`;
const cGroupLabel = (label) => `<div class="crow grouplabel"><div class="clabel">${label}</div></div>`;

function fRow(cells) {
  const isDown = cells[4].trim().startsWith("-");
  return `<div class="frow"><div class="flabel">${cells[0]}</div><div class="fnum">${cells[1]}</div><div class="fnum">${cells[2]}</div><div class="fnum">${cells[3]}</div><div class="fnum change${isDown ? " is-down" : ""}">${cells[4]}</div><div class="fnum">${cells[5]}</div></div>`;
}
const fHead = `<div class="frow head"><div class="flabel">Fund</div><div class="fnum">Beginning Balance</div><div class="fnum">Total Rev &amp; Other</div><div class="fnum">Total Exp &amp; Other</div><div class="fnum">Change</div><div class="fnum">Ending Balance</div></div>`;

const sharedCss = `
  @page{ size:letter portrait; margin:0; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ font-family:Arial, Helvetica, sans-serif; color:#173229; }
  section{
    position:relative;
    width:8.5in;
    height:11in;
    padding:.56in .4in .5in;
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
    margin-top:.24in;
    color:#b89521;
    font-size:8pt;
    font-weight:900;
    letter-spacing:.14em;
    text-transform:uppercase;
  }
  h1{
    margin:8px 0 .06in;
    color:#003f28;
    font:800 21pt/1.05 Georgia, "Times New Roman", serif;
    letter-spacing:-.02em;
  }
  h1.continued{ font-size:16pt; margin-top:.14in; }
  h1 span.sub{ color:#68786f; font-size:9.5pt; font-weight:400; }
  p.intro{
    max-width:7.3in;
    margin:0 0 .16in;
    color:#33453c;
    font-size:8.4pt;
    line-height:1.4;
  }
  h2{
    margin:.06in 0 .08in;
    color:#003f28;
    font:800 10.5pt/1.2 Georgia, serif;
    padding-bottom:.05in;
    border-bottom:2px solid #d1be78;
  }
  .cledger{ border-top:2px solid #d1be78; }
  .crow{
    display:grid;
    grid-template-columns:1.85in repeat(6,1fr);
    gap:.08in;
    align-items:center;
    padding:.062in 0;
    border-bottom:1px solid #f1f4f1;
  }
  .crow.head{
    border-bottom:1px solid #003f28;
    color:#68786f;
    font-size:6.3pt;
    font-weight:800;
    letter-spacing:.005em;
    text-transform:uppercase;
    line-height:1.15;
    padding-bottom:.06in;
    align-items:end;
    height:.34in;
  }
  .crow.head .clabel{ font-size:7.2pt; align-self:end; }
  .crow.head .cnum{ text-align:right; }
  .clabel{ color:#173229; font-size:7.3pt; }
  .cnum{ text-align:right; color:#33453c; font-size:6.9pt; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .crow.subtotal{ border-top:1px solid #003f28; border-bottom:0; padding-top:.05in; }
  .crow.subtotal .clabel, .crow.subtotal .cnum{ color:#003f28; font-weight:800; }
  .crow.grand{
    margin-top:.03in;
    border-top:1.5px solid #003f28;
    border-bottom:1.5px solid #003f28;
    padding:.065in 0;
  }
  .crow.grand .clabel, .crow.grand .cnum{ color:#003f28; font-weight:800; font-size:7.3pt; }
  .crow.grouplabel{
    padding:.075in 0 .02in;
    border-bottom:0;
  }
  .crow.grouplabel .clabel{ color:#53665d; font-size:6.4pt; font-weight:800; letter-spacing:.05em; text-transform:uppercase; }
  .crow.fundrow .clabel{ padding-left:.14in; color:#33453c; font-weight:400; }

  .fledger{ border-top:2px solid #d1be78; }
  .fgroup{
    margin-top:.14in;
    margin-bottom:.06in;
    padding-bottom:.04in;
    border-bottom:1px solid #003f28;
    color:#003f28;
    font:800 8.6pt Georgia, serif;
    text-transform:uppercase;
    letter-spacing:.01em;
  }
  .fgroup:first-child{ margin-top:0; }
  .frow{
    display:grid;
    grid-template-columns:1.65in repeat(5,1fr);
    gap:.08in;
    align-items:center;
    padding:.07in 0;
    border-bottom:1px solid #eef1ee;
  }
  .frow.head{
    border-bottom:1px solid #003f28;
    color:#68786f;
    font-size:6.4pt;
    font-weight:800;
    letter-spacing:.01em;
    text-transform:uppercase;
    padding-bottom:.06in;
  }
  .frow.head .fnum{ text-align:right; }
  .flabel{ color:#173229; font-size:8.2pt; font-weight:700; }
  .fnum{ text-align:right; color:#33453c; font-size:7.9pt; font-variant-numeric:tabular-nums; }
  .change{ color:#0b7741; font-weight:700; }
  .change.is-down{ color:#a24b1e; }
  p.footnote{
    margin:.16in 0 0;
    color:#68786f;
    font-size:6.9pt;
    line-height:1.4;
    font-style:italic;
  }
  footer{
    position:absolute;
    left:.4in;
    right:.4in;
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

const startPage = Number(process.argv[3] || 205);

const page1 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Financial Overview</small>
    <h1>Fund Financial Ledger</h1>
    <p class="intro">Summary schedules outlining revenues, expenditures, and fund balances for each fund, consistent with the Florida State Uniform Accounting System Manual for Local Governments. Total Revenues and Total Expenditures are broken out by fund below; the next page details each of the 15 individual funds' full schedules.</p>
    <div class="cledger">
      ${cHead}
      ${cRow(CONSOLIDATED_TOP[0])}
      ${cGroupLabel("Total Revenues, by Fund")}
      ${REVENUE_BY_FUND.map((r) => cRow(r, "fundrow")).join("")}
      ${cRow(REVENUE_BY_FUND_TOTAL, "subtotal")}
      ${cRow(CONSOLIDATED_MID[0])}
      ${cRow(CONSOLIDATED_MID[1], "subtotal")}
      ${cGroupLabel("Total Expenditures, by Fund")}
      ${EXPENDITURE_BY_FUND.map((r) => cRow(r, "fundrow")).join("")}
      ${cRow(EXPENDITURE_BY_FUND_TOTAL, "subtotal")}
      ${cRow(CONSOLIDATED_MID2[0])}
      ${cRow(CONSOLIDATED_MID2[1], "subtotal")}
      ${cRow(CONSOLIDATED_BOTTOM[0], "grand")}
      ${cRow(CONSOLIDATED_BOTTOM[1], "grand")}
    </div>
    <footer><span>FY 2027 Annual Budget</span><b>${startPage}</b></footer>
  </section>
`;

const page2 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h1 class="continued">Fund Financial Ledger <span class="sub">(continued)</span></h1>
    <h2 style="margin-top:.1in;">Individual Fund Summary, FY2027</h2>
    <div class="fledger">
      ${fHead}
      <div class="fgroup">Major Funds</div>
      ${MAJOR_FUNDS.map(fRow).join("")}
      <div class="fgroup">Non-Major Funds</div>
      ${NON_MAJOR_FUNDS.map(fRow).join("")}
    </div>
    <p class="footnote">*Building Fund's own schedule shows $0 in Total Revenue because a $4,000,000 "balance brought forward" line is intentionally excluded here to avoid double-counting against the Beginning Fund Balance shown above it. That $4,000,000 is included in the Consolidated Fund Financial Schedule's countywide totals on the previous page, which is why summing these 15 funds' revenue does not exactly reach the Consolidated total.</p>
    <footer><span>FY 2027 Annual Budget</span><b>${startPage + 1}</b></footer>
  </section>
`;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Fund Financial Ledger</title>
<style>${sharedCss}</style></head>
<body>${page1}${page2}</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-fund-financial-ledger.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
