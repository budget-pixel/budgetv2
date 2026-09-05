import { chromium } from "playwright";

// Builds the FY 2027 Budget Book's "Department Operating Ledger" --
// an overview/summary page followed by a two-per-page profile spread for
// each of Walton County's 15 Board departments. Source: pages/department-
// ledger.html (live-rendered), assets/department-services-data.js for the
// Services/Challenges/Changes tooltip content, cross-checked by a research
// pass. Per explicit direction, this section shows department totals and
// the Personnel/Contractual/Operating split -- NOT the underlying 336-row
// position-by-position roster (already summarized at the department level
// in the Personnel Ledger; a full roster would run 20+ pages here).
//
// Two data-quality notes carried from the research pass: (1) the live
// site computes two different FY26-to-FY27 percentages for the same
// department in two different UI surfaces for Beach Operations and Code
// Compliance (a live bug, not a capture error) -- every percentage below
// is computed directly from the real FY26/FY27 dollar figures rather than
// trusting either live number, so the page is internally consistent.
// (2) The auto-generated "Changes" sentences on the live site restate a
// $/percent figure inline that can carry the same mismatched percentage;
// this build keeps only the causal clause (what specifically changed)
// and drops the redundant restated $/percent, since that figure is
// already shown in each department's own header stat.

const OVERVIEW_STATS = [
  ["$135.6M", "Total FY2027 Operating Budget"],
  ["+$5.6M", "Net Change from FY2026"],
  ["+4.3%", "Net Percent Change"],
  ["667", "Total FTE, 15 Departments"]
];
const SPLIT = [
  ["Personnel", "$59.75M", "44.1%"],
  ["Contractual Services", "$39.33M", "29.0%"],
  ["Operating", "$36.57M", "27.0%"]
];

// [name, fy26, fy27, fte26, fte27]
const SUMMARY_ROWS = [
  ["Tourism Administration", 27447176, 29673729, 22, 22],
  ["Beach Operations", 12971943, 16082721, 114, 127],
  ["Public Works", 20850672, 20826000, 148, 148],
  ["Environmental Services", 23695761, 23514014, 42, 42],
  ["County Administration Offices", 10368035, 10737378, 76, 76],
  ["Building Construction & Maintenance", 8639168, 8596305, 68, 68],
  ["Planning", 6570086, 6839111, 45, 47],
  ["Code Compliance", 4459159, 4811854, 43, 43],
  ["Building", 4035000, 4000000, 21, 21],
  ["Parks & Recreation", 2919737, 2972948, 24.5, 24],
  ["Engineering Department", 2876106, 2798118, 17, 15],
  ["Office of the County Attorney", 1993475, 1802925, 10, 9],
  ["Purchasing", 1033795, 1026499, 10, 10],
  ["Office of Management and Budget", 1374708, 1075026, 9, 9],
  ["Emergency Management", 804151, 887455, 5.5, 6]
];
const SUMMARY_TOTAL = ["Total Board Departments", 130038972, 135644083, 655, 667];

