import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const publication=JSON.parse(fs.readFileSync('assets/static-data/budget.json','utf8'));
assert.equal(publication.totals.expenditures,345223508);
assert.equal(publication.totals.change.prior,327945088);
for(const file of fs.readdirSync('assets').filter(f=>f.endsWith('.js')&&f!=='cip-projects-data.js')) {
  assert.ok(!fs.readFileSync('assets/'+file,'utf8').includes('docs.google.com/spreadsheets'),file+' still references a live spreadsheet');
}
const browser=await chromium.launch({headless:true});
try {
  const pages=['fund-financial-schedules','summary-of-expenses','revenue-ledger','personnel-ledger','financial-forecast','board-of-county-commissioners','building-department','mosquito-control','engineering-department','statistical-and-supplemental-information','transmittal-letter','asset-detail'];
  for(const name of pages.filter(n=>fs.existsSync('pages/'+n+'.html'))) {
    const page=await browser.newPage();
    const forbidden=[];const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',async route=>{
      const url=route.request().url();
      if(url.includes('supabase.co')||(url.includes('docs.google.com/spreadsheets')&&!url.includes('gid=1388930304'))) {forbidden.push(url);return route.abort();}
      return route.continue();
    });
    const assetQuery=name==='asset-detail'?'&asset='+encodeURIComponent(fs.readFileSync('assets/static-data/asset-detail.csv','utf8').split(/\r?\n/)[1].split(',')[0]):'';
    await page.goto('http://127.0.0.1:8767/pages/'+name+'.html?embed=department-popup'+assetQuery);
    if(await page.evaluate(()=>!!window.WCBudgetData)) {
      const result=await page.evaluate(async()=>{
        const d=await WCBudgetData.loadBudgetData();
        return {total:WCBudgetData.totalCountywideExpenditureBudget(d),prior:WCBudgetData.getConsolidatedBudgetChangeTotals(d).prior,staff:d.staffing.length,positions:d.personnelPositionCosts.length};
      });
      assert.equal(result.total,345223508,name);assert.equal(result.prior,327945088,name);
      assert.ok(result.staff&&result.positions,name);
    }
    await page.waitForTimeout(500);
    assert.deepEqual(forbidden,[],name+' requested live non-CIP data');
    assert.deepEqual(errors,[],name+' runtime errors');
    if(name==='fund-financial-schedules') {await page.waitForSelector('#non-major-fund-financial-schedules table');assert.ok((await page.locator('#consolidated-fund-financial-schedule').innerText()).includes('$327,945,088'));}
    if(name==='transmittal-letter')assert.ok((await page.locator('#wc-transmittal-letter-body').innerText()).includes('$8,047,270'));
    if(name==='asset-detail') {await page.waitForSelector('#asset-record .wc-fleet-header',{state:'attached'});assert.ok(!(await page.locator('#asset-record').innerText()).includes('could not be loaded'));}
    if(name==='statistical-and-supplemental-information')await page.waitForSelector('#principal-taxpayers-section table');
    console.log('PASS: '+name);
    await page.close();
  }
} finally {await browser.close();}
