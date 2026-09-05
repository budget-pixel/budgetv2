import { chromium } from "playwright";
import QRCode from "qrcode";

// Builds the FY 2027 Budget Book's "Property Tax Allocation" section as
// its own multi-page PDF. Content is the real FY2027 Ad Valorem allocation
// from the live site's Property Tax Allocation Ledger (pages/summary-of-
// property-tax-allocations.html), verified against the live revenues CSV
// (DATA_SOURCES.revenues in assets/budget-data.js) rather than attempting
// to reproduce that page's interactive per-address tax-bill calculator --
// dropped here as a web-only tool with no print equivalent, same call made
// for Organizational Structure's "View Full-Size Chart" button.
//
// Two totals appear in the source data and are NOT interchangeable:
// $159,639,395 is the County government's own Ad Valorem allocation
// (excludes the North Walton Mosquito Control District, which levies its
// own separate 0.441-mill rate); $161,066,332 is the all-funds total
// including Mosquito Control. This page uses and labels the County-only
// figure throughout, consistent with the live page's own "Total
// Countywide Ad Valorem Revenue" KPI.

const STATS = [
  ["$159.6M", "Total Countywide Ad Valorem Revenue"],
  ["3.4347", "Tentative FY2027 Millage Rate"],
  ["3.7782", "Two-Thirds Vote Maximum"],
  ["0.441", "Mosquito Control District (Separate)"]
];

const row = ([name, amount, pct], rowClass) => {
  const cls = rowClass ? ` ${rowClass}` : "";
  return `<div class="dept-row${cls}"><div class="dept-name">${name}</div><div class="num">${amount}</div><div class="num pct">${pct}</div></div>`;
};

const tableHead = `<div class="dept-row head"><div class="dept-name">Recipient</div><div class="num">FY 2027 Ad Valorem Revenue</div><div class="num">% of Total</div></div>`;

const CONSTITUTIONAL = [
  ["Sheriff's Office", "$98,004,256", "61.39%"],
  ["Clerk of Court", "$6,871,175", "4.30%"],
  ["Property Appraiser", "$4,954,338", "3.10%"],
  ["Board of County Commissioners", "$4,491,053", "2.81%"],
  ["Tax Collector", "$4,449,400", "2.79%"],
  ["Supervisor of Elections", "$1,663,865", "1.04%"]
];
const CONSTITUTIONAL_TOTAL = ["Total Constitutional Officers", "$120,434,087", "75.44%"];

const INDEPENDENT = [
  ["Statutory & Other Agency Funding", "$3,247,957", "2.03%"],
  ["Walton County Health Department", "$1,724,397", "1.08%"],
  ["South Walton Fire", "$980,074", "0.61%"],
  ["Medical Examiner", "$881,930", "0.55%"],
  ["Non-Profit Funding Program", "$450,000", "0.28%"],
  ["State Attorney", "$297,111", "0.19%"],
  ["Public Defender", "$290,833", "0.18%"],
  ["Circuit Court", "$111,493", "0.07%"],
  ["County Court", "$70,056", "0.04%"]
];
const INDEPENDENT_TOTAL = ["Total Independent Agencies", "$8,053,851", "5.04%"];

const CAPITAL = [["Capital Projects", "$25,035,734", "15.68%"]];
const CAPITAL_TOTAL = ["Total Capital", "$25,035,734", "15.68%"];

const BOARD_DEPTS = [
  ["County Administration", "$1,847,203", "1.16%"],
  ["Building Construction and Maintenance", "$1,426,130", "0.89%"],
  ["Planning", "$1,195,917", "0.75%"],
  ["Office of the County Attorney", "$674,542", "0.42%"],
  ["Environmental Services", "$640,922", "0.40%"],
  ["Code Compliance", "$331,009", "0.21%"]
];
const BOARD_TOTAL = ["Total Board Departments", "$6,115,723", "3.83%"];

const GRAND_TOTAL = ["Total Countywide Ad Valorem Revenue", "$159,639,395", "100.00%"];

