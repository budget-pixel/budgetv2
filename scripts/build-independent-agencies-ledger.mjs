import { chromium } from "playwright";

// Builds the FY 2027 Budget Book's "Independent Agencies Ledger" -- an
// overview page followed by a profile for each of the 13 independent
// and autonomous entities Walton County funds outside its own Board
// departments and Constitutional Officers. Source: pages/independent-
// agencies-ledger.html and each entity's own page (live-rendered) --
// this book's original raw capture of this section was completely
// empty (a JS-only widget that didn't survive static capture), so every
// figure and narrative here comes from a live research pass, not a
// prior print capture.
//
// Two things worth knowing: (1) the E911 Fund's own revenue is
// transferred to and included in the Sheriff's Office budget shown in
// the Constitutional Officers Ledger -- its figures here describe the
// fund itself, not an amount additional to the Sheriff's total. (2)
// Only Circuit Court and County Court carry any Personnel cost; every
// other entity here is entirely Operating (contractual services, grants
// and aid, or intergovernmental pass-through) -- there is no Capital
// funding anywhere in this section.

const STATS = [
  ["$9.20M", "Total FY2027 Budget"],
  ["-$96K", "Net Change from FY2026"],
  ["-1.0%", "Net Percent Change"],
  ["13", "Independent Agencies"]
];

// [entity, fy26, fy27, fund]
const SUMMARY_ROWS = [
  ["Statutory & Other Agency Funding", 3109643, 3502844, "General Fund"],
  ["Walton County Health Department", 1724397, 1724397, "General Fund"],
  ["South Walton Fire & State Control", 952483, 980074, "General Fund"],
  ["Medical Examiner", 1351698, 881930, "General Fund"],
  ["E911 Fund", 440000, 460000, "E911 Fund"],
  ["Non-Profit Funding Program", 477820, 450000, "General Fund"],
  ["State Attorney", 260633, 297111, "General Fund"],
  ["Public Defender", 152439, 290833, "General Fund"],
  ["Circuit Court", 260511, 261493, "General Fund"],
  ["Court Technology & Innovations", 443758, 228545, "General Fund"],
  ["County Court", 69956, 70056, "General Fund"],
  ["Daughette MSBU Fund", 43225, 43225, "Daughette MSBU Fund"],
  ["Guardian Ad Litem", 9000, 9000, "General Fund"]
];
const SUMMARY_TOTAL = ["Total Independent Agencies", 9295563, 9199508];

