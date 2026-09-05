import { chromium } from "playwright";
import QRCode from "qrcode";

// Builds the FY 2027 Budget Book's new "Department Profiles" section --
// one profile per individual office/program page, at the granularity of
// the live site's own individual pages (not the 15 rolled-up
// departments already covered in this book's "Department Operating
// Ledger"). Sits after that ledger as a fuller companion section.
// Source: each office's own live page, researched directly (this
// content did not exist anywhere in this book's prior raw capture).
//
// Two entities are deliberately EXCLUDED here, pending further
// verification: Tourism Administration and Tourism Beach Operations.
// The research pass found a live JavaScript bug on Tourism Beach
// Operations (renderCombinedOfficeSnapshots is defined in the wrong
// scope) that currently renders zero dollar figures for Beach
// Operations, Beach Renourishment, and Beach Tram -- there is nothing
// to verify against right now. Tourism Administration's five divisions
// summed against their own page came up roughly $8.7M short of the
// department's official total, a gap large enough that printing it
// would mean guessing at real government dollars. Both will be added
// once resolved.
//
// A smaller, explained gap exists for four Environmental Services
// programs (Environmental Resources, Mosquito Control, Soil
// Conservation, Solid Waste): each program's own figures below are
// independently confirmed on its own page, but summed together they
// don't reach the Environmental Services department total shown in the
// Department Operating Ledger -- a footnote flags this rather than
// hiding it.
//
// Only 14 of these 27 pages have an embedded video on the live site;
// each gets a QR code linking to it. The rest do not, and none is added
// -- no page here links to a video that isn't actually there.

