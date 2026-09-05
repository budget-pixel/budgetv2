import { chromium } from "playwright";

// Rebuilds the "Departments and Services" chapter's guide/TOC page as a
// two-level hierarchy: the County's 15 Board departments (matching the
// Department Operating Ledger's own rollup, which now sits immediately
// before this chapter), each followed by the individual office pages
// that report under it. Ten of the 15 map one-to-one to their own page;
// County Administration Offices and Environmental Services are both a
// parent AND an individual office in their own right; Parks & Recreation,
// Beach Operations, and Tourism Administration are pure rollups with no
// page of their own (the latter two pending the same data-verification
// exclusion noted throughout this chapter).

const DEPT_OP_LEDGER_PAGE = 39;

// [parentLabel, parentPage or null, [childLabel, childPage][]]
const GROUPS = [
  ["Beach Operations", null, [
    ["Tourism Lifeguard Services and Beach Safety", 67]
  ]],
  ["Building Department", 43, []],
  ["Building Construction and Maintenance", 42, []],
  ["Code Compliance", 44, []],
  ["County Administration Offices", 45, [
    ["Extension Office", 51],
    ["Geographic Info Systems", 52],
    ["Housing &amp; Urban Development", 53],
    ["Human Resources", 54],
    ["Libraries", 55],
    ["Probation", 61],
    ["Soil Conservation", 65],
    ["Veteran Services", 68]
  ]],
  ["Emergency Management", 48, []],
  ["Engineering Department", 49, []],
  ["Environmental Services", null, [
    ["Environmental Resources", 50],
    ["Mosquito Control", 56],
    ["Mossy Head Wastewater Treatment Facility", 57],
    ["Solid Waste", 66]
  ]],
  ["Office of Management and Budget", 58, []],
  ["Office of the County Attorney", 59, []],
  ["Parks &amp; Recreation", null, [
    ["Eagle Springs Golf and Recreation Center", 46],
    ["Eagle Springs Grill", 47],
    ["Recreation", 64]
  ]],
  ["Planning", 60, []],
  ["Public Works", 62, []],
  ["Purchasing", 63, []],
  ["Tourism Administration", null, []]
];

const css = `
  @page{ size:letter portrait; margin:0; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ font-family:Arial, Helvetica, sans-serif; color:#173229; }
  section{ position:relative; width:8.5in; height:11in; padding:.5in .625in .5in; background:#ffffff; }
  header{ display:flex; justify-content:space-between; padding-bottom:9px; border-bottom:1px solid #63736b; color:#53665d; font-size:8pt; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
  header em{ font-style:normal; }
  small.kicker{ display:block; margin-top:.3in; color:#b89521; font-size:8pt; font-weight:900; letter-spacing:.14em; text-transform:uppercase; }
  h1{ margin:8px 0 .08in; color:#003f28; font:800 26pt/1.05 Georgia, "Times New Roman", serif; letter-spacing:-.02em; }
  p.intro{ max-width:6.8in; margin:0 0 .14in; color:#54665e; font-size:8.4pt; line-height:1.4; }
  .ledger-row{ display:flex; justify-content:space-between; align-items:baseline; padding:6px 0; margin-bottom:.06in; border-bottom:2px solid #d1be78; font-size:8.6pt; }
  .ledger-row span{ color:#003f28; font-weight:800; text-transform:uppercase; letter-spacing:.02em; font-size:7.6pt; }
  .ledger-row b{ color:#006231; font-weight:700; font-size:8.6pt; }
  .parent-row{ display:flex; justify-content:space-between; align-items:baseline; padding:4.5px 0; border-bottom:1px solid #003f28; font-size:8.4pt; margin-top:.06in; }
  .parent-row span{ color:#003f28; font-weight:800; }
  .parent-row b{ color:#006231; font-weight:700; font-size:8.2pt; }
  .child-row{ display:flex; justify-content:space-between; align-items:baseline; padding:3.4px 0 3.4px .18in; border-bottom:1px solid #f1f4f1; font-size:7.6pt; }
  .child-row span{ color:#33453c; font-weight:400; }
  .child-row span:before{ content:"\\2013  "; color:#a9c4b3; }
  .child-row b{ color:#006231; font-weight:700; font-size:7.6pt; }
  footer{ position:absolute; left:.625in; right:.625in; bottom:.28in; display:flex; justify-content:space-between; border-top:1px solid #cbd8d1; padding-top:7px; color:#68786f; font-size:7.5pt; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
`;

function parentNote(page, children) {
  if (page) return `<b>${page}</b>`;
  if (children.length) return `<b style="color:#68786f;font-weight:400;font-style:italic;font-size:6.8pt;text-transform:none;letter-spacing:0;">rollup, see below</b>`;
  return `<b style="color:#68786f;font-weight:400;font-style:italic;font-size:6.8pt;text-transform:none;letter-spacing:0;">excluded, data verification</b>`;
}
const groupsHtml = GROUPS.map(([label, page, children]) => `
  <div class="parent-row"><span>${label}</span>${parentNote(page, children)}</div>
  ${children.map(([clabel, cpage]) => `<div class="child-row"><span>${clabel}</span><b>${cpage}</b></div>`).join("")}
`).join("");

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>TOC</title><style>${css}</style></head>
<body>
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Budget Book Guide</small>
    <h1>Departments and Services</h1>
    <p class="intro">A statement of function, department goal, core services, performance measures, and budget summary for each Board department office and program, organized under the County's 15 Board departments. Tourism Administration and Tourism Beach Operations are not included pending a data verification issue on the live budget site.</p>
    <div class="ledger-row"><span>Department Operating Ledger (Summary by Department)</span><b>${DEPT_OP_LEDGER_PAGE}</b></div>
    ${groupsHtml}
    <footer><span>FY 2027 Annual Budget</span><b>8</b></footer>
  </section>
</body></html>`;

const outPath = process.argv[2] || "/private/tmp/toc-departments.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
