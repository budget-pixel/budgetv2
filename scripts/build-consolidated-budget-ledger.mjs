import { chromium } from "playwright";

// Builds the FY 2027 Budget Book's "Consolidated Budget Ledger" as two
// PORTRAIT pages (rebuilt from the original single landscape page, which
// was too wide to sit comfortably in a book otherwise entirely portrait).
// Splits the 9 fund columns across the two pages -- page 1 carries the
// five primary operating funds (General, Transportation, Sheriff,
// Tourist Development, Solid Waste); page 2 carries the remaining three
// funds plus the Total All Funds column (Capital Projects, Mosquito
// Control, Non-Major Governmental, Total All Funds). Every revenue and
// expenditure line item repeats on both pages so each is readable on its
// own, consistent with how this book handles other multi-page ledgers.
//
// Content is the same real, already-reconciled FY2027 data used in the
// original landscape build (Total Revenue == Total Expenditure ==
// $488,887,492 across governmental funds; excludes the Self-Insurance
// Fund, an internal service fund not part of this schedule).

const FUND_COLUMNS = [
  "General Fund", "Transportation Fund", "Sheriff Fund", "Tourist Development Fund", "Solid Waste Fund",
  "Capital Projects Fund", "Mosquito Control Fund", "Non-Major Governmental Funds", "Total All Funds"
];
const PAGE_SPLITS = [[0, 1, 2, 3, 4], [5, 6, 7, 8]];

const MILLAGE_ROW = ["Millage per $1,000", "3.4347", "–", "–", "–", "–", "–", "0.4410", "–", "–"];

const REVENUE_ROWS = [
  ["Property Taxes (Ad Valorem)", "$159,639,395", "$0", "$0", "–", "–", "$0", "$1,426,937", "$0", "$161,066,332"],
  ["General Government Taxes (excl. Property)", "$350,000", "$4,810,212", "–", "$58,965,950", "$40,000,000", "–", "–", "–", "$104,126,162"],
  ["Permits, Fees, and Special Assessments", "$3,400,000", "$0", "–", "–", "$0", "–", "–", "$0", "$3,400,000"],
  ["Intergovernmental Revenues", "$20,992,331", "$3,365,000", "$1,380,000", "$0", "$0", "$0", "$0", "$3,586,644", "$29,323,975"],
  ["Charges for Services", "$6,550,936", "$85,000", "$7,976,972", "$0", "$560,000", "–", "$0", "$43,225", "$15,216,133"],
  ["Judgments, Fines and Forfeits", "$227,500", "–", "$60,000", "–", "–", "–", "–", "$0", "$287,500"],
  ["Miscellaneous Revenue", "$9,068,336", "$2,526,000", "$2,105,000", "$0", "$141,564", "$0", "$0", "$700,000", "$14,540,900"],
  ["Other Sources", "$4,050,600", "$4,881,906", "$4,130,000", "–", "–", "$0", "$0", "$4,200,000", "$17,262,506"]
];
const REVENUE_TOTAL = ["Revenues Total", "$204,279,098", "$15,668,118", "$15,651,972", "$58,965,950", "$40,701,564", "$0", "$1,426,937", "$8,529,869", "$345,223,508"];
const OTHER_SOURCES = ["Other Financial Sources", "$2,581,997", "$15,000,000", "$98,464,256", "$0", "–", "$27,617,731", "–", "–", "$143,663,984"];
const REVENUE_GRAND = ["Total Revenue and Other Financial Sources", "$206,861,095", "$30,668,118", "$114,116,228", "$58,965,950", "$40,701,564", "$27,617,731", "$1,426,937", "$8,529,869", "$488,887,492"];

const EXPENDITURE_ROWS = [
  ["General Government", "$51,893,579", "$464,000", "–", "–", "–", "–", "–", "–", "$52,357,579"],
  ["Public Safety", "$8,455,690", "–", "$114,116,228", "–", "–", "–", "–", "$4,000,000", "$126,571,918"],
  ["Physical Environment", "$1,396,241", "–", "–", "–", "$23,119,567", "–", "$1,426,937", "$43,225", "$25,985,970"],
  ["Transportation", "$0", "$30,204,118", "–", "–", "–", "$27,617,731", "–", "$300,000", "$58,121,849"],
  ["Economic Environment", "$421,444", "–", "–", "$58,965,950", "–", "–", "–", "$3,057,056", "$62,444,450"],
  ["Human Services", "$5,180,447", "–", "–", "–", "–", "–", "–", "$69,588", "$5,250,035"],
  ["Culture and Recreation", "$5,506,603", "–", "–", "–", "–", "–", "–", "$600,000", "$6,106,603"],
  ["Court Related Cost", "$7,985,104", "–", "–", "–", "–", "–", "–", "–", "$7,985,104"],
  ["Other Uses", "$400,000", "–", "–", "–", "–", "–", "–", "–", "$400,000"]
];
const EXPENDITURE_TOTAL = ["Expenditures Total", "$81,239,108", "$30,668,118", "$114,116,228", "$58,965,950", "$23,119,567", "$27,617,731", "$1,426,937", "$8,069,869", "$345,223,508"];
const OTHER_USES = ["Other Financial Uses", "$125,621,987", "–", "–", "–", "$17,581,997", "–", "–", "$460,000", "$143,663,984"];
const EXPENDITURE_GRAND = ["Total Expenditure and Other Financial Uses", "$206,861,095", "$30,668,118", "$114,116,228", "$58,965,950", "$40,701,564", "$27,617,731", "$1,426,937", "$8,529,869", "$488,887,492"];

function pick(row, cols) { return [row[0], ...cols.map((c) => row[c + 1])]; }

