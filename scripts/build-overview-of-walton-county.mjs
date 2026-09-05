import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";
import { readFileSync } from "fs";
import QRCode from "qrcode";

// Builds the FY 2027 Budget Book's "Overview of Walton County" section as
// its own three-page PDF -- meant to be inserted right after the Table of
// Contents. Shares the header/footer/kicker/h1 typographic system the
// cover, award page, transmittal letter, and TOC all use. Pulls its
// narrative copy, facts, and photography from the same source the live
// site's own overview page uses (pages/overview-of-walton-county.html).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const imageDataUri = (name, mime) => {
  const filePath = path.join(repoRoot, "assets/images/page-images", name);
  return `data:${mime};base64,` + readFileSync(filePath).toString("base64");
};

const WATERWAY = imageDataUri("overview-walton-waterway.png", "image/png");
const DEFUNIAK_MAP = imageDataUri("overview-defuniak-historic-map.jpg", "image/jpeg");
const BEACH = imageDataUri("overview-beach-community.png", "image/png");
const HERITAGE = imageDataUri("overview-cultural-heritage.jpg", "image/jpeg");
const DISTRICTS_MAP = imageDataUri("overview-county-districts.jpg", "image/jpeg");

const COMMISSIONERS = [
  ["commissioner-dan-curry.jpeg", "Dan Curry", "District I"],
  ["commissioner-danny-glidewell.jpeg", "Danny Glidewell", "District II"],
  ["commissioner-brad-drake.jpeg", "Brad Drake", "District III, Chair"],
  ["commissioner-donna-johns.jpeg", "Donna Johns", "District IV"],
  ["commissioner-tony-anderson.jpeg", "Tony Anderson", "District V, Vice Chair"]
].map(([file, name, role]) => [imageDataUri(file, file.endsWith(".jpeg") ? "image/jpeg" : "image/png"), name, role]);

const OFFICERS = [
  ["tax-collector-rhonda-skipper.jpg", "Tax Collector", "Rhonda Skipper"],
  ["clerk-crystal-sconiers.jpg", "Clerk of Court & Comptroller", "Crystal Sconiers"],
  ["property-appraiser-gary-gregor.png", "Property Appraiser", "Gary J. Gregor"],
  ["supervisor-elections-ryan-messer.jpg", "Supervisor of Elections", "Ryan Messer"],
  ["sheriff-mike-adkinson.jpg", "Sheriff", "Michael A. Adkinson, Jr."]
].map(([file, role, name]) => [imageDataUri(file, file.endsWith(".png") ? "image/png" : "image/jpeg"), role, name]);

const commissionerCards = COMMISSIONERS.map(([src, name, role]) =>
  `<div class="person-card"><img src="${src}" alt=""><h3>${name}</h3><p>${role}</p></div>`
).join("");

const officerRows = OFFICERS.map(([src, role, name]) =>
  `<div class="officer-row"><img src="${src}" alt=""><span><strong>${role}</strong><small>${name}</small></span></div>`
).join("");

// Same video the live overview page embeds (pages/overview-of-walton-county.html) --
// a QR code linking to it stands in for the video in print, since a PDF can't autoplay one.
const VIDEO_WATCH_URL = "https://www.youtube.com/watch?v=SIDgNn9c1q0";
const VIDEO_QR = await QRCode.toDataURL(VIDEO_WATCH_URL, { margin: 1, width: 240, color: { dark: "#003f28", light: "#ffffff" } });

