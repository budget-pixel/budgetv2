// Reader's Guide pages for the FY 2027 budget book.
//
// One overall guide follows the table of contents, and each section opens
// with its own guide right after its photo divider. Every guide uses the
// same layout: a row of reading steps with page ranges, a table of what
// each page answers, and optional notes.
//
// Page numbers below are written in the book's earlier 134-page numbering
// and converted with newPage(), so the content stays readable and the
// insertion points live in one place. A page in [first, last] form prints
// as a range.

// Published pages (old numbering) that a new guide page follows. The
// Financial Overview (18) and Capital Budget (108) guides replace pages
// that were already guides, so they are not listed here.
export const INSERT_AFTER = [7, 8, 44, 51, 59, 63, 69, 103, 123];
// Old pages removed from the book: the Capital Funding and Delivery
// Dashboard (old page 112) repeated the Capital Improvement Plan's fund
// reconciliation and largest commitments, so it was dropped.
export const REMOVED = [112];
export const OLD_PAGE_COUNT = 134;
export const NEW_PAGE_COUNT = OLD_PAGE_COUNT + INSERT_AFTER.length - REMOVED.length;

export const newPage = (n) => n + INSERT_AFTER.filter((p) => n > p).length - REMOVED.filter((p) => n > p).length;
const pageLabel = (page) => Array.isArray(page)
  ? (page[0] === page[1] ? `${newPage(page[0])}` : `${newPage(page[0])}&ndash;${newPage(page[1])}`)
  : `${newPage(page)}`;
const firstPage = (page) => Array.isArray(page) ? page[0] : page;
const lastPage = (page) => Array.isArray(page) ? page[1] : page;

// Sections: [title, divider page, last page] in old numbering.
const SECTIONS = [
  ["Introduction and Our County", 8, 16, "The county, its government, and the priorities the budget responds to."],
  ["Financial Overview", 17, 43, "The whole budget on one page, then the revenue, spending, fund, debt, and reserve schedules."],
  ["Budget Process", 44, 50, "How the budget was built, how the public took part, and the policies that guide it."],
  ["Constitutional Officer Budget", 51, 58, "The Sheriff, Tax Collector, Clerk, Property Appraiser, Supervisor of Elections, and Board office."],
  ["Other Agencies and Court-Related Functions", 59, 62, "Courts, health, fire, and other entities the County funds."],
  ["Program and Service Budget", 63, 68, "What residents receive, grouped into four service areas."],
  ["Board Department Budgets", 69, 102, "A profile of each Board department and office."],
  ["Workforce Budget", 103, 106, "Positions, personnel cost, and the employee health plan."],
  ["Capital Budget", 107, 122, "The Capital Improvement Plan and the ledgers that fund it."],
  ["Glossary, Statistical, and Supplemental Information", 123, 133, "Answers to common questions, budget terms, and county statistics."]
];

