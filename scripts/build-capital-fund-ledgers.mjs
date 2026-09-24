import { chromium } from "playwright";

// Rebuilds six capital fund ledgers that had never been touched since
// the original raw PDF capture -- Machinery/Vehicles/Equipment,
// Transportation and Infrastructure, Tourist Development Fund, Sheriff
// Capital Project, Recreation Plat Fee Fund, and Sidewalk Fund -- to
// match the shared design system (header/footer/kicker/h1, dark-green
// #003f28 stat cards and table headers, gold #d1be78 rules) instead of
// their unstyled raw-capture appearance.
//
// Machinery Ledger: rather than re-listing all ~60 items (15 of the 16
// departments represented already have this same itemized detail on
// their own page in the Departments and Services chapter -- duplicating
// it here would just be redundant), this page summarizes by department
// and points to that chapter, EXCEPT for Beach Operations, Beach Tram,
// and Tourism Administration -- whose profile pages summarize their
// service budgets while this ledger preserves item-level capital detail.
// Every department
// total below is independently verified: they sum to exactly $7,120,300,
// the page's own published total.

const sharedCss = `
  @page{ size:letter portrait; margin:0; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ font-family:Arial, Helvetica, sans-serif; color:#173229; }
  section{
    position:relative;
    width:8.5in;
    height:11in;
    padding:.5in .6in .5in;
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
  .kicker{ display:block; margin-top:.18in; color:#b89521; font-size:8pt; font-weight:900; letter-spacing:.14em; text-transform:uppercase; }
  h1{ margin:7px 0 .07in; color:#003f28; font:800 19pt/1.05 Georgia, "Times New Roman", serif; letter-spacing:-.02em; }
  h1.continued{ font-size:14.5pt; margin-top:.16in; }
  h1 span.sub{ color:#68786f; font-size:8.5pt; font-weight:400; }
  p.intro{ max-width:7.3in; margin:0 0 .09in; color:#33453c; font-size:8.2pt; line-height:1.4; }
  h2{ margin:.09in 0 .04in; color:#003f28; font:800 10.5pt/1.2 Georgia, serif; padding-bottom:.045in; border-bottom:2px solid #d1be78; }
  .stat-strip{ display:grid; grid-template-columns:repeat(4,1fr); gap:.1in; margin:0 0 .13in; }
  .stat-card{ padding:.1in .08in; border-radius:9px; background:#003f28; text-align:center; }
  .stat-card b{ display:block; color:#fff; font:800 12pt/1.1 Georgia, serif; }
  .stat-card span{ display:block; margin-top:.03in; color:#e7c95f; font-size:5.8pt; font-weight:800; letter-spacing:.02em; text-transform:uppercase; line-height:1.2; }
  table{ width:100%; border-collapse:collapse; table-layout:fixed; font-size:6.6pt; line-height:1.15; }
  thead{ display:table-header-group; }
  th{ padding:3.5px 5px; background:#003f28; color:#fff; border-bottom:2px solid #d1be78; font-size:6.2pt; text-align:left; letter-spacing:.01em; }
  td{ padding:2.6px 5px; border-bottom:1px solid #dce5e0; vertical-align:top; }
  tbody tr:nth-child(even):not(.grand) td{ background:#f7f9f8; }
  .num{ text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
  tr.grand td{ border-top:1.5px solid #003f28; border-bottom:0; font-weight:800; color:#003f28; background:#fff; padding-top:5px; }
  .fund-table th:nth-child(1){ width:22%; } .fund-table th:nth-child(2){ width:44%; } .fund-table th:nth-child(3){ width:14%; text-align:right; } .fund-table th:nth-child(4){ width:20%; text-align:right; }
  .dept-table th:nth-child(1){ width:46%; } .dept-table th:nth-child(2){ width:18%; text-align:right; } .dept-table th:nth-child(3){ width:36%; text-align:right; }
  .item-table th:nth-child(1){ width:42%; } .item-table th:nth-child(2){ width:19%; } .item-table th:nth-child(3){ width:16%; } .item-table th:nth-child(4){ width:12%; } .item-table th:nth-child(5){ width:11%; text-align:right; }
  .item-table2{ margin-bottom:.06in; }
  .item-table2 th:nth-child(1){ width:78%; } .item-table2 th:nth-child(2){ width:22%; text-align:right; }
  .item-cols{ column-count:2; column-gap:.3in; }
  .item-cols .item-block{ break-inside:avoid; }
  .item-cols h2{ margin-top:.12in !important; font-size:9.4pt !important; }
  .item-cols table{ font-size:7.4pt; line-height:1.3; }
  .item-cols th{ padding:5px; font-size:6.8pt; }
  .item-cols td{ padding:5px; }
  .proj-table th:nth-child(1){ width:44%; } .proj-table th:nth-child(2){ width:36%; } .proj-table th:nth-child(3){ width:20%; text-align:right; }
  .profile-table{ font-size:6.15pt; line-height:1.17; }
  .profile-table th:nth-child(1){ width:50%; }
  .profile-table th:nth-child(2){ width:14%; }
  .profile-table th:nth-child(3){ width:20%; }
  .profile-table th:nth-child(4){ width:16%; text-align:right; }
  .profile-table td{ padding:1.7px 5px; }
  .profile-table tr.subhead td{ padding:4px 5px; background:#f1eddc !important; color:#795f0c; font-size:5.8pt; font-weight:800; letter-spacing:.03em; text-transform:uppercase; }
  .profile-table .project-name{ display:block; color:#003f28; font-weight:800; font-size:6.55pt; }
  .profile-table .project-funding{ display:block; margin-top:1px; color:#68786f; font-size:5.6pt; }
  .profile-table .project-benefit{ display:block; margin-top:1px; color:#33453c; font-size:5.65pt; line-height:1.2; }
  .profile-table .type{ color:#795f0c; font-weight:800; }
  .impact-key{ display:grid; grid-template-columns:repeat(3,1fr); gap:.08in; margin:.08in 0 .1in; }
  .impact-key div{ padding:.07in .08in; border:1px solid #dce5e0; border-radius:7px; background:#f7f9f8; }
  .impact-key b{ display:block; color:#003f28; font-size:6.4pt; }
  .impact-key span{ display:block; margin-top:2px; color:#52655b; font-size:5.65pt; line-height:1.25; }
  p.note{ margin:.1in 0 0; color:#68786f; font-size:6.8pt; line-height:1.38; font-style:italic; }
  p.footnote{ margin:.08in 0 0; color:#68786f; font-size:6.8pt; line-height:1.38; font-style:italic; }
  .pointer{ margin:.08in 0 0; padding:.09in .13in; background:#f9f8f2; border:1px solid #d1be78; border-radius:8px; color:#173229; font-size:7.2pt; line-height:1.4; }
  footer{
    position:absolute;
    left:.6in;
    right:.6in;
    bottom:.28in;
    display:flex;
    justify-content:space-between;
    border-top:1px solid #cbd8d1;
    padding-top:6px;
    color:#68786f;
    font-size:7pt;
    font-weight:800;
    letter-spacing:.08em;
    text-transform:uppercase;
  }
`;

