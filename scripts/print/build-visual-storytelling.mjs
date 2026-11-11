import { capturePublicationHtml, assertPublicationFits } from "./publication-print.mjs";
import { chromium } from "playwright";
import path from "node:path";
import { readFileSync } from "node:fs";
import { individualFunds, generalFund, values, currency, millions } from "./fund-schedule-data.mjs";
import { css, header, footer } from "./story-style.mjs";
import { GUIDES, guidePageHtml } from "./readers-guide.mjs";

const outPath = process.argv[2] || "/private/tmp/budget-book-visual-storytelling.pdf";
const countyMapPath = path.resolve("assets/images/page-images/overview-county-districts.jpg");
const countyMap = `data:image/jpeg;base64,${readFileSync(countyMapPath).toString("base64")}`;


const budgetWorksCss = `.budget-works .stats{margin:.2in 0 .3in}.budget-works .stat{padding:.17in .12in}.budget-works .stat b{font-size:18pt}.budget-works .stat span{font-size:8pt;line-height:1.35}.budget-works h2{font-size:14pt;margin:.25in 0 .15in}.budget-works .flow{margin:.15in 0 .3in}.budget-works .flow-col{gap:.16in}.budget-works .pill{min-height:.75in;font-size:9pt}.budget-works .pill span,.budget-works .card strong{font-size:10pt}.budget-works .card{padding:.18in .14in}.budget-works .card p{font-size:9pt;line-height:1.45}.budget-works .band{padding:.2in}.budget-works .band strong{font-size:12pt}.budget-works .band p{font-size:9pt;line-height:1.45;margin-top:.08in}`;

const pages = [];
pages.push(`<section class="page budget-works">${header('Financial Overview','How the Budget Works','The budget moves through connected stages. Revenue is recorded by source, placed in legally separate funds, and authorized for services, capital, transfers, and reserves.')}
<div class="stats" style="grid-template-columns:repeat(3,1fr)"><div class="stat"><b>$324.0M</b><span>Current-year revenue and other sources</span></div><div class="stat"><b>$345.2M</b><span>Net expenditure budget</span></div><div class="stat"><b>$143.7M</b><span>Internal transfers, eliminated from net total</span></div></div>
<h2>From resources to public services</h2><div class="flow"><div class="flow-col"><div class="pill"><span>Property taxes</span><b>$153.0M</b></div><div class="pill"><span>Tourist taxes</span><b>$59.0M</b></div><div class="pill"><span>Sales taxes</span><b>$56.8M</b></div><div class="pill"><span>Other revenue</span><b>$55.1M</b></div></div><div class="arrow">›</div><div class="flow-col"><div class="card green"><strong>General Fund</strong><p>Countywide operations, constitutional support, transfers, and shared services.</p></div><div class="card"><strong>Restricted funds</strong><p>Tourism, transportation, solid waste, mosquito control, E911, housing, and other legally limited purposes.</p></div><div class="card"><strong>Capital funds</strong><p>Resources reserved for facilities, roads, safety, recreation, and other long-lived assets.</p></div></div><div class="arrow">›</div><div class="flow-col"><div class="card"><strong>Operating services</strong><p>Public safety, transportation, environmental, human, recreation, court, and government services.</p></div><div class="card"><strong>Capital investment</strong><p>$43.8M funded FY 2027 program, plus separately disclosed projects.</p></div><div class="card gold"><strong>Ending balance</strong><p>Resources not spent in the year remain within their respective funds and restrictions.</p></div></div></div>
<div class="band"><strong>Why gross fund budgets exceed the $345.2M net budget</strong><p>Transfers are recorded once as a use in the sending fund and again as a source in the receiving fund. Gross fund schedules therefore total $488.9M. Eliminating $143.7M of internal transfers produces the $345.2M net expenditure budget.</p></div>
${footer(20)}</section>`);

