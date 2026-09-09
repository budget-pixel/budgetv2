import { chromium } from "playwright";

// Builds the FY 2027 Budget Book's Table of Contents as a two-page PDF,
// three chapters per page (each chapter keeps its own header, subtitle,
// and two-column listing -- there's just no need for a whole sheet per
// chapter). Page numbers below are final positions in the fully
// assembled book (see assemble-gfoa-budget.py) -- Budget Change Summary,
// Property Tax Allocation, and Financial Policies now sit up front, right
// behind Budget in Brief, instead of deep in the Financial Plan chapter.

const outPath = process.argv[2] || "/private/tmp/gfoa-final-toc.pdf";
const sections = [
  { title: "Introduction and Our County", subtitle: "A guide to Walton County's budget message, community context, priorities, public value, and decision process.", items: [
    ["GFOA Distinguished Budget Presentation Award",2],["Transmittal Letter",3],
    { header: "Our County" },
    ["Overview of Walton County",7],["Organizational Structure",10],["Strategic Initiatives",11],["Community Priorities and Organizational Challenges",12],
    { header: "Financial Overview" },
    ["Budget in Brief",15],["Budget Change Summary",16],["Property Tax Allocation Ledger",18],["Florida Amendment 3 Risk",20],
    { header: "Budget Process" },
    ["Budget Process",21],["Budget Calendar",22],["Financial Policies",23],["Summary of Financial Policies",24],
    ["What Residents Receive",25],["From Priority to Measurable Result",26],["Program and Service Budget",27],["Program Outcome Cards",29],["Revenue Strategy",31],
    { header: "Workforce Plan" },
    ["Workforce Plan",32],["Personnel Ledger",33],
    ["Long-Term Decisions",34],["Capital Portfolio",35],["Major Project Decision Record",36],["Capital Accountability",37],["Public Participation and Decision Record",38]
  ]},
  { title: "Constitutional Officers", subtitle: "Function, elected leadership, revenue sources, staffing, and budget summary for independently elected offices and the Board.", items: [["Constitutional Officers Ledger",40],["Walton County Sheriff's Office",41],["Board of County Commissioners",42],["Tax Collector",43],["Clerk of Courts & County Comptroller",44],["Property Appraiser",45],["Supervisor of Elections",46]] },
  { title: "Other Agencies and Court-Related Functions", subtitle: "Budget and funding information for courts, health, statutory partners, and other independent entities.", items: [
    ["Independent Agencies Ledger",48],
    ["Statutory & Other Agency Funding",49], ["Walton County Health Department",49], ["South Walton Fire & State Control",49], ["Medical Examiner",49], ["E911 Fund",49],
    ["Non-Profit Funding Program",50], ["State Attorney",50], ["Public Defender",50],
    ["Circuit Court",50], ["Court Technology & Innovations",50], ["County Court",50], ["Daughette MSBU Fund",50], ["Guardian Ad Litem",50]
  ] },
  { title: "Departments and Services", subtitle: "Function, goal, services, challenges, funding, contracts, staffing, and performance for each Board office and program.", items: [["Department Operating Ledger",52]],
    groups: [
      ["Beach Operations",85,[["Beach Renourishment",86],["Beach Tram",87]]],
      ["Building Department",54,[]],
      ["Building Construction and Maintenance",53,[]],
      ["Code Compliance",55,[]],
      ["County Administration Offices",56,[["Extension Office",62],["Geographic Information Systems",63],["Housing & Urban Development",64],["Human Resources",65],["Libraries",66],["Probation",72],["Soil Conservation",76],["Veteran Services",79]]],
      ["Emergency Management",59,[]],
      ["Engineering Department",60,[]],
      ["Environmental Services",null,[["Environmental Resources",61],["Mosquito Control",67],["Mossy Head Wastewater Treatment Facility",68],["Solid Waste",77]]],
      ["Office of Management and Budget",69,[]],
      ["Office of the County Attorney",70,[]],
      ["Parks & Recreation",null,[["Eagle Springs Golf and Recreation Center",57],["Eagle Springs Grill",58],["Recreation",75]]],
      ["Planning",71,[]],
      ["Public Works",73,[]],
      ["Purchasing",74,[]],
      ["Tourism Administration",80,[["Sales and Visitors Center",81],["Communications",82],["Marketing",83],["North Walton",84],["Tourism Lifeguard Services and Beach Safety",78]]]
    ]
  },
  { title: "Financial Plan", subtitle: "Countywide revenues, expenditures, staffing, operating budgets, fund schedules, transfers, debt, and long-term outlook.", items: [["Financial Plan Chapter",88],["Consolidated Budget Ledger",89],["Revenue Portfolio",91],["Revenue Ledger",92],["Expenditure Ledger",95],["Contractual Services Ledger",97],["Fund Financial Ledger",101],["Interfund Transfer Ledger",103],["Debt Ledger",104],["Long-Term Outlook",105]] },
  { title: "Capital Budget", subtitle: "The Capital Improvement Plan and fund-specific ledgers for equipment, infrastructure, tourism, public safety, recreation, and sidewalks.", items: [
    ["Capital Budget Chapter",107],["Capital Improvement Plan",108],["Machinery, Vehicles and Equipment Ledger",111],["Transportation and Infrastructure Capital Ledger",113],["Tourist Development Fund Capital Ledger",115],["Sheriff Capital Project Ledger",116],["Recreation Plat Fee Fund Capital Ledger",117],["Sidewalk Fund Capital Ledger",118],
    { header: "Glossary, Statistical, and Supplemental Information" },
    ["Statistical and Supplemental Information",119],["Principal Property Taxpayers",120],["Glossary, Acronyms and Frequently Asked Questions",121],
    ["Back Cover",130]
  ] }
];

// Three chapters per printed page instead of one.
const PAGE_GROUPS = [
  { footer: 5, titles: ["Introduction and Our County", "Constitutional Officers", "Other Agencies and Court-Related Functions"] },
  { footer: 6, titles: ["Departments and Services", "Financial Plan", "Capital Budget"] }
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