// Same five history/public-information links the live overview page lists
// (pages/overview-of-walton-county.html) -- each gets its own QR code here
// since a print page can't offer clickable links.
const HISTORY_LINKS = [
  ["Reflections of Walton", "https://www.youtube.com/watch?v=fnHIXvjeif4&list=PL9UIKCDmOMoE_F9wjRwMdUXqn-8RNcdmr"],
  ["Who Was George Walton Jr?", "https://www.mywaltonfl.gov/DocumentCenter/View/41693/Who_was_George_Walton_Jr"],
  ["Walton County History", "https://www.mywaltonfl.gov/314/History"],
  ["Walton County Heritage Association", "https://waltoncountyheritage.org/"],
  ["Walton County Bicentennial", "https://walton200.com/"]
];
const historyLinkCards = (await Promise.all(HISTORY_LINKS.map(async ([label, url]) => {
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 160, color: { dark: "#003f28", light: "#ffffff" } });
  return `<div class="history-link"><img src="${qr}" alt="QR code linking to ${label}"><span>${label}</span></div>`;
}))).join("");

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Overview of Walton County</title>
<style>
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
    page-break-after:always;
    overflow:hidden;
  }
  section:last-child{ page-break-after:auto; }
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
    margin-top:.28in;
    color:#b89521;
    font-size:8pt;
    font-weight:900;
    letter-spacing:.14em;
    text-transform:uppercase;
  }
  h1{
    margin:8px 0 4px;
    color:#003f28;
    font:800 25pt/1.05 Georgia, "Times New Roman", serif;
    letter-spacing:-.02em;
  }
  h2{
    margin:.03in 0 .1in;
    color:#003f28;
    font:800 15pt/1.15 Georgia, serif;
  }
  p{
    margin:0 0 .1in;
    color:#33453c;
    font-size:9.6pt;
    line-height:1.5;
  }
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

  /* ---- Page 1: hero ---- */
  .hero-grid{
    display:grid;
    grid-template-columns:2.85in 1fr;
    gap:.32in;
    align-items:center;
    margin:.16in 0 .26in;
  }
  .hero-photo-wrap{
    display:flex;
    align-items:center;
    justify-content:center;
    height:2.35in;
    border-radius:14px;
    background:linear-gradient(135deg,#ffffff 0%,#f7fbf7 100%);
    border:1px solid #e4ebe7;
  }
  .hero-photo-wrap img{
    display:block;
    height:88%;
    width:auto;
    max-width:92%;
    object-fit:contain;
  }
  .hero-copy h2{
    margin:0 0 .1in;
    color:#003f28;
    font:800 15pt/1.15 Georgia, serif;
  }
  .hero-lead{
    max-width:none;
    margin:0;
    color:#33453c;
    font-size:10.3pt;
    line-height:1.58;
  }
  .fact-grid{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:.14in;
    margin:0 0 .28in;
  }
  .fact-card{
    padding:.16in .12in;
    border:1px solid #e4ebe7;
    border-radius:10px;
    background:#f9f8f2;
    text-align:center;
  }
  .fact-card b{
    display:block;
    color:#003f28;
    font:800 17pt/1.1 Georgia, serif;
  }
  .fact-card span{
    display:block;
    margin-top:4px;
    color:#68786f;
    font-size:7.3pt;
    font-weight:800;
    letter-spacing:.06em;
    text-transform:uppercase;
  }
  .story-grid{
    display:grid;
    grid-template-columns:1.15fr 1fr;
    gap:.34in;
    align-items:start;
  }
  .quote-block{
    padding:.24in .26in .26in .28in;
    border-radius:12px;
    background:#f7fbf7;
  }
  .quote-lead{
    margin:0 0 .12in;
    color:#68786f;
    font-size:8.6pt;
    font-weight:700;
    line-height:1.5;
  }
  .quote-text{
    margin:0 0 .12in;
    padding-left:.16in;
    border-left:3px solid #d1be78;
    color:#173229;
    font:italic 11.5pt/1.4 Georgia, serif;
  }
  .quote-cite{
    color:#68786f;
    font-size:8pt;
  }

  /* ---- Page 2: discover + government intro ---- */
  .feature-grid{
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:.2in;
    margin:0 0 .3in;
  }
  .feature-card{
    border:1px solid #e4ebe7;
    border-radius:12px;
    overflow:hidden;
    background:#fff;
  }
  .feature-card img{
    display:block;
    width:100%;
    height:1.35in;
    object-fit:cover;
  }
  .feature-card-body{
    padding:.14in .15in .16in;
  }
  .feature-card h3{
    margin:0 0 .06in;
    color:#003f28;
    font-size:10.3pt;
    font-weight:800;
  }
  .feature-card p{
    margin:0;
    font-size:8.6pt;
    line-height:1.5;
  }
  .video-qr{
    display:flex;
    align-items:center;
    gap:.24in;
    margin:0 0 .3in;
    padding:.18in .26in;
    border:1px solid #d1be78;
    border-radius:12px;
    background:#f9f8f2;
  }
  .video-qr img{
    display:block;
    width:.95in;
    height:.95in;
    flex:0 0 .95in;
    border-radius:6px;
    background:#fff;
  }
  .video-qr h3{
    margin:0 0 .04in;
    color:#003f28;
    font:800 11.5pt/1.2 Georgia, serif;
  }
  .video-qr p{
    margin:0;
    max-width:5in;
    font-size:8.8pt;
    line-height:1.45;
  }
  .history-links{
    margin:.18in 0 0;
    padding:.16in .22in;
    border:1px solid #d1be78;
    border-radius:12px;
    background:#f9f8f2;
  }
  .history-links h3{
    margin:0 0 .12in;
    color:#003f28;
    font:800 10.5pt/1.2 Georgia, serif;
    letter-spacing:.01em;
  }
  .history-links-grid{
    display:grid;
    grid-template-columns:repeat(5, 1fr);
    gap:.14in;
  }
  .history-link{
    display:flex;
    flex-direction:column;
    align-items:center;
    text-align:center;
    gap:.06in;
  }
  .history-link img{
    display:block;
    width:.62in;
    height:.62in;
    border-radius:4px;
    background:#fff;
  }
  .history-link span{
    font-size:6.6pt;
    line-height:1.25;
    font-weight:700;
    color:#3a4b41;
  }
  .gov-grid{
    display:grid;
    grid-template-columns:2.1in 1fr;
    gap:.3in;
    align-items:start;
  }
  .gov-map{
    display:block;
    width:100%;
    border-radius:12px;
    border:1px solid #e4ebe7;
  }

  /* ---- Page 3: people ---- */
  .person-grid{
    display:grid;
    grid-template-columns:repeat(5,1fr);
    gap:.14in;
    margin:0 0 .3in;
  }
  .person-card{
    border:1px solid #e4ebe7;
    border-radius:12px;
    overflow:hidden;
    background:#fff;
    text-align:center;
    padding-bottom:.1in;
  }
  .person-card img{
    display:block;
    width:100%;
    aspect-ratio:4/5;
    object-fit:cover;
  }
  .person-card h3{
    margin:.08in .06in 0;
    color:#003f28;
    font-size:8.6pt;
    font-weight:800;
    line-height:1.2;
  }
  .person-card p{
    margin:.02in .06in 0;
    color:#68786f;
    font-size:7.2pt;
    font-weight:800;
    letter-spacing:.03em;
    text-transform:uppercase;
  }
  .officer-panel{
    padding:.24in;
    border-radius:14px;
    background:#f7fbf7;
  }
  .officer-grid{
    display:grid;
    grid-template-columns:repeat(5,1fr);
    gap:1px;
    border-radius:12px;
    overflow:hidden;
    background:#e4ebe7;
    border:1px solid #e4ebe7;
  }
  .officer-row{
    display:flex;
    flex-direction:column;
    gap:.08in;
    padding:.14in;
    background:#fff;
  }
  .officer-row img{
    display:block;
    width:100%;
    aspect-ratio:1/1;
    border-radius:8px;
    object-fit:cover;
    object-position:top center;
  }
  .officer-row strong{
    display:block;
    color:#173229;
    font-size:8.2pt;
    line-height:1.25;
  }
  .officer-row small{
    display:block;
    margin-top:2px;
    color:#68786f;
    font-size:7.3pt;
    line-height:1.3;
  }
</style></head>
<body>

  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Our County</small>
    <h1>Overview of Walton County</h1>
    <div class="hero-grid">
      <div class="hero-photo-wrap"><img src="${WATERWAY}" alt=""></div>
      <div class="hero-copy">
        <h2>Where natural resources, history, and growth meet.</h2>
        <p class="hero-lead">Walton County is located in northwest Florida, bordered by rivers, forests, lakes, and the Gulf of Mexico. Established in 1824, the county has grown from early timber and agricultural communities into a diverse coastal and inland economy with a strong connection to place.</p>
      </div>
    </div>
    <div class="fact-grid">
      <div class="fact-card"><b>75,305</b><span>Population</span></div>
      <div class="fact-card"><b>44.4</b><span>Median Age</span></div>
      <div class="fact-card"><b>77.7%</b><span>Homeownership</span></div>
      <div class="fact-card"><b>$74,832</b><span>Median Household Income</span></div>
    </div>
    <div class="story-grid">
      <div>
        <h2>A county with two connected stories.</h2>
        <p>Walton County includes both inland communities rooted in history, agriculture, public service, and small-town civic life, and coastal communities shaped by tourism, conservation, recreation, and the Gulf economy.</p>
        <p>The annual budget supports this broad service landscape by funding public safety, transportation, parks, libraries, environmental resources, constitutional offices, and countywide operations.</p>
      </div>
      <div class="quote-block">
        <p class="quote-lead">This balance of rivers, inland communities, and Gulf shoreline has long shaped how Walton County tells its story:</p>
        <p class="quote-text">&ldquo;Lying here, as it were, in the protecting arms of her bounding rivers&hellip; with her head resting in the lap of Alabama that says, &lsquo;Here let us rest,&rsquo; while the great Mexican Gulf&hellip; humbly washes her feet with its gentle waves to make them pure and white like snow.&rdquo;</p>
        <p class="quote-cite">John L. McKinnon, <em>History of Walton County</em></p>
      </div>
    </div>
    <footer><span>FY 2027 Annual Budget</span><b>8</b></footer>
  </section>

  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h2 style="margin-top:.06in">Discover Walton County</h2>
    <p style="max-width:6.6in">From Britton Hill to the Gulf, Walton County&rsquo;s geography and culture shape the services residents and visitors rely on.</p>
    <div class="feature-grid" style="margin-top:.2in">
      <div class="feature-card">
        <img src="${DEFUNIAK_MAP}" alt="">
        <div class="feature-card-body">
          <h3>Geographic Features</h3>
          <p>26 miles of Gulf coastline, coastal dune lakes, forests, wetlands, rivers, and Britton Hill &mdash; Florida&rsquo;s highest natural point.</p>
        </div>
      </div>
      <div class="feature-card">
        <img src="${BEACH}" alt="">
        <div class="feature-card-body">
          <h3>Beach Communities</h3>
          <p>South Walton and Scenic Highway 30A include distinctive communities, state parks, and natural resources that require careful stewardship.</p>
        </div>
      </div>
      <div class="feature-card">
        <img src="${HERITAGE}" alt="">
        <div class="feature-card-body">
          <h3>Cultural Heritage</h3>
          <p>Native American communities, early settlement, timber and lumber industries, and the Chautauqua tradition in DeFuniak Springs.</p>
        </div>
      </div>
    </div>

    <div class="video-qr">
      <img src="${VIDEO_QR}" alt="QR code linking to the Walton County overview video">
      <div>
        <h3>See Walton County in motion.</h3>
        <p>Scan to watch a short video with additional historical information about Walton County.</p>
      </div>
    </div>

    <h2>County Commission</h2>
    <p style="max-width:6.6in">Walton County operates under a commission-administrator form of government. The Board of County Commissioners sets policy direction and adopts the annual budget, while the County Administrator oversees day-to-day operations and implementation.</p>
    <div class="gov-grid" style="margin-top:.16in">
      <img class="gov-map" src="${DISTRICTS_MAP}" alt="">
      <div>
        <h2 style="font-size:12.5pt;margin-top:0">Five districts, countywide service.</h2>
        <p>Each commissioner resides in the district they represent, and commissioners are elected at large by all county voters. Districts One, Three, and Five are elected during presidential election years; Districts Two and Four during midterm years.</p>
        <p>The Board establishes public policy through ordinances and resolutions, levies taxes and fees, adopts the annual budget, oversees infrastructure and services, approves expenditures, and appoints members to boards and commissions.</p>
      </div>
    </div>
    <footer><span>FY 2027 Annual Budget</span><b>9</b></footer>
  </section>

  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h2 style="margin-top:.06in">Board of County Commissioners</h2>
    <div class="person-grid" style="margin-top:.16in">
      ${commissionerCards}
    </div>

    <h2>Constitutional Officers</h2>
    <p style="max-width:6.6in">Constitutional Officer budgets are included in the annual budget, while each office operates independently under Florida Statutes and constitutional authority.</p>
    <div class="officer-panel" style="margin-top:.16in">
      <div class="officer-grid">
        ${officerRows}
      </div>
    </div>

    <div class="history-links">
      <h3>Walton County history and public information</h3>
      <div class="history-links-grid">
        ${historyLinkCards}
      </div>
    </div>
    <footer><span>FY 2027 Annual Budget</span><b>10</b></footer>
  </section>

</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-overview.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
