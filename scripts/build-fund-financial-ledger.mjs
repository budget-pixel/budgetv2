import { capturePublicationHtml } from "./publication-print.mjs";
import { chromium } from "playwright";

// Fund schedules and outlook share one verified snapshot of the live site.
import { schedules, consolidated, individualFunds, printRow, values, currency } from "./fund-schedule-data.mjs";

const YEARS = ["FY22 Actual", "FY23 Actual", "FY24 Actual", "FY25 Actual", "FY26 Budget", "FY27 Final"];
const CONSOLIDATED_TOP = [printRow(consolidated, "Beginning Fund Balance")];
const CONSOLIDATED_MID = [
  printRow(consolidated, "Other Financial Sources"),
  printRow(consolidated, "Total Revenue and Other Financial Sources", "Total Revenue and Other Sources")
];
const CONSOLIDATED_MID2 = [
  printRow(consolidated, "Other Financial Uses"),
  printRow(consolidated, "Total Expenditures and Other Financial Uses", "Total Expenditures and Other Uses")
];
const CONSOLIDATED_BOTTOM = [
  printRow(consolidated, "Change in Fund Balance"),
  printRow(consolidated, "Estimated Ending Fund Balance")
];
const labels = ["General Fund", "Transportation Fund", "Fine & Forfeiture / Sheriff Fund", "Tourist Development Fund", "Solid Waste Fund", "Capital Projects Fund", "Mosquito Control Fund"];
const groupedFunds = [individualFunds[0], individualFunds[1], individualFunds[2], individualFunds[3], individualFunds[4], individualFunds[5], individualFunds[10]];
function byFund(label) {
  const rows = groupedFunds.map((fund, i) => printRow(fund, label, labels[i]));
  const nonMajor = individualFunds.filter(fund => !groupedFunds.includes(fund));
  rows.push(["Non-Major Funds", ...[2, 3, 4, 5, 6, 7].map(i => currency(nonMajor.reduce((sum, fund) => sum + values(fund, label)[i], 0)))]);
  return rows;
}
const REVENUE_BY_FUND = byFund("Total Revenues");
const REVENUE_BY_FUND_TOTAL = printRow(consolidated, "Total Revenues", "Total Revenues, All Funds");
const EXPENDITURE_BY_FUND = byFund("Total Expenditures");
const EXPENDITURE_BY_FUND_TOTAL = printRow(consolidated, "Total Expenditures", "Total Expenditures, All Funds");
const fundSummary = fund => [fund.name, ...[
  "Beginning Fund Balance", "Total Revenue and Other Financial Sources", "Total Expenditures and Other Financial Uses",
  "Change in Fund Balance", "Estimated Ending Fund Balance"
].map(label => currency(values(fund, label)[7]))];
const MAJOR_FUNDS = individualFunds.slice(0, 6).map(fundSummary);
const NON_MAJOR_FUNDS = individualFunds.slice(6).map(fundSummary);

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
  h1.continued{ font-size:16pt; margin-top:.22in; }
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
    <p class="intro">Summary schedules outlining revenues, expenditures, and fund balances for each fund, consistent with the Florida State Uniform Accounting System Manual for Local Governments. FY 2027 uses the FY 2025 audited unassigned General Fund balance as its opening assumption. Other funds retain their total balance basis. The next page details each fund's FY 2027 schedule.</p>
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
    <footer><span>FY 2027 Final Budget</span><b>${startPage}</b></footer>
  </section>
`;

const page2 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h1 class="continued">Fund Financial Ledger <span class="sub">(continued)</span></h1>
    <h2 style="margin-top:.1in;">Individual Fund Summary, FY 2027</h2>
    <div class="fledger">
      ${fHead}
      <div class="fgroup">Major Funds</div>
      ${MAJOR_FUNDS.map(fRow).join("")}
      <div class="fgroup">Non-Major Funds</div>
      ${NON_MAJOR_FUNDS.map(fRow).join("")}
    </div>
    <p class="footnote" style="font-size:7.5pt"><b>General Fund balance basis:</b> The $58,393,573 beginning balance is the FY 2025 audited unassigned balance used as the FY 2027 opening assumption. After $8,047,270 of planned use, the estimated remaining balance is $50,346,303.</p>
    <p class="footnote" style="font-size:7.5pt"><b>Project allocations:</b> Ending balances shown here do not deduct existing Board allocations for projects. The amount available for other uses may therefore be lower. The Board may release or reallocate project funding as priorities change or emergencies arise, subject to funding restrictions and existing commitments.</p>
    <footer><span>FY 2027 Final Budget</span><b>${startPage + 1}</b></footer>
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
await capturePublicationHtml(page, outPath);
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
