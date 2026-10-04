import {chromium} from 'playwright';
import fs from 'node:fs';
import vm from 'node:vm';
const text=fs.readFileSync('scripts/build-departments-and-services.mjs','utf8');
const context={};vm.createContext(context);
vm.runInContext(text.slice(text.indexOf('const DEPARTMENTS ='),text.indexOf('\nfunction money'))+'\nthis.departments=DEPARTMENTS;',context);
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:8767/pages/departments.html?embed=department-popup');await page.waitForFunction(()=>window.WCBudgetData);
 const departments=await page.evaluate(async names=>{await WCBudgetData.loadBudgetData();return Object.fromEntries(names.map(name=>[name,WCBudgetData.getDepartmentRevenues(name)]));},context.departments.map(d=>d.name));
 fs.writeFileSync('scripts/data/department-revenue-snapshot.json',JSON.stringify({capturedAt:new Date().toISOString(),source:'Published site revenue allocations; no spreadsheet values modified',departments},null,2)+'\n');
 console.log('Captured exact revenue allocations for '+Object.keys(departments).length+' departments.');
}finally{await browser.close();}
