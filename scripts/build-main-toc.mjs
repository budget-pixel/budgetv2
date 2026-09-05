import { chromium } from "playwright";

// Rebuilds the book's main "Table of Contents" page (index 4, printed
// page 5) to add the new "Community Priorities and Organizational
// Challenges" chapter entry and renumber every entry after it by +3 --
// the page count that new chapter adds ahead of them. Matches the exact
// styling of the two sibling guide pages (build-departments-toc-page.mjs,
// build-financial-plan-toc-page.mjs), which this page precedes.

const ITEMS = [
  ["GFOA Distinguished Budget Presentation Award", 2],
  ["Transmittal Letter", 3],
  ["Overview of Walton County", 11],
  ["Organizational Structure", 14],
  ["Program Budget and Strategic Initiatives", 15],
  ["Community Priorities and Organizational Challenges", 16],
  ["Budget in Brief", 19],
  ["Budget Process", 20],
  ["Budget Calendar", 21],
  ["Statistical and Supplemental Information", 22]
];

const css = `
  @page{ size:letter portrait; margin:0; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ font-family:Arial, Helvetica, sans-serif; color:#173229; }
  section{
    position:relative;
    width:8.5in;
    height:11in;
    padding:.52in .625in .58in;
    background:#ffffff;
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
  small.kicker{
    display:block;
    margin-top:.4in;
    color:#b89521;
    font-size:8pt;
    font-weight:900;
    letter-spacing:.14em;
    text-transform:uppercase;
  }
  h1{
    margin:8px 0 .1in;
    color:#003f28;
    font:800 29pt/1.05 Georgia, "Times New Roman", serif;
    letter-spacing:-.02em;
  }
  p.intro{
    max-width:6.6in;
    margin:0 0 .22in;
    color:#54665e;
    font-size:9pt;
    line-height:1.45;
  }
  .row{
    display:flex;
    justify-content:space-between;
    align-items:baseline;
    padding:7.5px 0;
    border-bottom:1px solid #e4ebe7;
    font-size:9.2pt;
  }
  .row span{ color:#173229; font-weight:700; }
  .row b{ color:#006231; font-weight:700; font-size:9pt; }
  footer{
    position:absolute;
    left:.625in;
    right:.625in;
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

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>TOC</title><style>${css}</style></head>
<body>
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Budget Book Guide</small>
    <h1>Table of Contents</h1>
    <p class="intro">A complete guide to Walton County's community context, operating departments, financial plan, and capital program.</p>
    <h2 style="margin:0 0 .06in;color:#003f28;font:800 11pt Georgia, serif;">Introduction and Our County</h2>
    ${ITEMS.map(([label, num]) => `<div class="row"><span>${label}</span><b>${num}</b></div>`).join("")}
    <footer><span>FY 2027 Annual Budget</span><b>5</b></footer>
  </section>
</body></html>`;

const outPath = process.argv[2] || "/private/tmp/toc-main.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
