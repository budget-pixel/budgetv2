import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:8767/pages/personnel-budget-explained.html?embed=department-popup',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.WCBudgetData?.getPersonnelCostChangeAnalysis);
 const data=await page.evaluate(async()=>{await WCBudgetData.loadBudgetData();return WCBudgetData.getPersonnelCostChangeAnalysis();});
 assert.equal(data.total.current,164179771);assert.equal(data.total.prior,155691443);
 assert.equal(data.board.current+data.offices.current,data.total.current);
 assert.equal(data.components.reduce((sum,row)=>sum+row.current-row.prior,0),data.board.current-data.board.prior);
 fs.writeFileSync('scripts/data/personnel-change-snapshot.json',JSON.stringify(data,null,2)+'\n');
 console.log(JSON.stringify(data,null,2));
}finally{await browser.close();}
