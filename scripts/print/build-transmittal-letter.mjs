import { capturePublicationHtml, assertPublicationFits } from "./publication-print.mjs";
import { chromium } from "playwright";
import { newPage } from "./readers-guide.mjs"; // page references follow the book's current numbering

// Builds the FY 2027 Budget Book's Transmittal Letter as its own two-page
// PDF -- meant to be inserted right after the GFOA award page (see
// build-budget-gfoa-award.mjs) and before the Table of Contents. Shares the
// header/footer/kicker/h1 typographic system the cover, award page, and TOC
// all use, but on a light page (like the TOC) so the front-matter sequence
// reads cover -> award (dark) -> letter (light) -> TOC (light) as one
// deliberate rhythm rather than every page looking the same.
//
// DRAFT CONTENT: the letter body below is a first draft written for the
// county's Chief Financial Officer to revise -- not a substitute for the
// actual signed letter. The dollar figures are real, pulled directly from
// this site's saved FY 2027 budget dataset and cross-referenced
// against the saved FY 2026 original-budget figures; see the PR/commit notes for the research trail.
// Two figures could not be independently verified and are flagged inline
// with an HTML comment rather than silently guessed: the FY 2027 Capital
// Projects Fund's year-over-year change (the FY 2026 comparison couldn't be
// reliably reconstructed from CIP project-code churn), and countywide
// taxable value (not present in the dataset for FY 2027 at all).

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Transmittal Letter</title>
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
    margin-top:.3in;
    color:#b89521;
    font-size:8pt;
    font-weight:900;
    letter-spacing:.14em;
    text-transform:uppercase;
  }
  h1{
    margin:8px 0 4px;
    color:#003f28;
    font:800 27pt/1.05 Georgia, "Times New Roman", serif;
    letter-spacing:-.025em;
  }
  .byline{
    margin:0 0 .26in;
    color:#68786f;
    font-size:10pt;
    font-style:italic;
  }
  .layout{
    display:flex;
    gap:.4in;
    align-items:flex-start;
  }
  .col-main{
    flex:1 1 auto;
    min-width:0;
  }
  .col-side{
    flex:0 0 2.05in;
    width:2.05in;
    margin-top:.3in;
  }
  p{
    margin:0 0 .11in;
    color:#33453c;
    font-size:10pt;
    line-height:1.5;
  }
  .salutation{
    font-weight:800;
    color:#003f28;
  }
  h2{
    margin:.15in 0 .08in;
    padding-bottom:5px;
    border-bottom:2px solid #d1be78;
    color:#003f28;
    font:700 12.5pt/1.2 Georgia, serif;
  }
  ul{
    display:grid;
    gap:5px;
    margin:0 0 .18in;
    padding-left:16px;
    color:#33453c;
    font-size:9.7pt;
    line-height:1.45;
  }
  li::marker{ color:#b89521; }
  .stat-card{
    padding:.22in .2in;
    border:1px solid #e4ebe7;
    border-radius:12px;
    background:#f9f8f2;
  }
  .stat-card-title{
    margin:0 0 .16in;
    color:#b89521;
    font-size:7.6pt;
    font-weight:900;
    letter-spacing:.12em;
    text-transform:uppercase;
  }
  .stat{
    margin:0 0 .11in;
  }
  .stat-group{
    margin:.14in 0 .08in;
    padding-top:.08in;
    border-top:1px solid #e4ebe7;
    color:#b89521;
    font-size:6.6pt;
    font-weight:900;
    letter-spacing:.1em;
    text-transform:uppercase;
  }
  .stat:last-child{ margin-bottom:0; }
  /* Where each figure is explained in the book. */
  .stat{ position:relative; }
  .stat-page{ position:absolute; top:.03in; right:0; color:#a88418; font-size:6.6pt; font-style:normal; font-weight:800; letter-spacing:.04em; }
  .stat b{
    display:block;
    color:#003f28;
    font:800 15pt/1.1 Georgia, serif;
  }
  .stat span{
    display:block;
    margin-top:2px;
    color:#68786f;
    font-size:7.6pt;
    font-weight:700;
    letter-spacing:.04em;
    text-transform:uppercase;
  }
  .stat em{
    font-style:normal;
    color:#0b7741;
    font-weight:800;
  }
  .stat em.is-down{ color:#a24b1e; }
  .stat em.is-note{ color:#68786f; font-weight:700; }
  .fund-grid{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:.11in;
    margin:0 0 .12in;
  }
  .fund-card{
    padding:.11in .18in;
    border:1px solid #e4ebe7;
    border-radius:10px;
    background:#fbfbf8;
  }
  .fund-card strong{
    display:block;
    margin-bottom:3px;
    color:#003f28;
    font-size:9.3pt;
  }
  .fund-card b{
    font:800 13pt/1.1 Georgia, serif;
    color:#003f28;
  }
  .fund-card em{
    font-style:normal;
    margin-left:6px;
    color:#0b7741;
    font-size:8.6pt;
    font-weight:800;
  }
  .fund-card em.is-down{ color:#a24b1e; }
  .signature-block{
    margin-top:.06in;
  }
  .signature-name{
    margin:0 0 2px;
    color:#003f28;
    font:italic 700 17pt/1 Georgia, serif;
  }
  .signature-title{
    margin:0;
    color:#68786f;
    font-size:8.6pt;
    font-weight:800;
    letter-spacing:.05em;
    text-transform:uppercase;
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
</style></head>
<body>

  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <div class="layout">
      <div class="col-main">
        <small class="kicker">Introduction and Budget Overview</small>
        <h1>Transmittal Letter</h1>
        <p class="byline">A budget message from the Chief Financial Officer</p>
        <p class="salutation">To the Honorable Walton County Board of County Commissioners:</p>
        <p>In accordance with Section 129.03(3), Florida Statutes, I am pleased to transmit Walton County&rsquo;s final budget for Fiscal Year 2027. The adopted plan totals $345.2 million. It maintains current services while funding public safety, infrastructure, and the staffing a growing county needs.</p>
        <p>The Board shaped this budget most directly at the tentative hearing, where it reduced the proposed countywide operating millage from 3.4347 to 3.2500 mills. That change lowers estimated property tax revenue by about $8.6 million. Rather than reduce services to absorb it, the Board kept the expenditure plan as proposed and balanced the difference with $8,047,270 of General Fund balance. Because that draws on accumulated reserves rather than new recurring revenue, the County will need to watch reserve levels and future recurring costs closely.</p>
        <p>Within that framework, the final budget makes four principal commitments:</p>
        <ul>
          <li><strong>Services:</strong> maintain current service levels and fully fund the Sheriff, the other Constitutional Officers, and statutory obligations.</li>
          <li><strong>Capital:</strong> invest $43.8 million in funded capital projects, including roads, drainage, facilities, and other public assets.</li>
          <li><strong>Staffing:</strong> add a net 15 positions where workload requires it, fund a 3% cost-of-living adjustment, and increase the Self-Insurance Fund balance to meet the required 60-day claims reserve.</li>
          <li><strong>Reserves:</strong> fund $50.3 million of the General Fund&rsquo;s $51.7 million target and the Tourist Development Fund&rsquo;s full $137.7 million target.</li>
        </ul>
        <p>The pages that follow detail the revenue assumptions, reserve effects, staffing changes, capital projects, and performance measures behind these commitments.</p>
      </div>
      <div class="col-side">
        <div class="stat-card">
          <p class="stat-card-title">By the Numbers</p>
          <div class="stat">
            <b>$345.2M</b>
            <span>Net Expenditure Budget</span>
            <i class="stat-page">p. ${newPage(19)}</i>
          </div>
          <p class="stat-group">Spending by area</p>
          <div class="stat">
            <b>$135.8M</b>
            <span>Board Department Budgets</span>
            <i class="stat-page">p. ${newPage(70)}</i>
          </div>
          <div class="stat">
            <b>$149.0M</b>
            <span>Constitutional Officers Budgets</span>
            <i class="stat-page">p. ${newPage(52)}</i>
          </div>
          <div class="stat">
            <b>$51.1M</b>
            <span>Capital Budget</span>
            <i class="stat-page">p. ${newPage(109)}</i>
          </div>
          <div class="stat">
            <b>$9.0M</b>
            <span>Other Agencies and Court-Related Budgets</span>
            <i class="stat-page">p. ${newPage(60)}</i>
          </div>
          <p class="stat-group">Revenues</p>
          <div class="stat">
            <b>$153.0M</b>
            <span>Property Tax</span>
            <i class="stat-page">p. ${newPage(31)}</i>
          </div>
          <div class="stat">
            <b>$59.0M</b>
            <span>Tourist Development Tax</span>
            <i class="stat-page">p. ${newPage(27)}</i>
          </div>
          <div class="stat">
            <b>$40.0M</b>
            <span>Discretionary Sales Surtax</span>
            <i class="stat-page">p. ${newPage(27)}</i>
          </div>
          <div class="stat">
            <b>$16.8M</b>
            <span>Local Government &frac12;&#8209;Cent Sales Tax</span>
            <i class="stat-page">p. ${newPage(27)}</i>
          </div>
          <div class="stat">
            <b>$76.5M</b>
            <span>All Other Revenues</span>
            <i class="stat-page">p. ${newPage(27)}</i>
          </div>
          <p class="stat-group">Millage and positions</p>
          <div class="stat">
            <b>3.2500</b>
            <span>County Millage Rate</span>
            <i class="stat-page">p. ${newPage(31)}</i>
          </div>
          <div class="stat">
            <b>665</b>
            <span>Board Department Positions <em>+12</em></span>
            <i class="stat-page">p. ${newPage(105)}</i>
          </div>
          <div class="stat">
            <b>848</b>
            <span>Constitutional Officers and Court Position <em>+3</em></span>
            <i class="stat-page">p. ${newPage(105)}</i>
          </div>
        </div>
      </div>
    </div>
    <footer><span>FY 2027 Final Budget</span><b>3</b></footer>
  </section>

  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h2 style="margin-top:.4in">Budget Summary</h2>
    <p>The Board has adopted a $345.2 million FY 2027 final budget, an increase of $17.3 million, or 5.3%, over the FY 2026 final budget of $327.9 million. The County operating millage rate is reduced to 3.2500 mills, following rates of 3.6000 in FY 2024, 3.5750 in FY 2025, and 3.5190 in FY 2026. Property taxes remain the County&rsquo;s largest revenue source at $153.0 million. Public Safety remains the largest expenditure function at $126.6 million, reflecting the Sheriff&rsquo;s Office budget and the County&rsquo;s own public-safety operations.</p>

    <h2>Fund Highlights</h2>
    <div class="fund-grid">
      <div class="fund-card"><strong>General Fund</strong><b>$81.2M</b><em class="is-down">&minus;2.7%</em></div>
      <div class="fund-card"><strong>Transportation Fund</strong><b>$30.7M</b><em>+15.3%</em></div>
      <div class="fund-card"><strong>Sheriff (Fine &amp; Forfeiture) Fund</strong><b>$114.1M</b><em>0.0%</em></div>
      <div class="fund-card"><strong>Tourist Development Fund</strong><b>$59.0M</b><em>+14.5%</em></div>
      <div class="fund-card"><strong>Solid Waste Fund</strong><b>$23.1M</b><em>+4.6%</em></div>
      <div class="fund-card"><strong>Capital Projects Fund</strong><b>$27.6M</b><em>+35.8%</em></div>
    </div>

    <h2>Investing in Our Workforce</h2>
    <p>The budget includes 1,513 positions, a net increase of 15: 665 Board department positions (up 12) and 848 positions assigned to constitutional officers and the County-funded court position (up 3). Countywide, 1,506 positions are full-time and 7 are part-time. The largest Board department change is in Tourism Beach Operations (up 13), supporting continued Beach Operations and Beach Tram service. The added positions support existing services.</p>

    <h2>Continuity, Capital Investment and Preparedness</h2>
    <p><strong>Service continuity.</strong> The FY 2027 budget maintains current core services while investing in infrastructure and preserving financial flexibility.</p>
    <p><strong>Capital investment.</strong> The funded FY 2027 capital program totals $43.8 million. Grant-dependent projects, the Sheriff/Fine and Forfeiture Fund project, and previously funded tourism projects are listed separately in the project inventory.</p>
    <p><strong>Financial preparedness.</strong> Florida voters are scheduled to consider Amendment 3 in November 2026, which could change the County's taxable property base. The adopted budget uses current law. The County will continue to monitor revenue, reserves, grant awards, service demand, and long-term commitments throughout FY 2027.</p>
    <p>I thank the Board for its guidance and County staff for its work developing this final budget.</p>

    <div class="signature-block">
      <p class="signature-name">Melissa Thomason</p>
      <p class="signature-title">Chief Financial Officer, Office of Management and Budget</p>
    </div>
    <footer><span>FY 2027 Final Budget</span><b>4</b></footer>
  </section>

</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-transmittal-letter.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await capturePublicationHtml(page, outPath);
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, tagged: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