const OFFICES = [
  {
    name: "Building Construction and Maintenance", fte: 68, personnel: 5427755, operating: 1918550, capital: 316000,
    deltaP: 169587, deltaO: -62450, deltaC: -1031000,
    video: "WJxzKl9sRNk",
    narrative: "Includes the Facilities Maintenance, Custodian, and Parks Maintenance divisions. Facilities Maintenance provides new construction, remodeling, repair, maintenance, and treatment-plant maintenance assistance to support County departments and Constitutional offices.",
    footnote: true
  },
  {
    name: "Building Department", fte: 21, personnel: 2312201, operating: 1687799, capital: 0,
    deltaP: 198043, deltaO: -233043, deltaC: -165000,
    video: "3n4ns8jANzQ",
    narrative: "Plays a pivotal role in ensuring the safety, compliance, and integrity of construction projects within the community, reviewing plans, issuing permits, and inspecting permitted work."
  },
  {
    name: "Code Compliance", fte: 43, personnel: 4260744, operating: 551110, capital: 149000,
    deltaP: 352585, deltaO: 10110, deltaC: -265200,
    video: "Z78NL7Z-urs",
    narrative: "Upholds and enhances the aesthetics, property values, health and safety, and overall quality of life for Walton County residents and visitors, split across Street and Beach enforcement areas."
  },
  {
    name: "County Administration Offices", fte: 16, personnel: 2061039, operating: 134000, capital: 65000,
    deltaP: -26864, deltaO: 2000, deltaC: 0,
    video: null,
    narrative: "Responsible for executing the directives and priorities set forth by the Board of County Commissioners, coordinating implementation of policy and decisions across Board-controlled government."
  },
  {
    name: "Eagle Springs Golf and Recreation Center", fte: 12, personnel: 903055, operating: 696500, capital: 206000,
    deltaP: 33511, deltaO: 23500, deltaC: -225500,
    video: "d4o7JNx6o4s",
    narrative: "Walton County owns one golf course, Eagle Springs Golf and Recreation Center, purchased by the Board of County Commissioners in 2019 to provide and maintain the public golf experience."
  },
  {
    name: "Eagle Springs Grill", fte: 6, personnel: 385100, operating: 184900, capital: 0,
    deltaP: 15116, deltaO: -23000, deltaC: 0,
    video: "a4VPeQNr1M8",
    narrative: "Strives to provide exceptional service to the community, operating the food and beverage service at Eagle Springs Golf and Recreation Center."
  },
  {
    name: "Emergency Management", fte: 6, personnel: 704526, operating: 182929, capital: 25000,
    deltaP: 43275, deltaO: 40029, deltaC: 0,
    video: "7arI_NS6Q2U",
    narrative: "Responsible for all aspects of disaster management 24 hours a day, seven days a week &mdash; preparing for, coordinating response to, and supporting recovery from emergencies countywide."
  },
  {
    name: "Engineering Department", fte: 14, personnel: 2083118, operating: 251000, capital: 45000,
    deltaP: -95460, deltaO: 0, deltaC: 0,
    video: null,
    narrative: "Manages the design and construction of Walton County infrastructure projects. In-house design work is estimated to save the County $1,660,880 in FY2027 versus outside consultants."
  },
  {
    name: "Environmental Resources", fte: 4, personnel: 451831, operating: 177091, capital: 20000,
    deltaP: 1304, deltaO: -168284, deltaC: -25000,
    video: null,
    narrative: "Serves as the cornerstone for environmental stewardship within the county, overseeing natural resource protection and related environmental programs.",
    footnote: "env"
  },
  {
    name: "Extension Office", fte: 8.5, personnel: 514924, operating: 39395, capital: 40000, other: 3000,
    deltaP: -23186, deltaO: -20205, deltaC: 0,
    video: "ZNGKeoZlogc",
    narrative: "The Walton County Extension Service provides scientifically based information to residents on agriculture, horticulture, and natural resources through University of Florida/IFAS programming."
  },
  {
    name: "Geographic Info Systems", fte: 6, personnel: 682221, operating: 156925, capital: 0,
    deltaP: 15651, deltaO: 21680, deltaC: 0,
    video: null,
    narrative: "Manages a Geographic Information System supporting County departments, Constitutional offices, and the public with mapping, spatial analysis, and location-based data."
  },
  {
    name: "Housing & Urban Development", fte: 3, personnel: 340806, operating: 2716250, capital: 0,
    deltaP: 19911, deltaO: -44250, deltaC: 0,
    video: null,
    narrative: "The Section 8 tenant-based Housing Choice Voucher assistance program is funded by the federal government and administered by the Walton County Housing Agency."
  },
  {
    name: "Human Resources", fte: 13, personnel: 1256383, operating: 139553, capital: 31000,
    deltaP: 43990, deltaO: 12953, deltaC: 0,
    video: null,
    narrative: "Provides centralized personnel services for all Walton County Board of County Commissioners departments, including recruitment, benefits, compliance, and employee relations."
  },
  {
    name: "Libraries", fte: 22.5, personnel: 1625655, operating: 380000, capital: 150000, other: 60000,
    deltaP: 272392, deltaO: 10300, deltaC: -22000,
    video: "gJ7QNzqj8ks",
    narrative: "Supports free access to library services throughout Walton County with facilities in Flowersview, DeFuniak Springs, Freeport, and Santa Rosa Beach."
  },
  {
    name: "Mosquito Control", fte: 8, personnel: 673438, operating: 662499, capital: 91000,
    deltaP: -67045, deltaO: 168982, deltaC: -15000,
    video: "U5q2lymuFys",
    narrative: "Dedicated to protecting public health and enhancing quality of life for residents and visitors by monitoring and managing mosquito populations countywide.",
    footnote: "env"
  },
  {
    name: "Mossy Head Wastewater Treatment Facility", fte: 1, personnel: 94800, operating: 369200, capital: 0,
    deltaP: 9940, deltaO: 7532, deltaC: -956000,
    video: null,
    narrative: "Currently provides gravity and force main sewer service for the Northwest Commerce Industrial Park area."
  },
  {
    name: "Office of Management and Budget", fte: 9, personnel: 1017276, operating: 57750, capital: 0,
    deltaP: -24682, deltaO: -275000, deltaC: -150000,
    video: null,
    narrative: "Provides comprehensive financial planning, the annual budget process, and public budget information for the County. Recipient of the GFOA Distinguished Budget Presentation Award for FY2025 and FY2026."
  },
  {
    name: "Office of the County Attorney", fte: 9, personnel: 1052925, operating: 100000, capital: 0,
    deltaP: -188551, deltaO: -2000, deltaC: 0,
    video: null,
    narrative: "Under the direction of the County Attorney, provides legal services to the County, including counsel, document review, and representation in litigation and proceedings."
  },
  {
    name: "Planning", fte: 47, personnel: 4961086, operating: 1878025, capital: 209000,
    deltaP: 347042, deltaO: -78017, deltaC: 0,
    video: "lKTWu2Q-6ug",
    narrative: "Serves as staff and provides professional land use planning advice to the Board of County Commissioners, including review of development proposals and the Short-Term Rental program."
  },
  {
    name: "Probation", fte: 4, personnel: 329527, operating: 41050, capital: 0,
    deltaP: 5072, deltaO: 850, deltaC: 0,
    video: null,
    narrative: "Fulfills a vital role collaborating with the judicial system to enforce court-ordered obligations for probationers."
  },
  {
    name: "Public Works", fte: 148, personnel: 13083100, operating: 7742900, capital: 7000000,
    deltaP: 38181, deltaO: -62853, deltaC: 2648200,
    video: "USzOdbzw-VI",
    narrative: "Provides services related to infrastructure maintenance, repair, and construction &mdash; county roads, drainage, bridges, and related transportation assets."
  },
  {
    name: "Purchasing", fte: 10, personnel: 888999, operating: 137500, capital: 50000,
    deltaP: 704, deltaO: -8000, deltaC: -105000,
    video: null,
    narrative: "Ensures the effective and efficient management of purchasing activities for Walton County. Recipient of the Achievement of Excellence in Procurement Award, 2026."
  },
  {
    name: "Recreation", fte: 6, personnel: 591658, operating: 211735, capital: 30000,
    deltaP: 4949, deltaO: -865, deltaC: -30000,
    video: "ODzfUR4KX2o",
    narrative: "Essential to improving the community's quality of life, operating public parks, fields, courts, and recreation programs for residents of all ages."
  },
  {
    name: "Soil Conservation", fte: 2, personnel: 148520, operating: 1480, capital: 0,
    deltaP: 7315, deltaO: -645, deltaC: 0,
    video: null,
    narrative: "Works in collaboration with the Natural Resources Conservation Service to support soil and water conservation efforts in Walton County.",
    footnote: "env"
  },
  {
    name: "Solid Waste", fte: 28, personnel: 2377275, operating: 1952292, capital: 1800000,
    deltaP: 42984, deltaO: -59614, deltaC: 1140000,
    video: "iz8DOXLQ8yU",
    narrative: "Manages the Franchise Agreement with Waste Management Inc. for countywide waste collection, along with transfer, convenience, and recycling operations.",
    footnote: "env"
  },
  {
    name: "Tourism Lifeguard Services and Beach Safety", fte: 0, personnel: 0, operating: 3380779, capital: 0,
    deltaP: 0, deltaO: 130030, deltaC: 0,
    video: null,
    narrative: "Under the Lifeguard Services Agreement with Walton County, the South Walton Fire District receives annual funding to support beach safety operations. Fully contracted &mdash; no County staff."
  },
  {
    name: "Veteran Services", fte: 3, personnel: 298724, operating: 17926, capital: 0,
    deltaP: 80324, deltaO: 226, deltaC: 0,
    video: "v4tpooBZoPs",
    narrative: "Works to communicate with and support every veteran and their dependents in Walton County, connecting them with earned federal and state benefits."
  }
];

