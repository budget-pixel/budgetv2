(function () {
  "use strict";

  const CAPITAL_PROJECTS_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRc6KHhTwcdREn_SvLONy_cucXH8NxF45hgdyn8IoFGSeTbIVKtDGMMWsbgSFpMizxtxy_fE-pAMmiu/pub?gid=1388930304&single=true&output=csv";
  const FISCAL_YEARS = ["FY2027", "FY2028", "FY2029", "FY2030", "FY2031"];
  // Completed/historical years the sheet also carries dollar columns for
  // (see the "Capital Improvement Plan" tab's FY2022-FY2026 Proposed
  // columns) -- these feed the Past CIP ledger the same generic way
  // FISCAL_YEARS feeds the FY2027-2031 ledgers (see getPastCipProjects in
  // cip-fund-schedule.js, which buckets by year present in funding_by_year).
  const HISTORICAL_FISCAL_YEARS = ["FY2022", "FY2023", "FY2024", "FY2025", "FY2026"];
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
      // General Fund buildings (562000) and infrastructure (563000) capital
      // that has no row in the CIP project sheet. Listed on the
      // Transportation and Infrastructure ledger so the County's budgeted
      // capital is visible in one place. Library materials (566000) and the
      // Clerk/Supervisor of Elections capital outlay budgets are
      // deliberately not included.
      {
        title: "Board-Approved Capital Improvements (Managed Vendor Program Revenue)",
        slug: "",
        proposal_name: "Board-Approved Capital Improvements (Managed Vendor Program Revenue)",
        dept: "Board of County Commissioners", department: "Board of County Commissioners",
        department_filter: "",
        project_code: "", project_manager: "",
        estimated_completion_date: "", start_date: "",
        priority: "None",
        strategic_goals: "", operational_impact: "", pertinent_information: "", location_name: "", location: "",
        category: "Capital Project", category_label: "Capital Project",
        description: "Managed Vendor Program Revenue set aside by the Board for future program needs or Board-approved purposes.",
        budget: "$1,530,000", budget_value: 1530000,
        funding_by_year: [{ year: "FY2027", amount_value: 1530000, amount: "$1,530,000" }],
        funding: "General Fund",
        funding_source: "General Fund",
        revenue_source: "Managed Vendor Program Revenue",
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
        title: "Board-Approved Capital Improvements",
        slug: "",
        proposal_name: "Board-Approved Capital Improvements",
        dept: "Board of County Commissioners", department: "Board of County Commissioners",
        department_filter: "",
        project_code: "", project_manager: "",
        estimated_completion_date: "", start_date: "",
        priority: "None",
        strategic_goals: "", operational_impact: "", pertinent_information: "", location_name: "", location: "",
        category: "Capital Project", category_label: "Capital Project",
        description: "Funds capital improvement projects identified and approved by the Board.",
        budget: "$75,000", budget_value: 75000,
        funding_by_year: [{ year: "FY2027", amount_value: 75000, amount: "$75,000" }],
        funding: "General Fund",
        funding_source: "General Fund",
        revenue_source: "Property Taxes",
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
        title: "Boating Improvements (Vessel Registration Fees)",
        slug: "",
        proposal_name: "Boating Improvements (Vessel Registration Fees)",
        dept: "Board of County Commissioners", department: "Board of County Commissioners",
        department_filter: "",
        project_code: "", project_manager: "",
        estimated_completion_date: "", start_date: "",
        priority: "None",
        strategic_goals: "", operational_impact: "", pertinent_information: "", location_name: "", location: "",
        category: "Capital Project", category_label: "Capital Project",
        description: "Funds capital improvements supported by vessel registration fees for public boat ramps, docks, waterway access, and other eligible boating-related projects.",
        budget: "$100,000", budget_value: 100000,
        funding_by_year: [{ year: "FY2027", amount_value: 100000, amount: "$100,000" }],
        funding: "General Fund",
        funding_source: "General Fund",
        revenue_source: "Vessel Registration Fees",
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
        title: "Eagle Springs Golf and Recreation Center Infrastructure",
        slug: "",
        proposal_name: "Eagle Springs Golf and Recreation Center Infrastructure",
        dept: "Eagle Springs Golf and Recreation Center", department: "Eagle Springs Golf and Recreation Center",
        department_filter: "",
        project_code: "", project_manager: "",
        estimated_completion_date: "", start_date: "",
        priority: "None",
        strategic_goals: "", operational_impact: "", pertinent_information: "", location_name: "", location: "",
        category: "Capital Project", category_label: "Capital Project",
        description: "Budgeted General Fund infrastructure capital for the Eagle Springs Golf and Recreation Center.",
        budget: "$125,000", budget_value: 125000,
        funding_by_year: [{ year: "FY2027", amount_value: 125000, amount: "$125,000" }],
        funding: "General Fund",
        funding_source: "General Fund",
        revenue_source: "Local Government 1/2 Cent Sales Tax",
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
        title: "Planning Short-Term Rental Building Improvements",
        slug: "",
        proposal_name: "Planning Short-Term Rental Building Improvements",
        dept: "Planning Short-Term Rental", department: "Planning Short-Term Rental",
        department_filter: "",
        project_code: "", project_manager: "",
        estimated_completion_date: "", start_date: "",
        priority: "None",
        strategic_goals: "", operational_impact: "", pertinent_information: "", location_name: "", location: "",
        category: "Capital Project", category_label: "Capital Project",
        description: "Budgeted General Fund building capital for Planning Short-Term Rental.",
        budget: "$100,000", budget_value: 100000,
        funding_by_year: [{ year: "FY2027", amount_value: 100000, amount: "$100,000" }],
        funding: "General Fund",
        funding_source: "General Fund",
        revenue_source: "Short-Term Rental Certificate Fee",
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
        title: "Procurement Building Improvements",
        slug: "",
        proposal_name: "Procurement Building Improvements",
        dept: "Procurement", department: "Procurement",
        department_filter: "",
        project_code: "", project_manager: "",
        estimated_completion_date: "", start_date: "",
        priority: "None",
        strategic_goals: "", operational_impact: "", pertinent_information: "", location_name: "", location: "",
        category: "Capital Project", category_label: "Capital Project",
        description: "Budgeted General Fund building capital for Procurement.",
        budget: "$50,000", budget_value: 50000,
        funding_by_year: [{ year: "FY2027", amount_value: 50000, amount: "$50,000" }],
        funding: "General Fund",
        funding_source: "General Fund",
        revenue_source: "Property Taxes",
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
        title: "Recreation Building Improvements",
        slug: "",
        proposal_name: "Recreation Building Improvements",
        dept: "Recreation", department: "Recreation",
        department_filter: "",
        project_code: "", project_manager: "",
        estimated_completion_date: "", start_date: "",
        priority: "None",
        strategic_goals: "", operational_impact: "", pertinent_information: "", location_name: "", location: "",
        category: "Capital Project", category_label: "Capital Project",
        description: "Budgeted General Fund building capital for Recreation.",
        budget: "$30,000", budget_value: 30000,
        funding_by_year: [{ year: "FY2027", amount_value: 30000, amount: "$30,000" }],
        funding: "General Fund",
        funding_source: "General Fund",
        revenue_source: "Property Taxes",
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
        // Beach renourishment is budgeted as capital outlay in the Tourist
        // Development Fund (Dept_Code 11141020, Object_Code 563000
        // Infrastructure) but has no row in the CIP project sheet, so it
        // was missing from the Tourist Development ledger entirely. No
        // individual renourishment project has been identified yet, so it
        // carries no slug and therefore no project detail page.
        title: "Beach Renourishment (Additional Fund for Future Project)",
        slug: "",
        proposal_name: "Beach Renourishment (Additional Fund for Future Project)",
        dept: "Beach Renourishment", department: "Beach Renourishment",
        department_filter: "beach operations",
        project_code: "", project_manager: "",
        estimated_completion_date: "", start_date: "",
        priority: "None",
        strategic_goals: "", operational_impact: "", pertinent_information: "", location_name: "", location: "",
        category: "Capital Project", category_label: "Capital Project",
        description: "Budgeted Tourist Development Fund capital for future beach renourishment work; no individual project has been identified yet.",
        budget: "$10,750,000", budget_value: 10750000,
        funding_by_year: [{ year: "FY2027", amount_value: 10750000, amount: "$10,750,000" }],
        funding: "Tourist Development Fund",
        funding_source: "Tourist Development Fund",
        revenue_source: "Tourist Development Taxes",
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
        revenue_source: "Recreation Plat Fee",
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
        revenue_source: "Sidewalk Fees",
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

  // Historical/completed capital projects (FY2022-FY2026), kept out of the
  // live FY2027-2031 project list entirely -- see
  // assets/cip-fy2025-2026-supplement.js for the source data and why. Only
  // loaded on pages that also load that supplement script (window.
  // wcHistoricalCipProjects); pages that don't load it simply see none of
  // these, unaffected.
  function historicalCipProjects() {
    const source = Array.isArray(window.wcHistoricalCipProjects) ? window.wcHistoricalCipProjects : [];
    return source.map((entry, index) => {
      // noBudgetYears: County Engineering's FY25/FY26 project notes list a
      // phase/status for these but never a dollar figure -- included as an
      // explicit $0 entry (rather than skipped like a normal falsy fy2025/
      // fy2026) so the row still appears under that year instead of
      // vanishing, without fabricating a budget number.
      const noBudgetYears = new Set(entry.noBudgetYears || []);
      const fundingByYear = [];
      if (entry.fy2022) fundingByYear.push({ year: "FY2022", amount_value: entry.fy2022, amount: formatMoney(entry.fy2022) });
      else if (noBudgetYears.has("FY2022")) fundingByYear.push({ year: "FY2022", amount_value: 0, amount: "No amount recorded" });
      if (entry.fy2023) fundingByYear.push({ year: "FY2023", amount_value: entry.fy2023, amount: formatMoney(entry.fy2023) });
      else if (noBudgetYears.has("FY2023")) fundingByYear.push({ year: "FY2023", amount_value: 0, amount: "No amount recorded" });
      if (entry.fy2024) fundingByYear.push({ year: "FY2024", amount_value: entry.fy2024, amount: formatMoney(entry.fy2024) });
      else if (noBudgetYears.has("FY2024")) fundingByYear.push({ year: "FY2024", amount_value: 0, amount: "No amount recorded" });
      if (entry.fy2025) fundingByYear.push({ year: "FY2025", amount_value: entry.fy2025, amount: formatMoney(entry.fy2025) });
      else if (noBudgetYears.has("FY2025")) fundingByYear.push({ year: "FY2025", amount_value: 0, amount: "No amount recorded" });
      if (entry.fy2026) fundingByYear.push({ year: "FY2026", amount_value: entry.fy2026, amount: formatMoney(entry.fy2026) });
      else if (noBudgetYears.has("FY2026")) fundingByYear.push({ year: "FY2026", amount_value: 0, amount: "No amount recorded" });
      const total = (entry.fy2022 || 0) + (entry.fy2023 || 0) + (entry.fy2024 || 0) + (entry.fy2025 || 0) + (entry.fy2026 || 0);
      const isSheriff = /sheriff/i.test(entry.category || "");
      // The supplement's "Transportation & Public Works" category is a work-
      // plan heading, not a department -- these rows belong to the same
      // Public Works/Engineering department the FY2027 projects use, so the
      // Project Search department filter lists one department instead of two
      // names for the same group. Grant Funded rows keep the department the
      // title/notes imply.
      const historicalDepartment = isSheriff
        ? "Sheriff"
        : (/transportation|public works/i.test(entry.category || "")
          ? "Public Works/Engineering"
          : normalizeDepartment({}, entry.name || "", entry.category || "", ""));
      // phase = where the project sits in the delivery lifecycle (Design,
      // Construction, Programmed, ...); status = whether it's finished.
      // Sheriff's Office rows carry neither and default to Complete.
      const phaseText = entry.phase || "";
      const statusText = entry.status || "Complete";
      const baseDescription = "Historical capital project from the County's FY2022-FY2026 5-year work plans, shown for project-completion tracking. Not part of the FY2027 proposed capital budget.";
      return {
        title: entry.name,
        // Use the same title-based slug as a current/future record so a
        // project's historical design and later construction phases can
        // share one detail page.
        slug: slugify(entry.name || "project-" + index),
        proposal_name: entry.name,
        dept: historicalDepartment, department: historicalDepartment,
        department_filter: departmentFilterValue(historicalDepartment),
        project_code: entry.projectNumber || "", project_manager: "",
        // completedDate/estimatedCompletionDate/startDate/estimatedStartDate
        // are optional per-entry fields on the supplement -- shown as the
        // Past CIP ledger's date column, in priority order: completedDate
        // when status is Complete ("Completed ..."); otherwise
        // estimatedCompletionDate if known ("Est. Complete ..."); otherwise
        // startDate, a confirmed start ("Started ..."); otherwise
        // estimatedStartDate ("Est. Start ..."). Left blank ("—") when none
        // are known.
        estimated_completion_date: entry.completedDate || "",
        est_completion_date: entry.estimatedCompletionDate || "",
        start_date: entry.startDate || entry.estimatedStartDate || "",
        start_date_confirmed: Boolean(entry.startDate),
        priority: "None",
        strategic_goals: "", operational_impact: "", pertinent_information: "", location_name: "", location: "",
        category: entry.category || "Capital Project", category_label: entry.category || "Capital Project",
        description: entry.statusNote ? baseDescription + " Status: " + entry.statusNote : baseDescription,
        budget: formatMoney(total), budget_value: 0,
        funding_by_year: fundingByYear,
        funding: entry.category || "",
        funding_source: entry.category || "",
        // The FY2025/FY2026 supplement records a work-plan heading rather
        // than a budgeted fund, so no revenue is claimed for these rows.
        revenue_source: "",
        image_url: "",
        district: "Not specified",
        target: fundingByYear.map((f) => f.year).join(", "), target_years: fundingByYear.map((f) => f.year),
        status_text: statusText, status_class: getStatusClass(statusText),
        phase_text: phaseText, phase_class: getStatusClass(phaseText),
        status_note: entry.statusNote || "",
        eng_color: entry.eng_color || "",
        // flagged: true renders the project title in red on the Past CIP
        // ledger -- set for rows sourced from a general-ledger project list
        // (Org/Object/Project) that weren't already on this historical
        // repository when found, so they stand out for review.
        flagged: Boolean(entry.flagged),
        contracts: Array.isArray(entry.contracts) ? entry.contracts : [],
        timeline: Array.isArray(entry.timeline) ? entry.timeline : [],
        budget_org_code: entry.orgCode || "", budget_account_code: "", budget_account_name: "",
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

  // The sheet's year columns aren't spaced consistently (e.g. "FY 2022
  // Proposed" has a space after "FY" while "FY2023 Proposed" doesn't) --
  // tries both so a stray space typed into a header cell doesn't silently
  // drop a whole year's dollars.
  function getYearProposed(row, year) {
    const spaced = year.replace(/^FY/, "FY ");
    return get(row, year + " Proposed") || get(row, spaced + " Proposed");
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
  // The revenue that pays for a project, by the fund it is budgeted in --
  // the same mapping the fund schedules use for their Revenue Source column
  // (see cip-fund-schedule.js). Capital funds are property-tax supported;
  // grant-funded work is paid for by the awarding agency.
  const CIP_REVENUE_SOURCE_BY_FUND = {
    "capital projects fund": "Property Taxes",
    "general fund": "Property Taxes",
    "sheriff fund": "Property Taxes",
    "grant funded": "State or Federal Funding",
    "transportation fund": "Local Option Fuel Tax",
    "tourist development fund": "Tourist Development Taxes",
    "recreation plat fee fund": "Recreation Plat Fee",
    "sidewalk fund": "Sidewalk Fees"
  };

  function revenueSourceForFund(fund, departmentFilter) {
    const source = CIP_REVENUE_SOURCE_BY_FUND[cleanText(fund).toLowerCase()];
    if (source) return source;
    // Some Sheriff rows carry the department rather than a fund label --
    // still property-tax supported.
    if (cleanText(departmentFilter).toLowerCase() === "sheriff") return "Property Taxes";
    return "";
  }

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
          amount_value: parseMoney(getYearProposed(row, year)),
          amount: formatMoney(parseMoney(getYearProposed(row, year)))
        }))
        .filter((item) => item.amount_value !== 0);
      // Completed/historical years (FY2022-FY2026) -- same shape as
      // yearlyFunding, merged into one funding_by_year array below so a
      // single sheet row can carry both its past construction history and
      // any new future-year money, and the Past CIP ledger (which just
      // filters funding_by_year for these year labels) picks it up for
      // free. See HISTORICAL_FISCAL_YEARS above.
      const historicalFunding = HISTORICAL_FISCAL_YEARS
        .map((year) => ({
          year,
          amount_value: parseMoney(getYearProposed(row, year)),
          amount: formatMoney(parseMoney(getYearProposed(row, year)))
        }))
        .filter((item) => item.amount_value !== 0);
      // The management sheet also tracks completed and active historical
      // Public Works projects whose old budget/actual was never entered in
      // an FY2022-FY2026 cell. Keep those projects on the consolidated Past
      // CIP ledger with an explicit zero-value entry instead of silently
      // dropping the entire management record.
      if(!historicalFunding.length && !yearlyFunding.length &&
        /public works|engineering/i.test(get(row, "Dept")) &&
        (get(row, "Status") || get(row, "Start Date") || get(row, "Estimated Completion Date"))){
        const managementDate = get(row, "Estimated Completion Date") || get(row, "Start Date");
        const historicalYearMatch = managementDate.match(/\b(202[2-6])\b/);
        historicalFunding.push({
          year: historicalYearMatch ? "FY" + historicalYearMatch[1] : "FY2026",
          amount_value: 0,
          amount: "No amount recorded"
        });
      }
      const combinedFunding = historicalFunding.concat(yearlyFunding);
      const totalValue = parseMoney(get(row, "Total FY2027-FY2031"));
      // Completed FY2022-FY2026 projects don't carry a Budget Fund(s) value
      // in the sheet (that column was never tracked for closed-out work) --
      // default those Public Works rows to "Transportation & Public Works"
      // so they still pass the ledger pages' fund-name filters, matching
      // the label the old cip-fy2025-2026-supplement.js used for the same
      // projects before this data moved into the live sheet.
      const fund = get(row, "Budget Fund(s)") ||
        (historicalFunding.length && !yearlyFunding.length && /public works|engineering/i.test(get(row, "Dept"))
          ? "Transportation & Public Works"
          : "");
      const phase = get(row, "Project Phase") || "Identification";
      // The sheet's own Status column (In Progress/Complete/Programmed/...)
      // is a different axis than Project Phase (Design/Construction/...) --
      // falls back to phase when Status is blank, which is the common case
      // for most FY2027-2031 proposals that haven't been given a lifecycle
      // status yet, so their existing Phase-as-status badge is unaffected.
      const sheetStatus = get(row, "Status");
      const status = sheetStatus || phase;
      const statusNote = get(row, "Status Notes");
      const projectManager = get(row, "Project Manager");
      const department = normalizeDepartment(row, title, fund, projectManager);
      let baseSlug = slugify(title);
      if (slugCounts[baseSlug]) {
        baseSlug = slugify([title, code || fund || index + 1].filter(Boolean).join(" "));
      }
      const currentCount = slugCounts[baseSlug] || 0;
      slugCounts[baseSlug] = currentCount + 1;
      const slug = currentCount ? baseSlug + "-" + (currentCount + 1) : baseSlug;
      const targetYears = combinedFunding.map((item) => item.year);
      const fundingSource = get(row, "Funding Source");
      // Project Narrative first, then Pertinent Information (where the
      // County's engineers have been recording the detailed project
      // history/status writeups), and only then the bare fund name --
      // Funding Source used to come before Pertinent Information here and
      // would silently swallow a real narrative with just a fund label.
      const narrative = compactNarrative(
        get(row, "Project Narrative") || get(row, "Pertinent Information"),
        fundingSource
      );
      const estimatedCompletionDate = get(row, "Estimated Completion Date");
      const startDate = get(row, "Start Date");
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
        // estimated_completion_date doubles as the Past CIP ledger's
        // "Completed <date>" value when status is Complete, and
        // est_completion_date as its "Est. Complete <date>" value
        // otherwise -- both read from the same sheet column since
        // projectDateCell (cip-fund-schedule.js) only ever uses one of the
        // two per row, branching on status.
        estimated_completion_date: estimatedCompletionDate,
        est_completion_date: estimatedCompletionDate,
        start_date: startDate,
        // No separate "confirmed vs. estimated" column in the sheet -- a
        // Start Date value of "TBD" (or text saying "Est./Estimated") is
        // treated as not yet confirmed, same as this ledger's own past
        // convention. A bare year is also estimated; a more specific date is
        // treated as a real, confirmed start.
        // A bare year is only an estimate: it must not be presented as a
        // confirmed January start (or as a confirmed start at all).
        start_date_confirmed: Boolean(startDate) &&
          !/^\d{4}$/.test(String(startDate).trim()) &&
          !/\bTBD\b|\best\.?\b|\bestimated\b/i.test(startDate),
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
        funding_by_year: combinedFunding,
        funding: fund,
        funding_source: fundingSource,
        revenue_source: revenueSourceForFund(fund, departmentFilterValue(department)),
        image_url: imageUrl,
        district: get(row, "Commissioner District") || "Not specified",
        target: targetYears.join(", ") || getPrimaryYear(combinedFunding),
        target_years: targetYears,
        status_text: status,
        status_class: getStatusClass(status),
        status_note: statusNote,
        phase_text: phase,
        phase_class: getStatusClass(phase),
        flagged: false,
        contracts: [],
        timeline: [],
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

  // Response cache + one retry + stale-cache fallback around the sheet
  // fetch -- without this, every page view re-fetched the sheet from
  // scratch with no retry, and a slow/failed request fell straight through
  // to the placeholder project list below with no way to recover once the
  // network hiccup passed.
  const CIP_FETCH_CACHE_TTL_MS = 5 * 60 * 1000;

  function cipFetchCacheKey(url) {
    return "wcFetchCache:" + url;
  }

  function readCipFetchCache(url) {
    try {
      const raw = sessionStorage.getItem(cipFetchCacheKey(url));
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function writeCipFetchCache(url, text) {
    try {
      sessionStorage.setItem(cipFetchCacheKey(url), JSON.stringify({ text: text, savedAt: Date.now() }));
    } catch (err) {
      // sessionStorage can throw (private browsing, quota) -- caching is optional.
    }
  }

  function fetchTextOnce(url) {
    return fetch(url, { cache: "no-store" }).then((response) => {
      if (!response.ok) {
        throw new Error("Capital projects sheet request failed with status " + response.status);
      }
      return response.text();
    });
  }

  function fetchCapitalProjectsText(url) {
    const cached = readCipFetchCache(url);
    if (cached && Date.now() - cached.savedAt < CIP_FETCH_CACHE_TTL_MS) {
      return Promise.resolve(cached.text);
    }
    function attempt(retriesLeft) {
      return fetchTextOnce(url).catch((err) => (retriesLeft > 0 ? attempt(retriesLeft - 1) : Promise.reject(err)));
    }
    return attempt(1)
      .then((text) => {
        writeCipFetchCache(url, text);
        return text;
      })
      .catch((err) => {
        if (cached) return cached.text;
        throw err;
      });
  }

  function fetchCapitalProjects() {
    return fetchCapitalProjectsText(CAPITAL_PROJECTS_CSV_URL)
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