function money(n) { return "$" + Math.round(n).toLocaleString("en-US"); }

function fundTable(rows, total) {
  return `<table class="fund-table"><thead><tr><th>Fund</th><th>Revenue Source</th><th>Share</th><th>Amount</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="num">${r[2]}</td><td class="num">${money(r[3])}</td></tr>`).join("")}
    <tr class="grand"><td colspan="3">Total</td><td class="num">${money(total)}</td></tr>
  </tbody></table>`;
}

// ============================== PAGE SET 1: MACHINERY, VEHICLES & EQUIPMENT ==============================

const MACHINERY_FUNDING = [
  ["General Fund", "Local Government 1/2 Cent Sales Tax", "6.9%", 493000],
  ["General Fund", "Beach Activity &amp; Event Permits", "2.1%", 148800],
  ["General Fund", "Property Taxes", "1.2%", 85000],
  ["General Fund", "Planning Fees", "0.8%", 60000],
  ["General Fund", "Short-Term Rental Certificate Fee", "0.7%", 49000],
  ["Mosquito Control Fund", "Property Taxes", "1.3%", 91000],
  ["Solid Waste Fund", "Local Discretionary Sales Surtax", "25.1%", 1790000],
  ["Tourist Development Fund", "Tourist Development Taxes", "26.1%", 1859500],
  ["Transportation Fund", "State Fuel Taxes", "35.1%", 2499000],
  ["Transportation Fund", "Local Option Fuel Tax", "0.6%", 45000]
];
const MACHINERY_TOTAL = 7120300;

// [department, items, total] -- every department's full item-level detail
// now appears on the following pages instead of pointing back to its own
// department page, so no "covered elsewhere" flag is needed here.
// Ordered to match the department list order used throughout the book
// (the same order departments appear in the Departments and Services chapter).
const MACHINERY_BY_DEPT = [
  ["Building Construction &amp; Maintenance", 7, 316000],
  ["Code Compliance", 6, 148800],
  ["County Administration", 1, 65000],
  ["Eagle Springs Golf and Recreation Center", 2, 81000],
  ["Emergency Management", 2, 25000],
  ["Engineering Department", 1, 45000],
  ["Environmental Resources", 2, 20000],
  ["Extension Office", 1, 40000],
  ["Human Resources", 1, 31000],
  ["Mosquito Control", 3, 91000],
  ["Planning", 2, 109000],
  ["Public Works", 17, 2499000],
  ["Solid Waste", 8, 1790000],
  ["Tourism Administration", 1, 50000],
  ["Beach Operations", 19, 1302500],
  ["Beach Tram", 4, 507000]
];

// [item description, amount] -- one array per department, in the same
// order as MACHINERY_BY_DEPT above. Each department's items are the exact
// capitalItems already verified on that department's own page in the
// Departments and Services chapter (machinery/vehicles/equipment only --
// building or infrastructure capital items, and any requested-but-not-
// funded item, are excluded here the same way they're excluded from this
// ledger's department totals above).
const PUBLIC_WORKS_ITEMS = [
  ["21-Yard Dump Truck (New) &times;5 &mdash; Districts 1&ndash;5", 1225000],
  ["Mid-size Excavator (New) &times;2", 318000],
  ["3/4 Ton Crew Cab Truck w/Utility Body (Replacement) &times;3", 195000],
  ["Service Truck w/Lube Body (New)", 195000],
  ["Mid-size Excavator w/Mulching Head (New)", 186000],
  ["Flatbed Dump Truck (New)", 165000],
  ["1/2 Ton Pickup Crew Cab w/Fuel Transfer Tank (Replacement) &times;2", 116000],
  ["75-80 hp Tractor w/Loader, Grapple, Forks (New)", 85000],
  ["1,000 Gal Water Tank w/Pump &amp; Chemical Rack (New)", 14000]
];
const SOLID_WASTE_ITEMS = [
  ["Compactor (New)", 1150000],
  ["10,000 lb Lull &amp; Attachments (New)", 200000],
  ["Service Truck &amp; Tools (New)", 200000],
  ["Pickup Truck 4x4 (New) &times;2", 125000],
  ["Mini-Skid Steer &amp; Attachments (New)", 60000],
  ["Roll-off Dumpsters (New)", 40000],
  ["Gate Arm for Transfer Station (New)", 15000]
];
const BEACH_OPERATIONS_ITEMS = [
  ["18k Hunter 4-post Lift (Replacement)", 50000],
  ["Snap On Zeus Shop Diagnostic Tool (New)", 18000],
  ["Telehandler Lift (New)", 150000],
  ["Portable Change Message Board (Replacement) &mdash; BCC Repl. #8323", 25000],
  ["Portable Change Message Board (Replacement) &mdash; BCC Repl. #8637", 25000],
  ["Turo Dingo Lift Landscape (New)", 70000],
  ["20' Trailer (Replacement) &mdash; BCC Repl. #4369", 9000],
  ["16' Utility Trailer (Replacement) &mdash; BCC Repl. #3963", 5000],
  ["14k Tilt Trailer (Replacement) &mdash; BCC Repl. #8880", 12000],
  ["Ford Transit Van, Additional Staff (New)", 70000],
  ["Bronco Sport/Ranger, Administration (New)", 35000],
  ["Trash Compactor (New)", 100000],
  ["F250 Super Cab 4x4, New Specialist Position (New)", 78000],
  ["F250 Super Cab 4x4, New Specialist Position (New)", 78000],
  ["F250 Super Cab 4x4, Service Electrician Helper (New)", 101000],
  ["F250 Super Cab 4x4, New Landscape Tech (New)", 101000],
  ["F250 Super Cab 4x4 (Replacement) &mdash; BCC Repl. #8635", 101000],
  ["F150 Super Cab 4x4 (Replacement) &mdash; BCC Repl. #9043", 74500],
  ["Truck Wash System (New)", 200000]
];
const BEACH_TRAM_ITEMS = [
  ["2027 Starcraft ADA Shuttle (Replacement) &mdash; BCC Repl. #10284", 155000],
  ["2027 Ford Ranger XLT 2WD Crew Cab (New)", 42000],
  ["2027 Starcraft ADA Shuttle (Replacement) &mdash; BCC Repl. #10289", 155000],
  ["2027 Starcraft ADA Shuttle (Replacement) &mdash; BCC Repl. #10287", 155000]
];
const BUILDING_CM_ITEMS = [
  ["Crew Cab Truck (Replacement) &times;2", 136000],
  ["Van (Replacement) &times;2", 90000],
  ["52&quot; Lawn Mower (New) &times;2", 22000],
  ["Crew Cab Truck &mdash; New Morrison Springs Attendant (New)", 68000]
];
const PLANNING_ITEMS = [
  ["SUV (Replacement)", 60000],
  ["Short-Term Rental SUV (New)", 49000]
];
const CODE_COMPLIANCE_ITEMS = [
  ["SUV (Replacement) &times;2", 72000],
  ["UTV (New) &times;4", 76800]
];
const MOSQUITO_CONTROL_ITEMS = [
  ["4x4 Cab Truck (New)", 55000],
  ["ULV Spray Unit (New) &times;2", 36000]
];
const EAGLE_SPRINGS_GOLF_ITEMS = [
  ["Reel Grinder (New)", 68000],
  ["Golf Lift (New)", 13000]
];
const COUNTY_ADMIN_ITEMS = [
  ["SUV (New)", 65000]
];
const TOURISM_ADMIN_ITEMS = [
  ["SUV (Replacement) &mdash; BCC Repl. #8668", 50000]
];
const ENGINEERING_ITEMS = [
  ["4x4 Crew Cab Truck (New)", 45000]
];
const EXTENSION_OFFICE_ITEMS = [
  ["4x4 Crew Cab Truck (Replacement)", 40000]
];
const HUMAN_RESOURCES_ITEMS = [
  ["SUV (Replacement)", 31000]
];
const ENVIRONMENTAL_RESOURCES_ITEMS = [
  ["ATV Side-by-side (New)", 17500],
  ["ATV Trailer (New)", 2500]
];
const EMERGENCY_MANAGEMENT_ITEMS = [
  ["UTV (Replacement)", 15000],
  ["Harris XL 200 Radio (New)", 10000]
];

function deptTable(rows) {
  return `<table class="dept-table"><thead><tr><th>Department</th><th>Items</th><th>FY2027 Amount</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td><td class="num">${money(r[2])}</td></tr>`).join("")}
    <tr class="grand"><td>All Departments</td><td class="num">77</td><td class="num">${money(MACHINERY_TOTAL)}</td></tr>
  </tbody></table>`;
}