export const GUIDES = [
  {
    key: "overall", insertAfter: 7, kicker: "Introduction and Budget Overview", title: "Reader&rsquo;s Guide to the FY 2027 Budget",
    intro: "This book is organized in ten sections. Each opens with a photo divider and its own Reader&rsquo;s Guide, which lists its pages in reading order. For the whole budget on one page, start with the Budget in Brief; then turn to the section that answers your question.",
    sectionSteps: true,
    heading: "Where to find answers",
    groups: [
      ["The big picture", [
        ["How large is the budget?", 19, "Budget in Brief"],
        ["What changed from FY 2026?", 23, "Budget Change Summary"],
        ["Where does the money come from?", 27, "Revenue Ledger"],
        ["How is my property tax dollar divided?", 31, "Property Tax Allocation Ledger"],
        ["How much is held in reserve?", 41, "Reserve Position"]]],
      ["The detail", [
        ["What does each constitutional officer receive?", 52, "Constitutional Officers and Board Office Ledger"],
        ["What does a Board department do and spend?", 70, "Department Operating Ledger and profiles"],
        ["How many people does the County employ?", 105, "Personnel Ledger"],
        ["Which projects are being built?", 109, "Capital Improvement Plan"],
        ["How could the public take part?", 48, "Public Participation and Decision Record"],
        ["What does a budget term mean?", 126, "Glossary of Budget Terms"]]]
    ],
    cards: [
      ["green", "Start with the message", "The Transmittal Letter (page 3) summarizes the Board&rsquo;s decisions, the budget&rsquo;s principal commitments, and the figures that matter most."],
      ["gold", "Follow the money in order", "Revenue is recorded by source, placed in funds, and spent on services and capital. The Financial Overview follows that same order."]
    ]
  },
  {
    key: "introduction", insertAfter: 8, kicker: "Introduction and Our County", title: "Reader&rsquo;s Guide",
    intro: "This section introduces Walton County and its government, then sets out the priorities and challenges the FY 2027 budget responds to.",
    groups: [
      ["Meet the county", [
        ["Overview of Walton County", 9, "Geography, history, and growth"],
        ["Discover Walton County", 10, "The communities and culture that shape County services"],
        ["Board of County Commissioners", 11, "The five district commissioners"]]],
      ["How the County is organized", [
        ["Organizational Structure", 12, "How residents, the Board, and departments connect"],
        ["Strategic Initiatives", 13, "The County&rsquo;s mission, vision, and core values"]]],
      ["What the budget responds to", [
        ["Community Priorities", 14, "The six strategic priority areas for FY 2027&ndash;FY 2032"],
        ["Organizational Challenges", 15, "The pressures the County faces"],
        ["Budget Response", 16, "How the budget answers each challenge"]]]
    ]
  },
  {
    key: "financial", replaces: 18, kicker: "Financial Overview", title: "Reader&rsquo;s Guide",
    intro: "This section moves from the big picture to the detail. Start with the one-page summary, then follow the schedules in order. Each one answers a different question, so read them together rather than treating any single total as the whole budget.",
    groups: [
      ["Start with the big picture", [
        ["Budget in Brief", 19, "Where each dollar comes from and where it goes"],
        ["How the Budget Works", 20, "How revenue moves through funds to services, and why gross fund totals exceed the net budget"]]],
      ["See the whole budget", [
        ["Consolidated Budget Ledger", 21, "Every fund&rsquo;s sources and uses side by side"],
        ["Budget Change Summary", 23, "What changed from FY 2026 and why"]]],
      ["Follow the money in", [
        ["Revenue Portfolio", 25, "The mix of revenue sources and how dependable each is"],
        ["Revenue Strategy", 26, "How FY 2027 resources were estimated"],
        ["Revenue Ledger", 27, "Every revenue line by fund"],
        ["Property Tax Allocation Ledger", 31, "How each property tax dollar is divided"],
        ["Florida Amendment 3 Risk", 33, "Exposure to a possible property tax change"]]],
      ["Follow the money out", [
        ["Expenditure Ledger", 34, "Spending by fund, function, and department"],
        ["Fund Financial Ledger", 37, "Each fund&rsquo;s opening balance, sources, uses, and ending balance"],
        ["Interfund Transfer Ledger", 39, "Which funds pay which, so nothing is counted twice"]]],
      ["Look ahead", [
        ["Debt Ledger", 40, "Outstanding debt and this year&rsquo;s payments"],
        ["Reserve Position", 41, "Six-month reserve targets for the General Fund and tourism"],
        ["Long-Term Outlook", 42, "The multi-year forecast and recurring-cost pressure"]]]
    ],
    cardsHeading: "What can and cannot be combined",
    cards: [
      ["green", "Can be compared", "Current-year revenue plus fund balance brought forward can be compared with the net expenditure budget. Department and program totals can be traced to their supporting fund schedules."],
      ["gold", "Should not be added together", "Gross fund budgets should not be added to the net budget. Restricted tourism, transportation, solid-waste, grant, or assessment balances cannot be treated as generally available cash."]
    ]
  },
  {
    key: "process", insertAfter: 44, kicker: "Budget Process", title: "Reader&rsquo;s Guide",
    intro: "This section follows a budget request from department submission to the Board&rsquo;s final adoption, and sets out the financial policies that govern the plan.",
    groups: [
      ["How the budget is built", [
        ["Budget Process", [45, 46], "How a department request becomes the final spending plan"],
        ["Budget Calendar", 47, "Key 2026 dates, from requests to adoption"]]],
      ["How the public took part", [
        ["Public Participation and Decision Record", 48, "Workshops, hearings, and the Board&rsquo;s decisions"]]],
      ["The rules that guide it", [
        ["Financial Policies", 49, "The framework for sound financial management"],
        ["Summary of Financial Policies", 50, "The nine adopted policies at a glance"]]]
    ]
  },
  {
    key: "constitutional", insertAfter: 51, kicker: "Constitutional Officer Budget", title: "Reader&rsquo;s Guide",
    intro: "Walton County funds five independently elected constitutional officers and the Board of County Commissioners&rsquo; own office. Start with the ledger for every office side by side, then turn to each office&rsquo;s page.",
    groups: [
      ["Start with the totals", [
        ["Constitutional Officers and Board Office Ledger", 52, "Each office&rsquo;s budget, staffing, and change from FY 2026"]]],
      ["Then each office", [
        ["Sheriff&rsquo;s Office", 53, "Function, leadership, staffing, and budget"],
        ["Board of County Commissioners", 54, "Function, commissioners, staffing, and budget"],
        ["Tax Collector", 55, "Function, leadership, staffing, and budget"],
        ["Clerk of Courts &amp; County Comptroller", 56, "Function, leadership, staffing, and budget"],
        ["Property Appraiser", 57, "Function, leadership, staffing, and budget"],
        ["Supervisor of Elections", 58, "Function, leadership, staffing, and budget"]]]
    ]
  },
  {
    key: "agencies", insertAfter: 59, kicker: "Other Agencies and Court-Related Functions", title: "Reader&rsquo;s Guide",
    intro: "The County funds courts, health, fire, and other entities it is required to support or elects to support. One ledger shows every entity&rsquo;s budget, revenue source, and change from FY 2026.",
    groups: [
      ["Independent Agencies Ledger", [
        ["Overview and totals", 60, "Budget, revenue source, and change for each entity"],
        ["Statutory and other agencies", 61, "Health Department, South Walton Fire, Medical Examiner, E911, and nonprofit funding"],
        ["Courts and justice", 62, "State Attorney, Public Defender, the courts, and Guardian ad Litem"]]]
    ]
  },
  {
    key: "program", insertAfter: 63, kicker: "Program and Service Budget", title: "Reader&rsquo;s Guide",
    intro: "This section connects the adopted budget to the services residents receive. Board-administered services are grouped into four areas, each with its purpose, full cost, funding, and FY 2027 targets.",
    groups: [
      ["Start with public value", [
        ["What Residents Receive", 64, "How the budget connects to everyday services"]]],
      ["Then each service area", [
        ["Safety, Justice and Effective Government", 65, "Purpose, full cost, funding, and FY 2027 targets"],
        ["Visitors, Mobility and Infrastructure", 66, "Purpose, full cost, funding, and FY 2027 targets"],
        ["Environment, Growth and Community Development", 67, "Purpose, full cost, funding, and FY 2027 targets"],
        ["Quality of Life and Community Wellbeing", 68, "Purpose, full cost, funding, and FY 2027 targets"]]]
    ]
  },
  {
    key: "departments", insertAfter: 69, kicker: "Board Department Budgets", title: "Reader&rsquo;s Guide",
    intro: "Start with the ledger, which shows all 15 Board department rollups side by side. Each department or office then has its own one-page profile, grouped below as they appear in the book.",
    groups: [
      ["Start with the ledger", [
        ["Department Operating Ledger", 70, "Every department&rsquo;s budget, staffing, and change from FY 2026"]]],
      ["Then each department", [
        ["Building Construction and Maintenance", 71, "Facilities maintenance, custodial, and parks maintenance"],
        ["Building Department", 72, "Construction permits and inspections"],
        ["Code Compliance", 73, "Code enforcement countywide and on the beach"],
        ["County Administration Offices", [74, 82], "Administration, Extension, GIS, Housing, Human Resources, Libraries, Probation, Soil Conservation, Veteran Services"],
        ["Parks &amp; Recreation", [83, 85], "Eagle Springs Golf and Grill, and Recreation"],
        ["Emergency Management", 86, "Preparedness, response, and recovery"],
        ["Engineering Department", 87, "County engineering and project design"],
        ["Environmental Services", [88, 91], "Environmental Resources, Mosquito Control, Mossy Head Wastewater, Solid Waste"],
        ["Office of Management and Budget", 92, "Budget preparation and monitoring"],
        ["Office of the County Attorney", 93, "Legal services to the Board and departments"],
        ["Planning", 94, "Planning and development services"],
        ["Public Works", 95, "Roads, drainage, and infrastructure"],
        ["Purchasing", 96, "Procurement and contracts"],
        ["Tourism Administration", [97, 100], "Administration, Sales and Visitors Center, Communications, Marketing"],
        ["Beach Operations", [101, 102], "Beach Operations and Beach Tram"]]]
    ],
    cardsHeading: "Reading a department profile",
    cards: [
      ["green", "What each profile includes", "A statement of function and goal, services and performance measures, funding sources, contracts, staffing, and the FY 2027 budget compared with FY 2026."],
      ["gold", "How departments are grouped", "Offices that report through one department, such as the County Administration offices, appear together under that department&rsquo;s name."]
    ]
  },
  {
    key: "workforce", insertAfter: 103, kicker: "Workforce Budget", title: "Reader&rsquo;s Guide",
    intro: "Personnel cost changes for two different reasons: the number and mix of positions, and the cost of each position. This section separates the two and shows how employee health benefits are financed.",
    groups: [
      ["Start with cost and capacity", [
        ["People, Cost and Capacity", 104, "Why personnel cost changes: positions versus pay and benefits"]]],
      ["Then the detail", [
        ["Personnel Ledger", 105, "Positions and personnel cost by office"],
        ["Self-Insurance Fund", 106, "How employee health benefits are financed and reserved"]]]
    ]
  },
  {
    key: "capital", replaces: 108, kicker: "Capital Budget", title: "Reader&rsquo;s Guide",
    intro: "Start with the Capital Improvement Plan, which explains the funded program and why each project is needed. The ledgers that follow show the projects each fund pays for.",
    groups: [
      ["Start with the plan", [
        ["Capital Improvement Plan", [109, 111], "The funded program, why projects are needed, their benefit, and the fund reconciliation"]]],
      ["Then each fund&rsquo;s ledger", [
        ["Transportation and Infrastructure Capital Ledger", [113, 115], "Roads, bridges, drainage, and paths"],
        ["Tourist Development Fund Capital Ledger", 116, "Beach and visitor facilities"],
        ["Sheriff Capital Project Ledger", 117, "Public-safety facility projects"],
        ["Recreation Plat Fee Fund Capital Ledger", 118, "Recreation projects funded by developer assessments"],
        ["Sidewalk Fund Capital Ledger", 119, "Sidewalks funded by in-lieu assessments"],
        ["Machinery, Vehicles, and Equipment Ledger", [120, 122], "Vehicles and equipment by department"]]]
    ]
  },
  {
    key: "reference", insertAfter: 123, kicker: "Glossary, Statistical, and Supplemental Information", title: "Reader&rsquo;s Guide",
    intro: "Use this section to look up a term, find answers to common questions, or see the statistics behind the budget.",
    groups: [
      ["Questions and terms", [
        ["Glossary, Acronyms &amp; FAQ", [124, 125], "Answers to common budget questions"],
        ["Glossary of Budget Terms", [126, 131], "Definitions of terms and acronyms used in this book"]]],
      ["Statistics", [
        ["Statistical &amp; Supplemental Information", 132, "Population and demographic data"],
        ["Principal Property Taxpayers", 133, "The largest taxpayers on the 2025 tax roll"]]]
    ]
  }
];

