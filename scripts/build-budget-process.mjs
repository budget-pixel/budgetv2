import { chromium } from "playwright";

// Builds the FY 2027 Budget Book's "Budget Process" section as its own
// two-page PDF -- a GFOA Distinguished Budget Presentation Award Policy
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
  ["Phase 1", "Preparation", "Departments prepare operating and capital requests based on service needs, staffing, projects, and funding assumptions.", "February–April"],
  ["Phase 2", "Review", "OMB and County Administration evaluate requests against revenue estimates, priorities, fund capacity, and policy guidance.", "April–June"],
  ["Phase 3", "Workshops", "The tentative budget is reviewed publicly with the Board, including funding requests, service levels, and the proposed millage rate.", "June–July"],
  ["Phase 4", "Adoption", "Required public hearings are held before the Board adopts the final millage rate and annual operating budget.", "September"]
];

const ROLES = [
  ["Departments & Constitutional Offices", "Define service needs and submit operating, personnel, and capital requests."],
  ["Office of Management & Budget", "Coordinates the cycle, reviews submissions, balances resources, and prepares recommendations."],
  ["County Administration", "Evaluates tradeoffs and aligns recommendations with County priorities and capacity."],
  ["Board of County Commissioners", "Provides direction, considers public input, sets millage rates, and adopts the budget."]
];

const AFTER = [
  ["Monitor", "Track Performance", "Departments and OMB monitor revenues, spending, appropriations, and operational needs throughout the fiscal year."],
  ["Control", "Stay Within Authority", "Fund-level budgetary control keeps total appropriations within the limits approved by the Board."],
  ["Amend", "Respond to Change", "The Board may amend the budget by resolution for grants, carry-forward funding, contingencies, or unforeseen needs."]
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
  ["June 1", "Tentative budget submissions from Constitutional Officers are due to the Board of County Commissioners."],
  ["June 10–11", "The Office of Management and Budget holds staff budget workshops with Administration."],
  ["July 1", "The Property Appraiser sends certification of taxable values, Form DR-420."],
  ["July 7", "The first public budget workshop reviews the tentative budget, funding requests, and proposed millage rate.", true],
  ["July 14, 21, 28", "Public budget workshops continue, including Board review of the tentative budget and required budget reduction exercise.", true],
  ["August 1", "The Tax Collector budget submission is due to the Department of Revenue and Board of County Commissioners."],
  ["August 4", "The Office of Management and Budget certifies the completed DR-420 form, including millage rates and hearing information."],
  ["August 24", "The Property Appraiser mails TRIM notices to taxpayers."],
  ["September 14", "The tentative budget and proposed millage rate hearing is held.", true],
  ["September 23", "The Notice of Proposed Tax Increase and Budget Summary Advertisement is advertised."],
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
    margin:0 0 .1in;
    color:#003f28;
    font:800 12.5pt/1.2 Georgia, serif;
  }
  h2 span{
    display:block;
    margin-bottom:.04in;
    color:#b89521;
    font-size:7.6pt;
    font-weight:900;
    letter-spacing:.1em;
    text-transform:uppercase;
  }
  .section-block{ margin:0 0 .3in; }
  .phase-grid{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:.14in;
  }
  .phase-card{
    padding:.16in .15in;
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
    font-size:8.2pt;
    line-height:1.42;
  }
  .phase-card small{
    display:block;
    margin-top:.1in;
    color:#68786f;
    font-size:7.2pt;
    font-weight:800;
    letter-spacing:.03em;
    text-transform:uppercase;
  }
  .role-grid{
    display:grid;
    grid-template-columns:repeat(2,1fr);
    gap:.16in .3in;
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
    font-size:8.4pt;
    line-height:1.42;
  }
  .public-card{
    margin-top:.18in;
    padding:.18in .22in;
    border:1px solid #d1be78;
    border-radius:12px;
    background:#f9f8f2;
  }
  .public-card h3{
    margin:0 0 .06in;
    color:#003f28;
    font:800 10.5pt/1.2 Georgia, serif;
  }
  .public-card p{
    margin:0 0 .1in;
    color:#33453c;
    font-size:8.6pt;
    line-height:1.45;
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
    gap:.16in;
  }
  .after-card{
    padding:.16in;
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
    font-size:8.2pt;
    line-height:1.42;
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

  /* --- page 2: calendar --- */
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
    <small class="kicker">Our County</small>
    <h1>Budget Process</h1>
    <p class="intro">See how a department request becomes Walton County&rsquo;s FY2027 tentative spending plan &mdash; and how residents can follow the decisions before final adoption.</p>

    <div class="section-block">
      <h2><span>Four Phases</span>One Public Plan</h2>
      <div class="phase-grid">
        ${PHASES.map(([num, title, desc, when]) => `<div class="phase-card"><span class="num">${num}</span><h3>${title}</h3><p>${desc}</p><small>${when}</small></div>`).join("")}
      </div>
    </div>

    <div class="section-block">
      <h2><span>Who Does What</span>A Collaborative Process</h2>
      <div class="role-grid">
        ${ROLES.map(([title, desc]) => `<div class="role-item"><h3>${title}</h3><p>${desc}</p></div>`).join("")}
      </div>
      <div class="public-card">
        <h3>Public Input Is Part of the Process</h3>
        <p>Residents can review proposals and speak before final decisions are made. Meeting notices and agendas provide the most current participation details.</p>
        <ul class="public-list">
          <li>Attend Budget Workshops</li>
          <li>Review the Tentative Budget</li>
          <li>Comment at Public Hearings</li>
        </ul>
      </div>
    </div>

    <div class="section-block">
      <h2><span>After Adoption</span>The Work Continues All Year</h2>
      <div class="after-grid">
        ${AFTER.map(([tag, title, desc]) => `<div class="after-card"><span>${tag}</span><h3>${title}</h3><p>${desc}</p></div>`).join("")}
      </div>
    </div>

    <footer><span>FY 2027 Annual Budget</span><b>PAGE_A</b></footer>
  </section>
`;

const page2 = `
  <section>
    ${pageHeader()}
    <small class="kicker">Our County</small>
    <h1>Budget Calendar</h1>
    <p class="intro">Key budget development dates, public workshops, notices, hearings, and adoption milestones for Fiscal Year 2027.</p>

    <div class="timeline-strip">
      ${TIMELINE.map(([month, label, featured]) => `<div class="timeline-month${featured ? " featured" : ""}"><strong>${month}</strong><span>${label}</span></div>`).join("")}
    </div>

    <div class="cal-table">
      ${CALENDAR.map(([date, event, featured]) => `<div class="cal-row${featured ? " featured" : ""}"><div class="cal-date">${date}</div><div class="cal-event">${event}</div></div>`).join("")}
    </div>
    <p class="cal-note"><strong>Budget Coordinator:</strong> Office of Management and Budget. All dates shown are estimates for planning purposes and may be adjusted as necessary during the budget development process.</p>

    <footer><span>FY 2027 Annual Budget</span><b>PAGE_B</b></footer>
  </section>
`;

const startPage = Number(process.argv[3] || 13);
const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Budget Process</title>
<style>${sharedCss}</style></head>
<body>${page1.replace("PAGE_A", startPage)}${page2.replace("PAGE_B", startPage + 1)}</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-budget-process.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
