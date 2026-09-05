import { chromium } from "playwright";
import QRCode from "qrcode";

// Builds the FY 2027 Budget Book's "Capital Improvement Plan" -- a new
// chapter-intro section that did not exist anywhere in this book before.
// Source: pages/capital-improvement-plan.html (live-rendered), a concept/
// explainer page -- what counts as a capital project, what goes into one,
// why new projects are necessary, how the spending level is set, the
// five-year spending trend, the largest FY2027 commitments, and how a
// project moves into the adopted plan. It intentionally does not
// duplicate the six capital ledgers that already exist later in this
// book (Machinery/Vehicles/Equipment, Transportation and Infrastructure,
// Tourist Development Fund, Sheriff, Recreation Plat Fee, Sidewalk Fund)
// -- this page sits as their chapter introduction, in the same TOC
// position the live site places it (immediately before those ledgers).

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
    font:800 22pt/1.05 Georgia, "Times New Roman", serif;
    letter-spacing:-.02em;
  }
  h1.continued{ font-size:16pt; margin-top:0; }
  h1 span.sub{ color:#68786f; font-size:9.5pt; font-weight:400; }
  p.intro{
    max-width:7.3in;
    margin:0 0 .16in;
    color:#33453c;
    font-size:8.8pt;
    line-height:1.42;
  }
  h2{
    margin:.14in 0 .06in;
    color:#003f28;
    font:800 11.5pt/1.2 Georgia, serif;
    padding-bottom:.05in;
    border-bottom:2px solid #d1be78;
  }
  h2:first-of-type{ margin-top:.05in; }
  p.body{
    margin:0 0 .1in;
    color:#33453c;
    font-size:8.2pt;
    line-height:1.42;
  }
  .test-grid{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:.1in;
    margin:.08in 0 .12in;
  }
  .test-card{
    padding:.09in .1in;
    border-radius:9px;
    background:#003f28;
  }
  .test-card b{ display:block; color:#e7c95f; font-size:6.4pt; font-weight:800; text-transform:uppercase; letter-spacing:.02em; margin-bottom:.03in; }
  .test-card span{ display:block; color:#fff; font-size:6.8pt; line-height:1.32; }
  .two-col{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:.24in;
    margin:0 0 .1in;
  }
  .col-box{
    padding:.1in .14in;
    border-radius:9px;
    border:1px solid #e4ebe7;
  }
  .col-box.yes{ border-color:#0b7741; background:#f4faf6; }
  .col-box.no{ border-color:#d8d0bb; background:#fbfaf5; }
  .col-box h4{ margin:0 0 .06in; font:800 8pt Georgia, serif; color:#003f28; }
  .col-box ul{ margin:0; padding-left:.14in; }
  .col-box li{ font-size:7.4pt; color:#33453c; line-height:1.4; margin-bottom:.02in; }
  p.footnote{
    margin:.06in 0 0;
    color:#68786f;
    font-size:6.9pt;
    line-height:1.4;
    font-style:italic;
  }
  .card-grid{
    display:grid;
    grid-template-columns:repeat(2,1fr);
    gap:.12in;
    margin:.06in 0 .12in;
  }
  .card-grid.cols3{ grid-template-columns:repeat(3,1fr); }
  .info-card{
    padding:.1in .12in;
    border:1px solid #e4ebe7;
    border-radius:9px;
    background:#fbfcfa;
  }
  .info-card b{ display:block; color:#003f28; font:800 7.8pt Georgia, serif; margin-bottom:.02in; }
  .info-card span{ display:block; color:#33453c; font-size:6.9pt; line-height:1.36; }
  .fin-panel{
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:.12in;
    margin:.06in 0 .12in;
  }
  .fin-card{ padding:.1in .12in; border-radius:9px; background:#f9f8f2; border:1px solid #d1be78; }
  .fin-card b{ display:block; color:#b89521; font-size:6.6pt; font-weight:800; text-transform:uppercase; letter-spacing:.02em; margin-bottom:.03in; }
  .fin-card span{ display:block; color:#33453c; font-size:6.9pt; line-height:1.36; }
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

  /* page 2 */
  .chart-wrap{ margin:.1in 0 .06in; }
  .chart{
    display:flex;
    align-items:flex-end;
    gap:.14in;
    height:1.5in;
    padding:0 .1in;
    border-bottom:1.5px solid #003f28;
  }
  .bar-col{ flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; }
  .bar-col .amt{ font-size:6.6pt; font-weight:800; color:#003f28; margin-bottom:.03in; }
  .bar{ width:70%; border-radius:3px 3px 0 0; }
  .bar.prior{ background:#c9d6cd; }
  .bar.adopted{ background:#0b7741; }
  .bar-col .yr{ margin-top:.05in; font-size:6.4pt; color:#68786f; font-weight:700; }
  .legend{ display:flex; gap:.2in; margin:.08in 0 .04in; font-size:6.8pt; color:#33453c; }
  .legend span{ display:inline-flex; align-items:center; gap:.05in; }
  .legend i{ width:8px; height:8px; border-radius:2px; display:inline-block; }
  p.trend{
    margin:.08in 0;
    padding:.1in .14in;
    background:#f9f8f2;
    border:1px solid #d1be78;
    border-radius:9px;
    color:#173229;
    font-size:8pt;
    font-weight:700;
    line-height:1.4;
  }
  .proj-table{ border-top:2px solid #d1be78; margin-top:.06in; }
  .prow{
    display:grid;
    grid-template-columns:2.4in 1.9in .9in;
    gap:.1in;
    align-items:center;
    padding:.06in 0;
    border-bottom:1px solid #eef1ee;
  }
  .prow.head{
    border-bottom:1px solid #003f28;
    color:#68786f;
    font-size:6.3pt;
    font-weight:800;
    letter-spacing:.01em;
    text-transform:uppercase;
  }
  .prow.head .pnum{ text-align:right; }
  .prow .plabel{ color:#173229; font-size:7.6pt; }
  .prow .pfund{ color:#68786f; font-size:7.1pt; }
  .prow .pnum{ text-align:right; color:#003f28; font-weight:800; font-size:8pt; font-variant-numeric:tabular-nums; }
  .process-grid{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:.12in;
    margin:.08in 0;
  }
  .process-card{
    padding:.1in .1in;
    border-radius:9px;
    background:#003f28;
    text-align:center;
  }
  .process-card .num{ display:block; color:#e7c95f; font:800 13pt Georgia, serif; }
  .process-card b{ display:block; color:#fff; font-size:7.4pt; margin:.03in 0; }
  .process-card span{ display:block; color:#cfe0d7; font-size:6.6pt; line-height:1.32; }
  .qr-strip{ display:flex; align-items:center; gap:.18in; margin:.1in 0 .14in; padding:.1in .16in; border-left:4px solid #d1be78; background:#f9f8f2; border-radius:0 9px 9px 0; }
  .qr-strip img{ width:.72in; height:.72in; background:#fff; border-radius:4px; flex:0 0 auto; }
  .qr-strip b{ display:block; color:#003f28; font:800 8.4pt Georgia, serif; margin-bottom:.03in; }
  .qr-strip span{ display:block; color:#33453c; font-size:7.3pt; line-height:1.4; }
`;

const startPage = Number(process.argv[3] || 194);

const CHART = [
  ["FY23", 5.0, true], ["FY24", 16.5, true], ["FY25", 22.6, true], ["FY26", 41.9, true],
  ["FY27", 71.3, false], ["FY28", 49.9, false], ["FY29", 39.1, false], ["FY30", 46.2, false], ["FY31", 35.3, false]
];

const TOP_PROJECTS = [
  ["Beach Renourishment (Additional Fund for Future Project)", "Tourist Development Fund · Beach Renourishment", "$10.8M"],
  ["Sheriff Triumph Radio Project", "Grant Funded · Sheriff", "$10.1M"],
  ["US 331 Bridge Lighting", "Tourist Development Fund · Public Works/Engineering", "$6.0M"],
  ["Hewett Bayou Connector Rd (E Lamb Drive Extension)", "Capital Projects Fund · Public Works/Engineering", "$4.6M"],
  ["CR 280 Bob Sikes Roadway Resurfacing Project Phase 1", "Grant Funded · Public Works/Engineering", "$4.2M"],
  ["Holiday Shores Drainage & Pedestrian Improvements Phase IIB", "Transportation Fund · Public Works/Engineering", "$4.0M"],
  ["Freeport 3280/Bear Creek Fire Station", "Capital Projects Fund · Sheriff", "$3.5M"],
  ["Pleasant Ridge Fire Station", "Capital Projects Fund · Sheriff", "$3.5M"]
];

const PROCESS = [
  ["Identify Need", "Departments identify infrastructure, facility, equipment, mobility, and public service needs."],
  ["Evaluate Funding", "OMB reviews available revenues, restrictions, grants, timing, and long-term financial impact."],
  ["Prioritize Projects", "Projects are reviewed against community needs, operational priorities, readiness, and policy direction."],
  ["Adopt Budget", "Appropriated projects become part of the annual budget, while the five-year CIP remains a planning guide."]
];

const page1 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Capital Program</small>
    <h1>Capital Improvement Plan</h1>
    <p class="intro">Capital projects turn revenue into roads, buildings, parks, and utility systems that serve the public for years. This chapter walks through what counts as a capital project, what goes into one, and why new projects are necessary &mdash; before the ledgers that follow detail each fund's specific projects.</p>

    <h2>What Is a Capital Project?</h2>
    <p class="body">Walton County defines a capital project as a significant, non-recurring expenditure for the construction, expansion, purchase, major repair, or replacement of buildings, utility systems, streets, infrastructure, or public property. Capital projects create or extend the life of a public asset; routine operating costs do not. A request is capital when it meets all four tests:</p>
    <div class="test-grid">
      <div class="test-card"><b>Non-Recurring</b><span>A one-time or infrequent expenditure rather than an annual operating cost.</span></div>
      <div class="test-card"><b>Significant Cost</b><span>Large enough to plan, schedule, and fund deliberately rather than absorb in a department's operating budget.</span></div>
      <div class="test-card"><b>Long Useful Life</b><span>The asset serves the public for years, well beyond the budget year that pays for it.</span></div>
      <div class="test-card"><b>Creates or Preserves an Asset</b><span>Builds, expands, replaces, or materially extends the life of County property.</span></div>
    </div>
    <div class="two-col">
      <div class="col-box yes">
        <h4>Counted as Capital</h4>
        <ul>
          <li>Road, bridge, sidewalk, and drainage construction</li>
          <li>New or expanded County buildings and facilities</li>
          <li>Major renovations and system replacements</li>
          <li>Land, rights-of-way, and easement purchases</li>
          <li>Machinery, vehicles, and equipment above the capital threshold</li>
        </ul>
      </div>
      <div class="col-box no">
        <h4>Not Capital</h4>
        <ul>
          <li>Routine maintenance and repairs</li>
          <li>Operating supplies and consumables</li>
          <li>Salaries and day-to-day service delivery</li>
          <li>Studies with no resulting asset</li>
          <li>Items below the capitalization threshold</li>
        </ul>
      </div>
    </div>
    <p class="footnote">Equipment with a value of $5,000 or more and a useful life of at least one year is recorded on the General Property List and capitalized &mdash; see the Machinery, Vehicles &amp; Equipment Ledger later in this chapter for those requests.</p>

    <h2>What Goes Into a Capital Project</h2>
    <p class="body">A capital project is more than construction. Each one combines property, physical work, professional services, and oversight, paid for through one or more sources of financing.</p>
    <div class="card-grid">
      <div class="info-card"><b>Land</b><span>Purchase of necessary property, including building acquisitions, rights-of-way, easements, and property needed to support future infrastructure and public facilities.</span></div>
      <div class="info-card"><b>Construction / Improvements</b><span>Expansions, renovations, major replacements, and mechanical or electrical installations, including site preparation and infrastructure such as sidewalks, streets, parking, drainage, and utility connections.</span></div>
      <div class="info-card"><b>Design / Professional Services</b><span>Plans, specifications, programming, surveying, engineering, development costs, permitting support, and environmental impact studies necessary for approved capital projects.</span></div>
      <div class="info-card"><b>Construction Engineering &amp; Inspection</b><span>Plan reviews, material testing, supervision, quality assurance, and compliance oversight that keep a project on specification through construction.</span></div>
    </div>
    <div class="fin-panel">
      <div class="fin-card"><b>Current Revenues</b><span>The County primarily funds capital on a cash basis from available revenue streams, including resources legally restricted to specific purposes.</span></div>
      <div class="fin-card"><b>Grants</b><span>Capital grants from federal, state, and regional agencies support eligible projects and carry local match, compliance, and reporting requirements.</span></div>
      <div class="fin-card"><b>Debt</b><span>Where appropriate, the County issues debt for major projects using structures designed to manage cost and risk.</span></div>
    </div>

    <footer><span>FY 2027 Annual Budget</span><b>${startPage}</b></footer>
  </section>
`;

const page2 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h1 class="continued">Capital Improvement Plan <span class="sub">(continued)</span></h1>

    <h2 style="margin-top:.08in;">Why Are New Projects Necessary?</h2>
    <p class="body">Capital work is not optional spending that can simply be deferred. Walton County is one of the fastest-growing counties in Florida, and its infrastructure has to keep pace with the demand placed on it &mdash; while the assets already built continue to age.</p>
    <div class="card-grid cols3">
      <div class="info-card"><b>Growth Arrives Before the Infrastructure</b><span>Florida's concurrency requirement is that infrastructure supporting development be available as that development occurs, not years afterward.</span></div>
      <div class="info-card"><b>Assets Wear Out</b><span>Replacing roads, bridges, and mechanical systems on schedule costs less than rebuilding them after failure.</span></div>
      <div class="info-card"><b>Deferral Is More Expensive</b><span>Construction costs and land prices generally rise over time; emergency repairs cost more than planned replacement.</span></div>
      <div class="info-card"><b>Service Levels Must Be Maintained</b><span>Holding response times, drainage capacity, and road conditions steady as the county grows requires adding capacity.</span></div>
      <div class="info-card"><b>Growth Helps Pay for Itself</b><span>Impact and mobility fees, plat fees, and tourist development taxes are restricted to the infrastructure growth and tourism demand.</span></div>
      <div class="info-card"><b>Outside Funding Is Time-Limited</b><span>Having a designed, permitted project ready is what allows the County to capture state and federal awards before deadlines pass.</span></div>
    </div>

    <h2>How Is the Level of Capital Spending Determined?</h2>
    <p class="body">Capital spending is not set by a target amount. It is built from the bottom up each year: departments identify needs, and the Office of Management and Budget tests how much of that can actually be paid for without straining operations or reserves.</p>
    <div class="card-grid cols3">
      <div class="info-card"><b>Available Cash</b><span>The County funds capital primarily pay-as-you-go, so spending is limited by what each fund can support the year the work is scheduled.</span></div>
      <div class="info-card"><b>Revenue Restrictions</b><span>Fuel taxes, tourist development taxes, and impact fees are legally restricted and cannot be redirected to an unrelated project.</span></div>
      <div class="info-card"><b>Grant Awards and Match</b><span>State and federal awards raise what the County can deliver, but each carries a local match and reporting obligation.</span></div>
      <div class="info-card"><b>Debt Capacity</b><span>Debt is used sparingly; existing obligations are repaid from the half-cent sales tax rather than property taxes.</span></div>
      <div class="info-card"><b>Project Readiness</b><span>Design, permitting, right-of-way, and procurement all have to line up before a project can realistically be delivered.</span></div>
      <div class="info-card"><b>Operating Impact</b><span>Every new facility, road, or vehicle adds ongoing cost to maintain, staff, and insure &mdash; weighed before a project is added.</span></div>
    </div>

    <h2>Is Capital Spending Going Up or Down?</h2>
    <div class="chart-wrap">
      <div class="chart">${CHART.map(([y, v, prior]) => `<div class="bar-col"><div class="amt">$${v.toFixed(1)}M</div><div class="bar ${prior ? "prior" : "adopted"}" style="height:${(v / 71.3 * 100).toFixed(0)}%"></div><div class="yr">${y}</div></div>`).join("")}</div>
      <div class="legend"><span><i style="background:#c9d6cd"></i>Prior work plans (FY2025&ndash;FY2026)</span><span><i style="background:#0b7741"></i>Tentative five-year plan (FY2027&ndash;FY2031)</span></div>
    </div>
    <p class="trend">Capital spending is up, then planned to taper. FY2027 is the largest year in the tentative plan at $71.3M, above the $41.9M high of the prior work plans. From FY2027 to FY2031 the tentative plan steps down by $36.1M (51%), from $71.3M to $35.3M.</p>
    <p class="footnote">FY2025 and FY2026 figures come from the County's earlier five-year work plans and are shown for context; they are not part of the FY2027 tentative plan. Later plan years are estimates re-evaluated every budget cycle, so out-year totals typically grow as projects are identified and scheduled.</p>

    <footer><span>FY 2027 Annual Budget</span><b>${startPage + 1}</b></footer>
  </section>
`;

const cipUrl = "https://budget-waltoncountyfl.com/pages/capital-improvement-plan.html";
const cipQrDataUrl = await QRCode.toDataURL(cipUrl, { margin: 0, width: 200, color: { dark: "#003f28", light: "#ffffff" } });

const page3 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h1 class="continued">Capital Improvement Plan <span class="sub">(continued)</span></h1>

    <h2 style="margin-top:.08in;">What Benefit Will They Provide?</h2>
    <p class="body">Capital spending is what turns revenue into something residents and visitors use every day. Each project is expected to deliver at least one of these.</p>
    <div class="card-grid cols3">
      <div class="info-card"><b>Safer Travel</b><span>Turn lanes, signals, bridge replacements, and multi-use paths give people safer ways to move through the county.</span></div>
      <div class="info-card"><b>Less Flooding and Storm Damage</b><span>Drainage, stormwater, and beach and dune work protect homes, roads, and public property.</span></div>
      <div class="info-card"><b>Faster Emergency Response</b><span>Fire stations and public safety facilities shorten the distance between a call for help and the crew answering it.</span></div>
      <div class="info-card"><b>Capacity That Keeps Up With Growth</b><span>Added road, facility, and utility capacity keeps service levels steady as population and visitation rise.</span></div>
      <div class="info-card"><b>Lower Long-Term Cost</b><span>Replacing an asset on schedule avoids emergency repairs and reduces maintenance carried in the operating budget.</span></div>
      <div class="info-card"><b>Places People Use</b><span>Beach access, parks, trails, and libraries are the public spaces residents and visitors use most directly.</span></div>
    </div>

    <h2>The Largest Commitments in FY2027</h2>
    <p class="body">The biggest capital projects budgeted for FY2027. Together these account for $46.6M of the $71.3M planned for the year.</p>
    <div class="proj-table">
      <div class="prow head"><div class="plabel">Project</div><div class="pfund">Fund &middot; Department</div><div class="pnum">Amount</div></div>
      ${TOP_PROJECTS.map(([n, f, a]) => `<div class="prow"><div class="plabel">${n}</div><div class="pfund">${f}</div><div class="pnum">${a}</div></div>`).join("")}
    </div>
    <div class="qr-strip"><img src="${cipQrDataUrl}" alt="QR"/><div><b>View Every Project Online</b><span>Every project in this chapter and the ledgers that follow has its own page on the County's budget website, with funding source, status, and location detail. Scan to browse the full Capital Improvement Plan.</span></div></div>

    <h2>How Projects Move Into the Capital Plan</h2>
    <div class="process-grid">
      ${PROCESS.map(([t, d], i) => `<div class="process-card"><span class="num">${i + 1}</span><b>${t}</b><span>${d}</span></div>`).join("")}
    </div>

    <footer><span>FY 2027 Annual Budget</span><b>${startPage + 2}</b></footer>
  </section>
`;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Capital Improvement Plan</title>
<style>${sharedCss}</style></head>
<body>${page1}${page2}${page3}</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-cip.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
