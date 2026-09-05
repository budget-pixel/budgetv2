import { chromium } from "playwright";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG_DIR = path.join(__dirname, "..", "assets", "images", "page-images");

function photoDataUrl(filename) {
  const ext = path.extname(filename).slice(1).toLowerCase();
  const mime = ext === "png" ? "png" : "jpeg";
  const buf = fs.readFileSync(path.join(IMG_DIR, filename));
  return `data:image/${mime};base64,${buf.toString("base64")}`;
}

// Builds the FY 2027 Budget Book's "Constitutional Officers Ledger" --
// an overview/summary page followed by one full magazine-quality page
// per office (matching the Departments and Services chapter's per-entity
// treatment), for each of Walton County's 5 independently elected
// offices plus the Board of County Commissioners.
//
// Source: pages/constitutional-ledger.html for the summary table, and
// each office's own live page (sheriffs-office.html, tax-collector.html,
// clerk-of-courts-and-county-comptroller.html, property-appraiser.html,
// supervisor-of-elections.html, board-of-county-commissioners.html) for
// the elected official's name, Statement of Function, Revenue Summary
// (who pays), and Position Summary (FTE change and any named new
// positions) -- all live-rendered and read directly, not guessed.
//
// One reconciled data note, carried from the prior version of this
// script: this book's live source has two different figures for the
// Board of County Commissioners' total budget depending on which page
// renders it. summary-of-expenses.html (this book's Expenditure Ledger)
// shows BCC's department-only total ($12,389,938 FY26 / $12,391,280
// FY27), classifying its $500,000/$400,000 statutory "Other Uses
// Contingency" reserve (Dept_Code 00101001) separately under "Other
// Uses." constitutional-ledger.html instead folds that reserve back
// into BCC's own total ($12,889,938 / $12,791,280), since it's budget
// authority the Board controls -- and that is the figure this section's
// own live grand total is built from. This page uses the office-total
// figure (matching this section's own source and grand total) with a
// footnote pointing to the Expenditure Ledger's separate treatment.
//
// Tax Collector and Property Appraiser: both offices' budgets are
// approved by the State Department of Revenue rather than simply drawn
// from the County's General Fund, and each office's own live page shows
// a "Revenue Summary" dollar figure well below its total expenditures
// (Tax Collector: $4.4M revenue vs. $8.5M total; Property Appraiser:
// $5.0M vs. $5.0M -- these matched, but Tax Collector's live Revenue
// Summary intentionally only reflects County-sourced General Government
// Taxes, not the statutory fee commissions the office collects directly
// from other taxing authorities it serves as an agent for). Rather than
// implying a funding gap, each office's revenue line notes this plainly.

const STATS = [
  ["$148.9M", "Total FY2027 Budget"],
  ["+$1.6M", "Net Change from FY2026"],
  ["+1.1%", "Net Percent Change"],
  ["847", "Total FTE, 6 Offices"]
];
const SPLIT = [
  ["Personnel", "$104.14M", "70.0%"],
  ["Operating", "$33.12M", "22.2%"],
  ["Capital & Other", "$11.64M", "7.8%"]
];

// [office, fte, fy26, fy27, personnel, operating, capitalOther]
const SUMMARY_ROWS = [
  ["Walton County Sheriff's Office", 669, 114116228, 114116228, 83607042, 21348864, 9160322],
  ["Board of County Commissioners*", 11, 12889938, 12791280, 2791180, 7890100, 2110000],
  ["Tax Collector", 40, 7900000, 8500000, 7512920, 987080, 0],
  ["Clerk of Courts & County Comptroller", 80, 5984728, 6871175, 4905230, 1845945, 120000],
  ["Property Appraiser", 37, 4829596, 4954338, 4123584, 697382, 133372],
  ["Supervisor of Elections", 10, 1615107, 1663865, 1198763, 348682, 116420]
];
const SUMMARY_TOTAL = ["Total Constitutional Officers", 847, 147335597, 148896886, 104138719, 33118053, 11640114];

