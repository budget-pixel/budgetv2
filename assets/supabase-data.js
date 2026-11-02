/* Walton County FY 2027 Budget — Supabase actuals data layer.
   fixed publication data is the source for budget/publication rows, labels,
   descriptions, FY 2026 budget, FY 2027 proposed, and page narrative content.
   Supabase public views provide FY 2020-FY 2025 historical actuals.
   Cache tables stay internal in Supabase and are not queried by browser code.
   Transaction detail reads reviewed fields through transaction_search_public,
   a read-only view directly over transactions_raw with no deduplication.
   Use a Supabase publishable/anon key only; never place a service-role key in
   this public static website. */
(function () {
  "use strict";

  const SUPABASE_URL = "https://gxsfkvzexfpctaiozqrb.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_94LmtSpqQZCvjeyQa9BYVQ__b-Rgj8L";

  let supabaseClient = null;
  let warnedAboutConfig = false;
  const SUPABASE_PAGE_SIZE = 1000;

  function hasSupabaseConfig() {
    return (
      SUPABASE_URL &&
      SUPABASE_PUBLISHABLE_KEY &&
      SUPABASE_URL !== "REPLACE_WITH_SUPABASE_PROJECT_URL" &&
      SUPABASE_PUBLISHABLE_KEY !== "REPLACE_WITH_SUPABASE_PUBLISHABLE_KEY"
    );
  }

  function getClient() {
    if (!hasSupabaseConfig()) {
      if (!warnedAboutConfig) {
        console.warn(
          "WCSupabaseData: Supabase URL/key placeholders are not configured; using fixed publication data historical actual fallbacks."
        );
        warnedAboutConfig = true;
      }
      return null;
    }

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      console.error("WCSupabaseData: Supabase client library is not available.");
      return null;
    }

    if (!supabaseClient) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    }

    return supabaseClient;
  }

  async function loadSummaryRows(viewName) {
    const client = getClient();
    if (!client) return [];

    const rows = [];
    let from = 0;

    while (true) {
      const to = from + SUPABASE_PAGE_SIZE - 1;
      const { data, error } = await client
        .from(viewName)
        .select("year, org, object, project, amount")
        .order("year", { ascending: true })
        .order("org", { ascending: true })
        .order("object", { ascending: true })
        .order("project", { ascending: true })
        .range(from, to);

      if (error) {
        // Returning whatever rows were fetched so far (instead of failing
        // loudly) would let a transient mid-pagination network error pass
        // as a complete dataset -- every computation reading this data
        // would then silently operate on a partial actuals set with no
        // indication anything was missing. Throwing instead propagates the
        // failure up through loadSupabaseActualLookups' Promise.all/catch,
        // which falls back to the fixed publication data-only figures rather than a
        // silently wrong, undercounted blend.
        console.error("Failed to load " + viewName + " actuals from Supabase:", error);
        throw new Error("Failed to load " + viewName + " actuals from Supabase: " + (error.message || error));
      }

      const page = Array.isArray(data) ? data : [];
      rows.push(...page);
      if (page.length < SUPABASE_PAGE_SIZE) break;
      from += SUPABASE_PAGE_SIZE;
    }

    return rows;
  }

  function loadExpenseActuals() {
    return loadSummaryRows("expense_actuals_public");
  }

  function loadRevenueActuals() {
    return loadSummaryRows("revenue_actuals_public");
  }

  function loadOriginalBudget() {
    return loadSummaryRows("expense_original_budget_public");
  }

  function cleanCode(value) {
    return String(value === undefined || value === null ? "" : value).trim();
  }

  function normalizeYear(value) {
    const text = cleanCode(value);
    const match = text.match(/\d{4}/);
    return match ? match[0] : text;
  }

  function amountToNumber(value) {
    const parsed = Number(String(value === undefined || value === null ? "" : value).replace(/[$,]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function buildLookupKey(org, object, project, year) {
    return [cleanCode(org), cleanCode(object), cleanCode(project), normalizeYear(year)].join("|");
  }

  function buildActualsLookup(rows) {
    const lookup = new Map();
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const key = buildLookupKey(row.org, row.object, row.project, row.year);
      lookup.set(key, amountToNumber(row.amount));
    });
    return lookup;
  }

  function firstValue(row, keys) {
    for (let i = 0; i < keys.length; i += 1) {
      const value = row && row[keys[i]];
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return "";
  }

  function rowOrg(row) {
    return firstValue(row, ["org", "Org", "ORG", "Dept_Code", "dept_code", "DeptCode"]);
  }

  function rowObject(row) {
    return firstValue(row, [
      "object",
      "Object",
      "OBJECT",
      "Object_Code",
      "object_code",
      "ObjectCode",
      "Revenue_Code",
      "revenue_code",
      "RevenueCode"
    ]);
  }

  function rowProject(row) {
    return firstValue(row, ["project", "Project", "PROJECT", "Project_Code", "project_code", "ProjectCode"]);
  }

  function getActualAmount(lookup, row, year) {
    if (!lookup || typeof lookup.get !== "function") return undefined;
    const key = buildLookupKey(rowOrg(row), rowObject(row), rowProject(row), year);
    return lookup.get(key);
  }

  function actualOrFallback(lookup, row, year, fallbackValue) {
    if (!lookup || typeof lookup.has !== "function") return amountToNumber(fallbackValue);
    const key = buildLookupKey(rowOrg(row), rowObject(row), rowProject(row), year);
    if (lookup.has(key)) return amountToNumber(lookup.get(key));
    return amountToNumber(fallbackValue);
  }

  const PUBLIC_TRANSACTION_FIELDS = [
    "fiscal_year",
    "transaction_date",
    "fund_code",
    "fund_name",
    "department_code",
    "department_name",
    "program_code",
    "program_name",
    "category",
    "object_code",
    "object_name",
    "vendor_payee_public",
    "description_public",
    "document_number_public",
    "amount",
    "is_public"
  ].join(", ");

  async function loadTransactions(filters) {
    const client = getClient();
    if (!client) return [];

    const options = filters || {};
    let query = client
      .from("transaction_search_public")
      .select(PUBLIC_TRANSACTION_FIELDS)
      .eq("is_public", true)
      .order("transaction_date", { ascending: true });

    if (options.year !== undefined && options.year !== null && String(options.year).trim() !== "") {
      query = query.eq("fiscal_year", options.year);
    }
    if (Array.isArray(options.org)) {
      // A department's transaction history can span more than one legacy
      // org code after a county org-code restructuring (see
      // DEPT_CODE_ACTUALS_ALIASES in budget-data.js); match any of them.
      if (options.org.length) query = query.in("department_code", options.org);
    } else if (options.org !== undefined && options.org !== null && String(options.org).trim() !== "") {
      query = query.eq("department_code", options.org);
    }
    if (Array.isArray(options.object)) {
      if (options.object.length) query = query.in("object_code", options.object);
    } else if (options.object !== undefined && options.object !== null && String(options.object).trim() !== "") {
      query = query.eq("object_code", options.object);
    }
    if (options.fund !== undefined && options.fund !== null && String(options.fund).trim() !== "") {
      query = query.eq("fund_code", options.fund);
    }
    if (Object.prototype.hasOwnProperty.call(options, "project")) {
      const project = options.project === undefined || options.project === null ? "" : String(options.project).trim();
      query = project ? query.eq("program_code", project) : query.or("program_code.is.null,program_code.eq.");
    }

    // Fetch every page before computing the ledger reconciliation total.
    query = query.order('department_code').order('object_code').order('amount').order('document_number_public');
    const rows = [];
    let offset = 0;
    while (true) {
      const { data, error } = await query.range(offset, offset + 499);
      if (error) throw new Error("Transaction data could not be loaded: " + (error.message || "connection error"));
      const page = Array.isArray(data) ? data : [];
      rows.push(...page);
      if (!page.length) break;
      offset += page.length;
    }
    return rows;
  }

  // Powers the public transaction search page (pages/transaction-search.html)
  // -- a general-purpose, no-prior-context search over every public
  // transaction, as opposed to loadTransactions above, which only ever
  // drills into one already-known department/object/year combination.
  //
  // category carries the server's account-and-direction transaction type.
  // Names for departments/funds come from the publication data. Their codes
  // use a different code
  // scheme than the Dept_Code/Fund_code used in the fixed publication data budget
  // data elsewhere on this site (e.g. "103322" here vs "10332200" there),
  // so they're exposed here as their own raw codes rather than mapped to a
  // name that might not be correct.
  const SEARCH_TRANSACTION_FIELDS = [
    "fiscal_year",
    "transaction_date",
    "fund_code",
    "department_code",
    "object_code",
    "object_name",
    "category",
    "vendor_payee_public",
    "description_public",
    "document_number_public",
    "amount"
  ].join(", ");
  const SEARCH_PAGE_SIZE = 50;

  function normalizeSearchKeyword(value) {
    // RPC parameters preserve vendor punctuation without PostgREST OR syntax.
    return String(value || "").trim();
  }

  // page is 0-based. count is null: pagination uses the returned page length.
  async function searchTransactions(filters, page) {
    const client = getClient();
    if (!client) return { rows: [], count: 0, error: { message: "Transaction connection is unavailable." } };

    const options = filters || {};
    const pageIndex = Number(page) || 0;
    const from = pageIndex * SEARCH_PAGE_SIZE;

    // The read-only server function applies filters before date conversion and
    // sorting. It returns only the reviewed public projection, with stable row
    // ordering, and never copies or deduplicates the underlying transactions.
    const query = client.rpc("search_public_transactions", {
      _filters: { ...options, keyword: normalizeSearchKeyword(options.keyword) },
      _offset: from,
      _limit: SEARCH_PAGE_SIZE
    }).select(SEARCH_TRANSACTION_FIELDS);

    let { data, error } = await query;
    if (error && error.code === "57014") {
      ({ data, error } = await query);
    }
    if (error) {
      console.error("WCSupabaseData: failed to search transactions", error);
      return { rows: [], count: null, error: error };
    }

    // No total count was requested; the caller offers Next for a full page.
    return { rows: Array.isArray(data) ? data : [], count: null };
  }

  window.WCSupabaseData = {
    loadExpenseActuals,
    loadRevenueActuals,
    loadOriginalBudget,
    buildActualsLookup,
    getActualAmount,
    actualOrFallback,
    loadTransactions,
    searchTransactions,
    SEARCH_PAGE_SIZE: SEARCH_PAGE_SIZE
  };
})();
