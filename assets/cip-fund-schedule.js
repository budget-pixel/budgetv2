function money(value){
  const amount = Number(value || 0);

  return "$" + Math.round(amount).toLocaleString("en-US");
}

function escapeHtml(value){
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getYearAmount(project, year){
  return (project.funding_by_year || [])
    .filter(item => item.year === year)
    .reduce((sum, item) => sum + Number(item.amount_value || 0), 0);
}

function getInHouseEngineeringAmount(project){
  if(Number(project.in_house_engineering_value || 0) > 0){
    return Number(project.in_house_engineering_value || 0);
  }

  return (project.in_house_engineering_rows || [])
    .reduce((sum, row) => sum + Number(row.amount_value || 0), 0);
}

function isLegacyInHouseEngineeringRow(project){
  const title = String(project.title || "").toLowerCase();
  const accountCode = String(project.budget_account_code || "").trim();

  return Boolean(project.is_legacy_in_house_engineering_row) ||
    title.includes("in-house engineering") ||
    accountCode === "534000";
}

// The revenue that pays for a project, by the fund it is budgeted in.
// Capital funds are supported by property taxes; grant-funded work is paid
// for by the awarding agency rather than a County revenue; the Sheriff's
// capital program is property-tax supported the same way the Capital
// Projects Fund is. The dedicated funds keep the revenue that created them.
const CIP_REVENUE_SOURCE_BY_FUND = {
  "capital projects fund": "Property Taxes",
  "general fund": "Property Taxes",
  "sheriff fund": "Property Taxes",
  "grant funded": "State or Federal Funding",
  "transportation fund": "Local Option Fuel Tax",
  "transportation & public works": "Local Option Fuel Tax",
  "tourist development fund": "Tourist Development Taxes",
  "recreation plat fee fund": "Recreation Plat Fee",
  "sidewalk fund": "Sidewalk Fees"
};

function revenueSourceFor(project){
  // A row can name its own revenue when the fund's default doesn't apply
  // (e.g. General Fund rows paid from vessel registration or short-term
  // rental fees) -- see cip-projects-data.js.
  const explicit = String((project && project.revenue_source) || "").trim();
  if(explicit){
    return explicit;
  }

  const fund = String((project && project.funding) || "").trim().toLowerCase();
  const source = CIP_REVENUE_SOURCE_BY_FUND[fund];

  if(source){
    return source;
  }

  // A Sheriff project carries its department rather than a fund label on
  // some rows -- still property-tax supported.
  if(String((project && project.department_filter) || "").toLowerCase() === "sheriff"){
    return "Property Taxes";
  }

  return "Not listed";
}

function renderRevenueSource(project){
  return escapeHtml(revenueSourceFor(project));
}

// What each revenue source pays for across the year's ledger, grouped by
// fund then source -- the same summary the Machinery, Vehicles & Equipment
// ledger opens with.
function renderRevenueSourceSummary(projects, yearLabel){
  const totals = new Map();
  let total = 0;

  (projects || []).forEach(project => {
    const amount = Number(project.year_amount_value || 0);

    if(amount <= 0){
      return;
    }

    const fund = String(project.funding || "").trim() || "Not listed";
    const source = revenueSourceFor(project);
    const key = fund + "\u0000" + source;
    const entry = totals.get(key) || { fund, source, amount: 0 };
    entry.amount += amount;
    totals.set(key, entry);
    total += amount;
  });

  if(!totals.size){
    return "";
  }

  const ordered = Array.from(totals.values()).sort((a, b) =>
    a.fund.localeCompare(b.fund) || b.amount - a.amount
  );

  const rowsHtml = ordered.map(entry => `
    <tr>
      <td>${escapeHtml(entry.fund)}</td>
      <td>${escapeHtml(entry.source)}</td>
      <td class="wc-num">${total ? ((entry.amount / total) * 100).toFixed(1) : "0.0"}%</td>
      <td class="wc-num">${money(entry.amount)}</td>
    </tr>
  `).join("");

  return `
    <div class="wc-table-wrap wc-cip-year-table wc-cip-source-summary">
      <div class="wc-cip-table-label-row">
        <p class="wc-table-label">${escapeHtml(yearLabel)} Funding by Revenue Source</p>
      </div>
      <div class="wc-data-table-scroll">
        <table class="wc-data-table">
          <thead>
            <tr>
              <th>Fund</th>
              <th>Revenue Source</th>
              <th class="wc-num">Share</th>
              <th class="wc-num">${escapeHtml(yearLabel)}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="wc-table-total-row">
              <td colspan="3">Total</td>
              <td class="wc-num">${money(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function displayYear(year){
  if(year === "PAST_CIP"){
    return "Past CIP";
  }

  return String(year || "").replace(/^FY(\d{4})$/, "FY $1");
}

function getHashYear(years){
  const hashYear = decodeURIComponent(String(window.location.hash || "").replace(/^#/, "")).toUpperCase();

  return years.includes(hashYear) ? hashYear : "";
}

function buildProjectUrl(project, year){
  if(!project || !project.slug){
    return "";
  }

  const returnPath = window.location.pathname.split("/").pop() || "../home.html?explorer=capital";
  const returnTarget = year ? `${returnPath}#${encodeURIComponent(year)}` : returnPath;

  return `cip-project.html?project=${encodeURIComponent(project.slug)}&return=${encodeURIComponent(returnTarget)}`;
}

function renderProjectTitle(project, year, disableLink){
  const title = escapeHtml(project && project.title ? project.title : "Capital Project");
  const url = disableLink ? "" : buildProjectUrl(project, year);
  // eng_color still records how each FY25/FY26 row reconciled against the
  // County Engineering project notes (and drives the no-amount split in
  // renderFundSchedule), but it no longer tints the title -- every project
  // title renders in the default dark green.
  // flagged: true renders the title in red instead -- used for rows found
  // on a general-ledger project list (Org/Object/Project) that weren't
  // already on this historical repository, so they stand out for review.
  const flaggedClass = project && project.flagged ? " wc-cip-project-flagged" : "";

  if(!url){
    return `<span class="wc-cip-project-title${flaggedClass}">${title}</span>`;
  }

  return `<a class="wc-cip-project-link${flaggedClass}" href="${escapeHtml(url)}">${title}</a>`;
}

function renderYearScheduleTable(year, label, projects, totalLabel, options){
  const total = projects.reduce((sum, project) => sum + project.year_amount_value, 0);
  // In-House Engineering rows are County staff time absorbed instead of
  // contracted out -- there's no fund or revenue paying an outside cost, so
  // both columns are suppressed on that ledger.
  const hideFundColumns = Boolean(options && options.hideFundColumns);
  const showFundingColumn = Boolean(options && options.showFundingColumn) && !hideFundColumns;
  const showDistrictColumn = Boolean(options && options.showDistrictColumn);
  const showStatusColumn = Boolean(options && options.showStatusColumn);
  const disableLinks = Boolean(options && options.disableLinks);
  const toggleHtml = (options && options.toggleHtml) || "";
  const grantSubtotal = options && options.grantSubtotal;
  // FY2022-FY2026 are consolidated into one Past CIP project list. That
  // ledger shows original CIP year(s), delivery Phase, Status, and the
  // combined historical Budget instead of a future-year amount column.
  const isHistoricalYear = year === "PAST_CIP";
  const showPhaseColumn = isHistoricalYear && showStatusColumn;
  const showBudgetColumn = isHistoricalYear && showStatusColumn;
  const showAmountColumn = !isHistoricalYear;
  const showProjectNumberColumn = isHistoricalYear && projects.some(project => String(project.project_code || "").trim());
  const showPastCipYearsColumn = false;
  // Completed date (when status is Complete) or estimated start date
  // (otherwise) -- sits right after Status. Per-project, from the
  // supplement's optional completedDate/estimatedStartDate fields (see
  // cip-projects-data.js); "—" when neither is known for that project.
  const showDateColumn = isHistoricalYear && showStatusColumn;
  // Historical rows carry only a category-derived funding label, so the
  // revenue behind them isn't reliable -- shown for FY2027-2031 only, the
  // same way the Fund column is.
  const showRevenueSourceColumn = !isHistoricalYear && !hideFundColumns;

  if(!projects.length){
    return "";
  }

  const yearLabel = displayYear(year);
  const leadColumns = 1 + (showProjectNumberColumn ? 1 : 0) + (showPastCipYearsColumn ? 1 : 0) + (showDistrictColumn ? 1 : 0) + (showFundingColumn ? 1 : 0) + (showRevenueSourceColumn ? 1 : 0) + (showPhaseColumn ? 1 : 0) + (showStatusColumn ? 1 : 0) + (showDateColumn ? 1 : 0);

  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Dates are stored as MM/DD/YYYY or MM/YYYY (see cip-fy2025-2026-
  // supplement.js completedDate/estimatedStartDate) but shown as "Month
  // YYYY" -- e.g. "Completed September 2022" -- rather than a full date.
  function formatMonthYear(value){
    const text = String(value || "").trim();
    // Match the project-management site: its year-only date values represent
    // January of that year (for example, 2027 displays as January 2027).
    if(/^\d{4}$/.test(text)){
      return "January " + text;
    }
    const match = text.match(/^(\d{1,2})\/(?:\d{1,2}\/)?(\d{4})$/);
    if(!match){
      return text;
    }
    const monthIndex = parseInt(match[1], 10) - 1;
    const monthName = MONTH_NAMES[monthIndex];
    return monthName ? monthName + " " + match[2] : text;
  }

  function projectDateCell(project){
    if(String(project.status_text || "").trim() === "Complete"){
      return project.estimated_completion_date ? formatMonthYear(project.estimated_completion_date) : "—";
    }
    if(project.start_date){
      return formatMonthYear(project.start_date);
    }
    return project.est_completion_date ? formatMonthYear(project.est_completion_date) : "—";
  }

  const rowsHtml = [];
  let currentDistrict = null;
  let districtSubtotal = 0;

  function flushDistrictSubtotal(){
    if(currentDistrict === null){
      return;
    }

    rowsHtml.push(`
      <tr class="wc-cip-district-subtotal-row">
        <td${leadColumns > 1 ? ` colspan="${leadColumns}"` : ""}>${escapeHtml(currentDistrict)} Subtotal</td>
        ${showAmountColumn ? `<td class="wc-num">${money(districtSubtotal)}</td>` : ""}
        ${showBudgetColumn ? `<td class="wc-num">${money(districtSubtotal)}</td>` : ""}
      </tr>
    `);
  }

  projects.forEach((project, projectIndex) => {
    if(showDistrictColumn){
      const district = project.district || "Not specified";
      if(district !== currentDistrict){
        flushDistrictSubtotal();
        currentDistrict = district;
        districtSubtotal = 0;
      }
      districtSubtotal += project.year_amount_value;
    }

    rowsHtml.push(`
      <tr>
        <td>${renderProjectTitle(project, year, disableLinks)}</td>
        ${showProjectNumberColumn ? `<td>${escapeHtml(project.project_code || "—")}</td>` : ""}
        ${showPastCipYearsColumn ? `<td>${escapeHtml((project.past_cip_years || []).map(displayYear).join(", ") || "—")}</td>` : ""}
        ${showDistrictColumn ? `<td>${escapeHtml(project.district || "Not specified")}</td>` : ""}
        ${showFundingColumn ? `<td>${escapeHtml(project.funding || "Not listed")}</td>` : ""}
        ${showRevenueSourceColumn ? `<td>${renderRevenueSource(project)}</td>` : ""}
        ${showPhaseColumn ? `<td>${project.phase_text ? `<span class="wc-cip-status-badge ${escapeHtml(project.phase_class || "wc-status-planning")}">${escapeHtml(project.phase_text)}</span>` : "&mdash;"}</td>` : ""}
        ${showStatusColumn ? `<td><span class="wc-cip-status-badge ${escapeHtml(project.status_class || "wc-status-planning")}"${project.status_note ? ` title="${escapeHtml(project.status_note)}"` : ""}>${escapeHtml(project.status_text || "Not available")}</span></td>` : ""}
        ${showDateColumn ? `<td>${escapeHtml(projectDateCell(project))}</td>` : ""}
        ${showBudgetColumn ? `<td class="wc-num">${project.year_amount_value > 0 ? money(project.year_amount_value) : `<span class="wc-cip-no-amount">${project.eng_color === "red" || project.has_in_house_engineering ? "In-House" : "No amount recorded"}</span>`}</td>` : ""}
        ${showAmountColumn ? `<td class="wc-num">${project.year_amount_value > 0 ? money(project.year_amount_value) : '<span class="wc-cip-no-amount">No amount recorded</span>'}</td>` : ""}
      </tr>
    `);

    if(grantSubtotal && grantSubtotal.count && projectIndex === grantSubtotal.count - 1){
      rowsHtml.push(`
        <tr class="wc-cip-grant-subtotal-row">
          <td colspan="${leadColumns + 1}"></td>
        </tr>
      `);
    }
  });

  if(showDistrictColumn){
    flushDistrictSubtotal();
  }

  return `
    <div class="wc-table-wrap wc-cip-year-table">
      <div class="wc-cip-table-label-row">
        <p class="wc-table-label">${escapeHtml(yearLabel)} ${escapeHtml(label)}</p>
        ${toggleHtml}
      </div>
      <div class="wc-data-table-scroll">
        <table class="wc-data-table">
          <thead>
            <tr>
              <th>Project</th>
              ${showProjectNumberColumn ? "<th>Project #</th>" : ""}
              ${showPastCipYearsColumn ? "<th>CIP Year(s)</th>" : ""}
              ${showDistrictColumn ? "<th>Commissioner District</th>" : ""}
              ${showFundingColumn ? "<th>Fund</th>" : ""}
              ${showRevenueSourceColumn ? "<th>Revenue Source</th>" : ""}
              ${showPhaseColumn ? "<th>Phase</th>" : ""}
              ${showStatusColumn ? "<th>Status</th>" : ""}
              ${showDateColumn ? "<th>Completed / Est. Start</th>" : ""}
              ${showBudgetColumn ? `<th class="wc-num">Budget/Actual</th>` : ""}
              ${showAmountColumn ? `<th class="wc-num">${escapeHtml(yearLabel)}</th>` : ""}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml.join("")}
            ${showAmountColumn ? `<tr class="wc-table-total-row">
              <td${leadColumns > 1 ? ` colspan="${leadColumns}"` : ""}>Total ${escapeHtml(yearLabel)} ${escapeHtml(totalLabel || label)}</td>
              <td class="wc-num">${money(total)}</td>
            </tr>` : ""}
            ${showBudgetColumn && year !== "PAST_CIP" ? `<tr class="wc-table-total-row">
              <td${leadColumns > 1 ? ` colspan="${leadColumns}"` : ""}>Total ${escapeHtml(yearLabel)} ${escapeHtml(totalLabel || label)}</td>
              <td class="wc-num">${money(total)}</td>
            </tr>` : ""}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderFundSchedule(config){
  // FY2022-FY2026 historical records are presented through one Past CIP
  // tab. Pages that do not load the historical supplement simply have no
  // Past CIP records, so availableYears removes that tab automatically.
  const pastCipYears = ["FY2022", "FY2023", "FY2024", "FY2025", "FY2026"];
  const years = ["PAST_CIP", "FY2027", "FY2028", "FY2029", "FY2030", "FY2031"];
  const mount = document.getElementById(config.mountId);
  const projectFilter = typeof config.projectFilter === "function"
    ? config.projectFilter
    : project => String(project.funding || "").toLowerCase() === config.funding;

  if(!mount){
    return;
  }

  mount.innerHTML = '<div class="wc-data-loading">Loading capital schedule...</div>';

  const ready = window.wcCipProjectsReady || Promise.resolve(window.wcCipProjects || []);

  if(!document.getElementById("wc-cip-schedule-styles")){
    const style = document.createElement("style");
    style.id = "wc-cip-schedule-styles";
    style.textContent = `
      .wc-cip-schedule-shell{
        margin-top:28px;
      }

      .wc-cip-schedule-controls{
        margin:0 0 22px;
        padding:22px;
        border:1px solid rgba(0,63,40,.12);
        border-radius:24px;
        background:#f7fbf7;
      }

      .wc-cip-schedule-control-top{
        display:flex;
        justify-content:space-between;
        gap:18px;
        align-items:flex-start;
        margin-bottom:18px;
      }

      .wc-cip-schedule-control-top h2{
        margin:0 0 6px;
        color:#172033;
        font-family:Georgia, "Times New Roman", serif;
        font-size:clamp(26px, 3vw, 40px);
        line-height:1.08;
        font-weight:500;
      }

      .wc-cip-schedule-control-top p{
        max-width:640px;
        margin:0;
        color:#607184;
        font-size:14px;
        line-height:1.65;
      }

      .wc-cip-active-total{
        min-width:190px;
        text-align:right;
      }

      .wc-cip-active-total strong{
        display:block;
        color:#003f28;
        font-size:28px;
        line-height:1;
      }

      .wc-cip-active-total span{
        display:block;
        margin-top:7px;
        color:#607184;
        font-size:11px;
        font-weight:900;
        letter-spacing:.08em;
        text-transform:uppercase;
      }

      .wc-cip-year-picker{
        display:grid;
        grid-template-columns:repeat(auto-fit, minmax(116px,1fr));
        gap:8px;
        margin-bottom:16px;
      }

      .wc-cip-year-button{
        min-height:44px;
        border:1px solid rgba(0,63,40,.14);
        border-radius:999px;
        background:#ffffff;
        color:#24344d;
        font-size:13px;
        font-weight:800;
        cursor:pointer;
        transition:background .2s ease, border-color .2s ease, color .2s ease, transform .2s ease;
      }

      .wc-cip-year-button:hover,
      .wc-cip-year-button.is-active{
        border-color:#003f28;
        background:#003f28;
        color:#ffffff;
      }

      .wc-cip-year-button:hover{
        transform:translateY(-1px);
      }

      .wc-cip-year-button-tag{
        display:block;
        margin-top:2px;
        color:inherit;
        font-size:9px;
        font-weight:800;
        font-style:normal;
        letter-spacing:.06em;
        text-transform:uppercase;
        opacity:.65;
      }

      .wc-cip-historical-tag{
        display:inline-block;
        margin-left:8px;
        padding:3px 10px;
        border-radius:999px;
        background:rgba(209,190,120,.22);
        color:#8b6d12;
        font-family:Arial, Helvetica, sans-serif;
        font-size:11px;
        font-weight:900;
        letter-spacing:.04em;
        text-transform:uppercase;
        vertical-align:middle;
      }

      .wc-cip-historical-notice{
        margin:0 0 16px;
        padding:12px 16px;
        border:1px solid rgba(209,190,120,.4);
        border-radius:12px;
        background:rgba(209,190,120,.12);
        color:#6b5710;
        font-size:13px;
        line-height:1.5;
      }

      .wc-cip-table-label-row{
        display:flex;
        flex-wrap:wrap;
        align-items:center;
        justify-content:space-between;
        gap:8px 12px;
        margin-bottom:10px;
      }

      .wc-cip-table-label-row .wc-table-label{
        margin:0;
      }

      .wc-cip-table-label-row .wc-cip-district-toggle{
        margin-top:-2px;
      }

      .wc-cip-sort-field{
        display:inline-flex;
        align-items:center;
        gap:7px;
        margin-top:-2px;
        color:#526577;
        font-family:Arial, Helvetica, sans-serif;
        font-size:11px;
        font-weight:700;
        letter-spacing:.04em;
        text-transform:uppercase;
        white-space:nowrap;
      }

      .wc-cip-sort-field select{
        height:24px;
        padding:0 7px;
        border:1px solid rgba(0,63,40,.35);
        border-radius:999px;
        background:#ffffff;
        color:#24344d;
        font-family:Arial, Helvetica, sans-serif;
        font-size:11px;
        font-weight:600;
        line-height:1;
        cursor:pointer;
      }

      :root[data-theme="dark"] .wc-cip-sort-field select{
        background:#172235;
        border-color:rgba(158,217,168,.3);
        color:#e6edf5;
      }

      .wc-cip-district-toggle{
        display:inline-flex;
        align-items:center;
        gap:5px;
        height:22px;
        padding:0 10px;
        border:1px solid rgba(0,63,40,.35);
        border-radius:999px;
        background:#ffffff;
        color:#24344d;
        font-family:Arial, Helvetica, sans-serif;
        font-size:11px;
        font-weight:600;
        font-style:italic;
        line-height:1;
        white-space:nowrap;
        cursor:pointer;
        transition:background .2s ease, border-color .2s ease, color .2s ease;
      }

      .wc-cip-district-toggle:hover,
      .wc-cip-district-toggle.is-active{
        border-color:#003f28;
        background:#003f28;
        color:#ffffff;
      }

      .wc-cip-district-toggle-indicator{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        width:11px;
        height:11px;
        border:2px solid currentColor;
        border-radius:4px;
        font-size:9px;
        font-weight:800;
        line-height:1;
      }

      .wc-cip-district-subtotal-row td{
        background:rgba(0,63,40,.06);
        font-weight:800;
      }

      .wc-cip-grant-subtotal-row td{
        background:rgba(0,98,49,.12);
        color:#006231;
        font-weight:900;
      }

      .wc-cip-year-body{
        display:grid;
        gap:22px;
      }

      .wc-cip-year-summary{
        display:grid;
        grid-template-columns:repeat(3, minmax(0,1fr));
        gap:1px;
        overflow:hidden;
        border:1px solid rgba(0,63,40,.12);
        border-radius:20px;
        background:rgba(0,63,40,.12);
      }

      /* the In-House Engineering stat only appears on ledgers that have
         in-house work, so the row sizes itself to the stats present rather
         than leaving an empty third cell */
      .wc-cip-year-summary.is-two-up{
        grid-template-columns:repeat(2, minmax(0,1fr));
      }

      .wc-cip-year-stat{
        padding:18px;
        background:#ffffff;
      }

      .wc-cip-year-stat strong{
        display:block;
        color:#003f28;
        font-size:26px;
        line-height:1;
      }

      .wc-cip-year-stat span{
        display:block;
        margin-top:8px;
        color:#607184;
        font-size:11px;
        font-weight:900;
        letter-spacing:.08em;
        text-transform:uppercase;
      }

      .wc-cip-year-table{
        margin-top:0;
      }

      .wc-cip-project-link{
        color:#003f28;
        font-weight:800;
        text-decoration:none;
        text-underline-offset:3px;
      }

      .wc-cip-project-title{
        color:#003f28;
        font-weight:800;
      }

      /* Rows found on a general-ledger project list (Org/Object/Project)
         that weren't already on this historical repository -- previously
         flagged for review by rendering the title in red; now matches the
         standard green project title color. */
      .wc-cip-project-link.wc-cip-project-flagged,
      .wc-cip-project-title.wc-cip-project-flagged{
        color:#003f28;
      }

      .wc-cip-no-amount{
        color:#8a94a3;
        font-size:12px;
        font-style:italic;
        font-weight:600;
      }

      .wc-cip-status-badge{
        display:inline-block;
        padding:4px 9px;
        border-radius:999px;
        font-size:11px;
        font-weight:800;
        line-height:1.3;
        white-space:normal;
        cursor:default;
      }

      .wc-status-planning{ background:rgba(209,190,120,0.18); color:#8b6d12; }
      .wc-status-design{ background:rgba(90,110,127,0.12); color:#5a6e7f; }
      .wc-status-construction{ background:rgba(23,91,145,0.12); color:#175b91; }
      .wc-status-complete{ background:rgba(0,98,49,0.12); color:#006231; }

      .wc-cip-project-link:hover{
        text-decoration:underline;
      }

      @media(max-width:760px){
        .wc-cip-schedule-control-top{
          flex-direction:column;
        }

        .wc-cip-active-total{
          text-align:left;
        }

        .wc-cip-year-picker,
        .wc-cip-year-summary,
        .wc-cip-year-summary.is-two-up{
          grid-template-columns:1fr;
        }

        .wc-cip-table-label-row{
          align-items:flex-start;
        }
      }
    `;
    document.head.appendChild(style);
  }

  ready.then(projectList => {
    const projects = (Array.isArray(projectList) ? projectList : window.wcCipProjects || [])
      .filter(projectFilter);

    const splitGrantFunded = Boolean(config.splitGrantFunded);
    // Opt-in override (see cip-sheriff.html) -- the Sheriff ledger's main
    // table is scoped to Capital Projects Fund work only, with Sheriff
    // Fund rows joining Grant Funded ones in the secondary ledger below
    // instead of the main one. Left undefined everywhere else, so every
    // other splitGrantFunded page (e.g. Transportation and Infrastructure)
    // keeps its original "funding === grant funded" split untouched.
    const isGrantFunded = typeof config.grantLedgerFilter === "function"
      ? config.grantLedgerFilter
      : project => String(project && project.funding || "").toLowerCase() === "grant funded";

    // Engineering-notes projects (eng_color "red") with no real dollar
    // figure in any year -- see noBudgetYears in
    // cip-fy2025-2026-supplement.js -- get pulled into their own "In-House
    // Ledger" table instead of sitting in the priced main ledger.
    const splitRedNoAmount = Boolean(config.splitRedNoAmount);
    const isRedNoAmount = project => project.eng_color === "red" && !(project.funding_by_year || []).some(item => item.amount_value > 0);

    const preGrantProjects = projects.filter(project => !isLegacyInHouseEngineeringRow(project));
    const noAmountProjects = splitRedNoAmount ? preGrantProjects.filter(isRedNoAmount) : [];
    const allScheduleProjects = splitRedNoAmount ? preGrantProjects.filter(project => !isRedNoAmount(project)) : preGrantProjects;
    const grantProjects = splitGrantFunded ? allScheduleProjects.filter(isGrantFunded) : [];
    const nonGrantProjects = splitGrantFunded ? allScheduleProjects.filter(project => !isGrantFunded(project)) : allScheduleProjects;

    // Projects funded elsewhere in the County budget. They belong on the
    // fund's ledger for completeness but would double-count if they sat in
    // its total, so they get their own sub-ledger the same way grant-funded
    // work does. Configured per page as a list of title fragments. This
    // split only applies to FY2027 -- a project on this list is only
    // "already funded elsewhere" against the FY2027 budget; if the same
    // project carries new money in a later plan year (FY2028-2031), that's
    // a real future request and belongs in the normal ledger for that year.
    const budgetedElsewhereTitles = (config.budgetedElsewhereTitles || []).map(title => String(title).toLowerCase());
    const isBudgetedElsewhere = project => budgetedElsewhereTitles.length > 0 &&
      budgetedElsewhereTitles.some(title => String(project && project.title || "").toLowerCase().includes(title));
    const budgetedElsewhereProjects = nonGrantProjects.filter(isBudgetedElsewhere);
    const scheduleProjects = nonGrantProjects.filter(project => !isBudgetedElsewhere(project));
    const inHouseProjects = scheduleProjects.filter(project => getInHouseEngineeringAmount(project) > 0);

    function getYearProjects(projectSource, year){
      return projectSource
        .map(project => ({
          ...project,
          year_amount_value: getYearAmount(project, year),
          // Engineering-notes projects with no dollar figure carry an
          // explicit $0 funding_by_year entry for the year they belong to
          // (see cip-projects-data.js historicalCipProjects) so they still
          // show up here -- live sheet-sourced projects never get a $0
          // entry (their funding_by_year always drops zero years), so this
          // can't accidentally surface a real project's off-years.
          year_has_entry: (project.funding_by_year || []).some(item => item.year === year)
        }))
        .filter(project => project.year_amount_value > 0 || project.year_has_entry)
        .sort((a, b) => b.year_amount_value - a.year_amount_value || a.title.localeCompare(b.title));
    }

    function getPastCipProjects(projectSource){
      return projectSource
        .map(project => {
          const pastEntries = (project.funding_by_year || []).filter(item => pastCipYears.includes(item.year));
          return {
            ...project,
            year_amount_value: pastEntries.reduce((sum, item) => sum + Number(item.amount_value || 0), 0),
            year_has_entry: pastEntries.length > 0,
            past_cip_years: pastEntries.map(item => item.year)
          };
        })
        .filter(project => project.year_amount_value > 0 || project.year_has_entry)
        .sort((a, b) => a.title.localeCompare(b.title));
    }

    function getYearInHouseProjects(projectSource, year){
      return projectSource
        .map(project => ({
          ...project,
          year_amount_value: year === "FY2027" ? getInHouseEngineeringAmount(project) : 0
        }))
        .filter(project => project.year_amount_value > 0)
        .sort((a, b) => b.year_amount_value - a.year_amount_value || a.title.localeCompare(b.title));
    }

    const yearData = years.reduce((data, year) => {
      const isPastCip = year === "PAST_CIP";
      const yearProjects = isPastCip
        ? getPastCipProjects(nonGrantProjects)
        : getYearProjects(year === "FY2027" ? scheduleProjects : nonGrantProjects, year);
      const yearInHouseProjects = isPastCip ? getPastCipProjects(inHouseProjects) : getYearInHouseProjects(inHouseProjects, year);
      const yearGrantProjects = isPastCip ? getPastCipProjects(grantProjects) : getYearProjects(grantProjects, year);
      const yearNoAmountProjects = isPastCip ? getPastCipProjects(noAmountProjects) : getYearProjects(noAmountProjects, year);
      const yearBudgetedElsewhereProjects = year === "FY2027" ? getYearProjects(budgetedElsewhereProjects, year) : [];
      const total = yearProjects.reduce((sum, project) => sum + project.year_amount_value, 0);
      const inHouseTotal = yearInHouseProjects.reduce((sum, project) => sum + project.year_amount_value, 0);
      const grantTotal = yearGrantProjects.reduce((sum, project) => sum + project.year_amount_value, 0);

      data[year] = {
        projects: yearProjects,
        inHouseProjects: yearInHouseProjects,
        grantProjects: yearGrantProjects,
        noAmountProjects: yearNoAmountProjects,
        budgetedElsewhereProjects: yearBudgetedElsewhereProjects,
        total,
        inHouseTotal,
        grantTotal
      };

      return data;
    }, {});

    const hasProjects = years.some(year =>
      yearData[year].projects.length || yearData[year].inHouseProjects.length || yearData[year].grantProjects.length || yearData[year].noAmountProjects.length || yearData[year].budgetedElsewhereProjects.length
    );
    const availableYears = years.filter(year =>
      yearData[year].projects.length || yearData[year].inHouseProjects.length || yearData[year].grantProjects.length || yearData[year].noAmountProjects.length || yearData[year].budgetedElsewhereProjects.length
    );

    if(!hasProjects){
      mount.innerHTML = `<p class="wc-data-empty">No ${escapeHtml(config.label)} projects found.</p>`;
      return;
    }

    const requestedYear = config.defaultYear || getHashYear(years) || "FY2027";
    let activeYear = availableYears.includes(requestedYear)
      ? requestedYear
      : availableYears[0];
    let sortByDistrict = false;
    let selectedFund = "";
    let selectedRevenueSource = "";
    let filterComboDocumentHandlers = [];
    // Past CIP only: "status" (default), "" (project name), or "phase".
    let historicalSort = "status";

    function districtSortRank(district){
      return String(district || "").trim().toLowerCase() === "countywide" ? 0 : 1;
    }

    // Lifecycle order so a Phase sort reads Design -> Permitting ->
    // Construction rather than alphabetically, and Complete leads a Status
    // sort. Anything unrecognized sorts last.
    const PHASE_ORDER = ["Programmed", "Report/Study", "Preliminary Engineering", "Design", "Design & Permitting", "Permitting", "Construction", "Design & Construction"];
    const STATUS_ORDER = ["In Progress", "Programmed", "Complete"];

    function rankIn(list, value){
      const index = list.indexOf(String(value || "").trim());
      return index === -1 ? list.length : index;
    }

    // Earliest CIP year a project's dollars were budgeted under, so a Year
    // sort reads FY2022 first through FY2026 last. Projects with no
    // past_cip_years (shouldn't happen on this ledger) sort last.
    function earliestPastCipYear(project){
      const years = (project.past_cip_years || [])
        .map(year => parseInt(String(year || "").replace(/^FY/, ""), 10))
        .filter(year => !Number.isNaN(year));
      return years.length ? Math.min(...years) : 9999;
    }

    function sortProjects(list){
      const sorted = list.filter(project =>
        (!selectedFund || String(project.funding || "") === selectedFund) &&
        (!selectedRevenueSource || String(project.revenue_source || "") === selectedRevenueSource)
      ).slice();

      if(historicalSort === "year"){
        sorted.sort((a, b) =>
          earliestPastCipYear(a) - earliestPastCipYear(b) ||
          a.title.localeCompare(b.title)
        );
      } else if(historicalSort === "phase"){
        sorted.sort((a, b) =>
          rankIn(PHASE_ORDER, a.phase_text) - rankIn(PHASE_ORDER, b.phase_text) ||
          a.title.localeCompare(b.title)
        );
      } else if(historicalSort === "status"){
        sorted.sort((a, b) =>
          rankIn(STATUS_ORDER, a.status_text) - rankIn(STATUS_ORDER, b.status_text) ||
          a.title.localeCompare(b.title)
        );
      } else if(activeYear === "PAST_CIP"){
        sorted.sort((a, b) => a.title.localeCompare(b.title));
      } else if(sortByDistrict){
        sorted.sort((a, b) =>
          districtSortRank(a.district) - districtSortRank(b.district) ||
          String(a.district || "").localeCompare(String(b.district || ""), undefined, { numeric: true }) ||
          b.year_amount_value - a.year_amount_value ||
          a.title.localeCompare(b.title)
        );
      } else {
        sorted.sort((a, b) => b.year_amount_value - a.year_amount_value || a.title.localeCompare(b.title));
      }

      return sorted;
    }

    function filterComboFieldHtml(idPrefix, label, allLabel){
      const labelAll = allLabel || "All";
      return '<div class="wc-filter-combo">' +
        '<label class="wc-filter-field"><span>' + escapeHtml(label) + '</span>' +
        '<input type="text" class="wc-filter-combo-input" id="' + idPrefix + 'Input" autocomplete="off" placeholder="' + escapeHtml(labelAll) + '" value="' + escapeHtml(labelAll) + '">' +
        '</label><div class="wc-filter-combo-results" id="' + idPrefix + 'Results" hidden></div></div>';
    }

    function setupFilterCombo(input, results, options, allLabel, getCurrentValue, onSelect){
      if(!input || !results) return;
      function displayLabel(value){ return value || allLabel; }
      function renderResults(query){
        const normalizedQuery = String(query || "").trim().toLowerCase();
        const matches = normalizedQuery ? options.filter(option => option.toLowerCase().includes(normalizedQuery)) : options;
        results.innerHTML = '<button type="button" class="wc-filter-combo-option" data-value="">' + escapeHtml(allLabel) + '</button>' +
          matches.map(option => '<button type="button" class="wc-filter-combo-option" data-value="' + escapeHtml(option) + '">' + escapeHtml(option) + '</button>').join("");
        results.hidden = false;
      }
      input.value = displayLabel(getCurrentValue());
      input.addEventListener("focus", function(){ input.select(); renderResults(""); });
      input.addEventListener("input", function(){ renderResults(input.value); });
      input.addEventListener("keydown", function(event){
        if(event.key === "Escape"){
          results.hidden = true;
          input.blur();
        }
      });
      results.addEventListener("click", function(event){
        const button = event.target.closest(".wc-filter-combo-option");
        if(!button) return;
        const value = button.dataset.value || "";
        input.value = displayLabel(value);
        results.hidden = true;
        onSelect(value);
      });
      const documentHandler = function(event){
        if(input.contains(event.target) || results.contains(event.target)) return;
        results.hidden = true;
        input.value = displayLabel(getCurrentValue());
      };
      document.addEventListener("click", documentHandler);
      filterComboDocumentHandlers.push(documentHandler);
    }

    function renderActiveYear(){
      filterComboDocumentHandlers.forEach(handler => document.removeEventListener("click", handler));
      filterComboDocumentHandlers = [];
      const data = yearData[activeYear] || yearData.FY2027;
      const yearLabel = displayYear(activeYear);
      // Status reflects the FY2022-FY2026 historical research records (see
      // cip-fy2025-2026-supplement.js) -- showing it on FY2027-2031 tables
      // would surface stale or phase-only labels for the live proposed CIP.
      // Historical rows carry only category-derived funding labels, so Fund
      // remains a future-ledger column.
      const isHistoricalYear = activeYear === "PAST_CIP";
      const tableOptions = Object.assign({}, config, {
        // District sorting/subtotals are amount-driven, so they're offered
        // only on the priced FY2027-2031 ledgers.
        showDistrictColumn: sortByDistrict && !isHistoricalYear,
        showStatusColumn: Boolean(config.showStatusColumn) && isHistoricalYear,
        showFundingColumn: Boolean(config.showFundingColumn) && !isHistoricalYear,
        // Ledgers whose rows are a single budgeted fund amount rather than
        // named projects (Sidewalk, Recreation Plat Fee) opt out of the
        // project detail link entirely via config.disableLinks. Historical
        // and future phases with matching names now share one project page.
        disableLinks: Boolean(config.disableLinks)
      });
      const districtToggleHtml = isHistoricalYear ? "" : `
        <button type="button" class="wc-cip-district-toggle${sortByDistrict ? " is-active" : ""}" id="wcCipDistrictToggle" aria-pressed="${sortByDistrict ? "true" : "false"}">
          <span class="wc-cip-district-toggle-indicator" aria-hidden="true">${sortByDistrict ? "✓" : ""}</span>
          <span>${sortByDistrict ? "District Subtotals" : "Sort by District"}</span>
        </button>
      `;
      // Historical years have no dollar column to sort on, so they get a
      // Phase/Status sort instead of the district toggle. Status is the
      // default -- In Progress leads, then Programmed, then Complete.
      const historicalSortHtml = !isHistoricalYear ? "" : `
        <label class="wc-cip-sort-field">
          <span>Sort by</span>
          <select id="wcCipHistoricalSort">
            <option value="status"${historicalSort === "status" ? " selected" : ""}>Status</option>
            <option value=""${historicalSort === "" ? " selected" : ""}>Project Name</option>
            <option value="phase"${historicalSort === "phase" ? " selected" : ""}>Phase</option>
          </select>
        </label>
      `;
      const filterProjects = data.projects.concat(data.grantProjects, data.budgetedElsewhereProjects, data.inHouseProjects);
      const fundOptions = [...new Set(filterProjects.map(project => String(project.funding || "").trim()).filter(Boolean))].sort();
      const revenueOptions = [...new Set(filterProjects.map(project => String(project.revenue_source || "").trim()).filter(Boolean))].sort();
      const fundRevenueFiltersHtml = config.showFundRevenueFilters && !isHistoricalYear ? `
        <div class="wc-filter-bar wc-machinery-picker" aria-label="Filter capital projects">
          ${filterComboFieldHtml("wcCipFundFilter", "Fund", "All Funds")}
          ${filterComboFieldHtml("wcCipRevenueFilter", "Revenue Source", "All Revenue Sources")}
        </div>` : "";
      const inProgressGrantProjects = isHistoricalYear
        ? data.grantProjects.filter(project => String(project.status_text || "").trim().toLowerCase() === "in progress")
        : [];
      const otherGrantProjects = isHistoricalYear
        ? data.grantProjects.filter(project => String(project.status_text || "").trim().toLowerCase() !== "in progress")
        : [];
      const inProgressGrantTotal = inProgressGrantProjects.reduce(
        (sum, project) => sum + Number(project.year_amount_value || 0), 0
      );
      const tables = isHistoricalYear
        ? renderYearScheduleTable(
            activeYear,
            "Project List",
            sortProjects(inProgressGrantProjects).concat(sortProjects(data.projects.concat(
              otherGrantProjects,
              data.noAmountProjects,
              data.inHouseProjects,
              data.budgetedElsewhereProjects
            ))),
            "Projects",
            Object.assign({}, tableOptions, {
              toggleHtml: historicalSortHtml,
              grantSubtotal: { count: inProgressGrantProjects.length, amount: inProgressGrantTotal }
            })
          )
        : [
            fundRevenueFiltersHtml,
            renderYearScheduleTable(activeYear, config.label + " Ledger", sortProjects(data.projects), config.label, Object.assign({}, tableOptions, { toggleHtml: districtToggleHtml })),
            renderYearScheduleTable(activeYear, "Ledger", sortProjects(data.noAmountProjects), "Ledger", tableOptions),
            renderYearScheduleTable(activeYear, config.grantLedgerLabel || "Grant Funded Ledger", sortProjects(data.grantProjects), config.grantLedgerLabel || "Grant Funded", tableOptions),
            renderYearScheduleTable(activeYear, config.budgetedElsewhereLedgerLabel || "Budgeted Elsewhere Ledger", sortProjects(data.budgetedElsewhereProjects), config.budgetedElsewhereLedgerLabel || "Budgeted Elsewhere", tableOptions),
            renderYearScheduleTable(activeYear, "In-House Engineering Ledger", sortProjects(data.inHouseProjects), "In-House Engineering", Object.assign({}, tableOptions, { hideFundColumns: true }))
          ].join("");

      mount.innerHTML = `
        <section class="wc-cip-schedule-shell" aria-label="${escapeHtml(config.label)} capital ledger">
          <div class="wc-cip-schedule-controls">
            <div class="wc-cip-schedule-control-top">
              <div>
                <h2>${isHistoricalYear ? "Past CIP Project List" : escapeHtml(yearLabel) + " Ledger"}</h2>
                ${isHistoricalYear ? "" : "<p>Use the year controls to review planned future-year capital projects.</p>"}
              </div>
              ${isHistoricalYear ? "" : `<div class="wc-cip-active-total">
                <strong>${money(data.total)}</strong>
                <span>${escapeHtml(yearLabel)} Total</span>
              </div>`}
            </div>
            <div class="wc-cip-year-picker" role="tablist" aria-label="Select capital schedule year">
              ${availableYears.map(year => `
                <button class="wc-cip-year-button${year === activeYear ? " is-active" : ""}" type="button" data-cip-year="${escapeHtml(year)}" role="tab" aria-selected="${year === activeYear ? "true" : "false"}">
                  ${escapeHtml(displayYear(year))}
                </button>
              `).join("")}
            </div>
          </div>
          <div class="wc-cip-year-body">
            ${isHistoricalYear ? `<p class="wc-cip-historical-notice">This combined list includes projects from the County&rsquo;s FY 2022 through FY 2026 capital work plans. The CIP Year(s) column identifies when each amount was budgeted.</p>` : ""}
            ${isHistoricalYear ? "" : (() => {
              const budgetedElsewhereTotal = data.budgetedElsewhereProjects.reduce((sum, project) => sum + project.year_amount_value, 0);
              const statCount = 2 + (data.inHouseTotal > 0 ? 1 : 0) + (budgetedElsewhereTotal > 0 ? 1 : 0);
              return `<div class="wc-cip-year-summary${statCount === 2 ? " is-two-up" : ""}" style="grid-template-columns:repeat(${statCount}, minmax(0,1fr))" aria-label="${escapeHtml(yearLabel)} schedule summary">
              <div class="wc-cip-year-stat">
                <strong>${money(data.total)}</strong>
                <span>${escapeHtml(config.label)}</span>
              </div>
              <div class="wc-cip-year-stat">
                <strong>${escapeHtml(data.projects.length)}</strong>
                <span>Projects Listed</span>
              </div>
              ${data.inHouseTotal > 0 ? `<div class="wc-cip-year-stat">
                <strong>${money(data.inHouseTotal)}</strong>
                <span>In-House Engineering</span>
              </div>` : ""}
              ${budgetedElsewhereTotal > 0 ? `<div class="wc-cip-year-stat">
                <strong>${money(budgetedElsewhereTotal)}</strong>
                <span>${escapeHtml(data.budgetedElsewhereProjects.length)} Project${data.budgetedElsewhereProjects.length === 1 ? "" : "s"} Budgeted Elsewhere</span>
              </div>` : ""}
            </div>`;
            })()}
            ${isHistoricalYear ? "" : renderRevenueSourceSummary(
              // Grant-funded work is paid for by the awarding agency rather
              // than a County revenue, and In-House Engineering is staff
              // time saved rather than a funded request -- both are totalled
              // in their own sub-ledgers below and stay out of this summary,
              // so its total ties to the year's headline total.
              data.projects,
              yearLabel
            )}
            ${tables || `<p class="wc-data-empty">No ${escapeHtml(config.label)} projects are listed for ${escapeHtml(yearLabel)}.</p>`}
          </div>
        </section>
      `;

      mount.querySelectorAll("[data-cip-year]").forEach(button => {
        button.addEventListener("click", () => {
          activeYear = button.getAttribute("data-cip-year") || "FY2027";
          // Phase/Status sorting only exists on the Past CIP tab, so it
          // resets to the Status default whenever that tab is (re-)entered
          // (and is simply unused/off-screen on the priced FY-year tabs).
          historicalSort = "status";
          if(window.history && window.history.replaceState){
            window.history.replaceState(null, "", `#${activeYear}`);
          }
          renderActiveYear();
        });
      });

      const historicalSortSelect = mount.querySelector("#wcCipHistoricalSort");
      if(historicalSortSelect){
        historicalSortSelect.addEventListener("change", () => {
          historicalSort = historicalSortSelect.value;
          renderActiveYear();
        });
      }

      const districtToggle = mount.querySelector("#wcCipDistrictToggle");
      if(districtToggle){
        districtToggle.addEventListener("click", () => {
          sortByDistrict = !sortByDistrict;
          renderActiveYear();
        });
      }

      setupFilterCombo(
        mount.querySelector("#wcCipFundFilterInput"),
        mount.querySelector("#wcCipFundFilterResults"),
        fundOptions,
        "All Funds",
        () => selectedFund,
        value => { selectedFund = value; renderActiveYear(); }
      );
      setupFilterCombo(
        mount.querySelector("#wcCipRevenueFilterInput"),
        mount.querySelector("#wcCipRevenueFilterResults"),
        revenueOptions,
        "All Revenue Sources",
        () => selectedRevenueSource,
        value => { selectedRevenueSource = value; renderActiveYear(); }
      );
    }

    renderActiveYear();
  }).catch(error => {
    console.error("Walton CIP: failed to render capital schedule", error);
    mount.innerHTML = `<p class="wc-data-empty">Capital schedule data could not be loaded.</p>`;
  });
}
