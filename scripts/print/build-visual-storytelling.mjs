import { capturePublicationHtml, assertPublicationFits } from "./publication-print.mjs";
import { chromium } from "playwright";
import path from "node:path";
import { readFileSync } from "node:fs";
import { individualFunds, generalFund, values, currency, millions } from "./fund-schedule-data.mjs";

const outPath = process.argv[2] || "/private/tmp/budget-book-visual-storytelling.pdf";
const countyMapPath = path.resolve("assets/images/page-images/overview-county-districts.jpg");
const countyMap = `data:image/jpeg;base64,${readFileSync(countyMapPath).toString("base64")}`;

const css = `
@page{size:letter portrait;margin:0}*{box-sizing:border-box}html,body{margin:0}body{font-family:Arial,Helvetica,sans-serif;color:#173229}.page{position:relative;width:8.5in;height:11in;padding:.56in .62in .52in;page-break-after:always;overflow:hidden}.page:last-child{page-break-after:auto}header{display:flex;justify-content:space-between;padding-bottom:9px;border-bottom:1px solid #63736b;color:#53665d;font-size:8pt;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.kicker{display:block;margin-top:.22in;color:#b89521;font-size:8pt;font-weight:900;letter-spacing:.14em;text-transform:uppercase}h1{margin:7px 0 .07in;color:#003f28;font:800 23pt/1.05 Georgia,serif;letter-spacing:-.02em}h2{margin:.16in 0 .07in;color:#003f28;font:800 11.5pt/1.2 Georgia,serif;border-bottom:2px solid #d1be78;padding-bottom:.05in}p{margin:0;color:#33453c;font-size:8.25pt;line-height:1.4}.intro{font-size:8.8pt;margin-bottom:.14in}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.1in;margin:.1in 0 .16in}.stat{padding:.11in .08in;border-radius:10px;background:#003f28;text-align:center}.stat b{display:block;color:#fff;font:800 13pt/1.05 Georgia,serif}.stat span{display:block;margin-top:.04in;color:#e7c95f;font-size:5.8pt;font-weight:800;line-height:1.22;text-transform:uppercase}.card{padding:.12in .14in;border:1px solid #dfe8e2;border-radius:10px;background:#fbfcfa}.card strong{display:block;margin-bottom:.035in;color:#003f28;font:800 8.2pt Georgia,serif}.card p{font-size:7.3pt;line-height:1.34}.gold{background:#faf7ec;border-color:#d1be78}.green{background:#edf5f0;border-color:#a9c8b7}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:.13in}.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:.12in}.flow{display:grid;grid-template-columns:1fr .32in 1fr .32in 1fr;align-items:stretch;gap:.05in;margin:.08in 0}.flow-col{display:flex;flex-direction:column;gap:.08in}.arrow{display:flex;align-items:center;justify-content:center;color:#b89521;font-size:24pt;font-weight:900}.pill{display:flex;justify-content:space-between;align-items:center;gap:.08in;min-height:.52in;padding:.12in .14in;border:1px solid #dfe8e2;border-radius:10px;background:#fbfcfa;font-size:7.3pt}.pill span{color:#003f28;font:800 8.2pt Georgia,serif}.pill b{color:#003f28;white-space:nowrap}.band{margin:.12in 0;padding:.12in .15in;border-radius:10px;background:#003f28;color:#fff}.band strong{font:800 10pt Georgia,serif}.band p{color:#e7efe9;font-size:7.3pt}.step-row{display:grid;grid-template-columns:repeat(5,1fr);gap:.08in;margin:.1in 0}.step{position:relative;padding:.12in .1in;border-top:4px solid #0b7741;border-radius:8px;background:#f4f8f5}.step b{display:block;color:#b89521;font-size:7pt;text-transform:uppercase}.step strong{display:block;margin:.025in 0;color:#003f28;font:800 8pt Georgia,serif}.step p{font-size:6.7pt}.gauge{position:relative;height:.48in;margin:.15in .1in .28in;background:linear-gradient(90deg,#edf2ee 0 30%,#cfe2d6 30% 56.5%,#f1df9e 56.5% 100%);border-radius:12px}.gauge .tick{position:absolute;top:-.08in;height:.64in;border-left:2px solid #003f28}.gauge .tick b{position:absolute;top:.62in;transform:translateX(-50%);white-space:nowrap;color:#003f28;font-size:7pt}.gauge .marker{position:absolute;top:-.13in;width:.16in;height:.16in;transform:translateX(-50%) rotate(45deg);background:#a24b1e;border:2px solid white;box-shadow:0 0 0 1px #a24b1e}.gauge .marker span{position:absolute;left:.14in;top:-.03in;transform:rotate(-45deg);white-space:nowrap;color:#a24b1e;font-weight:800;font-size:7pt}.compare{display:grid;grid-template-columns:repeat(3,1fr);gap:.12in}.compare .card{text-align:center}.compare .big{display:block;color:#003f28;font:800 18pt Georgia,serif}.compare .label{display:block;margin:.04in 0;color:#a88418;font-size:6.3pt;font-weight:900;text-transform:uppercase}.waterfall{display:grid;grid-template-columns:repeat(4,1fr);align-items:end;gap:.14in;height:1.42in;margin:.1in .2in .2in;border-bottom:1.5px solid #003f28}.wf{display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%}.wf b{font-size:7pt;color:#003f28}.wf span{width:72%;margin:.04in 0 0;border-radius:4px 4px 0 0;background:#0b7741}.wf.neg span{background:#a24b1e}.wf small{margin-top:.04in;color:#63736b;font-size:6.3pt;text-align:center}.map-layout{display:grid;grid-template-columns:2.4in 1fr;gap:.24in;align-items:start}.map{position:relative;height:5.7in;border:1px solid #dfe8e2;border-radius:14px;background:#f7faf8;overflow:hidden}.map img{width:100%;height:100%;object-fit:contain;filter:saturate(.65) contrast(.95)}.pin{position:absolute;width:.32in;height:.32in;border-radius:50%;background:#003f28;color:#fff;display:flex;align-items:center;justify-content:center;border:2px solid #e7c95f;font-size:7pt;font-weight:900;box-shadow:0 2px 5px #0004}.legend{display:flex;flex-direction:column;gap:.09in}.project{padding:.09in .11in;border-left:4px solid #0b7741;background:#f4f8f5;border-radius:0 8px 8px 0}.project b{display:block;color:#003f28;font-size:7.4pt}.project span{display:block;color:#63736b;font-size:6.5pt;line-height:1.3}.stack{display:flex;height:.38in;border-radius:9px;overflow:hidden;margin:.1in 0}.stack span{display:flex;align-items:center;justify-content:center;color:white;font-size:6pt;font-weight:800}.source-row{display:grid;grid-template-columns:1.8in 1fr .8in;gap:.1in;align-items:center;padding:.065in 0;border-bottom:1px solid #e5ece7;font-size:7pt}.source-row .bar{height:.14in;background:#0b7741;border-radius:7px}.source-row b{text-align:right;color:#003f28}.phase{display:grid;grid-template-columns:repeat(4,1fr);gap:.1in}.phase .card{text-align:center}.phase b{display:block;color:#003f28;font:800 14pt Georgia,serif}.phase span{font-size:6.3pt;color:#63736b;font-weight:800;text-transform:uppercase}.note{margin-top:.1in;padding:.09in .12in;border-left:4px solid #d1be78;background:#faf7ec;font-size:6.8pt;line-height:1.35}footer{position:absolute;left:.62in;right:.62in;bottom:.29in;display:flex;justify-content:space-between;border-top:1px solid #cbd8d1;padding-top:7px;color:#68786f;font-size:7.5pt;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
`;
const budgetWorksCss = `.budget-works .stats{margin:.2in 0 .3in}.budget-works .stat{padding:.17in .12in}.budget-works .stat b{font-size:18pt}.budget-works .stat span{font-size:8pt;line-height:1.35}.budget-works h2{font-size:14pt;margin:.25in 0 .15in}.budget-works .flow{margin:.15in 0 .3in}.budget-works .flow-col{gap:.16in}.budget-works .pill{min-height:.75in;font-size:9pt}.budget-works .pill span,.budget-works .card strong{font-size:10pt}.budget-works .card{padding:.18in .14in}.budget-works .card p{font-size:9pt;line-height:1.45}.budget-works .band{padding:.2in}.budget-works .band strong{font-size:12pt}.budget-works .band p{font-size:9pt;line-height:1.45;margin-top:.08in}`;
const header = (k,t,d='') => `<header><span>Walton County, Florida</span><span>Fiscal Year 2027</span></header><small class="kicker">${k}</small><h1>${t}</h1>${d?`<p class="intro">${d}</p>`:''}`;
const footer = (number = "") => `<footer><span>FY 2027 Final Budget</span><b>${number}</b></footer>`;

