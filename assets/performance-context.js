(function (root) {
  'use strict';
  function noteFor(row) {
    var dept=String(row.Dept_Name||'').toLowerCase(), measure=String(row.Measure||'').toLowerCase();
    if (/code compliance/.test(dept)&&/cases resolved/.test(measure)) return 'The FY 2027 projection is 8,000 cases versus 11,500 reported in 2025. The published schedule does not explain the lower projection; case volume alone does not establish a change in enforcement effort or service quality.';
    if (/housing|urban development/.test(dept)&&/vouchers utilized/.test(measure)) return 'The FY 2027 target is 75% utilization of available vouchers.';
    if (/planning/.test(dept)&&/energov/.test(measure)) return 'Permit volume measures workload. It does not demonstrate shorter review times or improved turnaround.';
    if (/mosquito/.test(dept)&&/acres treated/.test(measure)) return 'Treatment acreage may include repeat applications.';
    if (/librar/.test(dept)&&/visitors and program attendees/.test(measure)) return 'Library visits and program attendance may include repeat visits.';
    if (/beach|tram/.test(dept)&&/passengers|shuttle/.test(measure)) return 'Passenger counts may include repeat trips.';
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
