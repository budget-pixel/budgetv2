// Read-only reconciliation of the website's published budget sources.
import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:8767/pages/tourism-beach-operations.html?embed=department-popup");
  await page.waitForFunction(() => window.WCBudgetData, { timeout: 30000 });
  const result = await page.evaluate(async () => {
    await window.WCBudgetData.loadBudgetData();
    const rows = window.WCBudgetData.getDepartmentExpenses("Beach Tram");
    const groups = {};
    rows.forEach(row => {
      const key = row.Object_Code === "549006" ? "Indirect" : row.Object_Type;
      const group = groups[key] ||= { prior: 0, final: 0 };
      group.prior += Number(row.FY2026_Original_Budget || 0);
      group.final += Number(row.FY2027_Proposed || 0);
    });
    Object.values(groups).forEach(group => group.change = group.final - group.prior);
    return { groups, total: Object.values(groups).reduce((sum, group) => ({ prior: sum.prior + group.prior, final: sum.final + group.final }), { prior: 0, final: 0 }), jobs: window.WCBudgetData.getDepartmentPerformanceMeasures("Tourism Administration").map(row => ({ measure: row.Measure, actual2024: row.Actual_2024, actual2025: row.Actual_2025, projected2027: row.Projected_2027 })) };
  });
  assert.equal(result.total.final, 5242221);
  assert.equal(result.total.prior, 3516126);
  assert.deepEqual(result.groups["Personnel Services"], { prior: 2694376, final: 3813305, change: 1118929 });
  assert.deepEqual(result.groups["Operating Expenditures"], { prior: 605750, final: 744750, change: 139000 });
  assert.deepEqual(result.groups["Capital Outlay"], { prior: 216000, final: 507000, change: 291000 });
  assert.deepEqual(result.groups.Indirect, { prior: 0, final: 177166, change: 177166 });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
