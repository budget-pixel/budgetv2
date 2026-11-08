/* Shared Board department layout, based on the Emergency Management page.
   Runs after budget-data.js / department-services.js have rendered the page
   and rearranges it under key figures and topic tabs:
     Overview                -- statement of function beside the video, and
                                the goal and challenge
     Budget                  -- the Budget Ledger (with capital items and
                                contracts folded in as lines) and the
                                Budget Graph
     Revenue                 -- the revenue ledger, with a Who Pays column
     Staffing                -- the personnel ledger shown inline
     Services & Performance  -- core services and their measures, with a
                                trend column and sparklines
   The video loads on click (the page keeps its URL in data-src). Printing
   shows every tab. */
(function () {
  "use strict";
  var content = document.getElementById("content");
  var heading = content && content.querySelector(".page-title");
  if (!heading) return;
  var departmentName = heading.textContent.trim();
  var profileType = content.querySelector(".page-eyebrow")?.textContent.trim();
  var independent = profileType !== "Departments";

  function ready() {
    return (independent || content.querySelector(".wc-dept-function-services")) &&
      content.querySelector(".wc-board-department-profile:not(.wc-profile-snapshot--office)");
  }

  function money(value) {
    return "$" + Math.round(Math.abs(value)).toLocaleString("en-US");
  }

  // Operating + personnel totals (capital is budgeted separately) and the
  // per-account changes, shared by the key figures and "This year" text.
  function budgetStats() {
    var api = window.WCBudgetData;
    if (!api || typeof api.getDepartmentExpenses !== "function") return null;
    var offices = api.getCombinedDepartmentOffices && api.getCombinedDepartmentOffices(departmentName);
    var visibleOffices = (offices || []).filter(function (office) {
      return document.getElementById(office.id);
    });
    var rows = visibleOffices.length ? visibleOffices.flatMap(function (office) { return office.expenses; })
      : api.getDepartmentExpenses(departmentName) || [];
    if (departmentName === "Board of County Commissioners" && api.getBccOtherUsesContingencyExpenses) {
      rows = rows.concat(api.getBccOtherUsesContingencyExpenses() || []);
    }
    if (!rows.length) return null;
    var stats = { current: 0, prior: 0, personnel: 0, priorPersonnel: 0, lines: {} };
    rows.forEach(function (row) {
      var type = String(row.Object_Type || "").toLowerCase();
      if (!independent && type.indexOf("capital") >= 0) return;
      var now = Number(row.FY2027_Proposed) || 0;
      var before = Number(row.FY2026_Original_Budget || row.FY2026_Budget) || 0;
      stats.current += now;
      stats.prior += before;
      if (type.indexOf("personnel") >= 0) { stats.personnel += now; stats.priorPersonnel += before; return; }
      var key = String(row.Object_Code || row.Object_Name || "").trim();
      if (!stats.lines[key]) stats.lines[key] = { name: String(row.Object_Name || "Budget line").replace(/\s+/g, " ").trim(), diff: 0 };
      stats.lines[key].diff += now - before;
    });
    stats.change = stats.current - stats.prior;
    stats.pct = stats.prior ? stats.change / stats.prior * 100 : null;
    var staffing = visibleOffices.length ? visibleOffices.flatMap(function (office) { return office.staffing; })
      : api.getDepartmentStaffing(departmentName) || [];
    stats.fte = staffing.reduce(function (sum, row) { return sum + (Number(row[2027]) || 0); }, 0);
    stats.priorFte = staffing.reduce(function (sum, row) { return sum + (Number(row[2026]) || 0); }, 0);
    stats.staffing = staffing;
    return stats;
  }

  function fteText(value) {
    return (Math.round(value * 10) / 10).toLocaleString("en-US");
  }

  // Key figures shown above the tabs (same three boxes as the Info Popup).
  function keyFiguresHtml(stats) {
    var signed = function (value, text) { return (value > 0 ? "+" : value < 0 ? "\u2212" : "") + text; };
    var fteDelta = stats.fte - stats.priorFte;
    var budgetLabel = independent ? "FY 2027 expenditure budget" : "FY 2027 operating budget";
    var budgetScope = independent ? "Includes capital where budgeted" : "Personnel and operating; capital shown separately";
    return '<div class="wc-personnel-dept-summary wc-dept-beta-figures">' +
      '<div><span>' + budgetLabel + '</span><b>' + money(stats.current) + '</b><small>' + budgetScope + '</small></div>' +
      '<div><span>Change from FY 2026</span><b class="' + (stats.change < 0 ? "is-decrease" : "is-increase") + '">' + signed(stats.change, money(stats.change)) + '</b><small>' + (stats.pct === null ? "No FY 2026 base" : signed(stats.pct, Math.abs(stats.pct).toFixed(1) + "%") + " from " + money(stats.prior)) + '</small></div>' +
      ((!independent || stats.staffing.length) ? '<div><span>Budgeted positions</span><b>' + fteText(stats.fte) + ' FTE</b><small>' + (fteDelta === 0 ? "No change from FY 2026" : signed(fteDelta, fteText(Math.abs(fteDelta))) + " FTE from " + fteText(stats.priorFte)) + '</small></div>' : '') +
    '</div>';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; });
  }

  // Click-to-play video: show the YouTube thumbnail and load the player only
  // when it is clicked (the page holds the URL in data-src).
  function setupLiteVideo() {
    Array.prototype.forEach.call(document.querySelectorAll("iframe.wc-department-video[data-src]"), function (frame) {
      if (frame.dataset.betaLite) return;
      frame.dataset.betaLite = "1";
      var id = frame.getAttribute("data-youtube-id");
      var button = document.createElement("button");
      button.type = "button";
      button.className = "wc-beta-video-play";
      button.setAttribute("aria-label", "Play video: " + (frame.getAttribute("title") || "department video"));
      button.innerHTML = (id ? '<img src="https://i.ytimg.com/vi/' + encodeURIComponent(id) + '/hqdefault.jpg" alt="" loading="lazy">' : "") +
        '<span class="wc-beta-video-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg></span>';
      frame.style.visibility = "hidden";
      frame.parentNode.insertBefore(button, frame);
      button.addEventListener("click", function () {
        frame.src = frame.getAttribute("data-src").replace("autoplay=0", "autoplay=1").replace("mute=1", "mute=0");
        frame.removeAttribute("data-src");
        frame.style.visibility = "";
        button.remove();
        frame.focus();
      });
    });
  }
  setupLiteVideo();

  // Swap an element for a new tag, keeping its classes and children.
  function retag(el, tag) {
    if (!el || el.tagName.toLowerCase() === tag) return el;
    var next = document.createElement(tag);
    Array.prototype.forEach.call(el.attributes, function (attr) { next.setAttribute(attr.name, attr.value); });
    while (el.firstChild) next.appendChild(el.firstChild);
    el.parentNode.replaceChild(next, el);
    return next;
  }

  function numbersIn(text) {
    return (String(text).match(/-?\d[\d,]*\.?\d*/g) || []).map(function (n) { return Number(n.replace(/,/g, "")); });
  }

  // Tiny line of the reported years; for a combined measure ("23 & 20,000")
  // it draws whichever part moved the most.
  function sparkline(years) {
    var parts = Math.min.apply(null, years.map(function (y) { return y.length; }));
    var best = 0, bestRange = -1;
    for (var p = 0; p < parts; p++) {
      var values = years.map(function (y) { return y[p]; });
      var lo = Math.min.apply(null, values), hi = Math.max.apply(null, values);
      var range = hi ? (hi - lo) / Math.abs(hi) : 0;
      if (range > bestRange) { bestRange = range; best = p; }
    }
    var series = years.map(function (y) { return y[best]; });
    var min = Math.min.apply(null, series), max = Math.max.apply(null, series);
    var w = 56, h = 18;
    var points = series.map(function (value, i) {
      var x = series.length > 1 ? i / (series.length - 1) * (w - 4) + 2 : w / 2;
      var y = max === min ? h / 2 : h - 2 - (value - min) / (max - min) * (h - 4);
      return x.toFixed(1) + "," + y.toFixed(1);
    });
    var last = points[points.length - 1].split(",");
    return '<svg class="wc-beta-spark" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true"><polyline points="' + points.join(" ") + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="' + last[0] + '" cy="' + last[1] + '" r="2.4" fill="currentColor"/></svg>';
  }

  // Adds a Trend column (first reported year to 2025) and marks a FY27
  // target that differs from 2025.
  function enhanceMeasureTable(table) {
    if (table.dataset.betaTrend) return;
    table.dataset.betaTrend = "1";
    var headRow = table.tHead && table.tHead.rows[0];
    if (!headRow) return;
    var headers = Array.prototype.map.call(headRow.cells, function (cell) { return cell.textContent.trim().toLowerCase(); });
    var targetIndex = headers.findIndex(function (h) { return /target/.test(h); });
    if (targetIndex < 2) return;
    var trendHead = document.createElement("th");
    trendHead.scope = "col";
    trendHead.textContent = "Trend";
    trendHead.className = "wc-beta-trend-col";
    headRow.insertBefore(trendHead, headRow.cells[targetIndex]);
    Array.prototype.forEach.call(table.tBodies[0] ? table.tBodies[0].rows : [], function (row) {
      if (row.cells.length <= targetIndex) return;
      var years = [];
      for (var i = 1; i < targetIndex; i++) {
        var nums = numbersIn(row.cells[i].textContent);
        if (nums.length) years.push(nums);
      }
      var cell = document.createElement("td");
      cell.className = "wc-beta-trend-col";
      if (years.length >= 2) {
        var first = years[0], last = years[years.length - 1];
        var up = 0, down = 0;
        for (var k = 0; k < Math.min(first.length, last.length); k++) {
          if (last[k] > first[k]) up++;
          else if (last[k] < first[k]) down++;
        }
        var kind = up && !down ? "up" : down && !up ? "down" : up && down ? "mixed" : "steady";
        var label = { up: "Rising", down: "Falling", mixed: "Mixed", steady: "Steady" }[kind];
        var arrow = { up: "↗", down: "↘", mixed: "↕", steady: "→" }[kind];
        cell.innerHTML = sparkline(years) + ' <span class="wc-beta-trend is-' + kind + '"><b aria-hidden="true">' + arrow + "</b>" + label + "</span>";
        var target = row.cells[targetIndex];
        var targetNums = numbersIn(target.textContent);
        if (targetNums.length && targetNums.join("|") !== last.join("|")) target.classList.add("wc-beta-target-changed");
        else target.classList.add("wc-beta-target-same");
      } else {
        cell.innerHTML = '<span class="wc-beta-trend is-none">&mdash;</span>';
      }
      row.insertBefore(cell, row.cells[targetIndex]);
    });
  }

  // Opens a snapshot button's ledger popup, moves what it rendered into a
  // page section (nodes are moved, so toggles keep their handlers), and
  // closes the popup. Used to show every ledger open on its tab.
  function ledgerSection(button, title) {
    if (!button) return null;
    button.click();
    var modal = document.querySelector(".wc-budget-detail-modal:not(.wc-project-popup-modal)");
    var body = modal && modal.querySelector(".wc-budget-detail-body");
    // Some buttons fill the popup before it is shown, so check for content
    // rather than visibility.
    if (!body || !body.firstChild) return null;
    var section = document.createElement("section");
    section.className = "wc-dept-beta-ledger";
    section.innerHTML = '<div class="wc-dept-beta-ledger-head"><h2 class="wc-profile-section-title"></h2><div class="wc-dept-beta-ledger-tools"></div></div><div></div>';
    section.querySelector("h2").textContent = title;
    var tools = section.querySelector(".wc-dept-beta-ledger-tools");
    Array.prototype.forEach.call(modal.querySelectorAll(".wc-budget-detail-header-toggle, .wc-budget-detail-header-action"), function (el) {
      el.classList.remove("wc-budget-detail-header-toggle", "wc-budget-detail-header-action");
      tools.appendChild(el);
    });
    var holder = section.lastElementChild;
    holder.className = String(body.className).replace(/\bwc-budget-detail-body\b/, "").trim() + " wc-dept-beta-ledger-body";
    while (body.firstChild) holder.appendChild(body.firstChild);
    var close = modal.querySelector(".wc-budget-detail-close");
    if (close) close.click();
    return section;
  }

  // Adds a "Who Pays" column (who contributes, plus how to read it) to the
  // revenue ledger from the Who Pays ledger, matched by revenue name.
  function mergeWhoPays(revenueSection, whoPaysSection, department) {
    var norm = function (text) { return String(text || "").toLowerCase().replace(/\s+/g, " ").trim(); };
    var whoTable = whoPaysSection && whoPaysSection.querySelector("table");
    var revTable = revenueSection && revenueSection.querySelector("table.wc-data-table");
    if (!revTable || !revTable.tHead) return false;
    var whoHead = whoTable ? Array.from(whoTable.tHead.rows[0].cells, function (c) { return norm(c.textContent); }) : [];
    var contributesAt = whoHead.findIndex(function (h) { return /who contributes/.test(h); });
    var howAt = whoHead.findIndex(function (h) { return /how to read/.test(h); });
    var bySource = {};
    Array.prototype.forEach.call(contributesAt >= 0 && whoTable.tBodies[0] ? whoTable.tBodies[0].rows : [], function (row) {
      if (row.cells.length <= contributesAt) return;
      bySource[norm(row.cells[0].textContent)] = {
        who: row.cells[contributesAt].textContent.trim(),
        how: howAt >= 0 && row.cells[howAt] ? row.cells[howAt].textContent.trim() : ""
      };
    });
    var headRow = revTable.tHead.rows[0];
    var headCells = Array.prototype.slice.call(headRow.cells);
    var nameAt = headCells.findIndex(function (c) { return /revenue name/.test(norm(c.textContent)); });
    var firstYear = headCells.findIndex(function (c) { return /fy 20\d\d/.test(norm(c.textContent)); });
    if (nameAt < 0 || firstYear < 0) return false;
    var matched = 0;
    var th = document.createElement("th");
    th.scope = "col";
    th.className = "wc-beta-who-pays-col";
    th.textContent = "Who Pays";
    headRow.insertBefore(th, headCells[firstYear]);
    Array.prototype.forEach.call(revTable.tBodies, function (tbody) {
      Array.prototype.forEach.call(tbody.rows, function (row) {
        var cells = Array.prototype.slice.call(row.cells);
        // Rows that don't follow the column layout (subtotals spanning
        // columns): widen their first cell instead.
        if (cells.length < headCells.length) { if (cells[0]) cells[0].colSpan = (cells[0].colSpan || 1) + 1; return; }
        var td = document.createElement("td");
        td.className = "wc-beta-who-pays-col";
        var info = bySource[norm(cells[nameAt].textContent)];
        if (!info && cells[nameAt].textContent.trim() && window.WCFundingSources?.classify &&
            !row.matches(".wc-table-total-row, .wc-table-subtotal-row")) {
          var funding = window.WCFundingSources.classify({
            Revenue_Name: cells[nameAt].textContent,
            Revenue_Type: cells[0].textContent,
            Note: row.querySelector(".wc-itemized-description-column")?.textContent
          }, norm(department || departmentName));
          info = bySource[norm(funding.source)] || { who: funding.payer, how: funding.detail };
        }
        if (info) {
          matched++;
          td.innerHTML = "<strong></strong>" + (info.how ? "<small></small>" : "");
          td.querySelector("strong").textContent = info.who;
          if (info.how) td.querySelector("small").textContent = info.how;
        }
        row.insertBefore(td, cells[firstYear]);
      });
    });
    Array.prototype.forEach.call(revTable.tFoot ? revTable.tFoot.rows : [], function (row) {
      var cells = Array.prototype.slice.call(row.cells);
      if (cells.length < headCells.length) { if (cells[0]) cells[0].colSpan = (cells[0].colSpan || 1) + 1; return; }
      row.insertBefore(document.createElement("td"), cells[firstYear]);
    });
    return matched > 0;
  }

  // The Budget Ledger already lists capital items and contracts as their
  // own lines, but hides lines that are new for FY 2027 (no FY 2026 budget)
  // until prior years are shown. Show those new lines.
  function foldIntoLedger(ledgerSection, contractSection, capitalSection, expenses) {
    var detailRow = ledgerSection && ledgerSection.querySelector("tr.wc-budget-line-detail-row");
    var capitalTotal = ledgerSection?.querySelector("tr.wc-profile-capital-total-row");
    var table = (detailRow || capitalTotal)?.closest("table");
    if (!table) return false;
    Array.prototype.forEach.call(table.querySelectorAll("tbody tr.wc-budget-line-detail-row.wc-budget-line-zero-prior-budget"), function (row) {
      if (row.classList.contains("wc-budget-line-zero-current") || row.classList.contains("wc-table-subtotal-row")) return;
      row.classList.add("wc-beta-show");
    });
    var contractRows = contractSection ? Array.from(contractSection.querySelectorAll("tbody tr:not(.wc-table-total-row)")) : [];
    var expenseRows = Array.from(table.querySelectorAll("tbody tr.wc-budget-line-detail-row:not(.wc-table-subtotal-row):not(.wc-budget-line-zero-current)"));
    function normalizedText(cell) {
      return cell ? cell.textContent.trim().replace(/\s+/g, " ").toLowerCase() : "";
    }
    contractRows.forEach(function (contract) {
      if (contract.cells.length < 5) return;
      var service = normalizedText(contract.cells[0]);
      var matches = expenseRows.filter(function (row) {
        var description = normalizedText(row.querySelector(".wc-itemized-description-column"));
        return (description === service || description.split(/\s+—\s+|;\s+/).includes(service)) &&
          normalizedText(row.cells[row.cells.length - 1]) === normalizedText(contract.cells[4]);
      });
      // One consistent second line under the description:
      // "[View document →] · Provider: X" (pill button first). Missing
      // providers or documents are simply left out.
      var detail = document.createElement("small");
      detail.className = "wc-beta-ledger-line-note wc-beta-contract-detail";
      var provider = contract.cells[1].textContent.trim();
      var parts = [];
      if (provider && !/^not (listed|provided)$/i.test(provider)) parts.push(document.createTextNode("Provider: " + provider));
      var sourceLink = contract.cells[2].querySelector("a");
      if (sourceLink) {
        // Same pill button as before (cloned from the contract sheet link).
        var documentLink = sourceLink.cloneNode(true);
        // Document link first, so every link lines up at the start of the line.
        parts.unshift(documentLink);
      }
      parts.forEach(function (part, index) {
        if (index) detail.append(" · ");
        detail.append(part);
      });
      if (matches.length === 1) {
        if (parts.length) matches[0].querySelector(".wc-itemized-description-column").append(detail);
      } else {
        // Some contracts sit inside a combined account line. Show the
        // reference in the same table without adding another budget amount.
        var referenceRow = document.createElement("tr");
        var referenceCell = referenceRow.insertCell();
        referenceCell.colSpan = table.tHead.rows[0].cells.length;
        referenceCell.append(contract.cells[0].textContent.trim() + " · " + contract.cells[4].textContent.trim() + " · ", detail);
        var total = table.querySelector("tr.wc-table-total-row");
        (total?.parentElement || table.tBodies[0]).insertBefore(referenceRow, total);
      }
    });
    if (contractSection) contractSection.remove();

    // The ledger has only a "Capital Outlay Total" line, so list the
    // capital items above it using the ledger's own columns, even when all
    // operating rows are marked as new or have zero amounts.
    var capitalAdded = 0;
    var totalRow = capitalTotal;
    var columns = totalRow?.closest("table").tHead?.rows[0]?.cells;
    // Capital budget lines, to show each item's account (matched by amount).
    var capitalLines = (expenses || []).filter(function (row) {
      return /capital/i.test(String(row.Object_Type || "")) && (Number(row.FY2027_Proposed) || 0) !== 0;
    });
    if (totalRow && columns?.length >= 5 && capitalSection) {
      Array.prototype.forEach.call(capitalSection.querySelectorAll("tbody tr"), function (item) {
        if (item.classList.contains("wc-table-total-row") || item.cells.length < 3) return;
        var c = item.cells;
        var row = document.createElement("tr");
        row.className = "wc-beta-capital-row";
        Array.from(columns).forEach(function (column) {
          row.insertCell().className = column.className;
        });
        var amount = Number(c[c.length - 1].textContent.replace(/[^0-9.\-]/g, "")) || 0;
        var lineIndex = capitalLines.findIndex(function (line) { return Math.round(Number(line.FY2027_Proposed) || 0) === Math.round(amount) &&
          String(line.Note || line.Project_Name || line.Object_Name || "Capital investment").trim() === c[1].textContent.trim(); });
        var line = lineIndex >= 0 ? capitalLines.splice(lineIndex, 1)[0] : null;
        row.cells[0].textContent = "Capital Outlay";
        row.cells[1].textContent = line ? String(line.Object_Code || "").trim() : "";
        row.cells[2].textContent = line ? String(line.Object_Name || "").trim() : "Capital item";
        if (line?.Object_Code) row.cells[2].dataset.objectCode = String(line.Object_Code).trim();
        row.cells[3].textContent = c[1].textContent.trim();
        if (c.length >= 4 && !/^\s*[—–-]\s*$/.test(c[2].textContent)) {
          var reference = document.createElement("small");
          reference.className = "wc-beta-ledger-line-note";
          reference.textContent = c[2].textContent.trim();
          row.cells[3].appendChild(reference);
        }
        row.cells[row.cells.length - 1].textContent = c[c.length - 1].textContent.trim();
        totalRow.parentNode.insertBefore(row, totalRow);
        capitalAdded++;
      });
    }
    if (capitalSection) {
      if (capitalAdded || !capitalSection.querySelector("table")) capitalSection.remove();
      else appendLedgerReference(ledgerSection, capitalSection, "Capital item details");
    }
    return true;
  }

  function appendLedgerReference(ledger, section, label) {
    var details = document.createElement("details");
    var summary = document.createElement("summary");
    summary.textContent = label;
    details.append(summary, section.querySelector(".wc-dept-beta-ledger-body"));
    ledger.appendChild(details);
    section.remove();
  }

  function build() {
    if (content.dataset.deptBeta) return;
    content.dataset.deptBeta = "1";
    document.documentElement.classList.add("wc-dept-beta");

    var functionSection = content.querySelector(".wc-dept-function-services");
    var statementTitle = functionSection && functionSection.querySelector("#wc-dept-function-services-title");
    var media = functionSection && functionSection.querySelector(".wc-dept-supporting-media");
    // Constitutional officers' submitted budget requests: shown in their own
    // tab from a local copy (the County site blocks embedding), instead of
    // as a link in the Statement of Function.
    var submittedDocs = {
      "45225": { file: "sheriff-submitted-budget.pdf" },
      "45479": { file: "tax-collector-submitted-budget.pdf" },
      "45227": { file: "clerk-submitted-budget.pdf" },
      "45269": { file: "property-appraiser-submitted-budget.pdf" },
      "45234": { file: "supervisor-of-elections-submitted-budget.pdf" }
    };
    var submittedDoc = null;
    Array.prototype.forEach.call(content.querySelectorAll("a[href*='DocumentCenter/View/']"), function (link) {
      var id = (link.getAttribute("href").match(/DocumentCenter\/View\/(\d+)/) || [])[1];
      if (!id || !submittedDocs[id]) return;
      submittedDoc = { file: submittedDocs[id].file, source: link.href };
      var holder = link.closest("p");
      link.remove();
      if (holder && !holder.textContent.trim()) holder.remove();
    });
    var statementText = Array.prototype.filter.call(functionSection ? functionSection.children : [], function (el) { return el.tagName === "P"; });
    var goalChain = content.querySelector(".wc-dept-goal-chain");
    var goalLabel = goalChain && goalChain.querySelector(".wc-dept-services-label");
    var goalPair = goalChain && goalChain.querySelector(".wc-dept-goal-pair");
    var servicesHead = goalChain && goalChain.querySelector(".wc-dept-core-services-head");
    var serviceNote = goalChain && goalChain.querySelector(".wc-profile-service-note");
    var measureList = goalChain && goalChain.querySelector(".wc-dept-service-measure-list");
    var snapshot = content.querySelector(".wc-board-department-profile:not(.wc-profile-snapshot--office)");
    var officeSnapshots = Array.from(content.querySelectorAll(".wc-profile-snapshot--office"));
    var narrativeBlock = document.getElementById("department-narrative") || functionSection || snapshot;
    while (narrativeBlock.parentElement !== content) narrativeBlock = narrativeBlock.parentElement;
    var placeholder = content.querySelector("#department-performance-table");

    // Tabs
    var tabs = [
      ["overview", "Overview"],
      ["budget", "Budget"],
      ["budget-graph", "Budget Graph"],
      ["revenue", "Revenue"],
      ["staffing", "Staffing"],
      ["services", "Services & Performance"]
    ];
    // Supporting Document sits right after Budget.
    tabs.splice(2, 0, ["submitted", "Supporting Document"]);
    var bar = document.createElement("div");
    bar.className = "wc-click-through-tabs wc-dept-beta-tabs";
    bar.setAttribute("role", "tablist");
    bar.setAttribute("aria-label", departmentName + " topics");
    bar.innerHTML = tabs.map(function (tab) {
      return '<button type="button" role="tab" id="dept-tab-' + tab[0] + '" aria-controls="dept-panel-' + tab[0] + '" data-dept-tab="' + tab[0] + '" aria-selected="false" tabindex="-1">' + tab[1] + "</button>";
    }).join("");

    function panel(key) {
      var el = document.createElement("section");
      el.className = "wc-dept-beta-panel";
      el.id = "dept-panel-" + key;
      el.setAttribute("role", "tabpanel");
      el.setAttribute("aria-labelledby", "dept-tab-" + key);
      el.setAttribute("data-dept-panel", key);
      return el;
    }
    var overview = panel("overview");
    var budget = panel("budget");
    var budgetGraph = panel("budget-graph");
    var revenue = panel("revenue");
    var staffing = panel("staffing");
    var services = panel("services");

    // Overview: statement + goal/challenge in the left column, video on the
    // right, so the text column fills the space beside the video.
    var intro = document.createElement("div");
    intro.className = "wc-dept-beta-intro";
    var introText = document.createElement("div");
    introText.className = "wc-dept-beta-intro-text";
    if (statementTitle) {
      statementTitle.classList.add("wc-profile-section-title");
      introText.appendChild(statementTitle);
    }
    statementText.forEach(function (p) { introText.appendChild(p); });
    if (goalPair) {
      if (goalLabel) goalLabel.remove();
      goalPair.querySelectorAll(".wc-dept-goal-quote > span").forEach(function (label) {
        var sectionTitle = retag(label, "h2");
        sectionTitle.classList.add("wc-profile-section-title");
        if (sectionTitle.parentElement.matches(".wc-dept-challenge-quote")) {
          sectionTitle.textContent = "Department Challenges";
        }
      });
      introText.appendChild(goalPair);
    }
    var stats = budgetStats();
    intro.appendChild(introText);
    if (media) intro.appendChild(media);
    else intro.classList.add("wc-dept-beta-intro--text");
    overview.appendChild(intro);

    // Budget: the expenditures card. Revenue: the revenue card with its
    // source and the revenue ledger shown inline. Staffing: the personnel
    // ledger shown inline in place of the position card.
    var cards = Array.prototype.slice.call(snapshot.querySelectorAll(".wc-profile-snapshot-card"));
    var cardWithKicker = function (pattern) {
      return cards.find(function (card) {
        var kicker = card.querySelector(".wc-profile-snapshot-kicker");
        return kicker && pattern.test(kicker.textContent);
      });
    };
    var revenueCard = cardWithKicker(/revenue/i);
    var positionCard = cardWithKicker(/position/i);
    var revenueMount = document.getElementById("department-revenue-table");
    var secondarySnapshot = independent && content.querySelector(".court-innovations-supplemental-tables .wc-independent-office-snapshot");
    // Budget: every expenditure ledger open as its own section, in place
    // of the Expenditures Summary card. The snapshot section stays (hidden)
    // because it holds the page's ledger mounts.
    var expenseCard = cardWithKicker(/expend/i);
    if (expenseCard && !officeSnapshots.length) {
      var budgetSections = {};
      Array.prototype.forEach.call(expenseCard.querySelectorAll(".wc-profile-snapshot-actions button, .wc-profile-snapshot-actions a"), function (button) {
        var title = button.textContent.replace(/^\s*View\s+/i, "").trim();
        var section = ledgerSection(button, title);
        if (!section) return;
        budgetSections[title.toLowerCase()] = section;
        (title.toLowerCase() === "budget graph" ? budgetGraph : budget).appendChild(section);
      });
      if (!budgetSections["budget ledger"] && !snapshot.hidden) {
        budget.appendChild(expenseCard);
      }
      // The graph's legend goes in its heading row so the chart can use the
      // full width (its buttons keep their show/hide handlers).
      var graph = budgetSections["budget graph"];
      var legend = graph && graph.querySelector(".wc-snapshot-chart-legend");
      if (legend) graph.querySelector(".wc-dept-beta-ledger-tools").appendChild(legend);
      // Capital items and contracts are shown as lines in the Budget Ledger
      // rather than as separate tables.
      var ledger = budgetSections["budget ledger"];
      if (ledger) foldIntoLedger(ledger, budgetSections["contractual services"],
        budgetSections["capital investments"], window.WCBudgetData.getDepartmentExpenses(departmentName));
    }
    budget.appendChild(snapshot);

    // Built from the same popup content as the Budget Ledger so the two
    // look alike (the page's own hidden copy uses smaller table styles).
    // The page finishes that hidden copy a moment after it first renders,
    // so retry briefly until it has content; it always goes first on the tab.
    var whoPaysSection = null;
    function addRevenueLedger(attempt) {
      var toggle = revenueMount && revenueMount.querySelector(".wc-view-budget-lines-toggle");
      var detail = toggle && document.getElementById(toggle.getAttribute("data-target"));
      var section = detail && detail.querySelector("table") ? ledgerSection(toggle, "Revenue Budget Ledger") : null;
      if (section) {
        revenue.insertBefore(section, revenue.firstChild);
        // Who Pays becomes a column on the revenue ledger instead of its
        // own table; if it cannot be matched, show it as its own section.
        if (!mergeWhoPays(section, whoPaysSection) && whoPaysSection) revenue.appendChild(whoPaysSection);
        return;
      }
      if (attempt < 30) window.setTimeout(function () { addRevenueLedger(attempt + 1); }, 150);
      else if (whoPaysSection) revenue.appendChild(whoPaysSection);
      else revenue.innerHTML = '<p class="wc-data-empty">No revenue ledger is available for this department.</p>';
    }
    // Revenue shows only the ledger, with View Who Pays under it (the
    // button keeps its click handler when moved).
    if (revenueCard && !officeSnapshots.length) {
      var whoPays = Array.prototype.find.call(revenueCard.querySelectorAll("button, a"), function (el) { return /who pays/i.test(el.textContent); });
      whoPaysSection = ledgerSection(whoPays, "Who Pays Ledger");
      revenueCard.remove();
    }
    // Hide the emptied snapshot only after every ledger has been captured
    // (its buttons ignore clicks while hidden).
    snapshot.hidden = true;
    if (independent) {
      var revenueLedger = revenueMount?.querySelector(".wc-budget-lines-detail table") &&
        ledgerSection(revenueCard?.querySelector("[data-independent-revenue-sheet-trigger]"), "Revenue Budget Ledger");
      if (revenueLedger) {
        revenue.appendChild(revenueLedger);
        mergeWhoPays(revenueLedger, whoPaysSection);
      } else if (whoPaysSection?.querySelector("table")) {
        revenue.appendChild(whoPaysSection);
      }
    } else if (!officeSnapshots.length) {
      window.setTimeout(function () { addRevenueLedger(0); }, 0);
    }


    var budgetPreparer = content.querySelector("[data-department-budget-preparer]");
    if (budgetPreparer) staffing.appendChild(budgetPreparer);
    var personnelHtml = window.WCBudgetData && typeof window.WCBudgetData.getDepartmentPersonnelCostDetail === "function"
      ? window.WCBudgetData.getDepartmentPersonnelCostDetail(departmentName) : "";
    content.querySelectorAll(".wc-profile-snapshot-fte-requests").forEach(function (callout) {
      callout.remove();
    });
    var useOfficeStaffingSummary = independent && departmentName !== "Board of County Commissioners";
    if (useOfficeStaffingSummary) {
      var positionButton = positionCard?.querySelector("[data-independent-personnel-ledger-trigger]");
      var positionLedger = ledgerSection(positionButton, "Personnel Ledger");
      if (positionCard) {
        if (positionLedger) positionButton.remove();
        staffing.appendChild(positionCard);
      }
      if (positionLedger) staffing.appendChild(positionLedger);
    } else if (personnelHtml && !officeSnapshots.length) {
      if (positionCard) {
        positionCard.querySelectorAll(".wc-profile-snapshot-director").forEach(function (detail) {
          staffing.appendChild(detail);
        });
      }
      var staffingLedger = document.createElement("section");
      staffingLedger.className = "wc-dept-beta-ledger";
      staffingLedger.innerHTML = '<h2 class="wc-profile-section-title">Personnel Ledger</h2><div class="wc-dept-beta-ledger-body"></div>';
      var staffingBody = staffingLedger.querySelector(".wc-dept-beta-ledger-body");
      staffingBody.innerHTML = personnelHtml;
      // The "Budgeted position costs" note reads better under the table.
      var staffingNote = staffingBody.querySelector(":scope > .wc-data-source-note");
      if (staffingNote) staffingBody.appendChild(staffingNote);
      var staffingTitle = staffingBody.querySelector(".wc-staffing-notes-title");
      var staffingHeader = staffingTitle?.closest(".wc-staffing-notes-title-row");
      if (staffingHeader) {
        staffingHeader.classList.add("wc-dept-beta-personnel-header");
        staffingTitle.replaceWith(staffingLedger.querySelector("h2"));
      } else if (staffingTitle) staffingTitle.remove();
      staffing.appendChild(staffingLedger);
    } else if (positionCard && !officeSnapshots.length) {
      staffing.appendChild(positionCard);
    } else if (!officeSnapshots.length) {
      staffing.insertAdjacentHTML("beforeend", '<p class="wc-data-empty">No position detail is available for this department.</p>');
    }

    // Combined Tourism pages have independently budgeted offices. Use the
    // already-bound office actions rather than the empty combined mounts.
    officeSnapshots.forEach(function (officeSnapshot) {
      var office = officeSnapshot.closest(".tourism-admin-section");
      var officeHeading = office && office.querySelector(".tourism-admin-section-title");
      var label = officeHeading ? officeHeading.textContent.trim() : departmentName;
      var captured = new Set();
      function addOfficeSection(target, selector, title) {
        var section = ledgerSection(officeSnapshot.querySelector(selector), label + " · " + title);
        if (section) {
          target.appendChild(section);
          captured.add(selector);
        }
        return section;
      }
      var officeBudget = addOfficeSection(budget, "[data-office-operating-budget-sheet-trigger]", "Budget Ledger");
      addOfficeSection(budgetGraph, "[data-office-graph-trigger]", "Budget Graph");
      var officeCapital = addOfficeSection(budget, "[data-office-capital-trigger]", "Capital Investments");
      var officeContracts = addOfficeSection(budget, "[data-office-contracts-trigger]", "Contractual Services");
      if (officeBudget) {
        var officeData = window.WCBudgetData.getCombinedDepartmentOffices(departmentName).find(function (data) {
          return office && data.id === office.id;
        });
        foldIntoLedger(officeBudget, officeContracts, officeCapital, officeData?.expenses);
      }
      var officeRevenue = addOfficeSection(revenue, "[data-office-revenue-sheet-trigger]", "Revenue Budget Ledger");
      var officePayers = addOfficeSection(revenue, "[data-office-who-pays-trigger]", "Who Pays");
      if (mergeWhoPays(officeRevenue, officePayers, label) && officePayers) officePayers.remove();
      var officeStaffing = addOfficeSection(staffing, "[data-office-personnel-ledger-trigger]", "Personnel Ledger");
      if (officeStaffing) {
        officeSnapshot.querySelectorAll(".wc-profile-snapshot-director").forEach(function (detail) {
          officeStaffing.appendChild(detail);
        });
      }
      if (Array.from(officeSnapshot.querySelectorAll(".wc-profile-snapshot-actions button")).every(function (button) {
        return Array.from(captured).some(function (selector) { return button.matches(selector); });
      })) officeSnapshot.hidden = true;
    });

    if (secondarySnapshot) {
      [
        [budget, "[data-court-innovations-ledger-trigger]", "Court Innovations · Budget Ledger"],
        [budgetGraph, "[data-court-innovations-graph-trigger]", "Court Innovations · Budget Graph"],
        [revenue, "[data-court-innovations-revenue-trigger]", "Court Innovations · Revenue Ledger"]
      ].forEach(function ([target, selector, label]) {
        var ledger = ledgerSection(secondarySnapshot.querySelector(selector), label);
        if (ledger) {
          target.appendChild(ledger);
          if (target === revenue) mergeWhoPays(ledger, ledgerSection(secondarySnapshot.querySelector("[data-court-innovations-who-pays]"), "Who Pays"), "court innovations");
        }
      });
      secondarySnapshot.hidden = true;
    }

    // Each service heads its own description and performance measures.
    if (servicesHead) servicesHead.remove();
    if (measureList) {
      measureList.querySelectorAll(".wc-dept-service-head > h3").forEach(function (title) {
        retag(title, "h2").classList.add("wc-profile-section-title");
      });
      measureList.querySelectorAll("table.wc-dept-measure-table").forEach(enhanceMeasureTable);
      services.appendChild(measureList);
    }
    // An empty "no verified performance series" box says nothing; drop it.
    services.querySelectorAll(".wc-data-empty, .wc-dept-measure-empty").forEach(function (el) {
      if (/no verified performance/i.test(el.textContent)) el.remove();
    });

    // Assemble: tabs + panels replace the old statement/media block.
    var anchor = narrativeBlock;
    if (independent && placeholder?.querySelector("table")) services.appendChild(placeholder);
    var submitted = panel("submitted");
    if (submittedDoc) {
      var pdfUrl = "../assets/documents/submitted-budgets/" + submittedDoc.file;
      submitted.innerHTML =
        '<div class="wc-dept-beta-submitted-head">' +
          '<h2 class="wc-profile-section-title">Submitted Budget Request</h2>' +
        '</div>' +
        '<iframe class="wc-dept-beta-submitted-frame" src="' + pdfUrl + '#view=FitH" title="' + escapeHtml(departmentName) + ' submitted budget request" loading="lazy"></iframe>';
    }
    var panels = { overview: overview, budget: budget, "budget-graph": budgetGraph, revenue: revenue, staffing: staffing, services: services, submitted: submitted };
    tabs = tabs.filter(function ([key]) {
      if (key === "submitted") return !!submittedDoc;
      if (key === "budget-graph") return budgetGraph.hasChildNodes();
      return !independent || key === "overview" || key === "budget" || panels[key].textContent.trim();
    });
    bar.querySelectorAll("[data-dept-tab]").forEach(function (button) {
      if (!tabs.some(function ([key]) { return key === button.dataset.deptTab; })) button.remove();
    });
    if (stats) {
      var figures = document.createElement("div");
      figures.innerHTML = keyFiguresHtml(stats);
      anchor.parentNode.insertBefore(figures.firstChild, anchor);
    }
    anchor.parentNode.insertBefore(bar, anchor);
    bar.after(...tabs.map(function ([key]) { return panels[key]; }));
    // Keep remaining narrative content, including office sections, maps and
    // program snapshots that were not part of the Emergency Management page.
    if (goalChain) {
      if (serviceNote) serviceNote.remove();
      if (goalChain.textContent.trim()) services.appendChild(goalChain);
      else goalChain.remove();
    }
    if (serviceNote) services.appendChild(serviceNote);
    if (narrativeBlock !== snapshot) overview.appendChild(narrativeBlock);
    if (independent) {
      content.querySelectorAll(":scope > .wc-commissioner-cards, :scope > .wc-constitutional-officer-portrait, :scope > .wc-image-card").forEach(function (detail) {
        overview.appendChild(detail);
      });
    }
    var publicSafety = snapshot.querySelector(".wc-program-safety-section");
    if (publicSafety) budget.appendChild(publicSafety);
    var lifeguardMap = snapshot.querySelector(".wc-lifeguard-summary-map");
    if (lifeguardMap) overview.appendChild(lifeguardMap);
    var publicWorksMap = content.querySelector(".public-works-map-section");
    if (publicWorksMap) overview.appendChild(publicWorksMap);
    var stateAid = content.querySelector("#department-state-aid-tables");
    if (stateAid) budget.appendChild(stateAid);
    if (placeholder && !placeholder.textContent.trim()) placeholder.hidden = true;

    var buttons = Array.prototype.slice.call(bar.querySelectorAll("[data-dept-tab]"));
    function select(key, focus, preserveHash) {
      if (!tabs.some(function (t) { return t[0] === key; })) key = "overview";
      buttons.forEach(function (button) {
        var on = button.getAttribute("data-dept-tab") === key;
        button.setAttribute("aria-selected", String(on));
        button.tabIndex = on ? 0 : -1;
        if (on && focus) button.focus();
      });
      Object.values(panels).forEach(function (p) { p.hidden = p.getAttribute("data-dept-panel") !== key; });
      if (preserveHash) return;
      try { history.replaceState(history.state, "", key === "overview" ? location.pathname + location.search : "#" + key); } catch (e) {}
    }
    buttons.forEach(function (button, index) {
      button.addEventListener("click", function () { select(button.getAttribute("data-dept-tab")); });
      button.addEventListener("keydown", function (event) {
        var next;
        if (event.key === "ArrowRight") next = (index + 1) % buttons.length;
        if (event.key === "ArrowLeft") next = (index - 1 + buttons.length) % buttons.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = buttons.length - 1;
        if (next === undefined) return;
        event.preventDefault();
        select(buttons[next].getAttribute("data-dept-tab"), true);
      });
    });
    if (officeSnapshots.length && !staffing.textContent.trim()) {
      staffing.innerHTML = '<p class="wc-data-empty">No position detail is available for this department.</p>';
    }
    if (!independent && !services.textContent.trim()) {
      services.innerHTML = '<p class="wc-data-empty">No department-wide performance detail is available on this page.</p>';
    }
    var hash = location.hash.slice(1);
    var anchoredPanel = document.getElementById(hash)?.closest("[data-dept-panel]");
    select(anchoredPanel ? anchoredPanel.dataset.deptPanel : hash || "overview", false, !!anchoredPanel);
    if (anchoredPanel) document.getElementById(hash).scrollIntoView();
  }

  if (ready()) { build(); return; }
  var observer = new MutationObserver(function () {
    if (!ready()) return;
    observer.disconnect();
    // Let department-services.js finish its own pass first.
    window.setTimeout(build, 60);
  });
  observer.observe(content, { childList: true, subtree: true });
  window.setTimeout(function () { observer.disconnect(); }, 15000);
})();
