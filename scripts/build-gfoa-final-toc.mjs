import { chromium } from "playwright";

// Builds the FY 2027 Budget Book's Table of Contents as a three-page PDF.
// Introduction and Our County, Financial Overview, Budget Process, and
// Workforce Budget are each their own chapter box now (matching their own
// divider pages in the assembled book -- see assemble-gfoa-budget.py)
// instead of being lumped as sub-headers inside one big "Introduction and
// Our County" listing. Capital Portfolio, Major Project Decision Record,
// and Capital Accountability moved from Workforce Budget into Capital
// Budget, right after Capital Improvement Plan, matching their physical
// position in the assembled book. Long-Term Outlook now lives inside
// Financial Overview (its own kicker always read "Financial Overview") --
// the old standalone "Financial Plan" chapter it used to sit in by itself,
// physically stranded between Departments and Services and Capital Budget,
// has been removed. Revenue Strategy now follows Revenue Portfolio. The
// former Draft - Under Review section was removed after its useful long-term
// disclosures were consolidated into the reviewed narrative. Page numbers
// below are final positions in the fully assembled book.

const outPath = process.argv[2] || "/private/tmp/gfoa-final-toc.pdf";
const sections = [
  { title: "Introduction and Our County", subtitle: "Walton County's budget message, organizational structure, strategic priorities, and community context.", items: [
    ["GFOA Distinguished Budget Presentation Award",2],["Transmittal Letter",3],
    ["Overview of Walton County",9],["Organizational Structure",12],["Strategic Initiatives",13],["Community Priorities and Organizational Challenges",14]
  ]},
  { title: "Financial Overview", subtitle: "A one-page look at the whole budget, the year-over-year change by department and fund, how a resident's property tax dollar is allocated, and the countywide revenue, expenditure, fund, transfer, and debt ledgers behind it.", items: [
    ["Budget in Brief",17],["Consolidated Budget Ledger",18],["Budget Change Summary",20],["Revenue Portfolio",22],["Revenue Strategy",23],["Revenue Ledger",24],["Property Tax Allocation Ledger",28],["Florida Amendment 3 Risk",30],["Expenditure Ledger",31],["Fund Financial Ledger",34],["Interfund Transfer Ledger",36],["Debt Ledger",37],["Long-Term Outlook",38]
  ]},
  { title: "Budget Process", subtitle: "How a department request becomes Walton County's FY2027 final spending plan, and the key dates residents can follow before final adoption.", items: [
    ["Budget Process",41],["Budget Process (continued)",42],["Budget Calendar",43],["Public Participation and Decision Record",44],["Financial Policies",45],["Summary of Financial Policies",46]
  ]},
  { title: "Constitutional Officer Budget", subtitle: "Function, elected leadership, revenue sources, staffing, and budget summary for independently elected offices and the Board.", items: [["Constitutional Officers Ledger",48,{overview:true}],["Walton County Sheriff's Office",49],["Board of County Commissioners",50],["Tax Collector",51],["Clerk of Courts & County Comptroller",52],["Property Appraiser",53],["Supervisor of Elections",54]] },
  { title: "Other Agencies and Court-Related Functions Budget", subtitle: "Budget and funding information for courts, health, statutory partners, and other independent entities.", items: [
    ["Independent Agencies Ledger",56,{overview:true}],
    ["Statutory & Other Agency Funding",57], ["Walton County Health Department",57], ["South Walton Fire & State Control",57], ["Medical Examiner",57], ["E911 Fund",57], ["Non-Profit Funding Program",57],
    ["State Attorney",58], ["Public Defender",58], ["Circuit Court",58], ["Court Technology & Innovations",58], ["County Court",58], ["Daughette MSBU Fund",58], ["Guardian Ad Litem",58]
  ] },
  { title: "Program and Service Budget", subtitle: "Board-administered purpose, full cost, funding, contributing services, service-level decisions, and measurable FY2027 targets; Constitutional Officers and independent agencies are excluded.", items: [
    ["Program and Service Budget Chapter",59,{overview:true}],
    ["Public Value",60],["Safety, Justice and Effective Government",61],["Visitors, Mobility and Infrastructure",62],["Environment, Growth and Community Development",63],["Quality of Life and Community Wellbeing",64]
  ] },
  { title: "Board Department Budgets", subtitle: "Function, goal, services, challenges, funding, contracts, staffing, and performance for each Board office and program.", items: [["Department Operating Ledger",66,{overview:true}]],
    groupsSplit: 7,
    groups: [
      ["Beach Operations",null,[["Beach Operations",97],["Beach Tram",98]]],
      ["Building Construction and Maintenance",67,[]],["Building Department",68,[]],["Code Compliance",69,[]],
      ["County Administration Offices",null,[["County Administration",70],["Extension Office",76],["Geographic Information Systems",77],["Housing & Urban Development",78],["Human Resources",79],["Libraries",80],["Probation",86],["Soil Conservation",90],["Veteran Services",92]]],
      ["Emergency Management",73,[]],["Engineering Department",74,[]],
      ["Environmental Services",null,[["Environmental Resources",75],["Mosquito Control",81],["Mossy Head Wastewater Treatment Facility",82],["Solid Waste",91]]],
      ["Office of Management and Budget",83,[]],["Office of the County Attorney",84,[]],
      ["Parks & Recreation",null,[["Eagle Springs Golf and Recreation Center",71],["Eagle Springs Grill",72],["Recreation",89]]],
      ["Planning",85,[]],["Public Works",87,[]],["Purchasing",88,[]],
      ["Tourism Administration",null,[["Tourism Administration",93],["Sales and Visitors Center",94],["Communications",95],["Marketing",96]]]
    ]
  },
  { title: "Workforce Budget", subtitle: "Personnel cost and capacity across Walton County government -- the number and mix of positions, and the cost of maintaining the existing workforce.", items: [["Workforce Budget",100],["Personnel Ledger",101]] },
  { title: "Capital Budget", subtitle: "The Capital Improvement Plan and fund-specific ledgers for equipment, infrastructure, tourism, public safety, recreation, and sidewalks.", items: [
    ["Capital Budget Chapter",102],["Capital Improvement Plan",103],["Transportation and Infrastructure Capital Ledger",106],["Tourist Development Fund Capital Ledger",108],["Sheriff Capital Project Ledger",109],["Recreation Plat Fee Fund Capital Ledger",110],["Sidewalk Fund Capital Ledger",111],["Machinery, Vehicles and Equipment Ledger",112]
  ] },
  { title: "Glossary, Statistical, and Supplemental Information", subtitle: "Statistical context, the county's largest taxpayers, and a glossary of budget terms, acronyms, and frequently asked questions.", items: [
    ["Glossary Chapter",115],["Glossary, Acronyms and Frequently Asked Questions",116],["Statistical and Supplemental Information",125],["Principal Property Taxpayers",126]
  ] }
];
sections.forEach((section, index) => { section.number = String(index + 1).padStart(2, "0"); });