const pages = [];
pages.push(`<section class="page budget-works">${header('Financial Overview','How the Budget Works','The budget moves through connected stages. Revenue is recorded by source, placed in legally separate funds, and authorized for services, capital, transfers, and reserves.')}
<div class="stats" style="grid-template-columns:repeat(3,1fr)"><div class="stat"><b>$324.0M</b><span>Current-year revenue and other sources</span></div><div class="stat"><b>$345.2M</b><span>Net expenditure budget</span></div><div class="stat"><b>$143.7M</b><span>Internal transfers, eliminated from net total</span></div></div>
<h2>From resources to public services</h2><div class="flow"><div class="flow-col"><div class="pill"><span>Property taxes</span><b>$153.0M</b></div><div class="pill"><span>Tourist taxes</span><b>$59.0M</b></div><div class="pill"><span>Sales taxes</span><b>$56.8M</b></div><div class="pill"><span>Other revenue</span><b>$55.1M</b></div></div><div class="arrow">›</div><div class="flow-col"><div class="card green"><strong>General Fund</strong><p>Countywide operations, constitutional support, transfers, and shared services.</p></div><div class="card"><strong>Restricted funds</strong><p>Tourism, transportation, solid waste, mosquito control, E911, housing, and other legally limited purposes.</p></div><div class="card"><strong>Capital funds</strong><p>Resources reserved for facilities, roads, safety, recreation, and other long-lived assets.</p></div></div><div class="arrow">›</div><div class="flow-col"><div class="card"><strong>Operating services</strong><p>Public safety, transportation, environmental, human, recreation, court, and government services.</p></div><div class="card"><strong>Capital investment</strong><p>$43.8M funded FY 2027 program, plus separately disclosed projects.</p></div><div class="card gold"><strong>Ending balance</strong><p>Resources not spent in the year remain within their respective funds and restrictions.</p></div></div></div>
<div class="band"><strong>Why gross fund budgets exceed the $345.2M net budget</strong><p>Transfers are recorded once as a use in the sending fund and again as a source in the receiving fund. Gross fund schedules therefore total $488.9M. Eliminating $143.7M of internal transfers produces the $345.2M net expenditure budget.</p></div>
${footer(20)}</section>`);

