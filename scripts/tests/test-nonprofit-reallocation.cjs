const assert = require('node:assert/strict');
const fs = require('node:fs');
// The Non-Profit Funding Program / Board of County Commissioners property tax
// correction is baked into the frozen publication data (the runtime helper
// that used to apply it was removed as unused), so check the published
// figures directly.
const publication = JSON.parse(fs.readFileSync('assets/static-data/budget.json', 'utf8')).data;
const adValorem = name => publication.revenues
  .filter(row => row.Revenue_Code === '311000' && row.Dept_Name === name)
  .reduce((total, row) => total + Number(row.FY2027_Proposed), 0);
assert.equal(adValorem('Non-Profit Funding Program'), 268500);
assert.equal(adValorem('Board of County Commissioners'), 4672553);
assert.ok(!publication.expenditures.some(row => String(row.Object_Code) === '999997'), 'No reconciliation placeholder lines');
assert.equal(publication.expenditures.find(row => row.Dept_Code === '00101000' && row.Object_Code === '530000').FY2027_Proposed, 281500);
assert.equal(publication.expenditures.find(row => row.Dept_Code === '00102012' && row.Project_Code === '10259').FY2027_Proposed, 1284516);
console.log('PASS: nonprofit/BCC property tax correction published, and 999997 placeholders folded into real accounts.');
