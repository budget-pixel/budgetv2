// Read-only capture of the site's published, calculated fund schedules.
// Run before rebuilding the print ledger and outlook so both use one snapshot.
import { chromium } from "playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(process.argv[2] || "http://127.0.0.1:8767/pages/fund-financial-schedules.html?embed=department-popup");
  await page.waitForSelector("#non-major-fund-financial-schedules table", { timeout: 120000 });
  const snapshot = await page.evaluate(() => {
    const schedules = Array.from(document.querySelectorAll(".wc-fund-financial-schedule-table")).filter(t => !t.classList.contains("wc-fund-activity-detail-table")).map(table => {
      const name = table.closest(".wc-budget-lines-card").querySelector(".wc-table-label").textContent.trim();
      const headers = Array.from(table.tHead.rows[0].cells).slice(1).map(c => c.textContent.trim());
      const rows = Object.fromEntries(Array.from(table.tBodies[0].rows).filter(r => !r.classList.contains("wc-fund-activity-detail-row") && !r.classList.contains("wc-table-group-row")).map(row => {
        const cells = Array.from(row.cells);
        return [cells[0].textContent.trim(), cells.slice(1).map(c => Number(c.textContent.replace(/[^0-9.-]/g, "")))];
      }));
      return { name, headers, rows };
    });
    return { capturedAt: new Date().toISOString(), source: "pages/fund-financial-schedules.html; published Google Sheet budgets and opening balances; public historical actuals", schedules };
  });
  assert.equal(snapshot.schedules.length, 16);
  const consolidated = snapshot.schedules[0];
  for (const schedule of snapshot.schedules) {
    schedule.headers.forEach((header, i) => {
      const r = schedule.rows;
      const sources = r["Total Revenue and Other Financial Sources"][i];
      const uses = r["Total Expenditures and Other Financial Uses"][i];
      const change = r["Change in Fund Balance"][i];
      assert.ok(Math.abs(sources - uses - change) <= 2, `${schedule.name}: ${header} net change`);
      assert.ok(Math.abs(r["Beginning Fund Balance"][i] + change - r["Estimated Ending Fund Balance"][i]) <= 2, `${schedule.name}: ${header} closing balance`);
    });
  }
  // Whole-dollar rendering can create small summation differences.
  for (const i of [7, 8, 9]) {
    for (const label of ["Beginning Fund Balance", "Total Revenues", "Other Financial Sources", "Total Expenditures and Other Financial Uses", "Estimated Ending Fund Balance"]) {
      const sum = snapshot.schedules.slice(1).reduce((n, s) => n + (s.rows[label]?.[i] || 0), 0);
      assert.ok(Math.abs(sum - consolidated.rows[label][i]) <= 15, `${label}: individual funds do not reconcile`);
    }
  }
  await fs.mkdir("scripts/data", { recursive: true });
  await fs.writeFile("scripts/data/fund-schedule-snapshot.json", JSON.stringify(snapshot, null, 2) + "\n");
  console.log("Captured and reconciled 16 fund schedules, including FY 2027–FY 2029.");
} finally {
  await browser.close();
}