// The new physical page of each guide.
export const guidePage = (guide) => guide.replaces ? newPage(guide.replaces) : newPage(guide.insertAfter) + 1;

const stepLabel = (i, count) => i === 0 ? "Start" : i === count - 1 ? "Finish" : "Then";

function stepsHtml(guide) {
  if (guide.sectionSteps) {
    return `<div class="step-row rg-sections">${SECTIONS.map(([title, divider, last, text], i) =>
      `<div class="step"><b>${String(i + 1).padStart(2, "0")} &middot; p. ${newPage(divider)}&ndash;${newPage(last)}</b><strong>${title}</strong><p>${text}</p></div>`).join("")}</div>`;
  }
  const count = guide.groups.length;
  return `<div class="step-row" style="grid-template-columns:repeat(${count},1fr)">${guide.groups.map(([stage, items], i) => {
    const first = firstPage(items[0][1]);
    const last = lastPage(items[items.length - 1][1]);
    const range = first === last ? `${newPage(first)}` : `${newPage(first)}&ndash;${newPage(last)}`;
    return `<div class="step"><b>${count > 1 ? stepLabel(i, count) + " &middot; " : ""}p. ${range}</b><strong>${stage}</strong><p>${items.map((item) => item[0]).join(", ")}</p></div>`;
  }).join("")}</div>`;
}

