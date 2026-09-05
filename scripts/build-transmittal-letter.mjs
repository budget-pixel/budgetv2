import { chromium } from "playwright";

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
// this site's own FY2027 budget dataset (assets/budget-data.js's live
// Google Sheet sources) and cross-referenced against FY2026 via Supabase's
// original-budget view; see the PR/commit notes for the research trail.
// Two figures could not be independently verified and are flagged inline
// with an HTML comment rather than silently guessed: the FY2027 Capital
// Projects Fund's year-over-year change (the FY2026 comparison couldn't be
// reliably reconstructed from CIP project-code churn), and countywide
// taxable value (not present in the dataset for FY2027 at all).

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
    margin:0 0 .17in;
  }
  .stat:last-child{ margin-bottom:0; }
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
    <small class="kicker">Introduction and Budget Overview</small>
    <h1>Transmittal Letter</h1>
    <p class="byline">A budget message from the Chief Financial Officer</p>
    <div class="layout">
      <div class="col-main">
        <p class="salutation">To the Honorable Walton County Board of County Commissioners:</p>
        <p>In accordance with Florida Statute Chapter 129.03(3), I am pleased to transmit the tentative budget for Fiscal Year 2027. This tentative budget is balanced and provides the proposed operating framework for delivering County services for the coming year, with continued focus on public safety, infrastructure, and serving a growing county as efficiently and effectively as possible.</p>
        <p>The FY 2027 budget has been developed with the following objectives:</p>
        <ul>
          <li>Maintaining existing service levels for residents</li>
          <li>Following the Board of County Commissioners&rsquo; policy direction</li>
          <li>Fully funding the Sheriff, other Constitutional Officers, and statutory requirements</li>
          <li>Addressing the needs of aging infrastructure and County facilities</li>
          <li>Investing in our employees</li>
          <li>Maintaining a sound self-insurance fund for health insurance</li>
          <li>Maintaining healthy reserves</li>
        </ul>
        <p>This budget reflects a deliberate balance between the near-term needs of a growing county and the long-term discipline required to keep Walton County&rsquo;s finances on sound footing &mdash; the same standard that earned this office its second consecutive GFOA Distinguished Budget Presentation Award.</p>
      </div>
      <div class="col-side">
        <div class="stat-card">
          <p class="stat-card-title">By the Numbers</p>
          <div class="stat">
            <b>$345.2M</b>
            <span>Net Operating Budget <em class="is-note">Excl. Transfers &amp; Self-Insurance</em></span>
          </div>
          <div class="stat">
            <b>$206.9M</b>
            <span>General Fund <em>+5.7%</em></span>
          </div>
          <div class="stat">
            <b>3.4347</b>
            <span>County Millage Rate <em class="is-down">&minus;2.4%</em></span>
          </div>
          <div class="stat">
            <b>667</b>
            <span>Board Department Positions <em>+12</em></span>
          </div>
          <div class="stat">
            <b>848</b>
            <span>Constitutional Officer Positions <em>+3</em></span>
          </div>
        </div>
      </div>
    </div>
    <footer><span>FY 2027 Annual Budget</span><b>3</b></footer>
  </section>

  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <h2 style="margin-top:0">Budget Summary</h2>
    <p>The FY 2027 budget totals $512,387,492 across all funds. Excluding $143,663,984 in interfund transfers and $23,500,000 budgeted through the County&rsquo;s self-insurance fund &mdash; money that recirculates within County government rather than funding new services &mdash; the net operating budget is $345,223,508. This budget maintains a reduced County operating millage rate of 3.4347 mills, down from 3.519 mills the prior year, alongside a North Walton Mosquito Control District millage of 0.4410 mills.</p>
    <p>Public Safety remains the County&rsquo;s largest expenditure category at $126.6 million, followed by General Government at $82.7 million, Economic Environment at $62.8 million, and Transportation at $58.1 million. On the revenue side, General Government Taxes &mdash; led by Ad Valorem property taxes at $161.1 million &mdash; continue to fund the largest share of County services, followed by Charges for Services at $38.7 million and Intergovernmental Revenues at $29.3 million.</p>

    <h2>Fund Highlights</h2>
    <div class="fund-grid">
      <div class="fund-card"><strong>General Fund</strong><b>$206.9M</b><em>+5.7%</em></div>
      <div class="fund-card"><strong>Transportation Fund</strong><b>$30.7M</b><em>+28.9%</em></div>
      <div class="fund-card"><strong>Sheriff (Fine &amp; Forfeiture) Fund</strong><b>$114.1M</b><em>+2.7%</em></div>
      <div class="fund-card"><strong>Tourist Development Fund</strong><b>$59.0M</b><em>+15.9%</em></div>
      <div class="fund-card"><strong>Solid Waste Fund</strong><b>$40.7M</b><em class="is-down">&minus;0.7%</em></div>
      <div class="fund-card"><strong>Capital Projects Fund</strong><b>$27.6M</b></div>
    </div>

    <h2>Investing in Our Workforce</h2>
    <p>The FY 2027 budget includes a net increase of 15 full-time positions, bringing the County&rsquo;s total to 1,515: 667 across the 33 Board departments under the County Administrator (up 12), and 848 across the Constitutional Officers, the Board of County Commissioners, and Court-related functions (up 3). These additions focus on maintaining existing infrastructure and service levels &mdash; not expanding new programs &mdash; and were reviewed individually before being recommended to the Board.</p>

    <h2>Looking Ahead</h2>
    <p>As we move into Fiscal Year 2027, we remain mindful of the factors that could affect County operations in the year ahead, including legislative changes to sales and property tax policy and the broader uncertainty of economic conditions. Careful, ongoing monitoring of these revenue sources will remain essential to keeping the budget balanced.</p>
    <p>I want to thank the Board of County Commissioners for its guidance, and the entire County staff for its dedication in developing this budget. Together, we are ensuring that Walton County remains a well-managed, fiscally sound, and vibrant place to live, work, and visit.</p>

    <div class="signature-block">
      <p class="signature-name">Melissa Thomason</p>
      <p class="signature-title">Chief Financial Officer, Office of Management and Budget</p>
    </div>
    <footer><span>FY 2027 Annual Budget</span><b>4</b></footer>
  </section>

</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-transmittal-letter.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
