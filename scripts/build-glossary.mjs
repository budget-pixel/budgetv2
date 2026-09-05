import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";
import { readFileSync } from "fs";

// Builds the FY 2027 Budget Book's "Glossary, Acronyms, and Frequently
// Asked Questions" section as its own multi-page PDF -- meant to be
// inserted right after "Statistical & Supplemental Information" (see
// build-statistical-information.mjs), closing out the "Introduction and
// Our County" front-matter chapter. Shares the header/footer/kicker/h1
// typographic system the rest of the front matter uses.
//
// The FAQ and glossary content is parsed directly out of the live site's
// own source (pages/glossary-acronyms-and-frequently-asked-questions.html)
// rather than retyped by hand, so it stays byte-for-byte faithful to the
// real Q&A copy and the full 112-term glossary. Drops that page's
// interactive elements (the live search box, "View All Terms" toggle) --
// web-only interactions with no print equivalent -- in favor of a
// straightforward two-column dictionary layout, the same call made for
// Organizational Structure's "View Full-Size Chart" button.
//
// Glossary definitions vary wildly in length (one entry, "Modified Accrual
// Basis", runs 12x longer than most others), so a fixed terms-per-page
// count either overflows the page or wastes half of it. Pagination is
// computed by actually measuring each entry's rendered height in a headless
// page at the real column width, then greedily packing two columns per
// page against the real available column height -- rather than guessed at.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const sourceHtml = readFileSync(path.join(repoRoot, "pages/glossary-acronyms-and-frequently-asked-questions.html"), "utf8");

function extractFaqs(html) {
  const faqs = [];
  const re = /<details class="wc-faq-card">\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/g;
  let m;
  while ((m = re.exec(html))) faqs.push([m[1].trim(), m[2].trim()]);
  return faqs;
}

