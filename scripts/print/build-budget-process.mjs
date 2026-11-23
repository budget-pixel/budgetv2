import { capturePublicationHtml } from "./publication-print.mjs";
import { chromium } from "playwright";
import { newPage } from "./readers-guide.mjs"; // in-text page references follow the Reader's Guide numbering

// Builds the FY 2027 Budget Book's "Budget Process" section as its own
// three-page PDF -- a GFOA Distinguished Budget Presentation Award Policy
// Document requirement (a description of the budget process). Meant to be
// inserted right after "Strategic Initiatives" and before "Statistical &
// Supplemental Information". Shares the header/footer/kicker/h1 system the
// rest of the front matter uses. Content is drawn from the live site's
// pages/budget-process.html (phases, roles, post-adoption management) and
// pages/budget-calendar.html (the dated milestone schedule), combined into
// one section the way the site's own "Budget Process & Calendar" page
// title implies. Drops the "Explore the details" link-out cards (web
// navigation, no print equivalent).

const PHASES = [
  ["Phase 1", "Preparation", "Departments prepare operating and capital requests identifying service needs, staffing, projects, funding assumptions, and proposed service changes.", "February–April"],
  ["Phase 2", "Review", "OMB and County Administration evaluate requests, reduction options, revenue estimates, fund capacity, policy guidance, and the Board's strategic priorities on pages " + newPage(13) + "–" + newPage(14) + ".", "April–June"],
  ["Phase 3", "Review & Workshops", "Staff review continues in June; public Board workshops in July address funding requests, service levels, strategic priorities, and the proposed millage rate.", "June–July"],
  ["Phase 4", "Adoption", "Required public hearings are held before the Board adopts the final millage rate and annual operating budget.", "September"]
];


// Budget flowchart (matches the flowchart on pages/budget-process.html).
// Dates are the FY 2027 Budget Calendar dates; [date, step, who, publicInput].
const FLOW = [
  ["Phase 1", "Preparation", "February–April", [
    ["Mar 12", "Request forms go out", "OMB"],
    ["Apr 6", "Department operating, staffing, and capital requests due", "Departments"]]],
  ["Phase 2", "Review", "April–June", [
    ["May 1", "Revenue and fund balance estimates", "OMB"],
    ["Jun 1", "Preliminary taxable value; Constitutional Officer budgets due", "Property Appraiser · Officers"],
    ["Jun 10–11", "Staff workshops weigh requests against revenue and priorities", "OMB · Administration"]]],
  ["Phase 3", "Workshops & TRIM", "July–August", [
    ["Jul 1", "Taxable value certified (Form DR-420)", "Property Appraiser", ["TRIM"]],
    ["Jul 7", "First public budget workshop", "Board", ["Public input"]],
    ["Jul 14–28", "Budget reduction workshop required by state law", "Board", ["Required", "Public input"]],
    ["Aug 4", "Proposed millage and hearing dates certified", "OMB", ["TRIM"]]]],
  ["Phase 4", "Adoption", "August–September", [
    ["Aug 24", "TRIM notices mailed to property owners", "Property Appraiser", ["TRIM"]],
    ["Sep 14", "First public hearing adopts the tentative budget and millage", "Board", ["TRIM", "Public input"]],
    ["Sep 23", "Notice of hearing and budget summary advertised", "OMB", ["TRIM"]],
    ["Sep 28", "Final hearing adopts the millage rate and budget", "Board", ["TRIM", "Public input"]]]]
];
const TAG_CLASS = { "TRIM": "trim", "Public input": "pub", "Required": "req" };
const flowNode = ([date, step, who, tags = []]) => `<li class="flow-node"><time>${date}</time><strong>${step}</strong><small>${who}${tags.map(t => `<em class="${TAG_CLASS[t]}">${t}</em>`).join("")}</small></li>`;
const FLOW_HTML = `<div class="flow-lanes">${FLOW.map(([num, title, when, steps]) => `<div class="flow-lane"><div class="flow-head"><span>${num} &middot; ${when}</span>${title}</div><ol>${steps.map(flowNode).join("")}${title === "Review" ? `<li class="flow-decision"><strong>Is the budget balanced?</strong><span><b>No:</b> revise requests and estimates, then review again.</span><span><b>Yes:</b> the proposed budget goes to the Board.</span></li>` : ""}</ol></div>`).join("")}</div>
<div class="flow-cycle"><strong>After adoption</strong><span>Within 30 days, TRIM compliance is certified to the Florida Department of Revenue</span><span>Oct 1: the fiscal year begins; spending is monitored</span><span>The Board amends the budget by resolution when needs change</span></div>
<p class="flow-note">Steps marked TRIM follow Florida&rsquo;s Truth in Millage deadlines (s. 200.065, F.S.). Dates are from the FY 2027 Budget Calendar.</p>`;

