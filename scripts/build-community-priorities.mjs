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
    page-break-after:always;
  }
  section:last-child{ page-break-after:auto; }
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
  .area-grid{ display:grid; grid-template-columns:repeat(2,1fr); gap:.14in; margin:.1in 0 .12in; }
  .area-card{ position:relative; min-height:1.3in; padding:.16in .15in .14in .46in; border:1px solid #e4ebe7; border-radius:10px; background:#fbfcfa; }
  .area-card .num{ position:absolute; left:.08in; top:.09in; display:grid; place-items:center; width:.21in; height:.21in; border-radius:50%; background:#003f28; color:#e7c95f; font:800 7pt Georgia,serif; }
  .area-card b{ display:block; color:#003f28; font:800 9.2pt Georgia, serif; margin-bottom:.05in; }
  .area-card p{ margin:0; color:#33453c; font-size:7.4pt; line-height:1.4; }
  .challenge-grid{ display:grid; grid-template-columns:1fr 1fr; gap:.12in; margin:.08in 0 .14in; }
  .challenge-card{ padding:.12in .14in; border-left:4px solid #d1be78; border-radius:0 8px 8px 0; background:#f9f8f2; }
  .challenge-card.org{ border-left-color:#006231; background:#f3f8f5; }
  .challenge-card small{ display:block; margin-bottom:.03in; color:#a88418; font-size:6.2pt; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
  .challenge-card.org small{ color:#006231; }
  .challenge-card b{ display:block; color:#003f28; font:800 8.5pt Georgia,serif; }
  .challenge-card p{ margin:.03in 0 0; color:#33453c; font-size:6.8pt; line-height:1.38; }
  .conn-table{ border-top:2px solid #d1be78; margin-top:.04in; }
  .crow{ display:grid; grid-template-columns:1.15in 1.65in .8in 1.65in 1fr; gap:.08in; padding:.055in 0; border-bottom:1px solid #eef1ee; }
  .crow.head{ border-bottom:1px solid #003f28; color:#68786f; font-size:6.3pt; font-weight:800; letter-spacing:.01em; text-transform:uppercase; }
  .crow .carea{ font-size:6.3pt; font-weight:800; color:#003f28; line-height:1.25; }
  .crow .cresp{ font-size:5.8pt; color:#33453c; line-height:1.3; }
  .crow .money{ color:#006231; font-size:6pt; font-weight:900; line-height:1.25; }
  .crow .result{ color:#33453c; font-size:5.7pt; line-height:1.3; }
  .crow .when{ color:#68786f; font-size:5.55pt; line-height:1.3; }
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

const startPage = Number(process.argv[3] || 14);

const page1 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Our County</small>
    <h1>Community Priorities</h1>
    <p class="intro">The Walton County Strategic Plan 2027&ndash;2032 establishes six priority areas. For FY2027, the Board&rsquo;s direction is continuity, capital investment, and financial preparedness: maintain core services, address infrastructure needs, and avoid unnecessary recurring commitments while the revenue outlook remains uncertain.</p>

    <h2>Strategic Priority Areas, FY2027&ndash;FY2032</h2>
    <div class="area-grid">
      ${PRIORITY_AREAS.map((a, i) => `<div class="area-card"><span class="num">${i + 1}</span><b>${a.t}</b><p>${a.d}</p></div>`).join("")}
    </div>

    <p class="footnote">The strategic priority language comes from the Walton County Strategic Plan 2027&ndash;2032.</p>

    <footer><span>FY 2027 Final Budget</span><b>${startPage}</b></footer>
  </section>
`;

const page2 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Our County</small>
    <h1>Organizational Challenges and FY2027 Response</h1>
    <p class="intro">The County must respond to growing service demand while protecting financial flexibility, coordinating major projects, and maintaining emergency readiness. The FY2027 plan connects these pressures to specific actions, funding signals, expected results, and review points.</p>

    <h2>What Is Creating Pressure</h2>
    <div class="challenge-grid">
      <div class="challenge-card"><small>Community challenge</small><b>Growth, mobility, and aging assets</b><p>Population has grown 36.8% since 2010, while development and visitation add demand to roads, drainage, facilities, parks, public-safety infrastructure, and coastal access.</p></div>
      <div class="challenge-card"><small>Community challenge</small><b>Seasonal demand and coastal stewardship</b><p>Approximately 4.7 million annual visitors intensify peak-season transportation, lifeguard, tram, beach-access, maintenance, and natural-resource demands.</p></div>
      <div class="challenge-card"><small>Community challenge</small><b>Housing affordability and access</b><p>Growth in housing cost and demand affects workforce stability and residents seeking rental assistance, attainable housing, and access to essential community services.</p></div>
      <div class="challenge-card org"><small>Organizational challenge</small><b>Capacity, asset delivery, and coordination</b><p>The County must fill critical positions, coordinate work across departments, and deliver a large capital program without materially expanding core service commitments.</p></div>
      <div class="challenge-card org"><small>Organizational challenge</small><b>Revenue uncertainty and recurring cost</b><p>Potential property-tax changes, grant uncertainty, and continuing personnel and operating costs require conservative assumptions and limits on new recurring obligations.</p></div>
      <div class="challenge-card org"><small>Organizational challenge</small><b>Emergency readiness and financial flexibility</b><p>Hurricane exposure requires operating readiness and liquidity. The County seeks to preserve approximately $50 million as an informal emergency-recovery planning objective.</p></div>
    </div>

    <h2>FY2027 Challenge-to-Result Plan</h2>
    <div class="conn-table">
      <div class="crow head"><div>Challenge</div><div>FY2027 response</div><div>Funding signal</div><div>Expected FY2027 result</div><div>When reviewed</div></div>
      <div class="crow"><div class="carea">Infrastructure demand</div><div class="cresp">Fund the FY2027 capital program and maintain road, drainage, facility, vehicle, and equipment work.</div><div class="money">$43.8M funded capital</div><div class="result">Advance funded projects; Public Works targets 1,049 road miles maintained or improved and 23 capital projects completed.</div><div class="when">Letting schedule, project milestones, and year-end measures</div></div>
      <div class="crow"><div class="carea">Seasonal coastal demand</div><div class="cresp">Maintain Beach Operations, Beach Tram, lifeguard readiness, access facilities, and eligible coastal investment.</div><div class="money">+13 Beach Operations FTE</div><div class="result">Clean 66 beach and bay facilities daily, complete 6,000 work orders, and transport 250,000 tram passengers.</div><div class="when">Peak-season monitoring and FY2027 year end</div></div>
      <div class="crow"><div class="carea">Housing access</div><div class="cresp">Continue HUD rental-assistance and Housing Choice Voucher administration.</div><div class="money">$3.1M program budget</div><div class="result">Maintain assistance delivery and monitor families served and available voucher utilization.</div><div class="when">Program reporting throughout FY2027</div></div>
      <div class="crow"><div class="carea">Capacity and continuity</div><div class="cresp">Maintain major core services while making targeted staffing changes tied to workload and service need.</div><div class="money">+15 net countywide FTE</div><div class="result">No major core service expansion or reduction; department targets show whether planned service levels are sustained.</div><div class="when">Budget monitoring and annual personnel review</div></div>
      <div class="crow"><div class="carea">Fiscal uncertainty</div><div class="cresp">Assume no specific Amendment 3 reduction, protect reserves, limit new recurring commitments, and update forecasts as facts change.</div><div class="money">~$50M emergency objective</div><div class="result">Preserve response capacity and identify material revenue, reserve, or service impacts before future budget decisions.</div><div class="when">During FY2027 monitoring and the FY2028 cycle</div></div>
    </div>
    <p class="footnote">The strategic priority language comes from the Walton County Strategic Plan 2027&ndash;2032. Dollar amounts and targets reconcile to the Capital, Workforce, Program and Service, Long-Term Outlook, and department sections of this final budget. Grant-dependent projects are shown separately and are not included in the $43.8 million funded capital program.</p>

    <footer><span>FY 2027 Final Budget</span><b>${startPage + 1}</b></footer>
  </section>
`;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Community Priorities and Organizational Challenges</title>
<style>${sharedCss}</style></head>
<body>${page1}${page2}</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-community-priorities.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
