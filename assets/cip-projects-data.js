(function () {
  "use strict";

  const CAPITAL_PROJECTS_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRc6KHhTwcdREn_SvLONy_cucXH8NxF45hgdyn8IoFGSeTbIVKtDGMMWsbgSFpMizxtxy_fE-pAMmiu/pub?gid=1388930304&single=true&output=csv";
  const FISCAL_YEARS = ["FY2027", "FY2028", "FY2029", "FY2030", "FY2031"];
  const PROJECT_IMAGE_FILES = [
    "abt-martin-dirt-to-pave-project.jpg",
    "amaryllis-lane-dirt-to-pave-project.jpg",
    "arbour-street-dirt-to-pave.jpg",
    "bluebottle-court-dirt-to-pave.jpg",
    "chat-holley-road-resurfacing.png",
    "clover-lane-dirt-to-pave.jpg",
    "cook-road-reconstruction.jpg",
    "cook-road-reconstruction.png",
    "cowslip-court-dirt-to-pave.jpg",
    "daisy-lane-dirt-to-pave.jpg",
    "dalton-drive.png",
    "hewett-bayou-connector-rd-e-lamb-drive-extension.jpg",
    "huckaba-road-604114-bridge-replacement.jpg",
    "iris-lane-resurfacing.jpg",
    "laurel-lane-dirt-to-pave.jpg",
    "marigold-avenue-dirt-to-pave.jpg",
    "may-lilly-court-dirt-to-pave.jpg",
    "nancy-darby-rd-paving-resurfacing.jpg",
    "north-lake-drive.jpg",
    "oak-grove-road-phase-2-reconstruction-resurfacing.jpg",
    "oakwood-lakes-hwy-331-south-turn-lane.png",
    "passion-flower-street-dirt-to-pave.jpg",
    "pinetree-lane-dirt-to-pave.png",
    "rio-ranchero-road-dirt-to-pave.jpg"
  ];

  window.wcCipProjects = Array.isArray(window.wcCipProjects) ? window.wcCipProjects : [];

  // Recreation Plat Fee Fund and Sidewalk Fund are single-line capital
  // outlay budgets (see expenditures Fund_code 114/115) with no
  // Board-directed project of their own yet on the capital project sheet --
  // synthesized here as placeholder "projects" so both funds appear
  // wherever real CIP projects do (their own fund ledger page via
  // renderFundSchedule, and the Project Search fund filter) using the same
  // machinery, rather than a separate one-off page design.
  function placeholderFundProjects() {
    return [
      {
        title: "Recreation Plat Fee Fund Project (Board-Directed, To Be Determined)",
        slug: "recreation-plat-fee-fund-placeholder",
        proposal_name: "Recreation Plat Fee Fund Project (Board-Directed, To Be Determined)",
        dept: "", department: "", department_filter: "",
        project_code: "", project_manager: "",
        estimated_completion_date: "", start_date: "",
        priority: "None",
        strategic_goals: "", operational_impact: "", pertinent_information: "", location_name: "", location: "",
        category: "Capital Project", category_label: "Capital Project",
        description: "No individual project has been Board-directed yet; the full amount is shown as a placeholder pending that decision.",
        budget: "$600,000", budget_value: 600000,
        funding_by_year: [{ year: "FY2027", amount_value: 600000, amount: "$600,000" }],
        funding: "Recreation Plat Fee Fund",
        funding_source: "Recreation Plat Fee Fund",
        image_url: "",
        district: "Not specified",
        target: "FY2027", target_years: ["FY2027"],
        status_text: "Identification", status_class: "",
        budget_org_code: "", budget_account_code: "", budget_account_name: "",
        is_legacy_in_house_engineering_row: false,
        has_in_house_engineering: false,
        in_house_engineering_value: 0,
        in_house_engineering_value_formatted: "",
        in_house_engineering_rows: [],
        raw: {}
      },
      {
        title: "Sidewalk Fund Project (Board-Directed, To Be Determined)",
        slug: "sidewalk-fund-placeholder",
        proposal_name: "Sidewalk Fund Project (Board-Directed, To Be Determined)",
        dept: "", department: "", department_filter: "",
        project_code: "", project_manager: "",
        estimated_completion_date: "", start_date: "",
        priority: "None",
        strategic_goals: "", operational_impact: "", pertinent_information: "", location_name: "", location: "",
        category: "Capital Project", category_label: "Capital Project",
        description: "No individual project has been Board-directed yet; the full amount is shown as a placeholder pending that decision.",
        budget: "$300,000", budget_value: 300000,
        funding_by_year: [{ year: "FY2027", amount_value: 300000, amount: "$300,000" }],
        funding: "Sidewalk Fund",
        funding_source: "Sidewalk Fund",
        image_url: "",
        district: "Not specified",
        target: "FY2027", target_years: ["FY2027"],
        status_text: "Identification", status_class: "",
        budget_org_code: "", budget_account_code: "", budget_account_name: "",
        is_legacy_in_house_engineering_row: false,
        has_in_house_engineering: false,
        in_house_engineering_value: 0,
        in_house_engineering_value_formatted: "",
        in_house_engineering_rows: [],
        raw: {}
      }
    ];
  }

  // Historical/completed capital projects (FY2025-FY2026), kept out of the
  // live FY2027-2031 project list entirely -- see
  // assets/cip-fy2025-2026-supplement.js for the source data and why. Only
  // loaded on pages that also load that supplement script (window.
  // wcHistoricalCipProjects); pages that don't load it simply see none of
  // these, unaffected.
  function historicalCipProjects() {
    const source = Array.isArray(window.wcHistoricalCipProjects) ? window.wcHistoricalCipProjects : [];
    return source.map((entry, index) => {
      const fundingByYear = [];
      if (entry.fy2025) fundingByYear.push({ year: "FY2025", amount_value: entry.fy2025, amount: formatMoney(entry.fy2025) });
      if (entry.fy2026) fundingByYear.push({ year: "FY2026", amount_value: entry.fy2026, amount: formatMoney(entry.fy2026) });
      const total = (entry.fy2025 || 0) + (entry.fy2026 || 0);
      const isSheriff = /sheriff/i.test(entry.category || "");
      return {
        title: entry.name,
        slug: "historical-" + slugify(entry.name || "project-" + index),
        proposal_name: entry.name,
        dept: entry.category || "", department: entry.category || "",
        department_filter: isSheriff ? "Sheriff" : "",
        project_code: "", project_manager: "",
        estimated_completion_date: "", start_date: "",
        priority: "None",
        strategic_goals: "", operational_impact: "", pertinent_information: "", location_name: "", location: "",
        category: entry.category || "Capital Project", category_label: entry.category || "Capital Project",
        description: "Historical capital project from the County's FY2025-FY2026 5-year work plans, shown for project-completion tracking. Not part of the FY2027 proposed capital budget.",
        budget: formatMoney(total), budget_value: 0,
        funding_by_year: fundingByYear,
        funding: entry.category || "",
        funding_source: entry.category || "",
        image_url: "",
        district: "Not specified",
        target: fundingByYear.map((f) => f.year).join(", "), target_years: fundingByYear.map((f) => f.year),
        status_text: "Completed", status_class: "wc-status-complete",
        budget_org_code: "", budget_account_code: "", budget_account_name: "",
        is_legacy_in_house_engineering_row: false,
        has_in_house_engineering: false,
        in_house_engineering_value: 0,
        in_house_engineering_value_formatted: "",
        in_house_engineering_rows: [],
        raw: {}
      };
    });
  }

  function parseCSV(text) {
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

    if (!rows.length) return [];
    const headers = rows[0].map((header) => String(header || "").trim());

    return rows
      .slice(1)
      .filter((cells) => cells.some((cell) => String(cell || "").trim() !== ""))
      .map((cells) => {
        const item = {};
        headers.forEach((header, index) => {
          item[header] = cells[index] !== undefined ? cells[index] : "";
        });
        return item;
      });
  }

  function cleanText(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function get(row, key) {
    return cleanText(row && row[key]);
  }

  function parseMoney(value) {
    const text = cleanText(value).replace(/\$/g, "").replace(/,/g, "");
    if (!text || /^-+$/.test(text)) return 0;
    const amount = Number(text.replace(/[()]/g, ""));
    if (!Number.isFinite(amount)) return 0;
    return /^\(.*\)$/.test(text) ? -amount : amount;
  }

  function formatMoney(value) {
    return "$" + Math.round(Number(value || 0)).toLocaleString("en-US");
  }

  function slugify(value) {
    return cleanText(value)
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "capital-project";
  }

  function projectImageKey(value) {
    return slugify(value)
      .replace(/(^|-)rd(?=-|$)/g, "$1road")
      .replace(/huchaba/g, "huckaba");
  }

  function projectAssetPrefix() {
    const path = window.location && window.location.pathname ? window.location.pathname : "";
    return path.indexOf("/pages/") !== -1 ? "../assets/" : "assets/";
  }

  function projectImagePath(fileName) {
    return projectAssetPrefix() + "images/project-images/" + fileName;
  }

  function findProjectImage(row, values) {
    const imageOptions = PROJECT_IMAGE_FILES.map((fileName) => ({
      fileName,
      slug: projectImageKey(fileName.replace(/\.[a-z0-9]+$/i, ""))
    }));
    const candidates = values
      .concat([
        get(row, "Budget Project Name(s)"),
        get(row, "Budget Project Code(s)"),
        get(row, "Location Name"),
        get(row, "Budget Account Name(s)"),
        get(row, "Project Narrative"),
        get(row, "Pertinent Information")
      ])
      .map(projectImageKey)
      .filter(Boolean);
    const searchableText = candidates.join(" ");
    const match = imageOptions.find((image) => {
      return candidates.some((candidate) => {
        return candidate === image.slug ||
          image.slug.startsWith(candidate + "-") ||
          candidate.startsWith(image.slug + "-");
      }) || image.slug.split("-").every((token) => searchableText.includes(token));
    });

    return match ? projectImagePath(match.fileName) : "";
  }

  function compactNarrative(value, fallback) {
    const text = cleanText(value);
    return text || fallback || "No project narrative is currently available.";
  }

  function getStatusClass(phase) {
    const status = cleanText(phase).toLowerCase();
    if (status.includes("construction")) return "wc-status-construction";
    if (status.includes("design")) return "wc-status-design";
    if (status.includes("complete")) return "wc-status-complete";
    return "wc-status-planning";
  }

  // The sheet's own Dept column is the source of truth -- map its values
  // straight to the bucket labels used across the CIP pages/filters.
  // Keyword-guessing off the title/fund/manager/location text is only a
  // fallback for a row with no (or unrecognized) Dept value -- it used to
  // run unconditionally, which misclassified real Engineering-dept road
  // projects like "CR 30A Sidewalk..." and "CR 83 N (Blue Mountain Rd)..."
  // as Beach Operations just because "30a"/"blue mountain" appeared in the
  // title.
  const CIP_DEPT_MAP = {
    "sheriff": "Sheriff",
    "beach operations": "Beach Operations",
    "building & construction maintenance": "Building Construction and Maintenance",
    "building and construction maintenance": "Building Construction and Maintenance",
    "engineering": "Public Works/Engineering",
    "public works": "Public Works/Engineering",
    "administration": "Administration"
  };

  function normalizeDepartment(row, title, fund, projectManager) {
    const rawDept = get(row, "Dept");
    const mapped = CIP_DEPT_MAP[cleanText(rawDept).toLowerCase()];
    if (mapped) return mapped;

    const source = [
      rawDept,
      title,
      fund,
      projectManager,
      get(row, "Location Name"),
      get(row, "Budget Account Name(s)")
    ].join(" ").toLowerCase();

    if (/\bsheriff\b/.test(source)) return "Sheriff";
    if (/\btdt\b|\btdc\b|tourist|tourism|beach|dune|30a|miramar|visitor|gulfview|blue mountain/.test(source)) return "Beach Operations";
    if (/\bpw\b|\beng\b|public works|engineering|road|bridge|sidewalk|path|stormwater|drainage|intersection|connector|pave|overlay|resurfacing|transportation/.test(source)) return "Public Works/Engineering";
    // Checked before the generic Administration bucket below -- a sheet Dept
    // of "Building & Contruction Maintenance" (sic) would otherwise match
    // Administration's own "building construction"/"maintenance" terms
    // first and get misclassified (see the Roof Replacement Fire Station 4
    // project, which only ever showed up under the Administration filter
    // because of this).
    if (/\bfm\b|building.{0,4}(construction|contruction|maintenance)|\bfacilit|county buildings|renovation|rehab/.test(source)) return "Building Construction and Maintenance";
    if (/admin|library/.test(source)) return "Administration";
    return rawDept || "Capital Projects";
  }

  function departmentFilterValue(department) {
    const text = cleanText(department).toLowerCase();
    if (text.includes("public works") || text.includes("engineering")) return "public works";
    if (text.includes("beach") || text.includes("tourism")) return "beach operations";
    if (text.includes("sheriff")) return "sheriff";
    if (text.includes("administration") || text === "admin") return "administration";
    if (text.includes("building construction") || text.includes("maintenance")) return "building construction";
    return text;
  }

  function getPrimaryYear(fundingByYear) {
    if (!fundingByYear.length) return "";
    return fundingByYear[fundingByYear.length - 1].year;
  }

  function buildFallbackTitle(row, index) {
    const location = get(row, "Location Name");
    const code = get(row, "Budget Project Code(s)");
    const account = get(row, "Budget Account Name(s)");

    if (location) return location;
    if (account) return account + (code ? " " + code : "");
    return "Capital Project " + (index + 1);
  }

  function normalizeCapitalProjects(rows) {
    const slugCounts = {};

    return rows.map((row, index) => {
      const title = get(row, "Budget Project Name(s)") || buildFallbackTitle(row, index);
      const code = get(row, "Budget Project Code(s)");
      const yearlyFunding = FISCAL_YEARS
        .map((year) => ({
          year,
          amount_value: parseMoney(get(row, year + " Proposed")),
          amount: formatMoney(parseMoney(get(row, year + " Proposed")))
        }))
        .filter((item) => item.amount_value !== 0);
      const totalValue = parseMoney(get(row, "Total FY2027-FY2031"));
      const fund = get(row, "Budget Fund(s)");
      const phase = get(row, "Project Phase") || "Identification";
      const projectManager = get(row, "Project Manager");
      const department = normalizeDepartment(row, title, fund, projectManager);
      let baseSlug = slugify(title);
      if (slugCounts[baseSlug]) {
        baseSlug = slugify([title, code || fund || index + 1].filter(Boolean).join(" "));
      }
      const currentCount = slugCounts[baseSlug] || 0;
      slugCounts[baseSlug] = currentCount + 1;
      const slug = currentCount ? baseSlug + "-" + (currentCount + 1) : baseSlug;
      const targetYears = yearlyFunding.map((item) => item.year);
      const fundingSource = get(row, "Funding Source");
      const narrative = compactNarrative(
        get(row, "Project Narrative"),
        fundingSource || get(row, "Pertinent Information")
      );
      const accountName = get(row, "Budget Account Name(s)");
      const accountCode = get(row, "Budget Account Code(s)");
      const inHouseEngineeringValue = parseMoney(get(row, "In-House Engineering"));
      const isLegacyInHouseEngineeringRow =
        title.toLowerCase().includes("in-house engineering") ||
        accountCode === "534000";
      const hasInHouseEngineering = inHouseEngineeringValue > 0;
      const imageUrl = findProjectImage(row, [title, slug, code, accountName, accountCode]);

      return {
        title,
        slug,
        proposal_name: title,
        dept: department,
        department,
        department_filter: departmentFilterValue(department),
        project_code: code,
        project_manager: projectManager,
        estimated_completion_date: get(row, "Estimated Completion Date"),
        start_date: get(row, "Start Date"),
        priority: get(row, "Project Priority") || "None",
        strategic_goals: get(row, "Strategic Goals"),
        operational_impact: get(row, "Operational Impact"),
        pertinent_information: get(row, "Pertinent Information"),
        location_name: get(row, "Location Name"),
        location: get(row, "Location Name"),
        category: accountName || fund || "Capital Project",
        category_label: accountName || fund || "Capital Project",
        description: narrative,
        budget: formatMoney(totalValue),
        budget_value: totalValue,
        funding_by_year: yearlyFunding,
        funding: fund,
        funding_source: fundingSource,
        image_url: imageUrl,
        district: get(row, "Commissioner District") || "Not specified",
        target: targetYears.join(", ") || getPrimaryYear(yearlyFunding),
        target_years: targetYears,
        status_text: phase,
        status_class: getStatusClass(phase),
        budget_org_code: get(row, "Budget Org Code(s)"),
        budget_account_code: accountCode,
        budget_account_name: accountName,
        is_legacy_in_house_engineering_row: isLegacyInHouseEngineeringRow,
        has_in_house_engineering: hasInHouseEngineering,
        in_house_engineering_value: inHouseEngineeringValue,
        in_house_engineering_value_formatted: hasInHouseEngineering ? formatMoney(inHouseEngineeringValue) : "",
        in_house_engineering_rows: hasInHouseEngineering
          ? [{
              description: title,
              year: "FY2027",
              amount_value: inHouseEngineeringValue,
              amount: formatMoney(inHouseEngineeringValue)
            }]
          : [],
        raw: row
      };
    });
  }

  function fetchCapitalProjects() {
    return fetch(CAPITAL_PROJECTS_CSV_URL, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Capital projects sheet request failed with status " + response.status);
        }
        return response.text();
      })
      .then(parseCSV)
      .then(normalizeCapitalProjects)
      .then((projects) => {
        window.wcCipProjects = projects.concat(placeholderFundProjects(), historicalCipProjects());
        return window.wcCipProjects;
      });
  }

  window.wcCipFiscalYears = FISCAL_YEARS.slice();
  window.wcCipProjectsReady = fetchCapitalProjects().catch((error) => {
    console.error("Walton CIP: failed to load capital project sheet", error);
    window.wcCipProjects = placeholderFundProjects().concat(historicalCipProjects());
    return window.wcCipProjects;
  });
})();
