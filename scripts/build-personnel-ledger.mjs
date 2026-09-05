import { chromium } from "playwright";

// Builds the FY 2027 Budget Book's "Personnel Ledger" -- FTE staffing and
// personnel cost by Constitutional Officer and by Board department, FY2026
// vs FY2027. Source: pages/personnel-ledger.html, rendered live and
// cross-checked against a prior working PDF capture. The capture had
// three Board department rows with a dropped department name (a
// department listed alone in its own row, not split across multiple
// funds as first appeared) -- a research pass against the live page
// recovered all three: County Administration Offices, Engineering
// Department, and Environmental Services. Every other figure in both
// tables matched the live source exactly, with zero discrepancies found
// across all 24 department rows.
//
// The live Board Departments table also breaks FY2027 personnel cost
// into Salaries & Wages vs. Retirement/Health/Other Benefits; that split
// is omitted here to match the Constitutional Officers table's cleaner
// FY2026/FY2027 Total Personnel Cost format and keep both tables to one
// page -- the total ties out either way.

const STATS = [
  ["1,515", "Total FY2027 Positions"],
  ["+15", "Net FTE Change"],
  ["$164.2M", "Total FY2027 Personnel Cost"],
  ["+5.4%", "Net Percent Change"]
];

// [department, fund|null, FY26 FTE, FY27 FTE, FTE change, FY26 cost, FY27 cost, cost change]
const CONSTITUTIONAL = [
  ["Board of County Commissioners", null, "11", "11", "0", "$2,552,616", "$2,754,289", "+$201,673"],
  ["Circuit Court", null, "1", "1", "0", "$36,114", "$73,887", "+$37,773"],
  ["Circuit Court – Bailiff Services", null, "0", "0", "0", "$187,097", "$187,097", "$0"],
  ["Clerk of Courts & County Comptroller", null, "77", "80", "+3", "$4,198,783", "$4,905,230", "+$706,447"],
  ["County Court – Bailiff Services", null, "0", "0", "0", "$65,856", "$65,856", "$0"],
  ["Property Appraiser", null, "38", "37", "−1", "$4,030,096", "$4,123,584", "+$93,488"],
  ["Supervisor of Elections", null, "10", "10", "0", "$1,167,077", "$1,198,763", "+$31,686"],
  ["Tax Collector", null, "40", "40", "0", "$7,725,000", "$7,512,920", "−$212,080"],
  ["Walton County Sheriff's Office", null, "668", "669", "+1", "$78,826,289", "$83,607,042", "+$4,780,753"]
];
const CONSTITUTIONAL_TOTAL = ["Total", "", "845", "848", "+3", "$98,788,928", "$104,428,668", "+$5,639,740"];

const BOARD = [
  ["Beach Operations", "Tourist Development Fund", "114", "127", "+13", "$7,256,216", "$8,805,004", "+$1,548,788"],
  ["Building", "Building Fund", "21", "21", "0", "$2,114,158", "$2,312,201", "+$198,043"],
  ["Building Construction & Maintenance", "General Fund", "68", "68", "0", "$5,258,168", "$5,427,755", "+$169,587"],
  ["Code Compliance", "General Fund", "43", "43", "0", "$3,908,159", "$4,260,744", "+$352,585"],
  ["County Administration Offices", "Multiple Funds", "76", "76", "0", "$6,721,989", "$7,109,279", "+$387,290"],
  ["Emergency Management", "General Fund", "5.5", "6", "+0.5", "$661,251", "$704,526", "+$43,275"],
  ["Engineering Department", "Transportation Fund", "17", "15", "−2", "$2,263,438", "$2,177,918", "−$85,520"],
  ["Environmental Services", "Multiple Funds", "42", "42", "0", "$3,666,506", "$3,651,064", "−$15,442"],
  ["Office of Management and Budget", "General Fund", "9", "9", "0", "$1,041,958", "$1,017,276", "−$24,682"],
  ["Office of the County Attorney", "General Fund", "10", "9", "−1", "$1,241,475", "$1,052,925", "−$188,551"],
  ["Parks & Recreation", "General Fund", "24.5", "24", "−0.5", "$1,826,237", "$1,879,813", "+$53,576"],
  ["Planning", "General Fund", "45", "47", "+2", "$4,614,044", "$4,961,086", "+$347,042"],
  ["Public Works", "Transportation Fund", "148", "148", "0", "$13,044,919", "$13,083,100", "+$38,181"],
  ["Purchasing", "General Fund", "10", "10", "0", "$888,295", "$888,999", "+$704"],
  ["Tourism Administration", "Tourist Development Fund", "22", "22", "0", "$2,395,702", "$2,419,413", "+$23,711"]
];
const BOARD_TOTAL = ["Total", "", "655", "667", "+12", "$56,902,515", "$59,751,103", "+$2,848,588"];

