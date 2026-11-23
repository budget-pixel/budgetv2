const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const window = {};
const source = fs.readFileSync('assets/transaction-search.js', 'utf8').replace(
  '  if (document.readyState === "loading")',
  '  window.testCatalog = { buildFilterCatalog, departmentFilterOptions, accountFilterOptions };\n  if (document.readyState === "loading")'
);
vm.runInNewContext(source, { window, document: { readyState: 'loading', addEventListener() {} } });
const api = window.testCatalog;
const data = {
  expenditures: [
    { Dept_Name: 'Libraries', Dept_Code: '00120000', Object_Code: '551000', Object_Name: 'Office Supplies' },
    { Dept_Name: 'Libraries', Dept_Code: '00120000', Object_Code: '564000', Object_Name: 'Machinery & Equipment' },
    { Dept_Name: 'Public Works', Dept_Code: '10141000', Object_Code: '553000', Object_Name: 'Road Materials' }
  ],
  revenues: [
    { Dept_Name: 'Library Fees', Dept_Code: '001200', Revenue_Code: '347100', Revenue_Name: 'Library Fees' },
    { Dept_Name: 'Libraries', Dept_Code: '00120000', Revenue_Code: '347100', Revenue_Name: 'Library Fees' },
    { Dept_Name: 'Libraries', Dept_Code: '00120000', Revenue_Code: '331500', Revenue_Name: 'Federal Grant (Economic Environment)' },
    { Dept_Name: 'Public Works', Dept_Code: '10141000', Revenue_Code: '334340', Revenue_Name: 'State Grant (Transportation)' },
    { Dept_Name: 'Libraries', Dept_Code: '00120000', Revenue_Code: '369300', Revenue_Name: 'Refund of Prior Year Expenditures' }
  ],
  expenseActualRows: [
    { year: 2025, org: '001200', object: '551000', amount: 100 },
    { year: 2024, org: '001200', object: '564000', amount: 200 },
    { year: 2025, org: '101410', object: '553000', amount: 300 },
    { year: 2025, org: '001200', object: '553000', amount: 25 }
  ],
  revenueActualRows: [
    { year: 2025, org: '001200', object: '347100', amount: -50 },
    { year: 2025, org: '001200', object: '331500', amount: -75 },
    { year: 2025, org: '101410', object: '334340', amount: -80 },
    { year: 2025, org: '001200', object: '369300', amount: -10 }
  ]
};
const catalog = api.buildFilterCatalog(data);
const library = api.departmentFilterOptions(catalog, 'expense', '2025').find(d => d.label === 'Libraries');
assert(!api.departmentFilterOptions(catalog, 'revenue', '2025').some(d => d.label === 'Library Fees'));
const codes = library.value.split(',');
const values = (kind, year) => Array.from(api.accountFilterOptions(catalog, kind, year, codes, 'Libraries'), a => a.value);
assert.deepEqual(values('expense', '2025'), ['551000']);
assert.deepEqual(values('expense', '2024'), ['564000']);
assert.deepEqual(values('expense_credit', '2025'), ['369300', '551000']);
assert.deepEqual(values('revenue', '2025'), ['331500', '347100']);
assert.deepEqual(values('revenue_refund', '2025'), ['331500', '347100']);
assert.deepEqual(values('revenue', '2020'), []);
assert(!values('revenue', '2025').some(code => code.includes('334340')), 'grouped grant options must not include another department’s code');
const actual = api.buildFilterCatalog(JSON.parse(fs.readFileSync('assets/static-data/budget.json', 'utf8')).data);
const building = api.departmentFilterOptions(actual, 'expense', '2025').find(d => d.label === 'Building Construction and Maintenance');
assert(building);
const accounts = api.accountFilterOptions(actual, 'expense', '2025', building.value.split(','), building.label);
assert(accounts.length);
assert(accounts.every(a => a.value.split(',').every(code => code.startsWith('5'))));
console.log('PASS: filters respect type, fiscal year, department, and grouped account scope.');
console.log('Building Construction and Maintenance FY 2025 expense accounts:', accounts.map(a => a.value).join(','));
