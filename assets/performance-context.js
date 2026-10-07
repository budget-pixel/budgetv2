(function (root) {
  'use strict';
  function noteFor(row) {
    var dept=String(row.Dept_Name||'').toLowerCase(), measure=String(row.Measure||'').toLowerCase();
    if (/housing|urban development/.test(dept)&&/vouchers utilized/.test(measure)) return 'The FY 2027 target is 75% utilization of available vouchers.';
    if (/mosquito/.test(dept)&&/acres treated/.test(measure)) return 'Treatment acreage may include repeat applications.';
    if (/librar/.test(dept)&&/visitors and program attendees/.test(measure)) return 'Library visits and program attendance may include repeat visits.';
    if (/beach|tram/.test(dept)&&/passengers|shuttle/.test(measure)) return 'Passenger counts may include repeat trips.';
    return '';
  }
  function measureLabel(label) {
    return String(label||'').replace(/\s+that reduces permit applications time\s*$/i,'');
  }
  function narrative(text) {
    return String(text||'').replace('Visitation also cover the vast majority of Walton County government revenues, saving each local household a considerable amount on their taxes annually.','Visitor spending contributes to tourism taxes and other public revenues.');
  }
  root.WCPerformanceContext={noteFor:noteFor,measureLabel:measureLabel,narrative:narrative};
})(typeof globalThis!=='undefined'?globalThis:this);
