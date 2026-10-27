// One-time publication capture; the website never refreshes these files.
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({headless:true});
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8767/pages/fund-financial-schedules.html?embed=department-popup');
  await page.waitForFunction(() => window.WCBudgetData, {timeout:120000});
  const data = await page.evaluate(async () => JSON.parse(JSON.stringify(await WCBudgetData.loadBudgetData())));
  assert.equal(Object.keys(data.errors).length, 0, 'Do not freeze a partial budget');
  for (const key of ['expenditures','revenues','staffing','performanceMeasures','departmentNarratives','funds','activities','fundBalances','personnelPositionCosts','machineryUnfunded','expenseActualRows','revenueActualRows','originalBudgetRows']) {
    assert.ok(data[key]?.length, 'Missing dataset: '+key);
  }
  const totals = await page.evaluate(async () => {
    const data = await WCBudgetData.loadBudgetData();
    return {expenditures:WCBudgetData.totalCountywideExpenditureBudget(data), change:WCBudgetData.getConsolidatedBudgetChangeTotals(data)};
  });
  assert.equal(Math.round(totals.expenditures),345223508);
  await fs.mkdir('assets/static-data',{recursive:true});
  await fs.writeFile('assets/static-data/budget.json',JSON.stringify({capturedAt:new Date().toISOString(),totals,data})+'\n');
  console.log('Captured complete final budget, historical summaries, datasets. Supplemental publication files remain unchanged.',totals);
} finally {await browser.close();}
