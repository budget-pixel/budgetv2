import { chromium } from "playwright";

// Builds the FY 2027 Budget Book's "Statistical & Supplemental Information"
// section as its own two-page PDF -- meant to be inserted right after
// "Strategic Initiatives" (see build-strategic-initiatives.mjs). Shares the
// header/footer/kicker/h1 typographic system the rest of the front matter
// uses. Condenses the live site's six full-paragraph Census narratives
// (pages/statistical-and-supplemental-information.html, rendered via
// assets/census-narratives.js against assets/census-data.json + a Google
// Sheet of narrative templates) into a compact stat-card grid, and rebuilds
// the Principal Property Tax Payers table as a proper print table. All
// figures below are the real, already-substituted Census Bureau figures
// captured from a previous successful render of the live page -- not
// re-fetched here (the narrative sheet's publish link is unreachable from
// this environment, same issue noted for the transmittal letter).

const TOPICS = [
  {
    title: "Age and Sex",
    stats: [["75,305", "Population, +36.8% since 2010"], ["44.4", "Median Age"]],
    summary: "Walton County's population grew 36.8% since 2010, reaching 75,305 residents with a median age of 44.4 &mdash; older than Florida's 42.4, reflecting the county's appeal as a retirement and vacation destination. Veterans make up 11.9% of residents, compared to 7.9% statewide."
  },
  {
    title: "Income and Earnings",
    stats: [["$74,832", "Median Household Income"], ["$101,823", "Married-Couple Family Income"]],
    summary: "Walton County's median household income of $74,832 is above Florida's state median of $67,917. Families report a median income of $91,969, with married-couple families earning $101,823 on average."
  },
  {
    title: "Educational Attainment",
    stats: [["33.1%", "Bachelor's Degree or Higher"], ["75.3%", "Enrolled Students, K&ndash;12"]],
    summary: "Among residents 25 and older, 33.1% hold a bachelor's degree or higher &mdash; just above Florida's 32.3% average. Three-quarters of enrolled students attend kindergarten through 12th grade."
  },
  {
    title: "Class of Worker",
    stats: [["74%", "Private-Sector Employment"], ["12%", "Government Employment"]],
    summary: "Nearly three-quarters of Walton County workers are employed by private companies. The remainder are self-employed, work for nonprofits, or are employed by local, state, or federal government."
  },
  {
    title: "Housing",
    stats: [["77.7%", "Homeownership Rate"], ["$1,463", "Median Gross Rent"]],
    summary: "77.7% of Walton County households own their home, well above Florida's 66.9% rate. Of the county's 56,744 housing units, 31,491 are occupied. Nearly a quarter are valued between $300,000 and $499,999."
  },
  {
    title: "Industry",
    stats: [["15.9%", "Professional & Scientific Services"], ["12.8%", "Arts, Entertainment & Hospitality"]],
    summary: "Walton County's economy spans professional services, tourism, and construction. Professional, scientific, and management services form the largest single employment sector, followed by education, health care, and hospitality."
  }
];