// Financial Overview Roadmap: the first page of the Financial Overview
// (ahead of Budget in Brief), listing the section's schedules in reading
// order with their page numbers.
const ROADMAP = [
  ["Start with the big picture", [
    ["Budget in Brief", 19, "Where each dollar comes from and where it goes"],
    ["How the Budget Works", 20, "How revenue moves through funds to services, and why gross fund totals exceed the net budget"]]],
  ["See the whole budget", [
    ["Consolidated Budget Ledger", 21, "Every fund's sources and uses side by side"],
    ["Budget Change Summary", 23, "What changed from FY 2026 and why"]]],
  ["Follow the money in", [
    ["Revenue Portfolio", 25, "The mix of revenue sources and how dependable each is"],
    ["Revenue Strategy", 26, "How FY 2027 resources were estimated"],
    ["Revenue Ledger", 27, "Every revenue line by fund"],
    ["Property Tax Allocation Ledger", 31, "How each property tax dollar is divided"],
    ["Florida Amendment 3 Risk", 33, "Exposure to a possible property tax change"]]],
  ["Follow the money out", [
    ["Expenditure Ledger", 34, "Spending by fund, function, and department"],
    ["Fund Financial Ledger", 37, "Each fund's opening balance, sources, uses, and ending balance"],
    ["Interfund Transfer Ledger", 39, "Which funds pay which, so nothing is counted twice"]]],
  ["Look ahead", [
    ["Debt Ledger", 40, "Outstanding debt and this year's payments"],
    ["Reserve Position", 41, "Six-month reserve targets for the General Fund and tourism"],
    ["Long-Term Outlook", 42, "The multi-year forecast and recurring-cost pressure"]]]
];
pages.push(`<section class="page roadmap-page">${header('Financial Overview','Financial Overview Roadmap','This section moves from the big picture to the detail. Start with the one-page summary, then follow the schedules in order. Each one answers a different question, so read them together rather than treating any single total as the whole budget.')}
<div class="step-row">${ROADMAP.map(([stage, items], i) => `<div class="step"><b>${i === 0 ? 'Start' : i === ROADMAP.length - 1 ? 'Finish' : 'Then'} &middot; p. ${items[0][1]}${items.length > 1 ? '&ndash;' + items[items.length - 1][1] : ''}</b><strong>${stage}</strong><p>${items.map(item => item[0]).join(', ')}</p></div>`).join('')}</div>
<h2>What each schedule answers</h2>
<div class="roadmap">${ROADMAP.map(([stage, items]) => `<div class="roadmap-group"><span class="roadmap-stage">${stage}</span>${items.map(([title, page, question]) => `<div class="roadmap-row"><strong>${title}</strong><span>${question}</span><b>${page}</b></div>`).join('')}</div>`).join('')}</div>
<h2>What can and cannot be combined</h2><div class="grid2"><div class="card green"><strong>Can be compared</strong><p>Current-year revenue plus fund balance brought forward can be compared with the net expenditure budget. Department and program totals can be traced to their supporting fund schedules.</p></div><div class="card gold"><strong>Should not be added together</strong><p>Gross fund budgets should not be added to the net budget. Restricted tourism, transportation, solid-waste, grant, or assessment balances cannot be treated as generally available cash.</p></div></div>
<style>.roadmap-page .roadmap{display:grid;gap:.07in;margin:.06in 0 .1in}.roadmap-page .roadmap-group{padding:.06in .12in;border:1px solid #e4ebe7;border-left:4px solid #d1be78;border-radius:0 8px 8px 0;background:#fbfcfa}.roadmap-page .roadmap-group:nth-child(even){border-left-color:#0b7741}.roadmap-page .roadmap-stage{display:block;margin:.02in 0 .03in;color:#a88418;font-size:6.6pt;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.roadmap-page .roadmap-row{display:grid;grid-template-columns:2.15in 1fr .4in;gap:.12in;align-items:baseline;padding:.035in 0;border-top:1px solid #eef1ee;font-size:8pt}.roadmap-page .roadmap-row strong{color:#003f28}.roadmap-page .roadmap-row span{color:#33453c}.roadmap-page .roadmap-row b{color:#003f28;text-align:right}</style>
${footer(18)}</section>`);

