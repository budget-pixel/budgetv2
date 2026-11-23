const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const nodes = new Map();
function node(selector) {
  if (!nodes.has(selector)) nodes.set(selector, { innerHTML: '', textContent: '', setAttribute() {} });
  return nodes.get(selector);
}
const form = { kind: { value: 'expense' }, year: { value: '2025' }, departmentCodes: { value: '00117020' }, accountCode: { value: '552000' }, sort: { value: 'date_desc' } };
nodes.set('#txnFilters', form);
const calls = [];
const window = { WCSupabaseData: { searchTransactions: async (filters, page) => {
  calls.push({ filters, page });
  return { rows: [], count: 0 };
} } };
const source = fs.readFileSync('assets/transaction-search.js', 'utf8').replace(
  '  if (document.readyState === "loading")',
  '  window.testSearch = { runSearch, updateSearchButton };\n  if (document.readyState === "loading")'
);
vm.runInNewContext(source, { window, document: { readyState: 'loading', addEventListener() {}, querySelector: node } });

(async () => {
  for (const key of ['kind', 'year', 'departmentCodes', 'accountCode']) {
    const value = form[key].value;
    form[key].value = '';
    await window.testSearch.runSearch(true);
    assert.equal(calls.length, 0, key + ' must be selected before querying');
    assert.equal(node('#txnSearch').disabled, true);
    form[key].value = value;
  }
  window.testSearch.updateSearchButton();
  assert.equal(node('#txnSearch').disabled, false);
  await window.testSearch.runSearch(true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].filters.kind, 'expense');
  assert.equal(calls[0].filters.year, '2025');
  assert.equal(calls[0].filters.departmentCodes.join(','), '00117020');
  assert.equal(calls[0].filters.accountCode, '552000');
  console.log('PASS: missing filters never query; a fully scoped search queries once.');
})().catch(error => { console.error(error); process.exitCode = 1; });