// The Financial Overview's Reader's Guide (readers-guide.mjs), the first
// page of the section ahead of Budget in Brief.
pages.push(guidePageHtml(GUIDES.find((g) => g.key === "financial"), header, footer));

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
// The General Fund's six months covers only the Board of County
// Commissioners' own departments and the Commission office (account
// 00101000). Constitutional officers, courts, and outside agencies that are
// also budgeted in the General Fund are left out; they hold their own
// reserves or are funded by others.
const GF_BOARD_OFFICES = new Set(["Board of County Commissioners", "Building Construction and Maintenance", "Planning", "Planning Short-Term Rental", "Code Compliance", "Code Compliance Beach", "County Administration", "Libraries", "Office of the County Attorney", "Eagle Springs Golf and Recreation Center", "Eagle Springs Grill", "Recreation", "Human Resources", "Office of Management and Budget", "Procurement", "Emergency Management", "Geographic Info Systems", "Environmental Services", "Extension Office", "Probation Services", "Veteran Services", "Soil Conservation", "Engineering Services"]);
const budgetRows = JSON.parse(readFileSync(path.resolve("assets/static-data/budget.json"), "utf8")).data.expenditures;
const gfBoardTotal = type => budgetRows
  .filter(r => String(r.Dept_Code || "").startsWith("001") && GF_BOARD_OFFICES.has(r.Dept_Name) && r.Object_Type === type)
  .reduce((sum, r) => sum + (Number(r.FY2027_Proposed) || 0), 0);
