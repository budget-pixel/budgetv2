import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";
import { readFileSync } from "fs";

// Builds the FY 2027 Budget Book's title page as its own single-page,
// full-bleed PDF -- meant to be prepended to the rest of the assembled book
// (see build-budget-toc.mjs, build-department-book.mjs, build-county-
// overview.mjs for the other pieces of that same pipeline). Kept as a
// standalone HTML document with its own zero-margin @page, the same
// approach build-budget-toc.mjs uses, rather than reusing
// pages/full-budget-document.html's cover markup -- that page's cover is
// still there for the self-serve "Print / Save as PDF" browser flow, but it
// has to live inside the sitewide nav.js/budget-pdf.js print pipeline
// (@page margin, injected print headers, etc.), which fights a true
// full-bleed photo cover. This script has no such constraints.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
// Playwright's page.setContent() injects into an about:blank document,
// which has no origin to resolve file:// image requests against -- they
// silently fail to load. Inlining as data URIs sidesteps that entirely.
const imageDataUri = (name, mime) => {
  const filePath = path.join(repoRoot, "assets/images/page-images", name);
  return `data:${mime};base64,` + readFileSync(filePath).toString("base64");
};

const COVER_PHOTO = imageDataUri("homepage-hero.jpg", "image/jpeg");
const COUNTY_SEAL = imageDataUri("walton-county-logo-no-background.png", "image/png");
const GFOA_MARK = imageDataUri("gfoa-logo-mark.png", "image/png");

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>FY 2027 Budget Book Cover</title>
<style>
  @page{ size:letter portrait; margin:0; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ font-family:Arial, Helvetica, sans-serif; }
  .cover{
    position:relative;
    width:8.5in;
    height:11in;
    overflow:hidden;
    color:#fff;
    background:#0b2a20;
  }
  .cover-photo{
    position:absolute;
    inset:0;
    width:100%;
    height:100%;
    object-fit:cover;
    object-position:center center;
  }
  .cover-scrim-top{
    position:absolute;
    top:0; left:0; right:0;
    height:3.1in;
    background:linear-gradient(180deg, rgba(4,28,20,.62) 0%, rgba(4,28,20,.28) 55%, rgba(4,28,20,0) 100%);
  }
  .cover-scrim-bottom{
    position:absolute;
    bottom:0; left:0; right:0;
    height:7.9in;
    background:linear-gradient(180deg, rgba(3,23,16,0) 0%, rgba(3,20,14,.5) 22%, rgba(3,19,13,.78) 46%, rgba(2,15,11,.9) 70%, rgba(1,10,7,.95) 100%);
  }
  .cover-frame{
    position:absolute;
    inset:.28in;
    border:1px solid rgba(255,255,255,.38);
    pointer-events:none;
  }
  .cover-content{
    position:relative;
    z-index:1;
    display:flex;
    flex-direction:column;
    justify-content:space-between;
    height:100%;
    padding:.62in .68in .55in;
  }
  .cover-top{
    display:flex;
    align-items:center;
    gap:.16in;
  }
  .cover-seal{
    width:.72in;
    height:.72in;
    flex:0 0 .72in;
    border-radius:50%;
    border:3px solid #d1be78;
    background:#ffffff url("${COUNTY_SEAL}") center center / .66in .66in no-repeat;
    box-shadow:0 2px 10px rgba(0,0,0,.35);
    box-sizing:border-box;
  }
  .cover-top-text{
    display:flex;
    flex-direction:column;
    align-items:flex-start;
    width:3.75in;
    line-height:1.15;
  }
  .cover-top-text em{
    display:block;
    font-style:normal;
    color:#f4f2e8;
    font-size:9.5pt;
    font-weight:800;
    letter-spacing:.14em;
    text-transform:uppercase;
    white-space:nowrap;
  }
  .cover-main{
    max-width:7in;
    margin-top:auto;
    margin-bottom:.62in;
  }
  .cover-kicker{
    margin:0 0 .18in;
    color:#e7c95f;
    font-size:11pt;
    font-weight:800;
    letter-spacing:.24em;
    text-transform:uppercase;
  }
  .cover-title{
    margin:0;
    font-family:Georgia, "Times New Roman", serif;
    font-weight:800;
    font-size:76pt;
    line-height:.96;
    letter-spacing:-.02em;
    text-shadow:0 2px 22px rgba(0,0,0,.35);
  }
  .cover-subtitle{
    margin:.14in 0 0;
    color:#e7c95f;
    font-size:16pt;
    font-weight:800;
    letter-spacing:.06em;
    text-transform:uppercase;
  }
  .cover-rule{
    width:.95in;
    height:4px;
    margin:.3in 0 .2in;
    background:#e7c95f;
  }
  .cover-tagline{
    margin:0;
    max-width:5.6in;
    color:#eef4f0;
    font-size:12.5pt;
    line-height:1.5;
  }
  .cover-bottom{
    display:flex;
    flex-direction:column;
    gap:.22in;
  }
  .cover-award{
    display:inline-flex;
    align-items:center;
    gap:.16in;
    align-self:flex-start;
    padding:.13in .22in .13in .16in;
    border-radius:999px;
    background:rgba(255,255,255,.96);
    box-shadow:0 6px 18px rgba(0,0,0,.22);
  }
  .cover-award img{
    width:.5in;
    height:.5in;
    object-fit:contain;
  }
  .cover-award-text{
    display:flex;
    flex-direction:column;
    line-height:1.22;
  }
  .cover-award-text b{
    color:#0b2a20;
    font-size:9.6pt;
    font-weight:800;
    letter-spacing:.02em;
  }
  .cover-award-text span{
    color:#4d5f57;
    font-size:8pt;
    font-weight:700;
    letter-spacing:.05em;
    text-transform:uppercase;
  }
  .cover-meta{
    display:flex;
    align-items:center;
    justify-content:flex-end;
    gap:.3in;
    padding-top:.2in;
    border-top:1px solid rgba(255,255,255,.32);
    font-size:9.5pt;
    font-weight:800;
    letter-spacing:.08em;
    text-transform:uppercase;
    color:#f4f2e8;
  }