const EXAMPLE_ROWS = [
  ["Sheriff's Office", "61.39%", "$632.51"],
  ["Capital Projects", "15.68%", "$161.57"],
  ["Clerk of Court", "4.30%", "$44.31"],
  ["Property Appraiser", "3.10%", "$31.94"],
  ["Board of County Commissioners", "2.81%", "$28.95"],
  ["Tax Collector", "2.79%", "$28.75"],
  ["All Other Entities", "9.93%", "$102.38"]
];

const PROPERTY_TAX_CALCULATOR_URL = "https://budget-waltoncountyfl.com/pages/summary-of-property-tax-allocations.html?embed=calculator";
const PROPERTY_TAX_QR = await QRCode.toDataURL(PROPERTY_TAX_CALCULATOR_URL, {
  margin: 1,
  width: 260,
  color: { dark: "#003f28", light: "#ffffff" }
});

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
    font:800 21pt/1.05 Georgia, "Times New Roman", serif;
    letter-spacing:-.02em;
  }
  h1.continued{ font-size:15pt; margin-top:.16in; }
  h1.continued span{ color:#68786f; font-size:9.5pt; font-weight:400; }
  p.intro{
    max-width:7.3in;
    margin:0 0 .18in;
    color:#33453c;
    font-size:9.1pt;
    line-height:1.42;
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
    font-size:6.3pt;
    font-weight:800;
    letter-spacing:.02em;
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
  .dept-table{ border-top:2px solid #d1be78; }
  .dept-row{
    display:grid;
    grid-template-columns:1fr 1.5in 1in;
    gap:.12in;
    padding:.062in 0;
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
  .dept-name{ color:#173229; font-size:8.6pt; }
  .num{
    text-align:right;
    color:#33453c;
    font-size:8.4pt;
    font-variant-numeric:tabular-nums;
  }
  .pct{ color:#003f28; font-weight:700; }
  .dept-row.total{
    border-top:1.5px solid #003f28;
    border-bottom:0;
    padding-top:.07in;
  }
  .dept-row.total .dept-name{ color:#003f28; font-weight:800; }
  .dept-row.total .num{ color:#003f28; font-weight:800; }
  .dept-row.grand{
    margin-top:.12in;
    border-top:2.5px solid #003f28;
    padding-top:.1in;
  }
  .dept-row.grand .dept-name{ color:#003f28; font:800 10.5pt Georgia, serif; }
  .dept-row.grand .num{ color:#003f28; font:800 10.5pt Georgia, serif; }
  .example-card{
    margin-top:.24in;
    padding:.2in .24in;
    border:1px solid #d1be78;
    border-radius:12px;
    background:#f9f8f2;
  }
  .example-card h2{
    margin:0 0 .06in;
    color:#003f28;
    font:800 11pt/1.2 Georgia, serif;
  }
  .example-card p{
    margin:0 0 .12in;
    color:#33453c;
    font-size:8.4pt;
    line-height:1.42;
  }
  .example-head{
    display:grid;
    grid-template-columns:1fr 1.22in;
    gap:.2in;
    align-items:start;
  }
  .tax-qr{
    padding:.1in;
    border-radius:10px;
    background:#003f28;
    text-align:center;
  }
  .tax-qr img{
    display:block;
    width:.86in;
    height:.86in;
    margin:0 auto .055in;
    padding:3px;
    border-radius:4px;
    background:#fff;
  }
  .tax-qr b{
    display:block;
    color:#e7c95f;
    font-size:6.8pt;
    line-height:1.2;
    text-transform:uppercase;
  }
  .tax-qr span{
    display:block;
    margin-top:.025in;
    color:#dce9e1;
    font-size:5.8pt;
    line-height:1.25;
  }
  .example-total{
    display:flex;
    align-items:baseline;
    gap:.14in;
    margin:0 0 .12in;
  }
  .example-total b{
    color:#003f28;
    font:800 20pt/1 Georgia, serif;
  }
  .example-total span{
    color:#68786f;
    font-size:8pt;
  }
  .example-table{ border-top:1px solid #d1be78; }
  .example-row{
    display:grid;
    grid-template-columns:1fr .8in .9in;
    gap:.1in;
    padding:.045in 0;
    border-bottom:1px solid #eef1ee;
    font-size:8pt;
  }
  .example-row .ent{ color:#173229; }
  .example-row .share{ text-align:right; color:#68786f; }
  .example-row .amt{ text-align:right; color:#003f28; font-weight:700; }
  .footnote{
    margin:.14in 0 0;
    color:#68786f;
    font-size:7pt;
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
    <h1>Property Tax Allocation</h1>
    <p class="intro">How Walton County&rsquo;s share of a property tax bill is distributed across Constitutional Officers, Independent Agencies, Capital projects, and Board Departments. Figures exclude the North Walton Mosquito Control District, a separate taxing district with its own millage rate.</p>
    <div class="stat-strip">
      ${STATS.map(([v, l]) => `<div class="stat-card"><b>${v}</b><span>${l}</span></div>`).join("")}
    </div>

    <h2 class="group">Constitutional Officers</h2>
    <div class="dept-table">
      ${tableHead}
      ${CONSTITUTIONAL.map((r) => row(r)).join("")}
      ${row(CONSTITUTIONAL_TOTAL, "total")}
    </div>

    <h2 class="group">Independent Agencies</h2>
    <div class="dept-table">
      ${INDEPENDENT.map((r) => row(r)).join("")}
      ${row(INDEPENDENT_TOTAL, "total")}
    </div>

    <h2 class="group">Capital</h2>
    <div class="dept-table">
      ${CAPITAL.map((r) => row(r)).join("")}
      ${row(CAPITAL_TOTAL, "total")}
    </div>

    <footer><span>FY 2027 Annual Budget</span><b>PAGE_A</b></footer>
  </section>
`;

const page2 = `
  <section>
    ${pageHeader()}
    <h1 class="continued">Property Tax Allocation <span>(continued)</span></h1>

    <h2 class="group" style="margin-top:.12in">Board Departments</h2>
    <div class="dept-table">
      ${tableHead}
      ${BOARD_DEPTS.map((r) => row(r)).join("")}
      ${row(BOARD_TOTAL, "total")}
    </div>

    <div class="dept-row grand">${row(GRAND_TOTAL)}</div>

    <div class="example-card">
      <div class="example-head">
        <div>
          <h2>What This Means for a Homeowner</h2>
          <p>On a home with $300,000 in taxable value, the County&rsquo;s FY 2027 tentative millage of 3.4347 generates the County portion of the tax bill below, split across recipients in the same proportions as above:</p>
          <div class="example-total"><b>$1,030.41</b><span>Total County portion of the tax bill</span></div>
        </div>
        <div class="tax-qr">
          <img src="${PROPERTY_TAX_QR}" alt="QR code for the Walton County personalized property tax calculator">
          <b>Scan for Your Property</b>
          <span>Enter an address for a customized County tax breakdown.</span>
        </div>
      </div>
      <div class="example-table">
        ${EXAMPLE_ROWS.map(([ent, share, amt]) => `<div class="example-row"><div class="ent">${ent}</div><div class="share">${share}</div><div class="amt">${amt}</div></div>`).join("")}
      </div>
    </div>

    <p class="footnote">This is an illustrative example of the County-government portion of a tax bill only; it excludes the separate levies of the School Board, Northwest Florida Water Management District, and the North Walton Mosquito Control District that also appear on an actual property tax bill. The County government&rsquo;s share is calculated as taxable value &times; millage &divide; 1,000, then apportioned by each entity&rsquo;s share of total Ad Valorem revenue.</p>

    <footer><span>FY 2027 Annual Budget</span><b>PAGE_B</b></footer>
  </section>
`;

const startPage = Number(process.argv[3] || 172);
const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Property Tax Allocation</title>
<style>${sharedCss}</style></head>
<body>${page1.replace("PAGE_A", startPage)}${page2.replace("PAGE_B", startPage + 1)}</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-property-tax-allocation.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
