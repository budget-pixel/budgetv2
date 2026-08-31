import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 2200 } });

const probe = await page.goto("http://127.0.0.1:8765/pages/budget-book.html", { waitUntil: "networkidle", timeout: 120000 });
await page.waitForFunction(() => document.getElementById("budgetBookLoading").hidden, { timeout: 120000 });
const pageCount = await page.evaluate(async () => (await window.pdfjsLib.getDocument("../output/pdf/walton-county-fy2027-budget-book.pdf").promise).numPages);

for (let start = 1; start <= pageCount; start += 12) {
  const end = Math.min(pageCount, start + 11);
  await page.goto("http://127.0.0.1:8765/pages/budget-book.html", { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForFunction(() => document.getElementById("budgetBookLoading").hidden, { timeout: 120000 });
  await page.evaluate(async ({ start, end }) => {
    const pdf = await window.pdfjsLib.getDocument("../output/pdf/walton-county-fy2027-budget-book.pdf").promise;
    document.body.innerHTML = '<main id="audit" style="display:grid;grid-template-columns:repeat(4,1fr);gap:18px;padding:20px;background:#d9dfdc"></main>';
    for (let number = start; number <= end; number += 1) {
      const pdfPage = await pdf.getPage(number);
      const original = pdfPage.getViewport({ scale: 1 });
      const viewport = pdfPage.getViewport({ scale: 300 / original.width });
      const card = document.createElement("figure");
      const canvas = document.createElement("canvas");
      card.style.cssText = "margin:0;background:white;padding:8px;box-shadow:0 3px 12px #0003";
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.cssText = "width:100%;height:auto;display:block";
      await pdfPage.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      card.appendChild(canvas);
      card.insertAdjacentHTML("beforeend", `<figcaption style="font:700 14px Arial;padding:7px 2px 2px">Page ${number}</figcaption>`);
      document.getElementById("audit").appendChild(card);
    }
  }, { start, end });
  await page.setViewportSize({ width: 1600, height: Math.ceil((end - start + 1) / 4) * 520 + 80 });
  const first = String(start).padStart(3, "0");
  const last = String(end).padStart(3, "0");
  await page.screenshot({ path: `/private/tmp/budget-audit/pages-${first}-${last}.png`, fullPage: true });
  console.log(`${start}-${end}`);
}

await browser.close();
