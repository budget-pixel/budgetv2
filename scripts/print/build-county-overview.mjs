import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
await page.goto("http://127.0.0.1:8765/pages/overview-of-walton-county.html", { waitUntil: "networkidle", timeout: 120000 });
await page.addStyleTag({ path: "assets/budget-book-print.css" });
await page.emulateMedia({ media: "print" });
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", resolve, { once: true });
  })));
});
await page.pdf({
  path: "/private/tmp/overview-of-walton-county-polished.pdf",
  format: "Letter",
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: false,
  margin: { top: "0", right: "0", bottom: "0", left: "0" }
});
await browser.close();