function dataRow(cells, cls) {
  return `<div class="lrow${cls ? " " + cls : ""}"><div class="rlabel">${cells[0]}</div>${cells.slice(1).map((c) => `<div class="rnum">${c}</div>`).join("")}</div>`;
}

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
    margin-top:.24in;
    color:#b89521;
    font-size:8pt;
    font-weight:900;
    letter-spacing:.14em;
    text-transform:uppercase;
  }
  h1{
    margin:8px 0 .04in;
    color:#003f28;
    font:800 21pt/1.05 Georgia, "Times New Roman", serif;
    letter-spacing:-.02em;
  }
  h1 span.sub{ color:#68786f; font-size:13pt; font-weight:400; }
  p.intro{
    max-width:7.3in;
    margin:0 0 .16in;
    color:#33453c;
    font-size:8.4pt;
    line-height:1.4;
    min-height:23.6pt;
  }
  .ledger{ border-top:2px solid #d1be78; margin-top:.08in; }
  .lrow{
    display:grid;
    grid-template-columns:1.6in repeat(5,1fr);
    gap:.06in;
    align-items:center;
    padding:.05in 0;
    border-bottom:1px solid #eef1ee;
  }
  .lrow.cols4{ grid-template-columns:1.6in repeat(4,1fr); }
  .lrow.head{
    border-bottom:1px solid #003f28;
    color:#68786f;
    font-size:6.3pt;
    font-weight:800;
    letter-spacing:.01em;
    text-transform:uppercase;
    line-height:1.2;
    height:.5in;
    padding-bottom:.07in;
    align-items:end;
  }
  .lrow.head .rnum{ text-align:right; }
  .rlabel{ color:#173229; font-size:7.6pt; }
  .rnum{
    text-align:right;
    color:#33453c;
    font-size:7.4pt;
    font-variant-numeric:tabular-nums;
  }
  .lrow.millage .rlabel{ color:#b89521; font-weight:800; font-size:7.4pt; text-transform:uppercase; letter-spacing:.03em; }
  .lrow.millage .rnum{ color:#b89521; font-weight:800; }
  .lrow.section{
    border-bottom:0;
    padding-top:.1in;
  }
  .lrow.section .rlabel{
    color:#003f28;
    font:800 9.5pt Georgia, serif;
  }
  .lrow.subtotal{
    border-top:1px solid #003f28;
    border-bottom:0;
    padding-top:.05in;
  }
  .lrow.subtotal .rlabel,
  .lrow.subtotal .rnum{ color:#003f28; font-weight:800; }
  .lrow.grand{
    margin-top:.04in;
    border-top:1.5px solid #003f28;
    border-bottom:1.5px solid #003f28;
    padding:.07in 0;
  }
  .lrow.grand .rlabel,
  .lrow.grand .rnum{ color:#003f28; font-weight:800; font-size:7.8pt; }
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

function buildPage(colIdx, pageNumber, isFirst) {
  const cls = colIdx.length === 4 ? " cols4" : "";
  const cols = FUND_COLUMNS.filter((_, i) => colIdx.includes(i));
  const head = `<div class="lrow head${cls}"><div class="rlabel">Row Labels</div>${cols.map((f) => `<div class="rnum">${f}</div>`).join("")}</div>`;
  const millage = dataRow(pick(MILLAGE_ROW, colIdx), `millage${cls}`);
  const revRows = REVENUE_ROWS.map((r) => dataRow(pick(r, colIdx), cls.trim()));
  const revTotal = dataRow(pick(REVENUE_TOTAL, colIdx), `subtotal${cls}`);
  const otherSrc = dataRow(pick(OTHER_SOURCES, colIdx), cls.trim());
  const revGrand = dataRow(pick(REVENUE_GRAND, colIdx), `grand${cls}`);
  const expRows = EXPENDITURE_ROWS.map((r) => dataRow(pick(r, colIdx), cls.trim()));
  const expTotal = dataRow(pick(EXPENDITURE_TOTAL, colIdx), `subtotal${cls}`);
  const otherUse = dataRow(pick(OTHER_USES, colIdx), cls.trim());
  const expGrand = dataRow(pick(EXPENDITURE_GRAND, colIdx), `grand${cls}`);

  return `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Financial Overview</small>
    <h1>Consolidated Budget Ledger${isFirst ? "" : ` <span class="sub">(continued)</span>`}</h1>
    <p class="intro">${isFirst
      ? "FY2027 revenue and expenditures across Walton County's governmental funds, by category. Continued on the next page with the remaining funds and the countywide total."
      : "Continued from the previous page, in the same row order &mdash; the remaining Capital Projects, Mosquito Control, and Non-Major Governmental Funds, plus the countywide Total All Funds column."}</p>
    <div class="ledger">
      ${head}
      ${millage}
      <div class="lrow section${cls}"><div class="rlabel">Revenue Budget</div></div>
      ${revRows.join("")}
      ${revTotal}
      ${otherSrc}
      ${revGrand}
      <div class="lrow section${cls}"><div class="rlabel">Expenditure Budget</div></div>
      ${expRows.join("")}
      ${expTotal}
      ${otherUse}
      ${expGrand}
    </div>
    <footer><span>FY 2027 Annual Budget</span><b>${pageNumber}</b></footer>
  </section>
  `;
}

const startPage = Number(process.argv[3] || 168);
const page1 = buildPage(PAGE_SPLITS[0], startPage, true);
const page2 = buildPage(PAGE_SPLITS[1], startPage + 1, false);

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Consolidated Budget Ledger</title>
<style>${sharedCss}</style></head>
<body>${page1}${page2}</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-consolidated-ledger.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