const OFFICES = [
  {
    name: "Walton County Sheriff's Office", fund: "Sheriff (Fine & Forfeiture) Fund",
    official: "Michael Adkinson", title: "Sheriff", photo: "sheriff-mike-adkinson.jpg",
    docUrl: "https://www.mywaltonfl.gov/DocumentCenter/View/45225/Sheriff-Budget-Certification",
    fte: 669, ftePrior: 668, fteDelta: 1, fy26: 114116228, fy27: 114116228,
    personnel: 83607042, operating: 21348864, capital: 9160322,
    sof: "The Sheriff is a separately elected Constitutional Officer of the County. Functions under the Sheriff include Corrections, Court Services, Law Enforcement, Animal Services, and Fire Rescue. The Corrections division operates the County detention facility, involving inmate housing, medical services, food services, and prisoner transportation. Court Services provides bailiffs, courtroom security, and general jury and judicial protective services. Law Enforcement includes uniformed road patrol, criminal investigations, crime scene investigations, K-9 units, and the E911 Communications Center. The Sheriff's Office has also taken on operation of the animal control facility and Walton County Fire Rescue Services.",
    revenue: "Other Sources $102.6M &middot; Charges for Services $8.0M &middot; Miscellaneous Revenue $2.1M &middot; Intergovernmental Revenues $1.4M",
    newPositions: [{ title: "School Resource Officer", n: 1 }]
  },
  {
    name: "Board of County Commissioners", fund: "General Fund",
    commissioners: [
      ["District 1", "Dan Curry", "commissioner-dan-curry.jpeg"],
      ["District 2", "Danny Glidewell", "commissioner-danny-glidewell.jpeg"],
      ["District 3", "Brad Drake", "commissioner-brad-drake.jpeg"],
      ["District 4", "Donna Johns", "commissioner-donna-johns.jpeg"],
      ["District 5", "Tony Anderson", "commissioner-tony-anderson.jpeg"]
    ],
    fte: 11, ftePrior: 11, fteDelta: 0, fy26: 12889938, fy27: 12791280,
    personnel: 2791180, contractual: 2473100, operating: 5417000, capital: 2110000,
    sof: "The Board of County Commissioners (BCC) is the legislative and policy-making body of County government. Representatives from five Walton County districts are elected countywide and serve four-year terms. The BCC establishes policies through ordinances and resolutions, appoints the County Administrator, Chief Financial Officer, and County Attorney, and adopts the budget, making all decisions on appropriating funds to County departments, divisions, and Constitutional offices, in accordance with Florida State statutes.",
    revenue: "General Government Taxes $4.5M &middot; Miscellaneous Revenue $4.3M &middot; Intergovernmental Revenues $2.4M &middot; Permits, Fees &amp; Special Assessments $1.5M",
    contracts: [
      { service: "Board ERP Finance, HR, Planning &amp; Permit Software", provider: "Tyler Technologies", amount: 420000 },
      { service: "Enhanced South Walton Right-of-Way Landscaping (portion paid by Tourist Fund)", provider: "ZIIC Outdoors, LLC", amount: 650000 },
      { service: "Enhanced South Walton Right-of-Way Landscaping (portion paid by Tourist Fund)", provider: "Harper Landscaping, LLC", amount: 500000 },
      { service: "Comprehensive Annual Financial Audit Services", provider: "Carr, Riggs, &amp; Ingram", amount: 310000 },
      { service: "State-Mandated Service (Other Services)", provider: "Not listed", amount: 250000 },
      { service: "Employee Benefits Consultant", provider: "The Gehring Group", amount: 95000 },
      { service: "State Lobbyist (75/25 split with Tourist Fund)", provider: "Heffley &amp; Associates, Inc.", amount: 66000 },
      { service: "Federal Lobbyist (50/50 split with Tourist Fund)", provider: "Not yet awarded", amount: 48000 },
      { service: "County Website, ADA Compliance &amp; Archive Services", provider: "CivicPlus", amount: 50000 },
      { service: "Commissioner &amp; Board Agenda Management Software", provider: "iCompass", amount: 30000 },
      { service: "Enhanced South Walton Right-of-Way Landscaping (portion paid by Tourist Fund)", provider: "ZIIC Outdoors, LLC", amount: 25000 },
      { service: "Financial Advisor Services for Debt Issuance", provider: "PFM Financial Advisors LLC", amount: 10000 },
      { service: "Cost Allocation Service Study", provider: "Maximus US Services, Inc", amount: 11100 },
      { service: "OPEB/GASB 75 Valuation", provider: "McGriff Insurance Services", amount: 8000 }
    ],
    capitalItems: [
      { item: "Board-Approved Capital Improvements (Managed Vendor Program Revenue)", amount: 1530000 },
      { item: "Boating Improvements (Vessel Registration Fees)", amount: 100000 },
      { item: "Board-Approved Capital Improvements", amount: 75000 }
    ],
    capitalNote: "The remaining $405,000 of Capital &amp; Other is $400,000 in statutory Other Uses Contingency reserve and $5,000 in Grants and Aid, neither of which is a capital project.",
    footnote: "Total includes a $500,000 (FY2026) / $400,000 (FY2027) statutory Other Uses Contingency reserve, which the Expenditure Ledger shows separately under its \"Other Uses\" functional classification rather than under General Government &mdash; both are the same dollars, presented two different ways in this book."
  },
  {
    name: "Tax Collector", fund: "Fee-Based (State Approved)",
    official: "Rhonda Skipper", title: "Tax Collector", photo: "tax-collector-rhonda-skipper.jpg",
    docUrl: "https://www.mywaltonfl.gov/DocumentCenter/View/45479/FY27-Budget-DOR-Submission",
    fte: 40, ftePrior: 40, fteDelta: 0, fy26: 7900000, fy27: 8500000,
    personnel: 7512920, operating: 987080, capital: 0,
    sof: "The Tax Collector is a separately elected Constitutional Officer of the County, with a budget approved by the State Department of Revenue. The office primarily serves as an agent of state government: administering titling and registration for vehicles and vessels as an agent of Highway Safety and Motor Vehicles, issuing hunting and fishing licenses for the Game and Fish Commission, collecting sales tax on vehicle and vessel sales as an agent of the Department of Revenue, and collecting, investing, and distributing real and tangible property taxes and occupational license tax.",
    revenue: "General Government Taxes $4.4M &mdash; the remainder of the office's budget is funded by statutory fee commissions the office collects directly from the other taxing authorities it serves as an agent for, not shown as County revenue.",
    newPositions: []
  },
  {
    name: "Clerk of Courts & County Comptroller", fund: "General Fund",
    official: "Crystal Sconiers", title: "Clerk of Courts & County Comptroller", photo: "clerk-crystal-sconiers.jpg", photoPosition: "50% 28%",
    docUrl: "https://www.mywaltonfl.gov/DocumentCenter/View/45227/Clerk-of-Court-and-Comptroller-Budget",
    fte: 80, ftePrior: 77, fteDelta: 3, fy26: 5984728, fy27: 6871175,
    personnel: 4905230, operating: 1845945, capital: 120000,
    sof: "The Clerk of Courts & County Comptroller is a separately elected Constitutional Officer who also serves as Clerk to the Board of County Commissioners. As Clerk of the Court, areas of support for judicial functions include the Civil, Family Services, Felony, Jury Administration, and Recording Divisions. As Clerk to the Board, functions include Finance, Information Systems, and BCC recording &mdash; accounting and auditing services, contract and purchase disbursements, investment of Board funds, information systems support, and maintaining the County's official records.",
    revenue: "General Government Taxes $6.9M",
    newPositions: [{ title: "IT Tech III", n: 1 }, { title: "IT Systems Administrator", n: 1 }, { title: "Network Administrator", n: 1 }]
  },
  {
    name: "Property Appraiser", fund: "Fee-Based (State Approved)",
    official: "Gary Gregor", title: "Property Appraiser", photo: "property-appraiser-gary-gregor.png",
    docUrl: "https://www.mywaltonfl.gov/DocumentCenter/View/45269/Property-Appraiser-Submission",
    fte: 37, ftePrior: 38, fteDelta: -1, fy26: 4829596, fy27: 4954338,
    personnel: 4123584, operating: 697382, capital: 133372,
    sof: "The Property Appraiser is a separately elected Constitutional Officer of the County, with a budget approved by the State Department of Revenue. Florida law requires the Board of County Commissioners to pay the municipalities' and school board's share of the Property Appraiser's budget. This office is responsible for determining the value of all property within the County, maintaining the records connected with that responsibility, determining the tax on taxable property after taxes have been levied, and distributing the Truth-in-Millage (TRIM) notices.",
    revenue: "General Government Taxes $5.0M, which under Florida law includes the municipalities' and school board's proportional share of this office's budget.",
    newPositions: []
  },
  {
    name: "Supervisor of Elections", fund: "General Fund",
    official: "Ryan Messer", title: "Supervisor of Elections", photo: "supervisor-elections-ryan-messer.jpg", photoPosition: "50% 5%",
    docUrl: "https://www.mywaltonfl.gov/DocumentCenter/View/45234/Supervisor-of-Elections-Budget",
    fte: 10, ftePrior: 10, fteDelta: 0, fy26: 1615107, fy27: 1663865,
    personnel: 1198763, operating: 348682, capital: 116420,
    sof: "The Supervisor of Elections is a separately elected Constitutional Officer of the County, with a budget included in the General Fund. This office administers elections and maintains voter registration records and statistics, ensuring compliance with the federally mandated National Voter Registration Act. Administering elections includes coordinating and training poll workers, setting up precinct polling places, ballot printing, and providing voting booths that comply with minimum standards under Florida statutes.",
    revenue: "General Government Taxes $1.7M",
    newPositions: []
  }
];

