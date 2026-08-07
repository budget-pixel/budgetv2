/* Walton County FY 2027 Budget — live Google Sheets data layer.
   Fetches, parses, and renders department + financial summary data from the
   published budget CSVs. Exposes window.WCBudgetData for reuse on any page. */
(function () {
  "use strict";

  const DATA_SOURCES = {
    expenditures: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRc6KHhTwcdREn_SvLONy_cucXH8NxF45hgdyn8IoFGSeTbIVKtDGMMWsbgSFpMizxtxy_fE-pAMmiu/pub?gid=0&single=true&output=csv",
    revenues: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRc6KHhTwcdREn_SvLONy_cucXH8NxF45hgdyn8IoFGSeTbIVKtDGMMWsbgSFpMizxtxy_fE-pAMmiu/pub?gid=1812049672&single=true&output=csv",
    staffing: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRc6KHhTwcdREn_SvLONy_cucXH8NxF45hgdyn8IoFGSeTbIVKtDGMMWsbgSFpMizxtxy_fE-pAMmiu/pub?gid=676680519&single=true&output=csv",
    performanceMeasures: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRc6KHhTwcdREn_SvLONy_cucXH8NxF45hgdyn8IoFGSeTbIVKtDGMMWsbgSFpMizxtxy_fE-pAMmiu/pub?gid=95242207&single=true&output=csv",
    departmentNarratives: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRc6KHhTwcdREn_SvLONy_cucXH8NxF45hgdyn8IoFGSeTbIVKtDGMMWsbgSFpMizxtxy_fE-pAMmiu/pub?gid=445845528&single=true&output=csv",
    funds: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRc6KHhTwcdREn_SvLONy_cucXH8NxF45hgdyn8IoFGSeTbIVKtDGMMWsbgSFpMizxtxy_fE-pAMmiu/pub?gid=968844446&single=true&output=csv",
    activities: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRc6KHhTwcdREn_SvLONy_cucXH8NxF45hgdyn8IoFGSeTbIVKtDGMMWsbgSFpMizxtxy_fE-pAMmiu/pub?gid=1380538812&single=true&output=csv",
    fundBalances: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRc6KHhTwcdREn_SvLONy_cucXH8NxF45hgdyn8IoFGSeTbIVKtDGMMWsbgSFpMizxtxy_fE-pAMmiu/pub?gid=78843155&single=true&output=csv",
    personnelPositionCosts: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRc6KHhTwcdREn_SvLONy_cucXH8NxF45hgdyn8IoFGSeTbIVKtDGMMWsbgSFpMizxtxy_fE-pAMmiu/pub?gid=1934273460&single=true&output=csv",
    personnelCostFormulaInputs: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRc6KHhTwcdREn_SvLONy_cucXH8NxF45hgdyn8IoFGSeTbIVKtDGMMWsbgSFpMizxtxy_fE-pAMmiu/pub?gid=1205082856&single=true&output=csv",
    machineryUnfunded: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRc6KHhTwcdREn_SvLONy_cucXH8NxF45hgdyn8IoFGSeTbIVKtDGMMWsbgSFpMizxtxy_fE-pAMmiu/pub?gid=708613103&single=true&output=csv"
  };

  const LOADING_MESSAGE = "Loading budget data...";
  // Bouncing-dots markup (see style.css's .wc-loading-dots) appended to the
  // plain loading text so it's visually obvious data is still in flight,
  // not just a static label.
  const LOADING_MESSAGE_HTML = escapeHtml(LOADING_MESSAGE) +
    ' <span class="wc-loading-dots" aria-hidden="true"><span></span><span></span><span></span></span>';
  const ERROR_MESSAGE = "Budget data could not be loaded. Please try again later.";
  const HISTORICAL_ACTUAL_YEARS = [2020, 2021, 2022, 2023, 2024, 2025];
  const SUPABASE_CLIENT_SCRIPT = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

  const currentScriptSrc = document.currentScript && document.currentScript.src;
  const assetBaseUrl = currentScriptSrc ? currentScriptSrc.replace(/[^/]+$/, "") : "assets/";
  const supabaseDataScript = assetBaseUrl + "supabase-data.js?v=20260706-1";

  // The published sheets use department names that differ slightly between
  // tabs (and from this site's page titles). These aliases map a page's
  // normalized department name to the additional normalized Dept_Name
  // values it should also match across every dataset.
  const DEPT_ALIASES = {
    "sheriff s office": ["walton county sheriff s office", "walton county sheriffs office", "sheriff"],
    "sheriffs office": ["walton county sheriff s office", "walton county sheriffs office", "sheriff"],
    "clerk of courts and county comptroller": ["clerk of court", "clerk of circuit court"],
    "engineering department": ["public works engineering services", "engineering services"],
    "engineering services": ["engineering department", "public works engineering services"],
    "public works engineering services": ["engineering department", "engineering services"],
    "environmental resources": ["environmental services"],
    "environmental services": ["environmental resources"],
    "county administration departments": ["county administration"],
    "probation": ["probation services"],
    "purchasing": ["procurement"],
    "e911 fund": ["e911", "e 911"],
    "municipal service benefit unit fund": ["municipal service benefit unit", "msbu", "msbu fund"],
    "recreation plat fee fund": ["recreation plat fee"],
    "sidewalk fund": ["sidewalk"],
    // "Court Innovations" is deliberately NOT an alias here -- its rows
    // (Dept_Code 001348/00101000) get their own dedicated card via
    // renderCourtInnovationsSupplementalTables instead of the generic
    // Expense/Revenue Summary, same as its narrative (see
    // renderDepartmentNarrative's "court technology and innovations"
    // branch). Including it here would pull the same rows into both,
    // showing duplicate cards.
    "court technology and innovations": [
      "court technology court administration",
      "court technology state attorney",
      "court technology public defender",
      "court technology innovations",
      "court technology"
    ],
    "public defender": ["court technology public defender"],
    "statutory and other agency funding": [
      "statutory and other agency fund",
      "statutory and other",
      "culture and recreation senior centers",
      "culture and recreation senior centers and mainstreet",
      "senior centers",
      "senior centers and mainstreet"
    ],
    "south walton fire and state control": ["south walton fire", "state fire"],
    "code compliance": ["code compliance beach", "code compliance street"],
    "libraries": ["county libraries"],
    "planning": ["planning short term rental"],
    "tourism administration": [
      "sales and visitor center",
      "sales and visitors center",
      "tourism sales and visitor center",
      "tourism sales and visitors center",
      "communications",
      "tourism communications",
      "marketing",
      "tourism marketing",
      "north walton",
      "north walton tourist development tax"
    ],
    "tourism beach operations": [
      "beach operations",
      "beach renourishment",
      "beach tram",
      "tourism beach tram"
    ],
    "tourism beach tram": ["beach tram"],
    "tourism communications": ["communications"],
    "tourism marketing": ["marketing"],
    "tourism sales and visitor center": ["sales and visitors center", "sales and visitor center"],
    "tourism lifeguard services and beach safety": [
      "south walton fire lifeguard services",
      "public safety"
    ]
  };

  // DEPT_ALIASES only points canonical -> aliases, so matchNames() only
  // expands when called with the canonical name; a row already named with
  // an alias (e.g. "Code Compliance Beach") doesn't resolve back to its
  // canonical ("Code Compliance"). This reverse index lets any name
  // variant -- canonical or alias -- collapse to the same canonical key.
  const DEPT_ALIAS_CANONICAL = (() => {
    const map = new Map();
    Object.keys(DEPT_ALIASES).forEach((canonical) => {
      map.set(canonical, canonical);
      DEPT_ALIASES[canonical].forEach((alias) => {
        if (!map.has(alias)) map.set(alias, canonical);
      });
    });
    return map;
  })();

  // Object codes pulled out into their own supplemental Expenditure Summary
  // table on certain department pages (see render*SupplementalTables below)
  // and therefore excluded from that department's main summary table so
  // amounts aren't counted twice.
  const EXPENSE_OBJECT_CODES_BROKEN_OUT = {
    "solid waste": ["534000"],
    "building construction and maintenance": ["543000"],
    "board of county commissioners": ["531001", "531002", "531003", "531004"],
    "office of the county attorney": ["531000"],
    "office of county attorney": ["531000"]
  };

  // Friendlier display captions for sub-group tables whose raw Dept_Name
  // in the sheet reads awkwardly on its own.
  const DEPT_NAME_DISPLAY_OVERRIDES = {};
  const DEPARTMENT_PAGE_TITLE_ALIASES = new Map([
    ["bcc other uses contingency", "Board of County Commissioners"],
    ["clerk of court", "Clerk of Courts & County Comptroller"],
    ["procurement", "Purchasing"],
    ["probation services", "Probation"],
    ["environmental services", "Environmental Services"],
    ["engineering services", "Engineering Department"],
    ["e911", "E911 Fund"],
    ["e 911", "E911 Fund"],
    ["e911 fund", "E911 Fund"],
    ["municipal service benefit unit", "Municipal Service Benefit Unit Fund"],
    ["municipal service benefit unit fund", "Municipal Service Benefit Unit Fund"],
    ["msbu", "Municipal Service Benefit Unit Fund"],
    ["msbu fund", "Municipal Service Benefit Unit Fund"],
    ["recreation plat fee", "Recreation Plat Fee Fund"],
    ["recreation plat fee fund", "Recreation Plat Fee Fund"],
    ["sidewalk", "Sidewalk Fund"],
    ["sidewalk fund", "Sidewalk Fund"],
    ["statutory and other", "Statutory & Other Agency Funding"],
    ["culture and recreation senior centers", "Statutory & Other Agency Funding"],
    ["culture and recreation senior centers and mainstreet", "Statutory & Other Agency Funding"],
    ["senior centers", "Statutory & Other Agency Funding"],
    ["senior centers and mainstreet", "Statutory & Other Agency Funding"],
    ["walton county sheriff's office", "Sheriff's Office"],
    ["walton county sheriffs office", "Sheriff's Office"],
    ["south walton fire", "South Walton Fire & State Control"],
    ["state fire", "South Walton Fire & State Control"],
    ["volunteer fire", "South Walton Fire & State Control"],
    ["court innovations", "Court Technology & Innovations"],
    ["court technology - court administration", "Court Technology & Innovations"],
    ["court technology court administration", "Court Technology & Innovations"],
    ["sales and visitor center", "Tourism Administration"],
    ["sales and visitors center", "Tourism Administration"],
    ["communications", "Tourism Administration"],
    ["marketing", "Tourism Administration"],
    ["north walton tourist development tax", "Tourism Administration"],
    // The expenditures sheet's own Dept_Name for this division is
    // "Tourism North Walton" (not "North Walton Tourist Development Tax",
    // which is what the revenue side uses) -- without this, its Summary
    // of Expenses "View Budget Lines" row had no department page link at
    // all, unlike every sibling division (Marketing, Communications, etc).
    ["tourism north walton", "Tourism Administration"],
    ["beach operations", "Tourism Beach Operations"],
    ["beach code enforcement", "Tourism Beach Operations"],
    ["beach renourishment", "Tourism Beach Operations"],
    ["beach tram", "Tourism Beach Operations"],
    ["tourism beach tram", "Tourism Beach Operations"],
    ["tourism public safety", "Tourism Lifeguard Services and Beach Safety"],
    ["public safety", "Tourism Lifeguard Services and Beach Safety"],
    ["mosquito control state aid", "Mosquito Control"],
    ["south walton fire lifeguard services", "Tourism Lifeguard Services and Beach Safety"],
    ["sheriff beach safety", "Tourism Lifeguard Services and Beach Safety"]
  ]);

  const DEPARTMENT_PAGE_FALLBACK_HREFS = new Map([
    ["E911 Fund", "e911-fund.html"],
    ["Municipal Service Benefit Unit Fund", "municipal-service-benefit-unit-fund.html"],
    ["Recreation Plat Fee Fund", "recreation-plat-fee-fund.html"],
    ["Sidewalk Fund", "sidewalk-fund.html"]
  ]);

  // A raw Dept_Name that's really one division of a combined department
  // page (see renderTourismAdministrationSections) should link straight to
  // that division's own section, not just the top of the page -- keyed by
  // every spelling variant that shows up across sheets, valued by the
  // exact section label (spec.label) so it matches the id
  // renderTourismAdministrationSections gives that section.
  const DEPARTMENT_PAGE_ANCHOR_OVERRIDES = new Map([
    ["sales and visitor center", "Sales and Visitor Center"],
    ["sales and visitors center", "Sales and Visitor Center"],
    ["communications", "Communications"],
    ["tourism communications", "Communications"],
    ["marketing", "Marketing"],
    ["tourism marketing", "Marketing"],
    ["north walton", "North Walton"],
    ["north walton tourist development tax", "North Walton"],
    ["tourism north walton", "North Walton"]
  ]);

  function localPageHref(filename) {
    if (!filename) return "";
    return window.location.pathname.indexOf("/pages/") !== -1 ? filename : "pages/" + filename;
  }

  // Shared with renderTourismAdministrationSections so a division's
  // section id and the anchor departmentPageHref links to always match.
  function slugifyId(str) {
    return String(str || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function departmentPageHref(deptName) {
    const norm = normalizeDeptName(deptName);
    if (!norm || norm === "unclassified") return "";
    const pages = window.wcBudgetPages || [];
    const title = DEPARTMENT_PAGE_TITLE_ALIASES.get(norm) || deptName;
    const exact = pages.find((p) => normalizeDeptName(p.title) === normalizeDeptName(title));
    let href = "";
    if (exact && exact.href) {
      href = exact.href;
    } else {
      const departmentMatch = pages.find((p) =>
        p.section === "Departments" && normalizeDeptName(p.title) === norm
      );
      href = (departmentMatch && departmentMatch.href) || localPageHref(DEPARTMENT_PAGE_FALLBACK_HREFS.get(title));
    }
    if (!href) return "";
    const anchorLabel = DEPARTMENT_PAGE_ANCHOR_OVERRIDES.get(norm);
    return anchorLabel ? href + "#" + slugifyId(anchorLabel) : href;
  }

  // Explanatory notes shown under a sub-group's Expenditure Summary table,
  // in the same italic callout style as the staffing notes.
  const EXPENSE_GROUP_NOTES = {
    "public safety": [
      "Under Florida Statutes §125.0104(5)(c), eligible counties may allocate up to 10% of Tourist Development Tax revenues to reimburse public safety expenses necessitated by increased tourism and visitor impacts."
    ],
    "south walton fire": [
      "The rise in the budget is attributed to contractual obligations, specifically, the contractual provision for incremental adjustments within the agreement with the South Walton Fire District, tied to the Consumer Price Index Municipal Class Size D - South, calculated from April of the preceding year to April of the current year."
    ],
    "clerk of courts and county comptroller": [
      "Contact the Clerk of Courts & County Comptroller's office directly for additional budget line detail."
    ],
    "tax collector": [
      "Contact the Tax Collector's office directly for additional budget line detail."
    ],
    "sheriffs office": [
      "Contact the Sheriff's Office directly for additional budget line detail."
    ],
    "property appraiser": [
      "Contact the Property Appraiser's office directly for additional budget line detail."
    ],
    "supervisor of elections": [
      "Contact the Supervisor of Elections' office directly for additional budget line detail."
    ],
    "non profit funding program": [
      "Please contact the Office of Management and Budget for a list of agencies that received funding through this program in prior years."
    ]
  };

  // These constitutional officers only roll an FTE total up here rather
  // than itemized position-level data -- see renderStaffingGroup's
  // extraNotes -- so their staffing card points readers to that office
  // directly for a detailed position-level FTE table.
  const STAFFING_GROUP_NOTES = {
    "clerk of courts and county comptroller": [
      "Contact the Clerk of Courts & County Comptroller's office directly for a detailed position-level FTE table."
    ],
    // The staffing sheet's own Dept_Name for the Clerk uses "Clerk of
    // Circuit Court" rather than the page's "Clerk of Courts & County
    // Comptroller" title.
    "clerk of circuit court": [
      "Contact the Clerk of Courts & County Comptroller's office directly for a detailed position-level FTE table."
    ],
    "tax collector": [
      "Contact the Tax Collector's office directly for a detailed position-level FTE table."
    ],
    "sheriffs office": [
      "Contact the Sheriff's Office directly for a detailed position-level FTE table."
    ],
    // The staffing sheet's own Dept_Name for the Sheriff is just "Sheriff"
    // rather than the page's "Sheriff's Office" title.
    sheriff: [
      "Contact the Sheriff's Office directly for a detailed position-level FTE table."
    ],
    "property appraiser": [
      "Contact the Property Appraiser's office directly for a detailed position-level FTE table."
    ],
    "supervisor of elections": [
      "Contact the Supervisor of Elections' office directly for a detailed position-level FTE table."
    ]
  };

  // Inter-department FTE transfers for FY 2027. When a position reduction in
  // one dept is matched by an equal increase in another dept with the same
  // position name, both changes are surfaced as a single "Transferred" note
  // rather than separate "Requested" / "Reduced" notes.
  const STAFFING_TRANSFERS = [
    { from: "county administration", to: "veteran services", fromLabel: "County Administration Departments", toLabel: "Veteran Services" }
  ];

  // Hover-tip copy for each budget category, shown via the same
  // "i" bubble treatment used on the site's static FY-history tables.
  const TYPE_TOOLTIPS = {
    "Personnel Services":
      "Covers employee compensation and benefits, including salaries, overtime, weekend and holiday pay, seasonal workers, FICA, Florida Retirement System (FRS) contributions, health insurance, workers’ compensation, life insurance, and paid leave buybacks.",
    "Operating Expenditures":
      "Covers the day-to-day costs of providing County services, including utilities, fuel, maintenance, professional services, software, office supplies, communications, training, and other routine operating expenses.",
    "Capital Outlay":
      "Covers major investments in long-term County assets, including vehicles, machinery and equipment, technology systems, buildings, facility improvements, roads, drainage, parks, and other infrastructure projects.",
    "Debt Service":
      "Covers principal and interest payments on County debt obligations, including bonds, loans, and other long-term financing arrangements.",
    "Grants and Aid":
      "Covers funding provided to other governments, agencies, and organizations through grants, aid payments, and other transfers in support of County program objectives.",
    "Other Uses":
      "Covers transfers, reserves, and other budgetary uses not classified as personnel, operating, capital, debt service, or grants and aid expenditures.",
    "General Government Taxes": "Ad valorem, tourist development, and other locally levied taxes.",
    "Intergovernmental Revenues": "Grants, shared revenues, and payments received from federal and state government sources.",
    "Charges for Services": "Fees charged for specific County services rendered to residents and businesses.",
    "Permits Fees and Special Assessments": "Revenue from permits, licenses, and special assessments.",
    "Permits, Fees, and Special Assessments": "Revenue from permits, licenses, regulatory fees, and special assessments.",
    "Miscellaneous Revenue": "Interest earnings, donations, and other revenue not classified elsewhere.",
    "Other Sources": "Transfers in, debt proceeds, and other non-recurring funding sources.",
    "Judgments, Fines and Forfeits": "Revenue from court judgments, fines, and forfeitures.",
    "Property Taxes (Ad Valorem)": "Taxes levied on the taxable value of real and tangible personal property. This category includes the Countywide and North Walton Mosquito Control property tax levies.",
    "General Government Taxes (excluding Property Taxes)": "Other locally levied taxes, including tourist development, sales-related, communications, and fuel taxes; property taxes are reported separately above.",
    "General Government": "Administrative, legislative, financial, judicial, and other services that support the overall operation of County government.",
    "Public Safety": "Law enforcement, emergency response, detention, code enforcement, and other services that protect people and property.",
    "Physical Environment": "Services related to natural resources, solid waste, utilities, conservation, and environmental protection.",
    "Transportation": "Roads, bridges, traffic operations, engineering, maintenance, and other transportation services and infrastructure.",
    "Economic Environment": "Programs and services supporting economic development, housing, tourism, planning, and community improvement.",
    "Human Services": "Health, veterans, social assistance, and other services supporting the well-being of residents.",
    "Culture and Recreation": "Libraries, parks, recreation, cultural programs, and related community facilities and services.",
    "Court Related Cost": "Court operations, legal services, technology, and other costs associated with the judicial system.",
    "Other Financial Sources": "Interfund transfers and other financing sources reported separately from operating revenues.",
    "Other Financial Uses": "Interfund transfers and other financing uses reported separately from functional expenditures."
  };

  const priorYearsState = { budget: false, performance: false };

  const cache = {
    expenditures: [],
    dedupedExpenseRows: [],
    revenues: [],
    expenseActualRows: [],
    revenueActualRows: [],
    originalBudgetRows: [],
    staffing: [],
    performanceMeasures: [],
    machinery: [],
    machineryUnfunded: [],
    departmentNarratives: [],
    funds: [],
    activities: [],
    fundBalances: [],
    errors: {}
  };
  let loadPromise = null;

  function loadScriptOnce(id, src) {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById(id);
      if (existing) {
        if (existing.dataset.loaded === "true") {
          resolve();
          return;
        }
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Failed to load " + src)), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = true;
      script.addEventListener(
        "load",
        () => {
          script.dataset.loaded = "true";
          resolve();
        },
        { once: true }
      );
      script.addEventListener("error", () => reject(new Error("Failed to load " + src)), { once: true });
      document.head.appendChild(script);
    });
  }

  function ensureSupabaseDataLayer() {
    if (window.WCSupabaseData) return Promise.resolve(window.WCSupabaseData);

    return loadScriptOnce("wc-supabase-js", SUPABASE_CLIENT_SCRIPT)
      .then(() => loadScriptOnce("wc-supabase-data", supabaseDataScript))
      .then(() => window.WCSupabaseData || null)
      .catch((err) => {
        console.error("WCBudgetData: Supabase actuals layer could not be loaded; using Google Sheets fallbacks.", err);
        return null;
      });
  }

  function loadSupabaseActualLookups() {
    return ensureSupabaseDataLayer().then((supabaseData) => {
      if (!supabaseData) return null;

      return Promise.all([
        supabaseData.loadExpenseActuals(),
        supabaseData.loadRevenueActuals(),
        supabaseData.loadOriginalBudget()
      ]).then(([expenseRows, revenueRows, originalBudgetRows]) => ({
        supabaseData,
        expenseRows,
        revenueRows,
        originalBudgetRows
      }));
    }).catch((err) => {
      console.error("WCBudgetData: Supabase actuals could not be loaded; using Google Sheets fallbacks.", err);
      return null;
    });
  }

  // Some departments' historical actuals are booked under older Dept_Code
  // values that predate a county org-code restructuring and no longer
  // appear anywhere in the current budget sheet. Building Construction and
  // Maintenance (now solely 00117000) has actuals split across 00117010,
  // 00117020, and 10117000 in Supabase, so those need to be pulled in
  // alongside the current code or its prior-year actuals read as zero.
  //
  // Engineering is NOT listed here even though its FY2020-FY2026
  // actuals/budget are booked under legacy code 00120000 while its FY2027
  // sheet row uses 10116002 -- unlike Building Construction's aliases, this
  // wasn't just an org-code rename: the department itself moved from the
  // General Fund (001, 00120000's own fund) to the Transportation Fund
  // (101, 10116002's own fund) starting FY2027. Aliasing 00120000 into
  // 10116002 would pull FY2020-FY2026 dollars onto the Transportation
  // Fund's schedule a year before the department actually got there.
  // synthesizeMissingExpenseRows instead synthesizes 00120000 as its own
  // standalone row (see considerRow), keeping FY2020-FY2026 on fund 001 and
  // FY2027 (the sheet's own 10116002 rows) on fund 101.
  const DEPT_CODE_ACTUALS_ALIASES = {
    "00117000": ["00117010", "00117020", "10117000"]
  };

  // Sums every raw Supabase actuals row matching a department+account+year,
  // regardless of its project dimension. Budget-side FY2027 line items
  // don't carry a comparable project breakdown (expense Project_Code is
  // budget-only/itemization-only; revenue rows have no Project_Code field
  // at all), but the *actuals* data can legitimately have several real,
  // distinct entries for the same department+account split across
  // different projects (e.g. a revenue code billed under one project some
  // years and unassigned in others) -- those are genuine additional
  // dollars, not duplicates, so they must be summed rather than picking
  // just one. `matched` distinguishes "found rows, total happens to be 0"
  // from "no actuals exist for this account" so callers can still fall
  // back to the budget sheet's own column in the latter case.
  // projectCode being undefined/null means "no project scoping" (sum every
  // project under this org+account, the usual rule). Passing "" explicitly
  // means "scope to rows with a blank project specifically" -- distinct from
  // not scoping at all, needed for org+account combinations that mix one
  // blank-project recipient with other recipients under real Project_Codes
  // (see STATUTORY_EXPENSE_OVERRIDES).
  function sumRawActualsForAccount(rawRows, org, code, year, projectCode, excludedProjects) {
    const orgNorm = String(org || "").trim();
    const codeNorm = String(code || "").trim();
    const hasProjectScope = projectCode !== undefined && projectCode !== null;
    const projectNorm = hasProjectScope ? String(projectCode).trim() : "";
    const excludedProjectSet = new Set((excludedProjects || []).map((p) => String(p || "").trim()).filter(Boolean));
    const orgNorms = orgNorm ? [orgNorm].concat(DEPT_CODE_ACTUALS_ALIASES[orgNorm] || []) : [];
    let matched = false;
    let total = 0;
    if (orgNorms.length && codeNorm) {
      (rawRows || []).forEach((row) => {
        if (Number(row.year) !== Number(year)) return;
        if (!orgNorms.includes(String(row.org || "").trim())) return;
        if (String(row.object || "").trim() !== codeNorm) return;
        if (hasProjectScope && String(row.project || "").trim() !== projectNorm) return;
        if (excludedProjectSet.has(String(row.project || "").trim())) return;
        matched = true;
        total += Number(row.amount) || 0;
      });
    }
    return { matched, total };
  }

  // Departments whose budget/actuals must be scoped to one specific
  // Project_Code rather than the usual "sum every project under this
  // org+account" rule (see applyActualsToRows below). Walton County Health
  // Department's expense row shares Dept_Code 00102012 ("Human Services")
  // and Object_Code 581000 ("Aid to Government Agencies") with several
  // *other* aid recipients, each under their own distinct Project_Code --
  // unlike the usual case (one department's own purchases itemized across
  // several Project_Codes), these are genuinely different organizations, so
  // summing by org+account alone pulls in their payments too. Non-Profit
  // Funding Program is the same pattern: its expense row shares Dept_Code
  // 00102014 and Object_Code 583000 ("Other Grants & Aid") with the
  // Indigent Cremation Program, a different recipient under a blank
  // Project_Code.
  const PROJECT_SCOPED_DEPT_NAMES = new Map([
    ["walton county health department", "10255"],
    ["non profit funding program", "10261"]
  ]);

  // Statutory & Other Agency Funding rolls up several small, independent
  // aid/grant line items that are each relabeled onto it from a different
  // original Dept_Name (see STATUTORY_EXPENSE_OVERRIDES) -- unlike the
  // departments above, these are several *different* recipients, each with
  // its own distinct Project_Code, that must stay separate from each other
  // rather than share one fixed scope. So instead of a single fixed
  // Project_Code, each row is scoped to whatever its own Project_Code
  // already is (including blank, for the recipients recorded without one).
  const PROJECT_SCOPED_BY_OWN_ROW_DEPT_NAMES = new Set([
    "statutory and other",
    "planning short term rental"
  ]);

  // projectScopeForRow returns undefined when no row needs project-level
  // scoping at all (the default, "sum every project" rule applies), so
  // sumRawActualsForAccount/applyActualsToRows/applyOriginalBudgetToRows can
  // tell that apart from an explicit "" (scope to a blank Project_Code).
  function projectScopeForRow(row) {
    const deptName = normalizeDeptName(row && row.Dept_Name);
    if (PROJECT_SCOPED_BY_OWN_ROW_DEPT_NAMES.has(deptName)) {
      return String((row && row.Project_Code) || "").trim();
    }
    if (PROJECT_SCOPED_DEPT_NAMES.has(deptName)) {
      return PROJECT_SCOPED_DEPT_NAMES.get(deptName);
    }
    return undefined;
  }

  // Specific (Dept_Code, Object_Code, Project_Code) expense line items that
  // belong on the Statutory & Other Agency Funding page but are recorded in
  // the sheet under a different Dept_Name -- each is its own small,
  // independent aid/grant recipient with no department page of its own.
  // Project_Code "" matches a row with a blank Project_Code specifically
  // (Object_Code is included because some of these orgs have *another*
  // blank-project row under a different account that must NOT be relabeled,
  // e.g. Human Services 581001 alongside its 581000 row). Lakeview
  // (00102013) is the same pattern as the others: three Professional
  // Services (531000) rows under three distinct Project_Codes, no page of
  // its own.
  const STATUTORY_EXPENSE_OVERRIDES = new Set([
    "00102012|581000|10259",
    "00102012|581000|10260",
    "00102012|581000|10720",
    "00102012|581000|10732",
    "00102012|581000|",
    "00102019|581000|10277",
    "00102019|581000|10278",
    "00102011|582000|10257",
    "00102016|582000|10251",
    "00102014|583000|",
    "00102013|531000|10246",
    "00102013|531000|10247",
    "00102013|531000|10248"
  ]);

  function statutoryExpenseOverrideKey(row) {
    return (
      String((row && row.Dept_Code) || "").trim() + "|" +
      String((row && row.Object_Code) || "").trim() + "|" +
      String((row && row.Project_Code) || "").trim()
    );
  }

  function applyStatutoryExpenseOverrides(rows) {
    return (rows || []).map((row) => {
      if (!STATUTORY_EXPENSE_OVERRIDES.has(statutoryExpenseOverrideKey(row))) return row;
      return { ...row, Dept_Name: "Statutory & Other" };
    });
  }

  // Specific (Dept_Code, Revenue_Code) revenue rows relabeled to a
  // different Revenue_Name so they merge into the right category on
  // county-wide summaries (combineByName groups revenue rows by name).
  // Dept_Code 102389 / Revenue_Code 389001 ("Nonoperating less 5%") is the
  // statutory 5% Ad Valorem discount Florida's Truth in Millage law
  // requires budgeting against -- it already shares Ad Valorem Taxes' own
  // Revenue_Type ("General Government Taxes"), but its generic
  // "Nonoperating" name keeps it from merging into that line. No dedicated
  // page shows this row under its original name (only the Summary of
  // Revenues and a glossary mention), so relabeling it is safe everywhere.
  const REVENUE_NAME_OVERRIDES = new Map([["102389|389001", "Ad Valorem Taxes"]]);

  // Ad Valorem Taxes Delinquent (Revenue_Code 311001) always accompanies
  // the current-year Ad Valorem Taxes line (311000) for whichever fund
  // levies it -- delinquent collections are the same underlying tax, just
  // collected late, so every summary/breakdown that groups revenue rows by
  // name should show one combined "Ad Valorem Taxes" line rather than
  // splitting out a separate, easy-to-miss "Delinquent" row. Keyed by
  // Revenue_Code alone (not Dept_Code+Revenue_Code like REVENUE_NAME_
  // OVERRIDES above) since it holds for every department that reports it
  // (001311, 101311, 105311, 107311, 300311, and any future fund).
  const REVENUE_CODE_NAME_OVERRIDES = new Map([["311001", "Ad Valorem Taxes"]]);

  const BCC_BEACH_VENDING_FY2026_BUDGET = 1530000;
  const BCC_BEACH_VENDING_REVENUE_CODE = "329004";
  const BCC_BEACH_VENDING_PROJECT_CODE = "10647";

  function isBccBeachVendingRevenueRow(row) {
    const dept = normalizeDeptName(row && row.Dept_Name);
    const code = String((row && row.Revenue_Code) || "").trim();
    const name = normalizeDeptName(row && row.Revenue_Name);
    const project = String((row && row.Project_Code) || "").trim();
    return dept === "board of county commissioners" &&
      (code === BCC_BEACH_VENDING_REVENUE_CODE || /beach vending/.test(name)) &&
      (!project || project === BCC_BEACH_VENDING_PROJECT_CODE);
  }

  const REVENUE_FY2026_PLUG_OVERRIDES = new Map([
    ["001329|board of county commissioners|" + BCC_BEACH_VENDING_REVENUE_CODE + "|" + BCC_BEACH_VENDING_PROJECT_CODE, BCC_BEACH_VENDING_FY2026_BUDGET]
  ]);
  const LIBRARY_GRANT_PROJECT_CODE = "10029";

  function isLibraryProjectRevenueRow(row) {
    const projectValues = [
      row && row.Project_Code,
      row && row.Project_Name,
      row && row.Note
    ].map((value) => String(value || "").trim());
    return normalizeDeptName(row && row.Dept_Name) === "libraries" &&
      projectValues.includes(LIBRARY_GRANT_PROJECT_CODE);
  }

  function revenueFy2026PlugOverride(row) {
    if (isBccBeachVendingRevenueRow(row)) return BCC_BEACH_VENDING_FY2026_BUDGET;
    const key = [
      String((row && row.Dept_Code) || "").trim(),
      normalizeDeptName(row && row.Dept_Name),
      String((row && row.Revenue_Code) || "").trim(),
      String((row && row.Project_Code) || "").trim()
    ].join("|");
    return REVENUE_FY2026_PLUG_OVERRIDES.get(key) || 0;
  }

  function applyRevenueNameOverrides(rows) {
    return (rows || []).map((row) => {
      const revenueCode = String((row && row.Revenue_Code) || "").trim();
      const key = String((row && row.Dept_Code) || "").trim() + "|" + revenueCode;
      const override = REVENUE_NAME_OVERRIDES.get(key) || REVENUE_CODE_NAME_OVERRIDES.get(revenueCode);
      if (override) return { ...row, Revenue_Name: override };
      return row;
    });
  }

  function isFundScheduleDebugEnabled(flagName) {
    try {
      return new URLSearchParams(window.location.search).get(flagName) === "1";
    } catch (e) {
      return false;
    }
  }

  function isMissingRowsDebugEnabled() {
    return isFundScheduleDebugEnabled("debugMissingRows");
  }

  // Florida's Uniform Accounting System: revenue codes are 3xx, with no
  // overlap with expense's 5xx/6xx (see isLikelyExpenseObjectCode).
  function isLikelyRevenueCode(code) {
    return String(code || "").trim().charAt(0) === "3";
  }

  // "COA Revenue Codes" -- like buildExpenseObjectCatalog, but there's no
  // dedicated tab for this either, so it's derived from the revenues
  // sheet's own Revenue_Code/Revenue_Name/Revenue_Type columns.
  function buildRevenueCodeCatalog(revenueRows) {
    const catalog = new Map();
    (revenueRows || []).forEach((r) => {
      const code = String(r.Revenue_Code || "").trim();
      if (!code || catalog.has(code)) return;
      catalog.set(code, { Revenue_Code: code, Revenue_Name: r.Revenue_Name || "", Revenue_Type: r.Revenue_Type || "" });
    });
    return catalog;
  }

  // Departments/recipients that already have at least one real row
  // somewhere in the sheet -- a synthesized row (see
  // synthesizeMissingExpenseRows/synthesizeMissingRevenueRows below) only
  // gets attributed to a department name pulled from the activities sheet
  // when that name is confirmed here. Some Dept_Codes in the activities
  // sheet are revenue-category labels rather than real departments (e.g.
  // 107342 maps to Dept_Name "Public Safety", not an actual department) --
  // trusting those blindly previously misattributed rows to the wrong page
  // entirely. Anything not confirmed here becomes Dept_Name "Unclassified"
  // instead.
  function buildKnownDeptNames(expenditureRows, revenueRows) {
    const names = new Set();
    (expenditureRows || []).forEach((r) => {
      const n = normalizeDeptName(r.Dept_Name);
      if (n) names.add(n);
    });
    (revenueRows || []).forEach((r) => {
      const n = normalizeDeptName(r.Dept_Name);
      if (n) names.add(n);
    });
    return names;
  }

  const UNCLASSIFIED_DEPT_NAME = "Unclassified";

  // (org, object) keys that SUPABASE_LOOKUP_OVERRIDES already redirects
  // into an existing sheet row's own lookup (e.g. 105389/389001 is summed
  // into the 102389/389001 sheet row's Ad Valorem 5% figure) -- excluded
  // from synthesis below so those dollars aren't also counted via a brand
  // new row.
  function overrideRedirectTargetKeys() {
    const keys = new Set();
    SUPABASE_LOOKUP_OVERRIDES.forEach((targets) => {
      targets.forEach((t) => keys.add(String(t.org || "").trim() + "|" + String(t.object || "").trim()));
    });
    return keys;
  }

  // Org codes that are DEPT_CODE_ACTUALS_ALIASES targets (e.g. 00117010,
  // an alias of canonical org 00117000) -- excluded from revenue synthesis
  // wholesale, any object code, because sumRawActualsForAccount already
  // folds all of an alias target's Supabase rows into the canonical org's
  // own sum, AS LONG AS the canonical org has its own row for that exact
  // object code. (Expense synthesis below checks this per object code
  // instead of blanket-excluding the org -- see synthesizeMissingExpenseRows
  // -- since an alias org can have an account under an object code its
  // canonical org has no row for at all, which this blanket exclusion would
  // otherwise silently drop.)
  function aliasTargetOrgCodes() {
    const codes = new Set();
    Object.keys(DEPT_CODE_ACTUALS_ALIASES).forEach((canonicalOrg) => {
      DEPT_CODE_ACTUALS_ALIASES[canonicalOrg].forEach((aliasOrg) => codes.add(aliasOrg));
    });
    return codes;
  }

  // Supabase actuals/original-budget rows can reference a department+
  // account combination with no row at all in the FY2027 budget sheet --
  // without a row to attach a value to, applyActualsToRows/
  // applyOriginalBudgetToRows have nothing to populate, and every table
  // that reads cache.expenditures (Summary of Expenses, every department's
  // Budget Lines popup, the Fund Financial Schedule) never sees it. This
  // synthesizes a minimal placeholder row for each one found, so the
  // existing actuals/budget machinery picks it up the same way it does for
  // every other row, with no per-table special-casing needed.
  function synthesizeMissingExpenseRows(expenditureRows, originalBudgetRows, actualRows, coaDepartments, coaExpenses, knownDeptNames, excludedKeys) {
    const rows = expenditureRows || [];

    // Coverage already provided by *existing* sheet rows, mirroring exactly
    // what applyOriginalBudgetToRows/applyActualsToRows will later match on:
    // an unscoped row (projectScopeForRow undefined) catches every project
    // under its org+object, while a project-scoped row only catches its own
    // project (see projectScopeForRow). Needed to tell a genuinely missing
    // account apart from one that's already covered by an existing row
    // under a *different* Project_Code than the Supabase row happens to
    // carry -- e.g. Walton County Health Department/Statutory & Other carve
    // out specific projects under 00102012/581000, but a Supabase project
    // matching none of them (and with no unscoped row to fall back to)
    // would otherwise never be attached to any row at all.
    const coverage = new Map();
    function coverageFor(org, object) {
      const key = org + "|" + object;
      let cov = coverage.get(key);
      if (!cov) {
        cov = { any: false, scopes: new Set() };
        coverage.set(key, cov);
      }
      return cov;
    }
    rows.forEach((r) => {
      const org = String(r.Dept_Code || "").trim();
      const object = String(r.Object_Code || "").trim();
      if (!org || !object) return;
      const scope = projectScopeForRow(r);
      const cov = coverageFor(org, object);
      if (scope === undefined) cov.any = true;
      else cov.scopes.add(scope);
    });

    // Reverse of DEPT_CODE_ACTUALS_ALIASES: an alias org's Supabase rows
    // are normally already folded into its canonical org's own row via
    // sumRawActualsForAccount's org expansion -- but only for an object
    // code the canonical org actually has a row for. An alias org's
    // account under an object code the canonical org has no row for at all
    // would otherwise be silently dropped (no row anywhere ever attaches to
    // it), so it still needs its own synthesized row -- attributed to the
    // *canonical* org's code (see considerRow below), not the legacy alias
    // code, since the alias can carry a different (now-stale) fund than
    // where the department actually sits today. E.g. Engineering's legacy
    // code 00120000 was General Fund; its current code 10116002 is the
    // Transportation Fund -- a row left under 00120000 would land on the
    // wrong fund's schedule even though it's the same department's money.
    // sumRawActualsForAccount's alias expansion still finds the alias org's
    // own Supabase rows regardless of which org code the new row carries.
    const canonicalOrgForAlias = new Map();
    Object.keys(DEPT_CODE_ACTUALS_ALIASES).forEach((canonicalOrg) => {
      DEPT_CODE_ACTUALS_ALIASES[canonicalOrg].forEach((aliasOrg) => canonicalOrgForAlias.set(aliasOrg, canonicalOrg));
    });

    function isCovered(org, object, project) {
      const cov = coverage.get(org + "|" + object);
      if (cov && (cov.any || cov.scopes.has(project))) return true;
      const canonicalOrg = canonicalOrgForAlias.get(org);
      if (!canonicalOrg) return false;
      const canonicalCov = coverage.get(canonicalOrg + "|" + object);
      return !!(canonicalCov && (canonicalCov.any || canonicalCov.scopes.has(project)));
    }

    const deptByCode = new Map((coaDepartments || []).map((d) => [String(d.Dept_Code || "").trim(), d]));
    // A synthesized row's Dept_Code can already be used by *other* object
    // codes under this exact same department elsewhere in the sheet (e.g.
    // 11141010 is "Beach Operations" for its Personnel Services/Operating
    // rows) -- this is a far more reliable name than the separate Chart of
    // Accounts departments sheet (coaDepartments/deptByCode above), which
    // can be missing an entry, or list a name that doesn't match
    // knownDeptNames, for a department the expenditure sheet itself
    // already names correctly. Checked first, below, so a new object code
    // under an already-known department never falls through to
    // "Unclassified" just because the separate COA sheet didn't confirm it.
    const knownDeptNameByCode = new Map();
    rows.forEach((r) => {
      const org = String(r.Dept_Code || "").trim();
      const name = String(r.Dept_Name || "").trim();
      if (!org || !name || name === UNCLASSIFIED_DEPT_NAME) return;
      if (!knownDeptNameByCode.has(org)) knownDeptNameByCode.set(org, name);
    });
    // A synthesized row's own exact Dept_Code might be brand new (no sheet
    // row shares it at all), but a *different* Dept_Code under the exact
    // same fund often already has a real name -- e.g. 10225000/10225020
    // have no sheet row of their own, but 10225010 (same fund, 102/MSBU)
    // is already named "MSBU". Only trusted when the fund has exactly one
    // distinct known department name -- a fund shared by many departments
    // (e.g. 001, the General Fund) has no single "dominant" name to borrow,
    // so it's left to the fund-name fallback in resolveSynthesizedDeptName.
    const deptNamesByFund = new Map();
    rows.forEach((r) => {
      const name = String(r.Dept_Name || "").trim();
      if (!name || name === UNCLASSIFIED_DEPT_NAME) return;
      const fund = fundCodeForRow(r);
      if (!fund) return;
      const set = deptNamesByFund.get(fund) || new Set();
      set.add(name);
      deptNamesByFund.set(fund, set);
    });
    const dominantDeptNameByFund = new Map();
    deptNamesByFund.forEach((names, fund) => {
      if (names.size === 1) dominantDeptNameByFund.set(fund, Array.from(names)[0]);
    });
    const seenNewKeys = new Set();
    const extraRows = [];

    function considerRow(org, object, project) {
      if (!org || !object || !isLikelyExpenseObjectCode(object) || excludedKeys.has(org + "|" + object)) return;
      if (isCovered(org, object, project)) return;

      // Route a leftover alias-org account to its canonical org's own code
      // (see canonicalOrgForAlias above) rather than the legacy alias code.
      const targetOrg = canonicalOrgForAlias.get(org) || org;

      const key = targetOrg + "|" + object + "|" + project;
      if (seenNewKeys.has(key)) return;
      seenNewKeys.add(key);

      // A (targetOrg,object) with *some* existing project-scoped coverage
      // already (just not this Supabase project) is a shared GL line
      // across several distinct recipients -- the same pattern as
      // Statutory & Other -- so this new row must be scoped to its own
      // project too, or it would unscope-sum the whole account and
      // re-duplicate its siblings' amounts.
      const existingCov = coverage.get(targetOrg + "|" + object);
      const needsOwnProjectScope = !!(existingCov && existingCov.scopes.size > 0);

      const dept = deptByCode.get(targetOrg);
      const deptName = needsOwnProjectScope
        ? "Statutory & Other"
        : DEPT_CODE_NAME_OVERRIDES.get(targetOrg) ||
          knownDeptNameByCode.get(targetOrg) ||
          dominantDeptNameByFund.get(fundCodeForRow({ Dept_Code: targetOrg })) ||
          resolveSynthesizedDeptName(dept, knownDeptNames, targetOrg);
      const expense = coaExpenses.get(object);

      extraRows.push({
        Dept_Code: targetOrg,
        Dept_Name: deptName,
        Note: needsOwnProjectScope ? "Statutory & Other" : "",
        Project_Code: needsOwnProjectScope ? project : "",
        Project_Name: "",
        Object_Code: object,
        Object_Name: expense ? expense.Object_Name : "Unclassified Account",
        Object_Type: expense ? expense.Object_Type : "",
        FY2027_Proposed: 0
      });

      if (needsOwnProjectScope) coverageFor(targetOrg, object).scopes.add(project);
      else coverageFor(targetOrg, object).any = true;
    }

    (originalBudgetRows || []).forEach((r) => considerRow(String(r.org || "").trim(), String(r.object || "").trim(), String(r.project || "").trim()));
    (actualRows || []).forEach((r) => considerRow(String(r.org || "").trim(), String(r.object || "").trim(), String(r.project || "").trim()));

    if (isMissingRowsDebugEnabled()) {
      console.log("MissingRows debug: synthesized " + extraRows.length + " expense row(s)", extraRows);
    }
    if (!extraRows.length) return rows;
    return rows.concat(extraRows);
  }

  // Revenue counterpart of synthesizeMissingExpenseRows above.
  function synthesizeMissingRevenueRows(revenueRows, originalBudgetRows, actualRows, coaDepartments, coaRevenueCodes, knownDeptNames, excludedKeys, excludedOrgs) {
    const existingKeys = new Set(
      (revenueRows || []).map((r) => String(r.Dept_Code || "").trim() + "|" + String(r.Revenue_Code || "").trim())
    );
    const deptByCode = new Map((coaDepartments || []).map((d) => [String(d.Dept_Code || "").trim(), d]));
    // Same fix as synthesizeMissingExpenseRows' own knownDeptNameByCode: a
    // synthesized row's Dept_Code can already have a real name elsewhere in
    // the revenue sheet (a different Revenue_Code under the same
    // department), which is more reliable than the separate Chart of
    // Accounts departments sheet.
    const knownDeptNameByCode = new Map();
    (revenueRows || []).forEach((r) => {
      const org = String(r.Dept_Code || "").trim();
      const name = String(r.Dept_Name || "").trim();
      if (!org || !name || name === UNCLASSIFIED_DEPT_NAME) return;
      if (!knownDeptNameByCode.has(org)) knownDeptNameByCode.set(org, name);
    });
    // Same fix as synthesizeMissingExpenseRows' own dominantDeptNameByFund:
    // a different Dept_Code under the exact same fund can already have a
    // real name (e.g. Sheriff Fund's own "Walton County Sheriff's Office"),
    // trusted only when the fund has exactly one distinct known name.
    const deptNamesByFund = new Map();
    (revenueRows || []).forEach((r) => {
      const name = String(r.Dept_Name || "").trim();
      if (!name || name === UNCLASSIFIED_DEPT_NAME) return;
      const fund = fundCodeForRow(r);
      if (!fund) return;
      const set = deptNamesByFund.get(fund) || new Set();
      set.add(name);
      deptNamesByFund.set(fund, set);
    });
    const dominantDeptNameByFund = new Map();
    deptNamesByFund.forEach((names, fund) => {
      if (names.size === 1) dominantDeptNameByFund.set(fund, Array.from(names)[0]);
    });
    const seenNewKeys = new Set();
    const extraRows = [];

    function considerRow(org, object) {
      if (!org || !object || !isLikelyRevenueCode(object) || excludedOrgs.has(org)) return;
      const key = org + "|" + object;
      if (existingKeys.has(key) || seenNewKeys.has(key) || excludedKeys.has(key)) return;
      seenNewKeys.add(key);

      const dept = deptByCode.get(org);
      const deptName = DEPT_CODE_NAME_OVERRIDES.get(org) ||
        knownDeptNameByCode.get(org) ||
        dominantDeptNameByFund.get(fundCodeForRow({ Dept_Code: org })) ||
        resolveSynthesizedDeptName(dept, knownDeptNames, org);
      const revenue = coaRevenueCodes.get(object);
      const revenueOverride = REVENUE_CODE_OVERRIDES.get(object);

      extraRows.push({
        Dept_Code: org,
        Dept_Name: deptName,
        Note: "",
        Project_Name: "",
        Revenue_Code: object,
        Revenue_Name: revenueOverride ? revenueOverride.name : (revenue ? revenue.Revenue_Name : "Unclassified Account"),
        Revenue_Type: revenueOverride ? revenueOverride.type : (revenue ? revenue.Revenue_Type : "Miscellaneous Revenue"),
        FY2027_Proposed: 0
      });
    }

    (originalBudgetRows || []).forEach((r) => considerRow(String(r.org || "").trim(), String(r.object || "").trim()));
    (actualRows || []).forEach((r) => considerRow(String(r.org || "").trim(), String(r.object || "").trim()));

    if (isMissingRowsDebugEnabled()) {
      console.log("MissingRows debug: synthesized " + extraRows.length + " revenue row(s)", extraRows);
    }
    if (!extraRows.length) return revenueRows || [];
    return (revenueRows || []).concat(extraRows);
  }

  // Revenue rows that represent a reduction against whatever Revenue_Name
  // category they're merged into (combineByName) rather than a collection,
  // so they must subtract from that category's total instead of adding to
  // it. Dept_Code 102389 / Revenue_Code 389001 (relabeled to Ad Valorem
  // Taxes above) is the statutory 5% Ad Valorem discount -- it must always
  // contribute a negative amount to the FY2026 budget merge below,
  // regardless of which sign the source data happens to carry.
  const SUBTRACTIVE_REVENUE_KEYS = new Set(["102389|389001"]);

  function isSubtractiveRevenueRow(row) {
    const key = String((row && row.Dept_Code) || "").trim() + "|" + String((row && row.Revenue_Code) || "").trim();
    return SUBTRACTIVE_REVENUE_KEYS.has(key);
  }

  // Shared by the Summary of Revenues' county-wide "View Budget Lines"
  // merge (collapsedBudgetLineName) and the Fund Financial Schedule's own
  // per-activity revenue breakdown, so a reader sees the same combined
  // "Interest"/"Contributions and Donations" line on both pages instead
  // of one page splitting them out by department-scoped account and the
  // other combining them. Several distinct interest-bearing accounts
  // (Interest (Beach Management), Interest (Sheriff), Constitutional
  // Officer Interest, Interest and Other Earnings, etc.) and several
  // distinct contributions/donations accounts (Private Sources, Other)
  // are each their own line for department-scoped tracking, but most
  // readers of a combined, county-wide or fund-wide view just want the
  // one combined figure.
  function collapsedRevenueSourceName(rawName) {
    const name = String(rawName || "");
    // The many individual "State Grant (X)"/"Federal Grant (X)" lines
    // (one per activity, see REVENUE_CODE_OVERRIDES) are still one
    // program-level source of money as far as most readers care.
    if (/^Federal Grant\b/.test(name)) return "Federal Grants";
    if (/^State Grant\b/.test(name)) return "State Grants";
    if (/interest/i.test(name)) return "Interest";
    if (/^Contributions and Donations\b/.test(name)) return "Contributions and Donations";
    return rawName;
  }

  // FY2026 budget contribution for one row being folded into a
  // combineByName merge: a normal revenue row's raw value is sign-flipped
  // by revenueDisplayAmount (Supabase stores revenue as a credit/negative
  // amount), but a subtractive row above must stay negative -- forced
  // negative outright rather than trusting the source sign, per its
  // definition as a reduction.
  function revenueBudgetMergeContribution(row) {
    const raw = row.FY2026_Original_Budget || row.FY2026_Budget || row.FY2026_Plug || 0;
    return isSubtractiveRevenueRow(row) ? -Math.abs(raw) : revenueDisplayAmount(raw);
  }

  // Same sign-flip rule as revenueBudgetMergeContribution, generalized to
  // any prior-year field -- a normal revenue row's raw value needs
  // Math.abs() (Supabase/the sheet stores some revenue, like Interest, as
  // a credit/negative amount), while a subtractive row (e.g. the Ad
  // Valorem 5% reduction) must stay negative, forced outright rather than
  // trusting the source sign.
  function revenueRowFieldContribution(row, field) {
    const raw = (row && row[field]) || 0;
    return isSubtractiveRevenueRow(row) ? -Math.abs(raw) : revenueDisplayAmount(raw);
  }

  // The sheet's Dept_Code for a row doesn't always match what Supabase
  // actually has that account under -- a sheet data-entry mismatch, not a
  // real alternate org. The one sheet row for the Ad Valorem 5% reduction
  // (Dept_Code 102389 / Revenue_Code 389001) actually needs to sum two
  // separate per-fund accounts in Supabase, since the 5% statutory
  // reduction applies separately to each fund that levies Ad Valorem tax:
  // org 001389 (General Fund) and org 105389 (Mosquito Control), both
  // Revenue_Code 389001. (The Sheriff Fund's own version of this account is
  // deliberately left out.) Unlike DEPT_CODE_ACTUALS_ALIASES (a real org
  // with multiple legitimate codes, summed because they're genuinely the
  // same account), this overrides the org/object lookups outright for the
  // one sheet row affected.
  // org 201389 / object 389000 ($55,000) is a separate, legitimate
  // Nonoperating Balance Brought Forward account with no sheet row of its
  // own -- folded into the Board of County Commissioners' own 001389/389000
  // row (already in the same Other Sources / Nonoperating Balance merge
  // group on combineByName summaries) rather than redirected away from it.
  const SUPABASE_LOOKUP_OVERRIDES = new Map([
    ["102389|389001", [{ org: "001389", object: "389001" }, { org: "105389", object: "389001" }]],
    ["001389|389000", [{ org: "001389", object: "389000" }, { org: "201389", object: "389000" }]]
  ]);

  // The FY2027 Proposed budget for Dept_Code 101312 / Revenue_Code 312410
  // (Local Option Fuel Tax) is intentionally split across two sheet rows,
  // "Public Works" and "Engineering Services" -- a real planning-budget
  // split (Engineering became its own in-house division only in the last
  // couple of years; see its "In-House Engineering Savings" card). But
  // there is only ONE real ledger account behind both rows, and Supabase
  // has no way to know it's split -- without this override, both rows
  // independently look up the SAME org+object and each get the FULL
  // historical actual for the whole account, so Engineering's page
  // appeared to "receive" the entire county fuel-tax revenue on top of
  // Public Works also showing the same full total. Engineering's actual
  // revenue isn't separately tracked, so its historical actual is left at
  // the sheet's own (unset -> 0) value rather than duplicating Public
  // Works' real figure.
  const ZERO_ACTUAL_REVENUE_ROWS = new Set(["101312|engineering services|312410"]);

  function supabaseLookupsForRow(row, org, codeValue) {
    const key = String((row && row.Dept_Code) || "").trim() + "|" + String(codeValue || "").trim();
    const deptNorm = normalizeDeptName(row && row.Dept_Name);
    if (ZERO_ACTUAL_REVENUE_ROWS.has(String((row && row.Dept_Code) || "").trim() + "|" + deptNorm + "|" + String(codeValue || "").trim())) {
      return [];
    }
    const lookups = SUPABASE_LOOKUP_OVERRIDES.get(key) || [{ org: org, object: codeValue }];
    if (
      deptNorm === "code compliance" &&
      String(codeValue || "").trim() === "329004"
    ) {
      return lookups.map((lookup) => ({ ...lookup, excludedProjects: ["10647"] }));
    }
    // Beach Vending Permits' Project 10647 ($1,530,000 committed to Board
    // initiatives) is booked on its own Board of County Commissioners row,
    // separate from Code Compliance's general Beach Vending collections
    // (excluded above so the two don't double up). Without this, BCC's row
    // pulled every project under this org+code -- including Code
    // Compliance's own blank-project total a second time -- instead of
    // just its own committed slice.
    if (
      deptNorm === "board of county commissioners" &&
      String(codeValue || "").trim() === "329004"
    ) {
      return lookups.map((lookup) => ({ ...lookup, projectScope: "10647" }));
    }
    if (deptNorm === "planning" && row && row.Object_Code !== undefined) {
      return lookups.map((lookup) => ({ ...lookup, excludedProjects: ["10639"] }));
    }
    if (
      deptNorm === "libraries" &&
      String(codeValue || "").trim() === "334700" &&
      isLibraryProjectRevenueRow(row)
    ) {
      return lookups.map((lookup) => ({ ...lookup, projectScope: LIBRARY_GRANT_PROJECT_CODE }));
    }
    return lookups;
  }

  // The Ad Valorem 5% statutory reduction's one sheet row (Dept_Code
  // 102389) is filed under fund "102", which isn't one of the funds shown
  // on the Fund Financial Schedules page -- so on a fund-scoped table this
  // row is invisible and the reduction never gets subtracted from the
  // fund(s) it actually applies to (see SUPABASE_LOOKUP_OVERRIDES above).
  // The county-wide Consolidated Revenue Summary doesn't filter by fund the
  // same way, so it already nets this out correctly; a fund-scoped table
  // has to pull each fund's own share back out of Supabase directly.
  const AD_VALOREM_FIVE_PERCENT_ORG_BY_FUND = { "001": "001389", "105": "105389" };

  function isAdValoremFivePercentRow(row) {
    return String((row && row.Dept_Code) || "").trim() === "102389" && String((row && row.Revenue_Code) || "").trim() === "389001";
  }

  function adValoremFivePercentReductionForFunds(fundCodes) {
    const rows = cache.originalBudgetRows || [];
    let total = 0;
    (fundCodes || []).forEach((fundCode) => {
      const org = AD_VALOREM_FIVE_PERCENT_ORG_BY_FUND[fundCode];
      if (!org) return;
      const result = sumRawActualsForAccount(rows, org, "389001", 2026);
      if (result.matched) total += result.total;
    });
    return total ? -Math.abs(total) : 0;
  }

  // Sums sumRawActualsForAccount across every (org, object) lookup for a
  // row (normally just the row's own org/code, but several when an
  // override above applies), matched if any of them found data.
  function sumRawActualsForLookups(rawRows, lookups, year, projectScope) {
    let matched = false;
    let forceMatchedScope = false;
    let total = 0;
    (lookups || []).forEach((lookup) => {
      const lookupProjectScope = lookup.projectScope !== undefined ? lookup.projectScope : projectScope;
      if (lookup.projectScope !== undefined) forceMatchedScope = true;
      const result = sumRawActualsForAccount(rawRows, lookup.org, lookup.object, year, lookupProjectScope, lookup.excludedProjects);
      if (result.matched) {
        matched = true;
        total += result.total;
      }
    });
    return { matched: matched || forceMatchedScope, total };
  }

  // Department-specific data-limitation notices shown alongside a
  // department's budget lines (see renderBudgetLinesToggle's
  // departmentDataNote), keyed by normalized Dept_Name.
  const DEPARTMENT_DATA_NOTES = new Map([
    [
      "public defender",
      "Prior years do not include funding for court technology needs for the Public Defender. Those years are smaller because future years now capture this accounting change for transparency and accurate reporting."
    ],
    [
      "court technology public defender",
      "Prior years do not include funding for court technology needs for the Public Defender. Those years are smaller because future years now capture this accounting change for transparency and accurate reporting."
    ],
    [
      "state attorney",
      "Prior years do not include funding for court technology needs for the State Attorney. Those years are smaller because future years now capture this accounting change for transparency and accurate reporting."
    ],
    [
      "court technology state attorney",
      "Prior years do not include funding for court technology needs for the State Attorney. Those years are smaller because future years now capture this accounting change for transparency and accurate reporting."
    ]
  ]);

  // Departments/programs excluded from the auto-generated "actuals aren't
  // captured due to an accounting change" note (see renderBudgetLinesToggle's
  // generatedActualsNoteText) -- that wording is wrong for a program that
  // simply didn't exist yet in those early years, as opposed to one whose
  // historical actuals were genuinely lost to a later accounting change.
  const GENERATED_ACTUALS_NOTE_EXCLUDED_DEPT_NAMES = new Set(
    ["Eagle Springs Grill"].map(normalizeDeptName)
  );

  function applyActualsToRows(rows, rawActualRows) {
    if (!rawActualRows || !rawActualRows.length) return rows;

    // Several FY2027 budget lines can share one department+account (e.g.
    // multiple itemized equipment purchases under object 564000). The
    // account-level actual total only needs computing once per group;
    // every other row in that group is zeroed so a total doesn't multiply
    // it by however many budget lines exist under that account. Dept_Name is
    // part of the group key (not just Dept_Code) because some departments
    // split one Dept_Code across multiple Dept_Names/sub-programs (e.g. Code
    // Compliance / Code Compliance Beach both under 00102030) -- actuals
    // aren't tracked at that sub-program grain, so each Dept_Name still
    // needs its own (undivided, department-wide) actual total rather than
    // having a sibling Dept_Name's row claim it and leave this one at zero.
    // Cross-Dept_Name double-counting at the fund level is guarded against
    // separately in buildFundFinancialSchedule's sumFor.
    const seenGroups = new Set();
    return (rows || []).map((row) => {
      // Expense rows key on Object_Code; revenue rows have no Object_Code
      // at all and key on Revenue_Code instead.
      const codeValue = row.Object_Code !== undefined ? row.Object_Code : row.Revenue_Code;
      const org = row.Dept_Code;
      const projectScope = projectScopeForRow(row);
      // Project scope is appended to the group key (only when defined, so
      // every other department's grouping is unaffected) for rows like
      // Statutory & Other's, where several different recipients share one
      // org+account and must each get their own group instead of collapsing
      // into one and zeroing the rest.
      const groupKey = String(org || "").trim() + "|" + String(row.Dept_Name || "").trim() + "|" + String(codeValue || "").trim() +
        (projectScope !== undefined ? "|" + projectScope : "");
      const isFirstInGroup = !seenGroups.has(groupKey);
      seenGroups.add(groupKey);

      const next = { ...row };
      if (!isFirstInGroup) {
        HISTORICAL_ACTUAL_YEARS.forEach((year) => {
          next["FY" + year + "_Actual"] = 0;
        });
        next._actualsDeduped = true;
        return next;
      }

      const lookups = supabaseLookupsForRow(row, org, codeValue);
      HISTORICAL_ACTUAL_YEARS.forEach((year) => {
        const field = "FY" + year + "_Actual";
        const result = sumRawActualsForLookups(rawActualRows, lookups, year, projectScope);
        next[field] = result.matched ? result.total : (row[field] || 0);
      });
      if (
        normalizeDeptName(next.Dept_Name) === "recreation" &&
        String(next.Object_Code || "").trim() === "563000"
      ) {
        next.FY2020_Actual = 0;
      }
      return next;
    });
  }

  // FY2026 Original Budget comes from the Supabase BUC cache
  // (expense_original_budget_public). Despite the legacy view name, the
  // BUC source can include revenue and expense codes, so this is applied to
  // both datasets below. Same department+account-level grain and the same
  // sum-across-projects treatment as applyActualsToRows above.
  function applyOriginalBudgetToRows(rows, rawBudgetRows) {
    if (!rawBudgetRows || !rawBudgetRows.length) return rows;

    const seenGroups = new Set();
    return (rows || []).map((row) => {
      const codeValue = row.Object_Code !== undefined ? row.Object_Code : row.Revenue_Code;
      const org = row.Dept_Code;
      const projectScope = projectScopeForRow(row);
      const groupKey = String(org || "").trim() + "|" + String(row.Dept_Name || "").trim() + "|" + String(codeValue || "").trim() +
        (projectScope !== undefined ? "|" + projectScope : "");
      const isFirstInGroup = !seenGroups.has(groupKey);
      seenGroups.add(groupKey);

      if (!isFirstInGroup) {
        return { ...row, FY2026_Original_Budget: 0, _originalBudgetDeduped: true };
      }

      const lookups = supabaseLookupsForRow(row, org, codeValue);
      const result = sumRawActualsForLookups(rawBudgetRows, lookups, 2026, projectScope);
      // A plug override (currently just Beach Vending Permits' BCC/Project
      // 10647 row, $1,530,000 committed to Board initiatives) is a known,
      // deliberately-set figure -- it wins even when the BUC lookup finds
      // a match, since a partial/mismatched BUC total for the same
      // org+code+project shouldn't quietly replace a number known to be
      // correct.
      const plugOverride = revenueFy2026PlugOverride(row);
      return { ...row, FY2026_Original_Budget: plugOverride || (result.matched ? result.total : (row.FY2026_Original_Budget || row.FY2026_Budget || 0)) };
    });
  }

  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Only http(s)/mailto links are allowed through; anything else
  // (javascript:, data:, vbscript:, a bare "//evil.com", etc.) is rejected
  // so a sheet editor can't turn narrative text into an XSS vector.
  function sanitizeNarrativeUrl(url) {
    const trimmed = String(url || "").trim();
    return /^(https?:|mailto:)/i.test(trimmed) ? trimmed : "";
  }

  // Renders narrative text pulled from Google Sheets: escapes it for safe
  // HTML output, then converts markdown-style **bold** spans into <strong>
  // and [Link Text](https://example.com) spans into target="_blank" links.
  // Used for Statement of Function, Mission, Budget Highlights, and any
  // other narrative content loaded from the sheets.
  function formatNarrativeText(value) {
    const text = String(value === undefined || value === null ? "" : value);
    const pattern = /\*\*(.+?)\*\*|\[([^[\]]+)\]\(([^()\s]+)\)/gs;
    let result = "";
    let lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      result += escapeHtml(text.slice(lastIndex, match.index));
      if (match[1] !== undefined) {
        result += "<strong>" + escapeHtml(match[1]) + "</strong>";
      } else {
        const linkText = escapeHtml(match[2]);
        const safeUrl = sanitizeNarrativeUrl(match[3]);
        result += safeUrl
          ? '<a href="' + escapeHtml(safeUrl) + '" target="_blank" rel="noopener noreferrer">' + linkText + "</a>"
          : linkText;
      }
      lastIndex = pattern.lastIndex;
    }
    result += escapeHtml(text.slice(lastIndex));
    return result;
  }

  // Splits a raw narrative cell's text into paragraphs. Google Sheets cells
  // can contain multiple paragraphs separated by blank lines (or multiple
  // consecutive line breaks); this normalizes line endings, splits on those
  // blank-line boundaries, trims each result, and drops empty entries while
  // preserving original order. Used for any long-form narrative field loaded
  // from Google Sheets (Statement of Function, mission statements, department
  // descriptions, budget highlights, etc.), not just one specific field.
  function splitIntoParagraphs(text) {
    if (!text) return [];
    const normalized = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    return normalized
      .split(/\n\s*\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  function ensureTooltipBubble() {
    let bubble = document.querySelector(".wc-budget-line-tooltip-bubble");
    if (!bubble) {
      bubble = document.createElement("div");
      bubble.className = "wc-budget-line-tooltip-bubble";
      bubble.setAttribute("role", "tooltip");
      document.body.appendChild(bubble);
    }
    return bubble;
  }

  function positionTooltip(anchor, bubble) {
    const rect = anchor.getBoundingClientRect();
    const width = window.innerWidth <= 600 ? Math.max(220, window.innerWidth - 32) : Math.min(320, window.innerWidth - 32);
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(16, Math.min(left, window.innerWidth - width - 16));
    let top = rect.bottom + 8;
    bubble.style.setProperty("width", width + "px", "important");
    bubble.style.setProperty("left", left + "px", "important");
    bubble.style.setProperty("top", top + "px", "important");
    if (top + bubble.offsetHeight > window.innerHeight - 16) {
      top = Math.max(16, rect.top - bubble.offsetHeight - 8);
      bubble.style.setProperty("top", top + "px", "important");
    }
  }

  function bindTooltipAnchors(container) {
    if (!container) return;
    container.querySelectorAll(".wc-budget-line-tooltip-anchor").forEach((anchor) => {
      if (anchor.getAttribute("data-wc-tooltip-bound") === "true") return;
      const show = () => {
        const bubble = ensureTooltipBubble();
        bubble.textContent = anchor.getAttribute("data-wc-tooltip") || "";
        bubble.classList.add("is-visible");
        positionTooltip(anchor, bubble);
      };
      const hide = () => {
        const bubble = document.querySelector(".wc-budget-line-tooltip-bubble");
        if (bubble) bubble.classList.remove("is-visible");
      };
      anchor.addEventListener("mouseenter", show);
      anchor.addEventListener("focus", show);
      anchor.addEventListener("mouseleave", hide);
      anchor.addEventListener("blur", hide);
      anchor.setAttribute("data-wc-tooltip-bound", "true");
    });
  }

  function categoryCellHtml(label, showTooltip) {
    const message = showTooltip === false ? null : TYPE_TOOLTIPS[label];
    const anchor = message
      ? '<button type="button" class="wc-budget-line-tooltip-anchor" aria-label="' +
        escapeHtml(label) + ' information" data-wc-tooltip="' + escapeHtml(message) + '">i</button>'
      : "";
    return '<td class="wc-budget-line-tooltip-cell">' + escapeHtml(label || "Other") + anchor + "</td>";
  }

  function categoryLabelHtml(label, showTooltip) {
    const message = showTooltip === false ? null : TYPE_TOOLTIPS[label];
    const anchor = message
      ? '<button type="button" class="wc-budget-line-tooltip-anchor" aria-label="' +
        escapeHtml(label) + ' information" data-wc-tooltip="' + escapeHtml(message) + '">i</button>'
      : "";
    return '<span class="wc-budget-line-tooltip-label">' + escapeHtml(label || "Other") + anchor + "</span>";
  }

  function toNumber(value) {
    if (value === null || value === undefined) return 0;
    let s = String(value).trim();
    if (!s || s === "-" || s === "–" || s.toUpperCase() === "N/A") return 0;
    let negative = false;
    if (/^\(.*\)$/.test(s)) {
      negative = true;
      s = s.slice(1, -1);
    }
    s = s.replace(/[$,%]/g, "").trim();
    const n = parseFloat(s);
    if (!Number.isFinite(n)) return 0;
    return negative ? -n : n;
  }

  function formatCurrency(value, decimals) {
    const n = typeof value === "number" ? value : toNumber(value);
    const d = typeof decimals === "number" ? decimals : 0;
    const formatted = Math.abs(n).toLocaleString("en-US", {
      minimumFractionDigits: d,
      maximumFractionDigits: d
    });
    return (n < 0 ? "-$" : "$") + formatted;
  }

  function formatCompactCurrency(value) {
    const n = typeof value === "number" ? value : toNumber(value);
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs >= 1000000000) return sign + "$" + (abs / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
    if (abs >= 1000000) return sign + "$" + (abs / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (abs >= 1000) return sign + "$" + (abs / 1000).toFixed(0) + "K";
    return sign + "$" + abs.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  function formatNumber(value, decimals) {
    const n = typeof value === "number" ? value : toNumber(value);
    const d = typeof decimals === "number" ? decimals : (n % 1 !== 0 ? 1 : 0);
    return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function uniqueSorted(values) {
    return Array.from(
      new Set(
        values
          .filter(Boolean)
          .map((v) => String(v).trim())
          .filter((v) => v && v.toUpperCase() !== "#N/A")
      )
    ).sort((a, b) => a.localeCompare(b));
  }

  // RFC4180-style CSV parser: handles quoted fields, embedded commas/newlines,
  // and escaped quotes ("").
  function parseCSVRows(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    const src = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (inQuotes) {
        if (ch === '"') {
          if (src[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
        continue;
      }
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += ch;
      }
    }
    if (field.length || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows;
  }

  // Standard shape used by every other sheet on the site: first row is a
  // header, every row after it becomes one object keyed by that header.
  // Doesn't fit an irregular, multi-section reference sheet like the
  // Personnel Cost formula inputs -- see parseCSVRows/
  // parsePersonnelCostFormulaInputs for that one.
  function parseCSV(text) {
    const rows = parseCSVRows(text);
    if (!rows.length) return [];

    const headers = rows[0].map((h) => h.trim());
    return rows
      .slice(1)
      .filter((r) => r.some((cell) => String(cell || "").trim() !== ""))
      .map((r) => {
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = r[idx] !== undefined ? r[idx] : "";
        });
        return obj;
      });
  }

  function normalizeDeptName(name) {
    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  // Some Dept_Codes are shared by Dept_Names that are NOT the same
  // department split into sub-programs -- they're unrelated line items that
  // happen to book under one shared org code (e.g. Court Innovations and
  // Board of County Commissioners both sit on 00101000; Indigent Cremation
  // Program and Non-Profit Funding Program both sit on 00102014). Naively
  // grouping every row by Dept_Code alone would wrongly merge those into one
  // row. The actual sub-program splits that should collapse (Code
  // Compliance / Code Compliance Beach, Planning / Planning Short-Term
  // Rental) always have one Dept_Name that's a literal prefix of the other,
  // so only those are clustered here -- the shorter, prefix name becomes the
  // cluster's representative/display name. Used by both
  // renderExpenseDepartmentBudgetLinesFooter and buildFundFinancialSchedule's
  // activity breakdowns.
  function clusterDeptNamesByCode(allRows) {
    const namesByCode = new Map();
    allRows.forEach((r) => {
      const code = String(r.Dept_Code || "").trim();
      const name = r.Dept_Name || "";
      if (!code || !name) return;
      if (!namesByCode.has(code)) namesByCode.set(code, new Set());
      namesByCode.get(code).add(name);
    });
    const repByCodeAndName = new Map();
    namesByCode.forEach((nameSet, code) => {
      const names = Array.from(nameSet).sort((a, b) => a.length - b.length);
      const repMap = new Map();
      names.forEach((name) => {
        if (repMap.has(name)) return;
        repMap.set(name, name);
        const norm = name.trim().toLowerCase();
        names.forEach((other) => {
          if (other === name || repMap.has(other)) return;
          if (other.trim().toLowerCase().startsWith(norm)) repMap.set(other, name);
        });
      });
      repByCodeAndName.set(code, repMap);
    });
    return repByCodeAndName;
  }

  function representativeDeptName(repByCodeAndName, r) {
    const code = String(r.Dept_Code || "").trim();
    const repMap = code && repByCodeAndName.get(code);
    return (repMap && repMap.get(r.Dept_Name)) || r.Dept_Name || "Unknown";
  }

  function expenseDisplayDeptName(repByCodeAndName, r) {
    const name = representativeDeptName(repByCodeAndName, r);
    if (normalizeDeptName(name) === "unclassified") {
      if (
        String((r && r.Dept_Code) || "").trim() === "00102012" &&
        normalizeDeptName(expenseActivityForRow(r)) === "human services"
      ) {
        return "Statutory & Other";
      }
      // A raw sheet row can carry Dept_Name "Unclassified" even though its
      // Dept_Code is a real, named entry in the activities/department
      // catalog -- e.g. the Tourist Development Fund's Beach Operations/
      // Beach Renourishment/Sales and Visitors Center/Communications/
      // Marketing/Beach Tram sub-departments (111410xx), which the sheet
      // never carries a real Dept_Name for. Try that catalog entry before
      // falling all the way back to the generic fund name.
      const deptCode = String((r && r.Dept_Code) || "").trim();
      const catalogEntry = deptCode && (cache.activities || []).find((a) => String(a.Dept_Code || "").trim() === deptCode);
      if (catalogEntry && catalogEntry.Dept_Name && normalizeDeptName(catalogEntry.Dept_Name) !== "unclassified") {
        return catalogEntry.Dept_Name;
      }
      return fundNameForRow(r);
    }
    return name;
  }

  function matchNames(deptName) {
    const norm = normalizeDeptName(deptName);
    const set = new Set([norm]);
    (DEPT_ALIASES[norm] || []).forEach((alias) => set.add(alias));
    return set;
  }

  function rowsByDeptName(rows, deptName) {
    if (!deptName) return [];
    const set = matchNames(deptName);
    return rows.filter((r) => set.has(normalizeDeptName(r.Dept_Name)));
  }

  function rowsByDeptCode(rows, deptCode) {
    if (!deptCode) return [];
    const code = String(deptCode).trim();
    return rows.filter((r) => String(r.Dept_Code || "").trim() === code);
  }

  function rowsForDepartment(rows, deptName, deptCode) {
    rows = rows || [];
    if (deptCode) {
      const byCode = rowsByDeptCode(rows, deptCode);
      if (byCode.length) return byCode;
    }
    return rowsByDeptName(rows, deptName);
  }

  function rowsForExactDepartment(rows, deptName) {
    const norm = normalizeDeptName(deptName);
    return (rows || []).filter((r) => normalizeDeptName(r.Dept_Name) === norm);
  }

  function getDepartmentNameFromPage() {
    const explicit = document.querySelector("[data-department]");
    if (explicit && explicit.dataset.department && explicit.dataset.department.trim()) {
      return explicit.dataset.department.trim();
    }
    const h1 = document.querySelector("h1.page-title");
    return h1 ? h1.textContent.trim() : "";
  }

  function getDeptCodeFromPage() {
    const el = document.querySelector("[data-dept-code]");
    return el && el.dataset.deptCode ? el.dataset.deptCode.trim() : "";
  }

  function getFundCodeFromPage() {
    const el = document.querySelector("[data-fund-code]");
    return el && el.dataset.fundCode ? el.dataset.fundCode.trim() : "";
  }

  function getDepartmentExpenses(deptName, deptCode) {
    return rowsForDepartment(cache.expenditures, deptName, deptCode);
  }

  function combineEagleSpringsProShopSalesRows(rows, deptName) {
    if (normalizeDeptName(deptName) !== "eagle springs golf and recreation center") return rows;

    const amountFields = HISTORICAL_ACTUAL_YEARS.map((year) => "FY" + year + "_Actual")
      .concat(["FY2026_Original_Budget", "FY2026_Budget", "FY2026_Plug", "FY2027_Proposed"]);
    const combined = [];
    let proShopRow = null;

    (rows || []).forEach((row) => {
      const revenueName = normalizeDeptName(row && row.Revenue_Name);
      const isProShopSales = revenueName.includes("pro shop") && revenueName.includes("sales");
      if (!isProShopSales) {
        combined.push(row);
        return;
      }

      if (!proShopRow) {
        proShopRow = Object.assign({}, row, {
          Revenue_Code: String(row.Revenue_Code || "").trim(),
          Revenue_Name: "Pro Shop Sales"
        });
        combined.push(proShopRow);
        return;
      }

      const code = String(row.Revenue_Code || "").trim();
      if (code && !splitBudgetLineCodes(proShopRow.Revenue_Code).includes(code)) {
        proShopRow.Revenue_Code = [proShopRow.Revenue_Code, code].filter(Boolean).join(", ");
      }
      amountFields.forEach((field) => {
        proShopRow[field] = (proShopRow[field] || 0) + (row[field] || 0);
      });
    });

    return combined;
  }

  function isMossyHeadWastewaterDept(deptName) {
    return normalizeDeptName(deptName) === "mossy head wastewater treatment facility";
  }

  function isTransferInRevenueRow(row) {
    const name = normalizeDeptName(row && row.Revenue_Name);
    const type = normalizeDeptName(row && row.Revenue_Type);
    return (
      name === "interfund group transfer in" ||
      name.includes("transfer in") ||
      (type.includes("transfer") && type.includes("in"))
    );
  }

  function suppressMossyHeadTransferInPriorYears(rows, deptName) {
    if (!isMossyHeadWastewaterDept(deptName)) return rows;
    return (rows || []).map((row) => {
      if (!isTransferInRevenueRow(row)) return row;
      const next = Object.assign({}, row);
      HISTORICAL_ACTUAL_YEARS.forEach((year) => {
        next["FY" + year + "_Actual"] = 0;
      });
      next.FY2026_Original_Budget = next.FY2026_Budget || next.FY2026_Plug || 0;
      next._actualsSuppressed = true;
      next._suppressRevenueBudgetFallback = true;
      return next;
    });
  }

  function suppressMsbuAdValoremRows(rows, deptName) {
    if (normalizeDeptName(deptName) !== "municipal service benefit unit fund") return rows;
    return (rows || []).filter((row) => {
      const code = String((row && row.Revenue_Code) || "").trim();
      const name = normalizeDeptName(row && row.Revenue_Name);
      return code !== "311000" &&
        code !== "311001" &&
        !isAdValoremFivePercentRow(row) &&
        name !== "ad valorem taxes";
    });
  }

  function combineStateAttorneyAdValoremRows(rows, deptName) {
    const normalizedDeptName = normalizeDeptName(deptName);
    if (normalizedDeptName !== "state attorney" && normalizedDeptName !== "mosquito control") return rows;
    const amountFields = HISTORICAL_ACTUAL_YEARS.map((year) => "FY" + year + "_Actual")
      .concat(["FY2026_Original_Budget", "FY2026_Budget", "FY2026_Plug", "FY2027_Proposed"]);
    const combined = [];
    let adValoremRow = null;

    (rows || []).forEach((row) => {
      const code = String((row && row.Revenue_Code) || "").trim();
      const name = normalizeDeptName(row && row.Revenue_Name);
      const isAdValorem = code === "311000" || code === "311001" || name === "ad valorem taxes";
      if (!isAdValorem) {
        combined.push(row);
        return;
      }

      if (!adValoremRow) {
        adValoremRow = Object.assign({}, row, {
          Revenue_Code: code,
          Revenue_Name: "Ad Valorem Taxes"
        });
        combined.push(adValoremRow);
        return;
      }

      if (code && !splitBudgetLineCodes(adValoremRow.Revenue_Code).includes(code)) {
        adValoremRow.Revenue_Code = [adValoremRow.Revenue_Code, code].filter(Boolean).join(", ");
      }
      amountFields.forEach((field) => {
        adValoremRow[field] = (adValoremRow[field] || 0) + (row[field] || 0);
      });
      if (!adValoremRow.Note && row.Note) adValoremRow.Note = row.Note;
    });

    return combined;
  }

  function filterLibraryProjectGrantRevenueRows(rows, deptName) {
    if (normalizeDeptName(deptName) !== "libraries") return rows;
    return (rows || []).filter((row) => {
      const name = String((row && row.Revenue_Name) || "");
      if (!/^State Grant\b/.test(name)) return true;
      return isLibraryProjectRevenueRow(row);
    });
  }

  function getDepartmentRevenues(deptName, deptCode) {
    return filterLibraryProjectGrantRevenueRows(suppressMsbuAdValoremRows(
      suppressMossyHeadTransferInPriorYears(
        combineStateAttorneyAdValoremRows(
          combineEagleSpringsProShopSalesRows(rowsForDepartment(cache.revenues, deptName, deptCode), deptName),
          deptName
        ),
        deptName
      ),
      deptName
    ), deptName);
  }

  const ZERO_ROW_FILTER_DEPT_NAMES = new Set([
    "municipal service benefit unit fund",
    "mosquito control",
    "mosquito control state aid",
    "mossy head wastewater treatment facility"
  ]);

  const ZERO_ROW_VISIBLE_AMOUNT_FIELDS = HISTORICAL_ACTUAL_YEARS.map((year) => "FY" + year + "_Actual")
    .concat(["FY2026_Original_Budget", "FY2026_Budget", "FY2026_Plug", "FY2027_Proposed"]);

  function filterAllZeroRowsForSelectedDepartments(rows, deptName) {
    if (!ZERO_ROW_FILTER_DEPT_NAMES.has(normalizeDeptName(deptName))) return rows;
    return (rows || []).filter((row) =>
      ZERO_ROW_VISIBLE_AMOUNT_FIELDS.some((field) => Math.abs(toNumber(row && row[field])) > 0.005)
    );
  }

  // For department-page revenue cards only: when one or more revenue rows have
  // no historical actuals at all (every FY 2020–2025 field is $0) — typical
  // for ad valorem / General Fund lines whose tax revenue isn't tracked at the
  // department level — backfill those rows so the card shows what was actually
  // needed each year.
  //
  // The fill value for year Y is:  expense total − sum of actuals on the rows
  // that DO have real data.  That makes the grand revenue total equal the
  // actual expense for that year, which is exactly "what revenue was needed."
  // When there are multiple zero-actual rows they share the gap proportionally
  // to their FY 2027 Proposed budget weights (or equally if all are $0).
  //
  // The underlying cache.revenues data is never modified, so Summary of
  // Revenue and every other aggregate table are unaffected.
  function revenueActualsAreDedicatedToDepartmentRow(row, codeField) {
    codeField = codeField || "Revenue_Code";
    const code = String((row && row[codeField]) || "").trim();
    if (!code) return true;
    const fundCode = fundCodeForRow(row);
    const departmentNames = new Set();
    (cache.revenues || []).forEach((candidate) => {
      if (String(candidate[codeField] || "").trim() !== code) return;
      if (fundCodeForRow(candidate) !== fundCode) return;
      const name = normalizeDeptName(candidate.Dept_Name);
      if (name) departmentNames.add(name);
    });
    return departmentNames.size <= 1;
  }

  function isGeneralFundRevenuePlugRow(row) {
    const code = String((row && row.Revenue_Code) || "").trim();
    return (
      code === "311000" ||
      code === "335180" ||
      normalizeDeptName(row && row.Revenue_Name) === "ad valorem taxes" ||
      normalizeDeptName(row && row.Revenue_Name) === "local government 1 2 cent sales tax"
    );
  }

  function isRevenueGapFillRow(row) {
    const dept = normalizeDeptName(row && row.Dept_Name);
    const code = String((row && row.Revenue_Code) || "").trim();
    const name = normalizeDeptName(row && row.Revenue_Name);
    if (dept === "mosquito control" && (code === "311000" || name === "ad valorem taxes")) {
      return false;
    }
    if (dept === "building construction and maintenance") {
      return code === "311000" || name === "ad valorem taxes";
    }
    // Engineering Services' only revenue row (Local Option Fuel Tax,
    // 312410) is intentionally zeroed at the actuals layer -- see
    // ZERO_ACTUAL_REVENUE_ROWS -- since that account's real ledger total
    // belongs to Public Works, not Engineering. Engineering still has its
    // own real expenditures in years it existed as an in-house division
    // (FY2023-2025), so this designates that same row as the department's
    // plug: revenue backfills to match expenses for years with real
    // spending, and stays $0 for FY2022 (when Engineering had no
    // expenditures either).
    if (dept === "engineering services") {
      return code === "312410" || name === "local option fuel tax";
    }
    return isGeneralFundRevenuePlugRow(row);
  }

  const INDIRECT_ADMIN_PRIOR_YEAR_SUPPRESSED_DEPTS = new Set([
    "board of county commissioners",
    "building construction and maintenance",
    "county administration",
    "office of management and budget",
    "purchasing",
    "procurement",
    "geographic info systems",
    "geographic information systems",
    "human resources",
    "office of the county attorney",
    "office of county attorney"
  ]);

  const STATE_REVENUE_SHARE_PRIOR_YEAR_SUPPRESSED_DEPTS = new Set([
    "building construction and maintenance",
    "office of the county attorney",
    "office of county attorney"
  ]);

  function isRevenueGapExcludedRow(row) {
    const dept = normalizeDeptName(row && row.Dept_Name);
    const code = String((row && row.Revenue_Code) || "").trim();
    const name = normalizeDeptName(row && row.Revenue_Name);
    if (dept === "mosquito control" && (code === "311000" || name === "ad valorem taxes")) {
      return false;
    }
    return (
      isGeneralFundRevenuePlugRow(row) ||
      (
        dept === "building construction and maintenance" &&
        (
          code === "335121" ||
          name === "indirect administrative fees"
        )
      ) ||
      (
        STATE_REVENUE_SHARE_PRIOR_YEAR_SUPPRESSED_DEPTS.has(dept) &&
        (
          code === "335121" ||
          name === "state revenue share proceeds"
        )
      ) ||
      (
        dept === "engineering services" &&
        (
          code === "312410" ||
          name === "local option fuel tax"
        )
      ) ||
      (
        INDIRECT_ADMIN_PRIOR_YEAR_SUPPRESSED_DEPTS.has(dept) &&
        name === "indirect administrative fees"
      )
    );
  }

  function isSheriffRevenueDept(row) {
    const dept = normalizeDeptName(row && row.Dept_Name);
    return dept === "sheriff" || dept === "walton county sheriff s office" || dept === "walton county sheriffs office";
  }


  function suppressExcludedRevenuePriorYearRows(revenueRows) {
    return (revenueRows || []).map((row) => {
      if (!isRevenueGapExcludedRow(row) || isRevenueGapFillRow(row)) return row;
      const cloned = Object.assign({}, row);
      HISTORICAL_ACTUAL_YEARS.forEach((y) => {
        cloned["FY" + y + "_Actual"] = 0;
      });
      if (["office of the county attorney", "office of county attorney"].includes(normalizeDeptName(row && row.Dept_Name))) {
        cloned.FY2026_Original_Budget = cloned.FY2026_Budget || cloned.FY2026_Plug || 0;
        cloned._suppressRevenueBudgetFallback = true;
      }
      cloned._actualsSuppressed = true;
      return cloned;
    });
  }

  function departmentRevenueFy2026PlugOverrideForRows(rows) {
    const names = new Set((rows || []).map((row) => normalizeDeptName(row && row.Dept_Name)).filter(Boolean));
    if (names.has("public defender") || names.has("court technology public defender")) return 152439;
    return 0;
  }

  function departmentRevenueFy2026PlugOverrideForRow(row) {
    const dept = normalizeDeptName(row && row.Dept_Name);
    if (dept !== "public defender" && dept !== "court technology public defender") return 0;
    return isRevenueGapFillRow(row) ? 152439 : 0;
  }

  function applyDepartmentRevenueFy2026PlugOverrides(rows) {
    const override = departmentRevenueFy2026PlugOverrideForRows(rows);
    if (!override) return rows;
    return (rows || []).map((row) => {
      if (!departmentRevenueFy2026PlugOverrideForRow(row)) return row;
      return {
        ...row,
        FY2026_Original_Budget: override,
        FY2026_Budget: override,
        _suppressRevenueBudgetFallback: true
      };
    });
  }

  function fillRevenueActualsFromExpenses(revenueRows, expenseRows) {
    const baseRevenueRows = applyDepartmentRevenueFy2026PlugOverrides(suppressExcludedRevenuePriorYearRows(revenueRows));
    if (!baseRevenueRows.length || !expenseRows.length) return baseRevenueRows;

    // Only the shared Ad Valorem / General Fund revenue line is a plug
    // candidate here. Other revenue codes can be reused across departments
    // but still represent real direct revenue for this department (permits,
    // fees, reimbursements, fines, etc.) and must be subtracted first.
    const gapRows = baseRevenueRows.filter(isRevenueGapFillRow);
    const knownRows = baseRevenueRows.filter((row) => !isRevenueGapExcludedRow(row));

    if (!gapRows.length) return baseRevenueRows;

    // Expense totals per year.
    const expenseTotals = {};
    HISTORICAL_ACTUAL_YEARS.forEach((y) => {
      const field = "FY" + y + "_Actual";
      expenseTotals[y] = expenseRows.reduce((sum, r) => sum + (r[field] || 0), 0);
    });

    // For each year the gap = expense total minus what known rows already cover.
    const gapTotals = {};
    HISTORICAL_ACTUAL_YEARS.forEach((y) => {
      const field = "FY" + y + "_Actual";
      const knownTotal = knownRows.reduce((sum, r) => sum + revenueDisplayAmount(r[field] || 0), 0);
      gapTotals[y] = Math.max(0, expenseTotals[y] - knownTotal);
    });
    const fy2026ExpenseTotal = expenseRows.reduce((sum, r) => {
      return sum + (r.FY2026_Original_Budget || r.FY2026_Budget || 0);
    }, 0);
    const fy2026PlugOverride = departmentRevenueFy2026PlugOverrideForRows(baseRevenueRows);
    const fy2026KnownTotal = knownRows.reduce((sum, r) => {
      return sum + revenueDisplayAmount(r.FY2026_Original_Budget || r.FY2026_Budget || 0);
    }, 0);
    const fy2026GapTotal = fy2026PlugOverride || Math.max(0, fy2026ExpenseTotal - fy2026KnownTotal);

    // If there's nothing to fill in any year, leave rows as-is.
    if (!HISTORICAL_ACTUAL_YEARS.some((y) => gapTotals[y] > 0) && fy2026GapTotal <= 0) return baseRevenueRows;

    // Distribute gap across gapRows proportionally to FY2027 Proposed weight.
    const gapWeights = gapRows.map((r) => r.FY2027_Proposed || 0);
    const totalWeight = gapWeights.reduce((s, w) => s + w, 0);
    const weights = totalWeight > 0
      ? gapWeights.map((w) => w / totalWeight)
      : gapRows.map(() => 1 / gapRows.length);

    // Clone all rows; overwrite actuals only on gap rows.
    // _actualsBackfilled flags these rows so renderBudgetLinesToggle's
    // revenueActualsAreDedicatedToRow suppression is bypassed for shared
    // revenue codes (e.g. Ad Valorem) that normally return null for actuals.
    const gapSet = new Set(gapRows);
    let gapIndex = 0;
    return baseRevenueRows.map((row) => {
      if (!gapSet.has(row)) return row;
      const cloned = Object.assign({}, row);
      cloned._actualsBackfilled = true;
      const weight = weights[gapIndex++];
      HISTORICAL_ACTUAL_YEARS.forEach((y) => {
        cloned["FY" + y + "_Actual"] = gapTotals[y] * weight;
      });
      cloned.FY2026_Original_Budget = fy2026GapTotal * weight;
      return cloned;
    });
  }
  function getDepartmentStaffing(deptName, deptCode) {
    return rowsForDepartment(cache.staffing, deptName, deptCode);
  }
  function getDepartmentMachinery(deptName, deptCode) {
    return rowsForDepartment(cache.machinery, deptName, deptCode);
  }
  function getDepartmentPerformanceMeasures(deptName, deptCode) {
    return rowsForDepartment(cache.performanceMeasures, deptName, deptCode);
  }
  // Returns an array of narrative paragraphs. When the page's own name has a
  // direct row in the sheet, that row alone is authoritative. Otherwise (e.g.
  // a page like "Court Technology & Innovations" whose budget is split across
  // multiple differently-named rows in the sheet with no row of its own) all
  // distinct alias-matched narratives are combined.
  function getDepartmentNarrative(deptName, deptCode) {
    const rows = rowsForDepartment(cache.departmentNarratives, deptName, deptCode);
    const withText = rows.filter((r) => r.Narrative && r.Narrative.trim());
    if (!withText.length) return [];

    const norm = normalizeDeptName(deptName);
    const exact = withText.find((r) => normalizeDeptName(r.Dept_Name) === norm);
    if (exact) return splitIntoParagraphs(exact.Narrative);

    const seen = new Set();
    const paragraphs = [];
    withText.forEach((r) => {
      const text = r.Narrative.trim();
      if (!seen.has(text)) {
        seen.add(text);
        paragraphs.push(...splitIntoParagraphs(text));
      }
    });
    return paragraphs;
  }

  // ---- normalization of raw CSV rows into typed records ----

  const TOURISM_ADMINISTRATIVE_FEE_OBJECT_CODE = "549009";
  const TOURISM_ADMINISTRATIVE_FEE_DEPT_NAMES = new Set([
    "tourism administration",
    "sales and visitor center",
    "sales and visitors center",
    "tourism sales and visitor center",
    "tourism sales and visitors center",
    "communications",
    "tourism communications",
    "marketing",
    "tourism marketing",
    "north walton",
    "north walton tourist development tax",
    "tourism beach operations",
    "beach operations",
    "beach renourishment",
    "beach tram",
    "tourism beach tram",
    "tourism lifeguard services and beach safety",
    "south walton fire lifeguard services",
    "public safety"
  ]);

  function isTourismAdministrativeFeeExpense(row) {
    const dept = normalizeDeptName(row && row.Dept_Name);
    return (
      String((row && row.Object_Code) || "").trim() === TOURISM_ADMINISTRATIVE_FEE_OBJECT_CODE &&
      (dept.startsWith("tourism ") || TOURISM_ADMINISTRATIVE_FEE_DEPT_NAMES.has(dept))
    );
  }

  function applyTourismAdministrativeFeeOverrides(rows) {
    return (rows || []).map((row) => {
      if (!isTourismAdministrativeFeeExpense(row)) return row;
      return {
        ...row,
        Object_Name: "Administrative Fee",
        Object_Type: "Operating Expenditures"
      };
    });
  }

  function normalizeExpenditureRow(row) {
    const isTourismAdminFee = isTourismAdministrativeFeeExpense(row);
    return {
      Dept_Code: (row.Dept_Code || "").trim(),
      Dept_Name: (row.Dept_Name || "").trim(),
      Note: (row.Note || "").trim(),
      Contract_Status: (row.Contract_Status || "").trim(),
      Vendor: (row.Vendor || "").trim(),
      Contract_No: (row.Contract_No || "").trim(),
      Contract_Link: (row.Contract_Link || "").trim(),
      Project_Code: (row.Project_Code || "").trim(),
      Project_Name: (row.Project_Name || "").trim(),
      Object_Code: (row.Object_Code || "").trim(),
      Object_Name: isTourismAdminFee ? "Administrative Fee" : (row.Object_Name || "").trim(),
      Object_Type: isTourismAdminFee ? "Operating Expenditures" : (row.Object_Type || "").trim(),
      // Machinery, Vehicles & Equipment (Object_Code 564000) rows only --
      // "Vehicle" or "Equipment", used by the Summary of Machinery page's
      // Type filter (see buildMachineryRowsFromExpenditures).
      ME_Type: (row["M&E_type"] || "").trim(),
      // The asset number of the existing BCC-owned item this purchase
      // replaces -- blank when it's a new (non-replacement) purchase.
      BCC_Replacement: (row.BCC_Replacement || "").trim(),
      // Request-specific condition/context shown on the linked asset page.
      // Accept common header variants so the published sheet can use a
      // human-readable label without requiring a code change.
      Fleet_Note: (row.Fleet_Note || row["Fleet Note"] || row.Vehicle_Request_Note || row["Vehicle Request Note"] || "").trim(),
      FY2020_Actual: toNumber(row.FY2020_Actual),
      FY2021_Actual: toNumber(row.FY2021_Actual),
      FY2022_Actual: toNumber(row.FY2022_Actual),
      FY2023_Actual: toNumber(row.FY2023_Actual),
      FY2024_Actual: toNumber(row.FY2024_Actual),
      FY2025_Actual: toNumber(row.FY2025_Actual),
      FY2026_Budget: toNumber(row.FY2026_Budget),
      FY2026_Plug: revenueFy2026PlugOverride(row) || toNumber(row.FY2026_Plug || row.FY2026_Department_Plug || row.FY2026_Revenue_Plug),
      FY2027_Proposed: toNumber(row.FY2027_Proposed)
    };
  }

  function normalizeRevenueRow(row) {
    return {
      Dept_Code: (row.Dept_Code || "").trim(),
      Dept_Name: (row.Dept_Name || "").trim(),
      Note: (row.Note || "").trim(),
      Project_Code: (row.Project_Code || "").trim(),
      Project_Name: (row.Project_Name || "").trim(),
      Revenue_Code: (row.Revenue_Code || "").trim(),
      Revenue_Name: (row.Revenue_Name || "").trim(),
      Revenue_Type: (row.Revenue_Type || "").trim(),
      FY2020_Actual: toNumber(row.FY2020_Actual),
      FY2021_Actual: toNumber(row.FY2021_Actual),
      FY2022_Actual: toNumber(row.FY2022_Actual),
      FY2023_Actual: toNumber(row.FY2023_Actual),
      FY2024_Actual: toNumber(row.FY2024_Actual),
      FY2025_Actual: toNumber(row.FY2025_Actual),
      FY2026_Budget: toNumber(row.FY2026_Budget),
      FY2027_Proposed: toNumber(row.FY2027_Proposed)
    };
  }

  const PTO_BUYBACK_OBJECT_CODE = "512007";
  const REGULAR_SALARIES_OBJECT_CODE = "512000";
  const REGULAR_SALARIES_OBJECT_NAME = "Regular Salaries & Wages";
  const EXPENDITURE_MERGE_VALUE_FIELDS = HISTORICAL_ACTUAL_YEARS
    .map((year) => "FY" + year + "_Actual")
    .concat(["FY2026_Original_Budget", "FY2026_Budget", "FY2026_Plug", "FY2027_Proposed"]);

  function ptoBuybackMergeKey(row) {
    return [
      String((row && row.Dept_Code) || "").trim(),
      normalizeDeptName(row && row.Dept_Name),
      projectScopeForRow(row) === undefined ? "" : String(projectScopeForRow(row))
    ].join("|");
  }

  function canonicalizePtoBuybackRow(row, mergedCodes) {
    const next = {
      ...row,
      Object_Code: REGULAR_SALARIES_OBJECT_CODE,
      Object_Name: REGULAR_SALARIES_OBJECT_NAME
    };
    const codes = (mergedCodes || row._mergedObjectCodes || [])
      .map((code) => String(code || "").trim())
      .filter(Boolean);
    if (codes.length) next._mergedObjectCodes = uniqueSorted(codes);
    return next;
  }

  function mergePtoBuybackIntoRegularSalaries(rows) {
    const targetByKey = new Map();
    const output = [];

    (rows || []).forEach((row) => {
      const objectCode = String(row.Object_Code || "").trim();
      if (objectCode === PTO_BUYBACK_OBJECT_CODE) return;
      if (objectCode !== REGULAR_SALARIES_OBJECT_CODE) {
        output.push(row);
        return;
      }
      const target = canonicalizePtoBuybackRow(row);
      const key = ptoBuybackMergeKey(target);
      if (!targetByKey.has(key)) targetByKey.set(key, target);
      output.push(target);
    });

    (rows || []).forEach((row) => {
      if (String(row.Object_Code || "").trim() !== PTO_BUYBACK_OBJECT_CODE) return;
      const key = ptoBuybackMergeKey(row);
      const target = targetByKey.get(key);
      if (!target) {
        output.push(canonicalizePtoBuybackRow(row, [PTO_BUYBACK_OBJECT_CODE]));
        return;
      }
      EXPENDITURE_MERGE_VALUE_FIELDS.forEach((field) => {
        target[field] = (target[field] || 0) + (row[field] || 0);
      });
      target._mergedObjectCodes = uniqueSorted(
        (target._mergedObjectCodes || [REGULAR_SALARIES_OBJECT_CODE])
          .concat([PTO_BUYBACK_OBJECT_CODE])
      );
    });

    return output;
  }

  function normalizeStaffingRow(row) {
    return {
      Dept_Code: (row.Dept_Code || "").trim(),
      Dept_Name: (row.Dept_Name || "").trim(),
      Position_Name: (row.Position_Name || "").trim(),
      2024: toNumber(row["2024"]),
      2025: toNumber(row["2025"]),
      2026: toNumber(row["2026"]),
      2027: toNumber(row["2027"])
    };
  }

  function buildMachineryRowsFromExpenditures(rows) {
    return (rows || [])
      .filter((row) => String(row.Object_Code || "").trim() === "564000")
      .map((row) => {
        // Same fund lookup the contractual services page uses -- the fund
        // is the revenue source paying for each equipment request.
        const fundCode = fundCodeForRow(row);
        const fund = (cache.funds || []).find((f) => String(f.Fund_Code || "").trim() === fundCode);
        return {
          Dept_Code: row.Dept_Code || "",
          Dept_Name: row.Dept_Name || "",
          Fund_Code: fundCode,
          Fund_Name: (fund && fund.Fund_Name) || (fundCode ? "Fund " + fundCode : ""),
          Item_Description: row.Note || row.Project_Name || row.Object_Name || "Machinery & Equipment",
          Amount: row.FY2027_Proposed || 0,
          ME_Type: row.ME_Type || "",
          BCC_Replacement: row.BCC_Replacement || "",
          Fleet_Note: row.Fleet_Note || ""
        };
      })
      .filter((row) => row.Amount !== 0);
  }

  // Machinery, vehicles & equipment that departments requested but that
  // isn't included/funded in the FY2027 Proposed budget -- a separate
  // small sheet (not part of cache.expenditures) with the same shape as
  // the funded machinery rows above, shown as its own section on the
  // Summary of Machinery page so an unfunded request isn't mistaken for a
  // funded one.
  function normalizeMachineryUnfundedRow(row) {
    return {
      Dept_Code: (row.Dept_Code || "").trim(),
      Dept_Name: (row.Dept_Name || "").trim(),
      Fund_Code: (row.Fund_Code || "").trim(),
      Fund_Name: (row.Fund_Name || "").trim(),
      Item_Description: (row.Note || "").trim() || "Machinery & Equipment",
      Amount: toNumber(row.FY2027_Proposed),
      ME_Type: (row["M&E_type"] || "").trim(),
      BCC_Replacement: (row.BCC_Replacement || "").trim(),
      Fleet_Note: (row.Fleet_Note || row["Fleet Note"] || row.Vehicle_Request_Note || row["Vehicle Request Note"] || "").trim()
    };
  }

  // Departments/rows excluded from this summary at the requester's
  // direction -- Court Technology and Medical Examiner (court-related,
  // shown on their own pages), Housing & Urban Development (its own
  // separate grant-funded program), Mosquito Control and Mosquito Control
  // State Aid (its own separate levy/budget, not part of this countywide
  // contract view), MSBU (its own separate special-assessment district),
  // Self-Insurance Expenses and Tourism Public Safety (Sheriff/Code
  // Enforcement beach patrol, not a vendor contract), and any row noted
  // "Statutory & Other" (the Lakeview agency-funding rollup, covered on
  // its own Statutory & Other page).
  const CONTRACTUAL_SERVICES_EXCLUDED_DEPTS = new Set([
    "court technology court administration",
    "housing and urban development",
    "medical examiner",
    "mosquito control",
    "mosquito control state aid",
    "msbu",
    "self insurance expenses",
    "tourism public safety"
  ]);
  // Zehnder, Inc.'s advertising services contract (Project_Code 10655,
  // Fund 111/TDC) is booked across several object codes (Promotional
  // Activities 548000, Other Services 534000) and several TDC-fund
  // departments as many separate sheet rows -- combined into one line per
  // department below (Marketing, Sales and Visitors Center, North Walton
  // Tourist Development Tax each keep their own row/total) instead of one
  // row per Note or one grand-total row across all three.
  const ZEHNDER_PROJECT_CODE = "10655";
  const ZEHNDER_FUND_CODE = "111";
  // Engineering Services' Professional Services contract moved from a
  // General Fund org code (00120000) to a Transportation Fund org code
  // (10116002) between FY2026 and FY2027. The old org code's FY2026
  // budget and prior-year actuals still surface as their own row (see
  // synthesizeMissingExpenseRows) with $0 FY2027 proposed, which would
  // otherwise show up as a second, misleadingly-General-Fund "Engineering
  // Services" line -- combined into the one real (Transportation Fund)
  // row instead, so its FY2026 budget lines up with the FY2027 amount.
  const ENGINEERING_SERVICES_DEPT_NAME = "engineering services";
  // FY2026 budget corrections/detail sourced from the County's own FY2026
  // account-level worksheet (not reflected in this year's published
  // sheet, which either left these lines at $0 or bundled several
  // contracts into one lump figure attached to just one of them).
  // Matched by dept (exact) + item description (prefix, not exact) --
  // several of these Notes carry a parenthetical detail (e.g. a cost-split
  // percentage) that keeps getting edited in the source worksheet, so
  // matching on just the stable leading text avoids re-syncing this list
  // every time that detail changes.
  const CONTRACTUAL_SERVICES_BUDGET2026_OVERRIDES = [
    { dept: "public works", itemPrefix: "defuniak springs interlocal road maintenance", value: 50000 },
    { dept: "public works", itemPrefix: "traffic signal services", value: 125000 },
    { dept: "solid waste", itemPrefix: "iron remediation system remedial action plan modifications", value: 100000 },
    { dept: "solid waste", itemPrefix: "annual compliance monitoring services", value: 100000 },
    { dept: "tourism administration", itemPrefix: "tdc attorney", value: 30000 },
    { dept: "tourism administration", itemPrefix: "south walton turtle watch", value: 85000 },
    { dept: "tourism administration", itemPrefix: "federal and state lobbying services", value: 75000 },
    { dept: "planning short term rental", itemPrefix: "south walton fire district short term rental fire code compliance program", value: 220000 },
    { dept: "planning short term rental", itemPrefix: "call line 24 service and govos", value: 210000 },
    { dept: "planning short term rental", itemPrefix: "data science services", value: 20000 },
    { dept: "planning", itemPrefix: "swiftgov ldc update", value: 200000 },
    { dept: "planning", itemPrefix: "local mitigation strategy lms update", value: 150000 },
    { dept: "planning", itemPrefix: "cms continuing maintenance services", value: 29900 },
    { dept: "office of management and budget", itemPrefix: "professional services", value: 0 },
    { dept: "procurement", itemPrefix: "opengov purchasing software", value: 60000 },
    { dept: "recreation", itemPrefix: "security for recreation programs", value: 20000 },
    { dept: "recreation", itemPrefix: "sport officials for recreation programs", value: 30000 },
    { dept: "board of county commissioners", itemPrefix: "state lobbyist", value: 66000 },
    { dept: "board of county commissioners", itemPrefix: "federal lobbyist", value: 48000 },
    { dept: "board of county commissioners", itemPrefix: "cost allocation service study", value: 13000 },
    { dept: "board of county commissioners", itemPrefix: "opeb gasb", value: 8000 },
    { dept: "board of county commissioners", itemPrefix: "employee benefits consultant", value: 102000 },
    { dept: "board of county commissioners", itemPrefix: "financial advisor services for debt issuance", value: 10000 },
    { dept: "board of county commissioners", itemPrefix: "professional and technical services", value: 135000 },
    { dept: "board of county commissioners", itemPrefix: "board agenda", value: 150000 },
    { dept: "board of county commissioners", itemPrefix: "board erp finance software", value: 420000 },
    { dept: "board of county commissioners", itemPrefix: "enhanced south walton", value: 1330000 },
    { dept: "building construction and maintenance", itemPrefix: "park field spraying", value: 150000 },
    { dept: "building construction and maintenance", itemPrefix: "pest management services", value: 45000 },
    { dept: "environmental services", itemPrefix: "cba choctawhatchee bay water quality contract", value: 36000 },
    { dept: "environmental services", itemPrefix: "cba coastal dune lake water quality contract", value: 26875 },
    { dept: "tourism administration", itemPrefix: "state park adminission agreement", value: 190000 }
  ];
  function contractualServicesBudget2026Override(deptName, itemDescription) {
    const dept = normalizeDeptName(deptName);
    const item = normalizeDeptName(itemDescription);
    const match = CONTRACTUAL_SERVICES_BUDGET2026_OVERRIDES.find((o) => o.dept === dept && item.indexOf(o.itemPrefix) === 0);
    return match ? match.value : undefined;
  }
  // "Procurement" is the sheet's Dept_Name, but the department's actual
  // page/public-facing name is "Purchasing" -- renamed here for display on
  // these derived summary rows (doesn't touch cache.expenditures/Dept_Name
  // used elsewhere).
  function departmentDisplayName(deptName) {
    const name = String(deptName || "").trim();
    return normalizeDeptName(name) === "procurement" ? "Purchasing" : name;
  }

  // Tourist Development Fund departments don't all carry "Tourism" in their
  // sheet name (Beach Operations, Marketing, Sales and Visitors Center,
  // etc.), which scatters them across the department filter's alphabetical
  // list instead of grouping together. Prefixed here (display-only, on this
  // page's own derived rows -- doesn't touch cache.expenditures/Dept_Name
  // used elsewhere) so they all sort and read together.
  function tourismDeptLabel(deptName, fundName) {
    const name = departmentDisplayName(deptName).trim();
    if (!name || fundName !== "Tourist Development Fund") return name;
    // Strip any existing leading "Tourism" word so a sheet name like
    // "Tourism Administration" becomes "Tourism - Administration" instead
    // of double-prefixing.
    const stripped = name.replace(/^tourism\s*[-:]?\s*/i, "").trim();
    return "Tourism - " + (stripped || name);
  }

  function buildContractualServicesRowsFromExpenditures(rows) {
    const baseRows = (rows || [])
      // A row belongs on this page if it's been tagged with a Contract
      // Status in the sheet -- not by object code. The chart of accounts
      // has no single object code that means "contractual service" (the
      // closest are 531000 Professional Services, 532000 Accounting &
      // Auditing, and 534000 Other Services), and real vendor contracts
      // show up under other codes too (e.g. Procurement's OpenGov
      // Purchasing Software under 554000) -- Contract Status is the
      // authoritative, department-confirmed signal instead.
      .filter((row) => String(row.Contract_Status || "").trim() !== "")
      .filter((row) => !CONTRACTUAL_SERVICES_EXCLUDED_DEPTS.has(normalizeDeptName(row.Dept_Name)))
      .filter((row) => String(row.Note || "").trim() !== "Statutory & Other")
      .filter((row) => String(row.Project_Code || "").trim() !== ZEHNDER_PROJECT_CODE)
      .filter((row) => normalizeDeptName(row.Dept_Name) !== ENGINEERING_SERVICES_DEPT_NAME)
      .filter((row) => !(
        normalizeDeptName(row.Dept_Name) === "environmental services" &&
        normalizeDeptName(row.Note) === "choctawhatchee bay estuary program"
      ))
      // State Mandated Juvenile Justice is a statutory pass-through
      // payment, not a procured contractual service -- excluded from this
      // page.
      .filter((row) => normalizeDeptName(row.Note).indexOf("state mandated juvenile justice") !== 0)
      .map((row) => {
        const fundCode = fundCodeForRow(row);
        const fund = (cache.funds || []).find((f) => String(f.Fund_Code || "").trim() === fundCode);
        const fundName = (fund && fund.Fund_Name) || ("Fund " + fundCode);
        const itemDescription = row.Note || row.Project_Name || row.Object_Name || "Contractual Services";
        const budget2026Override = contractualServicesBudget2026Override(row.Dept_Name, itemDescription);
        return {
          Dept_Code: row.Dept_Code || "",
          Dept_Name: tourismDeptLabel(row.Dept_Name, fundName),
          Fund_Code: fundCode,
          Fund_Name: fundName,
          Item_Description: itemDescription,
          Budget2026: budget2026Override !== undefined ? budget2026Override : (row.FY2026_Original_Budget || 0),
          Amount: row.FY2027_Proposed || 0,
          Vendor: row.Vendor || "",
          Contract_No: row.Contract_No || "",
          Contract_Link: row.Contract_Link || "",
          Contract_Status: row.Contract_Status || ""
        };
      })
      // Only rows with a real FY2027 line belong on this page -- FY2026-only
      // carryovers (a contract that ended and has no FY2027 funding) are
      // dropped rather than shown as a $0 row.
      .filter((row) => row.Amount !== 0);

    const zehnderRows = (rows || []).filter((row) =>
      String(row.Project_Code || "").trim() === ZEHNDER_PROJECT_CODE && fundCodeForRow(row) === ZEHNDER_FUND_CODE
    );
    const zehnderByDept = new Map();
    zehnderRows.forEach((row) => {
      const deptName = row.Dept_Name || "";
      const entry = zehnderByDept.get(deptName) || { row, total: 0, budget2026: 0 };
      entry.total += row.FY2027_Proposed || 0;
      entry.budget2026 += row.FY2026_Original_Budget || 0;
      zehnderByDept.set(deptName, entry);
    });
    zehnderByDept.forEach((entry) => {
      if (!entry.total) return;
      const fundCode = fundCodeForRow(entry.row);
      const fund = (cache.funds || []).find((f) => String(f.Fund_Code || "").trim() === fundCode);
      const fundName = (fund && fund.Fund_Name) || ("Fund " + fundCode);
      baseRows.push({
        Dept_Code: entry.row.Dept_Code || "",
        Dept_Name: tourismDeptLabel(entry.row.Dept_Name, fundName),
        Fund_Code: fundCode,
        Fund_Name: fundName,
        Item_Description: entry.row.Project_Name || "Advertising Services (Zehnder, INC)",
        Budget2026: entry.budget2026,
        Amount: entry.total,
        Vendor: entry.row.Vendor || "",
        Contract_No: entry.row.Contract_No || "",
        Contract_Link: entry.row.Contract_Link || "",
        Contract_Status: entry.row.Contract_Status || ""
      });
    });

    const engineeringRows = (rows || []).filter((row) =>
      normalizeDeptName(row.Dept_Name) === ENGINEERING_SERVICES_DEPT_NAME &&
      String(row.Contract_Status || "").trim() !== ""
    );
    if (engineeringRows.length) {
      const engineeringBudget2026 = engineeringRows.reduce((sum, row) => sum + (row.FY2026_Original_Budget || 0), 0);
      const engineeringAmount = engineeringRows.reduce((sum, row) => sum + (row.FY2027_Proposed || 0), 0);
      if (engineeringAmount) {
        // File under whichever org code carries the current (FY2027)
        // dollars -- that's the department's real, present-day fund.
        const primary = engineeringRows.find((row) => (row.FY2027_Proposed || 0) !== 0) || engineeringRows[0];
        const fundCode = fundCodeForRow(primary);
        const fund = (cache.funds || []).find((f) => String(f.Fund_Code || "").trim() === fundCode);
        baseRows.push({
          Dept_Code: primary.Dept_Code || "",
          Dept_Name: primary.Dept_Name || "",
          Fund_Code: fundCode,
          Fund_Name: (fund && fund.Fund_Name) || ("Fund " + fundCode),
          Item_Description: primary.Note || primary.Project_Name || primary.Object_Name || "Contractual Services",
          Budget2026: engineeringBudget2026,
          Amount: engineeringAmount,
          Vendor: primary.Vendor || "",
          Contract_No: primary.Contract_No || "",
          Contract_Link: primary.Contract_Link || "",
          Contract_Status: primary.Contract_Status || ""
        });
      }
    }

    return baseRows;
  }

  function normalizePerformanceRow(row) {
    return {
      Dept_Code: (row.Dept_Code || "").trim(),
      Dept_Name: (row.Dept_Name || "").trim(),
      "Code Link": (row["Code Link"] || "").trim(),
      Goal: (row.Goal || "").trim(),
      Objective: (row.Objective || "").trim(),
      Measure: (row.Measure || "").trim(),
      Actual_2022: (row.Actual_2022 || "").trim(),
      Actual_2023: (row.Actual_2023 || "").trim(),
      Actual_2024: (row.Actual_2024 || "").trim(),
      Actual_2025: (row.Actual_2025 || "").trim(),
      Projected_2026: (row.Projected_2026 || "").trim(),
      Projected_2027: (row.Projected_2027 || "").trim()
    };
  }

  function normalizeNarrativeRow(row) {
    return {
      Dept_Name: (row.Dept_Name || "").trim(),
      Narrative: (row.Narrative || "").trim()
    };
  }

  function normalizeFundRow(row) {
    return {
      Fund_Code: (row.Fund_Code || "").trim(),
      Fund_Name: (row.Fund_Name || "").trim(),
      Fund_Type: (row.Fund_Type || "").trim(),
      Fund_Category: (row.Fund_Category || "").trim(),
      Major_NonMajor: (row.Major_NonMajor || "").trim()
    };
  }

  // Doubles as the "COA Departments" Chart of Accounts source for
  // synthesizeMissingExpenseRows/synthesizeMissingRevenueRows below
  // (Dept_Group/Org_Type weren't previously kept since nothing else used
  // them).
  function normalizeActivityRow(row) {
    return {
      Dept_Code: (row.Dept_Code || "").trim(),
      Dept_Name: (row.Dept_Name || "").trim(),
      Dept_Group: (row.Dept_Group || "").trim(),
      Org_Type: (row.Org_Type || "").trim(),
      Activity: (row.Activity || "").trim()
    };
  }

  function normalizeFundBalanceRow(row) {
    return {
      Year: (row.Year || "").trim(),
      Fund_Code: (row.Fund || "").trim(),
      Fund_Description: (row["Fund Description"] || "").trim(),
      Object_Description: (row["Object Description"] || "").trim(),
      Fund_Balance: toNumber(row["Fund Balance"])
    };
  }

  // Summary of Personnel Cost's per-position detail tab (a work in
  // progress -- being built out position by position, see
  // buildPersonnelPositionCostsByDept). Columns carry a trailing "*" in the
  // sheet header on the required fields.
  function normalizePersonnelPositionCostRow(row) {
    // The sheet's "Dept_Name" column actually holds the 8-digit Dept_Code
    // (e.g. "00104000"), not a department name -- resolved back to a real
    // name via cache.expenditures in buildPersonnelPositionCostsByDept.
    return {
      Position_Name: (row["Position_Name"] || row["Position Name*"] || "").trim(),
      Dept_Code: (row["Dept_Name"] || row["Dept_Code"] || "").trim(),
      Hourly_Base_Wage: toNumber(String(row["Hourly_Base_Wage"] || row["Hourly Base Wage*"] || "").replace(/[$,]/g, "")),
      Standard_Hours: toNumber(row["Standard_Hours_per_Year"] || row["Standard Hours per Year*"]),
      Allocation_Pct: toNumber(String(row["Allocation"] || row["Allocation %*"] || "").replace(/[%,]/g, "")) / 100,
      Fund_Code: (row["Fund"] || row["Funds"] || "").trim(),
      Commissioner_Vehicle_Allowance: toNumber(String(row["Commissioner_Vehicle_Allowance"] || "").replace(/[$,]/g, "")),
      Health_Plan: (row["Health_Plan"] || "").trim(),
      Coverage: (row["Coverage"] || "").trim(),
      Pension_Plan: (row["Pension_Plan"] || "").trim(),
      Risk_Code: (row["Risk_Code"] || "").trim(),
      Weekend_Pay: toNumber(row["Weekend_Pay"])
    };
  }

  // The expenditure/revenue sheets don't have a Fund column directly; the
  // fund is encoded as the leading 3 digits of each row's Dept_Code, which
  // line up with Fund_Code values in the funds sheet (e.g. "00104000" and
  // "001381" both start with "001" for the General Fund).
  // org 20146000 (Infrastructure, a synthesized expense row -- see
  // synthesizeMissingExpenseRows) derives a fund code of "201" by the
  // normal Dept_Code.slice(0,3) rule, but that's the same fund-code
  // mismatch as its revenue counterpart (org 201389, already folded into
  // the General Fund's own 001389 row) -- General Fund carries this
  // expense too, so its fund code is corrected here, generally, rather
  // than treating "201" as a fund of its own anywhere a row's fund is
  // determined.
  const DEPT_CODE_FUND_OVERRIDES = new Map([["20146000", "001"]]);

  // org 20146000's own synthesized row (see considerRow below) finds no
  // match in the department catalog, so it would otherwise fall back to
  // the generic "Unclassified" Dept_Name -- but it's an Infrastructure
  // (Object_Code 563000) line, the same kind of spending already booked
  // under fund 300's own "Capital Projects" Dept_Name elsewhere (e.g. org
  // 30047030). Naming it "Capital Projects" here too means the Summary of
  // Expenses' Transportation activity chart groups it with that same
  // series instead of showing a separate, unhelpful "Unclassified" slice.
  // org 10118000's own synthesized row similarly finds no match in the
  // department catalog and would otherwise fall back to the generic
  // "Unclassified" Dept_Name -- but it's a Transportation Fund (101)
  // intergovernmental transfer that belongs to Public Works, the fund's
  // only real department alongside Engineering Services, so it's named
  // "Public Works" here too rather than showing as a separate, unhelpful
  // "Unclassified" slice on the Transportation Fund's own schedule.
  const DEPT_CODE_NAME_OVERRIDES = new Map([
    ["20146000", "Capital Projects"],
    ["10118000", "Public Works"]
  ]);

  // These revenue codes have Supabase actuals but no Revenue_Name row
  // anywhere in the published Revenues sheet (checked across every fund) --
  // so synthesizeMissingRevenueRows would otherwise land all of them in
  // "Unclassified Account" under the generic Miscellaneous Revenue type.
  // The first 7 (324001-366003) were reclassified per county guidance for
  // the Transportation Fund. The rest surfaced the same way on the
  // Consolidated Fund Financial Schedule, spread across the General,
  // Building, Sheriff (Law Enforcement Trust), Tourist Development, Solid
  // Waste, E911, Mosquito Control, and Capital Projects funds -- named/
  // typed from Florida's Uniform Chart of Accounts numeric ranges
  // (321-329 Permits/Fees/Special Assessments, 331-339 Intergovernmental,
  // 341-349 Charges for Services, 351-359 Judgments/Fines/Forfeitures,
  // 361-369 Miscellaneous, 381-389 Other Financing Sources) and, where it
  // lined up with one of those ranges, the activities sheet's own category
  // label for that synthesized row's placeholder Dept_Code (e.g. 001331 is
  // labeled "Federal Grants" there, 300384 "Debt Proceeds"). Several
  // distinct codes intentionally share one catch-all name/type below (e.g.
  // every generic "Interest & Other Earnings" or "Federal Grant (Other)"
  // code) since the county never gave them their own line either.
  const REVENUE_CODE_OVERRIDES = new Map([
    ["324001", { name: "Sign Fees", type: "Permits Fees and Special Assessments" }],
    ["331900", { name: "Federal Grant (Other)", type: "Intergovernmental Revenues" }],
    ["334340", { name: "State Grant (Transportation)", type: "Intergovernmental Revenues" }],
    ["334500", { name: "State Grant (Other)", type: "Intergovernmental Revenues" }],
    ["366000", { name: "Contributions and Donations", type: "Miscellaneous Revenue" }],
    ["366002", { name: "Contributions and Donations (Private Sources)", type: "Miscellaneous Revenue" }],
    ["366003", { name: "Contributions and Donations (Other)", type: "Miscellaneous Revenue" }],

    // General Fund (001), Solid Waste (112), Capital Projects (300)
    ["329008", { name: "Special Assessments", type: "Permits Fees and Special Assessments" }],
    ["331690", { name: "Federal Grant (Other)", type: "Intergovernmental Revenues" }],
    ["331700", { name: "Federal Grant (Other)", type: "Intergovernmental Revenues" }],
    ["331390", { name: "Federal Grant (Other)", type: "Intergovernmental Revenues" }],
    ["334390", { name: "State Grant (Other)", type: "Intergovernmental Revenues" }],
    ["334320", { name: "State Grant (Solid Waste)", type: "Intergovernmental Revenues" }],
    ["323700", { name: "Franchise Fees", type: "Permits Fees and Special Assessments" }],
    ["341000", { name: "General Government Fees", type: "Charges for Services" }],
    ["341300", { name: "General Government Fees", type: "Charges for Services" }],
    ["341206", { name: "General Government Fees", type: "Charges for Services" }],
    ["341207", { name: "General Government Fees", type: "Charges for Services" }],
    ["343402", { name: "Physical Environment Fees", type: "Charges for Services" }],
    ["343404", { name: "Physical Environment Fees", type: "Charges for Services" }],
    ["343406", { name: "Physical Environment Fees", type: "Charges for Services" }],
    ["343409", { name: "Physical Environment Fees", type: "Charges for Services" }],
    ["361110", { name: "Interest and Other Earnings", type: "Miscellaneous Revenue" }],
    ["364000", { name: "Sale of Fixed Assets", type: "Miscellaneous Revenue" }],
    ["364002", { name: "Sale of Fixed Assets", type: "Miscellaneous Revenue" }],
    ["366001", { name: "Contributions and Donations", type: "Miscellaneous Revenue" }],

    // Law Enforcement Trust Fund (108)
    ["351300", { name: "Judgments and Fines", type: "Judgments, Fines and Forfeits" }],
    ["351400", { name: "Judgments and Fines", type: "Judgments, Fines and Forfeits" }],
    ["351500", { name: "Judgments and Fines", type: "Judgments, Fines and Forfeits" }],
    ["351600", { name: "Judgments and Fines", type: "Judgments, Fines and Forfeits" }],

    // Tourist Development Fund (111)
    ["312140", { name: "Tourist Development Tax (Other)", type: "General Government Taxes" }],
    ["361104", { name: "Interest and Other Earnings", type: "Miscellaneous Revenue" }],
    ["361109", { name: "Interest and Other Earnings", type: "Miscellaneous Revenue" }],
    ["361112", { name: "Interest and Other Earnings", type: "Miscellaneous Revenue" }],

    // E911 Fund (109)
    ["335220", { name: "State Shared Revenue (Other)", type: "Intergovernmental Revenues" }],
    ["335223", { name: "State Shared Revenue (Other)", type: "Intergovernmental Revenues" }],

    // Mosquito Control Fund (105)
    ["346900", { name: "Human Services Fees", type: "Charges for Services" }],

    // Capital Projects Fund (300) -- 384000 is bond/loan proceeds, an
    // "other financing source" by nature rather than everyday revenue, so
    // (unlike everything else here) it's reclassified out of Miscellaneous
    // Revenue entirely rather than just renamed.
    ["384000", { name: "Debt Proceeds", type: "Other Sources" }]
  ]);

  // A synthesized row's catalog entry (the activities sheet) often carries
  // a Dept_Name too specific/inconsistent to match any real Dept_Name used
  // in the main expenditures/revenues sheets (e.g. "Supervisor of Elections
  // - Federal Elections Grant", "Human Resources (JAD)") -- knownDeptNames
  // rejects those, same as it should. But the same catalog row's Dept_Group
  // column is the clean rollup name for exactly this case ("Supervisor of
  // Elections", "Human Resources"), so it's tried next, before falling all
  // the way to the generic "Unclassified" -- but only when Dept_Group
  // itself is a real, known department name, so a financial/category
  // Dept_Group (e.g. "Ad Valorem Taxes", "Debt Service") never leaks in as
  // a fake department.
  function resolveSynthesizedDeptName(dept, knownDeptNames, orgCode) {
    if (dept && knownDeptNames.has(normalizeDeptName(dept.Dept_Name))) return dept.Dept_Name;
    if (dept && knownDeptNames.has(normalizeDeptName(dept.Dept_Group))) return dept.Dept_Group;
    // Last resort before the generic "Unclassified": a handful of orphaned
    // accounts (see synthesizeMissingExpenseRows' knownDeptNameByCode) have
    // no department name anywhere in the sheet or the Chart of Accounts --
    // but every Dept_Code still belongs to a real, known fund (cache.funds).
    // Naming the row after its fund ("Preservation Fund", "State Housing
    // Initiative Program Fund") is truthful and far more useful on a chart
    // or table than a bare "Unclassified" label with no context at all.
    if (orgCode) {
      const fundCode = fundCodeForRow({ Dept_Code: orgCode });
      const fund = (cache.funds || []).find((f) => String(f.Fund_Code || "").trim() === fundCode);
      if (fund && fund.Fund_Name) return fund.Fund_Name;
    }
    return UNCLASSIFIED_DEPT_NAME;
  }

  function fundCodeForRow(row) {
    const deptCode = String((row && row.Dept_Code) || "").trim();
    return DEPT_CODE_FUND_OVERRIDES.get(deptCode) || deptCode.slice(0, 3);
  }

  // True when a fund is shared by more than one department (e.g. the
  // General Fund, 001, used by two dozen departments) -- the revenue
  // actuals/budget disclaimer only applies there, since that's the only
  // case where the fund-scoped fallbacks above still aggregate across
  // multiple departments. A single-department fund (e.g. 107, the Sheriff
  // Fund) has nothing else to aggregate, so the disclaimer would be untrue
  // for it. An unknown/blank fund code (combineByName's merged,
  // multi-department rows) defaults to true since those rows really do
  // span several departments.
  function fundHasMultipleDepartments(fundCode) {
    if (!fundCode) return true;
    const names = new Set();
    (cache.revenues || []).forEach((r) => {
      if (fundCodeForRow(r) !== fundCode) return;
      const name = normalizeDeptName(r.Dept_Name);
      if (name) names.add(name);
    });
    return names.size > 1;
  }

  function fetchCSV(url) {
    return fetch(url, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Request failed with status " + res.status);
        return res.text();
      })
      .then(parseCSV);
  }

  // Dev-only sanity check, never shown in the UI -- logs to the browser
  // console automatically after every data load. Reuses the same row
  // selection that feeds department expense/revenue cards, including
  // supplemental expense cards and revenue backfills, then compares the
  // displayed totals on a single budget field (default FY2027_Proposed).
  // Can also be run on demand via
  // WCBudgetData.auditDepartmentExpenseRevenueParity().
  // Groups distinct Dept_Names together for the parity audit only, beyond
  // what DEPT_ALIASES covers -- these are legitimately separate line items
  // in the sheets (and stay separate on their own department pages) but
  // share one funding source, so their combined expense/revenue should
  // balance even though each piece individually won't: Solid Waste
  // Transfer draws down the same revenue as Solid Waste; BCC Other Uses
  // Contingency is part of the Board of County Commissioners' budget; and
  // every tourism sub-program (marketing, beach ops, lifeguard services,
  // etc., each its own canonical DEPT_ALIASES bucket) is funded from the
  // shared Tourist Development Tax rather than its own dedicated revenue.
  const AUDIT_DEPT_GROUP_OVERRIDES = {
    "solid waste": ["solid waste transfer"],
    "board of county commissioners": ["bcc other uses contingency"],
    "capital projects": [
      "interfund group transfer in",
      "interfund group transfer out"
    ],
    "self-insurance": [
      "self-insurance expense",
      "self-insurance expense fees and charges",
      "self-insurance expenses",
      "self-insurance fees and charges",
      "self-insurance interest",
      "self insurance",
      "self insurance expense",
      "self insurance expense fees and charges",
      "self insurance expenses",
      "self insurance fees and charges",
      "self insurance interest"
    ],
    "statutory and other agency funding": [
      "statutory and other",
      "culture and recreation senior centers",
      "culture and recreation senior centers and mainstreet",
      "senior centers",
      "senior centers and mainstreet"
    ],
    tourism: [
      "tourism administration",
      "tourism beach operations",
      "tourism beach tram",
      "tourism communications",
      "tourism marketing",
      "tourism sales and visitor center",
      "tourism lifeguard services and beach safety",
      "tourist development taxes",
      "tourism north walton",
      "tourism public safety"
    ]
  };
  const AUDIT_DEPT_GROUP_CANONICAL = (() => {
    const map = new Map();
    Object.keys(AUDIT_DEPT_GROUP_OVERRIDES).forEach((canonical) => {
      map.set(canonical, canonical);
      AUDIT_DEPT_GROUP_OVERRIDES[canonical].forEach((member) => map.set(member, canonical));
    });
    return map;
  })();
  const AUDIT_GROUPS_RENDERED_BY_CANONICAL_PAGE = new Set([
    "board of county commissioners",
    "solid waste",
    "statutory and other agency funding"
  ]);

  function departmentFinancialDisplayRows(deptName, deptCode) {
    const norm = normalizeDeptName(deptName);
    let expenseRows;
    let expenseRowsForRevenuePlug;
    let supplementalRevenueRows = [];

    if (norm === "statutory and other agency funding" || norm === "statutory and other") {
      expenseRows = (cache.expenditures || []).filter((r) => (r.Note || "").trim() === "Statutory & Other");
      expenseRowsForRevenuePlug = expenseRows;
    } else if (norm === "court innovations") {
      expenseRows = (cache.expenditures || []).filter(
        (r) =>
          (r.Dept_Code === "00101000" && r.Project_Code === "1040") ||
          normalizeDeptName(r.Dept_Name) === "court innovations"
      );
      expenseRowsForRevenuePlug = expenseRows;
    } else {
      const excludedObjectCodes = EXPENSE_OBJECT_CODES_BROKEN_OUT[norm] || [];
      const isBcc = norm === "board of county commissioners";
      const isBuildingConstruction = norm === "building construction and maintenance";
      const isSolidWaste = norm === "solid waste";
      const isCourtTechnology = norm === "court technology and innovations";
      const expenseMainRows = filterAllZeroRowsForSelectedDepartments(getDepartmentExpenses(deptName, deptCode).filter(
        (r) =>
          !excludedObjectCodes.includes(String(r.Object_Code || "").trim()) &&
          !(isBcc && String(r.Project_Code || "").trim() === "1040")
      ), deptName);
      const supplementalRows = [];
      if (isSolidWaste) {
        supplementalRows.push(
          ...rowsForExactDepartment(cache.expenditures, "Solid Waste").filter((r) => String(r.Object_Code || "").trim() === "534000"),
          ...rowsForExactDepartment(cache.expenditures, "Solid Waste Transfer")
        );
      } else if (isBcc) {
        supplementalRows.push(...rowsForExactDepartment(cache.expenditures, "BCC Other Uses Contingency"));
      } else if (isBuildingConstruction) {
        supplementalRows.push(
          ...rowsForExactDepartment(cache.expenditures, "Building Construction and Maintenance")
            .filter((r) => String(r.Object_Code || "").trim() === "543000")
        );
      } else if (norm === "office of the county attorney" || norm === "office of county attorney") {
        supplementalRows.push(
          ...getDepartmentExpenses(deptName, deptCode).filter((r) => String(r.Object_Code || "").trim() === "531000")
        );
      } else if (isCourtTechnology) {
        supplementalRows.push(
          ...(cache.expenditures || []).filter(
            (r) =>
              (r.Dept_Code === "00101000" && r.Project_Code === "1040") ||
              normalizeDeptName(r.Dept_Name) === "court innovations"
          )
        );
        supplementalRevenueRows = (cache.revenues || []).filter(
          (r) => normalizeDeptName(r.Dept_Name) === "court innovations"
        );
      }
      expenseRows = expenseMainRows.concat(supplementalRows);
      if (isBcc || isBuildingConstruction) {
        expenseRowsForRevenuePlug = expenseRows;
      } else {
        expenseRowsForRevenuePlug = expenseMainRows;
      }
    }

    const rawRevenueRows = getDepartmentRevenues(deptName, deptCode);
    const deptExpenseRows = dedupBudgetLinesAcrossDeptNames(expenseRowsForRevenuePlug || getDepartmentExpenses(deptName, deptCode));
    let filledRevenueRows = fillRevenueActualsFromExpenses(rawRevenueRows, deptExpenseRows);
    if (filledRevenueRows.some((r) => isSheriffRevenueDept(r))) {
      const all381 = filledRevenueRows.filter((r) => String((r && r.Revenue_Code) || "").trim() === "381000");
      const src311 = filledRevenueRows.find((r) => String((r && r.Revenue_Code) || "").trim() === "311000");
      if (all381.length && src311) {
        const sum381fy2024 = all381.reduce((s, r) => s + (r.FY2024_Actual || 0), 0);
        const sum381fy2025 = all381.reduce((s, r) => s + (r.FY2025_Actual || 0), 0);
        const sum381fy2026 = all381.reduce((s, r) => s + (r.FY2026_Original_Budget || r.FY2026_Budget || 0), 0);
        const total2027 = [src311, ...all381].reduce((s, r) => s + (r.FY2027_Proposed || 0), 0);
        const fy2027AdValorem = Math.max(0, total2027 - 480000);
        let interfundAssigned = false;
        filledRevenueRows = filledRevenueRows.map((r) => {
          const code = String((r && r.Revenue_Code) || "").trim();
          if (code === "311000") {
            return {
              ...r,
              _actualsBackfilled: true,
              FY2024_Actual: sum381fy2024,
              FY2025_Actual: sum381fy2025,
              FY2026_Original_Budget: sum381fy2026,
              FY2026_Budget: sum381fy2026,
              FY2027_Proposed: fy2027AdValorem,
            };
          }
          if (code === "381000") {
            const fy2027 = !interfundAssigned ? 480000 : 0;
            interfundAssigned = true;
            return {
              ...r,
              _actualsBackfilled: true,
              _originalBudgetDeduped: true,
              FY2024_Actual: 0,
              FY2025_Actual: 0,
              FY2026_Original_Budget: 0,
              FY2026_Budget: 0,
              FY2027_Proposed: fy2027,
            };
          }
          return r;
        });
      }
      const adValoremIndex = filledRevenueRows.findIndex((r) => String((r && r.Revenue_Code) || "").trim() === "311000");
      const delinquentRows = filledRevenueRows.filter((r) => String((r && r.Revenue_Code) || "").trim() === "311001");
      if (adValoremIndex !== -1 && delinquentRows.length) {
        const mergeFields = ["FY2020_Actual", "FY2021_Actual", "FY2022_Actual", "FY2023_Actual", "FY2024_Actual", "FY2025_Actual", "FY2026_Original_Budget", "FY2026_Budget", "FY2027_Proposed"];
        const merged = { ...filledRevenueRows[adValoremIndex], _actualsBackfilled: true };
        delinquentRows.forEach((r) => {
          mergeFields.forEach((f) => { merged[f] = (merged[f] || 0) + (r[f] || 0); });
        });
        filledRevenueRows[adValoremIndex] = merged;
        filledRevenueRows = filledRevenueRows.filter((r) => String((r && r.Revenue_Code) || "").trim() !== "311001");
      }
    }

    return {
      expenseRows,
      revenueRows: filterAllZeroRowsForSelectedDepartments(filledRevenueRows, deptName).concat(supplementalRevenueRows)
    };
  }

  function auditDepartmentExpenseRevenueParity(options) {
    const field = (options && options.field) || "FY2027_Proposed";
    const tolerance = (options && options.tolerance) || 1;

    // Dept_Code isn't a shared identity space between the two sheets (e.g.
    // the Sheriff's Office is "10730000" on expenditures but "107381" on
    // revenues), so departments have to be joined by name -- through the
    // same DEPT_ALIASES canonicalization the rest of the app uses (made
    // symmetric via DEPT_ALIAS_CANONICAL), plus this audit's own grouping
    // for known shared-funding splits -- rather than by code.
    function keyFor(row) {
      const name = String((row && row.Dept_Name) || "").trim();
      if (!name) return "";
      const norm = normalizeDeptName(name);
      const canonical = DEPT_ALIAS_CANONICAL.get(norm) || norm;
      return AUDIT_DEPT_GROUP_CANONICAL.get(canonical) || canonical;
    }

    const sourceDeptNamesByKey = new Map();
    (cache.expenditures || []).concat(cache.revenues || []).forEach((row) => {
      const key = keyFor(row);
      if (!key) return;
      if (!sourceDeptNamesByKey.has(key)) sourceDeptNamesByKey.set(key, new Set());
      const sourceName = DEPT_ALIAS_CANONICAL.get(normalizeDeptName(row.Dept_Name)) || normalizeDeptName(row.Dept_Name);
      if (AUDIT_GROUPS_RENDERED_BY_CANONICAL_PAGE.has(key) && sourceName !== key) return;
      sourceDeptNamesByKey.get(key).add(sourceName);
    });

    const byKey = new Map();
    sourceDeptNamesByKey.forEach((sourceNames, key) => {
      const entry = { deptName: key, expense: 0, revenue: 0 };
      sourceNames.forEach((sourceName) => {
        const rows = departmentFinancialDisplayRows(sourceName);
        entry.expense += (rows.expenseRows || []).reduce((sum, row) => sum + toNumber(row[field]), 0);
        entry.revenue += (rows.revenueRows || []).reduce((sum, row) => sum + revenueDisplayAmount(row[field]), 0);
      });
      byKey.set(key, entry);
    });

    const mismatches = Array.from(byKey.values())
      .map((entry) => Object.assign({}, entry, { difference: entry.expense - entry.revenue }))
      .filter((entry) => Math.abs(entry.difference) > tolerance)
      .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

    if (!(options && options.log === false)) {
      console.group("Department displayed-card expense/revenue parity audit (" + field + ")");
      console.table(mismatches.map((m) => ({
        Dept_Name: m.deptName,
        Expense: m.expense,
        Revenue: m.revenue,
        Difference: m.difference
      })));
      console.log(mismatches.length + " of " + byKey.size + " department(s)/service(s) do not balance.");
      console.groupEnd();
    }

    return mismatches;
  }

  function loadBudgetData() {
    if (loadPromise) return loadPromise;

    const specs = [
      ["expenditures", DATA_SOURCES.expenditures, normalizeExpenditureRow],
      ["revenues", DATA_SOURCES.revenues, normalizeRevenueRow],
      ["staffing", DATA_SOURCES.staffing, normalizeStaffingRow],
      ["performanceMeasures", DATA_SOURCES.performanceMeasures, normalizePerformanceRow],
      ["departmentNarratives", DATA_SOURCES.departmentNarratives, normalizeNarrativeRow],
      ["funds", DATA_SOURCES.funds, normalizeFundRow],
      ["activities", DATA_SOURCES.activities, normalizeActivityRow],
      ["fundBalances", DATA_SOURCES.fundBalances, normalizeFundBalanceRow],
      ["personnelPositionCosts", DATA_SOURCES.personnelPositionCosts, normalizePersonnelPositionCostRow],
      ["machineryUnfunded", DATA_SOURCES.machineryUnfunded, normalizeMachineryUnfundedRow]
    ];

    cache.datasetCount = specs.length;

    loadPromise = Promise.all([
      Promise.allSettled(specs.map((spec) => fetchCSV(spec[1]).then((rows) => rows.map(spec[2])))),
      loadSupabaseActualLookups(),
      fetchPersonnelCostFormulaInputs()
    ]).then(([results, actuals, personnelCostFormula]) => {
      cache.personnelCostFormula = personnelCostFormula;
      results.forEach((result, i) => {
        const key = specs[i][0];
        if (result.status === "fulfilled") {
          cache[key] = result.value;
        } else {
          cache[key] = [];
          cache.errors[key] = result.reason;
          console.error("WCBudgetData: failed to load " + key, result.reason);
        }
      });

      cache.expenditures = applyStatutoryExpenseOverrides(cache.expenditures);
      cache.revenues = applyRevenueNameOverrides(cache.revenues);

      if (actuals) {
        cache.expenseActualRows = actuals.expenseRows || [];
        cache.revenueActualRows = actuals.revenueRows || [];
        // Kept raw (not collapsed per row like applyOriginalBudgetToRows
        // does) so a fund-scoped schedule can pull one fund's own share
        // back out of a multi-fund SUPABASE_LOOKUP_OVERRIDES row -- see
        // adValoremFivePercentReductionForFunds.
        cache.originalBudgetRows = actuals.originalBudgetRows || [];

        // Add a placeholder row for any Supabase department+account that
        // has no row at all in the sheet, before the actuals/budget
        // machinery below runs, so it picks them up the same way it does
        // every other row -- and so does every table downstream that reads
        // cache.expenditures/cache.revenues (Summary of Expenses/Revenues,
        // every department's own Budget/Revenue Lines popup), with no
        // per-table special-casing needed. Built from the sheet's
        // *pre-synthesis* state, since these are catalogs/known-name lists,
        // not row data that needs the new rows reflected in it.
        const knownDeptNames = buildKnownDeptNames(cache.expenditures, cache.revenues);
        const excludedKeys = overrideRedirectTargetKeys();
        const excludedOrgs = aliasTargetOrgCodes();
        const expenseObjectCatalog = buildExpenseObjectCatalog(cache.expenditures);
        const revenueCodeCatalog = buildRevenueCodeCatalog(cache.revenues);
        cache.expenditures = synthesizeMissingExpenseRows(
          cache.expenditures, actuals.originalBudgetRows, actuals.expenseRows,
          cache.activities, expenseObjectCatalog, knownDeptNames, excludedKeys
        );
        cache.expenditures = applyTourismAdministrativeFeeOverrides(cache.expenditures);
        cache.revenues = synthesizeMissingRevenueRows(
          cache.revenues, actuals.originalBudgetRows, actuals.revenueRows,
          cache.activities, revenueCodeCatalog, knownDeptNames, excludedKeys, excludedOrgs
        );

        cache.expenditures = applyActualsToRows(cache.expenditures, actuals.expenseRows);
        cache.revenues = applyActualsToRows(cache.revenues, actuals.revenueRows);
        cache.expenditures = applyOriginalBudgetToRows(cache.expenditures, actuals.originalBudgetRows);
        cache.revenues = applyOriginalBudgetToRows(cache.revenues, actuals.originalBudgetRows);
      }
      cache.expenditures = mergePtoBuybackIntoRegularSalaries(cache.expenditures);

      // Computed once per load from the now-finalized cache.expenditures,
      // and shared by the Consolidated Expense Summary and
      // buildFundFinancialSchedule for FY2020-FY2026 -- see
      // buildDedupedHistoricalExpenseRows.
      cache.dedupedExpenseRows = buildDedupedHistoricalExpenseRows(cache);

      cache.machinery = buildMachineryRowsFromExpenditures(cache.expenditures);
      cache.contractualServices = buildContractualServicesRowsFromExpenditures(cache.expenditures);

      auditDepartmentExpenseRevenueParity();
      auditPersonnelCostPositionParity();

      return cache;
    });

    return loadPromise;
  }

  // ---- rendering primitives ----

  function priorYearsToggleHtml(showPrior, extraWrapClass, scope) {
    const priorScope = scope || "budget";
    const expanded = showPrior ? "true" : "false";
    const visibleLabel = showPrior ? "Hide Prior Years" : "View Prior Years";
    const accessibleLabel = showPrior ? "Hide prior years" : "View prior years";
    const button =
      '<button type="button" class="wc-fy-column-toggle-button" data-wc-prior-years-scope="' + escapeHtml(priorScope) + '" aria-expanded="' + expanded + '" aria-label="' + accessibleLabel + '">' +
      '<span class="wc-fy-column-toggle-indicator" aria-hidden="true">' + (showPrior ? "✓" : "") + "</span>" +
      '<span class="wc-fy-column-toggle-text">' + visibleLabel + "</span>" +
      "</button>";
    return '<div class="wc-fy-column-toggle-wrap' + (extraWrapClass ? " " + extraWrapClass : "") + '">' + button + "</div>";
  }

  function renderNotesHtml(title, notes) {
    if (!notes || !notes.length) return "";
    return (
      '<div class="wc-staffing-notes"><p class="wc-staffing-notes-title">' + escapeHtml(title) + "</p>" +
      notes.map((n) => "<p>" + escapeHtml(n) + "</p>").join("") +
      "</div>"
    );
  }

  let budgetLinesDetailCounter = 0;
  let fundScheduleActivityCounter = 0;
  let budgetChangeDeptCounter = 0;

  // Shared CSV download helper. Values are stringified and quoted only
  // when needed (comma/quote/newline present), with embedded quotes
  // doubled per the standard CSV escaping rule.
  function csvField(value) {
    const s = String(value === undefined || value === null ? "" : value);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function downloadCsv(filename, rows) {
    const csv = rows.map((row) => row.map(csvField).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Mirrors the workforce position-cost sheet's own column layout exactly
  // (same header names/order, same "$25.33"/"100.00%" string formatting),
  // so this export can be pasted straight back into that sheet -- the
  // whole point being to carry the auto-assigned Position ID back in as a
  // stable join key, not to reformat the data into a financial report.
  const PERSONNEL_POSITION_CSV_HEADER = [
    "Dept_Name", "Position_ID*", "Position_Name", "Hourly_Base_Wage",
    "Standard_Hours_per_Year", "Allocation", "Fund", "Commissioner_Vehicle_Allowance",
    "Health_Plan", "Coverage", "Pension_Plan", "Risk_Code", "Weekend_Pay"
  ];

  function personnelPositionCsvRow(p) {
    const row = p.SourceRow || {};
    const dollars2 = (n) => "$" + Number(n || 0).toFixed(2);
    const dollarsPlain = (n) => "$" + Math.round(Number(n || 0));
    const pct = (n) => (Number(n || 0) * 100).toFixed(2) + "%";
    return [
      row.Dept_Code || "", p.PositionId, p.Position_Name,
      dollars2(row.Hourly_Base_Wage), row.Standard_Hours || "", pct(row.Allocation_Pct),
      row.Fund_Code || "", dollarsPlain(row.Commissioner_Vehicle_Allowance),
      row.Health_Plan || "", row.Coverage || "", row.Pension_Plan || "", row.Risk_Code || "",
      dollarsPlain(row.Weekend_Pay)
    ];
  }


  // The expandable "View Budget Lines" detail under an Expenditure Summary
  // table: every individual object-code line behind that table's rolled-up
  // totals, including any itemized sub-account (Project_Name) and Note.
  const BUDGET_LINE_PRIOR_YEAR_COLUMNS = [
    { field: "FY2020_Actual", label: "FY 2020 Actual", year: 2020, actual: true },
    { field: "FY2021_Actual", label: "FY 2021 Actual", year: 2021, actual: true },
    { field: "FY2022_Actual", label: "FY 2022 Actual", year: 2022, actual: true },
    { field: "FY2023_Actual", label: "FY 2023 Actual", year: 2023, actual: true },
    { field: "FY2024_Actual", label: "FY 2024 Actual", year: 2024, actual: true },
    { field: "FY2025_Actual", label: "FY 2025 Actual", year: 2025, actual: true },
    // Sourced from expense_original_budget_public (Supabase), not the
    // Google Sheets FY2026_Budget field. Not flagged `actual: true` --
    // budget amounts never drill through to transaction detail, only
    // historical actuals do.
    { field: "FY2026_Original_Budget", label: "FY 2026 Budget" }
  ];

  function budgetLinePriorYearColumns(isExpense) {
    return BUDGET_LINE_PRIOR_YEAR_COLUMNS;
  }

  function splitBudgetLineCodes(value) {
    return String(value || "")
      .split(",")
      .map((code) => code.trim())
      .filter(Boolean);
  }

  function revenueActualAmountForCodes(codes, year, fundCode) {
    const codeSet = new Set((codes || []).filter(Boolean));
    if (!codeSet.size || !(cache.revenueActualRows || []).length) return 0;
    // Grouped by code (not summed as one flat total) so each account's own
    // raw ledger subtotal gets its own Math.abs() below -- some revenue
    // codes (Interest, Interest (Beach Management), etc.) are booked as
    // credits/negative amounts, a per-account display convention, while
    // others under the same combined name (e.g. Constitutional Officer
    // Interest) are already positive. Summing every code's raw, unflipped
    // amount together first and taking Math.abs() once would let
    // oppositely-signed accounts partially cancel each other out instead
    // of each contributing its own correctly-flipped positive value (see
    // the same fix in rawRevenueActualSummarySum for the category-level
    // version of this bug).
    const totalsByCode = new Map();
    (cache.revenueActualRows || []).forEach((row) => {
      if (Number(row.year) !== Number(year)) return;
      const code = String(row.object || "").trim();
      if (!codeSet.has(code)) return;
      const rowFundCode = String(row.org || "").trim().slice(0, 3);
      if (CONSOLIDATED_SCHEDULE_EXCLUDED_FUND_CODES.has(rowFundCode)) return;
      // See revenueBudgetAmountForCodes: a single-department fund (e.g.
      // 107, the Sheriff Fund) should never borrow another fund's actuals
      // for a code it has no organization-scoped data of its own for.
      // Shared funds (e.g. 001) still aggregate across every org in that
      // fund, since they're all genuinely in the same fund.
      if (fundCode && rowFundCode !== fundCode) return;
      totalsByCode.set(code, (totalsByCode.get(code) || 0) + (Number(row.amount) || 0));
    });

    let total = 0;
    totalsByCode.forEach((codeTotal) => {
      total += revenueDisplayAmount(codeTotal);
    });
    return total;
  }

  function revenueBudgetAmountForCodes(codes, field, fundCode) {
    const codeSet = new Set((codes || []).filter(Boolean));
    if (!codeSet.size) return 0;
    // A shared GL code (e.g. the General Fund's Ad Valorem Taxes line,
    // Dept_Code 001311) can be referenced by two dozen different
    // departments' own revenue rows under that same Dept_Code. Their
    // FY2026_Original_Budget is intentionally NOT deduped by Dept_Name in
    // applyOriginalBudgetToRows (a different case -- one department split
    // across several Dept_Names, like Code Compliance / Code Compliance
    // Beach -- needs each one to keep the full total). Summed here without
    // a guard, that single account-level amount gets counted once per
    // department referencing it instead of once overall. revenueBudgetUniqueKey
    // (the same dedup key buildFundFinancialSchedule's sumFor already uses
    // for this exact scenario) excludes Dept_Name, so it collapses those
    // department-duplicated rows back down to one.
    //
    // fundCode (when given) additionally restricts the fallback to rows in
    // the same fund as the row being displayed. Single-department funds
    // (e.g. 107, the Sheriff Fund) should never borrow a county-wide total
    // from a fund they have nothing to do with -- a department with no
    // direct match in this fund simply has no budget for that code. Shared
    // funds (e.g. 001, the General Fund) still aggregate across every
    // department in that fund exactly as before, since they're all in the
    // same fund anyway. Callers omit fundCode entirely for combineByName's
    // merged, multi-fund county-wide rows, where no single fund applies.
    const seenKeys = new Set();
    return (cache.revenues || []).reduce((sum, row) => {
      if (!codeSet.has(String(row.Revenue_Code || "").trim())) return sum;
      if (CONSOLIDATED_SCHEDULE_EXCLUDED_FUND_CODES.has(fundCodeForRow(row))) return sum;
      if (fundCode && fundCodeForRow(row) !== fundCode) return sum;
      const key = revenueBudgetUniqueKey(row);
      if (seenKeys.has(key)) return sum;
      seenKeys.add(key);
      return sum + (row[field] || 0);
    }, 0);
  }

  function revenueDisplayAmount(value) {
    return Math.abs(Number(value) || 0);
  }

  function revenueBudgetUniqueKey(row) {
    return [
      fundCodeForRow(row),
      String((row && row.Dept_Code) || "").trim(),
      String((row && row.Revenue_Code) || "").trim(),
      String((row && row.Project_Code) || "").trim()
    ].join("|");
  }

  function budgetLineColumnAmount(row, column, isExpense) {
    if (!isExpense && column.actual) {
      // Rows backfilled by fillRevenueActualsFromExpenses already carry the
      // correct actual in row[column.field]; skip the Supabase lookup so that
      // value is used directly.
      if (row._actualsBackfilled) return revenueDisplayAmount(row[column.field] || 0);
      if (row._actualsSuppressed) return revenueDisplayAmount(row[column.field] || 0);
      if (row._actualsDeduped) return revenueDisplayAmount(row[column.field] || 0);
      // Many revenue codes (Ad Valorem Taxes, Interfund Group Transfer In,
      // etc.) are reused across many different departments/funds, each with
      // its own distinct historical amount -- they aren't one pooled,
      // county-wide collection that happens to get split out at budget
      // time. So always prefer this row's own department+code actual when
      // Supabase has it, and only fall back to the unscoped county-wide
      // lookup when there's genuinely no department-level data to scope to
      // (e.g. a revenue source that really was only ever tracked centrally).
      const scoped = sumRawActualsForLookups(
        cache.revenueActualRows,
        supabaseLookupsForRow(row, row.Dept_Code, row.Revenue_Code),
        column.year,
        projectScopeForRow(row)
      );
      if (scoped.matched) return revenueDisplayAmount(scoped.total);
      return revenueDisplayAmount(
        revenueActualAmountForCodes(splitBudgetLineCodes(row.Revenue_Code), column.year, fundCodeForRow(row))
      );
    }
    if (!isExpense && column.field === "FY2026_Original_Budget") {
      const rowOverride = departmentRevenueFy2026PlugOverrideForRow(row);
      if (rowOverride) return rowOverride;
      // Checked directly here too (not just in applyOriginalBudgetToRows,
      // which sets row.FY2026_Original_Budget upstream) so this modal's own
      // display is correct even if row.FY2026_Original_Budget somehow
      // didn't carry the override through -- see revenueFy2026PlugOverride.
      const plugOverride = revenueFy2026PlugOverride(row);
      if (plugOverride) return plugOverride;
      const codes = splitBudgetLineCodes(row.Revenue_Code);
      const fundCode = fundCodeForRow(row);
      const rowAmount = row.FY2026_Original_Budget || row.FY2026_Budget || 0;
      if (row._suppressRevenueBudgetFallback || row._originalBudgetDeduped) {
        return revenueDisplayAmount(row.FY2026_Original_Budget || 0);
      }
      return revenueDisplayAmount(rowAmount ||
        revenueBudgetAmountForCodes(codes, "FY2026_Original_Budget", fundCode) ||
        revenueBudgetAmountForCodes(codes, "FY2026_Budget", fundCode));
    }
    return row[column.field] || 0;
  }

  function budgetLineColumnTotal(rows, column, isExpense) {
    if (!isExpense && column.actual) {
      // See budgetLineColumnAmount: prefer each row's own department-scoped
      // actual when Supabase has it, summed once per distinct
      // department+code pair, and only fold a code into the unscoped
      // county-wide lookup when no row in this table has department-level
      // data for it at all.
      // Backfilled rows (fillRevenueActualsFromExpenses) use their row field
      // value directly and are excluded from the Supabase lookup path.
      let backfilledTotal = 0;
      const codes = [];
      const scopedPairsSeen = new Set();
      let scopedTotal = 0;
      let fundCode = "";
      (rows || []).forEach((row) => {
        if (!fundCode) fundCode = fundCodeForRow(row);
        if (row._actualsBackfilled) {
          backfilledTotal += revenueDisplayAmount(row[column.field] || 0);
          return;
        }
        if (row._actualsSuppressed) return;
        if (row._actualsDeduped) return;
        splitBudgetLineCodes(row.Revenue_Code).forEach((code) => {
          const pairKey = String(row.Dept_Code || "").trim() + "|" + code;
          if (scopedPairsSeen.has(pairKey)) return;
          const scoped = sumRawActualsForLookups(
            cache.revenueActualRows,
            supabaseLookupsForRow(row, row.Dept_Code, code),
            column.year,
            projectScopeForRow(row)
          );
          if (scoped.matched) {
            scopedPairsSeen.add(pairKey);
            scopedTotal += scoped.total;
            return;
          }
          if (!codes.includes(code)) codes.push(code);
        });
      });
      return backfilledTotal + revenueDisplayAmount(revenueActualAmountForCodes(codes, column.year, fundCode) + scopedTotal);
    }
    if (!isExpense && column.field === "FY2026_Original_Budget") {
      // A zero rowAmount is ambiguous: it can mean "no data for this row,
      // fall back to a code-level lookup" (the original intent below) or
      // "this row's account-level total is already counted by another row
      // sharing the same code" (applyOriginalBudgetToRows zeroes every row
      // but the first in a department+code group on purpose). Tracking
      // which codes already have a real rowAmount keeps the second case
      // from also pulling in a countywide fallback on top of the correct,
      // already-counted amount.
      const codesWithRowAmount = new Set();
      const fallbackCodes = [];
      let rowTotal = 0;
      let fundCode = "";
      (rows || []).forEach((row) => {
        if (!fundCode) fundCode = fundCodeForRow(row);
        if (row._originalBudgetDeduped) return;
        const rowOverride = departmentRevenueFy2026PlugOverrideForRow(row);
        if (rowOverride) {
          rowTotal += rowOverride;
          splitBudgetLineCodes(row.Revenue_Code).forEach((code) => codesWithRowAmount.add(code));
          return;
        }
        const plugOverride = revenueFy2026PlugOverride(row);
        if (plugOverride) {
          rowTotal += plugOverride;
          splitBudgetLineCodes(row.Revenue_Code).forEach((code) => codesWithRowAmount.add(code));
          return;
        }
        const rowAmount = row.FY2026_Original_Budget || row.FY2026_Budget || 0;
        const codes = splitBudgetLineCodes(row.Revenue_Code);
        if (rowAmount) {
          rowTotal += rowAmount;
          codes.forEach((code) => codesWithRowAmount.add(code));
          return;
        }
        codes.forEach((code) => {
          if (!fallbackCodes.includes(code)) fallbackCodes.push(code);
        });
      });
      const eligibleFallbackCodes = fallbackCodes.filter((code) => !codesWithRowAmount.has(code));
      const fallbackTotal =
        revenueBudgetAmountForCodes(eligibleFallbackCodes, "FY2026_Original_Budget", fundCode) ||
        revenueBudgetAmountForCodes(eligibleFallbackCodes, "FY2026_Budget", fundCode);
      return revenueDisplayAmount(rowTotal + fallbackTotal);
    }
    return (rows || []).reduce((sum, row) => sum + (row[column.field] || 0), 0);
  }

  function itemizedDescriptionForBudgetLine(row, descriptionField, isExpense) {
    if (!descriptionField && isExpense) {
      if (row.Project_Name && row.Note && row.Project_Name !== row.Note) return row.Project_Name + " — " + row.Note;
      return row.Project_Name || row.Note || "";
    }
    if (!descriptionField) return row.Note || row.Project_Name || "";
    const primary = row[descriptionField] || "";
    const fallback = isExpense ? (row.Project_Name || row.Note || "") : (row.Note || row.Project_Name || "");
    if (primary && fallback && primary !== fallback) return primary + " — " + fallback;
    return primary || fallback || "";
  }

  function slugParam(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  // Transaction links from budget/revenue line tables are always rendered
  // in the markup, but are only visible/clickable in dark mode -- see the
  // `:root[data-theme="dark"] .wc-actual-drilldown-link` override in
  // style.css, which is what actually gates them (this flag stays true so
  // the underlying <a> exists for CSS to turn on).
  const TRANSACTION_DRILLDOWN_ENABLED = true;

  function transactionDrilldownEnabledForRow(row, fields) {
    if (!TRANSACTION_DRILLDOWN_ENABLED) {
      return false;
    }
    if ((fields && fields.kind) === "revenue") {
      return !!(
        row &&
        row.Dept_Code &&
        row.Revenue_Code &&
        splitBudgetLineCodes(row.Revenue_Code).length === 1 &&
        !(fields && fields.combineByName)
      );
    }
    // Every department's expenditure rows carry the same Dept_Code/Object_Code
    // shape (see transactionHrefForBudgetLine), so drilldown applies
    // department-agnostically here, same as the revenue branch above.
    return !!(
      row &&
      row.Dept_Code &&
      row[(fields && fields.codeField) || "Object_Code"] &&
      !(fields && fields.combineByName)
    );
  }

  function currentBudgetLinesReturnUrl(detailId) {
    if (!detailId || !window || !window.location) return "";
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("openBudgetLines", detailId);
      return url.href;
    } catch (e) {
      return "";
    }
  }

  function transactionHrefForBudgetLine(row, column, fields) {
    if (!column.actual || !transactionDrilldownEnabledForRow(row, fields)) return "";
    // Must match what the cell actually displays (budgetLineColumnAmount),
    // not row[column.field] directly: for revenue, the displayed actual is
    // a county-wide lookup by Revenue_Code, independent of which row in an
    // account-level dedup group this one is. Reading row[column.field]
    // directly would show $0 (and no link) for every row that the account
    // dedup zeroed, even though the cell is correctly showing a real,
    // non-zero amount sourced from the same account total.
    const isExpense = !fields || fields.kind !== "revenue";
    const amount = budgetLineColumnAmount(row, column, isExpense);
    if (!amount) return "";

    const params = new URLSearchParams();
    const category = row[fields.categoryField] || "";
    const objectCode = Array.isArray(row._mergedObjectCodes) && row._mergedObjectCodes.length
      ? row._mergedObjectCodes.join(",")
      : (row[fields.codeField] || "");
    const objectName = row[fields.nameField] || "";
    const projectCode = row.Project_Code || "";
    const projectName = row.Project_Name || "";
    const deptCode = row.Dept_Code || "";
    if (!objectCode || !deptCode) return "";
    // Some departments' transaction history is split across legacy org
    // codes (see DEPT_CODE_ACTUALS_ALIASES); pass all of them so the
    // transaction detail page's query isn't limited to the current code
    // alone and missing years recorded under a prior code.
    const orgCodes = deptCode ? [deptCode].concat(DEPT_CODE_ACTUALS_ALIASES[deptCode] || []) : [];
    const transactionPage = window.location.pathname.indexOf("/pages/") !== -1 ? "transactions.html" : "pages/transactions.html";

    params.set("fy", String(column.year));
    params.set("category", slugParam(category));
    params.set("categoryLabel", category);
    params.set("kind", fields.kind || "expense");
    params.set("selectedActual", String((fields.kind || "expense") === "revenue" ? Math.abs(amount) : amount));
    params.set("objectCode", objectCode);
    params.set("objectName", objectName);
    params.set("org", orgCodes.join(","));
    params.set("departmentCode", deptCode);
    params.set("departmentName", row.Dept_Name || "");
    params.set("fundCode", fundCodeForRow(row));
    const returnTo = currentBudgetLinesReturnUrl(fields && fields.detailId);
    if (returnTo) params.set("returnTo", returnTo);
    if (projectCode) params.set("projectCode", projectCode);
    if (projectName) params.set("program", projectName);

    return transactionPage + "?" + params.toString();
  }

  // Object codes that should never appear as their own itemized row in any
  // Budget Lines / Revenue Lines detail table -- not real Chart of
  // Accounts accounts (500000 is a generic/rollup code with no Object_Name
  // of its own; 523004 is a stray sub-code variant), just noise picked up
  // by synthesizeMissingExpenseRows. Filtered here, not at the source, so
  // they're hidden from every "View Budget Lines" view without touching
  // whatever totals already sum over cache.expenditures.
  const HIDDEN_BUDGET_LINE_OBJECT_CODES = new Set(["500000", "523004"]);

  function renderBudgetLinesToggle(rows, descriptionField, kind, combineByName, forceDisablePriorYears, currentBudgetOnly) {
    if (!rows || !rows.length) return { button: "", detail: "" };
    const isExpense = kind !== "revenue";
    const usesRevenueYearPicker = !isExpense && !!combineByName;
    const codeFieldForFilter = isExpense ? "Object_Code" : "Revenue_Code";
    rows = rows.filter((r) => !HIDDEN_BUDGET_LINE_OBJECT_CODES.has(String(r[codeFieldForFilter] || "").trim()));
    if (!rows.length) return { button: "", detail: "" };
    budgetLinesDetailCounter += 1;
    const detailId = "wc-budget-lines-" + budgetLinesDetailCounter;
    // forceDisablePriorYears covers secondary sub-program
    // expense cards (e.g. Code Compliance Beach) whose FY2026 figures
    // aren't reliable on their own -- see renderTypeSummaryTable's
    // showChange.
    const isPriorYearsDisabled = !!forceDisablePriorYears;
    const codeField = isExpense ? "Object_Code" : "Revenue_Code";
    const nameField = isExpense ? "Object_Name" : "Revenue_Name";
    const categoryField = isExpense ? "Object_Type" : "Revenue_Type";
    const descField = descriptionField || "Note";
    const priorYearColumns = currentBudgetOnly
      ? budgetLinePriorYearColumns(isExpense).filter((c) => c.field === "FY2026_Original_Budget")
      : budgetLinePriorYearColumns(isExpense);
    const priorYearActualFields = new Set(priorYearColumns.filter((c) => c.actual).map((c) => c.field));

    function revenueActualsAreDedicatedToRow(row) {
      if (isExpense || combineByName) return true;
      return revenueActualsAreDedicatedToDepartmentRow(row, codeField);
    }

    const priorYearsToggleDisabled = isPriorYearsDisabled;
    // The "View Prior Years" state is shared by every table during the
    // current page view (see getShowPriorYears), so it isn't
    // enough to just hide this table's own checkbox -- showPrior has to be
    // forced false here too, or toggling it on anywhere else on the page
    // would still expand this table's prior-year columns.
    const showPrior = currentBudgetOnly ? true : (priorYearsToggleDisabled ? false : getShowPriorYears());

    // On consolidated/county-wide summaries, combine rows that share the
    // same name (e.g. the same revenue source collected under several
    // departments' Dept_Codes) into one line. On a single department's own
    // breakdown, every row is kept separate so distinct budget lines that
    // happen to share an Object/Revenue Name aren't hidden from each other.
    // On the Summary of Revenues' county-wide list, the many individual
    // "State Grant (X)"/"Federal Grant (X)" lines (one per activity, see
    // REVENUE_CODE_OVERRIDES) are still one program-level source of money
    // as far as most readers care -- collapsed into a single "State
    // Grants"/"Federal Grants" row each, same mechanism as the by-name
    // merge below.
    function collapsedBudgetLineName(rawName) {
      return isExpense ? rawName : collapsedRevenueSourceName(rawName);
    }

    function departmentRevenueLineMergeName(row) {
      if (isExpense) return "";
      const code = String((row && row[codeField]) || "").trim();
      const name = String((row && row[nameField]) || "");
      const dept = normalizeDeptName(row && row.Dept_Name);
      const normalizedName = normalizeDeptName(name);
      if (/interest/i.test(name)) return "Interest";
      if (/^tourist development tax/i.test(name) || code === "312140" || normalizedName === "tourist development tax other") {
        if (dept.indexOf("north walton") !== -1) return "North Walton Tourist Development Tax";
        return "Tourist Development Taxes";
      }
      // Library grant revenue should roll up only the project-specific
      // revenue rows, not every Library row that happens to share a grant
      // account name.
      if (isLibraryProjectRevenueRow(row) && /^State Grant\b/.test(name)) return "State Grants";
      if (isLibraryProjectRevenueRow(row) && /^Federal Grant\b/.test(name)) return "Federal Grants";
      return "";
    }

    function mergeDepartmentRevenueLineRows(rowsToMerge) {
      if (isExpense || combineByName) return rowsToMerge;
      const sumFields = priorYearColumns.map((c) => c.field)
        .concat(["FY2026_Budget", "FY2026_Plug", "FY2027_Proposed"]);
      // Sums each row's own already-resolved field value -- the same
      // approach the existing Interest/Tourist Development Tax merges use.
      // Routing merged-away rows back through budgetLineColumnAmount's live
      // Supabase lookup was tried and reverted: for a row whose actual
      // isn't backed by an exact department+code match, that lookup falls
      // back to an unscoped fund/county-wide total instead of this
      // department's own figure, inflating the merged sum.
      function contributionForField(row, field) {
        return Number(row[field]) || 0;
      }
      const grouped = new Map();
      const output = [];
      rowsToMerge.forEach((row) => {
        const mergeName = departmentRevenueLineMergeName(row);
        if (!mergeName) {
          output.push(row);
          return;
        }
        const key = [row[categoryField] || "", mergeName].join("||");
        const existing = grouped.get(key);
        if (!existing) {
          const merged = Object.assign({}, row, {
            [nameField]: mergeName,
            [codeField]: String(row[codeField] || ""),
            [descField]: itemizedDescriptionForBudgetLine(row, descriptionField, isExpense),
            _actualsDeduped: true,
            _originalBudgetDeduped: true,
            _suppressRevenueBudgetFallback: true
          });
          sumFields.forEach((field) => { merged[field] = contributionForField(row, field); });
          grouped.set(key, merged);
          output.push(merged);
          return;
        }
        if (row[codeField] && !splitBudgetLineCodes(existing[codeField]).includes(String(row[codeField]).trim())) {
          existing[codeField] = [existing[codeField], row[codeField]].filter(Boolean).join(", ");
        }
        const description = itemizedDescriptionForBudgetLine(row, descriptionField, isExpense);
        if (description && !String(existing[descField] || "").split("; ").includes(description)) {
          existing[descField] = [existing[descField], description].filter(Boolean).join("; ");
        }
        sumFields.forEach((field) => {
          existing[field] = (Number(existing[field]) || 0) + contributionForField(row, field);
        });
      });
      return output;
    }

    let mergedRows = rows;
    if (combineByName) {
      const sumFields = priorYearColumns.map((c) => c.field).concat(["FY2027_Proposed"]);
      const grouped = new Map();
      // Several Dept_Name rows can share the same revenueBudgetUniqueKey
      // (fund+Dept_Code+Revenue_Code+Project_Code) -- e.g. Beach Vending
      // Permits has both a "Code Compliance" and a "Board of County
      // Commissioners" row under the same Dept_Code, where only the BCC
      // row's BUC lookup happens to include the Managed Vendor Program
      // project. Keeping whichever same-key row is encountered *first*
      // and zeroing every later one (the previous behavior) meant array
      // order alone decided whether the smaller, incomplete figure or the
      // larger, correct one survived -- silently dropping real budget
      // dollars whenever the incomplete row happened to come first. Like
      // dedupedRevenueSum's own FY2026 handling on the Consolidated
      // Revenue Summary, this now keeps the larger (MAX) contribution per
      // key so the two tables agree regardless of row order.
      const bestByKeyPerName = new Map();
      rows.forEach((r) => {
        const name = collapsedBudgetLineName(r[nameField] || "");
        const existing = grouped.get(name);
        const description = itemizedDescriptionForBudgetLine(r, descriptionField, isExpense);
        const rowDeptCode = String(r.Dept_Code || "").trim();
        if (!existing) {
          const merged = {
            codes: [r[codeField] || ""].filter(Boolean),
            descriptions: description ? [description] : [],
            category: r[categoryField] || "",
            // Tracks whether every row folded into this name shares one
            // Dept_Code -- if so, the merged row can carry it forward so
            // budgetLineColumnAmount's per-row Supabase lookup stays scoped
            // to that one fund/department instead of silently falling back
            // to its all-funds total (see deptCode below). A name spanning
            // several departments (the normal case for a county-wide
            // rollup like "Ad Valorem Taxes") correctly gets no Dept_Code,
            // same as before.
            deptCode: rowDeptCode,
            deptCodeConsistent: true
          };
          sumFields.forEach((f) => {
            if (!isExpense && f === "FY2026_Original_Budget") {
              const key = revenueBudgetUniqueKey(r);
              const bestByKey = bestByKeyPerName.get(name) || new Map();
              const contribution = revenueBudgetMergeContribution(r);
              bestByKey.set(key, contribution);
              bestByKeyPerName.set(name, bestByKey);
              merged[f] = contribution;
            } else {
              merged[f] = r[f] || 0;
            }
          });
          grouped.set(name, merged);
          return;
        }
        if (r[codeField] && !existing.codes.includes(r[codeField])) existing.codes.push(r[codeField]);
        if (description && !existing.descriptions.includes(description)) existing.descriptions.push(description);
        if (existing.deptCodeConsistent && rowDeptCode !== existing.deptCode) existing.deptCodeConsistent = false;
        sumFields.forEach((f) => {
          if (!isExpense && f === "FY2026_Original_Budget") {
            const key = revenueBudgetUniqueKey(r);
            const bestByKey = bestByKeyPerName.get(name) || new Map();
            const contribution = revenueBudgetMergeContribution(r);
            const previousBest = bestByKey.has(key) ? bestByKey.get(key) : null;
            if (previousBest === null) {
              existing[f] += contribution;
              bestByKey.set(key, contribution);
            } else if (contribution > previousBest) {
              existing[f] += contribution - previousBest;
              bestByKey.set(key, contribution);
            }
            bestByKeyPerName.set(name, bestByKey);
          } else {
            existing[f] += r[f] || 0;
          }
        });
      });
      mergedRows = Array.from(grouped.entries()).map(([name, merged]) => {
        const row = { [nameField]: name, [codeField]: merged.codes.join(", "), [descField]: merged.descriptions.join("; "), [categoryField]: merged.category };
        if (merged.deptCodeConsistent && merged.deptCode) row.Dept_Code = merged.deptCode;
        sumFields.forEach((f) => { row[f] = merged[f]; });
        return row;
      });
      // A merged, county-wide name with zero dollars in every single year
      // (e.g. a retired account code with no activity ever recorded) is
      // just noise on the Summary of Revenues/Expenses "View Budget Lines"
      // list. Only applied here (combineByName's merged rows), not to a
      // single department's own popup -- there a $0 row can still mean
      // "this department has budget authority here but didn't collect/
      // spend anything this year," which is worth keeping visible.
      mergedRows = mergedRows.filter((row) => sumFields.some((f) => (row[f] || 0) !== 0));
    } else {
      mergedRows = mergeDepartmentRevenueLineRows(mergedRows);
      if (!isExpense) {
        const visibleFields = priorYearColumns.map((c) => c.field)
          .concat(["FY2026_Budget", "FY2026_Plug", "FY2027_Proposed"]);
        mergedRows = mergedRows.filter((row) =>
          visibleFields.some((field) => Math.abs(Number(row[field]) || 0) > 0.005)
        );
      }
    }

    const fy2026BudgetColumn = priorYearColumns.find((c) => c.field === "FY2026_Original_Budget");
    const revenueFy2026PlugByKey = new Map();
    function revenuePlugKey(row) {
      return [
        normalizeDeptName(row && row.Dept_Name),
        String((row && row.Dept_Code) || "").trim(),
        String((row && row[codeField]) || "").trim(),
        String((row && row[nameField]) || "").trim(),
        String((row && row.Project_Code) || "").trim()
      ].join("|");
    }
    if (!isExpense && !combineByName && fy2026BudgetColumn) {
      const revenueDeptNames = new Set(rows.map((row) => normalizeDeptName(row.Dept_Name)).filter(Boolean));
      const revenueDeptCodes = new Set(rows.map((row) => String(row.Dept_Code || "").trim()).filter(Boolean));
      const expenseRowsByName = (cache.expenditures || []).filter((row) => revenueDeptNames.has(normalizeDeptName(row.Dept_Name)));
      const expenseRowsForPlug = expenseRowsByName.length
        ? expenseRowsByName
        : (cache.expenditures || []).filter((row) => revenueDeptCodes.has(String(row.Dept_Code || "").trim()));
      const expenseTargetTotal = expenseRowsForPlug.reduce((sum, row) => {
        return sum + (row.FY2026_Original_Budget || row.FY2026_Budget || 0);
      }, 0);
      const sheetTargetTotal = rows.reduce((sum, row) => {
        return sum + revenueDisplayAmount(row.FY2026_Plug || row.FY2026_Budget || 0);
      }, 0);
      const dedicatedTotal = mergedRows.reduce((sum, row) => {
        return revenueActualsAreDedicatedToRow(row) ? sum + budgetLineColumnAmount(row, fy2026BudgetColumn, false) : sum;
      }, 0);
      const plugOverride = departmentRevenueFy2026PlugOverrideForRows(rows);
      const targetTotal = plugOverride ? plugOverride + dedicatedTotal : (expenseTargetTotal || sheetTargetTotal);
      const plugRows = mergedRows.filter((row) => !revenueActualsAreDedicatedToRow(row) && (row.FY2027_Proposed || 0) > 0);
      const plugTotal = targetTotal - dedicatedTotal;
      if (plugRows.length && Math.abs(plugTotal) > 0.005) {
        const proposedTotal = plugRows.reduce((sum, row) => sum + (row.FY2027_Proposed || 0), 0);
        let assigned = 0;
        plugRows.forEach((row, index) => {
          const amount = index === plugRows.length - 1
            ? plugTotal - assigned
            : (proposedTotal ? plugTotal * ((row.FY2027_Proposed || 0) / proposedTotal) : 0);
          assigned += amount;
          revenueFy2026PlugByKey.set(revenuePlugKey(row), amount);
        });
      }
    }

    function budgetLineVisibleColumnAmount(row, column) {
      if (!isExpense && priorYearActualFields.has(column.field) && !revenueActualsAreDedicatedToRow(row)) {
        if (!row._actualsBackfilled) {
          if (isGeneralFundRevenuePlugRow(row)) return null;
          return revenueDisplayAmount(row[column.field] || 0);
        }
      }
      const plugKey = revenuePlugKey(row);
      if (!isExpense && column.field === "FY2026_Original_Budget" && row._groupedBudgetLineSummary) {
        const rowOverride = departmentRevenueFy2026PlugOverrideForRow(row);
        if (rowOverride) return rowOverride;
        const plugOverride = revenueFy2026PlugOverride(row);
        if (plugOverride) return plugOverride;
        return revenueDisplayAmount(row.FY2026_Original_Budget || row.FY2026_Budget || 0);
      }
      if (!isExpense && column.field === "FY2026_Original_Budget") {
        const plugOverride = revenueFy2026PlugOverride(row);
        if (plugOverride) return plugOverride;
      }
      if (!isExpense && column.field === "FY2026_Original_Budget" && revenueFy2026PlugByKey.has(plugKey)) {
        return revenueDisplayAmount(revenueFy2026PlugByKey.get(plugKey));
      }
      if (!isExpense && column.field === "FY2026_Original_Budget" && !revenueActualsAreDedicatedToRow(row)) {
        return revenueDisplayAmount(row.FY2026_Plug || row.FY2026_Budget || 0);
      }
      return budgetLineColumnAmount(row, column, isExpense);
    }

    function groupedPriorYearRows() {
      const sumFields = priorYearColumns.map((c) => c.field).concat(["FY2027_Proposed"]);
      const grouped = new Map();
      // Tracks every distinct project scope seen per group key, so
      // Project_Code can be set on the merged row only when every row
      // folded into it agrees on one scope (see below).
      const projectScopesSeen = new Map();
      mergedRows.forEach((r) => {
        const key = [r[categoryField] || "", r[codeField] || "", r[nameField] || ""].join("||");
        const existing = grouped.get(key);
        const scope = projectScopeForRow(r);
        if (scope !== undefined) {
          const seen = projectScopesSeen.get(key) || new Set();
          seen.add(scope);
          projectScopesSeen.set(key, seen);
        }
        if (!existing) {
          const row = {
            [categoryField]: r[categoryField] || "",
            [codeField]: r[codeField] || "",
            [nameField]: r[nameField] || "",
            [descField]: "",
            // Needed by transactionHrefForBudgetLine/transactionDrilldownEnabledForRow.
            // Dept_Name/Dept_Code are identical across every row here (mergedRows is
            // already scoped to one department), so the first row's value is safe.
            Dept_Name: r.Dept_Name || "",
            Dept_Code: r.Dept_Code || "",
            _actualsBackfilled: r._actualsBackfilled || false,
            _actualsSuppressed: r._actualsSuppressed || false,
            _actualsDeduped: r._actualsDeduped || false,
            _suppressRevenueBudgetFallback: r._suppressRevenueBudgetFallback || false,
            _groupedBudgetLineSummary: true
          };
          sumFields.forEach((f) => {
            row[f] = (!isExpense && f === "FY2026_Original_Budget")
              ? budgetLineVisibleColumnAmount(r, fy2026BudgetColumn)
              : ((!isExpense && priorYearActualFields.has(f) && !revenueActualsAreDedicatedToRow(r) && !r._actualsBackfilled && isGeneralFundRevenuePlugRow(r)) ? 0 : (r[f] || 0));
          });
          grouped.set(key, row);
          return;
        }
        if (r._actualsBackfilled) existing._actualsBackfilled = true;
        if (r._actualsSuppressed) existing._actualsSuppressed = true;
        if (r._actualsDeduped) existing._actualsDeduped = true;
        if (r._suppressRevenueBudgetFallback) existing._suppressRevenueBudgetFallback = true;
        sumFields.forEach((f) => {
          existing[f] += (!isExpense && f === "FY2026_Original_Budget")
            ? budgetLineVisibleColumnAmount(r, fy2026BudgetColumn)
            : ((!isExpense && priorYearActualFields.has(f) && !revenueActualsAreDedicatedToRow(r) && !r._actualsBackfilled && isGeneralFundRevenuePlugRow(r)) ? 0 : (r[f] || 0));
        });
      });
      // Project_Code is set on a merged row only when every row folded into
      // it shares the exact same project scope (e.g. Health Department,
      // whose one fixed project applies to its only row). When a group
      // mixes several different scopes -- Statutory & Other can merge
      // several distinct recipients sharing one Object_Code/Name under
      // different Project_Codes -- or a normal department's rows just don't
      // carry a scope at all, Project_Code is left unset, so the resulting
      // transaction filter falls back to department+code only, matching
      // every transaction the merged total was actually built from instead
      // of under-counting it down to one recipient's project.
      grouped.forEach((row, key) => {
        const scopes = projectScopesSeen.get(key);
        if (scopes && scopes.size === 1) {
          row.Project_Code = Array.from(scopes)[0];
        }
      });
      return Array.from(grouped.values());
    }

    function budgetLineRowHtml(r, rowClass, suppressDescription) {
      const isZeroCurrent = (r.FY2027_Proposed || 0) === 0;
      const drilldownFields = { categoryField, codeField, nameField, kind: isExpense ? "expense" : "revenue", combineByName, detailId };
      return (
        '<tr class="' + rowClass + (isZeroCurrent ? " wc-budget-line-zero-current" : "") + '">' +
        '<td class="wc-category-column">' + escapeHtml(r[categoryField] || "") + "</td>" +
        (isExpense ? '<td class="wc-object-code-column">' + escapeHtml(r[codeField] || "") + "</td>" : "") +
        "<td>" + escapeHtml(r[nameField] || "") + "</td>" +
        '<td class="wc-itemized-description-column">' + escapeHtml(suppressDescription ? "" : itemizedDescriptionForBudgetLine(r, descriptionField, isExpense)) + "</td>" +
        priorYearColumns.map((c) => {
          const href = transactionHrefForBudgetLine(r, c, drilldownFields);
          const amount = budgetLineVisibleColumnAmount(r, c);
          const value = amount === null ? "—" : formatCurrency(amount);
          const drilldownLabel = "View " + c.label + " transaction detail for " +
            (r[nameField] || r[codeField] || "this budget line") + " actual amount " + value;
          return '<td class="wc-num wc-prior-year wc-fy-' + c.year + '">' +
            (href && amount !== null ? '<a class="wc-actual-drilldown-link" href="' + escapeHtml(href) + '" aria-label="' + escapeHtml(drilldownLabel) + '">' + value + "</a>" : value) +
            "</td>";
        }).join("") +
        '<td class="wc-num wc-fy-2027 wc-revenue-budget-year">' + formatCurrency(r.FY2027_Proposed || 0) + "</td>" +
        (usesRevenueYearPicker ? '<td class="wc-num wc-fy-2028 wc-revenue-projected">' + formatCurrency(projectedRevenueRowsAmount([r], 2028)) + '</td><td class="wc-num wc-fy-2029 wc-revenue-projected">' + formatCurrency(projectedRevenueRowsAmount([r], 2029)) + '</td>' : '') +
        "</tr>"
      );
    }

    function budgetLineSubtotalRowHtml(category, categoryRows, rowClass) {
      // The mobile Category/Object Code column-drop (mobile.css) hides
      // both of these cells on every row, including this one -- so the
      // label also carries a data-wc-mobile-label on the very next cell
      // (Object/Revenue Name, otherwise blank on this row) and mobile.css
      // renders that as its content via ::before. Keeping the label out
      // of an extra always-visible cell means this row has exactly the
      // same number of visible cells as every data row once Category and
      // Object Code are hidden, instead of one more -- a mismatched cell
      // count per row is what was throwing off column alignment.
      const subtotalLabel = escapeHtml(category) + " Subtotal";
      const labelCells =
        '<td class="wc-category-column">' + subtotalLabel + "</td>" +
        (isExpense ? '<td class="wc-object-code-column"></td>' : "") +
        '<td data-wc-mobile-label="' + subtotalLabel + '"></td>' +
        '<td class="wc-itemized-description-column"></td>';
      return (
        '<tr class="' + rowClass + ' wc-table-subtotal-row">' + labelCells +
          priorYearColumns.map((c) =>
            '<td class="wc-num wc-prior-year wc-fy-' + c.year + '">' + formatCurrency(categoryRows.reduce((sum, row) => sum + (budgetLineVisibleColumnAmount(row, c) || 0), 0)) + "</td>"
          ).join("") +
          '<td class="wc-num wc-fy-2027 wc-revenue-budget-year">' + formatCurrency(categoryRows.reduce((sum, r) => sum + (r.FY2027_Proposed || 0), 0)) + "</td>" +
          (usesRevenueYearPicker ? '<td class="wc-num wc-fy-2028 wc-revenue-projected">' + formatCurrency(projectedRevenueRowsAmount(categoryRows, 2028)) + '</td><td class="wc-num wc-fy-2029 wc-revenue-projected">' + formatCurrency(projectedRevenueRowsAmount(categoryRows, 2029)) + '</td>' : '') +
          "</tr>"
      );
    }

    // One subtotal row per category (Personnel Services, Operating
    // Expenditures, Capital Outlay, etc.) right after that category's own
    // rows, grouped in the order each category first appears once sorted
    // by code (which already clusters by category, since object/revenue
    // codes are assigned in category blocks). Skipped when there's only
    // one category in this set -- a single-category table (e.g. a
    // one-line supplemental card) would otherwise get a subtotal that
    // just repeats the grand total below it.
    function budgetLineRowsHtml(rowsToRender, rowClass, suppressDescription) {
      const sorted = rowsToRender
        .slice()
        .sort((a, b) => String(a[codeField] || "").localeCompare(String(b[codeField] || "")));

      const categoryOrder = [];
      const rowsByCategory = new Map();
      sorted.forEach((r) => {
        const category = r[categoryField] || "Other";
        if (!rowsByCategory.has(category)) {
          categoryOrder.push(category);
          rowsByCategory.set(category, []);
        }
        rowsByCategory.get(category).push(r);
      });

      if (categoryOrder.length <= 1) {
        return sorted.map((r) => budgetLineRowHtml(r, rowClass, suppressDescription));
      }

      const html = [];
      categoryOrder.forEach((category) => {
        const categoryRows = rowsByCategory.get(category);
        categoryRows.forEach((r) => html.push(budgetLineRowHtml(r, rowClass, suppressDescription)));
        html.push(budgetLineSubtotalRowHtml(category, categoryRows, rowClass));
      });
      return html;
    }

    const summaryRows = groupedPriorYearRows();
    const bodyRows = budgetLineRowsHtml(mergedRows, "wc-budget-line-detail-row", false)
      .concat(budgetLineRowsHtml(summaryRows, "wc-budget-line-summary-row", true));
    function visiblePriorYearTotal(rowsToTotal, column) {
      return (rowsToTotal || []).reduce((sum, row) => sum + (budgetLineVisibleColumnAmount(row, column) || 0), 0);
    }
    function formatYearList(years) {
      if (!years.length) return "";
      if (years.length === 1) return String(years[0]);
      if (years.length === 2) return years[0] + " and " + years[1];
      return years.slice(0, -1).join(", ") + ", and " + years[years.length - 1];
    }
    const totalFields = priorYearColumns.map((c) => c.field).concat(["FY2027_Proposed"]);
    const totals = {};
    totalFields.forEach((field) => {
      totals[field] = mergedRows.reduce((sum, row) => sum + (row[field] || 0), 0);
    });
    const hasBudgetValue = (totals.FY2026_Original_Budget || 0) !== 0 || (totals.FY2027_Proposed || 0) !== 0;
    const missingActualYears = hasBudgetValue
      ? priorYearColumns
        .filter((c) => c.actual && visiblePriorYearTotal(summaryRows, c) === 0)
        .map((c) => c.year)
      : [];
    const generatedActualsNoteExcluded = mergedRows.length &&
      GENERATED_ACTUALS_NOTE_EXCLUDED_DEPT_NAMES.has(normalizeDeptName(mergedRows[0].Dept_Name));
    const generatedActualsNoteText = (missingActualYears.length && !generatedActualsNoteExcluded)
      ? "Due to an accounting change actuals for " + formatYearList(missingActualYears) + " are not captured in this report, please reach out to the Office of Management and Budget if you wish to view those years."
      : "";
    const totalLabelCells =
      '<td class="wc-category-column">Total</td>' +
      (isExpense ? '<td class="wc-object-code-column"></td>' : "") +
      '<td data-wc-mobile-label="Total"></td>' +
      '<td class="wc-itemized-description-column"></td>';
    bodyRows.push(
      '<tr class="wc-table-total-row">' + totalLabelCells +
        priorYearColumns.map((c) =>
          '<td class="wc-num wc-prior-year wc-fy-' + c.year + '">' + formatCurrency(visiblePriorYearTotal(summaryRows, c)) + "</td>"
        ).join("") +
        '<td class="wc-num wc-fy-2027 wc-revenue-budget-year">' + formatCurrency(totals.FY2027_Proposed || 0) + "</td>" +
        (usesRevenueYearPicker ? '<td class="wc-num wc-fy-2028 wc-revenue-projected">' + formatCurrency(projectedRevenueRowsAmount(mergedRows, 2028)) + '</td><td class="wc-num wc-fy-2029 wc-revenue-projected">' + formatCurrency(projectedRevenueRowsAmount(mergedRows, 2029)) + '</td>' : '') +
        "</tr>"
    );

    const detailTable = renderTable({
      columns: [{ label: "Category", classes: ["wc-category-column"] }]
        .concat(isExpense ? [{ label: "Object Code", classes: ["wc-object-code-column"] }] : [])
        .concat([
          { label: isExpense ? "Object Name" : "Revenue Name" },
          { label: "Itemized Description", classes: ["wc-itemized-description-column"] }
        ])
        .concat(
          priorYearColumns.map((c) => ({ label: c.label, num: true, classes: ["wc-prior-year", "wc-fy-" + c.year] })),
          [{ label: "FY 2027 Proposed", num: true, classes: ["wc-fy-2027", "wc-revenue-budget-year"] }].concat(usesRevenueYearPicker ? [
            { label: "FY 2028 Projected", num: true, classes: ["wc-fy-2028", "wc-revenue-projected"] },
            { label: "FY 2029 Projected", num: true, classes: ["wc-fy-2029", "wc-revenue-projected"] }
          ] : [])
        ),
      bodyRows: bodyRows
    });

    const printYearColumns = priorYearColumns.filter((c) => c.year !== 2020 && c.year !== 2021);
    // A row that's exactly $0 across every column the printout actually
    // shows (FY2022-FY2027) is just noise there -- even if it had real
    // FY2020/2021 activity, since those two columns are dropped from print
    // entirely (see printYearColumns above), a reader would otherwise see
    // a row with nothing but zeroes and no way to tell why it's listed.
    const printRows = summaryRows
      .slice()
      .filter((row) =>
        printYearColumns.some((c) => (budgetLineVisibleColumnAmount(row, c) || 0) !== 0) ||
        (row.FY2027_Proposed || 0) !== 0)
      .sort((a, b) => String(a[codeField] || "").localeCompare(String(b[codeField] || "")));

    function printBudgetLineRowHtml(row, label, rowClass) {
      const rowLabel = label || row[nameField] || "";
      const classes = [rowClass];
      if (/^unclassified/i.test(String(rowLabel).trim())) classes.push("wc-table-unclassified-row");
      return (
        '<tr class="' + classes.filter(Boolean).join(" ") + '">' +
        "<td>" + escapeHtml(rowLabel) + "</td>" +
        printYearColumns.map((c) =>
          '<td class="wc-num wc-prior-year wc-fy-' + c.year + '">' + formatCurrency(budgetLineVisibleColumnAmount(row, c) || 0) + "</td>"
        ).join("") +
        '<td class="wc-num">' + formatCurrency(row.FY2027_Proposed || 0) + "</td>" +
        "</tr>"
      );
    }

    function printSubtotalRowHtml(category, categoryRows) {
      return (
        '<tr class="wc-table-subtotal-row">' +
        "<td>" + escapeHtml(category) + "</td>" +
        printYearColumns.map((c) =>
          '<td class="wc-num wc-prior-year wc-fy-' + c.year + '">' + formatCurrency(categoryRows.reduce((sum, row) => sum + (budgetLineVisibleColumnAmount(row, c) || 0), 0)) + "</td>"
        ).join("") +
        '<td class="wc-num">' + formatCurrency(categoryRows.reduce((sum, row) => sum + (row.FY2027_Proposed || 0), 0)) + "</td>" +
        "</tr>"
      );
    }

    const printBodyRows = [];
    {
      const categoryOrder = [];
      const rowsByCategory = new Map();
      printRows.forEach((row) => {
        const category = row[categoryField] || "Other";
        if (!rowsByCategory.has(category)) {
          categoryOrder.push(category);
          rowsByCategory.set(category, []);
        }
        rowsByCategory.get(category).push(row);
      });
      categoryOrder.forEach((category) => {
        const categoryRows = rowsByCategory.get(category);
        categoryRows.forEach((row) => printBodyRows.push(printBudgetLineRowHtml(row, "", "wc-print-budget-line-row")));
        if (categoryOrder.length > 1) {
          printBodyRows.push(printSubtotalRowHtml(category, categoryRows));
        }
      });
    }
    printBodyRows.push(
      '<tr class="wc-table-total-row">' +
      "<td>Total</td>" +
      printYearColumns.map((c) =>
        '<td class="wc-num wc-prior-year wc-fy-' + c.year + '">' + formatCurrency(visiblePriorYearTotal(printRows, c)) + "</td>"
      ).join("") +
      '<td class="wc-num">' + formatCurrency(totals.FY2027_Proposed || 0) + "</td>" +
      "</tr>"
    );

    function printColumnLabel(label) {
      return String(label || "").replace(/^(FY \d{4})\s+(.+)$/, "$1\n$2");
    }

    const printDetailTable = renderTable({
      columns: [{ label: isExpense ? "Object Name" : "Revenue Name" }]
        .concat(printYearColumns.map((c) => ({ label: printColumnLabel(c.label), num: true, classes: ["wc-prior-year", "wc-fy-" + c.year] })))
        .concat([{ label: "FY 2027\nProposed", num: true }]),
      bodyRows: printBodyRows,
      hideVisualCaption: true
    });

    const revenueYearOptions = priorYearColumns.map((c) => ({ year: c.year, label: c.label })).concat(usesRevenueYearPicker ? [
      { year: 2027, label: "FY 2027 Proposed" },
      { year: 2028, label: "FY 2028 Projected" },
      { year: 2029, label: "FY 2029 Projected" }
    ] : []);
    const revenueYearPickerHtml = usesRevenueYearPicker
      ? '<details class="wc-revenue-year-picker"><summary>Choose years <span data-wc-year-count>1 selected</span></summary><div>' + revenueYearOptions.map((option) =>
          '<label><input type="checkbox" data-wc-revenue-year="' + option.year + '"' + (option.year === 2027 ? ' checked' : '') + '><span>' + escapeHtml(option.label) + '</span></label>'
        ).join('') + '</div></details>'
      : '';
    const toggleHeader = usesRevenueYearPicker ? revenueYearPickerHtml : (priorYearsToggleDisabled ? "" : priorYearsToggleHtml(showPrior, "wc-budget-lines-detail-header"));
    const departmentDataNoteText = (isExpense && mergedRows.length) ? DEPARTMENT_DATA_NOTES.get(normalizeDeptName(mergedRows[0].Dept_Name)) : "";
    const dataNoteTexts = [generatedActualsNoteText, departmentDataNoteText].filter(Boolean);
    const departmentDataNote = dataNoteTexts.length
      ? '<div class="wc-staffing-notes wc-budget-lines-note"><p class="wc-staffing-notes-title">Expenditure Notes:</p>' +
        dataNoteTexts.map((noteText) => "<p>" + escapeHtml(noteText) + "</p>").join("") +
        "</div>"
      : "";
    const budgetLinesTools = '<div class="wc-budget-lines-tools">' + departmentDataNote + toggleHeader + "</div>";

    return {
      button: '<button type="button" class="wc-view-budget-lines-toggle" data-target="' + detailId + '" data-closed-label="View Budget Lines" data-open-label="Hide Budget Lines" aria-expanded="false">View Budget Lines</button>',
      detail: '<div class="wc-budget-lines-detail wc-budget-lines-card wc-has-print-budget-table' + (showPrior && !usesRevenueYearPicker ? " show-prior-years" : "") + (usesRevenueYearPicker ? " wc-revenue-year-picker-detail" : "") + '" id="' + detailId + '"' + (isPriorYearsDisabled ? ' data-prior-years-disabled="true"' : '') + ' hidden>' +
        budgetLinesTools + detailTable + '<div class="wc-print-budget-table-wrap">' + printDetailTable + "</div></div>"
    };
  }

  function bindRevenueYearPicker(root) {
    if (!root) return;
    const picker = root.querySelector(".wc-revenue-year-picker");
    if (!picker) return;
    const checkboxes = Array.from(picker.querySelectorAll("[data-wc-revenue-year]"));
    const count = picker.querySelector("[data-wc-year-count]");
    function applySelection() {
      checkboxes.forEach((checkbox) => {
        const year = checkbox.getAttribute("data-wc-revenue-year");
        root.querySelectorAll(".wc-fy-" + year).forEach((cell) => { cell.hidden = !checkbox.checked; });
      });
      const selected = checkboxes.filter((checkbox) => checkbox.checked).length;
      if (count) count.textContent = selected + " selected";
    }
    checkboxes.forEach((checkbox) => checkbox.addEventListener("change", applySelection));
    applySelection();
  }

  let activeBudgetDetailToggle = null;
  let budgetDetailScrollLock = null;

  function lockBudgetDetailBackgroundScroll() {
    if (budgetDetailScrollLock) return;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    budgetDetailScrollLock = {
      scrollY,
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyLeft: document.body.style.left,
      bodyRight: document.body.style.right,
      bodyWidth: document.body.style.width,
      bodyOverflow: document.body.style.overflow,
      htmlOverflow: document.documentElement.style.overflow
    };
    document.documentElement.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = "-" + scrollY + "px";
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
  }

  function unlockBudgetDetailBackgroundScroll() {
    if (!budgetDetailScrollLock) return;
    const scrollY = budgetDetailScrollLock.scrollY || 0;
    document.documentElement.style.overflow = budgetDetailScrollLock.htmlOverflow;
    document.body.style.position = budgetDetailScrollLock.bodyPosition;
    document.body.style.top = budgetDetailScrollLock.bodyTop;
    document.body.style.left = budgetDetailScrollLock.bodyLeft;
    document.body.style.right = budgetDetailScrollLock.bodyRight;
    document.body.style.width = budgetDetailScrollLock.bodyWidth;
    document.body.style.overflow = budgetDetailScrollLock.bodyOverflow;
    budgetDetailScrollLock = null;
    window.scrollTo(0, scrollY);
  }

  function ensureBudgetDetailModal() {
    let modal = document.querySelector(".wc-budget-detail-modal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.className = "wc-budget-detail-modal";
    modal.hidden = true;
    modal.innerHTML =
      '<div class="wc-budget-detail-backdrop" data-budget-detail-close></div>' +
      '<section class="wc-budget-detail-card" role="dialog" aria-modal="true" aria-labelledby="wc-budget-detail-title">' +
        '<div class="wc-budget-detail-header">' +
          '<div>' +
            '<p class="wc-budget-detail-kicker">Budget Detail</p>' +
            '<h2 id="wc-budget-detail-title">Budget Lines</h2>' +
          '</div>' +
          '<button type="button" class="wc-budget-detail-close" data-budget-detail-close aria-label="Close budget detail">&times;</button>' +
        '</div>' +
        '<div class="wc-budget-detail-body"></div>' +
      '</section>';
    document.body.appendChild(modal);
    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-budget-detail-close]")) {
        closeBudgetDetailModal();
      }
    });
    return modal;
  }

  function closeBudgetDetailModal() {
    const modal = document.querySelector(".wc-budget-detail-modal");
    if (!modal) return;
    modal.hidden = true;
    modal.classList.remove("is-open");
    document.body.classList.remove("wc-budget-detail-open");
    unlockBudgetDetailBackgroundScroll();
    const body = modal.querySelector(".wc-budget-detail-body");
    if (body) {
      body.innerHTML = "";
      body.className = "wc-budget-detail-body";
    }
    if (activeBudgetDetailToggle) {
      activeBudgetDetailToggle.setAttribute("aria-expanded", "false");
      if (document.contains(activeBudgetDetailToggle)) {
        activeBudgetDetailToggle.focus({ preventScroll: true });
      }
      activeBudgetDetailToggle = null;
    }
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeBudgetDetailModal();
    if ((event.key === " " || event.key === "Spacebar") && event.target && event.target.closest) {
      const drilldownLink = event.target.closest(".wc-actual-drilldown-link");
      if (drilldownLink) {
        event.preventDefault();
        drilldownLink.click();
      }
    }
  });

  function openBudgetDetailModal(toggle, detail) {
    const modal = ensureBudgetDetailModal();
    const title = modal.querySelector("#wc-budget-detail-title");
    const body = modal.querySelector(".wc-budget-detail-body");
    const label = toggle.dataset.closedLabel || toggle.textContent || "Budget Lines";
    if (title) title.textContent = label.replace(/^View\s+/i, "");
    if (body) {
      body.className = "wc-budget-detail-body wc-budget-lines-card";
      body.innerHTML = detail.innerHTML;
      body.querySelectorAll(".wc-fy-column-toggle-checkbox").forEach((checkbox) => {
        checkbox.removeAttribute("data-wc-prior-years-bound");
      });
      body.querySelectorAll(".wc-fy-column-toggle-button").forEach((button) => {
        button.removeAttribute("data-wc-prior-years-bound");
      });
      bindPriorYearsToggle(body);
      if (body.querySelector(".wc-revenue-year-picker")) bindRevenueYearPicker(body);
      else applyPriorYearsState(getShowPriorYears("budget"), body);
    }
    activeBudgetDetailToggle = toggle;
    toggle.setAttribute("aria-expanded", "true");
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add("is-open"));
    document.body.classList.add("wc-budget-detail-open");
    lockBudgetDetailBackgroundScroll();
    const closeButton = modal.querySelector(".wc-budget-detail-close");
    if (closeButton) closeButton.focus({ preventScroll: true });
  }

  // Single delegated listener handles every detail button on the page,
  // regardless of which function rendered the card or table it belongs to.
  document.addEventListener("click", (event) => {
    const toggle = event.target.closest(".wc-view-budget-lines-toggle");
    if (!toggle) return;
    const detail = document.getElementById(toggle.dataset.target);
    if (!detail) return;
    openBudgetDetailModal(toggle, detail);
  });

  let requestedBudgetLinesOpened = false;

  function requestedBudgetLinesTarget() {
    try {
      return new URLSearchParams(window.location.search).get("openBudgetLines") || "";
    } catch (e) {
      return "";
    }
  }

  function openRequestedBudgetLinesFromUrl() {
    if (requestedBudgetLinesOpened) return true;
    const target = requestedBudgetLinesTarget();
    if (!target) return true;
    const toggles = Array.from(document.querySelectorAll(".wc-view-budget-lines-toggle[data-target]"));
    const toggle = toggles.find((candidate) => candidate.dataset.target === target);
    if (!toggle) return false;
    requestedBudgetLinesOpened = true;
    toggle.click();
    return true;
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!requestedBudgetLinesTarget()) return;
    if (openRequestedBudgetLinesFromUrl()) return;
    const observer = new MutationObserver(() => {
      if (openRequestedBudgetLinesFromUrl()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 10000);
  });

  // Fund Financial Schedule activity rows (see buildFundFinancialSchedule):
  // a Revenues/Expenditures group's activity rows are collapsed by default
  // until its group header is clicked, and each visible activity row can
  // then be clicked to expand its own department/revenue breakdown inline --
  // accordion-style within that one table, so opening another activity
  // closes whichever one was already open instead of stacking several at
  // once.
  function closeFundActivityDetail(toggle) {
    if (!toggle) return;
    const target = document.getElementById(toggle.dataset.target);
    if (target) target.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  }

  document.addEventListener("click", (event) => {
    const groupToggle = event.target.closest(".wc-fund-activity-group-toggle");
    if (groupToggle) {
      const table = groupToggle.closest("table");
      if (!table) return;
      const groupKey = groupToggle.dataset.fundActivityGroup;
      const expanded = groupToggle.getAttribute("aria-expanded") === "true";
      table.querySelectorAll('.wc-fund-activity-row[data-fund-activity-group="' + groupKey + '"]').forEach((row) => {
        row.hidden = expanded;
      });
      if (expanded) {
        table.querySelectorAll('.wc-fund-activity-toggle[data-fund-activity-group="' + groupKey + '"]').forEach(closeFundActivityDetail);
      }
      groupToggle.setAttribute("aria-expanded", String(!expanded));
      return;
    }

    const activityToggle = event.target.closest(".wc-fund-activity-toggle");
    if (!activityToggle) return;
    const table = activityToggle.closest("table");
    const wasOpen = activityToggle.getAttribute("aria-expanded") === "true";
    if (table) {
      table.querySelectorAll(".wc-fund-activity-toggle").forEach((other) => {
        if (other !== activityToggle) closeFundActivityDetail(other);
      });
    }
    if (wasOpen) {
      closeFundActivityDetail(activityToggle);
    } else {
      const target = document.getElementById(activityToggle.dataset.target);
      if (target) target.hidden = false;
      activityToggle.setAttribute("aria-expanded", "true");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const toggle = event.target.closest(".wc-fund-activity-group-toggle, .wc-fund-activity-toggle");
    if (!toggle) return;
    event.preventDefault();
    toggle.click();
  });

  // Forecast Assumptions tables (see renderForecastAssumptionsDetailTable):
  // each row's <tr> already carries data-sort-value/data-sort-name, so
  // re-sorting on click is just a DOM reorder -- no need to re-run the
  // forecast model or re-fetch anything.
  document.addEventListener("click", (event) => {
    const button = event.target.closest(".wc-forecast-sort-button");
    if (!button) return;
    const toggleGroup = button.closest(".wc-forecast-sort-toggle");
    const tableWrap = button.closest(".wc-data-table-wrap");
    const tbody = tableWrap && tableWrap.querySelector("table tbody");
    if (!toggleGroup || !tbody) return;

    const mode = button.dataset.sortMode;
    const rows = Array.from(tbody.querySelectorAll("tr"));
    rows.sort((a, b) => {
      if (mode === "abc") return a.dataset.sortName.localeCompare(b.dataset.sortName);
      const diff = Number(b.dataset.sortValue) - Number(a.dataset.sortValue);
      return mode === "smallest" ? -diff : diff;
    });
    rows.forEach((row) => tbody.appendChild(row));

    toggleGroup.querySelectorAll(".wc-forecast-sort-button").forEach((other) => {
      other.classList.toggle("is-active", other === button);
      other.setAttribute("aria-pressed", String(other === button));
    });
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".wc-forecast-fund-filter-button");
    if (!button) return;
    const tableWrap = button.closest(".wc-data-table-wrap");
    const tbody = tableWrap && tableWrap.querySelector("table tbody");
    const filterGroup = button.closest(".wc-forecast-fund-filter");
    if (!tbody || !filterGroup) return;

    const selectedFund = button.dataset.fundFilter || "all";
    tbody.querySelectorAll("tr[data-fund-name]").forEach((row) => {
      row.hidden = selectedFund !== "all" && row.dataset.fundName !== selectedFund;
    });

    filterGroup.querySelectorAll(".wc-forecast-fund-filter-button").forEach((other) => {
      other.classList.toggle("is-active", other === button);
      other.setAttribute("aria-pressed", String(other === button));
    });
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".wc-forecast-fund-card-button");
    if (!button) return;
    const template = document.getElementById(button.dataset.forecastFundDetail || "");
    if (!template) return;
    const modal = ensureBudgetDetailModal();
    const title = modal.querySelector("#wc-budget-detail-title");
    const kicker = modal.querySelector(".wc-budget-detail-kicker");
    const body = modal.querySelector(".wc-budget-detail-body");
    if (title) title.textContent = button.dataset.forecastFundName || "Fund Schedule";
    if (kicker) kicker.textContent = "Forecast Fund Schedule";
    if (body) {
      body.className = "wc-budget-detail-body wc-forecast-fund-modal-body";
      body.innerHTML = template.innerHTML;
    }
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add("is-open"));
    document.body.classList.add("wc-budget-detail-open");
    const closeButton = modal.querySelector(".wc-budget-detail-close");
    if (closeButton) closeButton.focus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const button = event.target.closest(".wc-forecast-fund-card-button");
    if (!button) return;
    event.preventDefault();
    button.click();
  });

  document.addEventListener("click", (event) => {
    const row = event.target.closest(".wc-forecast-line-toggle-row");
    if (!row) return;
    const target = document.getElementById(row.dataset.target || "");
    if (!target) return;
    const willOpen = row.getAttribute("aria-expanded") !== "true";
    target.hidden = !willOpen;
    row.setAttribute("aria-expanded", String(willOpen));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const row = event.target.closest(".wc-forecast-line-toggle-row");
    if (!row) return;
    event.preventDefault();
    row.click();
  });

  document.addEventListener("click", (event) => {
    const link = event.target.closest(".wc-forecast-assumption-link");
    if (!link) return;
    const lineType = link.dataset.assumptionType === "expense" ? "expense" : "revenue";
    const fundName = link.dataset.fundName || "";
    const detailName = (link.dataset.detailName || "").toLowerCase();
    closeBudgetDetailModal();
    window.setTimeout(() => {
      const section = document.getElementById("forecast-" + lineType + "-assumptions");
      if (!section) return;
      section.open = true;
      const row = Array.from(section.querySelectorAll("tbody tr[data-fund-name][data-sort-name]")).find((candidate) =>
        candidate.dataset.fundName === fundName && candidate.dataset.sortName === detailName
      );
      const target = row || section;
      if (row) {
        row.hidden = false;
        row.classList.add("wc-forecast-assumption-highlight");
        window.setTimeout(() => row.classList.remove("wc-forecast-assumption-highlight"), 3500);
      }
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  });


  function lastUpdatedNoteHtml() {
    const stamp = new Date().toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric" });
    return '<p class="wc-data-updated-note"><em>Last Updated: ' + escapeHtml(stamp) + "</em></p>";
  }

  function renderTable(options) {
    const columns = options.columns || [];
    const bodyRows = options.bodyRows || [];
    if (!bodyRows.length) return "";
    const captionHtml = options.caption && !options.hideVisualCaption
      ? '<p class="wc-table-label">' + escapeHtml(options.caption) + "</p>"
      : "";
    const tableCaptionHtml = options.caption ? '<caption class="wc-sr-only">' + escapeHtml(options.caption) + "</caption>" : "";
    const headerHtml = options.toggleHtml
      ? '<div class="wc-table-label-row">' + captionHtml + options.toggleHtml + "</div>"
      : captionHtml;
    return (
      '<div class="wc-data-table-wrap">' +
      headerHtml +
      '<div class="wc-data-table-scroll">' +
      '<table class="wc-data-table">' +
      tableCaptionHtml +
      "<thead><tr>" +
      columns.map((c) => {
        const classes = (c.num ? ["wc-num"] : []).concat(c.classes || []);
        const tooltipHtml = c.tooltip
          ? ' <button type="button" class="wc-budget-line-tooltip-anchor" aria-label="' +
            escapeHtml(c.label) + ' information" data-wc-tooltip="' + escapeHtml(c.tooltip) + '">i</button>'
          : "";
        return '<th scope="col" class="' + classes.join(" ") + '">' + escapeHtml(c.label) + tooltipHtml + "</th>";
      }).join("") +
      "</tr></thead>" +
      "<tbody>" + bodyRows.join("") + "</tbody>" +
      "</table>" +
      "</div>" +
      (options.showUpdated ? lastUpdatedNoteHtml() : "") +
      "</div>"
    );
  }

  function renderLedgerTable(opts) {
    const rows = opts.rows || [];
    if (!rows.length) return "";

    const isExpense = opts.kind === "expense";
    const codeField = isExpense ? "Object_Code" : "Revenue_Code";
    const nameField = isExpense ? "Object_Name" : "Revenue_Name";
    const typeField = isExpense ? "Object_Type" : "Revenue_Type";
    const codeLabel = isExpense ? "Object Code" : "Revenue Code";
    const nameLabel = isExpense ? "Object Name" : "Revenue Name";
    const typeLabel = isExpense ? "Object Type" : "Revenue Type";
    const showDept = opts.scope === "summary";

    const columns = []
      .concat(showDept ? [{ label: "Department" }] : [])
      .concat([{ label: typeLabel }, { label: codeLabel }, { label: nameLabel }, { label: "FY 2027 Proposed", num: true }]);
    const colCount = columns.length;

    const sorted = rows.slice().sort((a, b) => {
      if (showDept) {
        const d = (a.Dept_Name || "").localeCompare(b.Dept_Name || "");
        if (d) return d;
      }
      const t = (a[typeField] || "").localeCompare(b[typeField] || "");
      if (t) return t;
      return (a[nameField] || "").localeCompare(b[nameField] || "");
    });

    const bodyRows = [];
    let currentKey = null;
    let currentLabel = "";
    let groupTotal = 0;
    let grandTotal = 0;

    function flushGroup() {
      if (currentKey !== null) {
        bodyRows.push(
          '<tr class="wc-table-subtotal-row"><td colspan="' + (colCount - 1) + '">Subtotal &mdash; ' +
            escapeHtml(currentLabel) + '</td><td class="wc-num">' + formatCurrency(groupTotal) + "</td></tr>"
        );
      }
    }

    sorted.forEach((r) => {
      const key = showDept ? r.Dept_Name + "||" + r[typeField] : r[typeField] || "Other";
      if (key !== currentKey) {
        flushGroup();
        currentKey = key;
        currentLabel = showDept ? r.Dept_Name + " — " + (r[typeField] || "Other") : r[typeField] || "Other";
        groupTotal = 0;
        bodyRows.push('<tr class="wc-table-group-row"><td colspan="' + colCount + '">' + escapeHtml(currentLabel) + "</td></tr>");
      }
      const amt = r.FY2027_Proposed || 0;
      groupTotal += amt;
      grandTotal += amt;
      bodyRows.push(
        "<tr>" +
          (showDept ? "<td>" + escapeHtml(r.Dept_Name || "") + "</td>" : "") +
          "<td>" + escapeHtml(r[typeField] || "") + "</td>" +
          "<td>" + escapeHtml(r[codeField] || "") + "</td>" +
          "<td>" + escapeHtml(r[nameField] || "") + "</td>" +
          '<td class="wc-num">' + formatCurrency(amt) + "</td>" +
        "</tr>"
      );
    });
    flushGroup();

    bodyRows.push(
      '<tr class="wc-table-total-row"><td colspan="' + (colCount - 1) + '">Total</td><td class="wc-num">' +
        formatCurrency(grandTotal) + "</td></tr>"
    );

    return renderTable({
      columns: columns,
      bodyRows: bodyRows,
      caption: opts.caption
    });
  }

  // A category row's own FY2026 -> FY2027 dollar change (e.g. Personnel
  // Services, Operating Expenditures, Capital Outlay), shown beside that
  // row's current-year amount on every Expenditure Summary card -- and
  // every secondary/supplemental one, since they all render through this
  // same renderFinancialDashboardCard. A category with no FY2026 figure
  // (new this year) or no change shows nothing rather than a misleading
  // divide-by-zero/false "no change".
  function renderFinanceCardRowChange(amount, priorAmount, label) {
    if (!priorAmount) return "";
    const diff = amount - priorAmount;
    const direction = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
    // formatCurrency(0) returns "Not listed" (it's built for "no data" --
    // not a literal $0), so a genuine zero change is formatted here
    // instead, rather than being silently dropped like a missing amount.
    const dollarText = diff === 0 ? "$0" : (diff > 0 ? "+" : "-") + formatCurrency(Math.abs(diff));
    return '<div class="wc-finance-card-change wc-finance-card-change-' + direction + '">' + escapeHtml(dollarText) + ' <span class="wc-finance-card-change-label">' + escapeHtml(label || "YoY Change") + '</span></div>';
  }

  function renderFinancialDashboardCard(options) {
    const rows = options.rows || [];
    const caption = options.caption || "Financial Summary";
    const kind = options.kind || "expense";
    const total = options.total || 0;
    const showPrior = !!options.showPrior;
    const detail = options.detail || { button: "", detail: "" };
    const updated = lastUpdatedNoteHtml();
    const zeroClass = total === 0 ? " is-zero" : "";
    const currentLabel = kind === "revenue" ? "FY 2027 Proposed Revenue" : "FY 2027 Proposed Budget";
    // Secondary sub-program cards (e.g. Code Compliance Beach) pass
    // showChange: false -- their FY2026 figures share the same per-account
    // dedup unreliability as their "View Prior Years" toggle (already
    // disabled for them in renderTypeSummaryGroup), so no YoY change shows
    // there either; that comparison belongs on the primary card only.
    const showChange = kind === "expense" && options.showChange !== false;
    // A category with $0 FY2027 (e.g. Capital Outlay eliminated entirely
    // this year) still has a real, meaningful FY2026 -> FY2027 change worth
    // showing -- so "relevant" means either year is nonzero, not just the
    // current one, and the row's rank uses whichever year is larger so a
    // zeroed-out category isn't pushed out of the top-3 by smaller-but-
    // still-funded categories.
    function rowRelevance(row) {
      return Math.max(Math.abs(row.amount || 0), showChange ? Math.abs(row.priorAmount || 0) : 0);
    }
    const sortedRows = rows
      .slice()
      .sort((a, b) => rowRelevance(b) - rowRelevance(a));
    const nonZeroRows = sortedRows.filter((row) => rowRelevance(row) !== 0);
    const visibleRows = nonZeroRows.slice(0, 3);
    const rowCountClass = " wc-finance-card-rows-" + Math.max(visibleRows.length, 0);
    const itemHtml = visibleRows.map((row) => {
      const amount = row.amount || 0;
      const priorAmount = row.priorAmount || 0;
      const percent = total ? Math.abs(amount) / Math.abs(total) * 100 : 0;
      const width = total ? Math.max(percent, amount ? 2 : 0) : 0;
      const isZero = amount === 0 && !(showChange && priorAmount);
      // Each category's own FY2026 -> FY2027 dollar change, shown beside
      // that category's current amount -- distinct from the
      // %-of-total-budget badge in the row head above, which is a
      // same-year share, not a year-over-year comparison. Labeled
      // "Recurring"/"Non-Recurring" instead of a plain "YoY Change" on
      // expense cards -- Capital Outlay's own change is the department's
      // non-recurring capital change; every other category's is recurring
      // operating change (see isCapitalOutlayRowForYoy).
      const changeAmount = row.changeAmount !== undefined ? row.changeAmount : amount;
      const changePriorAmount = row.changePriorAmount !== undefined ? row.changePriorAmount : priorAmount;
      // showChange (and therefore this) only renders for expense cards --
      // see its own definition above. row.label here is the Object_Type
      // category (e.g. "Capital Outlay", "Personnel Services").
      const changeLabel = normalizeObjectTypeForYoy(row.label) === "capital outlay" ? "Non-Recurring YoY Change" : "Recurring YoY Change";
      const changeHtml = showChange ? renderFinanceCardRowChange(changeAmount, changePriorAmount, changeLabel) : "";
      const amountText = amount === 0 && !isZero ? "$0" : formatCurrency(amount);
      // Optional small indented sub-lines under a category's own amount
      // (e.g. Code Compliance's Personnel Services broken into its
      // Street/Beach sides -- see renderCodeComplianceExpenseCard) instead
      // of a whole separate card per sub-program.
      const sublinesHtml = Array.isArray(row.sublines) && row.sublines.length
        ? '<div class="wc-finance-card-sublines">' +
          row.sublines.map((s) =>
            '<div class="wc-finance-card-subline"><span>' + escapeHtml(s.label || "Other") + '</span><strong>' + escapeHtml(formatCurrency(s.amount || 0)) + "</strong></div>"
          ).join("") +
          "</div>"
        : "";
      return (
        '<div class="wc-finance-card-row' + (isZero ? " is-zero" : "") + '">' +
          '<div class="wc-finance-card-row-head">' +
            '<strong>' + categoryLabelHtml(row.label || "Other", kind === "expense") + '</strong>' +
            '<span>' + escapeHtml(percent.toFixed(percent >= 10 ? 0 : 1)) + '%</span>' +
          '</div>' +
          '<div class="wc-finance-card-track" aria-hidden="true">' +
            '<span style="width:' + width.toFixed(2) + '%"></span>' +
          '</div>' +
          '<div class="wc-finance-card-amount-row">' +
            '<div class="wc-finance-card-amount">' + escapeHtml(amountText) + '</div>' +
            changeHtml +
          '</div>' +
          sublinesHtml +
        '</div>'
      );
    }).join("");

    return (
      '<section class="wc-finance-card wc-budget-lines-card wc-print-kind-' + escapeHtml(kind) + rowCountClass + zeroClass + (showPrior ? " show-prior-years" : "") + '" data-print-title="' + escapeHtml(caption) + '">' +
        '<div class="wc-finance-card-head">' +
          '<div>' +
            '<p class="wc-finance-card-kicker">' + escapeHtml(caption) + '</p>' +
            '<strong class="wc-finance-card-total">' + escapeHtml(formatCompactCurrency(total)) + '</strong>' +
            '<span class="wc-finance-card-subtitle">' + escapeHtml(currentLabel) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="wc-finance-card-breakdown">' + itemHtml + '</div>' +
        '<div class="wc-finance-card-footer">' +
          updated +
          detail.button +
        '</div>' +
        detail.detail +
        renderNotesHtml("Expenditure Notes:", options.notes) +
      '</section>'
    );
  }

  // Department-page expense/revenue tables: rolled up to category level
  // (Personnel Services, Operating Expenditures, Capital Outlay, etc.)
  // rather than individual object/revenue codes.
  function renderTypeSummaryGroup(rows, kind, caption, notes, descriptionField, showChange, combinedChangeByType) {
    const isExpense = kind === "expense";
    const typeField = isExpense ? "Object_Type" : "Revenue_Type";
    const typeLabel = isExpense ? "Object Type" : "Revenue Type";

    const yearFields = BUDGET_LINE_PRIOR_YEAR_COLUMNS.map((c) => c.field).concat(["FY2027_Proposed"]);
    const totalsByType = new Map();
    const grandTotals = {};
    yearFields.forEach((f) => { grandTotals[f] = 0; });
    const revenueFy2026BestByTypeKey = new Map();
    rows.forEach((r) => {
      const type = r[typeField] || "Other";
      const totals = totalsByType.get(type) || {};
      yearFields.forEach((f) => {
        let amt = r[f] || 0;
        if (!isExpense && f === "FY2026_Original_Budget") {
          const key = [type, revenueBudgetUniqueKey(r)].join("|");
          const contribution = departmentRevenueFy2026PlugOverrideForRow(r) ||
            ((r._suppressRevenueBudgetFallback || r._originalBudgetDeduped)
              ? revenueDisplayAmount(r.FY2026_Original_Budget || 0)
              : revenueBudgetMergeContribution(r));
          const previousBest = revenueFy2026BestByTypeKey.has(key) ? revenueFy2026BestByTypeKey.get(key) : null;
          if (previousBest !== null && contribution <= previousBest) return;
          revenueFy2026BestByTypeKey.set(key, contribution);
          amt = previousBest === null ? contribution : contribution - previousBest;
        }
        totals[f] = (totals[f] || 0) + amt;
        grandTotals[f] += amt;
      });
      totalsByType.set(type, totals);
    });

    // Secondary sub-program cards (showChange === false, e.g. Code
    // Compliance Beach) don't get a "View Prior Years" toggle either --
    // their FY2026 figures share the same per-account dedup unreliability
    // that already keeps them from showing a YoY change (see
    // renderTypeSummaryTable).
    const currentBudgetOnly = isExpense &&
      rows.every((r) => normalizeDeptName(r.Dept_Name) === "bcc other uses contingency");
    const forceDisablePriorYears = showChange === false || currentBudgetOnly;
    const showPrior = forceDisablePriorYears ? false : getShowPriorYears();
    const detail = renderBudgetLinesToggle(rows, descriptionField, kind, false, forceDisablePriorYears, currentBudgetOnly);
    if (detail.button && !isExpense) {
      detail.button = detail.button
        .replace('data-closed-label="View Budget Lines"', 'data-closed-label="View Revenue Lines"')
        .replace('data-open-label="Hide Budget Lines"', 'data-open-label="Hide Revenue Lines"')
        .replace("View Budget Lines", "View Revenue Lines");
    }
    const cardRows = Array.from(totalsByType.entries()).map(([type, totals]) => {
      // The displayed amount/%-of-total stay this card's own slice, but the
      // YoY change badge uses the combined-across-sub-programs total when
      // one was supplied (see renderTypeSummaryTable) -- comparing this
      // card's own FY2027 against its own FY2026 isn't reliable when a
      // sibling sub-program shares its Dept_Code, since FY2026's
      // per-account dedup can attribute a shared account's full prior-year
      // total to either sub-program unpredictably.
      const combined = combinedChangeByType && combinedChangeByType.get(type);
      return {
        label: type,
        amount: totals.FY2027_Proposed || 0,
        priorAmount: totals.FY2026_Original_Budget || 0,
        changeAmount: combined ? combined.amount : (totals.FY2027_Proposed || 0),
        changePriorAmount: combined ? combined.priorAmount : (totals.FY2026_Original_Budget || 0)
      };
    });

    return renderFinancialDashboardCard({
      caption,
      kind,
      rows: cardRows,
      total: grandTotals.FY2027_Proposed || 0,
      showPrior,
      detail,
      notes: isExpense ? notes : null,
      showChange: showChange !== false
    });
  }

  // A single row right under a table: the "Last Updated" stamp on the
  // left and (for expense tables) the "View Budget Lines" toggle on the
  // right, instead of two separate stacked lines.
  function renderTableFooterRow(budgetLineRows, descriptionField, kind, combineByName) {
    const stamp = new Date().toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const updated = '<em>Last Updated: ' + escapeHtml(stamp) + "</em>";
    const toggle = budgetLineRows && kind !== "revenue" ? renderBudgetLinesToggle(budgetLineRows, descriptionField, kind, combineByName) : { button: "", detail: "" };
    return (
      '<div class="wc-table-footer-row">' +
      '<p class="wc-data-updated-note">' + updated + "</p>" +
      toggle.button +
      "</div>" +
      toggle.detail
    );
  }

  // The "View Budget Lines" modal lists one row per account, summing
  // FY2020-FY2026 straight from whatever rows are passed in -- correct
  // when every row is its own distinct account, but Code Compliance's
  // Street/Beach split shares one Dept_Code, and applyActualsToRows/
  // applyOriginalBudgetToRows give EACH Dept_Name its own full, undivided
  // historical total for a shared account (same account, same object
  // code) rather than splitting it between them. Summing both Dept_Names'
  // rows straight (whether in the modal's own grand total, or its
  // collapsed "Prior Years off" one-row-per-account summary line) would
  // count that one true total twice.
  //
  // Each Dept_Name's own row is kept separate here, not merged into one --
  // Street's and Beach's FY2027 Proposed amounts are genuinely distinct
  // itemized lines, and merging them away would hide Street's own line
  // entirely behind a single combined row. Only the *historical* fields
  // on every row but the first sharing an account are zeroed (the same
  // "first row keeps it, the rest get zeroed" rule
  // buildDedupedHistoricalExpenseRows already uses for this exact
  // scenario), so summing across both Dept_Names' rows lands on the one
  // true historical total instead of doubling it.
  function dedupBudgetLinesAcrossDeptNames(rows) {
    const seenAccountKeys = new Set();
    return rows.map((row) => {
      const key = expenseAccountingKey(row);
      if (!seenAccountKeys.has(key)) {
        seenAccountKeys.add(key);
        return row;
      }
      const deduped = Object.assign({}, row);
      HISTORICAL_EXPENSE_DEDUP_FIELDS.forEach((field) => { deduped[field] = 0; });
      return deduped;
    });
  }

  // Code Compliance's Street/Beach split (sharing one Dept_Code) renders
  // as one combined Expenditure Summary card instead of two separate
  // cards -- Personnel Services shows each side's own current-year
  // subtotal as a small indented subline instead of a whole separate
  // card. FY2026 still has to come from the shared deduped layer (keyed
  // by Dept_Code, not Dept_Name): the per-(Dept_Code,Dept_Name,
  // Object_Code) FY2026 dedup (see applyOriginalBudgetToRows) can
  // attribute a shared account's full prior-year total to either side
  // unpredictably, so summing the raw rows directly would risk
  // double-counting it.
  function renderCodeComplianceExpenseCard(rows, caption) {
    const yearFields = BUDGET_LINE_PRIOR_YEAR_COLUMNS.map((c) => c.field).concat(["FY2027_Proposed"]);
    const totalsByType = new Map();
    const grandTotals = {};
    yearFields.forEach((f) => { grandTotals[f] = 0; });
    const personnelByDept = new Map();
    rows.forEach((r) => {
      const type = r.Object_Type || "Other";
      const totals = totalsByType.get(type) || {};
      yearFields.forEach((f) => {
        const amt = r[f] || 0;
        totals[f] = (totals[f] || 0) + amt;
        grandTotals[f] += amt;
      });
      totalsByType.set(type, totals);
      if (type === "Personnel Services") {
        const deptKey = r.Dept_Name || "Other";
        personnelByDept.set(deptKey, (personnelByDept.get(deptKey) || 0) + (r.FY2027_Proposed || 0));
      }
    });

    const deptCodes = new Set(rows.map((r) => String(r.Dept_Code || "").trim()).filter(Boolean));
    const priorByType = new Map();
    (cache.dedupedExpenseRows || [])
      .filter((r) => deptCodes.has(String(r.Dept_Code || "").trim()))
      .forEach((r) => {
        const type = r.Object_Type || "Other";
        priorByType.set(type, (priorByType.get(type) || 0) + (r.FY2026_Original_Budget || 0));
      });

    function sublineLabel(deptName) {
      const norm = normalizeDeptName(deptName);
      if (norm === "code compliance beach") return "Beach";
      if (norm === "code compliance" || norm === "code compliance street") return "Street";
      return deptName;
    }

    const cardRows = Array.from(totalsByType.entries()).map(([type, totals]) => {
      const amount = totals.FY2027_Proposed || 0;
      const priorAmount = priorByType.get(type) || 0;
      const row = { label: type, amount, priorAmount, changeAmount: amount, changePriorAmount: priorAmount };
      if (type === "Personnel Services" && personnelByDept.size > 1) {
        row.sublines = Array.from(personnelByDept.entries())
          .map(([name, amt]) => ({ label: sublineLabel(name), amount: amt }))
          .sort((a, b) => b.amount - a.amount);
      }
      return row;
    });

    return renderFinancialDashboardCard({
      caption,
      kind: "expense",
      rows: cardRows,
      total: grandTotals.FY2027_Proposed || 0,
      showPrior: getShowPriorYears(),
      detail: renderBudgetLinesToggle(dedupBudgetLinesAcrossDeptNames(rows), undefined, "expense"),
      showChange: true
    });
  }

  // Statutory & Other Agency Funding rolls up a dozen-plus unrelated
  // outside agencies (Argyle Volunteer Fire, Gulf Coast Kids House,
  // Lakeview Center, etc.) into one or two Object_Type buckets, so the
  // normal top-3-categories card would just show "Operating Expenditures:
  // 100%" and hide which agencies got funded behind the "View Budget
  // Lines" modal. Each Object_Type row gets an always-visible subline per
  // agency (by Project_Name) instead, so the full FY2027 list reads
  // straight off the card -- same inline sublines mechanism already used
  // for Code Compliance's Street/Beach split, just keyed by agency instead
  // of Dept_Name.
  function renderStatutoryAgencyExpenseCard(rows, caption, descriptionField) {
    const yearFields = BUDGET_LINE_PRIOR_YEAR_COLUMNS.map((c) => c.field).concat(["FY2027_Proposed"]);
    const totalsByType = new Map();
    const grandTotals = {};
    yearFields.forEach((f) => { grandTotals[f] = 0; });
    const agencyByType = new Map();
    rows.forEach((r) => {
      const type = r.Object_Type || "Other";
      const totals = totalsByType.get(type) || {};
      yearFields.forEach((f) => {
        const amt = r[f] || 0;
        totals[f] = (totals[f] || 0) + amt;
        grandTotals[f] += amt;
      });
      totalsByType.set(type, totals);

      const agencyName = String(r[descriptionField || "Project_Name"] || r.Note || "Other").trim() || "Other";
      const byAgency = agencyByType.get(type) || new Map();
      byAgency.set(agencyName, (byAgency.get(agencyName) || 0) + (r.FY2027_Proposed || 0));
      agencyByType.set(type, byAgency);
    });

    const cardRows = Array.from(totalsByType.entries()).map(([type, totals]) => {
      const amount = totals.FY2027_Proposed || 0;
      const priorAmount = totals.FY2026_Original_Budget || 0;
      const byAgency = agencyByType.get(type) || new Map();
      const sublines = Array.from(byAgency.entries())
        .map(([label, amt]) => ({ label, amount: amt }))
        .filter((s) => s.amount !== 0)
        .sort((a, b) => b.amount - a.amount);
      return { label: type, amount, priorAmount, changeAmount: amount, changePriorAmount: priorAmount, sublines };
    });

    return renderFinancialDashboardCard({
      caption,
      kind: "expense",
      rows: cardRows,
      total: grandTotals.FY2027_Proposed || 0,
      showPrior: getShowPriorYears(),
      detail: renderBudgetLinesToggle(rows, descriptionField, "expense"),
      showChange: true
    });
  }

  // When a department's rows span more than one distinct Dept_Name (e.g.
  // "Planning" includes a separately tracked "Planning Short-Term Rental"
  // program), render one labeled table per sub-program instead of merging
  // them into a single combined summary. The page's own department keeps
  // the original caption (e.g. "Expenditure Summary"); other groups are
  // captioned with their own Dept_Name.
  function renderTypeSummaryTable(rows, kind, caption, deptName) {
    if (!rows.length) return "";
    const groupNames = uniqueSorted(rows.map((r) => r.Dept_Name || ""));
    if (groupNames.length <= 1) {
      return renderTypeSummaryGroup(rows, kind, caption, EXPENSE_GROUP_NOTES[normalizeDeptName(deptName || "")]);
    }
    if (kind === "expense" && normalizeDeptName(deptName || "") === "code compliance") {
      return renderCodeComplianceExpenseCard(rows, caption);
    }
    const norm = normalizeDeptName(deptName || "");

    // The primary card's own YoY change combines every sub-program sharing
    // this Dept_Code (e.g. Code Compliance + Code Compliance Beach)
    // instead of comparing the primary's own slice against its own FY2026
    // -- the per-(Dept_Code,Dept_Name,Object_Code) FY2026 dedup (see
    // applyOriginalBudgetToRows) can attribute a shared account's full
    // prior-year total to either sub-program unpredictably, so the primary
    // alone isn't a trustworthy year-over-year figure on its own. The
    // shared deduped layer (keyed by Dept_Code, not Dept_Name) gives the
    // one true combined FY2026 total per category; FY2027 has no such
    // duplication risk, so it's just summed straight from the raw rows.
    let combinedChangeByType = null;
    if (kind === "expense") {
      const deptCodes = new Set(rows.map((r) => String(r.Dept_Code || "").trim()).filter(Boolean));
      combinedChangeByType = new Map();
      rows.forEach((r) => {
        const type = r.Object_Type || "Other";
        const entry = combinedChangeByType.get(type) || { amount: 0, priorAmount: 0 };
        entry.amount += r.FY2027_Proposed || 0;
        combinedChangeByType.set(type, entry);
      });
      (cache.dedupedExpenseRows || [])
        .filter((r) => deptCodes.has(String(r.Dept_Code || "").trim()))
        .forEach((r) => {
          const type = r.Object_Type || "Other";
          const entry = combinedChangeByType.get(type) || { amount: 0, priorAmount: 0 };
          entry.priorAmount += r.FY2026_Original_Budget || 0;
          combinedChangeByType.set(type, entry);
        });
    }

    return groupNames
      .map((name) => {
        const nameNorm = normalizeDeptName(name);
        const isPrimary = nameNorm === norm;
        const groupRows = rows.filter((r) => (r.Dept_Name || "") === name);
        const canShowOwnChange = kind === "expense" && (
          groupRows.some((r) => projectScopeForRow(r) !== undefined) ||
          (isPrimary && norm === "planning")
        );
        const groupCaption = isPrimary ? caption : (DEPT_NAME_DISPLAY_OVERRIDES[nameNorm] || name);
        const notes = isPrimary ? null : EXPENSE_GROUP_NOTES[nameNorm];
        // Secondary sub-program cards (e.g. Code Compliance Beach) get no
        // YoY change or "View Prior Years" toggle at all -- that
        // comparison lives on the primary card, combined, instead. Project-
        // scoped sub-programs can safely show their own change because their
        // prior-year actuals/budget are filtered to their own Project_Code.
        return renderTypeSummaryGroup(
          groupRows,
          kind,
          groupCaption,
          notes,
          undefined,
          isPrimary || canShowOwnChange,
          isPrimary && !canShowOwnChange ? combinedChangeByType : null
        );
      })
      .join("");
  }

  // The "Consolidated Financial Schedules" revenue/expenditure-by-fund
  // tables: rows are budget categories, columns are major funds (plus a
  // Non-Major Funds rollup and a grand total), all derived live from the
  // revenues/expenditures + funds sheets rather than hand-entered.
  const CONSOLIDATED_REVENUE_FUND_COLUMNS = [
    { code: "001", label: "General Fund" },
    { code: "101", label: "Transportation Fund" },
    { code: "107", label: "Sheriff Fund" },
    { code: "111", label: "Tourist Development Fund" },
    { code: "112", label: "Solid Waste Fund" },
    { code: "300", label: "Capital Projects Fund" },
    { code: "105", label: "Mosquito Control Fund" }
  ];

  const CONSOLIDATED_EXPENDITURE_FUND_COLUMNS = [
    { code: "001", label: "General Fund" },
    { code: "101", label: "Transportation Fund" },
    { code: "107", label: "Sheriff Fund" },
    { code: "111", label: "Tourist Development Fund" },
    { code: "112", label: "Solid Waste Fund" },
    { code: "300", label: "Capital Projects Fund" },
    { code: "105", label: "Mosquito Control Fund" }
  ];

  const CONSOLIDATED_REVENUE_TYPE_ROWS = [
    {
      key: "Property Taxes",
      label: "Property Taxes (Ad Valorem)",
      predicate: (r) => {
        const code = String(r.Revenue_Code || "").trim();
        const name = String(r.Revenue_Name || "").trim().toLowerCase();
        return code === "311000" || code === "311001" || name.indexOf("ad valorem") !== -1;
      }
    },
    {
      key: "General Government Taxes",
      label: "General Government Taxes (excluding Property Taxes)",
      predicate: (r) => {
        const code = String(r.Revenue_Code || "").trim();
        const name = String(r.Revenue_Name || "").trim().toLowerCase();
        return String(r.Revenue_Type || "").trim().toLowerCase() === "general government taxes" &&
          code !== "311000" && code !== "311001" && name.indexOf("ad valorem") === -1;
      }
    },
    { key: "Permits Fees and Special Assessments", label: "Permits, Fees, and Special Assessments" },
    { key: "Intergovernmental Revenues", label: "Intergovernmental Revenues" },
    { key: "Charges for Services", label: "Charges for Services" },
    { key: "Judgments, Fines and Forfeits", label: "Judgments, Fines and Forfeits" },
    { key: "Miscellaneous Revenue", label: "Miscellaneous Revenue" },
    { key: "Other Sources", label: "Other Sources" }
  ];

  // Expenditures are grouped by function/activity (General Government,
  // Public Safety, etc. — from the activities sheet, keyed by Dept_Code)
  // rather than by Object_Type, per the county's preferred presentation.
  const CONSOLIDATED_EXPENDITURE_ACTIVITY_ROWS = [
    "General Government",
    "Public Safety",
    "Physical Environment",
    "Transportation",
    "Economic Environment",
    "Human Services",
    "Culture and Recreation",
    "Court Related Cost",
    "Other Uses"
  ];

  // Activities that represent financing items (transfers, debt proceeds,
  // fund balance) rather than a functional program area; these are pulled
  // out of the 8 rows above and reported as "Other Financial Uses" instead.
  const OTHER_FINANCING_ACTIVITIES = new Set(["interfund transfers", "other sources"]);

  function activityForDeptCode(deptCode) {
    const code = String(deptCode || "").trim();
    if (!code) return "";
    const match = (cache.activities || []).find((a) => a.Dept_Code === code);
    return match ? match.Activity : "";
  }

  const EXPENSE_ACTIVITY_FALLBACK_BY_FUND = new Map([
    ["101", "Transportation"],
    ["102", "Physical Environment"],
    ["104", "Economic Environment"],
    ["107", "Public Safety"],
    ["108", "Public Safety"],
    ["109", "Public Safety"],
    ["113", "Culture and Recreation"]
  ]);

  const EXPENSE_ACTIVITY_OVERRIDE_BY_DEPT_NAME = new Map([
    ["engineering department", "Transportation"],
    ["public works engineering services", "Transportation"],
    ["engineering services", "Transportation"],
    ["sheriff", "Public Safety"],
    ["walton county sheriffs office", "Public Safety"],
    ["clerk of circuit court", "Court Related Cost"],
    ["clerk of court", "Court Related Cost"],
    ["circuit court", "Court Related Cost"],
    ["property appraiser", "General Government"],
    ["supervisor of elections", "General Government"],
    ["tax collector", "General Government"],
    ["mosquito control", "Physical Environment"],
    ["veteran services", "Human Services"]
  ]);

  // BCC Other Uses Contingency is budgeted appropriation authority, not a
  // transfer or financing item. Show only that specific org/object as its
  // own Other Uses line; other 599000 rows keep their regular activity.
  function isBccOtherUsesContingencyRow(r) {
    return (
      String((r && r.Dept_Code) || "").trim() === "00101001" &&
      String((r && r.Object_Code) || "").trim() === "599000"
    );
  }

  function expenseActivityForRow(r) {
    if (isBccOtherUsesContingencyRow(r)) return "Other Uses";
    const deptOverride = EXPENSE_ACTIVITY_OVERRIDE_BY_DEPT_NAME.get(normalizeDeptName(r && r.Dept_Name));
    if (deptOverride) return deptOverride;
    return activityForDeptCode(r.Dept_Code) || EXPENSE_ACTIVITY_FALLBACK_BY_FUND.get(fundCodeForRow(r)) || "";
  }

  function isOtherFinancingExpenseRow(r) {
    return !isBccOtherUsesContingencyRow(r) && OTHER_FINANCING_ACTIVITIES.has(activityForDeptCode(r.Dept_Code).toLowerCase());
  }

  // ---- shared deduped historical expense layer ----
  //
  // Some departments split one Dept_Code across multiple display-only
  // Dept_Names (e.g. Code Compliance / Code Compliance Beach, both under
  // 00102030) -- applyActualsToRows/applyOriginalBudgetToRows deliberately
  // give each Dept_Name its own full, undivided historical total, since
  // actuals aren't tracked at that sub-program grain (see those functions'
  // own comments). That's correct for a single department's own "View
  // Budget Lines" detail, but summing every display row directly -- as the
  // Consolidated Expense Summary and fund-level tables otherwise do --
  // counts that one true account total once per Dept_Name sharing it,
  // inflating FY2020-FY2026 history (and any Activity category those rows
  // roll up into). This layer collapses back down to one row per true
  // accounting record (see expenseAccountingKey for the exact grain) so
  // both tables can report the real historical total instead.
  //
  // FY2027 Proposed is intentionally untouched here: it comes straight from
  // the Google Sheet's own budget rows, which are not subject to this
  // duplication (each is its own itemized budget line, not a repeated
  // historical actual).
  const HISTORICAL_EXPENSE_DEDUP_FIELDS = HISTORICAL_ACTUAL_YEARS
    .map((year) => "FY" + year + "_Actual")
    .concat(["FY2026_Original_Budget"]);
  const HISTORICAL_EXPENSE_DEDUP_FIELD_SET = new Set(HISTORICAL_EXPENSE_DEDUP_FIELDS);

  function isHistoricalExpenseDedupDebugEnabled() {
    return isFundScheduleDebugEnabled("debugHistoricalExpenseDedup");
  }

  function yearForHistoricalExpenseField(field) {
    return field === "FY2026_Original_Budget" ? 2026 : Number(field.slice(2, 6));
  }

  function historicalExpenseFieldValue(row, field) {
    return field === "FY2026_Original_Budget"
      ? (row.FY2026_Original_Budget || row.FY2026_Budget || 0)
      : (row[field] || 0);
  }

  function firstNonZeroHistoricalValue(groupRows, field) {
    for (let i = 0; i < groupRows.length; i++) {
      const value = historicalExpenseFieldValue(groupRows[i], field);
      if (value) return value;
    }
    return 0;
  }

  // The true accounting grain: fund, org (Dept_Code), object (Object_Code),
  // and -- only when the row's own actual/budget lookup is itself scoped to
  // one -- project. Dept_Name is deliberately excluded -- it's a
  // display/sub-program label, not part of how the county books the
  // underlying transaction.
  //
  // Project_Code is NOT part of this grain for most rows, even though it's
  // a real column: projectScopeForRow is undefined for the default case,
  // which means applyActualsToRows/applyOriginalBudgetToRows themselves sum
  // every project under org+object with no project filter at all (see
  // sumRawActualsForAccount's hasProjectScope). So two display rows with
  // different Project_Code values but the same Dept_Code+Object_Code --
  // e.g. Code Compliance (blank project) / Code Compliance Beach ("BEACH"),
  // or Planning (blank project) / Planning Short-Term Rental ("10639") --
  // still resolve to the exact same unscoped total under the hood and must
  // collapse to one key here, or the very duplication this layer exists to
  // fix goes undetected. Project_Code only belongs in the key for rows
  // where projectScopeForRow returns a defined scope (Walton County Health
  // Department, Non-Profit Funding Program, Statutory & Other) -- those
  // lookups really are restricted to one project, so a different
  // Project_Code there is a genuinely different recipient/amount, not a
  // duplicate.
  function expenseAccountingKey(row) {
    const base = [
      fundCodeForRow(row),
      String((row && row.Dept_Code) || "").trim(),
      String((row && row.Object_Code) || "").trim()
    ].join("|");
    const projectScope = projectScopeForRow(row);
    return projectScope !== undefined ? base + "|" + projectScope : base;
  }

  // Builds one merged row per true accounting key from cache.expenditures
  // (after synthesizeMissingExpenseRows has already filled in any
  // Supabase-only accounts), with each HISTORICAL_EXPENSE_DEDUP_FIELDS
  // amount counted once per key instead of once per Dept_Name sharing it.
  // Used by both the Consolidated Expense Summary ("Summary of Expenses")
  // and buildFundFinancialSchedule for FY2020-FY2026 -- see callers.
  function buildDedupedHistoricalExpenseRows(cache) {
    const sourceRows = cache.expenditures || [];
    const debug = isHistoricalExpenseDedupDebugEnabled();

    const groups = new Map();
    sourceRows.forEach((row) => {
      const key = expenseAccountingKey(row);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });

    const debugDuplicateEntries = debug ? [] : null;
    const reductionByCategoryAndField = new Map();

    function addReduction(activity, field, amount) {
      if (!amount) return;
      const bucketKey = activity + "|" + field;
      reductionByCategoryAndField.set(bucketKey, (reductionByCategoryAndField.get(bucketKey) || 0) + amount);
    }

    const dedupedRows = [];
    groups.forEach((groupRows, key) => {
      // Classification metadata (Dept_Name for display, Object_Type) is
      // taken from the first row in the group with a non-empty value, kept
      // consistent across every field for this key. Activity and fund code
      // are derived from Dept_Code/Object_Code, which are already part of
      // the key itself, so they can't conflict across the group.
      const deptNameRow = groupRows.find((r) => String(r.Dept_Name || "").trim()) || groupRows[0];
      const objectTypeRow = groupRows.find((r) => String(r.Object_Type || "").trim()) || groupRows[0];

      if (debug && groupRows.length > 1) {
        const distinctDeptNames = uniqueSorted(groupRows.map((r) => r.Dept_Name));
        const distinctObjectTypes = uniqueSorted(groupRows.map((r) => r.Object_Type));
        if (distinctDeptNames.length > 1 || distinctObjectTypes.length > 1) {
          console.warn("HistoricalExpenseDedup: conflicting classification metadata for key " + key, {
            distinctDeptNames,
            distinctObjectTypes,
            chosenDeptName: deptNameRow.Dept_Name,
            chosenObjectType: objectTypeRow.Object_Type
          });
        }
      }

      const merged = {
        Dept_Code: groupRows[0].Dept_Code,
        Dept_Name: deptNameRow.Dept_Name || "",
        Object_Code: groupRows[0].Object_Code,
        Object_Type: objectTypeRow.Object_Type || "",
        Project_Code: groupRows[0].Project_Code
      };

      HISTORICAL_EXPENSE_DEDUP_FIELDS.forEach((field) => {
        // Every row sharing this key should carry the same full, undivided
        // total (see applyActualsToRows/applyOriginalBudgetToRows), but
        // scanning the whole group for the first non-zero value -- rather
        // than always reading groupRows[0] -- protects against landing on a
        // zero placeholder row (e.g. one of several itemized FY2027 budget
        // lines under the same Dept_Name, zeroed by applyActualsToRows' own
        // narrower per-Dept_Name dedup).
        const value = firstNonZeroHistoricalValue(groupRows, field);
        merged[field] = value;

        if (groupRows.length > 1) {
          const beforeTotal = groupRows.reduce((sum, r) => sum + historicalExpenseFieldValue(r, field), 0);
          const reduction = beforeTotal - value;
          if (reduction) {
            const activity = expenseActivityForRow(merged);
            addReduction(activity, field, reduction);
            if (debugDuplicateEntries) {
              debugDuplicateEntries.push({
                key: key,
                field: field,
                year: yearForHistoricalExpenseField(field),
                activity: activity,
                displayRows: groupRows.map((r) => ({ Dept_Name: r.Dept_Name, amount: historicalExpenseFieldValue(r, field) })),
                amountBeforeDedup: beforeTotal,
                amountAfterDedup: value,
                reduction: reduction
              });
            }
          }
        }
      });

      dedupedRows.push(merged);
    });

    if (debug) {
      console.groupCollapsed(
        "HistoricalExpenseDedup debug -- shared by Summary of Expenses & Fund Financial Schedule " +
        "(compare this log across both pages to confirm parity)"
      );
      console.log("Duplicate accounting keys found:", debugDuplicateEntries.length);
      debugDuplicateEntries.forEach((entry) => console.log(entry));
      const totalsByCategory = new Map();
      const totalsByYear = new Map();
      reductionByCategoryAndField.forEach((amount, bucketKey) => {
        const sep = bucketKey.lastIndexOf("|");
        const activity = bucketKey.slice(0, sep);
        const field = bucketKey.slice(sep + 1);
        totalsByCategory.set(activity, (totalsByCategory.get(activity) || 0) + amount);
        const year = yearForHistoricalExpenseField(field);
        totalsByYear.set(year, (totalsByYear.get(year) || 0) + amount);
      });
      console.log("Total reduction by category:", Array.from(totalsByCategory.entries()));
      console.log("Total reduction by year:", Array.from(totalsByYear.entries()));
      console.groupEnd();
    }

    return dedupedRows;
  }

  // Builds a fund-by-category consolidated table. `categoryFor(row)` returns
  // the row's category key (matched case-insensitively against `typeRows`).
  // `isOtherFinancing(row)` flags rows that should be excluded from the
  // regular category rows and instead reported on their own line below the
  // categories' subtotal (e.g. interfund transfers).
  // The Self-Insurance Fund (503) is an Internal Service fund, not a
  // governmental fund, so it's excluded from this schedule entirely rather
  // than folded into "Non-Major Governmental Funds".
  const CONSOLIDATED_SCHEDULE_EXCLUDED_FUND_CODES = new Set(["503"]);

  function buildConsolidatedFundTable(config) {
    const rows = (config.rows || []).filter(
      (r) => !CONSOLIDATED_SCHEDULE_EXCLUDED_FUND_CODES.has(fundCodeForRow(r))
    );
    if (!rows.length || !(cache.funds || []).length) return "";

    const fundColumns = config.fundColumns;
    const majorCodes = new Set(fundColumns.map((c) => c.code));
    const amountFor = (r) => r.FY2027_Proposed || 0;

    // Returns one cell per major fund column, then Non-Major, then Total —
    // each either a formatted dollar amount or "–" if no matching rows
    // exist for that fund at all (vs. "$0" when rows exist but sum to zero).
    function cellsFor(predicate) {
      const majorSums = {};
      const majorHasRows = {};
      fundColumns.forEach((c) => { majorSums[c.code] = 0; majorHasRows[c.code] = false; });
      let nonMajorSum = 0;
      let nonMajorHasRows = false;
      let grandTotal = 0;

      rows.forEach((r) => {
        if (!predicate(r)) return;
        const amt = amountFor(r);
        const code = fundCodeForRow(r);
        grandTotal += amt;
        if (majorCodes.has(code)) {
          majorSums[code] += amt;
          majorHasRows[code] = true;
        } else {
          nonMajorSum += amt;
          nonMajorHasRows = true;
        }
      });

      const cells = fundColumns.map((c) => (majorHasRows[c.code] ? formatCurrency(majorSums[c.code]) : "–"));
      cells.push(nonMajorHasRows ? formatCurrency(nonMajorSum) : "–");
      cells.push(formatCurrency(grandTotal));
      return cells;
    }

    function numericValuesFor(predicate) {
      const majorSums = {};
      fundColumns.forEach((c) => { majorSums[c.code] = 0; });
      let nonMajorSum = 0;
      let grandTotal = 0;
      rows.forEach((r) => {
        if (!predicate(r)) return;
        const amt = amountFor(r);
        const code = fundCodeForRow(r);
        grandTotal += amt;
        if (majorCodes.has(code)) majorSums[code] += amt;
        else nonMajorSum += amt;
      });
      const values = fundColumns.map((c) => majorSums[c.code]);
      values.push(nonMajorSum);
      values.push(grandTotal);
      return values;
    }

    const typeRowRecords = config.typeRows.map((spec) => {
      const keyNorm = spec.key.toLowerCase();
      const predicate = (r) => (spec.predicate ? spec.predicate(r) : String(config.categoryFor(r) || "").toLowerCase() === keyNorm) && !config.isOtherFinancing(r);
      return { label: spec.label, cells: cellsFor(predicate), values: numericValuesFor(predicate), predicate };
    });

    const columnCount = fundColumns.length + 2;
    const categoryTotalValues = Array.from({ length: columnCount }, (_, i) =>
      typeRowRecords.reduce((sum, tr) => sum + tr.values[i], 0)
    );

    const otherFinancingCells = cellsFor(config.isOtherFinancing);
    const otherFinancingValues = numericValuesFor(config.isOtherFinancing);

    // A row whose category doesn't exactly match one of the lines above (a
    // Dept_Code missing from the activities sheet, a Revenue_Type typo, etc.)
    // would otherwise vanish from every row *and* the grand total with no
    // indication why. Surface it on its own line instead, so a missing
    // source-data mapping shows up as a visible dollar amount to chase down
    // rather than a silent undercount.
    const isUnclassified = (r) => !config.isOtherFinancing(r) && !typeRowRecords.some((tr) => tr.predicate(r));
    const unclassifiedCells = cellsFor(isUnclassified);
    const unclassifiedValues = numericValuesFor(isUnclassified);
    const hasUnclassified = unclassifiedValues.some((v) => v !== 0);

    const grandTotalValues = categoryTotalValues.map((v, i) => v + otherFinancingValues[i] + unclassifiedValues[i]);

    const headerCells = ["ROW LABELS"]
      .concat(fundColumns.map((c) => c.label.toUpperCase()))
      .concat(["NON-MAJOR GOVERNMENTAL FUNDS", "TOTAL ALL FUNDS"]);

    const bodyRows = [];
    bodyRows.push('<tr class="wc-table-group-row"><td>' + escapeHtml(config.groupRowLabel) + "</td>" + headerCells.slice(1).map(() => "<td></td>").join("") + "</tr>");
    typeRowRecords.forEach((tr) => {
      bodyRows.push("<tr>" + categoryCellHtml(tr.label) + tr.cells.map((c) => '<td class="wc-num">' + escapeHtml(c) + "</td>").join("") + "</tr>");
    });
    bodyRows.push(
      '<tr class="wc-table-total-row"><td>' + escapeHtml(config.totalRowLabel) + "</td>" +
      categoryTotalValues.map((v) => '<td class="wc-num">' + formatCurrency(v) + "</td>").join("") +
      "</tr>"
    );
    bodyRows.push(
      "<tr>" + categoryCellHtml(config.otherLineLabel) +
      otherFinancingCells.map((c) => '<td class="wc-num">' + escapeHtml(c) + "</td>").join("") +
      "</tr>"
    );
    if (hasUnclassified) {
      bodyRows.push(
        '<tr class="wc-table-unclassified-row"><td>Unclassified (check source data mapping)</td>' +
        unclassifiedCells.map((c) => '<td class="wc-num">' + escapeHtml(c) + "</td>").join("") +
        "</tr>"
      );
    }
    bodyRows.push(
      "<tr><td>" + escapeHtml(config.grandTotalLabel) + "</td>" +
      grandTotalValues.map((v) => '<td class="wc-num">' + formatCurrency(v) + "</td>").join("") +
      "</tr>"
    );

    return (
      '<div class="wc-table-wrap">' +
      '<p class="wc-table-label">' + escapeHtml(config.caption) + "</p>" +
      '<div class="wc-data-table-scroll">' +
      '<table class="wc-data-table">' +
      "<thead><tr>" + headerCells.map((h) => "<th>" + escapeHtml(h) + "</th>").join("") + "</tr></thead>" +
      "<tbody>" + bodyRows.join("") + "</tbody>" +
      "</table>" +
      "</div>" +
      lastUpdatedNoteHtml() +
      "</div>"
    );
  }

  function renderConsolidatedRevenueBudgetTable() {
    const html = buildConsolidatedFundTable({
      rows: cache.revenues,
      fundColumns: CONSOLIDATED_REVENUE_FUND_COLUMNS,
      typeRows: CONSOLIDATED_REVENUE_TYPE_ROWS,
      categoryFor: (r) => r.Revenue_Type,
      // Revenue_Code 381000 (Interfund Group Transfer In) is an "Other
      // Financing Source," reported on its own line below REVENUES TOTAL
      // rather than inside the regular Other Sources revenue line.
      isOtherFinancing: (r) => String(r.Revenue_Code || "").trim() === "381000",
      caption: "Revenue Budget",
      groupRowLabel: "Revenues",
      totalRowLabel: "REVENUES TOTAL",
      otherLineLabel: "Other Financial Sources",
      grandTotalLabel: "Total Revenue and Other Financial Sources"
    });
    if (!html) return html;
    const millageCells = CONSOLIDATED_REVENUE_FUND_COLUMNS.map((fund) => {
      if (fund.code === "001") return "3.4347";
      if (fund.code === "105") return "0.4410";
      return "&ndash;";
    }).concat(["&ndash;", "&ndash;"]);
    const row = '<tr class="wc-table-millage-row"><td>Millage per $1,000</td>' +
      millageCells.map((value) => '<td class="wc-num">' + value + '</td>').join("") + '</tr>';
    return html.replace("<tbody>", "<tbody>" + row);
  }

  function renderConsolidatedExpenditureBudgetTable() {
    return buildConsolidatedFundTable({
      rows: cache.expenditures,
      fundColumns: CONSOLIDATED_EXPENDITURE_FUND_COLUMNS,
      typeRows: CONSOLIDATED_EXPENDITURE_ACTIVITY_ROWS.map((a) => ({ key: a, label: a })),
      categoryFor: expenseActivityForRow,
      // Rows classified under a financing activity (transfers, debt
      // proceeds, fund balance) rather than a functional program area are
      // reported on their own line below EXPENDITURES TOTAL instead.
      isOtherFinancing: isOtherFinancingExpenseRow,
      caption: "Expenditure Budget",
      groupRowLabel: "Expenditures",
      totalRowLabel: "EXPENDITURES TOTAL",
      otherLineLabel: "Other Financial Uses",
      grandTotalLabel: "Total Expenditure and Other Financial Uses"
    });
  }

  // Shared countywide FY2026-to-FY2027 expenditure change used by both
  // the Summary of Budget Changes and the statutory Budget Summary ad.
  // This preserves the same exclusions and historical deduplication rules
  // on both pages so their displayed percentages cannot drift apart.
  function consolidatedBudgetChangePercent() {
    const matchesFundAndFinancing = (row) =>
      !CONSOLIDATED_SCHEDULE_EXCLUDED_FUND_CODES.has(fundCodeForRow(row)) &&
      !isOtherFinancingExpenseRow(row);
    const proposed = (cache.expenditures || [])
      .filter(matchesFundAndFinancing)
      .reduce((sum, row) => sum + (row.FY2027_Proposed || 0), 0);
    const prior = (cache.dedupedExpenseRows || [])
      .filter(matchesFundAndFinancing)
      .reduce((sum, row) => sum + (row.FY2026_Original_Budget || row.FY2026_Budget || 0), 0);
    return prior ? (proposed - prior) / prior : 0;
  }

  // Florida TRIM newspaper-ad presentation: revenues and expenditures share
  // one table, and only the two funds that levy property tax show millage.
  function renderConsolidatedFinancialBudgetTable() {
    if (!(cache.funds || []).length) return "";
    const directOperationalColumns = [
      { key: "general", label: "General Fund", codes: ["001"] },
      { key: "transportation", label: "Transportation Fund", codes: ["101"] },
      { key: "sheriff", label: "Fine & Forfeiture Fund", codes: ["107"] },
      { key: "tourist", label: "Tourist Development Fund", codes: ["111"] },
      { key: "solidWaste", label: "Solid Waste Fund", codes: ["112"] },
      { key: "building", label: "Building Fund", codes: ["103"] },
      { key: "mosquito", label: "Mosquito Control Fund", codes: ["105"] },
      { key: "msbu", label: "MSBU Fund", codes: ["102"] },
      { key: "special", label: "Special Revenue Funds", codes: [] }
    ];
    const explicitlyPresentedCodes = new Set(["001", "111", "101", "107", "103", "105", "112", "102", "300", "503"]);
    directOperationalColumns.find((column) => column.key === "special").codes = (cache.funds || [])
      .map((fund) => String(fund.Fund_Code || "").trim())
      .filter((code) => code && !explicitlyPresentedCodes.has(code));
    const capitalCodes = ["300"];
    const allowedCodes = new Set(directOperationalColumns.flatMap((column) => column.codes).concat(capitalCodes));
    const codeSets = directOperationalColumns.map((column) => new Set(column.codes));
    const isRevenueTransfer = (row) => String(row.Revenue_Code || "").trim() === "381000";
    const isExpenseTransfer = (row) => normalizeDeptName(activityForDeptCode(row.Dept_Code)) === "interfund transfers";

    function paperValues(sourceRows, predicate, isTransfer) {
      const direct = directOperationalColumns.map(() => 0);
      let capital = 0;
      let elimination = 0;
      (sourceRows || []).forEach((row) => {
        const code = fundCodeForRow(row);
        if (!allowedCodes.has(code) || !predicate(row)) return;
        const amount = row.FY2027_Proposed || 0;
        const directIndex = codeSets.findIndex((codes) => codes.has(code));
        if (directIndex >= 0) direct[directIndex] += amount;
        else if (capitalCodes.includes(code)) capital += amount;
        if (isTransfer(row)) elimination -= amount;
      });
      const operational = direct.reduce((sum, value) => sum + value, 0) + elimination;
      return direct.concat([elimination, operational, capital, operational + capital]);
    }

    function balanceValues() {
      const direct = directOperationalColumns.map((column) => fundBalanceForYear(column.codes, 2026));
      const operational = direct.reduce((sum, value) => sum + value, 0);
      const capital = fundBalanceForYear(capitalCodes, 2026);
      return direct.concat([0, operational, capital, operational + capital]);
    }

    const allRevenue = (row) => allowedCodes.has(fundCodeForRow(row));
    const allExpense = (row) => allowedCodes.has(fundCodeForRow(row));
    const discountRevenue = (row) => String(row.Revenue_Code || "").trim() === "389001";
    const currentRevenue = (row) => allRevenue(row) && !discountRevenue(row);
    const sourceNetRevenueValues = paperValues(cache.revenues, currentRevenue, isRevenueTransfer);
    const propertyTaxPredicate = (row) => ["311000", "311001"].includes(String(row.Revenue_Code || "").trim());
    const netPropertyTaxValues = paperValues(cache.revenues, propertyTaxPredicate, isRevenueTransfer);
    // The FY2027 property-tax amounts in the budget source are already the
    // statutorily budgeted 95-percent collections. The newspaper summary
    // shows the corresponding 100-percent levy first, then displays the
    // five-percent reduction separately so Total Estimated Revenues returns
    // to the exact source amount.
    const propertyTaxValues = netPropertyTaxValues.map((value) => value ? value / 0.95 : 0);
    const discountValues = propertyTaxValues.map((gross, index) => netPropertyTaxValues[index] - gross);
    const grossRevenueValues = sourceNetRevenueValues.map(
      (value, index) => value + propertyTaxValues[index] - netPropertyTaxValues[index]
    );
    const revenueValues = grossRevenueValues.map((value, index) => value + discountValues[index]);
    const expenditureValues = paperValues(cache.expenditures, allExpense, isExpenseTransfer);
    const beginningBalances = balanceValues();
    const endingReserves = beginningBalances.map((balance, index) => balance + revenueValues[index] - expenditureValues[index]);
    const revenuesAndReserves = beginningBalances.map((balance, index) => balance + revenueValues[index]);
    const expendituresAndReserves = expenditureValues.map((expense, index) => expense + endingReserves[index]);

    const headers = [""].concat(directOperationalColumns.map((column) => column.label)).concat([
      "Less Interfund Transfers", "Total Operational Revenues / Expenditures", "Capital Project Fund", "Total All Funds"
    ]);
    const bodyRows = [];
    const paperCurrency = (value) => value < 0
      ? "($" + Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 0 }) + ")"
      : formatCurrency(value);
    const moneyRow = (label, values, className) => '<tr class="' + (className || "") + '"><td>' + escapeHtml(label) + '</td>' +
      values.map((value) => '<td class="wc-num">' + (value ? paperCurrency(value) : "&ndash;") + '</td>').join("") + '</tr>';
    const predicateForRevenueType = (key) => (row) => String(row.Revenue_Type || "").trim().toLowerCase() === key.toLowerCase() && !discountRevenue(row);

    const millageValues = directOperationalColumns.map((column) => column.key === "general" ? "3.4347" : (column.key === "mosquito" ? "0.4410" : "&ndash;")).concat(["&ndash;", "&ndash;", "&ndash;", "&ndash;"]);
    bodyRows.push('<tr class="wc-table-millage-row trim-table-gray-row"><td>Millage per $1,000</td>' + millageValues.map((value) => '<td class="wc-num">' + value + '</td>').join("") + '</tr>');
    bodyRows.push(moneyRow("Property Taxes (Ad Valorem)", propertyTaxValues));
    bodyRows.push(moneyRow("General Government Taxes (excluding Property Taxes)", paperValues(cache.revenues, (row) => predicateForRevenueType("General Government Taxes")(row) && !["311000", "311001", "389001"].includes(String(row.Revenue_Code || "").trim()), isRevenueTransfer)));
    CONSOLIDATED_REVENUE_TYPE_ROWS.slice(2).forEach((spec) => {
      const predicate = spec.key === "Other Sources"
        ? (row) => predicateForRevenueType(spec.key)(row) || isRevenueTransfer(row)
        : predicateForRevenueType(spec.key);
      bodyRows.push(moneyRow(spec.label, paperValues(cache.revenues, predicate, isRevenueTransfer)));
    });
    bodyRows.push(moneyRow("Total Revenues", grossRevenueValues, "wc-table-total-row trim-table-gray-row"));
    bodyRows.push(moneyRow("Less 5%", discountValues));
    bodyRows.push(moneyRow("Total Estimated Revenues", revenueValues, "wc-table-total-row"));
    bodyRows.push(moneyRow("Total Revenues & Reserves", revenuesAndReserves, "wc-table-total-row"));
    ["General Government", "Public Safety", "Physical Environment", "Transportation", "Economic Environment", "Human Services", "Culture and Recreation", "Court Related Cost", "Debt Service"].forEach((activity) => {
      bodyRows.push(moneyRow(activity, paperValues(cache.expenditures, (row) => expenseActivityForRow(row) === activity && !isExpenseTransfer(row), isExpenseTransfer)));
    });
    bodyRows.push(moneyRow("Other Uses", paperValues(cache.expenditures, (row) => expenseActivityForRow(row) === "Other Uses" || isOtherFinancingExpenseRow(row), isExpenseTransfer)));
    bodyRows.push(moneyRow("Total Expenditures", expenditureValues, "wc-table-total-row trim-table-gray-row"));
    bodyRows.push(moneyRow("Reserves", endingReserves, "wc-table-balance-row"));
    bodyRows.push(moneyRow("Total Expenditures & Reserves", expendituresAndReserves, "wc-table-total-row"));

    const operatingIncreasePercent = consolidatedBudgetChangePercent();
    const operatingIncreaseHtml = operatingIncreasePercent > 0
      ? '<p class="trim-operating-increase">THE PROPOSED OPERATING BUDGET EXPENDITURES OF THE WALTON COUNTY BOARD OF COUNTY COMMISSIONERS ARE ' +
        (operatingIncreasePercent * 100).toFixed(1) + '% MORE THAN LAST YEAR&rsquo;S TOTAL OPERATING EXPENDITURES.</p>'
      : "";

    return '<div class="wc-table-wrap trim-budget-summary-ad">' +
      '<div class="trim-budget-heading"><h2>Budget Summary</h2>' +
      '<p>Walton County, Florida &mdash; Board of County Commissioners &mdash; Fiscal Year 2026&ndash;2027</p>' +
      operatingIncreaseHtml + '</div>' +
      '<div class="wc-data-table-scroll"><table class="wc-data-table wc-consolidated-financial-table">' +
      '<thead><tr>' + headers.map((header) => '<th>' + escapeHtml(header) + '</th>').join("") + '</tr></thead>' +
      '<tbody>' + bodyRows.join("") + '</tbody></table></div>' +
      '<p class="trim-budget-record-note">The tentative adopted, and/or final budgets are on file in the Office of the Walton County Board of County Commissioners as a public record.</p></div>';
  }

  // "Fund Financial Schedules" page: a Beginning Fund Balance -> Revenues
  // (by the same categories as the Consolidated Revenue Budget) ->
  // Expenditures (by the same activities as the Consolidated Expenditure
  // Budget) -> Change in Fund Balance -> Estimated Ending Fund Balance
  // roll-forward, either for one fund (a single "FY 2027 Proposed" column)
  // or several funds combined into side-by-side columns (the consolidated
  // schedule at the top of the page).
  const FUND_SCHEDULE_MAJOR_FUNDS = [
    { code: "001", label: "General Fund" },
    { code: "101", label: "Transportation Fund" },
    { code: "107", label: "Fine & Forfeiture / Sheriff Fund" },
    { code: "111", label: "Tourist Development Fund" },
    { code: "112", label: "Solid Waste Fund" },
    { code: "300", label: "Capital Projects Fund" }
  ];

  const FUND_SCHEDULE_NON_MAJOR_FUNDS = [
    { code: "102", label: "MSBU Fund" },
    { code: "103", label: "Building Fund" },
    { code: "109", label: "E911 Fund" },
    { code: "110", label: "Housing & Urban Development Fund" },
    { code: "105", label: "Mosquito Control Fund" },
    { code: "106", label: "Mosquito Control State Aid Fund" },
    { code: "114", label: "Recreation Plat Fee Fund" },
    { code: "113", label: "Preservation Fund" },
    { code: "115", label: "Sidewalk Fund" }
  ];

  // FY2027's Beginning Fund Balance is simply FY2026's recorded balance,
  // so the sheet only needs FY2026 (and prior) filled in. For a prior-year
  // column (e.g. FY2024 Actual), the beginning balance is the year before
  // that column's own fiscal year.
  function fundBalanceForYear(fundCodes, year) {
    const codes = Array.isArray(fundCodes) ? fundCodes : [fundCodes];
    return (cache.fundBalances || [])
      .filter((r) => codes.includes(r.Fund_Code) && r.Year === String(year))
      .reduce((sum, r) => sum + (r.Fund_Balance || 0), 0);
  }

  const FINANCIAL_FORECAST_FUNDS = [
    { code: "001", label: "General Fund" },
    { code: "101", label: "Transportation Fund" },
    { code: "107", label: "Fine & Forfeiture / Sheriff" },
    { code: "111", label: "Tourist Development Fund" },
    { code: "112", label: "Solid Waste Fund" },
    { code: "300", label: "Capital Projects Fund" }
  ];

  const FINANCIAL_FORECAST_YEARS = [2027, 2028, 2029, 2030, 2031];
  const FINANCIAL_FORECAST_ACTUAL_YEARS = [2020, 2021, 2022, 2023, 2024, 2025];
  const FORECAST_EXCLUDED_EXPENSE_OBJECT_CODES = new Set(["561000", "549006", "549007", "549009"]);

  function isForecastExcludedExpenseRow(row) {
    const objectCode = String((row && row.Object_Code) || "").trim();
    if (FORECAST_EXCLUDED_EXPENSE_OBJECT_CODES.has(objectCode)) return true;
    if (
      (objectCode === "562000" || objectCode === "563000") &&
      fundCodeForRow(row) === "001" &&
      normalizeDeptName(row && row.Dept_Name) === "board of county commissioners"
    ) {
      return true;
    }
    return (
      objectCode === "563000" &&
      fundCodeForRow(row) === "111" &&
      normalizeDeptName(row && row.Dept_Name) === "beach operations"
    );
  }

  function forecastFundCodeForRow(row, normalizeForAssumptions) {
    if (
      normalizeForAssumptions &&
      String((row && row.Dept_Code) || "").trim() === "00120000" &&
      normalizeDeptName(row && row.Dept_Name) === "engineering services"
    ) {
      return "101";
    }
    return fundCodeForRow(row);
  }

  function isTouristDevelopmentPersonnelRow(row) {
    return (
      fundCodeForRow(row) === "111" &&
      normalizeForecastCategory(row && row.Object_Type, "expense") === "Personnel Services"
    );
  }

  function forecastTouristDevelopmentPersonnelHistoricalDetailValue(row, yearField) {
    const actualYearMatch = /^FY(\d{4})_Actual$/.exec(yearField);
    if (!actualYearMatch || Number(actualYearMatch[1]) >= 2024) return undefined;
    if (!isTouristDevelopmentPersonnelRow(row)) return undefined;

    const year = Number(actualYearMatch[1]);
    const fy2024 = Number(row && row.FY2024_Actual) || 0;
    const fy2025 = Number(row && row.FY2025_Actual) || 0;
    const baseYear = fy2024 ? 2024 : 2025;
    const baseValue = fy2024 || fy2025;
    if (!baseValue) return 0;

    const observedGrowth = fy2024 && fy2025 ? (fy2025 - fy2024) / Math.abs(fy2024) : 0;
    const growth = Math.max(-0.03, Math.min(0.05, observedGrowth));
    return baseValue / Math.pow(1 + growth, baseYear - year);
  }

  function forecastExpenseDetailValue(row, yearField) {
    const tdtPersonnelValue = forecastTouristDevelopmentPersonnelHistoricalDetailValue(row, yearField);
    if (tdtPersonnelValue !== undefined) return tdtPersonnelValue;
    return Number(row[yearField]) || 0;
  }

  function forecastMoney(value) {
    const rounded = Math.round(Number(value) || 0);
    const sign = rounded < 0 ? "-" : "";
    return sign + "$" + Math.abs(rounded).toLocaleString("en-US");
  }

  function forecastPercent(value) {
    if (value === null || value === undefined || value === "") return "N/A";
    const n = Number(value);
    if (!Number.isFinite(n)) return "N/A";
    return (n * 100).toFixed(n === 0 ? 0 : 1) + "%";
  }

  // Historical CAGR is only ever computed from a "stable" run of positive
  // years (see historicalCagr's own base-year filtering), so a negative
  // result means the line item is shrinking toward zero rather than
  // showing a meaningful long-term rate -- displayed as N/A rather than a
  // misleadingly precise negative percentage.
  function forecastCagrDisplay(value) {
    // historicalCagrDetails already restricts itself to a stable run of
    // years (see its own base-year filtering), so a negative result is a
    // real, meaningful long-term decline worth showing -- not noise to
    // hide behind N/A.
    return forecastPercent(value);
  }

  // True when every nonzero historical actual year for this line is
  // identical -- a flat history has no real growth trend to project, so
  // the assumption shown alongside it should read as flat too rather than
  // a manually-entered rate that no longer reflects the actuals.
  function isForecastHistoryFlat(valuesByYear) {
    const available = forecastAvailableTrendValues(valuesByYear);
    if (available.length < 2) return false;
    return available.every((item) => item.value === available[0].value);
  }

  // A handful of revenue lines are set by state statute/formula rather
  // than a locally chosen rate or a historical-trend projection -- their
  // growth (or lack of it) reflects state policy/economic conditions, not
  // anything derivable from this county's own actuals.
  const FORECAST_STATUTORY_REVENUE_NAMES = new Set([
    "local government half-cent sales tax",
    "state revenue share proceeds",
    "state fuel taxes",
    "racing tax"
  ]);

  // Per-line overrides for individual revenue/expense names whose growth
  // assumption shouldn't just inherit their parent category's rate (see
  // financial-forecast-assumptions.js, which only sets assumptions at the
  // fund+category level) -- e.g. a specific line item known to need its
  // own, deliberately-judged rate rather than the category default.
  const FORECAST_DETAIL_ASSUMPTION_OVERRIDES = new Map([
    ["grill food revenue", { method: "Management Estimate", rate: 0 }],
    ["non-profit funding program", { method: "Management Estimate", rate: 0 }],
    ["state fire", { method: "Management Estimate", rate: 0 }],
    ["tdc public safety reimbursements", { method: "Management Estimate", rate: 0 }],
    ["motor fuel use tax", { method: "Management Estimate", rate: 0 }],
    ["interfund group transfer out", { method: "Management Estimate", rate: 0.025 }],
    ["refund of prior year expenditures", { method: "Management Estimate", rate: -1 }],
    ["bcc other uses contingency", { method: "Management Estimate", rate: 0 }],
    ["board of county commissioners", { method: "Management Estimate", rate: 0.01 }],
    ["housing prisoners revenue", { method: "Management Estimate", rate: 0 }],
    ["walton county sheriff's office", { method: "Management Estimate", rate: 0.025 }],
    ["beach renourishment", { method: "Management Estimate", rate: 0 }]
  ]);
  const FORECAST_DECLINING_BASE_EXPENSE_GROWTH = 0.01;

  function forecastDetailGrowthOverride(fundCode, lineType, name, valuesByYear) {
    const detailOverride = FORECAST_DETAIL_ASSUMPTION_OVERRIDES.get(String(name || "").trim().toLowerCase());
    if (detailOverride && Number.isFinite(detailOverride.rate)) return detailOverride.rate;
    if (String(fundCode || "").trim() === "111" && lineType === "expense") return 0.03;
    return forecastDecliningBaseGrowthOverride(lineType, valuesByYear);
  }

  function forecastDecliningBaseGrowthOverride(lineType, valuesByYear) {
    if (lineType !== "expense") return null;
    const originalBudget = Number(valuesByYear && valuesByYear[2026]) || 0;
    const proposedBudget = Number(valuesByYear && valuesByYear[2027]) || 0;
    if (originalBudget > 0 && proposedBudget > 0 && proposedBudget < originalBudget) return FORECAST_DECLINING_BASE_EXPENSE_GROWTH;
    return null;
  }

  // Keeps the Forecast Assumptions table's "Method" column to a short,
  // fixed vocabulary (see the 7 terms below) instead of free text, so a
  // reader (e.g. a GFOA reviewer) can scan it at a glance -- each label is
  // derived from signals already computed elsewhere on this same row
  // (historical flatness, available history, the manual assumption vs.
  // the historically-suggested trend) rather than invented per row.
  function forecastAssumptionMethod(detail, manualValue, lineType) {
    const detailOverride = FORECAST_DETAIL_ASSUMPTION_OVERRIDES.get(String(detail.name || "").trim().toLowerCase());
    if (detailOverride) return detailOverride.method;
    if (detail.baseDeclineOverride) return "Management Estimate";
    if (FORECAST_STATUTORY_REVENUE_NAMES.has(String(detail.name || "").trim().toLowerCase())) {
      return "Statutory";
    }
    if (isForecastHistoryFlat(detail.values)) return "Flat";
    if (
      lineType === "revenue" &&
      Number.isFinite(detail.cagr) &&
      detail.cagr < 0 &&
      (Number(manualValue) > 0 || Number(detail.categorySuggested) > 0)
    ) {
      return "Declining";
    }

    const hasManual = Number.isFinite(manualValue);
    const hasHistory = Number.isFinite(detail.avgGrowth) || Number.isFinite(detail.cagr);
    if (!hasHistory) return hasManual ? "Management Estimate" : "New Revenue";

    const suggested = detail.categorySuggested;
    if (!hasManual) {
      return Number.isFinite(suggested) && suggested < 0 ? "Declining" : "Normalized";
    }
    if (Number.isFinite(detail.cagr) && detail.cagr < 0 && manualValue >= 0) {
      return "Management Estimate";
    }

    // A manual rate isn't compared to itself -- only meaningful once
    // there's a computed historical trend to compare it against.
    if (!Number.isFinite(suggested)) return "Management Estimate";
    const tolerance = 0.01;
    if (Math.abs(manualValue - suggested) <= tolerance) return "Normalized";
    if (manualValue < suggested - tolerance) return "Conservative";
    return "Management Estimate";
  }

  function forecastAssumptionValue(row, year) {
    if (!row) return null;
    const value = row["fy" + year + "_assumption"];
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function normalizeForecastCategory(value, lineType) {
    const text = String(value || "").trim();
    if (lineType === "expense") {
      if (/operating/i.test(text)) return "Operating Expenses";
      if (/grant/i.test(text)) return "Grants and Aids";
      if (/debt/i.test(text)) return "Debt Service";
      if (/other|transfer|reserve/i.test(text)) return "Other Uses / Transfers";
      return text || "Other Uses / Transfers";
    }
    if (/permit/i.test(text)) return "Permits Fees and Special Assessments";
    if (/judgment|fine|forfeit/i.test(text)) return "Judgments, Fines and Forfeits";
    if (/other/i.test(text)) return "Other Sources";
    return text || "Miscellaneous Revenue";
  }

  // FY2020-FY2023 Ad Valorem Taxes (Revenue_Code 311000) actuals were
  // booked per fund under that fund's own org code -- 001311 (General
  // Fund), 101311 (Transportation), 107311 (Sheriff) -- each collecting
  // its own millage. Starting FY2024 the county books all of it under
  // 001311 alone; 101311 and 107311 go to zero from FY2024 on. Read as-is,
  // the General Fund's Ad Valorem trend looks like it quadrupled in
  // FY2024, when the same countywide collection is now just booked in one
  // place. Scoped to the forecast model only (not a sitewide actuals
  // correction, which would also change how Summary of Revenues/Fund
  // Financial Schedules display Transportation's and Sheriff's own
  // historical actuals): the General Fund's historical trend folds in the
  // other two funds' pre-2024 share, and those two funds' own trend has
  // its now-merged-away share zeroed so the same dollars aren't double
  // counted across funds.
  const FORECAST_AD_VALOREM_REVENUE_CODE = "311000";
  const FORECAST_AD_VALOREM_PRIMARY_ORG = "001311";
  const FORECAST_AD_VALOREM_MERGED_AWAY_ORGS = ["101311", "107311"];
  const FORECAST_AD_VALOREM_MERGE_ORGS = [FORECAST_AD_VALOREM_PRIMARY_ORG].concat(FORECAST_AD_VALOREM_MERGED_AWAY_ORGS);

  function forecastAdValoremHistoricalOverride(row, yearField) {
    if (String(row.Revenue_Code || "").trim() !== FORECAST_AD_VALOREM_REVENUE_CODE) return undefined;
    const org = String(row.Dept_Code || "").trim();
    const isPrimary = org === FORECAST_AD_VALOREM_PRIMARY_ORG;
    const isMergedAway = FORECAST_AD_VALOREM_MERGED_AWAY_ORGS.indexOf(org) !== -1;
    if (!isPrimary && !isMergedAway) return undefined;
    if (isMergedAway) return 0;

    const actualYearMatch = /^FY(\d{4})_Actual$/.exec(yearField);
    if (actualYearMatch) {
      const year = Number(actualYearMatch[1]);
      const total = FORECAST_AD_VALOREM_MERGE_ORGS.reduce(
        (sum, mergeOrg) => sum + sumRawActualsForAccount(cache.revenueActualRows, mergeOrg, FORECAST_AD_VALOREM_REVENUE_CODE, year).total,
        0
      );
      return revenueDisplayAmount(total);
    }
    if (yearField === "FY2026_Original_Budget") {
      const total = FORECAST_AD_VALOREM_MERGE_ORGS.reduce(
        (sum, mergeOrg) => sum + sumRawActualsForAccount(cache.originalBudgetRows, mergeOrg, FORECAST_AD_VALOREM_REVENUE_CODE, 2026).total,
        0
      );
      return revenueDisplayAmount(total);
    }
    return undefined;
  }

  function forecastBeachVendingHistoricalOverride(row, yearField) {
    if (String(row.Revenue_Code || "").trim() !== BCC_BEACH_VENDING_REVENUE_CODE) return undefined;
    const actualYearMatch = /^FY(\d{4})_Actual$/.exec(yearField);
    if (!actualYearMatch) return undefined;

    const dept = normalizeDeptName(row && row.Dept_Name);
    if (dept === "board of county commissioners") return 0;
    if (dept !== "code compliance" && dept !== "code compliance beach") return undefined;

    const year = Number(actualYearMatch[1]);
    const result = sumRawActualsForAccount(
      cache.revenueActualRows,
      row.Dept_Code,
      BCC_BEACH_VENDING_REVENUE_CODE,
      year
    );
    return result.matched ? revenueDisplayAmount(result.total) : undefined;
  }

  function forecastHistoricalRevenueOverride(row, yearField) {
    const adValoremOverride = forecastAdValoremHistoricalOverride(row, yearField);
    if (adValoremOverride !== undefined) return adValoremOverride;
    const beachVendingOverride = forecastBeachVendingHistoricalOverride(row, yearField);
    if (beachVendingOverride !== undefined) return beachVendingOverride;
    return undefined;
  }

  // FY2020-FY2025 actuals and the FY2026 Original Budget are recorded once
  // per account, but a sheet account shared by many departments (e.g. the
  // General Fund's Ad Valorem Taxes line, Dept_Code 001311) repeats that
  // same full account total on every department's own row referencing it
  // (see applyActualsToRows/applyOriginalBudgetToRows, and
  // buildDedupedHistoricalExpenseRows/revenueBudgetUniqueKey, which exist
  // specifically to undo this for other tables). Summed here without the
  // same guard, those years would multiply a shared account's total once
  // per department referencing it -- which is what was inflating General
  // Government Taxes (dominated by the Ad Valorem line) on this page.
  // FY2027 Proposed is left alone: it comes straight from the sheet's own
  // itemized budget lines, which can legitimately share org/code values.
  function forecastCategoryRows(lineType, fundCode, yearField, options) {
    const normalizeForAssumptions = Boolean(options && options.normalizeForAssumptions);
    const needsDedup = HISTORICAL_EXPENSE_DEDUP_FIELD_SET.has(yearField);
    const categoryField = lineType === "expense" ? "Object_Type" : "Revenue_Type";
    const totals = new Map();
    if (lineType === "expense") {
      const rows = needsDedup ? (cache.dedupedExpenseRows || []) : (cache.expenditures || []);
      rows.forEach((row) => {
        if (forecastFundCodeForRow(row, normalizeForAssumptions) !== fundCode) return;
        if (normalizeForAssumptions && isForecastExcludedExpenseRow(row)) return;
        const category = normalizeForecastCategory(row[categoryField], lineType);
        totals.set(category, (totals.get(category) || 0) + (Number(row[yearField]) || 0));
      });
      return totals;
    }
    const seenKeys = needsDedup ? new Set() : null;
    (cache.revenues || []).forEach((row) => {
      if (fundCodeForRow(row) !== fundCode) return;
      if (seenKeys) {
        const key = revenueBudgetUniqueKey(row);
        if (seenKeys.has(key)) return;
        seenKeys.add(key);
      }
      const category = normalizeForecastCategory(row[categoryField], lineType);
      // Actuals/FY2026 budget come from Supabase, which stores revenue as a
      // credit (negative) amount -- every other reader of these two fields
      // (budgetLineColumnAmount, revenueBudgetMergeContribution) flips the
      // sign with revenueDisplayAmount before summing/displaying.
      const rawValue = Number(row[yearField]) || 0;
      let value = needsDedup ? revenueDisplayAmount(rawValue) : rawValue;
      if (needsDedup) {
        const override = forecastHistoricalRevenueOverride(row, yearField);
        if (override !== undefined) value = override;
      }
      totals.set(category, (totals.get(category) || 0) + value);
    });
    return totals;
  }

  // Same source rows and dedup/sign rules as forecastCategoryRows, but
  // bucketed by the line's own name (Revenue_Name for revenue, Dept_Name
  // for expense) instead of its broad category -- used for the "Category
  // Forecast Detail" breakdown table, which lists individual revenue
  // sources and departments rather than the handful of growth-assumption
  // categories. Each bucket still remembers its parent category so the
  // matching category's growth assumption can be applied to it.
  // Sub-program Dept_Names that split out of their parent department
  // elsewhere on the site (e.g. Code Compliance / Code Compliance Beach,
  // sharing one Dept_Code -- see synthesizeMissingExpenseRows) are folded
  // back into the parent here: the forecast's department breakdown is
  // meant to show one driver per department, not its internal street/beach
  // sub-program split.
  const FORECAST_DETAIL_NAME_MERGE = new Map([
    ["Code Compliance Beach", "Code Compliance"],
    ["Planning Short-Term Rental", "Planning"],
    ["Court Technology - Court Administration", "Court Technology / State Attorney / Public Defender"],
    ["Court Technology Court Administration", "Court Technology / State Attorney / Public Defender"],
    ["Court Technology State Attorney", "Court Technology / State Attorney / Public Defender"],
    ["Court Technology Public Defender", "Court Technology / State Attorney / Public Defender"],
    ["State Attorney", "Court Technology / State Attorney / Public Defender"],
    ["Public Defender", "Court Technology / State Attorney / Public Defender"]
  ]);

  function forecastDetailName(lineType, fundCode, rawName) {
    const name = String(rawName || "").trim() || "Unclassified";
    if (lineType === "revenue" && fundCode === "111" && /^tourist development tax/i.test(name)) {
      return "Tourist Development Taxes";
    }
    return FORECAST_DETAIL_NAME_MERGE.get(name) || name;
  }

  function forecastDetailRows(lineType, fundCode, yearField, options) {
    const normalizeForAssumptions = Boolean(options && options.normalizeForAssumptions);
    const needsDedup = HISTORICAL_EXPENSE_DEDUP_FIELD_SET.has(yearField);
    const categoryField = lineType === "expense" ? "Object_Type" : "Revenue_Type";
    const nameField = lineType === "expense" ? "Dept_Name" : "Revenue_Name";
    const totals = new Map();

    function addRow(row, value) {
      const category = normalizeForecastCategory(row[categoryField], lineType);
      const name = forecastDetailName(lineType, fundCode, row[nameField]);
      const amount = Number(value) || 0;
      const existing = totals.get(name);
      if (existing) {
        existing.value += amount;
        existing.parts[category] = (existing.parts[category] || 0) + amount;
        if (Math.abs(existing.parts[category]) > Math.abs(existing.parts[existing.category] || 0)) {
          existing.category = category;
        }
      } else {
        totals.set(name, { category, value: amount, parts: { [category]: amount } });
      }
    }

    if (lineType === "expense") {
      const rows = needsDedup ? (cache.dedupedExpenseRows || []) : (cache.expenditures || []);
      rows.forEach((row) => {
        if (forecastFundCodeForRow(row, normalizeForAssumptions) !== fundCode) return;
        if (normalizeForAssumptions && isForecastExcludedExpenseRow(row)) return;
        addRow(row, forecastExpenseDetailValue(row, yearField));
      });
      return totals;
    }

    const seenKeys = needsDedup ? new Set() : null;
    (cache.revenues || []).forEach((row) => {
      if (fundCodeForRow(row) !== fundCode) return;
      if (seenKeys) {
        const key = revenueBudgetUniqueKey(row);
        if (seenKeys.has(key)) return;
        seenKeys.add(key);
      }
      const rawValue = Number(row[yearField]) || 0;
      let value = needsDedup ? revenueDisplayAmount(rawValue) : rawValue;
      if (needsDedup) {
        const override = forecastHistoricalRevenueOverride(row, yearField);
        if (override !== undefined) value = override;
      }
      addRow(row, value);
    });
    return totals;
  }

  function summarizeForecastHistory(lineType, fundCode) {
    return FINANCIAL_FORECAST_ACTUAL_YEARS.map((year) => {
      const field = "FY" + year + "_Actual";
      const categories = forecastCategoryRows(lineType, fundCode, field);
      let total = 0;
      categories.forEach((value) => { total += value; });
      return { year, total, categories };
    });
  }

  function summarizeForecastOriginalBudget(lineType, fundCode) {
    const categories = forecastCategoryRows(lineType, fundCode, "FY2026_Original_Budget");
    let total = 0;
    categories.forEach((value) => { total += value; });
    return { year: 2026, total, categories };
  }

  function forecastAvailableTrendValues(valuesByYear) {
    return FINANCIAL_FORECAST_ACTUAL_YEARS
      .map((year) => ({ year, value: Number(valuesByYear[year]) || 0 }))
      .filter((item) => item.value !== 0);
  }

  function historicalAverageGrowth(valuesByYear) {
    const available = forecastAvailableTrendValues(valuesByYear);
    const growthRates = [];
    for (let i = 1; i < available.length; i += 1) {
      const previous = available[i - 1].value;
      const current = available[i].value;
      if (previous !== 0) growthRates.push((current - previous) / Math.abs(previous));
    }
    if (!growthRates.length) return null;
    return growthRates.reduce((sum, value) => sum + value, 0) / growthRates.length;
  }

  // A leading year that's zero/near-zero (an account that didn't exist
  // yet, or was barely funded) makes a terrible CAGR base -- dividing a
  // healthy current value by a near-zero one inflates the rate into
  // meaninglessness. A base year only counts as "stable" once it reaches
  // at least half of the latest actual year's value or half of the
  // median of all nonzero actuals, whichever bar is lower to clear --
  // either is evidence the account was already at a normal run rate, not
  // still ramping up from nothing.
  // Shared by historicalCagr (the number) and historicalCagrBasisYears (the
  // basis year range shown in its own "CAGR Basis" column) so the two
  // never drift out of sync -- both describe the exact same stable-year
  // window.
  function historicalCagrDetails(valuesByYear) {
    const nonZero = forecastAvailableTrendValues(valuesByYear).filter((item) => item.value > 0);
    if (nonZero.length < 2) return null;

    const latestValue = nonZero[nonZero.length - 1].value;
    const sortedValues = nonZero.map((item) => item.value).sort((a, b) => a - b);
    const mid = Math.floor(sortedValues.length / 2);
    const median = sortedValues.length % 2 !== 0
      ? sortedValues[mid]
      : (sortedValues[mid - 1] + sortedValues[mid]) / 2;
    const stableThreshold = 0.5 * Math.min(latestValue, median);

    const baseIndex = nonZero.findIndex((item) => item.value >= stableThreshold);
    const stableYears = baseIndex === -1 ? [] : nonZero.slice(baseIndex);
    if (stableYears.length < 3) return null;

    const first = stableYears[0];
    const last = stableYears[stableYears.length - 1];
    const periods = last.year - first.year;
    if (periods <= 0 || first.value <= 0 || last.value <= 0) return null;
    return {
      cagr: Math.pow(last.value / first.value, 1 / periods) - 1,
      startYear: first.year,
      endYear: last.year,
      years: stableYears.map((item) => item.year)
    };
  }

  function historicalCagr(valuesByYear) {
    const details = historicalCagrDetails(valuesByYear);
    return details ? details.cagr : null;
  }

  // "FY23-FY26" style label for the years actually used as this line's
  // CAGR basis -- lets the table show which years were excluded (an
  // unstable ramp-up year, say) without cluttering the historical actuals
  // themselves.
  function historicalCagrBasisLabel(valuesByYear) {
    const details = historicalCagrDetails(valuesByYear);
    if (!details) return "N/A";
    const shortYear = (year) => "FY" + String(year).slice(-2);
    return details.startYear === details.endYear
      ? shortYear(details.startYear)
      : shortYear(details.startYear) + "–" + shortYear(details.endYear);
  }

  // Years excluded from a line's CAGR basis (an unstable ramp-up year that
  // historicalCagrDetails' stableThreshold filtered out) -- used to grey
  // out just those actual-year cells rather than the whole row.
  function historicalCagrExcludedYears(valuesByYear) {
    const details = historicalCagrDetails(valuesByYear);
    if (!details) return new Set();
    const included = new Set(details.years);
    return new Set(
      forecastAvailableTrendValues(valuesByYear)
        .map((item) => item.year)
        .filter((year) => !included.has(year))
    );
  }

  function suggestedForecastGrowth(avgGrowth, cagr) {
    const candidates = [avgGrowth, cagr].filter((value) => Number.isFinite(value));
    if (!candidates.length) return null;
    const blended = candidates.reduce((sum, value) => sum + value, 0) / candidates.length;
    return Math.max(-0.03, Math.min(0.05, blended));
  }

  function cappedForecastGrowth(value) {
    if (!Number.isFinite(value)) return null;
    return Math.max(-0.03, Math.min(0.05, value));
  }

  function effectiveForecastGrowth(lineType, manual, suggested, cagr) {
    const baseGrowth = manual !== null ? manual : (Number.isFinite(suggested) ? suggested : 0);
    if (lineType === "revenue" && Number.isFinite(cagr) && cagr < 0 && baseGrowth > 0) {
      return cappedForecastGrowth(cagr);
    }
    return baseGrowth;
  }

  function buildForecastAssumptionLookup() {
    const rows = Array.isArray(window.WCFinancialForecastAssumptions) ? window.WCFinancialForecastAssumptions : [];
    const lookup = new Map();
    rows.forEach((row) => {
      const fundCode = String(row.fund_code || "").trim();
      const lineType = String(row.line_type || "").trim().toLowerCase();
      const category = normalizeForecastCategory(row.category, lineType);
      if (!fundCode || !lineType || !category) return;
      lookup.set([fundCode, lineType, category].join("|"), row);
    });
    return lookup;
  }

  function assumptionForForecast(lookup, fund, lineType, category, missingRows) {
    const normalizedCategory = normalizeForecastCategory(category, lineType);
    const key = [fund.code, lineType, normalizedCategory].join("|");
    const row = lookup.get(key);
    if (row) return row;
    if (!missingRows.some((missing) => [missing.fund_code, missing.line_type, missing.category].join("|") === key)) {
      missingRows.push({ fund_code: fund.code, fund_name: fund.label, line_type: lineType, category: normalizedCategory });
    }
    return {
      fund_code: fund.code,
      fund_name: fund.label,
      line_type: lineType,
      category: normalizedCategory,
      fy2028_assumption: null,
      fy2029_assumption: null,
      fy2030_assumption: null,
      fy2031_assumption: null,
      method: "missing assumption fallback",
      manual_override: false,
      notes: "No assumption row found; forecast uses suggested trend when available, otherwise held flat."
    };
  }

  function categoryValuesForTrend(lineType, fundCode, category) {
    const values = {};
    const trendOptions = { normalizeForAssumptions: true };
    FINANCIAL_FORECAST_ACTUAL_YEARS.forEach((year) => {
      values[year] = forecastCategoryRows(lineType, fundCode, "FY" + year + "_Actual", trendOptions).get(category) || 0;
    });
    values[2026] = forecastCategoryRows(lineType, fundCode, "FY2026_Original_Budget", trendOptions).get(category) || 0;
    values[2027] = forecastCategoryRows(lineType, fundCode, "FY2027_Proposed", trendOptions).get(category) || 0;
    return values;
  }

  function forecastAssumptionDetails(fund, lineType, category, assumptionLookup, missingRows) {
    const values = categoryValuesForTrend(lineType, fund.code, category);
    const avgGrowth = historicalAverageGrowth(values);
    const cagr = historicalCagr(values);
    const suggested = suggestedForecastGrowth(avgGrowth, cagr);
    const assumption = assumptionForForecast(assumptionLookup, fund, lineType, category, missingRows);
    return { values, avgGrowth, cagr, suggested, assumption };
  }

  function forecastAnnualCategories(fund, lineType, baselineCategories, assumptionLookup, missingRows, assumptionDetails) {
    const categories = new Map();
    baselineCategories.forEach((value, category) => {
      categories.set(category, { 2027: value });
    });
    FINANCIAL_FORECAST_YEARS.slice(1).forEach((year) => {
      Array.from(categories.keys()).forEach((category) => {
        const detailsKey = [fund.code, lineType, category].join("|");
        const details = assumptionDetails.get(detailsKey) || forecastAssumptionDetails(fund, lineType, category, assumptionLookup, missingRows);
        assumptionDetails.set(detailsKey, details);
        const previous = categories.get(category)[year - 1] || 0;
        const manual = forecastAssumptionValue(details.assumption, year);
        const growth = effectiveForecastGrowth(lineType, manual, details.suggested, details.cagr);
        categories.get(category)[year] = previous * (1 + growth);
      });
    });
    return categories;
  }

  // Forecasts each individual revenue source/department (see
  // forecastDetailRows) forward the same way forecastAnnualCategories
  // forecasts its broader category -- by applying that detail row's own
  // parent category's growth assumption. assumptionDetails is expected to
  // already hold every category for this fund/lineType (forecastAnnualCategories
  // populates it first, from the same underlying baseline), so growth here
  // is read, not recomputed.
  function forecastAnnualDetails(fund, lineType, baselineDetails, assumptionDetails) {
    const details = new Map();
    const detailHistory = forecastDetailHistoryByYear(lineType, fund.code);
    function detailTrendValues(name) {
      const values = {};
      FINANCIAL_FORECAST_ACTUAL_YEARS.forEach((year) => {
        const entry = detailHistory.get("FY" + year + "_Actual").get(name);
        values[year] = entry ? entry.value : 0;
      });
      const entry2026 = detailHistory.get("FY2026_Original_Budget").get(name);
      values[2026] = entry2026 ? entry2026.value : 0;
      const entry2027 = detailHistory.get("FY2027_Proposed").get(name);
      values[2027] = entry2027 ? entry2027.value : 0;
      return values;
    }
    function detailCagr(name) {
      const values = detailTrendValues(name);
      return historicalCagr(values);
    }
    baselineDetails.forEach((entry, name) => {
      const trendValues = detailTrendValues(name);
      details.set(name, {
        category: entry.category,
        values: { 2027: entry.value },
        cagr: detailCagr(name),
        growthOverride: forecastDetailGrowthOverride(fund.code, lineType, name, trendValues),
        parts: Object.assign({}, entry.parts || { [entry.category]: entry.value }),
        partValues: { 2027: Object.assign({}, entry.parts || { [entry.category]: entry.value }) }
      });
    });
    FINANCIAL_FORECAST_YEARS.slice(1).forEach((year) => {
      details.forEach((entry) => {
        if (lineType === "expense" && entry.parts) {
          let total = 0;
          const nextParts = {};
          Object.keys(entry.parts).forEach((category) => {
            const detailsKey = [fund.code, lineType, category].join("|");
            const categoryDetails = assumptionDetails.get(detailsKey);
            const manual = categoryDetails ? forecastAssumptionValue(categoryDetails.assumption, year) : null;
            const suggested = categoryDetails && Number.isFinite(categoryDetails.suggested) ? categoryDetails.suggested : 0;
            const growth = Number.isFinite(entry.growthOverride)
              ? entry.growthOverride
              : effectiveForecastGrowth(lineType, manual, suggested, null);
            const previous = entry.parts[category] || 0;
            const next = previous * (1 + growth);
            nextParts[category] = next;
            total += next;
          });
          entry.parts = nextParts;
          entry.partValues[year] = Object.assign({}, nextParts);
          entry.values[year] = total;
          return;
        }
        const detailsKey = [fund.code, lineType, entry.category].join("|");
        const categoryDetails = assumptionDetails.get(detailsKey);
        const manual = categoryDetails ? forecastAssumptionValue(categoryDetails.assumption, year) : null;
        const suggested = categoryDetails && Number.isFinite(categoryDetails.suggested) ? categoryDetails.suggested : 0;
        const growth = Number.isFinite(entry.growthOverride)
          ? entry.growthOverride
          : effectiveForecastGrowth(lineType, manual, suggested, entry.cagr);
        const previous = entry.values[year - 1] || 0;
        entry.values[year] = previous * (1 + growth);
      });
    });
    return details;
  }

  function syncRevenueForecastCategoriesFromDetails(categories, details) {
    if (!categories || !details) return;
    FINANCIAL_FORECAST_YEARS.forEach((year) => {
      categories.forEach((values, category) => {
        let total = 0;
        details.forEach((entry) => {
          if (entry.category === category) total += Number(entry.values[year]) || 0;
        });
        values[year] = total;
      });
    });
  }

  function syncExpenseForecastCategoriesFromDetails(categories, details) {
    if (!categories || !details) return;
    FINANCIAL_FORECAST_YEARS.forEach((year) => {
      categories.forEach((values, category) => {
        let total = 0;
        details.forEach((entry) => {
          const parts = entry.partValues && entry.partValues[year];
          total += parts ? Number(parts[category]) || 0 : 0;
        });
        values[year] = total;
      });
    });
  }

  function weightedDetailCategoryAssumption(parts, fund, lineType, assumptionDetails, year) {
    const entries = Object.entries(parts || {}).filter(([, amount]) => (Number(amount) || 0) !== 0);
    if (!entries.length) return null;
    let weightedTotal = 0;
    let weightTotal = 0;
    entries.forEach(([category, amount]) => {
      const categoryDetails = assumptionDetails.get([fund.code, lineType, category].join("|"));
      const manual = categoryDetails ? forecastAssumptionValue(categoryDetails.assumption, year) : null;
      const suggested = categoryDetails && Number.isFinite(categoryDetails.suggested) ? categoryDetails.suggested : 0;
      const growth = effectiveForecastGrowth(lineType, manual, suggested, null);
      const weight = Math.abs(Number(amount) || 0);
      weightedTotal += growth * weight;
      weightTotal += weight;
    });
    return weightTotal ? weightedTotal / weightTotal : null;
  }

  function weightedDetailCategorySuggested(parts, fund, lineType, assumptionDetails) {
    const entries = Object.entries(parts || {}).filter(([, amount]) => (Number(amount) || 0) !== 0);
    if (!entries.length) return null;
    let weightedTotal = 0;
    let weightTotal = 0;
    entries.forEach(([category, amount]) => {
      const categoryDetails = assumptionDetails.get([fund.code, lineType, category].join("|"));
      if (!categoryDetails || !Number.isFinite(categoryDetails.suggested)) return;
      const weight = Math.abs(Number(amount) || 0);
      weightedTotal += categoryDetails.suggested * weight;
      weightTotal += weight;
    });
    return weightTotal ? weightedTotal / weightTotal : null;
  }

  // Same eight year-fields forecastAssumptionDetails reads per category,
  // but bucketed by forecastDetailRows' own name (Revenue_Name/Dept_Name)
  // instead -- so the "Forecast Assumptions" table can show each
  // individual revenue source/department's own historical trend, which is
  // what actually drives its parent category's blended growth rate (see
  // the Ad Valorem Taxes case: one line item dominated "General Government
  // Taxes" enough to make a recording change in that one account look like
  // the whole category's trend).
  function forecastDetailHistoryByYear(lineType, fundCode, options) {
    const yearFields = FINANCIAL_FORECAST_ACTUAL_YEARS.map((year) => "FY" + year + "_Actual").concat(["FY2026_Original_Budget", "FY2027_Proposed"]);
    const byYear = new Map();
    yearFields.forEach((field) => byYear.set(field, forecastDetailRows(lineType, fundCode, field, options)));
    return byYear;
  }

  // assumptionDetails is expected to already hold every category for this
  // fund/lineType (forecastAnnualCategories populates it first, from the
  // same underlying baseline) -- the "Assumption" shown per name is its
  // parent category's, since that's the rate actually applied to it (see
  // forecastAnnualDetails); each name's own avgGrowth/cagr below is its
  // own, independent of the category, to surface it as an individual driver.
  function forecastDetailAssumptionRows(fund, lineType, assumptionDetails) {
    const byYearDetailMaps = forecastDetailHistoryByYear(lineType, fund.code, { normalizeForAssumptions: true });
    const baseline = byYearDetailMaps.get("FY2027_Proposed");
    return Array.from(baseline.keys()).map((name) => {
      const category = baseline.get(name).category;
      const values = {};
      FINANCIAL_FORECAST_ACTUAL_YEARS.forEach((year) => {
        const entry = byYearDetailMaps.get("FY" + year + "_Actual").get(name);
        values[year] = entry ? entry.value : 0;
      });
      const entry2026 = byYearDetailMaps.get("FY2026_Original_Budget").get(name);
      values[2026] = entry2026 ? entry2026.value : 0;
      const baselineEntry = baseline.get(name);
      values[2027] = baselineEntry.value;
      const categoryDetails = assumptionDetails.get([fund.code, lineType, category].join("|"));
      const hasMixedParts = baselineEntry.parts && Object.keys(baselineEntry.parts).filter((part) => (baselineEntry.parts[part] || 0) !== 0).length > 1;
      const growthOverride = forecastDetailGrowthOverride(fund.code, lineType, name, values);
      const detailOverride = FORECAST_DETAIL_ASSUMPTION_OVERRIDES.get(String(name || "").trim().toLowerCase()) ||
        (fund.code === "111" && lineType === "expense" ? { method: "Management Estimate", rate: 0.03 } : null);
      return {
        name,
        category,
        values,
        avgGrowth: historicalAverageGrowth(values),
        cagr: historicalCagr(values),
        baseDeclineOverride: Number.isFinite(growthOverride) && !detailOverride,
        categoryAssumption: categoryDetails ? categoryDetails.assumption : null,
        categorySuggested: hasMixedParts
          ? weightedDetailCategorySuggested(baselineEntry.parts, fund, lineType, assumptionDetails)
          : (categoryDetails && Number.isFinite(categoryDetails.suggested) ? categoryDetails.suggested : null),
        weightedAssumptions: Number.isFinite(growthOverride)
          ? Object.fromEntries(FINANCIAL_FORECAST_YEARS.slice(1).map((year) => [year, growthOverride]))
          : hasMixedParts
          ? Object.fromEntries(FINANCIAL_FORECAST_YEARS.slice(1).map((year) => [
            year,
            weightedDetailCategoryAssumption(baselineEntry.parts, fund, lineType, assumptionDetails, year)
          ]))
          : null
      };
    });
  }

  function sumForecastCategories(categories, year) {
    let total = 0;
    categories.forEach((values) => { total += values[year] || 0; });
    return total;
  }

  function sumForecastBaselineCategories(categories) {
    let total = 0;
    categories.forEach((value) => { total += Number(value) || 0; });
    return total;
  }

  function sumForecastBaselineDetails(details, predicate) {
    let total = 0;
    details.forEach((entry, name) => {
      if (predicate && !predicate(name, entry)) return;
      total += Number(entry && entry.value) || 0;
    });
    return total;
  }

  function isTouristDevelopmentTaxRevenueName(name) {
    return /tourist development tax/i.test(String(name || ""));
  }

  function addForecastBaselineDetail(details, name, category, amount) {
    if (!details || !Number.isFinite(amount) || amount <= 0) return;
    const existing = details.get(name);
    if (existing) {
      existing.value = (Number(existing.value) || 0) + amount;
      existing.parts = Object.assign({}, existing.parts || {});
      existing.parts[category] = (Number(existing.parts[category]) || 0) + amount;
      return;
    }
    details.set(name, { category, value: amount, parts: { [category]: amount } });
  }

  function applyTouristDevelopmentRevenueBaselineFloor(baselineRevenueCategories, baselineRevenueDetails) {
    const category = "General Government Taxes";
    const detailName = "Tourist Development Taxes";
    const actualDetails = forecastDetailRows("revenue", "111", "FY2025_Actual");
    const actualTaxTotal = sumForecastBaselineDetails(actualDetails, isTouristDevelopmentTaxRevenueName);
    const baselineTaxTotal = sumForecastBaselineDetails(baselineRevenueDetails, isTouristDevelopmentTaxRevenueName);
    const actualTotalFallback = sumForecastBaselineCategories(forecastCategoryRows("revenue", "111", "FY2025_Actual"));
    const baselineTotalFallback = sumForecastBaselineCategories(baselineRevenueCategories);
    const taxGap = actualTaxTotal > baselineTaxTotal ? actualTaxTotal - baselineTaxTotal : 0;
    const fallbackGap = !taxGap && actualTotalFallback > baselineTotalFallback ? actualTotalFallback - baselineTotalFallback : 0;
    const adjustment = taxGap || fallbackGap;
    if (!adjustment) return;
    baselineRevenueCategories.set(category, (Number(baselineRevenueCategories.get(category)) || 0) + adjustment);
    addForecastBaselineDetail(baselineRevenueDetails, detailName, category, adjustment);
  }

  function capCapitalProjectsFinancingRevenue(revenueCategories, revenueDetails, expenseCategories) {
    const financingCategory = "Other Sources";
    const transferDetailName = "Interfund Group Transfer In";
    const financingValues = revenueCategories.get(financingCategory);
    if (!financingValues) return;

    FINANCIAL_FORECAST_YEARS.forEach((year) => {
      const projectExpense = sumForecastCategories(expenseCategories, year);
      let nonFinancingRevenue = 0;
      revenueCategories.forEach((values, category) => {
        if (category !== financingCategory) nonFinancingRevenue += values[year] || 0;
      });

      const currentFinancingRevenue = financingValues[year] || 0;
      const cappedFinancingRevenue = Math.min(currentFinancingRevenue, Math.max(0, projectExpense - nonFinancingRevenue));
      financingValues[year] = cappedFinancingRevenue;

      if (!revenueDetails || !revenueDetails.has(transferDetailName)) return;
      const transferDetail = revenueDetails.get(transferDetailName);
      let otherFinancingDetails = 0;
      revenueDetails.forEach((entry, name) => {
        if (name !== transferDetailName && entry.category === financingCategory) {
          otherFinancingDetails += entry.values[year] || 0;
        }
      });
      transferDetail.values[year] = Math.min(
        transferDetail.values[year] || 0,
        Math.max(0, cappedFinancingRevenue - otherFinancingDetails)
      );
    });
  }

  function balanceForecastFundToZeroNetChange(revenueCategories, revenueDetails, expenseCategories, balancingDetailName) {
    const financingCategory = "Other Sources";
    if (!revenueCategories.has(financingCategory)) revenueCategories.set(financingCategory, {});
    const financingValues = revenueCategories.get(financingCategory);

    if (revenueDetails && balancingDetailName && !revenueDetails.has(balancingDetailName)) {
      revenueDetails.set(balancingDetailName, { category: financingCategory, values: {} });
    }
    const balancingDetail = revenueDetails && balancingDetailName ? revenueDetails.get(balancingDetailName) : null;

    FINANCIAL_FORECAST_YEARS.forEach((year) => {
      let nonFinancingRevenue = 0;
      revenueCategories.forEach((values, category) => {
        if (category !== financingCategory) nonFinancingRevenue += values[year] || 0;
      });
      const expenditures = sumForecastCategories(expenseCategories, year);
      const neededFinancing = expenditures - nonFinancingRevenue;
      financingValues[year] = neededFinancing;

      if (!revenueDetails || !balancingDetail) return;
      revenueDetails.forEach((entry, name) => {
        if (entry.category !== financingCategory) return;
        entry.values[year] = name === balancingDetailName ? neededFinancing : 0;
      });
    });
  }

  function balanceTransferSupportedForecastFund(revenueCategories, revenueDetails, expenseCategories, transferDetailName) {
    const financingCategory = "Other Sources";
    if (!revenueDetails.has(transferDetailName)) {
      revenueDetails.set(transferDetailName, { category: financingCategory, values: {} });
    }
    const transferDetail = revenueDetails.get(transferDetailName);

    FINANCIAL_FORECAST_YEARS.forEach((year) => {
      let revenueBeforeTransfer = 0;
      revenueDetails.forEach((entry, name) => {
        if (name !== transferDetailName) revenueBeforeTransfer += entry.values[year] || 0;
      });
      const expenditures = sumForecastCategories(expenseCategories, year);
      transferDetail.values[year] = Math.max(0, expenditures - revenueBeforeTransfer);
    });
    syncRevenueForecastCategoriesFromDetails(revenueCategories, revenueDetails);
  }

  function balanceTouristDevelopmentBeachRenourishment(revenueCategories, expenseCategories, expenseDetails) {
    const balancingDetailName = "Beach Renourishment";
    if (!expenseDetails || !expenseDetails.has(balancingDetailName)) return;
    const beachRenourishment = expenseDetails.get(balancingDetailName);
    const balancingCategory = beachRenourishment.category;
    const categoryValues = balancingCategory ? expenseCategories.get(balancingCategory) : null;
    if (!categoryValues) return;

    FINANCIAL_FORECAST_YEARS.forEach((year) => {
      const revenues = sumForecastCategories(revenueCategories, year);
      const expenditures = sumForecastCategories(expenseCategories, year);
      const shortfall = expenditures - revenues;
      if (shortfall <= 0) return;

      const currentDetailValue = beachRenourishment.values[year] || 0;
      const reduction = Math.min(currentDetailValue, shortfall);
      beachRenourishment.values[year] = currentDetailValue - reduction;
      categoryValues[year] = Math.max(0, (categoryValues[year] || 0) - reduction);
    });
  }

  function getCipProjectYearAmount(project, year) {
    const key = "FY" + year;
    return (project.funding_by_year || [])
      .filter((item) => item.year === key)
      .reduce((sum, item) => sum + (Number(item.amount_value) || 0), 0);
  }

  function isCapitalProjectsFundCipProject(project) {
    return String(project && project.funding || "").trim().toLowerCase() === "capital projects fund";
  }

  function buildCapitalProjectsCipForecast(projectList) {
    const projects = (Array.isArray(projectList) ? projectList : (window.wcCipProjects || []))
      .filter(isCapitalProjectsFundCipProject)
      .filter((project) => !project.is_legacy_in_house_engineering_row);
    const byYear = {};
    const missingYearValues = [];
    FINANCIAL_FORECAST_YEARS.forEach((year) => {
      const rows = projects
        .map((project) => ({
          title: project.title || "Capital Project",
          project_code: project.project_code || "",
          year: "FY" + year,
          amount: getCipProjectYearAmount(project, year)
        }))
        .filter((row) => row.amount > 0);
      byYear[year] = {
        rows,
        total: rows.reduce((sum, row) => sum + row.amount, 0)
      };
      if (!rows.length) missingYearValues.push({ fund_code: "300", year: "FY" + year, note: "No Capital Projects Fund CIP project values found for this year." });
    });
    return { projects, byYear, missingYearValues };
  }

  function buildFinancialForecastModel(cipProjectList) {
    const debugEnabled = new URLSearchParams(window.location.search).get("debugForecast") === "1";
    const assumptionLookup = buildForecastAssumptionLookup();
    const missingAssumptions = [];
    const assumptionDetails = new Map();
    const cipForecast = buildCapitalProjectsCipForecast(cipProjectList);
    const funds = FINANCIAL_FORECAST_FUNDS.map((fund) => {
      const baselineRevenueCategories = forecastCategoryRows("revenue", fund.code, "FY2027_Proposed");
      const baselineExpenseCategories = forecastCategoryRows("expense", fund.code, "FY2027_Proposed");
      const baselineRevenueDetails = forecastDetailRows("revenue", fund.code, "FY2027_Proposed");
      const baselineExpenseDetails = forecastDetailRows("expense", fund.code, "FY2027_Proposed");
      if (fund.code === "111") {
        applyTouristDevelopmentRevenueBaselineFloor(baselineRevenueCategories, baselineRevenueDetails);
      }
      const revenueCategories = forecastAnnualCategories(fund, "revenue", baselineRevenueCategories, assumptionLookup, missingAssumptions, assumptionDetails);
      const expenseCategories = forecastAnnualCategories(fund, "expense", baselineExpenseCategories, assumptionLookup, missingAssumptions, assumptionDetails);

      // Detail breakdowns (revenue by source name, expense by department)
      // for the "Category Forecast Detail" table -- built after the
      // category-level forecasts above so assumptionDetails already has
      // every category's growth assumption populated for this fund/lineType.
      const revenueDetails = forecastAnnualDetails(fund, "revenue", baselineRevenueDetails, assumptionDetails);
      const expenseDetails = forecastAnnualDetails(fund, "expense", baselineExpenseDetails, assumptionDetails);
      // Revenue-line overrides (for example, holding the volatile Motor
      // Fuel Use Tax flat) must also roll into the fund-level category
      // totals used by the first forecast table. Otherwise the detail row
      // and the fund total would show different growth behavior.
      syncRevenueForecastCategoriesFromDetails(revenueCategories, revenueDetails);
      syncExpenseForecastCategoriesFromDetails(expenseCategories, expenseDetails);

      // Individual revenue source/department rows for the "Forecast
      // Assumptions" table -- see forecastDetailAssumptionRows. Computed
      // after the category forecasts above so every category this fund's
      // names belong to already has an assumptionDetails entry.
      const revenueDetailAssumptions = forecastDetailAssumptionRows(fund, "revenue", assumptionDetails);
      const expenseDetailAssumptions = forecastDetailAssumptionRows(fund, "expense", assumptionDetails);

      // Beach Renourishment in the Tourist Development Fund is an annual
      // Board-committed funding for a future project, not current operating
      // spending. Remove it from forecast expenditures and roll it into a
      // separately identified committed balance so it cannot be treated
      // as available to support other operations.
      let annualBeachRenourishmentCommitment = null;
      if (fund.code === "111" && expenseDetails.has("Beach Renourishment")) {
        const beachEntry = expenseDetails.get("Beach Renourishment");
        annualBeachRenourishmentCommitment = Object.fromEntries(
          FINANCIAL_FORECAST_YEARS.map((year) => [year, beachEntry.values[year] || 0])
        );
        const categoryValues = expenseCategories.get(beachEntry.category);
        if (categoryValues) {
          FINANCIAL_FORECAST_YEARS.forEach((year) => {
            categoryValues[year] = Math.max(0, (categoryValues[year] || 0) - annualBeachRenourishmentCommitment[year]);
          });
        }
        expenseDetails.delete("Beach Renourishment");
      }

      if (fund.code === "300") {
        Array.from(expenseCategories.keys()).forEach((category) => {
          FINANCIAL_FORECAST_YEARS.forEach((year) => {
            expenseCategories.get(category)[year] = 0;
          });
        });
        if (!expenseCategories.has("CIP Project Schedule")) expenseCategories.set("CIP Project Schedule", { 2027: 0 });
        FINANCIAL_FORECAST_YEARS.forEach((year) => {
          expenseCategories.get("CIP Project Schedule")[year] = cipForecast.byYear[year] ? cipForecast.byYear[year].total : 0;
        });

        // Capital Projects Fund expenditures are driven by the CIP
        // schedule rather than any department's own budget lines -- mirror
        // the category-level override above onto the department detail
        // breakdown so the two tables agree.
        Array.from(expenseDetails.keys()).forEach((name) => {
          FINANCIAL_FORECAST_YEARS.forEach((year) => {
            expenseDetails.get(name).values[year] = 0;
          });
        });
        if (!expenseDetails.has("CIP Project Schedule")) expenseDetails.set("CIP Project Schedule", { category: "Capital Outlay", values: { 2027: 0 } });
        FINANCIAL_FORECAST_YEARS.forEach((year) => {
          expenseDetails.get("CIP Project Schedule").values[year] = cipForecast.byYear[year] ? cipForecast.byYear[year].total : 0;
        });

        balanceForecastFundToZeroNetChange(revenueCategories, revenueDetails, expenseCategories, "Interfund Group Transfer In");
      }

      if (fund.code === "107") {
        balanceTransferSupportedForecastFund(
          revenueCategories,
          revenueDetails,
          expenseCategories,
          "Interfund Group Transfer In"
        );
      }

      const beginningBalanceSourceYear = 2026;
      const annual = {};

      FINANCIAL_FORECAST_YEARS.forEach((year, index) => {
        const beginningBalance = index === 0 ? fundBalanceForYear(fund.code, beginningBalanceSourceYear) : annual[year - 1].endingBalance;
        const beginningCommittedBalance = index === 0 ? 0 : annual[year - 1].committedBeachRenourishmentBalance;
        const annualCommitment = annualBeachRenourishmentCommitment ? annualBeachRenourishmentCommitment[year] || 0 : 0;
        const revenues = sumForecastCategories(revenueCategories, year);
        const expenditures = sumForecastCategories(expenseCategories, year);
        const netChange = revenues - expenditures;
        const availableNetChange = netChange - annualCommitment;
        const endingBalance = beginningBalance + netChange;
        const committedBeachRenourishmentBalance = beginningCommittedBalance + annualCommitment;
        annual[year] = {
          year,
          beginningBalance,
          revenues,
          expenditures,
          annualBeachRenourishmentCommitment: annualCommitment,
          netChange,
          availableNetChange,
          endingBalance,
          committedBeachRenourishmentBalance,
          availableEndingBalance: endingBalance - committedBeachRenourishmentBalance
        };
      });

      return {
        fund,
        beginningBalanceSource: "Fund balance sheet FY " + beginningBalanceSourceYear,
        historicalRevenue: summarizeForecastHistory("revenue", fund.code),
        historicalExpense: summarizeForecastHistory("expense", fund.code),
        originalBudgetRevenue: summarizeForecastOriginalBudget("revenue", fund.code),
        originalBudgetExpense: summarizeForecastOriginalBudget("expense", fund.code),
        baselineRevenueCategories,
        baselineExpenseCategories,
        revenueCategories,
        expenseCategories,
        revenueDetails,
        expenseDetails,
        revenueDetailAssumptions,
        expenseDetailAssumptions,
        annualBeachRenourishmentCommitment,
        annual
      };
    });

    Array.from(assumptionLookup.values()).forEach((row) => {
      const fund = FINANCIAL_FORECAST_FUNDS.find((item) => item.code === String(row.fund_code || "").trim());
      const lineType = String(row.line_type || "").trim().toLowerCase();
      const category = normalizeForecastCategory(row.category, lineType);
      if (!fund || !lineType || !category) return;
      const key = [fund.code, lineType, category].join("|");
      if (!assumptionDetails.has(key)) {
        assumptionDetails.set(key, forecastAssumptionDetails(fund, lineType, category, assumptionLookup, missingAssumptions));
      }
    });

    const model = {
      funds,
      missingAssumptions,
      missingCipYearValues: cipForecast.missingYearValues,
      cipForecast,
      assumptions: Array.from(assumptionLookup.values()),
      assumptionDetails
    };
    if (debugEnabled) {
      const debug = {};
      funds.forEach((item) => {
        debug[item.fund.code + " " + item.fund.label] = {
          fy2027BaselineRevenueByCategory: Object.fromEntries(item.baselineRevenueCategories),
          fy2027BaselineExpenseByCategory: Object.fromEntries(item.baselineExpenseCategories),
          beginningFundBalanceSource: item.beginningBalanceSource,
          assumptionsApplied: model.assumptions.filter((row) => String(row.fund_code) === item.fund.code),
          annualCalculatedRevenues: Object.fromEntries(FINANCIAL_FORECAST_YEARS.map((y) => [y, item.annual[y].revenues])),
          annualCalculatedExpenditures: Object.fromEntries(FINANCIAL_FORECAST_YEARS.map((y) => [y, item.annual[y].expenditures])),
          annualNetChange: Object.fromEntries(FINANCIAL_FORECAST_YEARS.map((y) => [y, item.annual[y].netChange])),
          annualEndingFundBalance: Object.fromEntries(FINANCIAL_FORECAST_YEARS.map((y) => [y, item.annual[y].endingBalance]))
        };
      });
      console.group("Financial forecast debug");
      console.log("Forecast model", debug);
      console.log("Historical trend details", Array.from(assumptionDetails.entries()).map(([key, details]) => ({
        key,
        values: details.values,
        historical_avg_growth: details.avgGrowth,
        historical_cagr: details.cagr,
        suggested_growth_rate: details.suggested,
        manual_assumptions_used: {
          FY2028: forecastAssumptionValue(details.assumption, 2028),
          FY2029: forecastAssumptionValue(details.assumption, 2029),
          FY2030: forecastAssumptionValue(details.assumption, 2030),
          FY2031: forecastAssumptionValue(details.assumption, 2031)
        }
      })));
      console.log("CIP project rows used for fund 300", cipForecast.byYear);
      console.log("Missing assumption rows", missingAssumptions);
      console.log("Missing CIP year values", cipForecast.missingYearValues);
      console.groupEnd();
    }
    return model;
  }

  function renderForecastDetailTable(item) {
    const rows = [
      ["Beginning Fund Balance", "beginningBalance"],
      ["Revenues", "revenues"],
      ["Expenditures", "expenditures"],
      ...(item.fund.code === "111" ? [["Annual Beach Renourishment Commitment", "annualBeachRenourishmentCommitment"]] : []),
      ["Change in Total Fund Balance", "netChange"],
      ["Ending Fund Balance", "endingBalance"],
      ...(item.fund.code === "111" ? [
        ["Projected Board-Committed Beach Renourishment Balance", "committedBeachRenourishmentBalance"],
        ["Change in Balance Available for Other Eligible Tourist Development Uses", "availableNetChange"],
        ["Ending Balance Available for Other Eligible Tourist Development Uses", "availableEndingBalance"]
      ] : [])
    ].flatMap(([label, key]) => {
      const expandable = key === "revenues" || key === "expenditures";
      const lineType = key === "revenues" ? "revenue" : "expense";
      const detailId = forecastFundDetailId(item.fund.code) + "-" + lineType;
      const rowClass = [["endingBalance", "availableEndingBalance"].includes(key) ? "wc-table-total-row" : "", expandable ? "wc-forecast-line-toggle-row" : ""].filter(Boolean).join(" ");
      const rowAttributes = expandable
        ? ' role="button" tabindex="0" data-target="' + escapeHtml(detailId) + '" aria-expanded="false"'
        : "";
      const summaryRow =
        '<tr class="' + rowClass + '"' + rowAttributes + '>' +
        '<td>' + escapeHtml(label) + '</td>' +
        FINANCIAL_FORECAST_YEARS.map((year) => '<td class="wc-num">' + forecastMoney(item.annual[year][key]) + '</td>').join("") +
        '</tr>';
      if (!expandable) return [summaryRow];
      const details = lineType === "revenue" ? item.revenueDetails : item.expenseDetails;
      return [summaryRow,
        '<tr id="' + escapeHtml(detailId) + '" class="wc-forecast-line-detail-row" hidden><td colspan="' + (FINANCIAL_FORECAST_YEARS.length + 1) + '">' +
          renderForecastDetailBreakdownTable(item, lineType, details) +
        '</td></tr>'
      ];
    });
    const table = renderTable({
      caption: item.fund.label,
      hideVisualCaption: true,
      columns: [{ label: "Line" }].concat(FINANCIAL_FORECAST_YEARS.map((year) => ({ label: "FY " + year + (year === 2027 ? " Baseline" : " Forecast"), num: true }))),
      bodyRows: rows
    });
    if (item.fund.code !== "111") return table;
    return table + '<p class="wc-forecast-assumptions-intro">The Board has committed Beach Renourishment funding for future projects, so it is not available for other purposes. The remaining balance may be used only for other eligible Tourist Development purposes. Amounts shown here begin with the FY 2027 commitment and do not include any balance accumulated before FY 2027.</p>';
  }

  function renderForecastDetailBreakdownTable(item, lineType, details) {
    const label = lineType === "revenue" ? "Revenue Source Forecast" : "Expense Department Forecast";
    const columnLabel = lineType === "revenue" ? "Revenue Source" : "Department";
    const appliedGrowthDisplay = (entry) => {
      const rates = FINANCIAL_FORECAST_YEARS.slice(1).map((year) => {
        const previous = Number(entry.values[year - 1]) || 0;
        const current = Number(entry.values[year]) || 0;
        return previous ? (current - previous) / Math.abs(previous) : null;
      }).filter(Number.isFinite);
      if (!rates.length) return "—";
      const min = Math.min(...rates);
      const max = Math.max(...rates);
      const minDisplay = forecastPercent(min);
      const maxDisplay = forecastPercent(max);
      return minDisplay === maxDisplay ? minDisplay : minDisplay + " to " + maxDisplay;
    };
    const rows = Array.from(details.keys())
      .filter((name) => FINANCIAL_FORECAST_YEARS.some((year) => (details.get(name).values[year] || 0) !== 0))
      .sort((a, b) => (details.get(b).values[2027] || 0) - (details.get(a).values[2027] || 0))
      .map((name) => {
        const entry = details.get(name);
        return '<tr><td><button type="button" class="wc-forecast-assumption-link" data-assumption-type="' + escapeHtml(lineType) + '" data-fund-name="' + escapeHtml(item.fund.label) + '" data-detail-name="' + escapeHtml(name.toLowerCase()) + '">' + escapeHtml(name) + '</button></td>' +
          '<td class="wc-num">' + escapeHtml(appliedGrowthDisplay(entry)) + '</td>' +
          FINANCIAL_FORECAST_YEARS.map((year) => '<td class="wc-num">' + forecastMoney(entry.values[year] || 0) + '</td>').join("") +
          '</tr>';
      });
    return renderTable({
      caption: label,
      columns: [{ label: columnLabel }, { label: "Annual Growth Used", num: true }].concat(FINANCIAL_FORECAST_YEARS.map((year) => ({ label: "FY " + year, num: true }))),
      bodyRows: rows
    });
  }

  // Small, faded-out revenue lines specific to one fund -- not worth a
  // row on the assumptions table (each is a few thousand dollars at most,
  // several already trailing off to $0). Keyed by "<fund code>|<name,
  // lowercased>" since the same revenue name can be a real, sizable line
  // in a different fund (e.g. Ad Valorem Taxes Delinquent is negligible
  // for Transportation/Sheriff but not necessarily elsewhere).
  const FORECAST_ASSUMPTIONS_HIDDEN_FUND_ROWS = new Set([
    "101|federal grant (economic environment)",
    "101|ad valorem taxes delinquent",
    "101|state payment in lieu of tax",
    "107|ad valorem taxes delinquent",
    "107|state payment in lieu of tax",
    "111|federal grant (public safety)",
    "111|state grant (public safety)",
    "001|non-profit funding program",
    "001|recreation - fbip boating allocation",
    "001|capital projects",
    "101|sign fees",
    "111|sales & promotions",
    "111|sales & promotions out of state",
    "111|beach renourishment",
    "001|copies and public records request",
    "001|msbu fees",
    "101|sewer impact fees"
  ]);

  // Lists each individual revenue source/department (rather than the
  // handful of broad categories) so the line items actually driving a
  // category's blended growth rate are visible on their own -- see
  // forecastDetailAssumptionRows.
  function renderForecastAssumptionsDetailTable(model, lineType) {
    const assumptionYears = FINANCIAL_FORECAST_YEARS.slice(1);
    const nameLabel = lineType === "revenue" ? "Revenue Source" : "Department";
    const detailsField = lineType === "revenue" ? "revenueDetailAssumptions" : "expenseDetailAssumptions";
    const methodDisplayLabels = new Map([
      ["Conservative", "Lower Than Trend"],
      ["Normalized", "Adjusted Trend"],
      ["Management Estimate", "Staff Estimate"],
      ["Declining", "Expected To Decrease"],
      ["Flat", "No Growth Assumed"],
      ["New Revenue", "Limited History"],
      ["Statutory", "Set By Law"]
    ]);

    const rowData = model.funds.flatMap((item) => (item[detailsField] || []).map((detail) => ({ fund: item.fund, detail })))
      .filter(({ detail }) => !/^interfund group transfer/i.test(detail.name))
      .filter(({ detail }) => !/refund.*prior year/i.test(detail.name))
      .filter(({ detail }) => !/^unclassified/i.test(detail.name))
      // Miscellaneous/one-off revenue types that don't reflect a
      // meaningful, forecastable trend for any fund -- interest income,
      // budgeted use-of-fund-balance surpluses, grants (one-off/program-
      // specific awards), asset sales, and contributions/donations.
      // Excluded everywhere rather than per-fund since none of these are a
      // useful forecast driver in any fund.
      .filter(({ detail }) => !/interest/i.test(detail.name))
      .filter(({ detail }) => !/^surplus budget/i.test(detail.name))
      .filter(({ detail }) => !/^surplus equipment sales/i.test(detail.name))
      .filter(({ detail }) => !/grant/i.test(detail.name))
      .filter(({ detail }) => !/^sale of fixed assets/i.test(detail.name))
      .filter(({ detail }) => !/^contributions and donations/i.test(detail.name))
      .filter(({ detail }) => !/^housing prisoners revenue/i.test(detail.name))
      .filter(({ detail }) => !/^white sands fee/i.test(detail.name))
      .filter(({ detail }) => !/ordinance fine \(animal control\)/i.test(detail.name))
      // Catches whatever's left of the broader Miscellaneous Revenue
      // category (the name-based filters above already cover its biggest,
      // named line items) -- same reasoning: not a useful forecast driver.
      .filter(({ detail }) => detail.category !== "Miscellaneous Revenue")
      .filter(({ fund, detail }) => !FORECAST_ASSUMPTIONS_HIDDEN_FUND_ROWS.has(fund.code + "|" + detail.name.toLowerCase()))
      // A line with nothing recorded in either of the two most recent
      // actual years has effectively gone dormant/discontinued -- its
      // older actuals are stale context, not a useful forward-looking
      // driver, so it's just noise on this table.
      .filter(({ detail }) => (detail.values[2024] || 0) !== 0 || (detail.values[2025] || 0) !== 0)
      .filter(({ detail }) => {
        const hasData = FINANCIAL_FORECAST_ACTUAL_YEARS.concat([2027]).some((year) => (detail.values[year] || 0) !== 0);
        const hasGrowthRate = Number.isFinite(detail.avgGrowth) || Number.isFinite(detail.cagr);
        return hasData && hasGrowthRate;
      })
      .map(({ fund, detail }) => ({
        fund,
        detail,
        assumptionValues: assumptionYears.map((year) => {
          if (detail.weightedAssumptions && Number.isFinite(detail.weightedAssumptions[year])) {
            return detail.weightedAssumptions[year];
          }
          return forecastAssumptionValue(detail.categoryAssumption, year);
        })
      }))
      // Initial server-rendered order, before the sort buttons (added
      // below) take over client-side: biggest driver first, across every
      // fund -- grouping by fund first would bury a bigger line item in a
      // smaller fund below a smaller one in the General Fund just because
      // of fund order.
      .sort((a, b) => (b.detail.values[2027] || 0) - (a.detail.values[2027] || 0));

    // The editable assumptions file currently sets one flat rate across
    // FY2028-FY2031 for every category -- four identical columns are just
    // noise in that case. Only collapse to one "Annual Growth Assumption"
    // column when every row's four years agree; if even one category has a
    // year-by-year assumption, show all four so that distinction stays visible.
    const allRowsFlat = rowData.every((item) => item.assumptionValues.every((value) => value === item.assumptionValues[0]));
    const assumptionColumns = allRowsFlat
      ? [{ label: "Annual Growth Assumption", num: true }]
      : assumptionYears.map((year) => ({ label: "FY " + year + " Annual Growth Assumption", num: true }));

    const rows = rowData.map(({ fund, detail, assumptionValues }) => {
      const detailOverride = FORECAST_DETAIL_ASSUMPTION_OVERRIDES.get(String(detail.name || "").trim().toLowerCase());
      // A completely flat historical run has no real growth trend to
      // project, so its assumption reads as flat too instead of a
      // manually-entered rate left over from before the line went flat.
      // A per-line override (see FORECAST_DETAIL_ASSUMPTION_OVERRIDES)
      // takes priority over both the category rate and the flat-history
      // check -- it's a deliberate, specific judgment call for this line.
      const historyIsFlat = isForecastHistoryFlat(detail.values);
      const displayAssumptionValues = detailOverride
        ? assumptionValues.map(() => detailOverride.rate)
        : historyIsFlat
        ? assumptionValues.map(() => 0)
        : assumptionValues.map((value) => effectiveForecastGrowth(lineType, value, detail.categorySuggested, detail.cagr));
      const assumptionCells = allRowsFlat
        ? '<td class="wc-num">' + escapeHtml(forecastPercent(displayAssumptionValues[0])) + '</td>'
        : displayAssumptionValues.map((value) => '<td class="wc-num">' + escapeHtml(forecastPercent(value)) + '</td>').join("");
      const excludedYears = historicalCagrExcludedYears(detail.values);
      const methodLabel = forecastAssumptionMethod(detail, displayAssumptionValues[0], lineType);
      const methodDisplayLabel = methodDisplayLabels.get(methodLabel) || methodLabel;
      // data-sort-value/data-sort-name let the sort buttons below
      // reorder these rows client-side without re-running the whole
      // forecast model -- see the delegated click handler for
      // .wc-forecast-sort-button.
      return (
        '<tr data-fund-name="' + escapeHtml(fund.label) + '" data-sort-value="' + (detail.values[2027] || 0) + '" data-sort-name="' + escapeHtml(detail.name.toLowerCase()) + '">' +
        '<td>' + escapeHtml(fund.label) + '</td>' +
        '<td>' + escapeHtml(detail.name) + '</td>' +
        FINANCIAL_FORECAST_ACTUAL_YEARS.map((year) =>
          '<td class="wc-num' + (excludedYears.has(year) ? ' wc-forecast-cagr-excluded' : '') + '">' + forecastMoney(detail.values[year] || 0) + '</td>'
        ).join("") +
        '<td class="wc-num">' + escapeHtml(forecastCagrDisplay(detail.cagr)) + '</td>' +
        '<td class="wc-num">' + escapeHtml(historicalCagrBasisLabel(detail.values)) + '</td>' +
        '<td>' + escapeHtml(methodDisplayLabel) + '</td>' +
        assumptionCells + '</tr>'
      );
    });

    const availableFundNames = new Set(rowData.map(({ fund }) => fund.label));
    const fundFilterOptions = FINANCIAL_FORECAST_FUNDS
      .map((fund) => fund.label)
      .filter((fundName) => availableFundNames.has(fundName));
    const fundFilterHtml =
      '<div class="wc-forecast-fund-filter" role="group" aria-label="Filter ' + escapeHtml(nameLabel.toLowerCase()) + ' rows by fund">' +
        '<span class="wc-forecast-filter-label">Fund</span>' +
        '<button type="button" class="wc-forecast-fund-filter-button is-active" data-fund-filter="all" aria-pressed="true">All</button>' +
        fundFilterOptions.map((fundName) =>
          '<button type="button" class="wc-forecast-fund-filter-button" data-fund-filter="' + escapeHtml(fundName) + '" aria-pressed="false">' + escapeHtml(fundName) + "</button>"
        ).join("") +
      '</div>';
    const sortToggleHtml =
      '<div class="wc-forecast-assumptions-controls">' +
        fundFilterHtml +
        '<div class="wc-forecast-sort-toggle" role="group" aria-label="Sort ' + escapeHtml(nameLabel.toLowerCase()) + ' rows">' +
          '<span class="wc-forecast-filter-label">Sort</span>' +
          '<button type="button" class="wc-forecast-sort-button is-active" data-sort-mode="largest" aria-pressed="true">Largest First</button>' +
          '<button type="button" class="wc-forecast-sort-button" data-sort-mode="smallest" aria-pressed="false">Smallest First</button>' +
          '<button type="button" class="wc-forecast-sort-button" data-sort-mode="abc" aria-pressed="false">A-Z</button>' +
        '</div>' +
      '</div>';
    return renderTable({
      caption: lineType === "revenue" ? "Revenue Forecast Assumptions" : "Expense Forecast Assumptions",
      toggleHtml: sortToggleHtml,
      columns: [
        { label: "Fund Name" },
        { label: nameLabel },
        { label: "FY 2020 Actual", num: true },
        { label: "FY 2021 Actual", num: true },
        { label: "FY 2022 Actual", num: true },
        { label: "FY 2023 Actual", num: true },
        { label: "FY 2024 Actual", num: true },
        { label: "FY 2025 Actual", num: true },
        {
          label: "Historical CAGR",
          num: true,
          tooltip: "CAGR (Compound Annual Growth Rate) is the smoothed, year-over-year growth rate that a line item would need to grow at consistently to get from its starting value to its ending value over a span of years -- unlike a simple average of year-to-year changes, it accounts for compounding. It's a useful, stable basis for financial forecasting because it reflects the underlying long-term trend rather than any single volatile year. Historical CAGR here is calculated using normalized years and excludes atypical years that would otherwise distort long-term growth trends."
        },
        { label: "CAGR Basis", num: true },
        {
          label: "Method",
          tooltip: "Lower Than Trend: assumption intentionally below historical trend. Adjusted Trend: based on normalized operations after excluding atypical years. No Growth Assumed: no material growth expected. Limited History: insufficient history available. Set By Law: growth determined by law or fixed formula. Expected To Decrease: long-term downward trend expected. Staff Estimate: used where historical trends are not predictive."
        }
      ].concat(assumptionColumns),
      bodyRows: rows
    });
  }

  function forecastShortMoney(value) {
    const n = Math.round(Number(value) || 0);
    const sign = n < 0 ? "-" : "";
    const abs = Math.abs(n);
    if (abs >= 1000000000) return sign + "$" + (abs / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
    if (abs >= 1000000) return sign + "$" + (abs / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (abs >= 1000) return sign + "$" + (abs / 1000).toFixed(0) + "K";
    return sign + "$" + abs.toLocaleString("en-US");
  }

  function forecastPercentChange(start, end) {
    const base = Number(start) || 0;
    const finish = Number(end) || 0;
    if (!base) return "New";
    return forecastPercent((finish - base) / Math.abs(base));
  }

  function forecastFundHealth(item) {
    const beginning = item.annual[2027].beginningBalance || 0;
    const ending = item.fund.code === "111"
      ? item.annual[2031].availableEndingBalance || 0
      : item.annual[2031].endingBalance || 0;
    const hasShortfall = FINANCIAL_FORECAST_YEARS.some((year) => (
      item.fund.code === "111"
        ? (item.annual[year].availableNetChange || 0) < 0
        : (item.annual[year].revenues || 0) < (item.annual[year].expenditures || 0)
    ));
    if (item.fund.code === "300") {
      return { label: "Capital Plan Driven", className: "is-plan", text: "Project spending follows the capital improvement plan." };
    }
    if (item.fund.code === "101") {
      return { label: "Stable", className: "is-stable", text: "Shared revenues and planned expenditures support ongoing transportation services." };
    }
    if (item.fund.code === "107") {
      return { label: "Transfer Supported", className: "is-plan", text: "The General Fund transfer is forecast at the amount needed after applying the Sheriff's other revenues." };
    }
    if (hasShortfall) {
      return { label: "Watch", className: "is-watch", text: "Expenses are projected above recurring revenues in at least one year." };
    }
    if (ending >= beginning * 1.05) {
      return { label: "Growing Reserve", className: "is-strong", text: "Projected revenues keep pace and reserves increase." };
    }
    return { label: "Stable", className: "is-stable", text: "Projected revenues generally keep pace with expenses." };
  }

  function forecastFundDetailId(fundCode) {
    return "wc-forecast-fund-detail-" + String(fundCode || "").replace(/[^a-z0-9_-]/gi, "");
  }

  function renderForecastFundScheduleDetail(item) {
    return renderForecastDetailTable(item);
  }

  function renderForecastFundDetailTemplates(model) {
    return (
      '<div class="wc-forecast-fund-detail-templates" hidden>' +
        model.funds.map((item) => (
          '<template id="' + escapeHtml(forecastFundDetailId(item.fund.code)) + '">' +
            renderForecastFundScheduleDetail(item) +
          '</template>'
        )).join("") +
      '</div>'
    );
  }

  function renderForecastOverviewCards(model) {
    return (
      '<section class="wc-forecast-section wc-forecast-overview" aria-labelledby="forecast-overview-heading">' +
        '<div class="wc-section-heading-row">' +
          '<h2 id="forecast-overview-heading" class="wc-fund-section-heading">Forecast At A Glance</h2>' +
          '<p>Each card answers the basic question: is this fund positioned to support planned services over the next five years? Select a card to view its detailed fund schedule.</p>' +
        '</div>' +
        '<div class="wc-forecast-health-grid">' +
          model.funds.map((item) => {
            const health = forecastFundHealth(item);
            const beginning = item.annual[2027].beginningBalance || 0;
            const ending = item.annual[2031].endingBalance || 0;
            const availableEnding = Number.isFinite(item.annual[2031].availableEndingBalance)
              ? item.annual[2031].availableEndingBalance
              : ending;
            const revenue2031 = item.annual[2031].revenues || 0;
            const expense2031 = item.annual[2031].expenditures || 0;
            const operatingChange2031 = revenue2031 - expense2031;
            const displayedChange2031 = item.fund.code === "111"
              ? item.annual[2031].availableNetChange || 0
              : operatingChange2031;
            return (
              '<article class="wc-forecast-health-card wc-forecast-fund-card-button ' + health.className + '" role="button" tabindex="0" data-forecast-fund-detail="' + escapeHtml(forecastFundDetailId(item.fund.code)) + '" data-forecast-fund-name="' + escapeHtml(item.fund.label) + '">' +
                '<div class="wc-forecast-health-card-head">' +
                  '<h3>' + escapeHtml(item.fund.label) + '</h3>' +
                  '<span>' + escapeHtml(health.label) + '</span>' +
                '</div>' +
                '<p>' + escapeHtml(health.text) + '</p>' +
                '<dl>' +
                  '<div><dt>Starting Balance</dt><dd>' + forecastShortMoney(beginning) + '</dd></div>' +
                  '<div><dt>2031 Balance</dt><dd>' + forecastShortMoney(ending) + '</dd></div>' +
                  (item.fund.code === "111" ? '<div><dt>2031 Balance for Other Eligible TDT Uses</dt><dd>' + forecastShortMoney(availableEnding) + '</dd></div>' : '') +
                  '<div><dt>Balance Change</dt><dd>' + escapeHtml(forecastPercentChange(beginning, item.fund.code === "111" ? availableEnding : ending)) + '</dd></div>' +
                  '<div><dt>' + (item.fund.code === "111" ? "2031 Change for Other Eligible TDT Uses" : "2031 Revenue vs Expense") + '</dt><dd>' + forecastShortMoney(displayedChange2031) + '</dd></div>' +
                '</dl>' +
              '</article>'
            );
          }).join("") +
        '</div>' +
      '</section>'
    );
  }

  function renderForecastBar(value, max, className, label) {
    const width = max ? Math.max(2, Math.min(100, (Math.abs(value) / max) * 100)) : 0;
    return (
      '<span class="wc-forecast-comparison-bar ' + className + '" aria-label="' + escapeHtml(label) + '">' +
        '<i style="width:' + width.toFixed(2) + '%"></i>' +
      '</span>'
    );
  }

  function renderForecastCharts(model) {
    return (
      '<section class="wc-forecast-section wc-forecast-visuals" aria-labelledby="forecast-visuals-heading">' +
        '<div class="wc-section-heading-row">' +
          '<h2 id="forecast-visuals-heading" class="wc-fund-section-heading">Revenues, Expenses, And Ending Balance</h2>' +
          '<p>Bars compare money coming in, money going out, and the projected ending balance for each year.</p>' +
        '</div>' +
        '<div class="wc-forecast-visual-grid">' +
          model.funds.map((item) => {
            const max = Math.max.apply(null, FINANCIAL_FORECAST_YEARS.flatMap((year) => [
              item.annual[year].revenues || 0,
              item.annual[year].expenditures || 0,
              item.annual[year].endingBalance || 0
            ]));
            return (
              '<article class="wc-forecast-visual-panel">' +
                '<h3>' + escapeHtml(item.fund.label) + '</h3>' +
                '<div class="wc-forecast-legend" aria-hidden="true">' +
                  '<span class="is-revenue">Revenue</span><span class="is-expense">Expense</span><span class="is-balance">Ending Balance</span>' +
                '</div>' +
                '<div class="wc-forecast-comparison-chart">' +
                  FINANCIAL_FORECAST_YEARS.map((year) => {
                    const annual = item.annual[year];
                    return (
                      '<div class="wc-forecast-comparison-row">' +
                        '<strong>FY ' + year + '</strong>' +
                        '<div>' +
                          renderForecastBar(annual.revenues || 0, max, "is-revenue", "FY " + year + " revenue " + forecastMoney(annual.revenues || 0)) +
                          renderForecastBar(annual.expenditures || 0, max, "is-expense", "FY " + year + " expense " + forecastMoney(annual.expenditures || 0)) +
                          renderForecastBar(annual.endingBalance || 0, max, "is-balance", "FY " + year + " ending balance " + forecastMoney(annual.endingBalance || 0)) +
                        '</div>' +
                        '<span>' + forecastShortMoney(annual.endingBalance || 0) + '</span>' +
                      '</div>'
                    );
                  }).join("") +
                '</div>' +
              '</article>'
            );
          }).join("") +
        '</div>' +
      '</section>'
    );
  }

  function assumptionRateRange(model, lineType, category) {
    const values = (model.assumptions || [])
      .filter((row) => String(row.line_type || "").trim().toLowerCase() === lineType && normalizeForecastCategory(row.category, lineType) === category)
      .flatMap((row) => FINANCIAL_FORECAST_YEARS.slice(1).map((year) => forecastAssumptionValue(row, year)))
      .filter((value) => Number.isFinite(value));
    if (!values.length) return "Varies";
    const min = Math.min.apply(null, values);
    const max = Math.max.apply(null, values);
    const minDisplay = forecastPercent(min);
    const maxDisplay = forecastPercent(max);
    return minDisplay === maxDisplay ? minDisplay : minDisplay + " to " + maxDisplay;
  }

  function renderForecastAssumptionSummary(model) {
    const rows = [
      ["Personnel Services", "Wages, benefits, and staffing costs."],
      ["Operating Expenses", "Recurring service costs, contracts, supplies, and utilities."],
      ["Capital Outlay", "Recurring capital replacement; unusual one-time capital is removed from trend calculations."]
    ].map(([category, why]) => (
      '<tr>' +
        '<td>' + escapeHtml(category) + '</td>' +
        '<td class="wc-num">' + escapeHtml(assumptionRateRange(model, "expense", category)) + '</td>' +
        '<td>' + escapeHtml(why) + '</td>' +
      '</tr>'
    ));
    return (
      '<section class="wc-forecast-section wc-forecast-assumption-summary" aria-labelledby="forecast-assumption-summary-heading">' +
        '<div class="wc-section-heading-row">' +
          '<h2 id="forecast-assumption-summary-heading" class="wc-fund-section-heading">Broad Expense Category Assumptions</h2>' +
        '</div>' +
        renderTable({
          caption: "Expense Assumption Summary",
          columns: [{ label: "Expense Type" }, { label: "Annual Growth Used", num: true }, { label: "Expense Type Meaning" }],
          bodyRows: rows
        }) +
      '</section>'
    );
  }

  function renderFinancialForecast(cipProjectList) {
    const model = buildFinancialForecastModel(cipProjectList);
    return (
      renderForecastOverviewCards(model) +
      renderForecastAssumptionSummary(model) +
      renderForecastFundDetailTemplates(model) +
      '<section class="wc-forecast-section">' +
        '<h2 class="wc-fund-section-heading">Assumptions</h2>' +
        '<details id="forecast-revenue-assumptions" class="wc-forecast-detail wc-forecast-assumptions-detail">' +
          '<summary>Revenue Assumptions</summary>' +
          '<p class="wc-forecast-assumptions-intro">Revenue assumptions are developed using historical trends, statutory requirements, economic conditions, development activity, and management judgment. Historical compound annual growth rates (CAGR) are provided for reference and are calculated using the most representative historical period for each recurring revenue source. Where historical data are insufficient or not representative of future expectations, CAGR is not presented. Annual growth assumptions are intentionally conservative and reflect expected future conditions rather than historical averages.</p>' +
          renderForecastAssumptionsDetailTable(model, "revenue") +
        '</details>' +
        '<details id="forecast-expense-assumptions" class="wc-forecast-detail wc-forecast-assumptions-detail">' +
          '<summary>Expenditure Assumptions</summary>' +
          '<p class="wc-forecast-assumptions-intro">Expenditure assumptions are developed using normalized historical spending, known recurring operating needs, personnel cost expectations, capital exclusions, and management judgment. One-time capital purchases, administrative pass-throughs, land purchases, and other nonrecurring items are excluded from trend calculations where they would distort future operating growth. The FY 2027 baseline remains the proposed budget; these adjustments affect only the growth assumptions applied to future years.</p>' +
          renderForecastAssumptionsDetailTable(model, "expense") +
        '</details>' +
      '</section>' +
      lastUpdatedNoteHtml()
    );
  }

  // The fund roll-forward schedule shows the same prior-year-actuals + FY2026
  // Budget columns as the Budget Lines modal. FY2026 budget is sourced from
  // the Supabase original budget cache, with the sheet value used only as a
  // fallback when a row is not present in that cache.
  const FUND_SCHEDULE_YEAR_COLUMNS = BUDGET_LINE_PRIOR_YEAR_COLUMNS
    .concat([
      { field: "FY2027_Proposed", label: "FY 2027 Proposed" },
      { field: "FY2028_Projected", label: "FY 2028 Projected", projected: true },
      { field: "FY2029_Projected", label: "FY 2029 Projected", projected: true }
    ]);

  // Flat management-estimate growth rate applied to a fund's FY 2027
  // proposed expenditures to project FY 2028/FY 2029 on the Fund Financial
  // Ledger -- there is no per-category expense growth model at fund grain
  // (unlike revenue's REVENUE_PROJECTION_RATES), so a single conservative
  // rate is used uniformly, consistent with the "Management Estimate" rate
  // already used elsewhere for expense projections (see fund 111's own
  // 0.03 override above).
  const EXPENSE_PROJECTION_RATE = 0.03;
  function projectedExpenseAmount(base, year) {
    const years = Math.max(0, Number(year) - 2027);
    return (Number(base) || 0) * Math.pow(1 + EXPENSE_PROJECTION_RATE, years);
  }
  function projectedExpenseRowsAmount(rows, year) {
    return (rows || []).reduce((sum, row) => sum + projectedExpenseAmount(row.FY2027_Proposed || 0, year), 0);
  }

  function fiscalYearForField(field) {
    return Number(field.slice(2, 6));
  }

  // "COA Expenses" (Object_Code/Object_Name/Object_Type) has no dedicated
  // Google Sheet tab, so this catalog is derived from the expenditures
  // sheet's own Object_Code/Object_Name/Object_Type columns instead (first
  // row seen per code) -- classification/label use only, never dollars.
  // Used by synthesizeMissingExpenseRows.
  function buildExpenseObjectCatalog(expenditureRows) {
    const catalog = new Map();
    (expenditureRows || []).forEach((r) => {
      const code = String(r.Object_Code || "").trim();
      if (!code || catalog.has(code)) return;
      catalog.set(code, { Object_Code: code, Object_Name: r.Object_Name || "", Object_Type: r.Object_Type || "" });
    });
    return catalog;
  }

  // Florida's Uniform Accounting System object codes are 3xx for revenue
  // and 5xx/6xx for expense, with no overlap -- used by
  // synthesizeMissingExpenseRows to keep revenue-coded Supabase rows out of
  // its expense-only synthesis.
  function isLikelyExpenseObjectCode(object) {
    const firstDigit = String(object || "").trim().charAt(0);
    return firstDigit === "5" || firstDigit === "6";
  }

  // One or more fund codes combined into a single Beginning Fund Balance ->
  // Revenues -> Other Financial Sources -> Expenditures -> Other Financial
  // Uses -> Change in Fund Balance -> Estimated Ending Fund Balance
  // roll-forward, with a year column per FUND_SCHEDULE_YEAR_COLUMNS entry
  // (prior years hidden behind the same "View Prior Years" toggle used
  // elsewhere on the site).
  function buildFundFinancialSchedule(fundCodes, caption) {
    const revenueRows = cache.revenues || [];
    const expenseRows = cache.expenditures || [];
    if ((!revenueRows.length && !expenseRows.length) || !(cache.fundBalances || []).length) return "";

    const isMosquitoControlFundOnlyView = fundCodes.length === 1 && fundCodes[0] === "105";
    const isExcludedFund = (r) => CONSOLIDATED_SCHEDULE_EXCLUDED_FUND_CODES.has(fundCodeForRow(r));
    // The Ad Valorem 5% row's nominal Dept_Code (102389) maps to fund
    // "102" (MSBU), which doesn't actually levy this reduction -- it's
    // handled separately per-fund via adValoremFivePercentReductionForFunds,
    // so exclude it here rather than letting it land on MSBU's own table.
    const inFund = (r) => fundCodes.includes(fundCodeForRow(r)) && !isExcludedFund(r) && !isAdValoremFivePercentRow(r);
    const revenueActualFields = new Set(BUDGET_LINE_PRIOR_YEAR_COLUMNS.filter((c) => c.actual).map((c) => c.field));

    function sumFor(rows, predicate, field) {
      if (field === "FY2028_Projected" || field === "FY2029_Projected") {
        const year = field === "FY2028_Projected" ? 2028 : 2029;
        const matchingRows = rows.filter((r) => inFund(r) && predicate(r));
        return rows === revenueRows
          ? projectedRevenueRowsAmount(matchingRows, year)
          : projectedExpenseRowsAmount(matchingRows, year);
      }
      const isActualOrBudgetField = revenueActualFields.has(field) || field === "FY2026_Original_Budget";
      // Revenue rows are summed directly here, same as the Consolidated
      // Revenue Summary table, with a cross-department dedup for shared
      // account-level actuals/budget (see revenueBudgetUniqueKey/
      // revenueBudgetAmountForCodes). Some departments legitimately share
      // one Dept_Code+Object_Code across several distinct expense rows
      // (e.g. Statutory & Other's many recipients, each its own
      // Project_Code/amount) -- revenueBudgetUniqueKey's fund+org+code+
      // project grain tells those apart from a true duplicate by keeping
      // Project_Code in the key, so it's safe to reuse for expenses too.
      const shouldDedupeRevenue = rows === revenueRows && isActualOrBudgetField;
      // For historical expense fields (FY2020-FY2026), source from the
      // shared deduped layer instead of the raw display rows -- some
      // departments split one Dept_Code across multiple display-only
      // Dept_Names (e.g. Code Compliance / Code Compliance Beach), each
      // carrying the same full account total (see applyActualsToRows), and
      // summing every display row directly would count that total once per
      // Dept_Name sharing it. buildDedupedHistoricalExpenseRows collapses
      // that back to one row per true accounting record; inFund/predicate
      // below still apply to it unchanged since fund code and Dept_Code/
      // Object_Code (what they key off) are preserved on every deduped row.
      const isHistoricalExpenseField = rows === expenseRows && HISTORICAL_EXPENSE_DEDUP_FIELD_SET.has(field);
      const sourceRows = isHistoricalExpenseField ? (cache.dedupedExpenseRows || []) : rows;

      if (rows === revenueRows && field === "FY2026_Original_Budget") {
        const bestByKey = new Map();
        sourceRows.forEach((r) => {
          if (!inFund(r) || !predicate(r)) return;
          const key = revenueBudgetUniqueKey(r);
          const val = revenueBudgetMergeContribution(r);
          if (!bestByKey.has(key) || val > bestByKey.get(key)) bestByKey.set(key, val);
        });
        return Array.from(bestByKey.values()).reduce((sum, val) => sum + val, 0);
      }

      // Revenue actual-year totals are re-derived straight from the raw
      // Supabase ledger, grouped by revenue code with Math.abs() applied
      // per code (same method as rawRevenueActualSummarySum on the
      // Consolidated Revenue Summary), rather than summing each sheet
      // row's own r[field] -- a handful of accounts (e.g. Interest) can
      // have a scoped per-department Supabase lookup that doesn't quite
      // match the sheet's own historical figure, which left this
      // schedule's revenue totals a few thousand dollars off from the
      // Summary of Revenues even after sign-correcting r[field] directly.
      // Querying the ledger the same way both pages do guarantees they
      // agree exactly. (The only subtractive revenue row, the Ad Valorem
      // 5% reduction, is excluded from `inFund` already, so every code
      // reaching this branch is safe to flip positive outright.)
      if (rows === revenueRows && revenueActualFields.has(field) && (cache.revenueActualRows || []).length) {
        const year = Number(field.slice(2, 6));
        const codes = new Set(
          sourceRows.filter((r) => inFund(r) && predicate(r)).map((r) => String(r.Revenue_Code || "").trim()).filter(Boolean)
        );
        if (!codes.size) return 0;
        const rawTotalsByCode = new Map();
        (cache.revenueActualRows || []).forEach((row) => {
          if (Number(row.year) !== year) return;
          const code = String(row.object || "").trim();
          if (!codes.has(code)) return;
          const rowFundCode = String(row.org || "").trim().slice(0, 3);
          if (CONSOLIDATED_SCHEDULE_EXCLUDED_FUND_CODES.has(rowFundCode)) return;
          if (!fundCodes.includes(rowFundCode)) return;
          rawTotalsByCode.set(code, (rawTotalsByCode.get(code) || 0) + (Number(row.amount) || 0));
        });
        let total = 0;
        rawTotalsByCode.forEach((codeTotal) => {
          total += revenueDisplayAmount(codeTotal);
        });
        return total;
      }

      const seenAmounts = shouldDedupeRevenue ? new Set() : null;
      return sourceRows.reduce((sum, r) => {
        if (!inFund(r) || !predicate(r)) return sum;
        if (seenAmounts) {
          const key = revenueBudgetUniqueKey(r);
          if (seenAmounts.has(key)) return sum;
          seenAmounts.add(key);
        }
        if (field === "FY2026_Original_Budget") {
          // Reuse the same FY2026 contribution logic as the Consolidated
          // Revenue Summary (revenueBudgetMergeContribution) instead of a
          // separate, drifting copy -- it knows about subtractive revenue
          // rows (e.g. the Ad Valorem 5% reduction) that must subtract from
          // their category instead of being sign-flipped positive.
          return sum + (rows === revenueRows ? revenueBudgetMergeContribution(r) : (r.FY2026_Original_Budget || r.FY2026_Budget || 0));
        }
        // Revenue actual-year fields need the same sign-flip
        // revenueBudgetMergeContribution already applies for FY2026 above
        // -- some revenue codes (Interest, etc.) are booked as credits/
        // negative amounts, a per-account display convention, not a
        // genuine shortfall. Summing r[field] raw here (the previous
        // behavior) silently subtracted those accounts instead of adding
        // their flipped positive value, which is why this schedule's
        // revenue totals didn't match the Summary of Revenues table (see
        // rawRevenueActualSummarySum/revenueActualAmountForCodes, fixed
        // the same way, for that page's own version of this bug).
        if (rows === revenueRows && revenueActualFields.has(field)) {
          return sum + revenueRowFieldContribution(r, field);
        }
        return sum + (r[field] || 0);
      }, 0);
    }

    function rowValues(predicate, rows) {
      return FUND_SCHEDULE_YEAR_COLUMNS.map((c) => sumFor(rows, predicate, c.field));
    }

    function mosquitoControlDisplayedAdValoremValues() {
      const adValoremRows = departmentFinancialDisplayRows("Mosquito Control").revenueRows
        .filter((r) => normalizeDeptName(r.Revenue_Name) === "ad valorem taxes");
      return FUND_SCHEDULE_YEAR_COLUMNS.map((c) => budgetLineColumnTotal(adValoremRows, c, false));
    }

    function fundScheduleColumnCellClass(i) {
      const col = FUND_SCHEDULE_YEAR_COLUMNS[i];
      if (col && col.projected) return " wc-revenue-projected";
      if (col && col.field !== "FY2027_Proposed") return " wc-prior-year";
      return "";
    }

    function rowHtml(label, values, rowClass) {
      const labelClass = rowClass && rowClass.indexOf("wc-table-total-row") !== -1 ? ' class="wc-fund-total-label-cell"' : "";
      const rowClasses = [];
      if (rowClass) rowClasses.push(rowClass);
      if (/^unclassified/i.test(String(label || "").trim())) rowClasses.push("wc-table-unclassified-row");
      return (
        "<tr" + (rowClasses.length ? ' class="' + rowClasses.join(" ") + '"' : "") + "><td" + labelClass + ">" + escapeHtml(label) + "</td>" +
        values.map((v, i) =>
          '<td class="wc-num' + fundScheduleColumnCellClass(i) + '">' + formatCurrency(v) + "</td>"
        ).join("") +
        "</tr>"
      );
    }

    const isOtherFinancingRevenue = (r) => String(r.Revenue_Code || "").trim() === "381000";
    // Only excluded from the Building Fund's own single-fund schedule (see
    // that predicate's use below) -- there, Revenue_Code 389000 would
    // double-count the balance already shown on the Beginning Fund Balance
    // row above. But a multi-fund call (the Consolidated Fund Financial
    // Schedule's allKnownFundCodes(), or any other combined view) needs
    // every fund's real revenue included, so the exclusion must not apply
    // there -- otherwise Consolidated's Total Revenues comes up short by
    // this amount (caught as a FY2026 Budget mismatch of $4,126,388).
    const isBuildingFundOnlyView = fundCodes.length === 1 && fundCodes[0] === "103";
    const isBuildingFundBalanceBroughtForwardRevenue = (r) =>
      isBuildingFundOnlyView && fundCodeForRow(r) === "103" && String(r.Revenue_Code || "").trim() === "389000";
    const isOtherFinancingExpense = isOtherFinancingExpenseRow;

    // Each activity/type row's own breakdown -- by revenue source for a
    // Revenues row, by department for an Expenditures row -- computed with
    // the same sumFor/rowValues this table's own totals use, so a row's
    // breakdown always foots to that row's own displayed total. Rendered
    // collapsed inside the activity row's own detail row (see
    // activityRowHtml) rather than always-on, since most users only ever
    // need to drill into one or two activities at a time.
    function activityBreakdownHtml(predicate, isExpenseKind, extraLine) {
      const sourceRows = isExpenseKind ? expenseRows : revenueRows;
      const matchingRaw = sourceRows.filter((r) => inFund(r) && predicate(r));
      if (!matchingRaw.length && !extraLine) return "";

      let labelFor;
      let names;
      if (isExpenseKind) {
        const matchingDeduped = (cache.dedupedExpenseRows || []).filter((r) => inFund(r) && predicate(r));
        const repByCodeAndName = clusterDeptNamesByCode(matchingRaw.concat(matchingDeduped));
        labelFor = (r) => representativeDeptName(repByCodeAndName, r);
        names = uniqueSorted(matchingRaw.concat(matchingDeduped).map(labelFor));
      } else {
        labelFor = (r) => collapsedRevenueSourceName(r.Revenue_Name || r.Dept_Name || "Unknown");
        names = uniqueSorted(matchingRaw.map(labelFor));
      }

      const currentYearIndex = FUND_SCHEDULE_YEAR_COLUMNS.findIndex((c) => c.field === "FY2027_Proposed");
      let entries = names.map((name) => ({
        label: name,
        values: rowValues((r) => predicate(r) && labelFor(r) === name, sourceRows)
      }));
      if (!isExpenseKind && isMosquitoControlFundOnlyView) {
        const adValoremEntry = entries.find((e) => normalizeDeptName(e.label) === "ad valorem taxes");
        if (adValoremEntry) adValoremEntry.values = mosquitoControlDisplayedAdValoremValues();
        if (extraLine && normalizeDeptName(extraLine.label) === "ad valorem taxes") {
          extraLine = null;
        }
      }
      // The Ad Valorem 5% statutory reduction (see
      // adValoremFivePercentReductionForFunds) isn't a row this fund's
      // revenue rows can be filtered/grouped to -- it's pulled separately
      // from Supabase and only folded into General Government Taxes' own
      // total above. Folded into its matching source row here (by label)
      // too, so that row -- and this breakdown as a whole -- still foots to
      // the activity row's displayed total instead of running short by the
      // reduction amount, without showing it as its own separate line.
      if (extraLine) {
        const merge = entries.find((e) => e.label === extraLine.label);
        if (merge) {
          merge.values = merge.values.map((v, i) => v + extraLine.values[i]);
        } else {
          entries.push(extraLine);
        }
      }
      // Rows that are exactly $0 across every column add nothing but
      // clutter to a fund-scoped breakdown -- most funds only touch a
      // handful of the county-wide revenue sources/departments under any
      // given activity.
      entries = entries.filter((e) => e.values.some((v) => v));
      entries.sort((a, b) => (b.values[currentYearIndex] || 0) - (a.values[currentYearIndex] || 0));
      if (!entries.length) return "";

      return (
        '<div class="wc-fund-activity-detail">' +
        '<table class="wc-data-table wc-fund-activity-detail-table">' +
        "<thead><tr><th>" + escapeHtml(isExpenseKind ? "Department" : "Revenue Source") + "</th>" +
        FUND_SCHEDULE_YEAR_COLUMNS.map((c, i) => '<th class="wc-num' + fundScheduleColumnCellClass(i) + '">' + escapeHtml(c.label.toUpperCase()) + "</th>").join("") +
        "</tr></thead><tbody>" +
        entries.map((e) => rowHtml(e.label, e.values)).join("") +
        "</tbody></table></div>"
      );
    }

    // The Revenues/Expenditures group header and each activity row below it
    // are collapsed by default -- clicking the group header reveals its
    // activity rows (see the delegated click handler further down), and
    // clicking a visible activity row expands its own breakdown inline,
    // closing whichever other activity in the same table was already open.
    function groupHeaderHtml(label, groupKey) {
      return (
        '<tr class="wc-table-group-row wc-fund-activity-group-toggle" data-fund-activity-group="' + groupKey + '" tabindex="0" role="button" aria-expanded="false">' +
        "<td>" + escapeHtml(label) + '<span class="wc-fund-activity-chevron" aria-hidden="true"></span></td>' +
        FUND_SCHEDULE_YEAR_COLUMNS.map((c, i) => '<td class="' + fundScheduleColumnCellClass(i).trim() + '"></td>').join("") +
        "</tr>"
      );
    }
    function activityRowHtml(label, values, groupKey, predicate, isExpenseKind, extraLine) {
      fundScheduleActivityCounter += 1;
      const rowId = "wc-fund-activity-detail-" + fundScheduleActivityCounter;
      const detailHtml = predicate ? activityBreakdownHtml(predicate, isExpenseKind, extraLine) : "";
      const toggleClass = detailHtml ? " wc-fund-activity-toggle" : "";
      const toggleAttrs = detailHtml ? ' data-target="' + rowId + '" tabindex="0" role="button" aria-expanded="false"' : "";
      const row =
        '<tr class="wc-fund-activity-row' + toggleClass + '" data-fund-activity-group="' + groupKey + '"' + toggleAttrs + " hidden><td>" +
        escapeHtml(label) + (detailHtml ? '<span class="wc-fund-activity-chevron" aria-hidden="true"></span>' : "") + "</td>" +
        values.map((v, i) => '<td class="wc-num' + fundScheduleColumnCellClass(i) + '">' + formatCurrency(v) + "</td>").join("") +
        "</tr>";
      const detailRow = detailHtml
        ? '<tr class="wc-fund-activity-detail-row" id="' + rowId + '" data-fund-activity-group="' + groupKey + '" hidden><td colspan="' + (values.length + 1) + '">' + detailHtml + "</td></tr>"
        : "";
      return row + detailRow;
    }

    const bodyRows = [];

    const beginningValues = FUND_SCHEDULE_YEAR_COLUMNS.map((c) => fundBalanceForYear(fundCodes, fiscalYearForField(c.field) - 1));
    const beginningFundBalanceRowIndex = bodyRows.length;
    bodyRows.push(rowHtml("Beginning Fund Balance", beginningValues, "wc-table-subtotal-row"));

    bodyRows.push(groupHeaderHtml("Revenues", "revenue"));
    const revenueTypeRows = CONSOLIDATED_REVENUE_TYPE_ROWS
      .map((spec) => ({
        label: spec.label,
        predicate: (r) =>
          r.Revenue_Type === spec.key &&
          !isOtherFinancingRevenue(r) &&
          !isBuildingFundBalanceBroughtForwardRevenue(r),
        values: rowValues((r) =>
          r.Revenue_Type === spec.key &&
          !isOtherFinancingRevenue(r) &&
          !isBuildingFundBalanceBroughtForwardRevenue(r), revenueRows)
      }));
    const generalGovTaxesRow = revenueTypeRows.find((row) => row.label === "General Government Taxes");
    if (generalGovTaxesRow) {
      const fy2026Index = FUND_SCHEDULE_YEAR_COLUMNS.findIndex((c) => c.field === "FY2026_Original_Budget");
      const adValoremFivePercent = adValoremFivePercentReductionForFunds(fundCodes);
      if (fy2026Index !== -1) {
        generalGovTaxesRow.values[fy2026Index] += adValoremFivePercent;
        if (adValoremFivePercent) {
          generalGovTaxesRow.extraLine = {
            label: "Ad Valorem Taxes",
            values: FUND_SCHEDULE_YEAR_COLUMNS.map((c, i) => (i === fy2026Index ? adValoremFivePercent : 0))
          };
        }
      }
    }
    // A row that's exactly $0 across every column is just visual noise on a
    // fund-scoped schedule -- most funds don't touch every revenue
    // type/expenditure activity the county has. Still summed into the
    // subtotal below either way (trivially, since it's 0).
    revenueTypeRows.forEach((row) => {
      if (row.values.some((v) => v)) bodyRows.push(activityRowHtml(row.label, row.values, "revenue", row.predicate, false, row.extraLine));
    });
    const revenueTypeValues = revenueTypeRows.map((row) => row.values);
    const revenueSubtotalValues = FUND_SCHEDULE_YEAR_COLUMNS.map((c, i) => revenueTypeValues.reduce((s, v) => s + v[i], 0));
    bodyRows.push(rowHtml("Total Revenues", revenueSubtotalValues, "wc-table-total-row"));

    const otherSourcesValues = rowValues(isOtherFinancingRevenue, revenueRows);
    if (otherSourcesValues.some((v) => v)) bodyRows.push(rowHtml("Other Financial Sources", otherSourcesValues));
    const revenueTotalValues = revenueSubtotalValues.map((v, i) => v + otherSourcesValues[i]);
    bodyRows.push(rowHtml("Total Revenue and Other Financial Sources", revenueTotalValues, "wc-table-subtotal-row"));

    bodyRows.push(groupHeaderHtml("Expenditures", "expense"));
    // Case-insensitive, matching the Consolidated Expense Summary -- the
    // activities sheet has a few inconsistently-cased entries (e.g.
    // "economic Environment").
    const knownExpenseActivities = new Set(CONSOLIDATED_EXPENDITURE_ACTIVITY_ROWS.map((a) => a.toLowerCase()));
    const expenseTypeRows = CONSOLIDATED_EXPENDITURE_ACTIVITY_ROWS.map((activity) => {
      const activityNorm = activity.toLowerCase();
      const predicate = (r) => expenseActivityForRow(r).toLowerCase() === activityNorm && !isOtherFinancingExpense(r);
      return { label: activity, predicate, values: rowValues(predicate, expenseRows) };
    });
    // Rows whose activity doesn't match a known section above (e.g. a row
    // synthesized from a Supabase-only account with no COA classification --
    // see synthesizeMissingExpenseRows) land on their own Unclassified line
    // instead of being dropped, same as the Consolidated Expense Summary.
    const unclassifiedValues = rowValues(
      (r) => !knownExpenseActivities.has(expenseActivityForRow(r).toLowerCase()) && !isOtherFinancingExpense(r),
      expenseRows
    );
    // Hidden when every column is exactly $0 -- an always-zero row is just
    // visual noise on a fund table that has nothing unclassified.
    if (unclassifiedValues.some((v) => v !== 0)) {
      expenseTypeRows.push({ label: "Unclassified", predicate: null, values: unclassifiedValues });
    }
    expenseTypeRows.forEach((row) => {
      if (row.values.some((v) => v)) bodyRows.push(activityRowHtml(row.label, row.values, "expense", row.predicate, true));
    });
    const expenseTypeValues = expenseTypeRows.map((row) => row.values);
    const expenseSubtotalValues = FUND_SCHEDULE_YEAR_COLUMNS.map((c, i) => expenseTypeValues.reduce((s, v) => s + v[i], 0));
    bodyRows.push(rowHtml("Total Expenditures", expenseSubtotalValues, "wc-table-total-row"));

    const otherUsesValues = rowValues(isOtherFinancingExpense, expenseRows);
    if (otherUsesValues.some((v) => v)) bodyRows.push(rowHtml("Other Financial Uses", otherUsesValues));
    const expenseTotalValues = expenseSubtotalValues.map((v, i) => v + otherUsesValues[i]);
    bodyRows.push(rowHtml("Total Expenditures and Other Financial Uses", expenseTotalValues, "wc-table-subtotal-row"));

    const changeValues = revenueTotalValues.map((v, i) => v - expenseTotalValues[i]);
    bodyRows.push(rowHtml("Change in Fund Balance", changeValues));

    // FY 2028/FY 2029 have no recorded fund balance of their own (see
    // fundBalanceForYear) -- their Beginning Fund Balance instead rolls
    // forward from this schedule's own prior projected/proposed column
    // (Beginning[2028] = Beginning[2027] + Change[2027], and so on), rather
    // than each column recomputing from a source that only has real
    // historical balances.
    const fy2027ColumnIndex = FUND_SCHEDULE_YEAR_COLUMNS.findIndex((c) => c.field === "FY2027_Proposed");
    const fy2028ColumnIndex = FUND_SCHEDULE_YEAR_COLUMNS.findIndex((c) => c.field === "FY2028_Projected");
    const fy2029ColumnIndex = FUND_SCHEDULE_YEAR_COLUMNS.findIndex((c) => c.field === "FY2029_Projected");
    if (fy2028ColumnIndex !== -1 && fy2027ColumnIndex !== -1) {
      beginningValues[fy2028ColumnIndex] = beginningValues[fy2027ColumnIndex] + changeValues[fy2027ColumnIndex];
    }
    if (fy2029ColumnIndex !== -1 && fy2028ColumnIndex !== -1) {
      beginningValues[fy2029ColumnIndex] = beginningValues[fy2028ColumnIndex] + changeValues[fy2028ColumnIndex];
    }
    bodyRows[beginningFundBalanceRowIndex] = rowHtml("Beginning Fund Balance", beginningValues, "wc-table-subtotal-row");

    const endingValues = changeValues.map((v, i) => v + beginningValues[i]);
    bodyRows.push(rowHtml("Estimated Ending Fund Balance", endingValues, "wc-table-subtotal-row"));

    // Fund Financial Schedules always show every historical year -- there
    // is no prior-years toggle on this page (see [fund financial schedule
    // years always visible]).
    const headerCells = ["ROW LABELS"].concat(
      FUND_SCHEDULE_YEAR_COLUMNS.map((c) => ({ label: c.label.toUpperCase() }))
    );

    return (
      '<div class="wc-budget-lines-card show-prior-years">' +
      '<div class="wc-table-wrap">' +
      '<div class="wc-table-label-row wc-fund-financial-label-row">' +
      '<p class="wc-table-label wc-fund-financial-table-title">' + escapeHtml(caption) + "</p>" +
      "</div>" +
      '<div class="wc-data-table-scroll wc-fund-financial-schedule-scroll">' +
      '<table class="wc-data-table wc-fund-financial-schedule-table">' +
      "<thead><tr><th>" + escapeHtml(headerCells[0]) + "</th>" +
      headerCells.slice(1).map((h, i) => '<th class="wc-num' + fundScheduleColumnCellClass(i) + '">' + escapeHtml(h.label) + "</th>").join("") +
      "</tr></thead>" +
      "<tbody>" + bodyRows.join("") + "</tbody>" +
      "</table>" +
      "</div>" +
      lastUpdatedNoteHtml() +
      "</div>" +
      "</div>"
    );
  }

  // Every distinct fund code actually present in the revenue/expenditure
  // data, regardless of whether it's been added to FUND_SCHEDULE_MAJOR_FUNDS
  // / FUND_SCHEDULE_NON_MAJOR_FUNDS. The consolidated schedule must use this
  // instead of that hand-maintained list (which has already silently missed
  // a fund twice -- 106, then 102) so it can't drift out of sync with the
  // Consolidated Revenue/Expense Summary reports, which sum every fund with
  // no restriction beyond the same CONSOLIDATED_SCHEDULE_EXCLUDED_FUND_CODES
  // exclusion buildFundFinancialSchedule's own isExcludedFund already
  // applies. The major/non-major *sections* still use the curated list,
  // since each fund there needs its own labeled section.
  function allKnownFundCodes() {
    const codes = new Set();
    (cache.revenues || []).forEach((r) => {
      const code = fundCodeForRow(r);
      if (code) codes.add(code);
    });
    (cache.expenditures || []).forEach((r) => {
      const code = fundCodeForRow(r);
      if (code) codes.add(code);
    });
    // Some funds exist only in Supabase with no Google Sheet row at all
    // (e.g. the Preservation Fund) -- synthesizeMissingExpenseRows/
    // synthesizeMissingRevenueRows now add a sheet row for these, so the
    // scans above already see them via fundCodeForRow's same DEPT_CODE_
    // FUND_OVERRIDES correction. These extra scans stay as a defensive
    // backstop in case a Supabase org/object combination is excluded from
    // synthesis (e.g. an alias target or override redirect target) but
    // still needs its fund represented somewhere.
    (cache.originalBudgetRows || []).forEach((r) => {
      const code = fundCodeForRow({ Dept_Code: r.org });
      if (code) codes.add(code);
    });
    (cache.expenseActualRows || []).forEach((r) => {
      const code = fundCodeForRow({ Dept_Code: r.org });
      if (code) codes.add(code);
    });
    return Array.from(codes);
  }

  function renderFundFinancialScheduleSection(funds) {
    return funds
      .map((f) => buildFundFinancialSchedule([f.code], f.label))
      .filter(Boolean)
      .join("");
  }

  function initFundFinancialSchedulesPage() {
    const consolidatedEl = document.getElementById("consolidated-fund-financial-schedule");
    const majorEl = document.getElementById("major-fund-financial-schedules");
    const nonMajorEl = document.getElementById("non-major-fund-financial-schedules");
    const containers = [consolidatedEl, majorEl, nonMajorEl];
    if (!containers.some(Boolean)) return;

    showLoadingState(containers);

    loadBudgetData()
      .then((data) => {
        if (Object.keys(data.errors || {}).length >= data.datasetCount) {
          showErrorState(containers);
          return;
        }
        mountOrHide(consolidatedEl, buildFundFinancialSchedule(allKnownFundCodes(), "Consolidated Fund Financial Schedule"));
        mountOrHide(majorEl, renderFundFinancialScheduleSection(FUND_SCHEDULE_MAJOR_FUNDS));
        mountOrHide(nonMajorEl, renderFundFinancialScheduleSection(FUND_SCHEDULE_NON_MAJOR_FUNDS));
        bindPriorYearsToggle(consolidatedEl);
        bindPriorYearsToggle(majorEl);
        bindPriorYearsToggle(nonMajorEl);
      })
      .catch((err) => {
        console.error("WCBudgetData: failed to load budget data", err);
        showErrorState(containers);
      });
  }

  // "Summary of Interfund Transfers" page: the two sides of fund-to-fund
  // transfers, each derived from a single object/revenue code rather than
  // hand-entered. Dept_Name is used as the description since the sheets
  // don't carry a separate transfer-purpose narrative field.
  function renderInterfundTransferTable(rows, fundLabel, caption) {
    const nonZeroRows = rows.filter((r) => (r.FY2027_Proposed || 0) !== 0);
    if (!nonZeroRows.length) return "";
    const sorted = nonZeroRows.slice().sort((a, b) => {
      const fa = fundNameForRow(a), fb = fundNameForRow(b);
      return fa === fb ? (a.Dept_Name || "").localeCompare(b.Dept_Name || "") : fa.localeCompare(fb);
    });
    let total = 0;
    const bodyRows = sorted.map((r) => {
      const amt = r.FY2027_Proposed || 0;
      total += amt;
      const description = r.Note || r.Dept_Name || "";
      return (
        "<tr><td>" + escapeHtml(fundNameForRow(r)) + "</td><td>" + escapeHtml(description) + '</td><td class="wc-num">' + formatCurrency(amt) + "</td></tr>"
      );
    });
    bodyRows.push('<tr class="wc-table-total-row"><td colspan="2">Total</td><td class="wc-num">' + formatCurrency(total) + "</td></tr>");
    return renderTable({
      caption: caption,
      columns: [{ label: fundLabel }, { label: "Description" }, { label: "Amount", num: true }],
      bodyRows: bodyRows,
      showUpdated: true
    });
  }

  function renderInterfundTransfersOutTable() {
    const rows = (cache.expenditures || []).filter((r) => String(r.Object_Code || "").trim() === "591000");
    return renderInterfundTransferTable(rows, "Fund (Transferring Out)", "Interfund Transfers Out");
  }

  function renderInterfundTransfersInTable() {
    const rows = (cache.revenues || []).filter((r) => String(r.Revenue_Code || "").trim() === "381000");
    return renderInterfundTransferTable(rows, "Fund (Receiving)", "Interfund Transfers In");
  }

  function initInterfundTransfersPage() {
    initConsolidatedFundTableContainer("interfund-transfers-out-table", renderInterfundTransfersOutTable, "interfund transfers out");
    initConsolidatedFundTableContainer("interfund-transfers-in-table", renderInterfundTransfersInTable, "interfund transfers in");
  }

  // "Summary of Revenues" page: historical actuals (FY2020-FY2025) by
  // revenue category, live from the revenues sheet.
  const CONSOLIDATED_REVENUE_SUMMARY_ROWS = [
    { type: "General Government Taxes", label: "General Government Taxes" },
    { type: "Permits Fees and Special Assessments", label: "Permits, Fees, and Special Assessments" },
    { type: "Intergovernmental Revenues", label: "Intergovernmental Revenues" },
    { type: "Charges for Services", label: "Charges for Services" },
    { type: "Judgments, Fines and Forfeits", label: "Judgments, Fines and Forfeits" },
    { type: "Miscellaneous Revenue", label: "Miscellaneous Revenue" },
    { type: "Other Sources", label: "Other Sources" }
  ];

  const CONSOLIDATED_REVENUE_SUMMARY_COLUMNS = [
    { field: "FY2020_Actual", label: "FY 2020 Actuals" },
    { field: "FY2021_Actual", label: "FY 2021 Actuals" },
    { field: "FY2022_Actual", label: "FY 2022 Actuals" },
    { field: "FY2023_Actual", label: "FY 2023 Actuals" },
    { field: "FY2024_Actual", label: "FY 2024 Actuals" },
    { field: "FY2025_Actual", label: "FY 2025 Actuals" },
    { field: "FY2026_Original_Budget", label: "FY 2026 Budget" },
    { field: "FY2027_Proposed", label: "FY 2027 Proposed" },
    { field: "FY2028_Projected", label: "FY 2028 Projected", projected: true },
    { field: "FY2029_Projected", label: "FY 2029 Projected", projected: true }
  ];

  const REVENUE_PROJECTION_RATES = {
    "General Government Taxes": 0.025,
    "Intergovernmental Revenues": 0.015,
    "Charges for Services": 0.02,
    "Miscellaneous Revenue": 0.01,
    "Permits Fees and Special Assessments": 0.02,
    "Other Sources": 0,
    "Judgments, Fines and Forfeits": 0
  };

  function revenueProjectionRate(type, topic) {
    if (topic && /^(?:Ad Valorem|Property) Taxes$/.test(topic.title)) return 0;
    if (topic && topic.title === "Tourist Development Taxes") return 0.01;
    return REVENUE_PROJECTION_RATES[type] || 0;
  }

  function projectedRevenueAmount(base, type, year, topic) {
    const years = Math.max(0, Number(year) - 2027);
    return (Number(base) || 0) * Math.pow(1 + revenueProjectionRate(type, topic), years);
  }

  function projectedRevenueRowsAmount(rows, year) {
    return (rows || []).reduce((sum, row) => {
      const code = String(row.Revenue_Code || "").trim();
      const name = normalizeDeptName(row.Revenue_Name);
      const isAdValorem = code === "311000" || code === "311001" || name === "ad valorem taxes";
      const isTouristTax = ["312120", "312130", "312150", "312160", "312170"].indexOf(code) !== -1 || name === "tourist development taxes";
      const topic = isAdValorem ? { title: "Property Taxes" } : (isTouristTax ? { title: "Tourist Development Taxes" } : null);
      return sum + projectedRevenueAmount(row.FY2027_Proposed || 0, row.Revenue_Type, year, topic);
    }, 0);
  }

  function renderConsolidatedRevenueSummaryTable() {
    const rows = cache.revenues || [];
    if (!rows.length) return "";

    const totals = CONSOLIDATED_REVENUE_SUMMARY_COLUMNS.map(() => 0);
    const allMatchingRows = [];
    const revenueActualFields = new Set(BUDGET_LINE_PRIOR_YEAR_COLUMNS.filter((c) => c.actual).map((c) => c.field));

    function rawRevenueActualSummarySum(rowsToSum, field) {
      const yearMatch = /^FY(\d{4})_Actual$/.exec(field);
      if (!yearMatch || !(cache.revenueActualRows || []).length) {
        return rowsToSum.reduce((sum, r) => sum + revenueDisplayAmount(r[field] || 0), 0);
      }

      const year = Number(yearMatch[1]);
      const codes = new Set(rowsToSum.map((r) => String((r && r.Revenue_Code) || "").trim()).filter(Boolean));
      const fundCodes = new Set(rowsToSum.map((r) => fundCodeForRow(r)).filter(Boolean));
      if (!codes.size) return 0;

      // Grouped by individual revenue code (not summed as one flat
      // category -- or even one flat named-account -- total) so each
      // code's own raw ledger subtotal gets its own Math.abs(). Some
      // revenue codes (Interest, Interest (Beach Management), etc.) are
      // booked as credits/negative amounts in the raw ledger -- a
      // per-account display convention, not a genuine shortfall -- while
      // others are already positive, sometimes even under the same
      // combined name (e.g. Sale of Fixed Assets' two codes, or every
      // "Interest"-named account once collapsedBudgetLineName combines
      // them into one row). Applying Math.abs() once to a coarser total
      // that mixes oppositely-signed codes together first would let them
      // partially cancel instead of each contributing its own correctly
      // flipped positive value -- matching the same per-code granularity
      // revenueActualAmountForCodes now uses for the "View Budget Lines"
      // detail table (see the Summary of Revenues vs. its own detail
      // total mismatches this was fixed for).
      const rawTotalsByCode = new Map();
      (cache.revenueActualRows || []).forEach((row) => {
        if (Number(row.year) !== year) return;
        const code = String(row.object || "").trim();
        if (!codes.has(code)) return;
        const rowOrg = String(row.org || "").trim();
        const rowFundCode = rowOrg.slice(0, 3);
        if (CONSOLIDATED_SCHEDULE_EXCLUDED_FUND_CODES.has(rowFundCode)) return;
        if (fundCodes.size && !fundCodes.has(rowFundCode)) return;
        // Indirect Administrative Fees (369901): org 111369 (Tourist
        // Development Fund) is the paying side of the same interfund
        // transfer the General Fund/Sheriff Fund book as fee revenue --
        // see the matching backstop in sumRevenueRowsForField.
        if (code === "369901" && rowOrg === "111369") return;
        rawTotalsByCode.set(code, (rawTotalsByCode.get(code) || 0) + (Number(row.amount) || 0));
      });

      let total = 0;
      rawTotalsByCode.forEach((codeTotal) => {
        total += revenueDisplayAmount(codeTotal);
      });
      return total;
    }

    function dedupedRevenueSum(rowsToSum, field) {
      if (field === "FY2028_Projected" || field === "FY2029_Projected") {
        return projectedRevenueRowsAmount(rowsToSum, field === "FY2028_Projected" ? 2028 : 2029);
      }
      if (revenueActualFields.has(field)) {
        return rawRevenueActualSummarySum(rowsToSum, field);
      }

      if (field === "FY2026_Original_Budget") {
        const bestByKey = new Map();
        rowsToSum.forEach((r) => {
          const key = revenueBudgetUniqueKey(r);
          const val = revenueBudgetMergeContribution(r);
          if (!bestByKey.has(key) || val > bestByKey.get(key)) bestByKey.set(key, val);
        });
        return Array.from(bestByKey.values()).reduce((sum, val) => sum + val, 0);
      }
      return rowsToSum.reduce((sum, r) => {
        return sum + (r[field] || 0);
      }, 0);
    }

    const isReportedElsewhere = (r) =>
      String(r.Revenue_Code || "").trim() === "381000" ||
      CONSOLIDATED_SCHEDULE_EXCLUDED_FUND_CODES.has(fundCodeForRow(r));

    const bodyRows = CONSOLIDATED_REVENUE_SUMMARY_ROWS.map((spec, specIndex) => {
      // Revenue_Code 381000 (Interfund Group Transfer In) is reported on
      // the Summary of Interfund Transfers page instead, and the
      // Self-Insurance Fund (503) is an Internal Service fund rather than
      // a governmental one, so both are excluded here.
      const matching = rows.filter((r) => r.Revenue_Type === spec.type && !isReportedElsewhere(r));
      // Mosquito Control levies its own Ad Valorem millage on top of the
      // County's General Fund millage, but both land in this same
      // "General Government Taxes" row -- there's no separate Ad Valorem
      // line on this table. Its rows are relabeled (only in the copy fed to
      // the "View Budget Lines" detail below, not in the main row's own
      // totals) so that detail's combineByName grouping breaks Mosquito
      // Control's share out onto its own line instead of folding it into
      // the single combined "Ad Valorem Taxes" line -- visible only when a
      // reader opens Budget Lines, not on the main table.
      let matchingForDetail = matching.map((r) => {
        const isMosquitoAdValorem = spec.type === "General Government Taxes" &&
          normalizeDeptName(r.Revenue_Name) === "ad valorem taxes" && fundCodeForRow(r) === "105";
        return isMosquitoAdValorem ? { ...r, Revenue_Name: "Ad Valorem Taxes (Mosquito Control Fund)" } : r;
      });
      if (spec.type === "General Government Taxes") {
        const mosquitoAdValoremRows = departmentFinancialDisplayRows("Mosquito Control").revenueRows
          .filter((r) => normalizeDeptName(r.Revenue_Name) === "ad valorem taxes")
          .map((r) => ({ ...r, Revenue_Name: "Ad Valorem Taxes (Mosquito Control Fund)" }));
        if (mosquitoAdValoremRows.length) {
          matchingForDetail = matchingForDetail
            .filter((r) => normalizeDeptName(r.Revenue_Name) !== "ad valorem taxes mosquito control fund")
            .concat(mosquitoAdValoremRows);
        }
      }
      allMatchingRows.push(...matchingForDetail);
      const individualRevenueTotals = new Map();
      matchingForDetail.forEach((row) => {
        const name = String(row.Revenue_Name || "Unclassified Revenue").trim() || "Unclassified Revenue";
        const entry = individualRevenueTotals.get(name) || { rows: [] };
        entry.rows.push(row);
        individualRevenueTotals.set(name, entry);
      });
      const individualRevenueHtml = Array.from(individualRevenueTotals.entries())
        .sort((a, b) => dedupedRevenueSum(b[1].rows, "FY2027_Proposed") - dedupedRevenueSum(a[1].rows, "FY2027_Proposed"))
        .map(([name, values]) => '<tr><th scope="row">' + escapeHtml(name) + '</th>' + CONSOLIDATED_REVENUE_SUMMARY_COLUMNS.map((col) => '<td class="wc-num">' + formatCurrency(dedupedRevenueSum(values.rows, col.field)) + '</td>').join("") + '</tr>')
        .join("");
      const individualRevenueTableHtml = individualRevenueHtml
        ? '<div class="wc-revenue-classification-detail-scroll"><table><thead><tr><th>Revenue</th>' + CONSOLIDATED_REVENUE_SUMMARY_COLUMNS.map((col) => '<th class="wc-num">' + escapeHtml(col.label) + '</th>').join("") + '</tr></thead><tbody>' + individualRevenueHtml + '</tbody></table></div>'
        : "";
      const detailId = "wc-revenue-classification-" + specIndex;
      const classificationLabelHtml = individualRevenueTableHtml
        ? '<button type="button" class="wc-revenue-classification-toggle" data-revenue-classification-toggle="' + detailId + '" aria-controls="' + detailId + '" aria-expanded="false">' + escapeHtml(spec.label) + '</button>'
        : escapeHtml(spec.label);
      return (
        "<tr><td>" + classificationLabelHtml + "</td>" +
        CONSOLIDATED_REVENUE_SUMMARY_COLUMNS.map((col, i) => {
          const sum = dedupedRevenueSum(matching, col.field);
          totals[i] += sum;
          const extraYear = col.field !== "FY2026_Original_Budget" && col.field !== "FY2027_Proposed";
          return '<td class="wc-num' + (extraYear ? " wc-prior-year" : "") + (col.field === "FY2027_Proposed" ? " wc-revenue-budget-year" : "") + (col.field === "FY2028_Projected" ? " wc-fy-2028" : "") + (col.field === "FY2029_Projected" ? " wc-fy-2029" : "") + (col.projected ? " wc-revenue-projected" : "") + '">' + formatCurrency(sum) + "</td>";
        }).join("") +
        "</tr>" +
        (individualRevenueTableHtml ? '<tr id="' + detailId + '" class="wc-revenue-classification-detail" hidden><td colspan="' + (CONSOLIDATED_REVENUE_SUMMARY_COLUMNS.length + 1) + '"><div><strong>Individual revenues</strong>' + individualRevenueTableHtml + '</div></td></tr>' : "")
      );
    });
    // Catch-all for any row whose Revenue_Type doesn't match a known
    // category above -- e.g. a row synthesized from a Supabase-only
    // account with no COA classification (see synthesizeMissingRevenueRows).
    // Without this, an unrecognized type would be silently excluded from
    // every category row *and* from Total, which defeats the entire point
    // of never dropping a Supabase dollar.
    const knownRevenueTypes = new Set(CONSOLIDATED_REVENUE_SUMMARY_ROWS.map((spec) => spec.type));
    const unclassifiedRevenueRows = rows.filter((r) => !knownRevenueTypes.has(r.Revenue_Type) && !isReportedElsewhere(r));
    allMatchingRows.push(...unclassifiedRevenueRows);
    const unclassifiedRevenueValues = CONSOLIDATED_REVENUE_SUMMARY_COLUMNS.map((col, i) => {
      const sum = dedupedRevenueSum(unclassifiedRevenueRows, col.field);
      totals[i] += sum;
      return sum;
    });
    // Hidden when every column is exactly $0 -- still folded into totals
    // above either way, but an always-zero row is just visual noise on a
    // table that has nothing unclassified.
    if (unclassifiedRevenueValues.some((v) => v !== 0)) {
      bodyRows.push(
        '<tr class="wc-table-unclassified-row"><td>Unclassified</td>' +
        unclassifiedRevenueValues.map((v, i) => '<td class="wc-num' + (CONSOLIDATED_REVENUE_SUMMARY_COLUMNS[i].field !== "FY2026_Original_Budget" && CONSOLIDATED_REVENUE_SUMMARY_COLUMNS[i].field !== "FY2027_Proposed" ? " wc-prior-year" : "") + (CONSOLIDATED_REVENUE_SUMMARY_COLUMNS[i].field === "FY2027_Proposed" ? " wc-revenue-budget-year" : "") + (CONSOLIDATED_REVENUE_SUMMARY_COLUMNS[i].field === "FY2028_Projected" ? " wc-fy-2028" : "") + (CONSOLIDATED_REVENUE_SUMMARY_COLUMNS[i].field === "FY2029_Projected" ? " wc-fy-2029" : "") + (CONSOLIDATED_REVENUE_SUMMARY_COLUMNS[i].projected ? " wc-revenue-projected" : "") + '">' + formatCurrency(v) + "</td>").join("") +
        "</tr>"
      );
    }
    bodyRows.push(
      '<tr class="wc-table-total-row"><td>Total</td>' +
      totals.map((t, i) => '<td class="wc-num' + (CONSOLIDATED_REVENUE_SUMMARY_COLUMNS[i].field !== "FY2026_Original_Budget" && CONSOLIDATED_REVENUE_SUMMARY_COLUMNS[i].field !== "FY2027_Proposed" ? " wc-prior-year" : "") + (CONSOLIDATED_REVENUE_SUMMARY_COLUMNS[i].field === "FY2027_Proposed" ? " wc-revenue-budget-year" : "") + (CONSOLIDATED_REVENUE_SUMMARY_COLUMNS[i].field === "FY2028_Projected" ? " wc-fy-2028" : "") + (CONSOLIDATED_REVENUE_SUMMARY_COLUMNS[i].field === "FY2029_Projected" ? " wc-fy-2029" : "") + (CONSOLIDATED_REVENUE_SUMMARY_COLUMNS[i].projected ? " wc-revenue-projected" : "") + '">' + formatCurrency(t) + "</td>").join("") +
      "</tr>"
    );

    const showPrior = true;
    return (
      '<h2>Revenue Ledger</h2><p>Compare revenue by classification across actual, budgeted, and projected fiscal years.</p>' +
      '<div class="wc-budget-lines-card' + (showPrior ? " show-prior-years" : "") + '">' +
      '<div class="wc-table-wrap">' +
      '<div class="wc-table-label-row">' +
      '<p class="wc-table-label">Revenue Ledger</p>' +
      "" +
      "</div>" +
      '<div class="wc-data-table-scroll">' +
      '<table class="wc-data-table">' +
      "<thead><tr><th></th>" +
      CONSOLIDATED_REVENUE_SUMMARY_COLUMNS.map((c) => '<th class="wc-num' + (c.field !== "FY2026_Original_Budget" && c.field !== "FY2027_Proposed" ? " wc-prior-year" : "") + (c.field === "FY2027_Proposed" ? " wc-revenue-budget-year" : "") + (c.field === "FY2028_Projected" ? " wc-fy-2028" : "") + (c.field === "FY2029_Projected" ? " wc-fy-2029" : "") + (c.projected ? " wc-revenue-projected" : "") + '">' + escapeHtml(c.label) + "</th>").join("") +
      "</tr></thead>" +
      "<tbody>" + bodyRows.join("") + "</tbody>" +
      "</table>" +
      "</div>" +
      "</div>" +
      renderTableFooterRow(allMatchingRows, null, "revenue", false) +
      "" +
      "</div>"
    );
  }

  function initConsolidatedRevenueSummaryPage() {
    const bindRevenueClassificationToggles = (container) => {
      bindPriorYearsToggle(container);
      container.querySelectorAll("[data-revenue-classification-toggle]").forEach((button) => {
        button.addEventListener("click", () => {
          const detail = document.getElementById(button.dataset.revenueClassificationToggle);
          if (!detail) return;
          const expanded = detail.hidden;
          detail.hidden = !expanded;
          button.setAttribute("aria-expanded", String(expanded));
          button.classList.toggle("is-expanded", expanded);
        });
      });
    };
    initConsolidatedFundTableContainer(
      "consolidated-revenue-summary-table",
      renderConsolidatedRevenueSummaryTable,
      "consolidated revenue summary",
      bindRevenueClassificationToggles
    );
  }

  // "Summary of Expenses" page: a Consolidated Expense Summary showing just
  // the 8 functional Activity classifications (the same level of detail as
  // the Consolidated Revenue Summary's Revenue_Type rows), followed by one
  // narrative + stacked-bar-chart section per Activity.
  const EXPENSE_ACTIVITY_SECTIONS = [
    { containerId: "expense-activity-general-government", activity: "General Government" },
    { containerId: "expense-activity-public-safety", activity: "Public Safety" },
    { containerId: "expense-activity-physical-environment", activity: "Physical Environment" },
    { containerId: "expense-activity-transportation", activity: "Transportation" },
    { containerId: "expense-activity-economic-environment", activity: "Economic Environment" },
    { containerId: "expense-activity-human-services", activity: "Human Services" },
    { containerId: "expense-activity-culture-and-recreation", activity: "Culture and Recreation" },
    { containerId: "expense-activity-court-related-cost", activity: "Court Related Cost", title: "Court-Related Cost" },
    { containerId: "expense-activity-other-uses", activity: "Other Uses" }
  ];

  function renderConsolidatedExpenseSummaryTable() {
    // The Activity sheet has a few inconsistently-cased entries (e.g.
    // "economic Environment"), so matching is done case-insensitively.
    // Interfund transfers/other financing rows are reported on the Summary
    // of Interfund Transfers page instead, same as the revenue summary
    // excludes Revenue_Code 381000; the Self-Insurance Fund (503) is an
    // Internal Service fund rather than a governmental one.
    const matchesFundAndFinancing = (r) =>
      !CONSOLIDATED_SCHEDULE_EXCLUDED_FUND_CODES.has(fundCodeForRow(r)) &&
      !isOtherFinancingExpenseRow(r);
    const rows = (cache.expenditures || []).filter(matchesFundAndFinancing);
    if (!rows.length) return "";

    // FY2020-FY2026 columns are summed from the shared deduped layer
    // instead of the raw display rows -- see buildDedupedHistoricalExpenseRows.
    // FY2027 Proposed keeps summing the raw rows directly, since it isn't
    // subject to the same display-row duplication.
    const dedupedRows = (cache.dedupedExpenseRows || []).filter(matchesFundAndFinancing);

    function columnSum(matchingRaw, matchingDeduped, col) {
      const source = HISTORICAL_EXPENSE_DEDUP_FIELD_SET.has(col.field) ? matchingDeduped : matchingRaw;
      return source.reduce((s, r) => s + (r[col.field] || 0), 0);
    }

    const lastIndex = CONSOLIDATED_REVENUE_SUMMARY_COLUMNS.length - 1;
    const totals = CONSOLIDATED_REVENUE_SUMMARY_COLUMNS.map(() => 0);
    const allMatchingRows = [];
    const allMatchingDedupedRows = [];
    const bodyRows = EXPENSE_ACTIVITY_SECTIONS.map((section) => {
      const activityNorm = section.activity.toLowerCase();
      const matching = rows.filter((r) => expenseActivityForRow(r).toLowerCase() === activityNorm);
      const matchingDeduped = dedupedRows.filter((r) => expenseActivityForRow(r).toLowerCase() === activityNorm);
      allMatchingRows.push(...matching);
      allMatchingDedupedRows.push(...matchingDeduped);
      return (
        "<tr><td>" + escapeHtml(section.title || section.activity) + "</td>" +
        CONSOLIDATED_REVENUE_SUMMARY_COLUMNS.map((col, i) => {
          const sum = columnSum(matching, matchingDeduped, col);
          totals[i] += sum;
          return '<td class="wc-num' + (i < lastIndex ? " wc-prior-year" : "") + '">' + formatCurrency(sum) + "</td>";
        }).join("") +
        "</tr>"
      );
    });
    // Catch-all for any row whose activity doesn't match a known section
    // above -- e.g. a row synthesized from a Supabase-only account with no
    // COA classification (see synthesizeMissingExpenseRows). Without this,
    // an unrecognized activity would be silently excluded from every
    // section *and* from Total, which defeats the entire point of never
    // dropping a Supabase dollar.
    const knownActivities = new Set(EXPENSE_ACTIVITY_SECTIONS.map((s) => s.activity.toLowerCase()));
    const unclassifiedExpenseRows = rows.filter((r) => !knownActivities.has(expenseActivityForRow(r).toLowerCase()));
    const unclassifiedDedupedRows = dedupedRows.filter((r) => !knownActivities.has(expenseActivityForRow(r).toLowerCase()));
    allMatchingRows.push(...unclassifiedExpenseRows);
    allMatchingDedupedRows.push(...unclassifiedDedupedRows);
    const unclassifiedExpenseValues = CONSOLIDATED_REVENUE_SUMMARY_COLUMNS.map((col, i) => {
      const sum = columnSum(unclassifiedExpenseRows, unclassifiedDedupedRows, col);
      totals[i] += sum;
      return sum;
    });
    // Hidden when every column is exactly $0 -- still folded into totals
    // above either way, but an always-zero row is just visual noise on a
    // table that has nothing unclassified.
    if (unclassifiedExpenseValues.some((v) => v !== 0)) {
      bodyRows.push(
        '<tr class="wc-table-unclassified-row"><td>Unclassified</td>' +
        unclassifiedExpenseValues.map((v, i) => '<td class="wc-num' + (i < lastIndex ? " wc-prior-year" : "") + '">' + formatCurrency(v) + "</td>").join("") +
        "</tr>"
      );
    }
    bodyRows.push(
      '<tr class="wc-table-total-row"><td>Total</td>' +
      totals.map((t, i) => '<td class="wc-num' + (i < lastIndex ? " wc-prior-year" : "") + '">' + formatCurrency(t) + "</td>").join("") +
      "</tr>"
    );

    const showPrior = getShowPriorYears();
    return (
      '<div class="wc-budget-lines-card' + (showPrior ? " show-prior-years" : "") + '">' +
      '<div class="wc-table-wrap">' +
      '<div class="wc-table-label-row">' +
      '<p class="wc-table-label">Consolidated Expense Summary</p>' +
      priorYearsToggleHtml(showPrior) +
      "</div>" +
      '<div class="wc-data-table-scroll">' +
      '<table class="wc-data-table">' +
      "<thead><tr><th></th>" +
      CONSOLIDATED_REVENUE_SUMMARY_COLUMNS.map((c, i) => '<th class="wc-num' + (i < lastIndex ? " wc-prior-year" : "") + '">' + escapeHtml(c.label) + "</th>").join("") +
      "</tr></thead>" +
      "<tbody>" + bodyRows.join("") + "</tbody>" +
      "</table>" +
      "</div>" +
      "</div>" +
      renderExpenseDepartmentBudgetLinesFooter(allMatchingRows, allMatchingDedupedRows) +
      "</div>"
    );
  }

  // "Budget Change Summary": how each Department's
  // FY2027 Proposed expenditures compare to its FY2026 Original Budget,
  // split into Personnel, Operating, and Capital changes (both increases
  // and decreases), plus an "Other" catch-all (debt service, grants, and
  // any other non-Personnel/Operating/Capital object type) so every
  // dollar is accounted for and each department's row -- and the table's
  // Total row -- foots to the same FY2026/FY2027 totals as the
  // Consolidated Expense Summary, not just a subset of spending. Capital
  // is what pulls in funds like Capital Improvement/Capital Projects,
  // whose spending is almost entirely Capital Outlay. Reuses the same
  // fund/financing filter and FY2026/FY2027 dedup rules as the
  // Consolidated Expense Summary above, grouped by department (via the
  // same representative-name resolution as the "View Budget Lines" detail
  // table) and by Object_Type instead of by Activity.
  function renderConsolidatedBudgetChangesTable(container) {
    if (!container) return;
    const matchesFundAndFinancing = (r) =>
      !CONSOLIDATED_SCHEDULE_EXCLUDED_FUND_CODES.has(fundCodeForRow(r)) &&
      !isOtherFinancingExpenseRow(r);
    const rows = (cache.expenditures || []).filter(matchesFundAndFinancing);
    if (!rows.length) {
      container.innerHTML = '<div class="wc-data-empty">No budget change data is available.</div>';
      return;
    }

    const dedupedRows = (cache.dedupedExpenseRows || []).filter(matchesFundAndFinancing);

    function columnSum(matchingRaw, matchingDeduped, field) {
      const source = HISTORICAL_EXPENSE_DEDUP_FIELD_SET.has(field) ? matchingDeduped : matchingRaw;
      return source.reduce((s, r) => s + (r[field] || 0), 0);
    }

    // Built from the full, unfiltered rows/dedupedRows so a department's
    // representative name stays consistent regardless of which Department
    // or Fund filter is currently selected below.
    const repByCodeAndName = clusterDeptNamesByCode(rows.concat(dedupedRows));
    function representativeName(r) {
      return collapsedDeptRowName(expenseDisplayDeptName(repByCodeAndName, r));
    }
    // Groups departments the same way the site's own directory does --
    // Constitutional Officers first, then Statutory & Other Agency Funding
    // (the "Autonomous Entities" section), then regular County Departments,
    // then anything else (special-revenue/other funds not on the
    // Departments directory) -- by reusing the same wcBudgetPages section
    // lookup departmentPageHref already relies on, instead of hardcoding a
    // second department list here.
    const DEPARTMENT_GROUP_ORDER = { "Constitutional Officers": 0, "Autonomous Entities": 1, "Departments": 2 };
    function departmentGroupOrder(deptName) {
      const norm = normalizeDeptName(deptName);
      const pages = window.wcBudgetPages || [];
      const title = DEPARTMENT_PAGE_TITLE_ALIASES.get(norm) || deptName;
      const match =
        pages.find((p) => normalizeDeptName(p.title) === normalizeDeptName(title)) ||
        pages.find((p) => p.section === "Departments" && normalizeDeptName(p.title) === norm);
      const order = match && DEPARTMENT_GROUP_ORDER[match.section];
      return typeof order === "number" ? order : 3;
    }
    // Object_Type values in the sheet aren't perfectly consistent (a few
    // synthesized rows say "Operating Expenditures" instead of "Operating
    // Expenses"), so Operating/Capital are matched loosely while Personnel
    // stays an exact match -- everything else (debt service, grants,
    // blank) is bucketed as "Other" rather than dropped, so each
    // department's row -- and this table's Total row -- foots to its real
    // FY2026/FY2027 totals instead of silently excluding non-Personnel/
    // Operating/Capital spending.
    function categoryForRow(r) {
      const type = String(r.Object_Type || "").trim();
      if (type === "Personnel Services") return "Personnel";
      if (/operating/i.test(type)) return "Operating";
      if (/capital/i.test(type)) return "Capital";
      return "Other";
    }
    const CATEGORY_ORDER = { Personnel: 0, Operating: 1, Capital: 2, Other: 3 };

    const departments = uniqueSorted(rows.map(representativeName));
    // Expenditure rows carry no Fund_Name field of their own (only some
    // synthesized/derived rows elsewhere do) -- fundNameForRow looks it up
    // from fundCodeForRow(r) against cache.funds instead, same as every
    // other fund-scoped filter/label on the site.
    const funds = uniqueSorted(rows.map(fundNameForRow));

    container.innerHTML =
      '<div class="wc-budget-lines-card">' +
      '<div class="wc-table-wrap">' +
      '<section class="wc-budget-executive" aria-label="Budget change overview"></section>' +
      '<div class="wc-filter-bar wc-machinery-picker">' +
      filterComboFieldHtml({ idPrefix: "wcBudgetChangeDept", label: "Department", options: departments }) +
      filterComboFieldHtml({ idPrefix: "wcBudgetChangeFund", label: "Fund", options: funds }) +
      "</div>" +
      '<div class="wc-data-table-scroll wc-financial-summary-table"></div>' +
      "</div>" +
      "</div>";

    const tableEl = container.querySelector(".wc-financial-summary-table");
    const executiveEl = container.querySelector(".wc-budget-executive");
    let selectedDept = "";
    let selectedFund = "";
    // null = default department-group order; once the % Change header is
    // clicked, toggles highest-to-lowest / lowest-to-highest on every
    // subsequent click.
    let pctSortDirection = null;

    // Each department+category combination (e.g. "Sheriff's Office" /
    // "Personnel") is grouped separately so a department with both a
    // personnel increase and an operating decrease shows as two rows,
    // rather than netting them into one misleading total.
    function buildEntries(filteredRows, filteredDedupedRows) {
      const labelByKey = new Map();
      function keyFor(r) {
        const category = categoryForRow(r);
        const dept = representativeName(r);
        const key = normalizeDeptName(dept) + "|" + category;
        if (!labelByKey.has(key)) labelByKey.set(key, { dept, category });
        return key;
      }
      function groupByKey(source) {
        const byKey = new Map();
        source.forEach((r) => {
          const key = keyFor(r);
          if (!byKey.has(key)) byKey.set(key, []);
          byKey.get(key).push(r);
        });
        return byKey;
      }
      const rawByKey = groupByKey(filteredRows);
      const dedupedByKey = groupByKey(filteredDedupedRows);

      const entries = [];
      let totalPrior = 0;
      let totalProposed = 0;
      labelByKey.forEach((label, key) => {
        const matching = rawByKey.get(key) || [];
        const matchingDeduped = dedupedByKey.get(key) || [];
        const prior = columnSum(matching, matchingDeduped, "FY2026_Original_Budget");
        const proposed = columnSum(matching, matchingDeduped, "FY2027_Proposed");
        totalPrior += prior;
        totalProposed += proposed;
        const change = proposed - prior;
        // Rows with no year-over-year change are dropped -- this table is
        // about what changed, not a full department budget breakdown.
        if (change === 0) return;
        entries.push({ dept: label.dept, category: label.category, prior, proposed, change });
      });
      return { entries, totalPrior, totalProposed };
    }

    function compactCurrency(value) {
      const amount = Math.abs(value || 0);
      const sign = value < 0 ? "−" : "";
      if (amount >= 1000000000) return sign + "$" + (amount / 1000000000).toFixed(amount >= 10000000000 ? 1 : 2).replace(/\.0+$/, "") + "B";
      if (amount >= 1000000) return sign + "$" + (amount / 1000000).toFixed(amount >= 10000000 ? 1 : 2).replace(/\.0+$/, "") + "M";
      if (amount >= 1000) return sign + "$" + Math.round(amount / 1000).toLocaleString("en-US") + "K";
      return sign + formatCurrency(amount);
    }

    function executiveDepartmentSummaries() {
      const rawByDept = new Map();
      const dedupedByDept = new Map();
      function addTo(map, source) {
        source.forEach((row) => {
          const dept = representativeName(row);
          if (!map.has(dept)) map.set(dept, []);
          map.get(dept).push(row);
        });
      }
      addTo(rawByDept, rows);
      addTo(dedupedByDept, dedupedRows);
      return uniqueSorted(Array.from(rawByDept.keys()).concat(Array.from(dedupedByDept.keys()))).map((dept) => {
        const raw = rawByDept.get(dept) || [];
        const deduped = dedupedByDept.get(dept) || [];
        const prior = columnSum(raw, deduped, "FY2026_Original_Budget");
        const proposed = columnSum(raw, deduped, "FY2027_Proposed");
        const change = proposed - prior;
        const pct = prior !== 0 ? change / prior : 0;
        return { dept, prior, proposed, change, pct };
      });
    }

    function renderExecutiveSummary() {
      if (!executiveEl) return;
      const summaries = executiveDepartmentSummaries();
      const increases = summaries.filter((item) => item.change > 0).sort((a, b) => b.change - a.change);
      const decreases = summaries.filter((item) => item.change < 0).sort((a, b) => a.change - b.change);
      const totalPrior = summaries.reduce((sum, item) => sum + item.prior, 0);
      const totalProposed = summaries.reduce((sum, item) => sum + item.proposed, 0);
      const netChange = totalProposed - totalPrior;
      const netPct = consolidatedBudgetChangePercent();
      const largestIncrease = increases[0] || null;
      const maxAbsChange = Math.max.apply(null, summaries.map((item) => Math.abs(item.change)).concat([1]));
      const chartItems = summaries.filter((item) => item.change !== 0).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 10);

      function kpiCard(label, value, detail, tone) {
        return '<article class="wc-budget-kpi ' + (tone || "neutral") + '"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong>' + (detail ? '<small>' + escapeHtml(detail) + "</small>" : "") + "</article>";
      }

      const chartHtml = chartItems.map((item) => {
        const width = Math.max(3, Math.abs(item.change) / maxAbsChange * 50);
        const positive = item.change > 0;
        return '<button type="button" class="wc-budget-diverging-row ' + (positive ? "increase" : "decrease") + '" data-budget-change-dept="' + escapeHtml(item.dept) + '" title="' + escapeHtml(formatCurrency(item.change)) + '" aria-label="Filter table to ' + escapeHtml(item.dept) + ', change ' + escapeHtml(formatCurrency(item.change)) + '">' +
          '<span class="wc-budget-diverging-name">' + escapeHtml(item.dept) + '</span><span class="wc-budget-diverging-plot"><span class="wc-budget-diverging-axis" aria-hidden="true"></span><span class="wc-budget-diverging-bar" style="width:' + width.toFixed(2) + '%"></span></span><strong>' + escapeHtml(compactCurrency(item.change)) + "</strong></button>";
      }).join("");

      executiveEl.innerHTML =
        '<div class="wc-budget-kpi-grid">' +
          kpiCard("Total FY2027 proposed budget", compactCurrency(totalProposed), formatCurrency(totalProposed), "neutral") +
          kpiCard("Net dollar change", compactCurrency(netChange), netChange >= 0 ? "Increase from FY2026" : "Reduction from FY2026", netChange >= 0 ? "increase" : "decrease") +
          kpiCard("Net percent change", (netPct >= 0 ? "+" : "") + (netPct * 100).toFixed(1) + "%", "Countywide change", netPct >= 0 ? "increase" : "decrease") +
          kpiCard("Largest budget increase", largestIncrease ? compactCurrency(largestIncrease.change) : "None", largestIncrease ? largestIncrease.dept : "No department increase", "increase") +
        "</div>" +
        '<div class="wc-budget-executive-grid"><section class="wc-budget-diverging" aria-labelledby="wcBudgetChartTitle"><div class="wc-budget-diverging-head"><div><h3 id="wcBudgetChartTitle">Largest Budget Changes</h3><p>Select a department to filter the detailed table.</p></div><div class="wc-budget-diverging-legend"><span class="decrease">Decrease</span><span class="increase">Increase</span></div></div><div class="wc-budget-diverging-chart">' + chartHtml + "</div></section></div>";
    }

    function showFiltered() {
      const deptName = selectedDept;
      const fundName = selectedFund;
      // Department and Fund are mutually exclusive filters (see the
      // combo onSelect handlers below, which clear whichever filter isn't
      // being used) -- at most one of these predicates is ever active.
      const filteredRows = fundName
        ? rows.filter((r) => fundNameForRow(r) === fundName)
        : deptName
        ? rows.filter((r) => representativeName(r) === deptName)
        : rows;
      const filteredDedupedRows = fundName
        ? dedupedRows.filter((r) => fundNameForRow(r) === fundName)
        : deptName
        ? dedupedRows.filter((r) => representativeName(r) === deptName)
        : dedupedRows;

      const { entries, totalPrior, totalProposed } = buildEntries(filteredRows, filteredDedupedRows);
      if (!entries.length) {
        mountOrHide(tableEl, '<div class="wc-data-empty">No rows match the current filters.</div>');
        return;
      }

      // Grouped by department -- each department is one row/toggle in the
      // outer table, with its Personnel/Operating/Capital/Other split
      // revealed as a nested breakdown table when clicked (see the
      // wc-fund-activity-toggle click handler, shared with the Fund
      // Financial Schedules page).
      const byDept = new Map();
      entries.forEach((entry) => {
        if (!byDept.has(entry.dept)) byDept.set(entry.dept, []);
        byDept.get(entry.dept).push(entry);
      });
      let deptSummaries = Array.from(byDept.keys()).map((dept) => {
        const deptEntries = byDept.get(dept).sort((a, b) => CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category]);
        const prior = deptEntries.reduce((s, e) => s + e.prior, 0);
        const proposed = deptEntries.reduce((s, e) => s + e.proposed, 0);
        const change = proposed - prior;
        const pct = prior !== 0 ? change / prior : 0;
        return { dept, deptEntries, prior, proposed, change, pct };
      });
      if (pctSortDirection === "desc") {
        deptSummaries.sort((a, b) => b.pct - a.pct);
      } else if (pctSortDirection === "asc") {
        deptSummaries.sort((a, b) => a.pct - b.pct);
      } else {
        deptSummaries.sort((a, b) =>
          departmentGroupOrder(a.dept) - departmentGroupOrder(b.dept) || a.dept.localeCompare(b.dept)
        );
      }

      const bodyRows = deptSummaries.map((summary) => {
        const { dept, deptEntries, prior, proposed, change, pct } = summary;
        const deptHref = departmentPageHref(dept);
        const deptLabel = escapeHtml(dept);

        budgetChangeDeptCounter += 1;
        const detailId = "wc-budget-change-detail-" + budgetChangeDeptCounter;
        const detailTable =
          '<div class="wc-fund-activity-detail">' +
          '<table class="wc-data-table wc-fund-activity-detail-table">' +
          "<thead><tr><th>Category</th>" +
          '<th class="wc-num">FY 2026 Budget</th>' +
          '<th class="wc-num">FY 2027 Budget</th>' +
          '<th class="wc-num">Change</th>' +
          '<th class="wc-num">% Change</th>' +
          "</tr></thead><tbody>" +
          deptEntries.map((e) => {
            const ePct = e.prior !== 0 ? e.change / e.prior : 0;
            return (
              "<tr><td>" + escapeHtml(e.category) + "</td>" +
              '<td class="wc-num">' + formatCurrency(e.prior) + "</td>" +
              '<td class="wc-num">' + formatCurrency(e.proposed) + "</td>" +
              '<td class="wc-num">' + formatCurrency(e.change) + "</td>" +
              '<td class="wc-num">' + (ePct >= 0 ? "+" : "") + (ePct * 100).toFixed(1) + "%</td>" +
              "</tr>"
            );
          }).join("") +
          "</tbody></table></div>";

        return (
          '<tr class="wc-fund-activity-row wc-fund-activity-toggle" data-target="' + detailId + '" tabindex="0" role="button" aria-expanded="false">' +
          "<td>" + (deptHref ? '<a class="wc-department-row-link" href="' + escapeHtml(deptHref) + '">' + deptLabel + "</a>" : deptLabel) +
          '<span class="wc-fund-activity-chevron" aria-hidden="true"></span></td>' +
          '<td class="wc-num">' + formatCurrency(prior) + "</td>" +
          '<td class="wc-num">' + formatCurrency(proposed) + "</td>" +
          '<td class="wc-num">' + formatCurrency(change) + "</td>" +
          '<td class="wc-num">' + (pct >= 0 ? "+" : "") + (pct * 100).toFixed(1) + "%</td>" +
          "</tr>" +
          '<tr class="wc-fund-activity-detail-row" id="' + detailId + '" hidden><td colspan="5">' + detailTable + "</td></tr>"
        );
      });

      const totalChange = totalProposed - totalPrior;
      const totalPct = totalPrior !== 0 ? totalChange / totalPrior : 0;
      bodyRows.push(
        '<tr class="wc-table-total-row"><td>Total</td>' +
        '<td class="wc-num">' + formatCurrency(totalPrior) + "</td>" +
        '<td class="wc-num">' + formatCurrency(totalProposed) + "</td>" +
        '<td class="wc-num">' + formatCurrency(totalChange) + "</td>" +
        '<td class="wc-num">' + (totalPct >= 0 ? "+" : "") + (totalPct * 100).toFixed(1) + "%</td>" +
        "</tr>"
      );

      const pctArrow = pctSortDirection === "asc" ? " ▲" : pctSortDirection === "desc" ? " ▼" : "";
      mountOrHide(
        tableEl,
        '<table class="wc-data-table">' +
        "<thead><tr><th>Department</th>" +
        '<th class="wc-num">FY 2026 Budget</th>' +
        '<th class="wc-num">FY 2027 Budget</th>' +
        '<th class="wc-num">Change</th>' +
        '<th class="wc-num"><button type="button" class="wc-sortable-column-header" data-budget-change-pct-sort aria-label="Sort by percent change">% Change' + pctArrow + "</button></th>" +
        "</tr></thead>" +
        "<tbody>" + bodyRows.join("") + "</tbody>" +
        "</table>"
      );
    }

    tableEl.addEventListener("click", (event) => {
      if (!event.target.closest("[data-budget-change-pct-sort]")) return;
      pctSortDirection = pctSortDirection === "desc" ? "asc" : "desc";
      showFiltered();
    });

    // Department and Fund are mutually exclusive -- picking one clears
    // whatever was selected in the other, rather than combining both as an
    // AND filter.
    const deptCombo = setupFilterCombo({
      input: container.querySelector("#wcBudgetChangeDeptInput"),
      results: container.querySelector("#wcBudgetChangeDeptResults"),
      options: departments,
      getCurrentValue: () => selectedDept,
      onSelect: (value) => {
        selectedDept = value;
        if (value) {
          selectedFund = "";
          fundCombo.setValue("");
        }
        showFiltered();
      }
    });
    const fundCombo = setupFilterCombo({
      input: container.querySelector("#wcBudgetChangeFundInput"),
      results: container.querySelector("#wcBudgetChangeFundResults"),
      options: funds,
      getCurrentValue: () => selectedFund,
      onSelect: (value) => {
        selectedFund = value;
        if (value) {
          selectedDept = "";
          deptCombo.setValue("");
        }
        showFiltered();
      }
    });
    executiveEl.addEventListener("click", (event) => {
      const departmentButton = event.target.closest("[data-budget-change-dept]");
      if (!departmentButton) return;
      selectedDept = departmentButton.dataset.budgetChangeDept || "";
      selectedFund = "";
      deptCombo.setValue(selectedDept);
      fundCombo.setValue("");
      showFiltered();
      const filterBar = container.querySelector(".wc-filter-bar");
      if (filterBar) filterBar.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    renderExecutiveSummary();
    showFiltered();
  }

  function initConsolidatedBudgetChangesPage() {
    const container = document.getElementById("consolidated-budget-changes-table");
    if (!container) return;

    container.innerHTML = '<div class="wc-data-loading">' + LOADING_MESSAGE_HTML + "</div>";

    loadBudgetData()
      .then((data) => {
        if (Object.keys(data.errors || {}).length >= data.datasetCount) {
          container.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
          return;
        }
        renderConsolidatedBudgetChangesTable(container);
      })
      .catch((err) => {
        console.error("WCBudgetData: failed to load consolidated budget changes and adjustments", err);
        container.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
      });
  }

  // A few of this table's rows are named after their underlying fund
  // (e.g. a row falling back to "Sheriff Fund" instead of a real
  // department) even though a differently-named row for the actual
  // department already exists elsewhere in the same list -- collapsed
  // into that existing row's name so the two merge into one instead of
  // showing the same money twice under two labels.
  const EXPENSE_DEPARTMENT_ROW_ALIASES = new Map([
    ["north walton tourist development tax", "Tourism North Walton"],
    ["msbu fund", "MSBU"],
    ["sheriff fund", "Walton County Sheriff's Office"],
    // The activities/department catalog names these six Tourist
    // Development Fund sub-departments with a "Tourism" prefix, but the
    // sheet's own already-correctly-named rows for the same real
    // departments (111410xx's siblings) use the shorter name -- aliased
    // to match so a previously-"Unclassified" row merges into its
    // existing counterpart instead of showing as a second, duplicate row.
    ["tourism beach operations", "Beach Operations"],
    ["tourism beach renourishment", "Beach Renourishment"],
    ["tourism beach tram", "Beach Tram"],
    ["tourism communications", "Communications"],
    ["tourism marketing", "Marketing"],
    ["tourism sales and visitors center", "Sales and Visitors Center"]
  ]);
  function collapsedDeptRowName(rawName) {
    return EXPENSE_DEPARTMENT_ROW_ALIASES.get(normalizeDeptName(rawName)) || rawName;
  }

  // The Consolidated Expense Summary's "View Budget Lines" detail shows
  // department-level subtotals (with each department's category) rather
  // than individual object-code lines, since the visible table above is
  // already rolled up to the 8 broad categories.
  function renderExpenseDepartmentBudgetLinesFooter(rows, dedupedRows) {
    const stamp = new Date().toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const updated = '<em>Last Updated: ' + escapeHtml(stamp) + "</em>";
    if (!rows.length) {
      return '<div class="wc-table-footer-row"><p class="wc-data-updated-note">' + updated + "</p></div>";
    }

    budgetLinesDetailCounter += 1;
    const detailId = "wc-budget-lines-" + budgetLinesDetailCounter;
    const showPrior = getShowPriorYears();

    function activityIndex(activity) {
      const norm = String(activity || "").toLowerCase();
      const idx = EXPENSE_ACTIVITY_SECTIONS.findIndex((s) => s.activity.toLowerCase() === norm);
      return idx === -1 ? EXPENSE_ACTIVITY_SECTIONS.length : idx;
    }
    function activityLabel(activity) {
      const norm = String(activity || "").toLowerCase();
      const match = EXPENSE_ACTIVITY_SECTIONS.find((s) => s.activity.toLowerCase() === norm);
      return match ? (match.title || match.activity) : "Other";
    }

    // FY2020-FY2026 columns are summed per department from the shared
    // deduped layer, same as the visible table above (see
    // buildDedupedHistoricalExpenseRows) -- some departments split one
    // Dept_Code across multiple display-only Dept_Names (e.g. Code
    // Compliance / Code Compliance Beach) that each carry the *same* full
    // historical/FY2026 total for a shared account, so summing those fields
    // from the raw display rows per Dept_Name would double-count it.
    // FY2027 Proposed still sums from the raw rows, since it isn't subject
    // to that duplication.
    const historicalFields = BUDGET_LINE_PRIOR_YEAR_COLUMNS.map((c) => c.field);
    const currentYearField = "FY2027_Proposed";

    const repByCodeAndName = clusterDeptNamesByCode(rows.concat(dedupedRows || []));
    function representativeName(r) {
      return collapsedDeptRowName(expenseDisplayDeptName(repByCodeAndName, r));
    }
    // Keyed by display name alone (not Dept_Code) -- this table is meant
    // to show one row per department, but several departments (Capital
    // Projects, Statutory & Other, etc.) book spending under more than one
    // underlying Dept_Code that all resolve to the same representative
    // name, which used to leave each Dept_Code as its own separate row.
    function groupKeyFor(r) {
      return normalizeDeptName(representativeName(r)) || normalizeDeptName(r.Dept_Name);
    }
    function entryFor(byDept, r) {
      const key = groupKeyFor(r);
      const name = representativeName(r);
      if (!byDept.has(key)) {
        const entry = { Dept_Name: name, activity: expenseActivityForRow(r), [currentYearField]: 0 };
        historicalFields.forEach((f) => { entry[f] = 0; });
        byDept.set(key, entry);
      }
      return byDept.get(key);
    }
    const byDept = new Map();
    rows.forEach((r) => {
      entryFor(byDept, r)[currentYearField] += r[currentYearField] || 0;
    });
    (dedupedRows || rows).forEach((r) => {
      const entry = entryFor(byDept, r);
      historicalFields.forEach((f) => { entry[f] += r[f] || 0; });
    });

    const deptRows = Array.from(byDept.values()).sort((a, b) => {
      const ai = activityIndex(a.activity);
      const bi = activityIndex(b.activity);
      if (ai !== bi) return ai - bi;
      return a.Dept_Name.localeCompare(b.Dept_Name);
    });

    // Unlike Summary of Revenues, this department-level detail has no
    // separate print-only table (see printYearColumns there) -- it's the
    // same rows on-screen and in print, just with FY2020/2021 hidden by
    // CSS for print (see budget-pdf.js). So a row that's $0 across every
    // column print actually shows (FY2022-FY2027) gets its own class here
    // instead of being dropped from the array outright, letting print
    // hide it while the on-screen view still shows every department.
    const recentFields = BUDGET_LINE_PRIOR_YEAR_COLUMNS
      .filter((c) => c.year !== 2020 && c.year !== 2021)
      .map((c) => c.field)
      .concat(["FY2027_Proposed"]);
    function deptRowHtml(d) {
      const isZeroCurrent = (d.FY2027_Proposed || 0) === 0;
      const isZeroRecent = recentFields.every((f) => (d[f] || 0) === 0);
      const rowClasses = [isZeroCurrent && "wc-budget-line-zero-current", isZeroRecent && "wc-print-zero-recent"].filter(Boolean);
      const deptHref = departmentPageHref(d.Dept_Name);
      const deptLabel = escapeHtml(d.Dept_Name);
      return (
        "<tr" + (rowClasses.length ? ' class="' + rowClasses.join(" ") + '"' : "") + ">" +
        "<td>" + escapeHtml(activityLabel(d.activity)) + "</td>" +
        "<td>" + (deptHref ? '<a class="wc-department-row-link" href="' + escapeHtml(deptHref) + '">' + deptLabel + "</a>" : deptLabel) + "</td>" +
        BUDGET_LINE_PRIOR_YEAR_COLUMNS.map((c) =>
          '<td class="wc-num wc-prior-year">' + formatCurrency(d[c.field] || 0) + "</td>"
        ).join("") +
        '<td class="wc-num">' + formatCurrency(d.FY2027_Proposed || 0) + "</td></tr>"
      );
    }
    function activitySubtotalRowHtml(activity, activityRows) {
      // Two separate <td> cells (not one colspan="2" cell) to match every
      // other row's column count exactly -- the print CSS hides the
      // Category column and un-hides FY2020/2021 by nth-child position
      // (see budget-pdf.js); a single spanning cell here would count as
      // one column instead of two, both swallowing this label under the
      // Category-hiding rule and shifting every later nth-child rule onto
      // the wrong year column.
      return (
        '<tr class="wc-table-subtotal-row"><td></td><td>' + escapeHtml(activity) + "</td>" +
        BUDGET_LINE_PRIOR_YEAR_COLUMNS.map((c) =>
          '<td class="wc-num wc-prior-year">' + formatCurrency(activityRows.reduce((sum, row) => sum + (row[c.field] || 0), 0)) + "</td>"
        ).join("") +
        '<td class="wc-num">' + formatCurrency(activityRows.reduce((sum, row) => sum + (row.FY2027_Proposed || 0), 0)) + "</td></tr>"
      );
    }
    // Grouped by activity/source (same layout as the Summary of Revenues'
    // own print table -- one subtotal row per category, right after that
    // category's own department rows) instead of a flat department list
    // with no rollup between activities.
    const activityOrder = [];
    const rowsByActivity = new Map();
    deptRows.forEach((d) => {
      const activity = activityLabel(d.activity);
      if (!rowsByActivity.has(activity)) {
        activityOrder.push(activity);
        rowsByActivity.set(activity, []);
      }
      rowsByActivity.get(activity).push(d);
    });
    const bodyRows = [];
    activityOrder.forEach((activity) => {
      const activityRows = rowsByActivity.get(activity);
      activityRows.forEach((d) => bodyRows.push(deptRowHtml(d)));
      if (activityOrder.length > 1) {
        bodyRows.push(activitySubtotalRowHtml(activity, activityRows));
      }
    });
    const totals = {};
    historicalFields.concat([currentYearField]).forEach((field) => {
      totals[field] = deptRows.reduce((sum, row) => sum + (row[field] || 0), 0);
    });
    bodyRows.push(
      // Two separate <td> cells, not colspan="2" -- see
      // activitySubtotalRowHtml's own comment on why a single spanning
      // label cell breaks this table's print column hiding/alignment.
      '<tr class="wc-table-total-row"><td></td><td>Total</td>' +
        BUDGET_LINE_PRIOR_YEAR_COLUMNS.map((c) =>
          '<td class="wc-num wc-prior-year">' + formatCurrency(totals[c.field] || 0) + "</td>"
        ).join("") +
        '<td class="wc-num">' + formatCurrency(totals.FY2027_Proposed || 0) + "</td></tr>"
    );

    const detailTable = renderTable({
      columns: [{ label: "Category" }, { label: "Department" }].concat(
        BUDGET_LINE_PRIOR_YEAR_COLUMNS.map((c) => ({ label: c.label, num: true, classes: ["wc-prior-year"] })),
        [{ label: "FY 2027 Proposed", num: true }]
      ),
      bodyRows: bodyRows
    });

    const toggleHeader = priorYearsToggleHtml(showPrior, "wc-budget-lines-detail-header");

    return (
      '<div class="wc-table-footer-row">' +
      '<p class="wc-data-updated-note">' + updated + "</p>" +
      '<button type="button" class="wc-view-budget-lines-toggle" data-target="' + detailId + '" aria-expanded="false">View Budget Lines</button>' +
      "</div>" +
      '<div class="wc-budget-lines-detail wc-budget-lines-card' + (showPrior ? " show-prior-years" : "") + '" id="' + detailId + '" hidden>' +
      toggleHeader + detailTable +
      "</div>"
    );
  }

  function initConsolidatedExpenseSummaryPage() {
    initConsolidatedFundTableContainer(
      "consolidated-expense-summary-table",
      renderConsolidatedExpenseSummaryTable,
      "consolidated expense summary",
      bindPriorYearsToggle
    );
  }

  // Traces a rounded-rectangle path on `ctx` without relying on the
  // browser's native CanvasRenderingContext2D.roundRect (not available in
  // every supported browser), clamping the radius so it never exceeds half
  // the rectangle's own width/height -- a too-large radius would otherwise
  // make the two corners on a short/narrow side overlap and self-intersect.
  function tracePathForRoundedRect(ctx, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arcTo(x + width, y, x + width, y + r, r);
    ctx.lineTo(x + width, y + height - r);
    ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
    ctx.lineTo(x + r, y + height);
    ctx.arcTo(x, y + height, x, y + height - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // Chart.js draws each stacked dataset's bar segment as its own flat
  // rectangle. Rounding any one segment's own corners (e.g. via its
  // borderRadius option) breaks down two ways: a segment in the middle of
  // the stack gets rounded on a side that should butt flush against its
  // neighbor, and the *outermost* segment's rounding gets silently clamped
  // away by Chart.js whenever that segment's own value is a thin sliver
  // (a small dollar amount can be only a few pixels tall, too short to fit
  // a 6px radius) -- the bar still looks flat even though the rounding
  // logic picked the right segment.
  //
  // Clipping the whole bar's silhouette to one rounded rectangle, based on
  // the bar's *total* stacked height rather than any single segment's
  // value, fixes both: it's a Chart.js plugin (registered per chart, not
  // globally, since only these two stacked-bar charts want it) that clips
  // the canvas to every bar's rounded outline before Chart.js draws the
  // (otherwise plain, square) bar rectangles, so only the true top/bottom
  // of the combined stack ever gets rounded, regardless of which dataset
  // happens to occupy that edge.
  function stackedBarRoundingPlugin(radius) {
    return {
      id: "wcStackedBarRounding",
      beforeDatasetsDraw(chart) {
        const datasets = chart.data.datasets;
        const meta0 = chart.getDatasetMeta(0);
        if (!datasets.length || !meta0 || !meta0.data.length) return;
        const ctx = chart.ctx;
        ctx.save();
        ctx.beginPath();
        let pathed = false;
        meta0.data.forEach((firstEl, barIndex) => {
          let top = Infinity;
          let bottom = -Infinity;
          let left = null;
          let width = 0;
          datasets.forEach((ds, di) => {
            const meta = chart.getDatasetMeta(di);
            if (meta.hidden || !ds.data[barIndex]) return;
            const el = meta.data[barIndex];
            if (!el) return;
            top = Math.min(top, el.y);
            bottom = Math.max(bottom, el.base);
            if (left === null) {
              left = el.x - el.width / 2;
              width = el.width;
            }
          });
          if (left === null || !isFinite(top)) return;
          tracePathForRoundedRect(ctx, left, top, width, bottom - top, radius);
          pathed = true;
        });
        if (pathed) {
          ctx.clip();
          chart.$wcStackedBarClipped = true;
        } else {
          ctx.restore();
        }
      },
      afterDatasetsDraw(chart) {
        if (chart.$wcStackedBarClipped) {
          chart.ctx.restore();
          chart.$wcStackedBarClipped = false;
        }
      }
    };
  }

  // Chart.js draws straight to <canvas>, so its axis labels/gridlines can't
  // pick up the site's CSS dark-mode variables the way every other element
  // on the page does just by being styled in stylesheet.css. Reading the
  // live CSS variables here (rather than hardcoding a parallel light/dark
  // color pair in JS) keeps these in sync automatically if the palette in
  // style.css ever changes.
  function wcChartThemeColors() {
    const styles = getComputedStyle(document.documentElement);
    return {
      text: (styles.getPropertyValue("--muted") || "#5a6e7f").trim(),
      grid: (styles.getPropertyValue("--border") || "#e0e8e4").trim()
    };
  }

  // Scriptable options (the `() => ...` callbacks set on each chart's
  // scales/datasets below) only get re-evaluated when something tells
  // Chart.js to redraw -- they don't repaint on their own just because
  // --text/--border changed. The theme toggle (nav.js) flips
  // data-theme on <html> with no page reload and without dispatching any
  // event of its own, so this observes that attribute directly (one
  // observer total, regardless of how many listeners are registered) and
  // re-runs every registered listener -- a chart's own `.update()`, or a
  // legend swatch recolor, or anything else -- whenever it changes.
  const wcThemeListeners = [];
  let wcThemeObserverStarted = false;

  function onWcThemeChange(listener) {
    wcThemeListeners.push(listener);
    if (wcThemeObserverStarted) return;
    wcThemeObserverStarted = true;
    const observer = new MutationObserver(() => {
      wcThemeListeners.forEach((fn) => {
        try {
          fn();
        } catch (e) {
          // A listener's chart/DOM was destroyed since the last theme
          // change -- nothing to update for it.
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  function registerWcThemedChart(chart) {
    onWcThemeChange(() => chart.update());
  }

  // The site's fixed bar-chart palette (REVENUE_TOPIC_CHART_COLORS) is
  // tuned for a white chart background -- several entries (near-black
  // greens, pure black, dark greys) are deliberately dark for contrast
  // there, which makes them nearly invisible against the dark theme's
  // near-black chart background instead. Rather than hand-maintaining a
  // second 24-color palette to keep in sync, this lightens each color by a
  // fixed amount in HSL space when dark mode is active, preserving its hue
  // (so position N in the palette still reads as "the same family of
  // color" in both themes) while guaranteeing every entry ends up legible.
  function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    return [
      parseInt(clean.slice(0, 2), 16) / 255,
      parseInt(clean.slice(2, 4), 16) / 255,
      parseInt(clean.slice(4, 6), 16) / 255
    ];
  }

  function rgbToHsl(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    if (d === 0) return [0, 0, l * 100];
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
    return [h, s * 100, l * 100];
  }

  function hslToHex(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    const toHex = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0");
    return "#" + toHex(r) + toHex(g) + toHex(b);
  }

  // Clicking a custom legend item (see renderExpenseActivityChart/
  // renderRevenueTopicCards) isolates that one series instead of Chart.js's
  // default of hiding it -- clicking a series shows ONLY that series;
  // clicking it again (or whichever series is currently the sole one
  // shown) restores every series. Clicking a different series while one is
  // already isolated switches the isolation to the new one rather than
  // stacking/toggling individually, since "isolate" is a single either/or
  // view rather than a per-series on/off switch.
  function handleChartLegendIsolateClick(chart, legendEl, i) {
    const metas = chart.data.datasets.map((_, di) => chart.getDatasetMeta(di));
    const isVisible = (di) => metas[di].hidden !== true;
    const onlyThisVisible = isVisible(i) && metas.every((meta, di) => di === i || !isVisible(di));
    metas.forEach((meta, di) => {
      meta.hidden = onlyThisVisible ? false : di !== i;
    });
    legendEl.querySelectorAll(".wc-revenue-chart-legend-item").forEach((el, di) => {
      el.classList.toggle("is-hidden", !!metas[di].hidden);
    });
    chart.update();
  }

  function chartColorForTheme(hex) {
    if (document.documentElement.getAttribute("data-theme") !== "dark") return hex;
    const [h, s, l] = rgbToHsl(...hexToRgb(hex));
    return hslToHex(h, Math.min(85, s + 8), Math.min(82, l + 30));
  }

  // One narrative banner + full-width stacked-bar chart (grouped by
  // contributing department) per expense Activity classification.
  function renderExpenseActivityChart(container, section, idPrefix) {
    if (!container) return;
    const activityNorm = section.activity.toLowerCase();
    const matchesActivityAndFund = (r) =>
      expenseActivityForRow(r).toLowerCase() === activityNorm &&
      !CONSOLIDATED_SCHEDULE_EXCLUDED_FUND_CODES.has(fundCodeForRow(r));
    const expenseRows = (cache.expenditures || []).filter(matchesActivityAndFund);
    // FY2020-FY2026 columns are summed from the shared deduped layer
    // instead of the raw display rows -- see buildDedupedHistoricalExpenseRows.
    // Some departments split one Dept_Code across multiple display-only
    // Dept_Names (e.g. Code Compliance / Code Compliance Beach), each
    // carrying the same full account total for those years -- stacking
    // both bars would double it. FY2027 Proposed keeps summing the raw
    // rows directly, since it isn't subject to that display-row
    // duplication (each Dept_Name's own itemized FY2027 budget lines are
    // genuinely distinct).
    const dedupedRows = (cache.dedupedExpenseRows || []).filter(matchesActivityAndFund);

    container.innerHTML =
      '<div class="wc-expense-activity-chart-card">' +
      '<div class="wc-expense-activity-chart-wrap"><canvas id="' + idPrefix + '"></canvas></div>' +
      '<div class="wc-revenue-chart-legend" id="' + idPrefix + '-legend"></div>' +
      lastUpdatedNoteHtml() +
      "</div>";

    if (typeof Chart === "undefined") return;

    const repByCodeAndName = clusterDeptNamesByCode(expenseRows.concat(dedupedRows || []));
    function chartDeptName(r) {
      return expenseDisplayDeptName(repByCodeAndName, r);
    }

    const byDept = new Map();
    expenseRows.forEach((r) => {
      const name = chartDeptName(r);
      if (!byDept.has(name)) byDept.set(name, []);
      byDept.get(name).push(r);
    });
    const dedupedByDept = new Map();
    dedupedRows.forEach((r) => {
      const name = chartDeptName(r);
      if (!dedupedByDept.has(name)) dedupedByDept.set(name, []);
      dedupedByDept.get(name).push(r);
    });

    const baseColors = Array.from(byDept.keys()).map((_, i) => REVENUE_TOPIC_CHART_COLORS[i % REVENUE_TOPIC_CHART_COLORS.length]);
    const datasets = Array.from(byDept.entries()).map(([name, rowsForName], i) => ({
      label: name,
      data: REVENUE_TOPIC_CHART_YEARS.map((y) => {
        const source = HISTORICAL_EXPENSE_DEDUP_FIELD_SET.has(y.field) ? (dedupedByDept.get(name) || []) : rowsForName;
        return source.reduce((s, r) => s + (r[y.field] || 0), 0);
      }),
      // Scriptable so it re-resolves (via registerWcThemedChart's
      // chart.update() on theme change) to a dark-mode-legible variant
      // instead of staying fixed at the light-mode hex forever -- see
      // chartColorForTheme.
      backgroundColor: () => chartColorForTheme(baseColors[i])
    }));

    const canvas = document.getElementById(idPrefix);
    if (!canvas || !datasets.length) return;

    const chart = new Chart(canvas, {
      type: "bar",
      data: { labels: REVENUE_TOPIC_CHART_YEARS.map((y) => y.label), datasets: datasets },
      plugins: [stackedBarRoundingPlugin(6)],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: () => wcChartThemeColors().text }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            grid: { display: true, color: () => wcChartThemeColors().grid },
            ticks: { color: () => wcChartThemeColors().text, callback: (v) => formatAbbreviatedCurrency(v) }
          }
        },
        // "nearest"/intersect:true so hovering activates just the one bar
        // segment under the cursor -- the previous "index"/intersect:false
        // combo showed every dataset's value at that x position regardless
        // of which segment was actually being pointed at.
        interaction: { mode: "nearest", intersect: true },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "nearest",
            intersect: true,
            callbacks: {
              label: (ctx) => ctx.dataset.label + ": " + formatAbbreviatedCurrency(ctx.parsed.y)
            }
          }
        }
      }
    });
    registerWcThemedChart(chart);

    const legendEl = document.getElementById(idPrefix + "-legend");
    if (legendEl) {
      legendEl.innerHTML = datasets.map((d, i) =>
        '<button type="button" class="wc-revenue-chart-legend-item" data-index="' + i + '">' +
        '<span class="wc-revenue-chart-legend-swatch" style="background:' + chartColorForTheme(baseColors[i]) + '"></span>' +
        "<span>" + escapeHtml(d.label) + "</span>" +
        "</button>"
      ).join("");
      onWcThemeChange(() => {
        legendEl.querySelectorAll(".wc-revenue-chart-legend-swatch").forEach((swatch, i) => {
          swatch.style.background = chartColorForTheme(baseColors[i]);
        });
      });

      legendEl.querySelectorAll(".wc-revenue-chart-legend-item").forEach((item) => {
        const i = Number(item.dataset.index);
        item.addEventListener("mouseenter", () => {
          chart.setActiveElements(chart.data.datasets[i].data.map((_, di) => ({ datasetIndex: i, index: di })));
          chart.update();
        });
        item.addEventListener("mouseleave", () => {
          chart.setActiveElements([]);
          chart.update();
        });
        item.addEventListener("click", () => {
          handleChartLegendIsolateClick(chart, legendEl, i);
        });
      });
    }
  }

  function initExpenseActivityChartsPage() {
    const sections = EXPENSE_ACTIVITY_SECTIONS.filter((s) => document.getElementById(s.containerId));
    if (!sections.length) return;

    sections.forEach((s) => {
      document.getElementById(s.containerId).innerHTML = '<div class="wc-data-loading">' + LOADING_MESSAGE_HTML + "</div>";
    });

    loadBudgetData()
      .then((data) => {
        sections.forEach((s) => {
          const container = document.getElementById(s.containerId);
          if (Object.keys(data.errors || {}).length >= data.datasetCount) {
            container.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
            return;
          }
          renderExpenseActivityChart(container, s, "wc-expense-chart-" + s.containerId);
        });
      })
      .catch((err) => {
        console.error("WCBudgetData: failed to load expense activity charts", err);
        sections.forEach((s) => {
          document.getElementById(s.containerId).innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
        });
      });
  }

  // "Summary of Revenues" page: a narrative + bar-chart card for each major
  // revenue source within each classification. Narrative text comes from
  // the same departmentNarratives sheet, keyed by the topic name below
  // instead of a department name.
  function byRevenueCodes(codes) {
    const set = new Set(codes);
    return (r) => set.has(String(r.Revenue_Code || "").trim());
  }
  function byRevenueCodeAndDeptCode(code, deptCode) {
    return (r) => String(r.Revenue_Code || "").trim() === code && String(r.Dept_Code || "").trim() === deptCode;
  }
  // A catch-all topic: every row of this Revenue_Type not already claimed
  // by one of the other topics in the same section.
  function remainderOfType(type, siblingMatchers) {
    return (r) => r.Revenue_Type === type && !siblingMatchers.some((m) => m(r));
  }

  function buildIntergovernmentalRevenueTopics() {
    const halfCent = { title: "Local Government Half-Cent Sales Tax", narrativeKey: "Local Government Half-Cent Sales Tax", matches: byRevenueCodes(["335180"]) };
    const stateFuel = { title: "State Fuel Taxes", narrativeKey: "State Fuel Taxes", matches: byRevenueCodes(["335420", "335421", "335422", "335490"]) };
    const stateRevenueShare = { title: "State Revenue Share Proceeds", narrativeKey: "State Revenue Share Proceeds", matches: byRevenueCodes(["335121"]) };
    const section8 = {
      title: "Section 8 Housing Choice Voucher Program",
      narrativeKey: "Section 8 Housing Choice Voucher Program",
      matches: (r) =>
        String(r.Revenue_Code || "").trim() === "331500" &&
        normalizeDeptName(r.Dept_Name) === "housing and urban development",
      useRowScopedActuals: true
    };
    const resourceOfficers = { title: "Sheriff Resource Officers", narrativeKey: "Sheriff Resource Officers", matches: byRevenueCodes(["337200"]) };
    const siblings = [halfCent, stateFuel, stateRevenueShare, section8, resourceOfficers].map((t) => t.matches);
    const remainderType = remainderOfType("Intergovernmental Revenues", siblings);
    // Grant accounts (Federal Grant (...), State Grant (...)) are one-off,
    // program-specific awards rather than recurring intergovernmental
    // revenue -- they clutter this catch-all card's chart with a long tail
    // of small, inconsistent-year-to-year slivers instead of the steady
    // shared-revenue sources it's meant to show.
    const remainder = {
      title: "Intergovernmental Revenue",
      narrativeKey: "Intergovernmental Revenue",
      matches: (r) => remainderType(r) && !/grant/i.test(r.Revenue_Name || "")
    };
    return [halfCent, stateFuel, stateRevenueShare, section8, resourceOfficers, remainder];
  }

  function buildChargesForServicesTopics() {
    const planningFees = { title: "Planning Fees", narrativeKey: "Planning Fees", matches: byRevenueCodes(["341201", "341202", "341205"]) };
    const eagleSprings = {
      title: "Eagle Springs Golf and Recreation Center Revenue",
      narrativeKey: "Eagle Springs Golf and Recreation Center Revenue",
      matches: byRevenueCodes(["347201", "347202", "347203", "347204", "347205", "347206", "347207", "347208", "347209", "347210", "347211"])
    };
    const ambulanceFees = { title: "Ambulance Fees", narrativeKey: "Ambulance Fees", matches: byRevenueCodes(["342600"]) };
    const fireRescueMsbu = { title: "Fire Rescue MSBUs", narrativeKey: "Fire Rescue MSBUs", matches: byRevenueCodeAndDeptCode("343410", "107343") };
    const siblings = [planningFees, eagleSprings, ambulanceFees, fireRescueMsbu].map((t) => t.matches);
    const remainder = { title: "Charges for Services", narrativeKey: "Charges for Services", matches: remainderOfType("Charges for Services", siblings) };
    return [planningFees, eagleSprings, ambulanceFees, fireRescueMsbu, remainder];
  }

  function buildPermitsFeesTopics() {
    return [
      { title: "Building Permits", narrativeKey: "Building Permits", matches: byRevenueCodes(["322000"]) },
      { title: "Beach Activity & Event Permits", narrativeKey: "Beach Activity & Event Permits", matches: byRevenueCodes(["329002", "329003", "329004", "329005", "329009"]) }
    ];
  }

  function buildJudgmentsFinesTopics() {
    return [
      { title: "Ordinance Fines", narrativeKey: "Ordinance Fines", matches: byRevenueCodes(["354000", "354001", "354002", "354003"]) }
    ];
  }

  function buildMiscellaneousRevenueTopics() {
    return [
      { title: "Recreation Plat Fee", narrativeKey: "Recreation Plat Fee", matches: byRevenueCodes(["369902"]) },
      // Same set of revenue codes now combined into the single "Interest"
      // row on the Summary of Revenues detail table (any Revenue_Name
      // containing "Interest" -- see collapsedBudgetLineName): Interest,
      // Interest (Beach Management), Interest (New Product Development),
      // Interest (Landfill Escrow), Interest (Sheriff), Interest and Other
      // Earnings (four codes), and Constitutional Officer Interest.
      // Investments (Florida Local Government Investment Trust)/(SBA
      // Florida Prime) are a distinct account type, not an "Interest"
      // name, so they're excluded here the same way they're excluded from
      // that merged row.
      { title: "Interest", narrativeKey: "Interest", matches: byRevenueCodes(["361100", "361102", "361103", "361104", "361107", "361108", "361109", "361110", "361111", "361112"]) }
    ];
  }

  const REVENUE_CLASSIFICATION_SECTIONS = [
    {
      containerId: "general-government-tax-topics",
      topics: [
        {
          title: "Property Taxes",
          narrativeKey: "Property Tax",
          // Also matches the statutory 5% Ad Valorem discount row
          // (Dept_Code 102389/Revenue_Code 389001, relabeled to "Ad Valorem
          // Taxes" by REVENUE_NAME_OVERRIDES) so its FY2026 reduction nets
          // into this chart's bar the same way it already does on the
          // Summary of Revenues table -- without it, the chart's FY2026 bar
          // showed the gross amount instead of net-of-5%.
          matches: (r) => byRevenueCodes(["311000", "311001"])(r) || byRevenueCodeAndDeptCode("389001", "102389")(r)
        },
        { title: "Tourist Development Taxes", narrativeKey: "Tourist Development Tax", matches: byRevenueCodes(["312120", "312130", "312150", "312160", "312170"]) },
        { title: "Local Discretionary Sales Surtax", narrativeKey: "Local Discretionary Sales Surtax", matches: byRevenueCodes(["312600"]) },
        { title: "Local Option Fuel Tax", narrativeKey: "Local Option Fuel Tax", matches: byRevenueCodes(["312300", "312410"]) }
      ]
    },
    { containerId: "intergovernmental-revenue-topics", topics: buildIntergovernmentalRevenueTopics() },
    { containerId: "charges-for-services-topics", topics: buildChargesForServicesTopics() },
    { containerId: "permits-fees-topics", topics: buildPermitsFeesTopics() },
    { containerId: "judgments-fines-topics", topics: buildJudgmentsFinesTopics() },
    { containerId: "miscellaneous-revenue-topics", topics: buildMiscellaneousRevenueTopics() },
    {
      containerId: "all-other-revenue-topics",
      topics: [{ title: "All Other Revenue", narrativeKey: "All Other Revenue", isAllOtherRevenue: true, matches: () => true }]
    }
  ];

  // Revenue sources that aren't really a revenue *source* -- interfund
  // transfers in (381000) and carried-forward balances -- excluded when
  // working out what actually pays for a fund's spending.
  const NON_SOURCE_REVENUE_NAME_PATTERN = /(carry ?forward|brought forward|cash forward|fund balance|appropriated balance|less 5%)/i;

  // The named revenue topic a row rolls up to on the Summary of Revenues
  // page ("Tourist Development Taxes", "Property Taxes", ...). The
  // "All Other Revenue" catch-all is skipped so callers get a specific
  // source name or nothing.
  function revenueTopicTitleForRow(row) {
    for (const section of REVENUE_CLASSIFICATION_SECTIONS) {
      for (const topic of section.topics) {
        if (topic.isAllOtherRevenue) continue;
        try {
          if (topic.matches(row)) return topic.title;
        } catch (err) {
          /* a topic matcher that can't read this row simply doesn't match */
        }
      }
    }
    return "";
  }

  // Largest single FY 2027 revenue source in a set of revenue rows, rolled
  // up to the named topics used on the Summary of Revenues page. Interfund
  // transfers in are never a source; carried-forward balances only count
  // when nothing else is available (includeBalances).
  // The Summary of Revenues topic title for 335180 is "Local Government
  // Half-Cent Sales Tax"; the revenue sheet's own line, and the label used
  // when naming what funds a request, writes it as "1/2 Cent". Only the
  // revenue-source label is renamed -- the topic title itself still keys
  // narratives, slugs, and charts elsewhere.
  function revenueSourceLabel(label) {
    return String(label || "").replace(/half-?cent/i, "1/2 Cent");
  }

  function largestRevenueSourceFromRows(rows, includeBalances) {
    const totals = new Map();
    (rows || []).forEach((r) => {
      if (String(r.Revenue_Code || "").trim() === "381000") return;
      const name = String(r.Revenue_Name || "").trim();
      if (!name) return;
      if (!includeBalances && NON_SOURCE_REVENUE_NAME_PATTERN.test(name)) return;
      const amount = r.FY2027_Proposed || 0;
      if (amount <= 0) return;
      const label = revenueSourceLabel(revenueTopicTitleForRow(r) || name);
      totals.set(label, (totals.get(label) || 0) + amount);
    });

    let best = "";
    let bestAmount = 0;
    totals.forEach((amount, label) => {
      if (amount > bestAmount) {
        bestAmount = amount;
        best = label;
      }
    });
    return best;
  }

  // A department's largest revenue allocation isn't always the revenue that
  // pays for its equipment requests. These two lists carry the exceptions.

  // Revenue that is dedicated to something other than the department's
  // general operations, so it shouldn't be named as what funds a request.
  // Code Compliance's TDC Public Safety Reimbursements ($2.2M, its largest
  // line) reimburse beach-patrol salaries specifically.
  const REVENUE_SOURCE_EXCLUDED_BY_DEPARTMENT = new Map([
    ["code compliance", /tdc public safety reimbursement/i]
  ]);

  // Departments whose revenue is booked under a different Dept_Name in the
  // revenue sheet -- Planning Short-Term Rental has no revenue rows of its
  // own; its Short-Term Rental Certificate Fee sits under Planning.
  // Departments whose equipment is paid for by a countywide source rather
  // than the program revenue they collect -- Eagle Springs' membership and
  // greens fees don't cover its capital, the General Fund's half-cent sales
  // tax share does.
  const REVENUE_SOURCE_DEPARTMENT_OVERRIDES = new Map([
    ["planning short term rental", "Short-Term Rental Certificate Fee"],
    ["eagle springs golf and recreation center", "Local Government 1/2 Cent Sales Tax"]
  ]);

  const revenueSourceByDepartment = new Map();

  // The revenue that pays for a department's request: the department's own
  // largest budgeted revenue allocation, falling back to the largest source
  // in its fund for departments with no revenue of their own (Tourism
  // departments, for instance, resolve to Tourist Development Taxes), and
  // finally to a carried-forward balance when that is genuinely all a fund
  // has. Answers the question straight from the budgeted revenue rather
  // than a hand-kept list.
  function largestRevenueSourceForDepartment(deptName, deptCode) {
    const normalizedDept = normalizeDeptName(deptName);
    const key = String(deptCode || "").trim() + "|" + normalizedDept;
    if (revenueSourceByDepartment.has(key)) return revenueSourceByDepartment.get(key);

    const override = REVENUE_SOURCE_DEPARTMENT_OVERRIDES.get(normalizedDept);
    if (override) {
      revenueSourceByDepartment.set(key, override);
      return override;
    }

    const excluded = REVENUE_SOURCE_EXCLUDED_BY_DEPARTMENT.get(normalizedDept);
    const departmentRows = rowsForDepartment(cache.revenues, deptName, deptCode)
      .filter((r) => !excluded || !excluded.test(String(r.Revenue_Name || "")));
    const fundCode = fundCodeForRow({ Dept_Code: deptCode });
    const fundRows = fundCode
      ? (cache.revenues || []).filter((r) => fundCodeForRow(r) === fundCode)
      : [];

    const source = largestRevenueSourceFromRows(departmentRows, false) ||
      largestRevenueSourceFromRows(fundRows, false) ||
      largestRevenueSourceFromRows(departmentRows, true) ||
      largestRevenueSourceFromRows(fundRows, true);

    revenueSourceByDepartment.set(key, source);
    return source;
  }

  const REVENUE_TOPIC_CHART_YEARS = [
    { field: "FY2022_Actual", label: "FY 2022 Actual" },
    { field: "FY2023_Actual", label: "FY 2023 Actual" },
    { field: "FY2024_Actual", label: "FY 2024 Actual" },
    { field: "FY2025_Actual", label: "FY 2025 Actual" },
    // Sourced from expense_original_budget_public (Supabase), not the
    // Google Sheets FY2026_Budget field -- the sheet no longer carries that
    // column at all, so reading it directly left this bar permanently
    // empty. See BUDGET_LINE_PRIOR_YEAR_COLUMNS for the same field used
    // everywhere else FY2026 is shown.
    { field: "FY2026_Original_Budget", label: "FY 2026 Budget" },
    { field: "FY2027_Proposed", label: "FY 2027 Proposed" },
    { field: "FY2028_Projected", label: "FY 2028 Projected", projectedYear: 2028 },
    { field: "FY2029_Projected", label: "FY 2029 Projected", projectedYear: 2029 }
  ];

  const REVENUE_TOPIC_CHART_COLORS = [
    "#003f28", "#097FBB", "#D1BE78", "#FFDE59", "#3A9FD6", "#2F6F4D",
    "#A3955C", "#C7AA3F", "#065A86", "#002b1b", "#BFAE6A", "#FFE98A",
    "#4D4D4D", "#7A7A7A", "#005236", "#000000", "#6FAF8F", "#5B7C99",
    "#8A8F98", "#7A9E7E", "#355C7D", "#9BA3AF", "#4B6F52", "#6D8299"
  ];

  // Abbreviates large dollar amounts for axis ticks/legends, e.g. $150M, $1.2M, $500K.
  function formatAbbreviatedCurrency(value) {
    const n = Number(value) || 0;
    const sign = n < 0 ? "-" : "";
    const abs = Math.abs(n);
    if (abs >= 1e9) return sign + "$" + trimDecimal(abs / 1e9) + "B";
    if (abs >= 1e6) return sign + "$" + trimDecimal(abs / 1e6) + "M";
    if (abs >= 1e3) return sign + "$" + trimDecimal(abs / 1e3) + "K";
    return sign + "$" + abs;
  }

  function trimDecimal(n) {
    return (Math.round(n * 10) / 10).toString();
  }

  function revenueControlProfile(topic, topicType) {
    const title = String((topic && topic.title) || "");
    if (/indirect administrative fee/i.test(title)) return {
      level: "Low local control",
      className: "is-low",
      text: "This revenue is generated through the County's cost-allocation plan, which is prepared by an independent third party. The plan assigns an appropriate share of General Fund support services to benefiting special revenue funds, so the amount is driven by documented costs and the allocation methodology rather than a discretionary rate increase."
    };
    if (/housing prisoners revenue/i.test(title)) return {
      level: "Low local control",
      className: "is-low",
      text: "This revenue is collected by the Walton County Sheriff's Office for housing prisoners. The County cannot independently increase the payment terms or activity generating the revenue, so collections depend on prisoner-housing activity and the applicable reimbursement arrangements."
    };
    if (/surplus budget tax collector/i.test(title)) return {
      level: "Low local control",
      className: "is-low",
      text: "This is the return of excess fee revenue from the Tax Collector after that office's operating requirements are met. It is not a County-imposed charge that the Board can increase; the amount depends on the Tax Collector's collections, expenditures, and year-end settlement."
    };
    if (/tdc public safety reimbursement/i.test(title)) return {
      level: "Limited local control",
      className: "is-limited",
      text: "This is a reimbursement from Tourist Development Tax proceeds for eligible tourism-related public-safety costs. The County may budget eligible reimbursements within Florida law, but it cannot treat the transfer as unrestricted new revenue or increase it beyond documented eligible costs and available tourist-tax proceeds."
    };
    if (/short-term rental certificate fee/i.test(title)) return {
      level: "Moderate local control",
      className: "is-moderate",
      text: "The County establishes the certificate fee through its adopted short-term-rental program and may revise the fee through the required public process. Revenue also depends on the number of participating rental properties, renewals, compliance activity, and the reasonable cost of administering the program."
    };
    if (/beach (?:vending|bonfire) permit/i.test(title)) return {
      level: "Moderate local control",
      className: "is-moderate",
      text: "The County establishes this permit fee and may revise the adopted fee schedule through a public process. Actual revenue depends on permit activity and program demand; the receipt is classified as unrestricted for this revenue presentation."
    };
    if (/surplus equipment sales|scrap sales/i.test(title)) return {
      level: "Low local control",
      className: "is-low",
      text: "This is non-recurring revenue from disposing of surplus County property. The County controls when eligible items are sold, but proceeds depend on the assets available and market bids and should not be increased as a recurring operating-revenue strategy."
    };
    if (/refund of prior year expenditures/i.test(title)) return {
      level: "Low local control",
      className: "is-low",
      text: "This non-recurring revenue represents the recovery of payments made in a prior year. It depends on specific refunds or corrections and is not a rate or fee the County can increase."
    };
    if (/miscellaneous revenue/i.test(title)) return {
      level: "Low local control",
      className: "is-low",
      text: "The FY 2027 amount is primarily supported by scheduled opioid-settlement proceeds. The County may direct the funds to eligible purposes but cannot increase the settlement payment schedule or treat it as a locally adjustable recurring revenue source."
    };
    if (title === "Property Taxes") return {
      level: "Moderate local control",
      className: "is-moderate",
      text: "The Board sets the countywide millage rate each year through Florida's TRIM process and may consider a higher rate subject to statutory voting and public-hearing requirements. The County does not control taxable values or exemptions, which are determined under state law and administered by the Property Appraiser."
    };
    if (title === "Tourist Development Taxes") return {
      level: "Limited local control",
      className: "is-limited",
      text: "Walton County can levy additional percentages of this local-option lodging tax, up to the maximum rate Florida law allows and subject to the statutory adoption requirements. That authority is why local control is limited rather than low: the Board can act on the rate, but only within the levies, adoption process, and eligible tourism-related uses the state defines."
    };
    if (/discretionary sales surtax/i.test(title)) return {
      level: "Low local control",
      className: "is-low",
      text: "The State of Florida governs which discretionary sales surtaxes counties may impose, the available rates, the authorization process, and how the tax is administered and collected. Walton County cannot independently create or increase this revenue outside that state framework, and collections also depend on taxable sales activity."
    };
    if (/9th cent voted fuel tax/i.test(title)) return {
      level: "Low local control",
      className: "is-low",
      text: "Florida law governs this one-cent-per-gallon local-option fuel tax and its eligible transportation uses. Walton County cannot increase it beyond the state-authorized levy, and collections depend primarily on taxable fuel consumption."
    };
    if (title === "Local Option Fuel Tax") return {
      level: "Low local control",
      className: "is-low",
      text: "Florida law controls the available local-option fuel-tax levies, adoption requirements, administration, and eligible transportation uses. Walton County cannot increase the tax outside that state framework, and collections depend largely on taxable fuel consumption."
    };
    if (/local government\s+(?:half|1\s*\/\s*2)[ -]?cent sales tax/i.test(title)) return {
      level: "Low local control",
      className: "is-low",
      text: "Walton County cannot set or increase this tax. Florida law directs a portion of state sales-tax proceeds into the Local Government Half-cent Sales Tax Clearing Trust Fund, and the Florida Department of Revenue distributes participating counties and municipalities their formula-based shares each month. Walton County's receipts rise or fall with taxable sales and the statutory allocation formula—not a locally controlled rate."
    };
    if (/state fuel tax/i.test(title)) return {
      level: "Low local control",
      className: "is-low",
      text: "The State of Florida establishes and administers these fuel taxes and distributes the County's share under statutory formulas. Walton County cannot change the state tax rates; revenue depends on fuel sales and the applicable state allocation."
    };
    if (/state revenue shar/i.test(title)) return {
      level: "Low local control",
      className: "is-low",
      text: "These proceeds come through Florida's revenue-sharing program. Walton County cannot set the underlying state taxes or distribution formula; its share depends on statutory eligibility, state collections, and the allocation calculated by the State of Florida."
    };
    if (/constitutional fuel tax|county fuel tax|municipal fuel tax|motor fuel use tax/i.test(title)) return {
      level: "Low local control",
      className: "is-low",
      text: "The State of Florida establishes, collects, and distributes this fuel-tax revenue under state law. Walton County cannot set the state tax or distribution formula; receipts depend on taxable fuel activity and the applicable statutory allocation."
    };
    if (/e-?911 communications/i.test(title)) return {
      level: "Low local control",
      className: "is-low",
      text: "This is a state-administered distribution of E911 surcharge revenue. Walton County cannot set the surcharge or allocation and must use the proceeds for eligible emergency-communications system costs."
    };
    if (/telecommunication and local communication tax|communications services tax/i.test(title)) return {
      level: "Limited local control",
      className: "is-limited",
      text: "Florida law establishes the communications-services-tax framework, including administration and limits on local rates. Walton County may act only within that framework; collections ultimately depend on taxable communications activity and state-administered distributions."
    };
    if (/racing tax|state payment in lieu of tax|alcoholic beverage licenses|insurance agents|mobile home licenses|state shared cigarette tax/i.test(title)) return {
      level: "Low local control",
      className: "is-low",
      text: "This revenue is collected or calculated by the State of Florida and distributed to eligible counties under state law. Walton County cannot set the underlying state charge or allocation and therefore has little ability to increase the receipt directly."
    };
    if (/florida boating improvement program allocation/i.test(title)) return {
      level: "Low local control",
      className: "is-low",
      text: "This is a state-directed allocation associated with vessel-registration revenue. Walton County cannot set the allocation and must use the proceeds for eligible boating-access and waterway purposes."
    };
    if (/section 8|housing choice voucher/i.test(title)) return {
      level: "Low local control",
      className: "is-low",
      text: "This revenue is governed by federal HUD appropriations, allocations, and program rules. The County administers eligible assistance and maintains program compliance, but it cannot independently increase the federal funding available."
    };
    if (/resource officer/i.test(title)) return {
      level: "Limited local control",
      className: "is-limited",
      text: "Revenue for school resource officers is governed by service and cost-sharing agreements with participating agencies. The County and Sheriff may negotiate staffing and reimbursement terms, but the County cannot unilaterally increase another agency's contribution."
    };
    if (/federal grant/i.test(title)) return {
      level: "Low local control",
      className: "is-low",
      text: "Funding depends on federal appropriations, eligibility, and the terms of the award. The County can pursue eligible opportunities and maintain compliance, but it cannot set the award amount or guarantee renewal."
    };
    if (/state grant/i.test(title)) return {
      level: "Low local control",
      className: "is-low",
      text: "Funding depends on State of Florida appropriations, eligibility, and the terms of the award. The County can pursue eligible opportunities and maintain compliance, but it cannot set the award amount or guarantee renewal."
    };
    if (/grant/i.test(title)) return {
      level: "Low local control",
      className: "is-low",
      text: "Funding depends on the outside awarding agency, eligibility, and the terms of the award. The County can pursue eligible opportunities and maintain compliance, but it cannot set the award amount or guarantee renewal."
    };
    if (/fire rescue.*msbu|msbu/i.test(title)) return {
      level: "Moderate local control",
      className: "is-moderate",
      text: "The Board may adjust the assessment through the required public process, subject to Florida law and the adopted benefit and apportionment methodology. Revenue is dedicated to the services and properties benefiting from the assessment."
    };
    if (/\$2 recording fee|court facilities trust fund fee|additional court cost/i.test(title)) return {
      level: "Low local control",
      className: "is-low",
      text: "The amount and authorized use of this court-related fee are governed by Florida law. Walton County cannot independently increase the statutory charge, and collections depend on the volume of eligible court or recording activity."
    };
    if (/civil process fee/i.test(title)) return {
      level: "Low local control",
      className: "is-low",
      text: "This revenue is collected through the Walton County Sheriff's Office for civil-process activity. Fee authority and amounts are governed by law, so the County cannot independently raise the rate; collections depend on service volume."
    };
    if (/prisoner work detail/i.test(title)) return {
      level: "Low local control",
      className: "is-low",
      text: "This revenue is associated with prisoner work-detail activity administered by the Walton County Sheriff's Office. It depends on eligible assignments and reimbursement arrangements rather than a rate the Board can independently increase."
    };
    if (/recreation plat fee/i.test(title)) return {
      level: "Moderate local control",
      className: "is-moderate",
      text: "The Board may revise the locally adopted fee through a public process, subject to Florida law and requirements connecting the charge to the impact or benefit being funded. Proceeds remain dedicated to their authorized purpose."
    };
    if (/ambulance/i.test(title)) return {
      level: "Low local control",
      className: "is-low",
      text: "This ambulance revenue is collected by the Walton County Sheriff's Office. Collections depend on emergency-service activity, payer mix, Medicare, Medicaid and insurer reimbursement rules, and collection experience; it is not a Board-controlled revenue rate."
    };
    if (/golf|eagle springs/i.test(title)) return {
      level: "Moderate local control",
      className: "is-moderate",
      text: "The Board can revise County-adopted user fees through a public action. Actual revenue depends on participation, pricing, operating capacity, and customer demand, so fee changes do not guarantee a proportional increase in collections."
    };
    if (/membership fee|green fee|cart fee|grill (?:food|beverage) revenue|pro shop sales|program & sports fee|pool entry fee|restaurant non-taxable|golf course non-taxable|morrison springs entry fee|park rental fee|office rental|library rentals/i.test(title)) return {
      level: "Moderate local control",
      className: "is-moderate",
      text: "The County can revise the adopted price or user fee through its public budget and rate-setting process. Actual revenue remains dependent on participation, facility capacity, customer demand, and the amount of service provided."
    };
    if (/permits|fees|charges/i.test(title) || topicType === "Charges for Services" || topicType === "Permits, Fees, and Special Assessments") return {
      level: "Moderate local control",
      className: "is-moderate",
      text: "The Board can generally revise County-adopted rates or fee schedules through a public action, subject to state law and any requirement that charges reasonably relate to the cost or benefit of the service. Actual revenue still depends on service demand and collection activity."
    };
    if (/fine|forfeit/i.test(title) || topicType === "Judgments, Fines and Forfeits") return {
      level: "Limited local control",
      className: "is-limited",
      text: "Fine amounts and collections are constrained by state law, County ordinances, enforcement activity, and court outcomes. They are intended to support compliance and are not treated as a dependable lever for increasing recurring revenue."
    };
    if (/interest|investment/i.test(title)) return {
      level: "Low local control",
      className: "is-low",
      text: "The County can manage cash and investments within its adopted policy, but it cannot set market interest rates. Revenue changes mainly with available cash balances, investment duration, and financial-market conditions."
    };
    if (topicType === "Intergovernmental Revenues") return {
      level: "Low local control",
      className: "is-low",
      text: "This receipt is administered or provided by another governmental entity. Walton County cannot independently set the amount, underlying rate, or distribution method; collections depend on external authorization, eligibility, appropriations, or activity measured outside the County's direct control."
    };
    return {
      level: "Low local control",
      className: "is-low",
      text: "The County does not have documented independent authority to materially increase this revenue source. Collections depend on outside requirements, agreements, economic activity, reimbursement terms, or other factors that the County does not directly control."
    };
  }

  function revenueRestrictionLabel(name) {
    const evidence = String(name || "");
    const explicitlyUnrestricted = /short-term rental certificate|beach vending permit|beach bonfire permit/i;
    if (explicitlyUnrestricted.test(evidence)) return "Unrestricted";
    const dedicatedPattern = /(?:fuel tax|federal grant|state grant|tourist development|\btdc\b|\bmsbu\b|e-?911|boating improvement|recreation plat|sidewalk|sewer|wastewater|court|law library|juvenile justice|legal aid|innovative programs|building permits|beach (?:dog|vehicle)|coastal armoring|landfill|resource officer|opioid|miscellaneous revenue|supplemental fire|planning fees|development order inspection|code enforcement fees|\$2 recording fee)/i;
    return dedicatedPattern.test(evidence) ? "Restricted" : "Unrestricted";
  }

  const REVENUE_ACTUAL_FIELD_NAMES = new Set(BUDGET_LINE_PRIOR_YEAR_COLUMNS.filter((c) => c.actual).map((c) => c.field));

  function sumRevenueRowsForField(rows, field, options) {
    if (options && options.useRowScopedActuals && REVENUE_ACTUAL_FIELD_NAMES.has(field)) {
      const bestByKey = new Map();
      (rows || []).forEach((row) => {
        if (row._actualsDeduped || row._actualsSuppressed) return;
        const key = revenueBudgetUniqueKey(row);
        const val = revenueDisplayAmount(row[field] || 0);
        if (!bestByKey.has(key) || val > bestByKey.get(key)) bestByKey.set(key, val);
      });
      return Array.from(bestByKey.values()).reduce((s, v) => s + v, 0);
    }
    if (REVENUE_ACTUAL_FIELD_NAMES.has(field) && (cache.revenueActualRows || []).length) {
      const year = Number(field.slice(2, 6));
      const codes = new Set(rows.map((row) => String((row && row.Revenue_Code) || "").trim()).filter(Boolean));
      const fundCodes = new Set(rows.map((row) => fundCodeForRow(row)).filter(Boolean));
      // Grouped by individual revenue code, each with its own Math.abs(),
      // same as rawRevenueActualSummarySum/revenueActualAmountForCodes --
      // a topic bar spanning several codes (e.g. Interest and Other
      // Earnings' four codes) would otherwise let a negative-convention
      // code and a positive one partially cancel instead of both counting
      // as positive revenue.
      const rawTotalsByCode = new Map();
      (cache.revenueActualRows || []).forEach((row) => {
        if (Number(row.year) !== year) return;
        const code = String(row.object || "").trim();
        if (!codes.has(code)) return;
        const rowOrg = String(row.org || "").trim();
        const rowFundCode = rowOrg.slice(0, 3);
        if (CONSOLIDATED_SCHEDULE_EXCLUDED_FUND_CODES.has(rowFundCode)) return;
        if (fundCodes.size && !fundCodes.has(rowFundCode)) return;
        // Indirect Administrative Fees (369901): org 111369 (Tourist
        // Development Fund) carries historical actuals under this code,
        // but it's the paying side of the same interfund transfer the
        // General Fund (001369) and Sheriff Fund (107369) book as the fee
        // revenue -- not a real additional revenue source, and it has no
        // corresponding FY2027 budget line. The fundCodes check above
        // should already exclude it (only 001/107 have a current budget
        // row for this code), but this is an explicit backstop since that
        // fund-111 row was still leaking into the total (inflating FY2024
        // Actual from ~$2.98M to ~$6.72M).
        if (code === "369901" && rowOrg === "111369") return;
        rawTotalsByCode.set(code, (rawTotalsByCode.get(code) || 0) + (Number(row.amount) || 0));
      });
      let total = 0;
      rawTotalsByCode.forEach((codeTotal) => {
        total += revenueDisplayAmount(codeTotal);
      });
      return total;
    }

    if (field === "FY2026_Original_Budget") {
      // Group by revenueBudgetUniqueKey (Fund+Dept_Code+Revenue_Code+Project_Code)
      // to prevent double-counting when many Dept_Name rows share the same GL
      // account and each carries the full county-wide BUC total. Within each
      // group take the MAX contribution so that a $0 row (e.g. Code Compliance
      // whose BUC lookup excludes project 10647) never shadows a non-zero row
      // for the same key (e.g. the BCC beach vending row that includes it).
      const bestByKey = new Map();
      (rows || []).forEach((row) => {
        if (row._originalBudgetDeduped) return;
        const key = revenueBudgetUniqueKey(row);
        const val = revenueBudgetMergeContribution(row);
        if (!bestByKey.has(key) || val > bestByKey.get(key)) bestByKey.set(key, val);
      });
      return Array.from(bestByKey.values()).reduce((s, v) => s + v, 0);
    }

    return rows.reduce((sum, row) => {
      return sum + (row[field] || 0);
    }, 0);
  }

  // Shared with renderRevenueTopicPlaceholders so a topic's placeholder
  // and its real, data-loaded block land on the exact same id.
  function revenueTopicSlug(title) {
    return String(title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  // Renders an instant, data-free skeleton for each topic (same ids as
  // the real charts renderRevenueTopicCards fills in later) so a homepage
  // revenue card's #slug link has something to scroll to immediately,
  // instead of waiting on loadBudgetData() -- which is a network fetch
  // and can take a beat -- before the target id even exists.
  function renderRevenueTopicPlaceholders(container, topics) {
    if (!container) return;
    container.innerHTML = topics.map((topic) =>
      '<div class="wc-revenue-topic-block" id="' + escapeHtml(revenueTopicSlug(topic.title)) + '">' +
      '<div class="wc-data-loading">' + LOADING_MESSAGE_HTML + "</div>" +
      "</div>"
    ).join("");
  }

  function renderRevenueTopicCards(container, topics, idPrefix) {
    if (!container) return;
    // The Self-Insurance Fund (503) is an Internal Service fund, not a
    // governmental one, and is excluded from every other revenue
    // schedule on the site for the same reason (see
    // CONSOLIDATED_SCHEDULE_EXCLUDED_FUND_CODES) -- its premium/fee
    // revenue (Employee/Retiree/Cobra Health Fees, etc.) has no business
    // appearing on these topic cards either.
    const revenueRows = (cache.revenues || []).filter((r) => !CONSOLIDATED_SCHEDULE_EXCLUDED_FUND_CODES.has(fundCodeForRow(r)));
    const narrativeRows = cache.departmentNarratives || [];

    function explorerSourceName(row) {
      let name = String(row.Revenue_Name || "Unclassified Revenue").trim() || "Unclassified Revenue";
      if (/interest/i.test(name)) name = "Interest and Investment Earnings";
      if (/^ad valorem taxes$/i.test(name)) name = "Property Taxes";
      if (String(row.Revenue_Code || "").trim() === "312140" || normalizeDeptName(name) === "tourist development tax other") {
        name = "Tourist Development Tax Other";
      } else if (/^tourist development tax/i.test(name)) name = "Tourist Development Taxes";
      return name;
    }

    function rowsForRevenueTopic(topic) {
      if (!topic.isAllOtherRevenue) return revenueRows.filter(topic.matches);
      const eligible = revenueRows.filter((row) => {
        const name = String(row.Revenue_Name || "");
        return String(row.Revenue_Code || "").trim() !== "381000" &&
          ((row.FY2027_Proposed || 0) > 0 || String(row.Revenue_Code || "").trim() === "322000") &&
          !/(balance brought forward|fund balance|cash balance|prior[- ]year balance|carryforward|carry forward)/i.test(name);
      });
      const totals = new Map();
      eligible.forEach((row) => {
        const name = explorerSourceName(row);
        totals.set(name, (totals.get(name) || 0) + (row.FY2027_Proposed || 0));
      });
      const leadingNames = new Set(Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map((item) => item[0]));
      return eligible.filter((row) => !leadingNames.has(explorerSourceName(row)));
    }

    container.innerHTML = topics.map((topic, topicIndex) => {
      const narrativeRow = narrativeRows.find((r) => normalizeDeptName(r.Dept_Name) === normalizeDeptName(topic.narrativeKey));
      const paragraphs = narrativeRow ? splitIntoParagraphs(narrativeRow.Narrative) : [];
      const topicRows = rowsForRevenueTopic(topic);
      let narrativeHtml = paragraphs.length
        ? paragraphs.map((p) => "<p>" + formatNarrativeText(p) + "</p>").join("")
        : '<p class="wc-data-empty">Narrative coming soon.</p>';
      if (topic.useLedgerNotes) {
        const notes = uniqueSorted(topicRows.map((row) => String(row.Note || "").trim()).filter(Boolean));
        const type = topicRows.length ? topicRows[0].Revenue_Type : "";
        if (!paragraphs.length) {
          narrativeHtml = notes.length
            ? notes.map((note) => '<p>' + escapeHtml(note) + '</p>').join("")
            : '<p>' + escapeHtml(TYPE_TOOLTIPS[type] || "No additional ledger description is currently available for this revenue source.") + '</p>';
        }
      }
      if (/indirect administrative fee/i.test(topic.title)) {
        narrativeHtml = '<p>Indirect Administrative Fees reimburse the General Fund for centralized services provided to special revenue funds. The allocation is based on a formal cost-allocation plan prepared by an independent third party.</p>';
      } else if (/local government\s+(?:half|1\s*\/\s*2)[ -]?cent sales tax/i.test(topic.title)) {
        narrativeHtml = '<p>Florida&rsquo;s Local Government Half-cent Sales Tax Program provides counties and municipalities with a share of state sales-tax proceeds. Under <a href="https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&amp;URL=0200-0299/0218/Sections/0218.61.html" target="_blank" rel="noopener noreferrer">section 218.61, Florida Statutes</a>, receipts are placed in the state clearing trust fund and distributed monthly to participating local governments.</p><p>This revenue has generally grown with sales-tax activity, with stronger summer collections reflecting Walton County&rsquo;s seasonal economy. It supports general County services and facilities, but Walton County does not establish the tax rate or distribution formula.</p>';
      } else if (/housing prisoners revenue/i.test(topic.title)) {
        narrativeHtml = '<p>Housing Prisoners Revenue is collected by the Walton County Sheriff\'s Office for prisoner-housing activity under the applicable reimbursement arrangements.</p>';
      } else if (/ambulance/i.test(topic.title)) {
        narrativeHtml = '<p>Ambulance Fees are revenues collected by the Walton County Sheriff\'s Office for emergency medical transport services. Actual collections reflect service activity, payer mix, reimbursement rules, and collection experience.</p>';
      }
      if (topic.isAllOtherRevenue) {
        const sourceDetails = new Map();
        topicRows.forEach((row) => {
          const name = explorerSourceName(row);
          const existing = sourceDetails.get(name) || { amount: 0, notes: new Set(), type: row.Revenue_Type || "Other" };
          existing.amount += row.FY2027_Proposed || 0;
          if (String(row.Note || "").trim()) existing.notes.add(String(row.Note).trim());
          sourceDetails.set(name, existing);
        });
        const detailRows = Array.from(sourceDetails.entries()).sort((a, b) => b[1].amount - a[1].amount);
        const restrictedRows = detailRows.filter((entry) => revenueRestrictionLabel(entry[0]) === "Restricted");
        const unrestrictedRows = detailRows.filter((entry) => revenueRestrictionLabel(entry[0]) === "Unrestricted");
        const directoryRowsHtml = (entries) => entries.map((entry) =>
          '<button type="button" data-revenue-explorer-target="' + escapeHtml(revenueTopicSlug(entry[0])) + '"><span>' + escapeHtml(entry[0]) + '</span><strong>' + (entry[0] === "Building Permits" && !entry[1].amount ? 'Fees suspended' : escapeHtml(formatCurrency(entry[1].amount))) + '</strong><b aria-hidden="true">→</b></button>'
        ).join("");
        narrativeHtml = '<p>These smaller sources collectively support the revenue plan without individually ranking among the five largest current sources. Select a source to open its description, historical trend, projections, and assumptions.</p>' +
          '<div class="wc-other-revenue-groups">' +
          '<section class="wc-other-revenue-group is-restricted"><h3><span aria-hidden="true"></span>Restricted <small>' + restrictedRows.length + ' sources</small></h3><div class="wc-other-revenue-directory">' + directoryRowsHtml(restrictedRows) + '</div></section>' +
          '<section class="wc-other-revenue-group is-unrestricted"><h3><span aria-hidden="true"></span>Unrestricted <small>' + unrestrictedRows.length + ' sources</small></h3><div class="wc-other-revenue-directory">' + directoryRowsHtml(unrestrictedRows) + '</div></section>' +
          '</div>';
      }

      const adValoremCurrentAmount = topic.title === "Property Taxes"
        ? topicRows.reduce((sum, row) => sum + (row.FY2027_Proposed || 0), 0)
        : 0;
      const adValoremBurdenHtml = topic.title === "Property Taxes"
        ? '<div class="wc-property-tax-burden"><div class="wc-property-tax-burden-head"><strong>Who carries the property-tax base?</strong><span>Share of taxable value</span></div>' +
          '<div class="wc-property-tax-burden-row"><div><span>Homestead property</span><small>Owner-occupied resident property</small></div><strong>16.7%</strong><em>' + escapeHtml(formatCurrency(adValoremCurrentAmount * 0.1667)) + '</em></div>' +
          '<div class="wc-property-tax-burden-row"><div><span>Commercial &amp; industrial</span><small>Improved and vacant business property</small></div><strong>5.3%</strong><em>' + escapeHtml(formatCurrency(adValoremCurrentAmount * 0.053)) + '</em></div>' +
          '<div class="wc-property-tax-burden-row"><div><span>Other taxable property</span><small>Includes non-homestead homes, rentals, second homes, acreage, and other uses</small></div><strong>78.0%</strong><em>' + escapeHtml(formatCurrency(adValoremCurrentAmount * 0.78)) + '</em></div>' +
          '<div class="wc-property-tax-burden-bar wc-property-tax-burden-bar-stacked" aria-label="Taxable value: 16.7 percent homestead, 5.3 percent commercial and industrial, and 78 percent other taxable property"><i class="is-homestead" style="width:16.7%"></i><i class="is-commercial" style="width:5.3%"></i><i class="is-other" style="width:78%"></i></div>' +
          '<p>Estimated FY 2027 levy shares apply the parcel roll and Florida Department of Revenue&rsquo;s 2025 property-use taxable values to proposed ad valorem revenue. This is a tax-base comparison, not a parcel-level billing calculation. <a href="https://floridarevenue.com/property/Pages/DataPortal_DataBook.aspx" target="_blank" rel="noopener noreferrer">Review the state property-tax data</a>.</p></div>'
        : '';
      const propertyTaxSupportHtml = topic.title === "Property Taxes"
        ? '<button type="button" class="wc-property-tax-support-open" aria-haspopup="dialog" aria-controls="wc-property-tax-support-dialog">What does my property tax support?</button>' +
          '<dialog class="wc-property-tax-support-dialog" id="wc-property-tax-support-dialog" aria-labelledby="wc-property-tax-support-title"><div><header><div><span>Personalized property-tax estimate</span><h3 id="wc-property-tax-support-title">What does your property tax support?</h3></div><button type="button" class="wc-property-tax-support-close" aria-label="Close personalized property-tax estimate">&times;</button></header><iframe title="Walton County personalized property-tax support calculator" data-src="summary-of-property-tax-allocations.html?embed=calculator"></iframe></div></dialog>'
        : '';
      const homesteadForegoneHtml = topic.title === "Property Taxes"
        ? '<div class="wc-revenue-control-profile wc-homestead-foregone" data-homestead-foregone aria-live="polite"><div><strong>Homestead-related revenue forgone</strong><span class="is-moderate"><span class="wc-loading-dots" aria-label="Calculating estimate"><span></span><span></span><span></span></span></span></div><p>Calculating from the County parcel roll and FY 2027 proposed millage rate.</p></div>'
        : '';
      const isSalesTaxBurdenTopic = topicRows.some((row) => ["312600", "335180"].includes(String(row.Revenue_Code || "").trim())) ||
        /(?:sales surtax|half.?cent sales tax|1\s*\/\s*2 cent sales tax)/i.test(topic.title);
      const salesTaxCurrentAmount = isSalesTaxBurdenTopic
        ? topicRows.reduce((sum, row) => sum + (row.FY2027_Proposed || 0), 0)
        : 0;
      const salesTaxBurdenHtml = isSalesTaxBurdenTopic
        ? '<div class="wc-property-tax-burden wc-sales-tax-burden"><div class="wc-property-tax-burden-head"><strong>Who supports this sales-tax revenue?</strong><span>Estimated share</span></div>' +
          '<div class="wc-property-tax-burden-row"><div><span>Visitor-supported</span><small>Estimated from visitors&rsquo; share of retail spending</small></div><strong>80.2%</strong><em>' + escapeHtml(formatCurrency(salesTaxCurrentAmount * 0.802)) + '</em></div>' +
          '<div class="wc-property-tax-burden-bar"><i style="width:80.2%"></i></div>' +
          '<div class="wc-property-tax-burden-row"><div><span>Local-supported</span><small>Estimated resident and local-business activity</small></div><strong>19.8%</strong><em>' + escapeHtml(formatCurrency(salesTaxCurrentAmount * 0.198)) + '</em></div>' +
          '<p>This planning estimate applies the County tourism report&rsquo;s visitor share of retail spending to FY 2027 proposed revenue; it is not an audited classification of individual tax payments.' + (topic.title === "Local Government Half-Cent Sales Tax" ? '' : ' <a href="https://www.waltoncountyfltourism.com/press/walton-county-tourism-department-releases-annual-update/" target="_blank" rel="noopener noreferrer">Review the tourism update</a>.') + '</p></div>'
        : '';
      const touristTaxCurrentAmount = topic.title === "Tourist Development Taxes"
        ? topicRows.reduce((sum, row) => sum + (row.FY2027_Proposed || 0), 0)
        : 0;
      const touristTaxBurdenHtml = topic.title === "Tourist Development Taxes"
        ? '<div class="wc-property-tax-burden wc-tourist-tax-burden"><div class="wc-property-tax-burden-head"><strong>Who supports this tax?</strong><span>Share of revenue</span></div>' +
          '<div class="wc-property-tax-burden-row"><div><span>Visitors</span><small>Paid on hotels, vacation rentals, and other short-term lodging</small></div><strong>100%</strong><em>' + escapeHtml(formatCurrency(touristTaxCurrentAmount)) + '</em></div>' +
          '<div class="wc-property-tax-burden-bar wc-tourist-tax-burden-bar"><i style="width:100%"></i></div>' +
          '<p>Tourist Development Tax is presented as entirely visitor-supported because it is collected on short-term lodging rather than residents&rsquo; regular property-tax bills.</p></div>'
        : '';
      const accessBadgeHtml = topic.accessLabel
        ? (/interest and investment earnings/i.test(topic.title) && new Set(topicRows.map((row) => revenueRestrictionLabel(row.Revenue_Name))).size > 1
          ? '<div class="wc-revenue-snapshot-access is-restricted" data-revenue-tooltip="Restricted funds may be used only for the legally or locally designated purpose.">Restricted</div><span class="wc-revenue-badge-separator">&amp;</span><div class="wc-revenue-snapshot-access is-unrestricted" data-revenue-tooltip="Unrestricted revenue may support general County priorities through the adopted budget.">Unrestricted</div>'
          : '<div class="wc-revenue-snapshot-access ' + (/restricted/i.test(topic.accessLabel) && !/^unrestricted$/i.test(topic.accessLabel) ? 'is-restricted' : 'is-unrestricted') + '" data-revenue-tooltip="' + (/restricted/i.test(topic.accessLabel) && !/^unrestricted$/i.test(topic.accessLabel) ? 'Restricted funds may be used only for the legally or locally designated purpose.' : 'Unrestricted revenue may support general County priorities through the adopted budget.') + '">' + escapeHtml(topic.accessLabel) + '</div>')
        : '';
      const recurrenceBadgeHtml = topic.recurrenceLabel
        ? '<div class="wc-revenue-recurrence-badge ' + (topic.recurrenceLabel === "Non-recurring" ? 'is-nonrecurring' : 'is-recurring') + '" data-revenue-tooltip="' + (topic.recurrenceLabel === "Non-recurring" ? 'Non-recurring revenue is expected as a one-time or irregular source rather than a dependable annual stream.' : 'Recurring revenue is expected to continue as an annual source, subject to changes in collections and policy.') + '">' + escapeHtml(topic.recurrenceLabel) + '</div>'
        : '';
      const topicControl = revenueControlProfile(topic, topicRows[0] && topicRows[0].Revenue_Type);
      const controlBadgeHtml = topicControl && topicControl.level
        ? '<div class="wc-revenue-control-badge ' + escapeHtml(topicControl.className) + '" data-revenue-tooltip="' + escapeHtml(topicControl.text) + '">' + escapeHtml(topicControl.level.replace(/ local control$/i, " control")) + '</div>'
        : '';
      const topicBadgesHtml = accessBadgeHtml || recurrenceBadgeHtml || controlBadgeHtml
        ? '<div class="wc-revenue-topic-badges">' + accessBadgeHtml + recurrenceBadgeHtml + controlBadgeHtml + '</div>'
        : '';
      const matchingTopicRows = topicRows;
      const topicType = matchingTopicRows.length ? matchingTopicRows[0].Revenue_Type : "";
      const projectionRate = revenueProjectionRate(topicType, topic);
      const projectionNote = topic.isAllOtherRevenue
        ? "FY 2028 and FY 2029 apply each source's revenue-category assumption to its FY 2027 proposed amount."
        : (projectionRate
          ? "FY 2028 and FY 2029 apply " + (projectionRate * 100).toFixed(1).replace(/\.0$/, "") + "% annual growth to the FY 2027 proposed amount."
          : "FY 2028 and FY 2029 hold the FY 2027 proposed amount level because no recurring growth assumption is applied.");
      // Historical compound annual growth rate across the actual years the
      // chart already plots (FY2022-FY2025), so the forward assumption can be
      // read against what collections actually did. Skipped when either
      // endpoint is zero/missing (a CAGR off a $0 base is meaningless) or when
      // the source has fewer than two actual years.
      const actualChartYears = REVENUE_TOPIC_CHART_YEARS.filter((y) => /_Actual$/.test(y.field));
      const actualSeries = actualChartYears
        .map((y) => ({ year: Number(y.field.slice(2, 6)), value: sumRevenueRowsForField(topicRows, y.field, topic) }))
        .filter((point) => point.value > 0);
      let historicalNote = "";
      if (actualSeries.length >= 2) {
        const first = actualSeries[0];
        const last = actualSeries[actualSeries.length - 1];
        const span = last.year - first.year;
        if (span > 0) {
          const cagr = (Math.pow(last.value / first.value, 1 / span) - 1) * 100;
          historicalNote = " For comparison, actual collections changed " +
            (cagr >= 0 ? "+" : "−") + Math.abs(cagr).toFixed(1) +
            "% per year from FY " + first.year + " to FY " + last.year + " (" +
            formatAbbreviatedCurrency(first.value) + " to " + formatAbbreviatedCurrency(last.value) + ").";
        }
      }
      const comparisonNote = topic.title === "Property Taxes"
        ? " The FY 2026 comparison is normalized to the FY 2027 rolled-back-rate planning basis because the separate 95% presentation changed between years; the Revenue Ledger retains the reported accounting amounts."
        : "";
      const adValoremStatusHtml = topic.title === "Property Taxes"
        ? '<div class="wc-revenue-control-profile wc-revenue-policy-context"><div><strong>Current policy context</strong><span class="is-varied">Policy update</span></div><p>Walton County is utilizing the 3.4347 rolled-back countywide millage rate for the FY 2027 proposal. Florida voters are scheduled to consider a property-tax constitutional amendment in November 2026. If approved, it would increase the non-school homestead exemption to $150,000 in 2027 and $250,000 in 2028. Because voter approval and the local revenue effect remain uncertain, the two planning years are held flat. <a href="https://www.flsenate.gov/Session/Bill/2026F/2F/BillText/c1/HTML" target="_blank" rel="noopener noreferrer">Review the proposed amendment</a>.</p></div>'
        : "";
      const assumptionHtml = topic.isAllOtherRevenue ? "" :
        '<div class="wc-revenue-assumption"><strong>Projection assumption</strong><p>' + escapeHtml(projectionNote + historicalNote + comparisonNote) + ' These estimates are for planning and will be updated as economic and state guidance changes.</p></div>';
      const controlProfile = revenueControlProfile(topic, topicType);
      const controlProfileHtml =
        '<div class="wc-revenue-control-profile">' +
        '<div><strong>County ability to increase revenue</strong><span class="' + controlProfile.className + '">' + escapeHtml(controlProfile.level.replace(/ local control$/i, " control")) + '</span></div>' +
        '<p>' + escapeHtml(controlProfile.text) + '</p>' +
        '</div>';
      const chartCardHtml =
        '<div class="wc-revenue-topic-chart-card">' +
        topicBadgesHtml +
        propertyTaxSupportHtml +
        '<div class="wc-revenue-topic-chart-wrap"><canvas id="' + idPrefix + "-" + topicIndex + '"></canvas></div>' +
        '<div class="wc-revenue-chart-legend" id="' + idPrefix + "-" + topicIndex + '-legend"></div>' +
        assumptionHtml +
        adValoremBurdenHtml +
        salesTaxBurdenHtml +
        touristTaxBurdenHtml +
        "</div>";
      const detailActionsHtml =
        '<div class="wc-revenue-detail-actions">' +
        '<button type="button" class="wc-revenue-close-detail">Close Revenue Detail</button>' +
        (topic.isAllOtherRevenue ? "" : '<button type="button" class="wc-revenue-back-to-other">← Back to All Other Revenue</button>') +
        '</div>';
      const narrativeCardHtml =
        '<div class="wc-revenue-topic-narrative-card">' +
        '<h2 class="wc-revenue-topic-title">' + escapeHtml(topic.title) + "</h2>" +
        narrativeHtml +
        controlProfileHtml +
        adValoremStatusHtml +
        homesteadForegoneHtml +
        "</div>";
      const isReversed = topicIndex % 2 === 1;

      if (topic.isAllOtherRevenue) {
        return '<div class="wc-revenue-topic-block" id="' + escapeHtml(revenueTopicSlug(topic.title)) + '">' + detailActionsHtml + '<div class="wc-revenue-topic-row wc-revenue-topic-row-list-only">' + narrativeCardHtml + '</div></div>';
      }
      return (
        '<div class="wc-revenue-topic-block" id="' + escapeHtml(revenueTopicSlug(topic.title)) + '">' +
        detailActionsHtml +
        '<div class="wc-revenue-topic-row' + (isReversed ? " wc-revenue-topic-row-reverse" : "") + '">' +
        (isReversed ? narrativeCardHtml + chartCardHtml : chartCardHtml + narrativeCardHtml) +
        "</div>" +
        "</div>"
      );
    }).join("");

    const homesteadForegone = container.querySelector("[data-homestead-foregone]");
    if (homesteadForegone) {
      fetch(new URL("../data/walton-parcels.csv", window.location.href))
        .then((response) => {
          if (!response.ok) throw new Error("Parcel roll request failed");
          return response.text();
        })
        .then((csvText) => {
          const parcels = parseCSV(csvText);
          const homesteadParcels = parcels.filter((parcel) => String(parcel.homestead || "").trim());
          const exemptValue = homesteadParcels.reduce((sum, parcel) => {
            const assessed = Number(parcel.assessedValue) || 0;
            const taxable = Number(parcel.taxableValue) || 0;
            return sum + Math.max(0, assessed - taxable);
          }, 0);
          const proposedMillage = 3.4347;
          const foregoneLevy = exemptValue * proposedMillage / 1000;
          homesteadForegone.innerHTML = '<div><strong>Homestead-related revenue forgone</strong><span class="is-moderate">' + escapeHtml(formatCurrency(foregoneLevy)) + '</span></div>' +
            '<p><b>' + escapeHtml(formatCurrency(exemptValue)) + '</b> of assessed value is removed from the taxable base across <b>' + escapeHtml(formatNumber(homesteadParcels.length)) + '</b> homestead-designated parcels, forgoing an estimated <b>' + escapeHtml(formatCurrency(foregoneLevy)) + '</b> in county levy. The estimate applies the FY 2027 proposed countywide rate of <b>3.4347 mills</b>. It reflects all exemptions recorded on homestead-designated parcels and is not a parcel-level tax calculation.</p>';
        })
        .catch(() => {
          homesteadForegone.innerHTML = '<div><strong>Homestead-related revenue forgone</strong><span class="is-low">Not available</span></div><p>The parcel-based estimate could not be calculated.</p>';
        });
    }

    const propertyTaxSupportOpen = container.querySelector(".wc-property-tax-support-open");
    const propertyTaxSupportDialog = container.querySelector(".wc-property-tax-support-dialog");
    const propertyTaxSupportClose = container.querySelector(".wc-property-tax-support-close");
    if (propertyTaxSupportOpen && propertyTaxSupportDialog) {
      propertyTaxSupportOpen.addEventListener("click", () => {
        const frame = propertyTaxSupportDialog.querySelector("iframe[data-src]");
        if (frame && !frame.getAttribute("src")) frame.setAttribute("src", frame.dataset.src);
        document.documentElement.classList.add("wc-modal-open");
        propertyTaxSupportDialog.showModal();
      });
      if (propertyTaxSupportClose) propertyTaxSupportClose.addEventListener("click", () => propertyTaxSupportDialog.close());
      propertyTaxSupportDialog.addEventListener("click", (event) => {
        if (event.target === propertyTaxSupportDialog) propertyTaxSupportDialog.close();
      });
      propertyTaxSupportDialog.addEventListener("close", () => {
        document.documentElement.classList.remove("wc-modal-open");
      });
    }

    if (typeof Chart === "undefined") return;

    topics.forEach((topic, topicIndex) => {
      // Grouped by Revenue_Name (not Revenue_Code) so codes that share a
      // name, like Tourist Development Tax's per-cent tiers, combine into
      // a single bar segment instead of one sliver per code.
      const byName = new Map();
      rowsForRevenueTopic(topic).forEach((r) => {
        const name = topic.isAllOtherRevenue ? explorerSourceName(r) : (r.Revenue_Name || String(r.Revenue_Code || "").trim());
        if (!byName.has(name)) byName.set(name, []);
        byName.get(name).push(r);
      });

      const baseColors = Array.from(byName.keys()).map((_, i) => REVENUE_TOPIC_CHART_COLORS[i % REVENUE_TOPIC_CHART_COLORS.length]);
      const datasets = Array.from(byName.entries()).map(([name, rowsForName], i) => ({
        label: name,
        data: REVENUE_TOPIC_CHART_YEARS.map((y) => {
          if (topic.title === "Property Taxes" && y.field === "FY2026_Original_Budget") {
            return sumRevenueRowsForField(rowsForName, "FY2027_Proposed", topic);
          }
          return y.projectedYear
            ? projectedRevenueAmount(sumRevenueRowsForField(rowsForName, "FY2027_Proposed", topic), rowsForName[0] && rowsForName[0].Revenue_Type, y.projectedYear, topic)
            : sumRevenueRowsForField(rowsForName, y.field, topic);
        }),
        // Scriptable so it re-resolves (via registerWcThemedChart's
        // chart.update() on theme change) to a dark-mode-legible variant
        // instead of staying fixed at the light-mode hex forever -- see
        // chartColorForTheme.
        backgroundColor: (context) => {
          if (context.dataIndex === 5) return "#9ed9a8";
          if (context.dataIndex === 6) return "#79b99a";
          if (context.dataIndex === 7) return "#4f9675";
          return chartColorForTheme(baseColors[i]);
        }
      }));

      const canvas = document.getElementById(idPrefix + "-" + topicIndex);
      if (!canvas || !datasets.length) return;

      const chart = new Chart(canvas, {
        type: "bar",
        data: { labels: REVENUE_TOPIC_CHART_YEARS.map((y) => y.label), datasets: datasets },
        plugins: [stackedBarRoundingPlugin(6)],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              stacked: true,
              grid: { display: false },
              ticks: { color: () => wcChartThemeColors().text }
            },
            y: {
              stacked: true,
              beginAtZero: true,
              grid: { display: true, color: () => wcChartThemeColors().grid },
              ticks: { color: () => wcChartThemeColors().text, callback: (v) => formatAbbreviatedCurrency(v) }
            }
          },
          // See renderExpenseActivityChart's matching comment -- isolates
          // the hovered bar segment's own tooltip instead of every
          // dataset's value at that x position.
          interaction: { mode: "nearest", intersect: true },
          plugins: {
            legend: { display: false },
            tooltip: {
              mode: "nearest",
              intersect: true,
              callbacks: {
                label: (ctx) => ctx.dataset.label + ": " + formatAbbreviatedCurrency(ctx.parsed.y)
              }
            }
          }
        }
      });
      registerWcThemedChart(chart);

      // Chart.js's built-in bottom legend gets cramped/overlaps once a
      // topic has more than a few revenue codes (e.g. State Fuel Taxes),
      // so render a full, always-visible custom legend list instead.
      const legendEl = document.getElementById(idPrefix + "-" + topicIndex + "-legend");
      if (legendEl) {
        if (datasets.length <= 1) {
          legendEl.hidden = true;
          return;
        }
        legendEl.innerHTML = datasets.map((d, i) =>
          '<button type="button" class="wc-revenue-chart-legend-item" data-index="' + i + '">' +
          '<span class="wc-revenue-chart-legend-swatch" style="background:' + chartColorForTheme(baseColors[i]) + '"></span>' +
          "<span>" + escapeHtml(d.label) + "</span>" +
          "</button>"
        ).join("");
        onWcThemeChange(() => {
          legendEl.querySelectorAll(".wc-revenue-chart-legend-swatch").forEach((swatch, i) => {
            swatch.style.background = chartColorForTheme(baseColors[i]);
          });
        });

        legendEl.querySelectorAll(".wc-revenue-chart-legend-item").forEach((item) => {
          const i = Number(item.dataset.index);
          item.addEventListener("mouseenter", () => {
            chart.setActiveElements(chart.data.datasets[i].data.map((_, di) => ({ datasetIndex: i, index: di })));
            chart.update();
          });
          item.addEventListener("mouseleave", () => {
            chart.setActiveElements([]);
            chart.update();
          });
          item.addEventListener("click", () => {
            handleChartLegendIsolateClick(chart, legendEl, i);
          });
        });
      }
    });

    const topicBlocks = Array.from(container.querySelectorAll(".wc-revenue-topic-block"));
    function activateTopic(index) {
      topicBlocks.forEach((block, blockIndex) => { block.hidden = blockIndex !== index; });
      window.setTimeout(() => window.dispatchEvent(new Event("resize")), 0);
    }
    const hashIndex = topicBlocks.findIndex((block) => "#" + block.id === window.location.hash);
    const sourceSelect = document.getElementById("revenue-source-select");
    const selectedIndex = sourceSelect ? topicBlocks.findIndex((block) => block.id === sourceSelect.value) : -1;
    activateTopic(selectedIndex >= 0 ? selectedIndex : (hashIndex >= 0 ? hashIndex : (sourceSelect ? -1 : 0)));
  }

  function initRevenueSourceExplorer() {
    const select = document.getElementById("revenue-source-select");
    const panels = Array.from(document.querySelectorAll(".wc-revenue-classification-panel"));
    if (!select || !panels.length) return;
    function activateSource(slug) {
      select.value = slug || "";
      panels.forEach((panel) => { panel.hidden = true; });
      if (!slug) return;
      const target = document.getElementById(slug);
      if (!target) return;
      const activePanel = target.closest(".wc-revenue-classification-panel");
      if (activePanel) activePanel.hidden = false;
      const container = target.parentElement;
      container.querySelectorAll(".wc-revenue-topic-block").forEach((block) => { block.hidden = block !== target; });
      window.setTimeout(() => window.dispatchEvent(new Event("resize")), 0);
    }
    select.addEventListener("change", () => {
      delete document.body.dataset.revenueExplorerFromOther;
      activateSource(select.value);
    });
    document.addEventListener("click", (event) => {
      const closeDetailButton = event.target.closest(".wc-revenue-close-detail");
      if (closeDetailButton) {
        delete document.body.dataset.revenueExplorerFromOther;
        activateSource("");
        const explorer = document.getElementById("revenue-source-concentration");
        if (explorer) explorer.hidden = false;
        return;
      }
      const backButton = event.target.closest(".wc-revenue-back-to-other");
      if (backButton) {
        delete document.body.dataset.revenueExplorerFromOther;
        activateSource("all-other-revenue");
        return;
      }
      const profileCard = event.target.closest("[data-revenue-explorer-target]");
      if (!profileCard) return;
      if (profileCard.closest(".wc-other-revenue-directory")) {
        document.body.dataset.revenueExplorerFromOther = "true";
      } else {
        delete document.body.dataset.revenueExplorerFromOther;
      }
      const targetSlug = profileCard.dataset.revenueExplorerTarget || "";
      activateSource(targetSlug);
      const explorer = document.getElementById("revenue-source-concentration");
      if (explorer) explorer.hidden = true;
    });
  }

  function initRevenueTopicCardsPage() {
    const dynamicContainer = document.getElementById("revenue-source-topics");
    if (dynamicContainer) {
      const select = document.getElementById("revenue-source-select");
      if (select) select.innerHTML = '<option value="">Select a revenue source…</option>';
      loadBudgetData().then(() => {
        const eligibleRows = (cache.revenues || []).filter((row) => {
          const name = String(row.Revenue_Name || "");
          return !CONSOLIDATED_SCHEDULE_EXCLUDED_FUND_CODES.has(fundCodeForRow(row)) &&
            String(row.Revenue_Code || "").trim() !== "381000" &&
            ((row.FY2027_Proposed || 0) > 0 || String(row.Revenue_Code || "").trim() === "322000") &&
            !/(balance brought forward|fund balance|cash balance|prior[- ]year balance|carryforward|carry forward)/i.test(name);
        });
        function sourceName(row) {
          let name = String(row.Revenue_Name || "Unclassified Revenue").trim() || "Unclassified Revenue";
          if (/interest/i.test(name)) name = "Interest and Investment Earnings";
          if (/^ad valorem taxes$/i.test(name)) name = "Property Taxes";
          if (String(row.Revenue_Code || "").trim() === "312140" || normalizeDeptName(name) === "tourist development tax other") {
            name = "Tourist Development Tax Other";
          } else if (/^tourist development tax/i.test(name)) name = "Tourist Development Taxes";
          return name;
        }
        const grouped = new Map();
        eligibleRows.forEach((row) => {
          const name = sourceName(row);
          if (!grouped.has(name)) grouped.set(name, []);
          grouped.get(name).push(row);
        });
        const ranked = Array.from(grouped.entries()).map((entry) => ({
          name: entry[0],
          rows: entry[1],
          amount: entry[1].reduce((sum, row) => sum + (row.FY2027_Proposed || 0), 0)
        })).filter((entry) => entry.amount > 0 || entry.name === "Building Permits").sort((a, b) => b.amount - a.amount);
        const originalTopics = REVENUE_CLASSIFICATION_SECTIONS.reduce((all, section) => all.concat(section.topics || []), [])
          .filter((topic) => !topic.isAllOtherRevenue);
        const topics = ranked.map((entry, sourceIndex) => {
          const exactOriginal = originalTopics.find((topic) => normalizeDeptName(topic.title) === normalizeDeptName(entry.name));
          const matchingOriginal = exactOriginal || originalTopics.find((topic) => entry.rows.some((row) => topic.matches(row)));
          return {
            title: entry.name,
            narrativeKey: matchingOriginal ? matchingOriginal.narrativeKey : entry.name,
            useLedgerNotes: true,
            accessLabel: /^Tourist Development Taxes$/i.test(entry.name) ? "State Restricted" : revenueRestrictionLabel(entry.name),
            recurrenceLabel: sourceIndex < 5 ? (/^Interest and Investment Earnings$/i.test(entry.name) ? "Non-recurring" : "Recurring") : "",
            matches: (row) => sourceName(row) === entry.name
          };
        });
        topics.push({ title: "All Other Revenue", narrativeKey: "All Other Revenue", isAllOtherRevenue: true, matches: () => true });
        if (select) {
          select.innerHTML = '<option value="">Select a revenue source…</option>' + topics.map((topic) =>
            '<option value="' + escapeHtml(revenueTopicSlug(topic.title)) + '">' + escapeHtml(topic.title) + '</option>'
          ).join("");
        }
        renderRevenueTopicCards(dynamicContainer, topics, "wc-chart-revenue-source");
        const hashSlug = window.location.hash ? window.location.hash.slice(1) : "";
        if (hashSlug && Array.from(select.options).some((option) => option.value === hashSlug)) {
          select.value = hashSlug;
          select.dispatchEvent(new Event("change"));
        }
      }).catch((err) => {
        console.error("WCBudgetData: failed to load revenue source explorer", err);
        dynamicContainer.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
      });
      return;
    }
    const sections = REVENUE_CLASSIFICATION_SECTIONS.filter((s) => document.getElementById(s.containerId));
    if (!sections.length) return;

    // Placeholders carry the real per-topic ids immediately (synchronously,
    // before loadBudgetData()'s network fetch even starts), so a homepage
    // revenue card's #slug link has something to jump to right away
    // instead of waiting on the data to arrive.
    sections.forEach((s) => {
      renderRevenueTopicPlaceholders(document.getElementById(s.containerId), s.topics);
    });
    if (window.location.hash) {
      const initialTarget = document.getElementById(window.location.hash.slice(1));
      if (initialTarget) initialTarget.scrollIntoView();
    }

    loadBudgetData()
      .then((data) => {
        sections.forEach((s) => {
          const container = document.getElementById(s.containerId);
          if (Object.keys(data.errors || {}).length >= data.datasetCount) {
            container.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
            return;
          }
          renderRevenueTopicCards(container, s.topics, "wc-chart-" + s.containerId);
        });
        // Re-settle scroll position once the real (taller) charts replace
        // the placeholders -- topics above the target growing from a
        // one-line loading message to a full chart would otherwise leave
        // the page scrolled to the wrong spot.
        if (window.location.hash) {
          const target = document.getElementById(window.location.hash.slice(1));
          if (target) target.scrollIntoView();
        }
      })
      .catch((err) => {
        console.error("WCBudgetData: failed to load revenue topic cards", err);
        sections.forEach((s) => {
          document.getElementById(s.containerId).innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
        });
      });
  }

  function renderRevenueBudgetQuestions() {
    const container = document.getElementById("revenue-budget-questions");
    if (!container) return;
    // The Revenue Budget Explorer mounts into an empty section further up the
    // page, so without this the page sits blank while the budget data is in
    // flight -- same loading state every other data-backed page uses.
    const explorerLoadingTarget = document.getElementById("revenue-source-concentration");
    if (explorerLoadingTarget && !explorerLoadingTarget.innerHTML.trim()) {
      explorerLoadingTarget.innerHTML = '<div class="wc-data-loading">' + LOADING_MESSAGE_HTML + "</div>";
    }
    loadBudgetData().then(() => {
      const rows = (cache.revenues || []).filter((r) =>
        String(r.Revenue_Code || "").trim() !== "381000" &&
        !CONSOLIDATED_SCHEDULE_EXCLUDED_FUND_CODES.has(fundCodeForRow(r))
      );
      const total = rows.reduce((sum, row) => sum + (row.FY2027_Proposed || 0), 0);
      const sourceAnalysisRows = rows.filter((row) => {
        const name = String(row.Revenue_Name || "").trim();
        return !/(balance brought forward|fund balance|cash balance|prior[- ]year balance|carryforward|carry forward)/i.test(name);
      });
      const sourceAnalysisTotal = sourceAnalysisRows.reduce((sum, row) => sum + (row.FY2027_Proposed || 0), 0);
      // The rows sourceAnalysisRows excludes above aren't collected revenue
      // -- they're prior-year money the County already had that's being
      // appropriated to balance FY2027 (see "why is all sources not
      // $341,432,816" -- the Total revenue budget headline includes this,
      // the source-card/browse-list analysis intentionally doesn't). Shown
      // as one non-interactive row below so the browse list's total can
      // still foot to the headline figure when no filters are applied.
      const fundBalanceTotal = rows.reduce((sum, row) => {
        const name = String(row.Revenue_Name || "").trim();
        return /(balance brought forward|fund balance|cash balance|prior[- ]year balance|carryforward|carry forward)/i.test(name) ? sum + (row.FY2027_Proposed || 0) : sum;
      }, 0);
      // Several revenue codes (e.g. Ad Valorem Taxes 311000) repeat the
      // full county-wide FY2026_Original_Budget figure on every
      // Dept_Name/fund row instead of splitting it -- summing the raw
      // column double- (or twenty-times-) counts it. sumRevenueRowsForField
      // dedupes by revenueBudgetUniqueKey (Fund+Dept_Code+Revenue_Code+
      // Project_Code) the same way the per-source cards below already do.
      const priorTotal = sumRevenueRowsForField(rows, "FY2026_Original_Budget");
      const sourceAnalysisPriorTotal = sumRevenueRowsForField(sourceAnalysisRows, "FY2026_Original_Budget");
      const totalRevenueChange = total - priorTotal;
      const totalRevenueChangePercent = priorTotal ? totalRevenueChange / Math.abs(priorTotal) * 100 : null;
      const revenueBySource = new Map();
      const revenueRowsBySource = new Map();
      sourceAnalysisRows.forEach((row) => {
        let sourceName = String(row.Revenue_Name || "Unclassified Revenue").trim() || "Unclassified Revenue";
        if (/interest/i.test(sourceName)) sourceName = "Interest and Investment Earnings";
        if (/^ad valorem taxes$/i.test(sourceName)) sourceName = "Property Taxes";
        if (String(row.Revenue_Code || "").trim() === "312140" || normalizeDeptName(sourceName) === "tourist development tax other") {
          sourceName = "Tourist Development Tax Other";
        } else if (/^tourist development tax/i.test(sourceName)) sourceName = "Tourist Development Taxes";
        revenueBySource.set(sourceName, (revenueBySource.get(sourceName) || 0) + (row.FY2027_Proposed || 0));
        if (!revenueRowsBySource.has(sourceName)) revenueRowsBySource.set(sourceName, []);
        revenueRowsBySource.get(sourceName).push(row);
      });
      const visitorSupportedRevenue = sourceAnalysisRows.reduce((sum, row) => {
        const name = String(row.Revenue_Name || "");
        const code = String(row.Revenue_Code || "").trim();
        const amount = row.FY2027_Proposed || 0;
        if (/^tourist development tax/i.test(name)) return sum + amount;
        if (["312600", "335180"].includes(code)) return sum + amount * 0.802;
        return sum;
      }, 0);
      const locallySupportedRevenue = Math.max(0, total - visitorSupportedRevenue);
      const rankedSources = Array.from(revenueBySource.entries())
        .map((item) => ({ name: item[0], amount: item[1], share: total ? item[1] / total : 0 }))
        .filter((item) => item.amount > 0)
        .sort((a, b) => b.amount - a.amount);
      function revenueSourceExplorerTarget(source) {
        return source && source.name ? revenueTopicSlug(source.name) : "";
      }
      const sixLargestSources = rankedSources.slice(0, 6);
      const sixLargestAmount = sixLargestSources.reduce((sum, source) => sum + source.amount, 0);
      const sixLargestSharePercent = total ? Math.round((sixLargestAmount / total) * 100) : 0;
      function revenueChangeHtml(currentAmount, priorAmount, sourceName) {
        const change = currentAmount - priorAmount;
        const percent = priorAmount ? change / Math.abs(priorAmount) * 100 : null;
        const amountText = (change >= 0 ? "+" : "−") + compactRevenueCurrency(Math.abs(change));
        const percentText = percent === null ? "No prior-year base" : ((percent >= 0 ? "+" : "") + percent.toFixed(1) + "%");
        const isFlatProjection = /^(?:Tourist Development Taxes|Discretionary Sales Surtax)$/i.test(String(sourceName || ""));
        const trendText = isFlatProjection ? "Relatively flat" : (percent === null ? "Trend unavailable" : (Math.abs(percent) < 0.5 ? "Relatively flat" : (percent > 0 ? "Trending up" : "Trending down")));
        return '<div class="wc-revenue-snapshot-change' + (change < 0 ? " is-down" : "") + '"><div class="wc-revenue-comparison"><span>Compared to Prior Year</span><div><strong>' + escapeHtml(amountText) + '</strong><em>' + escapeHtml(percentText) + '</em></div></div><div class="wc-revenue-trend"><small>Expected Revenue Trend</small><b>' + escapeHtml(trendText) + '</b></div></div>';
      }
      function compactRevenueCurrency(value) {
        const amount = Math.abs(value || 0);
        const sign = value < 0 ? "−" : "";
        if (amount >= 1000000000) return sign + "$" + (amount / 1000000000).toFixed(amount >= 10000000000 ? 1 : 2).replace(/\.0+$/, "") + "B";
        if (amount >= 1000000) return sign + "$" + (amount / 1000000).toFixed(amount >= 10000000 ? 1 : 2).replace(/\.0+$/, "") + "M";
        if (amount >= 1000) return sign + "$" + Math.round(amount / 1000).toLocaleString("en-US") + "K";
        return sign + formatCurrency(amount);
      }
      const largestSourceCardsHtml = sixLargestSources.map((source, sourceIndex) => {
        const target = revenueSourceExplorerTarget(source);
        const isRestrictedTourism = /tourist development/i.test(source.name);
        // Use the same restriction rule the detail panel/graph badge uses
        // (revenueRestrictionLabel) instead of treating only tourist
        // development as restricted -- otherwise a dedicated revenue could
        // read "Unrestricted" on the card while its own detail view
        // correctly reads "Restricted".
        const cardIsRestricted = isRestrictedTourism || revenueRestrictionLabel(source.name) === "Restricted";
        const recurrenceLabel = /^Interest and Investment Earnings$/i.test(source.name) ? "Non-recurring" : "Recurring";
        const sourceRows = revenueRowsBySource.get(source.name) || [];
        const control = revenueControlProfile({ title: source.name }, sourceRows[0] && sourceRows[0].Revenue_Type);
        const sourceRestrictionLabels = new Set(sourceRows.map((row) => revenueRestrictionLabel(row.Revenue_Name)));
        const sourceAccessBadgeHtml = /interest and investment earnings/i.test(source.name) && sourceRestrictionLabels.size > 1
          ? '<div class="wc-revenue-access-pair"><div class="wc-revenue-snapshot-access is-restricted" data-revenue-tooltip="Restricted funds may be used only for the legally or locally designated purpose.">Restricted</div><span class="wc-revenue-badge-separator">&amp;</span><div class="wc-revenue-snapshot-access is-unrestricted" data-revenue-tooltip="Unrestricted revenue may support general County priorities through the adopted budget.">Unrestricted</div></div>'
          : '<div class="wc-revenue-snapshot-access ' + (cardIsRestricted ? "is-restricted" : "is-unrestricted") + '" data-revenue-tooltip="' + (cardIsRestricted ? "Restricted funds may be used only for the legally or locally designated purpose." : "Unrestricted revenue may support general County priorities through the adopted budget.") + '">' + (isRestrictedTourism ? "State Restricted" : cardIsRestricted ? "Restricted" : "Unrestricted") + '</div>';
        const priorAmount = /^(?:ad valorem|property) taxes$/i.test(source.name)
          ? source.amount
          : sumRevenueRowsForField(sourceRows, "FY2026_Original_Budget");
        const tag = target ? "button" : "article";
        return '<' + tag + (target ? ' type="button" data-revenue-explorer-target="' + escapeHtml(target) + '"' : "") + '><div class="wc-revenue-card-head"><div class="wc-revenue-card-head-main"><strong>' + escapeHtml(source.name) + '</strong><b class="wc-revenue-card-amount">' + escapeHtml(compactRevenueCurrency(source.amount)) + '</b><small class="wc-revenue-card-share">' + Math.round(source.share * 100) + '% of total budget</small></div><div class="wc-revenue-card-badge-stack"><div class="wc-revenue-card-badges">' + sourceAccessBadgeHtml + '<div class="wc-revenue-recurrence-badge ' + (recurrenceLabel === "Non-recurring" ? "is-nonrecurring" : "is-recurring") + '" data-revenue-tooltip="' + (recurrenceLabel === "Non-recurring" ? "Non-recurring revenue is expected as a one-time or irregular source rather than a dependable annual stream." : "Recurring revenue is expected to continue as an annual source, subject to changes in collections and policy.") + '">' + recurrenceLabel + '</div><div class="wc-revenue-control-badge ' + escapeHtml(control.className) + '" data-revenue-tooltip="' + escapeHtml(control.text) + '">' + escapeHtml(control.level.replace(/ local control$/i, " control")) + '</div></div></div></div>' + revenueChangeHtml(source.amount, priorAmount, source.name) + '</' + tag + '>';
      }).join("");
      const browseNarrativeTopics = REVENUE_CLASSIFICATION_SECTIONS.reduce((all, section) => all.concat(section.topics || []), []).filter((topic) => !topic.isAllOtherRevenue);
      function revenueBrowseDescription(source, sourceRows) {
        if (/local government\s+(?:half|1\s*\/\s*2)[ -]?cent sales tax/i.test(source.name)) {
          return "Walton County's monthly share of Florida sales-tax collections, distributed under the State's half-cent sales-tax program.";
        }
        if (/housing prisoners revenue/i.test(source.name)) {
          return "Reimbursements collected by the Sheriff's Office for housing prisoners under applicable agreements.";
        }
        if (/ambulance/i.test(source.name)) {
          return "Fees collected by the Sheriff's Office for emergency medical transport services.";
        }
        const matchedTopic = browseNarrativeTopics.find((topic) => normalizeDeptName(topic.title) === normalizeDeptName(source.name)) ||
          browseNarrativeTopics.find((topic) => sourceRows.some((row) => topic.matches(row)));
        const narrativeKey = matchedTopic ? matchedTopic.narrativeKey : source.name;
        const narrativeRow = (cache.departmentNarratives || []).find((row) => normalizeDeptName(row.Dept_Name) === normalizeDeptName(narrativeKey));
        const narrativeParagraphs = narrativeRow && narrativeRow.Narrative ? splitIntoParagraphs(narrativeRow.Narrative) : [];
        if (narrativeParagraphs.length) return narrativeParagraphs[0];
        const ledgerNote = sourceRows.map((row) => String(row.Note || "").trim()).find(Boolean);
        if (ledgerNote) return ledgerNote;
        const revenueType = sourceRows[0] && sourceRows[0].Revenue_Type;
        return TYPE_TOOLTIPS[revenueType] || "Revenue received by Walton County to support the services and purposes identified in the adopted budget.";
      }
      const browseRevenueRowsHtml = rankedSources.map((source) => {
        const sourceRows = revenueRowsBySource.get(source.name) || [];
        const restriction = revenueRestrictionLabel(source.name);
        const control = revenueControlProfile({ title: source.name }, sourceRows[0] && sourceRows[0].Revenue_Type);
        const controlKey = control.className.replace(/^is-/, "");
        const sharePct = (source.share * 100).toFixed(1);
        const sourceDescription = revenueBrowseDescription(source, sourceRows);
        return '<button type="button" class="wc-revenue-browse-row" data-revenue-explorer-target="' + escapeHtml(revenueSourceExplorerTarget(source)) + '" data-restriction="' + restriction.toLowerCase() + '" data-control="' + escapeHtml(controlKey) + '" data-name="' + escapeHtml(source.name.toLowerCase()) + '" data-amount="' + source.amount + '">' +
          '<span><strong>' + escapeHtml(source.name) + '</strong><small class="wc-revenue-browse-amount">' + escapeHtml(formatCurrency(source.amount)) + (sharePct === "0.0" ? "" : ' · ' + sharePct + '% of total') + '</small></span>' +
          '<span class="wc-revenue-browse-description">' + escapeHtml(sourceDescription) + '</span>' +
          '<em class="' + (restriction === "Restricted" ? 'is-restricted' : 'is-unrestricted') + '">' + restriction + '</em>' +
          '<em class="' + escapeHtml(control.className) + '">' + escapeHtml(control.level.replace(/ local control$/i, " control")) + '</em><b aria-hidden="true">→</b></button>';
      }).join("");
      // Not clickable (there's no source detail page for it) and its
      // sentinel restriction/control values never match a specific filter
      // option, so it only shows under "All sources" + "All levels" --
      // exactly when the visible total should foot to the $341.4M
      // headline instead of the $332.2M revenue-only figure.
      const fundBalanceRowHtml = fundBalanceTotal > 0
        ? '<div class="wc-revenue-browse-row is-static" data-restriction="fund-balance" data-control="fund-balance" data-name="nonoperating balance brought forward" data-amount="' + fundBalanceTotal + '">' +
          '<span><strong>Nonoperating Balance Brought Forward</strong><small class="wc-revenue-browse-amount">' + escapeHtml(formatCurrency(fundBalanceTotal)) + '</small></span>' +
          '<span class="wc-revenue-browse-description">Beginning fund balance carried forward from the prior year; this is available funding, not new revenue.</span>' +
          '<em class="is-low">Fund balance</em><em></em></div>'
        : "";
      const browseRevenueHtml = '<details class="wc-revenue-browse"><summary>Sort or filter all revenue sources</summary>' +
        '<div class="wc-revenue-browse-controls"><label>Restriction<select data-revenue-filter="restriction"><option value="all">All sources</option><option value="unrestricted">Unrestricted</option><option value="restricted">Restricted</option></select></label>' +
        '<label>Local control<select data-revenue-filter="control"><option value="all">All levels</option><option value="moderate">Moderate</option><option value="limited">Limited</option><option value="low">Low</option></select></label>' +
        '<label>Sort by<select data-revenue-sort><option value="amount-desc">Largest amount</option><option value="amount-asc">Smallest amount</option><option value="name">Revenue name</option></select></label></div>' +
        '<p class="wc-revenue-browse-count" aria-live="polite"></p><div class="wc-revenue-browse-results">' + browseRevenueRowsHtml + fundBalanceRowHtml + '</div></details>';
      const concentrationHtml = '<section class="wc-revenue-concentration" aria-labelledby="revenue-explorer-title">' +
        '<div class="wc-revenue-concentration-head"><div><h3 id="revenue-explorer-title">Revenue Budget Explorer</h3><p>See where Walton County&rsquo;s FY 2027 funding comes from and how each source supports the budget.</p><p>Start with the six largest sources below. Hover over a badge to learn whether revenue is restricted, recurring, or within the County&rsquo;s control. Select a card for details, use the source list to sort or filter all revenues, or open the ledger to review the full budget.</p></div><aside class="wc-revenue-total-budget"><div class="wc-revenue-total-primary"><span>Total revenue budget</span><strong>' + escapeHtml(formatCurrency(total)) + '</strong><small class="wc-revenue-total-change ' + (totalRevenueChange > 0 ? "is-increase" : totalRevenueChange < 0 ? "is-decrease" : "") + '">' + (totalRevenueChange >= 0 ? "+" : "−") + escapeHtml(compactRevenueCurrency(Math.abs(totalRevenueChange))) + ' (' + (totalRevenueChangePercent === null ? "No prior-year base" : (totalRevenueChangePercent >= 0 ? "+" : "−") + Math.abs(totalRevenueChangePercent).toFixed(1) + '%') + ')</small><div class="wc-revenue-view-actions"><button type="button" class="wc-revenue-ledger-trigger" aria-controls="revenue-ledger" aria-expanded="false">View Revenue Ledger</button><button type="button" class="wc-revenue-peer-trigger" aria-controls="revenue-peer-comparison" aria-expanded="false">View Revenue Comparison</button></div></div></aside></div>' +
        '<div class="wc-revenue-card-summary-row"><p class="wc-revenue-concentration-summary"><strong>' + sixLargestSharePercent + '%</strong> of the total revenue budget is represented by the six sources shown below.</p><div class="wc-revenue-support-split"><div><span>Estimated paid by visitors</span><b>' + escapeHtml(compactRevenueCurrency(visitorSupportedRevenue)) + '</b></div><div><span>Estimated paid by non-visitors</span><b>' + escapeHtml(compactRevenueCurrency(locallySupportedRevenue)) + '</b></div></div></div>' +
        '<div class="wc-revenue-snapshot">' +
          largestSourceCardsHtml +
        '</div>' +
        browseRevenueHtml +
        '</section>';
      const concentrationContainer = document.getElementById("revenue-source-concentration");
      if (concentrationContainer) concentrationContainer.innerHTML = concentrationHtml;
      if (concentrationContainer) {
        const browse = concentrationContainer.querySelector(".wc-revenue-browse");
        if (browse) {
          const restrictionFilter = browse.querySelector('[data-revenue-filter="restriction"]');
          const controlFilter = browse.querySelector('[data-revenue-filter="control"]');
          const sortControl = browse.querySelector("[data-revenue-sort]");
          const results = browse.querySelector(".wc-revenue-browse-results");
          const count = browse.querySelector(".wc-revenue-browse-count");
          const applyRevenueBrowse = () => {
            const rows = Array.from(results.querySelectorAll(".wc-revenue-browse-row"));
            rows.sort((a, b) => {
              if (a.classList.contains("is-static")) return 1;
              if (b.classList.contains("is-static")) return -1;
              if (sortControl.value === "name") return a.dataset.name.localeCompare(b.dataset.name);
              const difference = Number(a.dataset.amount) - Number(b.dataset.amount);
              return sortControl.value === "amount-asc" ? difference : -difference;
            }).forEach((row) => results.appendChild(row));
            let visible = 0;
            let visibleTotal = 0;
            rows.forEach((row) => {
              const showRestriction = restrictionFilter.value === "all" || row.dataset.restriction === restrictionFilter.value;
              const showControl = controlFilter.value === "all" || row.dataset.control === controlFilter.value;
              row.hidden = !(showRestriction && showControl);
              row.style.display = row.hidden ? "none" : "";
              if (!row.hidden) {
                visible += 1;
                visibleTotal += Number(row.dataset.amount) || 0;
              }
            });
            count.textContent = visible + (visible === 1 ? " revenue source" : " revenue sources") + " · " + formatCurrency(visibleTotal) + " total";
          };
          [restrictionFilter, controlFilter, sortControl].forEach((control) => control.addEventListener("change", applyRevenueBrowse));
          applyRevenueBrowse();
        }
      }
      const ledger = document.getElementById("revenue-ledger");
      const ledgerTrigger = concentrationContainer ? concentrationContainer.querySelector(".wc-revenue-ledger-trigger") : null;
      const ledgerClose = ledger ? ledger.querySelector(".wc-revenue-ledger-close") : null;
      const peerSection = document.getElementById("revenue-peer-comparison");
      const peerTrigger = concentrationContainer ? concentrationContainer.querySelector(".wc-revenue-peer-trigger") : null;
      const peerClose = peerSection ? peerSection.querySelector(".wc-revenue-peer-close") : null;
      let peerChart = null;
      const peerData = [
        { county: "Walton", taxes: 2712.73, property: 1515.01, tourist: 688.74, permits: 78.24, intergovernmental: 533.46, charges: 169.74 },
        { county: "Bay", taxes: 1132.25, property: 793.16, tourist: 204.87, permits: 104.22, intergovernmental: 529.41, charges: 629.14 },
        { county: "Okaloosa", taxes: 798.77, property: 464.91, tourist: 194.20, permits: 15.59, intergovernmental: 370.27, charges: 3243.36 },
        { county: "Santa Rosa", taxes: 614.89, property: 455.60, tourist: 31.02, permits: 88.96, intergovernmental: 308.79, charges: 1768.55 },
        { county: "Nassau", taxes: 1519.68, property: 1188.41, tourist: 110.89, permits: 144.42, intergovernmental: 382.28, charges: 2798.15 },
        { county: "Charlotte", taxes: 4384.60, property: 1072.39, tourist: 41.38, permits: 877.07, intergovernmental: 457.68, charges: 1496.18 },
        { county: "Monroe", taxes: 7336.93, property: 5974.94, tourist: 830.72, permits: 120.80, intergovernmental: 1034.74, charges: 2179.73 }
      ];
      const peerMetrics = [
        ["taxes", "General government taxes per resident"],
        ["property", "Property-tax revenue per resident"],
        ["tourist", "Tourist-tax revenue per resident"],
        ["permits", "Permits, fees, and assessments per resident"],
        ["intergovernmental", "Intergovernmental revenue per resident"],
        ["charges", "Charges for services per resident"]
      ];
      function renderPeerChart(metric) {
        if (!peerSection || typeof Chart === "undefined") return;
        const metricLabel = (peerMetrics.find((item) => item[0] === metric) || peerMetrics[0])[1];
        const sorted = peerData.slice().sort((a, b) => b[metric] - a[metric]);
        if (peerChart) peerChart.destroy();
        peerChart = new Chart(document.getElementById("revenue-peer-chart"), {
          type: "bar",
          data: { labels: sorted.map((item) => item.county + " County"), datasets: [{ label: metricLabel, data: sorted.map((item) => item[metric]), backgroundColor: sorted.map((item) => item.county === "Walton" ? "#d1be78" : "#2f6f4d"), borderRadius: 6 }] },
          options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: true, grid: { color: () => wcChartThemeColors().grid }, ticks: { color: () => wcChartThemeColors().text, callback: (value) => formatCurrency(value) } }, y: { grid: { display: false }, ticks: { color: () => wcChartThemeColors().text, font: { weight: 700 } } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => formatCurrency(context.parsed.x) + " per resident" } } } }
        });
        registerWcThemedChart(peerChart);
        const walton = peerData.find((item) => item.county === "Walton")[metric];
        const peers = peerData.filter((item) => item.county !== "Walton").map((item) => item[metric]).sort((a, b) => a - b);
        const median = (peers[2] + peers[3]) / 2;
        const rank = sorted.findIndex((item) => item.county === "Walton") + 1;
        const insight = document.getElementById("revenue-peer-insight");
        if (insight) insight.innerHTML = '<strong>Walton ranks #' + rank + ' of ' + sorted.length + '</strong><span>' + escapeHtml(formatCurrency(walton)) + ' per resident compared with a peer median of ' + escapeHtml(formatCurrency(median)) + '.</span>';
      }
      if (ledgerTrigger && ledger) ledgerTrigger.addEventListener("click", () => {
        if (peerSection) peerSection.hidden = true;
        if (peerTrigger) peerTrigger.setAttribute("aria-expanded", "false");
        ledger.open = true;
        ledgerTrigger.setAttribute("aria-expanded", "true");
        if (concentrationContainer) concentrationContainer.hidden = true;
      });
      if (ledgerClose && ledger) ledgerClose.addEventListener("click", () => {
        ledger.open = false;
        if (ledgerTrigger) ledgerTrigger.setAttribute("aria-expanded", "false");
        if (concentrationContainer) { concentrationContainer.hidden = false; concentrationContainer.scrollIntoView({ behavior: "smooth", block: "start" }); }
      });
      if (peerTrigger && peerSection) peerTrigger.addEventListener("click", () => {
        if (ledger) ledger.open = false;
        if (ledgerTrigger) ledgerTrigger.setAttribute("aria-expanded", "false");
        peerSection.hidden = false;
        peerTrigger.setAttribute("aria-expanded", "true");
        const metricSelect = document.getElementById("revenue-peer-metric");
        if (metricSelect && !metricSelect.options.length) {
          metricSelect.innerHTML = peerMetrics.map((item) => '<option value="' + item[0] + '">' + escapeHtml(item[1]) + '</option>').join("");
          metricSelect.addEventListener("change", () => renderPeerChart(metricSelect.value));
        }
        renderPeerChart((metricSelect && metricSelect.value) || "taxes");
        peerSection.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      if (peerClose && peerSection) peerClose.addEventListener("click", () => {
        peerSection.hidden = true;
        if (peerTrigger) peerTrigger.setAttribute("aria-expanded", "false");
        if (concentrationContainer) concentrationContainer.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }).catch(() => {
      container.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
      const explorerContainer = document.getElementById("revenue-source-concentration");
      if (explorerContainer) {
        explorerContainer.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
      }
    });
  }

  // Flags any position whose FTE changed between the prior adopted year
  // (2026) and the proposed year (2027), so the table can call out
  // staffing changes without someone having to write them up by hand.
  // Known inter-department transfers (see STAFFING_TRANSFERS) are shown as
  // "Transferred" rather than "Requested" / "Reduced".
  function buildStaffingNotes(rows) {
    if (!rows.length) return [];
    const deptNorm = normalizeDeptName(rows[0].Dept_Name || "");
    const asFrom = STAFFING_TRANSFERS.find((t) => t.from === deptNorm);
    const asTo = STAFFING_TRANSFERS.find((t) => t.to === deptNorm);
    return rows
      .slice()
      .sort((a, b) => (a.Position_Name || "").localeCompare(b.Position_Name || ""))
      .reduce((notes, r) => {
        const before = r[2026] || 0;
        const after = r[2027] || 0;
        const delta = after - before;
        if (Math.abs(delta) < 1e-9) return notes;
        if (delta < 0 && asFrom) {
          notes.push(
            "Transferred " + formatNumber(Math.abs(delta)) + " FTE (" +
            escapeHtml(r.Position_Name || "") + ") to " +
            escapeHtml(asFrom.toLabel) + " in Fiscal Year 2027."
          );
          return notes;
        }
        if (delta > 0 && asTo) {
          notes.push(
            "Transferred " + formatNumber(delta) + " FTE (" +
            escapeHtml(r.Position_Name || "") + ") from " +
            escapeHtml(asTo.fromLabel) + " in Fiscal Year 2027."
          );
          return notes;
        }
        const verb = delta > 0 ? "Requested" : "Reduced";
        notes.push(
          verb + " " + formatNumber(Math.abs(delta)) + " FTE (" +
          escapeHtml(r.Position_Name || "") + ") in Fiscal Year 2027."
        );
        return notes;
      }, []);
  }

  function renderStaffingGroup(rows, label, forcedOtherMaxFte, extraNotes) {
    const showPrior = getShowPriorYears();
    const years = [2024, 2025, 2026, 2027];
    const priorYears = years.filter((y) => y < 2027);
    const totals = { 2024: 0, 2025: 0, 2026: 0, 2027: 0 };
    const sortedRows = rows
      .slice()
      .sort((a, b) => (a.Position_Name || "").localeCompare(b.Position_Name || ""));

    sortedRows.forEach((r) => {
      years.forEach((y) => { totals[y] += r[y] || 0; });
    });

    const bodyRows = sortedRows.map((r) => {
        const rowClass = (r[2027] || 0) === 0 ? ' class="wc-staffing-zero-current"' : "";
        return (
          "<tr" + rowClass + "><td>" + escapeHtml(r.Position_Name || "") + "</td>" +
          years.map((y) => {
            const classes = ["wc-num"].concat(y < 2027 ? ["wc-prior-year", "wc-fy-" + y] : []);
            return '<td class="' + classes.join(" ") + '">' + formatNumber(r[y] || 0) + "</td>";
          }).join("") +
          "</tr>"
        );
      });
    bodyRows.push(
      '<tr class="wc-table-total-row"><td>Total FTE</td>' +
        years.map((y) => {
          const classes = ["wc-num"].concat(y < 2027 ? ["wc-prior-year", "wc-fy-" + y] : []);
          return '<td class="' + classes.join(" ") + '">' + formatNumber(totals[y]) + "</td>";
        }).join("") +
        "</tr>"
    );
    // Some constitutional officers (Clerk, Tax Collector, Sheriff,
    // Property Appraiser, Supervisor of Elections) only roll an FTE total
    // up here rather than itemized position-level data they publish
    // elsewhere -- see STAFFING_GROUP_NOTES -- so a static note pointing to
    // that office is appended alongside any auto-generated FTE-change notes.
    const notes = buildStaffingNotes(rows).concat(extraNotes || []);
    const notesHtml = notes.length
      ? '<div class="wc-staffing-notes"><p class="wc-staffing-notes-title">Staffing Notes:</p>' +
        notes.map((n) => "<p>" + n + "</p>").join("") +
        "</div>"
      : "";
    const detailId = "wc-staffing-lines-" + (++budgetLinesDetailCounter);
    // Any position at or below a card-specific FTE threshold is folded
    // into "All Other" on this card's own breakdown regardless of how it'd
    // otherwise rank (e.g. Code Compliance Street folds every 0.5-FTE
    // position, not just a specific named one) -- still counted in the
    // total and listed individually in the "View Position Detail" table
    // below, just not surfaced as its own top-5 line here.
    const rankableRows = forcedOtherMaxFte
      ? sortedRows.filter((r) => (r[2027] || 0) > forcedOtherMaxFte)
      : sortedRows;
    const forcedOtherFte = forcedOtherMaxFte
      ? sortedRows
        .filter((r) => (r[2027] || 0) > 0 && (r[2027] || 0) <= forcedOtherMaxFte)
        .reduce((sum, row) => sum + (row[2027] || 0), 0)
      : 0;
    const activeStaffingRows = rankableRows
      .filter((r) => (r[2027] || 0) !== 0)
      .sort((a, b) => (b[2027] || 0) - (a[2027] || 0));
    const visibleStaffingRows = activeStaffingRows.slice(0, 5);
    const otherStaffingFte = forcedOtherFte + activeStaffingRows
      .slice(5)
      .reduce((sum, row) => sum + (row[2027] || 0), 0);
    if (otherStaffingFte !== 0) {
      visibleStaffingRows.push({ Position_Name: "All Other", 2027: otherStaffingFte });
    }
    const visibleMaxFte = Math.max.apply(null, visibleStaffingRows.map((r) => r[2027] || 0).concat([0]));
    const positionRows = visibleStaffingRows
      .map((r) => {
        const current = r[2027] || 0;
        const width = visibleMaxFte ? Math.max(2, current / visibleMaxFte * 100) : 0;
        return (
          '<div class="wc-finance-card-row">' +
            '<div class="wc-finance-card-row-head">' +
              '<strong>' + escapeHtml(r.Position_Name || "Position") + '</strong>' +
              '<span>' + escapeHtml(formatNumber(current)) + ' FTE</span>' +
            '</div>' +
            '<div class="wc-finance-card-track" aria-hidden="true"><span style="width:' + width.toFixed(2) + '%"></span></div>' +
          '</div>'
        );
      }).join("");
    return (
      '<section class="wc-finance-card wc-staffing-card' + (showPrior ? " show-prior-years" : "") + '" data-print-title="' + escapeHtml(label) + '">' +
        '<div class="wc-finance-card-head">' +
          '<div>' +
            '<p class="wc-finance-card-kicker">' + escapeHtml(label) + '</p>' +
            '<strong class="wc-finance-card-total">' + escapeHtml(formatNumber(totals[2027])) + '</strong>' +
            '<span class="wc-finance-card-subtitle">FY 2027 Full-Time Equivalent Positions</span>' +
          '</div>' +
        '</div>' +
        '<div class="wc-finance-card-breakdown">' + positionRows + '</div>' +
        '<div class="wc-finance-card-footer">' +
          lastUpdatedNoteHtml() +
          '<button type="button" class="wc-view-budget-lines-toggle" data-target="' + detailId + '" data-closed-label="View Position Detail" data-open-label="Hide Position Detail" aria-expanded="false">View Position Detail</button>' +
        '</div>' +
        notesHtml +
        '<div class="wc-budget-lines-detail wc-budget-lines-card' + (showPrior ? " show-prior-years" : "") + '" id="' + detailId + '" hidden>' +
          priorYearsToggleHtml(showPrior, "wc-budget-lines-detail-header") +
          '<div class="wc-data-table-scroll">' +
          '<table class="wc-data-table wc-staffing-table">' +
          "<thead><tr>" +
          "<th>Position Name</th>" +
          priorYears.map((y) => '<th class="wc-num wc-prior-year wc-fy-' + y + '">FY ' + y + "</th>").join("") +
          '<th class="wc-num">FY 2027</th>' +
          "</tr></thead>" +
          "<tbody>" + bodyRows.join("") + "</tbody>" +
          "</table>" +
          "</div>" +
        "</div>" +
      "</section>"
    );
  }

  // When a department's staffing rows span more than one distinct Dept_Name
  // (e.g. "Code Compliance" is split into "Code Compliance Street" and
  // "Code Compliance Beach" in the sheet), render one labeled table per
  // sub-unit instead of merging them into a single undifferentiated list.
  // Position names always folded into "All Other" on a specific
  // sub-program's own staffing card, keyed by normalized Dept_Name -- see
  // renderStaffingGroup's forcedOtherPositions.
  const STAFFING_GROUP_FORCED_OTHER_MAX_FTE = {
    "code compliance street": 0.5
  };

  function isCodeComplianceStaffingSplit(groupNames) {
    const normalized = groupNames.map((name) => normalizeDeptName(name));
    return normalized.length > 1 && normalized.every((name) =>
      name === "code compliance" || name === "code compliance beach" || name === "code compliance street"
    );
  }

  // Combines Code Compliance Street's and Beach's position rows into one
  // list by Position_Name (summing FTE across both), the same merge
  // Summary of Personnel already does for this exact split (see
  // personnelDeptDisplayName) -- several titles (Director of Code
  // Compliance, Office Manager, Code Compliance Manager, etc.) exist on
  // both sides, so a true single list has to add them together rather
  // than just listing each side's rows one after another.
  function mergeStaffingRowsByPosition(rows) {
    const years = [2024, 2025, 2026, 2027];
    const merged = new Map();
    rows.forEach((row) => {
      const key = (row.Position_Name || "").trim();
      if (!merged.has(key)) {
        const entry = { Position_Name: row.Position_Name, Dept_Name: "Code Compliance" };
        years.forEach((y) => { entry[y] = 0; });
        merged.set(key, entry);
      }
      const entry = merged.get(key);
      years.forEach((y) => { entry[y] += row[y] || 0; });
    });
    return Array.from(merged.values());
  }

  function renderStaffingTable(rows) {
    if (!rows.length) return "";
    const groupNames = uniqueSorted(rows.map((r) => r.Dept_Name || ""));
    if (groupNames.length <= 1) {
      return renderStaffingGroup(rows, "Staffing / FTE", null, STAFFING_GROUP_NOTES[normalizeDeptName(rows[0].Dept_Name || "")]);
    }
    const screenCardsHtml = groupNames
      .map((name) => renderStaffingGroup(
        rows.filter((r) => (r.Dept_Name || "") === name),
        name,
        STAFFING_GROUP_FORCED_OTHER_MAX_FTE[normalizeDeptName(name)],
        STAFFING_GROUP_NOTES[normalizeDeptName(name)]
      ))
      .join("");

    // On screen, Code Compliance's Street/Beach split still shows as two
    // separate labeled cards (matches its real org structure). In print,
    // that reads as redundant, so a single merged card takes its place
    // there instead -- see wc-code-compliance-staffing-screen/-print in
    // budget-pdf.js for the screen/print visibility swap.
    if (isCodeComplianceStaffingSplit(groupNames)) {
      const mergedRows = mergeStaffingRowsByPosition(rows);
      const printCardHtml = renderStaffingGroup(mergedRows, "Staffing / FTE", null, STAFFING_GROUP_NOTES[normalizeDeptName("code compliance")]);
      return (
        '<div class="wc-code-compliance-staffing-screen">' + screenCardsHtml + "</div>" +
        '<div class="wc-code-compliance-staffing-print">' + printCardHtml + "</div>"
      );
    }

    return screenCardsHtml;
  }

  // Same underlying position data as renderStaffingTable, but as a plain
  // schedule table (matching the all-departments view on Summary of
  // Personnel) instead of the department page's staffing-card layout with
  // its top-5 breakdown bars and collapsed "View Position Detail" panel --
  // used when a user filters Summary of Personnel down to one department,
  // where the card treatment reads as a duplicate mini department page
  // rather than a table row detail.
  function renderStaffingPlainTable(rows) {
    if (!rows.length) return "";
    const years = [2024, 2025, 2026, 2027];
    const groupNames = uniqueSorted(rows.map((r) => r.Dept_Name || ""));
    return groupNames
      .map((name) => {
        const groupRows = rows
          .filter((r) => (r.Dept_Name || "") === name)
          .slice()
          .sort((a, b) => (a.Position_Name || "").localeCompare(b.Position_Name || ""));
        const totals = { 2024: 0, 2025: 0, 2026: 0, 2027: 0 };
        const bodyRows = groupRows.map((r) => {
          years.forEach((y) => { totals[y] += r[y] || 0; });
          const delta = (r[2027] || 0) - (r[2026] || 0);
          const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
          const tone = delta > 0 ? "is-increase" : delta < 0 ? "is-decrease" : "";
          return (
            "<tr><td>" + escapeHtml(r.Position_Name || "") + "</td>" +
            years.map((y) => '<td class="wc-num">' + formatNumber(r[y] || 0) + "</td>").join("") +
            '<td class="wc-num ' + tone + '">' + sign + formatNumber(Math.abs(delta)) + "</td>" +
            "</tr>"
          );
        });
        const totalDelta = totals[2027] - totals[2026];
        const totalSign = totalDelta > 0 ? "+" : totalDelta < 0 ? "−" : "";
        const totalTone = totalDelta > 0 ? "is-increase" : totalDelta < 0 ? "is-decrease" : "";
        bodyRows.push(
          '<tr class="wc-table-total-row"><td>Total FTE</td>' +
          years.map((y) => '<td class="wc-num">' + formatNumber(totals[y]) + "</td>").join("") +
          '<td class="wc-num ' + totalTone + '">' + totalSign + formatNumber(Math.abs(totalDelta)) + "</td>" +
          "</tr>"
        );
        return renderTable({
          caption: groupNames.length > 1 ? name : null,
          columns: [{ label: "Position Name" }].concat(years.map((y) => ({ label: "FY " + y, num: true }))).concat([{ label: "+/−", num: true }]),
          bodyRows: bodyRows
        });
      })
      .join("");
  }

  function renderMachineryTable(rows) {
    if (!rows.length) return "";
    let total = 0;
    const bodyRows = rows.map((r) => {
      total += r.Amount || 0;
      return "<tr><td>" + escapeHtml(r.Item_Description || "") + '</td><td class="wc-num">' + formatCurrency(r.Amount || 0) + "</td></tr>";
    });
    bodyRows.push('<tr class="wc-table-total-row"><td>Total</td><td class="wc-num">' + formatCurrency(total) + "</td></tr>");
    return renderTable({
      caption: "Machinery, Vehicles & Equipment",
      columns: [{ label: "Item Description" }, { label: "Amount", num: true }],
      bodyRows: bodyRows
    });
  }

  function renderSolidWasteSupplementalTables() {
    const franchiseRows = rowsForExactDepartment(cache.expenditures, "Solid Waste")
      .filter((r) => String(r.Object_Code || "").trim() === "534000");
    const transferRows = rowsForExactDepartment(cache.expenditures, "Solid Waste Transfer");
    const pieces = [
      renderTypeSummaryTable(franchiseRows, "expense", "Waste Collection and Disposal Franchise Services", "Solid Waste"),
      renderTypeSummaryTable(transferRows, "expense", "Interfund Transfer", "Solid Waste Transfer")
    ].filter(Boolean);

    if (!pieces.length) return "";
    return '<section class="solid-waste-supplemental-tables">' + pieces.join("") + "</section>";
  }

  function renderBuildingConstructionSupplementalTables() {
    const rows = rowsForExactDepartment(cache.expenditures, "Building Construction and Maintenance");
    const utilityRows = rows.filter((r) => String(r.Object_Code || "").trim() === "543000");
    const piece = renderTypeSummaryTable(utilityRows, "expense", "County-Wide Utilities", "Building Construction and Maintenance");

    if (!piece) return "";
    return '<section class="building-construction-supplemental-tables">' + piece + "</section>";
  }

  function renderBoardOfCountyCommissionersSupplementalTables() {
    const rows = rowsForExactDepartment(cache.expenditures, "BCC Other Uses Contingency");
    const piece = renderTypeSummaryTable(rows, "expense", "Reserves for Contingency", "BCC Other Uses Contingency");
    if (!piece) return "";
    return '<section class="bcc-supplemental-tables">' + piece + "</section>";
  }

  function renderCountyAttorneySupplementalTables(deptName, deptCode) {
    const rows = getDepartmentExpenses(deptName, deptCode)
      .filter((r) => String(r.Object_Code || "").trim() === "531000");
    const piece = renderTypeSummaryTable(rows, "expense", "County Attorney Legal Services", deptName);
    if (!piece) return "";
    return '<section class="county-attorney-supplemental-tables">' + piece + "</section>";
  }

  // The Court Innovation FTE (Project 1040) is budgeted under the Board of
  // County Commissioners' Dept_Code rather than its own Dept_Name, and the
  // court-ordinance distributions (Law Library, Juvenile Justice, Legal
  // Aid, Innovative Program) are booked under a "Court Innovations"
  // Dept_Name that shares that same Dept_Code — neither gets picked up by
  // this page's normal Dept_Name alias matching. Both pools fund the same
  // statutory program, so they're combined into one rolled-up table here
  // rather than shown as two separate "Court Innovations" breakdowns.
  function renderCourtInnovationsSupplementalTables() {
    const rows = (cache.expenditures || []).filter(
      (r) =>
        (r.Dept_Code === "00101000" && r.Project_Code === "1040") ||
        normalizeDeptName(r.Dept_Name) === "court innovations"
    );
    const expensePiece = renderTypeSummaryGroup(rows, "expense", "Expenditure Summary");

    // The $65 court cost itself (Additional Court Cost — Law Library,
    // Juvenile Justice, Legal Aid, Innovative Programs) is booked under
    // Dept_Name "Court Innovations" (Dept_Code 001348) in the revenues sheet.
    const revenueRows = (cache.revenues || []).filter(
      (r) => normalizeDeptName(r.Dept_Name) === "court innovations"
    );
    const revenuePiece = renderTypeSummaryGroup(revenueRows, "revenue", "Revenue Summary");

    if (!expensePiece && !revenuePiece) return "";

    const narrativeRows = cache.departmentNarratives || [];
    const narrativeRow = narrativeRows.find((r) => normalizeDeptName(r.Dept_Name) === normalizeDeptName("Court Innovations"));
    const narrativeHtml = narrativeRow && narrativeRow.Narrative
      ? splitIntoParagraphs(narrativeRow.Narrative).map((p) => "<p>" + formatNarrativeText(p) + "</p>").join("")
      : "";

    return (
      '<section class="court-innovations-supplemental-tables statement-of-function content-section">' +
      "<h2>Court Innovations</h2>" +
      narrativeHtml +
      "</section>" +
      '<div class="court-innovations-cards">' +
      expensePiece +
      revenuePiece +
      "</div>"
    );
  }

  // Tourism Administration's page combines five separately budgeted
  // divisions that each have their own rows in the sheets (and, across
  // sheets, sometimes a slightly different spelling of the same division).
  const TOURISM_ADMIN_SECTIONS = [
    {
      label: "Tourism Administration",
      narrativeNames: ["Tourism Administration"],
      expenseNames: ["Tourism Administration"],
      revenueNames: ["Tourist Development Taxes"],
      staffingNames: ["Tourism Administration"],
      machineryNames: []
    },
    {
      label: "Sales and Visitor Center",
      narrativeNames: ["Sales and Visitor Center"],
      expenseNames: ["Sales and Visitors Center"],
      revenueNames: [],
      staffingNames: ["Sales and Visitors Center", "Tourism Sales and Visitors Center"],
      machineryNames: []
    },
    {
      label: "Communications",
      narrativeNames: ["Communications"],
      expenseNames: ["Communications"],
      revenueNames: [],
      staffingNames: ["Communications", "Tourism Communications"],
      machineryNames: []
    },
    {
      label: "Marketing",
      narrativeNames: ["Marketing"],
      expenseNames: ["Marketing"],
      revenueNames: [],
      staffingNames: ["Marketing", "Tourism Marketing"],
      machineryNames: []
    },
    {
      label: "North Walton",
      narrativeNames: ["North Walton"],
      expenseNames: ["North Walton Tourist Development Tax"],
      revenueNames: ["Tourism North Walton", "North Walton Tourist Development Tax", "North Walton"],
      staffingNames: [],
      machineryNames: []
    }
  ];

  const TOURISM_ADMIN_OVERVIEW_PARAGRAPHS = [
    "The mission of the Walton County Tourism Department and its divisions is to protect and strengthen the Walton County brand, while enhancing and supporting the tourism economy. As the Destination Marketing Organization responsible for promoting tourism and maintaining the local beaches as a primary attraction, we showcase the diverse attractions of these 16 beach neighborhoods and the rich heritage and natural beauty throughout the county. Through creative marketing, dynamic social media engagement, and close collaboration with meeting planners, Walton County Tourism creates exceptional experiences for all visitors, stimulating visitor spending and bolstering the local economy. In turn, Walton County Tourism uses this revenue to enhance community infrastructure and promote safety initiatives."
  ];

  const TOURISM_ADMIN_HIGHLIGHTS_PARAGRAPHS = [
  "In 2025, 4.5 million visitors came to Walton County, accounting for $3.9 billion in direct spending and generating more than 3.9 million room nights for accommodation partners. These figures, which saw a slight decrease from 2024, represent a $4.7 billion economic impact to Walton County, generating more than $61.4 million in Tourist Development Tax revenues.",
  "Tourism in Walton County supported 29,450 jobs (direct and indirect) and generated more than $1.2 billion in wages and salaries. An additional Walton County job is supported by every 156 visitors. Visitors to Walton County generated a net tax benefit of $60.9 million, saving local residents $1,772 in local taxes per household each year. Visitors to Walton County also accounted for 68% of all retail spending. Walton County Tourism’s marketing efforts supported 65 local events with $500,000 in reimbursable funds through its event grant marketing program.",
  "In 2025, the Visitor Center welcomed 22,917 people and generated $206,582 in branded merchandise sales. Group Sales was responsible for generating 284 meeting and wedding leads for our partners. The sales team actively prospects, networks, makes sales calls and hosts familiarization tours and events in target markets, in addition to participating in travel and trade shows. Communications generated close to $32 million in earned (advertising equivalency) media value in 2025 and circulation/viewership of more than 4.8 billion impressions in 208 press hits across top travel and leisure media placements including publications like Conde Nast Traveler, Modern Luxury, Travel + Leisure, Southern Living and USA Today Travel. They also hosted 8 media visits and multiple desksides in core markets."
];

  function rowsForExactNames(rows, names) {
    const norms = (names || []).map(normalizeDeptName);
    return (rows || []).filter((r) => norms.includes(normalizeDeptName(r.Dept_Name)));
  }

  function dedupeRevenueFy2026ByFundAccount(rows) {
    const byKey = new Map();
    (rows || []).forEach((row, index) => {
      const code = String((row && row.Revenue_Code) || "").trim();
      const key = [
        fundCodeForRow(row),
        code || String((row && row.Dept_Code) || "").trim() + "|" + normalizeDeptName(row && row.Revenue_Name),
        String((row && row.Project_Code) || "").trim()
      ].join("|");
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push({ row, index, contribution: revenueBudgetMergeContribution(row) });
    });

    const nextRows = (rows || []).map((row) => Object.assign({}, row));
    byKey.forEach((entries) => {
      if (entries.length <= 1) return;
      const keeper = entries.reduce((best, entry) =>
        Math.abs(entry.contribution) > Math.abs(best.contribution) ? entry : best
      );
      entries.forEach((entry) => {
        nextRows[entry.index].FY2026_Original_Budget = 0;
        nextRows[entry.index].FY2026_Budget = 0;
        nextRows[entry.index].FY2026_Plug = 0;
        nextRows[entry.index]._originalBudgetDeduped = true;
        nextRows[entry.index]._suppressRevenueBudgetFallback = true;
      });
      nextRows[keeper.index].FY2026_Original_Budget = keeper.contribution;
    });
    return nextRows;
  }

  function normalizeTourismAdminRevenueRows(rows) {
    let northWaltonTdtFy2026Assigned = false;
    return dedupeRevenueFy2026ByFundAccount(rows).map((row) => {
      const name = String((row && row.Revenue_Name) || "");
      const dept = normalizeDeptName(row && row.Dept_Name);
      if (/^tourist development tax/i.test(name) && dept.indexOf("north walton") !== -1) {
        const fy2026Budget = northWaltonTdtFy2026Assigned ? 0 : 323000;
        northWaltonTdtFy2026Assigned = true;
        return Object.assign({}, row, {
          FY2026_Original_Budget: fy2026Budget,
          FY2026_Budget: fy2026Budget,
          FY2026_Plug: fy2026Budget,
          _originalBudgetDeduped: true,
          _suppressRevenueBudgetFallback: true
        });
      }
      return row;
    });
  }

  function renderTourismAdministrationSections() {
    const overview =
      '<section class="content-section tourism-admin-overview">' +
      TOURISM_ADMIN_OVERVIEW_PARAGRAPHS.map((p) => "<p>" + formatNarrativeText(p) + "</p>").join("") +
      "<h3>Highlights</h3>" +
      TOURISM_ADMIN_HIGHLIGHTS_PARAGRAPHS.map((p) => "<p>" + formatNarrativeText(p) + "</p>").join("") +
      "</section>";
    const tourismAdminSpec = TOURISM_ADMIN_SECTIONS.find((spec) => spec.label === "Tourism Administration");
    // The Tourist Development Fund (111) books revenue under several
    // Dept_Names across tourism divisions. This page should present that
    // full fund revenue once, as a single Tourism Administration card,
    // rather than splitting it into one card per Dept_Name.
    const tourismAdminRevenue = tourismAdminSpec
      ? renderTypeSummaryGroup(
          normalizeTourismAdminRevenueRows((cache.revenues || []).filter((r) => fundCodeForRow(r) === "111")),
          "revenue",
          "Revenue Summary",
          null
        )
      : "";

    // Rendered inside the "Tourism Administration" division's own section,
    // right after its statement-of-function narrative but before its
    // Expenditure Summary card, instead of the page's standalone
    // #department-performance-table container, which would otherwise land
    // after every division's own section -- see DEPTS_WITH_PERFORMANCE_FOLDED_IN.
    const performanceHtml = renderPerformanceTable(getDepartmentPerformanceMeasures("Tourism Administration", ""));

    const sections = TOURISM_ADMIN_SECTIONS.map((spec) => {
      const narrativeRows = rowsForExactNames(cache.departmentNarratives, spec.narrativeNames)
        .filter((r) => r.Narrative && r.Narrative.trim());
      const narrativeHtml = narrativeRows.length
        ? splitIntoParagraphs(narrativeRows[0].Narrative).map((p) => "<p>" + formatNarrativeText(p) + "</p>").join("")
        : "";

      // Zehnder, Inc.'s advertising services contract (Project_Code 10655)
      // gets its own card -- see Summary of Contractual Services, which
      // combines this same project across divisions the same way -- so
      // it's pulled out of each division's own Expenditure Summary here
      // too, rather than counted in both places.
      const allExpenseRows = rowsForExactNames(cache.expenditures, spec.expenseNames);
      const advertisingRows = allExpenseRows.filter((r) => String(r.Project_Code || "").trim() === "10655");
      const expenseRows = allExpenseRows.filter((r) => String(r.Project_Code || "").trim() !== "10655");
      const staffingRows = rowsForExactNames(cache.staffing, spec.staffingNames);
      const advertisingCardHtml = renderTypeSummaryTable(advertisingRows, "expense", "Advertising Services (Zehnder, INC)", spec.label);
      const expenseCardHtml = renderTypeSummaryTable(expenseRows, "expense", "Expenditure Summary", spec.label);
      const financialCardsHtml = advertisingCardHtml
        ? '<div class="tourism-admin-financial-pair">' + expenseCardHtml + advertisingCardHtml + "</div>"
        : expenseCardHtml;
      const body = [
        narrativeHtml,
        spec.label === "Tourism Administration" ? performanceHtml : "",
        financialCardsHtml,
        renderStaffingTable(staffingRows)
      ].filter(Boolean).join("");

      if (!body) return "";
      return (
        '<section class="tourism-admin-section" id="' + escapeHtml(slugifyId(spec.label)) + '">' +
        '<h2 class="tourism-admin-section-title">' + escapeHtml(spec.label) + "</h2>" +
        body +
        "</section>"
      );
    }).filter(Boolean).join("");

    return overview + tourismAdminRevenue + sections;
  }

  // Tourism Beach Operations' page combines three separately budgeted
  // programs. The narrative/performance/staffing sheets call the main
  // program "Tourism Beach Operations" while the expenditure/machinery
  // sheets call it plain "Beach Operations" for the same Dept_Code.
  const TOURISM_BEACH_SECTIONS = [
    {
      label: "Beach Operations",
      narrativeNames: ["Tourism Beach Operations"],
      expenseNames: ["Beach Operations"],
      revenueNames: [],
      staffingNames: ["Tourism Beach Operations"],
      machineryNames: [],
      performanceNames: ["Tourism Beach Operations"]
    },
    {
      label: "Beach Renourishment",
      narrativeNames: ["Beach Renourishment"],
      expenseNames: ["Beach Renourishment"],
      revenueNames: [],
      staffingNames: [],
      machineryNames: []
    },
    {
      label: "Beach Tram",
      narrativeNames: ["Beach Tram"],
      expenseNames: ["Beach Tram"],
      revenueNames: [],
      staffingNames: ["Tourism Beach Tram"],
      machineryNames: []
    }
  ];

  function renderTourismBeachOperationsSections() {
    return TOURISM_BEACH_SECTIONS.map((spec) => {
      const narrativeRows = rowsForExactNames(cache.departmentNarratives, spec.narrativeNames)
        .filter((r) => r.Narrative && r.Narrative.trim());
      const narrativeHtml = narrativeRows.length
        ? splitIntoParagraphs(narrativeRows[0].Narrative).map((p) => "<p>" + formatNarrativeText(p) + "</p>").join("")
        : "";

      const expenseRows = rowsForExactNames(cache.expenditures, spec.expenseNames);
      const revenueRows = rowsForExactNames(cache.revenues, spec.revenueNames);
      const staffingRows = rowsForExactNames(cache.staffing, spec.staffingNames);
      const performanceRows = rowsForExactNames(cache.performanceMeasures, spec.performanceNames || []);

      const body = [
        narrativeHtml,
        renderPerformanceTable(performanceRows),
        renderTypeSummaryTable(expenseRows, "expense", "Expenditure Summary", spec.label),
        renderTypeSummaryTable(revenueRows, "revenue", "Revenue Summary", spec.label),
        renderStaffingTable(staffingRows)
      ].filter(Boolean).join("");

      if (!body) return "";
      return (
        '<section class="tourism-admin-section" id="' + escapeHtml(slugifyId(spec.label)) + '">' +
        '<h2 class="tourism-admin-section-title">' + escapeHtml(spec.label) + "</h2>" +
        body +
        "</section>"
      );
    }).filter(Boolean).join("");
  }

  // Tourism Lifeguard Services and Beach Safety's page combines two
  // separately budgeted programs, each with their own narrative and
  // expenditure rows in the sheets.
  const TOURISM_LIFEGUARD_SECTIONS = [
    {
      label: "South Walton Fire Lifeguard Services",
      narrativeNames: ["South Walton Fire Lifeguard Services"],
      expenseNames: ["South Walton Fire Lifeguard Services"],
      revenueNames: [],
      staffingNames: [],
      machineryNames: []
    },
    {
      label: "Public Safety",
      narrativeNames: ["Public Safety"],
      expenseNames: ["Public Safety", "Tourism Public Safety"],
      revenueNames: [],
      staffingNames: [],
      machineryNames: []
    }
  ];

  // The page's narrative container sits beside the map embed in a two-column
  // grid, so only the first program's narrative (no table) renders there;
  // both programs' tables render together, full-width, below the grid.
  function renderTourismLifeguardIntro() {
    const introSpec = TOURISM_LIFEGUARD_SECTIONS[0];
    const narrativeRows = rowsForExactNames(cache.departmentNarratives, introSpec.narrativeNames)
      .filter((r) => r.Narrative && r.Narrative.trim());
    if (!narrativeRows.length) return "";
    return (
      '<section class="statement-of-function content-section">' +
      "<h2>" + escapeHtml(introSpec.label) + "</h2>" +
      splitIntoParagraphs(narrativeRows[0].Narrative).map((p) => "<p>" + formatNarrativeText(p) + "</p>").join("") +
      "</section>"
    );
  }

  function renderTourismLifeguardMapEmbed() {
    return (
      '<a class="lifeguard-iframe-link" href="https://www.google.com/maps/d/viewer?mid=1cEvWmwqVy53RIwJ43HT4ein3KUw" target="_blank" rel="noopener noreferrer" aria-label="Open Walton County Map">' +
        '<div class="lifeguard-iframe-preview">' +
          '<iframe src="https://www.google.com/maps/d/embed?mid=1cEvWmwqVy53RIwJ43HT4ein3KUw&amp;ehbc=2E312F" title="Walton County Map" loading="lazy" tabindex="-1"></iframe>' +
          '<div class="lifeguard-iframe-overlay">' +
            '<div class="lifeguard-iframe-button">Open Walton County Map</div>' +
          "</div>" +
        "</div>" +
      "</a>"
    );
  }

  function renderTourismLifeguardSections() {
    return TOURISM_LIFEGUARD_SECTIONS.map((spec, index) => {
      // The first program's narrative already renders above (next to the
      // map embed), so only show it again here for any later program.
      const narrativeRows = index === 0
        ? []
        : rowsForExactNames(cache.departmentNarratives, spec.narrativeNames).filter((r) => r.Narrative && r.Narrative.trim());
      const narrativeHtml = narrativeRows.length
        ? splitIntoParagraphs(narrativeRows[0].Narrative).map((p) => "<p>" + formatNarrativeText(p) + "</p>").join("")
        : "";

      const expenseRows = rowsForExactNames(cache.expenditures, spec.expenseNames);
      const revenueRows = rowsForExactNames(cache.revenues, spec.revenueNames);
      const staffingRows = rowsForExactNames(cache.staffing, spec.staffingNames);
      const expenseHtml = renderTypeSummaryTable(expenseRows, "expense", "Expenditure Summary", spec.label);
      const swfdExpenseHtml = index === 0 && expenseHtml
        ? '<div class="lifeguard-expense-map-row">' + expenseHtml + renderTourismLifeguardMapEmbed() + "</div>"
        : expenseHtml;
      const body = [
        narrativeHtml,
        swfdExpenseHtml,
        renderTypeSummaryTable(revenueRows, "revenue", "Revenue Summary", spec.label),
        renderStaffingTable(staffingRows)
      ].filter(Boolean).join("");

      if (!body) return "";
      // The first program's name already heads the page (next to the map
      // embed above), so don't repeat it as a section title here too. Later
      // programs use the same small uppercase heading style as that intro
      // for visual consistency, scoped to its own class so it doesn't
      // affect unrelated paragraphs (table captions, notes) in this section.
      const titleHtml = index === 0 ? "" : '<h2 class="statement-of-function-style-heading">' + escapeHtml(spec.label) + "</h2>";
      return (
        '<section class="tourism-admin-section">' +
        titleHtml +
        body +
        "</section>"
      );
    }).filter(Boolean).join("");
  }

  const COMBINED_SECTION_RENDERERS = {
    "tourism administration": renderTourismAdministrationSections,
    "tourism beach operations": renderTourismBeachOperationsSections
  };

  // Section labels for each combined page, in the same order they render
  // -- used only to paint instant, data-free placeholders (see
  // renderCombinedSectionPlaceholders) with the real ids a division link
  // (e.g. Summary of Expenses' "Tourism North Walton" row) needs to jump
  // to right away, before loadBudgetData() resolves.
  const COMBINED_SECTION_LABELS = {
    "tourism administration": TOURISM_ADMIN_SECTIONS.map((spec) => spec.label),
    "tourism beach operations": TOURISM_BEACH_SECTIONS.map((spec) => spec.label)
  };

  function renderCombinedSectionPlaceholders(labels) {
    return labels.map((label) =>
      '<section class="tourism-admin-section" id="' + escapeHtml(slugifyId(label)) + '">' +
      '<h2 class="tourism-admin-section-title">' + escapeHtml(label) + "</h2>" +
      '<div class="wc-data-loading">' + LOADING_MESSAGE_HTML + "</div>" +
      "</section>"
    ).join("");
  }

  // Departments whose combined sections (above) already render their own
  // Performance Measures table inline, so the page's standalone
  // performance container should stay empty instead of duplicating it.
  const DEPTS_WITH_PERFORMANCE_FOLDED_IN = new Set(["tourism beach operations", "tourism administration"]);

  function renderMosquitoStateAidTables() {
    const expenseRows = filterAllZeroRowsForSelectedDepartments(
      rowsForExactDepartment(cache.expenditures, "Mosquito Control State Aid"),
      "Mosquito Control State Aid"
    );
    const revenueRows = filterAllZeroRowsForSelectedDepartments(
      rowsForExactDepartment(cache.revenues, "Mosquito Control State Aid"),
      "Mosquito Control State Aid"
    );
    const pieces = [
      renderTypeSummaryTable(expenseRows, "expense", "Mosquito Control State Aid Expenditure Summary", "Mosquito Control State Aid"),
      renderTypeSummaryTable(revenueRows, "revenue", "Mosquito Control State Aid Revenue Summary", "Mosquito Control State Aid")
    ].filter(Boolean);

    if (!pieces.length) return "";
    return '<section class="mosquito-state-aid-tables">' + pieces.join("") + "</section>";
  }

  function getShowPriorYears(scope) {
    const priorScope = scope === "performance" ? "performance" : "budget";
    return priorYearsState[priorScope];
  }

  function setShowPriorYears(value, scope) {
    const priorScope = scope === "performance" ? "performance" : "budget";
    priorYearsState[priorScope] = !!value;
  }

  function runLength(rows, startIndex, keyFn) {
    const value = keyFn(rows[startIndex]);
    let count = 0;
    for (let i = startIndex; i < rows.length; i++) {
      if (keyFn(rows[i]) !== value) break;
      count++;
    }
    return count;
  }

  // Mirrors the markup/classes used by the original walton-performance-measures
  // widget so department pages keep the same look: merged Goal/Objective
  // cells, a Code Link column, and a "View Prior Years" column toggle.
  function renderPerformanceTable(rows) {
    if (!rows.length) return "";
    const showPrior = getShowPriorYears("performance");
    const yearCols = [
      { key: "Actual_2022", label: "Actual 2022", year: 2022 },
      { key: "Actual_2023", label: "Actual 2023", year: 2023 },
      { key: "Actual_2024", label: "Actual 2024", year: 2024 },
      { key: "Actual_2025", label: "Actual 2025", year: 2025 },
      { key: "Projected_2026", label: "Projected 2026", year: 2026 }
    ];
    const finalCol = { key: "Projected_2027", label: "Projected 2027", year: 2027 };

    const bodyRows = rows.map((r, index) => {
      const isFirstGoalRow = index === 0 || rows[index - 1].Goal !== r.Goal;
      const goalRowspan = isFirstGoalRow ? runLength(rows, index, (x) => x.Goal) : 0;
      const isFirstObjectiveRow = index === 0 || rows[index - 1].Objective !== r.Objective;
      const objectiveRowspan = isFirstObjectiveRow ? runLength(rows, index, (x) => x.Objective) : 0;

      return (
        "<tr>" +
        (isFirstGoalRow
          ? '<td class="wc-performance-code wc-performance-merged-cell" rowspan="' + goalRowspan + '">' +
            escapeHtml(r["Code Link"] || "") + "</td>"
          : "") +
        (isFirstGoalRow
          ? '<td class="wc-performance-goal wc-performance-merged-cell" rowspan="' + goalRowspan + '">' +
            escapeHtml(r.Goal || "") + "</td>"
          : "") +
        (isFirstObjectiveRow
          ? '<td class="wc-performance-objective wc-performance-merged-cell" rowspan="' + objectiveRowspan + '">' +
            escapeHtml(r.Objective || "") + "</td>"
          : "") +
        '<td class="wc-performance-measure">' + escapeHtml(r.Measure || "") + "</td>" +
        yearCols.map((c) => '<td class="wc-performance-value wc-prior-year wc-fy-' + c.year + '">' + escapeHtml(r[c.key] || "") + "</td>").join("") +
        '<td class="wc-performance-value wc-fy-' + finalCol.year + '">' + escapeHtml(r[finalCol.key] || "") + "</td>" +
        "</tr>"
      );
    });

    return (
      '<section class="wc-performance-card' + (showPrior ? " show-prior-years" : "") + '">' +
      '<div class="wc-fy-column-toggle-wrap">' +
      '<button type="button" class="wc-fy-column-toggle-button" data-wc-prior-years-scope="performance" aria-expanded="' + (showPrior ? "true" : "false") + '" aria-label="' + (showPrior ? "Hide prior years" : "View prior years") + '">' +
      '<span class="wc-fy-column-toggle-indicator" aria-hidden="true">' + (showPrior ? "✓" : "") + "</span>" +
      '<span class="wc-fy-column-toggle-text">' + (showPrior ? "Hide Prior Years" : "View Prior Years") + "</span>" +
      "</button>" +
      "</div>" +
      '<div class="wc-performance-table-wrap">' +
      '<table class="wc-performance-table">' +
      "<thead><tr>" +
      '<th>Code Link</th><th>Departmental Goal</th><th>Objective</th><th>Performance Measure</th>' +
      yearCols.map((c) => '<th class="wc-prior-year wc-fy-' + c.year + '">' + escapeHtml(c.label) + "</th>").join("") +
      '<th class="wc-fy-' + finalCol.year + '">' + escapeHtml(finalCol.label) + "</th>" +
      "</tr></thead>" +
      "<tbody>" + bodyRows.join("") + "</tbody>" +
      "</table>" +
      "</div>" +
      '<div class="wc-performance-note">' +
      "The code link shown for this department corresponds to a Strategic Priority Initiative identified by the Walton County Board of County Commissioners." +
      "</div>" +
      "</section>"
    );
  }

  function priorYearsScopeForCheckbox(checkbox) {
    if (!checkbox) return "budget";
    return checkbox.getAttribute("data-wc-prior-years-scope") ||
      (checkbox.closest(".wc-performance-card") ? "performance" : "budget");
  }

  function priorYearsScopeForToggle(toggle) {
    if (!toggle) return "budget";
    return toggle.getAttribute("data-wc-prior-years-scope") ||
      (toggle.closest(".wc-performance-card") ? "performance" : "budget");
  }

  function syncPriorYearsToggle(toggle, checked) {
    if (!toggle) return;
    if (toggle.matches(".wc-fy-column-toggle-checkbox")) {
      toggle.checked = checked;
      toggle.setAttribute("aria-label", checked ? "Hide prior years" : "View prior years");
      return;
    }
    toggle.setAttribute("aria-expanded", checked ? "true" : "false");
    const openLabel = toggle.getAttribute("data-wc-open-label") || "Hide Prior Years";
    const closedLabel = toggle.getAttribute("data-wc-closed-label") || "View Prior Years";
    toggle.setAttribute("aria-label", checked ? openLabel : closedLabel);
    const indicator = toggle.querySelector(".wc-fy-column-toggle-indicator");
    if (indicator) indicator.textContent = checked ? "✓" : "";
    const text = toggle.querySelector(".wc-fy-column-toggle-text");
    if (text) text.textContent = checked ? openLabel : closedLabel;
  }

  function applyPriorYearsState(checked, container, scope) {
    const root = container || document;
    const priorScope = scope || "budget";
    const cardSelector = priorScope === "performance" ? ".wc-performance-card" : ".wc-staffing-card, .wc-budget-lines-card";
    if (root.classList && root.matches(cardSelector) && !root.dataset.priorYearsDisabled) {
      root.classList.toggle("show-prior-years", checked);
    }
    root.querySelectorAll(cardSelector).forEach((card) => {
      if (card.dataset.priorYearsDisabled) return;
      card.classList.toggle("show-prior-years", checked);
    });
    root.querySelectorAll('.wc-fy-column-toggle-checkbox[data-wc-prior-years-scope="' + priorScope + '"]').forEach((cb) => {
      syncPriorYearsToggle(cb, checked);
    });
    root.querySelectorAll('.wc-fy-column-toggle-button[data-wc-prior-years-scope="' + priorScope + '"]').forEach((button) => {
      syncPriorYearsToggle(button, checked);
    });
  }

  function bindPriorYearsToggle(container) {
    if (!container) return;
    container.querySelectorAll(".wc-fy-column-toggle-button").forEach((button) => {
      if (button.getAttribute("data-wc-prior-years-bound") === "true") return;
      button.setAttribute("data-wc-prior-years-bound", "true");
      button.addEventListener("click", () => {
        const checked = button.getAttribute("aria-expanded") !== "true";
        const scope = priorYearsScopeForToggle(button);
        setShowPriorYears(checked, scope);
        applyPriorYearsState(checked, null, scope);
      });
    });
    container.querySelectorAll(".wc-fy-column-toggle-checkbox").forEach((checkbox) => {
      if (checkbox.getAttribute("data-wc-prior-years-bound") === "true") return;
      checkbox.setAttribute("data-wc-prior-years-bound", "true");
      checkbox.addEventListener("change", () => {
        const checked = checkbox.checked;
        const scope = priorYearsScopeForCheckbox(checkbox);
        setShowPriorYears(checked, scope);
        applyPriorYearsState(checked, null, scope);
      });
    });
  }

  // ---- department page rendering ----

  function mountOrHide(container, html) {
    if (!container) return;
    if (!html) {
      container.innerHTML = "";
      container.hidden = true;
      return;
    }
    container.hidden = false;
    container.innerHTML = html;
  }

  function pageAlreadyHasStatementOfFunction(container) {
    const headings = document.querySelectorAll("h2");
    for (let i = 0; i < headings.length; i++) {
      const h = headings[i];
      if (container && container.contains(h)) continue;
      if (h.textContent.trim().toLowerCase() === "statement of function") return true;
    }
    return false;
  }

  function renderDepartmentNarrative(container, deptName, deptCode) {
    if (!container) return;
    if (pageAlreadyHasStatementOfFunction(container)) {
      container.innerHTML = "";
      container.hidden = true;
      return;
    }
    const paragraphs = getDepartmentNarrative(deptName, deptCode);
    if (!paragraphs.length) {
      container.innerHTML = "";
      container.hidden = true;
      return;
    }
    container.hidden = false;

    // "Court Innovations" gets its own dedicated section further down the
    // page (next to the Project 1040 budget it funds), so it's excluded
    // here to avoid showing that narrative twice.
    if (normalizeDeptName(deptName) === "court technology and innovations") {
      const rows = rowsForDepartment(cache.departmentNarratives, deptName, deptCode)
        .filter((r) => r.Narrative && r.Narrative.trim() && normalizeDeptName(r.Dept_Name) !== "court innovations");
      const seen = new Set();
      const filteredParagraphs = [];
      rows.forEach((r) => {
        const text = r.Narrative.trim();
        if (!seen.has(text)) {
          seen.add(text);
          filteredParagraphs.push(...splitIntoParagraphs(text));
        }
      });
      if (!filteredParagraphs.length) {
        container.innerHTML = "";
        container.hidden = true;
        return;
      }
      container.innerHTML =
        '<section class="statement-of-function content-section">' +
        "<h2>Court Technology - Court Administration</h2>" +
        filteredParagraphs.map((p) => "<p>" + formatNarrativeText(p) + "</p>").join("") +
        "</section>";
      return;
    }

    if (normalizeDeptName(deptName) === "libraries") {
      const introParagraphs = paragraphs.slice(0, 2);
      const remainingParagraphs = paragraphs.slice(2);
      container.innerHTML =
        '<section class="statement-of-function content-section libraries-statement-media">' +
        "<h2>Statement of Function</h2>" +
        '<div class="libraries-statement-intro">' +
        introParagraphs.map((p) => "<p>" + formatNarrativeText(p) + "</p>").join("") +
        "</div>" +
        '<div class="libraries-statement-lower">' +
        '<div class="libraries-statement-rest">' +
        remainingParagraphs.map((p) => "<p>" + formatNarrativeText(p) + "</p>").join("") +
        "</div>" +
        '<div class="libraries-video-frame">' +
        '<iframe src="https://www.youtube.com/embed/gJ7QNzqj8ks?autoplay=1&amp;mute=1&amp;controls=1&amp;modestbranding=1&amp;rel=0&amp;playsinline=1" title="Libraries budget video" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>' +
        "</div>" +
        "</div>" +
        "</section>";
      return;
    }

    container.innerHTML =
      '<section class="statement-of-function content-section">' +
      "<h2>Statement of Function</h2>" +
      paragraphs.map((p) => "<p>" + formatNarrativeText(p) + "</p>").join("") +
      "</section>";
  }

  function showLoadingState(containers) {
    const first = containers.find(Boolean);
    if (first) {
      first.hidden = false;
      first.innerHTML = '<div class="wc-data-loading">' + LOADING_MESSAGE_HTML + "</div>";
    }
  }

  function showErrorState(containers) {
    containers.forEach((c, i) => {
      if (!c) return;
      if (i === 0) {
        c.hidden = false;
        c.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
      } else {
        c.innerHTML = "";
        c.hidden = true;
      }
    });
  }

  function arrangeDepartmentFinancialDashboard(expenseEl, revenueEl, staffingEl, supplementalExpenseEls, deptName) {
    const supplementalEls = supplementalExpenseEls || [];
    const cards = [expenseEl].concat(supplementalEls, [revenueEl, staffingEl]).filter((el) =>
      el && !el.hidden && el.innerHTML.trim()
    );
    if (!cards.length) return;
    let grid = document.querySelector(".wc-department-financial-grid");
    if (!grid) {
      grid = document.createElement("section");
      grid.className = "wc-department-financial-grid";
      cards[0].parentNode.insertBefore(grid, cards[0]);
    }
    cards.forEach((card) => grid.appendChild(card));

    // Departments with multiple sub-programs (distinct Dept_Name values,
    // e.g. Code Compliance / Code Compliance Beach) render one stacked
    // card per sub-program inside the expense and revenue mounts
    // independently -- a sub-program with no revenue rows means the two
    // mounts end up with a different number of stacked cards. CSS Grid
    // stretches paired cells in the same row to match the taller one,
    // which otherwise inflates the shorter mount's card with a large
    // empty gap before its footer. Opt mismatched mounts out of that
    // stretch so each card just keeps its own natural height.
    const expenseCardCount = expenseEl ? expenseEl.querySelectorAll(".wc-finance-card").length : 0;
    const revenueCardCount = revenueEl ? revenueEl.querySelectorAll(".wc-finance-card").length : 0;
    if (expenseEl) expenseEl.classList.toggle("wc-financial-mount-natural-height", expenseCardCount !== revenueCardCount);
    if (revenueEl) revenueEl.classList.toggle("wc-financial-mount-natural-height", expenseCardCount !== revenueCardCount);

    // Some pages have two expense cards that should sit side by side, with
    // the single revenue card spanning full width below them.
    if ([
      "south walton fire and state control",
      "building construction and maintenance",
      "office of the county attorney",
      "planning",
      "board of county commissioners"
    ].includes(normalizeDeptName(deptName || ""))) {
      if (expenseEl) expenseEl.classList.add("wc-financial-mount-cards-as-row");
      if (revenueEl) {
        revenueEl.classList.add("wc-financial-mount-full-width");
        revenueEl.classList.remove("wc-financial-mount-natural-height");
      }
    }
  }

  // Object_Type (case/whitespace normalized) is how a expense category
  // row is identified as Capital Outlay vs. everything else (recurring)
  // -- see renderFinancialDashboardCard's Recurring/Non-Recurring YoY
  // Change labels.
  function normalizeObjectTypeForYoy(value) {
    return String(value || "").trim().toLowerCase();
  }

  function initDepartmentPage() {
    const ids = [
      "department-narrative",
      "department-performance-table",
      "department-expense-table",
      "department-revenue-table",
      "department-staffing-table",
      "department-personnel-ledger",
      "department-machinery-table",
      "department-state-aid-tables",
      "department-solid-waste-tables",
      "department-building-construction-tables",
      "department-bcc-tables",
      "department-county-attorney-tables",
      "department-court-innovations-tables",
      "department-fund-schedule"
    ];
    const containers = ids.map((id) => document.getElementById(id));
    if (!containers.some(Boolean)) return;
    document.body.classList.add("wc-department-financial-dashboard");

    const deptName = getDepartmentNameFromPage();
    const deptCode = getDeptCodeFromPage();
    if (!deptName) return;

    // Combined pages (Tourism Administration, Tourism Beach Operations)
    // get instant, data-free placeholders carrying their real per-division
    // ids (e.g. #north-walton) instead of the generic loading message --
    // otherwise a division link (Summary of Expenses' "Tourism North
    // Walton" row, or the homepage) has nothing to scroll to until
    // loadBudgetData() resolves.
    const combinedSectionLabels = COMBINED_SECTION_LABELS[normalizeDeptName(deptName)];
    if (combinedSectionLabels) {
      const narrativeEl = containers[0];
      if (narrativeEl) {
        narrativeEl.hidden = false;
        narrativeEl.innerHTML = renderCombinedSectionPlaceholders(combinedSectionLabels);
      }
      if (window.location.hash) {
        const initialTarget = document.getElementById(window.location.hash.slice(1));
        if (initialTarget) initialTarget.scrollIntoView();
      }
    } else {
      showLoadingState(containers);
    }

    loadBudgetData()
      .then((data) => {
        if (Object.keys(data.errors || {}).length >= data.datasetCount) {
          showErrorState(containers);
          return;
        }
        const [narrativeEl, performanceEl, expenseEl, revenueEl, staffingEl, personnelLedgerEl, machineryEl, stateAidEl, solidWasteEl, buildingConstructionEl, bccEl, countyAttorneyEl, courtInnovationsEl, fundScheduleEl] = containers;

        // Some pages combine several separately budgeted divisions; for
        // those, narrative/expenditures/revenue/staffing/machinery (and,
        // for Beach Operations, performance measures) are grouped together
        // into one block per division rather than spread across the page's
        // per-data-type containers.
        const combinedSectionsRenderer = COMBINED_SECTION_RENDERERS[normalizeDeptName(deptName)];
        const performanceFoldedIntoSections = DEPTS_WITH_PERFORMANCE_FOLDED_IN.has(normalizeDeptName(deptName));

        mountOrHide(
          performanceEl,
          performanceFoldedIntoSections ? "" : renderPerformanceTable(getDepartmentPerformanceMeasures(deptName, deptCode))
        );
        bindPriorYearsToggle(performanceEl);

        if (combinedSectionsRenderer) {
          mountOrHide(narrativeEl, combinedSectionsRenderer());
          bindTooltipAnchors(narrativeEl);
          bindPriorYearsToggle(narrativeEl);
          mountOrHide(expenseEl, "");
          mountOrHide(revenueEl, "");
          mountOrHide(staffingEl, "");
          mountOrHide(personnelLedgerEl, "");
          mountOrHide(machineryEl, "");
          mountOrHide(stateAidEl, "");
          mountOrHide(solidWasteEl, "");
          mountOrHide(buildingConstructionEl, "");
          mountOrHide(bccEl, "");
          mountOrHide(countyAttorneyEl, "");
          mountOrHide(courtInnovationsEl, "");
          mountOrHide(fundScheduleEl, "");
          // Combined pages (e.g. Tourism Administration's #marketing)
          // return here, before the non-combined exit point below -- do
          // the hash-scroll here too so a division link still works.
          if (window.location.hash) {
            const target = document.getElementById(window.location.hash.slice(1));
            if (target) target.scrollIntoView();
          }
          return;
        }

        // Tourism Lifeguard Services and Beach Safety's narrative container
        // sits beside a map embed in a two-column grid, so only the first
        // program's narrative goes there; both programs' expense tables
        // render together, full-width, in the expense container below it.
        if (normalizeDeptName(deptName) === "tourism lifeguard services and beach safety") {
          mountOrHide(narrativeEl, renderTourismLifeguardIntro());
          mountOrHide(expenseEl, renderTourismLifeguardSections());
          bindTooltipAnchors(expenseEl);
          bindPriorYearsToggle(expenseEl);
          mountOrHide(revenueEl, "");
          mountOrHide(staffingEl, "");
          mountOrHide(personnelLedgerEl, "");
          mountOrHide(machineryEl, "");
          mountOrHide(stateAidEl, "");
          mountOrHide(solidWasteEl, "");
          mountOrHide(buildingConstructionEl, "");
          mountOrHide(bccEl, "");
          mountOrHide(countyAttorneyEl, "");
          mountOrHide(courtInnovationsEl, "");
          mountOrHide(fundScheduleEl, "");
          // Combined pages (e.g. Tourism Administration's #marketing)
          // return here, before the non-combined exit point below -- do
          // the hash-scroll here too so a division link still works.
          if (window.location.hash) {
            const target = document.getElementById(window.location.hash.slice(1));
            if (target) target.scrollIntoView();
          }
          return;
        }

        renderDepartmentNarrative(narrativeEl, deptName, deptCode);

        // Statutory & Other Agency Funding is scattered across many
        // unrelated Dept_Names (Economic Development Alliance, Human
        // Services, Lakeview, Volunteer Fire, etc.), so it's pulled
        // together by its shared Note value instead of by Dept_Name. Each
        // row's Project_Name (e.g. "Lakeview Center (Mental Health)")
        // identifies the specific agency/program, so that's used as the
        // "Itemized Description" in the budget lines detail instead of
        // the Note column (which is just "Statutory & Other" on every row).
        let expenseHtml;
        let expenseRowsForRevenuePlug;
        if (normalizeDeptName(deptName) === "statutory and other agency funding") {
          const statutoryRows = (cache.expenditures || []).filter((r) => (r.Note || "").trim() === "Statutory & Other");
          expenseRowsForRevenuePlug = statutoryRows;
          expenseHtml = renderStatutoryAgencyExpenseCard(statutoryRows, "Expenditure Summary", "Project_Name");
        } else {
          // Some departments break specific object codes out into their own
          // supplemental table below; exclude those codes here to avoid
          // double-counting them in the main Expenditure Summary.
          const excludedObjectCodes = EXPENSE_OBJECT_CODES_BROKEN_OUT[normalizeDeptName(deptName)] || [];
          // The Court Innovation FTE (Project 1040) is booked under the Board
          // of County Commissioners' Dept_Name/Dept_Code, but it's shown on
          // the Court Innovations rollup instead, so it's excluded here to
          // avoid double-counting it on the BCC page.
          const isBcc = normalizeDeptName(deptName) === "board of county commissioners";
          const isBuildingConstruction = normalizeDeptName(deptName) === "building construction and maintenance";
          const expenseRows = filterAllZeroRowsForSelectedDepartments(getDepartmentExpenses(deptName, deptCode).filter(
            (r) =>
              !excludedObjectCodes.includes(String(r.Object_Code || "").trim()) &&
              !(isBcc && String(r.Project_Code || "").trim() === "1040")
          ), deptName);
          // Some pages display supplemental expense cards below the main
          // Expenditure Summary. The revenue plug should balance to the
          // same combined total a reader sees across those cards.
          if (isBcc) {
            expenseRowsForRevenuePlug = expenseRows.concat(rowsForExactDepartment(cache.expenditures, "BCC Other Uses Contingency"));
          } else if (isBuildingConstruction) {
            expenseRowsForRevenuePlug = expenseRows.concat(
              rowsForExactDepartment(cache.expenditures, "Building Construction and Maintenance")
                .filter((r) => String(r.Object_Code || "").trim() === "543000")
            );
          } else {
            expenseRowsForRevenuePlug = expenseRows;
          }
          expenseHtml = renderTypeSummaryTable(expenseRows, "expense", "Expenditure Summary", deptName);
        }
        mountOrHide(expenseEl, expenseHtml);
        bindTooltipAnchors(expenseEl);
        bindPriorYearsToggle(expenseEl);

        const rawRevenueRows = getDepartmentRevenues(deptName, deptCode);
        const deptExpenseRows = dedupBudgetLinesAcrossDeptNames(expenseRowsForRevenuePlug || getDepartmentExpenses(deptName, deptCode));
        let filledRevenueRows = fillRevenueActualsFromExpenses(rawRevenueRows, deptExpenseRows);
        if (filledRevenueRows.some((r) => isSheriffRevenueDept(r))) {
          const all381 = filledRevenueRows.filter((r) => String((r && r.Revenue_Code) || "").trim() === "381000");
          const src311 = filledRevenueRows.find((r) => String((r && r.Revenue_Code) || "").trim() === "311000");
          if (all381.length && src311) {
            const sum381fy2024 = all381.reduce((s, r) => s + (r.FY2024_Actual || 0), 0);
            const sum381fy2025 = all381.reduce((s, r) => s + (r.FY2025_Actual || 0), 0);
            const sum381fy2026 = all381.reduce((s, r) => s + (r.FY2026_Original_Budget || r.FY2026_Budget || 0), 0);
            const total2027 = [src311, ...all381].reduce((s, r) => s + (r.FY2027_Proposed || 0), 0);
            const fy2027AdValorem = Math.max(0, total2027 - 480000);
            let interfundAssigned = false;
            filledRevenueRows = filledRevenueRows.map((r) => {
              const code = String((r && r.Revenue_Code) || "").trim();
              if (code === "311000") {
                return {
                  ...r,
                  _actualsBackfilled: true,
                  FY2024_Actual: sum381fy2024,
                  FY2025_Actual: sum381fy2025,
                  FY2026_Original_Budget: sum381fy2026,
                  FY2026_Budget: sum381fy2026,
                  FY2027_Proposed: fy2027AdValorem,
                };
              }
              if (code === "381000") {
                const fy2027 = !interfundAssigned ? 480000 : 0;
                interfundAssigned = true;
                return {
                  ...r,
                  _actualsBackfilled: true,
                  _originalBudgetDeduped: true,
                  FY2024_Actual: 0,
                  FY2025_Actual: 0,
                  FY2026_Original_Budget: 0,
                  FY2026_Budget: 0,
                  FY2027_Proposed: fy2027,
                };
              }
              return r;
            });
          }
          // Ad Valorem Taxes Delinquent (Revenue_Code 311001) is its own
          // separate raw row for the Sheriff's own fund (107311), and
          // REVENUE_CODE_NAME_OVERRIDES relabels it to display as "Ad
          // Valorem Taxes" too (see that map's own comment -- delinquent
          // collections are the same underlying tax, just collected late).
          // Every other summary that groups by name already folds it into
          // one combined line; this department's own itemized Revenue
          // Lines table doesn't group by name at all, so without this it
          // renders as a second, identically-labeled "Ad Valorem Taxes"
          // row instead of one. Scoped to just the Sheriff here -- not a
          // sitewide combine-by-name change to this table.
          const adValoremIndex = filledRevenueRows.findIndex((r) => String((r && r.Revenue_Code) || "").trim() === "311000");
          const delinquentRows = filledRevenueRows.filter((r) => String((r && r.Revenue_Code) || "").trim() === "311001");
          if (adValoremIndex !== -1 && delinquentRows.length) {
            const mergeFields = ["FY2020_Actual", "FY2021_Actual", "FY2022_Actual", "FY2023_Actual", "FY2024_Actual", "FY2025_Actual", "FY2026_Original_Budget", "FY2026_Budget", "FY2027_Proposed"];
            const merged = { ...filledRevenueRows[adValoremIndex], _actualsBackfilled: true };
            delinquentRows.forEach((r) => {
              mergeFields.forEach((f) => { merged[f] = (merged[f] || 0) + (r[f] || 0); });
            });
            filledRevenueRows[adValoremIndex] = merged;
            filledRevenueRows = filledRevenueRows.filter((r) => String((r && r.Revenue_Code) || "").trim() !== "311001");
          }
        }
        const revenueRows = filterAllZeroRowsForSelectedDepartments(filledRevenueRows, deptName);
        mountOrHide(
          revenueEl,
          renderTypeSummaryTable(revenueRows, "revenue", "Revenue Summary", deptName)
        );
        bindTooltipAnchors(revenueEl);
        bindPriorYearsToggle(revenueEl);

        mountOrHide(staffingEl, renderStaffingTable(getDepartmentStaffing(deptName, deptCode)));
        bindPriorYearsToggle(staffingEl);
        mountOrHide(personnelLedgerEl, renderDepartmentPersonnelLedgerSection(deptName, expenseRowsForRevenuePlug || getDepartmentExpenses(deptName, deptCode)));
        mountOrHide(machineryEl, "");
        mountOrHide(
          stateAidEl,
          normalizeDeptName(deptName) === "mosquito control" ? renderMosquitoStateAidTables() : ""
        );
        bindTooltipAnchors(stateAidEl);

        mountOrHide(
          solidWasteEl,
          normalizeDeptName(deptName) === "solid waste" ? renderSolidWasteSupplementalTables() : ""
        );
        bindTooltipAnchors(solidWasteEl);
        bindPriorYearsToggle(solidWasteEl);

        mountOrHide(
          buildingConstructionEl,
          normalizeDeptName(deptName) === "building construction and maintenance"
            ? renderBuildingConstructionSupplementalTables()
            : ""
        );
        bindTooltipAnchors(buildingConstructionEl);
        bindPriorYearsToggle(buildingConstructionEl);

        mountOrHide(
          bccEl,
          normalizeDeptName(deptName) === "board of county commissioners"
            ? renderBoardOfCountyCommissionersSupplementalTables()
            : ""
        );
        bindTooltipAnchors(bccEl);
        bindPriorYearsToggle(bccEl);

        mountOrHide(
          countyAttorneyEl,
          normalizeDeptName(deptName) === "office of the county attorney"
            ? renderCountyAttorneySupplementalTables(deptName, deptCode)
            : ""
        );
        bindTooltipAnchors(countyAttorneyEl);
        bindPriorYearsToggle(countyAttorneyEl);

        mountOrHide(
          courtInnovationsEl,
          normalizeDeptName(deptName) === "court technology and innovations"
            ? renderCourtInnovationsSupplementalTables()
            : ""
        );
        bindTooltipAnchors(courtInnovationsEl);
        bindPriorYearsToggle(courtInnovationsEl);

        const fundCode = getFundCodeFromPage();
        mountOrHide(
          fundScheduleEl,
          fundCode ? buildFundFinancialSchedule([fundCode], deptName) : ""
        );
        bindPriorYearsToggle(fundScheduleEl);

        arrangeDepartmentFinancialDashboard(expenseEl, revenueEl, staffingEl, [
          solidWasteEl,
          buildingConstructionEl,
          bccEl,
          countyAttorneyEl
        ], deptName);

        // A combined page's per-division sections (e.g. Tourism
        // Administration's #marketing, #communications) don't exist until
        // this point -- a page loaded with that hash already missed the
        // browser's automatic scroll-on-load, so do it manually now that
        // the target exists (e.g. a "View Budget Lines" department link
        // from Summary of Expenses).
        if (window.location.hash) {
          const target = document.getElementById(window.location.hash.slice(1));
          if (target) target.scrollIntoView();
        }
      })
      .catch((err) => {
        console.error("WCBudgetData: failed to load budget data", err);
        showErrorState(containers);
      });
  }

  // Type-to-filter combobox: a plain text input with a contained,
  // scrollable results list, used in place of a native <select> for
  // Department/Fund (and similar) filters across the site. A native
  // <select>'s own long options popup (Department alone runs to ~70
  // entries) can let scrolling through it bleed into scrolling the page
  // behind it on some browsers/trackpads -- this avoids that native popup
  // entirely.
  function filterComboFieldHtml(config) {
    const allLabel = config.allLabel || "All";
    const initialLabel = config.initialLabel || allLabel;
    return (
      '<div class="wc-filter-combo">' +
      '<label class="wc-filter-field"><span>' + escapeHtml(config.label) + "</span>" +
      '<input type="text" class="wc-filter-combo-input" id="' + config.idPrefix + 'Input" autocomplete="off" placeholder="' +
      escapeHtml(allLabel) + '" value="' + escapeHtml(initialLabel) + '">' +
      "</label>" +
      '<div class="wc-filter-combo-results" id="' + config.idPrefix + 'Results" hidden></div>' +
      "</div>"
    );
  }

  // Pair with filterComboFieldHtml -- config: { input, results, options,
  // allValue = "", allLabel = "All", labelForValue?, getCurrentValue,
  // onSelect }. Returns { setValue(value) } so callers that programmatically
  // change the filter (reset buttons, callout chips, a mutually-exclusive
  // sibling filter, a URL-driven initial value) can keep the input's
  // displayed text in sync without re-triggering onSelect.
  function setupFilterCombo(config) {
    const allValue = config.allValue || "";
    const allLabel = config.allLabel || "All";
    function labelForValue(value) {
      if (config.labelForValue) return config.labelForValue(value);
      return value === allValue ? allLabel : value;
    }
    function optionsMatching(query) {
      const q = query.trim().toLowerCase();
      return q ? config.options.filter((o) => o.toLowerCase().includes(q)) : config.options;
    }
    function renderResults(query) {
      const matches = optionsMatching(query);
      config.results.innerHTML =
        '<button type="button" class="wc-filter-combo-option" data-value="' + escapeHtml(allValue) + '">' + escapeHtml(allLabel) + "</button>" +
        matches.map((o) => '<button type="button" class="wc-filter-combo-option" data-value="' + escapeHtml(o) + '">' + escapeHtml(o) + "</button>").join("");
      config.results.hidden = false;
    }
    config.input.addEventListener("focus", () => {
      config.input.select();
      renderResults("");
    });
    config.input.addEventListener("input", () => {
      renderResults(config.input.value);
    });
    config.input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        config.results.hidden = true;
        config.input.blur();
      }
    });
    config.results.addEventListener("click", (event) => {
      const button = event.target.closest(".wc-filter-combo-option");
      if (!button) return;
      const value = button.dataset.value;
      config.input.value = labelForValue(value);
      config.results.hidden = true;
      config.onSelect(value);
    });
    document.addEventListener("click", (event) => {
      if (config.input.contains(event.target) || config.results.contains(event.target)) return;
      config.results.hidden = true;
      config.input.value = labelForValue(config.getCurrentValue());
    });
    return {
      setValue(value) {
        config.input.value = labelForValue(value);
        config.results.hidden = true;
      }
    };
  }

  // ---- financial summary pages (Summary of Expenses / Summary of Revenues) ----

  function renderFilterControls(container, fields, state, onChange) {
    if (!container) return;
    const combos = fields
      .map((f) => filterComboFieldHtml({ idPrefix: "wcFinancialFilter" + f.key, label: f.label, options: f.options }))
      .join("");

    container.innerHTML =
      combos +
      '<label class="wc-filter-field wc-filter-search"><span>Search</span>' +
      '<input type="search" data-filter-key="search" placeholder="Search by name or code" /></label>';

    fields.forEach((f) => {
      setupFilterCombo({
        input: container.querySelector("#wcFinancialFilter" + f.key + "Input"),
        results: container.querySelector("#wcFinancialFilter" + f.key + "Results"),
        options: f.options,
        getCurrentValue: () => state[f.key],
        onSelect: (value) => {
          state[f.key] = value;
          onChange();
        }
      });
    });
    const searchInput = container.querySelector('input[data-filter-key="search"]');
    if (searchInput) {
      let t;
      searchInput.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(() => {
          state.search = searchInput.value.trim();
          onChange();
        }, 150);
      });
    }
  }

  function renderFinancialSummary(container, type) {
    if (!container) return;
    const isExpense = type !== "revenues";
    const rows = isExpense ? cache.expenditures : cache.revenues;
    if (!rows.length) {
      container.innerHTML = '<div class="wc-data-empty">No ' + (isExpense ? "expenditure" : "revenue") + " data is available.</div>";
      return;
    }
    const typeField = isExpense ? "Object_Type" : "Revenue_Type";
    const nameField = isExpense ? "Object_Name" : "Revenue_Name";
    const codeField = isExpense ? "Object_Code" : "Revenue_Code";

    container.innerHTML =
      '<div class="wc-filter-bar" role="search" aria-label="Filter ' + (isExpense ? "expenditures" : "revenues") + '"></div>' +
      '<div class="wc-filter-summary"></div>' +
      '<div class="wc-financial-summary-table"></div>';

    const filterBar = container.querySelector(".wc-filter-bar");
    const summaryEl = container.querySelector(".wc-filter-summary");
    const tableEl = container.querySelector(".wc-financial-summary-table");
    const state = { department: "", type: "", search: "" };

    function applyFilters() {
      const filtered = rows.filter((r) => {
        if (state.department && r.Dept_Name !== state.department) return false;
        if (state.type && r[typeField] !== state.type) return false;
        if (state.search) {
          const haystack = (
            (r.Dept_Name || "") + " " + (r[nameField] || "") + " " + (r[codeField] || "") + " " + (r.Project_Name || "")
          ).toLowerCase();
          if (!haystack.includes(state.search.toLowerCase())) return false;
        }
        return true;
      });

      mountOrHide(
        tableEl,
        renderLedgerTable({ rows: filtered, kind: isExpense ? "expense" : "revenue", scope: "summary" })
      );
      if (!filtered.length) {
        tableEl.hidden = false;
        tableEl.innerHTML = '<div class="wc-data-empty">No rows match the current filters.</div>';
      }
      const total = filtered.reduce((s, r) => s + (r.FY2027_Proposed || 0), 0);
      summaryEl.innerHTML =
        '<p class="wc-filter-result-count">Showing ' + filtered.length.toLocaleString() + " of " + rows.length.toLocaleString() +
        " rows &mdash; FY 2027 Proposed Total: " + formatCurrency(total) + "</p>";
    }

    renderFilterControls(
      filterBar,
      [
        { key: "department", label: "Department", options: uniqueSorted(rows.map((r) => r.Dept_Name)) },
        { key: "type", label: isExpense ? "Object Type" : "Revenue Type", options: uniqueSorted(rows.map((r) => r[typeField])) }
      ],
      state,
      applyFilters
    );

    applyFilters();
  }

  // Summary of Machinery, Vehicles & Equipment: a department picker instead
  // of one long scrolling list of every item across every department.
  function renderMachinerySummary(container) {
    if (!container) return;
    const rows = cache.machinery || [];
    if (!rows.length) {
      container.innerHTML = '<div class="wc-data-empty">No machinery, vehicles &amp; equipment data is available.</div>';
      return;
    }

    const departments = uniqueSorted(rows.map((r) => r.Dept_Name));
    const types = uniqueSorted(rows.map((r) => r.ME_Type));

    // Requested but not funded in the FY2027 Proposed budget -- a small,
    // separately-maintained sheet (see normalizeMachineryUnfundedRow) with
    // the same Department/Item/Type/BCC Replacement shape as the funded
    // rows above, kept in its own clearly-labeled section so an unfunded
    // request is never mistaken for a funded one.
    const unfundedRows = cache.machineryUnfunded || [];
    // Both helpers below are function declarations further down in this
    // function, so they're available here.
    const allRows = rows.concat(unfundedRows);
    const requestTypes = uniqueSorted(allRows.map((r) => machineryRequestType(r)));
    const revenueSources = uniqueSorted(allRows.map((r) => revenueSourceText(r)));

    container.innerHTML =
      '<div class="wc-machinery-source-totals"></div>' +
      '<div class="wc-filter-bar wc-machinery-picker">' +
      filterComboFieldHtml({ idPrefix: "wcMachineryDept", label: "Department", options: departments }) +
      filterComboFieldHtml({ idPrefix: "wcMachineryType", label: "Type", options: types }) +
      filterComboFieldHtml({ idPrefix: "wcMachineryRequest", label: "New / Replacement", options: requestTypes }) +
      filterComboFieldHtml({ idPrefix: "wcMachinerySource", label: "Revenue Source", options: revenueSources }) +
      "</div>" +
      '<div class="wc-financial-summary-table"></div>' +
      (unfundedRows.length
        ? '<p class="wc-table-label wc-machinery-unfunded-label">Requested But Not Included in the Budget</p>' +
          '<div class="wc-machinery-unfunded-table"></div>'
        : "");

    const tableEl = container.querySelector(".wc-financial-summary-table");
    const unfundedTableEl = container.querySelector(".wc-machinery-unfunded-table");
    const sourceTotalsEl = container.querySelector(".wc-machinery-source-totals");
    let selectedDept = "";
    let selectedType = "";
    let selectedRequestType = "";
    let selectedSource = "";

    function assetNumberHtml(row) {
      const assetNumber = String(row.BCC_Replacement || "").trim();
      if (!assetNumber) return "—";
      if (!/^vehicles?$/i.test(String(row.ME_Type || "").trim())) return escapeHtml(assetNumber);
      // The asset record page is only published for dark-mode visitors (see
      // asset-detail.js) -- shown as plain text in light mode rather than a
      // clickable link that just lands on a "dark mode only" message.
      if (document.documentElement.getAttribute("data-theme") !== "dark") return escapeHtml(assetNumber);
      const query = new URLSearchParams({
        asset: assetNumber,
        amount: String(row.Amount || 0),
        replacement: String(row.Item_Description || "Replacement equipment"),
        fleetNote: String(row.Fleet_Note || "")
      });
      return '<a class="wc-asset-record-link" href="asset-detail.html?' + query.toString() + '" aria-label="View equipment record and cost-benefit analysis for BCC asset ' + escapeHtml(assetNumber) + '">' + escapeHtml(assetNumber) + '<span aria-hidden="true"> →</span></a>';
    }

    // The revenue actually paying for the request -- the requesting
    // department's largest budgeted revenue allocation, not simply the
    // name of the fund it is charged to. See
    // largestRevenueSourceForDepartment for the fallbacks.
    // Whether a request replaces an existing item or adds a new one. The
    // sheet records this inside the item description ("SUV - Replacement",
    // "... - Rpl #1234") rather than its own field, with a BCC asset number
    // as a second signal. Anything unmarked is treated as new.
    function machineryRequestType(row) {
      const description = String(row.Item_Description || "");
      if (/\b(replacement|replace|rpl)\b/i.test(description)) return "Replacement";
      if (/\bnew\b/i.test(description)) return "New";
      return String(row.BCC_Replacement || "").trim() ? "Replacement" : "New";
    }

    // The same marker removed from the description now that it has its own
    // column. Only a trailing marker is stripped, so a mid-sentence "New"
    // that qualifies the item ("Crew Cab Truck - New (Morrison Center)")
    // is left alone.
    function machineryItemDescription(row) {
      return String(row.Item_Description || "")
        .replace(/[\s.,]*[-–—]?\s*\b(replacement|replace|rpl)\b[\s.#:-]*\d*\s*$/i, "")
        .replace(/[\s.,]*[-–—]\s*\bnew\b\s*$/i, "")
        .trim();
    }

    function revenueSourceText(row) {
      const source = largestRevenueSourceForDepartment(row.Dept_Name, row.Dept_Code);
      if (source) return source;
      const fundCode = String(row.Fund_Code || "").trim();
      return String(row.Fund_Name || "").trim() ||
        (((cache.funds || []).find((f) => String(f.Fund_Code || "").trim() === fundCode) || {}).Fund_Name || "");
    }

    function revenueSourceHtml(row) {
      const source = revenueSourceText(row);
      return source ? escapeHtml(source) : "&mdash;";
    }

    // What each revenue source pays for across the requests currently shown,
    // largest first -- the same per-department source used in the table's
    // Revenue Source column, totalled.
    function renderSourceTotals(items) {
      if (!sourceTotalsEl) return;
      const totals = new Map();
      items.forEach((r) => {
        const fundCode = String(r.Fund_Code || "").trim();
        const fund = String(r.Fund_Name || "").trim() ||
          (((cache.funds || []).find((f) => String(f.Fund_Code || "").trim() === fundCode) || {}).Fund_Name || "") ||
          (fundCode ? "Fund " + fundCode : "Not identified");
        const source = revenueSourceLabel(largestRevenueSourceForDepartment(r.Dept_Name, r.Dept_Code)) || "Not identified";
        const key = fund + "\u0000" + source;
        const entry = totals.get(key) || { fund: fund, source: source, amount: 0 };
        entry.amount += r.Amount || 0;
        totals.set(key, entry);
      });
      const total = items.reduce((sum, r) => sum + (r.Amount || 0), 0);
      // Grouped by fund, General Fund first, then the remaining funds
      // alphabetically -- within a fund, largest revenue source first.
      const ordered = Array.from(totals.values()).sort((a, b) => {
        if (a.fund !== b.fund) {
          const aGeneral = /^general fund$/i.test(a.fund);
          const bGeneral = /^general fund$/i.test(b.fund);
          if (aGeneral !== bGeneral) return aGeneral ? -1 : 1;
          return a.fund.localeCompare(b.fund);
        }
        return b.amount - a.amount;
      });
      if (!ordered.length) {
        mountOrHide(sourceTotalsEl, "");
        return;
      }
      const bodyRows = ordered.map((entry) =>
        "<tr><td>" + escapeHtml(entry.fund) + "</td>" +
        "<td>" + escapeHtml(entry.source) + "</td>" +
        '<td class="wc-num">' + (total ? ((entry.amount / total) * 100).toFixed(1) : "0.0") + "%</td>" +
        '<td class="wc-num">' + formatCurrency(entry.amount) + "</td></tr>"
      );
      bodyRows.push('<tr class="wc-table-total-row"><td colspan="3">Total</td><td class="wc-num">' + formatCurrency(total) + "</td></tr>");
      mountOrHide(
        sourceTotalsEl,
        renderTable({
          caption: "Funding by Revenue Source",
          columns: [{ label: "Fund" }, { label: "Revenue Source" }, { label: "Share", num: true }, { label: "Amount", num: true }],
          bodyRows: bodyRows
        })
      );
    }

    function matchesMachineryFilters(row, deptName, typeName) {
      if (deptName && row.Dept_Name !== deptName) return false;
      if (typeName && row.ME_Type !== typeName) return false;
      if (selectedRequestType && machineryRequestType(row) !== selectedRequestType) return false;
      if (selectedSource && revenueSourceText(row) !== selectedSource) return false;
      return true;
    }

    function showFiltered() {
      const deptName = selectedDept;
      const typeName = selectedType;
      const items = rows
        .filter((r) => matchesMachineryFilters(r, deptName, typeName))
        .slice()
        .sort((a, b) => String(a.Dept_Name || "").localeCompare(String(b.Dept_Name || "")));
      const total = items.reduce((s, r) => s + (r.Amount || 0), 0);
      const showDeptColumn = !deptName;
      renderSourceTotals(items);

      const bodyRows = items.map((r) =>
        "<tr>" +
        (showDeptColumn ? "<td>" + escapeHtml(r.Dept_Name || "") + "</td>" : "") +
        "<td>" + escapeHtml(machineryItemDescription(r)) + "</td>" +
        "<td>" + escapeHtml(machineryRequestType(r)) + "</td>" +
        "<td>" + escapeHtml(r.ME_Type || "") + "</td>" +
        "<td>" + assetNumberHtml(r) + "</td>" +
        "<td>" + revenueSourceHtml(r) + "</td>" +
        '<td class="wc-num">' + formatCurrency(r.Amount || 0) + "</td></tr>"
      );
      bodyRows.push(
        '<tr class="wc-table-total-row"><td' + (showDeptColumn ? ' colspan="6"' : ' colspan="5"') + ">Total</td><td class=\"wc-num\">" + formatCurrency(total) + "</td></tr>"
      );

      const columns = (showDeptColumn ? [{ label: "Department" }] : [])
        .concat([{ label: "Item Description" }, { label: "New / Replacement" }, { label: "Type" }, { label: "BCC Replacement #" }, { label: "Revenue Source" }, { label: "Amount", num: true }]);

      if (!items.length) {
        mountOrHide(tableEl, '<div class="wc-data-empty">No rows match the current filters.</div>');
      } else {
        mountOrHide(
          tableEl,
          renderTable({
            caption: deptName || "All Departments",
            columns: columns,
            bodyRows: bodyRows
          })
        );
      }

      if (!unfundedTableEl) return;
      const unfundedItems = unfundedRows
        .filter((r) => matchesMachineryFilters(r, deptName, typeName))
        .slice()
        .sort((a, b) => String(a.Dept_Name || "").localeCompare(String(b.Dept_Name || "")));
      const unfundedTotal = unfundedItems.reduce((s, r) => s + (r.Amount || 0), 0);
      const unfundedBodyRows = unfundedItems.map((r) =>
        "<tr>" +
        (showDeptColumn ? "<td>" + escapeHtml(r.Dept_Name || "") + "</td>" : "") +
        "<td>" + escapeHtml(machineryItemDescription(r)) + "</td>" +
        "<td>" + escapeHtml(machineryRequestType(r)) + "</td>" +
        "<td>" + escapeHtml(r.ME_Type || "") + "</td>" +
        "<td>" + assetNumberHtml(r) + "</td>" +
        "<td>" + revenueSourceHtml(r) + "</td>" +
        '<td class="wc-num">' + formatCurrency(r.Amount || 0) + "</td></tr>"
      );
      if (unfundedBodyRows.length) {
        unfundedBodyRows.push(
          '<tr class="wc-table-total-row"><td' + (showDeptColumn ? ' colspan="6"' : ' colspan="5"') + ">Total</td><td class=\"wc-num\">" + formatCurrency(unfundedTotal) + "</td></tr>"
        );
        mountOrHide(
          unfundedTableEl,
          renderTable({
            columns: columns,
            bodyRows: unfundedBodyRows
          })
        );
      } else {
        mountOrHide(unfundedTableEl, '<div class="wc-data-empty">No unfunded requests match the current filters.</div>');
      }
    }

    setupFilterCombo({
      input: container.querySelector("#wcMachineryDeptInput"),
      results: container.querySelector("#wcMachineryDeptResults"),
      options: departments,
      getCurrentValue: () => selectedDept,
      onSelect: (value) => {
        selectedDept = value;
        showFiltered();
      }
    });
    setupFilterCombo({
      input: container.querySelector("#wcMachineryTypeInput"),
      results: container.querySelector("#wcMachineryTypeResults"),
      options: types,
      getCurrentValue: () => selectedType,
      onSelect: (value) => {
        selectedType = value;
        showFiltered();
      }
    });
    setupFilterCombo({
      input: container.querySelector("#wcMachineryRequestInput"),
      results: container.querySelector("#wcMachineryRequestResults"),
      options: requestTypes,
      getCurrentValue: () => selectedRequestType,
      onSelect: (value) => {
        selectedRequestType = value;
        showFiltered();
      }
    });
    setupFilterCombo({
      input: container.querySelector("#wcMachinerySourceInput"),
      results: container.querySelector("#wcMachinerySourceResults"),
      options: revenueSources,
      getCurrentValue: () => selectedSource,
      onSelect: (value) => {
        selectedSource = value;
        showFiltered();
      }
    });
    showFiltered();
  }

  // A few historical departments' equipment is clearly paid for by a
  // specific revenue source (and fund) that largestRevenueSourceForDepartment/
  // historicalMachineryFundForDept can't reliably derive on their own --
  // either because the department has no revenue rows of its own (Beach
  // Operations/Beach Tram are Tourist Development Fund divisions with no
  // direct revenue line) or its historical dept spelling doesn't match a
  // live expenditure Dept_Name closely enough to resolve a fund
  // automatically (Facilities Maintenance/Park Maintenance/Custodial
  // Services). Local Government 1/2 Cent Sales Tax is General Fund revenue,
  // mirroring the same override REVENUE_SOURCE_DEPARTMENT_OVERRIDES already
  // uses for Eagle Springs.
  const HISTORICAL_MACHINERY_SOURCE_OVERRIDES = new Map([
    ["beach operations", { source: "Tourist Development Taxes", fund: "Tourist Development Fund" }],
    ["beach tram", { source: "Tourist Development Taxes", fund: "Tourist Development Fund" }],
    ["building department", { source: "Building Permits", fund: "Building Fund" }],
    ["facilities maintenance", { source: "Local Government 1/2 Cent Sales Tax", fund: "General Fund" }],
    ["park maintenance", { source: "Local Government 1/2 Cent Sales Tax", fund: "General Fund" }],
    ["custodial services", { source: "Local Government 1/2 Cent Sales Tax", fund: "General Fund" }]
  ]);

  // The fund a historical department's equipment is booked against --
  // derived from that department's own FY2027 expenditure rows (the
  // largest-dollar fund among them), since the historical rows themselves
  // carry no Fund_Code to read directly. This mirrors what the live
  // ledger's own Fund column shows (the fund paying for the request), just
  // sourced from expenditures instead of a per-row Fund_Code.
  function historicalMachineryFundForDept(dept) {
    const rows = rowsForDepartment(cache.expenditures, dept, "");
    const totals = new Map();
    rows.forEach((r) => {
      const code = fundCodeForRow(r);
      if (!code) return;
      totals.set(code, (totals.get(code) || 0) + (r.FY2027_Proposed || 0));
    });
    let bestCode = "";
    let bestAmount = -1;
    totals.forEach((amount, code) => {
      if (amount > bestAmount) { bestAmount = amount; bestCode = code; }
    });
    if (!bestCode) return "";
    const fund = (cache.funds || []).find((f) => String(f.Fund_Code || "").trim() === bestCode);
    return (fund && fund.Fund_Name) || "";
  }

  // FY 2025/FY 2026 Machinery, Vehicles & Equipment -- a locally-maintained
  // historical reference (see assets/machinery-fy2025-2026-supplement.js),
  // not part of the live FY2027 machinery sheet. Same Revenue Source lookup
  // the live ledger's own table/source-totals use
  // (largestRevenueSourceForDepartment), plus the manual overrides above,
  // keyed by department name only since the historical rows carry no
  // Dept_Code to match on more precisely.
  function renderHistoricalMachineryLedgerYear(container, year) {
    if (!container) return;
    const historical = window.wcHistoricalMachinery || {};
    const items = historical[year === "FY2026" ? "fy2026" : "fy2025"] || [];
    const yearLabel = year === "FY2026" ? "FY 2026" : "FY 2025";
    if (!items.length) {
      container.innerHTML = '<p class="wc-data-empty">No Machinery, Vehicles &amp; Equipment data is available for ' + escapeHtml(yearLabel) + ".</p>";
      return;
    }
    container.innerHTML = '<div class="wc-data-loading">' + LOADING_MESSAGE_HTML + "</div>";
    loadBudgetData().then(() => {
      const byDept = new Map();
      items.forEach((row) => {
        if (!byDept.has(row.dept)) byDept.set(row.dept, []);
        byDept.get(row.dept).push(row);
      });
      const deptNames = Array.from(byDept.keys()).sort((a, b) => a.localeCompare(b));
      let grandTotal = 0;
      const bodyRows = [];
      const sourceTotals = new Map();
      deptNames.forEach((dept) => {
        const override = HISTORICAL_MACHINERY_SOURCE_OVERRIDES.get(normalizeDeptName(dept));
        const fund = (override && override.fund) || historicalMachineryFundForDept(dept);
        const source = (override && override.source) ||
          revenueSourceLabel(largestRevenueSourceForDepartment(dept, "")) || "Not identified";
        byDept.get(dept).forEach((row) => {
          grandTotal += row.amount;
          const key = fund + " " + source;
          const entry = sourceTotals.get(key) || { fund, source, amount: 0 };
          entry.amount += row.amount;
          sourceTotals.set(key, entry);
          bodyRows.push(
            "<tr><td>" + escapeHtml(dept) + "</td><td>" + (row.item ? escapeHtml(row.item) : "&mdash;") +
            "</td><td>" + escapeHtml(source) + '</td><td class="wc-num">' + formatCurrency(row.amount) + "</td></tr>"
          );
        });
      });
      bodyRows.push('<tr class="wc-table-total-row"><td colspan="3">Total</td><td class="wc-num">' + formatCurrency(grandTotal) + "</td></tr>");

      const sourceRows = Array.from(sourceTotals.values())
        .sort((a, b) => {
          if (a.fund !== b.fund) {
            const aGeneral = /^general fund$/i.test(a.fund);
            const bGeneral = /^general fund$/i.test(b.fund);
            if (aGeneral !== bGeneral) return aGeneral ? -1 : 1;
            return a.fund.localeCompare(b.fund);
          }
          return b.amount - a.amount;
        })
        .map((entry) =>
          "<tr><td>" + (entry.fund ? escapeHtml(entry.fund) : "&mdash;") + "</td><td>" + escapeHtml(entry.source) + '</td><td class="wc-num">' +
          (grandTotal ? ((entry.amount / grandTotal) * 100).toFixed(1) : "0.0") + '%</td><td class="wc-num">' +
          formatCurrency(entry.amount) + "</td></tr>"
        );
      sourceRows.push('<tr class="wc-table-total-row"><td colspan="2">Total</td><td class="wc-num"></td><td class="wc-num">' + formatCurrency(grandTotal) + "</td></tr>");

      container.innerHTML =
        renderTable({
          caption: "Funding by Revenue Source",
          columns: [{ label: "Fund" }, { label: "Revenue Source" }, { label: "Share", num: true }, { label: "Amount", num: true }],
          bodyRows: sourceRows
        }) +
        renderTable({
          caption: yearLabel + " Machinery, Vehicles & Equipment",
          columns: [{ label: "Department" }, { label: "Item" }, { label: "Revenue Source" }, { label: "Amount", num: true }],
          bodyRows: bodyRows
        });
    });
  }

  function initMachinerySummaryPage() {
    const container = document.getElementById("machinery-summary");
    if (!container) return;

    container.innerHTML = '<div class="wc-data-loading">' + LOADING_MESSAGE_HTML + "</div>";

    loadBudgetData()
      .then((data) => {
        if (Object.keys(data.errors || {}).length >= data.datasetCount) {
          container.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
          return;
        }
        renderMachinerySummary(container);
      })
      .catch((err) => {
        console.error("WCBudgetData: failed to load machinery summary", err);
        container.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
      });
  }

  // Summary of Contractual Services: same department-picker pattern as the
  // machinery summary above, just backed by cache.contractualServices
  // (Object_Code 531000 Professional Services + 534000 Other Services).
  function renderContractualServicesSummary(container) {
    if (!container) return;
    const rows = cache.contractualServices || [];
    if (!rows.length) {
      container.innerHTML = '<div class="wc-data-empty">No contractual services data is available.</div>';
      return;
    }

    const departments = uniqueSorted(rows.map((r) => r.Dept_Name));
    const ALL_DEPARTMENTS_VALUE = "__ALL__";

    container.innerHTML =
      '<div class="wc-filter-bar wc-machinery-picker">' +
      filterComboFieldHtml({
        idPrefix: "wcContractualServicesDept",
        label: "Department",
        options: departments,
        allValue: ALL_DEPARTMENTS_VALUE,
        allLabel: "All Departments",
        initialLabel: "Select a department…"
      }) +
      "</div>" +
      '<div class="wc-financial-summary-table"></div>';

    const tableEl = container.querySelector(".wc-financial-summary-table");
    let selectedDept = "";

    function showFiltered() {
      const selected = selectedDept;
      if (!selected) {
        tableEl.hidden = false;
        tableEl.innerHTML = '<div class="wc-data-empty">Select a department above to view the schedule.</div>';
        return;
      }
      const deptName = selected === ALL_DEPARTMENTS_VALUE ? "" : selected;
      const items = rows.filter((r) => !deptName || r.Dept_Name === deptName);
      const showDeptColumn = !deptName;
      // Department?, Service -- then the FY 2027 numeric column, then
      // Contract Status, Vendor, Contract No., Link.
      const leadingCols = showDeptColumn ? 2 : 1;
      const trailingCols = 4;
      const colCount = leadingCols + 1 + trailingCols;

      // Capital Projects Fund is where CIP procurement rows land -- push it
      // to the end so the fund groups people expect to reconcile against
      // (department operating funds) come first.
      const funds = uniqueSorted(items.map((r) => r.Fund_Name)).sort((a, b) => {
        const aCap = a === "Capital Projects Fund";
        const bCap = b === "Capital Projects Fund";
        if (aCap === bCap) return 0;
        return aCap ? 1 : -1;
      });
      const bodyRows = [];

      funds.forEach((fundName) => {
        const fundItems = items
          .filter((r) => r.Fund_Name === fundName)
          .slice()
          .sort((a, b) => String(a.Dept_Name || "").localeCompare(String(b.Dept_Name || "")));
        if (!fundItems.length) return;

        bodyRows.push('<tr class="wc-table-group-row"><td colspan="' + colCount + '">' + escapeHtml(fundName) + "</td></tr>");

        let fundAmount = 0;
        fundItems.forEach((r) => {
          fundAmount += r.Amount || 0;
          bodyRows.push(
            "<tr>" +
            (showDeptColumn ? "<td>" + escapeHtml(r.Dept_Name || "") + "</td>" : "") +
            "<td>" + escapeHtml(r.Item_Description || "") + "</td>" +
            '<td class="wc-num">' + formatCurrency(r.Amount || 0) + "</td>" +
            "<td>" + escapeHtml(r.Contract_Status || "") + "</td>" +
            "<td>" + escapeHtml(r.Vendor || "") + "</td>" +
            "<td>" + escapeHtml(r.Contract_No || "") + "</td>" +
            "<td>" + (r.Contract_Link ? '<a href="' + escapeHtml(r.Contract_Link) + '" target="_blank" rel="noopener">Link</a>' : "") + "</td></tr>"
          );
        });
        bodyRows.push(
          '<tr class="wc-table-subtotal-row"><td colspan="' + leadingCols + '">Subtotal — ' + escapeHtml(fundName) +
          '</td><td class="wc-num">' + formatCurrency(fundAmount) +
          '</td><td colspan="' + trailingCols + '"></td></tr>'
        );
      });

      const columns = (showDeptColumn ? [{ label: "Department" }] : [])
        .concat([
          { label: "Service" },
          { label: "FY 2027", num: true },
          { label: "Procurement / Contract Status" },
          { label: "Current Service Provider" },
          { label: "Contract No." },
          { label: "Document Link" }
        ]);

      mountOrHide(
        tableEl,
        renderTable({
          caption: deptName || "All Departments",
          columns: columns,
          bodyRows: bodyRows
        })
      );
      if (!items.length) {
        tableEl.hidden = false;
        tableEl.innerHTML = '<div class="wc-data-empty">No rows match the current filters.</div>';
      }
    }

    setupFilterCombo({
      input: container.querySelector("#wcContractualServicesDeptInput"),
      results: container.querySelector("#wcContractualServicesDeptResults"),
      options: departments,
      allValue: ALL_DEPARTMENTS_VALUE,
      allLabel: "All Departments",
      labelForValue: (v) => (v === ALL_DEPARTMENTS_VALUE ? "All Departments" : v || "Select a department…"),
      getCurrentValue: () => selectedDept,
      onSelect: (value) => {
        selectedDept = value;
        showFiltered();
      }
    });
    showFiltered();
  }

  // Capital Improvement Plan projects are folded into the same schedule as
  // renderContractualServicesSummary's awarded-vendor rows -- each FY2027-
  // funded CIP project becomes a row for its own "Capital Improvement Plan"
  // fund group, flagged as a future/unawarded procurement (no vendor/contract
  // number yet, since these haven't been procured). A single generic label is
  // used instead of naming every service type (engineering, design, CEI,
  // construction) -- not every project needs all of them, and some are
  // designed in-house rather than contracted, so listing them all per row
  // would overstate what's actually being procured for a given project.
  const CIP_PROCUREMENT_SCOPE = "Capital Project Services (as applicable)";

  // Matches a CIP project's raw "Budget Fund(s)" text to the same Fund_Name
  // string used by the awarded-vendor rows (cache.funds), so a project falls
  // into -- and subtotals with -- its actual fund rather than a synthetic
  // "Capital Improvement Plan" bucket.
  function fundNameForCipProject(project) {
    const raw = String(project.funding || "").trim();
    if (!raw) return "Capital Improvement Plan";
    const match = (cache.funds || []).find((f) => String(f.Fund_Name || "").trim().toLowerCase() === raw.toLowerCase());
    return match ? match.Fund_Name : raw;
  }

  function buildCipContractualServiceRows() {
    return (window.wcCipProjects || [])
      // Sheriff CIP projects are excluded, same as the awarded-vendor rows
      // above -- this page doesn't cover Constitutional Officer contracts.
      .filter((project) => project.department !== "Sheriff")
      // Legacy placeholder rows exist solely to carry an in-house
      // engineering dollar amount -- they're not a real capital project and
      // don't belong on a contractual services page.
      .filter((project) => !project.is_legacy_in_house_engineering_row)
      // US 331 Bridge Lighting is a state (FDOT) project, not a County
      // contracted service.
      .filter((project) => project.title !== "US 331 Bridge Lighting")
      // Grant-funded projects are excluded -- their procurement/vendor
      // requirements are driven by the granting agency, not this page's
      // Board-managed contractual services.
      .filter((project) => String(project.funding || "").trim().toLowerCase() !== "grant funded")
      .map((project) => ({
        project: project,
        fy2027: (project.funding_by_year || []).find((item) => item.year === "FY2027")
      }))
      .filter((entry) => entry.fy2027 && entry.fy2027.amount_value)
      .map(({ project, fy2027 }) => {
        // Net out the portion of the project done by County staff
        // in-house -- that work isn't a contracted service, so it
        // shouldn't count toward the amount shown here even when the rest
        // of the project (design, CEI, construction) is contracted out.
        const inHouseValue = project.has_in_house_engineering ? project.in_house_engineering_value : 0;
        const amount = Math.max(0, fy2027.amount_value - inHouseValue);
        return {
          project: project,
          amount: amount
        };
      })
      .filter((entry) => entry.amount)
      .map(({ project, amount }) => ({
        Dept_Name: tourismDeptLabel(project.department, fundNameForCipProject(project)),
        Fund_Name: fundNameForCipProject(project),
        Item_Description: project.title + " — " + CIP_PROCUREMENT_SCOPE,
        Vendor: "",
        Contract_No: "N/A",
        Budget2026: 0,
        Amount: amount,
        Contract_Status: "New Procurement"
      }));
  }

  function initContractualServicesSummaryPage() {
    const container = document.getElementById("contractual-services-summary");
    if (!container) return;

    container.innerHTML = '<div class="wc-data-loading">' + LOADING_MESSAGE_HTML + "</div>";

    Promise.all([loadBudgetData(), window.wcCipProjectsReady || Promise.resolve([])])
      .then(([data]) => {
        if (Object.keys(data.errors || {}).length >= data.datasetCount) {
          container.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
          return;
        }
        cache.contractualServices = (cache.contractualServices || []).concat(buildCipContractualServiceRows());
        renderContractualServicesSummary(container);
      })
      .catch((err) => {
        console.error("WCBudgetData: failed to load contractual services summary", err);
        container.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
      });
  }

  // Summary of Personnel: same department-picker pattern as the machinery
  // summary. "All" shows each department's total FTE per year; selecting
  // one department drills into its position-level staffing table.
  function fundNameForRow(row) {
    const code = fundCodeForRow(row);
    const fund = (cache.funds || []).find((f) => f.Fund_Code === code);
    return fund ? fund.Fund_Name : "Constitutional Offices";
  }

  // Engineering moved from the General Fund to the Transportation Fund
  // starting FY2027 (see DEPT_CODE_ACTUALS_ALIASES' comment above) -- the
  // budget figures reflect that via a brand new FY2027 Dept_Code
  // (10116002, naturally fund 101) while the legacy code (00120000, fund
  // 001) keeps holding its real FY2020-FY2026 history. The staffing sheet
  // has no such split: every position is still booked under the one
  // legacy 00120000 row regardless of year, so without this override its
  // FY2027 headcount would land on the General Fund's own Personnel
  // callout/filter instead of Transportation's. Scoped to
  // personnelFundLabelForRow specifically (not fundNameForRow itself,
  // which Summary of Interfund Transfers also uses for expenditure/
  // revenue rows where this Dept_Code has no special meaning).
  function fundNameForStaffingRow(row) {
    if (String((row && row.Dept_Code) || "").trim() === "00120000") return "Transportation Fund";
    return fundNameForRow(row);
  }

  // Summary of Personnel's "at a glance" FTE callouts: the constitutional
  // officers whose own staffing rows carry no Dept_Code (so they'd
  // otherwise get lumped into one undifferentiated catch-all) broken out
  // individually, then one callout per actual fund for every other row --
  // grouped dynamically by fundNameForRow rather than a fixed list, so
  // nothing ends up unbroken-out in a generic "All Remaining" bucket.
  // Board of County Commissioners and Circuit Court are General Fund
  // departments (confirmed by their expenditure rows) but get their own
  // named callouts here too, same as the constitutional officers, rather
  // than folding into the General Fund (Board Departments) card -- their
  // own staffing rows carry the same blank Dept_Code the officers' do, so
  // without a named group they'd otherwise have nowhere distinct to land.
  const PERSONNEL_NAMED_CALLOUT_GROUPS = [
    { label: "Board of County Commissioners", filterLabel: "General Fund (Board of County Commissioners)", match: (r) => normalizeDeptName(r.Dept_Name) === "board of county commissioners" },
    { label: "Circuit Court", filterLabel: "General Fund (Circuit Court)", match: (r) => normalizeDeptName(r.Dept_Name) === "circuit court" },
    { label: "Clerk of Court", filterLabel: "General Fund (Clerk of Court)", match: (r) => normalizeDeptName(r.Dept_Name) === "clerk of circuit court" },
    { label: "Tax Collector", filterLabel: "General Fund (Tax Collector)", match: (r) => normalizeDeptName(r.Dept_Name) === "tax collector" },
    { label: "Property Appraiser", filterLabel: "General Fund (Property Appraiser)", match: (r) => normalizeDeptName(r.Dept_Name) === "property appraiser" },
    { label: "Supervisor of Elections", filterLabel: "General Fund (Supervisor of Elections)", match: (r) => normalizeDeptName(r.Dept_Name) === "supervisor of elections" },
    { label: "Sheriff Fund", filterLabel: "Sheriff Fund", match: (r) => normalizeDeptName(r.Dept_Name) === "sheriff" }
  ];

  // Buckets every budgeted position into a functional area based on its
  // title, so a department's staffing can be read as "how many of these
  // people manage, how many do admin/office work, how many are in the
  // field" instead of just a flat position list. Position_Name is the only
  // signal available (there's no separate job-classification field in the
  // staffing sheet), so this is necessarily title-keyword matching, not an
  // authoritative HR classification -- good enough to answer "where" the
  // department's staff sit functionally, not precise enough to be quoted
  // as an official position-classification study.
  //
  // Rule order matters: checked top to bottom, first match wins. Domain-
  // specific buckets (Building/Permitting, Field & Maintenance) are checked
  // before the generic Management/Admin catch-alls, so e.g. "Building
  // Plans Review Manager" or "Solid Waste Operations Manager" land in the
  // domain bucket their title is actually about rather than a generic
  // "Manager" one.
  const PERSONNEL_FUNCTIONAL_AREAS = [
    {
      area: "Executive & Department Leadership",
      test: (t) =>
        /\bdirector\b/.test(t) ||
        /county administrator|county attorney|county engineer|county surveyor/.test(t) ||
        /^(sheriff|property appraiser|tax collector|supervisor of elections|clerk of circuit court|county commissioner)$/.test(t) ||
        /^(public works director|budget director|tourism director|chief financial officer|executive director)$/.test(t)
    },
    {
      area: "Building, Permitting & Inspections",
      test: (t) => /building|plans review|plans reviewer|permit|\binspector\b|code compliance/.test(t)
    },
    {
      area: "Administrative & Office Support",
      test: (t) =>
        /administrat|receptionist|office manager|executive assistant|paralegal|records (technician|coordinator|management)|customer service|hris|benefits coordinator|clerk\b|human resources|accounting/.test(t)
    },
    {
      area: "Field Supervision & Crew Leadership",
      test: (t) => /foreman|crew leader|shift supervisor|work squad supervisor|operations manager|operations support/.test(t)
    },
    {
      area: "Field, Trades & Maintenance",
      test: (t) =>
        /technician|operator|custodian|electrician|mechanic|equipment|maintenance|landscape|golf course (attendant|cook|server|grounds)|beach (steward|tram|maintenance)|mosquito control|sign shop|paint |asphalt|road maint|solid waste|recycling|sewer|fabricator|flagger|survey party chief/.test(t)
    },
    {
      area: "Professional & Technical Services",
      test: (t) =>
        /planner|planning (assistant|coordinator|support|technician)|engineer|analyst|scientist|specialist|coordinator|\bgis\b|information technology|\bit\b|systems administrator|network administrator|grants|environmental|emergency management|extension agent|extension clerk|probation|veterans|public information|graphic designer|marketing|sales manager|sales specialist|attorney/.test(t)
    },
    {
      // Catches division/program-level "Manager"/"Supervisor"/"Superintendent"
      // titles that aren't tied to one of the domain buckets above (e.g.
      // Fleet Manager, Procurement Manager, Human Resources Supervisor) --
      // real leadership roles, distinct from the General Support fallback,
      // just not a department's top executive.
      area: "Program & Division Management",
      test: (t) => /\bmanager\b|\bsupervisor\b|\bsuperintendent\b/.test(t)
    }
  ];
  const PERSONNEL_FUNCTIONAL_AREA_FALLBACK = "General Support";

  function personnelFunctionalAreaForPosition(positionName) {
    const t = String(positionName || "").trim().toLowerCase();
    if (!t) return PERSONNEL_FUNCTIONAL_AREA_FALLBACK;
    const match = PERSONNEL_FUNCTIONAL_AREAS.find((group) => group.test(t));
    return match ? match.area : PERSONNEL_FUNCTIONAL_AREA_FALLBACK;
  }

  // Code Compliance's two sub-programs read fine as their own staffing
  // cards on the department's own page (see renderStaffingTable), but on
  // the Summary of Personnel all-departments schedule they should roll up
  // into one "Code Compliance" line instead of splitting across two rows.
  function personnelDeptDisplayName(deptName) {
    const norm = normalizeDeptName(deptName);
    if (norm === "code compliance beach" || norm === "code compliance street") return "Code Compliance";
    if (norm === "tourism beach operations" || norm === "tourism beach tram") return "Tourism Beach Operations";
    return deptName;
  }

  // Where a "largest staffing department" card on the Personnel Explorer
  // sends the user -- that department/office's own budget page, anchored to
  // its staffing table, the same page Departments/Constitutional Officers
  // link to it elsewhere on the site. Keyed by normalizeDeptName so it
  // matches regardless of which staffing-sheet spelling produced the card.
  // Not every department has been given its own page yet; anything missing
  // here falls back to the Departments directory.
  const PERSONNEL_DEPT_PAGE_HREF = new Map([
    ["board of county commissioners", "board-of-county-commissioners.html"],
    ["building construction and maintenance", "building-construction-and-maintenance.html"],
    ["building department", "building-department.html"],
    ["circuit court", "circuit-court.html"],
    ["clerk of circuit court", "clerk-of-courts-and-county-comptroller.html"],
    ["code compliance", "code-compliance.html"],
    ["county administration", "county-administration.html"],
    ["eagle springs golf and recreation center", "eagle-springs-golf-and-recreation-center.html"],
    ["eagle springs grill", "eagle-springs-grill.html"],
    ["emergency management", "emergency-management.html"],
    ["engineering department", "engineering-department.html"],
    ["environmental resources", "environmental-resources.html"],
    ["extension office", "extension-office.html"],
    ["geographic info systems", "geographic-info-systems.html"],
    ["housing and urban development", "housing-and-urban-development.html"],
    ["human resources", "human-resources.html"],
    ["mosquito control", "mosquito-control.html"],
    ["mossy head wastewater treatment facility", "mossy-head-wastewater-treatment-facility.html"],
    ["office of management and budget", "office-of-management-and-budget.html"],
    ["office of the county attorney", "office-of-the-county-attorney.html"],
    ["planning", "planning.html"],
    ["probation", "probation.html"],
    ["property appraiser", "property-appraiser.html"],
    ["public works", "public-works.html"],
    ["purchasing", "purchasing.html"],
    ["recreation", "recreation.html"],
    ["sheriff", "sheriffs-office.html"],
    ["soil conservation", "soil-conservation.html"],
    ["solid waste", "solid-waste.html"],
    ["supervisor of elections", "supervisor-of-elections.html"],
    ["tax collector", "tax-collector.html"],
    ["tourism administration", "tourism-administration.html"],
    ["tourism beach operations", "tourism-beach-operations.html"],
    ["tourism communications", "tourism-administration.html"],
    ["tourism marketing", "tourism-administration.html"],
    ["tourism sales and visitors center", "tourism-administration.html"],
    ["veteran services", "veteran-services.html"]
  ]);
  function personnelDeptPageHref(deptDisplayName) {
    const href = PERSONNEL_DEPT_PAGE_HREF.get(normalizeDeptName(deptDisplayName));
    return href ? href + "#department-staffing-table" : "departments.html";
  }

  // One label per staffing row -- the single source of truth for both the
  // callout cards above and the page's own "Fund" filter dropdown, so every
  // callout card corresponds to exactly one selectable filter option (and
  // vice versa) instead of the two drifting apart.
  function personnelFundLabelForRow(row) {
    const group = PERSONNEL_NAMED_CALLOUT_GROUPS.find((g) => g.match(row));
    if (group) return group.label;
    const fundName = fundNameForStaffingRow(row);
    // Board of County Commissioners and Circuit Court (named groups above)
    // already cover the General Fund's non-department rows, so the plain
    // "General Fund" fund-name match here is exclusively the rest of the
    // Board Departments -- relabeled to match departments.html's own
    // "General Fund (Board Departments)" card.
    return fundName === "General Fund" ? "General Fund (Board Departments)" : fundName;
  }

  function personnelFundFilterLabelForRow(row) {
    const group = PERSONNEL_NAMED_CALLOUT_GROUPS.find((g) => g.match(row));
    if (group) return group.filterLabel;
    const fundName = fundNameForStaffingRow(row);
    return fundName === "General Fund" ? "General Fund (Board Departments)" : fundName;
  }

  // The Summary of Personnel all-departments table's per-department
  // "View Positions" detail -- same hidden-detail-div + delegated
  // .wc-view-budget-lines-toggle click handling already used for "View
  // Budget Lines"/"View Position Detail" elsewhere (see
  // openBudgetDetailModal), just scoped to one department's own position
  // list instead of a department page's own staffing card.
  function personnelDeptDetailHtml(deptRows, deptName) {
    budgetLinesDetailCounter += 1;
    const detailId = "wc-personnel-dept-detail-" + budgetLinesDetailCounter;
    const years = [2024, 2025, 2026, 2027];
    const priorYears = years.filter((y) => y < 2027);
    const showPriorLocal = getShowPriorYears();
    // Departments merged into one display name for this view (e.g. Code
    // Compliance Street/Beach, both shown as just "Code Compliance") often
    // share the exact same position title across their sub-programs --
    // grouped here by title, summing FTE, so "Office Manager" or "Code
    // Compliance Manager" shows as one row instead of once per sub-program.
    const positionsByName = new Map();
    deptRows.forEach((r) => {
      const name = (r.Position_Name || "").trim();
      if (!positionsByName.has(name)) {
        const entry = { Position_Name: name };
        years.forEach((y) => { entry[y] = 0; });
        positionsByName.set(name, entry);
      }
      const entry = positionsByName.get(name);
      years.forEach((y) => { entry[y] += r[y] || 0; });
    });
    const sortedPositions = Array.from(positionsByName.values())
      .sort((a, b) => (a.Position_Name || "").localeCompare(b.Position_Name || ""));
    const totals = { 2024: 0, 2025: 0, 2026: 0, 2027: 0 };
    const bodyRows = sortedPositions.map((r) => {
      years.forEach((y) => { totals[y] += r[y] || 0; });
      const rowClass = (r[2027] || 0) === 0 ? ' class="wc-staffing-zero-current"' : "";
      const delta = (r[2027] || 0) - (r[2026] || 0);
      const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
      const tone = delta > 0 ? "is-increase" : delta < 0 ? "is-decrease" : "";
      return (
        "<tr" + rowClass + "><td>" + escapeHtml(r.Position_Name || "") + "</td>" +
        years.map((y) => {
          const classes = ["wc-num"].concat(y < 2027 ? ["wc-prior-year"] : []);
          return '<td class="' + classes.join(" ") + '">' + formatNumber(r[y] || 0) + "</td>";
        }).join("") +
        '<td class="wc-num ' + tone + '">' + sign + formatNumber(Math.abs(delta)) + "</td>" +
        "</tr>"
      );
    });
    const totalDelta = totals[2027] - totals[2026];
    const totalSign = totalDelta > 0 ? "+" : totalDelta < 0 ? "−" : "";
    const totalTone = totalDelta > 0 ? "is-increase" : totalDelta < 0 ? "is-decrease" : "";
    bodyRows.push(
      '<tr class="wc-table-total-row"><td>Total FTE</td>' +
      years.map((y) => {
        const classes = ["wc-num"].concat(y < 2027 ? ["wc-prior-year"] : []);
        return '<td class="' + classes.join(" ") + '">' + formatNumber(totals[y]) + "</td>";
      }).join("") +
      '<td class="wc-num ' + totalTone + '">' + totalSign + formatNumber(Math.abs(totalDelta)) + "</td>" +
      "</tr>"
    );
    // FY 2027 FTE grouped by functional area (see
    // personnelFunctionalAreaForPosition) -- title-keyword based, not an
    // official classification, but enough to show whether a department's
    // staff sit mostly in the field, in management, or in office/admin
    // roles, alongside the full position list below.
    const fteByArea = new Map();
    sortedPositions.forEach((r) => {
      const fte2027 = r[2027] || 0;
      if (!fte2027) return;
      const area = personnelFunctionalAreaForPosition(r.Position_Name);
      fteByArea.set(area, (fteByArea.get(area) || 0) + fte2027);
    });
    const functionalAreaHtml = fteByArea.size > 1
      ? '<div class="wc-personnel-functional-areas">' +
        '<p class="wc-personnel-functional-areas-title">FY 2027 staff by functional area (based on position title):</p>' +
        '<ul class="wc-personnel-functional-area-list">' +
        Array.from(fteByArea.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([area, fte]) => "<li><strong>" + formatNumber(fte) + "</strong><span>" + escapeHtml(area) + "</span></li>")
          .join("") +
        "</ul></div>"
      : "";
    const detailHtml =
      // wc-finance-card + data-print-title reuse the same print-only
      // "::before shows the department name as a heading" treatment the
      // staffing cards get elsewhere (see .wc-finance-card::before in
      // budget-pdf.js) -- needed here because in print this panel is
      // force-shown (see .wc-budget-lines-detail[hidden] print rule) with
      // its rollup table and toggle button both hidden, so without this
      // the department name (currently only on that hidden toggle button)
      // would be lost entirely.
      '<div class="wc-budget-lines-detail wc-budget-lines-card wc-finance-card' + (showPriorLocal ? " show-prior-years" : "") + '" data-print-title="' + escapeHtml(deptName || "") + '" id="' + detailId + '" hidden>' +
        priorYearsToggleHtml(showPriorLocal, "wc-budget-lines-detail-header") +
        functionalAreaHtml +
        '<div class="wc-data-table-scroll">' +
        '<table class="wc-data-table wc-staffing-table">' +
        "<thead><tr><th>Position Name</th>" +
        priorYears.map((y) => '<th class="wc-num wc-prior-year">FY ' + y + "</th>").join("") +
        '<th class="wc-num">FY 2027</th>' +
        '<th class="wc-num">+/−</th>' +
        "</tr></thead><tbody>" + bodyRows.join("") + "</tbody></table></div>" +
      "</div>";
    return { detailId, detailHtml };
  }

  // Shared by the Summary of Personnel page's own callout row and the
  // Financials directory's "Summary of Personnel" link card (see
  // financials.html), so both stay in sync with one grouping definition.
  // Sorted largest to smallest so the biggest funds/offices read first.
  function getPersonnelFundCallouts(rows) {
    const totalsByFilterLabel = new Map();
    rows.forEach((r) => {
      const label = personnelFundLabelForRow(r);
      const filterLabel = personnelFundFilterLabelForRow(r);
      if (!totalsByFilterLabel.has(filterLabel)) {
        totalsByFilterLabel.set(filterLabel, { label, filterLabel, total: 0, totalPrior: 0 });
      }
      const entry = totalsByFilterLabel.get(filterLabel);
      entry.total += Number(r[2027]) || 0;
      entry.totalPrior += Number(r[2026]) || 0;
    });
    const callouts = Array.from(totalsByFilterLabel.values());
    return callouts.sort((a, b) => b.total - a.total);
  }

  function renderPersonnelSummary(container, notesContainer) {
    if (!container) return;
    const rows = cache.staffing || [];
    if (!rows.length) {
      container.innerHTML = '<div class="wc-data-empty">No personnel data is available.</div>';
      return;
    }

    const departments = uniqueSorted(rows.map((r) => r.Dept_Name));
    // Matches the callout cards above one-for-one -- see
    const fundFilterNames = uniqueSorted(rows.map((r) => personnelFundFilterLabelForRow(r)));
    const years = [2024, 2025, 2026, 2027];

    container.innerHTML =
      '<div class="wc-filter-bar wc-machinery-picker">' +
      filterComboFieldHtml({ idPrefix: "wcPersonnelDept", label: "Department", options: departments }) +
      filterComboFieldHtml({ idPrefix: "wcPersonnelFund", label: "Fund", options: fundFilterNames }) +
      '<button type="button" class="wc-view-budget-lines-toggle" id="wcPersonnelSortToggle" aria-pressed="false">Sort: Largest to Smallest</button>' +
      '<button type="button" class="wc-view-budget-lines-toggle" id="wcPersonnelResetFilters">Reset</button>' +
      "</div>" +
      '<p class="wc-personnel-table-hint">Click on a department name to view individual position detail.</p>' +
      '<div class="wc-financial-summary-table"></div>';

    const sortToggle = container.querySelector("#wcPersonnelSortToggle");
    const resetButton = container.querySelector("#wcPersonnelResetFilters");
    const tableEl = container.querySelector(".wc-financial-summary-table");
    let sortByFte = false;
    let selectedDept = "";
    let selectedFund = "";

    function applyFilters() {
      const deptName = selectedDept;
      const fundName = selectedFund;
      const filtered = rows.filter((r) =>
        (!deptName || r.Dept_Name === deptName) && (!fundName || personnelFundFilterLabelForRow(r) === fundName)
      );

      if (!filtered.length) {
        tableEl.hidden = false;
        tableEl.innerHTML = '<div class="wc-data-empty">No positions match the current filters.</div>';
        mountOrHide(notesContainer, "");
        return;
      }

      if (deptName) {
        mountOrHide(tableEl, renderStaffingPlainTable(filtered));
        mountOrHide(notesContainer, buildPersonnelSummaryFteNotes(filtered));
        return;
      }

      const totalsByDept = new Map();
      const rowsByDept = new Map();
      filtered.forEach((r) => {
        // Code Compliance's two sub-programs (Code Compliance Beach/Street)
        // are shown as their own staffing cards on the department's own
        // page, but on this all-departments schedule they should read as
        // one "Code Compliance" line rather than split across two rows.
        const name = personnelDeptDisplayName(r.Dept_Name);
        if (!totalsByDept.has(name)) {
          totalsByDept.set(name, { 2024: 0, 2025: 0, 2026: 0, 2027: 0 });
          rowsByDept.set(name, []);
        }
        const t = totalsByDept.get(name);
        years.forEach((y) => { t[y] += r[y] || 0; });
        rowsByDept.get(name).push(r);
      });
      const deptsInView = sortByFte
        ? Array.from(totalsByDept.keys()).sort((a, b) => totalsByDept.get(b)[2027] - totalsByDept.get(a)[2027])
        : uniqueSorted(Array.from(totalsByDept.keys()));
      const grand = { 2024: 0, 2025: 0, 2026: 0, 2027: 0 };
      totalsByDept.forEach((t) => years.forEach((y) => { grand[y] += t[y]; }));

      // Each department name is a "View Positions" toggle, opening the
      // same budget-detail modal used for "View Budget Lines" elsewhere
      // (see openBudgetDetailModal) with that department's own position
      // list instead of leaving users stuck at the department-level total.
      // FY 2026 -> FY 2027 change, the two years this budget actually
      // compares -- signed so a department that grew and one that shrank
      // are visually distinct at a glance, without opening its detail row.
      function fteChangeCell(before, after) {
        const delta = after - before;
        const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
        const tone = delta > 0 ? "is-increase" : delta < 0 ? "is-decrease" : "";
        return '<td class="wc-num ' + tone + '">' + sign + formatNumber(Math.abs(delta)) + "</td>";
      }

      const detailMarkup = [];
      const bodyRows = deptsInView.map((d) => {
        const t = totalsByDept.get(d);
        const { detailId, detailHtml } = personnelDeptDetailHtml(rowsByDept.get(d), d);
        detailMarkup.push(detailHtml);
        return (
          "<tr><td>" +
          '<button type="button" class="wc-view-budget-lines-toggle wc-table-row-link" data-target="' + detailId + '" data-closed-label="' + escapeHtml(d) + '" aria-expanded="false">' +
          escapeHtml(d) + "</button>" +
          "</td>" +
          years.map((y) => '<td class="wc-num">' + formatNumber(t[y]) + "</td>").join("") +
          fteChangeCell(t[2026], t[2027]) +
          "</tr>"
        );
      });
      bodyRows.push(
        '<tr class="wc-table-total-row"><td>Total FTE</td>' +
        years.map((y) => '<td class="wc-num">' + formatNumber(grand[y]) + "</td>").join("") +
        fteChangeCell(grand[2026], grand[2027]) +
        "</tr>"
      );

      mountOrHide(
        tableEl,
        renderTable({
          caption: fundName || "All Departments",
          columns: [{ label: "Department" }].concat(years.map((y) => ({ label: "FY " + y, num: true }))).concat([{ label: "+/-", num: true }]),
          bodyRows: bodyRows
        }) + detailMarkup.join("")
      );
      mountOrHide(notesContainer, buildPersonnelSummaryFteNotes(filtered));
    }

    const deptCombo = setupFilterCombo({
      input: container.querySelector("#wcPersonnelDeptInput"),
      results: container.querySelector("#wcPersonnelDeptResults"),
      options: departments,
      getCurrentValue: () => selectedDept,
      onSelect: (value) => {
        selectedDept = value;
        if (value) {
          selectedFund = "";
          fundCombo.setValue("");
        }
        applyFilters();
      }
    });
    const fundCombo = setupFilterCombo({
      input: container.querySelector("#wcPersonnelFundInput"),
      results: container.querySelector("#wcPersonnelFundResults"),
      options: fundFilterNames,
      getCurrentValue: () => selectedFund,
      onSelect: (value) => {
        selectedFund = value;
        if (value) {
          selectedDept = "";
          deptCombo.setValue("");
        }
        applyFilters();
      }
    });
    document.addEventListener("wc-personnel-explore-dept", (event) => {
      const department = event.detail && event.detail.department;
      if (!department || !departments.includes(department)) return;
      selectedDept = department;
      deptCombo.setValue(department);
      selectedFund = "";
      fundCombo.setValue("");
      applyFilters();
    });

    sortToggle.addEventListener("click", () => {
      sortByFte = !sortByFte;
      sortToggle.textContent = sortByFte ? "Sort: A to Z" : "Sort: Largest to Smallest";
      sortToggle.setAttribute("aria-pressed", String(sortByFte));
      applyFilters();
    });
    resetButton.addEventListener("click", () => {
      selectedDept = "";
      deptCombo.setValue("");
      selectedFund = "";
      fundCombo.setValue("");
      applyFilters();
    });

    // Preserve direct links that arrive with a fund query parameter.
    let requestedFund = "";
    try {
      requestedFund = new URLSearchParams(window.location.search).get("fund") || "";
    } catch (e) {
      requestedFund = "";
    }
    if (requestedFund && fundFilterNames.includes(requestedFund)) {
      selectedFund = requestedFund;
      fundCombo.setValue(requestedFund);
    } else if (requestedFund) {
      const requestedCallout = getPersonnelFundCallouts(rows).find((c) => c.label === requestedFund);
      if (requestedCallout && fundFilterNames.includes(requestedCallout.filterLabel)) {
        selectedFund = requestedCallout.filterLabel;
        fundCombo.setValue(requestedCallout.filterLabel);
      }
    }

    applyFilters();
  }

  // A free-text note shown below the Summary of Personnel schedule, sourced
  // from the Narratives sheet's "Summary of Personnel Note" Dept_Name row
  // (same sheet/column used for department narratives elsewhere) rather
  // than hardcoded on the page.
  function buildPersonnelSummaryFteNotes(rows) {
    // Collect every FTE change with dept context.
    const changes = rows
      .slice()
      .sort((a, b) => (a.Position_Name || "").localeCompare(b.Position_Name || ""))
      .reduce((acc, r) => {
        const before = r[2026] || 0;
        const after = r[2027] || 0;
        const delta = after - before;
        if (Math.abs(delta) >= 1e-9) {
          acc.push({
            deptLabel: personnelDeptDisplayName(r.Dept_Name),
            deptNorm: normalizeDeptName(r.Dept_Name),
            position: r.Position_Name || "",
            delta
          });
        }
        return acc;
      }, []);

    if (!changes.length) return "";

    const used = new Set();
    const noteLines = [];

    // First pass: pair up known inter-department transfers.
    STAFFING_TRANSFERS.forEach((t) => {
      changes.forEach((reduction, i) => {
        if (used.has(i) || reduction.deptNorm !== t.from || reduction.delta >= 0) return;
        const matchIdx = changes.findIndex((increase, j) =>
          !used.has(j) &&
          increase.deptNorm === t.to &&
          increase.delta > 0 &&
          increase.position === reduction.position &&
          Math.abs(increase.delta - Math.abs(reduction.delta)) < 1e-9
        );
        if (matchIdx === -1) return;
        used.add(i);
        used.add(matchIdx);
        noteLines.push({
          kind: "transfer",
          sortKey: t.fromLabel,
          html: "Transferred " + formatNumber(Math.abs(reduction.delta)) + " FTE (" +
            escapeHtml(reduction.position) + ") from " +
            escapeHtml(t.fromLabel) + " to " + escapeHtml(t.toLabel) + " in Fiscal Year 2027."
        });
      });
    });

    // Second pass: remaining unmatched changes get the standard note.
    changes.forEach((c, i) => {
      if (used.has(i)) return;
      const verb = c.delta > 0 ? "Requested" : "Reduced";
      noteLines.push({
        kind: c.delta > 0 ? "requested" : "reduced",
        sortKey: c.deptLabel,
        html: "<strong>" + escapeHtml(c.deptLabel) + "</strong> — " +
          verb + " " + formatNumber(Math.abs(c.delta)) + " FTE (" +
          escapeHtml(c.position) + ") in Fiscal Year 2027."
      });
    });

    if (!noteLines.length) return "";
    noteLines.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    // Requested (added) FTEs are listed first, then a visual gap, then
    // reduced FTEs, then any inter-department transfers -- rather than one
    // alphabetically-sorted mixed list -- so a reader can scan "what's
    // growing" separately from "what's shrinking" instead of hunting for
    // Requested/Reduced line by line.
    const groups = ["requested", "reduced", "transfer"]
      .map((kind) => noteLines.filter((n) => n.kind === kind))
      .filter((group) => group.length);
    return (
      '<div class="wc-staffing-notes">' +
      '<p class="wc-staffing-notes-title">Staffing Notes:</p>' +
      groups.map((group) =>
        '<div class="wc-staffing-notes-group">' +
        group.map((n) => "<p>" + n.html + "</p>").join("") +
        "</div>"
      ).join("") +
      "</div>"
    );
  }

  function renderPersonnelSummaryNote() {
    const narrativeRows = cache.departmentNarratives || [];
    const row = narrativeRows.find((r) => normalizeDeptName(r.Dept_Name) === normalizeDeptName("Summary of Personnel Note"));
    if (!row || !row.Narrative || !row.Narrative.trim()) return "";
    return (
      '<section class="wc-personnel-summary-note content-section">' +
      splitIntoParagraphs(row.Narrative).map((p) => "<p>" + formatNarrativeText(p) + "</p>").join("") +
      "</section>"
    );
  }

  // Answer-first GFOA-style Q&A block for the merged Personnel Budget page
  // (Summary of Personnel + Summary of Personnel Cost combined) -- same
  // pattern and CSS classes as renderRevenueBudgetQuestions above, just
  // computed from cache.staffing (FTE) and buildPersonnelCostRows (dollar
  // cost) instead of cache.revenues. Answers, in order: how many total
  // staff are budgeted, whether personnel cost changed from prior year,
  // where staffing was increased/reduced, and what's driving the cost
  // change -- the four questions GFOA's personnel category asks.
  function renderPersonnelBudgetQuestions() {
    const container = document.getElementById("personnel-budget-questions");
    const explainedContainer = document.getElementById("personnel-explained-metrics");
    if (!container && !explainedContainer) return;
    loadBudgetData().then(() => {
      const staffingRows = cache.staffing || [];
      const totalFte2027 = staffingRows.reduce((sum, r) => sum + (Number(r[2027]) || 0), 0);
      const totalFte2026 = staffingRows.reduce((sum, r) => sum + (Number(r[2026]) || 0), 0);
      const fteChange = totalFte2027 - totalFte2026;
      const boardFte2027 = staffingRows.filter((r) => !isConstitutionalPersonnelDept(r.Dept_Name)).reduce((sum, r) => sum + (Number(r[2027]) || 0), 0);
      const constitutionalFte2027 = totalFte2027 - boardFte2027;
      const workforceTypeTotals = staffingRows.reduce((totals, row) => {
        const fte = Math.max(0, Number(row[2027]) || 0);
        const wholeFte = Math.floor(fte + 0.000001);
        totals.fullTime += wholeFte;
        totals.partTime += fte - wholeFte;
        return totals;
      }, { fullTime: 0, partTime: 0 });

      const costRows = buildPersonnelCostRows();
      const totalCost2027 = costRows.reduce((sum, r) => sum + r.Salaries + r.Retirement + r.HealthInsurance + r.OtherBenefits, 0);
      const totalCostPrior = costRows.reduce((sum, r) => sum + (r.PriorTotal || 0), 0);
      const constitutionalPersonnelCost = costRows
        .filter((r) => isConstitutionalPersonnelDept(r.Dept_Name))
        .reduce((sum, r) => sum + r.Salaries + r.Retirement + r.HealthInsurance + r.OtherBenefits, 0);
      const boardDepartmentPersonnelCost = Math.max(0, totalCost2027 - constitutionalPersonnelCost);
      const boardCostRows = costRows.filter((r) => !isConstitutionalPersonnelDept(r.Dept_Name));
      const costChange = totalCost2027 - totalCostPrior;
      const costChangePct = totalCostPrior ? (costChange / totalCostPrior) * 100 : 0;
      // Countywide FY2027 proposed expenditures across every department,
      // office, and fund -- the same source rows personnel cost itself is
      // drawn from -- so "personnel is X% of the total budget" reconciles
      // with the underlying data rather than an unrelated total pulled from
      // elsewhere. Capital project spending (a separate CIP dataset) isn't
      // included. Excludes the Self-Insurance Fund (503) and interfund
      // transfers/other financing sources, same as the Consolidated
      // Schedule's own "Total All Funds" figure -- those rows are internal
      // pass-throughs, not real county spending, and counting them would
      // understate personnel's true share of the operating budget.
      const totalCountywideBudget2027 = (cache.expenditures || [])
        .filter((r) => !CONSOLIDATED_SCHEDULE_EXCLUDED_FUND_CODES.has(fundCodeForRow(r)) && !isOtherFinancingExpenseRow(r))
        .reduce((sum, r) => sum + (Number(r.FY2027_Proposed) || 0), 0);
      const personnelShareOfBudgetPct = totalCountywideBudget2027 ? (totalCost2027 / totalCountywideBudget2027 * 100) : 0;
      const boardShareOfPersonnelPct = totalCost2027 ? (boardDepartmentPersonnelCost / totalCost2027 * 100) : 0;
      const constitutionalShareOfPersonnelPct = totalCost2027 ? (constitutionalPersonnelCost / totalCost2027 * 100) : 0;
      function compactCurrency(value) {
        if (Math.abs(value) >= 1000000) return "$" + (value / 1000000).toLocaleString("en-US", { maximumFractionDigits: 1 }) + "M";
        if (Math.abs(value) >= 1000) return "$" + Math.round(Math.abs(value) / 1000).toLocaleString("en-US") + "K";
        return formatCurrency(value);
      }

      // Department-level FTE deltas (FY2026 -> FY2027), same display-name
      // merge Summary of Personnel's own all-departments table uses (Code
      // Compliance Beach/Street -> Code Compliance), so this list of
      // increases/reductions lines up with the table below it.
      const deltaByDept = new Map();
      staffingRows.forEach((r) => {
        const name = personnelDeptDisplayName(r.Dept_Name);
        deltaByDept.set(name, (deltaByDept.get(name) || 0) + ((Number(r[2027]) || 0) - (Number(r[2026]) || 0)));
      });
      const increases = Array.from(deltaByDept.entries()).filter(([, d]) => d > 0).sort((a, b) => b[1] - a[1]);
      const decreases = Array.from(deltaByDept.entries()).filter(([, d]) => d < 0).sort((a, b) => a[1] - b[1]);

      // COLA and Health Insurance Increase, the two named drivers this site
      // already quantifies per department (see PERSONNEL_COST_COLA_RATE /
      // PERSONNEL_COST_HEALTH_INSURANCE_INCREASE_RATE) -- summed here for a
      // countywide total instead of a per-department figure.
      const totalCola = boardCostRows.reduce((sum, r) => sum + r.Salaries * (PERSONNEL_COST_COLA_RATE / (1 + PERSONNEL_COST_COLA_RATE)), 0);
      const totalHealthInsurance = boardCostRows.reduce((sum, r) => sum + r.HealthInsurance, 0);
      // Match the ledger: the Board of County Commissioners' pooled
      // retiree-health subsidy is not an active-employee premium and is
      // therefore excluded from the 5% planning increase.
      const positionCostsByDept = buildPersonnelPositionCostsByDept();
      let retireeHealthInsuranceSubsidy = 0;
      positionCostsByDept.forEach((positions) => {
        retireeHealthInsuranceSubsidy += positions.retireeHealthInsuranceSubsidy || 0;
      });
      const activeEmployeeHealthInsurance = Math.max(0, totalHealthInsurance - retireeHealthInsuranceSubsidy);
      const healthInsuranceIncrease = activeEmployeeHealthInsurance * PERSONNEL_COST_HEALTH_INSURANCE_INCREASE_RATE;


      const fteByDept = new Map();
      const fteByFunction = new Map();
      staffingRows.forEach((row) => {
        const dept = personnelDeptDisplayName(row.Dept_Name);
        const fte = Number(row[2027]) || 0;
        fteByDept.set(dept, (fteByDept.get(dept) || 0) + fte);
        const area = expenseActivityForRow(row) || "General Government";
        fteByFunction.set(area, (fteByFunction.get(area) || 0) + fte);
      });
      const largestDepartments = Array.from(fteByDept.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const largestDeptNames = new Set(largestDepartments.map((item) => item[0]));
      const allOtherFte = Array.from(fteByDept.entries()).filter((item) => !largestDeptNames.has(item[0])).reduce((sum, item) => sum + item[1], 0);
      const functionRows = Array.from(fteByFunction.entries()).sort((a, b) => b[1] - a[1]);
      // Per-department personnel cost (current + prior), keyed the same
      // alias-canonical way buildPersonnelCostFteByDept matches cost rows to
      // staffing rows, so the largest-staffing-department cards can show a
      // dollar total alongside their FTE count even where the expenditures
      // sheet spells a department differently than the staffing sheet does
      // (e.g. "Walton County Sheriff's Office" vs. "Sheriff", "Clerk of
      // Court" vs. "Clerk of Circuit Court", or Tourism's per-fund rows).
      // Mirrors buildPersonnelCostRows' own Object_Type/Object_Code
      // filtering, just grouped by department instead of department+fund.
      const deptCostMatchKey = (rawDeptName) => personnelCostFteMatchKey(rawDeptName);
      const costByDept = new Map();
      const priorCostByDept = new Map();
      (cache.expenditures || []).forEach((row) => {
        if (String(row.Object_Type || "").trim() !== "Personnel Services") return;
        const amount = row.FY2027_Proposed || 0;
        const priorAmount = personnelCostPriorYearAmount(row);
        if (!amount && !priorAmount) return;
        const code = String(row.Object_Code || "").trim();
        const isSalary = PERSONNEL_COST_SALARY_CODES.has(code);
        const isRetirement = code === PERSONNEL_COST_RETIREMENT_CODE;
        const isHealthInsurance = code === PERSONNEL_COST_HEALTH_INSURANCE_CODE;
        const isOtherBenefit = PERSONNEL_COST_OTHER_BENEFIT_CODES.has(code);
        if (!isSalary && !isRetirement && !isHealthInsurance && !isOtherBenefit) return;
        const key = deptCostMatchKey(row.Dept_Name);
        costByDept.set(key, (costByDept.get(key) || 0) + amount);
        priorCostByDept.set(key, (priorCostByDept.get(key) || 0) + priorAmount);
      });
      const largestDeptMatchKeys = new Set(largestDepartments.map((item) => deptCostMatchKey(item[0])));
      const allOtherCost = Array.from(costByDept.entries()).filter(([key]) => !largestDeptMatchKeys.has(key)).reduce((sum, [, amount]) => sum + amount, 0);
      const allOtherCostPrior = Array.from(priorCostByDept.entries()).filter(([key]) => !largestDeptMatchKeys.has(key)).reduce((sum, [, amount]) => sum + amount, 0);
      const salaryTotal = boardCostRows.reduce((sum, row) => sum + row.Salaries, 0);
      const overtimeByDept = buildPersonnelCostOvertimeByDept();
      const overtimeTotal = Array.from(overtimeByDept.entries()).filter(([dept]) => boardCostRows.some((row) => row.Dept_Name === dept)).reduce((sum, [, amount]) => sum + amount, 0);
      const retirementTotal = boardCostRows.reduce((sum, row) => sum + row.Retirement, 0);
      const retirementPriorTotal = (cache.expenditures || []).filter((row) => String(row.Object_Code || '').trim() === PERSONNEL_COST_RETIREMENT_CODE && !isConstitutionalPersonnelDept(row.Dept_Name)).reduce((sum, row) => sum + (Number(row.FY2026_Original_Budget || row.FY2026_Budget) || 0), 0);
      const retirementChangePct = retirementPriorTotal ? ((retirementTotal - retirementPriorTotal) / retirementPriorTotal * 100) : 0;
      const otherBenefitsTotal = boardCostRows.reduce((sum, row) => sum + row.OtherBenefits, 0);
      const costMix = [["Salaries & Wages", salaryTotal], ["Overtime & Weekend Pay", overtimeTotal], ["Retirement", retirementTotal], ["Health insurance", totalHealthInsurance], ["Other benefits & taxes", otherBenefitsTotal]];
      // Department-level FTE changes -- more directly useful to the Board
      // than a functional-area rollup, since each pill names the exact
      // department a reader would need to look up in the ledger.
      const deptChangePills = increases.concat(decreases).map(([dept, net]) =>
        '<span class="' + (net > 0 ? "is-increase" : "is-decrease") + '" data-personnel-explore-dept="' + escapeHtml(dept) + '"><b>' + (net > 0 ? "+" : "−") + escapeHtml(formatNumber(Math.abs(net))) + ' FTE</b>' + escapeHtml(dept) + '</span>'
      ).join("");
      const explorer = document.getElementById("personnel-explorer");
      if (explorer) {
        const deptCards = largestDepartments.concat([["All Other Departments", allOtherFte]]).map((item) => {
          const isAllOther = item[0] === "All Other Departments";
          const fte2027 = item[1];
          const fteDelta = isAllOther ? 0 : (deltaByDept.get(item[0]) || 0);
          const ftePrior = fte2027 - fteDelta;
          const fteChangePct = ftePrior ? (fteDelta / ftePrior * 100) : null;
          const cost2027 = isAllOther ? allOtherCost : (costByDept.get(deptCostMatchKey(item[0])) || 0);
          const costPrior = isAllOther ? allOtherCostPrior : (priorCostByDept.get(deptCostMatchKey(item[0])) || 0);
          const costChangeAmt = cost2027 - costPrior;
          const costChangePctDept = costPrior ? (costChangeAmt / costPrior * 100) : null;
          const shareOfPersonnel = totalCost2027 ? (cost2027 / totalCost2027 * 100) : 0;
          const costChangeHtml = '<div class="wc-revenue-comparison"><span>Compared to Prior Year</span><div><strong>' + (costChangeAmt >= 0 ? "+" : "−") + escapeHtml(compactCurrency(Math.abs(costChangeAmt))) + '</strong><em>' + (costChangePctDept === null ? "No FY 2026 base" : (costChangePctDept >= 0 ? "+" : "") + costChangePctDept.toFixed(1) + "%") + '</em></div></div>';
          const fteChangeHtml = '<div class="wc-revenue-trend"><small>FTE Change</small><b>' + (fteDelta >= 0 ? "+" : "−") + formatNumber(Math.abs(fteDelta)) + ' FTE</b></div>';
          const href = isAllOther ? "departments.html" : personnelDeptPageHref(item[0]);
          return '<a href="' + escapeHtml(href) + '"><div class="wc-revenue-card-head"><div class="wc-revenue-card-head-main"><strong>' + escapeHtml(item[0]) + '</strong><b class="wc-revenue-card-amount">' + escapeHtml(compactCurrency(cost2027)) + '</b><small class="wc-revenue-card-share">' + shareOfPersonnel.toFixed(1) + '% of personnel budget</small></div><div class="wc-revenue-card-badge-stack"><span class="wc-personnel-dept-fte-badge">' + escapeHtml(formatNumber(fte2027)) + ' FTE</span></div></div><div class="wc-revenue-snapshot-change' + (costChangeAmt < 0 ? " is-down" : "") + '">' + costChangeHtml + fteChangeHtml + '</div></a>';
        }).join("");
        explorer.innerHTML = '<section class="wc-personnel-explorer" aria-labelledby="personnel-explorer-title"><div class="wc-personnel-explorer-head"><div><span>FY 2027 workforce and cost</span><h2 id="personnel-explorer-title">Personnel Budget Explorer</h2><p>See how Walton County budgets its full-time equivalent (FTE) positions and the salaries, retirement, health insurance, and other benefits that support them &mdash; the County&rsquo;s largest budgeted cost.</p><p>Start with the largest staffing departments below, or open the Personnel Ledger to review FTE and cost by department, function, or fund.</p></div><aside class="wc-personnel-total-budget"><div class="wc-personnel-explorer-total"><span>Total budgeted personnel cost</span><strong>' + escapeHtml(formatCurrency(totalCost2027)) + '</strong><small>' + (costChange >= 0 ? "+" : "−") + escapeHtml(compactCurrency(Math.abs(costChange))) + ' (' + (costChangePct >= 0 ? "+" : "−") + Math.abs(costChangePct).toFixed(1) + '%)</small><div><button type="button" data-personnel-view="choose">View Personnel Ledger</button><a class="wc-personnel-explainer-link" href="personnel-budget-explained.html">What&rsquo;s in Personnel Cost?</a></div></div></aside></div>' +
          '<div class="wc-personnel-card-summary-row"><p class="wc-personnel-concentration-summary"><strong>' + Math.round(personnelShareOfBudgetPct) + '%</strong> of the total expenditure budget is personnel funding.</p><div class="wc-personnel-budget-split"><div><span>Board departments</span><b>' + escapeHtml(compactCurrency(boardDepartmentPersonnelCost)) + '</b><small>' + Math.round(boardShareOfPersonnelPct) + '% of personnel</small></div><div><span>Constitutional Officers</span><b>' + escapeHtml(compactCurrency(constitutionalPersonnelCost)) + '</b><small>' + Math.round(constitutionalShareOfPersonnelPct) + '% of personnel</small></div></div></div>' +
          '<div class="wc-revenue-snapshot">' + deptCards + '</div></section>';
        const personnelKicker = explorer.querySelector('.wc-personnel-explorer-head > div:first-child > span');
        if (personnelKicker && personnelKicker.textContent.trim() === 'FY 2027 workforce and cost') personnelKicker.remove();
        const personnelDescription = explorer.querySelectorAll('.wc-personnel-explorer-head > div:first-child > p')[1];
        if (personnelDescription) personnelDescription.textContent = 'FTE counts include full-time and part-time employees, with part-time hours converted to full-time equivalents. Budgeted cost is shown across Salaries & Wages (regular salaries and other salaries), Overtime & Weekend Pay, Retirement, Health Insurance, and Other Benefits & Taxes (FICA/Medicare, workers’ compensation, and unemployment compensation). Countywide totals include the personnel budgets of the Clerk of Courts, Property Appraiser, Supervisor of Elections, Tax Collector, and Sheriff’s Office.';
        const personnelChangeSummary = explorer.querySelector('.wc-personnel-explorer-total > small');
        if (personnelChangeSummary) personnelChangeSummary.classList.add(costChange > 0 ? 'is-increase' : costChange < 0 ? 'is-decrease' : 'is-neutral');
        function showPersonnelLedger(view, shouldScroll) {
          const ledger = document.getElementById("personnel-ledger");
          if (!ledger) return;
          const explorerSection = explorer.querySelector(".wc-personnel-explorer");
          if (explorerSection) explorerSection.hidden = true;
          ledger.hidden = false;
          if (shouldScroll) ledger.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        explorer.querySelectorAll("[data-personnel-view]").forEach((button) => button.addEventListener("click", () => {
          showPersonnelLedger(button.dataset.personnelView, false);
          if (button.dataset.personnelView === "board") {
            document.dispatchEvent(new CustomEvent("wc-personnel-select-scope", { detail: { scope: "board" } }));
          }
        }));
        explorer.querySelectorAll(".wc-personnel-function-list span").forEach((pill) => pill.addEventListener("click", () => {
          showPersonnelLedger("cost", false);
          document.dispatchEvent(new CustomEvent("wc-personnel-select-function", { detail: { functionName: pill.textContent.replace(/^\s*[0-9.]+\s*/, "").trim() } }));
        }));
        explorer.querySelectorAll("[data-personnel-explore-dept]").forEach((pill) => pill.addEventListener("click", () => {
          showPersonnelLedger("cost", false);
          document.dispatchEvent(new CustomEvent("wc-personnel-explore-dept", { detail: { department: pill.dataset.personnelExploreDept } }));
        }));
        document.querySelectorAll("[data-personnel-close]").forEach((button) => button.addEventListener("click", () => {
          const ledger = button.closest(".wc-personnel-ledger");
          if (ledger) ledger.hidden = true;
          const explorerSection = explorer.querySelector(".wc-personnel-explorer");
          if (explorerSection) explorerSection.hidden = false;
        }));
        if (window.location.hash === "#personnel-ledger") showPersonnelLedger("choose", true);
      }
      if (explainedContainer) {
        const snapshotIntro = document.getElementById('pq-snapshot-intro');
        if (snapshotIntro) {
          snapshotIntro.textContent = 'Walton County budgets ' + formatNumber(totalFte2027) + ' FTE for FY 2027 — ' + formatNumber(boardFte2027) + ' across Board departments and ' + formatNumber(constitutionalFte2027) + ' across Constitutional Officers. Below: staff by functional area, what’s driving cost this year, and how staffing is changing department by department.';
        }
        const maxFunctionFte = functionRows.reduce((max, item) => Math.max(max, item[1]), 0);
        const functionBarsHtml = functionRows.map((item) => '<div class="pq-bar-row"><div class="pq-bar-row-head"><span>' + escapeHtml(item[0]) + '</span><b>' + escapeHtml(formatNumber(item[1])) + ' FTE</b></div><div class="pq-bar-track"><span class="pq-bar-fill" style="width:' + (maxFunctionFte ? (item[1] / maxFunctionFte * 100).toFixed(1) : 0) + '%"></span></div></div>').join("");
        const costMixBarsHtml = costMix.map((item) => '<div class="pq-bar-row"><div class="pq-bar-row-head"><span>' + escapeHtml(item[0]) + '</span><b>' + escapeHtml(formatCurrency(item[1])) + '</b></div><div class="pq-bar-track"><span class="pq-bar-fill" style="width:' + (boardDepartmentPersonnelCost ? (item[1] / boardDepartmentPersonnelCost * 100).toFixed(1) : 0) + '%"></span></div></div>').join("");
        explainedContainer.innerHTML =
          '<div class="pq-stat-row">' +
            '<article class="pq-stat-card"><b>' + escapeHtml(formatNumber(totalFte2027)) + ' FTE</b><span>Total Budgeted Workforce</span><small>FY 2026: ' + escapeHtml(formatNumber(totalFte2026)) + ' FTE · ' + (fteChange === 0 ? "no change" : "FY 2027 " + (fteChange > 0 ? "+" : "−") + formatNumber(Math.abs(fteChange)) + " FTE") + ' · ' + escapeHtml(formatNumber(workforceTypeTotals.fullTime)) + ' full-time, ' + escapeHtml(formatNumber(workforceTypeTotals.partTime)) + ' part-time</small></article>' +
            '<article class="pq-stat-card"><b>' + escapeHtml(formatNumber(boardFte2027)) + ' FTE</b><span>Board Departments</span><small>Departments that report to the County Administrator.</small></article>' +
            '<article class="pq-stat-card"><b>' + escapeHtml(formatNumber(constitutionalFte2027)) + ' FTE</b><span>Constitutional Officers</span><small>Clerk of Courts, Property Appraiser, Supervisor of Elections, Tax Collector, and Sheriff.</small></article>' +
          '</div>' +
          '<div class="pq-bar-card"><h3>Staff by Functional Area</h3><div class="pq-bar-list">' + functionBarsHtml + '</div></div>' +
          '<div class="pq-bar-card"><h3 id="pq-cost-mix-heading">What drives Board department personnel cost?</h3><div class="pq-bar-list">' + costMixBarsHtml + '</div></div>' +
          '<div class="pq-bar-card"><h3>Workforce Turnover &amp; Hiring Outlook</h3><div class="pq-driver-grid">' +
            '<article class="pq-driver-card"><b>11.4%</b><strong>FY 2026 Turnover</strong><p>Board department voluntary turnover.</p></article>' +
            '<article class="pq-driver-card"><b>8.2%</b><strong>State Benchmark</strong><p>State and local government voluntary turnover.</p></article>' +
            '<article class="pq-driver-card"><b>125&ndash;130</b><strong>Projected Replacement Hires <span class="wc-personnel-info-badge" tabindex="0" aria-label="Hiring estimate methodology">i</span></strong><p>Estimated FY 2026 hiring need. Turnover is expected to remain near 11% into FY 2027.</p></article>' +
          '</div></div>' +
          '<div class="pq-change-card"><h3>How is staff changing?</h3><p>' + (increases.length + decreases.length) + ' department' + ((increases.length + decreases.length) === 1 ? "" : "s") + ' changing &mdash; ' + increases.length + ' increasing, ' + decreases.length + ' reducing.</p>' + (deptChangePills ? '<div class="pq-change-pills">' + deptChangePills + '</div>' : '<p>No net change by department.</p>') + '</div>';

        const hiringBadge = explainedContainer.querySelector('.wc-personnel-info-badge');
        if (hiringBadge) {
          const floatingHelp = document.createElement('div');
          floatingHelp.className = 'wc-personnel-floating-help';
          floatingHelp.textContent = 'Based on 108 separations through August 3 and about 21 projected through September 30. Planning formula: projected separations + new positions − positions not backfilled.';
          document.body.appendChild(floatingHelp);
          const showFloatingHelp = () => {
            const rect = hiringBadge.getBoundingClientRect();
            floatingHelp.style.left = Math.min(rect.left, window.innerWidth - 290) + 'px';
            floatingHelp.style.top = (rect.bottom + 8) + 'px';
            floatingHelp.classList.add('is-visible');
          };
          const hideFloatingHelp = () => floatingHelp.classList.remove('is-visible');
          hiringBadge.addEventListener('mouseenter', showFloatingHelp);
          hiringBadge.addEventListener('mouseleave', hideFloatingHelp);
          hiringBadge.addEventListener('focus', showFloatingHelp);
          hiringBadge.addEventListener('blur', hideFloatingHelp);
        }
        const costMixHeading = document.getElementById('pq-cost-mix-heading');
        if (costMixHeading) {
          const personnelCostHelp = 'This breakdown represents Board of County Commissioners department personnel only. Contact the applicable constitutional office directly for information about its personnel costs and associated increases.';
          costMixHeading.setAttribute('tabindex', '0');
          costMixHeading.setAttribute('aria-label', costMixHeading.textContent + ' — Board department personnel only. Contact the applicable constitutional office directly for constitutional office personnel costs and associated increases.');
          const helpBadge = document.createElement('span');
          helpBadge.className = 'wc-personnel-cost-help-badge';
          helpBadge.setAttribute('role', 'button');
          helpBadge.setAttribute('tabindex', '0');
          helpBadge.setAttribute('aria-expanded', 'false');
          helpBadge.textContent = '?';
          helpBadge.setAttribute('aria-label', personnelCostHelp);
          const helpText = document.createElement('span');
          helpText.className = 'wc-personnel-cost-help-text';
          helpText.textContent = personnelCostHelp;
          helpText.hidden = false;
          helpBadge.appendChild(helpText);
          costMixHeading.appendChild(helpBadge);
        }
        explainedContainer.querySelectorAll('[data-personnel-explore-dept]').forEach((pill) => pill.addEventListener('click', () => {
          window.location.href = 'summary-of-personnel.html#personnel-ledger';
        }));

        // Live dollar amounts for the static "What drives personnel cost up
        // or down?" cards further down the page, so that section doesn't
        // duplicate a separate live cost-drivers card up here.
        const retirementChangeAmount = retirementTotal - retirementPriorTotal;
        const formatDriverAmount = (value) => {
          const abs = Math.abs(value);
          return abs >= 1000000 ? (value < 0 ? "-" : "") + "$" + (abs / 1000000).toFixed(2) + "M" : formatCurrency(value);
        };
        const colaAmount = document.getElementById('pq-driver-cola-amount');
        if (colaAmount) { colaAmount.textContent = formatDriverAmount(totalCola) + ' estimated salary and wage impact this year.'; colaAmount.hidden = false; }
        const healthAmount = document.getElementById('pq-driver-health-amount');
        if (healthAmount) { healthAmount.textContent = formatDriverAmount(healthInsuranceIncrease) + ' estimated health insurance impact this year.'; healthAmount.hidden = false; }
        const frsAmount = document.getElementById('pq-driver-frs-amount');
        if (frsAmount) { frsAmount.textContent = Math.abs(retirementChangePct).toFixed(1) + '% (' + formatDriverAmount(Math.abs(retirementChangeAmount)) + ' estimated ' + (retirementChangeAmount >= 0 ? 'increase' : 'decrease') + ') this year.'; frsAmount.hidden = false; }
      }
    }).catch(() => {
      if (container) container.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
      if (explainedContainer) explainedContainer.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
    });
  }

  function initPersonnelSummaryPage() {
    renderPersonnelBudgetQuestions();
    const container = document.getElementById("personnel-summary");
    if (!container) return;
    const notesContainer = document.getElementById("personnel-summary-notes");

    container.innerHTML = '<div class="wc-data-loading">' + LOADING_MESSAGE_HTML + "</div>";

    loadBudgetData()
      .then((data) => {
        if (Object.keys(data.errors || {}).length >= data.datasetCount) {
          container.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
          return;
        }
        renderPersonnelSummary(container, notesContainer);
      })
      .catch((err) => {
        console.error("WCBudgetData: failed to load personnel summary", err);
        container.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
      });
  }

  // Summary of Personnel Cost: dollar companion to Summary of Personnel's
  // FTE-count table above -- same department/fund filter pattern, but
  // driven by cache.expenditures' Object_Type "Personnel Services" rows
  // instead of cache.staffing, and split into cost categories instead of a
  // position headcount. Retirement (522000) and Health Insurance (523000)
  // get their own columns rather than being folded into a generic
  // "Benefits" bucket; FICA/Medicare, Workers' Comp, and Unemployment are
  // small and stay combined as "Other Benefits & Taxes" on this main table
  // (Unemployment, 525000, is broken back out as its own line on Board of
  // County Commissioners' own popup -- see buildPersonnelPositionCostsByDept
  // -- since that's the only department it's ever booked under).
  // 510000 is the Sheriff's consolidated Personnel Services line; the
  // remaining codes are the detailed salary lines used by other offices.
  const PERSONNEL_COST_SALARY_CODES = new Set(["510000", "511000", "512000", "512007", "513000", "514000"]);
  const PERSONNEL_COST_RETIREMENT_CODE = "522000";
  const PERSONNEL_COST_HEALTH_INSURANCE_CODE = "523000";
  const PERSONNEL_COST_OTHER_BENEFIT_CODES = new Set(["521000", "524000", "525000"]);
  const PERSONNEL_COST_UNEMPLOYMENT_CODE = "525000";
  // Salaries & Wages already has this 3% Cost of Living Adjustment baked
  // into it -- not an additional increase to apply on top.
  const PERSONNEL_COST_COLA_RATE = 0.03;
  // Informational only, unlike COLA -- not baked into Health Insurance
  // today. Shows what a 5% premium increase would add on top of the
  // current Health Insurance figure, so it's not counted in Total.
  const PERSONNEL_COST_HEALTH_INSURANCE_INCREASE_RATE = 0.05;

  // These independently elected offices are included in the Countywide
  // personnel total, but their ledger rows stay at the office-total level.
  // Their internal salary and benefit mix is managed by each office and
  // should not be presented here as a County department breakdown.
  const PERSONNEL_COST_CONSTITUTIONAL_DEPTS = new Set([
    "clerk of court",
    "property appraiser",
    "supervisor of elections",
    "tax collector",
    "walton county sheriffs office"
  ]);

  function isConstitutionalPersonnelDept(deptName) {
    const normalized = normalizeDeptName(deptName);
    return PERSONNEL_COST_CONSTITUTIONAL_DEPTS.has(normalized) || /(^| )(sheriff|sheriffs office|clerk of circuit court|clerk of courts|property appraiser|supervisor of elections|tax collector)( |$)/.test(normalized);
  }

  function isAggregateOnlyPersonnelDept(deptName) {
    return isConstitutionalPersonnelDept(deptName) || /bailiff services$/.test(normalizeDeptName(deptName));
  }

  // Personnel Cost-only department merge, on top of the shared
  // personnelDeptDisplayName (Code Compliance Beach/Street -> Code
  // Compliance) that Summary of Personnel's FTE page also uses. Planning
  // Short-Term Rental shares its Dept_Code with plain Planning in the
  // expenditures sheet (a real data ambiguity, not a display choice), so
  // it's folded into one "Planning" row here -- scoped to this page only,
  // not the FTE page, since that page doesn't have this ambiguity problem.
  function personnelCostDeptDisplayName(deptName) {
    const norm = normalizeDeptName(deptName);
    if (norm === "planning short term rental") return "Planning";
    return personnelDeptDisplayName(deptName);
  }

  // Same fallback chain used everywhere else on the site a row's prior-year
  // figure is read (see e.g. the FY2026_Original_Budget dedup logic above)
  // -- kept as its own helper here since buildPersonnelCostRows needs it in
  // two places (the amount gate and the actual accumulation).
  function personnelCostPriorYearAmount(row) {
    return row.FY2026_Original_Budget || row.FY2026_Budget || row.FY2026_Plug || 0;
  }

  function buildPersonnelCostRows() {
    const byKey = new Map();
    (cache.expenditures || []).forEach((row) => {
      if (String(row.Object_Type || "").trim() !== "Personnel Services") return;
      const amount = row.FY2027_Proposed || 0;
      const priorAmount = personnelCostPriorYearAmount(row);
      if (!amount && !priorAmount) return;
      const code = String(row.Object_Code || "").trim();
      const isSalary = PERSONNEL_COST_SALARY_CODES.has(code);
      const isRetirement = code === PERSONNEL_COST_RETIREMENT_CODE;
      const isHealthInsurance = code === PERSONNEL_COST_HEALTH_INSURANCE_CODE;
      const isOtherBenefit = PERSONNEL_COST_OTHER_BENEFIT_CODES.has(code);
      if (!isSalary && !isRetirement && !isHealthInsurance && !isOtherBenefit) return;

      // Engineering Services moved from General Fund org 00120000 to
      // Transportation Fund org 10116002 for FY 2027. Its old org remains
      // in the source only to carry FY 2026 history, so keep that history
      // with the current Transportation Fund row instead of presenting a
      // misleading second General Fund personnel-cost entry.
      const fundCode = normalizeDeptName(row.Dept_Name) === "engineering services" ? "101" : fundCodeForRow(row);
      const fund = (cache.funds || []).find((f) => String(f.Fund_Code || "").trim() === fundCode);
      const fundName = (fund && fund.Fund_Name) || ("Fund " + fundCode);
      // "Court Innovation FTE" (Project_Code 1040) is a Circuit Court
      // position, but its dollars are booked under Board of County
      // Commissioners' Dept_Code in the expenditures sheet -- rerouted
      // here so Circuit Court's own department total (and therefore its
      // popup reconciliation) actually includes it, instead of it silently
      // padding BOCC's total and leaving Circuit Court's gap negative.
      const isCourtInnovationProject = String(row.Project_Code || "").trim() === "1040";
      let rawDeptNameForRow = isCourtInnovationProject ? "Circuit Court" : row.Dept_Name;
      // Circuit Court and County Court use 510000 for separately budgeted
      // bailiff coverage. Keep that funding out of the employee/FTE row so
      // the table does not imply the court's one listed County FTE earns the
      // full departmental personnel-services budget.
      if (code === "510000" && /^(?:circuit|county) court$/.test(normalizeDeptName(rawDeptNameForRow))) {
        rawDeptNameForRow += " - Bailiff Services";
      }
      // Code Compliance Beach/Street merged into one "Code Compliance" line
      // on this table -- same treatment Summary of Personnel's FTE table
      // already gives them (see personnelDeptDisplayName), applied here
      // only, not anywhere else.
      const deptName = tourismDeptLabel(personnelCostDeptDisplayName(rawDeptNameForRow), fundName);
      const key = deptName + "|" + fundName;
      if (!byKey.has(key)) {
        byKey.set(key, { Dept_Name: deptName, Fund_Name: fundName, Salaries: 0, Retirement: 0, HealthInsurance: 0, OtherBenefits: 0, PriorTotal: 0 });
      }
      const entry = byKey.get(key);
      if (isSalary) entry.Salaries += amount;
      else if (isRetirement) entry.Retirement += amount;
      else if (isHealthInsurance) entry.HealthInsurance += amount;
      else entry.OtherBenefits += amount;
      entry.PriorTotal += priorAmount;
    });
    return Array.from(byKey.values()).filter((r) => r.Salaries || r.Retirement || r.HealthInsurance || r.OtherBenefits || r.PriorTotal);
  }

  // FTE count per department, from cache.staffing (the same source
  // Summary of Personnel's own FTE table uses) -- grouped under the exact
  // same display department name buildPersonnelCostRows uses (Code
  // Compliance Beach/Street merge, Tourism prefix, Procurement/Purchasing
  // rename) so a row here lines up with its dollar-cost counterpart.
  // The staffing sheet doesn't always spell a department the same way the
  // expenditures sheet does (e.g. staffing's "Engineering Department" vs.
  // expenditures' "Engineering Services", "County Libraries" vs.
  // "Libraries") -- a small, purpose-built 1:1 alias list, NOT the site's
  // broader DEPT_ALIAS_CANONICAL table. That table intentionally groups
  // several distinct tourism sub-programs (Marketing, Communications,
  // Sales and Visitors Center, North Walton TDT) under one "Tourism
  // Administration" canonical key for other pages' purposes -- reusing it
  // here made Tourism - Administration's popup swallow every one of those
  // other tourism departments' staffing positions too, since they're kept
  // as separate rows on this page (see tourismDeptLabel) rather than
  // merged like DEPT_ALIASES does elsewhere.
  const PERSONNEL_COST_DEPT_ALIAS_MAP = {
    "engineering services": "engineering department",
    "county libraries": "libraries",
    "probation services": "probation",
    "procurement": "purchasing",
    "clerk of court": "clerk of circuit court",
    "walton county sheriffs office": "sheriff",
    "beach operations": "tourism beach operations",
    "beach tram": "tourism beach operations",
    "communications": "tourism communications",
    "marketing": "tourism marketing",
    "sales and visitors center": "tourism sales and visitors center"
  };
  function personnelCostFteMatchKey(deptName) {
    const norm = normalizeDeptName(deptName);
    return PERSONNEL_COST_DEPT_ALIAS_MAP[norm] || norm;
  }

  function buildPersonnelCostFteByDept() {
    const totals = new Map();
    (cache.staffing || []).forEach((row) => {
      const fundName = fundNameForStaffingRow(row);
      const deptName = tourismDeptLabel(personnelCostDeptDisplayName(row.Dept_Name), fundName);
      const key = personnelCostFteMatchKey(deptName);
      if (!totals.has(key)) totals.set(key, { prior: 0, current: 0 });
      const entry = totals.get(key);
      entry.prior += row[2026] || 0;
      entry.current += row[2027] || 0;
    });
    return totals;
  }

  // Position Name/FTE only, straight from the staffing sheet -- no dollar
  // amounts, since the point is letting the user visually cross-check this
  // list against the workforce/cost sheet's own position list for that
  // department to spot who's missing from the workforce sheet, not to
  // report cost. Keyed the same alias-canonical way as
  // buildPersonnelCostFteByDept so it looks up under the same department
  // name a popup uses.
  function buildStaffingPositionListByDept() {
    const byDept = new Map();
    (cache.staffing || []).forEach((row) => {
      if (!row.Position_Name || (!(row[2026] || 0) && !(row[2027] || 0))) return;
      const fundName = fundNameForStaffingRow(row);
      const deptName = tourismDeptLabel(personnelCostDeptDisplayName(row.Dept_Name), fundName);
      const key = personnelCostFteMatchKey(deptName);
      if (!byDept.has(key)) byDept.set(key, []);
      byDept.get(key).push({
        Position_Name: row.Position_Name,
        PriorFte: row[2026] || 0,
        CurrentFte: row[2027] || 0,
        Fte: row[2027] || 0
      });
    });
    return byDept;
  }

  // Fallback only -- used if the live Formula Inputs sheet fetch fails
  // (see fetchPersonnelCostFormulaInputs/cache.personnelCostFormula), so a
  // network hiccup doesn't blank out every position's cost.
  const PERSONNEL_COST_FORMULA_DEFAULTS = {
    colaRate: 0.03,
    ficaRate: 0.062,
    medicareRate: 0.0145,
    basicLifeAnnualCost: 25.00,
    healthiestYouAnnualCost: 80.00,
    defaultLtdRate: 0.0031,
    healthPlanAnnualCost: {
      "FB1|EE": 13073.16, "FB1|FAM": 21208.20,
      "FB2|EE": 12833.40, "FB2|FAM": 20664.72,
      "FB3|EE": 12837.60, "FB3|FAM": 20673.48,
      "FB4|FAM": 12837.60,
      "FB5|FAM": 12226.32,
      "FB6|FAM": 12593.16,
      "FB7|FAM": 12858.72
    },
    pensionPlanRate: {
      "7200": 0.1403, "7231": 0.5868, "7205": 0.2202, "7210": 0.1403,
      "7215": 0.5868, "7225": 0.1403, "7230": 0.5868, "7235": 0.3469,
      "7245": 0.0684, "7250": 0.4623, "7251": 0.2590, "7262": 0.0684,
      "7255": 0.1239, "7261": 0.0856, "7220": 0.3324
    },
    riskCodeRate: {
      "1463": 0.0872, "5190": 0.0321, "5213": 0.0476, "5222": 0.0596,
      "5509": 0.0687, "5606": 0.0065, "5651": 0.0524, "6217": 0.0353,
      "7380": 0.0459, "7720": 0.0283, "8380": 0.0172, "8601": 0.0032,
      "8603": 0.0008, "8810": 0.0011, "8820": 0.0008, "9015": 0.0268,
      "9060": 0.0122, "9082": 0.0124, "9102": 0.0275, "9178": 0.0386,
      "9182": 0.0151, "9402": 0.0409, "9410": 0.0207, "9501": 0.0224
    }
  };

  // The Formula Inputs sheet is a small settings/reference sheet, not a
  // uniform per-record table -- it's shaped as several stacked
  // key/value + lookup sections (COLA/FICA/etc. rates, then a "Health
  // Key -> Annual Cost" table, then "Pension Plan -> Rate", then
  // "Risk Code -> Rate"), so it can't go through the standard
  // fetchCSV/parseCSV row-per-header pipeline every other sheet uses.
  // Parsed here directly from parseCSVRows' raw rows instead, section by
  // section, falling back to PERSONNEL_COST_FORMULA_DEFAULTS for anything
  // missing or unparseable.
  function parsePersonnelCostFormulaInputs(rows) {
    const result = JSON.parse(JSON.stringify(PERSONNEL_COST_FORMULA_DEFAULTS));
    const pct = (v) => {
      const n = toNumber(String(v || "").replace(/[%,]/g, ""));
      return n ? n / 100 : undefined;
    };
    const dollars = (v) => {
      const n = toNumber(String(v || "").replace(/[$,]/g, ""));
      return v ? n : undefined;
    };
    const SIMPLE_KEYS = {
      "cola rate": (v) => { const n = pct(v); if (n !== undefined) result.colaRate = n; },
      "fica rate": (v) => { const n = pct(v); if (n !== undefined) result.ficaRate = n; },
      "medicare rate": (v) => { const n = pct(v); if (n !== undefined) result.medicareRate = n; },
      "basic life annual cost": (v) => { const n = dollars(v); if (n !== undefined) result.basicLifeAnnualCost = n; },
      "healthiest you annual cost": (v) => { const n = dollars(v); if (n !== undefined) result.healthiestYouAnnualCost = n; },
      "default ltd rate": (v) => { const n = pct(v); if (n !== undefined) result.defaultLtdRate = n; }
    };

    let section = "simple";
    let sectionHasData = false;
    rows.forEach((r) => {
      const label = String(r[0] || "").trim();
      const value = r[1];
      const isBlank = !label && !String(value || "").trim();

      if (/^health key$/i.test(label)) { section = "health"; sectionHasData = false; return; }
      if (/^pension plan$/i.test(label)) { section = "pension"; sectionHasData = false; return; }
      if (/^risk code$/i.test(label)) { section = "risk"; sectionHasData = false; return; }
      if (/^formula map$/i.test(label)) { section = "done"; return; }
      if (section === "done") return;

      if (isBlank) {
        // A blank row ends a lookup-table section (but not the leading
        // "simple" key/value section, which has its own blanks between
        // the header row and the first rate).
        if (section !== "simple" && sectionHasData) section = "simple";
        return;
      }
      if (!label) return;

      if (section === "simple") {
        const handler = SIMPLE_KEYS[label.toLowerCase()];
        if (handler) handler(value);
        return;
      }
      if (section === "health") {
        const n = dollars(value);
        if (n !== undefined) { result.healthPlanAnnualCost[label] = n; sectionHasData = true; }
        return;
      }
      if (section === "pension") {
        const n = pct(value);
        if (n !== undefined) { result.pensionPlanRate[label] = n; sectionHasData = true; }
        return;
      }
      if (section === "risk") {
        const n = pct(value);
        if (n !== undefined) { result.riskCodeRate[label] = n; sectionHasData = true; }
      }
    });
    return result;
  }

  function fetchPersonnelCostFormulaInputs() {
    return fetch(DATA_SOURCES.personnelCostFormulaInputs, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Request failed with status " + res.status);
        return res.text();
      })
      .then((text) => parsePersonnelCostFormulaInputs(parseCSVRows(text)))
      .catch((err) => {
        console.error("WCBudgetData: failed to load personnel cost formula inputs, using defaults", err);
        return PERSONNEL_COST_FORMULA_DEFAULTS;
      });
  }

  // Full per-position cost, following the County's own formula map:
  // Q base wage, R COLA (Q x COLA rate), S commissioner vehicle allowance
  // (only counted when the annual allowance exceeds $1,000), T FICA,
  // U Medicare, V health insurance, W basic life, X long-term disability,
  // Y retirement, Z workers' comp, AA "Healthiest You", AB weekend pay
  // (only counted when it exceeds $100). Rolled up into this page's own
  // four display categories: Salaries & Wages (Q+R+S+AB), Retirement (Y),
  // Health Insurance (V+W+AA), Other Benefits & Taxes (T+U+X+Z). Rates
  // come from cache.personnelCostFormula (live from the Formula Inputs
  // sheet -- see fetchPersonnelCostFormulaInputs), so editing a rate there
  // (e.g. an FRS retirement rate change) updates every position's cost on
  // the next page load without a code change.
  function computePersonnelPositionCost(row) {
    const f = cache.personnelCostFormula || PERSONNEL_COST_FORMULA_DEFAULTS;
    const q = (row.Hourly_Base_Wage || 0) * (row.Standard_Hours || 0) * (row.Allocation_Pct || 0);
    // County Commissioners' own salary is set by the State of Florida, not
    // the County -- no county COLA applies to them (their Aides still get
    // it normally).
    const isCountyCommissioner = normalizeDeptName(row.Position_Name) === "county commissioner";
    const r = isCountyCommissioner ? 0 : q * f.colaRate;
    const s = row.Commissioner_Vehicle_Allowance > 1000 ? row.Commissioner_Vehicle_Allowance * (row.Allocation_Pct || 0) : 0;
    const wageBase = q + r + s;
    const t = wageBase * f.ficaRate;
    const u = wageBase * f.medicareRate;
    const healthKey = row.Health_Plan + "|" + row.Coverage;
    const v = (f.healthPlanAnnualCost[healthKey] || 0) * (row.Allocation_Pct || 0);
    const w = f.basicLifeAnnualCost * (row.Allocation_Pct || 0);
    // Only one LTD rate was provided (no per-Pension-Plan breakout), so it
    // applies uniformly.
    const x = wageBase * f.defaultLtdRate;
    const y = wageBase * (f.pensionPlanRate[row.Pension_Plan] || 0);
    const z = wageBase * (f.riskCodeRate[row.Risk_Code] || 0);
    const aa = f.healthiestYouAnnualCost * (row.Allocation_Pct || 0);
    const ab = row.Weekend_Pay > 100 ? row.Weekend_Pay * (row.Allocation_Pct || 0) : 0;
    return {
      // Salaries & Wages includes the COLA amount (matching the main
      // department table's own "already baked in" treatment) -- Cola is
      // kept alongside as an informational breakout of how much of that
      // Salaries figure COLA accounts for, not an additional amount.
      Salaries: q + r + s + ab,
      Cola: r,
      Retirement: y,
      HealthInsurance: v + w + aa,
      OtherBenefits: t + u + x + z,
      Total: q + r + s + t + u + v + w + x + y + z + aa + ab
    };
  }

  // Per-position cost detail tab is being built out gradually (see
  // normalizePersonnelPositionCostRow) -- keyed here by the same display
  // department name the rest of this page uses, so it can be looked up
  // directly against a department's popup.
  // Reconciliation: the position roster's bottom-up total won't exactly
  // match the department's own top-down total from the expenditures sheet
  // (different data sources, roster still being filled in, etc.) -- rather
  // than show two different numbers in two different places, whatever gap
  // remains is spread evenly across that department's positions' Other
  // Benefits & Taxes (and therefore their Total), so the popup always
  // foots to the department table. The pre-reconciliation gap is kept on
  // each department's position array (as .reconciliationDifference) so
  // auditPersonnelCostPositionParity can still flag departments where that
  // gap is large -- reconciling the display doesn't erase the signal that
  // something (e.g. a missing position, a shared Dept_Code) needs fixing
  // at the source.
  // Overtime (Object_Code 514000) is budgeted per department but isn't
  // tracked per position anywhere in the position-cost roster -- summed
  // here per department (same display-name grouping as everything else on
  // this page) so the reconciliation step below can spread it evenly
  // across that department's positions' own Salaries & Wages specifically,
  // instead of it just disappearing into the generic Other Benefits &
  // Taxes catch-all along with every other unexplained gap.
  function buildPersonnelCostTotalsByDeptForObjectCode(objectCode) {
    const totals = new Map();
    (cache.expenditures || []).forEach((row) => {
      if (String(row.Object_Code || "").trim() !== objectCode) return;
      const amount = row.FY2027_Proposed || 0;
      if (!amount) return;
      const fundCode = fundCodeForRow(row);
      const fund = (cache.funds || []).find((f) => String(f.Fund_Code || "").trim() === fundCode);
      const fundName = (fund && fund.Fund_Name) || ("Fund " + fundCode);
      const deptName = tourismDeptLabel(personnelCostDeptDisplayName(row.Dept_Name), fundName);
      totals.set(deptName, (totals.get(deptName) || 0) + amount);
    });
    return totals;
  }

  function buildPersonnelCostOvertimeByDept() {
    return buildPersonnelCostTotalsByDeptForObjectCode("514000");
  }

  // Object_Code 513000 (Other Salaries & Wages) covers seasonal/temporary
  // positions that aren't on the position-cost roster at all -- they draw
  // FICA/Medicare like anyone else, but no retirement or health insurance.
  // Same "explained" treatment as overtime, but shown as its own line (like
  // Board of County Commissioners' Retiree Health Insurance Subsidies)
  // rather than folded into existing positions' Salaries, since these
  // aren't real roster positions to spread across.
  function buildPersonnelCostSeasonalByDept() {
    return buildPersonnelCostTotalsByDeptForObjectCode("513000");
  }

  // Object_Code 525000 (Unemployment) is only ever booked under Board of
  // County Commissioners in the expenditures sheet -- a countywide cost,
  // not something tied to any individual position -- so it's carved out
  // of BOCC's Other Benefits & Taxes gap and shown as its own popup line
  // (like Retiree Health Insurance Subsidies) instead of being spread
  // evenly across BOCC's own roster along with everything else.
  function buildPersonnelCostUnemploymentByDept() {
    return buildPersonnelCostTotalsByDeptForObjectCode(PERSONNEL_COST_UNEMPLOYMENT_CODE);
  }

  function buildPersonnelPositionCostsByDept() {
    const deptNameByCode = new Map();
    (cache.expenditures || []).forEach((row) => {
      const code = String(row.Dept_Code || "").trim();
      if (code && !deptNameByCode.has(code)) deptNameByCode.set(code, row.Dept_Name);
    });
    const overtimeByDept = buildPersonnelCostOvertimeByDept();
    const seasonalByDept = buildPersonnelCostSeasonalByDept();
    const unemploymentByDept = buildPersonnelCostUnemploymentByDept();

    const byDept = new Map();
    (cache.personnelPositionCosts || []).forEach((row, index) => {
      if (!row.Position_Name) return;
      const rawDeptName = deptNameByCode.get(row.Dept_Code) || "";
      if (!rawDeptName) return;
      const cost = computePersonnelPositionCost(row);
      if (!cost.Total) return;
      const fund = (cache.funds || []).find((f) => String(f.Fund_Code || "").trim() === row.Fund_Code);
      const fundName = (fund && fund.Fund_Name) || ("Fund " + row.Fund_Code);
      // Same Code Compliance Beach/Street merge as the department rows
      // above, so a position's popup lands under the same merged "Code
      // Compliance" key its department row uses.
      const deptName = tourismDeptLabel(personnelCostDeptDisplayName(rawDeptName), fundName);
      // This position is actually paid for out of Tourism Administration's
      // budget, not Human Resources' -- kept on Human Resources' list for
      // visibility (see the note personnelCostDeptDetailHtml adds to that
      // popup), but zeroed out here so it doesn't double-count against
      // Human Resources' real cost. Zeroing it (rather than skipping the
      // row) also lets the normal reconciliation step correctly spread
      // Human Resources' real gap across its real positions instead of
      // silently absorbing this one's cost into that gap.
      let excludeFromReconciliation = false;
      if (normalizeDeptName(deptName) === "human resources" && normalizeDeptName(row.Position_Name) === "human resources generalist tourism") {
        cost.Salaries = 0;
        cost.Cola = 0;
        cost.Retirement = 0;
        cost.HealthInsurance = 0;
        cost.OtherBenefits = 0;
        cost.Total = 0;
        excludeFromReconciliation = true;
      }
      if (!byDept.has(deptName)) byDept.set(deptName, []);
      // Land Use Attorney is one real FTE, split 75%/25% Planning/Code
      // Compliance for COST purposes only (see PERSONNEL_COST_DEPT_NOTES'
      // Code Compliance note) -- for headcount purposes it's counted as one
      // full FTE in Planning, and blanked out entirely on Code Compliance's
      // copy, rather than the Allocation_Pct split double-counting it as
      // 0.75 + 0.25 = 1 FTE spread across two departments' headcounts.
      const isLandUseAttorney = normalizeDeptName(row.Position_Name) === "land use attorney";
      const isCodeCompliance = normalizeDeptName(deptName) === "code compliance";
      const isPlanning = normalizeDeptName(deptName) === "planning";
      const hideFte = isLandUseAttorney && isCodeCompliance;
      // A handful of positions carry Standard_Hours_per_Year of 1040
      // instead of the usual full-time 2080 -- part-time roles at 100%
      // Allocation but only half the standard annual hours, so their real
      // FTE contribution is half what Allocation_Pct alone would suggest.
      const fte = (isLandUseAttorney && isPlanning) ? 1 : (row.Allocation_Pct || 0) * ((row.Standard_Hours || 2080) / 2080);
      // Stable, auto-assigned Position ID -- the position-cost sheet's own
      // "Position ID*" column is blank, and this is 1-based on that
      // sheet's row order (not re-numbered per department), so it can be
      // pasted straight back into the sheet as a lookup key when
      // reloading reconciled dollar amounts.
      byDept.get(deptName).push({ PositionId: index + 1, Position_Name: row.Position_Name, Fte: fte, Cost: cost, SourceRow: row, excludeFromReconciliation: excludeFromReconciliation, hideFte: hideFte });
    });

    // The "Custodian - Building" position is costed under Building
    // Department -- real dollars there, Fund 103/the Building Fund -- but
    // its FTE belongs to Building Construction and Maintenance's headcount
    // (per the split discussed earlier). Cross-listed here at $0 under
    // Building Construction and Maintenance too, purely for visibility, and
    // excluded from that department's reconciliation so it doesn't affect
    // real dollars there. Matched by title, not a hardcoded Position ID --
    // Position ID is just 1-based row order on the workforce sheet, so a
    // fixed ID silently starts pointing at a different row every time
    // someone inserts/removes a row above it on the sheet.
    byDept.forEach((deptPositions) => {
      const custodianBuilding = deptPositions.find((p) => normalizeDeptName(p.Position_Name) === "custodian building");
      if (!custodianBuilding) return;
      const buildingConstructionKey = Array.from(byDept.keys()).find((k) => normalizeDeptName(k) === "building construction and maintenance");
      if (!buildingConstructionKey || deptPositions === byDept.get(buildingConstructionKey)) return;
      // FTE belongs to Building Construction and Maintenance's headcount, not
      // Building Department's -- blank it out on this original (real-cost)
      // row so it doesn't look like Building Department's own headcount,
      // and show it on the cross-listed ($0) copy below instead, which is
      // where it actually counts.
      custodianBuilding.hideFte = true;
      byDept.get(buildingConstructionKey).push({
        PositionId: custodianBuilding.PositionId,
        Position_Name: custodianBuilding.Position_Name,
        Fte: custodianBuilding.Fte,
        Cost: { Salaries: 0, Cola: 0, Retirement: 0, HealthInsurance: 0, OtherBenefits: 0, Total: 0 },
        SourceRow: custodianBuilding.SourceRow,
        excludeFromReconciliation: true
      });
    });

    // Per-category department totals (not just a collapsed grand total) --
    // reconciliation below matches each category (Salaries, Retirement,
    // Health Insurance, Other Benefits & Taxes) independently against its
    // own department-table figure, not just the sum of all four. Multiple
    // fund-rows for the same display department are summed together.
    const deptCategoryTotals = new Map();
    buildPersonnelCostRows().forEach((r) => {
      if (!deptCategoryTotals.has(r.Dept_Name)) {
        deptCategoryTotals.set(r.Dept_Name, { Salaries: 0, Retirement: 0, HealthInsurance: 0, OtherBenefits: 0 });
      }
      const t = deptCategoryTotals.get(r.Dept_Name);
      t.Salaries += r.Salaries;
      t.Retirement += r.Retirement;
      t.HealthInsurance += r.HealthInsurance;
      t.OtherBenefits += r.OtherBenefits;
    });

    byDept.forEach((positions, deptName) => {
      const deptTotal = deptCategoryTotals.get(deptName);
      if (!deptTotal || !positions.length) return;
      const raw = { Salaries: 0, Retirement: 0, HealthInsurance: 0, OtherBenefits: 0 };
      positions.forEach((p) => {
        raw.Salaries += p.Cost.Salaries;
        raw.Retirement += p.Cost.Retirement;
        raw.HealthInsurance += p.Cost.HealthInsurance;
        raw.OtherBenefits += p.Cost.OtherBenefits;
      });

      // Overtime (514000) and seasonal/temporary salary (513000) are real,
      // explained dollars within the Salaries category -- carved out
      // before the remaining Salaries gap gets spread, same as seasonal's
      // own FICA/Medicare estimate is carved out of Other Benefits & Taxes.
      const overtimeTotal = overtimeByDept.get(deptName) || 0;
      const seasonalTotal = seasonalByDept.get(deptName) || 0;
      let seasonalTaxes = 0;
      if (seasonalTotal) {
        const formula = cache.personnelCostFormula || PERSONNEL_COST_FORMULA_DEFAULTS;
        seasonalTaxes = seasonalTotal * (formula.ficaRate + formula.medicareRate);
        positions.seasonalPositions = { Salaries: seasonalTotal, OtherBenefits: seasonalTaxes, Total: seasonalTotal + seasonalTaxes };
      }

      // Board of County Commissioners carries real Retiree Health Insurance
      // Subsidy costs that aren't tied to any current position -- shown as
      // its own explicit line instead of being spread across (and
      // inflating) individual positions' Health Insurance the way every
      // other department's Health Insurance gap is handled.
      const isBocc = normalizeDeptName(deptName) === "board of county commissioners";

      // Unemployment (525000) is only ever booked under Board of County
      // Commissioners in the expenditures sheet -- a countywide cost, not
      // something tied to any individual position -- so it's carved out of
      // BOCC's Other Benefits & Taxes gap here and shown as its own popup
      // line (like Retiree Health Insurance Subsidies below) instead of
      // being spread evenly across BOCC's own roster along with everything
      // else. Every other department's Unemployment total is $0, so this
      // has no effect on them.
      const unemploymentTotal = isBocc ? (unemploymentByDept.get(deptName) || 0) : 0;

      const salariesGap = deptTotal.Salaries - raw.Salaries - overtimeTotal - seasonalTotal;
      const retirementGap = deptTotal.Retirement - raw.Retirement;
      const healthInsuranceGap = deptTotal.HealthInsurance - raw.HealthInsurance;
      const otherBenefitsGap = deptTotal.OtherBenefits - raw.OtherBenefits - seasonalTaxes - unemploymentTotal;

      // Positions zeroed out above (e.g. Human Resources Generalist -
      // Tourism, actually paid for elsewhere) don't share in the spread --
      // they're not real cost to reconcile, just a name kept on the list
      // for visibility, so they should stay at exactly $0.
      const reconcilablePositions = positions.filter((p) => !p.excludeFromReconciliation);
      const reconcilableCount = reconcilablePositions.length || 1;
      // BOCC's own unexplained Salaries gap doesn't inflate its
      // Aides/Commissioners' Salaries figures -- instead it's spread across
      // their Retirement/Health Insurance/Other Benefits & Taxes columns
      // (folded into perPositionOtherBenefits below) right alongside every
      // other department's usual per-category gaps, rather than bumping up
      // individual salaries or piling into the Retiree Health Insurance
      // Subsidies line.
      const perPositionSalaries = isBocc ? (overtimeTotal / reconcilableCount) : (salariesGap + overtimeTotal) / reconcilableCount;
      const perPositionRetirement = retirementGap / reconcilableCount;
      const perPositionHealthInsurance = isBocc ? 0 : healthInsuranceGap / reconcilableCount;
      const perPositionOtherBenefits = isBocc ? (otherBenefitsGap + salariesGap) / reconcilableCount : otherBenefitsGap / reconcilableCount;
      reconcilablePositions.forEach((p) => {
        p.Cost.Salaries += perPositionSalaries;
        p.Cost.Retirement += perPositionRetirement;
        p.Cost.HealthInsurance += perPositionHealthInsurance;
        p.Cost.OtherBenefits += perPositionOtherBenefits;
        p.Cost.Total = p.Cost.Salaries + p.Cost.Retirement + p.Cost.HealthInsurance + p.Cost.OtherBenefits;
      });
      if (isBocc) {
        positions.retireeHealthInsuranceSubsidy = healthInsuranceGap;
        if (unemploymentTotal) positions.unemploymentTotal = unemploymentTotal;
      }

      // Overtime, seasonal/temp pay, and (for BOCC) the Retiree Health
      // Insurance Subsidy and Unemployment are real, already-explained
      // dollars that just aren't tied to any individual roster row --
      // folded into the audit's own "Position_Total" here too, so its
      // Difference column reflects only genuinely unexplained gaps (e.g.
      // missing positions) instead of re-flagging known, already-handled
      // amounts every time.
      const explainedTotal = overtimeTotal + seasonalTotal + seasonalTaxes +
        (isBocc ? healthInsuranceGap + unemploymentTotal : 0);
      positions.reconciliationDifference =
        (deptTotal.Salaries + deptTotal.Retirement + deptTotal.HealthInsurance + deptTotal.OtherBenefits) -
        (raw.Salaries + raw.Retirement + raw.HealthInsurance + raw.OtherBenefits) - explainedTotal;
      positions.overtimeTotal = overtimeTotal;
      positions.rawTotal = raw.Salaries + raw.Retirement + raw.HealthInsurance + raw.OtherBenefits + explainedTotal;
      positions.deptTotal = deptTotal.Salaries + deptTotal.Retirement + deptTotal.HealthInsurance + deptTotal.OtherBenefits;
    });

    return byDept;
  }

  // Debug console tool: for every department that has position-level data
  // (see buildPersonnelPositionCostsByDept), compares that bottom-up
  // position total against the department's own top-down total on the
  // Summary of Personnel Cost table (from cache.expenditures' Personnel
  // Services lines) -- flags where they disagree by more than the
  // tolerance, so gaps as the position sheet gets built out (a missing
  // position, a vacant position not yet on the roster, a dept-code
  // mismatch, etc.) show up instead of silently reading two different
  // numbers in two different places. Run automatically after every data
  // load (see loadBudgetData) and callable manually as
  // WCBudgetData.auditPersonnelCostPositionParity().
  function auditPersonnelCostPositionParity(options) {
    const tolerance = (options && options.tolerance) || 1;

    // The popup itself always foots to the department total now (see
    // buildPersonnelPositionCostsByDept's reconciliation step, which
    // spreads any gap across Other Benefits & Taxes) -- this audit reads
    // the pre-reconciliation gap each department's positions carry
    // (.reconciliationDifference/.rawTotal/.deptTotal) so a real problem
    // (missing positions, a shared/ambiguous Dept_Code, etc.) still shows
    // up here even though it's invisible on the live page.
    const positionsByDept = buildPersonnelPositionCostsByDept();
    const mismatches = [];
    let comparedCount = 0;
    positionsByDept.forEach((positions, deptName) => {
      if (positions.deptTotal === undefined) return;
      comparedCount += 1;
      const difference = positions.reconciliationDifference;
      if (Math.abs(difference) > tolerance) {
        mismatches.push({
          Dept_Name: deptName,
          Positions_On_Roster: positions.length,
          Department_Total: positions.deptTotal,
          Position_Total: positions.rawTotal,
          Difference: difference
        });
      }
    });
    mismatches.sort((a, b) => Math.abs(b.Difference) - Math.abs(a.Difference));

    if (!(options && options.log === false)) {
      console.group("Personnel Cost: department vs. position-breakdown parity audit");
      console.table(mismatches);
      console.log(
        mismatches.length + " of " + comparedCount + " department(s) with position data do not match their department total (each is reconciled on the live page by spreading the gap across Other Benefits & Taxes -- this list is what that's papering over). " +
        (positionsByDept.size - comparedCount) + " department(s) on the position roster aren't recognized on the Personnel Cost table (name/dept-code mismatch)."
      );
      console.groupEnd();
    }

    return mismatches;
  }

  // Summary of Personnel Cost's per-department "View Budget Lines" popup --
  // same wc-view-budget-lines-toggle/openBudgetDetailModal machinery used
  // throughout the site (see ensureBudgetDetailModal). Leads with a
  // cost-by-position table when the position-cost sheet has data for this
  // department, followed by the full Personnel Services line-item
  // breakdown (salary lines, retirement, insurance, etc.) that the
  // department-level total is actually built from.
  // Free-text notes shown at the top of a specific department's popup --
  // keyed by normalizeDeptName(deptName).
  const PERSONNEL_COST_DEPT_NOTES = {
    "human resources": [
      "The Human Resources Generalist - Tourism position is paid for in the Tourism Administration budget, so it's shown here at $0 to avoid double-counting -- it's kept on this list for visibility only."
    ],
    "building construction and maintenance": [
      "The Custodian - Building position listed here is funded by the Building Fund (Building Department), so it's shown here at $0 to avoid double-counting -- it's kept on this list for FTE visibility only."
    ],
    "circuit court": [
      "The Administrative Assistant II - Circuit Court position is partially funded with Court Innovation funds."
    ],
    "code compliance": [
      "The Land Use Attorney position is 25% paid through the Code Compliance department, with the remaining 75% in Planning."
    ],
    "tourism administration": [
      "The Human Resources Generalist - Tourism position is shown here because it's paid for out of this budget, but its FTE count is reported under Human Resources."
    ],
    "extension office": [
      "Personnel costs for the Extension Office are shared with the University of Florida."
    ]
  };

  function personnelCostDeptDetailHtml(deptName, positions, staffingPositions) {
    budgetLinesDetailCounter += 1;
    const detailId = "wc-personnel-cost-dept-detail-" + budgetLinesDetailCounter;

    const deptNotes = PERSONNEL_COST_DEPT_NOTES[normalizeDeptName(deptName)];
    const deptNotesHtml = deptNotes && deptNotes.length
      ? '<div class="wc-staffing-notes" style="margin-top:16px;"><p class="wc-staffing-notes-title">Note:</p>' +
        deptNotes.map((n) => "<p>" + escapeHtml(n) + "</p>").join("") +
        "</div>"
      : "";

    const staffingByTitle = new Map();
    (staffingPositions || []).forEach((position) => {
      const title = position.Position_Name || "Unclassified Position";
      const key = normalizeDeptName(title);
      if (!staffingByTitle.has(key)) staffingByTitle.set(key, { title, prior: 0, current: 0 });
      const entry = staffingByTitle.get(key);
      entry.prior += position.PriorFte || 0;
      entry.current += position.CurrentFte || 0;
    });

    let positionsHtml = "";
    if ((positions && positions.length) || staffingByTitle.size) {
      // Standardize repeated positions into one title-level row. This keeps
      // departments with many identical jobs (for example Beach Maintenance
      // Specialists) compact while preserving their combined FTE and cost.
      const combinedByTitle = new Map();
      (positions || []).forEach((position) => {
        const title = position.Position_Name || "Unclassified Position";
        const key = normalizeDeptName(title);
        if (!combinedByTitle.has(key)) {
          combinedByTitle.set(key, { title, costFte: 0, Salaries: 0, Benefits: 0, Total: 0 });
        }
        const entry = combinedByTitle.get(key);
        if (!position.hideFte) entry.costFte += position.Fte || 0;
        entry.Salaries += position.Cost.Salaries || 0;
        entry.Benefits += (position.Cost.Retirement || 0) + (position.Cost.HealthInsurance || 0) + (position.Cost.OtherBenefits || 0);
        entry.Total += position.Cost.Total || 0;
      });
      staffingByTitle.forEach((staffing, key) => {
        if (!combinedByTitle.has(key)) combinedByTitle.set(key, { title: staffing.title, costFte: staffing.current, Salaries: 0, Benefits: 0, Total: 0 });
      });

      const positionsGrand = { PriorFte: 0, CurrentFte: 0, Salaries: 0, Benefits: 0, Total: 0 };
      const positionRows = Array.from(combinedByTitle.entries())
        .sort((a, b) => a[1].title.localeCompare(b[1].title))
        .map(([key, position]) => {
          const staffing = staffingByTitle.get(key);
          const priorFte = staffing ? staffing.prior : position.costFte;
          const currentFte = staffing ? staffing.current : position.costFte;
          const change = currentFte - priorFte;
          const sign = change > 0 ? "+" : change < 0 ? "−" : "";
          const tone = change > 0 ? " is-increase" : change < 0 ? " is-decrease" : "";
          positionsGrand.PriorFte += priorFte;
          positionsGrand.CurrentFte += currentFte;
          positionsGrand.Salaries += position.Salaries;
          positionsGrand.Benefits += position.Benefits;
          positionsGrand.Total += position.Total;
          return '<tr><td>' + escapeHtml(position.title) + '</td><td class="wc-num">' + formatNumber(priorFte) + '</td><td class="wc-num">' + formatNumber(currentFte) + '</td><td class="wc-num' + tone + '">' + sign + formatNumber(Math.abs(change)) + '</td><td class="wc-num">' + formatCurrency(position.Salaries) + '</td><td class="wc-num">' + formatCurrency(position.Benefits) + '</td><td class="wc-num">' + formatCurrency(position.Total) + '</td></tr>';
        });
      if (positions && positions.seasonalPositions) {
        const sp = positions.seasonalPositions;
        positionsGrand.Salaries += sp.Salaries;
        positionsGrand.Benefits += sp.OtherBenefits;
        positionsGrand.Total += sp.Total;
        positionRows.push(
          "<tr><td>Seasonal/Temporary Positions</td>" +
          '<td class="wc-num"></td><td class="wc-num"></td><td class="wc-num"></td>' +
          '<td class="wc-num">' + formatCurrency(sp.Salaries) + "</td>" +
          '<td class="wc-num">' + formatCurrency(sp.OtherBenefits) + "</td>" +
          '<td class="wc-num">' + formatCurrency(sp.Total) + "</td></tr>"
        );
      }
      if (positions && positions.retireeHealthInsuranceSubsidy) {
        const healthInsurancePortion = positions.retireeHealthInsuranceSubsidy;
        positionsGrand.Benefits += healthInsurancePortion;
        positionsGrand.Total += healthInsurancePortion;
        positionRows.push(
          "<tr><td>Retiree Health Insurance Subsidies</td>" +
          '<td class="wc-num"></td><td class="wc-num"></td><td class="wc-num"></td>' +
          '<td class="wc-num"></td>' +
          '<td class="wc-num">' + formatCurrency(healthInsurancePortion) + "</td>" +
          '<td class="wc-num">' + formatCurrency(healthInsurancePortion) + "</td></tr>"
        );
      }
      if (positions && positions.unemploymentTotal) {
        positionsGrand.Benefits += positions.unemploymentTotal;
        positionsGrand.Total += positions.unemploymentTotal;
        positionRows.push(
          "<tr><td>Unemployment</td>" +
          '<td class="wc-num"></td><td class="wc-num"></td><td class="wc-num"></td>' +
          '<td class="wc-num"></td>' +
          '<td class="wc-num">' + formatCurrency(positions.unemploymentTotal) + "</td>" +
          '<td class="wc-num">' + formatCurrency(positions.unemploymentTotal) + "</td></tr>"
        );
      }
      const totalFteChange = positionsGrand.CurrentFte - positionsGrand.PriorFte;
      positionRows.push(
        '<tr class="wc-table-total-row"><td>Total</td>' +
        '<td class="wc-num">' + formatNumber(positionsGrand.PriorFte) + "</td>" +
        '<td class="wc-num">' + formatNumber(positionsGrand.CurrentFte) + "</td>" +
        '<td class="wc-num">' + (totalFteChange > 0 ? "+" : totalFteChange < 0 ? "−" : "") + formatNumber(Math.abs(totalFteChange)) + "</td>" +
        '<td class="wc-num">' + formatCurrency(positionsGrand.Salaries) + "</td>" +
        '<td class="wc-num">' + formatCurrency(positionsGrand.Benefits) + "</td>" +
        '<td class="wc-num">' + formatCurrency(positionsGrand.Total) + "</td></tr>"
      );
      positionsHtml =
        '<p class="wc-staffing-notes-title">Staffing and Cost by Position</p>' +
        '<div class="wc-data-table-scroll">' +
        '<table class="wc-data-table wc-staffing-table">' +
        "<thead><tr><th>Position</th><th class=\"wc-num\">FY 2026 FTE</th><th class=\"wc-num\">FY 2027 FTE</th><th class=\"wc-num\">+/−</th><th class=\"wc-num\">Salaries &amp; Wages</th><th class=\"wc-num\">Retirement, Health Insurance &amp; Other Benefits</th><th class=\"wc-num\">Total Personnel Cost</th></tr></thead>" +
        "<tbody>" + positionRows.join("") + "</tbody></table></div>";
    } else {
      positionsHtml = '<div class="wc-data-empty">No position-level cost data is available yet for this department.</div>';
    }

    // Staffing sheet's own position list for this department -- name and
    // FTE only, no dollar amounts -- the whole point is spotting which of
    // these names don't yet have a matching row in the workforce/cost sheet
    // above. Debug-only: logged to the console (see
    // auditPersonnelCostPositionParity for the same pattern) rather than
    // shown on the popup itself, since it's a data-entry gap-finding tool
    // for maintaining the workforce sheet, not something site visitors need
    // to see.
    if (staffingPositions && staffingPositions.length) {
      // Only positions whose name has no match (case/punctuation-insensitive)
      // in this department's own workforce/cost list above -- i.e. the
      // staffing sheet's positions that still need to be added to the
      // workforce sheet, not the full staffing roster.
      const workforceNames = new Set((positions || []).map((p) => normalizeDeptName(p.Position_Name)));
      const missingStaffing = staffingPositions.filter((s) => !workforceNames.has(normalizeDeptName(s.Position_Name)));
      if (missingStaffing.length) {
        const sortedStaffing = missingStaffing.slice().sort((a, b) => String(a.Position_Name).localeCompare(String(b.Position_Name)));
        console.log(
          "WCBudgetData: staffing sheet positions missing from workforce sheet -- " + deptName
        );
        console.table(sortedStaffing.map((s) => ({ Position: s.Position_Name, FTE: s.Fte })));
      }
    }

    const detailHtml =
      '<div class="wc-budget-lines-detail wc-budget-lines-card wc-finance-card" data-print-title="' + escapeHtml(deptName || "") + '" id="' + detailId + '" hidden>' +
        positionsHtml +
        deptNotesHtml +
      "</div>";
    return { detailId, detailHtml };
  }

  function personnelCostDisplayNameForRow(row) {
    const fund = (cache.funds || []).find((f) => String(f.Fund_Code || "").trim() === String(row.Fund_Code || "").trim());
    const fundName = (fund && fund.Fund_Name) || ("Fund " + row.Fund_Code);
    return tourismDeptLabel(personnelCostDeptDisplayName(row.Dept_Name), fundName);
  }

  // Builds the same "Staffing and Cost by Position" popup used on the
  // Personnel Budget page (see personnelCostDeptDetailHtml) for an
  // arbitrary set of raw expenditure rows, by resolving each row to its
  // Personnel Cost sheet department name and merging that name's
  // position-level cost and staffing data. Lets the Department Budget and
  // Constitutional Officers Budget explorers reuse the real position-level
  // detail instead of re-deriving it.
  function personnelCostDetailForRows(label, rows) {
    const positionsByDept = buildPersonnelPositionCostsByDept();
    const staffingPositionsByDept = buildStaffingPositionListByDept();
    const displayNames = Array.from(new Set((rows || []).map((row) => personnelCostDisplayNameForRow(row))));
    const mergedPositions = [];
    let mergedSeasonal = null;
    let retireeHealthInsuranceSubsidy = 0;
    let unemploymentTotal = 0;
    let mergedStaffing = [];
    displayNames.forEach((displayName) => {
      const positions = positionsByDept.get(displayName);
      if (positions && positions.length) {
        mergedPositions.push.apply(mergedPositions, positions);
        retireeHealthInsuranceSubsidy += positions.retireeHealthInsuranceSubsidy || 0;
        unemploymentTotal += positions.unemploymentTotal || 0;
        if (positions.seasonalPositions) {
          if (!mergedSeasonal) mergedSeasonal = { Salaries: 0, OtherBenefits: 0, Total: 0 };
          mergedSeasonal.Salaries += positions.seasonalPositions.Salaries || 0;
          mergedSeasonal.OtherBenefits += positions.seasonalPositions.OtherBenefits || 0;
          mergedSeasonal.Total += positions.seasonalPositions.Total || 0;
        }
      }
      const staffing = staffingPositionsByDept.get(personnelCostFteMatchKey(displayName));
      if (staffing && staffing.length) mergedStaffing = mergedStaffing.concat(staffing);
    });
    mergedPositions.retireeHealthInsuranceSubsidy = retireeHealthInsuranceSubsidy;
    mergedPositions.unemploymentTotal = unemploymentTotal;
    mergedPositions.seasonalPositions = mergedSeasonal;
    return personnelCostDeptDetailHtml(label, mergedPositions, mergedStaffing);
  }

  // A permanent, always-visible "Personnel Ledger" section for the bottom
  // of a department/constitutional officer page -- the same position-level
  // cost detail as personnelCostDetailForRows' popup (see above), just
  // unhidden and given its own section heading instead of sitting behind a
  // "View Positions" toggle. Returns "" for departments with no
  // position-level cost data (e.g. fund-only pages with no staff), so the
  // page doesn't show an empty placeholder section.
  function renderDepartmentPersonnelLedgerSection(deptName, rows) {
    const { detailHtml } = personnelCostDetailForRows(deptName, rows);
    if (detailHtml.indexOf("No position-level cost data is available") !== -1) return "";
    const visibleHtml = detailHtml.replace(' hidden>', '>');
    return '<section class="wc-department-personnel-ledger"><h2 class="wc-department-explorer-subhead">Personnel Ledger</h2>' + visibleHtml + '</section>';
  }

  // Turns a dollar amount in a "Budget structure" cost-row into a clickable
  // popup trigger, reusing the same wc-view-budget-lines-toggle/
  // openBudgetDetailModal machinery as every other budget-lines popup on
  // the site. Returns "" for detail when there's nothing to show, so the
  // caller can fall back to a plain, non-clickable amount.
  function budgetLinesDollarButton(rowsForKind, amountText, popupLabel, options) {
    const opts = options || {};
    const linkClass = opts.linkClass || "wc-department-cost-amount";
    const toggle = renderBudgetLinesToggle(rowsForKind, "Note", "expense");
    if (!toggle.button) return { html: opts.plain ? amountText : "<b>" + amountText + "</b>", detail: "" };
    const match = /data-target="([^"]+)"/.exec(toggle.button);
    const targetId = match ? match[1] : "";
    const button = '<button type="button" class="wc-view-budget-lines-toggle ' + linkClass + '" data-target="' + targetId + '" data-closed-label="' + escapeHtml(popupLabel || "Budget Lines") + '">' + amountText + "</button>";
    return {
      html: opts.plain ? button : "<b>" + button + "</b>",
      detail: toggle.detail
    };
  }

  // Same idea as budgetLinesDollarButton, but for the Personnel amount --
  // opens the "Staffing and Cost by Position" popup instead of a raw
  // budget-lines table (see personnelCostDetailForRows).
  function personnelDollarButton(rowsForDept, deptLabel, amountText, options) {
    const opts = options || {};
    const linkClass = opts.linkClass || "wc-department-cost-amount";
    const { detailId, detailHtml } = personnelCostDetailForRows(deptLabel, rowsForDept);
    const button = '<button type="button" class="wc-view-budget-lines-toggle ' + linkClass + '" data-target="' + detailId + '" data-closed-label="' + escapeHtml(deptLabel + " Staffing and Cost by Position") + '">' + amountText + "</button>";
    return {
      html: opts.plain ? button : "<b>" + button + "</b>",
      detail: detailHtml
    };
  }

  function renderPersonnelCostSummary(container) {
    if (!container) return;
    const rows = buildPersonnelCostRows();
    if (!rows.length) {
      container.innerHTML = '<div class="wc-data-empty">No personnel cost data is available.</div>';
      return;
    }
    const positionsByDept = buildPersonnelPositionCostsByDept();
    const fteByDept = buildPersonnelCostFteByDept();
    const staffingPositionsByDept = buildStaffingPositionListByDept();

    const boardRows = rows.filter((r) => !isConstitutionalPersonnelDept(r.Dept_Name));
    const departments = uniqueSorted(boardRows.map((r) => r.Dept_Name));
    const funds = uniqueSorted(boardRows.map((r) => r.Fund_Name));

    container.innerHTML =
      '<div class="wc-personnel-ledger-scope" role="group" aria-label="Choose personnel budget group"><button type="button" data-personnel-cost-scope="board">Board Departments</button><button type="button" data-personnel-cost-scope="constitutional">Constitutional Officers</button></div>' +
      '<div class="wc-filter-bar wc-machinery-picker" data-personnel-board-filters hidden>' +
      filterComboFieldHtml({ idPrefix: "wcPersonnelCostDept", label: "Department", options: departments }) +
      filterComboFieldHtml({ idPrefix: "wcPersonnelCostFund", label: "Fund", options: funds }) +
      '<button type="button" class="wc-view-budget-lines-toggle" id="wcPersonnelCostIncreasesToggle" aria-pressed="false">Show COLA, Health Insurance &amp; Increase</button>' +
      '<button type="button" class="wc-view-budget-lines-toggle" id="wcPersonnelCostExportAllButton">Export All Positions (CSV)</button>' +
      "</div>" +
      '<div class="wc-financial-summary-table"></div>';

    const tableEl = container.querySelector(".wc-financial-summary-table");
    let selectedDept = "";
    let selectedFund = "";
    let selectedFunction = "";
    const personnelFunctionByDept = new Map();
    (cache.staffing || []).forEach((row) => {
      const functionName = expenseActivityForRow(row) || "General Government";
      personnelFunctionByDept.set(personnelCostFteMatchKey(row.Dept_Name), functionName);
      personnelFunctionByDept.set(normalizeDeptName(row.Dept_Name), functionName);
      personnelFunctionByDept.set(personnelCostFteMatchKey(personnelDeptDisplayName(row.Dept_Name)), functionName);
    });
    let selectedScope = "";
    const boardFilters = container.querySelector("[data-personnel-board-filters]");
    const scopeButtons = Array.from(container.querySelectorAll("[data-personnel-cost-scope]"));
    const increasesToggle = container.querySelector("#wcPersonnelCostIncreasesToggle");
    container.querySelector("#wcPersonnelCostExportAllButton").addEventListener("click", () => {
      // Flattened and sorted by Position ID -- i.e. the position-cost
      // sheet's own original row order -- rather than grouped by
      // department, so this lines up row-for-row with that sheet for a
      // clean paste-back.
      const allPositions = [];
      positionsByDept.forEach((positions) => allPositions.push(...positions));
      allPositions.sort((a, b) => a.PositionId - b.PositionId);
      const csvRows = [PERSONNEL_POSITION_CSV_HEADER].concat(allPositions.map((p) => personnelPositionCsvRow(p)));
      downloadCsv("workforce.csv", csvRows);
    });
    // Global (not scoped to this container) because the position-cost
    // popup is appended to document.body by ensureBudgetDetailModal, not
    // nested under #personnel-cost-summary -- .wc-personnel-cost-optional-col
    // only ever exists on this page's own cells, so this is safe.
    increasesToggle.addEventListener("click", () => {
      const showing = document.body.classList.toggle("wc-show-personnel-cost-optional-cols");
      increasesToggle.setAttribute("aria-pressed", showing ? "true" : "false");
      increasesToggle.textContent = showing ? "Hide COLA, Health Insurance & Increase" : "Show COLA, Health Insurance & Increase";
      // Re-render so the combined column's own header label can drop
      // "Health Insurance" from its name once Health Insurance has its own
      // visible column right next to it -- otherwise the same dollar
      // figure would look like it's named twice.
      showFiltered();
    });

    function showFiltered() {
      if (!selectedScope) {
        boardFilters.hidden = true;
        tableEl.hidden = false;
        tableEl.innerHTML = '<div class="wc-data-empty">Choose Board Departments or Constitutional Officers to view the Personnel Ledger.</div>';
        return;
      }
      boardFilters.hidden = selectedScope !== "board";
      increasesToggle.disabled = selectedScope !== "board";
      increasesToggle.hidden = selectedScope !== "board";
      const deptName = selectedDept;
      const fundName = selectedFund;
      const items = rows.filter((r) =>
        (selectedScope === "all" ? true : selectedScope === "constitutional" ? isConstitutionalPersonnelDept(r.Dept_Name) : !isConstitutionalPersonnelDept(r.Dept_Name)) &&
        (!selectedFunction || (personnelFunctionByDept.get(personnelCostFteMatchKey(r.Dept_Name)) || personnelFunctionByDept.get(normalizeDeptName(r.Dept_Name)) || expenseActivityForRow(r)) === selectedFunction) &&
        (!deptName || r.Dept_Name === deptName) && (!fundName || r.Fund_Name === fundName)
      );

      if (!items.length) {
        tableEl.hidden = false;
        tableEl.innerHTML = '<div class="wc-data-empty">No rows match the current filters.</div>';
        return;
      }

      const totals = new Map();
      items.forEach((r) => {
        if (!totals.has(r.Dept_Name)) totals.set(r.Dept_Name, { Salaries: 0, Retirement: 0, HealthInsurance: 0, OtherBenefits: 0 });
        const t = totals.get(r.Dept_Name);
        t.Salaries += r.Salaries;
        t.Retirement += r.Retirement;
        t.HealthInsurance += r.HealthInsurance;
        t.OtherBenefits += r.OtherBenefits;
      });

      const deptsInView = uniqueSorted(Array.from(totals.keys()));
      // Constitutional Officers only ever report total FTE and total
      // personnel cost (see isAggregateOnlyPersonnelDept) -- when every
      // department currently in view is aggregate-only, drop the
      // Salaries/COLA/Benefits/Health Insurance columns entirely instead of
      // rendering a row of em-dashes under headers that don't apply.
      const aggregateOnly = deptsInView.length > 0 && deptsInView.every(isAggregateOnlyPersonnelDept);
      const grand = { Salaries: 0, Fte: 0, FteChange: 0, Cola: 0, Benefits: 0, HealthInsurance: 0, HealthInsuranceIncrease: 0 };
      // Each department name is a "View Budget Lines" toggle, opening the
      // same budget-detail modal used elsewhere on the site (see
      // openBudgetDetailModal) with that department's own Personnel
      // Services line items instead of leaving users stuck at the
      // department-level rollup.
      const detailMarkup = [];
      const bodyRows = deptsInView.map((d) => {
        const t = totals.get(d);
        const isAggregateOnly = isAggregateOnlyPersonnelDept(d);
        // Salaries & Wages already has the 3% COLA baked in -- backed out
        // here for display as Salaries - Salaries / 1.03, i.e. the portion
        // of the current total attributable to that 3% increase, not an
        // additional amount on top of it.
        const cola = t.Salaries * (PERSONNEL_COST_COLA_RATE / (1 + PERSONNEL_COST_COLA_RATE));
        const fteEntry = fteByDept.get(personnelCostFteMatchKey(d)) || { prior: 0, current: 0 };
        const fte = fteEntry.current;
        const fteChange = fteEntry.current - fteEntry.prior;
        const fteChangeText = (fteChange > 0 ? "+" : fteChange < 0 ? "−" : "") + formatNumber(Math.abs(fteChange));
        const fteChangeClass = fteChange > 0 ? " is-increase" : fteChange < 0 ? " is-decrease" : "";
        const deptPositions = positionsByDept.get(d);
        // Board of County Commissioners' Retiree Health Insurance
        // Subsidies aren't active-employee premiums, so a hypothetical 5%
        // active-employee premium increase shouldn't apply to that portion
        // of Health Insurance -- excluded from the base before applying
        // the rate, same as the popup's own per-position calculation
        // already does (that row has no Health Insurance Increase value).
        const retireeHealthInsuranceSubsidy = (deptPositions && deptPositions.retireeHealthInsuranceSubsidy) || 0;
        const healthInsuranceIncrease = (t.HealthInsurance - retireeHealthInsuranceSubsidy) * PERSONNEL_COST_HEALTH_INSURANCE_INCREASE_RATE;
        // Retirement, Health Insurance, and Other Benefits & Taxes are
        // combined into one column here, same as the per-position popup --
        // Health Insurance only breaks back out on its own (as an optional
        // column) when the COLA/Health Insurance Increase toggle is on. The
        // standalone Health Insurance column excludes Board of County
        // Commissioners' Retiree Health Insurance Subsidies (a pooled,
        // non-active-employee cost) -- the combined column still includes
        // it, so the row's Total still reconciles.
        const benefits = t.Retirement + t.HealthInsurance + t.OtherBenefits;
        const activeHealthInsurance = t.HealthInsurance - retireeHealthInsuranceSubsidy;
        grand.Salaries += t.Salaries;
        grand.Fte += fte;
        grand.FteChange += fteChange;
        grand.Cola += cola;
        grand.Benefits += benefits;
        grand.HealthInsurance += activeHealthInsurance;
        grand.HealthInsuranceIncrease += healthInsuranceIncrease;
        const total = t.Salaries + benefits;
        if (isAggregateOnly) {
          return aggregateOnly
            ? (
              '<tr class="wc-personnel-constitutional-row"><td>' + escapeHtml(d) + "</td>" +
              '<td class="wc-num">' + formatNumber(fte) + "</td>" +
              '<td class="wc-num' + fteChangeClass + '">' + fteChangeText + "</td>" +
              '<td class="wc-num"><strong>' + formatCurrency(total) + "</strong></td></tr>"
            )
            : (
              '<tr class="wc-personnel-constitutional-row"><td>' + escapeHtml(d) + "</td>" +
              '<td class="wc-num">' + formatNumber(fte) + "</td>" +
              '<td class="wc-num' + fteChangeClass + '">' + fteChangeText + "</td>" +
              '<td class="wc-num"><span class="wc-visually-muted">&mdash;</span></td>' +
              '<td class="wc-num wc-personnel-cost-optional-col"><span class="wc-visually-muted">&mdash;</span></td>' +
              '<td class="wc-num"><span class="wc-visually-muted">&mdash;</span></td>' +
              '<td class="wc-num wc-personnel-cost-optional-col"><span class="wc-visually-muted">&mdash;</span></td>' +
              '<td class="wc-num wc-personnel-cost-optional-col"><span class="wc-visually-muted">&mdash;</span></td>' +
              '<td class="wc-num"><strong>' + formatCurrency(total) + "</strong></td></tr>"
            );
        }
        const { detailId, detailHtml } = personnelCostDeptDetailHtml(d, deptPositions, staffingPositionsByDept.get(personnelCostFteMatchKey(d)));
        detailMarkup.push(detailHtml);
        return (
          "<tr><td>" +
          '<button type="button" class="wc-view-budget-lines-toggle wc-table-row-link" data-target="' + detailId + '" data-closed-label="' + escapeHtml(d) + '" aria-expanded="false">' +
          escapeHtml(d) + "</button>" +
          "</td>" +
          '<td class="wc-num">' + formatNumber(fte) + "</td>" +
          '<td class="wc-num' + fteChangeClass + '">' + fteChangeText + "</td>" +
          '<td class="wc-num">' + formatCurrency(t.Salaries) + "</td>" +
          '<td class="wc-num wc-personnel-cost-optional-col">' + formatCurrency(cola) + "</td>" +
          '<td class="wc-num">' + formatCurrency(benefits) + "</td>" +
          '<td class="wc-num wc-personnel-cost-optional-col">' + formatCurrency(activeHealthInsurance) + "</td>" +
          '<td class="wc-num wc-personnel-cost-optional-col">' + formatCurrency(healthInsuranceIncrease) + "</td>" +
          '<td class="wc-num">' + formatCurrency(total) + "</td></tr>"
        );
      });
      const grandTotal = grand.Salaries + grand.Benefits;
      bodyRows.push(
        aggregateOnly
          ? (
            '<tr class="wc-table-total-row"><td>Total</td>' +
            '<td class="wc-num">' + formatNumber(grand.Fte) + "</td>" +
            '<td class="wc-num">' + (grand.FteChange > 0 ? "+" : grand.FteChange < 0 ? "−" : "") + formatNumber(Math.abs(grand.FteChange)) + "</td>" +
            '<td class="wc-num">' + formatCurrency(grandTotal) + "</td></tr>"
          )
          : (
            '<tr class="wc-table-total-row"><td>Total</td>' +
            '<td class="wc-num">' + formatNumber(grand.Fte) + "</td>" +
            '<td class="wc-num">' + (grand.FteChange > 0 ? "+" : grand.FteChange < 0 ? "−" : "") + formatNumber(Math.abs(grand.FteChange)) + "</td>" +
            '<td class="wc-num">' + formatCurrency(grand.Salaries) + "</td>" +
            '<td class="wc-num wc-personnel-cost-optional-col">' + formatCurrency(grand.Cola) + "</td>" +
            '<td class="wc-num">' + formatCurrency(grand.Benefits) + "</td>" +
            '<td class="wc-num wc-personnel-cost-optional-col">' + formatCurrency(grand.HealthInsurance) + "</td>" +
            '<td class="wc-num wc-personnel-cost-optional-col">' + formatCurrency(grand.HealthInsuranceIncrease) + "</td>" +
            '<td class="wc-num">' + formatCurrency(grandTotal) + "</td></tr>"
          )
      );
      if (selectedFunction) {
        grand.Fte = Array.from((cache.staffing || [])).filter((row) => (expenseActivityForRow(row) || "General Government") === selectedFunction).reduce((sum, row) => sum + (Number(row[2027]) || 0), 0);
      }

      // Once Health Insurance has its own visible column (the toggle is
      // on), the combined column's label drops "Health Insurance" from its
      // name -- otherwise the same figure looks like it's named in both
      // columns at once.
      const showingOptionalCols = document.body.classList.contains("wc-show-personnel-cost-optional-cols");
      const combinedColumnLabel = showingOptionalCols ? "Retirement & Other Benefits" : "Retirement, Health Insurance & Other Benefits";
      const includesConstitutional = deptsInView.some(isConstitutionalPersonnelDept);
      const constitutionalNote = includesConstitutional
        ? '<p class="wc-personnel-constitutional-note"><strong>Constitutional Officer personnel budgets:</strong> Only each office\'s total FTE and total personnel cost are shown. Contact the Clerk of Courts, Property Appraiser, Supervisor of Elections, Tax Collector, or Sheriff\'s Office directly for details about their respective personnel budgets.</p>'
        : "";
      const includesBailiffServices = deptsInView.some((d) => /bailiff services$/.test(normalizeDeptName(d)));
      const bailiffNote = includesBailiffServices
        ? '<p class="wc-personnel-constitutional-note"><strong>Court bailiff services:</strong> These amounts support court security provided by the Walton County Sheriff\'s Office.</p>'
        : "";
      mountOrHide(
        tableEl,
        renderTable({
          caption: deptName || (selectedFunction ? selectedFunction + " — All Personnel" : selectedScope === "constitutional" ? "Constitutional Officers" : "Board Departments"),
          columns: aggregateOnly ? [
            { label: "Department" },
            { label: "FTE", num: true },
            { label: "+/−", num: true },
            { label: "Total", num: true }
          ] : [
            { label: "Department" },
            { label: "FTE", num: true },
            { label: "+/−", num: true },
            { label: "Salaries & Wages", num: true },
            { label: "3% COLA", num: true, classes: ["wc-personnel-cost-optional-col"] },
            { label: combinedColumnLabel, num: true },
            { label: "Health Insurance", num: true, classes: ["wc-personnel-cost-optional-col"] },
            { label: "Health Insurance Increase", num: true, classes: ["wc-personnel-cost-optional-col"] },
            { label: "Total", num: true }
          ],
          bodyRows: bodyRows
        }) + constitutionalNote + bailiffNote + detailMarkup.join("")
      );
    }

    // Department and Fund are mutually exclusive -- picking one clears
    // whatever was selected in the other, rather than combining both as an
    // AND filter.
    const deptCombo = setupFilterCombo({
      input: container.querySelector("#wcPersonnelCostDeptInput"),
      results: container.querySelector("#wcPersonnelCostDeptResults"),
      options: departments,
      getCurrentValue: () => selectedDept,
      onSelect: (value) => {
        selectedDept = value;
        if (value) {
          selectedFund = "";
          fundCombo.setValue("");
        }
        showFiltered();
      }
    });
    const fundCombo = setupFilterCombo({
      input: container.querySelector("#wcPersonnelCostFundInput"),
      results: container.querySelector("#wcPersonnelCostFundResults"),
      options: funds,
      getCurrentValue: () => selectedFund,
      onSelect: (value) => {
        selectedFund = value;
        if (value) {
          selectedDept = "";
          deptCombo.setValue("");
        }
        showFiltered();
      }
    });
    scopeButtons.forEach((button) => button.addEventListener("click", () => {
      selectedScope = button.dataset.personnelCostScope;
      selectedFunction = "";
      selectedDept = "";
      selectedFund = "";
      deptCombo.setValue("");
      fundCombo.setValue("");
      scopeButtons.forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", active ? "true" : "false");
      });
      showFiltered();
    }));
    document.addEventListener("wc-personnel-select-scope", (event) => {
      const scope = event.detail && event.detail.scope;
      const button = scopeButtons.find((item) => item.dataset.personnelCostScope === scope);
      if (!button) return;
      button.click();
    });
    document.addEventListener("wc-personnel-select-function", (event) => {
      const functionName = event.detail && event.detail.functionName;
      if (!functionName) return;
      selectedScope = "all";
      selectedFunction = functionName;
      selectedDept = "";
      selectedFund = "";
      deptCombo.setValue("");
      fundCombo.setValue("");
      scopeButtons.forEach((item) => {
        item.classList.remove("is-active");
        item.setAttribute("aria-pressed", "false");
      });
      showFiltered();
    });
    document.addEventListener("wc-personnel-explore-dept", (event) => {
      const department = event.detail && event.detail.department;
      if (!department) return;
      const requestedKey = personnelCostFteMatchKey(department);
      const matchedRow = rows.find((row) => personnelCostFteMatchKey(row.Dept_Name) === requestedKey);
      if (!matchedRow) return;
      const isConstitutional = isConstitutionalPersonnelDept(matchedRow.Dept_Name);
      selectedScope = isConstitutional ? "constitutional" : "board";
      selectedFunction = "";
      selectedDept = matchedRow.Dept_Name;
      selectedFund = "";
      deptCombo.setValue(isConstitutional ? "" : matchedRow.Dept_Name);
      fundCombo.setValue("");
      scopeButtons.forEach((item) => {
        const active = item.dataset.personnelCostScope === selectedScope;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", active ? "true" : "false");
      });
      showFiltered();
    });
    showFiltered();
  }

  function initPersonnelCostSummaryPage() {
    const container = document.getElementById("personnel-cost-summary");
    if (!container) return;

    container.innerHTML = '<div class="wc-data-loading">' + LOADING_MESSAGE_HTML + "</div>";

    loadBudgetData()
      .then((data) => {
        if (Object.keys(data.errors || {}).length >= data.datasetCount) {
          container.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
          return;
        }
        renderPersonnelCostSummary(container);
      })
      .catch((err) => {
        console.error("WCBudgetData: failed to load personnel cost summary", err);
        container.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
      });
  }

  function initFinancialSummaryPage() {
    const container = document.getElementById("financial-summary");
    if (!container) return;
    const type = container.dataset.summaryType === "revenues" ? "revenues" : "expenses";

    container.innerHTML = '<div class="wc-data-loading">' + LOADING_MESSAGE_HTML + "</div>";

    loadBudgetData()
      .then((data) => {
        if (Object.keys(data.errors || {}).length >= data.datasetCount) {
          container.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
          return;
        }
        renderFinancialSummary(container, type);
      })
      .catch((err) => {
        console.error("WCBudgetData: failed to load financial summary", err);
        container.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
      });
  }

  function initConsolidatedFundTableContainer(containerId, renderFn, errorContext, onMounted) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div class="wc-data-loading">' + LOADING_MESSAGE_HTML + "</div>";

    loadBudgetData()
      .then((data) => {
        if (Object.keys(data.errors || {}).length >= data.datasetCount) {
          container.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
          return;
        }
        container.innerHTML = renderFn();
        if (onMounted) onMounted(container);
      })
      .catch((err) => {
        console.error("WCBudgetData: failed to load " + errorContext, err);
        container.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
      });
  }

  function initConsolidatedFundTablesPage() {
    const bindConsolidatedTooltips = (container) => bindTooltipAnchors(container);
    initConsolidatedFundTableContainer("consolidated-revenue-budget-table", renderConsolidatedRevenueBudgetTable, "consolidated revenue budget", bindConsolidatedTooltips);
    initConsolidatedFundTableContainer("consolidated-expenditure-budget-table", renderConsolidatedExpenditureBudgetTable, "consolidated expenditure budget", bindConsolidatedTooltips);
    initConsolidatedFundTableContainer("consolidated-financial-budget-table", renderConsolidatedFinancialBudgetTable, "consolidated financial schedule", bindConsolidatedTooltips);
  }

  function initFinancialForecastPage() {
    const container = document.getElementById("financial-forecast");
    if (!container) return;
    container.innerHTML = '<div class="wc-data-loading">' + LOADING_MESSAGE_HTML + "</div>";

    Promise.all([
      loadBudgetData(),
      window.wcCipProjectsReady || Promise.resolve(window.wcCipProjects || [])
    ])
      .then(([data, cipProjects]) => {
        if (Object.keys(data.errors || {}).length >= data.datasetCount) {
          container.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
          return;
        }
        container.innerHTML = renderFinancialForecast(cipProjects);
        bindTooltipAnchors(container);
      })
      .catch((err) => {
        console.error("WCBudgetData: failed to load financial forecast", err);
        container.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
      });
  }

  const STRATEGIC_INITIATIVES = [
    { code: "I", title: "Planned Growth with Sustainable Infrastructure" },
    { code: "II", title: "Organizational Performance and Asset Management" },
    { code: "III", title: "Workforce Development and Accessible Housing" },
    { code: "IV", title: "Preservation of Natural Resources, Historical Heritage, and Natural Beauty" },
    { code: "V", title: "Safe, Clean, and Prideful Communities" },
    { code: "VI", title: "Visitor Experience Diversification" },
    { code: "VII", title: "Cultural, Arts, and Recreational Experience Expansion" }
  ];

  const STRATEGIC_SCOPE_EXCLUSIONS = [
    "sheriff",
    "clerk of court",
    "clerk of courts",
    "clerk of the circuit court",
    "tax collector",
    "property appraiser",
    "supervisor of elections"
  ];

  function isBoardControlledStrategicDepartment(row) {
    const name = normalizeDeptName(row && row.Dept_Name);
    return !STRATEGIC_SCOPE_EXCLUSIONS.some((excluded) => name.includes(normalizeDeptName(excluded)));
  }

  function strategicInitiativeCodes(value) {
    const codes = String(value || "").toUpperCase().match(/\b(?:VII|VI|IV|V|III|II|I)\b/g) || [];
    return Array.from(new Set(codes));
  }

  function strategicDepartmentBudget(row) {
    const sumProposed = (expenses) => expenses
      .reduce((sum, expense) => sum + (expense.FY2027_Proposed || 0), 0);
    const codeMatchedTotal = sumProposed(getDepartmentExpenses(row.Dept_Name, row.Dept_Code));
    if (codeMatchedTotal) return codeMatchedTotal;

    // Some performance records retain a legacy department code even after
    // the budget moved to a renamed or reorganized department. Engineering
    // is the current example: its code still finds a zero-dollar legacy row,
    // while its FY 2027 budget is carried under Engineering Services/Public
    // Works Engineering Services. Retry through the shared name aliases when
    // the code match has no proposed budget.
    return sumProposed(getDepartmentExpenses(row.Dept_Name, ""));
  }

  // Shared by both the initiative summary line and the filter pill count so
  // the two numbers a reader sees for the same initiative always agree --
  // previously the pill showed a raw performance-measure count while the
  // summary line showed a distinct-goal count, and the two never matched.
  function countUniqueGoals(rows) {
    return new Set(
      rows.map((row) => [row.Dept_Code, row.Goal].join("|")).filter((key) => key.split("|")[1])
    ).size;
  }

  function strategicInitiativeGroupHtml(initiative, rows) {
    const departments = new Map();
    rows.forEach((row) => {
      const key = row.Dept_Code || normalizeDeptName(row.Dept_Name);
      if (!departments.has(key)) {
        departments.set(key, {
          code: row.Dept_Code,
          name: row.Dept_Name || "Department not identified",
          amount: strategicDepartmentBudget(row),
          rows: []
        });
      }
      departments.get(key).rows.push(row);
    });

    const departmentList = Array.from(departments.values()).sort((a, b) => a.name.localeCompare(b.name));
    const initiativeAmount = departmentList.reduce((sum, department) => sum + department.amount, 0);
    const goalCount = countUniqueGoals(rows);

    const departmentHtml = departmentList.map((department) => {
      const href = departmentPageHref(department.name);
      const heading = href
        ? '<a href="' + escapeHtml(href) + '">' + escapeHtml(department.name) + "</a>"
        : escapeHtml(department.name);

      // Several performance measures often share one Department Goal (e.g.
      // "Ensure safe, quality construction" backing both an inspections and
      // a licensing measure) -- group by goal so that statement prints once
      // as a heading instead of being repeated on every measure beneath it.
      const goalGroups = new Map();
      department.rows.forEach((row) => {
        const goalKey = row.Goal || "Not provided";
        if (!goalGroups.has(goalKey)) goalGroups.set(goalKey, []);
        goalGroups.get(goalKey).push(row);
      });

      const goalGroupHtml = Array.from(goalGroups.entries()).map(([goal, goalRows]) => {
        const measureRows = goalRows.map((row) => {
          const target = row.Projected_2027 || "Not provided";
          return (
            '<div class="wc-alignment-measure-row">' +
              '<div><span>Objective</span><p>' + escapeHtml(row.Objective || "Not provided") + "</p></div>" +
              '<div><span>Performance measure</span><p>' + escapeHtml(row.Measure || "Not provided") + "</p></div>" +
              '<div class="wc-alignment-target"><span>FY 2027 target</span><p>' + escapeHtml(target) + "</p></div>" +
            "</div>"
          );
        }).join("");
        return (
          '<div class="wc-alignment-goal-group">' +
            '<p class="wc-alignment-goal-heading"><span>Department goal</span>' + escapeHtml(goal) + "</p>" +
            '<div class="wc-alignment-measure-rows">' + measureRows + "</div>" +
          "</div>"
        );
      }).join("");

      const measureCount = department.rows.length;
      const summaryDetail = goalGroups.size + " " + (goalGroups.size === 1 ? "goal" : "goals") +
        " · " + measureCount + " performance " + (measureCount === 1 ? "measure" : "measures");

      return (
        '<details class="wc-alignment-department">' +
          '<summary><span class="wc-alignment-department-summary-copy"><strong>' + heading + '</strong><small>' + summaryDetail + '</small></span>' +
          '<span class="wc-alignment-department-heading"><span>FY 2027 proposed department budget</span><strong>' + formatCurrency(department.amount) + "</strong></span></summary>" +
          goalGroupHtml +
        "</details>"
      );
    }).join("");

    return (
      '<details class="wc-alignment-initiative" id="priority-detail-' + initiative.code + '" data-initiative="' + initiative.code + '">' +
        '<summary><span class="wc-alignment-roman">' + initiative.code + '.</span><span class="wc-alignment-summary-copy"><strong>' +
        escapeHtml(initiative.title) + '</strong><small>' + departmentList.length + " " + (departmentList.length === 1 ? "department" : "departments") +
        " · " + goalCount + " " + (goalCount === 1 ? "goal" : "goals") + " · " + formatCurrency(initiativeAmount) +
        " in proposed department budgets</small></span></summary>" +
        '<div class="wc-alignment-initiative-body"><button type="button" class="wc-priority-back" data-initiative-filter="all">&larr; All priorities</button>' +
        (departmentHtml || '<p class="wc-alignment-empty">No aligned department goals are currently listed.</p>') + "</div>" +
      "</details>"
    );
  }

  function initStrategicInitiativesPage() {
    const container = document.getElementById("strategic-initiative-alignment");
    if (!container) return;
    container.innerHTML = '<div class="wc-data-loading">' + LOADING_MESSAGE_HTML + "</div>";

    loadBudgetData().then((data) => {
      const performanceRows = (data.performanceMeasures || []).filter((row) =>
        row.Dept_Name && isBoardControlledStrategicDepartment(row) && strategicInitiativeCodes(row["Code Link"]).length
      );
      const representedDepartments = new Map();
      performanceRows.forEach((row) => {
        const key = row.Dept_Code || normalizeDeptName(row.Dept_Name);
        if (!representedDepartments.has(key)) representedDepartments.set(key, strategicDepartmentBudget(row));
      });
      const controlledBudget = Array.from(representedDepartments.values()).reduce((sum, amount) => sum + amount, 0);
      const controlledBudgetElement = document.getElementById("strategic-controlled-budget");
      const controlledDepartmentsElement = document.getElementById("strategic-controlled-departments");
      if (controlledBudgetElement) controlledBudgetElement.textContent = formatCurrency(controlledBudget);
      if (controlledDepartmentsElement) {
        controlledDepartmentsElement.textContent = representedDepartments.size + " aligned Board-controlled " +
          (representedDepartments.size === 1 ? "department" : "departments");
      }
      const groups = STRATEGIC_INITIATIVES.map((initiative) => ({
        initiative,
        rows: performanceRows.filter((row) => strategicInitiativeCodes(row["Code Link"]).includes(initiative.code))
      }));

      const priorityCards = groups.map(({ initiative, rows }) => {
        const departments = new Map();
        rows.forEach((row) => {
          const key = row.Dept_Code || normalizeDeptName(row.Dept_Name);
          if (!departments.has(key)) departments.set(key, strategicDepartmentBudget(row));
        });
        const budget = Array.from(departments.values()).reduce((sum, amount) => sum + amount, 0);
        const goalCount = countUniqueGoals(rows);
        return '<button type="button" class="wc-priority-card" data-initiative-filter="' + initiative.code + '" aria-controls="priority-detail-' + initiative.code + '" aria-pressed="false">' +
          '<span class="wc-priority-number">' + initiative.code + '.</span>' +
          '<span class="wc-priority-card-copy"><strong>' + escapeHtml(initiative.title) + '</strong><small>' +
          departments.size + " " + (departments.size === 1 ? "department" : "departments") + " · " +
          goalCount + " " + (goalCount === 1 ? "goal" : "goals") + '</small><span class="wc-priority-action">Explore priority &rarr;</span></span>' +
          '<span class="wc-priority-budget"><span>FY 2027 department budgets represented</span>' + formatCurrency(budget) + "</span>" +
        "</button>";
      }).join("");

      container.innerHTML =
        '<div class="wc-priority-toolbar"><span>Select a priority to see its department goals and performance measures.</span>' +
          '<button type="button" class="wc-priority-reset" data-initiative-filter="all" hidden>Return to all priorities</button></div>' +
        '<div class="wc-priority-grid" role="group" aria-label="Board strategic priorities">' + priorityCards + "</div>" +
        '<p class="wc-alignment-note">Budget figures provide department-level context and are not direct allocations to an individual goal, objective, or performance measure.</p>' +
        '<p class="wc-priority-prompt">Choose a priority above to explore the departments and measurable work supporting it.</p>' +
        '<div class="wc-alignment-groups">' + groups.map(({ initiative, rows }) => strategicInitiativeGroupHtml(initiative, rows)).join("") + "</div>";

      container.querySelectorAll(".wc-alignment-initiative").forEach((group) => { group.hidden = true; });

      function selectPriority(selected, options) {
        options = options || {};
        container.querySelectorAll(".wc-priority-card").forEach((item) => {
          const active = item.dataset.initiativeFilter === selected;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", active ? "true" : "false");
        });
        const reset = container.querySelector(".wc-priority-reset");
        const prompt = container.querySelector(".wc-priority-prompt");
        reset.hidden = selected === "all";
        prompt.hidden = selected !== "all";
        container.querySelectorAll(".wc-alignment-initiative").forEach((group) => {
          group.hidden = selected === "all" || group.dataset.initiative !== selected;
          group.open = selected !== "all" && !group.hidden;
        });
        if (!options.skipHash && window.history && window.history.replaceState) {
          const base = window.location.pathname + window.location.search;
          window.history.replaceState(null, "", selected === "all" ? base : base + "#priority-" + selected);
        }
        if (options.scroll) {
          const target = selected === "all"
            ? container.querySelector(".wc-priority-grid")
            : container.querySelector('[data-initiative="' + selected + '"]');
          if (target) window.requestAnimationFrame(() => target.scrollIntoView({ behavior: "smooth", block: "start" }));
        }
      }

      container.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-initiative-filter]");
        if (!button) return;
        selectPriority(button.dataset.initiativeFilter, { scroll: true });
      });

      const hashMatch = window.location.hash.match(/^#priority-(I|II|III|IV|V|VI|VII)$/);
      if (hashMatch) selectPriority(hashMatch[1], { skipHash: true, scroll: true });

      container.querySelector(".wc-alignment-groups").addEventListener("toggle", (event) => {
        const opened = event.target;
        if (!opened.open) return;
        if (opened.classList.contains("wc-alignment-initiative")) {
          container.querySelectorAll(".wc-alignment-initiative[open]").forEach((group) => {
            if (group !== opened) group.open = false;
          });
        } else if (opened.classList.contains("wc-alignment-department")) {
          const parent = opened.closest(".wc-alignment-initiative");
          parent.querySelectorAll(".wc-alignment-department[open]").forEach((department) => {
            if (department !== opened) department.open = false;
          });
        }
      }, true);
    }).catch((err) => {
      console.error("WCBudgetData: failed to load strategic initiative alignment", err);
      container.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + "</div>";
    });
  }

  // Statement of Function for each Board department shown on the Department
  // Budget explorer. Departments that roll up a single office in the real
  // Statement of Function sheet (see cache.departmentNarratives) pull that
  // office's own narrative directly (see renderDetail's functionStatement
  // lookup) -- these are only the departments that combine multiple offices
  // with no single narrative row of their own, written by hand to summarize
  // what the combined department actually does based on its member offices'
  // own narratives.
  const DEPARTMENT_BUDGET_COMBINED_FUNCTION_STATEMENTS = {
    "Code Compliance": "Code Compliance upholds County ordinances and protects the aesthetics, property values, health, safety, and quality of life of Walton County, covering enforcement countywide as well as within the beach and coastal areas.",
    "County Administration Departments": "County Administration executes the directives and priorities set by the Board of County Commissioners and provides centralized administrative and support services countywide, encompassing Human Resources, the County Extension Service, Geographic Information Systems, Housing and Urban Development, County Libraries, Probation Services, and Veteran Services.",
    "Office of Management and Budget": "The Office of Management and Budget provides comprehensive financial and administrative support to the Board of County Commissioners, including the annual budget process.",
    "Purchasing": "Purchasing manages County procurement in accordance with federal, state, and local requirements, from competitive solicitations to contract administration.",
    "Parks & Recreation": "Parks & Recreation improves quality of life through safe, well-maintained recreational programs and facilities, including the Eagle Springs Golf and Recreation Center and its grill, along with senior center and Mainstreet culture and recreation programming.",
    "Engineering Department": "The Engineering Department provides engineering services and oversight for County infrastructure projects and operates the Mossy Head Wastewater Treatment Facility, which provides sewer service to the Northwest Commerce Industrial Park area.",
    "Environmental Services": "Environmental Services protects public health and quality of life through solid waste management, mosquito control, and soil conservation, including the franchise agreement for countywide waste collection and state-aid-supported mosquito control operations.",
    "Planning": "The Planning & Development Services Department provides professional land use planning advice to the Board of County Commissioners, including zoning, site plan, and land use review, along with short-term rental certification and compliance.",
    "Tourism Administration": "Tourism Administration oversees Walton County's tourism marketing, communications, and visitor services -- including the Sales and Visitors Center and North Walton Tourist Development Tax marketing efforts -- and funds tourism-related public safety, including beach lifeguard services provided under agreement with the South Walton Fire District.",
    "Beach Operations": "Beach Operations supports and maintains Walton County's public beaches, funding beach renourishment projects and operating the Beach Tram Program, which improves beach access while reducing traffic congestion and parking demand."
  };

  function initDepartmentBudgetPage() {
    const checklistContainer = document.getElementById("department-budget-questions");
    const explorer = document.getElementById("department-budget-explorer");
    if (!checklistContainer && !explorer) return;

    const checklist = [
      ["services", "Services", "Explain what services each department provides."],
      ["programs", "Services", "Define the department's programs and service areas."],
      ["goals", "Services", "Show goals for each service area."],
      ["new-services", "Services", "Identify services being added or expanded."],
      ["challenges", "Services", "Explain challenges affecting service delivery."],
      ["total-cost", "Department cost", "Show the total cost for each department."],
      ["measurement", "Department cost", "Explain how department costs are measured."],
      ["personnel", "Department cost", "Separate personnel costs."],
      ["contracts", "Department cost", "Separate contracted purchases."],
      ["internal", "Department cost", "Identify internal and shared-service costs."],
      ["collaboration", "Accountability", "Show where departments work together."],
      ["metrics", "Accountability", "Define measures used to determine success."]
    ];
    const initiallyComplete = new Set(["services", "programs", "goals", "total-cost", "measurement", "personnel", "contracts", "metrics"]);

    if (checklistContainer) {
      checklistContainer.innerHTML = '<div class="wc-revenue-question-heading"><span>Department plan build progress</span><h2>Understand department services and results</h2></div>' +
        '<section class="wc-revenue-guide-checklist" aria-labelledby="department-guide-title"><div class="wc-revenue-guide-head"><div><strong id="department-guide-title">Department page build status</strong><p>Use this guide while service, cost, and accountability information is added to the page.</p></div><span data-department-guide-progress></span></div><div class="wc-revenue-guide-progress-track" aria-hidden="true"><i data-department-guide-progress-bar></i></div><div class="wc-revenue-guide-grid">' +
        checklist.map((item) => '<label><input type="checkbox" data-department-guide-item="' + item[0] + '"><span><small>' + escapeHtml(item[1]) + '</small><b>' + escapeHtml(item[2]) + '</b></span><em data-department-guide-state>Next</em></label>').join("") + '</div></section>';
      const key = "wc-department-analysis-checklist-v1";
      let saved = {};
      try { saved = JSON.parse(window.localStorage.getItem(key) || "{}"); } catch (error) { saved = {}; }
      const inputs = Array.from(checklistContainer.querySelectorAll("[data-department-guide-item]"));
      function updateChecklist() {
        const done = inputs.filter((input) => input.checked).length;
        checklistContainer.querySelector("[data-department-guide-progress]").textContent = done + " of " + inputs.length + " complete";
        checklistContainer.querySelector("[data-department-guide-progress-bar]").style.width = ((done / inputs.length) * 100).toFixed(1) + "%";
        inputs.forEach((input) => {
          const label = input.closest("label");
          label.classList.toggle("is-complete", input.checked);
          label.querySelector("[data-department-guide-state]").textContent = input.checked ? "Complete" : "Next";
        });
      }
      inputs.forEach((input) => {
        const itemKey = input.dataset.departmentGuideItem;
        if (saved[itemKey] === undefined && initiallyComplete.has(itemKey)) saved[itemKey] = true;
        input.checked = saved[itemKey] === true;
        input.addEventListener("change", () => {
          saved[itemKey] = input.checked;
          try { window.localStorage.setItem(key, JSON.stringify(saved)); } catch (error) { /* optional */ }
          updateChecklist();
        });
      });
      updateChecklist();
    }

    if (!explorer) return;
    loadBudgetData().then((data) => {
      // Explicit Board-department rollup. Financial schedules, transfers,
      // autonomous entities, Constitutional Officers, and program-only
      // accounting rows are intentionally absent. Known subprograms are
      // consolidated into the department that manages them.
      const boardDepartmentNames = new Map([
        ["building construction and maintenance", "Building Construction & Maintenance"],
        ["building department", "Building"],
        ["code compliance", "Code Compliance"],
        ["code compliance beach", "Code Compliance"],
        ["code compliance street", "Code Compliance"],
        ["county administration", "County Administration Departments"],
        ["human resources", "County Administration Departments"],
        ["office of management and budget", "Office of Management and Budget"],
        ["office of the county attorney", "Office of the County Attorney"],
        ["purchasing", "Purchasing"],
        ["extension office", "County Administration Departments"],
        ["geographic info systems", "County Administration Departments"],
        ["housing and urban development", "County Administration Departments"],
        ["county libraries", "County Administration Departments"],
        ["libraries", "County Administration Departments"],
        ["probation services", "County Administration Departments"],
        ["veteran services", "County Administration Departments"],
        ["eagle springs golf and recreation center", "Parks & Recreation"],
        ["eagle springs grill", "Parks & Recreation"],
        ["recreation", "Parks & Recreation"],
        ["culture and recreation senior centers and mainstreet", "Parks & Recreation"],
        ["emergency management", "Emergency Management"],
        ["engineering services", "Engineering Department"],
        ["environmental services", "Environmental Services"],
        ["solid waste", "Environmental Services"],
        ["mosquito control", "Environmental Services"],
        ["mosquito control state aid", "Environmental Services"],
        ["soil conservation", "Environmental Services"],
        ["mossy head wastewater treatment facility", "Engineering Department"],
        ["planning", "Planning"],
        ["planning short term rental", "Planning"],
        ["public works", "Public Works"],
        ["tourism administration", "Tourism Administration"],
        ["marketing", "Tourism Administration"],
        ["tourism marketing", "Tourism Administration"],
        ["communications", "Tourism Administration"],
        ["tourism communications", "Tourism Administration"],
        ["sales and visitors center", "Tourism Administration"],
        ["north walton tourist development tax", "Tourism Administration"],
        ["tourism public safety", "Tourism Administration"],
        ["south walton fire lifeguard services", "Tourism Administration"],
        ["beach operations", "Beach Operations"],
        ["beach renourishment", "Beach Operations"],
        ["beach tram", "Beach Operations"]
      ]);
      const sourceKeyAliases = new Map([
        ["tourism marketing", "marketing"],
        ["tourism communications", "communications"],
        ["tourism sales and visitor center", "sales and visitors center"],
        ["tourism sales and visitors center", "sales and visitors center"],
        ["tourism beach tram", "beach tram"],
        ["tourism beach operations", "beach operations"],
        ["code compliance beach", "code compliance"],
        ["code compliance street", "code compliance"],
        ["engineering department", "engineering services"],
        ["county libraries", "libraries"],
        ["probation", "probation services"],
        ["procurement", "purchasing"],
        ["environmental resources", "environmental services"],
        ["planning short term rental", "planning"]
      ]);
      function rollupSourceKey(name) {
        const rawKey = normalizeDeptName(name || "");
        if (sourceKeyAliases.has(rawKey)) return sourceKeyAliases.get(rawKey);
        return normalizeDeptName(departmentDisplayName(name || ""));
      }
      const groups = new Map();
      (data.expenditures || []).forEach((row) => {
        const sourceKey = rollupSourceKey(row.Dept_Name);
        const rawName = boardDepartmentNames.get(sourceKey);
        if (!rawName) return;
        const key = normalizeDeptName(rawName);
        if (!groups.has(key)) groups.set(key, { key, name: rawName, current: 0, prior: 0, personnel: 0, contracts: 0, internal: 0, operating: 0, capital: 0, priorPersonnel: 0, priorContracts: 0, priorInternal: 0, priorOperating: 0, priorCapital: 0, rows: [] });
        const group = groups.get(key);
        const amount = Number(row.FY2027_Proposed) || 0;
        const priorAmount = Number(row.FY2026_Original_Budget || row.FY2026_Budget) || 0;
        group.current += amount;
        group.prior += priorAmount;
        group.rows.push(row);
        const type = String(row.Object_Type || "").toLowerCase();
        const objectText = (String(row.Object_Name || "") + " " + String(row.Note || "")).toLowerCase();
        if (type.indexOf("personnel") >= 0) { group.personnel += amount; group.priorPersonnel += priorAmount; }
        else if (sourceKey === "tourism public safety" || /internal service|indirect|fleet|insurance allocation/.test(type + " " + objectText)) { group.internal += amount; group.priorInternal += priorAmount; }
        else if (sourceKey === "south walton fire lifeguard services" || String(row.Contract_Status || "").trim() || /contract|professional service/.test(objectText)) { group.contracts += amount; group.priorContracts += priorAmount; }
        else if (type.indexOf("capital") >= 0) { group.capital += amount; group.priorCapital += priorAmount; }
        else { group.operating += amount; group.priorOperating += priorAmount; }
      });
      // Code Compliance's source schedule carries the full FY 2026 account
      // baseline on both its Beach and Street labels, while FY 2027 is
      // actually split between them. Use each account's single prior-year
      // baseline so the comparison does not double-count FY 2026.
      const codeComplianceGroup = groups.get("code compliance");
      if (codeComplianceGroup) {
        const priorByAccount = new Map();
        codeComplianceGroup.rows.forEach((row) => {
          const accountKey = String(row.Object_Code || row.Object_Name || "").trim();
          const prior = Number(row.FY2026_Original_Budget || row.FY2026_Budget) || 0;
          priorByAccount.set(accountKey, Math.max(priorByAccount.get(accountKey) || 0, prior));
        });
        codeComplianceGroup.prior = Array.from(priorByAccount.values()).reduce((sum, amount) => sum + amount, 0);
      }
      const departments = Array.from(groups.values()).filter((group) => group.current > 0).sort((a, b) => b.current - a.current);
      const staffingByDept = new Map();
      const priorStaffingByDept = new Map();
      const staffingByOffice = new Map();
      const priorStaffingByOffice = new Map();
      (data.staffing || []).forEach((row) => {
        const sourceKey = rollupSourceKey(row.Dept_Name);
        const canonicalName = boardDepartmentNames.get(sourceKey);
        if (!canonicalName) return;
        const key = normalizeDeptName(canonicalName);
        staffingByDept.set(key, (staffingByDept.get(key) || 0) + (Number(row[2027]) || 0));
        priorStaffingByDept.set(key, (priorStaffingByDept.get(key) || 0) + (Number(row[2026]) || 0));
        staffingByOffice.set(sourceKey, (staffingByOffice.get(sourceKey) || 0) + (Number(row[2027]) || 0));
        priorStaffingByOffice.set(sourceKey, (priorStaffingByOffice.get(sourceKey) || 0) + (Number(row[2026]) || 0));
      });
      const performanceByDept = new Map();
      (data.performanceMeasures || []).forEach((row) => {
        const sourceKey = rollupSourceKey(row.Dept_Name);
        const canonicalName = boardDepartmentNames.get(sourceKey);
        if (!canonicalName) return;
        const key = normalizeDeptName(canonicalName);
        if (!performanceByDept.has(key)) performanceByDept.set(key, []);
        performanceByDept.get(key).push(row);
      });
      const narrativeByDept = new Map();
      (data.departmentNarratives || []).forEach((row) => {
        const sourceKey = rollupSourceKey(row.Dept_Name);
        const canonicalName = boardDepartmentNames.get(sourceKey);
        if (canonicalName && !narrativeByDept.has(normalizeDeptName(canonicalName))) narrativeByDept.set(normalizeDeptName(canonicalName), row.Narrative || "");
      });
      const total = departments.reduce((sum, dept) => sum + dept.current, 0);

      function compactCurrency(value) {
        if (Math.abs(value) >= 1000000) return "$" + (value / 1000000).toLocaleString("en-US", { maximumFractionDigits: 1 }) + "M";
        return formatCurrency(value);
      }
      function pageHref(name) {
        const special = { "building":"building-department.html", "parks and recreation":"recreation.html", "environmental services":"environmental-resources.html", "beach operations":"tourism-beach-operations.html", "engineering services":"engineering-department.html", "county libraries":"libraries.html" };
        const key = normalizeDeptName(name);
        return special[key] || key.replace(/ and /g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".html";
      }
      function officeHref(name) {
        const key = normalizeDeptName(name);
        const combined = {
          "marketing": "tourism-administration.html",
          "communications": "tourism-administration.html",
          "sales and visitors center": "tourism-administration.html",
          "north walton tourist development tax": "tourism-administration.html",
          "tourism public safety": "tourism-lifeguard-services-and-beach-safety.html",
          "south walton fire lifeguard services": "tourism-lifeguard-services-and-beach-safety.html",
          "beach renourishment": "tourism-beach-operations.html",
          "beach tram": "tourism-beach-operations.html",
          "eagle springs golf and recreation center": "eagle-springs-golf-and-recreation-center.html",
          "eagle springs grill": "eagle-springs-grill.html",
          "culture and recreation senior centers and mainstreet": "recreation.html",
          "environmental services": "environmental-resources.html",
          "engineering services": "engineering-department.html",
          "housing and urban development": "housing-and-urban-development.html",
          "probation services": "probation.html",
          "building construction and maintenance": "building-construction-and-maintenance.html",
          "mosquito control state aid": "mosquito-control.html",
          "office of management and budget": "office-of-management-and-budget.html"
        };
        return combined[key] || pageHref(name);
      }
      const costCellLinkOptions = { plain: true, linkClass: "wc-table-row-link" };
      function operatingRowsFor(rows) {
        return rows.filter((row) => {
          const t = String(row.Object_Type || "").toLowerCase();
          return t.indexOf("personnel") < 0 && t.indexOf("capital") < 0;
        });
      }
      function capitalRowsFor(rows) {
        return rows.filter((row) => String(row.Object_Type || "").toLowerCase().indexOf("capital") >= 0);
      }
      function buildCostCell(rowsForKind, amount, label, isPersonnel, popupDetailsArr) {
        if (!amount) return '<td class="wc-num">' + formatCurrency(amount) + '</td>';
        const popup = isPersonnel
          ? personnelDollarButton(rowsForKind, label, formatCurrency(amount), costCellLinkOptions)
          : budgetLinesDollarButton(rowsForKind, formatCurrency(amount), label, costCellLinkOptions);
        if (popup.detail) popupDetailsArr.push(popup.detail);
        return '<td class="wc-num">' + popup.html + '</td>';
      }
      function renderDetail(dept, options) {
        const standalone = !!(options && options.standalone);
        const ledgerSection = explorer.querySelector("[data-department-ledger]");
        if (ledgerSection) ledgerSection.hidden = true;
        const cardsSection = explorer.querySelector(".wc-department-explorer");
        if (cardsSection) cardsSection.hidden = true;
        const change = dept.current - dept.prior;
        const officesByKey = new Map();
        dept.rows.forEach((row) => {
          const rawOfficeKey = normalizeDeptName(row.Dept_Name || dept.name);
          let officeName = departmentDisplayName(row.Dept_Name || dept.name);
          let officeKey = rollupSourceKey(row.Dept_Name || dept.name);
          if (rawOfficeKey === "code compliance" || rawOfficeKey === "code compliance beach" || rawOfficeKey === "code compliance street") {
            officeName = "Code Compliance";
            officeKey = "code compliance";
          } else if (rawOfficeKey === "planning" || rawOfficeKey === "planning short term rental") {
            officeName = "Planning";
            officeKey = "planning";
          } else if (rawOfficeKey === "south walton fire lifeguard services") {
            officeName = "South Walton Fire Lifeguard Services";
          } else if (rawOfficeKey === "tourism public safety") {
            officeName = "Tourism Public Safety";
          }
          if (!officesByKey.has(officeKey)) officesByKey.set(officeKey, { key: officeKey, name: officeName, prior: 0, current: 0, personnel: 0, operating: 0, capital: 0, rows: [] });
          const office = officesByKey.get(officeKey);
          const amount = Number(row.FY2027_Proposed) || 0;
          office.current += amount;
          office.prior += Number(row.FY2026_Original_Budget || row.FY2026_Budget) || 0;
          office.rows.push(row);
          const type = String(row.Object_Type || "").toLowerCase();
          if (type.indexOf("personnel") >= 0) office.personnel += amount;
          else if (type.indexOf("capital") >= 0) office.capital += amount;
          else office.operating += amount;
        });
        const offices = Array.from(officesByKey.values()).filter((office) => office.current || office.prior).sort((a, b) => b.current - a.current);
        if (dept.key === "code compliance" && offices.length === 1) offices[0].prior = dept.prior;

        const popupDetails = [];
        function costCellHtml(rowsForKind, amount, label, isPersonnel) {
          return buildCostCell(rowsForKind, amount, label, isPersonnel, popupDetails);
        }

        const officeRows = offices.map((office) => {
          const officeChange = office.current - office.prior;
          const currentFte = staffingByOffice.get(office.key) || 0;
          const priorFte = priorStaffingByOffice.get(office.key) || 0;
          const fteChange = currentFte - priorFte;
          return '<tr><td><a class="wc-table-row-link" href="' + officeHref(office.name) + '">' + escapeHtml(office.name) + '</a></td><td class="wc-num">' + formatNumber(currentFte) + '</td><td class="wc-num ' + (fteChange > 0 ? "is-increase" : fteChange < 0 ? "is-decrease" : "") + '">' + (fteChange > 0 ? "+" : fteChange < 0 ? "−" : "") + formatNumber(Math.abs(fteChange)) + '</td><td class="wc-num">' + formatCurrency(office.prior) + '</td><td class="wc-num">' + formatCurrency(office.current) + '</td><td class="wc-num ' + (officeChange > 0 ? "is-increase" : officeChange < 0 ? "is-decrease" : "") + '">' + (officeChange > 0 ? "+" : officeChange < 0 ? "−" : "") + formatCurrency(Math.abs(officeChange)) + '</td>' +
            costCellHtml(office.rows, office.personnel, office.name, true) +
            costCellHtml(operatingRowsFor(office.rows), office.operating, office.name + " Operating Accounts", false) +
            costCellHtml(capitalRowsFor(office.rows), office.capital, office.name + " Capital Requests", false) +
            '</tr>';
        });
        const currentDeptFte = staffingByDept.get(dept.key) || 0;
        const priorDeptFte = priorStaffingByDept.get(dept.key) || 0;
        const deptFteChange = currentDeptFte - priorDeptFte;
        const operatingTotal = dept.contracts + dept.internal + dept.operating;
        officeRows.push('<tr class="wc-table-total-row"><td>Total ' + escapeHtml(dept.name) + '</td><td class="wc-num">' + formatNumber(currentDeptFte) + '</td><td class="wc-num">' + (deptFteChange > 0 ? "+" : deptFteChange < 0 ? "−" : "") + formatNumber(Math.abs(deptFteChange)) + '</td><td class="wc-num">' + formatCurrency(dept.prior) + '</td><td class="wc-num">' + formatCurrency(dept.current) + '</td><td class="wc-num">' + (change > 0 ? "+" : change < 0 ? "−" : "") + formatCurrency(Math.abs(change)) + '</td><td class="wc-num">' + formatCurrency(dept.personnel) + '</td><td class="wc-num">' + formatCurrency(operatingTotal) + '</td><td class="wc-num">' + formatCurrency(dept.capital) + '</td></tr>');
        const officeLedger = renderTable({ caption: dept.name + " Office Budget Ledger", columns: [{ label: "Office / Cost Component" }, { label: "FY 2027 FTE", num: true }, { label: "FTE +/−", num: true }, { label: "FY 2026 Budget", num: true }, { label: "FY 2027 Proposed", num: true }, { label: "Budget +/−", num: true }, { label: "Personnel", num: true }, { label: "Operating", num: true }, { label: "Capital", num: true }], bodyRows: officeRows });

        const combinedStatement = DEPARTMENT_BUDGET_COMBINED_FUNCTION_STATEMENTS[dept.name];
        const ownNarrative = combinedStatement ? [] : getDepartmentNarrative((dept.rows[0] && dept.rows[0].Dept_Name) || dept.name);
        const functionStatement = combinedStatement || ownNarrative[0] || "";
        const functionStatementHtml = functionStatement ? '<p class="wc-department-detail-function">' + escapeHtml(functionStatement) + '</p>' : "";

        const detail = explorer.querySelector("[data-department-detail]");
        detail.innerHTML = '<button type="button" class="wc-department-detail-close" data-department-detail-close>' + (standalone ? "Back to Department Explorer" : "Close Department Ledger") + '</button><div class="wc-department-detail-head"><div><span>FY 2027 proposed department budget</span><h3>' + escapeHtml(dept.name) + '</h3>' + functionStatementHtml + '</div><div><strong>' + formatCurrency(dept.current) + '</strong><small>' + (change >= 0 ? "+" : "−") + formatCurrency(Math.abs(change)) + ' (' + (dept.prior ? ((change / dept.prior) * 100).toFixed(1) : "0.0") + '%) from FY 2026</small></div></div><div class="wc-department-office-ledger">' + officeLedger + '</div>' + popupDetails.join("");
        detail.hidden = false;
        detail.querySelector("[data-department-detail-close]").addEventListener("click", () => {
          if (standalone) {
            window.location.href = "department-budget.html";
            return;
          }
          detail.hidden = true;
          const cardsSection = explorer.querySelector(".wc-department-explorer");
          if (cardsSection) cardsSection.hidden = false;
        });
        if (standalone) document.title = dept.name + " Budget Ledger — Walton County FY 2027 Budget";
      }

      const ledgerPopupDetails = [];
      const ledgerBody = departments.map((dept) => {
        const change = dept.current - dept.prior;
        const deptOperatingTotal = dept.contracts + dept.internal + dept.operating;
        return '<tr><td><button type="button" class="wc-view-budget-lines-toggle wc-table-row-link" data-department-ledger-key="' + escapeHtml(dept.key) + '">' + escapeHtml(dept.name) + '</button></td><td class="wc-num">' + formatCurrency(dept.prior) + '</td><td class="wc-num">' + formatCurrency(dept.current) + '</td><td class="wc-num ' + (change > 0 ? "is-increase" : change < 0 ? "is-decrease" : "") + '">' + (change > 0 ? "+" : change < 0 ? "−" : "") + formatCurrency(Math.abs(change)) + '</td>' +
          buildCostCell(dept.rows, dept.personnel, dept.name, true, ledgerPopupDetails) +
          buildCostCell(operatingRowsFor(dept.rows), deptOperatingTotal, dept.name + " Operating Accounts", false, ledgerPopupDetails) +
          buildCostCell(capitalRowsFor(dept.rows), dept.capital, dept.name + " Capital Requests", false, ledgerPopupDetails) +
          '</tr>';
      });
      ledgerBody.push('<tr class="wc-table-total-row"><td>Total Board Departments</td><td class="wc-num">' + formatCurrency(departments.reduce((sum, dept) => sum + dept.prior, 0)) + '</td><td class="wc-num">' + formatCurrency(total) + '</td><td class="wc-num">' + formatCurrency(total - departments.reduce((sum, dept) => sum + dept.prior, 0)) + '</td><td class="wc-num">' + formatCurrency(departments.reduce((sum, dept) => sum + dept.personnel, 0)) + '</td><td class="wc-num">' + formatCurrency(departments.reduce((sum, dept) => sum + dept.contracts + dept.internal + dept.operating, 0)) + '</td><td class="wc-num">' + formatCurrency(departments.reduce((sum, dept) => sum + dept.capital, 0)) + '</td></tr>');
      const ledgerTable = renderTable({ caption: "Board Department Budget Ledger", columns: [{ label: "Department" }, { label: "FY 2026 Budget", num: true }, { label: "FY 2027 Proposed", num: true }, { label: "+/−", num: true }, { label: "Personnel", num: true }, { label: "Operating", num: true }, { label: "Capital", num: true }], bodyRows: ledgerBody });

      const totalCapital = departments.reduce((sum, dept) => sum + dept.capital, 0);
      const totalPriorCapital = departments.reduce((sum, dept) => sum + dept.priorCapital, 0);
      // The explorer card headline reports personnel + operating only --
      // capital outlay is presented on the Capital Budget pages, so it is
      // left out of both the amount shown here and its FY 2026 comparison.
      const totalExcludingCapital = total - totalCapital;
      const totalPriorExcludingCapital = departments.reduce((sum, dept) => sum + dept.prior, 0) - totalPriorCapital;
      const totalFte = Array.from(staffingByDept.values()).reduce((sum, fte) => sum + fte, 0);
      // Countywide FY2027 proposed expenditures, same exclusions the
      // Personnel Explorer/Capital Explorer use for "Total All Funds": the
      // Self-Insurance Fund (503) and interfund transfers/other financing
      // sources are internal pass-throughs, not real county spending.
      const totalCountywideBudget2027 = (data.expenditures || [])
        .filter((r) => !CONSOLIDATED_SCHEDULE_EXCLUDED_FUND_CODES.has(fundCodeForRow(r)) && !isOtherFinancingExpenseRow(r))
        .reduce((sum, r) => sum + (Number(r.FY2027_Proposed) || 0), 0);
      const boardShareOfBudgetPct = totalCountywideBudget2027 ? (totalExcludingCapital / totalCountywideBudget2027 * 100) : 0;
      const totalPersonnel = departments.reduce((sum, dept) => sum + dept.personnel, 0);
      const totalOperatingAll = departments.reduce((sum, dept) => sum + dept.contracts + dept.internal + dept.operating, 0);
      function costCategoryPct(value) { return total ? (value / total * 100).toFixed(1) : "0.0"; }
      const costCategorySplitHtml = '<div class="wc-revenue-support-split"><div><span>Total Personnel</span><div class="wc-revenue-support-amount-row"><b>' + escapeHtml(compactCurrency(totalPersonnel)) + '</b><small>' + costCategoryPct(totalPersonnel) + '%</small></div></div><div><span>Total Operating</span><div class="wc-revenue-support-amount-row"><b>' + escapeHtml(compactCurrency(totalOperatingAll)) + '</b><small>' + costCategoryPct(totalOperatingAll) + '%</small></div></div><div><span>Total Capital</span><div class="wc-revenue-support-amount-row"><b>' + escapeHtml(compactCurrency(totalCapital)) + '</b><small>' + costCategoryPct(totalCapital) + '%</small></div></div></div>';
      const compositionHtml = '<div class="wc-revenue-card-summary-row"><p class="wc-revenue-concentration-summary"><strong>' + Math.round(boardShareOfBudgetPct) + '%</strong> of the total expenditure budget is board department funding.</p>' + costCategorySplitHtml + '</div>';
      const deptCards = departments.map((dept) => {
        const fte = staffingByDept.get(dept.key) || 0;
        const priorFte = priorStaffingByDept.get(dept.key) || 0;
        const fteDelta = fte - priorFte;
        const change = dept.current - dept.prior;
        const changePct = dept.prior ? (change / Math.abs(dept.prior) * 100) : null;
        const shareOfBoard = totalExcludingCapital ? (dept.current / totalExcludingCapital * 100) : 0;
        const costChangeHtml = '<div class="wc-revenue-comparison"><span>Compared to Prior Year</span><div><strong>' + (change >= 0 ? "+" : "−") + escapeHtml(compactCurrency(Math.abs(change))) + '</strong><em>' + (changePct === null ? "No FY 2026 base" : (changePct >= 0 ? "+" : "") + changePct.toFixed(1) + "%") + '</em></div></div>';
        const fteChangeHtml = '<div class="wc-revenue-trend"><small>FTE Change</small><b>' + (fteDelta >= 0 ? "+" : "−") + formatNumber(Math.abs(fteDelta)) + ' FTE</b></div>';
        return '<a href="department-budget.html?dept=' + encodeURIComponent(dept.key) + '" data-department-key="' + escapeHtml(dept.key) + '"><div class="wc-revenue-card-head"><div class="wc-revenue-card-head-main"><strong>' + escapeHtml(dept.name) + '</strong><b class="wc-revenue-card-amount">' + escapeHtml(compactCurrency(dept.current)) + '</b><small class="wc-revenue-card-share">' + shareOfBoard.toFixed(1) + '% of board department budget</small></div><div class="wc-revenue-card-badge-stack"><span class="wc-personnel-dept-fte-badge">' + escapeHtml(formatNumber(fte)) + ' FTE</span></div></div><div class="wc-revenue-snapshot-change' + (change < 0 ? " is-down" : "") + '">' + costChangeHtml + fteChangeHtml + '</div></a>';
      }).join("");

      explorer.innerHTML = '<section class="wc-department-explorer"><div class="wc-department-explorer-head"><div><h2>Department Budget Explorer</h2><p>Walton County&rsquo;s ' + departments.length + ' Board departments budget a combined ' + escapeHtml(compactCurrency(totalExcludingCapital)) + ' and employ ' + escapeHtml(formatNumber(totalFte)) + ' FTE. Select any department below to connect its spending plan to services and performance.</p></div><div class="wc-department-explorer-total"><span>Total Board Department Budget</span><strong>' + formatCurrency(totalExcludingCapital) + '</strong><button type="button" class="wc-department-ledger-trigger" data-department-ledger-open>View Department Ledger</button></div></div>' + compositionHtml + '<div class="wc-department-budget-cards">' + deptCards + '</div></section><section class="wc-department-ledger" data-department-ledger hidden><button type="button" class="wc-department-detail-close" data-department-ledger-close>Close Department Ledger</button><h2>Board Department Budget Ledger</h2><p>Compare proposed spending and major cost categories across Board departments. Select a department name for its service and accountability profile.</p>' + ledgerTable + '</section><section class="wc-department-detail" data-department-detail hidden></section>' + ledgerPopupDetails.join("");
      const departmentTotalCallout = explorer.querySelector(".wc-department-explorer-total");
      const departmentLedgerButton = explorer.querySelector("[data-department-ledger-open]");
      const departmentTotalAmount = departmentTotalCallout && departmentTotalCallout.querySelector(":scope > strong");
      if (departmentTotalCallout) {
        const priorTotal = totalPriorExcludingCapital;
        const change = totalExcludingCapital - priorTotal;
        const changePercent = priorTotal ? change / Math.abs(priorTotal) * 100 : null;
        const changeLine = document.createElement("small");
        changeLine.className = change < 0 ? "is-decrease" : change > 0 ? "is-increase" : "";
        changeLine.innerHTML = (change >= 0 ? "+" : "−") + escapeHtml(compactCurrency(Math.abs(change))) + ' (' + (changePercent === null ? "No FY 2026 base" : (changePercent >= 0 ? "+" : "−") + Math.abs(changePercent).toFixed(1) + "%") + ')';
        departmentTotalCallout.insertBefore(changeLine, departmentLedgerButton || null);
        const primary = document.createElement("div");
        primary.className = "wc-department-explorer-total-primary";
        const totalLabel = departmentTotalCallout.querySelector(":scope > span");
        [totalLabel, departmentTotalAmount, changeLine, departmentLedgerButton].forEach((element) => { if (element) primary.appendChild(element); });
        departmentTotalCallout.appendChild(primary);
      }
      const ledger = explorer.querySelector("[data-department-ledger]");
      const explorerCards = explorer.querySelector(".wc-department-explorer");
      explorer.querySelector("[data-department-ledger-open]").addEventListener("click", () => {
        const detailSection = explorer.querySelector("[data-department-detail]");
        if (detailSection) detailSection.hidden = true;
        if (explorerCards) explorerCards.hidden = true;
        ledger.hidden = false;
      });
      explorer.querySelector("[data-department-ledger-close]").addEventListener("click", () => {
        ledger.hidden = true;
        if (explorerCards) explorerCards.hidden = false;
      });
      explorer.querySelectorAll("[data-department-ledger-key]").forEach((button) => button.addEventListener("click", () => renderDetail(groups.get(button.dataset.departmentLedgerKey))));
      const deptParam = new URLSearchParams(window.location.search).get("dept");
      if (deptParam && groups.has(deptParam)) {
        renderDetail(groups.get(deptParam), { standalone: true });
        const directoryToggle = document.getElementById("departmentListToggle");
        const directoryHeading = document.getElementById("departmentListHeading");
        const directorySection = document.getElementById("departmentListSection");
        if (directoryToggle) directoryToggle.style.display = "none";
        if (directoryHeading) directoryHeading.hidden = false;
        if (directorySection) directorySection.hidden = false;
      }
    }).catch((error) => {
      console.error("WCBudgetData: failed to load department budget explorer", error);
      explorer.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + '</div>';
    });
  }

  function initConstitutionalOfficersBudgetPage() {
    const explorer = document.getElementById("constitutional-budget-explorer");
    if (!explorer) return;
    loadBudgetData().then((data) => {
      const allowed = new Set(["board of county commissioners", "clerk of court", "property appraiser", "supervisor of elections", "tax collector", "walton county sheriffs office"]);
      const groups = new Map();
      (data.expenditures || []).forEach((row) => {
        const key = normalizeDeptName(row.Dept_Name);
        if (!allowed.has(key)) return;
        if (!groups.has(key)) groups.set(key, { key, name: row.Dept_Name, prior: 0, current: 0, personnel: 0, operating: 0, capital: 0, other: 0, priorPersonnel: 0, priorOperating: 0, priorCapital: 0, priorOther: 0, rows: [] });
        const office = groups.get(key);
        const current = Number(row.FY2027_Proposed) || 0;
        const priorAmount = Number(row.FY2026_Original_Budget || row.FY2026_Budget) || 0;
        office.current += current;
        office.prior += priorAmount;
        office.rows.push(row);
        const type = normalizeDeptName(row.Object_Type);
        if (type === "personnel services") { office.personnel += current; office.priorPersonnel += priorAmount; }
        else if (type === "capital outlay") { office.capital += current; office.priorCapital += priorAmount; }
        else if (type === "operating expenditures") { office.operating += current; office.priorOperating += priorAmount; }
        else { office.other += current; office.priorOther += priorAmount; }
      });
      const offices = Array.from(groups.values()).sort((a, b) => b.current - a.current);
      const staffingAlias = { "walton county sheriffs office": "sheriff", "clerk of court": "clerk of circuit court" };
      const staffing = new Map();
      const priorStaffing = new Map();
      (data.staffing || []).forEach((row) => {
        const key = normalizeDeptName(row.Dept_Name);
        staffing.set(key, (staffing.get(key) || 0) + (Number(row[2027]) || 0));
        priorStaffing.set(key, (priorStaffing.get(key) || 0) + (Number(row[2026]) || 0));
      });
      offices.forEach((office) => {
        office.fte = staffing.get(staffingAlias[office.key] || office.key) || 0;
        office.priorFte = priorStaffing.get(staffingAlias[office.key] || office.key) || 0;
      });
      const total = offices.reduce((sum, office) => sum + office.current, 0);
      function pct(value, base) { return base ? (value / base * 100).toFixed(1) : "0.0"; }
      function compactCurrency(value) {
        if (Math.abs(value) >= 1000000) return "$" + (value / 1000000).toLocaleString("en-US", { maximumFractionDigits: 1 }) + "M";
        return formatCurrency(value);
      }
      // Statement of Function sheet (cache.departmentNarratives) uses each
      // office's own formal name, which doesn't always match the Dept_Name
      // used on the expenditure schedule (see the "allowed" Set above) --
      // mapped here so getDepartmentNarrative resolves to the right row.
      const CONSTITUTIONAL_OFFICER_NARRATIVE_NAMES = {
        "board of county commissioners": "Board of County Commissioners",
        "clerk of court": "Clerk of Courts & County Comptroller",
        "property appraiser": "Property Appraiser",
        "supervisor of elections": "Supervisor of Elections",
        "tax collector": "Tax Collector",
        "walton county sheriffs office": "Sheriff's Office"
      };
      function renderOffice(office) {
        const detail = explorer.querySelector("[data-constitutional-detail]");
        const constitutionalLedgerSection = explorer.querySelector("[data-constitutional-ledger]");
        if (constitutionalLedgerSection) constitutionalLedgerSection.hidden = true;
        const constitutionalCardsSection = explorer.querySelector(".wc-department-explorer");
        if (constitutionalCardsSection) constitutionalCardsSection.hidden = true;
        const change = office.current - office.prior;
        const officeNarrative = getDepartmentNarrative(CONSTITUTIONAL_OFFICER_NARRATIVE_NAMES[office.key] || office.name);
        const functionStatementHtml = officeNarrative[0] ? '<p class="wc-department-detail-function">' + escapeHtml(officeNarrative[0]) + '</p>' : "";
        const lineItemsByKey = new Map();
        office.rows.forEach((row) => {
          const lineName = String(row.Object_Name || row.Object_Type || "Other").trim() || "Other";
          const lineType = String(row.Object_Type || "Other").trim() || "Other";
          const lineKey = lineName + "|" + lineType;
          if (!lineItemsByKey.has(lineKey)) lineItemsByKey.set(lineKey, { name: lineName, type: lineType, prior: 0, current: 0 });
          const line = lineItemsByKey.get(lineKey);
          line.current += Number(row.FY2027_Proposed) || 0;
          line.prior += Number(row.FY2026_Original_Budget || row.FY2026_Budget) || 0;
        });
        const lineItems = Array.from(lineItemsByKey.values()).filter((line) => line.current || line.prior).sort((a, b) => b.current - a.current);
        const lineItemRows = lineItems.map((line) => {
          const lineChange = line.current - line.prior;
          return '<tr><td>' + escapeHtml(line.name) + '</td><td>' + escapeHtml(line.type) + '</td><td class="wc-num">' + formatCurrency(line.prior) + '</td><td class="wc-num">' + formatCurrency(line.current) + '</td><td class="wc-num ' + (lineChange > 0 ? "is-increase" : lineChange < 0 ? "is-decrease" : "") + '">' + (lineChange > 0 ? "+" : lineChange < 0 ? "−" : "") + formatCurrency(Math.abs(lineChange)) + '</td></tr>';
        });
        lineItemRows.push('<tr class="wc-table-total-row"><td>Total ' + escapeHtml(office.name) + '</td><td>Office total</td><td class="wc-num">' + formatCurrency(office.prior) + '</td><td class="wc-num">' + formatCurrency(office.current) + '</td><td class="wc-num">' + (change > 0 ? "+" : change < 0 ? "−" : "") + formatCurrency(Math.abs(change)) + '</td></tr>');
        const officeLedger = renderTable({ caption: office.name + " Budget Ledger", columns: [{ label: "Budget Line Item" }, { label: "Type" }, { label: "FY 2026 Budget", num: true }, { label: "FY 2027 Proposed", num: true }, { label: "Budget +/−", num: true }], bodyRows: lineItemRows });
        detail.innerHTML = '<button type="button" class="wc-department-detail-close" data-constitutional-detail-close>Close Officer Detail</button><div class="wc-department-detail-head"><div><span>FY 2027 proposed office budget</span><h3>' + escapeHtml(office.name) + '</h3>' + functionStatementHtml + '</div><div><strong>' + formatCurrency(office.current) + '</strong><small>' + (change > 0 ? "+" : change < 0 ? "−" : "") + formatCurrency(Math.abs(change)) + ' from FY 2026</small></div></div><div class="wc-department-office-ledger">' + officeLedger + '</div>';
        detail.hidden = false;
        detail.querySelector("[data-constitutional-detail-close]").addEventListener("click", () => {
          detail.hidden = true;
          const cardsSection = explorer.querySelector(".wc-department-explorer");
          if (cardsSection) cardsSection.hidden = false;
        });
      }
      const ledgerRows = offices.map((office) => {
        const change = office.current - office.prior;
        return '<tr><td><button type="button" class="wc-view-budget-lines-toggle wc-table-row-link" data-constitutional-key="' + office.key + '">' + escapeHtml(office.name) + '</button></td><td class="wc-num">' + formatNumber(office.fte) + '</td><td class="wc-num">' + formatCurrency(office.prior) + '</td><td class="wc-num">' + formatCurrency(office.current) + '</td><td class="wc-num ' + (change > 0 ? "is-increase" : change < 0 ? "is-decrease" : "") + '">' + (change > 0 ? "+" : change < 0 ? "−" : "") + formatCurrency(Math.abs(change)) + '</td><td class="wc-num">' + formatCurrency(office.personnel) + '</td><td class="wc-num">' + formatCurrency(office.operating) + '</td><td class="wc-num">' + formatCurrency(office.capital + office.other) + '</td></tr>';
      });
      ledgerRows.push('<tr class="wc-table-total-row"><td>Total Constitutional Officers</td><td class="wc-num">' + formatNumber(offices.reduce((sum, office) => sum + office.fte, 0)) + '</td><td class="wc-num">' + formatCurrency(offices.reduce((sum, office) => sum + office.prior, 0)) + '</td><td class="wc-num">' + formatCurrency(total) + '</td><td class="wc-num">' + formatCurrency(total - offices.reduce((sum, office) => sum + office.prior, 0)) + '</td><td class="wc-num">' + formatCurrency(offices.reduce((sum, office) => sum + office.personnel, 0)) + '</td><td class="wc-num">' + formatCurrency(offices.reduce((sum, office) => sum + office.operating, 0)) + '</td><td class="wc-num">' + formatCurrency(offices.reduce((sum, office) => sum + office.capital + office.other, 0)) + '</td></tr>');
      const ledger = renderTable({ caption: "Constitutional Officers Budget Ledger", columns: [{ label: "Office" }, { label: "FTE", num: true }, { label: "FY 2026 Budget", num: true }, { label: "FY 2027 Proposed", num: true }, { label: "+/−", num: true }, { label: "Personnel", num: true }, { label: "Operating", num: true }, { label: "Capital & Other", num: true }], bodyRows: ledgerRows });
      const totalPersonnel = offices.reduce((sum, office) => sum + office.personnel, 0);
      const totalOperating = offices.reduce((sum, office) => sum + office.operating, 0);
      const totalCapital = offices.reduce((sum, office) => sum + office.capital, 0);
      const totalFte = offices.reduce((sum, office) => sum + office.fte, 0);
      const officePages = { "board of county commissioners": "board-of-county-commissioners.html", "clerk of court": "clerk-of-courts-and-county-comptroller.html", "property appraiser": "property-appraiser.html", "supervisor of elections": "supervisor-of-elections.html", "tax collector": "tax-collector.html", "walton county sheriffs office": "sheriffs-office.html" };
      // Countywide FY2027 proposed expenditures, same exclusions the
      // Department Explorer/Personnel Explorer use for "Total All Funds":
      // the Self-Insurance Fund (503) and interfund transfers/other
      // financing sources are internal pass-throughs, not real spending.
      const totalCountywideBudget2027 = (data.expenditures || [])
        .filter((r) => !CONSOLIDATED_SCHEDULE_EXCLUDED_FUND_CODES.has(fundCodeForRow(r)) && !isOtherFinancingExpenseRow(r))
        .reduce((sum, r) => sum + (Number(r.FY2027_Proposed) || 0), 0);
      const constitutionalShareOfBudgetPct = totalCountywideBudget2027 ? (total / totalCountywideBudget2027 * 100) : 0;
      const costCategorySplitHtml = '<div class="wc-revenue-support-split"><div><span>Total Personnel</span><div class="wc-revenue-support-amount-row"><b>' + escapeHtml(compactCurrency(totalPersonnel)) + '</b><small>' + pct(totalPersonnel, total) + '%</small></div></div><div><span>Total Operating</span><div class="wc-revenue-support-amount-row"><b>' + escapeHtml(compactCurrency(totalOperating)) + '</b><small>' + pct(totalOperating, total) + '%</small></div></div><div><span>Total Capital</span><div class="wc-revenue-support-amount-row"><b>' + escapeHtml(compactCurrency(totalCapital)) + '</b><small>' + pct(totalCapital, total) + '%</small></div></div></div>';
      const compositionHtml = '<div class="wc-revenue-card-summary-row"><p class="wc-revenue-concentration-summary"><strong>' + Math.round(constitutionalShareOfBudgetPct) + '%</strong> of the total expenditure budget is constitutional officer funding.</p>' + costCategorySplitHtml + '</div>';
      const officeCards = offices.map((office) => {
        const change = office.current - office.prior;
        const changePct = office.prior ? (change / Math.abs(office.prior) * 100) : null;
        const fteDelta = office.fte - office.priorFte;
        const shareOfTotal = total ? (office.current / total * 100) : 0;
        const costChangeHtml = '<div class="wc-revenue-comparison"><span>Compared to Prior Year</span><div><strong>' + (change >= 0 ? "+" : "−") + escapeHtml(compactCurrency(Math.abs(change))) + '</strong><em>' + (changePct === null ? "No FY 2026 base" : (changePct >= 0 ? "+" : "") + changePct.toFixed(1) + "%") + '</em></div></div>';
        const fteChangeHtml = '<div class="wc-revenue-trend"><small>FTE Change</small><b>' + (fteDelta >= 0 ? "+" : "−") + formatNumber(Math.abs(fteDelta)) + ' FTE</b></div>';
        const officeHref = officePages[office.key];
        const tag = officeHref ? "a" : "button";
        const openAttr = officeHref ? ' href="' + escapeHtml(officeHref) + '"' : ' type="button" data-constitutional-key="' + office.key + '"';
        return '<' + tag + openAttr + '><div class="wc-revenue-card-head"><div class="wc-revenue-card-head-main"><strong>' + escapeHtml(office.name) + '</strong><b class="wc-revenue-card-amount">' + escapeHtml(compactCurrency(office.current)) + '</b><small class="wc-revenue-card-share">' + shareOfTotal.toFixed(1) + '% of total proposed budget</small></div><div class="wc-revenue-card-badge-stack"><span class="wc-personnel-dept-fte-badge">' + escapeHtml(formatNumber(office.fte)) + ' FTE</span></div></div><div class="wc-revenue-snapshot-change' + (change < 0 ? " is-down" : "") + '">' + costChangeHtml + fteChangeHtml + '</div></' + tag + '>';
      }).join("");
      explorer.innerHTML = '<section class="wc-department-explorer"><div class="wc-department-explorer-head"><div><h2>Constitutional Officers Budget Explorer</h2><p>Walton County&rsquo;s ' + (offices.length - 1) + ' independently elected offices and the Board of County Commissioners budget a combined ' + escapeHtml(compactCurrency(total)) + ' and employ ' + escapeHtml(formatNumber(totalFte)) + ' FTE. Select an office below to review its proposed budget, staffing, major cost categories, and available supporting information.</p></div><div class="wc-department-explorer-total"><span>Total Constitutional Budget</span><strong>' + formatCurrency(total) + '</strong><button type="button" class="wc-department-ledger-trigger" data-constitutional-ledger-open>View Officers Ledger</button></div></div>' + compositionHtml + '<div class="wc-department-budget-cards">' + officeCards + '</div></section><section class="wc-department-ledger" data-constitutional-ledger hidden><button type="button" class="wc-department-detail-close" data-constitutional-ledger-close>Close Officers Ledger</button><h2>Constitutional Officers Budget Ledger</h2><p>Compare staffing and proposed spending across the Board of County Commissioners and the five independently elected offices.</p>' + ledger + '</section><section class="wc-department-detail" data-constitutional-detail hidden></section>';
      const constitutionalTotalCallout = explorer.querySelector(".wc-department-explorer-total");
      const constitutionalLedgerButton = explorer.querySelector("[data-constitutional-ledger-open]");
      const constitutionalTotalAmount = constitutionalTotalCallout && constitutionalTotalCallout.querySelector(":scope > strong");
      if (constitutionalTotalCallout) {
        const priorTotal = offices.reduce((sum, office) => sum + office.prior, 0);
        const change = total - priorTotal;
        const changePercent = priorTotal ? change / Math.abs(priorTotal) * 100 : null;
        const changeLine = document.createElement("small");
        changeLine.className = change < 0 ? "is-decrease" : change > 0 ? "is-increase" : "";
        changeLine.innerHTML = (change >= 0 ? "+" : "−") + escapeHtml(compactCurrency(Math.abs(change))) + ' (' + (changePercent === null ? "No FY 2026 base" : (changePercent >= 0 ? "+" : "−") + Math.abs(changePercent).toFixed(1) + "%") + ')';
        constitutionalTotalCallout.insertBefore(changeLine, constitutionalLedgerButton || null);
        const primary = document.createElement("div");
        primary.className = "wc-department-explorer-total-primary";
        const totalLabel = constitutionalTotalCallout.querySelector(":scope > span");
        [totalLabel, constitutionalTotalAmount, changeLine, constitutionalLedgerButton].forEach((element) => { if (element) primary.appendChild(element); });
        constitutionalTotalCallout.appendChild(primary);
      }
      explorer.querySelectorAll("[data-constitutional-key]").forEach((button) => button.addEventListener("click", () => renderOffice(groups.get(button.dataset.constitutionalKey))));
      const ledgerSection = explorer.querySelector("[data-constitutional-ledger]");
      const constitutionalCards = explorer.querySelector(".wc-department-explorer");
      explorer.querySelector("[data-constitutional-ledger-open]").addEventListener("click", () => {
        const detailSection = explorer.querySelector("[data-constitutional-detail]");
        if (detailSection) detailSection.hidden = true;
        if (constitutionalCards) constitutionalCards.hidden = true;
        ledgerSection.hidden = false;
      });
      explorer.querySelector("[data-constitutional-ledger-close]").addEventListener("click", () => {
        ledgerSection.hidden = true;
        if (constitutionalCards) constitutionalCards.hidden = false;
      });
    }).catch((error) => {
      console.error("WCBudgetData: failed to load Constitutional Officers budget explorer", error);
      explorer.innerHTML = '<div class="wc-data-error">' + escapeHtml(ERROR_MESSAGE) + '</div>';
    });
  }

  // Lightweight, total-only versions of the Board-department rollup used by
  // initDepartmentBudgetPage() and the Constitutional Officers filter used
  // by initConstitutionalOfficersBudgetPage(), so the Budget Overview
  // directory callouts can show the same figures as those pages' own totals
  // without loading their full explorer UI.
  function getDepartmentBudgetTotal(data) {
    const boardDepartmentNames = new Map([
      ["building construction and maintenance", "Building Construction & Maintenance"],
      ["building department", "Building"],
      ["code compliance", "Code Compliance"],
      ["code compliance beach", "Code Compliance"],
      ["code compliance street", "Code Compliance"],
      ["county administration", "County Administration Departments"],
      ["human resources", "County Administration Departments"],
      ["office of management and budget", "Office of Management and Budget"],
      ["office of the county attorney", "Office of the County Attorney"],
      ["purchasing", "Purchasing"],
      ["extension office", "County Administration Departments"],
      ["geographic info systems", "County Administration Departments"],
      ["housing and urban development", "County Administration Departments"],
      ["county libraries", "County Administration Departments"],
      ["libraries", "County Administration Departments"],
      ["probation services", "County Administration Departments"],
      ["veteran services", "County Administration Departments"],
      ["eagle springs golf and recreation center", "Parks & Recreation"],
      ["eagle springs grill", "Parks & Recreation"],
      ["recreation", "Parks & Recreation"],
      ["culture and recreation senior centers and mainstreet", "Parks & Recreation"],
      ["emergency management", "Emergency Management"],
      ["engineering services", "Engineering Department"],
      ["environmental services", "Environmental Services"],
      ["solid waste", "Environmental Services"],
      ["mosquito control", "Environmental Services"],
      ["mosquito control state aid", "Environmental Services"],
      ["soil conservation", "Environmental Services"],
      ["mossy head wastewater treatment facility", "Engineering Department"],
      ["planning", "Planning"],
      ["planning short term rental", "Planning"],
      ["public works", "Public Works"],
      ["tourism administration", "Tourism Administration"],
      ["marketing", "Tourism Administration"],
      ["tourism marketing", "Tourism Administration"],
      ["communications", "Tourism Administration"],
      ["tourism communications", "Tourism Administration"],
      ["sales and visitors center", "Tourism Administration"],
      ["north walton tourist development tax", "Tourism Administration"],
      ["tourism public safety", "Tourism Administration"],
      ["south walton fire lifeguard services", "Tourism Administration"],
      ["beach operations", "Beach Operations"],
      ["beach renourishment", "Beach Operations"],
      ["beach tram", "Beach Operations"]
    ]);
    const sourceKeyAliases = new Map([
      ["tourism marketing", "marketing"],
      ["tourism communications", "communications"],
      ["tourism sales and visitor center", "sales and visitors center"],
      ["tourism sales and visitors center", "sales and visitors center"],
      ["tourism beach tram", "beach tram"],
      ["tourism beach operations", "beach operations"],
      ["code compliance beach", "code compliance"],
      ["code compliance street", "code compliance"],
      ["engineering department", "engineering services"],
      ["county libraries", "libraries"],
      ["probation", "probation services"],
      ["procurement", "purchasing"],
      ["environmental resources", "environmental services"],
      ["planning short term rental", "planning"]
    ]);
    function rollupSourceKey(name) {
      const rawKey = normalizeDeptName(name || "");
      if (sourceKeyAliases.has(rawKey)) return sourceKeyAliases.get(rawKey);
      return normalizeDeptName(departmentDisplayName(name || ""));
    }
    const groups = new Map();
    (data.expenditures || []).forEach((row) => {
      const sourceKey = rollupSourceKey(row.Dept_Name);
      const rawName = boardDepartmentNames.get(sourceKey);
      if (!rawName) return;
      const key = normalizeDeptName(rawName);
      groups.set(key, (groups.get(key) || 0) + (Number(row.FY2027_Proposed) || 0));
    });
    return Array.from(groups.values()).filter((amount) => amount > 0).reduce((sum, amount) => sum + amount, 0);
  }

  function getConstitutionalOfficersBudgetTotal(data) {
    const allowed = new Set(["clerk of court", "property appraiser", "supervisor of elections", "tax collector", "walton county sheriffs office"]);
    return (data.expenditures || []).reduce((sum, row) => {
      if (!allowed.has(normalizeDeptName(row.Dept_Name))) return sum;
      return sum + (Number(row.FY2027_Proposed) || 0);
    }, 0);
  }

  document.addEventListener("DOMContentLoaded", () => {
    initDepartmentPage();
    initFinancialSummaryPage();
    initConsolidatedFundTablesPage();
    initMachinerySummaryPage();
    initContractualServicesSummaryPage();
    initPersonnelSummaryPage();
    initPersonnelCostSummaryPage();
    initInterfundTransfersPage();
    initConsolidatedRevenueSummaryPage();
    renderRevenueBudgetQuestions();
    initRevenueTopicCardsPage();
    initRevenueSourceExplorer();
    initFundFinancialSchedulesPage();
    initConsolidatedExpenseSummaryPage();
    initConsolidatedBudgetChangesPage();
    initExpenseActivityChartsPage();
    initFinancialForecastPage();
    initStrategicInitiativesPage();
    initDepartmentBudgetPage();
    initConstitutionalOfficersBudgetPage();
  });

  // Walton County's debt schedule is small, fixed, and manually maintained
  // (see pages/debt-overview.html's own Debt Schedule table) rather than
  // sourced from a live CSV -- kept here as the single source of truth so
  // the Budget Overview directory callout and the Debt Overview page's own
  // stat cards can never drift apart.
  const DEBT_OVERVIEW_TOTALS = {
    principal: 10709747,
    interest: 975140,
    totalDebtService: 11684887,
    finalMaturityYear: 2030,
    creditRating: "Aa1",
    creditRatingAgency: "Moody's Investors Service"
  };
  function getDebtOverviewTotal() {
    return DEBT_OVERVIEW_TOTALS.principal;
  }
  function getDebtOverviewTotals() {
    return DEBT_OVERVIEW_TOTALS;
  }

  // Same exclusion the Consolidated Expense Summary / Summary of Expenses
  // total uses (see renderConsolidatedExpenseSummaryTable's
  // matchesFundAndFinancing): interfund transfers/other financing uses are
  // reported on the Interfund Transfer Ledger instead, and the
  // Self-Insurance Fund (503) is an internal service fund, not a
  // governmental one -- both would double-count real program spending if
  // included. Exposed so any other page summing cache.expenditures (e.g.
  // Program Budget) can't drift from this total.
  function isNonProgramExpenseRow(row) {
    return CONSOLIDATED_SCHEDULE_EXCLUDED_FUND_CODES.has(fundCodeForRow(row)) || isOtherFinancingExpenseRow(row);
  }

  window.WCBudgetData = {
    getDepartmentBudgetTotal,
    isNonProgramExpenseRow,
    getDebtOverviewTotal,
    getDebtOverviewTotals,
    getConstitutionalOfficersBudgetTotal,
    DATA_SOURCES,
    loadBudgetData,
    parseCSV,
    formatCurrency,
    formatNumber,
    getDepartmentNameFromPage,
    getDepartmentExpenses,
    getDepartmentRevenues,
    getDepartmentStaffing,
    getDepartmentMachinery,
    getDepartmentPerformanceMeasures,
    getDepartmentNarrative,
    renderTable,
    renderDepartmentNarrative,
    renderFinancialSummary,
    renderFilterControls,
    renderConsolidatedRevenueBudgetTable,
    renderConsolidatedExpenditureBudgetTable,
    renderConsolidatedFinancialBudgetTable,
    renderMachinerySummary,
    renderHistoricalMachineryLedgerYear,
    renderContractualServicesSummary,
    renderPersonnelSummary,
    getPersonnelFundCallouts,
    renderInterfundTransfersOutTable,
    renderInterfundTransfersInTable,
    renderConsolidatedRevenueSummaryTable,
    renderRevenueTopicCards,
    renderFinancialForecast,
    auditDepartmentExpenseRevenueParity,
    auditPersonnelCostPositionParity
  };
})();