function itemTable(rows, dept) {
  return `<div class="item-block"><h2 style="margin-top:.08in;font-size:8.6pt;">${dept}</h2><table class="item-table2"><thead><tr><th>Item Description</th><th>Amount</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${r[0]}</td><td class="num">${money(r[1])}</td></tr>`).join("")}
  </tbody></table></div>`;
}

const machineryPage1 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Capital Budget</small>
    <h1>Machinery, Vehicles, &amp; Equipment Ledger</h1>
    <p class="intro">Budgeted machinery, vehicles, and equipment by department for FY2027, funded from ten revenue sources across six funds.</p>
    <div class="stat-strip">
      <div class="stat-card"><b>${money(MACHINERY_TOTAL)}</b><span>Total FY2027 Funding</span></div>
      <div class="stat-card"><b>77</b><span>Items, All Departments</span></div>
      <div class="stat-card"><b>16</b><span>Departments Represented</span></div>
      <div class="stat-card"><b>6</b><span>Funds</span></div>
    </div>
    <h2>Funding by Revenue Source</h2>
    ${fundTable(MACHINERY_FUNDING, MACHINERY_TOTAL)}
    <h2>By Department</h2>
    ${deptTable(MACHINERY_BY_DEPT)}
    <footer><span>FY 2027 Final Budget</span><b>${"{{PAGE1}}"}</b></footer>
  </section>
`;

const machineryPage2 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h1 class="continued">Machinery, Vehicles, &amp; Equipment Ledger <span class="sub">(continued)</span></h1>
    <p class="intro">Itemized FY2027 requests follow the same department order as the overview ledger.</p>
    <div class="item-cols">
      ${itemTable(BUILDING_CM_ITEMS, "Building Construction &amp; Maintenance &mdash; $316,000")}
      ${itemTable(CODE_COMPLIANCE_ITEMS, "Code Compliance &mdash; $148,800")}
      ${itemTable(COUNTY_ADMIN_ITEMS, "County Administration &mdash; $65,000")}
      ${itemTable(EAGLE_SPRINGS_GOLF_ITEMS, "Eagle Springs Golf and Recreation Center &mdash; $81,000")}
      ${itemTable(EMERGENCY_MANAGEMENT_ITEMS, "Emergency Management &mdash; $25,000")}
      ${itemTable(ENGINEERING_ITEMS, "Engineering Department &mdash; $45,000")}
      ${itemTable(ENVIRONMENTAL_RESOURCES_ITEMS, "Environmental Resources &mdash; $20,000")}
      ${itemTable(EXTENSION_OFFICE_ITEMS, "Extension Office &mdash; $40,000")}
      ${itemTable(HUMAN_RESOURCES_ITEMS, "Human Resources &mdash; $31,000")}
      ${itemTable(MOSQUITO_CONTROL_ITEMS, "Mosquito Control &mdash; $91,000")}
      ${itemTable(PLANNING_ITEMS, "Planning &mdash; $109,000")}
      ${itemTable(SOLID_WASTE_ITEMS, "Solid Waste &mdash; $1,790,000")}
    </div>
    <footer><span>FY 2027 Final Budget</span><b>${"{{PAGE2}}"}</b></footer>
  </section>