const AGENCIES = [
  {
    name: "Statutory & Other Agency Funding", fy26: 3109643, fy27: 3502844, fund: "General Fund", personnel: 0, operating: 3502844,
    narrative: "The Board of County Commissioners has allocated funding to support a range of statutory and agency services that contribute to the community's well-being, including mental health services, volunteer fire departments, healthcare response initiatives, redevelopment efforts, and other related services.",
    breakdown: [
      ["Medicaid Services", 1243475],
      ["DeFuniak Community Redevelopment Agency", 767938],
      ["Economic Development Alliance", 421444],
      ["Opioid Settlement Year 4", 254887],
      ["Liberty Volunteer Fire Department", 175000],
      ["Argyle Volunteer Fire Department", 175000],
      ["Health Care Response (HCRA)", 100000],
      ["Gulf Coast Kid's House", 98100],
      ["Lakeview Center (Women & Children)", 75000],
      ["Indigent Cremation Program", 50000],
      ["Lakeview Center (Mental Health)", 50000],
      ["Lakeview Center (Baker Act)", 50000],
      ["DeFuniak Springs Interlocal (Life Enrichment Center)", 42000]
    ]
  },
  {
    name: "Walton County Health Department", fy26: 1724397, fy27: 1724397, fund: "General Fund", personnel: 0, operating: 1724397,
    narrative: "The Walton County Health Department operates as a full-time public health unit under a contractual agreement between the County and the State of Florida. Under Chapter 154 of the Florida Statutes, counties are responsible for establishing and maintaining county health departments and public health facilities, delivering maternal and child health, communicable disease control, and environmental health programs. County health departments enter into an annual core contract with their host Board of County Commissioners specifying services and funding, supported by a combination of state, county, and federal funds, service fees, Medicaid, and grants."
  },
  {
    name: "South Walton Fire & State Control", fy26: 952483, fy27: 980074, fund: "General Fund", personnel: 0, operating: 980074,
    narrative: "South Walton Fire accounts for the cost of emergency medical services provided by the South Walton Fire District under an interlocal agreement, covering emergency and non-emergency medical services and medical transport within southern Walton County. State Fire Control accounts for the state assessment that funds fire prevention and control activities, including maintaining firebreaks, conducting controlled burns to reduce wildfire risk, and training and equipping fire control personnel."
  },
  {
    name: "Medical Examiner", fy26: 1351698, fy27: 881930, fund: "General Fund", personnel: 0, operating: 881930,
    narrative: "The Medical Examiner is appointed by the Governor for each medical examiner district established by the State Medical Examiners Commission. Under state law, the Medical Examiner determines the cause of death under specified circumstances and performs the examinations, investigations, and autopsies deemed necessary; fees, salaries, and expenses are paid by the County under Florida Statute 406.08. Walton County is part of the District One Medical Examiner Committee (DOMES), which also covers Okaloosa, Santa Rosa, and Escambia counties, with the district examiner's cost shared among the four counties."
  },
  {
    name: "E911 Fund", fy26: 440000, fy27: 460000, fund: "E911 Fund", personnel: 0, operating: 460000,
    narrative: "The E911 Fund accounts for phone charges assessed to provide emergency assistance through the E911 system that links emergency callers with appropriate public resources. The State of Florida requires E911 receipts to be maintained in a separate fund; these dollars are transferred to the Sheriff's fund for E911 expenditures and are included in the Sheriff's Office's overall budget shown in the Constitutional Officers Ledger, not in addition to it."
  },
  {
    name: "Non-Profit Funding Program", fy26: 477820, fy27: 450000, fund: "General Fund", personnel: 0, operating: 450000,
    narrative: "The Board of County Commissioners designates funding to support nonprofit agencies that contribute to the County's vision of being the premier place to live, visit, work, and play. This funding is intended to enhance programs and services that promote the health and social well-being of Walton County residents."
  },
  {
    name: "State Attorney", fy26: 260633, fy27: 297111, fund: "General Fund", personnel: 0, operating: 297111,
    narrative: "The State Attorney is elected for each judicial circuit and is responsible for prosecuting or defending on behalf of the State all civil or criminal suits, applications, or motions in circuit and county courts within the circuit, attending grand jury sessions, summoning and examining witnesses, and assisting on appeals to the Supreme Court. Under Florida Statute 27.34, the County provides this office with space, utilities, and related services, sharing the cost with the other counties of the 1st Judicial Circuit."
  },
  {
    name: "Public Defender", fy26: 152439, fy27: 290833, fund: "General Fund", personnel: 0, operating: 290833,
    narrative: "The Public Defender represents any person determined by the Court to be indigent under Section 27.52, Florida Statutes, who is charged with a felony or criminal misdemeanor, or as a delinquent child, along with any other person the Court may designate. Under Florida Statute 27.54, the County provides this office with space, utilities, telephone, custodial, library, transportation, and communications services, sharing the cost with the other counties of the 1st Judicial Circuit."
  },
  {
    name: "Circuit Court", fy26: 260511, fy27: 261493, fund: "General Fund", personnel: 224093, operating: 37400,
    narrative: "Circuit Court judges and their judicial assistants are employees of the State. Under state law, unless the State pays such expenses, the County is responsible for the reasonable salaries of secretaries and assistants of the Circuit Court and the reasonable expenses of Circuit judges. This budget includes Circuit Court costs such as professional services, bailiff salaries, and a judicial assistant paid from Innovative Court Program funding generated by court fees."
  },
  {
    name: "Court Technology & Innovations", fy26: 443758, fy27: 228545, fund: "General Fund", personnel: 0, operating: 228545,
    narrative: "Under Section 29.008(1)(f)2. and (h), Florida Statutes, counties responsible for court technology costs are allocated funding dedicated solely to court-related technology, supporting the technology needs of state trial courts, state attorneys, public defenders, and criminal conflict and civil regional counsel. A related program, Court Innovations, is funded under Walton County Ordinance 2004-22 and Florida Statute 939.185 by a $65 court cost imposed on felony, misdemeanor, or criminal traffic convictions, supplementing state funding for court program enhancements."
  },
  {
    name: "County Court", fy26: 69956, fy27: 70056, fund: "General Fund", personnel: 65856, operating: 4200,
    narrative: "County Court judges and their judicial assistants are employees of the State. Under state law, unless the State pays such expenses, the County is responsible for the reasonable salaries of secretaries and assistants of the County Court and the reasonable expenses of County judges."
  },
  {
    name: "Daughette MSBU Fund", fy26: 43225, fy27: 43225, fund: "Daughette MSBU Fund", personnel: 0, operating: 43225,
    narrative: "Chapter 125.01(q)1, Florida Statutes, authorizes the Board of County Commissioners to create a Municipal Service Benefit Unit (MSBU) to provide and maintain facilities or services, such as fire services, that specifically benefit property owners in a particular area for a public purpose. An MSBU can be requested by property owners in unincorporated Walton County for improvements such as potable water, sanitary sewer, reuse water, roadway paving, canal dredging, or drainage &mdash; funded by service charges, special assessments, or taxes within the unit, and requiring approval from at least 66.66% of affected property owners. Following Board acceptance of a project, affected owners have 30 days to pay the special assessment before interest accrues; annual billing occurs each November, with installment payments due by December 31st to avoid additional interest or penalties."
  },
  {
    name: "Guardian Ad Litem", fy26: 9000, fy27: 9000, fund: "General Fund", personnel: 0, operating: 9000,
    narrative: "Under Florida Statutes Chapter 29.008, counties are required by Article V of the State Constitution to fund the cost of services such as staffing, communications, and facility lease, maintenance, utilities, and security for the guardian ad litem program. A Guardian ad Litem is a volunteer appointed by the court to protect the rights and advocate for the best interests of a child involved in a court proceeding."
  }
];

