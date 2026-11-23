(function () {
  "use strict";

  function $(selector) {
    return document.querySelector(selector);
  }

  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatDate(value) {
    if (!value) return "Not available";
    const date = new Date(value + "T00:00:00");
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const accountAcronyms = new Set([
    'ADA', 'BCC', 'COBRA', 'DOT', 'E911', 'EMS', 'EOC', 'FDOT', 'FEMA',
    'FICA', 'FSS', 'FY', 'GPS', 'HUD', 'HVAC', 'IT', 'LLC', 'MSBU',
    'TDC', 'US', 'USA', 'USDA'
  ]);
  function formatAccountName(value) {
    const name = String(value || '').trim().replace(/\s+/g, ' ');
    if (!name) return 'Not available';
    if (name !== name.toUpperCase()) return name;
    return name.replace(/[A-Z0-9]+/g, (word, offset) => {
      if (accountAcronyms.has(word) || /^[A-Z][0-9]+$/.test(word) || word.length === 1) return word;
      if (/^[0-9]+(?:ST|ND|RD|TH)$/.test(word)) return word.toLowerCase();
      if (offset > 0 && /^(AND|OR|OF|THE|FOR|IN|ON|TO|WITH)$/.test(word)) return word.toLowerCase();
      return word.charAt(0) + word.slice(1).toLowerCase();
    });
  }

  const departmentNames = new Map();
  function transactionDepartmentName(row) {
    const code = String(row.department_code || '').trim();
    return departmentNames.get(code) || departmentNames.get(code.slice(0, 6)) || 'Not available';
  }
  let currentPage = 0;
  let lastRows = [];
  let lastCount = 0;
  let searchRequestId = 0;

  function readFilters() {
    const form = $("#txnFilters");
    return {
      kind: form.kind.value,
      year: form.year.value,
      departmentCodes: form.departmentCodes.value ? form.departmentCodes.value.split(",").filter(Boolean) : [],
      accountCode: form.accountCode.value,
      sort: form.sort.value
    };
  }

  const FILTER_PROMPT = "Select a type, fiscal year, department, and account to search.";

  function requiredFiltersSelected(filters) {
    return !!(filters.kind && filters.year && filters.departmentCodes.length && filters.accountCode);
  }

  function updateSearchButton() {
    $("#txnSearch").disabled = !requiredFiltersSelected(readFilters());
  }

  function renderTable(rows) {
    const host = $("#txnResults");
    if (!rows.length) {
      host.innerHTML = '<div class="wc-txn-empty"><strong>No matching transactions</strong><p>Try a different fiscal year, department, account, or transaction type.</p></div>';
      return;
    }
    const bodyRows = rows.map((row) => {
      const type = transactionType(row);
      const amount = Math.abs(Number(row.amount) || 0);
      return (
        "<tr>" +
        '<td data-label="Date">' + escapeHtml(formatDate(row.transaction_date)) + "</td>" +
        '<td data-label="Vendor / Payee" class="wc-txn-vendor">' + escapeHtml(row.vendor_payee_public || "Not available") + "</td>" +
        '<td data-label="Description">' + escapeHtml(row.description_public || "No description provided") + "</td>" +
        '<td data-label="Account">' + escapeHtml(formatAccountName(row.object_name)) + "</td>" +
        '<td data-label="Department">' + escapeHtml(transactionDepartmentName(row)) + "</td>" +
        '<td data-label="Amount" class="wc-txn-amount' + (row.category === 'revenue' ? " is-revenue" : "") + '">' + '<span class="wc-txn-type">' + escapeHtml(type) + '</span>' + escapeHtml(formatCurrency(amount)) + "</td>" +
        "</tr>"
      );
    }).join("");

    host.innerHTML =
      '<div class="wc-txn-table-wrap" tabindex="0" role="region" aria-label="Transaction results; scroll horizontally for more columns"><table class="wc-txn-table">' +
      "<thead><tr>" +
      "<th>Date</th><th>Vendor / Payee</th><th>Description</th><th>Account</th>" +
      "<th>Department</th><th>Amount</th>" +
      "</tr></thead><tbody>" + bodyRows + "</tbody></table></div>";
  }

  function csvEscape(value) {
    // Prevent spreadsheet formulas in public text fields; preserve numeric amounts.
    let text = String(value === undefined || value === null ? "" : value);
    if (typeof value !== "number" && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }

  function transactionType(row) {
    return ({ expense: 'Expense', expense_credit: 'Expense credit',
      revenue: 'Revenue receipt', revenue_refund: 'Revenue refund / reversal',
      adjustment: 'Adjustment' })[row.category] || 'Adjustment';
  }

  function downloadCsv() {
    if (!lastRows.length) return;
    const headers = ["Date", "Vendor/Payee", "Description", "Account", "Type", "Department Code", "Fund Code", "Amount"];
    const lines = [headers.join(",")];
    lastRows.forEach((row) => {
      lines.push([
        row.transaction_date || "",
        row.vendor_payee_public || "",
        row.description_public || "",
        row.object_name ? formatAccountName(row.object_name) : "",
        transactionType(row),
        row.department_code || "",
        row.fund_code || "",
        row.amount
      ].map(csvEscape).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "walton-county-transactions-page-" + (currentPage + 1) + ".csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function runSearch(resetPage) {
    const requestId = ++searchRequestId;
    if (resetPage) currentPage = 0;
    const status = $("#txnStatus");
    const pagination = $("#txnPagination");
    const downloadBtn = $("#txnDownload");
    const filters = readFilters();
    if (!requiredFiltersSelected(filters)) {
      status.textContent = FILTER_PROMPT;
      updateSearchButton();
      return;
    }

    if (!window.WCSupabaseData || typeof window.WCSupabaseData.searchTransactions !== "function") {
      status.textContent = "Transaction search is unavailable right now.";
      return;
    }

    const resultsHost = $("#txnResults");
    resultsHost.setAttribute('aria-busy', 'true');
    status.textContent = "Searching…";
    $("#txnResults").innerHTML = "";
    downloadBtn.disabled = true;
    pagination.hidden = true;
    $("#txnResultsToolbar").hidden = true;

    let result;
    try { result = await window.WCSupabaseData.searchTransactions(filters, currentPage); }
    catch (error) { if (requestId === searchRequestId) status.textContent = "Transaction search could not connect. Please try again."; return; }
    finally { if (requestId === searchRequestId) resultsHost.setAttribute("aria-busy", "false"); }
    if (requestId !== searchRequestId) return;
    lastRows = result.rows || [];
    lastCount = result.count === null || result.count === undefined ? null : result.count;

    if (result.error) {
      status.textContent = result.error.code === "57014"
        ? "That search took too long. Choose a fiscal year, department, or account to narrow the results."
        : "Something went wrong loading transactions. Try narrowing your search and try again.";
      return;
    }

    const pageSize = (window.WCSupabaseData && window.WCSupabaseData.SEARCH_PAGE_SIZE) || 50;
    const from = currentPage * pageSize + 1;
    const to = currentPage * pageSize + lastRows.length;

    if (!lastRows.length) {
      status.textContent = currentPage > 0 ? "No more matching transactions." : "No matching transactions.";
    } else if (lastCount === null) {
      // The search API may omit the total count to keep requests fast.
      status.innerHTML =
        "Showing <strong>" + from.toLocaleString("en-US") + "&ndash;" + to.toLocaleString("en-US") + "</strong> matching transactions" +
        (lastRows.length === pageSize ? " (there may be more &mdash; use Next)." : ".");
    } else {
      status.innerHTML =
        "Showing <strong>" + from.toLocaleString("en-US") + "&ndash;" + to.toLocaleString("en-US") +
        "</strong> of approximately <strong>" + lastCount.toLocaleString("en-US") + "</strong> matching transactions.";
    }

    renderTable(lastRows);
    downloadBtn.disabled = !lastRows.length;
    $("#txnResultsToolbar").hidden = !lastRows.length;

    pagination.hidden = !lastRows.length && currentPage === 0;
    $("#txnPrev").disabled = currentPage === 0;
    $("#txnNext").disabled = lastRows.length < pageSize;
    $("#txnPageLabel").textContent = "Page " + (currentPage + 1);
  }

  let filterCatalog = null;

  // Account families follow the same rules as the transaction search RPC.
  // Net historical totals identify account/year availability, not whether a
  // particular payment was a credit or a refund.
  function accountMatchesType(code, kind) {
    if (kind === "expense") return code.startsWith("5");
    if (kind === "expense_credit") return code.startsWith("5") || code === "369300";
    if (kind === "revenue" || kind === "revenue_refund") return code.startsWith("3") && code !== "369300";
    if (kind === "adjustment") return code === "369300" || !/^[35]/.test(code);
    return false;
  }

  function revenueGroup(name) {
    if (/^(interest and other earnings|contributions and donations|pro shop sales|sale of fixed assets|state shared revenue \(other\))$/i.test(name)) {
      return {
        'interest and other earnings': 'Interest and Other Earnings',
        'contributions and donations': 'Contributions and Donations',
        'pro shop sales': 'Pro Shop Sales',
        'sale of fixed assets': 'Sale of Fixed Assets',
        'state shared revenue (other)': 'State Shared Revenue (Other)'
      }[name.toLowerCase()];
    }
    if (/^(state|federal)\s+grant\b/i.test(name)) return 'Grant Reimbursements';
    if (/^tourist development tax/i.test(name)) return 'Tourist Development Tax';
    if (/^general government fees$/i.test(name)) return 'General Government Fees';
    if (/^judgments? and (fines|fees)$/i.test(name)) return 'Judgments and Fines';
    if (/^physical environment (fees|revenue)/i.test(name)) return 'Physical Environment Revenue';
    if (/^ad valorem/i.test(name)) return 'Ad Valorem Taxes';
    return '';
  }

  function buildFilterCatalog(data) {
    const accounts = new Map();
    const excludedAccounts = new Set(["500000", "523004", "999997"]);
    (data.expenditures || []).forEach(row => {
      const code = String(row.Object_Code || "").trim();
      const name = code === "581001" ? "Aid to Government Agencies" : String(row.Object_Name || "").trim();
      if (code && name && !excludedAccounts.has(code) && !/unclassified|published final budget reconciliation/i.test(name)) {
        accounts.set(code, { name, group: "" });
      }
    });
    (data.revenues || []).forEach(row => {
      const code = String(row.Revenue_Code || "").trim();
      const name = String(row.Revenue_Name || "").trim();
      if (code && name && !/unclassified|published final budget reconciliation/i.test(name)) {
        accounts.set(code, { name, group: revenueGroup(name) });
      }
    });
    const historical = (data.expenseActualRows || []).concat(data.revenueActualRows || [])
      .filter(row => Number(row.year) >= 2020 && Number(row.year) <= 2025 && Number(row.amount) !== 0)
      .map(row => ({ year: String(row.year), org: String(row.org || "").trim(), code: String(row.object || "").trim() }))
      .filter(row => row.org && row.code && !excludedAccounts.has(row.code));
    historical.forEach(row => {
      if (!accounts.has(row.code)) accounts.set(row.code, { name: row.code === "512007" ? "PTO Buyback" : "Historical Account", group: "" });
    });
    const departments = new Map();
    const departmentAccounts = new Map();
    (data.expenditures || []).concat(data.revenues || []).forEach(row => {
      const name = String(row.Dept_Name || "").trim();
      const code = String(row.Object_Code || row.Revenue_Code || "").trim();
      if (!name || !code) return;
      if (!departmentAccounts.has(name)) departmentAccounts.set(name, new Set());
      departmentAccounts.get(name).add(code);
    });
    // PTO buyback is a historical salary account not separately budgeted
    // in the current sheet, but belongs with a department's salary codes.
    departmentAccounts.forEach(codes => { if (codes.has("512000")) codes.add("512007"); });
    // Revenue organization labels also include account groups such as Ad
    // Valorem Taxes. Keep the established department list, while using all
    // sources to find each department's current and historical org codes.
    const departmentLabels = new Set((data.expenditures || []).map(row => String(row.Dept_Name || "").trim()));
    const excludedNames = new Set(["self insurance expense", "self insurance expenses", "bcc other uses contingency", "interfund group transfer out", "interfund group transfers out"]);
    (data.expenditures || []).concat(data.revenues || [], data.activities || []).forEach(row => {
      const name = String(row.Dept_Name || "").trim();
      const code = String(row.Dept_Code || "").trim();
      const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (!name || !departmentLabels.has(name) || excludedNames.has(normalized) || code.length < 6) return;
      if (!departments.has(name)) departments.set(name, new Set());
      departments.get(name).add(code);
      departments.get(name).add(code.slice(0, 6));
    });
    return { accounts, historical, departments, departmentAccounts };
  }

  function matchingHistoricalAccounts(catalog, kind, year, codes) {
    const orgs = codes ? new Set(codes) : null;
    return catalog.historical.filter(row => row.year === year && accountMatchesType(row.code, kind) && (!orgs || orgs.has(row.org)));
  }

  function departmentFilterOptions(catalog, kind, year) {
    const active = matchingHistoricalAccounts(catalog, kind, year);
    return Array.from(catalog.departments).filter(([name, codes]) => {
      const accounts = catalog.departmentAccounts.get(name) || new Set();
      return active.some(row => codes.has(row.org) && accounts.has(row.code));
    }).map(([name, codes]) => ({ value: Array.from(codes).sort().join(","), label: name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  function accountFilterOptions(catalog, kind, year, codes, departmentName) {
    const grouped = new Map();
    const ownAccounts = catalog.departmentAccounts.get(departmentName) || new Set();
    matchingHistoricalAccounts(catalog, kind, year, codes).forEach(row => {
      if (!ownAccounts.has(row.code)) return;
      const account = catalog.accounts.get(row.code);
      const key = account.group || row.code;
      if (!grouped.has(key)) grouped.set(key, { label: account.group || formatAccountName(account.name), codes: new Set() });
      grouped.get(key).codes.add(row.code);
    });
    return Array.from(grouped.values()).map(entry => {
      const codes = Array.from(entry.codes).sort();
      return { value: codes.join(","), label: entry.label + (codes.length === 1 ? " — " + codes[0] : "") };
    }).sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }));
  }

  function setFilterOptions(select, placeholder, options, enabled) {
    select.innerHTML = "";
    const prompt = document.createElement("option");
    prompt.value = "";
    prompt.textContent = placeholder;
    prompt.disabled = true;
    prompt.selected = true;
    select.appendChild(prompt);
    options.forEach(item => {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      select.appendChild(option);
    });
    select.disabled = !enabled || !options.length;
  }

  function updateDependentFilters(changed) {
    const kind = $("#txnType").value;
    const yearSelect = $("#txnYear");
    const departmentSelect = $("#txnDept");
    const accountSelect = $("#txnAccount");
    if (!changed || changed === "txnType") {
      setFilterOptions(yearSelect, "Select fiscal year", Array.from({ length: 6 }, (_, i) => ({ value: String(2025 - i), label: "FY " + (2025 - i) })), !!kind);
    }
    const year = yearSelect.value;
    if (!changed || changed === "txnType" || changed === "txnYear") {
      const departments = filterCatalog && kind && year ? departmentFilterOptions(filterCatalog, kind, year) : [];
      setFilterOptions(departmentSelect, departments.length || !kind || !year ? "Select department" : "No departments for this selection", departments, !!filterCatalog && !!kind && !!year);
    }
    const codes = departmentSelect.value ? departmentSelect.value.split(",").filter(Boolean) : [];
    if (!changed || ["txnType", "txnYear", "txnDept"].includes(changed)) {
      const accounts = filterCatalog && kind && year && codes.length ? accountFilterOptions(filterCatalog, kind, year, codes, departmentSelect.selectedOptions[0]?.textContent) : [];
      setFilterOptions(accountSelect, accounts.length || !codes.length ? "Select account" : "No accounts for this selection", accounts, !!filterCatalog && codes.length > 0);
    }
    updateSearchButton();
  }

  function clearSearchResults() {
    searchRequestId += 1;
    currentPage = 0;
    lastRows = [];
    lastCount = 0;
    $("#txnResults").innerHTML = "";
    $("#txnResults").setAttribute("aria-busy", "false");
    $("#txnPagination").hidden = true;
    $("#txnDownload").disabled = true;
    $("#txnResultsToolbar").hidden = true;
    $("#txnStatus").textContent = FILTER_PROMPT;
  }

  async function populateDepartmentOptions() {
    try {
      const data = await window.WCBudgetData.loadBudgetData();
      const candidates = new Map();
      (data.activities || []).concat(data.expenditures || [], data.revenues || []).forEach(row => {
        const code = String(row.Dept_Code || "").trim();
        const name = String(row.Dept_Name || "").trim();
        if (!code || !name) return;
        if (!departmentNames.has(code)) departmentNames.set(code, name);
        const shortCode = code.slice(0, 6);
        if (!candidates.has(shortCode)) candidates.set(shortCode, new Set());
        candidates.get(shortCode).add(name);
      });
      candidates.forEach((names, code) => {
        if (!departmentNames.has(code) && names.size === 1) departmentNames.set(code, Array.from(names)[0]);
      });
      filterCatalog = buildFilterCatalog(data);
      updateDependentFilters("txnYear");
    } catch (error) {
      $("#txnStatus").textContent = "Department and account lists could not load. Reload this page to try again.";
    }
  }

  function init() {
    $("#txnFilters").addEventListener("change", event => {
      clearSearchResults();
      updateDependentFilters(event.target.id);
    });
    updateDependentFilters();
    $("#txnFilters").addEventListener("submit", (event) => {
      event.preventDefault();
      runSearch(true);
    });
    $("#txnReset").addEventListener("click", () => {
      $("#txnFilters").reset();
      clearSearchResults();
      updateDependentFilters();
      $("#txnType").focus();
    });
    $("#txnDownload").addEventListener("click", downloadCsv);
    $("#txnSort").addEventListener("change", () => runSearch(true));
    $("#txnPrev").addEventListener("click", () => {
      if (currentPage > 0) {
        currentPage -= 1;
        runSearch(false);
        window.scrollTo({ top: $("#txnFilters").offsetTop - 100, behavior: "smooth" });
      }
    });
    $("#txnNext").addEventListener("click", () => {
      currentPage += 1;
      runSearch(false);
      window.scrollTo({ top: $("#txnFilters").offsetTop - 100, behavior: "smooth" });
    });

    populateDepartmentOptions();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