`;

const machineryPage3 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h1 class="continued">Machinery, Vehicles, &amp; Equipment Ledger <span class="sub">(continued)</span></h1>
    <p class="intro">The remaining itemized FY2027 requests, in the same department order as the overview ledger. Tourism Administration, Beach Operations, and Beach Tram are funded by Tourist Development Taxes.</p>
    <div class="item-cols">
      ${itemTable(PUBLIC_WORKS_ITEMS, "Public Works &mdash; $2,499,000")}
      ${itemTable(TOURISM_ADMIN_ITEMS, "Tourism Administration &mdash; $50,000")}
      ${itemTable(BEACH_TRAM_ITEMS, "Beach Tram &mdash; $507,000")}
      ${itemTable(BEACH_OPERATIONS_ITEMS, "Beach Operations &mdash; $1,302,500")}
    </div>
    <p class="footnote">Requested but not included in the FY2027 budget: Environmental Resources' Vessel &amp; Trailer, $60,000 (Property Taxes) &mdash; shown on that department's own page in the Board Department Budgets chapter.</p>
    <footer><span>FY 2027 Final Budget</span><b>${"{{PAGE3}}"}</b></footer>
  </section>
`;

// ============================== PAGE SET 2: TRANSPORTATION AND INFRASTRUCTURE ==============================

const TRANS_FUNDING = [
  ["Capital Projects Fund", "Property Taxes", "38.5%", 9451172],
  ["Capital Projects Fund", "Balance Brought Forward", "35.0%", 8584562],
  ["General Fund", "Managed Vendor Program Revenue", "6.2%", 1530000],
  ["General Fund", "Property Taxes", "0.6%", 155000],
  ["General Fund", "Local Government 1/2 Cent Sales Tax", "0.5%", 125000],
  ["General Fund", "Vessel Registration Fees", "0.4%", 100000],
  ["General Fund", "Short-Term Rental Certificate Fee", "0.4%", 100000],
  ["Transportation Fund", "Local Option Fuel Tax", "18.3%", 4500000]
];
const TRANS_TOTAL = 24545734;

const TRANS_PROJECTS = [
  ["Hewett Bayou Connector Rd (E Lamb Drive Extension)", "Capital Projects Fund &middot; Property Taxes", 4571536],
  ["Holiday Shores Drainage &amp; Pedestrian Improvements Phase IIB", "Transportation Fund &middot; Local Option Fuel Tax", 4000000],
  ["Holiday Shores Drainage &amp; Pedestrian Improvements Phase IIA", "Capital Projects Fund &middot; Property Taxes", 3000000],
  ["Recreational Infrastructure", "Capital Projects Fund &middot; Property Taxes", 2983198],
  ["Cook Road Reconstruction", "Capital Projects Fund &middot; Property Taxes", 442500],
  ["Driftwood &amp; US 98 Intersection Signalization", "Capital Projects Fund &middot; Property Taxes", 1400000],
  ["Board-Approved Capital Improvements (Managed Vendor Program Revenue)", "General Fund", 1530000],
  ["Pavement Management (PCI)", "Capital Projects Fund &middot; Property Taxes", 900000],
  ["Poinciana Blvd &amp; Scenic Hwy 98 Intersection Signalization", "Capital Projects Fund &middot; Property Taxes", 900000],
  ["Roof Replacement, Fire Station 4 DeFuniak Springs", "Capital Projects Fund &middot; Property Taxes", 515000],
  ["Madge Lane &amp; Sally Lane Roadway &amp; Drainage Improvements", "Transportation Fund &middot; Local Option Fuel Tax", 450000],
  ["Sugar Drive Connector Rd", "Capital Projects Fund &middot; Property Taxes", 600000],
  ["E Bay Loop (CR 83A E) Northbound Right Turn Lane", "Capital Projects Fund &middot; Property Taxes", 300000],
  ["Long Road Bridge Replacement #604130", "Capital Projects Fund &middot; Property Taxes", 400000],
  ["N Orange Street Pedestrian Improvements", "Capital Projects Fund &middot; Property Taxes", 340000],
  ["Holiday Rd &amp; CR 2378 (Scenic Gulf Drive) Intersection Improvements", "Capital Projects Fund &middot; Property Taxes", 225000],
  ["CR 83 N (Blue Mountain Rd) Extension from US 98 To Chat Holley", "Capital Projects Fund &middot; Property Taxes", 250000],
  ["Chat Holley &amp; US 331 Intersection Improvements (Long Term Option)", "Capital Projects Fund &middot; Property Taxes", 260000],
  ["South Orange Street Pedestrian Improvements", "Capital Projects Fund &middot; Property Taxes", 200000],
  ["CR 30A Sidewalk From Ventana Blvd To Blue Gulf Drive", "Capital Projects Fund &middot; Property Taxes", 174000],
  ["Seven Oaks Road Paving (Resurfacing)", "Capital Projects Fund &middot; Property Taxes", 154500],
  ["Board-Approved Capital Improvements", "General Fund &middot; Property Taxes", 75000],
  ["Eagle Springs Golf and Recreation Center Infrastructure", "General Fund &middot; Local Gov't 1/2 Cent Sales Tax", 125000],
  ["County Line Road Paving (Resurfacing)", "Capital Projects Fund &middot; Property Taxes", 141000],
  ["Boating Improvements (Vessel Registration Fees)", "General Fund", 100000],
  ["Planning Short-Term Rental Building Improvements", "General Fund &middot; Short-Term Rental Cert. Fee", 100000],
  ["Watson Road Paving (Resurfacing)", "Capital Projects Fund &middot; Property Taxes", 279000],
  ["Oakwood Lakes @ Hwy 331 South Turn Lane", "Transportation Fund &middot; Local Option Fuel Tax", 50000],
  ["Recreation Building Improvements", "General Fund &middot; Property Taxes", 30000],
  ["Procurement Building Improvements", "General Fund &middot; Property Taxes", 50000]
];

