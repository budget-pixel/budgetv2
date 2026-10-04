const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('assets/budget-data.js', 'utf8');
const start = source.indexOf('  function reconcilePublishedFinalExpenseTotals(');
const end = source.indexOf('  // Specific (Dept_Code, Revenue_Code)', start);
const context = { console, normalizeDeptName: value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() };
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);
const sum = rows => rows.reduce((total, row) => total + Number(row.FY2027_Proposed), 0);
const expenses = [
  { Dept_Name: 'Board of County Commissioners', FY2027_Proposed: 12613821 },
  { Dept_Name: 'BCC Other Uses Contingency', FY2027_Proposed: 400000 },
  { Dept_Name: 'Non-Profit Funding Program', FY2027_Proposed: 268500 },
  { Dept_Name: 'Statutory & Other', FY2027_Proposed: 3461803 }
];
context.normalizeDeptName = value => String(value).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
const corrected = context.reconcilePublishedFinalExpenseTotals(expenses);
assert.equal(sum(corrected), sum(expenses));
assert.equal(sum(corrected.filter(row => /^(Board of County Commissioners|BCC Other Uses Contingency)$/.test(row.Dept_Name))), 12972780);
assert.equal(sum(corrected.filter(row => row.Dept_Name === 'Non-Profit Funding Program')), 268500);
const revenues = [
  { Dept_Name: 'Non-Profit Funding Program', Revenue_Code: '311000', FY2027_Proposed: 450000, FY2026_Budget: 477820 },
  { Dept_Name: 'Board of County Commissioners', Revenue_Code: '311000', FY2027_Proposed: 4491053, FY2026_Budget: 5000000 }
];
const assigned = context.reassignNonprofitPropertyTaxFunding(revenues);
assert.equal(sum(assigned), sum(revenues));
assert.equal(assigned[0].FY2027_Proposed, 268500);
assert.equal(assigned[1].FY2027_Proposed, 4672553);
assert.equal(assigned[0].FY2026_Budget, 477820);
assert.equal(revenues[0].FY2027_Proposed, 450000);
assert.deepEqual(context.reassignNonprofitPropertyTaxFunding(assigned), assigned);
console.log('PASS: nonprofit/BCC allocations, unchanged totals/history, unmodified source rows, and idempotent revenue correction.');
