import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";
import { readFileSync } from "fs";

// Builds the FY 2027 Budget Book's "Organizational Structure" page as its
// own single-page PDF -- meant to be inserted right after "Overview of
// Walton County" (see build-overview-of-walton-county.mjs). Shares the
// header/footer/kicker/h1 typographic system the rest of the front matter
// uses. Pulls its narrative copy and chart art from the same source the
// live site's own page uses (pages/organizational-structure.html) --
// deliberately drops that page's "View Full-Size Chart" button, a
// web-only interaction with no equivalent on a printed page.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const imageDataUri = (name, mime) => {
  const filePath = path.join(repoRoot, "assets/images/page-images", name);
  return `data:${mime};base64,` + readFileSync(filePath).toString("base64");
};

const ORG_CHART = imageDataUri("walton-county-org-chart.png", "image/png");

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Organizational Structure</title>
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
    margin:8px 0 .14in;
    color:#003f28;
    font:800 25pt/1.05 Georgia, "Times New Roman", serif;
    letter-spacing:-.02em;
  }
  p{
    max-width:7.3in;
    margin:0 0 .1in;
    color:#33453c;
    font-size:9.8pt;
    line-height:1.55;
  }
  .chart-card{
    display:flex;
    align-items:center;
    justify-content:center;
    margin:.26in 0 0;
    padding:.28in;
    border:1px solid #e4ebe7;
    border-radius:16px;
    background:#fbfcfa;
    box-shadow:0 18px 40px rgba(15,23,38,.08);
  }
  .chart-card img{
    display:block;
    width:100%;
    height:auto;
    max-height:6.55in;
    object-fit:contain;
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
    <small class="kicker">Our County</small>
    <h1>Organizational Structure</h1>
    <p>The chart below illustrates the organizational structure of Walton County Government and its accountability to the citizens it serves. Constitutional officers elected directly by voters are displayed beneath the &ldquo;Citizens&rdquo; section, reflecting their independent roles within county government.</p>
    <p>The Board of County Commissioners provides overall policy direction and oversight through three primary direct reports: the Chief Financial Officer, the County Administrator, and the County Attorney. The Director of Human Resources and the Director of Governmental Coordination report directly to the County Administrator, while other operational departments and service areas are administered through the Deputy County Administrator.</p>
    <div class="chart-card">
      <img src="${ORG_CHART}" alt="Walton County organizational chart">
    </div>
    <footer><span>FY 2027 Annual Budget</span><b>11</b></footer>
  </section>
</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-org-structure.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
