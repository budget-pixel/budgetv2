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

const CONNECTIONS = [
  ["Public Safety and Health", "The $24.5M Transportation and Infrastructure Capital Ledger funds road, drainage, and pedestrian-path projects; Emergency Management's FY2027 capital (UTV, radio equipment) and the Lifeguard Services Agreement's built-in 4% annual increase sustain year-round readiness. The County's 2015 Note Payable continues to fund the countywide broadband build-out."],
  ["Planned Growth and Infrastructure", "Planning's $282,000 Land Development Code Update contract directly funds this area's code-simplification goal. Mossy Head Wastewater Treatment Facility operates the county's sewer conversion infrastructure, and Building Construction &amp; Maintenance's FY2027 capital requests replace aging facility vehicles and equipment countywide."],
  ["Environment and Natural Resources", "Solid Waste's FY2027 capital includes a new gate arm for the Transfer Station, a direct step toward transfer station expansion. Environmental Resources' Choctawhatchee Basin Alliance water-quality contracts ($62,875 combined) and Soil Conservation's USDA-NRCS cost-share programs support natural resource and agricultural land preservation."],
  ["Economic Development and Tourism", "The Tourist Development Fund grew 15.9% to $59.0M in FY2027, funding the year's single largest capital commitment: $10.8M for beach renourishment. Recreation's capital-funded building improvements and the Recreation Plat Fee Fund support the greenspace and recreational access this area calls for."],
  ["Government and Operational Performance", "The Office of Management and Budget holds the GFOA Distinguished Budget Presentation Award and Purchasing holds the National Procurement Institute's Achievement of Excellence in Procurement Award. Planning's investment in EnerGov, OpenGov, and GovOS software modernizes permitting and short-term rental processes."],
  ["Quality of Life", "Housing &amp; Urban Development administers $3.1M in federal HUD rental assistance, the County's direct program for attainable housing. Libraries served over 215,000 visitors in FY2025, and Eagle Springs Golf &amp; Recreation Center's and Recreation's FY2027 capital requests expand public recreational access."]
];

const CHALLENGE_THEMES = [
  { n: 7, label: "Growth vs. Aging Assets", text: "Keeping pace with growth while maintaining aging assets, managing construction costs, and scheduling work with limited staff and equipment.", depts: "Building Construction & Maintenance, Eagle Springs Golf & Recreation, Engineering, Mossy Head WWTF, Public Works, Recreation, Solid Waste" },
  { n: 6, label: "Workforce Capacity", text: "Supporting a growing organization while recruiting and retaining skilled staff, modernizing systems, meeting compliance requirements, and responding to competing priorities.", depts: "County Administration, GIS, Human Resources, OMB, County Attorney, Purchasing" },
  { n: 6, label: "Service Demand", text: "Meeting changing community needs while managing caseloads, maintaining public access, and delivering reliable service with limited staffing and program capacity.", depts: "Building Department, Extension Office, HUD, Libraries, Probation, Veteran Services" },
  { n: 5, label: "Regulatory Enforcement", text: "Responding to growing workloads while providing timely service, maintaining consistent enforcement, and adapting to changing regulatory and environmental conditions.", depts: "Code Compliance, Environmental Resources, Mosquito Control, Planning, Soil Conservation" },
  { n: 2, label: "Seasonal Readiness", text: "Maintaining year-round readiness for unpredictable events, seasonal demand, severe weather, and competition for trained personnel and specialized equipment.", depts: "Emergency Management, Tourism Lifeguard Services & Beach Safety" }
];

