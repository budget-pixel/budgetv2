(function (root) {
  'use strict';
  function noteFor(row) {
    var dept=String(row.Dept_Name||'').toLowerCase(), measure=String(row.Measure||'').toLowerCase();
    if (/code compliance/.test(dept)&&/cases resolved/.test(measure)) return 'The FY 2027 projection is 8,000 cases versus 11,500 reported in 2025. The published schedule does not explain the lower projection; case volume alone does not establish a change in enforcement effort or service quality.';
    if (/housing|urban development/.test(dept)&&/vouchers utilized/.test(measure)) return 'The 75% projection measures use of available vouchers, not the share of eligible households served. The published schedule does not explain the remaining capacity or define the voucher denominator.';
    if (/planning/.test(dept)&&/energov/.test(measure)) return 'Permit volume measures workload. It does not demonstrate shorter review times or improved turnaround.';
    if (/mosquito/.test(dept)&&/acres treated/.test(measure)) return 'This is a treatment-activity measure. The published schedule does not specify how repeat treatments are counted; it should not be interpreted as verified unique land area.';
    if (/librar/.test(dept)&&/visitors and program attendees/.test(measure)) return 'Reported visits and program attendance are not presented as a verified count of distinct residents; repeat attendance may be included.';
    if (/beach|tram/.test(dept)&&/passengers|shuttle/.test(measure)) return 'Passenger activity is not a verified count of distinct riders; repeat trips may be included.';
    return '';
  }
  function measureLabel(label) {
    return String(label||'').replace(/\s+that reduces permit applications time\s*$/i,'');
  }
  function narrative(text) {
    return String(text||'').replace('Visitation also cover the vast majority of Walton County government revenues, saving each local household a considerable amount on their taxes annually.','Visitor spending contributes to tourism taxes and other public revenues. These contributions are not a measured reduction in an individual household\'s tax bill.');
  }
  root.WCPerformanceContext={noteFor:noteFor,measureLabel:measureLabel,narrative:narrative};
})(typeof globalThis!=='undefined'?globalThis:this);
