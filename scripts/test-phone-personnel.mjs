import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Start the local site on port 8767 before running this check.
const base = process.env.BUDGET_TEST_URL || 'http://127.0.0.1:8767';
const browser = await chromium.launch();
try {
  for (const width of [320, 390, 1440]) {
    const phone = width <= 700;
    const page = await browser.newPage({ viewport: { width, height: 960 }, isMobile: phone, hasTouch: phone });
    await page.goto(base + '/pages/building-department.html?embed=department-popup');
    await page.getByRole('button', { name: 'View Personnel Ledger', exact: true }).first().click();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.wc-budget-detail-card')).opacity === '1');
    const cards = page.locator('.wc-mobile-personnel-cards');
    assert.equal(await cards.isVisible(), phone);
    const amounts = await page.locator('.wc-budget-detail-body').evaluate(body => ({
      cards: [...body.querySelectorAll('.wc-mobile-personnel-card>strong')].map(element => element.textContent),
      table: [...body.querySelectorAll('.wc-personnel-position-detail tbody tr')].map(row => row.cells[row.cells.length - 1].textContent.trim())
    }));
    assert.deepEqual(amounts.cards, amounts.table, 'Position totals must match the existing ledger');
    if (phone) {
      await cards.locator('summary').first().click();
      assert(await cards.locator('details').first().evaluate(element => element.open));
      await page.locator('.wc-mobile-personnel-view-toggle').click();
      assert(await page.locator('.wc-personnel-comparison-scroll').isVisible());
      assert.equal(await cards.isVisible(), false);
    }
    await page.getByRole('button', { name: 'Close budget detail' }).click();
    await page.getByRole('button', { name: 'View Budget Ledger', exact: true }).first().click();
    const history = page.locator('.wc-budget-detail-body .wc-fy-column-toggle-button');
    if (await history.getAttribute('aria-expanded') !== 'true') await history.click();
    if (phone) {
      assert(await page.locator('.wc-mobile-budget-table').evaluate(element => element.scrollLeft > 0));
      const zIndexes = await page.locator('.wc-mobile-budget-table').evaluate(element => ({
        label: Number(getComputedStyle(element.querySelector('th.wc-mobile-budget-label-column')).zIndex),
        year: Number(getComputedStyle(element.querySelector('th.wc-fy-2027')).zIndex)
      }));
      assert(zIndexes.label > zIndexes.year, 'Pinned row labels must stay above scrolling year headers');
    }
    console.log(`PASS: ${width}px position amounts, readable views, and recent-year history`);
    await page.close();
  }
} finally {
  await browser.close();
}