const TAXPAYERS = [
  ["FL Power and Light", "$167,818,558", "0.36%"],
  ["EBSCO Gulf Coast Development", "$166,886,571", "0.36%"],
  ["Choctawhatchee Electric Cooperative", "$158,087,812", "0.34%"],
  ["San Destin Hilton, LTD", "$88,281,993", "0.19%"],
  ["San Destin Hotel LLC", "$79,623,812", "0.17%"],
  ["HC Ariza Owner LLC", "$60,661,400", "0.13%"],
  ["15 Blue Cover Drive Partners LLC", "$59,389,315", "0.13%"],
  ["Sandestin Investments LLC", "$51,546,748", "0.11%"],
  ["Origins Crossings LLC", "$50,345,789", "0.11%"],
  ["SJRBH LLC", "$49,752,395", "0.11%"]
];
const TAXPAYERS_TOTAL = ["$932,394,393", "2.01%"];

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
    font:800 22pt/1.05 Georgia, "Times New Roman", serif;
    letter-spacing:-.02em;
  }
  p.intro{
    max-width:7.3in;
    margin:0 0 .22in;
    color:#33453c;
    font-size:9.5pt;
    line-height:1.5;
  }
  .topic-grid{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:.16in;
  }
  .topic-card{
    padding:.16in .18in;
    border:1px solid #e4ebe7;
    border-radius:12px;
    background:#fbfcfa;
  }
  .topic-card h2{
    margin:0 0 .1in;
    color:#003f28;
    font:800 11pt/1.2 Georgia, serif;
  }
  .topic-stats{
    display:flex;
    gap:.18in;
    margin:0 0 .09in;
  }
  .topic-stat b{
    display:block;
    color:#003f28;
    font:800 14pt/1.1 Georgia, serif;
  }
  .topic-stat span{
    display:block;
    margin-top:2px;
    color:#68786f;
    font-size:6.9pt;
    font-weight:700;
    letter-spacing:.02em;
    text-transform:uppercase;
    line-height:1.3;
  }
  .topic-card p{
    margin:0;
    color:#33453c;
    font-size:8.4pt;
    line-height:1.45;
  }
  .source-note{
    margin:.16in 0 0;
    color:#68786f;
    font-size:7.3pt;
    font-style:italic;
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
  table{
    width:100%;
    border-collapse:collapse;
    margin-top:.14in;
  }
  thead th{
    padding:.1in .12in;
    border-bottom:2px solid #d1be78;
    color:#003f28;
    font-size:8pt;
    font-weight:900;
    letter-spacing:.04em;
    text-transform:uppercase;
    text-align:left;
  }
  thead th.num{ text-align:right; }
  tbody td{
    padding:.09in .12in;
    border-bottom:1px solid #e4ebe7;
    color:#33453c;
    font-size:9.3pt;
  }
  tbody td.num{
    text-align:right;
    color:#003f28;
    font-weight:700;
    font-variant-numeric:tabular-nums;
  }
  tbody tr.total td{
    border-top:2px solid #003f28;
    border-bottom:0;
    color:#003f28;
    font-weight:800;
  }
`;

const topicCards = TOPICS.map((t) => `
  <div class="topic-card">
    <h2>${t.title}</h2>
    <div class="topic-stats">
      ${t.stats.map(([value, label]) => `<div class="topic-stat"><b>${value}</b><span>${label}</span></div>`).join("")}
    </div>
    <p>${t.summary}</p>
  </div>
`).join("");

const taxpayerRows = TAXPAYERS.map(([name, value, pct]) =>
  `<tr><td>${name}</td><td class="num">${value}</td><td class="num">${pct}</td></tr>`
).join("");

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Statistical &amp; Supplemental Information</title>
<style>${sharedCss}</style></head>
<body>

  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Our County</small>
    <h1>Statistical &amp; Supplemental Information</h1>
    <p class="intro">The following data, provided by the U.S. Census Bureau, offers a statistical profile of Walton County&rsquo;s population and economy, supplementing the financial information presented throughout this budget document.</p>
    <div class="topic-grid">
      ${topicCards}
    </div>
    <p class="source-note">Source: U.S. Census Bureau, ACS 5-Year Estimates. Data current as of August 2026.</p>
    <footer><span>FY 2027 Annual Budget</span><b>13</b></footer>
  </section>

  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Our County</small>
    <h1>Principal Property Tax Payers</h1>
    <p class="intro">The table below lists the top taxpayers in Walton County, highlighting their assessed property values and contributions to the total net assessed value. Collectively, these ten taxpayers account for 2.01% of the County&rsquo;s total net assessed value &mdash; a reminder that Walton County&rsquo;s tax base is broad, not concentrated in a handful of major property owners.</p>
    <table>
      <thead><tr><th>Taxpayer</th><th class="num">Assessed Value</th><th class="num">% of Total Net Assessed Value</th></tr></thead>
      <tbody>
        ${taxpayerRows}
        <tr class="total"><td>Total</td><td class="num">${TAXPAYERS_TOTAL[0]}</td><td class="num">${TAXPAYERS_TOTAL[1]}</td></tr>
      </tbody>
    </table>
    <p class="source-note">Source: Walton County Property Appraiser.</p>
    <footer><span>FY 2027 Annual Budget</span><b>14</b></footer>
  </section>

</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-statistical-info.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
