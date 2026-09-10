import { chromium } from "playwright";

// New chapter: "Community Priorities and Organizational Challenges and
// Opportunities" -- addresses a GFOA Distinguished Budget Presentation
// scoring category this book previously had no dedicated chapter for.
// Placed right after "Strategic Initiatives" (mission/vision/core values)
// and before "Budget in Brief."
//
// Source for the six Strategic Priority Areas and their goals: the
// Walton County Strategic Plan 2027-2032, adopted by the Board of County
// Commissioners on September 8, 2026 (provided directly, not web
// research) -- reproduced verbatim, not paraphrased or invented. The
// "FY2027 Budget Connection" for each area cites only budget lines,
// contracts, and department facts already verified and printed
// elsewhere in this book (Departments and Services pages, Capital
// Improvement Plan, Transmittal Letter, Debt Ledger) -- nothing new is
// introduced here. The five recurring "Challenges" statements are the
// same verbatim text already used, department by department, across the
// 27 Departments and Services pages, tallied here rather than invented.

const PRIORITY_AREAS = [
  { t: "Public Safety and Health", d: "Enhance the well-being of residents and visitors through proactive disaster preparedness, coordinated emergency response, public health initiatives, and strong community partnerships.", goals: ["Enhance Transportation and Pedestrian Networks", "Improve County-wide Cellular and Internet Services", "Prioritize Road Infrastructure Improvements", "Invest in Education and Emergency Management Partnerships for Disaster Preparedness"] },
  { t: "Planned Growth and Infrastructure", d: "Guide long-term development through strategic planning for public facilities, infrastructure expansion, transportation improvements, and responsible growth.", goals: ["Align Smart Growth Management with the DPZ Study", "Simplify and Streamline the Land Development Code", "Develop Advanced Infrastructure Standards", "Prioritize Septic to Sewer Conversion", "County-wide Master Plan for Facility Maintenance and Expansion"] },
  { t: "Environment and Natural Resources", d: "Protect, preserve, and responsibly manage natural lands, wildlife habitats, coastal areas, and bay systems to ensure environmental sustainability for future generations.", goals: ["Prioritize Preservation of Natural Resources", "Enhance Solid Waste Services through Transfer Station Expansion", "Preserve Agricultural Land through Conservation Easements"] },
  { t: "Economic Development and Tourism", d: "Strengthen the local economy by attracting new businesses, supporting existing business, promoting diversified and sustainable tourism, and fostering quality job creation.", goals: ["Promote Ecotourism through Waterway Access", "Diversify Tourism through Greenspace Acquisition", "Expand North Walton TDT Collections and Investor Incentives"] },
  { t: "Government and Operational Performance", d: "Deliver efficient, transparent, and accountable governance through strong leadership, fiscal stewardship, innovative technology, and effective public communication.", goals: ["Streamline and Modernize Processes for Fiscal Responsibility", "Foster Clarity of Roles with a Focus on Employee Development", "Improve and Expand Public Outreach"] },
  { t: "Quality of Life", d: "Guide long-term development through strategic planning for public facilities, infrastructure, transportation, and responsible growth that meets community needs.", goals: ["Facilitate Citizen Engagement through Voluntary Board Service", "Expand Public Access to Gulf, Bay, and River Waterways", "Encourage Attainable Workforce Housing through Public-Private Partnerships"] }
];

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
    margin-top:.22in;
    color:#b89521;
    font-size:8pt;
    font-weight:900;
    letter-spacing:.14em;
    text-transform:uppercase;
  }
  h1{
    margin:8px 0 .08in;
    color:#003f28;
    font:800 20pt/1.1 Georgia, "Times New Roman", serif;
    letter-spacing:-.02em;
  }
  h1.continued{ font-size:16pt; margin-top:0; }
  h1 span.sub{ color:#68786f; font-size:9.5pt; font-weight:400; }
  p.intro{
    max-width:7.3in;
    margin:0 0 .14in;
    color:#33453c;
    font-size:8.4pt;
    line-height:1.4;
  }
  h2{
    margin:.14in 0 .06in;
    color:#003f28;
    font:800 11pt/1.2 Georgia, serif;
    padding-bottom:.05in;
    border-bottom:2px solid #d1be78;
  }
  h2:first-of-type{ margin-top:.05in; }
  p.body{
    margin:0 0 .1in;
    color:#33453c;
    font-size:8pt;
    line-height:1.4;
  }
  .area-grid{ display:grid; grid-template-columns:repeat(2,1fr); gap:.13in; margin:.06in 0 .1in; }
  .area-card{ padding:.1in .13in; border:1px solid #e4ebe7; border-radius:9px; background:#fbfcfa; }
  .area-card b{ display:block; color:#003f28; font:800 8.4pt Georgia, serif; margin-bottom:.03in; }
  .area-card p{ margin:0 0 .05in; color:#33453c; font-size:6.9pt; line-height:1.32; }
  .area-card ul{ margin:0; padding-left:.13in; }
  .area-card li{ font-size:6.6pt; color:#173229; line-height:1.35; margin-bottom:.01in; }
  .stat-strip{ display:grid; grid-template-columns:repeat(4,1fr); gap:.12in; margin:.06in 0 .12in; }
  .stat-card{ padding:.1in .1in; border-radius:10px; background:#003f28; text-align:center; }
  .stat-card b{ display:block; color:#fff; font:800 12pt/1.1 Georgia, serif; }
  .stat-card span{ display:block; margin-top:.03in; color:#e7c95f; font-size:5.9pt; font-weight:800; letter-spacing:.02em; text-transform:uppercase; line-height:1.25; }
  .conn-table{ border-top:2px solid #d1be78; margin-top:.06in; }
  .crow{ display:grid; grid-template-columns:1.7in 1fr; gap:.14in; padding:.09in 0; border-bottom:1px solid #eef1ee; }
  .crow.head{ border-bottom:1px solid #003f28; color:#68786f; font-size:6.3pt; font-weight:800; letter-spacing:.01em; text-transform:uppercase; }
  .crow .carea{ font-size:8pt; font-weight:800; color:#003f28; line-height:1.3; }
  .crow .cresp{ font-size:7.6pt; color:#33453c; line-height:1.42; }
  .theme-row{ display:grid; grid-template-columns:.5in 1.75in 1fr; gap:.13in; align-items:center; padding:.07in 0; border-bottom:1px solid #eef1ee; }
  .theme-row .theme-n{ text-align:center; }
  .theme-row .theme-n b{ display:block; font:800 14pt Georgia, serif; color:#003f28; }
  .theme-row .theme-n span{ display:block; font-size:5.3pt; color:#68786f; font-weight:800; text-transform:uppercase; letter-spacing:.02em; }
  .theme-row .theme-label{ font-size:7.6pt; font-weight:800; color:#003f28; }
  .theme-row .theme-depts{ font-size:6.2pt; color:#68786f; margin-top:.02in; line-height:1.28; }
  .theme-row .theme-text{ font-size:7pt; color:#33453c; line-height:1.36; }
  .opp-grid{ display:grid; grid-template-columns:repeat(2,1fr); gap:.12in; margin:.06in 0 .1in; }
  .opp-card{ padding:.09in .13in; border-radius:9px; border-left:4px solid #0b7741; background:#f4faf6; }
  .opp-card b{ display:block; color:#0b7741; font-size:7.3pt; font-weight:800; margin-bottom:.03in; }
  .opp-card span{ display:block; color:#33453c; font-size:6.8pt; line-height:1.34; }
  p.footnote{
    margin:.06in 0 0;
    color:#68786f;
    font-size:6.9pt;
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

const startPage = Number(process.argv[3] || 13);

const page1 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Our County</small>
    <h1>Community Priorities and Organizational Challenges</h1>
    <p class="intro">The Walton County Strategic Plan 2027&ndash;2032 identifies six Strategic Priority Areas that align County goals across local government, economy, environment, and quality of life. The FY2027 tentative budget uses that framework to connect resources with community needs.</p>

    <h2>Strategic Priority Areas, FY2027&ndash;FY2032</h2>
    <div class="area-grid">
      ${PRIORITY_AREAS.map((a) => `<div class="area-card"><b>${a.t}</b><p>${a.d}</p><ul>${a.goals.map((g) => `<li>${g}</li>`).join("")}</ul></div>`).join("")}
    </div>

    <h2>Growth Is the Common Thread</h2>
    <p class="body">Walton County's population has grown 36.8% since 2010 to 75,305 residents, and the county hosts an estimated 4.7 million visitors annually &mdash; nearly 63 tourists for every resident. The Strategic Plan's priority areas, and nearly every department's stated challenge elsewhere in this book, trace back to the same root cause: service levels, staffing, and infrastructure all have to keep pace with a county that keeps growing.</p>
    <div class="stat-strip">
      <div class="stat-card"><b>+36.8%</b><span>Population Growth Since 2010</span></div>
      <div class="stat-card"><b>75,305</b><span>Current Population</span></div>
      <div class="stat-card"><b>~4.7M</b><span>Estimated Annual Visitors</span></div>
      <div class="stat-card"><b>77.7%</b><span>Homeownership Rate</span></div>
    </div>

    <footer><span>FY 2027 Annual Budget</span><b>${startPage}</b></footer>
  </section>
`;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Community Priorities and Organizational Challenges</title>
<style>${sharedCss}</style></head>
<body>${page1}</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-community-priorities.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