// Chapters distributed across three printed pages instead of two, now
// that Introduction and Our County, Financial Overview, Budget Process,
// and Workforce Budget are each their own (shorter) chapter box.
const PAGE_GROUPS = [
  { footer: 5, titles: ["Introduction and Our County", "Financial Overview", "Budget Process"] },
  { footer: 6, titles: ["Constitutional Officer Budget", "Other Agencies and Court-Related Functions Budget", "Program and Service Budget"] },
  { footer: 7, titles: ["Board Department Budgets", "Workforce Budget", "Capital Budget", "Glossary, Statistical, and Supplemental Information"] }
];

const css = `@page{size:letter portrait;margin:0}*{box-sizing:border-box}html,body{margin:0}body{font-family:Arial,Helvetica,sans-serif;color:#173229}.page{position:relative;width:8.5in;height:11in;padding:.5in .62in .56in;page-break-after:always}.page:last-child{page-break-after:auto}header{display:flex;justify-content:space-between;padding-bottom:9px;border-bottom:1px solid #63736b;color:#53665d;font-size:8pt;font-weight:800;letter-spacing:.08em;text-transform:uppercase}header em{font-style:normal}.chapter{margin-top:.14in}.chapter:first-of-type{margin-top:.16in}.chapter-head{display:grid;grid-template-columns:.48in 1fr;align-items:center;min-height:.46in;padding:.05in .12in;background:#f6f4eb;border-left:4px solid #d1be78;border-radius:0 8px 8px 0}.chapter-number{color:#b89521;font:800 15pt/1 Georgia,serif}.chapter-title{color:#003f28;font:800 12.3pt/1.1 Georgia,serif;letter-spacing:-.01em}.chapter.draft .chapter-head{background:#fbf7e8;border:1px solid #d1be78;border-left:4px solid #d1be78}.subtitle{max-width:7in;margin:.04in .04in .07in;color:#52665c;font-size:7.2pt;line-height:1.25}.rows{column-count:2;column-gap:.36in}.row{display:flex;align-items:flex-end;gap:7px;min-height:19px;padding:3px 0;border-bottom:1px solid #e4ebe7;break-inside:avoid;font-size:7.3pt}.row span{font-weight:700}.row i{flex:1;margin-bottom:3px;border-bottom:1px dotted #a8b7af}.row b{min-width:.22in;color:#006231;font-size:7.4pt;text-align:right}.subhead{column-span:all;margin:5px 0 2px;padding-bottom:2px;border-bottom:1px solid #d1be78;color:#a88418;font-size:6.6pt;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.subhead:first-child{margin-top:0}.dept-groups{display:grid;grid-template-columns:1fr 1fr;gap:0 .34in;align-items:start}.dept-col .row{min-height:18px;padding:2.6px 0;font-size:7pt}.dept-group{break-inside:avoid;margin:0 0 4px}.dept-parent{display:flex;align-items:flex-end;gap:6px;min-height:17px;padding:2.2px 0;border-bottom:1px solid #426653;font-size:7pt}.dept-parent span{font-weight:900;color:#003f28}.dept-parent i,.dept-child i{flex:1;margin-bottom:3px;border-bottom:1px dotted #a8b7af}.dept-parent b,.dept-child b{min-width:.22in;color:#006231;font-size:6.9pt;text-align:right}.dept-parent em{display:inline-block;background:#f4ede0;color:#a88418;font-style:normal;font-size:5.4pt;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:2px 6px;border-radius:8px}.row.overview{border-bottom:2px solid #d1be78;margin-bottom:5px;padding-bottom:5px}.row.overview span{font-style:italic;font-weight:400;color:#52665c}.dept-child{display:flex;align-items:flex-end;gap:6px;min-height:15px;padding:1.8px 0 1.8px .16in;border-bottom:1px solid #eef1ee;font-size:6.4pt}.dept-child span{font-weight:400;color:#41564c}.dept-child span:before{content:'\\2013  ';color:#b89521}footer{position:absolute;left:.62in;right:.62in;bottom:.28in;display:flex;justify-content:space-between;border-top:1px solid #cbd8d1;padding-top:7px;color:#68786f;font-size:7.5pt;font-weight:800;letter-spacing:.08em;text-transform:uppercase}`;
const firstPageCss = `.toc-page-1 .chapter{margin-top:.25in}.toc-page-1 .chapter:first-of-type{margin-top:.24in}.toc-page-1 .chapter-head{min-height:.56in;padding:.08in .16in}.toc-page-1 .chapter-number{font-size:17pt}.toc-page-1 .chapter-title{font-size:14pt}.toc-page-1 .subtitle{margin:.07in .05in .11in;font-size:8.1pt;line-height:1.35}.toc-page-1 .row{min-height:24px;padding:4.5px 0;font-size:8.05pt}.toc-page-1 .row b{font-size:8.1pt}`;
function renderRows(s){
  if(!s.groups) return `<main class="rows">${s.items.map((item)=>Array.isArray(item)?`<div class="row${item[2]&&item[2].overview?' overview':''}"><span>${item[0]}</span><i></i><b>${item[1]}</b></div>`:`<div class="subhead">${item.header}</div>`).join('')}</main>`;
  const summaryHtml=s.items.map(([label,num,flag])=>`<div class="row${flag&&flag.overview?' overview':''}"><span>${label}</span><i></i><b>${num}</b></div>`).join('');
  const groupHtml=(list)=>list.map(([label,num,children])=>`<div class="dept-group"><div class="dept-parent"><span>${label}</span><i></i>${num?`<b>${num}</b>`:`<em>department rollup</em>`}</div>${children.map(([child,page])=>`<div class="dept-child"><span>${child}</span><i></i><b>${page}</b></div>`).join('')}</div>`).join('');
  // Explicit left/right split (rather than CSS column-count auto-balancing)
  // so the summary item and the first group line up on the same row
  // instead of the right column starting lower than the left.
  const splitAt=s.groupsSplit ?? Math.ceil(s.groups.length/2);
  const left=s.groups.slice(0,splitAt);
  const right=s.groups.slice(splitAt);
  return `<main class="dept-groups"><div class="dept-col">${summaryHtml}${groupHtml(left)}</div><div class="dept-col">${groupHtml(right)}</div></main>`;
}
const byTitle = Object.fromEntries(sections.map(s => [s.title, s]));
const renderChapter = (s) => `<div class="chapter${s.title.startsWith("Draft") ? " draft" : ""}"><div class="chapter-head"><span class="chapter-number">${s.number}</span><span class="chapter-title">${s.title}</span></div><p class="subtitle">${s.subtitle}</p>${renderRows(s)}</div>`;
const pages = PAGE_GROUPS.map((g,index) => `<section class="page toc-page-${index+1}"><header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>${g.titles.map(t => renderChapter(byTitle[t])).join('')}<footer><span>FY 2027 Final Budget</span><b>${g.footer}</b></footer></section>`).join('');
const browser = await chromium.launch({headless:true});
const page = await browser.newPage();
await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Table of Contents</title><style>${css}${firstPageCss}</style></head><body>${pages}</body></html>`,{waitUntil:'networkidle'});
await page.pdf({path:outPath,format:'Letter',printBackground:true,preferCSSPageSize:true,tagged:true,outline:true});
await browser.close();
console.log(`Wrote ${outPath}`);
