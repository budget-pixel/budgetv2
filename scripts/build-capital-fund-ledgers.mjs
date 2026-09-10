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
  h1.continued{ font-size:14.5pt; margin-top:0; }
  h1 span.sub{ color:#68786f; font-size:8.5pt; font-weight:400; }
  p.intro{ max-width:7.3in; margin:0 0 .13in; color:#33453c; font-size:8.2pt; line-height:1.4; }
  h2{ margin:.12in 0 .05in; color:#003f28; font:800 10.5pt/1.2 Georgia, serif; padding-bottom:.045in; border-bottom:2px solid #d1be78; }
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
  .item-cols .item-table2{ break-inside:avoid; }
  .proj-table th:nth-child(1){ width:44%; } .proj-table th:nth-child(2){ width:36%; } .proj-table th:nth-child(3){ width:20%; text-align:right; }
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
const MACHINERY_BY_DEPT = [
  ["Public Works", 17, 2499000],
  ["Solid Waste", 8, 1790000],
  ["Beach Operations", 19, 1302500],
  ["Beach Tram", 4, 507000],
  ["Building Construction &amp; Maintenance", 7, 316000],
  ["Planning", 2, 109000],
  ["Code Compliance", 6, 148800],
  ["Mosquito Control", 3, 91000],
  ["Eagle Springs Golf and Recreation Center", 2, 81000],
  ["County Administration Offices", 1, 65000],
  ["Tourism Administration", 1, 50000],
  ["Engineering Department", 1, 45000],
  ["Extension Office", 1, 40000],
  ["Human Resources", 1, 31000],
  ["Environmental Resources", 2, 20000],
  ["Emergency Management", 2, 25000]
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
  return `<h2 style="margin-top:.08in;font-size:8.6pt;">${dept}</h2><table class="item-table2"><thead><tr><th>Item Description</th><th>Amount</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${r[0]}</td><td class="num">${money(r[1])}</td></tr>`).join("")}
  </tbody></table>`;
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
    <footer><span>FY 2027 Annual Budget</span><b>${"{{PAGE1}}"}</b></footer>
  </section>
`;

const machineryPage2 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h1 class="continued">Machinery, Vehicles, &amp; Equipment Ledger <span class="sub">(continued)</span></h1>
    <p class="intro">Itemized FY2027 requests for Beach Operations, Beach Tram, and Tourism Administration &mdash; all funded by Tourist Development Taxes.</p>
    ${itemTable(BEACH_OPERATIONS_ITEMS, "Beach Operations &mdash; $1,302,500")}
    ${itemTable(BEACH_TRAM_ITEMS, "Beach Tram &mdash; $507,000")}
    ${itemTable(TOURISM_ADMIN_ITEMS, "Tourism Administration &mdash; $50,000")}
    <footer><span>FY 2027 Annual Budget</span><b>${"{{PAGE2}}"}</b></footer>
  </section>
`;

const machineryPage3 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h1 class="continued">Machinery, Vehicles, &amp; Equipment Ledger <span class="sub">(continued)</span></h1>
    <p class="intro">Itemized FY2027 requests for Public Works, Solid Waste, and Building Construction &amp; Maintenance.</p>
    ${itemTable(PUBLIC_WORKS_ITEMS, "Public Works &mdash; $2,499,000")}
    ${itemTable(SOLID_WASTE_ITEMS, "Solid Waste &mdash; $1,790,000")}
    ${itemTable(BUILDING_CM_ITEMS, "Building Construction &amp; Maintenance &mdash; $316,000")}
    <footer><span>FY 2027 Annual Budget</span><b>${"{{PAGE3}}"}</b></footer>
  </section>
`;

const machineryPage4 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h1 class="continued">Machinery, Vehicles, &amp; Equipment Ledger <span class="sub">(continued)</span></h1>
    <p class="intro">Itemized FY2027 requests for the remaining ten departments.</p>
    <div class="item-cols">
      ${itemTable(PLANNING_ITEMS, "Planning &mdash; $109,000")}
      ${itemTable(CODE_COMPLIANCE_ITEMS, "Code Compliance &mdash; $148,800")}
      ${itemTable(MOSQUITO_CONTROL_ITEMS, "Mosquito Control &mdash; $91,000")}
      ${itemTable(EAGLE_SPRINGS_GOLF_ITEMS, "Eagle Springs Golf and Recreation Center &mdash; $81,000")}
      ${itemTable(COUNTY_ADMIN_ITEMS, "County Administration Offices &mdash; $65,000")}
      ${itemTable(ENGINEERING_ITEMS, "Engineering Department &mdash; $45,000")}
      ${itemTable(EXTENSION_OFFICE_ITEMS, "Extension Office &mdash; $40,000")}
      ${itemTable(HUMAN_RESOURCES_ITEMS, "Human Resources &mdash; $31,000")}
      ${itemTable(ENVIRONMENTAL_RESOURCES_ITEMS, "Environmental Resources &mdash; $20,000")}
      ${itemTable(EMERGENCY_MANAGEMENT_ITEMS, "Emergency Management &mdash; $25,000")}
    </div>
    <p class="footnote">Requested but not included in the FY2027 budget: Environmental Resources' Vessel &amp; Trailer, $60,000 (Property Taxes) &mdash; shown on that department's own page in the Departments and Services chapter.</p>
    <footer><span>FY 2027 Annual Budget</span><b>${"{{PAGE4}}"}</b></footer>
  </section>
`;

// ============================== PAGE SET 2: TRANSPORTATION AND INFRASTRUCTURE ==============================

const TRANS_FUNDING = [
  ["Capital Projects Fund", "Property Taxes", "73.5%", 18035734],
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
    <p class="intro">This combined schedule brings together infrastructure funded through the Transportation Fund, Capital Projects Fund, and General Fund.</p>
    <div class="stat-strip">
      <div class="stat-card"><b>${money(TRANS_TOTAL)}</b><span>FY2027 Tentative Total</span></div>
      <div class="stat-card"><b>30</b><span>Projects</span></div>
      <div class="stat-card"><b>${money(GRANT_LEDGER[0][2])}</b><span>Additional Grant-Funded</span></div>
      <div class="stat-card"><b>${money(IN_HOUSE_TOTAL)}</b><span>In-House Engineering Savings</span></div>
    </div>
    <h2>Funding by Revenue Source</h2>
    ${fundTable(TRANS_FUNDING, TRANS_TOTAL)}
    <h2>FY2027 Transportation and Infrastructure Ledger</h2>
    ${projTable(TRANS_PROJECTS, TRANS_TOTAL)}
    <footer><span>FY 2027 Annual Budget</span><b>${"{{PAGE1}}"}</b></footer>
  </section>
`;

const transPage2 = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h1 class="continued">Transportation and Infrastructure Capital Ledger <span class="sub">(continued)</span></h1>
    <h2 style="margin-top:.1in;">FY2027 Grant Ledger</h2>
    <p class="intro">A federally or state-funded project awarded in addition to the tentative ledger above.</p>
    ${projTable(GRANT_LEDGER, GRANT_LEDGER[0][2])}
    <h2>FY2027 In-House Engineering Ledger</h2>
    <p class="intro">Performing capital project design and construction management in-house rather than through outside consultants is estimated to save the County $1,660,880 on these nine projects in FY2027 &mdash; see the Engineering Department's page in the Departments and Services chapter.</p>
    ${projTable(IN_HOUSE_ENGINEERING.map((r) => [r[0], "In-House Engineering Savings", r[1]]), IN_HOUSE_TOTAL, "Category")}
    <footer><span>FY 2027 Annual Budget</span><b>${"{{PAGE2}}"}</b></footer>
  </section>
`;

// ============================== PAGE SET 3: TOURIST DEVELOPMENT FUND CAPITAL ==============================

const TOURIST_ADOPTED = [
  ["Beach Renourishment (Additional Fund for Future Project)", 10750000],
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
    <p class="intro">Tourism-related infrastructure funded by the local option tourist development tax collected from accommodations within designated tourist zones.</p>
    <div class="stat-strip">
      <div class="stat-card"><b>${money(TOURIST_ADOPTED_TOTAL + TOURIST_ADDITIONAL_TOTAL)}</b><span>Combined FY2027 Projects</span></div>
      <div class="stat-card"><b>${money(TOURIST_ADOPTED_TOTAL)}</b><span>100% Tourist Development Taxes</span></div>
      <div class="stat-card"><b>8</b><span>Projects</span></div>
      <div class="stat-card"><b>$6.0M</b><span>Largest Single Project</span></div>
    </div>
    <h2>Funding by Revenue Source</h2>
    ${fundTable([["Tourist Development Fund", "Tourist Development Taxes", "100.0%", TOURIST_ADOPTED_TOTAL]], TOURIST_ADOPTED_TOTAL)}
    <h2>FY2027 Tourist Development Fund Ledger</h2>
    ${projTable(TOURIST_ADOPTED.map((r) => [r[0], "Tourist Development Fund &middot; Tourist Development Taxes", r[1]]), TOURIST_ADOPTED_TOTAL)}
    <h2>Additional Identified Tourist Development Fund Projects</h2>
    <p class="intro">These projects are also funded by Tourist Development Taxes and appear in the live ledger's project list, but are not part of the $11,350,000 total above &mdash; presented separately, matching how the source distinguishes them.</p>
    ${projTable(TOURIST_ADDITIONAL.map((r) => [r[0], "Tourist Development Fund &middot; Tourist Development Taxes", r[1]]), TOURIST_ADDITIONAL_TOTAL)}
    <footer><span>FY 2027 Annual Budget</span><b>${"{{PAGE1}}"}</b></footer>
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
  ["Bruce Fire Station", "Sheriff Fund &middot; Property Taxes", 2000000],
  ["Mossy Head Fire Station", "Grant Funded &middot; State or Federal Funding", 1000000]
];
const SHERIFF_GRANT_TOTAL = 13076335;

const sheriffPage = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Capital Improvement Plan</small>
    <h1>Sheriff Capital Project Ledger</h1>
    <p class="intro">Infrastructure and facility improvements related to public safety and law enforcement, financed through fines, forfeitures, and property taxes.</p>
    <div class="stat-strip">
      <div class="stat-card"><b>${money(SHERIFF_ADOPTED_TOTAL)}</b><span>FY2027 Tentative Total</span></div>
      <div class="stat-card"><b>${money(SHERIFF_GRANT_TOTAL)}</b><span>Sheriff &amp; Grant Funded</span></div>
      <div class="stat-card"><b>2</b><span>Fire Stations, Capital Projects Fund</span></div>
      <div class="stat-card"><b>$10.1M</b><span>Largest Single Project</span></div>
    </div>
    <h2>Funding by Revenue Source</h2>
    ${fundTable([["Capital Projects Fund", "Property Taxes", "100.0%", SHERIFF_ADOPTED_TOTAL]], SHERIFF_ADOPTED_TOTAL)}
    <h2>FY2027 Sheriff Projects Ledger</h2>
    ${projTable(SHERIFF_ADOPTED, SHERIFF_ADOPTED_TOTAL)}
    <h2>FY2027 Sheriff and Grant Funded Ledger</h2>
    <p class="intro">Additional public safety facility projects funded by the Sheriff Fund and by state or federal grants, shown separately from the property-tax-funded total above.</p>
    ${projTable(SHERIFF_GRANT, SHERIFF_GRANT_TOTAL)}
    <footer><span>FY 2027 Annual Budget</span><b>${"{{PAGE1}}"}</b></footer>
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
    <h2>FY2027 Project Ledger</h2>
    ${projTable([[`${fund} Project (Board-Directed, To Be Determined)`, `${fund} &middot; ${revenueSource}`, amount]], amount)}
    <p class="note">This fund's FY2027 allocation is reserved for a project the Board will direct during the fiscal year; no specific project had been identified when this tentative budget publication was prepared.</p>
    <footer><span>FY 2027 Annual Budget</span><b>${pageVar}</b></footer>
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
const pages = [machineryPage1, machineryPage2, machineryPage3, machineryPage4, transPage1, transPage2, touristPage, sheriffPage, recreationPage, sidewalkPage];
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
