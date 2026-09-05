import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";
import { readFileSync } from "fs";

// Builds the FY 2027 Budget Book's "GFOA Distinguished Budget Presentation
// Award" page as its own single-page, full-bleed PDF -- meant to be
// inserted as page 2 of the assembled book, right after the cover (see
// build-budget-cover.mjs) and before the Table of Contents (see
// build-budget-toc.mjs). Deliberately a full dark-green "statement" page --
// the same brand color as the cover -- rather than a plain white content
// page, so the front matter reads cover -> award -> (white) TOC as one
// deliberate editorial sequence instead of the award looking like just
// another interior page. Pulls its narrative copy and certificate art from
// the same source the live site's own GFOA award page uses (pages/gfoa-
// distinguished-budget-presentation-award.html).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const imageDataUri = (name, mime) => {
  const filePath = path.join(repoRoot, "assets/images/page-images", name);
  return `data:${mime};base64,` + readFileSync(filePath).toString("base64");
};

const CERTIFICATE = imageDataUri("gfoa-budget-award-certificate.png", "image/png");
const RECOGNITION_CERTIFICATE = imageDataUri("gfoa-award-recognition.png", "image/png");
const GFOA_MARK = imageDataUri("gfoa-logo-mark.png", "image/png");
const COUNTY_SEAL = imageDataUri("walton-county-logo-no-background.png", "image/png");

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>GFOA Distinguished Budget Presentation Award</title>
<style>
  @page{ size:letter portrait; margin:0; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ font-family:Arial, Helvetica, sans-serif; }
  section{
    position:relative;
    width:8.5in;
    height:11in;
    overflow:hidden;
    background:linear-gradient(160deg,#003f28 0%,#0b5a3a 46%,#062c1f 100%);
    color:#fff;
  }
  .ring{
    position:absolute;
    width:6.6in;
    height:6.6in;
    border:1px solid rgba(255,255,255,.13);
    border-radius:50%;
    right:-2.6in;
    top:-2.9in;
  }
  .ring::after{
    content:"";
    position:absolute;
    inset:.55in;
    border:1px solid rgba(255,255,255,.09);
    border-radius:50%;
  }
  .seal-watermark{
    position:absolute;
    width:5.6in;
    height:5.6in;
    right:-1.5in;
    bottom:-1.7in;
    opacity:.05;
    filter:grayscale(1) brightness(2.4);
  }
  .content{
    position:relative;
    z-index:1;
    height:100%;
    padding:.6in .7in .5in;
    box-sizing:border-box;
  }
  header{
    display:flex;
    justify-content:space-between;
    padding-bottom:.14in;
    border-bottom:1px solid rgba(255,255,255,.28);
    color:rgba(255,255,255,.78);
    font-size:8pt;
    font-weight:800;
    letter-spacing:.1em;
    text-transform:uppercase;
  }
  header em{ font-style:normal; }
  .kicker{
    display:block;
    margin-top:.4in;
    color:#e7c95f;
    font-size:8.5pt;
    font-weight:900;
    letter-spacing:.24em;
    text-transform:uppercase;
  }
  h1{
    margin:.14in 0 0;
    max-width:5.9in;
    color:#fff;
    font:800 33pt/1.06 Georgia, "Times New Roman", serif;
    letter-spacing:-.02em;
    text-shadow:0 2px 20px rgba(0,0,0,.25);
  }
  .rule{
    width:.75in;
    height:3px;
    margin:.26in 0 .24in;
    background:#e7c95f;
  }
  .badges{
    display:flex;
    gap:9px;
    margin:0 0 .26in;
  }
  .badge{
    display:inline-flex;
    align-items:center;
    gap:5px;
    padding:6px 14px;
    border:1px solid rgba(231,201,95,.55);
    border-radius:999px;
    background:rgba(255,255,255,.06);
    color:#f3ead0;
    font-size:8.3pt;
    font-weight:800;
    letter-spacing:.05em;
    text-transform:uppercase;
  }
  .badge b{
    color:#fff;
    font-size:9.5pt;
    letter-spacing:0;
    text-transform:none;
  }
  p{
    max-width:4.5in;
    margin:0 0 .16in;
    color:rgba(255,255,255,.86);
    font-size:10.5pt;
    line-height:1.62;
  }
  .certificate-card{
    position:absolute;
    z-index:2;
    right:.5in;
    bottom:.8in;
    padding:.09in;
    border-radius:18px;
    background:#ffffff;
    box-shadow:0 28px 56px rgba(0,0,0,.4);
    transform:rotate(2.25deg);
    transform-origin:center center;
  }
  .certificate-card img{
    display:block;
    width:2.6in;
    height:auto;
    border:2px solid #1f3a5f;
    border-radius:10px;
    background:#ffffff;
  }
  .certificate-card.is-recognition{
    z-index:1;
    right:3.05in;
    bottom:.9in;
    padding:.09in;
    box-shadow:0 28px 56px rgba(0,0,0,.4);
    transform:rotate(-6deg);
  }
  .certificate-card.is-recognition img{
    width:3.9in;
    border:2px solid #e7c95f;
    border-radius:10px;
    background:#ffffff;
  }
  .caption{
    display:flex;
    align-items:center;
    gap:.14in;
    margin-top:.5in;
  }
  .caption-mark{
    display:flex;
    align-items:center;
    justify-content:center;
    width:.4in;
    height:.4in;
    flex:0 0 .4in;
    border-radius:50%;
    background:#ffffff;
  }
  .caption-mark img{
    width:.28in;
    height:.28in;
    object-fit:contain;
  }
  .caption span{
    display:block;
    color:rgba(255,255,255,.62);
    font-size:8pt;
    font-weight:800;
    letter-spacing:.08em;
    text-transform:uppercase;
    line-height:1.4;
  }
  footer{
    position:absolute;
    z-index:1;
    left:.7in;
    right:.7in;
    bottom:.4in;
    display:flex;
    justify-content:space-between;
    padding-top:.14in;
    border-top:1px solid rgba(255,255,255,.24);
    color:rgba(255,255,255,.62);
    font-size:7.5pt;
    font-weight:800;
    letter-spacing:.08em;
    text-transform:uppercase;
  }
</style></head>
<body>
  <section>
    <div class="ring"></div>
    <img class="seal-watermark" src="${COUNTY_SEAL}" alt="">
    <div class="content">
      <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
      <small class="kicker">Introduction and Budget Overview</small>
      <h1>Distinguished Budget Presentation Award</h1>
      <div class="rule"></div>
      <div class="badges">
        <span class="badge"><b>2nd Year</b> Received</span>
        <span class="badge">Submitted for Renewal</span>
      </div>
      <p>The Government Finance Officers Association of the United States and Canada presented a Distinguished Budget Presentation Award to Walton County, Florida for its Annual Budget for the fiscal year beginning October 1, 2025.</p>
      <p>Under GFOA&rsquo;s revised criteria, governments are evaluated on the completeness and clarity of budget communications &mdash; including public priorities, value, long-term outlook, revenues, personnel, departments, programs, capital, process, accessibility, and the tools used to reach public stakeholders.</p>
      <div class="caption">
        <div class="caption-mark"><img src="${GFOA_MARK}" alt=""></div>
        <span>Government Finance<br>Officers Association</span>
      </div>
      <div class="certificate-card is-recognition">
        <img src="${RECOGNITION_CERTIFICATE}" alt="GFOA Certificate of Recognition for Budget Preparation, Walton County Office of Management and Budget">
      </div>
      <div class="certificate-card">
        <img src="${CERTIFICATE}" alt="GFOA Distinguished Budget Presentation Award certificate for Walton County">
      </div>
      <footer><span>FY 2027 Annual Budget</span><b>2</b></footer>
    </div>
  </section>
</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-gfoa-award.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