const ROLES = [
  ["Departments & Constitutional Offices", "Define service needs and submit operating, personnel, and capital requests."],
  ["Office of Management & Budget", "Coordinates the cycle, reviews submissions, balances resources, and prepares recommendations."],
  ["County Administration", "The County Administrator aligns OMB's recommendations with Board priorities and capacity."],
  ["Board of County Commissioners", "Five elected commissioners set direction, weigh public input, and adopt the final budget and millage rate."]
];

const AFTER = [
  ["Monitor", "Track Performance", "Departments and OMB monitor revenues, spending, appropriations, and operational needs throughout the fiscal year."],
  ["Control", "Stay Within Authority", "Fund-level budgetary control keeps total appropriations within the limits approved by the Board."],
  ["Amend", "Respond to Change", "The Board may amend the budget by resolution for grants, carry-forward funding, contingencies, or unforeseen needs."]
];

const REQUEST = [
  ["Department Overview", "Function and Goals", "A description of what the department does and the goals it is working toward."],
  ["Performance", "Performance Measures", "Workload and service-level measures that show what the department delivers."],
  ["Context", "Challenges and Accomplishments", "Challenges, issues, and opportunities facing the department, along with its accomplishments."],
  ["Proposed Budget", "Expenditure Changes", "An explanation of any change in expenditures from the prior year."],
  ["Proposed Budget", "Staffing Changes", "Any requested additions, reductions, or changes to positions."],
  ["Proposed Budget", "Revenue Changes", "Any change expected in revenues the department generates or receives."],
  ["Equipment and Capital", "Machinery, Equipment and Capital Projects", "Machinery and equipment requests, including Fleet Maintenance review, and capital project updates to the five-year Capital Improvement Plan."],
  ["Additional Information", "Pertinent Information and Documents", "Any other information relevant to the request, plus supporting documents."],
  ["Budget Direction", "Keep Services Constant; Identify Reductions", "Departments were told to hold services at current levels and to point out any area that could be reduced, so reviewers could weigh options.", true]
];

const TIMELINE = [
  ["March", "Budget requests distributed"],
  ["April", "Department submissions due"],
  ["May", "Revenue estimates prepared"],
  ["June", "Taxable values and officer budgets"],
  ["July", "Budget workshops and reduction exercise", true],
  ["August", "TRIM notices and hearing certification"],
  ["September", "Public hearings and final adoption", true]
];