</style></head>
<body>
  <div class="cover">
    <img class="cover-photo" src="${COVER_PHOTO}" alt="">
    <div class="cover-scrim-top"></div>
    <div class="cover-scrim-bottom"></div>
    <div class="cover-frame"></div>
    <div class="cover-content">
      <div class="cover-top">
        <div class="cover-seal"></div>
        <div class="cover-top-text">
          <em>Board of County Commissioners</em>
        </div>
      </div>
      <div class="cover-main">
        <p class="cover-kicker">Fiscal Year 2027 &middot; Tentative Budget</p>
        <h1 class="cover-title">Walton<br>County</h1>
        <p class="cover-subtitle">Annual Budget Book</p>
        <div class="cover-rule"></div>
        <p class="cover-tagline">A financial plan for public services, infrastructure, and the future of the County.</p>
      </div>
      <div class="cover-bottom">
        <div class="cover-award">
          <img src="${GFOA_MARK}" alt="">
          <div class="cover-award-text">
            <b>GFOA Distinguished Budget</b>
            <span>Presentation Award</span>
          </div>
        </div>
        <div class="cover-meta">
          <span>Tentative &bull; October 1, 2026 &ndash; September 30, 2027</span>
        </div>
      </div>
    </div>
  </div>
</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-cover.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 816, height: 1056 });
await page.setContent(html, { waitUntil: "networkidle" });

// Flatten the completed composition to an opaque sRGB JPEG before placing it
// in the PDF. Some browser PDF viewers incorrectly apply the cover's
// semi-transparent gradients as a magenta blending layer. A flattened image
// preserves the intended appearance consistently across PDF.js, Preview,
// Acrobat, Chromium, and print workflows.
const coverBox = await page.locator(".cover").boundingBox();
const flattened = await page.screenshot({ type: "jpeg", quality: 96, clip: coverBox });
await page.close();
const flatPage = await browser.newPage();
await flatPage.setContent(`<!doctype html><html><head><style>@page{size:letter portrait;margin:0}html,body{margin:0;width:8.5in;height:11in;overflow:hidden}img{display:block;width:8.5in;height:11in}</style></head><body><img src="data:image/jpeg;base64,${flattened.toString("base64")}" alt="Walton County FY2027 Tentative Budget Book cover"></body></html>`, { waitUntil: "networkidle" });
await flatPage.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