// For the overall guide a row is [question, page, where]; otherwise it is
// [title, page, what it answers].
function tableHtml(guide) {
  return `<div class="roadmap">${guide.groups.map(([stage, items]) => `<div class="roadmap-group"><span class="roadmap-stage">${stage}</span>${items.map(([title, page, text]) =>
    `<div class="roadmap-row"><strong>${title}</strong><span>${text}</span><b>${pageLabel(page)}</b></div>`).join("")}</div>`).join("")}</div>`;
}

export const GUIDE_CSS = `.roadmap-page .roadmap{display:grid;gap:.07in;margin:.06in 0 .1in}.roadmap-page .roadmap-group{padding:.06in .12in;border:1px solid #e4ebe7;border-left:4px solid #d1be78;border-radius:0 8px 8px 0;background:#fbfcfa}.roadmap-page .roadmap-group:nth-child(even){border-left-color:#0b7741}.roadmap-page .roadmap-stage{display:block;margin:.02in 0 .03in;color:#a88418;font-size:6.6pt;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.roadmap-page .roadmap-row{display:grid;grid-template-columns:2.15in 1fr .55in;gap:.12in;align-items:baseline;padding:.035in 0;border-top:1px solid #eef1ee;font-size:8pt}.roadmap-page .roadmap-row strong{color:#003f28}.roadmap-page .roadmap-row span{color:#33453c}.roadmap-page .roadmap-row b{color:#003f28;text-align:right;white-space:nowrap}.roadmap-page .rg-sections{grid-template-columns:repeat(5,1fr)}.roadmap-page .rg-sections .step strong{font-size:7.6pt}.roadmap-page .rg-sections .step p{font-size:6.5pt}`;

// header(kicker, title, intro) and footer(number) come from the caller so
// the guide matches the surrounding pages exactly.
export function guidePageHtml(guide, header, footer) {
  return `<section class="page roadmap-page">${header(guide.kicker, guide.title, guide.intro)}
${stepsHtml(guide)}
<h2>${guide.heading || (guide.key === "financial" ? "What each schedule answers" : "What each page answers")}</h2>
${tableHtml(guide)}
${guide.cards ? `${guide.cardsHeading ? `<h2>${guide.cardsHeading}</h2>` : ""}<div class="grid2"${guide.cardsHeading ? "" : ' style="margin-top:.12in"'}>${guide.cards.map(([tone, title, text]) => `<div class="card ${tone}"><strong>${title}</strong><p>${text}</p></div>`).join("")}</div>` : ""}
<style>${GUIDE_CSS}</style>
${footer(guidePage(guide))}</section>`;
}
