import { chromium } from "playwright";
const files = process.argv.slice(2);
const browser = await chromium.launch({ headless: true });
for (const f of files) {
  const page = await browser.newPage();
  await page.goto("http://localhost:8791/" + f, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);
  let target = page.frames().find(fr => fr.url().includes("embed=department-popup")) || page.mainFrame();
  try { await target.waitForLoadState("networkidle", {timeout: 8000}); } catch(e) {}
  await page.waitForTimeout(9000);
  const text = await target.evaluate(() => document.body.innerText).catch(e=>"ERR:"+e.message);
  console.log("===== " + f + " =====");
  console.log(text);
  console.log();
  await page.close();
}
await browser.close();