function row(cells, cls) {
  const isDown = cells[7].trim().startsWith("−") || cells[7].trim().startsWith("-");
  const cl = cls ? ` ${cls}` : "";
  const fundCell = cells[1] ? `<div class="rfund">${cells[1]}</div>` : `<div class="rfund"></div>`;
  return `<div class="lrow${cl}"><div class="rlabel">${cells[0]}</div>${fundCell}<div class="rnum">${cells[2]}</div><div class="rnum">${cells[3]}</div><div class="rnum">${cells[4]}</div><div class="rnum">${cells[5]}</div><div class="rnum">${cells[6]}</div><div class="rnum change${isDown ? " is-down" : ""}">${cells[7]}</div></div>`;
}

const tableHead = (withFund) => `<div class="lrow head"><div class="rlabel">Department</div><div class="rfund">${withFund ? "Fund" : ""}</div><div class="rnum">FY26 FTE</div><div class="rnum">FY27 FTE</div><div class="rnum">+/&minus;</div><div class="rnum">FY26 Cost</div><div class="rnum">FY27 Cost</div><div class="rnum">+/&minus;</div></div>`;

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
    margin:8px 0 .06in;
    color:#003f28;
    font:800 22pt/1.05 Georgia, "Times New Roman", serif;
    letter-spacing:-.02em;
  }
  p.intro{
    max-width:7.3in;
    margin:0 0 .16in;
    color:#33453c;
    font-size:8.6pt;
    line-height:1.4;
  }
  .stat-strip{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:.12in;
    margin:0 0 .18in;
  }
  .stat-card{
    padding:.11in .08in;
    border-radius:10px;
    background:#003f28;
    text-align:center;
  }
  .stat-card b{
    display:block;
    color:#fff;
    font:800 12.5pt/1.1 Georgia, serif;
  }
  .stat-card span{
    display:block;
    margin-top:.03in;
    color:#e7c95f;
    font-size:6.1pt;
    font-weight:800;
    letter-spacing:.02em;
    text-transform:uppercase;
    line-height:1.25;
  }
  h2{
    margin:.06in 0 .06in;
    color:#003f28;
    font:800 10.5pt/1.2 Georgia, serif;
    padding-bottom:.04in;
    border-bottom:2px solid #d1be78;
  }
  p.subnote{
    margin:0 0 .06in;
    color:#68786f;
    font-size:7.2pt;
    line-height:1.35;
  }
  .ledger{ border-top:1px solid #003f28; }
  .lrow{
    display:grid;
    grid-template-columns:2in 1.15in .62in .62in .5in .82in .82in .82in;
    gap:.05in;
    align-items:center;
    padding:.038in 0;
    border-bottom:1px solid #f1f4f1;
  }
  .lrow.head{
    border-bottom:1px solid #003f28;
    color:#68786f;
    font-size:6pt;
    font-weight:800;
    letter-spacing:.01em;
    text-transform:uppercase;
    padding-bottom:.05in;
  }
  .lrow.head .rnum,
  .lrow.head .rfund{ text-align:right; }
  .rlabel{ color:#173229; font-size:6.8pt; }
  .rfund{ text-align:right; color:#68786f; font-size:6.3pt; font-style:italic; }
  .rnum{
    text-align:right;
    color:#33453c;
    font-size:6.6pt;
    font-variant-numeric:tabular-nums;
    white-space:nowrap;
  }
  .change{ color:#0b7741; font-weight:700; }
  .change.is-down{ color:#a24b1e; }
  .lrow.grand{
    margin-top:.04in;
    border-top:1.5px solid #003f28;
    border-bottom:0;
    padding:.06in 0;
  }
  .lrow.grand .rlabel,
  .lrow.grand .rnum,
  .lrow.grand .rfund{ color:#003f28; font-weight:800; font-size:7.2pt; }
  .footnote{
    margin:.14in 0 0;
    color:#68786f;
    font-size:6.7pt;
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

const startPage = Number(process.argv[3] || 177);

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Personnel Ledger</title>
<style>${sharedCss}</style></head>
<body>
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Financial Overview</small>
    <h1>Personnel Ledger</h1>
    <p class="intro">FY2027 staffing and personnel cost by Constitutional Officer and by Board department, compared to FY2026.</p>

    <div class="stat-strip">${STATS.map(([v, l]) => `<div class="stat-card"><b>${v}</b><span>${l}</span></div>`).join("")}</div>

    <h2>Constitutional Officers</h2>
    <p class="subnote">Only each office's total FTE and total personnel cost are shown; contact the Clerk of Courts, Property Appraiser, Supervisor of Elections, Tax Collector, or Sheriff's Office directly for line-item detail. Bailiff services amounts support court security provided by the Sheriff's Office.</p>
    <div class="ledger">
      ${tableHead(false)}
      ${CONSTITUTIONAL.map((r) => row(r)).join("")}
      ${row(CONSTITUTIONAL_TOTAL, "grand")}
    </div>

    <h2 style="margin-top:.16in;">Board Departments</h2>
    <div class="ledger">
      ${tableHead(true)}
      ${BOARD.map((r) => row(r)).join("")}
      ${row(BOARD_TOTAL, "grand")}
    </div>

    <p class="footnote">Board department totals reflect FY2027 salaries &amp; wages plus retirement, health insurance, and other benefits combined. Departments funded from more than one source are labeled "Multiple Funds."</p>

    <footer><span>FY 2027 Annual Budget</span><b>${startPage}</b></footer>
  </section>
</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-personnel-ledger.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
