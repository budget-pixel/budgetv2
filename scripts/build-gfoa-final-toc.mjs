import { chromium } from "playwright";

// Builds the FY 2027 Budget Book's Table of Contents as a three-page PDF.
// Introduction and Our County, Financial Overview, Budget Process, and
// Workforce Budget are each their own chapter box now (matching their own
// divider pages in the assembled book -- see assemble-gfoa-budget.py)
// instead of being lumped as sub-headers inside one big "Introduction and
// Our County" listing. Capital Portfolio, Major Project Decision Record,
// and Capital Accountability moved from Workforce Budget into Capital
// Budget, right after Capital Improvement Plan, matching their physical
// position in the assembled book. Page numbers below are final positions
// in the fully assembled book.

const outPath = process.argv[2] || "/private/tmp/gfoa-final-toc.pdf";
const sections = [
  { title: "Introduction and Our County", subtitle: "Walton County's budget message, organizational structure, strategic priorities, and community context.", items: [
    ["GFOA Distinguished Budget Presentation Award",2],["Transmittal Letter",3],
    ["Overview of Walton County",9],["Organizational Structure",12],["Strategic Initiatives",13],["Community Priorities and Organizational Challenges",14]
  ]},
  { title: "Financial Overview", subtitle: "A one-page look at the whole budget, the year-over-year change by department and fund, how a resident's property tax dollar is allocated, and the countywide revenue, expenditure, fund, transfer, and debt ledgers behind it.", items: [
    ["Budget in Brief",18],["Consolidated Budget Ledger",19],["Budget Change Summary",21],["Revenue Portfolio",23],["Revenue Ledger",24],["Property Tax Allocation Ledger",29],["Florida Amendment 3 Risk",31],["Expenditure Ledger",32],["Fund Financial Ledger",35],["Interfund Transfer Ledger",37],["Debt Ledger",38]
  ]},
  { title: "Budget Process", subtitle: "How a department request becomes Walton County's FY2027 tentative spending plan, the public value framework behind it, and the key dates residents can follow before final adoption.", items: [
    ["Budget Process",39],["Budget Calendar",41],["Public Participation and Decision Record",42],["Financial Policies",43],["Summary of Financial Policies",44],
    ["What Residents Receive",45],["From Priority to Measurable Result",46],["Program and Service Budget",47],["Program Outcome Cards",49],["Revenue Strategy",51]
  ]},
  { title: "Workforce Budget", subtitle: "Personnel cost and capacity across Walton County government -- the number and mix of positions, and the cost of maintaining the existing workforce.", items: [
    ["Workforce Budget",52],["Personnel Ledger",54],["Long-Term Decisions",55]
  ]},
  { title: "Constitutional Officers", subtitle: "Function, elected leadership, revenue sources, staffing, and budget summary for independently elected offices and the Board.", items: [["Constitutional Officers Ledger",57],["Walton County Sheriff's Office",58],["Board of County Commissioners",59],["Tax Collector",60],["Clerk of Courts & County Comptroller",61],["Property Appraiser",62],["Supervisor of Elections",63]] },
  { title: "Other Agencies and Court-Related Functions", subtitle: "Budget and funding information for courts, health, statutory partners, and other independent entities.", items: [
    ["Independent Agencies Ledger",65],
    ["Statutory & Other Agency Funding",66], ["Walton County Health Department",66], ["South Walton Fire & State Control",66], ["Medical Examiner",66], ["E911 Fund",66],
    ["Non-Profit Funding Program",67], ["State Attorney",67], ["Public Defender",67],
    ["Circuit Court",67], ["Court Technology & Innovations",67], ["County Court",67], ["Daughette MSBU Fund",67], ["Guardian Ad Litem",67]
  ] },
  { title: "Departments and Services", subtitle: "Function, goal, services, challenges, funding, contracts, staffing, and performance for each Board office and program.", items: [["Department Operating Ledger",68]],
    groups: [
      ["Beach Operations",102,[["Beach Renourishment",103],["Beach Tram",104]]],
      ["Building Department",71,[]],
      ["Building Construction and Maintenance",70,[]],
      ["Code Compliance",72,[]],
      ["County Administration Offices",73,[["Extension Office",79],["Geographic Information Systems",80],["Housing & Urban Development",81],["Human Resources",82],["Libraries",83],["Probation",89],["Soil Conservation",93],["Veteran Services",96]]],
      ["Emergency Management",76,[]],
      ["Engineering Department",77,[]],
      ["Environmental Services",null,[["Environmental Resources",78],["Mosquito Control",84],["Mossy Head Wastewater Treatment Facility",85],["Solid Waste",94]]],
      ["Office of Management and Budget",86,[]],
      ["Office of the County Attorney",87,[]],
      ["Parks & Recreation",null,[["Eagle Springs Golf and Recreation Center",74],["Eagle Springs Grill",75],["Recreation",92]]],
      ["Planning",88,[]],
      ["Public Works",90,[]],
      ["Purchasing",91,[]],
      ["Tourism Administration",97,[["Sales and Visitors Center",98],["Communications",99],["Marketing",100],["North Walton",101],["Tourism Lifeguard Services and Beach Safety",95]]]
    ]
  },
  { title: "Financial Plan", subtitle: "Contractual services and the county's long-term financial outlook. Countywide revenues, expenditures, and fund schedules now sit up front in the Financial Overview section.", items: [["Financial Plan Chapter",105],["Contractual Services Ledger",106],["Long-Term Outlook",110]] },
  { title: "Capital Budget", subtitle: "The Capital Improvement Plan, capital decision-making record, and fund-specific ledgers for equipment, infrastructure, tourism, public safety, recreation, and sidewalks.", items: [
    ["Capital Budget Chapter",112],["Capital Improvement Plan",113],["Capital Portfolio",116],["Major Project Decision Record",117],["Capital Accountability",118],["Machinery, Vehicles and Equipment Ledger",119],["Transportation and Infrastructure Capital Ledger",121],["Tourist Development Fund Capital Ledger",123],["Sheriff Capital Project Ledger",124],["Recreation Plat Fee Fund Capital Ledger",125],["Sidewalk Fund Capital Ledger",126]
  ] },
  { title: "Glossary, Statistical, and Supplemental Information", subtitle: "Statistical context, the county's largest taxpayers, and a glossary of budget terms, acronyms, and frequently asked questions.", items: [
    ["Glossary Chapter",127],["Statistical and Supplemental Information",128],["Principal Property Taxpayers",129],["Glossary, Acronyms and Frequently Asked Questions",130]
  ] }
];