function extractGlossary(html) {
  const start = html.indexOf("const glossary = [");
  const end = html.indexOf("];", start);
  const arrText = html.slice(start, end);
  const terms = [];
  const re = /\{\s*term:\s*"((?:[^"\\]|\\.)*)",\s*definition:\s*"((?:[^"\\]|\\.)*)"\s*\}/g;
  let m;
  while ((m = re.exec(arrText))) terms.push([m[1], m[2]]);
  return terms;
}

const FAQS = extractFaqs(sourceHtml);
// The source array isn't consistently alphabetized (it reads as several
// batches appended over time -- A through V, then a second A-through-H
// batch, then a few stragglers) -- sorted here for a proper dictionary-
// style reference. Pure re-ordering, no content changed.
const GLOSSARY = extractGlossary(sourceHtml).sort((a, b) => a[0].localeCompare(b[0]));
if (FAQS.length < 10) throw new Error("FAQ extraction looks wrong -- found " + FAQS.length);
if (GLOSSARY.length < 100) throw new Error("Glossary extraction looks wrong -- found " + GLOSSARY.length);

const sharedCss = `
  @page{ size:letter portrait; margin:0; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ font-family:Arial, Helvetica, sans-serif; color:#173229; }
  section{
    position:relative;
    width:8.5in;
    height:11in;
    padding:.56in .62in .72in;
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
  h1.continued{ font-size:16pt; margin-top:.28in; }
  h1.continued span{ color:#68786f; font-size:10pt; font-weight:400; }
  p.intro{
    max-width:7.3in;
    margin:0 0 .2in;
    color:#33453c;
    font-size:9.5pt;
    line-height:1.5;
  }
  .contact-card{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:.3in;
    margin:0 0 .26in;
    padding:.2in .26in;
    border:1px solid #d1be78;
    border-radius:12px;
    background:#f9f8f2;
  }
  .contact-card h2{
    margin:0 0 .06in;
    color:#003f28;
    font:800 12pt/1.2 Georgia, serif;
  }
  .contact-card p{
    margin:0;
    max-width:4.6in;
    color:#33453c;
    font-size:9pt;
    line-height:1.45;
  }
  .contact-links{
    flex:0 0 auto;
    display:flex;
    flex-direction:column;
    gap:.06in;
    text-align:right;
  }
  .contact-links a{
    color:#003f28;
    font-size:9.3pt;
    font-weight:800;
    text-decoration:none;
  }
  .faq-list{
    display:grid;
    gap:.16in;
  }
  .faq-item{
    padding-left:.2in;
    border-left:3px solid #d1be78;
  }
  .faq-item h3{
    margin:0 0 .05in;
    color:#003f28;
    font-size:10.3pt;
    font-weight:800;
  }
  .faq-item p{
    margin:0;
    color:#33453c;
    font-size:9.2pt;
    line-height:1.48;
  }
  .glossary-columns{
    display:flex;
    gap:.4in;
  }
  .glossary-col{
    flex:1 1 0;
    min-width:0;
  }
  .glossary-item{
    margin:0 0 .14in;
  }
  .glossary-item dt{
    color:#003f28;
    font-size:9.3pt;
    font-weight:800;
  }
  .glossary-item dd{
    margin:.02in 0 0;
    color:#33453c;
    font-size:8.3pt;
    line-height:1.42;
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
`;

const faqPageHtml = (faqs, pageNumber, isFirst) => `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    ${isFirst ? `
    <small class="kicker">Reference</small>
    <h1>Glossary, Acronyms &amp; FAQ</h1>
    <p class="intro">Review common questions about Walton County&rsquo;s budget process, revenues, taxes, and capital improvement planning, followed by a glossary of budget terminology used throughout this document.</p>
    <div class="contact-card">
      <div>
        <h2>Need Help Understanding the Budget?</h2>
        <p>Contact the Walton County Office of Management and Budget for assistance with the annual budget, capital improvement plan, financial reports, or budget terminology.</p>
      </div>
      <div class="contact-links">
        <a href="tel:18508928470">(850) 892-8470</a>
        <a href="mailto:budget@mywaltonfl.gov">budget@mywaltonfl.gov</a>
      </div>
    </div>
    ` : `<h1 class="continued">Frequently Asked Questions <span>(continued)</span></h1>`}
    <div class="faq-list">
      ${faqs.map(([q, a]) => `<div class="faq-item"><h3>${q}</h3><p>${a}</p></div>`).join("")}
    </div>
    <footer><span>FY 2027 Tentative Budget</span><b>${pageNumber}</b></footer>
  </section>
`;

const glossaryItemHtml = ([term, def]) => `<div class="glossary-item"><dt>${term}</dt><dd>${def}</dd></div>`;

const glossaryPageHtml = (leftCol, rightCol, pageNumber, isFirst) => `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    ${isFirst ? `
    <small class="kicker">Reference</small>
    <h1>Glossary of Budget Terms</h1>
    <p class="intro">Definitions of terms and acronyms used throughout Walton County&rsquo;s budget document.</p>
    ` : `<h1 class="continued">Glossary of Budget Terms <span>(continued)</span></h1>`}
    <div class="glossary-columns">
      <div class="glossary-col">${leftCol.map(glossaryItemHtml).join("")}</div>
      <div class="glossary-col">${rightCol.map(glossaryItemHtml).join("")}</div>
    </div>
    <footer><span>FY 2027 Tentative Budget</span><b>${pageNumber}</b></footer>
  </section>
`;

// --- Measure each glossary item's real rendered height at the actual
// column width, and the real vertical offset where the two-column block
// starts on both the first glossary page and a "(continued)" page, then
// greedily pack two columns per page against the real available column
// height -- rather than guessing a fixed terms-per-page count or hand-
// estimated header heights, both of which undercounted the space "Modified
// Accrual Basis" (12x longer than a typical entry) actually needs. ---
const PAGE_BOTTOM_PADDING_IN = 0.72;

async function measureLayout(browser, items) {
  const page = await browser.newPage();
  await page.setContent(`<!doctype html><html><head><style>${sharedCss}</style></head><body>
    <section id="first">
      <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
      <small class="kicker">Reference</small>
      <h1>Glossary of Budget Terms</h1>
      <p class="intro">Definitions of terms and acronyms used throughout Walton County&rsquo;s budget document.</p>
      <div class="glossary-columns" id="cols-first"><div class="glossary-col"></div><div class="glossary-col"></div></div>
    </section>
    <section id="continued">
      <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
      <h1 class="continued">Glossary of Budget Terms <span>(continued)</span></h1>
      <div class="glossary-columns" id="cols-continued"><div class="glossary-col"></div><div class="glossary-col"></div></div>
    </section>
    <div id="measure" style="position:absolute;top:0;left:0;visibility:hidden">
      ${items.map((it, i) => `<div class="glossary-item" id="m${i}" style="width:200px">${glossaryItemHtml(it)}</div>`).join("")}
    </div>
  </body></html>`);
  const result = await page.evaluate((n) => {
    const colWidth = document.querySelector("#cols-first .glossary-col").getBoundingClientRect().width;
    document.querySelectorAll("#measure .glossary-item").forEach((el) => { el.style.width = colWidth + "px"; });
    const heights = [];
    for (let i = 0; i < n; i++) heights.push(document.getElementById("m" + i).getBoundingClientRect().height);
    const firstTop = document.getElementById("cols-first").getBoundingClientRect().top - document.getElementById("first").getBoundingClientRect().top;
    const continuedTop = document.getElementById("cols-continued").getBoundingClientRect().top - document.getElementById("continued").getBoundingClientRect().top;
    return { heights, firstTop, continuedTop, pxPerIn: 96 };
  }, items.length);
  await page.close();
  return result;
}

function packColumn(items, heights, startIndex, budgetIn) {
  let used = 0;
  let i = startIndex;
  while (i < items.length) {
    const h = heights[i];
    if (used > 0 && used + h > budgetIn) break;
    used += h;
    i++;
  }
  return i; // exclusive end index
}

// Height-sum prediction gets the ballpark right but doesn't always match
// the real print layout closely enough to trust blindly (measured in a
// plain viewport, not Chromium's print pipeline) -- so each candidate page
// is then actually rendered and checked for overflow, trimming items back
// into the next page's pool until it truly fits. Slower than pure
// prediction, but the only way to guarantee no entry collides with the
// footer.
async function checkPageOverflow(measurePage, leftItems, rightItems, isFirst, contentBottomIn) {
  const bodyHtml = glossaryPageHtml(leftItems, rightItems, 0, isFirst);
  await measurePage.setContent(`<!doctype html><html><head><style>${sharedCss}</style></head><body>${bodyHtml}</body></html>`);
  return measurePage.evaluate((limitPx) => {
    const section = document.querySelector("section");
    const sectionTop = section.getBoundingClientRect().top;
    const cols = document.querySelectorAll(".glossary-col");
    const bottoms = Array.from(cols).map((col) => {
      const kids = col.querySelectorAll(".glossary-item");
      if (!kids.length) return 0;
      return kids[kids.length - 1].getBoundingClientRect().bottom - sectionTop;
    });
    return { leftBottom: bottoms[0] || 0, rightBottom: bottoms[1] || 0, limitPx };
  }, contentBottomIn * 96);
}

async function checkFaqOverflow(measurePage, faqs, isFirst, contentBottomIn) {
  const bodyHtml = faqPageHtml(faqs, 0, isFirst);
  await measurePage.setContent(`<!doctype html><html><head><style>${sharedCss}</style></head><body>${bodyHtml}</body></html>`);
  return measurePage.evaluate((limitPx) => {
    const section = document.querySelector("section");
    const sectionTop = section.getBoundingClientRect().top;
    const items = document.querySelectorAll(".faq-item");
    const bottom = items.length ? items[items.length - 1].getBoundingClientRect().bottom - sectionTop : 0;
    return { bottom, limitPx };
  }, contentBottomIn * 96);
}

async function paginateFaqs(browser, faqs) {
  const measurePage = await browser.newPage();
  const contentBottomIn = 11 - PAGE_BOTTOM_PADDING_IN - 0.06;
  const pages = [];
  let i = 0;
  let isFirst = true;
  while (i < faqs.length) {
    let end = faqs.length;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const candidate = faqs.slice(i, end);
      const { bottom, limitPx } = await checkFaqOverflow(measurePage, candidate, isFirst, contentBottomIn);
      if (bottom <= limitPx || candidate.length <= 1) break;
      end--;
    }
    if (end <= i) end = i + 1;
    pages.push({ items: faqs.slice(i, end), isFirst });
    i = end;
    isFirst = false;
  }
  await measurePage.close();
  return pages;
}

