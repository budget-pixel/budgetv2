import { capturePublicationHtml, assertPublicationFits } from "./publication-print.mjs";
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
// "FY 2027 Budget Connection" for each area cites only budget lines,
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
  { t: "Quality of Life", d: "Strengthen community wellbeing through civic engagement, expanded public access to Gulf, bay, and river waterways, and partnerships that support attainable workforce housing.", goals: ["Facilitate Citizen Engagement through Voluntary Board Service", "Expand Public Access to Gulf, Bay, and River Waterways", "Encourage Attainable Workforce Housing through Public-Private Partnerships"] }
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
  .area-card .num{ position:absolute; left:.08in; top:.09in; display:flex; align-items:center; justify-content:center; width:.21in; height:.21in; padding:0; margin:0; border-radius:50%; background:#003f28; color:#e7c95f; font:700 8pt/1 Arial,sans-serif; text-align:center; letter-spacing:0; }
  .area-card b{ display:block; color:#003f28; font:800 9.2pt Georgia, serif; margin-bottom:.05in; }
  .area-card p{ margin:0; color:#33453c; font-size:7.4pt; line-height:1.4; }
  .challenge-grid{ display:grid; grid-template-columns:1fr 1fr; gap:.12in; margin:.08in 0 .14in; }
  .challenge-card{ padding:.12in .14in; border-left:4px solid #d1be78; border-radius:0 8px 8px 0; background:#f9f8f2; }
  .challenge-card.org{ border-left-color:#006231; background:#f3f8f5; }
  .challenge-card small{ display:block; margin-bottom:.03in; color:#a88418; font-size:6.2pt; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
  .challenge-card.org small{ color:#006231; }
  .challenge-card b{ display:block; color:#003f28; font:800 8.5pt Georgia,serif; }
  .challenge-card p{ margin:.03in 0 0; color:#33453c; font-size:6.8pt; line-height:1.38; }
  .context-grid{ display:grid; grid-template-columns:1fr 1fr; gap:.1in; margin:.05in 0 .08in; }
  .context-card{ padding:.08in .11in; border:1px solid #dce6e0; border-radius:7px; background:#fbfcfa; }
  .context-card b{ display:block; margin-bottom:.025in; color:#003f28; font-size:6.7pt; }
  .context-card p{ margin:0; color:#42534a; font-size:5.85pt; line-height:1.32; }
  .conn-table{ border-top:2px solid #d1be78; margin-top:.04in; }
  .crow{ display:grid; grid-template-columns:1.15in 1.65in .8in 1.65in 1fr; gap:.08in; padding:.055in 0; border-bottom:1px solid #eef1ee; }
  .crow:not(.head){ margin-top:.035in; padding:.065in .07in; border:1px solid #e4ebe7; border-left:3px solid #0b7741; border-radius:0 7px 7px 0; background:#fbfcfa; }
  .crow:not(.head):nth-child(odd){ border-left-color:#d1be78; background:#faf9f3; }
  .crow.head{ border-bottom:1px solid #003f28; color:#68786f; font-size:6.3pt; font-weight:800; letter-spacing:.01em; text-transform:uppercase; }
  .crow .carea{ font-size:6.3pt; font-weight:800; color:#003f28; line-height:1.25; }
  .crow .effect{ display:block; margin-top:.025in; color:#9a7815; font-size:5.1pt; font-weight:900; letter-spacing:.02em; text-transform:uppercase; }
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
  <section class="pair-page">
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Our County</small>
    <h1>Community Priorities</h1>
    <p class="intro">The Walton County Strategic Plan 2027&ndash;2032 establishes six priority areas. For FY 2027, the Board&rsquo;s direction is continuity, capital investment, and financial preparedness: maintain core services, address infrastructure needs, and avoid unnecessary recurring commitments while the revenue outlook remains uncertain.</p>

    <h2>Strategic Priority Areas, FY 2027&ndash;FY 2032</h2>
    <div class="pair-list">
      ${PRIORITY_AREAS.map((a, i) => `<div class="pair-row"><div class="pair-head"><span class="pair-num">${String(i + 1).padStart(2, "0")}</span><small>Priority area</small><b>${a.t}</b></div><p class="pair-body">${a.d}</p></div>`).join("")}
    </div>

    <p class="footnote">The priority areas and supporting direction are drawn from the Walton County Strategic Plan 2027&ndash;2032.</p>

    <footer><span>FY 2027 Final Budget</span><b>${startPage}</b></footer>
  </section>
`;

// Organizational Challenges and Budget Response are a matched pair: the
// same six numbered items, in the same order and with the same titles,
// laid out in the same row format (number and title on the left, detail
// on the right; gold for community, green for organizational), so the
// reader can move straight from each challenge to its response.
const PAIRS = [
  { kind: "community", title: "Growth, mobility, and aging assets", tag: "Mitigate / renew capacity",
    challenge: "Population grew 20.2% from 2020 to the April 2025 BEBR estimate, while development and visitation add demand to roads, drainage, facilities, parks, public-safety infrastructure, and coastal access.",
    action: "Fund the FY 2027 capital program and maintain road, drainage, facility, vehicle, and equipment work.",
    result: "Advance funded projects; Public Works targets 1,049 road miles maintained or improved and 23 capital projects completed.",
    money: "$43.8M funded capital", review: "Project milestones and year-end measures" },
  { kind: "community", title: "Seasonal demand and coastal stewardship", tag: "Mitigate / expand capacity",
    challenge: "Approximately 4.5 million annual visitors intensify peak-season transportation, lifeguard, tram, beach-access, maintenance, and natural-resource demands.",
    action: "Maintain Beach Operations, Beach Tram, lifeguard readiness, access facilities, and eligible coastal investment.",
    result: "Clean 66 beach and bay facilities daily, complete 6,000 work orders, and transport 250,000 tram passengers.",
    money: "+13 Beach Operations FTE", review: "Peak-season monitoring and FY 2027 year end" },
  { kind: "community", title: "Housing affordability and access", tag: "Mitigate / maintain access",
    challenge: "Growth in housing cost and demand affects workforce stability and residents seeking rental assistance, attainable housing, and access to essential community services.",
    action: "Continue HUD rental-assistance and Housing Choice Voucher administration.",
    result: "Serve about 300 families and achieve 75% utilization of available housing vouchers.",
    money: "$3.1M program budget", review: "Program reporting throughout FY 2027" },
  { kind: "org", title: "Capacity, asset delivery, and coordination", tag: "Maintain / targeted adjustment",
    challenge: "The County must fill critical positions, coordinate work across departments, and deliver a large capital program without materially expanding core service commitments.",
    action: "Maintain major core services while making targeted staffing changes tied to workload and service need.",
    result: "No major core service expansion or reduction; department targets show whether planned service levels are sustained.",
    money: "+15 net countywide FTE", review: "Budget monitoring and annual personnel review" },
  { kind: "org", title: "Revenue uncertainty and recurring cost", tag: "Monitor / limit recurring cost",
    challenge: "Potential property-tax changes, grant uncertainty, and continuing personnel and operating costs require conservative assumptions and limits on new recurring obligations.",
    action: "Assume no specific Amendment 3 reduction, limit new recurring commitments, and update forecasts as facts change.",
    result: "Material revenue changes are reported and carried into the FY 2028 forecast.",
    money: "3.2500 mills; $8.0M General Fund balance planned", review: "FY 2027 monitoring and FY 2028 forecast update" },
  { kind: "org", title: "Emergency readiness and financial flexibility", tag: "Monitor / preserve flexibility",
    challenge: "The FY 2025 ACFR reports $58.4 million of unassigned General Fund balance. The County's reserve targets hold six months of personnel and operating costs, next year's debt payment, and storm-recovery costs, and the planned use of fund balance draws on that cushion.",
    action: "Fund debt service and storm recovery first, then hold the remaining balance for personnel and operating costs.",
    result: "Hold $50.3M toward the General Fund's $51.7M reserve target and fully fund the Tourist Development Fund's $137.7M target.",
    money: "$50.3M of $51.7M General Fund target; $137.7M tourism target", review: "FY 2027 monitoring and year-end close" }
];

const pairHead = (item, i, withTag) => `<div class="pair-head"><span class="pair-num">${String(i + 1).padStart(2, "0")}</span><small>${item.kind === "org" ? "Organizational" : "Community"} challenge</small><b>${item.title}</b>${withTag ? `<span class="pair-tag">${item.tag}</span>` : ""}</div>`;

const page2 = `
  <section class="pair-page">
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Our County</small>
    <h1>Organizational Challenges</h1>
    <p class="intro">The County must respond to growing service demand while protecting financial flexibility, coordinating major projects, and maintaining emergency readiness. Each numbered challenge below is matched by a funded response on the next page.</p>

    <div class="context-grid">
      <div class="context-card"><b>How the challenges were identified</b><p>The County used the Strategic Plan 2027&ndash;2032 process, online surveys and public workshops, FY 2027 budget workshops, departmental workload and staffing analysis, capital-condition needs, and the multi-year financial forecast. The review considered both the FY 2027 budget period and the longer strategic and capital horizon through FY 2032.</p></div>
      <div class="context-card"><b>Who is most affected</b><p>Impacts are not uniform. Coastal communities, visitors, and seasonal workers face peak mobility and access pressures; renters, lower-income households, and the essential workforce face housing constraints. Delivery also depends on coordination with municipalities, state and federal agencies, nonprofit partners, and other service providers.</p></div>
    </div>

    <h2>What Is Creating Pressure</h2>
    <div class="pair-list">
      ${PAIRS.map((item, i) => `<div class="pair-row ${item.kind}">${pairHead(item, i, false)}<p class="pair-body">${item.challenge}</p></div>`).join("")}
    </div>
    <p class="pair-next">Continued: Budget Response, page ${startPage + 2} &rarr;</p>

    <footer><span>FY 2027 Final Budget</span><b>${startPage + 1}</b></footer>
  </section>
`;

const page3 = `
  <section class="pair-page">
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Our County</small>
    <h1>Budget Response</h1>
    <p class="intro">The FY 2027 budget answers each numbered challenge on page ${startPage + 1} with a funded action, an expected result, and a scheduled review.</p>

    <h2>How the Budget Responds</h2>
    <div class="pair-list">
      ${PAIRS.map((item, i) => `<div class="pair-row ${item.kind}">${pairHead(item, i, true)}<div class="pair-fields"><div><strong>Action</strong>${item.action}</div><div><strong>Expected result</strong>${item.result}</div><div><strong>Budget commitment</strong><span class="pair-money">${item.money}</span><strong class="pair-review">Review</strong><span class="pair-when">${item.review}</span></div></div></div>`).join("")}
    </div>
    <p class="footnote">Dollar amounts and targets reconcile to the Capital, Workforce, Program and Service, Long-Term Outlook, and department sections of this final budget. Grant-dependent projects are shown separately and are not included in the $43.8 million funded capital program.</p>

    <footer><span>FY 2027 Final Budget</span><b>${startPage + 2}</b></footer>
  </section>
`;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Community Priorities and Organizational Challenges</title>
<style>${sharedCss}
  .context-grid{gap:.17in;margin:.13in 0 .16in;}
  .context-card{padding:.12in .16in;}
  .context-card b{font-size:10pt;margin-bottom:.05in;}
  .context-card p{font-size:8.6pt;line-height:1.4;}
  /* Matched pair: Organizational Challenges + Budget Response. */
  .pair-step{margin-left:.1in;padding-left:.1in;border-left:1px solid #d1be78;color:#68786f;letter-spacing:.1em;}
  .pair-list{display:grid;gap:.09in;margin:.1in 0 0;}
  .pair-row{display:grid;grid-template-columns:2.25in 1fr;gap:.2in;align-items:start;padding:.12in .16in .12in .14in;border-left:4px solid #d1be78;border-radius:0 8px 8px 0;background:#f9f8f2;}
  .pair-row.org{border-left-color:#006231;background:#f3f8f5;}
  .pair-head{position:relative;padding-left:.42in;}
  .pair-num{position:absolute;left:0;top:0;display:flex;align-items:center;justify-content:center;width:.3in;height:.3in;border-radius:50%;background:#d1be78;color:#003f28;font:800 9pt/1 Georgia,serif;}
  .pair-row.org .pair-num{background:#006231;color:#ffffff;}
  .pair-head small{display:block;margin-bottom:.03in;color:#a88418;font-size:6.6pt;font-weight:900;letter-spacing:.08em;text-transform:uppercase;}
  .pair-row.org .pair-head small{color:#006231;}
  .pair-head b{display:block;color:#003f28;font:800 10.5pt/1.2 Georgia,serif;}
  .pair-tag{display:block;margin-top:.05in;color:#9a7815;font-size:6.6pt;font-weight:900;letter-spacing:.06em;text-transform:uppercase;}
  .pair-row.org .pair-tag{color:#4f6b5d;}
  .pair-body{margin:0;color:#33453c;font-size:8.6pt;line-height:1.42;}
  .pair-fields{display:grid;grid-template-columns:1fr 1fr 1fr;gap:.16in;color:#33453c;font-size:7.8pt;line-height:1.32;}
  .pair-fields strong{display:block;margin-bottom:2px;color:#52665c;font-size:6.6pt;letter-spacing:.04em;text-transform:uppercase;}
  .pair-fields .pair-review{margin-top:.06in;}
  .pair-money{display:block;color:#006231;font-weight:900;}
  .pair-when{display:block;color:#68786f;}
  .pair-next{margin:.1in 0 0;text-align:right;color:#a88418;font-size:8pt;font-weight:900;letter-spacing:.04em;}
  .pair-page .footnote{font-size:7.6pt;}
</style></head>
<body>${page1}${page2}${page3}</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-community-priorities.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await capturePublicationHtml(page, outPath);
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, tagged: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