// Reserve Position: six-month reserve targets for the General Fund and the
// Tourist Development Fund, built from FY 2027 personnel and operating
// budgets (transfers, capital, grants and aid, and contingency excluded).
// The General Fund target also holds the FY 2028 debt payment (Debt Ledger)
// and $10 million for storm-debris cleanup ahead of FEMA reimbursement,
// and an estimated
// named-storm deductible of 5% of each insured building's value, per
// building and per occurrence (Risk Management; FMIT asset survey, current
// building limits, or survey value for newly scheduled assets), and the
// 25% of the survey reconstruction cost of uninsured assets (the share left
// after FEMA Public Assistance's 75%) in the General Fund; the tourism
// target holds the full replacement cost. Beach access sites, Beach
// Operations, the Tourist Development Building, and the Grayton Beach parking
// facility are assigned to the Tourist Development Fund. Sites paid for by
// other funds are left out: Public Works and district road departments,
// the Mossy Head wastewater plant (Transportation), the landfill and transfer
// station (Solid Waste), the Building Department (Building Fund), Mosquito
// Control, and the auto shop at 116 Montgomery Circle.
// The tourism target adds $80M for beach renourishment, the strategic plan's
// $5M destination development and $15M mobility/congestion reserves, and
// $10M for hurricane recovery and cleanup. The tourism target follows the Walton County Tourism
// 2026-2030 strategic plan's recommendation of an operating reserve of about
// half a year of operating costs.
const RESERVE = {
  general: {
    personnel: 48433574, operating: 23728411, debt2028: 2507824, debris: 10000000, deductible: 6243920, uninsured: 17008730,
    ending: values(generalFund, "Estimated Ending Fund Balance")[7],
    ending2028: values(generalFund, "Estimated Ending Fund Balance")[8]
  },
  tourism: {
    personnel: 11224417, operating: 34532033, beach: 80000000, destination: 5000000, mobility: 15000000, recovery: 10000000, deductible: 417475, uninsured: 4418480,
    // FY 2027 tourism capital ($13.2M) is already appropriated, so this
    // ending balance is net of it. FY 2026 projects still open ($27,774,099)
    // are subtracted below.
    ending: values(individualFunds.find(f => f.name === "Tourist Development Fund"), "Estimated Ending Fund Balance")[7],
    fy2026Projects: 27774099
  }
};
const half = n => Math.round(n / 2);
const gfRows = [
  ["Personnel services", `Six months of ${currency(RESERVE.general.personnel)} personnel services`, half(RESERVE.general.personnel)],
  ["Operating expenses", `Six months of ${currency(RESERVE.general.operating)} operating expenses`, half(RESERVE.general.operating)],
  ["Debt service", "FY 2028 scheduled payment", RESERVE.general.debt2028],
  { group: "Hurricane recovery and cleanup", basis: "Costs after a named storm", children: [
    ["Debris removal", "Countywide debris removal after a named storm", RESERVE.general.debris],
    ["Insurance deductibles", "5% named-storm deductible on $124.9M of insured buildings", RESERVE.general.deductible],
    ["Uninsured assets", `25% of ${millions(RESERVE.general.uninsured)} uninsured sheds, fences, lighting, and park structures`, Math.round(RESERVE.general.uninsured * 0.25)]
  ] }
];
const tdRows = [
  ["Personnel services", `Six months of ${currency(RESERVE.tourism.personnel)} personnel services`, half(RESERVE.tourism.personnel)],
  ["Operating expenses", `Six months of ${currency(RESERVE.tourism.operating)} operating expenses`, half(RESERVE.tourism.operating)],
  ["Beach renourishment", "Future beach renourishment projects", RESERVE.tourism.beach],
  ["Destination development", "Tourism 2026&ndash;2030 strategic plan", RESERVE.tourism.destination],
  ["Mobility and congestion", "Tourism 2026&ndash;2030 strategic plan", RESERVE.tourism.mobility],
  { group: "Hurricane recovery and cleanup", basis: "Costs after a named storm", children: [
    ["Beach and facility cleanup", "Beach and tourism facility recovery after a named storm", RESERVE.tourism.recovery],
    ["Insurance deductibles", "5% named-storm deductible on $8.3M of insured beach facilities", RESERVE.tourism.deductible],
    ["Uninsured assets", "Full replacement cost of uninsured dune crossovers and beach facilities", RESERVE.tourism.uninsured]
  ] }
];
// A row is [label, basis, amount] or a { group, basis, children } block whose
// amount is the sum of its indented child rows.
const rowAmount = r => r.children ? r.children.reduce((sum, c) => sum + c[2], 0) : r[2];
const gfTarget = gfRows.reduce((sum, r) => sum + rowAmount(r), 0);
const tdTarget = tdRows.reduce((sum, r) => sum + rowAmount(r), 0);
const reserveRow = ([label, basis, amount], cls = '') => `<div class="rp-row${cls}"><strong>${label}</strong><span>${basis}</span><b>${currency(amount)}</b></div>`;
const reserveTable = (rows, total) => `<div class="rp-table">${rows.map(r => r.children
  ? reserveRow([r.group, r.basis, rowAmount(r)], ' rp-group') + r.children.map(c => reserveRow(c, ' rp-sub')).join('')
  : reserveRow(r)).join('')}<div class="rp-row rp-total"><strong>Reserve target</strong><span></span><b>${currency(total)}</b></div></div>`;