// Sort before pagination so both project pages form one descending list.
TRANS_PROJECTS.sort((a, b) => b[2] - a[2]);

const GRANT_LEDGER = [
  ["CR 280 Bob Sikes Roadway Resurfacing Project Phase 1", "Grant Funded &middot; State or Federal Funding", 4222841]
];

const IN_HOUSE_ENGINEERING = [
  ["Alderberry Connector Road Extension", 600000],
  ["Holiday Shores Drainage &amp; Pedestrian Improvements Phase IIA", 360000],
  ["Sugar Drive Connector Rd", 300000],
  ["N Orange Street Pedestrian Improvements", 108800],
  ["E Bay Loop (CR 83A E) Northbound Right Turn Lane", 96000],
  ["Madge Lane &amp; Sally Lane Roadway &amp; Drainage Improvements", 86400],
  ["South Orange Street Pedestrian Improvements", 43200],
  ["CR 30A Sidewalk From Ventana Blvd To Blue Gulf Drive", 55680],
  ["Oakwood Lakes @ Hwy 331 South Turn Lane", 10800]
];
const IN_HOUSE_TOTAL = 1660880;

const PROJECT_DETAILS = {
  "Hewett Bayou Connector Rd (E Lamb Drive Extension)": ["New capacity", "Construction", "New roadway and bridge will add future maintenance; cost estimate pending.", "Adds an alternate route, improves network resilience, and supports emergency response."],
  "Holiday Shores Drainage &amp; Pedestrian Improvements Phase IIB": ["Rehabilitation", "Construction", "Maintenance absorbed within the existing transportation program.", "Improves drainage and provides safer pedestrian connections."],
  "Holiday Shores Drainage &amp; Pedestrian Improvements Phase IIA": ["Rehabilitation", "Construction", "Maintenance absorbed within the existing transportation program.", "Improves drainage and provides safer pedestrian connections."],
  "Recreational Infrastructure": ["Improvement", "Project selection", "Operating impact will be evaluated when individual projects are identified.", "Preserves and improves public recreation assets."],
  "Cook Road Reconstruction": ["Rehabilitation", "Construction", "No material new operating cost; timely work may reduce near-term repairs.", "Extends pavement life, improves ride quality, and avoids more costly reconstruction."],
  "Driftwood &amp; US 98 Intersection Signalization": ["Safety/capacity", "Design &amp; construction", "Minor ongoing signal maintenance is anticipated.", "Improves intersection safety and traffic operations."],
  "Board-Approved Capital Improvements (Managed Vendor Program Revenue)": ["Program reserve", "Board direction pending", "Evaluated when projects are selected.", "Preserves flexibility for Board-approved capital priorities."],
  "Pavement Management (PCI)": ["Asset preservation", "Program delivery", "No material new operating cost; supports preventive maintenance.", "Directs resurfacing resources to the roads with the greatest condition need."],
  "Poinciana Blvd &amp; Scenic Hwy 98 Intersection Signalization": ["Safety/capacity", "Construction-ready", "Minor ongoing signal maintenance is anticipated.", "Improves vehicle operations and pedestrian safety."],
  "Roof Replacement, Fire Station 4 DeFuniak Springs": ["Replacement", "Construction", "No material new operating cost; may reduce repair exposure.", "Protects the existing public-safety facility and extends its useful life."],
  "Madge Lane &amp; Sally Lane Roadway &amp; Drainage Improvements": ["Rehabilitation", "Design &amp; construction", "No material new operating cost; maintenance remains in the road program.", "Paves existing roads and improves stormwater drainage."],
  "Sugar Drive Connector Rd": ["New capacity", "Design", "New roadway will add future maintenance; cost estimate pending.", "Adds connectivity and incorporates complete-street elements."],
  "E Bay Loop (CR 83A E) Northbound Right Turn Lane": ["Safety/capacity", "Design, permitting &amp; construction", "Maintenance absorbed within the existing transportation program.", "Reduces turning conflicts and improves intersection operations."],
  "Long Road Bridge Replacement #604130": ["Replacement", "Project development", "No material new operating cost; replacement reduces asset-failure risk.", "Preserves a safe and reliable crossing."],
  "N Orange Street Pedestrian Improvements": ["Safety/access", "Project development", "Minor sidewalk maintenance will be absorbed within existing operations.", "Expands safe pedestrian access."],
  "Holiday Rd &amp; CR 2378 (Scenic Gulf Drive) Intersection Improvements": ["Safety/capacity", "Project development", "Maintenance absorbed within the existing transportation program.", "Improves intersection safety and traffic movement."],
  "CR 83 N (Blue Mountain Rd) Extension from US 98 To Chat Holley": ["New capacity", "Design", "New roadway will add future maintenance; cost estimate pending.", "Expands the roadway network and creates an alternate connection."],
  "Chat Holley &amp; US 331 Intersection Improvements (Long Term Option)": ["Safety/capacity", "Design", "Maintenance absorbed within the existing transportation program.", "Adds turn-lane capacity, lighting, and safer traffic movements."],
  "South Orange Street Pedestrian Improvements": ["Safety/access", "Construction", "Minor sidewalk maintenance will be absorbed within existing operations.", "Connects US 98 with Inlet Beach Regional Access Park."],
  "CR 30A Sidewalk From Ventana Blvd To Blue Gulf Drive": ["Safety/access", "Design &amp; construction", "Minor sidewalk maintenance will be absorbed within existing operations.", "Closes a pedestrian-network gap along CR 30A."],
  "Seven Oaks Road Paving (Resurfacing)": ["Rehabilitation", "Construction", "No material new operating cost; timely work may reduce near-term repairs.", "Extends pavement life and improves roadway safety and ride quality."],
  "Board-Approved Capital Improvements": ["Program reserve", "Board direction pending", "Evaluated when projects are selected.", "Preserves flexibility for Board-approved capital priorities."],
  "Eagle Springs Golf and Recreation Center Infrastructure": ["Improvement", "Project development", "Operating impact will be evaluated with the final scope.", "Preserves and improves a public recreation asset."],
  "County Line Road Paving (Resurfacing)": ["Rehabilitation", "Construction", "No material new operating cost; timely work may reduce near-term repairs.", "Extends pavement life and improves roadway safety and ride quality."],
  "Boating Improvements (Vessel Registration Fees)": ["Improvement", "Project selection", "Operating impact will be evaluated with the final scope.", "Improves eligible public boating access and supporting infrastructure."],
  "Planning Short-Term Rental Building Improvements": ["Rehabilitation", "Project development", "No material new operating cost anticipated.", "Preserves the facility used to deliver short-term-rental services."],
  "Watson Road Paving (Resurfacing)": ["Rehabilitation", "Construction", "No material new operating cost; timely work may reduce near-term repairs.", "Extends pavement life and improves roadway safety and ride quality."],
  "Oakwood Lakes @ Hwy 331 South Turn Lane": ["Safety/capacity", "Project development", "Maintenance absorbed within the existing transportation program.", "Reduces vehicle queuing and turning conflicts at US 331."],
  "Recreation Building Improvements": ["Rehabilitation", "Project development", "No material new operating cost anticipated.", "Preserves County recreation facilities."],
  "Procurement Building Improvements": ["Rehabilitation", "Project development", "No material new operating cost anticipated.", "Preserves the facility supporting County procurement operations."],
  "CR 280 Bob Sikes Roadway Resurfacing Project Phase 1": ["Rehabilitation", "Construction anticipated in 2027", "No material new operating cost; rehabilitation may reduce near-term repairs.", "Adds safety and drainage improvements while extending pavement life."]
  ,"Beach Renourishment (Additional Funds for Future Project)": ["Recurring capital commitment", "Future project reserve", "No new FY2027 operating cost; future project costs will be defined with scope.", "Preserves shoreline, storm protection, public beaches, and the tourism asset.", "Funded in FY2027"]
  ,"30A Gateway Improvements": ["Improvement", "Project development", "Operating impact will be evaluated with the final scope.", "Improves a major visitor gateway and supporting public infrastructure.", "Funded in FY2027"]
  ,"US 331 Bridge Lighting": ["Improvement", "Previously funded", "Future energy and maintenance responsibilities should be confirmed before activation.", "Improves nighttime visibility and the appearance of a major gateway.", "Funded in a prior year"]
  ,"Boardwalk Dune Walkover Repair/Replacement": ["Rehabilitation", "Previously funded", "Replacement may reduce near-term repair exposure.", "Preserves safe public beach access and protects sensitive dunes.", "Funded in a prior year"]
  ,"Multi-use Path, 30A Rebuild 83 to 393": ["Rehabilitation", "Previously funded", "Path maintenance remains within the existing tourism infrastructure program.", "Preserves a heavily used pedestrian and bicycle connection.", "Funded in a prior year"]
  ,"Transit Program, Gulfview &amp; Blue Mountain": ["Service infrastructure", "Previously funded", "Any continuing service cost is managed through the applicable tourism program.", "Supports visitor mobility and reduces parking and roadway pressure.", "Funded in a prior year"]
  ,"Dune Allen Hardscaping Project": ["Improvement", "Previously funded", "Operating impact will follow the final project scope.", "Improves durability and function of public visitor infrastructure.", "Funded in a prior year"]
  ,"Deer Lake Path Realignment": ["Rehabilitation", "Previously funded", "Maintenance remains within the existing tourism infrastructure program.", "Improves access and protects the surrounding natural resource.", "Funded in a prior year"]
  ,"Freeport 3280/Bear Creek Fire Station": ["New facility", "Project development", "Future facility and maintenance costs will be addressed through Sheriff operations.", "Improves fire and emergency-response coverage in the Freeport service area.", "Funded in FY2027"]
  ,"Pleasant Ridge Fire Station": ["New facility", "Project development", "Future facility and maintenance costs will be addressed through Sheriff operations.", "Improves fire and emergency-response coverage in the service area.", "Funded in FY2027"]
  ,"Sheriff Triumph Radio Project": ["Public-safety system", "Implementation", "Ongoing system maintenance and technology replacement will continue after completion.", "Improves countywide coverage, reliability, and interoperability for first responders.", "Grant funded"]
  ,"Bruce Fire Station": ["New facility", "Project development", "Future facility and maintenance costs will be addressed through Sheriff operations.", "Improves fire protection and emergency-response coverage.", "Sheriff/Fine and Forfeiture Fund"]
  ,"Mossy Head Fire Station": ["New facility", "Funding pending", "Future facility and maintenance costs will be addressed through Sheriff operations.", "Would improve fire and emergency-response coverage in Mossy Head.", "Grant funded"]
};