async function paginateGlossary(browser, items, heights, budgetFirstIn, budgetContinuedIn) {
  const measurePage = await browser.newPage();
  const contentBottomIn = 11 - PAGE_BOTTOM_PADDING_IN - 0.06;
  const pages = [];
  let i = 0;
  let isFirst = true;
  while (i < items.length) {
    const budgetIn = isFirst ? budgetFirstIn : budgetContinuedIn;
    let leftEnd = packColumn(items, heights, i, budgetIn);
    let rightEnd = packColumn(items, heights, leftEnd, budgetIn);
    // Verify + trim loop.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const left = items.slice(i, leftEnd);
      const right = items.slice(leftEnd, rightEnd);
      const { leftBottom, rightBottom, limitPx } = await checkPageOverflow(measurePage, left, right, isFirst, contentBottomIn);
      const leftOverflow = leftBottom > limitPx && left.length > 0;
      const rightOverflow = rightBottom > limitPx && right.length > 0;
      if (!leftOverflow && !rightOverflow) break;
      if (rightOverflow) { rightEnd--; continue; }
      if (leftOverflow) { leftEnd--; rightEnd = Math.max(rightEnd - 1, leftEnd); rightEnd = packColumn(items, heights, leftEnd, budgetIn); continue; }
      break;
    }
    if (leftEnd <= i) leftEnd = i + 1; // safety: always make progress
    if (rightEnd < leftEnd) rightEnd = leftEnd;
    pages.push({ left: items.slice(i, leftEnd), right: items.slice(leftEnd, rightEnd), isFirst });
    i = rightEnd;
    isFirst = false;
  }
  await measurePage.close();
  return pages;
}