function money(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
function pct(delta, base) { return (delta >= 0 ? "+" : "") + ((delta / base) * 100).toFixed(1) + "%"; }

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
    margin-top:.24in;
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
  p.intro{
    max-width:7.3in;
    margin:0 0 .18in;
    color:#33453c;
    font-size:8.8pt;
    line-height:1.42;
  }
  .stat-strip{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:.12in;
    margin:0 0 .2in;
  }
  .stat-card{
    padding:.12in .08in;
    border-radius:10px;
    background:#003f28;
    text-align:center;
  }
  .stat-card b{ display:block; color:#fff; font:800 13pt/1.1 Georgia, serif; }
  .stat-card span{ display:block; margin-top:.03in; color:#e7c95f; font-size:6.2pt; font-weight:800; letter-spacing:.02em; text-transform:uppercase; line-height:1.25; }
  h2{
    margin:.06in 0 .08in;
    color:#003f28;
    font:800 11pt/1.2 Georgia, serif;
    padding-bottom:.05in;
    border-bottom:2px solid #d1be78;
  }
  .ledger{ border-top:2px solid #d1be78; }
  .lrow{
    display:grid;
    grid-template-columns:1fr .95in .95in .95in 1.1in;
    gap:.06in;
    align-items:center;
    padding:.07in 0;
    border-bottom:1px solid #eef1ee;
  }
  .lrow.head{
    border-bottom:1px solid #003f28;
    color:#68786f;
    font-size:6.3pt;
    font-weight:800;
    letter-spacing:.01em;
    text-transform:uppercase;
    padding-bottom:.06in;
  }
  .lrow.head .rnum{ text-align:right; }
  .rlabel{ color:#173229; font-size:8pt; }
  .rnum{ text-align:right; color:#33453c; font-size:7.8pt; font-variant-numeric:tabular-nums; }
  .rfund{ text-align:right; color:#68786f; font-size:7.2pt; font-style:italic; }
  .change{ color:#0b7741; font-weight:700; }
  .change.is-down{ color:#a24b1e; }
  .lrow.grand{ margin-top:.04in; border-top:1.5px solid #003f28; border-bottom:0; padding:.08in 0; }
  .lrow.grand .rlabel, .lrow.grand .rnum{ color:#003f28; font-weight:800; font-size:8.4pt; }
  p.footnote{ margin:.14in 0 0; color:#68786f; font-size:7pt; line-height:1.4; font-style:italic; }
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

  .ag-card{
    border:1px solid #e4ebe7;
    border-top:4px solid #0b7741;
    border-radius:0 0 11px 11px;
    padding:.15in .2in;
    margin-bottom:.13in;
    background:#fbfcfa;
    box-shadow:0 4px 12px rgba(0,0,0,.04);
  }
  .ag-head{
    display:flex;
    justify-content:space-between;
    align-items:baseline;
    padding-bottom:.06in;
    border-bottom:2px solid #d1be78;
    margin-bottom:.08in;
  }
  .ag-head h3{ margin:0; color:#003f28; font:800 11.5pt Georgia, serif; }
  .ag-head .ag-fund{ color:#68786f; font-size:6.8pt; font-weight:700; text-transform:uppercase; letter-spacing:.02em; }
  .ag-stats{ display:flex; gap:.2in; margin-bottom:.07in; font-size:7pt; color:#33453c; }
  .ag-stats b{ color:#003f28; }
  .ag-narrative{ font-size:6.9pt; line-height:1.38; color:#33453c; margin:0 0 .1in; }
  .ag-breakdown{ column-count:2; column-gap:.28in; margin-top:.06in; padding-top:.08in; border-top:1px solid #e4ebe7; }
  .ag-brow{ display:flex; justify-content:space-between; gap:.08in; padding:.032in 0; border-bottom:1px solid #f1f4f1; font-size:7pt; break-inside:avoid; }
  .ag-brow span{ color:#173229; }
  .ag-brow b{ color:#003f28; white-space:nowrap; }
  .agency-grid{ display:grid; grid-template-columns:1fr 1fr; gap:.12in; align-items:start; }
  .agency-grid .ag-card{ margin:0; padding:.12in .15in; }
  .agency-grid .ag-head{ margin-bottom:.055in; padding-bottom:.045in; }
  .agency-grid .ag-head h3{ font-size:10.2pt; }
  .agency-grid .ag-stats{ flex-wrap:wrap; gap:.04in .12in; margin-bottom:.05in; font-size:6.25pt; }
  .agency-grid .ag-narrative{ margin-bottom:.04in; font-size:6.15pt; line-height:1.31; }
  .agency-grid .ag-card.feature{ grid-column:1 / -1; }
  .agency-grid .ag-card.feature .ag-narrative{ font-size:6.45pt; }
  .agency-grid .ag-card.feature .ag-breakdown{ column-count:3; column-gap:.18in; }
  .agency-grid .ag-card.feature .ag-brow{ font-size:6.15pt; padding:.024in 0; }
`;

function summaryRowHtml(r) {
  const [name, fy26, fy27, fund] = r;
  const delta = fy27 - fy26;
  const isDown = delta < 0;
  return `<div class="lrow"><div class="rlabel">${name}</div><div class="rnum">${money(fy26)}</div><div class="rnum">${money(fy27)}</div><div class="rnum change${isDown ? " is-down" : ""}">${pct(delta, fy26)}</div><div class="rfund">${fund}</div></div>`;
}

function agencyCardHtml(a, extraClass = "") {
  const delta = a.fy27 - a.fy26;
  const isDown = delta < 0;
  const dsign = delta >= 0 ? "+" : "&minus;";
  const personnelBit = a.personnel > 0 ? ` &middot; Personnel <b>${money(a.personnel)}</b> &middot; Operating <b>${money(a.operating)}</b>` : "";
  return `
  <div class="ag-card${extraClass ? ` ${extraClass}` : ""}">
    <div class="ag-head">
      <h3>${a.name}</h3>
      <div class="ag-fund">${a.fund}</div>
    </div>
    <div class="ag-stats">
      <span>FY26 <b>${money(a.fy26)}</b></span>
      <span>FY27 <b>${money(a.fy27)}</b></span>
      <span class="${isDown ? "change is-down" : "change"}">${dsign}${money(Math.abs(delta)).slice(1)} (${pct(delta, a.fy26)})</span>
      ${personnelBit}
    </div>
    <p class="ag-narrative">${a.narrative}</p>
    ${a.breakdown ? `<div class="ag-breakdown">${a.breakdown.map(([n, v]) => `<div class="ag-brow"><span>${n}</span><b>${money(v)}</b></div>`).join("")}</div>` : ""}
  </div>`;
}

// Consolidated into three editorial spreads, each using the same two-column
// card grid. The statutory allocation is the one deliberate exception --
// full-width, since its 13-line breakdown needs the room -- everything else
// sits in a uniform two-up grid so the section reads consistently.
const PAGE_GROUPS = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [8, 9, 10, 11, 12]
];

const startPage = Number(process.argv[3] || 189);
let pageCounter = startPage;

const overviewPage = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Other Agencies and Court-Related Functions</small>
    <h1>Independent Agencies Ledger</h1>
    <p class="intro">Budget, fund, and year-over-year change for the Courts, Health Department, and other independent and autonomous entities Walton County funds outside its own Board departments and Constitutional Officers.</p>
    <div class="stat-strip">${STATS.map(([v, l]) => `<div class="stat-card"><b>${v}</b><span>${l}</span></div>`).join("")}</div>
    <h2>Agency Summary</h2>
    <div class="ledger">
      <div class="lrow head"><div class="rlabel">Entity</div><div class="rnum">FY26 Total</div><div class="rnum">FY27 Total</div><div class="rnum">+/&minus;</div><div class="rfund">Fund</div></div>
      ${SUMMARY_ROWS.map(summaryRowHtml).join("")}
      <div class="lrow grand"><div class="rlabel">${SUMMARY_TOTAL[0]}</div><div class="rnum">${money(SUMMARY_TOTAL[1])}</div><div class="rnum">${money(SUMMARY_TOTAL[2])}</div><div class="rnum change${SUMMARY_TOTAL[2] < SUMMARY_TOTAL[1] ? " is-down" : ""}">${pct(SUMMARY_TOTAL[2] - SUMMARY_TOTAL[1], SUMMARY_TOTAL[1])}</div><div class="rfund"></div></div>
    </div>
    <p class="footnote">E911 Fund's revenue is transferred to and included in the Walton County Sheriff's Office budget shown in the Constitutional Officers Ledger; it is not additional countywide spending beyond that total. No entity in this section has FY2027 capital funding.</p>
    <footer><span>FY 2027 Annual Budget</span><b>${pageCounter}</b></footer>
  </section>
`;
pageCounter++;

const agencyPagesHtml = PAGE_GROUPS.map((idxs) => {
  const group = idxs.map((i) => AGENCIES[i]);
  const groupIndex = PAGE_GROUPS.indexOf(idxs);
  const cards = group.map((a, i) => {
    if (groupIndex === 0 && i === 0) return agencyCardHtml(a, "feature");
    return agencyCardHtml(a);
  }).join("");
  const html = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h1 style="font-size:16pt;">Independent Agencies Ledger <span style="color:#68786f;font-size:9.5pt;font-weight:400;">(continued)</span></h1>
    <div class="agency-grid">${cards}</div>
    <footer><span>FY 2027 Annual Budget</span><b>${pageCounter}</b></footer>
  </section>
  `;
  pageCounter++;
  return html;
}).join("\n");

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Independent Agencies Ledger</title>
<style>${sharedCss}</style></head>
<body>${overviewPage}${agencyPagesHtml}</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-independent-agencies-ledger.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath + " (" + (1 + PAGE_GROUPS.length) + " pages)");
