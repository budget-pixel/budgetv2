(function () {
  "use strict";

  // TODO: Transaction CSV export is not currently implemented. If added later,
  // it must export only public_transactions public-facing fields and must not
  // include raw source fields from transactions_raw.

  // Floating-point summation noise only; not a tolerance for real discrepancies.
  const RECONCILIATION_TOLERANCE = 0.01;

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
    const amount = Number(value || 0);
    return amount.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function parseAmount(value) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(String(value).replace(/[$,]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).split(" ")[0] || "";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  // Returns null (not "") when the param is absent from the URL, distinct
  // from an explicitly empty value -- needed for projectCode, where "absent"
  // must mean "don't filter by project" and "" must mean "filter to a blank
  // Project_Code specifically" (see initTransactionsPage's queryFilters).
  function param(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function compact(values) {
    return values.filter((value) => value !== undefined && value !== null && String(value).trim() !== "");
  }

  function firstValue(row, keys) {
    for (let i = 0; i < keys.length; i += 1) {
      const value = row && row[keys[i]];
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return "";
  }

  function renderChips(chips) {
    const host = $("#transaction-filter-chips");
    if (!host) return;
    host.innerHTML = chips.map((chip) => '<span class="wc-transaction-chip">' + escapeHtml(chip) + "</span>").join("");
  }

  function isRevenueContext(context) {
    const text = [context.kind, context.category].join(" ").toLowerCase();
    return /\brevenue\b|\btax\b|\btaxes\b|\bfees\b|\bcharges\b|\bsources\b|\bintergovernmental\b|\bmiscellaneous\b|\bfines\b/.test(text);
  }

  function displayAmount(value, context) {
    const amount = isRevenueContext(context) ? Math.abs(Number(value || 0)) : Number(value || 0);
    return amount;
  }

  // Maps the departmentName carried in the URL back to the department page
  // it came from. The static fallback href in the HTML can only point to
  // one page, and several pages' titles don't match the underlying sheet's
  // Dept_Name (e.g. the Clerk's page is titled "Clerk of Courts & County
  // Comptroller" but rows are Dept_Name "Clerk of Court"), so this has to
  // be resolved here rather than derived from the URL/title directly.
  const DEPARTMENT_BACK_LINK_PAGES = {
    "office of management and budget": "office-of-management-and-budget.html",
    "building construction and maintenance": "building-construction-and-maintenance.html",
    "clerk of court": "clerk-of-courts-and-county-comptroller.html",
    "property appraiser": "property-appraiser.html",
    "supervisor of elections": "supervisor-of-elections.html",
    "tax collector": "tax-collector.html",
    "walton county sheriffs office": "sheriffs-office.html"
  };

  function normalizeDeptNameForBackLink(name) {
    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function safeReturnHref(value) {
    if (!value) return "";
    try {
      const url = new URL(value, window.location.href);
      if (url.origin !== window.location.origin) return "";
      return url.pathname + url.search + url.hash;
    } catch (e) {
      return "";
    }
  }

  function initBackLink(context) {
    const link = document.querySelector("[data-transaction-back]");
    if (!link) return;

    // Fix the static "always goes to OMB" href before wiring up the
    // history.back() enhancement, so the link is correct even if history
    // isn't usable (e.g. opened in a new tab) and not just when it is.
    const returnHref = safeReturnHref(param("returnTo"));
    const page = DEPARTMENT_BACK_LINK_PAGES[normalizeDeptNameForBackLink(context && context.departmentName)];
    if (returnHref) {
      const ledgerReturn = new URL(returnHref, window.location.href);
      if (ledgerReturn.searchParams.has('openBudgetLines')) ledgerReturn.searchParams.set('budgetHistory', '1');
      link.setAttribute("href", ledgerReturn.pathname + ledgerReturn.search + ledgerReturn.hash);
    } else if (page) {
      link.setAttribute("href", page);
    }

    link.addEventListener("click", function (event) {
      if (!returnHref && window.history.length > 1) {
        event.preventDefault();
        window.history.back();
      }
    });
  }

  function renderTable(rows, context) {
    const host = $("#transaction-table");
    if (!host) return;
    if (!rows.length) {
      host.innerHTML = "";
      return;
    }

    const hasProgram = rows.some((row) => firstValue(row, ["program_name", "program_code"]) || context.program);
    const bodyRows = rows.map((row) => {
      const vendor = firstValue(row, ["vendor_payee_public"]) || "Not available";
      const description = firstValue(row, ["description_public"]) || "No description provided";
      const project = firstValue(row, ["program_name", "program_code"]) || context.program || "";
      const amount = displayAmount(row.amount, context);
      return (
        "<tr>" +
        "<td>" + escapeHtml(formatDate(row.transaction_date) || "Not available") + "</td>" +
        "<td>" + escapeHtml(vendor) + "</td>" +
        "<td>" + escapeHtml(description) + "</td>" +
        '<td class="wc-num">' + escapeHtml(formatCurrency(amount)) + "</td>" +
        (hasProgram ? "<td>" + escapeHtml(project || "Not available") + "</td>" : "") +
        "</tr>"
      );
    }).join("");

    host.innerHTML =
      '<div class="wc-data-table-scroll wc-transaction-table-scroll">' +
      '<table class="wc-data-table wc-transaction-table">' +
      "<thead><tr>" +
      "<th>Transaction Date</th>" +
      "<th>Vendor / Payee</th>" +
      "<th>Description</th>" +
      '<th class="wc-num">Amount</th>' +
      (hasProgram ? "<th>Program</th>" : "") +
      "</tr></thead>" +
      "<tbody>" + bodyRows + "</tbody>" +
      "</table>" +
      "</div>";
  }

  async function initTransactionsPage() {
    const context = {
      fy: param("fy"),
      category: param("categoryLabel") || param("category"),
      objectCode: param("objectCode"),
      objectName: param("objectName"),
      org: param("org") || param("departmentCode"),
      departmentCode: param("departmentCode"),
      departmentName: param("departmentName"),
      fundCode: param("fundCode"),
      projectCode: param("projectCode"),
      program: param("program"),
      // payee: "|"-separated payee names. Some budget lines' prior-year
      // actuals were paid from an older shared account alongside other
      // recipients (see TRANSACTION_SOURCE_OVERRIDES in budget-data.js);
      // this limits the list to this line's own payee.
      payee: param("payee"),
      kind: param("kind") || "expense",
      selectedActual: parseAmount(param("selectedActual"))
    };

    initBackLink(context);

    const title = $("#transaction-title");
    const intro = $("#transaction-intro");
    const status = $("#transaction-status");
    const objectLabel = compact([context.objectName, context.objectCode]).join(" — ");
    const fundRevenue = context.kind === "revenue" && !context.org && !!context.fundCode;

    if (title) title.textContent = "Transactions";
    const accountHeading = document.getElementById('transaction-account-title');
    if (accountHeading) accountHeading.textContent = objectLabel || 'Account transactions';
    if (intro) {
      intro.textContent = fundRevenue
        ? "Showing FY " + context.fy + " revenue account transactions for fund " + context.fundCode + ". These receipts support the fund as a whole."
        : "Review the transactions behind this budget account’s historical actuals.";
    }

    renderChips(compact([
      context.fy ? "FY " + context.fy : "",
      fundRevenue ? "Fund " + context.fundCode : "",
      context.departmentName || context.departmentCode,
      context.program || context.projectCode
    ]));

    if (!context.fy || (!context.org && !fundRevenue) || !context.objectCode) {
      if (status) status.textContent = "Missing year, account code, or department/fund filter.";
      return;
    }

    if (!window.WCSupabaseData || typeof window.WCSupabaseData.loadTransactions !== "function") {
      if (status) status.textContent = "Transaction data is unavailable.";
      return;
    }

    // The org link can carry more than one department code (comma-joined)
    // when a department's transaction history spans a legacy org-code
    // restructuring -- see DEPT_CODE_ACTUALS_ALIASES in budget-data.js. A
    // legacy code's fund can differ from the current code's fund (fund
    // here is just the Dept_Code's first 3 digits, so an org restructuring
    // can mean a real historical fund move), so the fund filter is only
    // applied when there's a single, current org code to match against.
    const orgCodes = String(context.org || "").split(",").map((code) => code.trim()).filter(Boolean);
    const objectCodes = String(context.objectCode || "").split(",").map((code) => code.trim()).filter(Boolean);

    const queryFilters = {
      year: context.fy,
      org: orgCodes.length > 1 ? orgCodes : orgCodes[0] || "",
      object: objectCodes.length > 1 ? objectCodes : objectCodes[0] || "",
      fund: orgCodes.length > 1 ? "" : (context.fundCode || "")
    };
    // The "project" key is only added when the URL actually specified a
    // projectCode (even an explicitly empty one, for the blank-Project_Code
    // recipients) -- omitting the key entirely (rather than always setting
    // it, even to "") is what makes loadTransactions skip filtering by
    // project at all for a merged/summary row that spans several projects.
    if (context.projectCode !== null) {
      queryFilters.project = context.projectCode;
    }

    let rows;
    try { rows = await window.WCSupabaseData.loadTransactions(queryFilters); }
    catch (error) {
      if (status) status.textContent = "Transaction data could not be loaded. Please try again after the database connection is restored.";
      return;
    }
    const payees = String(context.payee || "").split("|").map((name) => name.trim().toLowerCase()).filter(Boolean);
    if (payees.length) {
      rows = rows.filter((row) => {
        const payee = String(row.vendor_payee_public || "").toLowerCase();
        return payees.some((name) => payee.indexOf(name) !== -1);
      });
    }

    const transactionTotal = rows.reduce((sum, row) => sum + displayAmount(row.amount, context), 0);
    const hasSelectedActual = context.selectedActual !== null;
    const difference = hasSelectedActual ? transactionTotal - context.selectedActual : null;
    const withinTolerance = !hasSelectedActual || Math.abs(difference) <= RECONCILIATION_TOLERANCE;

    if (status) {
      const metrics = '<div class="wc-transaction-metrics"><div><span>Transactions</span><strong>' + rows.length.toLocaleString("en-US") + '</strong></div><div><span>Transaction total</span><strong>' + formatCurrency(transactionTotal) + '</strong></div>' +
        (hasSelectedActual ? '<div><span>Selected actual</span><strong>' + formatCurrency(context.selectedActual) + '</strong></div>' : '') + '</div>';
      const reconciliation = hasSelectedActual
        ? '<div class="wc-transaction-reconciliation ' + (withinTolerance ? 'is-match' : 'is-mismatch') + '"><strong>' +
          (withinTolerance ? 'Matches selected actual' : 'Transaction total does not match') + '</strong>' +
          (!withinTolerance ? '<span>Difference: ' + formatCurrency(difference) + ' (transaction total minus selected actual).</span>' : '') + '</div>'
        : '<p class="wc-transaction-summary-note">No comparable actual amount was supplied for this account scope.</p>';
      status.innerHTML = metrics + reconciliation + (!rows.length ? '<p>No matching transactions were found for this exact filter.</p>' : '');
    }

    renderTable(rows, context);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTransactionsPage);
  } else {
    initTransactionsPage();
  }
})();
