(function () {
  "use strict";

  var CHECKLIST = [
    ["major", "Program definition", "Identify major programs and services."],
    ["definition", "Program definition", "Explain how a program or service is defined."],
    ["core", "Program definition", "Identify core and non-core services."],
    ["new", "Program definition", "Identify new or expanded services."],
    ["departments", "Program definition", "Show contributing departments."],
    ["purpose", "Program definition", "State a defined purpose for each program."],
    ["cost", "Program cost", "Show the cost of each major program or service."],
    ["tracking", "Program cost", "Explain how program costs are tracked."],
    ["included", "Program cost", "Define what is included in program cost."],
    ["fixed", "Program cost", "Separate fixed and variable costs."],
    ["mix", "Program cost", "Show personnel, contracts, capital, and other cost."],
    ["goals", "Service level", "Define program and service-level goals."],
    ["measurement", "Service level", "Explain how service level is measured."],
    ["options", "Service level", "Document options considered when setting service level."],
    ["change", "Service level", "Show whether service levels increased or decreased."],
    ["priorities", "Priorities & impact", "Connect programs to County priorities."],
    ["related", "Priorities & impact", "Identify related services targeting the same priority."],
    ["impact", "Priorities & impact", "Explain how community impact is measured."],
    ["revenue", "Funding", "Show program-generated revenue."],
    ["subsidy", "Funding", "Show subsidy from non-program or dedicated revenue."],
    ["fees", "Funding", "Explain how program fees are set."],
    ["activity", "Service level", "Show the expected activity level."]
  ];

  var INITIAL_COMPLETE = new Set([
    "major", "definition", "core", "departments", "purpose", "cost",
    "tracking", "included", "mix", "goals", "measurement", "priorities",
    "related", "revenue", "subsidy"
  ]);

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ").trim();
  }

  function serviceAreaForDepartment(name) {
    var n = normalize(name);
    if (/sheriff|emergency|fire|code compliance|probation|court|medical examiner|public defender|state attorney/.test(n)) return "Public Safety & Justice";
    if (/public works|engineering|road|transport|traffic|bridge|fleet/.test(n)) return "Transportation & Infrastructure";
    if (/tourism|beach|visitor/.test(n)) return "Tourism & Visitor Services";
    if (/recreation|library|libraries|golf|parks|extension/.test(n)) return "Culture & Recreation";
    if (/solid waste|environment|mosquito|wastewater|soil conservation/.test(n)) return "Environmental Services";
    if (/building department|planning|housing|economic|development/.test(n)) return "Growth & Community Development";
    if (/veteran|health|human service|senior|non profit/.test(n)) return "Health & Human Services";
    return "General Government & Support";
  }

  // Matches the exact exclusion the site's official FY 2027 expenditure
  // total uses (see WCBudgetData.isNonProgramExpenseRow): interfund
  // transfers/other financing uses (reported on the Interfund Transfer
  // Ledger instead) and the Self-Insurance Fund (503), an internal service
  // fund. Deliberately does NOT also drop the Capital Projects Fund (300)
  // or fund 501 the way an earlier, name-pattern-based version of this
  // function did -- that extra exclusion isn't part of the official total,
  // and was silently undercounting real program spending by ~$28M.
  function isNonProgramExpense(row) {
    return Boolean(window.WCBudgetData.isNonProgramExpenseRow && window.WCBudgetData.isNonProgramExpenseRow(row));
  }

  // Matches the Revenue Budget callout's own exclusion (see
  // budget-overview.html's renderBudgetTotals): the Self-Insurance Fund
  // (503) and Revenue_Code 381000 (an other-financing-sources code, not
  // real program revenue).
  function isNonProgramRevenue(row) {
    var fundCode = String((row && row.Dept_Code) || "").trim().slice(0, 3);
    var revenueCode = String((row && row.Revenue_Code) || "").trim();
    return fundCode === "503" || revenueCode === "381000";
  }

  function renderChecklist() {
    var container = document.getElementById("program-budget-checklist");
    if (!container) return;
    container.innerHTML =
      '<div class="wc-revenue-question-heading"><span>Program plan build progress</span><h2>Understand programs and service levels</h2></div>' +
      '<section class="wc-revenue-guide-checklist" aria-labelledby="program-guide-title">' +
        '<div class="wc-revenue-guide-head"><div><strong id="program-guide-title">Program page build status</strong>' +
        '<p>Use this guide while program, cost, service-level, funding, and community-impact information is developed.</p></div><span data-program-progress></span></div>' +
        '<div class="wc-revenue-guide-progress-track" aria-hidden="true"><i data-program-progress-bar></i></div>' +
        '<div class="wc-revenue-guide-grid">' + CHECKLIST.map(function (item) {
          return '<label><input type="checkbox" data-program-item="' + item[0] + '"><span><small>' +
            escapeHtml(item[1]) + '</small><b>' + escapeHtml(item[2]) + '</b></span><em>Next</em></label>';
        }).join("") + '</div></section>';

    var storageKey = "wc-program-analysis-checklist-v1";
    var saved = {};
    try { saved = JSON.parse(window.localStorage.getItem(storageKey) || "{}"); } catch (error) { saved = {}; }
    var inputs = Array.from(container.querySelectorAll("[data-program-item]"));
    function update() {
      var done = inputs.filter(function (input) { return input.checked; }).length;
      container.querySelector("[data-program-progress]").textContent = done + " of " + inputs.length + " complete";
      container.querySelector("[data-program-progress-bar]").style.width = (done / inputs.length * 100).toFixed(1) + "%";
      inputs.forEach(function (input) {
        var label = input.closest("label");
        label.classList.toggle("is-complete", input.checked);
        label.querySelector("em").textContent = input.checked ? "Complete" : "Next";
      });
    }
    inputs.forEach(function (input) {
      var key = input.dataset.programItem;
      if (saved[key] === undefined && INITIAL_COMPLETE.has(key)) saved[key] = true;
      input.checked = saved[key] === true;
      input.addEventListener("change", function () {
        saved[key] = input.checked;
        try { window.localStorage.setItem(storageKey, JSON.stringify(saved)); } catch (error) { /* optional */ }
        update();
      });
    });
    update();
  }

  function initializeExplorer(data) {
    var explorer = document.getElementById("program-budget-explorer");
    var groups = new Map();
    var formatCurrency = window.WCBudgetData.formatCurrency;

    function groupFor(name) {
      if (!groups.has(name)) groups.set(name, {
        name: name, current: 0, prior: 0, personnel: 0, contracts: 0,
        capital: 0, other: 0, revenue: 0, departments: new Set(),
        goals: new Set(), measures: 0, priorities: new Set()
      });
      return groups.get(name);
    }

    (data.expenditures || []).forEach(function (row) {
      if (isNonProgramExpense(row)) return;
      var group = groupFor(serviceAreaForDepartment(row.Dept_Name));
      var amount = Number(row.FY2027_Proposed) || 0;
      var text = (String(row.Object_Type || "") + " " + String(row.Object_Name || "") + " " + String(row.Note || "")).toLowerCase();
      group.current += amount;
      group.prior += Number(row.FY2026_Original_Budget || row.FY2026_Budget) || 0;
      if (row.Dept_Name) group.departments.add(row.Dept_Name);
      if (/personnel/.test(text)) group.personnel += amount;
      else if (String(row.Contract_Status || "").trim() || /contract|professional service/.test(text)) group.contracts += amount;
      else if (/capital/.test(text)) group.capital += amount;
      else group.other += amount;
    });

    (data.revenues || []).forEach(function (row) {
      if (isNonProgramRevenue(row)) return;
      groupFor(serviceAreaForDepartment(row.Dept_Name)).revenue += Number(row.FY2027_Proposed) || 0;
    });

    (data.performanceMeasures || []).forEach(function (row) {
      var group = groupFor(serviceAreaForDepartment(row.Dept_Name));
      if (row.Goal) group.goals.add(row.Goal);
      if (row.Measure) group.measures += 1;
      var codes = String(row["Code Link"] || "").match(/\b(?:I|II|III|IV|V|VI|VII)\b/g) || [];
      codes.forEach(function (code) { group.priorities.add(code); });
    });

    var programs = Array.from(groups.values()).filter(function (group) { return group.current > 0; })
      .sort(function (a, b) { return b.current - a.current; });
    var total = programs.reduce(function (sum, group) { return sum + group.current; }, 0);
    function percent(value, base) { return base ? (value / base * 100).toFixed(1) : "0.0"; }
    function compact(value) {
      return Math.abs(value) >= 1000000
        ? "$" + (value / 1000000).toLocaleString("en-US", { maximumFractionDigits: 1 }) + "M"
        : formatCurrency(value);
    }

    function showDetail(group) {
      var detail = explorer.querySelector("[data-program-detail]");
      var subsidy = Math.max(0, group.current - group.revenue);
      var change = group.current - group.prior;
      var mix = [["Personnel", group.personnel], ["Contracted purchases", group.contracts], ["Capital", group.capital], ["Other operating", group.other]]
        .filter(function (item) { return item[1] > 0; });
      detail.innerHTML =
        '<button type="button" class="wc-department-detail-close" data-program-close>Close Program Detail</button>' +
        '<div class="wc-department-detail-head"><div><span>FY 2027 major service area</span><h3>' + escapeHtml(group.name) + '</h3></div>' +
        '<div><strong>' + formatCurrency(group.current) + '</strong><small>' + (change >= 0 ? "+" : "−") + formatCurrency(Math.abs(change)) +
        ' (' + (group.prior ? (change / group.prior * 100).toFixed(1) : "0.0") + '%) from FY 2026</small></div></div>' +
        '<div class="wc-department-detail-grid">' +
          '<article><h4>Purpose & contributors</h4><p>This service area groups related County work so residents can see the full public purpose across organizational boundaries.</p>' +
          '<div class="wc-personnel-function-list">' + Array.from(group.departments).sort().slice(0, 10).map(function (name) { return '<span>' + escapeHtml(name) + '</span>'; }).join("") +
          '</div><p>' + group.departments.size + ' contributing departments or service units.</p></article>' +
          '<article><h4>What does the service cost?</h4>' + mix.map(function (item) {
            return '<div class="wc-department-cost-row"><span>' + escapeHtml(item[0]) + '<b>' + formatCurrency(item[1]) +
              '</b></span><i><b style="width:' + percent(item[1], group.current) + '%"></b></i></div>';
          }).join("") + '</article>' +
          '<article><h4>Funding & subsidy</h4><div class="wc-department-result-numbers"><span><b>' + formatCurrency(group.revenue) +
          '</b>related revenue</span><span><b>' + formatCurrency(subsidy) + '</b>net support</span><span><b>' + percent(group.revenue, group.current) +
          '%</b>cost recovery</span></div><p>Net support is the portion funded by taxes, shared revenues, transfers, or other resources rather than revenue associated with this service area.</p></article>' +
          '<article><h4>Goals & service level</h4><div class="wc-department-result-numbers"><span><b>' + group.goals.size + '</b>goals</span><span><b>' +
          group.measures + '</b>measures</span></div><p>Expected activity levels and year-over-year service-level changes will be added as program measures are refined.</p></article>' +
          '<article><h4>Strategic alignment</h4><div class="wc-personnel-function-list">' + (group.priorities.size
            ? Array.from(group.priorities).sort().map(function (priority) { return '<span><b>' + priority + '</b> Board priority</span>'; }).join("")
            : '<span>Priority links being developed</span>') + '</div><p>Related programs sharing these priorities can be compared from the service-area menu.</p></article>' +
          '<article><h4>Cost behavior & fees</h4><p>Personnel and recurring operating commitments generally form the fixed service base. Contracts, supplies, and capital needs may vary with activity. Fee-setting and cost-recovery policies will be added for fee-supported programs.</p></article>' +
        '</div>';
      detail.hidden = false;
      detail.querySelector("[data-program-close]").addEventListener("click", function () {
        detail.hidden = true;
        explorer.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      detail.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    var contributingUnits = new Set();
    programs.forEach(function (program) { program.departments.forEach(function (department) { contributingUnits.add(department); }); });
    explorer.innerHTML =
      '<section class="wc-department-explorer"><div class="wc-department-explorer-head"><div><span>FY 2027 programs and service levels</span>' +
      '<h2>Program Budget Explorer</h2><p>Programs are grouped as cross-department service areas so the full cost, funding, contributors, and results can be reviewed together.</p></div>' +
      '<div class="wc-department-explorer-total"><span>Program and service budgets</span><strong>' + formatCurrency(total) + '</strong></div></div>' +
      '<div class="wc-department-explorer-metrics"><article><span>Major service areas</span><strong>' + programs.length + '</strong><small>organized across departments</small></article>' +
      '<article><span>Contributing units</span><strong>' + contributingUnits.size + '</strong><small>departments and service units</small></article>' +
      '<article><span>Performance measures</span><strong>' + programs.reduce(function (sum, program) { return sum + program.measures; }, 0) + '</strong><small>connected to service delivery</small></article></div>' +
      '<h3 class="wc-department-explorer-subhead">Major programs and services</h3><div class="wc-department-budget-cards">' +
      programs.map(function (program, index) {
        return '<button type="button" data-program-index="' + index + '"><span>' + (index < 3 ? "Major core service" : "County service area") + '</span>' +
          '<strong>' + escapeHtml(program.name) + '</strong><b>' + compact(program.current) + '</b><small>' + percent(program.current, total) +
          '% of program budgets shown · ' + program.departments.size + ' contributors</small><em>Explore cost, funding & results →</em></button>';
      }).join("") + '</div></section><section class="wc-department-detail" data-program-detail hidden></section>';

    explorer.querySelectorAll("[data-program-index]").forEach(function (button) {
      button.addEventListener("click", function () { showDetail(programs[Number(button.dataset.programIndex)]); });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderChecklist();
    var explorer = document.getElementById("program-budget-explorer");
    if (!window.WCBudgetData || !explorer) return;
    window.WCBudgetData.loadBudgetData().then(initializeExplorer).catch(function () {
      explorer.innerHTML = '<div class="wc-data-error">Budget data could not be loaded. Please try again later.</div>';
    });
  });
})();