// Chapters distributed across three printed pages instead of two, now
// that Introduction and Our County, Financial Overview, Budget Process,
// and Workforce Budget are each their own (shorter) chapter box.
const PAGE_GROUPS = [
  { footer: 5, titles: ["Introduction and Our County", "Financial Overview", "Budget Process", "Workforce Budget"] },
  { footer: 6, titles: ["Constitutional Officers", "Other Agencies and Court-Related Functions", "Financial Plan", "Glossary, Statistical, and Supplemental Information"] },
  { footer: 7, titles: ["Departments and Services", "Capital Budget"] }
];

const css = `@page{size:letter portrait;margin:0}*{box-sizing:border-box}html,body{margin:0}body{font-family:Arial,Helvetica,sans-serif;color:#173229}.page{position:relative;width:8.5in;height:11in;padding:.5in .62in .56in;page-break-after:always}.page:last-child{page-break-after:auto}header{display:flex;justify-content:space-between;padding-bottom:9px;border-bottom:1px solid #63736b;color:#53665d;font-size:8pt;font-weight:800;letter-spacing:.08em;text-transform:uppercase}header em{font-style:normal}.chapter{margin-top:.2in;padding-top:.16in;border-top:2px solid #d1be78}.chapter:first-of-type{border-top:0}.kicker{display:block;color:#a88418;font-size:7.4pt;font-weight:900;letter-spacing:.14em;text-transform:uppercase}h1{margin:3px 0 .05in;color:#003f28;font:800 13.5pt/1.15 Georgia,serif;letter-spacing:-.01em}.subtitle{max-width:7in;margin:0 0 .1in;color:#52665c;font-size:8pt;line-height:1.35}.rows{column-count:2;column-gap:.36in}.row{display:flex;align-items:flex-end;gap:7px;min-height:19px;padding:3px 0;border-bottom:1px solid #e4ebe7;break-inside:avoid;font-size:7.3pt}.row span{font-weight:700}.row i{flex:1;margin-bottom:3px;border-bottom:1px dotted #a8b7af}.row b{color:#006231;font-size:7.1pt}.subhead{column-span:all;margin:5px 0 2px;padding-bottom:2px;border-bottom:1px solid #d1be78;color:#a88418;font-size:6.6pt;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.subhead:first-child{margin-top:0}.dept-summary{display:grid;grid-template-columns:1fr 1fr;gap:0 .34in;margin-bottom:.06in}.dept-summary .row{min-height:18px;padding:2.6px 0;font-size:7pt}.dept-groups{column-count:2;column-gap:.34in}.dept-group{break-inside:avoid;margin:0 0 3px}.dept-parent{display:flex;align-items:flex-end;gap:6px;min-height:17px;padding:2.2px 0;border-bottom:1px solid #426653;font-size:7pt}.dept-parent span{font-weight:900;color:#003f28}.dept-parent i,.dept-child i{flex:1;margin-bottom:3px;border-bottom:1px dotted #a8b7af}.dept-parent b,.dept-child b{color:#006231;font-size:6.9pt}.dept-parent em{color:#718078;font-size:6pt;font-weight:400}.dept-child{display:flex;align-items:flex-end;gap:6px;min-height:15px;padding:1.8px 0 1.8px .16in;border-bottom:1px solid #eef1ee;font-size:6.4pt}.dept-child span{font-weight:400;color:#41564c}.dept-child span:before{content:'\\2013  ';color:#b89521}footer{position:absolute;left:.62in;right:.62in;bottom:.28in;display:flex;justify-content:space-between;border-top:1px solid #cbd8d1;padding-top:7px;color:#68786f;font-size:7.5pt;font-weight:800;letter-spacing:.08em;text-transform:uppercase}`;
function renderRows(s){
  if(!s.groups) return `<main class="rows">${s.items.map((item)=>Array.isArray(item)?`<div class="row"><span>${item[0]}</span><i></i><b>${item[1]}</b></div>`:`<div class="subhead">${item.header}</div>`).join('')}</main>`;
  const summary=`<div class="dept-summary">${s.items.map(([label,num])=>`<div class="row"><span>${label}</span><i></i><b>${num}</b></div>`).join('')}</div>`;
  const groups=s.groups.map(([label,num,children])=>`<div class="dept-group"><div class="dept-parent"><span>${label}</span><i></i>${num?`<b>${num}</b>`:`<em>department rollup</em>`}</div>${children.map(([child,page])=>`<div class="dept-child"><span>${child}</span><i></i><b>${page}</b></div>`).join('')}</div>`).join('');
  return `${summary}<main class="dept-groups">${groups}</main>`;
}
const byTitle = Object.fromEntries(sections.map(s => [s.title, s]));
const renderChapter = (s) => `<div class="chapter"><h1>${s.title}</h1><p class="subtitle">${s.subtitle}</p>${renderRows(s)}</div>`;
const pages = PAGE_GROUPS.map(g => `<section class="page"><header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>${g.titles.map(t => renderChapter(byTitle[t])).join('')}<footer><span>FY 2027 Tentative Budget</span><b>${g.footer}</b></footer></section>`).join('');
const browser = await chromium.launch({headless:true});
const page = await browser.newPage();
await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Table of Contents</title><style>${css}</style></head><body>${pages}</body></html>`,{waitUntil:'networkidle'});
await page.pdf({path:outPath,format:'Letter',printBackground:true,preferCSSPageSize:true,tagged:true,outline:true});
await browser.close();
console.log(`Wrote ${outPath}`);