const reserveStats = (target, ending, endingLabel) => `<div class="stats" style="grid-template-columns:repeat(2,1fr)"><div class="stat"><b>${millions(target)}</b><span>Reserve target</span></div><div class="stat"><b>${millions(ending)}</b><span>${endingLabel}</span></div></div>`;
pages.push(`<section class="page reserve-page">${header('Financial Overview','Reserve Position','Reserves keep services running through a revenue shortfall or a disaster. Each target below holds six months of personnel and operating costs. The General Fund target also holds next year&rsquo;s debt payment and storm-recovery costs.')}
<h2>General Fund</h2>
${reserveStats(gfTarget, RESERVE.general.ending, 'Estimated FY 2027 ending balance')}
${reserveTable(gfRows, gfTarget)}
<div class="card"><strong>Hurricane recovery and cleanup</strong><p>The County pays debris haulers up front, and FEMA reimbursement often arrives a year or more later. FEMA also covers 75% of eligible repairs to uninsured County facilities, so the reserve holds the other 25%. Insured buildings carry a 5% named-storm deductible per building, which the County pays in full.</p></div>
<h2>Tourist Development Fund</h2>
${reserveStats(tdTarget, RESERVE.tourism.ending - RESERVE.tourism.fy2026Projects, 'FY 2027 ending balance after capital')}
${reserveTable(tdRows, tdTarget)}
<div class="grid2"><div class="card"><strong>Basis for the target</strong><p>The Walton County Tourism 2026&ndash;2030 strategic plan, reviewed at a joint Board of County Commissioners and Tourist Development Council workshop, recommended an operating reserve of about half a year of operating costs, a $5.0M destination development balance, and a $15.0M mobility and congestion reserve.</p></div><div class="card"><strong>Use of the balance</strong><p>Tourist development tax is restricted by Section 125.0104, Florida Statutes, to tourism promotion, beach and visitor facilities, and related uses. The balance above the target is held for those purposes and cannot support General Fund services.</p></div></div>
<style>.reserve-page h2{margin-top:.12in}.reserve-page .stats{margin:.06in 0 .06in}.reserve-page .rp-table{border-top:1px solid #003f28;margin-bottom:.08in}.reserve-page .rp-row{display:grid;grid-template-columns:2.1in 1fr 1.1in;gap:.12in;align-items:baseline;padding:.04in 0;border-bottom:1px solid #eef1ee;font-size:8pt}.reserve-page .rp-row strong{color:#003f28}.reserve-page .rp-row span{color:#53665d}.reserve-page .rp-row b{text-align:right;color:#173229;font-variant-numeric:tabular-nums}.reserve-page .rp-group strong,.reserve-page .rp-group b{color:#003f28;font-weight:800}.reserve-page .rp-sub{padding:.03in 0}.reserve-page .rp-sub strong{padding-left:.16in;font-weight:600;color:#3b5249}.reserve-page .rp-sub span,.reserve-page .rp-sub b{font-size:7.6pt}.reserve-page .rp-sub b{font-weight:600;color:#53665d}.reserve-page .rp-total{border-top:1.5px solid #003f28;border-bottom:1.5px solid #003f28}.reserve-page .rp-total b{color:#003f28;font-weight:800}.reserve-page .grid2{gap:.1in}.reserve-page .card strong{display:block;margin-bottom:.03in;color:#003f28;font-size:8pt}.reserve-page .card p{font-size:7.2pt}.reserve-page .rp-line{margin:.06in 0 0;font-size:7.6pt}</style>
${footer(41)}</section>`);

