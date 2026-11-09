const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const host = { innerHTML: '' };
let csv;
const document = {
  readyState: 'loading', addEventListener() {},
  querySelector() { return host; },
  createElement() { return { click() {} }; },
  body: { appendChild() {}, removeChild() {} }
};
const window = {};
const source = fs.readFileSync('assets/transaction-search.js', 'utf8').replace(
  '  if (document.readyState === "loading")',
  '  window.testTypes = { renderTable, downloadCsv, setRows(rows) { lastRows = rows; } };\n  if (document.readyState === "loading")'
);
vm.runInNewContext(source, {
  window, document, URL: { createObjectURL() { return 'blob:test'; }, revokeObjectURL() {} },
  Blob: class { constructor(parts) { csv = parts.join(''); } }
});

for (const [category, amount, label] of [
  ['expense_credit', -51.66, 'Expense credit'],
  ['expense', 51.66, 'Expense'],
  ['revenue', -51.66, 'Revenue receipt'],
  ['revenue_refund', 51.66, 'Revenue refund / reversal'],
  ['adjustment', -51.66, 'Adjustment']
]) {
  const row = { category, amount, vendor_payee_public: 'Example', object_name: 'OPERATING SUPPLIES' };
  window.testTypes.renderTable([row]);
  assert(host.innerHTML.includes('class="wc-txn-type">' + label + '</span>'));
  assert.equal(host.innerHTML.includes(' is-revenue'), category === 'revenue');
  assert(host.innerHTML.includes('>Operating Supplies</td>'));
  window.testTypes.setRows([row]);
  window.testTypes.downloadCsv();
  assert(csv.startsWith('Date,Vendor/Payee,Description,Account,Type,'));
  assert(csv.includes(',' + label + ','));
  assert(csv.includes(',Operating Supplies,'));
  assert(csv.endsWith(',' + amount));
}
window.testTypes.renderTable([{ amount: -10 }]);
assert(host.innerHTML.includes('>Adjustment</span>'));
window.testTypes.renderTable([{ object_name: 'FICA TAXES & MEDICARE' }]);
assert(host.innerHTML.includes('>FICA Taxes &amp; Medicare</td>'));
console.log('PASS: credits, expenses, receipts, refunds and unknown rows have distinct labels; CSV preserves type and signed amount.');