const OPPORTUNITIES = [
  { b: "In-House Engineering", d: "Performing capital project design and construction management in-house rather than through outside consultants is estimated to save $1,660,880 in FY2027 &mdash; freeing capital dollars for more projects." },
  { b: "National Recognition", d: "Office of Management and Budget holds the GFOA Distinguished Budget Presentation Award for FY2025 and FY2026; Purchasing was named a 2026 winner of the National Procurement Institute's Achievement of Excellence in Procurement Award." },
  { b: "Growing Tourism Tax Base", d: "The Tourist Development Fund grew 15.9% to $59.0M in FY2027, funding beach renourishment, dune and boardwalk repair, and transit projects without drawing on property taxes." },
  { b: "Lower Millage Despite Growth", d: "The County reduced its operating millage rate to 3.4347 mills from 3.519 mills the prior year, while still funding a net increase of 15 full-time positions and a record $71.3M capital program." }
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
    <p class="intro">The draft Walton County Strategic Plan 2027&ndash;2032 identifies six Strategic Priority Areas that align County goals across local government, economy, environment, and quality of life. The FY2027 tentative budget uses that developing framework to connect resources with community needs; final strategic-plan status will be updated after Board action.</p>

    <h2>Strategic Priority Areas, FY2027&ndash;FY2032</h2>
    <div class="area-grid">
      ${PRIORITY_AREAS.map((a) => `<div class="area-card"><b>${a.t}</b><p>${a.d}</p><ul>${a.goals.map((g) => `<li>${g}</li>`).join("")}</ul></div>`).join("")}
    </div>

    <h2>Growth Is the Common Thread</h2>
    <p class="body">Walton County's population has grown 36.8% since 2010 to 75,305 residents, and the Tourist Development Fund &mdash; a direct measure of visitor demand &mdash; grew another 15.9% in FY2027 alone. The Strategic Plan's priority areas, and nearly every department's stated challenge elsewhere in this book, trace back to the same root cause: service levels, staffing, and infrastructure all have to keep pace with a county that keeps growing.</p>
    <div class="stat-strip">
      <div class="stat-card"><b>+36.8%</b><span>Population Growth Since 2010</span></div>
      <div class="stat-card"><b>75,305</b><span>Current Population</span></div>
      <div class="stat-card"><b>+15.9%</b><span>FY2027 Tourist Development Fund Growth</span></div>
      <div class="stat-card"><b>77.7%</b><span>Homeownership Rate</span></div>
    </div>
    <p class="footnote">Strategic Priority Areas and goals reproduced from the Walton County Strategic Plan 2027&ndash;2032. Mission, Vision, and Core Values from the same plan appear on the preceding Strategic Initiatives page.</p>

    <footer><span>FY 2027 Annual Budget</span><b>${startPage}</b></footer>
  </section>
`;

const page2 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h1 class="continued">Community Priorities and Organizational Challenges <span class="sub">(continued)</span></h1>

    <h2 style="margin-top:.08in;">How the FY2027 Budget Funds Each Priority Area</h2>
    <p class="body">The Strategic Plan sets direction; the budget is where it is funded. Every connection below cites a specific FY2027 budget line, contract, or department already detailed elsewhere in this book.</p>
    <div class="conn-table">
      <div class="crow head"><div>Strategic Priority Area</div><div>FY2027 Budget Connection</div></div>
      ${CONNECTIONS.map(([a, c]) => `<div class="crow"><div class="carea">${a}</div><div class="cresp">${c}</div></div>`).join("")}
    </div>

    <h2>Opportunities</h2>
    <p class="body">Growth is a challenge, but it also funds solutions. Several FY2027 wins came directly out of the same pressures the Strategic Plan is designed to address.</p>
    <div class="opp-grid">
      ${OPPORTUNITIES.map((o) => `<div class="opp-card"><b>${o.b}</b><span>${o.d}</span></div>`).join("")}
    </div>

    <footer><span>FY 2027 Annual Budget</span><b>${startPage + 1}</b></footer>
  </section>
`;

const page3 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h1 class="continued">Community Priorities and Organizational Challenges <span class="sub">(continued)</span></h1>

    <h2 style="margin-top:.08in;">Cross-Cutting Organizational Challenges</h2>
    <p class="body">Beyond the Strategic Plan's countywide priorities, every one of the 27 Departments and Services pages in this book states a Challenges statement in the department's own words. Tallied across all 27, five distinct themes emerge &mdash; shown below by how many departments cite each one.</p>
    ${CHALLENGE_THEMES.map((t) => `<div class="theme-row"><div class="theme-n"><b>${t.n}</b><span>Depts.</span></div><div><div class="theme-label">${t.label}</div><div class="theme-depts">${t.depts}</div></div><div class="theme-text">${t.text}</div></div>`).join("")}
    <p class="footnote">Department-level detail for every challenge and budget line referenced in this chapter appears on that department's own page in the Departments and Services chapter.</p>

    <footer><span>FY 2027 Annual Budget</span><b>${startPage + 2}</b></footer>
  </section>
`;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Community Priorities and Organizational Challenges</title>
<style>${sharedCss}</style></head>
<body>${page1}${page2}${page3}</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-community-priorities.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