pages.push(`<section class="page map-page">${header('Capital Budget','Where FY 2027 Capital Investment Serves','The funded program combines place-specific projects with countywide asset preservation. Markers identify broad service areas, not surveyed project coordinates.')}
<div class="stats"><div class="stat"><b>$43.8M</b><span>Funded FY 2027 program</span></div><div class="stat"><b>30</b><span>Funded projects</span></div><div class="stat"><b>$15.3M</b><span>Grant-funded projects shown separately</span></div><div class="stat"><b>$10.25M</b><span>Prior-funded tourism work</span></div></div>
<div class="map-layout"><div class="map"><img src="${countyMap}" alt="Map of Walton County commission districts"><span class="pin" style="left:62%;top:25%">1</span><span class="pin" style="left:55%;top:48%">2</span><span class="pin" style="left:68%;top:61%">3</span><span class="pin" style="left:30%;top:70%">4</span><span class="pin" style="left:62%;top:74%">5</span></div><div class="legend"><div class="project"><b>1 · North and countywide public safety</b><span>Pleasant Ridge and Mossy Head fire-station investments; countywide radio coverage.</span></div><div class="project"><b>2 · Freeport and central growth area</b><span>Freeport 3280/Bear Creek Fire Station and supporting transportation capacity.</span></div><div class="project"><b>3 · US 331 and bay connections</b><span>Hewett Bayou Connector, bridge and roadway work, and countywide network improvements.</span></div><div class="project"><b>4 · West and central coastal area</b><span>Holiday Shores drainage and pedestrian phases, CR 30A path work, and access improvements.</span></div><div class="project"><b>5 · South and east coastal area</b><span>Beach renourishment, 30A Gateway, South Orange pedestrian work, and visitor infrastructure.</span></div><div class="project" style="border-color:#b89521"><b>Countywide asset program</b><span>Road resurfacing, facilities, recreational infrastructure, equipment, and Board-directed capital serve multiple districts.</span></div></div></div>
<div class="note">See individual project pages for locations, funding, schedules, and operating costs. Locations for projects awaiting Board selection will be identified after selection.</div>${footer(110)}</section>`);