function projectProfileRow(r) {
  const d = PROJECT_DETAILS[r[0]] || ["Improvement", "Project development", "Operating impact will be evaluated with the final scope.", "Preserves or improves a County capital asset."];
  return `<tr><td><span class="project-name">${r[0]}</span><span class="project-funding">${r[1]}</span><span class="project-benefit"><b>Benefit:</b> ${d[3]}</span></td><td class="type">${d[0]}</td><td><b>${d[1]}</b><br>${d[2]}</td><td class="num">${money(r[2])}</td></tr>`;
}

// separate: optional rows shown below the total but excluded from it (e.g. a
// grant-funded project), introduced by a one-line label row.
function projectProfileTable(rows, total, separate) {
  return `<table class="profile-table"><thead><tr><th>Project, funding &amp; public benefit</th><th>Investment</th><th>FY2027 delivery &amp; operating impact</th><th>Amount</th></tr></thead><tbody>
    ${rows.map(projectProfileRow).join("")}
    ${total == null ? "" : `<tr class="grand"><td colspan="3">Total</td><td class="num">${money(total)}</td></tr>`}
    ${separate ? `<tr class="subhead"><td colspan="4">Grant-Funded Project &mdash; shown separately from the total above</td></tr>${separate.map(projectProfileRow).join("")}` : ""}
  </tbody></table>`;
}