function money(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
function pct(delta, base) { return base === 0 ? "N/A" : (delta >= 0 ? "+" : "") + ((delta / base) * 100).toFixed(1) + "%"; }

function whoPaysFor(o) {
  const rows = {
    "Walton County Sheriff's Office": [
      ["Property owners and County taxpayers", "County funding supports law enforcement, corrections, fire rescue, animal services, and court security."],
      ["Service users and partner agencies", "Patient/insurance payments, service charges, intergovernmental funding, and E911-related revenues offset costs."]
    ],
    "Board of County Commissioners": [
      ["Residents and property owners", "Property taxes and other locally generated revenues support the Board's Countywide policy and administrative functions."],
      ["Visitors, businesses, and service users", "Sales-related revenues, fees, permits, and shared revenues contribute to services and capital activity."]
    ],
    "Tax Collector": [
      ["Taxing authorities and transaction customers", "Statutory commissions and fees are earned while collecting taxes and providing vehicle, vessel, license, and related services."],
      ["County taxpayers", "The County-funded share is supported by general governmental revenues."]
    ],
    "Clerk of Courts & County Comptroller": [
      ["Residents and property owners", "County general revenues support Clerk-to-the-Board, finance, records, technology, and comptroller functions."],
      ["Court and records users", "Court, recording, and service-related revenues support eligible activities outside this County-funded presentation."]
    ],
    "Property Appraiser": [
      ["Property owners through local taxing authorities", "The County, municipalities, and school board fund proportional shares of the State-approved property appraisal budget."],
      ["County taxpayers", "Florida law requires the Board to advance the municipalities' and school board's shares, with those costs included here."]
    ],
    "Supervisor of Elections": [
      ["Residents and property owners", "County general revenues fund voter registration, election administration, equipment, ballots, and polling-place operations."]
    ]
  };
  return rows[o.name] || [["County taxpayers and service users", "The funding mix reflects the public revenues and service charges supporting this office."]];
}

const sharedCss = `
  @page{ size:letter portrait; margin:0; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ font-family:Arial, Helvetica, sans-serif; color:#173229; }
  section{
    position:relative;
    width:8.5in;
    height:11in;
    padding:.5in .62in .5in;
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
    margin-top:.2in;
    color:#b89521;
    font-size:8pt;
    font-weight:900;
    letter-spacing:.14em;
    text-transform:uppercase;
  }
  h1{
    margin:8px 0 .06in;
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
  .stat-strip{ display:grid; grid-template-columns:repeat(4,1fr); gap:.12in; margin:0 0 .18in; }
  .stat-card{ padding:.12in .08in; border-radius:10px; background:#003f28; text-align:center; }
  .stat-card b{ display:block; color:#fff; font:800 13pt/1.1 Georgia, serif; }
  .stat-card span{ display:block; margin-top:.03in; color:#e7c95f; font-size:6.2pt; font-weight:800; letter-spacing:.02em; text-transform:uppercase; line-height:1.25; }
  h2{ margin:.08in 0 .08in; color:#003f28; font:800 11pt/1.2 Georgia, serif; padding-bottom:.05in; border-bottom:2px solid #d1be78; }
  .split-row{ display:grid; grid-template-columns:repeat(3,1fr); gap:.14in; margin:0 0 .2in; }
  .split-card{ padding:.1in .12in; border:1px solid #e4ebe7; border-radius:9px; background:#fbfcfa; }
  .split-card b{ display:block; color:#003f28; font:800 10.5pt Georgia, serif; }
  .split-card span{ display:block; color:#68786f; font-size:6.8pt; font-weight:700; text-transform:uppercase; letter-spacing:.02em; }
  .split-card em{ display:block; margin-top:.02in; color:#33453c; font-style:normal; font-size:7pt; }
  .ledger{ border-top:2px solid #d1be78; }
  .lrow{ display:grid; grid-template-columns:1fr .5in .8in .8in .8in .8in .8in; gap:.06in; align-items:center; padding:.06in 0; border-bottom:1px solid #eef1ee; }
  .lrow.head{ border-bottom:1px solid #003f28; color:#68786f; font-size:6.1pt; font-weight:800; letter-spacing:.01em; text-transform:uppercase; line-height:1.2; padding-bottom:.06in; align-items:end; }
  .lrow.head .rnum{ text-align:right; }
  .rlabel{ color:#173229; font-size:7.6pt; }
  .rnum{ text-align:right; color:#33453c; font-size:7.3pt; font-variant-numeric:tabular-nums; }
  .lrow.grand{ margin-top:.04in; border-top:1.5px solid #003f28; border-bottom:0; padding:.07in 0; }
  .lrow.grand .rlabel, .lrow.grand .rnum{ color:#003f28; font-weight:800; font-size:7.8pt; }
  p.footnote{ margin:.12in 0 0; color:#68786f; font-size:7pt; line-height:1.4; font-style:italic; }
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
  .change{ color:#0b7741; font-weight:700; }
  .change.is-down{ color:#a24b1e; }

  /* per-officer full page */
  .official-line{ display:flex; align-items:center; gap:.14in; margin:0 0 .16in; padding-bottom:.14in; border-bottom:1px solid #e4ebe7; }
  .official-line img{ width:.86in; height:.86in; border-radius:50%; object-fit:cover; flex:0 0 auto; border:2px solid #d1be78; box-shadow:0 2px 8px rgba(0,63,40,.12); }
  .official-line .etext{ display:flex; flex-direction:column; gap:.02in; }
  .official-line .elabel{ color:#b89521; font-size:7.2pt; font-weight:900; text-transform:uppercase; letter-spacing:.06em; }
  .official-line .ename{ color:#003f28; font:800 12.5pt Georgia, serif; }
  .official-line .etitle{ color:#68786f; font-size:8.2pt; }
  .comm-grid{ display:grid; grid-template-columns:repeat(5,1fr); gap:.1in; margin:0 0 .16in; }
  .comm-card{ padding:.09in .06in; border-radius:9px; background:#f4f6f4; text-align:center; }
  .comm-card img{ width:.55in; height:.55in; border-radius:50%; object-fit:cover; margin:0 auto .05in; display:block; }
  .comm-card b{ display:block; color:#003f28; font:800 8.6pt Georgia, serif; }
  .comm-card span{ display:block; margin-top:.02in; color:#68786f; font-size:6pt; font-weight:800; text-transform:uppercase; letter-spacing:.02em; }
  .qr-wrap{ margin-top:.09in; padding-top:.09in; border-top:1px solid rgba(255,255,255,.2); text-align:center; }
  .qr-wrap img.qr{ width:.72in; height:.72in; background:#fff; border-radius:4px; padding:3px; }
  .qr-wrap span{ display:block; margin-top:.02in; color:#a9c4b3; font-size:5.3pt; font-weight:800; text-transform:uppercase; letter-spacing:.03em; }
  .top-grid{ display:grid; grid-template-columns:1fr 1.9in; gap:.28in; margin-bottom:.14in; }
  h2.sec{ margin:0 0 .05in; color:#003f28; font:800 7.9pt Georgia, serif; text-transform:uppercase; letter-spacing:.03em; border:0; padding:0; }
  p.sof{ margin:0 0 .1in; color:#33453c; font-size:8pt; line-height:1.42; }
  .indep-box{ margin-top:.08in; padding:.1in .14in; background:#f9f8f2; border:1px solid #d1be78; border-radius:8px; }
  .indep-box p{ margin:0; color:#173229; font-size:7.8pt; line-height:1.4; }
  .side-card{ background:#003f28; border-radius:11px; padding:.15in .17in; color:#fff; }
  .side-fund{ color:#e7c95f; font-size:6.2pt; font-weight:800; text-transform:uppercase; letter-spacing:.03em; margin-bottom:.07in; }
  .side-stats{ display:flex; flex-direction:column; gap:.06in; margin-bottom:.09in; }
  .side-stats div{ display:flex; justify-content:space-between; align-items:baseline; gap:.08in; }
  .side-stats div b{ font:800 11pt Georgia, serif; white-space:nowrap; }
  .side-stats div span{ color:#a9c4b3; font-size:5.8pt; font-weight:800; text-transform:uppercase; letter-spacing:.02em; }
  .side-change{ text-align:center; padding:.06in 0; border-top:1px solid rgba(255,255,255,.2); border-bottom:1px solid rgba(255,255,255,.2); margin-bottom:.09in; }
  .side-change b{ font-size:11pt; }
  .side-change.up b{ color:#8fe0b0; }
  .side-change.down b{ color:#f0b090; }
  .side-change span{ display:block; color:#a9c4b3; font-size:5.8pt; font-weight:800; text-transform:uppercase; letter-spacing:.02em; }
  .side-split{ font-size:6.7pt; line-height:1.55; }
  .side-split div{ display:flex; justify-content:space-between; }
  .side-split b{ color:#e7c95f; }
  .lower-grid{ display:grid; grid-template-columns:1fr 1fr; gap:.24in; margin-bottom:.13in; }
  .rev-box p{ margin:0; color:#33453c; font-size:7.4pt; line-height:1.45; }
  .payer-row{ margin:0 0 .055in; padding-left:.09in; border-left:3px solid #d1be78; color:#33453c; font-size:6.8pt; line-height:1.3; }
  .payer-row b{ display:block; color:#003f28; font-size:7pt; }
  .source-trace{ margin-top:.04in !important; color:#68786f !important; font-size:5.7pt !important; line-height:1.28 !important; font-style:italic; }
  .fte-list{ margin:0; }
  .fte-row{ display:flex; justify-content:space-between; gap:.08in; padding:.035in 0; border-bottom:1px solid #f1f4f1; font-size:7.2pt; }
  .fte-row .fname{ color:#173229; }
  .fte-row b{ color:#003f28; white-space:nowrap; }
  .fte-empty{ color:#68786f; font-size:7.3pt; font-style:italic; }
  .lower-grid.three{ grid-template-columns:.95fr 1.05fr 1fr; }
  .con-row{ display:flex; justify-content:space-between; gap:.06in; padding:.026in 0; border-bottom:1px solid #f1f4f1; font-size:6.5pt; line-height:1.28; }
  .con-row .con-name{ color:#173229; }
  .con-row .con-name em{ display:block; color:#68786f; font-style:normal; font-size:5.9pt; }
  .con-row b{ color:#003f28; white-space:nowrap; }
  .con-more, .cap-more{ margin:.03in 0 0; color:#68786f; font-size:6.1pt; font-style:italic; }
  .cap-row{ display:flex; justify-content:space-between; gap:.06in; padding:.026in 0; border-bottom:1px solid #f1f4f1; font-size:6.5pt; line-height:1.28; }
  .cap-row span{ color:#173229; }
  .cap-row b{ color:#003f28; white-space:nowrap; }
  .cap-note{ margin:.04in 0 0; color:#68786f; font-size:6pt; font-style:italic; line-height:1.3; }
  .pos-summary{ display:flex; align-items:center; justify-content:center; gap:.3in; margin:.16in 0 0; padding:.16in; border:1px solid #e4ebe7; border-radius:11px; background:#fbfcfa; }
  .pos-summary .pnum{ text-align:center; }
  .pos-summary .pnum b{ display:block; color:#003f28; font:800 20pt Georgia, serif; }
  .pos-summary .pnum span{ display:block; margin-top:.03in; color:#68786f; font-size:6.6pt; font-weight:800; text-transform:uppercase; letter-spacing:.03em; }
  .pos-summary .parrow{ color:#d1be78; font-size:20pt; font-weight:800; }
  section.dense-profile p.sof{ font-size:7.55pt; line-height:1.34; }
  section.dense-profile .official-line{ margin-bottom:.11in; padding-bottom:.11in; }
`;

function fteChangeLabel(d) {
  if (d === 0) return "Unchanged";
  return (d > 0 ? "+" : "") + d + " FTE";
}

async function buildOfficerPage(o, pageNumber) {
  const delta = o.fy27 - o.fy26;
  const isDown = delta < 0;
  const dsign = delta >= 0 ? "+" : "&minus;";
  const payerHtml = whoPaysFor(o).map(([label, detail]) => `<div class="payer-row"><b>${label}</b>${detail}</div>`).join("");
  const denseClass = o.name === "Property Appraiser" ? " class=\"dense-profile\"" : "";

  const officialHtml = o.commissioners
    ? `<div class="comm-grid">${o.commissioners.map(([d, n, photo]) => `<div class="comm-card"><img src="${photoDataUrl(photo)}" alt="${n}"/><b>${n}</b><span>${d}</span></div>`).join("")}</div>`
    : `<div class="official-line"><img src="${photoDataUrl(o.photo)}" alt="${o.official}"${o.photoPosition ? ` style="object-position:${o.photoPosition}"` : ""}/><div class="etext"><span class="elabel">Elected Official</span><span class="ename">${o.official}</span><span class="etitle">${o.title}</span></div></div>`;

  let qrHtml = "";
  if (o.docUrl) {
    const dataUrl = await QRCode.toDataURL(o.docUrl, { margin: 0, width: 200, color: { dark: "#003f28", light: "#ffffff" } });
    qrHtml = `<div class="qr-wrap"><img class="qr" src="${dataUrl}" alt="QR"/><span>View Submitted Budget Request</span></div>`;
  }

  const fteHtml = (o.newPositions && o.newPositions.length)
    ? `<div class="fte-list">${o.newPositions.map((p) => `<div class="fte-row"><div class="fname">${p.title}</div><b>+${p.n} FTE</b></div>`).join("")}</div>`
    : `<p class="fte-empty">No new positions requested for FY2027.</p>`;

  const hasBreakouts = (o.contracts && o.contracts.length) || (o.capitalItems && o.capitalItems.length);
  const MAX_ROWS = 6;
  let conHtml = "";
  if (o.contracts && o.contracts.length) {
    const sorted = [...o.contracts].sort((a, b) => b.amount - a.amount);
    const shown = sorted.slice(0, MAX_ROWS);
    const hidden = sorted.slice(MAX_ROWS);
    conHtml = shown.map((c) => `<div class="con-row"><div class="con-name">${c.service}<em>${c.provider}</em></div><b>${money(c.amount)}</b></div>`).join("");
    if (hidden.length) conHtml += `<p class="con-more">+${hidden.length} more contract${hidden.length === 1 ? "" : "s"} &mdash; ${money(hidden.reduce((s, c) => s + c.amount, 0))} total</p>`;
  }
  let capHtml = "";
  if (o.capitalItems && o.capitalItems.length) {
    capHtml = o.capitalItems.map((c) => `<div class="cap-row"><span>${c.item}</span><b>${money(c.amount)}</b></div>`).join("");
    if (o.capitalNote) capHtml += `<p class="cap-note">${o.capitalNote}</p>`;
  }

  return `
  <section${denseClass}>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Constitutional Officers</small>
    <h1>${o.name}</h1>
    ${officialHtml}
    <div class="top-grid">
      <div>
        <h2 class="sec">Statement of Function</h2>
        <p class="sof">${o.sof}</p>
        <div class="indep-box"><p>Like all Constitutional Officers, this office operates as a separate entity, setting its own policies and procedures, employee hiring, and line-item budget management once its budget is approved.</p></div>
      </div>
      <div class="side-card">
        <div class="side-fund">${o.fund}</div>
        <div class="side-stats">
          <div><b>${money(o.fy26)}</b><span>FY2026 Total</span></div>
          <div><b>${money(o.fy27)}</b><span>FY2027 Total</span></div>
        </div>
        <div class="side-change ${isDown ? "down" : "up"}">
          <b>${dsign}${money(Math.abs(delta)).slice(1)}</b>
          <span>${pct(delta, o.fy26)} &middot; ${fteChangeLabel(o.fteDelta)} &middot; ${o.fte} FTE</span>
        </div>
        <div class="side-split">
          <div><span>Personnel</span><b>${money(o.personnel)}</b></div>
          ${o.contractual ? `<div><span>Contractual</span><b>${money(o.contractual)}</b></div>` : ""}
          <div><span>Operating</span><b>${money(o.operating)}</b></div>
          <div><span>Capital &amp; Other</span><b>${money(o.capital)}</b></div>
        </div>
        ${qrHtml}
      </div>
    </div>
    <div class="lower-grid${hasBreakouts ? " three" : ""}">
      <div class="rev-box"><h2>Who Pays</h2>${payerHtml}<p class="source-trace">Accounting sources: ${o.revenue}</p></div>
      ${hasBreakouts
        ? `<div class="con-box"><h2>Contracts</h2>${conHtml || `<p class="fte-empty">No contracted services identified.</p>`}</div><div class="cap-box"><h2>Capital Requests &mdash; FY2027</h2>${capHtml || `<p class="fte-empty">No capital requests for FY2027.</p>`}</div>`
        : `<div class="fte-box"><h2>FTE Changes, FY2027</h2>${fteHtml}</div>`}
    </div>
    <div class="pos-summary">
      <div class="pnum"><b>${o.ftePrior}</b><span>Prior Year FTE</span></div>
      <div class="parrow">&rarr;</div>
      <div class="pnum"><b>${o.fte}</b><span>Tentative FTE</span></div>
    </div>
    ${o.footnote ? `<p class="footnote">*${o.footnote}</p>` : ""}
    <footer><span>FY 2027 Tentative Budget</span><b>${pageNumber}</b></footer>
  </section>`;
}

function summaryRowHtml(r) {
  const [name, fte, fy26, fy27, personnel, operating, capital] = r;
  return `<div class="lrow"><div class="rlabel">${name}</div><div class="rnum">${fte}</div><div class="rnum">${money(fy26)}</div><div class="rnum">${money(fy27)}</div><div class="rnum">${money(personnel)}</div><div class="rnum">${money(operating)}</div><div class="rnum">${money(capital)}</div></div>`;
}

const startPage = Number(process.argv[3] || 80);
let pageCounter = startPage;

const overviewPage = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Constitutional Officers</small>
    <h1>Constitutional Officers Ledger</h1>
    <p class="intro">Walton County's five independently elected offices and the Board of County Commissioners budget a combined $148.9M and employ 847 FTE for FY2027. Each office's own page follows, with its Statement of Function, elected official, revenue sources, and any new positions requested for FY2027.</p>
    <div class="stat-strip">${STATS.map(([v, l]) => `<div class="stat-card"><b>${v}</b><span>${l}</span></div>`).join("")}</div>
    <div class="split-row">${SPLIT.map(([l, v, p]) => `<div class="split-card"><b>${v}</b><span>${l}</span><em>${p} of the total</em></div>`).join("")}</div>
    <h2>Office Summary</h2>
    <div class="ledger">
      <div class="lrow head"><div class="rlabel">Office</div><div class="rnum">FTE</div><div class="rnum">FY26 Total</div><div class="rnum">FY27 Total</div><div class="rnum">Personnel</div><div class="rnum">Operating</div><div class="rnum">Capital &amp; Other</div></div>
      ${SUMMARY_ROWS.map(summaryRowHtml).join("")}
      <div class="lrow grand"><div class="rlabel">${SUMMARY_TOTAL[0]}</div><div class="rnum">${SUMMARY_TOTAL[1]}</div><div class="rnum">${money(SUMMARY_TOTAL[2])}</div><div class="rnum">${money(SUMMARY_TOTAL[3])}</div><div class="rnum">${money(SUMMARY_TOTAL[4])}</div><div class="rnum">${money(SUMMARY_TOTAL[5])}</div><div class="rnum">${money(SUMMARY_TOTAL[6])}</div></div>
    </div>
    <p class="footnote">*Board of County Commissioners' total includes a $500,000 (FY2026) / $400,000 (FY2027) statutory Other Uses Contingency reserve, which the Expenditure Ledger shows separately under its "Other Uses" functional classification rather than under General Government &mdash; both are the same dollars, presented two different ways in this book. The "Capital &amp; Other" column reflects the same combined presentation used in the live Constitutional Officers data.</p>
    <footer><span>FY 2027 Tentative Budget</span><b>${pageCounter}</b></footer>
  </section>
`;
pageCounter++;

const officePagesArr = [];
for (const o of OFFICES) {
  officePagesArr.push(await buildOfficerPage(o, pageCounter));
  pageCounter++;
}
const officePagesHtml = officePagesArr.join("\n");

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Constitutional Officers Ledger</title>
<style>${sharedCss}</style></head>
<body>${overviewPage}${officePagesHtml}</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-constitutional-officers-ledger.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath + " (" + (1 + OFFICES.length) + " pages)");