// Per-department profiles
const DEPARTMENTS = [
  {
    name: "Tourism Administration", fy26: 27447176, fy27: 29673729,
    personnel: 2419413, contractual: 16838279, operating: 10416037,
    fte26: 22, fte27: 22,
    services: [
      ["Promote Walton County destinations", "Coordinates marketing and communications funded for eligible tourism purposes."],
      ["Support visitors and tourism partners", "Provides visitor information, sales support, and destination services."],
      ["Administer tourism resources", "Manages eligible Tourist Development Tax activities, contracts, planning, and accountability."]
    ],
    challenges: "Balancing seasonal visitor demand and community impacts while protecting natural assets and using legally restricted tourism revenues for eligible purposes.",
    changes: "The primary change is Other Services increasing by $1,246,096."
  },
  {
    name: "Beach Operations", fy26: 12971943, fy27: 16082721,
    personnel: 8805004, contractual: 1720000, operating: 5557717,
    fte26: 114, fte27: 127,
    services: [
      ["Maintain public beach access", "Supports cleanliness, amenities, and daily operations at county beach locations."],
      ["Protect and restore beaches", "Coordinates eligible renourishment, shoreline, and beach-preservation work."],
      ["Move visitors to the beach", "Operates eligible transportation and tram activities that support beach access."]
    ],
    challenges: "Balancing seasonal visitor demand and community impacts while protecting natural assets and using legally restricted tourism revenues for eligible purposes.",
    changes: "The primary change is attributed to additional staffing requested, needed to keep pace with growing service demand across the county."
  },
  {
    name: "Public Works", fy26: 20850672, fy27: 20826000,
    personnel: 13083100, contractual: 675000, operating: 7067900,
    fte26: 148, fte27: 148,
    services: [
      ["Maintain roads and rights-of-way", "Repairs and maintains county roads, shoulders, signs, and related transportation assets."],
      ["Manage drainage and storm impacts", "Maintains drainage systems and responds to conditions affecting travel and property."],
      ["Deliver transportation improvements", "Coordinates paving, resurfacing, bridge, and other road improvement work."]
    ],
    challenges: "Keeping pace with growth while maintaining aging assets, managing construction costs, and scheduling work with limited staff and equipment.",
    changes: "The primary change is Infrastructure increasing by $2,646,500."
  },
  {
    name: "Environmental Services", fy26: 23695761, fy27: 23514014,
    personnel: 3651064, contractual: 17287375, operating: 2575575,
    fte26: 42, fte27: 42,
    services: [
      ["Provide waste collection and disposal support", "Coordinates county solid-waste services and disposal operations."],
      ["Operate waste facilities", "Maintains transfer, convenience, recycling, and related solid-waste sites and equipment."],
      ["Monitor and reduce mosquito populations", "Uses field surveillance and appropriate treatment to manage mosquito activity in the service area."]
    ],
    challenges: "Keeping pace with growth while maintaining aging assets, managing construction costs, and scheduling work with limited staff and equipment.",
    changes: "The primary change is Machinery & Equipment increasing by $1,100,000."
  },
  {
    name: "County Administration Offices", fy26: 10368035, fy27: 10737378,
    personnel: 7109279, contractual: 180650, operating: 3447449,
    fte26: 76, fte27: 76,
    services: [
      ["Support housing stability", "Administers eligible housing assistance and improvement activities for residents."],
      ["Carry out Board direction", "Coordinates implementation of policies and decisions adopted by the Board of County Commissioners."],
      ["Coordinate county operations", "Aligns departments, priorities, and executive decisions across Board-controlled government."]
    ],
    challenges: "Meeting changing community needs while managing caseloads, maintaining public access, and delivering reliable service with limited staffing and program capacity.",
    changes: "The primary change is attributed to additional staffing requested, needed to keep pace with growing service demand across the county."
  },
  {
    name: "Building Construction & Maintenance", fy26: 8639168, fy27: 8596305,
    personnel: 5427755, contractual: 235000, operating: 2933550,
    fte26: 68, fte27: 68,
    services: [
      ["Build and renew county facilities", "Plans and delivers construction, renovation, and major repair projects for county buildings."],
      ["Maintain public buildings", "Keeps county facilities safe, functional, and available for the people who use them."],
      ["Manage facility systems", "Coordinates building systems, preventive maintenance, and service requests across county operations."]
    ],
    challenges: "Keeping pace with growth while maintaining aging assets, managing construction costs, and scheduling work with limited staff and equipment.",
    changes: "The primary change is Infrastructure decreasing by $855,000."
  },
  {
    name: "Planning", fy26: 6570086, fy27: 6839111,
    personnel: 4961086, contractual: 1222000, operating: 656025,
    fte26: 45, fte27: 47,
    services: [
      ["Guide long-range growth", "Maintains planning policies that shape future land use and community development."],
      ["Review development proposals", "Evaluates applications for consistency with county plans and land-development requirements."],
      ["Support public land-use decisions", "Provides analysis, public-process support, and recommendations for planning decisions."]
    ],
    challenges: "Responding to growing workloads while providing timely service, maintaining consistent enforcement, and adapting to changing regulatory and environmental conditions.",
    changes: "The primary change is attributed to additional staffing requested, needed to keep pace with growing service demand across the county."
  },
  {
    name: "Code Compliance", fy26: 4459159, fy27: 4811854,
    personnel: 4260744, contractual: 87600, operating: 463510,
    fte26: 43, fte27: 43,
    services: [
      ["Respond to code concerns", "Receives and investigates reported conditions that may violate county codes."],
      ["Resolve property violations", "Works with property owners to correct documented violations and restore compliance."],
      ["Support neighborhood standards", "Conducts field activity and case follow-up that protect community health, safety, and appearance."]
    ],
    challenges: "Responding to growing workloads while providing timely service, maintaining consistent enforcement, and adapting to changing regulatory and environmental conditions.",
    changes: "The primary change is attributed to additional staffing requested, needed to keep pace with growing service demand across the county."
  },
  {
    name: "Building", fy26: 4035000, fy27: 4000000,
    personnel: 2312201, contractual: 0, operating: 1687799,
    fte26: 21, fte27: 21,
    services: [
      ["Review building plans", "Checks proposed construction for compliance with applicable building and safety requirements."],
      ["Issue permits", "Processes permits that authorize eligible construction, alteration, and related work."],
      ["Inspect construction", "Verifies permitted work at required stages before completion or occupancy."]
    ],
    challenges: "Responding to growing workloads while providing timely service, maintaining consistent enforcement, and adapting to changing regulatory and environmental conditions.",
    changes: "The primary change is Operating Supplies decreasing by $214,429."
  },
  {
    name: "Parks & Recreation", fy26: 2919737, fy27: 2972948,
    personnel: 1879813, contractual: 108000, operating: 985135,
    fte26: 24.5, fte27: 24,
    services: [
      ["Operate the golf course", "Provides and maintains the public golf experience at Eagle Springs."],
      ["Operate parks and recreation facilities", "Maintains public parks, fields, courts, and supporting amenities."],
      ["Provide recreation programs", "Coordinates activities, leagues, and opportunities for residents of different ages."]
    ],
    challenges: "Keeping pace with growth while maintaining aging assets, managing construction costs, and scheduling work with limited staff and equipment.",
    changes: "The primary change is Buildings decreasing by $250,000."
  },
  {
    name: "Engineering Department", fy26: 2876106, fy27: 2798118,
    personnel: 2177918, contractual: 250000, operating: 370200,
    fte26: 17, fte27: 15,
    services: [
      ["Treat wastewater", "Operates treatment processes that protect public health and the environment."],
      ["Maintain the treatment system", "Inspects, repairs, and maintains facility equipment and supporting infrastructure."],
      ["Monitor regulatory compliance", "Tests, documents, and reports treatment performance under applicable requirements."]
    ],
    challenges: "Keeping pace with growth while maintaining aging assets, managing construction costs, and scheduling work with limited staff and equipment.",
    changes: "The primary change is Infrastructure decreasing by $891,000."
  },
  {
    name: "Office of the County Attorney", fy26: 1993475, fy27: 1802925,
    personnel: 1052925, contractual: 650000, operating: 100000,
    fte26: 10, fte27: 9,
    services: [
      ["Advise county government", "Provides legal counsel to the Board and Board-controlled departments."],
      ["Prepare and review legal documents", "Reviews ordinances, resolutions, agreements, contracts, and other county instruments."],
      ["Represent the county", "Manages litigation, claims, hearings, and other legal proceedings involving the county."]
    ],
    challenges: "Supporting a growing organization while recruiting and retaining skilled staff, modernizing systems, meeting compliance requirements, and responding to competing priorities.",
    changes: "The primary change is attributed to additional staffing requested, needed to keep pace with growing service demand across the county."
  },
  {
    name: "Purchasing", fy26: 1033795, fy27: 1026499,
    personnel: 888999, contractual: 65000, operating: 72500,
    fte26: 10, fte27: 10,
    services: [
      ["Run fair solicitations", "Coordinates competitive purchasing processes for county goods, services, and construction."],
      ["Support county purchasing", "Helps departments obtain needed resources under adopted rules and contracts."],
      ["Maintain procurement records", "Documents awards, contracts, vendor information, and purchasing compliance."]
    ],
    challenges: "Supporting a growing organization while recruiting and retaining skilled staff, modernizing systems, meeting compliance requirements, and responding to competing priorities.",
    changes: "The primary change is Books, Publications, Subscriptions, or Memberships increasing by $64,000."
  },
  {
    name: "Office of Management and Budget", fy26: 1374708, fy27: 1075026,
    personnel: 1017276, contractual: 0, operating: 57750,
    fte26: 9, fte27: 9,
    services: [
      ["Build the annual budget", "Coordinates department requests, revenue estimates, balancing, and the tentative county budget."],
      ["Monitor public spending", "Tracks budget performance and supports amendments throughout the fiscal year."],
      ["Explain financial decisions", "Produces schedules, forecasts, analysis, and public budget information for decision-making."]
    ],
    challenges: "Supporting a growing organization while recruiting and retaining skilled staff, modernizing systems, meeting compliance requirements, and responding to competing priorities.",
    changes: "The primary change is Books, Publications, Subscriptions, or Memberships decreasing by $260,000."
  },
  {
    name: "Emergency Management", fy26: 804151, fy27: 887455,
    personnel: 704526, contractual: 6100, operating: 176829,
    fte26: 5.5, fte27: 6,
    services: [
      ["Prepare for emergencies", "Develops plans, training, and coordination arrangements before disasters occur."],
      ["Coordinate emergency response", "Connects agencies, information, and resources during an emergency activation."],
      ["Support community recovery", "Coordinates recovery information, assistance, and continuity after an emergency."]
    ],
    challenges: "Maintaining year-round readiness for unpredictable events, seasonal demand, severe weather, and competition for trained personnel and specialized equipment.",
    changes: "The primary change is attributed to additional staffing requested, needed to keep pace with growing service demand across the county."
  }
];