pages.push(`<section class="page" style="page-break-before:always;padding-top:.82in">${header('Capital Budget','Capital Funding and Delivery Dashboard','This dashboard distinguishes the funded FY 2027 program from grant-dependent, separately funded, and prior-funded work.')}
<div class="stats"><div class="stat"><b>$43.796M</b><span>Funded FY 2027 capital program</span></div><div class="stat"><b>$71.345M</b><span>Broader identified project inventory</span></div><div class="stat"><b>$7.120M</b><span>Machinery, vehicles, and equipment</span></div><div class="stat"><b>$2.582M</b><span>Debt service shown outside CIP total</span></div></div>
<h2>Funded FY 2027 capital by fund</h2><div class="stack"><span style="width:57.2%;background:#003f28">Capital Projects 57.2%</span><span style="width:25.9%;background:#0b7741">Tourism 25.9%</span><span style="width:10.3%;background:#4e8f69">Transportation 10.3%</span><span style="width:6.7%;background:#b5a052">Other 6.7%</span></div>
${[['Capital Projects Fund',25.035734,57.2],['Tourist Development Fund',11.35,25.9],['Transportation Fund',4.5,10.3],['General Fund',2.01,4.6],['Recreation Plat Fee and Sidewalk Funds',.9,2.1]].map(([n,v,w])=>`<div class="source-row"><span>${n}</span><span class="bar" style="width:${w}%"></span><b>$${v.toFixed(v<1?3:2)}M</b></div>`).join('')}
<h2>Largest funded commitments</h2><div class="grid2"><div class="card"><strong>Beach renourishment · $10.75M</strong><p>Ongoing shoreline protection and tourism-asset preservation.</p></div><div class="card"><strong>Hewett Bayou Connector · $4.6M</strong><p>Roadway connection and transportation capacity.</p></div><div class="card"><strong>Holiday Shores phases · $7.0M</strong><p>Drainage, pedestrian access, and transportation improvements.</p></div><div class="card"><strong>Two funded fire stations · $7.0M</strong><p>Freeport/Bear Creek and Pleasant Ridge emergency-response coverage.</p></div></div>
<h2>Delivery and accountability</h2><div class="phase"><div class="card"><b>Funded</b><span>Included in $43.8M</span><p>Appropriated FY 2027 projects.</p></div><div class="card"><b>$15.3M</b><span>Grant dependent</span><p>Disclosed separately until funding requirements are met.</p></div><div class="card"><b>$2.0M</b><span>Sheriff fund</span><p>Separate Sheriff/Fine and Forfeiture project.</p></div><div class="card"><b>$10.25M</b><span>Prior funded</span><p>Active tourism work funded before FY 2027.</p></div></div>
<div class="note"><b>Operating-cost check.</b> Each detailed ledger identifies whether operating effects are absorbed, immaterial, ongoing, or still pending. A future phase or pending cost is not assumed funded merely because it appears in the project inventory.</div>${footer()}</section>`);

const browser = await chromium.launch({headless:true});
const page = await browser.newPage();
await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Visual Storytelling Pages</title><style>${css}${budgetWorksCss}</style></head><body>${pages.join('')}</body></html>`,{waitUntil:'networkidle'});
await capturePublicationHtml(page, outPath);
await page.pdf({path:outPath,format:'Letter',printBackground:true,preferCSSPageSize:true,tagged:true,outline:true,margin:{top:'0',right:'0',bottom:'0',left:'0'}});
await browser.close();
console.log(`Wrote ${outPath} (${pages.length} pages)`);