function decisionProfileTable(rows, total) {
  return `<table class="profile-table"><thead><tr><th>Project, status &amp; public benefit</th><th>Investment</th><th>Delivery &amp; operating impact</th><th>Amount</th></tr></thead><tbody>
    ${rows.map((r) => {
      const d = PROJECT_DETAILS[r[0]] || ["Improvement", "Project development", "Operating impact will be evaluated with the final scope.", "Preserves or improves a County capital asset.", "Status shown in section heading"];
      return `<tr><td><span class="project-name">${r[0]}</span><span class="project-funding">${r[1]}</span><span class="project-benefit"><b>Status:</b> ${d[4]}<br><b>Benefit:</b> ${d[3]}</span></td><td class="type">${d[0]}</td><td><b>${d[1]}</b><br>${d[2]}</td><td class="num">${money(r[2])}</td></tr>`;
    }).join("")}
    ${total == null ? "" : `<tr class="grand"><td colspan="3">Total</td><td class="num">${money(total)}</td></tr>`}
  </tbody></table>`;
}

function projTable(rows, total, cols) {
  return `<table class="proj-table"><thead><tr><th>Project</th><th>${cols || "Fund &middot; Revenue Source"}</th><th>Amount</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="num">${money(r[2])}</td></tr>`).join("")}
    <tr class="grand"><td colspan="2">Total</td><td class="num">${money(total)}</td></tr>
  </tbody></table>`;
}

const transPage1 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Capital Improvement Plan</small>
    <h1>Transportation and Infrastructure Capital Ledger</h1>
    <p class="intro">This schedule presents the FY2027 transportation and infrastructure appropriations funded through the Capital Projects, Transportation, and General Funds. It is one component of the County's $43.8 million funded FY2027 capital program; Sheriff projects recorded in the 300-series capital funds remain included and are shown in the Sheriff ledger.</p>
    <div class="stat-strip">
      <div class="stat-card"><b>${money(TRANS_TOTAL)}</b><span>FY2027 Final Total</span></div>
      <div class="stat-card"><b>30</b><span>Projects</span></div>
      <div class="stat-card"><b>${money(GRANT_LEDGER[0][2])}</b><span>Grant Project Shown Separately</span></div>
      <div class="stat-card"><b>Nonrecurring</b><span>FY2027 Project Appropriations</span></div>
    </div>
    <h2>Funding by Revenue Source</h2>
    ${fundTable(TRANS_FUNDING, TRANS_TOTAL)}
    <h2>FY2027 Funded Projects</h2>
    <p class="intro">Listed from largest to smallest, each line identifies what FY2027 buys, the project's current delivery stage, its public benefit, and the expected operating effect. A funded FY2027 phase does not by itself mean every future phase of a multi-year project is fully funded.</p>
    ${projectProfileTable(TRANS_PROJECTS.slice(0, 11))}
    <footer><span>FY 2027 Final Budget</span><b>${"{{PAGE1}}"}</b></footer>
  </section>
`;

const transPage2 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h1 class="continued">Transportation and Infrastructure Capital Ledger <span class="sub">(continued)</span></h1>
    <h2 style="margin-top:.1in;">FY2027 Funded Projects <span style="font-weight:400;color:#68786f;">(continued)</span></h2>
    ${projectProfileTable(TRANS_PROJECTS.slice(11), TRANS_TOTAL, GRANT_LEDGER)}
    <p class="note">These are nonrecurring FY2027 project appropriations. Multi-year delivery does not make an individual project a recurring operating program. Detailed schedules, locations, contracts, prior and future funding, and current milestones remain available in the online Capital Improvement Plan.</p>
    <footer><span>FY 2027 Final Budget</span><b>${"{{PAGE2}}"}</b></footer>
  </section>
`;

// ============================== PAGE SET 3: TOURIST DEVELOPMENT FUND CAPITAL ==============================

const TOURIST_ADOPTED = [
  ["Beach Renourishment (Additional Funds for Future Project)", 10750000],
  ["30A Gateway Improvements", 600000]
];
const TOURIST_ADOPTED_TOTAL = 11350000;
const TOURIST_ADDITIONAL = [
  ["US 331 Bridge Lighting", 6000000],
  ["Boardwalk Dune Walkover Repair/Replacement", 1000000],
  ["Multi-use Path, 30A Rebuild 83 to 393", 1000000],
  ["Transit Program, Gulfview &amp; Blue Mountain", 1000000],
  ["Dune Allen Hardscaping Project", 750000],
  ["Deer Lake Path Realignment", 500000]
];
const TOURIST_ADDITIONAL_TOTAL = 10250000;

const touristPage = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Capital Improvement Plan</small>
    <h1>Tourist Development Fund Capital Ledger</h1>
    <p class="intro">The funded FY2027 tourism capital program contains only beach renourishment and the 30A Gateway project. Other active projects, funded in prior years, are listed below for reference.</p>
    <div class="stat-strip">
      <div class="stat-card"><b>${money(TOURIST_ADOPTED_TOTAL)}</b><span>FY2027 Funded</span></div>
      <div class="stat-card"><b>2</b><span>FY2027 Funded Projects</span></div>
      <div class="stat-card"><b>${money(TOURIST_ADDITIONAL_TOTAL)}</b><span>Previously Funded</span></div>
      <div class="stat-card"><b>100%</b><span>Tourist Development Taxes</span></div>
    </div>
    <h2>Funding by Revenue Source</h2>
    ${fundTable([["Tourist Development Fund", "Tourist Development Taxes", "100.0%", TOURIST_ADOPTED_TOTAL]], TOURIST_ADOPTED_TOTAL)}
    <h2>FY2027 Funded Projects</h2>
    ${decisionProfileTable(TOURIST_ADOPTED.map((r) => [r[0], "Tourist Development Fund &middot; Tourist Development Taxes", r[1]]), TOURIST_ADOPTED_TOTAL)}
    <h2>Previously Funded Projects</h2>
    <p class="intro">These projects received funding in prior years and remain active in the County's project inventory. They are shown here for reference and are not part of the $43.8 million funded FY2027 capital program.</p>
    ${decisionProfileTable(TOURIST_ADDITIONAL.map((r) => [r[0], "Tourist Development Fund &middot; Tourist Development Taxes", r[1]]), TOURIST_ADDITIONAL_TOTAL)}
    <p class="note">Beach renourishment is an ongoing capital commitment because shoreline restoration is periodically required. Its FY2027 appropriation remains capital rather than operating spending; the previously funded projects above are shown for reference.</p>
    <footer><span>FY 2027 Final Budget</span><b>${"{{PAGE1}}"}</b></footer>
  </section>
`;