const RESERVE = {
  general: {
    personnel: gfBoardTotal("Personnel Services"), operating: gfBoardTotal("Operating Expenditures"), debt2028: 2507824, debris: 15000000, deductible: 6243920, uninsured: 17008730,
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
  ["Personnel services", `Six months of ${currency(RESERVE.general.personnel)} Board personnel services`, half(RESERVE.general.personnel)],
  ["Operating expenses", `Six months of ${currency(RESERVE.general.operating)} Board operating expenses`, half(RESERVE.general.operating)],
  ["Debt service", "FY 2028 scheduled payment", RESERVE.general.debt2028],
  { group: "Hurricane recovery and cleanup", basis: "Costs after a named storm", children: [
    ["Debris removal", "Countywide debris removal after a named storm", RESERVE.general.debris, true],
    ["Insurance deductibles", "5% named-storm deductible on $124.9M of insured buildings", RESERVE.general.deductible, true],
    ["Uninsured assets", `25% of ${millions(RESERVE.general.uninsured)} uninsured sheds, fences, lighting, and park structures`, Math.round(RESERVE.general.uninsured * 0.25)]
  ] }
];
const tdRows = [
  ["Personnel services", `Six months of ${currency(RESERVE.tourism.personnel)} personnel services`, half(RESERVE.tourism.personnel)],
  ["Operating expenses", `Six months of ${currency(RESERVE.tourism.operating)} operating expenses`, half(RESERVE.tourism.operating)],
  ["Beach renourishment", "Future beach renourishment projects", RESERVE.tourism.beach],
  ["Destination development", "New attractions, cultural venues, and outdoor recreation", RESERVE.tourism.destination],
  ["Mobility and congestion", "Visitor parking, shuttle and tram service, and transit", RESERVE.tourism.mobility],
  { group: "Hurricane recovery and cleanup", basis: "Costs after a named storm", children: [
    ["Beach and facility cleanup", "Beach and tourism facility recovery after a named storm", RESERVE.tourism.recovery, true],
    ["Insurance deductibles", "5% named-storm deductible on $8.3M of insured beach facilities", RESERVE.tourism.deductible, true],
    ["Uninsured assets", "Full replacement cost of uninsured dune crossovers and beach facilities", RESERVE.tourism.uninsured]
  ] }
];
// A row is [label, basis, amount] or a { group, basis, children } block whose
// amount is the sum of its indented child rows.
const rowAmount = r => r.children ? r.children.reduce((sum, c) => sum + c[2], 0) : r[2];
const gfTarget = gfRows.reduce((sum, r) => sum + rowAmount(r), 0);
const tdTarget = tdRows.reduce((sum, r) => sum + rowAmount(r), 0);
// The General Fund balance does not reach its target. It is applied in
// priority order: the FY 2028 debt payment and hurricane recovery are funded
// in full (both are owed before any reimbursement arrives), and the rest is
// split between personnel and operating in proportion to their targets.
const gfShortfall = Math.max(0, gfTarget - RESERVE.general.ending);
const gfPriority = rowAmount(gfRows[2]) + rowAmount(gfRows[3]);
const gfOperatingPool = Math.max(0, RESERVE.general.ending - gfPriority);
const gfOperatingTarget = gfRows[0][2] + gfRows[1][2];
const gfPersonnelFunded = Math.round(gfOperatingPool * gfRows[0][2] / gfOperatingTarget);
const gfFunded = new Map([
  ["Personnel services", gfPersonnelFunded],
  ["Operating expenses", gfOperatingPool - gfPersonnelFunded]
]);
const fundedFor = (label, amount) => gfShortfall && gfFunded.has(label) ? gfFunded.get(label) : amount;
const gfMonthsFunded = Math.round(gfOperatingPool / ((RESERVE.general.personnel + RESERVE.general.operating) / 12) * 10) / 10;
// A fourth element of true marks a cost FEMA Public Assistance can reimburse
// at 75% after a declared disaster.
// With funded set, a row also shows how much of its target the balance covers.
const reserveRow = ([label, basis, amount, fema], cls = '', funded) => `<div class="rp-row${cls}${fema ? ' rp-fema' : ''}${funded ? ' rp-funded' : ''}"><strong>${label}</strong><span>${basis}</span><b>${fema ? '<em>FEMA</em>' : ''}${currency(amount)}</b>${funded ? `<b>${currency(funded(label, amount))}</b>` : ''}</div>`;
const femaEligible = rows => rows.flatMap(r => r.children || [r]).filter(r => r[3]).reduce((sum, r) => sum + r[2], 0);
const femaLine = rows => `<p class="rp-fema-note"><em>FEMA</em> Eligible for FEMA reimbursement after a declared disaster: ${currency(femaEligible(rows))}, of which about ${millions(femaEligible(rows) * 0.75)} (75%) would be returned.</p>`;
const reserveTable = (rows, total, funding) => `<div class="rp-table${funding ? ' rp-has-funded' : ''}">${funding ? '<div class="rp-row rp-head rp-funded"><strong></strong><span></span><b>Target</b><b>Funded</b></div>' : ''}${rows.map(r => r.children
  ? reserveRow([r.group, r.basis, rowAmount(r)], ' rp-group', funding && funding.fundedFor) + r.children.map(c => reserveRow(c, ' rp-sub', funding && funding.fundedFor)).join('')
  : reserveRow(r, '', funding && funding.fundedFor)).join('')}<div class="rp-row rp-total${funding ? ' rp-funded' : ''}"><strong>Reserve target</strong><span></span><b>${currency(total)}</b>${funding ? `<b>${currency(Math.min(total, funding.ending))}</b>` : ''}</div>${funding && funding.shortfall ? `<div class="rp-row rp-shortfall rp-funded"><strong>Reserve shortfall</strong><span>Target not covered by the estimated ending balance</span><b></b><b>${currency(funding.shortfall)}</b></div>` : ''}</div>`;
const reserveStats = (target, ending, endingLabel, shortfall) => `<div class="stats" style="grid-template-columns:repeat(${shortfall ? 3 : 2},1fr)"><div class="stat"><b>${millions(target)}</b><span>Reserve target</span></div><div class="stat"><b>${millions(ending)}</b><span>${endingLabel}</span></div>${shortfall ? `<div class="stat rp-stat-short"><b>${millions(shortfall)}</b><span>Reserve shortfall</span></div>` : ''}</div>`;
pages.push(`<section class="page reserve-page">${header('Financial Overview','Reserve Position','Reserves keep services running through a revenue shortfall or a disaster. Each target below holds six months of personnel and operating costs. The General Fund target also holds next year&rsquo;s debt payment and storm-recovery costs.')}
<h2>General Fund</h2>
${reserveStats(gfTarget, Math.min(gfTarget, RESERVE.general.ending), 'Funded')}
${reserveTable(gfRows, gfTarget, { fundedFor, ending: RESERVE.general.ending })}
${femaLine(gfRows)}
<div class="grid2"><div class="card"><strong>What the six months covers</strong><p>Personnel and operating cover the Board of County Commissioners&rsquo; departments and the Commission office: ${millions(RESERVE.general.personnel + RESERVE.general.operating)} a year in the General Fund. Constitutional officers, courts, and outside agencies are not included.${gfShortfall ? ` With debt and storm recovery funded first, the balance covers about ${gfMonthsFunded} months; ${millions(gfShortfall)} more restores six.` : ''}</p></div><div class="card"><strong>Hurricane recovery and cleanup</strong><p>The County pays debris haulers up front, and FEMA reimbursement often arrives a year or more later. FEMA also covers 75% of eligible repairs to uninsured County facilities. Insured buildings carry a 5% named-storm deductible per building, which the County pays in full.</p></div></div>
<h2>Tourist Development Fund</h2>
${reserveStats(tdTarget, Math.min(tdTarget, RESERVE.tourism.ending - RESERVE.tourism.fy2026Projects), 'Funded')}
${reserveTable(tdRows, tdTarget, { fundedFor: (label, amount) => amount, ending: Math.min(tdTarget, RESERVE.tourism.ending - RESERVE.tourism.fy2026Projects) })}
${femaLine(tdRows)}
<div class="grid2"><div class="card"><strong>Basis for the target</strong><p>The Walton County Tourism 2026&ndash;2030 strategic plan, reviewed at a joint Board of County Commissioners and Tourist Development Council workshop, recommended an operating reserve of about half a year of operating costs, a $5.0M destination development balance, and a $15.0M mobility and congestion reserve.</p></div><div class="card"><strong>Use of the balance</strong><p>Tourist development tax is restricted by Section 125.0104, Florida Statutes, to tourism promotion, beach and visitor facilities, and related uses. The balance above the target is held for those purposes and cannot support General Fund services.</p></div></div>
<style>.reserve-page h2{margin-top:.12in}.reserve-page .stats{margin:.06in 0 .06in}.reserve-page .rp-table{border-top:1px solid #003f28;margin-bottom:.08in}.reserve-page .rp-row{display:grid;grid-template-columns:2.1in 1fr 1.1in;gap:.12in;align-items:baseline;padding:.04in 0;border-bottom:1px solid #eef1ee;font-size:8pt}.reserve-page .rp-row strong{color:#003f28}.reserve-page .rp-row span{color:#53665d}.reserve-page .rp-row b{text-align:right;color:#173229;font-variant-numeric:tabular-nums}.reserve-page .rp-group strong,.reserve-page .rp-group b{color:#003f28;font-weight:800}.reserve-page .rp-sub{padding:.03in 0}.reserve-page .rp-sub strong{padding-left:.16in;font-weight:600;color:#3b5249}.reserve-page .rp-sub span,.reserve-page .rp-sub b{font-size:7.6pt}.reserve-page .rp-sub b{font-weight:600;color:#53665d}.reserve-page .rp-row em,.reserve-page .rp-fema-note em{display:inline-block;margin-left:.05in;padding:0 .05in;border-radius:3px;background:#dcefe3;color:#0b6b3a;font-style:normal;font-size:6.2pt;font-weight:800;letter-spacing:.04em;vertical-align:1px}.reserve-page .rp-fema-note em{margin:0 .04in 0 0}.reserve-page .rp-fema{background:#f3faf5}.reserve-page .rp-fema-note{margin:.02in 0 .08in;font-size:7.2pt;color:#3b5249}.reserve-page .rp-total{border-top:1.5px solid #003f28;border-bottom:1.5px solid #003f28}.reserve-page .rp-total b{color:#003f28;font-weight:800}.reserve-page .grid2{gap:.1in}.reserve-page .card strong{display:block;margin-bottom:.03in;color:#003f28;font-size:8pt}.reserve-page .card p{font-size:7.2pt}.reserve-page .rp-line{margin:.06in 0 0;font-size:7.6pt}.reserve-page .rp-row.rp-funded{grid-template-columns:1.75in 1fr 1.05in 1.05in}.reserve-page .rp-row b:has(em){display:flex;justify-content:space-between;align-items:baseline}.reserve-page .rp-row em{margin:0}.reserve-page .rp-head{padding:.03in 0;border-bottom:1px solid #003f28}.reserve-page .rp-head b{font-size:6.6pt;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#003f28}.reserve-page .rp-row b.rp-short{color:#9a3d1f}.reserve-page .rp-shortfall{background:#fbf3ec;border-bottom:1.5px solid #9a3d1f}.reserve-page .rp-shortfall strong,.reserve-page .rp-shortfall b{color:#9a3d1f;font-weight:800}.reserve-page .rp-stat-short{background:#7a2f17}.reserve-page .rp-row.rp-funded{grid-template-columns:1.85in 1fr 1.15in .9in}.reserve-page .rp-row b{white-space:nowrap}.reserve-page .rp-row{padding:.028in 0}.reserve-page .rp-sub{padding:.022in 0}.reserve-page .stat{padding:.075in .08in}.reserve-page h2{margin-top:.08in}.reserve-page .card{padding:.08in .12in}.reserve-page .card p{line-height:1.35}.reserve-page .rp-fema-note{margin:.02in 0 .06in}.reserve-page .intro{margin-bottom:.04in}</style>
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
