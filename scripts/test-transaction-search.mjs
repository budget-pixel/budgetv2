import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch();
try {
  for (const width of [320, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, acceptDownloads: true });
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname !== '127.0.0.1') return route.abort();
      if (!url.pathname.endsWith('/transaction-search.js')) return route.continue();
      const response = await route.fetch();
      const stub = `window.WCSupabaseData={SEARCH_PAGE_SIZE:2,searchTransactions:async function(filters,page){
        window.lastSearch={filters,page};
        await new Promise(r=>setTimeout(r,50));
        if(window.searchMode==='error')throw new Error('offline');
        if(window.searchMode==='empty')return {rows:[],count:0};
        return {rows:[{fiscal_year:2025,transaction_date:'2025-07-01',vendor_payee_public:'Example supplier',description_public:'Office supplies',object_name:'Operating Supplies',department_code:'00117020',fund_code:'001',document_number_public:'123',amount:125.5},{fiscal_year:2025,transaction_date:'2025-07-02',vendor_payee_public:'Example receipt',description_public:'Permit receipt',object_name:'Permits',department_code:'00117020',fund_code:'001',amount:-250}],count:4};
      }};`;
      await route.fulfill({ response, body: stub + await response.text() });
    });
    await page.goto('http://127.0.0.1:8767/pages/transaction-search.html?embed=department-popup', { waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('.wc-txn-table').count(), 0);
    assert.equal(await page.locator('#txnResultsToolbar').isVisible(), false);
    assert.equal(await page.locator('#txnMoreFilters').evaluate(d=>d.open), false);
    await page.getByRole('button', { name: 'Search transactions', exact: true }).click();
    await page.waitForSelector('.wc-txn-table');
    assert.equal(await page.locator('.wc-txn-table tbody tr').count(), 2);
    await page.waitForFunction(()=>document.querySelector('[data-label="Department"]')?.textContent==='Building Construction and Maintenance');
    assert(!(await page.locator('#txnResults').innerText()).includes('00117020'));
    await page.locator('#txnResults').screenshot({path:'/private/tmp/transaction-results-'+width+'.png'});
    assert.equal(await page.locator('.wc-txn-type').allTextContents().then(t => t.join(',')), 'Expense,Revenue');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if (width < 700) assert.equal(await page.locator('.wc-txn-table tr').last().evaluate(e => getComputedStyle(e).display), 'block');
    await page.waitForSelector('#txnAccount option[value="561000"]', {state:'attached'});
    await page.locator('#txnAccount').selectOption('561000');
    await page.locator('#txnKeyword').fill('supplier');
    await page.getByRole('button', { name: 'Search transactions', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#txnResults').getAttribute('aria-busy') === 'false');
    assert.equal(await page.evaluate(() => lastSearch.filters.keyword), 'supplier');
    assert.equal(await page.evaluate(() => lastSearch.filters.accountCode), '561000');
    await page.locator('#txnNext').click();
    await page.waitForFunction(() => document.querySelector('#txnPageLabel').textContent === 'Page 2');
    assert.equal(await page.evaluate(() => lastSearch.page), 1);
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#txnDownload').click();
    assert((await downloadPromise).suggestedFilename().endsWith('page-2.csv'));
    await page.evaluate(() => window.searchMode = 'empty');
    await page.locator('#txnReset').click();
    assert.equal(await page.locator('#txnResults').innerText(), '');
    assert.equal(await page.locator('#txnKeyword').inputValue(), '');
    await page.getByRole('button', { name: 'Search transactions', exact: true }).click();
    await page.waitForSelector('.wc-txn-empty');
    assert.equal(await page.locator('#txnPagination').isVisible(), false);
    await page.evaluate(() => window.searchMode = 'error');
    await page.getByRole('button', { name: 'Search transactions', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#txnStatus').textContent.includes('could not connect'));
    assert.equal(await page.locator('#txnDownload').isDisabled(), true);
    assert.equal(await page.locator('#txnResults').getAttribute('aria-busy'), 'false');
    await page.locator('#txnMoreFilters summary').click();
    await page.locator('#txnDateFrom').fill('2025-12-01');
    await page.locator('#txnDateTo').fill('2025-01-01');
    await page.getByRole('button', { name: 'Search transactions', exact: true }).click();
    assert((await page.locator('#txnStatus').innerText()).includes('start date'));
    console.log('PASS', width, 'results, labels, layout, filters, pagination, export, empty/error states, date validation');
    await page.close();
  }
} finally { await browser.close(); }
