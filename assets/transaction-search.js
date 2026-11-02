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
      keyword: form.keyword.value.trim(),
      kind: form.kind.value,
      year: form.year.value,
      dateFrom: form.dateFrom.value,
      dateTo: form.dateTo.value,
      amountMin: form.amountMin.disabled ? "" : form.amountMin.value,
      amountMax: form.amountMax.disabled ? "" : form.amountMax.value,
      departmentCodes: form.departmentCodes.value ? form.departmentCodes.value.split(",").filter(Boolean) : [],
      accountCode: form.accountCode.value,
      sort: form.sort.value
    };
  }

  function updateAmountFieldState() {
    const kind = $("#txnType").value;
    const disable = !kind;
    $("#txnAmountMin").disabled = disable;
    $("#txnAmountMax").disabled = disable;
    if (disable) {
      $("#txnAmountMin").value = "";
      $("#txnAmountMax").value = "";
    }
  }

  function renderTable(rows) {
    const host = $("#txnResults");
    if (!rows.length) {
      host.innerHTML = '<div class="wc-txn-empty"><strong>No matching transactions</strong><p>Try a broader vendor name, a different year, or fewer filters.</p></div>';
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
        '<td data-label="Document #">' + escapeHtml(row.document_number_public || "—") + "</td>" +
        '<td data-label="Amount" class="wc-txn-amount' + (row.category === 'revenue' ? " is-revenue" : "") + '">' + '<span class="wc-txn-type">' + escapeHtml(type) + '</span>' + escapeHtml(formatCurrency(amount)) + "</td>" +
        "</tr>"
      );
    }).join("");

    host.innerHTML =
      '<div class="wc-txn-table-wrap" tabindex="0" role="region" aria-label="Transaction results; scroll horizontally for more columns"><table class="wc-txn-table">' +
      "<thead><tr>" +
      "<th>Date</th><th>Vendor / Payee</th><th>Description</th><th>Account</th>" +
      "<th>Department</th><th>Document #</th><th>Amount</th>" +
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
    const headers = ["Date", "Vendor/Payee", "Description", "Account", "Type", "Department Code", "Fund Code", "Document #", "Amount"];
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
        row.document_number_public || "",
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

    const filters = readFilters();
    if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
      status.textContent = "The start date must be on or before the end date.";
      resultsHost.setAttribute("aria-busy", "false");
      $("#txnMoreFilters").open = true;
      $("#txnDateTo").focus();
      return;
    }
    if (filters.amountMin !== "" && filters.amountMax !== "" && Number(filters.amountMin) > Number(filters.amountMax)) {
      status.textContent = "The minimum amount must not exceed the maximum amount.";
      resultsHost.setAttribute("aria-busy", "false");
      $("#txnMoreFilters").open = true;
      $("#txnAmountMax").focus();
      return;
    }
    let result;
    try { result = await window.WCSupabaseData.searchTransactions(filters, currentPage); }
    catch (error) { if (requestId === searchRequestId) status.textContent = "Transaction search could not connect. Please try again."; return; }
    finally { if (requestId === searchRequestId) resultsHost.setAttribute("aria-busy", "false"); }
    if (requestId !== searchRequestId) return;
    lastRows = result.rows || [];
    lastCount = result.count === null || result.count === undefined ? null : result.count;

    if (result.error) {
      status.textContent = result.error.code === "57014"
        ? "That search took too long. Choose a fiscal year or department, or use a more specific vendor or description."
        : "Something went wrong loading transactions. Try narrowing your search and try again.";
      return;
    }

    const pageSize = (window.WCSupabaseData && window.WCSupabaseData.SEARCH_PAGE_SIZE) || 50;
    const from = currentPage * pageSize + 1;
    const to = currentPage * pageSize + lastRows.length;

    if (!lastRows.length) {
      status.textContent = currentPage > 0 ? "No more matching transactions." : "No matching transactions.";
    } else if (lastCount === null) {
      // Keyword searches skip the count query entirely (see
      // searchTransactions' comment) to stay under this table's tight
      // statement timeout, so the total is genuinely unknown here.
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

  async function populateYearOptions() {
    const client = window.WCSupabaseData;
    if (!client || !client.searchTransactions) return;
    // Cheap probes (single row, sorted) rather than a distinct-values query,
    // which Postgrest doesn't expose directly -- just need the min and max
    // fiscal year on file to build a plain dropdown range.
    try {
      const [latest, earliest] = await Promise.all([
        client.searchTransactions({ sort: "date_desc" }, 0),
        client.searchTransactions({ sort: "date_asc" }, 0)
      ]);
      const latestYear = latest.rows[0] && latest.rows[0].fiscal_year;
      const earliestYear = earliest.rows[0] && earliest.rows[0].fiscal_year;
      if (!latestYear || !earliestYear) return;
      const select = $("#txnYear");
      for (let year = Number(latestYear); year >= Number(earliestYear); year -= 1) {
        const option = document.createElement("option");
        option.value = String(year);
        option.textContent = "FY " + year;
        select.appendChild(option);
      }
    } catch (e) {
      // Year dropdown just stays at "All years" -- not fatal.
    }
  }

  async function populateDepartmentOptions() {
    const select = $("#txnDept");
    if (!select || !window.WCBudgetData || typeof window.WCBudgetData.loadBudgetData !== "function") return;
    try {
      const data = await window.WCBudgetData.loadBudgetData();
      const departmentCandidates = new Map();
      (data.activities || []).concat(data.expenditures || [], data.revenues || []).forEach(row => {
        const code = String(row.Dept_Code || '').trim();
        const name = String(row.Dept_Name || '').trim();
        if (!code || !name) return;
        if (!departmentNames.has(code)) departmentNames.set(code, name);
        const shortCode = code.slice(0, 6);
        if (!departmentCandidates.has(shortCode)) departmentCandidates.set(shortCode, new Set());
        departmentCandidates.get(shortCode).add(name);
      });
      departmentCandidates.forEach((names, code) => {
        if (!departmentNames.has(code) && names.size === 1) departmentNames.set(code, Array.from(names)[0]);
      });
      const accounts = new Map();
      const revenueGroups = new Map();
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
      (data.expenditures || []).forEach(row => {
        const code = String(row.Object_Code || "").trim();
        const name = code === '581001' ? 'Aid to Government Agencies' : String(row.Object_Name || '').trim();
        if (code && name && !['500000', '523004', '999997'].includes(code) && !/unclassified|published final budget reconciliation/i.test(name)) accounts.set(code, name);
      });
      (data.revenues || []).forEach(row => {
        const code = String(row.Revenue_Code || "").trim();
        const name = String(row.Revenue_Name || '').trim();
        const group = revenueGroup(name);
        if (group && code) {
          if (!revenueGroups.has(group)) revenueGroups.set(group, new Set());
          revenueGroups.get(group).add(code);
          return;
        }
        if (code && name && !/unclassified|published final budget reconciliation/i.test(name)) accounts.set(code, name);
      });
      revenueGroups.forEach((codes, name) => accounts.set(Array.from(codes).sort().join(','), name));
      Array.from(accounts).sort((a, b) => a[0].split(',')[0].localeCompare(b[0].split(',')[0], undefined, { numeric: true })).forEach(([code, name]) => {
        const option = document.createElement('option');
        option.value = code;
        const label = formatAccountName(name);
        option.textContent = code.includes(',') ? label : label + ' — ' + code;
        $('#txnAccount').appendChild(option);
      });
      const codesByName = new Map();
      const excludedDepartmentNames = new Set([
        "self insurance expense",
        "self insurance expenses",
        "bcc other uses contingency",
        "interfund group transfer out",
        "interfund group transfers out"
      ]);
      (data.expenditures || []).forEach((row) => {
        const name = String(row.Dept_Name || "").trim();
        const rawCode = String(row.Dept_Code || "").trim();
        const transactionCode = rawCode.slice(0, 6);
        const normalizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        if (!name || excludedDepartmentNames.has(normalizedName) || transactionCode.length < 6) return;
        if (!codesByName.has(name)) codesByName.set(name, new Set());
        // Historical transaction imports use the six-digit org code on
        // most rows, while some newer records retain the full budget org
        // code. Query both representations so a named selection does not
        // incorrectly return an empty result.
        codesByName.get(name).add(transactionCode);
        codesByName.get(name).add(rawCode);

      });
      if (lastRows.length) renderTable(lastRows);
      Array.from(codesByName.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([name, codes]) => {
          const option = document.createElement("option");
          option.value = Array.from(codes).sort().join(",");
          option.textContent = name;
          select.appendChild(option);
        });
    } catch (error) {
      // The search remains usable with All departments if budget labels
      // are temporarily unavailable.
    }
  }

  function init() {
    $("#txnType").addEventListener("change", updateAmountFieldState);
    $("#txnFilters").addEventListener("submit", (event) => {
      event.preventDefault();
      runSearch(true);
    });
    $("#txnReset").addEventListener("click", () => {
      $("#txnFilters").reset();
      updateAmountFieldState();
      searchRequestId += 1;
      currentPage = 0;
      lastRows = [];
      lastCount = 0;
      $("#txnResults").innerHTML = "";
      $("#txnResults").setAttribute("aria-busy", "false");
      $("#txnPagination").hidden = true;
      $("#txnDownload").disabled = true;
      $("#txnResultsToolbar").hidden = true;
      $("#txnMoreFilters").open = false;
      $("#txnStatus").textContent = "Choose your filters, then select Search transactions.";
      $("#txnKeyword").focus();
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

    populateYearOptions();
    populateDepartmentOptions();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
