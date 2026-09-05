import { chromium } from "playwright";

// Builds the FY 2027 Budget Book's "Strategic Initiatives" page as its own
// single-page PDF -- meant to be inserted right after "Organizational
// Structure" (see build-organizational-structure.mjs). Shares the header/
// footer/kicker/h1 typographic system the rest of the front matter uses.
//
// Per GFOA's Distinguished Budget Presentation Award criteria (Policy
// Document category), a budget document needs a coherent statement of the
// entity's long-term strategic goals and objectives -- this is that
// statement: Mission, Vision, and Core Values.
//
// Updated to the Mission, Vision, and Core Values from the Walton County
// Strategic Plan 2027-2032, adopted by the Board of County Commissioners
// on September 8, 2026 -- the first strategic plan cycle this FY2027
// budget falls under, superseding the prior mission/vision/values that
// had been sourced from the live site's program-budget.html. See the
// "Community Priorities and Organizational Challenges" chapter for the
// plan's six Strategic Priority Areas and their goals.

const CORE_VALUES = ["Transparency", "Integrity", "Accountability", "Reliability", "Efficiency"];

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Strategic Initiatives</title>
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
    margin-top:.28in;
    color:#b89521;
    font-size:8pt;
    font-weight:900;
    letter-spacing:.14em;
    text-transform:uppercase;
  }
  h1{
    margin:8px 0 .1in;
    color:#003f28;
    font:800 25pt/1.05 Georgia, "Times New Roman", serif;
    letter-spacing:-.02em;
  }
  .intro{
    max-width:6.8in;
    margin:0 0 .5in;
    color:#33453c;
    font-size:10pt;
    line-height:1.55;
  }
  .statement{
    max-width:6.9in;
    margin:0 auto .58in;
    padding-left:.3in;
    border-left:4px solid #d1be78;
  }
  .statement.is-vision{ border-left-color:#0b5a3a; }
  .statement-label{
    display:block;
    margin-bottom:.1in;
    color:#b89521;
    font-size:8.5pt;
    font-weight:900;
    letter-spacing:.18em;
    text-transform:uppercase;
  }
  .statement.is-vision .statement-label{ color:#0b5a3a; }
  .statement h2{
    margin:0 0 .12in;
    color:#003f28;
    font:800 14pt/1.2 Georgia, serif;
  }
  .statement p{
    margin:0;
    color:#173229;
    font:italic 400 17pt/1.45 Georgia, serif;
  }
  .values-block{
    max-width:6.9in;
    margin:0 auto;
    padding-left:.3in;
    border-left:4px solid #003f28;
  }
  .values-label{
    display:block;
    margin-bottom:.14in;
    color:#003f28;
    font-size:8.5pt;
    font-weight:900;
    letter-spacing:.18em;
    text-transform:uppercase;
  }
  .values-heading{
    margin:0 0 .18in;
    color:#003f28;
    font:800 14pt/1.2 Georgia, serif;
  }
  .values-row{
    display:flex;
    flex-wrap:wrap;
    gap:.13in;
  }
  .value-pill{
    display:inline-flex;
    align-items:center;
    padding:.1in .22in;
    border:1px solid #d1be78;
    border-radius:999px;
    background:#f9f8f2;
    color:#003f28;
    font-size:10pt;
    font-weight:800;
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
  .plan-note{
    max-width:6.9in;
    margin:.34in auto 0;
    padding:.1in .3in;
    border-left:4px solid #b89521;
    color:#54665e;
    font-size:8pt;
    line-height:1.45;
  }
</style></head>
<body>
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Our County</small>
    <h1>Strategic Initiatives</h1>
    <p class="intro">Walton County&rsquo;s annual budget is built around a shared mission, vision, and set of core values &mdash; the strategic foundation that connects every department&rsquo;s programs and services back to a common purpose. These statements reflect the draft Walton County Strategic Plan 2027&ndash;2032 and remain subject to final Board action.</p>

    <div class="statement">
      <span class="statement-label">Our Foundation &middot; Mission</span>
      <h2>Mission</h2>
      <p>&ldquo;To provide leadership and exceptional public services that enhance quality of life, foster economic opportunity, and ensure a safe community for all who live, work, and visit our county.&rdquo;</p>
    </div>

    <div class="statement is-vision">
      <span class="statement-label">Our Direction &middot; Vision</span>
      <h2>Vision</h2>
      <p>&ldquo;To be a community that inspires trust through excellence, honors our unique heritage, and empowers all residents to thrive.&rdquo;</p>
    </div>

    <div class="values-block">
      <span class="values-label">How We Serve</span>
      <h2 class="values-heading">Core Values</h2>
      <div class="values-row">
        ${CORE_VALUES.map((v) => `<span class="value-pill">${v}</span>`).join("")}
      </div>
    </div>

    <p class="plan-note">The Strategic Plan 2027&ndash;2032 also defines six Strategic Priority Areas &mdash; Public Safety and Health, Planned Growth and Infrastructure, Environment and Natural Resources, Economic Development and Tourism, Government and Operational Performance, and Quality of Life. See the following chapter, Community Priorities and Organizational Challenges, for each area's goals and how the FY2027 budget funds them.</p>

    <footer><span>FY 2027 Annual Budget</span><b>12</b></footer>
  </section>
</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-strategic-initiatives.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