function money(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
function pct(delta, base) { return (delta >= 0 ? "+" : "") + ((delta / base) * 100).toFixed(1) + "%"; }
function fte(n) { return Number.isInteger(n) ? String(n) : n.toFixed(1); }

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
    margin:8px 0 .08in;
    color:#003f28;
    font:800 22pt/1.05 Georgia, "Times New Roman", serif;
    letter-spacing:-.02em;
  }
  p.intro{
    max-width:7.3in;
    margin:0 0 .18in;
    color:#33453c;
    font-size:8.8pt;
    line-height:1.42;
  }
  .stat-strip{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:.12in;
    margin:0 0 .18in;
  }
  .stat-card{
    padding:.12in .08in;
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
    font-size:6.2pt;
    font-weight:800;
    letter-spacing:.02em;
    text-transform:uppercase;
    line-height:1.25;
  }
  h2{
    margin:.08in 0 .08in;
    color:#003f28;
    font:800 11pt/1.2 Georgia, serif;
    padding-bottom:.05in;
    border-bottom:2px solid #d1be78;
  }
  .split-row{
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:.14in;
    margin:0 0 .2in;
  }
  .split-card{
    padding:.1in .12in;
    border:1px solid #e4ebe7;
    border-radius:9px;
    background:#fbfcfa;
  }
  .split-card b{ display:block; color:#003f28; font:800 10.5pt Georgia, serif; }
  .split-card span{ display:block; color:#68786f; font-size:6.8pt; font-weight:700; text-transform:uppercase; letter-spacing:.02em; }
  .split-card em{ display:block; margin-top:.02in; color:#33453c; font-style:normal; font-size:7pt; }
  .ledger{ border-top:2px solid #d1be78; }
  .lrow{
    display:grid;
    grid-template-columns:1fr .65in .65in .8in .8in .75in;
    gap:.07in;
    align-items:center;
    padding:.05in 0;
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
    padding-bottom:.06in;
    align-items:end;
  }
  .lrow.head .rnum{ text-align:right; }
  .rlabel{ color:#173229; font-size:7.5pt; }
  .rnum{
    text-align:right;
    color:#33453c;
    font-size:7.2pt;
    font-variant-numeric:tabular-nums;
  }
  .change{ color:#0b7741; font-weight:700; }
  .change.is-down{ color:#a24b1e; }
  .lrow.grand{
    margin-top:.04in;
    border-top:1.5px solid #003f28;
    border-bottom:0;
    padding:.06in 0;
  }
  .lrow.grand .rlabel, .lrow.grand .rnum{ color:#003f28; font-weight:800; font-size:7.6pt; }
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

  /* department profile cards */
  .dept-card{
    border:1px solid #e4ebe7;
    border-radius:12px;
    padding:.2in .24in;
    margin-bottom:.2in;
  }
  .dept-head{
    display:flex;
    justify-content:space-between;
    align-items:baseline;
    padding-bottom:.1in;
    border-bottom:2px solid #d1be78;
    margin-bottom:.12in;
  }
  .dept-head h3{
    margin:0;
    color:#003f28;
    font:800 14pt Georgia, serif;
  }
  .dept-head .dept-fte{ color:#68786f; font-size:7.6pt; font-weight:700; text-transform:uppercase; letter-spacing:.02em; }
  .dept-stats{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:.1in;
    margin-bottom:.12in;
  }
  .dept-stats div{ text-align:left; }
  .dept-stats b{ display:block; color:#003f28; font:800 10pt Georgia, serif; }
  .dept-stats span{ display:block; color:#68786f; font-size:6.3pt; font-weight:700; text-transform:uppercase; letter-spacing:.02em; }
  .dept-split{
    display:flex;
    gap:.14in;
    margin-bottom:.14in;
    font-size:7pt;
    color:#33453c;
  }
  .dept-split span b{ color:#003f28; }
  h4.services-h{ margin:0 0 .05in; color:#003f28; font:800 7.6pt Georgia, serif; text-transform:uppercase; letter-spacing:.03em; }
  .service-item{ margin-bottom:.045in; font-size:7.3pt; line-height:1.35; }
  .service-item b{ color:#173229; }
  .service-item span{ color:#68786f; }
  .dept-note{
    margin-top:.1in;
    padding-top:.08in;
    border-top:1px solid #eef1ee;
    font-size:7pt;
    line-height:1.4;
    color:#33453c;
  }
  .dept-note b{ color:#003f28; }
`;

function summaryRowHtml(r) {
  const [name, fy26, fy27] = r;
  const delta = fy27 - fy26;
  const isDown = delta < 0;
  return `<div class="lrow"><div class="rlabel">${name}</div><div class="rnum">${fte(r[3])}</div><div class="rnum">${fte(r[4])}</div><div class="rnum">${money(fy26)}</div><div class="rnum">${money(fy27)}</div><div class="rnum change${isDown ? " is-down" : ""}">${pct(delta, fy26)}</div></div>`;
}

function deptCardHtml(d) {
  const delta = d.fy27 - d.fy26;
  const isDown = delta < 0;
  const dsign = delta >= 0 ? "+" : "−";
  return `
  <div class="dept-card">
    <div class="dept-head">
      <h3>${d.name}</h3>
      <div class="dept-fte">${fte(d.fte26)} &rarr; ${fte(d.fte27)} FTE</div>
    </div>
    <div class="dept-stats">
      <div><b>${money(d.fy26)}</b><span>FY2026 Total</span></div>
      <div><b>${money(d.fy27)}</b><span>FY2027 Total</span></div>
      <div><b class="${isDown ? "change is-down" : "change"}">${dsign}${money(Math.abs(delta)).slice(1)}</b><span>Dollar Change</span></div>
      <div><b class="${isDown ? "change is-down" : "change"}">${pct(delta, d.fy26)}</b><span>Percent Change</span></div>
    </div>
    <div class="dept-split">
      <span>Personnel <b>${money(d.personnel)}</b></span>
      <span>Contractual <b>${money(d.contractual)}</b></span>
      <span>Operating <b>${money(d.operating)}</b></span>
    </div>
    <h4 class="services-h">Services</h4>
    ${d.services.map(([t, s]) => `<div class="service-item"><b>${t}.</b> <span>${s}</span></div>`).join("")}
    <div class="dept-note"><b>Challenges:</b> ${d.challenges}</div>
    <div class="dept-note"><b>FY2027 Changes:</b> ${d.changes}</div>
  </div>`;
}

function pairPages(items) {
  const pages = [];
  for (let i = 0; i < items.length; i += 2) pages.push(items.slice(i, i + 2));
  return pages;
}

const startPage = Number(process.argv[3] || 179);
let pageCounter = startPage;

const overviewPage = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Departments</small>
    <h1>Department Operating Ledger</h1>
    <p class="intro">Walton County's 15 Board departments budget a combined $135.6M in operating and personnel spending and employ 667 FTE for FY2027. Capital outlay is budgeted separately &mdash; see the Capital Budget chapter. Each department's statement of function, core services, challenges, and full budget detail appears on its own page in the Departments and Services chapter that follows.</p>
    <div class="stat-strip">${OVERVIEW_STATS.map(([v, l]) => `<div class="stat-card"><b>${v}</b><span>${l}</span></div>`).join("")}</div>
    <div class="split-row">${SPLIT.map(([l, v, p]) => `<div class="split-card"><b>${v}</b><span>${l}</span><em>${p} of the total</em></div>`).join("")}</div>
    <h2>Department Summary</h2>
    <div class="ledger">
      <div class="lrow head"><div class="rlabel">Department</div><div class="rnum">FY26 FTE</div><div class="rnum">FY27 FTE</div><div class="rnum">FY26 Total</div><div class="rnum">FY27 Total</div><div class="rnum">+/&minus;</div></div>
      ${SUMMARY_ROWS.map(summaryRowHtml).join("")}
      <div class="lrow grand"><div class="rlabel">${SUMMARY_TOTAL[0]}</div><div class="rnum">${fte(SUMMARY_TOTAL[3])}</div><div class="rnum">${fte(SUMMARY_TOTAL[4])}</div><div class="rnum">${money(SUMMARY_TOTAL[1])}</div><div class="rnum">${money(SUMMARY_TOTAL[2])}</div><div class="rnum change">${pct(SUMMARY_TOTAL[2] - SUMMARY_TOTAL[1], SUMMARY_TOTAL[1])}</div></div>
    </div>
    <footer><span>FY 2027 Annual Budget</span><b>${pageCounter}</b></footer>
  </section>
`;
pageCounter++;

// Per-department profile pages (services/challenges/changes) previously
// spread across 9 continuation pages here were removed: that content is
// now merged directly into each department's own page in the
// Departments and Services chapter (which this ledger now sits in front
// of), rather than duplicated as a separate section. See DEPARTMENTS
// above (still retained as the source of the summary table's FTE/dollar
// figures) for the per-department detail that was previously rendered
// on those pages.

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Department Operating Ledger</title>
<style>${sharedCss}</style></head>
<body>${overviewPage}</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-dept-operating-ledger.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath + " (1 page)");
