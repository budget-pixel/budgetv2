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

  let currentPage = 0;
  let lastRows = [];
  let lastCount = 0;

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
      host.innerHTML = '<p class="wc-txn-empty">No transactions match these filters.</p>';
      return;
    }
    const bodyRows = rows.map((row) => {
      const isRevenue = Number(row.amount) < 0;
      const amount = Math.abs(Number(row.amount) || 0);
      return (
        "<tr>" +
        "<td>" + escapeHtml(formatDate(row.transaction_date)) + "</td>" +
        '<td class="wc-txn-vendor">' + escapeHtml(row.vendor_payee_public || "Not available") + "</td>" +
        "<td>" + escapeHtml(row.description_public || "No description provided") + "</td>" +
        "<td>" + escapeHtml(row.object_name || "Not available") + "</td>" +
        '<td class="wc-txn-code">' + escapeHtml(row.department_code || "&mdash;") + "</td>" +
        '<td class="wc-txn-code">' + escapeHtml(row.fund_code || "&mdash;") + "</td>" +
        "<td>" + escapeHtml(row.document_number_public || "&mdash;") + "</td>" +
        '<td class="wc-txn-amount' + (isRevenue ? " is-revenue" : "") + '">' + (isRevenue ? "+" : "") + escapeHtml(formatCurrency(amount)) + "</td>" +
        "</tr>"
      );
    }).join("");

    host.innerHTML =
      '<div class="wc-txn-table-wrap"><table class="wc-txn-table">' +
      "<thead><tr>" +
      "<th>Date</th><th>Vendor / Payee</th><th>Description</th><th>Category</th>" +
      "<th>Dept Code</th><th>Fund Code</th><th>Document #</th><th>Amount</th>" +
      "</tr></thead><tbody>" + bodyRows + "</tbody></table></div>";
  }

  function csvEscape(value) {
    const text = String(value === undefined || value === null ? "" : value);
    return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }

  function downloadCsv() {
    if (!lastRows.length) return;
    const headers = ["Date", "Vendor/Payee", "Description", "Category", "Department Code", "Fund Code", "Document #", "Amount"];
    const lines = [headers.join(",")];
    lastRows.forEach((row) => {
      lines.push([
        row.transaction_date || "",
        row.vendor_payee_public || "",
        row.description_public || "",
        row.object_name || "",
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
    if (resetPage) currentPage = 0;
    const status = $("#txnStatus");
    const pagination = $("#txnPagination");
    const downloadBtn = $("#txnDownload");

    if (!window.WCSupabaseData || typeof window.WCSupabaseData.searchTransactions !== "function") {
      status.textContent = "Transaction search is unavailable right now.";
      return;
    }

    status.textContent = "Searching…";
    $("#txnResults").innerHTML = "";
    downloadBtn.disabled = true;
    pagination.hidden = true;

    const filters = readFilters();
    const result = await window.WCSupabaseData.searchTransactions(filters, currentPage);
    lastRows = result.rows || [];
    lastCount = result.count === null || result.count === undefined ? null : result.count;

    if (result.error) {
      status.textContent = result.error.code === "57014"
        ? "That search took too long to run against 650,000+ raw records. Try a longer or more specific vendor/description term."
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

    pagination.hidden = false;
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
      runSearch(true);
    });
    $("#txnDownload").addEventListener("click", downloadCsv);
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
    runSearch(true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
