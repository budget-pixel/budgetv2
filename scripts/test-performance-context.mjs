import assert from 'node:assert/strict';
import '../assets/performance-context.js';
const {noteFor,measureLabel,narrative}=globalThis.WCPerformanceContext;
for (const [Dept_Name,Measure,expected] of [
  ['Code Compliance','Total number of street and beach code cases resolved annually','8,000'],
  ['Housing & Urban Development','Percentage of available housing vouchers utilized per fiscal year','75%'],
  ['Planning','Number of permits processed through EnerGov','review times'],
  ['Mosquito Control','Total number of acres treated per fiscal year','repeat treatments'],
  ['County Libraries','Total number of visitors and program attendees annually','distinct residents'],
  ['Tourism Beach Operations','Total number of passengers transported annually by the shuttle service','distinct riders']
]) assert(noteFor({Dept_Name,Measure}).includes(expected));
assert.equal(noteFor({Dept_Name:'Public Works',Measure:'Miles of road maintained'}),'');
assert.equal(measureLabel('Number of permits processed through the new EnerGov system that reduces permit applications time'),'Number of permits processed through the new EnerGov system');
assert(!narrative('Visitation also cover the vast majority of Walton County government revenues, saving each local household a considerable amount on their taxes annually.').includes('vast majority'));
console.log('PASS: performance context, unsupported timing claim removal, and qualified tourism funding narrative.');