const CALENDAR = [
  ["March 12", "The Office of Management and Budget distributes operating and capital improvement budget requests for department entry."],
  ["April 6", "Operating and capital improvement budget requests are due from county departments."],
  ["May 1", "The Office of Management and Budget prepares preliminary revenue and fund balance estimates."],
  ["June 1", "The Property Appraiser delivers preliminary taxable value to the Board of County Commissioners."],
  ["June 1", "Proposed budget submissions from Constitutional Officers are due to the Board of County Commissioners."],
  ["June 10–11", "The Office of Management and Budget holds staff budget workshops with Administration."],
  ["July 1", "The Property Appraiser sends certification of taxable values, Form DR-420."],
  ["July 7", "The first public budget workshop reviews the proposed budget, funding requests, and proposed millage rate.", true],
  ["July 14, 21, 28", "Public budget workshops continue, including Board review of the proposed budget and required budget reduction exercise.", true],
  ["August 1", "The Tax Collector budget submission is due to the Department of Revenue and Board of County Commissioners."],
  ["August 4", "The Office of Management and Budget certifies the completed DR-420 form, including millage rates and hearing information."],
  ["August 24", "The Property Appraiser mails TRIM notices to taxpayers."],
  ["September 14", "The first statutory budget and proposed millage rate hearing is held.", true],
  ["September 23", "The Notice of Budget Hearing and Budget Summary Advertisement is advertised."],
  ["September 28", "The final budget hearing is held to adopt the final millage rate and final budget.", true]
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
    margin-top:.28in;
    color:#b89521;
    font-size:8pt;
    font-weight:900;
    letter-spacing:.14em;
    text-transform:uppercase;
  }
  h1{
    margin:8px 0 .1in;
    color:#003f28;
    font:800 22pt/1.05 Georgia, "Times New Roman", serif;
    letter-spacing:-.02em;
  }
  p.intro{
    max-width:7.3in;
    margin:0 0 .24in;
    color:#33453c;
    font-size:9.5pt;
    line-height:1.5;
  }
  h2{
    margin:0 0 .06in;
    color:#003f28;
    font:800 12.5pt/1.2 Georgia, serif;
  }
  h2 span{
    display:block;
    margin-bottom:.03in;
    color:#b89521;
    font-size:7.6pt;
    font-weight:900;
    letter-spacing:.1em;
    text-transform:uppercase;
  }
  .section-block{ margin:0 0 .14in; }
  .flow-lanes{ display:grid; grid-template-columns:repeat(4,1fr); gap:.2in; margin-top:.08in; }
  .flow-lane{ position:relative; min-width:0; }
  .flow-lane+.flow-lane::before{ content:""; position:absolute; left:-.15in; top:.06in; border:5px solid transparent; border-left:7px solid #d1be78; }
  .flow-head{ margin-bottom:.07in; padding-bottom:.04in; border-bottom:2px solid #0b7741; color:#003f28; font-size:9.6pt; font-weight:800; }
  .flow-head span{ display:block; color:#b89521; font-size:6.4pt; font-weight:900; letter-spacing:.07em; text-transform:uppercase; }
  .flow-lane ol{ margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:.13in; }
  .flow-node,.flow-decision{ position:relative; padding:.06in .08in; border:1px solid #e4ebe7; border-radius:8px; background:#fbfcfa; }
  .flow-lane li+li::before{ content:""; position:absolute; left:50%; top:-.12in; height:.06in; border-left:1.5px solid #d1be78; }
  .flow-lane li+li::after{ content:""; position:absolute; left:calc(50% - 3.5px); top:-.065in; border:3.5px solid transparent; border-top:4.5px solid #d1be78; }
  .flow-node time{ display:block; color:#0b7741; font-size:6.6pt; font-weight:900; letter-spacing:.05em; text-transform:uppercase; }
  .flow-node strong{ display:block; margin:.02in 0; color:#003f28; font-size:7.6pt; line-height:1.28; }
  .flow-node small{ display:flex; flex-wrap:wrap; gap:4px; align-items:center; color:#68786f; font-size:6.4pt; font-weight:800; }
  .flow-node em{ padding:0 5px; border-radius:99px; background:#d1be78; color:#003f28; font-style:normal; font-size:5.8pt; line-height:1.6; }
  .flow-node em.trim{ background:#173229; color:#fff; }
  .flow-node em.req{ background:#0b7741; color:#fff; }
  .flow-note{ margin:.05in 0 0; color:#68786f; font-size:6.6pt; }
  .flow-decision{ border:1.5px dashed #d1be78; background:#fffaf0; }
  .flow-decision strong{ display:block; margin-bottom:.03in; color:#003f28; font-size:7.6pt; }
  .flow-decision span{ display:block; color:#33453c; font-size:6.7pt; line-height:1.3; }
  .flow-cycle{ display:grid; grid-template-columns:auto repeat(3,1fr); gap:.1in; align-items:center; margin-top:.14in; padding:.08in .12in; border-radius:8px; background:#003f28; color:#fff; font-size:7pt; line-height:1.3; }
  .flow-cycle span{ padding-left:.08in; border-left:2px solid #d1be78; }
  .phase-grid{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:.14in;
  }
  .phase-card{
    padding:.13in .14in;
    border:1px solid #e4ebe7;
    border-radius:12px;
    background:#fbfcfa;
  }
  .phase-card span.num{
    display:block;
    margin-bottom:.08in;
    color:#b89521;
    font-size:7.3pt;
    font-weight:900;
    letter-spacing:.08em;
    text-transform:uppercase;
  }
  .phase-card h3{
    margin:0 0 .06in;
    color:#003f28;
    font-size:10.3pt;
    font-weight:800;
  }
  .phase-card p{
    margin:0;
    color:#33453c;
    font-size:8pt;
    line-height:1.3;
  }
  .phase-card small{
    display:block;
    margin-top:.07in;
    color:#68786f;
    font-size:7.2pt;
    font-weight:800;
    letter-spacing:.03em;
    text-transform:uppercase;
  }
  .role-grid{
    display:grid;
    grid-template-columns:repeat(2,1fr);
    gap:.1in .3in;
  }
  .role-item{
    padding-left:.18in;
    border-left:3px solid #d1be78;
  }
  .role-item h3{
    margin:0 0 .04in;
    color:#003f28;
    font-size:9.6pt;
    font-weight:800;
  }
  .role-item p{
    margin:0;
    color:#33453c;
    font-size:8.2pt;
    line-height:1.3;
  }
  .public-card{
    margin-top:.12in;
    padding:.13in .18in;
    border:1px solid #d1be78;
    border-radius:12px;
    background:#f9f8f2;
  }
  .public-card h3{
    margin:0 0 .05in;
    color:#003f28;
    font:800 10.5pt/1.2 Georgia, serif;
  }
  .public-card p{
    margin:0 0 .07in;
    color:#33453c;
    font-size:8.6pt;
    line-height:1.4;
  }
  .public-list{
    display:flex;
    gap:.2in;
    list-style:none;
    margin:0;
    padding:0;
  }
  .public-list li{
    color:#003f28;
    font-size:8.4pt;
    font-weight:800;
  }
  .public-list li:before{ content:"\\2713  "; color:#0b7741; }
  .after-grid{
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:.14in;
  }
  .after-card{
    padding:.12in .13in;
    border:1px solid #e4ebe7;
    border-radius:12px;
  }
  .after-card span{
    color:#b89521;
    font-size:7.3pt;
    font-weight:900;
    letter-spacing:.06em;
    text-transform:uppercase;
  }
  .after-card h3{
    margin:.06in 0;
    color:#003f28;
    font-size:9.6pt;
    font-weight:800;
  }
  .after-card p{
    margin:0;
    color:#33453c;
    font-size:8pt;
    line-height:1.32;
  }
  .request-grid{
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:.12in;
  }
  .request-card{
    padding:.11in .13in;
    border:1px solid #e4ebe7;
    border-radius:12px;
  }
  .request-card.note{
    border-color:#d1be78;
    background:#f9f8f2;
  }
  .request-card span{
    color:#b89521;
    font-size:7pt;
    font-weight:900;
    letter-spacing:.06em;
    text-transform:uppercase;
  }
  .request-card h3{
    margin:.05in 0;
    color:#003f28;
    font-size:9.2pt;
    font-weight:800;
  }
  .request-card p{
    margin:0;
    color:#33453c;
    font-size:7.8pt;
    line-height:1.3;
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

  /* --- page 3: calendar --- */
  .timeline-strip{
    display:grid;
    grid-template-columns:repeat(7,1fr);
    gap:.08in;
    margin:0 0 .26in;
  }
  .timeline-month{
    padding:.12in .08in;
    border-radius:10px;
    background:#f4f7f4;
    text-align:center;
  }
  .timeline-month.featured{
    background:#003f28;
  }
  .timeline-month strong{
    display:block;
    color:#003f28;
    font-size:8.6pt;
    font-weight:800;
  }
  .timeline-month.featured strong{ color:#e7c95f; }
  .timeline-month span{
    display:block;
    margin-top:.04in;
    color:#68786f;
    font-size:6.6pt;
    line-height:1.3;
  }
  .timeline-month.featured span{ color:#fff; }
  .cal-table{
    display:grid;
    gap:0;
  }
  .cal-row{
    display:grid;
    grid-template-columns:1.15in 1fr;
    gap:.2in;
    padding:.1in 0;
    border-bottom:1px solid #e4ebe7;
  }
  .cal-row.featured{ background:#f9f8f2; }
  .cal-date{
    color:#003f28;
    font-size:9pt;
    font-weight:800;
  }
  .cal-event{
    color:#33453c;
    font-size:8.6pt;
    line-height:1.42;
  }
  .cal-note{
    margin:.18in 0 0;
    color:#68786f;
    font-size:7.6pt;
    font-style:italic;
    line-height:1.4;
  }
`;

const pageHeader = () => `<header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>`;

const page1 = `
  <section>
    ${pageHeader()}
    <small class="kicker">Budget Process</small>
    <h1>Budget Process</h1>
    <p class="intro">See how a department request becomes Walton County&rsquo;s FY 2027 final spending plan &mdash; and how residents can follow the decisions before final adoption.</p>

    <div class="section-block">
      <h2><span>Budget Flowchart</span>From Department Requests to Adoption</h2>
      ${FLOW_HTML}
    </div>

    <div class="section-block">
      <h2><span>Who Does What</span>A Collaborative Process</h2>
      <div class="role-grid">
        ${ROLES.map(([title, desc]) => `<div class="role-item"><h3>${title}</h3><p>${desc}</p></div>`).join("")}
      </div>
    </div>

    <div class="public-card" style="margin-top:.16in;padding:.16in .22in;">
      <h3>Public Input Is Part of the Process</h3>
      <p>Residents can review proposals and speak before final decisions are made. Meeting notices and agendas provide the most current participation details.</p>
      <ul class="public-list">
        <li>Attend Budget Workshops</li>
        <li>Review the Proposed Budget</li>
        <li>Comment at Public Hearings</li>
      </ul>
    </div>

    <footer><span>FY 2027 Final Budget</span><b>PAGE_A</b></footer>
  </section>
`;

const page2 = `
  <section>
    ${pageHeader()}
    <small class="kicker">Budget Process</small>
    <h1>Budget Process <span style="color:#68786f;font-size:10pt;font-weight:400;">(continued)</span></h1>


    <div class="section-block">
      <h2><span>Request Guidance</span>What Board Departments Were Asked to Provide</h2>
      <p class="intro" style="margin:0 0 .12in;font-size:8.6pt;">Each department completed the same budget request form. Departments were also directed to keep services at their current level and to identify any area where spending could be reduced.</p>
      <div class="request-grid">
        ${REQUEST.map(([tag, title, desc, note]) => `<div class="request-card${note ? " note" : ""}"><span>${tag}</span><h3>${title}</h3><p>${desc}</p></div>`).join("")}
      </div>
      <p class="intro" style="margin:.12in 0 0;font-size:8pt;line-height:1.35;">OMB and County Administration reviewed requests against available resources, adopted financial policies, and the Board priorities on pages ${newPage(13)}&ndash;${newPage(14)}. Public comments and budget effects are documented on page ${newPage(48)}.</p>
    </div>

    <div class="section-block" style="margin-bottom:0;">
      <h2><span>After Adoption</span>The Work Continues All Year</h2>
      <div class="after-grid">
        ${AFTER.map(([tag, title, desc]) => `<div class="after-card"><span>${tag}</span><h3>${title}</h3><p>${desc}</p></div>`).join("")}
      </div>
    </div>

    <footer><span>FY 2027 Final Budget</span><b>PAGE_B</b></footer>
  </section>
`;

const page3 = `
  <section>
    ${pageHeader()}
    <small class="kicker">Budget Process</small>
    <h1>Budget Calendar</h1>
    <p class="intro">All dates below are in 2026 and develop the budget for Fiscal Year 2027, which runs October 1, 2026 through September 30, 2027.</p>

    <div class="timeline-strip">
      ${TIMELINE.map(([month, label, featured]) => `<div class="timeline-month${featured ? " featured" : ""}"><strong>${month}</strong><span>${label}</span></div>`).join("")}
    </div>

    <div class="cal-table">
      ${CALENDAR.map(([date, event, featured]) => `<div class="cal-row${featured ? " featured" : ""}"><div class="cal-date">${date}</div><div class="cal-event">${event}</div></div>`).join("")}
    </div>
    <p class="cal-note"><strong>Budget Coordinator:</strong> Office of Management and Budget.</p>

    <footer><span>FY 2027 Final Budget</span><b>PAGE_C</b></footer>
  </section>
`;

const startPage = Number(process.argv[3] || 13);
const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Budget Process</title>
<style>${sharedCss}</style></head>
<body>${page1.replace("PAGE_A", startPage)}${page2.replace("PAGE_B", startPage + 1)}${page3.replace("PAGE_C", startPage + 2)}</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-budget-process.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await capturePublicationHtml(page, outPath);
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
