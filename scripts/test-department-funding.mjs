import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../assets/funding-sources.js';
const departments=JSON.parse(fs.readFileSync('scripts/data/department-revenue-snapshot.json','utf8')).departments;
for(const [name,rows] of Object.entries(departments)){
 const result=WCFundingSources.summarize(rows,name.toLowerCase());
 assert.equal(result.total,rows.reduce((sum,row)=>sum+(Number(row.FY2027_Proposed)||0),0));
 assert.ok(Math.abs(result.rows.reduce((sum,row)=>sum+row.amount,0)-result.total)<.01,name);
}
function source(name,label){return WCFundingSources.summarize(departments[name],name.toLowerCase()).rows.find(row=>row.source===label);}
assert.equal(source('Building Department','Prior-year fund balance').amount,4000000);
assert.match(source('Building Department','Prior-year fund balance').detail,/statutory carryforward limit/);
assert.equal(source('Geographic Info Systems','Telecommunication and Local Communication Tax').amount,350000);
assert.equal(source('Planning','Local Government 1/2 Cent Sales Tax').amount,2332194);
assert.equal(source('Recreation','Park Rental Fee').amount,45000);
assert.equal(source('Solid Waste','Interest').amount,101564);
assert.equal(source('Solid Waste','Scrap Sales').amount,40000);
assert.equal(source('Public Works','Prior-year fund balance').amount,4881906);
assert.equal(source('Public Works','Small County Surtax transfer').amount,14621000);
assert.equal(WCFundingSources.summarize(departments['Public Works'],'public works').rows.filter(row=>row.payer==='Property owners').length,0);
assert.equal(WCFundingSources.summarize(departments['Code Compliance'],'code compliance').total,4960654);
assert.equal(WCFundingSources.summarize([{Revenue_Name:'Interest',FY2027_Proposed:-10}],'test').total,-10);
assert.match(source('Mosquito Control','Property taxes').payer,/within the North Walton Mosquito Control District/);
assert.match(source('Mosquito Control','Property taxes').detail,/separate district property-tax levy/);
assert.equal(source('Mosquito Control','Property taxes').amount,1426937);
console.log('PASS: 32 department allocations reconcile; funding classifications and signed amounts verified.');