// ============================== PAGE SET 4: SHERIFF CAPITAL PROJECT ==============================

const SHERIFF_ADOPTED = [
  ["Freeport 3280/Bear Creek Fire Station", "Capital Projects Fund &middot; Property Taxes", 3500000],
  ["Pleasant Ridge Fire Station", "Capital Projects Fund &middot; Property Taxes", 3500000]
];
const SHERIFF_ADOPTED_TOTAL = 7000000;
const SHERIFF_GRANT = [
  ["Sheriff Triumph Radio Project", "Grant Funded &middot; State or Federal Funding", 10076335],
  ["Bruce Fire Station", "Sheriff/Fine and Forfeiture Fund &middot; Fines and Forfeitures", 2000000],
  ["Mossy Head Fire Station", "Grant Funded &middot; State or Federal Funding", 1000000]
];
const SHERIFF_GRANT_TOTAL = 13076335;

const sheriffPage = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Capital Improvement Plan</small>
    <h1>Sheriff Capital Project Ledger</h1>
    <p class="intro">The two fire stations funded through the Capital Projects Fund make up the FY2027 Sheriff capital program and are part of the County&rsquo;s $43.8 million funded capital program. Grant-funded projects and one Sheriff/Fine and Forfeiture Fund project are shown separately below.</p>
    <div class="stat-strip">
      <div class="stat-card"><b>${money(SHERIFF_ADOPTED_TOTAL)}</b><span>FY2027 Funded</span></div>
      <div class="stat-card"><b>2</b><span>Funded Fire Stations</span></div>
      <div class="stat-card"><b>${money(SHERIFF_GRANT_TOTAL - 2000000)}</b><span>Grant-Funded Projects</span></div>
      <div class="stat-card"><b>${money(2000000)}</b><span>Sheriff/Fine &amp; Forfeiture Fund Project</span></div>
    </div>
    <h2>Funding by Revenue Source</h2>
    ${fundTable([["Capital Projects Fund", "Property Taxes", "100.0%", SHERIFF_ADOPTED_TOTAL]], SHERIFF_ADOPTED_TOTAL)}
    <h2>FY2027 Funded Projects</h2>
    ${decisionProfileTable(SHERIFF_ADOPTED, SHERIFF_ADOPTED_TOTAL)}
    <h2>Grant-Funded and Other Projects</h2>
    <p class="intro">Additional public safety projects supported by grants or the Sheriff/Fine and Forfeiture Fund. They are shown here for transparency and are separate from the funded FY2027 capital program.</p>
    ${decisionProfileTable(SHERIFF_GRANT, SHERIFF_GRANT_TOTAL)}
    <p class="note">The projects in this section total $13,076,335: $11,076,335 in grant-funded projects and $2,000,000 in the Sheriff/Fine and Forfeiture Fund. They are not part of the County&rsquo;s $43.8 million funded FY2027 capital program.</p>
    <footer><span>FY 2027 Final Budget</span><b>${"{{PAGE1}}"}</b></footer>
  </section>
`;

// ============================== PAGE SET 5 & 6: RECREATION PLAT FEE / SIDEWALK ==============================

function simpleFundPage(title, blurb, fund, revenueSource, amount, pageVar) {
  return `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Capital Improvement Plan</small>
    <h1>${title}</h1>
    <p class="intro">${blurb}</p>
    <div class="stat-strip">
      <div class="stat-card"><b>${money(amount)}</b><span>FY2027 Total</span></div>
      <div class="stat-card"><b>100%</b><span>${revenueSource}</span></div>
      <div class="stat-card"><b>1</b><span>Project</span></div>
      <div class="stat-card"><b>TBD</b><span>Board-Directed</span></div>
    </div>
    <h2>Funding by Revenue Source</h2>
    ${fundTable([[fund, revenueSource, "100.0%", amount]], amount)}
    <h2>FY2027 Funded Projects</h2>
    ${projTable([[`${fund} Project (Board-Directed, To Be Determined)`, `${fund} &middot; ${revenueSource}`, amount]], amount)}
    <p class="note">This fund's FY2027 allocation is reserved for a project the Board will direct during the fiscal year; no specific project had been identified when this final budget publication was prepared.</p>
    <footer><span>FY 2027 Final Budget</span><b>${pageVar}</b></footer>
  </section>
`;
}

const recreationPage = simpleFundPage(
  "Recreation Plat Fee Fund Capital Ledger",
  "Supported by developer assessments collected in lieu of dedicating on-site recreational space as part of new residential development.",
  "Recreation Plat Fee Fund", "Recreation Plat Fee", 600000, "{{PAGE1}}"
);
const sidewalkPage = simpleFundPage(
  "Sidewalk Fund Capital Ledger",
  "Supported by assessments paid in lieu of constructing required sidewalks as part of new development.",
  "Sidewalk Fund", "Sidewalk Fees", 300000, "{{PAGE1}}"
);

// ============================== ASSEMBLE ==============================

const startPage = Number(process.argv[3] || 100);
const pages = [transPage1, transPage2, touristPage, sheriffPage, recreationPage, sidewalkPage, machineryPage1, machineryPage2, machineryPage3];
let html = pages.join("\n");
let n = startPage;
html = html.replace(/\{\{PAGE1\}\}|\{\{PAGE2\}\}|\{\{PAGE3\}\}|\{\{PAGE4\}\}/g, () => String(n++));

const fullHtml = `<!doctype html>
<html><head><meta charset="utf-8"><title>Capital Fund Ledgers</title>
<style>${sharedCss}</style></head>
<body>${html}</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-capital-fund-ledgers.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(fullHtml, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath + " (" + pages.length + " pages)");