const startPage = Number(process.argv[3] || 15);
const browser = await chromium.launch({ headless: true });

const layout = await measureLayout(browser, GLOSSARY);
const PAGE_CONTENT_BOTTOM_PX = (11 - PAGE_BOTTOM_PADDING_IN) * layout.pxPerIn;
const SAFETY_MARGIN_PX = 0.1 * layout.pxPerIn;
const budgetFirstIn = (PAGE_CONTENT_BOTTOM_PX - layout.firstTop - SAFETY_MARGIN_PX) / layout.pxPerIn;
const budgetContinuedIn = (PAGE_CONTENT_BOTTOM_PX - layout.continuedTop - SAFETY_MARGIN_PX) / layout.pxPerIn;
const heights = layout.heights.map((h) => h / layout.pxPerIn);
const glossaryPages = await paginateGlossary(browser, GLOSSARY, heights, budgetFirstIn, budgetContinuedIn);
const faqPages = await paginateFaqs(browser, FAQS);

let pageCounter = startPage;
const pagesHtml = [];
faqPages.forEach((p) => {
  pagesHtml.push(faqPageHtml(p.items, pageCounter, p.isFirst));
  pageCounter++;
});
glossaryPages.forEach((p) => {
  pagesHtml.push(glossaryPageHtml(p.left, p.right, pageCounter, p.isFirst));
  pageCounter++;
});

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Glossary, Acronyms, and Frequently Asked Questions</title>
<style>${sharedCss}</style></head>
<body>${pagesHtml.join("\n")}</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-glossary.pdf";
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath + " (" + pagesHtml.length + " pages total; " + glossaryPages.length + " glossary pages for " + GLOSSARY.length + " terms)");
