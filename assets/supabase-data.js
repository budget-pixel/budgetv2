/* Walton County FY 2027 Budget — Supabase actuals data layer.
   Google Sheets remains the source for budget/publication rows, labels,
   descriptions, FY 2026 budget, FY 2027 proposed, and page narrative content.
   Supabase public views provide FY 2020-FY 2025 historical actuals.
   Cache tables stay internal in Supabase and are not queried by browser code.
   Raw transaction data must not load in browser code; transaction drilldown
   uses cleaned public_transactions rows for a specific year/org/object/project.
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
          "WCSupabaseData: Supabase URL/key placeholders are not configured; using Google Sheets historical actual fallbacks."
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
        // which falls back to the Google Sheets-only figures rather than a
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
      .from("public_transactions")
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

    const { data, error } = await query;
    if (error) {
      console.error("WCSupabaseData: failed to load transaction detail", error);
      return [];
    }

    return Array.isArray(data) ? data : [];
  }

  // Powers the public transaction search page (pages/transaction-search.html)
  // -- a general-purpose, no-prior-context search over every public
  // transaction, as opposed to loadTransactions above, which only ever
  // drills into one already-known department/object/year combination.
  //
  // fund_name, department_name, and category are NOT queried here: they are
  // NULL on every row of public_transactions (checked directly against the
  // live table), so filtering or displaying them would silently show
  // nothing. department_code/fund_code are real, but use a different code
  // scheme than the Dept_Code/Fund_code used in the Google Sheets budget
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
    "vendor_payee_public",
    "description_public",
    "document_number_public",
    "amount"
  ].join(", ");
  const SEARCH_PAGE_SIZE = 50;

  function escapeForOrFilter(value) {
    // Postgrest's .or() syntax reads a comma-separated list of
    // filter:operator.value clauses, and commas/parens inside a value would
    // otherwise be parsed as clause separators or grouping -- a keyword
    // search box is free text a resident can type anything into (vendor
    // names routinely contain both, e.g. "Smith, Jones & Co (FL)").
    return String(value || "").replace(/[,()]/g, " ").trim();
  }

  // page is 0-based. Returns { rows, count } where count is the total
  // number of matching rows (for "X results" and pagination), not just
  // this page's length.
  async function searchTransactions(filters, page) {
    const client = getClient();
    if (!client) return { rows: [], count: 0 };

    const options = filters || {};
    const pageIndex = Number(page) || 0;
    const from = pageIndex * SEARCH_PAGE_SIZE;
    const to = from + SEARCH_PAGE_SIZE - 1;

    const keyword = escapeForOrFilter(options.keyword);

    // "estimated" (planner statistics), not "exact": an exact count
    // combined with a filtered, sorted query over 650k+ rows reliably hits
    // Postgrest's statement timeout on this table (no index on amount, and
    // none of the text columns support fast substring search) -- verified
    // directly against the live table before choosing this. A keyword
    // search skips the count entirely: this table's statement timeout is a
    // tight ~3-4s, and an unindexed two-column ILIKE scan already eats most
    // of that budget on its own, so asking for a count too pushes some
    // otherwise-fine searches over the edge.
    let query = client
      .from("public_transactions")
      .select(SEARCH_TRANSACTION_FIELDS, keyword ? {} : { count: "estimated" })
      .eq("is_public", true);

    if (keyword) {
      // Deliberately only 2 columns, not also object_name/document_number:
      // verified against the live table that a 4-column ILIKE OR times out
      // almost every time, while vendor+description alone reliably finishes
      // (still ~2s -- there's no index, so this is a real sequential scan).
      const pattern = "%" + keyword + "%";
      query = query.or(
        ["vendor_payee_public.ilike." + pattern, "description_public.ilike." + pattern].join(",")
      );
    }
    if (options.year !== undefined && options.year !== null && String(options.year).trim() !== "") {
      query = query.eq("fiscal_year", options.year);
    }
    // "expense" rows are booked positive, "revenue" rows negative -- see
    // the module comment above SEARCH_TRANSACTION_FIELDS for how this was
    // confirmed against the live table (e.g. Regular Salaries & Wages is
    // always positive, Building Permits fee receipts always negative).
    if (options.kind === "expense") query = query.gt("amount", 0);
    else if (options.kind === "revenue") query = query.lt("amount", 0);
    if (options.amountMin !== undefined && options.amountMin !== null && options.amountMin !== "") {
      const min = Math.abs(Number(options.amountMin)) || 0;
      query = options.kind === "revenue" ? query.lte("amount", -min) : query.gte("amount", min);
    }
    if (options.amountMax !== undefined && options.amountMax !== null && options.amountMax !== "") {
      const max = Math.abs(Number(options.amountMax)) || 0;
      query = options.kind === "revenue" ? query.gte("amount", -max) : query.lte("amount", max);
    }
    if (options.dateFrom) query = query.gte("transaction_date", options.dateFrom);
    if (options.dateTo) query = query.lte("transaction_date", options.dateTo);
    if (options.departmentCode) query = query.eq("department_code", options.departmentCode);
    if (options.fundCode) query = query.eq("fund_code", options.fundCode);

    // Sorting by amount is deliberately not offered: verified directly
    // against the live table that filtering by amount *and* sorting by
    // amount together reliably times out (no index makes Postgres sort
    // 650k+ rows before applying the filter). Date and vendor sorts stay
    // fast under the same filters.
    const sort = options.sort || "date_desc";
    if (sort === "date_asc") query = query.order("transaction_date", { ascending: true });
    else if (sort === "vendor_asc") query = query.order("vendor_payee_public", { ascending: true });
    else query = query.order("transaction_date", { ascending: false });

    query = query.range(from, to);

    // A keyword search runs an unindexed sequential scan against 650k+ rows
    // and this table's statement timeout is tight enough (~3-4s) that the
    // same query genuinely does sometimes finish and sometimes doesn't,
    // depending on the database's cache state at that moment -- confirmed
    // by re-running an identical request back to back live. One silent
    // retry recovers most of those transient cases before bothering the
    // user with an error for something that isn't really wrong with their
    // search.
    let { data, error, count } = await query;
    if (error && error.code === "57014") {
      ({ data, error, count } = await query);
    }
    if (error) {
      console.error("WCSupabaseData: failed to search transactions", error);
      return { rows: [], count: null, error: error };
    }

    // count is null (not 0) for a keyword search, since no count was
    // requested at all -- the caller should show "at least N" rather than
    // a specific total in that case, not a literal zero.
    return { rows: Array.isArray(data) ? data : [], count: keyword ? null : count || 0 };
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
