import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Start the local site on port 8767 before running this interaction check.
const base = process.env.BUDGET_TEST_URL || 'http://127.0.0.1:8767';
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [320, 390, 1440]) {
    const phone = width <= 700;
    const context = await browser.newContext({
      viewport: { width, height: 844 }, isMobile: phone, hasTouch: phone
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.locator('.wc-home-start').click();
    await page.waitForFunction(() => !!document.querySelector('[data-budget-landing-frame]')?.contentWindow?.WCHomeExplorer);
    const home = page.frames().find(frame => frame.url().includes('budget-explorer.html'));
    await home.waitForFunction(() => !!window.WCHomeExplorer);
    const search = home.locator('#wcHomeBudgetSearch');
    await search.fill('road');
    await home.locator('#wcHomeSearchDropdown').waitFor();
    await search.press('Escape');
    assert(await home.locator('#wcHomeSearchDropdown').isHidden());
    assert(await page.locator('[data-budget-landing-dialog]').isVisible());
    assert.equal(await search.inputValue(), 'road');
    assert(await search.evaluate(element => element === document.activeElement));
    await search.fill('');
    await home.evaluate(() => WCHomeExplorer.openDepartmentModal('pages/mosquito-control.html', 'Mosquito Control'));
    await home.locator('.wc-home-department-modal.is-loading').waitFor({ state: 'hidden' });
    const department = page.frames().find(frame => frame.url().includes('/pages/mosquito-control.html'));
    const trigger = department.locator('[data-profile-operating-budget-sheet-trigger]');
    await trigger.waitFor();
    await department.waitForFunction(() => !document.body.classList.contains('wc-board-department-loading'));
    const actions = await department.locator('.wc-profile-snapshot .wc-profile-snapshot-sheet').evaluateAll(elements =>
      elements.filter(element => element.getClientRects().length).map(element => ({
        label: element.textContent.trim(),
        height: element.getBoundingClientRect().height,
        clipped: element.scrollWidth > element.clientWidth
      })));
    assert(actions.length > 0);
    for (const action of actions) {
      assert(action.height >= 44, action.label + ' needs a usable touch target');
      assert.equal(action.clipped, false, action.label + ' must fit');
    }
    if (phone) await trigger.tap();
    else await trigger.click();
    await department.locator('.wc-budget-detail-modal:not([hidden])').waitFor();
    const body = department.locator('.wc-budget-detail-body');
    const cards = body.locator('.wc-mobile-budget-lines');
    assert.equal(await cards.isVisible(), phone);
    const amounts = await body.evaluate(element => {
      const source = [...element.querySelectorAll('.wc-mobile-budget-table tbody tr')]
        .filter(row => !row.hidden && !row.matches('.wc-budget-line-zero-current,.wc-budget-line-zero-prior-budget,.wc-budget-line-summary-row'))
        .map(row => row.querySelector('.wc-fy-2027')?.textContent.trim()).filter(Boolean);
      const displayed = [...element.querySelectorAll('.wc-mobile-budget-line>strong')].map(item => item.textContent);
      return { source, displayed };
    });
    assert.deepEqual(amounts.displayed, amounts.source, 'Every displayed amount matches its source ledger row');
    if (phone) {
      assert.equal(await home.locator('.wc-home-department-modal-head').isVisible(), false);
      assert.equal(await department.locator('.wc-budget-detail-card').evaluate(element => element.clientHeight), 844);
    }
    await body.locator('.wc-fy-column-toggle-button').click();
    assert.equal(await cards.isVisible(), false);
    if (phone) assert(await body.locator('.wc-mobile-budget-history-hint').isVisible());
    await department.getByRole('button', { name: 'Close budget detail', exact: true }).click();
    await home.locator('.wc-home-department-modal-head').waitFor();
    assert(await trigger.evaluate(element => element === document.activeElement));
    assert.deepEqual(errors, []);
    console.log(`PASS: ${width}px budget popup, amounts, history, and return navigation`);
    await context.close();
  }
} finally {
  await browser.close();
}
