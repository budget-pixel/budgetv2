// Rebuild the reviewed print publication and its static HTML reading edition.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdirSync} from 'node:fs';
mkdirSync('tmp/pdfs',{recursive:true});
const run=promisify(execFile);
const jobs=[
 ['transmittal-letter','transmittal-letter-revised',3],['visual-storytelling','visual-storytelling-revised'],['community-priorities','community-priorities-revised',14],['long-term-outlook','long-term-outlook-revised',42],['gfoa-enhancements','gfoa-enhancements-revised'],['summary-of-expenses','expenditure-ledger-revised',34],['independent-agencies-ledger','independent-revised',60],['constitutional-officers-ledger','constitutional-revised',52],['departments-and-services','departments-value-revised',70],['budget-change-summary','change-summary-revised',23],['budget-in-brief','budget-in-brief-revised',18],['glossary','glossary-revised',125],['gfoa-final-toc','page-order-toc'],['capital-budget-toc-page','page-order-capital-guide',108],['property-tax-allocation','property-tax-revised',31],['revenue-ledger','revenue-ledger-revised',27],['consolidated-budget-ledger','consolidated-ledger-revised',21],['department-operating-ledger','department-operating-revised',70],['personnel-ledger','personnel-revised',105],['capital-fund-ledgers','capital-tourism-revised',114],['fund-financial-ledger','fund-financial-revised',37],['interfund-transfer-ledger','interfund-transfer-revised',39],['debt-ledger','debt-ledger-revised',40],['capital-improvement-plan','cip-revised',109],['budget-process','budget-process-revised',45],['budget-financial-policies','policies-revised',49],['statistical-information','statistics-revised',133],['self-insurance-fund','self-insurance-revised',106],['organizational-structure','organization-revised',12],['overview-of-walton-county','county-revised',9],['strategic-initiatives','strategic-revised',13],['budget-gfoa-award','award-revised',2]
];
for(let i=0;i<jobs.length;i+=3)await Promise.all(jobs.slice(i,i+3).map(async([script,output,start])=>{
 const {stdout}=await run(process.execPath,[`scripts/build-${script}.mjs`,`tmp/pdfs/${output}.pdf`,...(start?[String(start)]:[])],{maxBuffer:2e6});console.log(stdout.trim());
}));
const {stdout}=await run(process.env.BUDGET_PYTHON||'python3',['scripts/assemble-reviewed-budget-book.py'],{maxBuffer:2e6});console.log(stdout.trim());
const reading=await run(process.execPath,['scripts/build-budget-reading-version.mjs'],{maxBuffer:2e6});console.log(reading.stdout.trim());