function money(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
function pct(delta, base) { return base === 0 ? "N/A" : (delta >= 0 ? "+" : "") + ((delta / base) * 100).toFixed(1) + "%"; }

async function buildOffice(o) {
  const fy27 = o.personnel + o.operating + o.capital + (o.other || 0);
  const deltaTotal = o.deltaP + o.deltaO + o.deltaC;
  const fy26 = fy27 - deltaTotal;
  const isDown = deltaTotal < 0;
  const dsign = deltaTotal >= 0 ? "+" : "&minus;";
  let qrImg = "";
  if (o.video) {
    const url = `https://www.youtube.com/watch?v=${o.video}`;
    const dataUrl = await QRCode.toDataURL(url, { margin: 0, width: 200, color: { dark: "#003f28", light: "#ffffff" } });
    qrImg = `<div class="qr-box"><img src="${dataUrl}" alt="QR code"/><span>Watch Video</span></div>`;
  }
  const footnoteMark = o.footnote ? (o.footnote === "env" ? "&dagger;" : "*") : "";
  return `
  <div class="off-card${o.video ? " has-qr" : ""}">
    <div class="off-head">
      <h3>${o.name}${footnoteMark}</h3>
      <div class="off-fte">${o.fte} FTE</div>
    </div>
    <div class="off-body">
      <div class="off-main">
        <div class="off-stats">
          <div><b>${money(fy26)}</b><span>FY2026 Total</span></div>
          <div><b>${money(fy27)}</b><span>FY2027 Total</span></div>
          <div><b class="${isDown ? "change is-down" : "change"}">${dsign}${money(Math.abs(deltaTotal)).slice(1)}</b><span>Dollar Change</span></div>
          <div><b class="${isDown ? "change is-down" : "change"}">${pct(deltaTotal, fy26)}</b><span>Percent Change</span></div>
        </div>
        <div class="off-split">
          <span>Personnel <b>${money(o.personnel)}</b></span>
          <span>Operating <b>${money(o.operating)}</b></span>
          <span>Capital <b>${money(o.capital)}</b></span>
        </div>
        <p class="off-narrative">${o.narrative}</p>
      </div>
      ${qrImg}
    </div>
  </div>`;
}

function pairPages(items) {
  const pages = [];
  for (let i = 0; i < items.length; i += 2) pages.push(items.slice(i, i + 2));
  return pages;
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
    margin:0 0 .16in;
    color:#33453c;
    font-size:8.6pt;
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
  h2{ margin:.1in 0 .08in; color:#003f28; font:800 11pt/1.2 Georgia, serif; padding-bottom:.05in; border-bottom:2px solid #d1be78; }
  .index-list{ column-count:2; column-gap:.4in; }
  .index-row{ break-inside:avoid; display:flex; justify-content:space-between; gap:.1in; padding:.045in 0; border-bottom:1px solid #f1f4f1; font-size:7.6pt; }
  .index-row b{ color:#003f28; }
  p.footnote{ margin:.16in 0 0; color:#68786f; font-size:6.9pt; line-height:1.4; font-style:italic; }
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

  .off-card{ border:1px solid #e4ebe7; border-radius:12px; padding:.18in .22in; margin-bottom:.18in; }
  .off-head{ display:flex; justify-content:space-between; align-items:baseline; padding-bottom:.08in; border-bottom:2px solid #d1be78; margin-bottom:.1in; }
  .off-head h3{ margin:0; color:#003f28; font:800 12.5pt Georgia, serif; }
  .off-head .off-fte{ color:#68786f; font-size:7.4pt; font-weight:700; text-transform:uppercase; letter-spacing:.02em; white-space:nowrap; }
  .off-body{ display:flex; gap:.2in; }
  .off-main{ flex:1; min-width:0; }
  .off-stats{ display:grid; grid-template-columns:repeat(4,1fr); gap:.08in; margin-bottom:.09in; }
  .off-stats div{ text-align:left; }
  .off-stats b{ display:block; color:#003f28; font:800 9.3pt Georgia, serif; }
  .off-stats span{ display:block; color:#68786f; font-size:5.9pt; font-weight:700; text-transform:uppercase; letter-spacing:.02em; }
  .off-split{ display:flex; gap:.14in; margin-bottom:.08in; font-size:6.8pt; color:#33453c; }
  .off-split span b{ color:#003f28; }
  .off-narrative{ font-size:7.3pt; line-height:1.4; color:#33453c; margin:0; }
  .change{ color:#0b7741; font-weight:700; }
  .change.is-down{ color:#a24b1e; }
  .qr-box{ flex:0 0 auto; display:flex; flex-direction:column; align-items:center; justify-content:center; }
  .qr-box img{ width:.85in; height:.85in; }
  .qr-box span{ margin-top:.03in; color:#68786f; font-size:5.6pt; font-weight:800; text-transform:uppercase; letter-spacing:.03em; }
`;

const startPage = Number(process.argv[3] || 188);
let pageCounter = startPage;

const totalFy27 = OFFICES.reduce((s, o) => s + o.personnel + o.operating + o.capital + (o.other || 0), 0);
const totalFte = OFFICES.reduce((s, o) => s + o.fte, 0);
const withVideo = OFFICES.filter((o) => o.video).length;

const indexPage = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Departments</small>
    <h1>Department Profiles</h1>
    <p class="intro">A closer look at ${OFFICES.length} individual Board offices and programs &mdash; the working units behind the 15 departments summarized in the Department Operating Ledger. Where an office has a public video overview, a QR code links to it. Tourism Administration and Tourism Beach Operations are not yet included pending a data verification issue on the live budget site.</p>
    <div class="stat-strip">
      <div class="stat-card"><b>${OFFICES.length}</b><span>Offices Profiled</span></div>
      <div class="stat-card"><b>${money(totalFy27)}</b><span>Combined FY2027 Budget</span></div>
      <div class="stat-card"><b>${totalFte}</b><span>Combined FTE</span></div>
      <div class="stat-card"><b>${withVideo}</b><span>Offices With a Video</span></div>
    </div>
    <h2>Offices in This Section</h2>
    <div class="index-list">
      ${OFFICES.map((o) => `<div class="index-row"><span>${o.name}</span><b>${money(o.personnel + o.operating + o.capital + (o.other || 0))}</b></div>`).join("")}
    </div>
    <p class="footnote">Figures shown for each office are that office's own reported Personnel, Operating, and Capital costs. For four Environmental Services programs (marked &dagger;) and Building Construction and Maintenance (marked *), summing an office's own figures does not exactly reach its parent department's total in the Department Operating Ledger &mdash; each department's full budget includes additional cost categories not broken out at the individual office level.</p>
    <footer><span>FY 2027 Annual Budget</span><b>${pageCounter}</b></footer>
  </section>
`;
pageCounter++;

async function main() {
  const officeCards = await Promise.all(OFFICES.map(buildOffice));
  const pairs = pairPages(officeCards);
  const officePagesHtml = pairs.map((pair) => {
    const html = `
    <section>
      <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
      <h1 style="font-size:16pt;">Department Profiles <span style="color:#68786f;font-size:9.5pt;font-weight:400;">(continued)</span></h1>
      ${pair.join("")}
      <footer><span>FY 2027 Annual Budget</span><b>${pageCounter}</b></footer>
    </section>
    `;
    pageCounter++;
    return html;
  }).join("\n");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Department Profiles</title>
<style>${sharedCss}</style></head>
<body>${indexPage}${officePagesHtml}</body></html>`;

  const outPath = process.argv[2] || "/private/tmp/budget-book-department-profiles.pdf";
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
  await browser.close();
  console.log("Wrote " + outPath + " (" + (1 + pairs.length) + " pages)");
}

main();
