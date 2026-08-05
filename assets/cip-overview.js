const app = document.getElementById("app");

const defaultVisibleCount = 9;
const loadMoreIncrement = 9;
const urlParams = new URLSearchParams(window.location.search);
const isStandaloneSearchPage =
  document.body.dataset.page === "project-search" ||
  window.location.pathname.endsWith("/search.html");


const isFullView = isStandaloneSearchPage || urlParams.get("view") === "all";
const incomingSearch = String(urlParams.get("q") || "").trim().toLowerCase();

function buildProjectUrl(project){
  return `cip-project.html?project=${encodeURIComponent(project.slug || "")}`;
}


let visibleLimit = isFullView ? 9999 : defaultVisibleCount;

function resetVisibleLimit(){
  visibleLimit = isFullView ? 9999 : defaultVisibleCount;
}

const filters = {
  department: "all",
  year: "all",
  fund: "all",
  revenueSource: "all",
  search: incomingSearch
};

function normalizeFilterValue(value){
  return String(value || "").trim().toLowerCase();
}

// Sheriff-owned capital projects are booked against whichever fund
// actually pays for them (Sheriff Fund, Grant Funded, Capital Projects
// Fund, etc. -- see cip-sheriff.html's departmentFilter, which is how the
// CIP fund schedule pages already show every Sheriff project regardless
// of its fund). The raw "funding" values would otherwise split Sheriff's
// own projects across several fund buttons here, so this bucket is keyed
// off department_filter instead of a literal fund name.
const SHERIFF_PROJECTS_FUND_VALUE = normalizeFilterValue("Sheriff Projects");

function escapeHtml(value){
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getSearchableProjects(){
  const projects = Array.isArray(window.wcCipProjects) ? window.wcCipProjects : [];

  return projects.filter(project => !project.is_legacy_in_house_engineering_row);
}

function formatMoneyShort(value){
  const amount = Number(value) || 0;
  const abs = Math.abs(amount);

  if(abs >= 1000000){
    return "$" + (amount / 1000000).toLocaleString("en-US", {
      maximumFractionDigits: 1,
      minimumFractionDigits: abs < 10000000 ? 1 : 0
    }) + "M";
  }

  return "$" + Math.round(amount).toLocaleString("en-US");
}

function projectBudgetValue(project){
  return Number(project && project.budget_value ? project.budget_value : 0) || 0;
}

function projectYearValue(project, year){
  return ((project && project.funding_by_year) || [])
    .filter(item => item.year === year)
    .reduce((sum, item) => sum + Number(item.amount_value || 0), 0);
}

// Planned capital by fiscal year, used by the "is capital spending going up
// or down" section. FY2025/FY2026 come from the historical work-plan
// supplement rather than the adopted five-year plan, so they're flagged and
// labelled separately instead of being presented as the same series.
const CIP_TREND_YEARS = [
  { year: "FY2025", label: "FY 2025", historical: true },
  { year: "FY2026", label: "FY 2026", historical: true },
  { year: "FY2027", label: "FY 2027", historical: false },
  { year: "FY2028", label: "FY 2028", historical: false },
  { year: "FY2029", label: "FY 2029", historical: false },
  { year: "FY2030", label: "FY 2030", historical: false },
  { year: "FY2031", label: "FY 2031", historical: false }
];

function getCipYearTotals(projects){
  return CIP_TREND_YEARS.map(entry => ({
    ...entry,
    total: (projects || []).reduce((sum, project) =>
      sum + (project.funding_by_year || [])
        .filter(item => item.year === entry.year)
        .reduce((yearSum, item) => yearSum + Number(item.amount_value || 0), 0), 0)
  })).filter(entry => entry.total > 0);
}

function describeCipTrend(yearTotals){
  const planned = yearTotals.filter(entry => !entry.historical);
  const history = yearTotals.filter(entry => entry.historical);

  if(!planned.length){
    return { headline: "Capital spending trend", detail: "" };
  }

  const first = planned[0];
  const last = planned[planned.length - 1];
  const planChange = last.total - first.total;
  const planPercent = first.total ? Math.abs(planChange / first.total) * 100 : 0;
  const planDirection = planChange > 0 ? "rises" : planChange < 0 ? "steps down" : "holds steady";

  const priorPeak = history.length ? Math.max(...history.map(entry => entry.total)) : 0;
  const risenInto = priorPeak && first.total > priorPeak;

  return {
    headline: risenInto
      ? "Capital spending is up, then planned to taper."
      : "Planned capital spending " + planDirection + " across the five-year plan.",
    detail: (risenInto
      ? first.label + " is the largest year in the plan at " + formatMoneyShort(first.total) +
        ", above the " + formatMoneyShort(priorPeak) + " high of the two prior work plans. "
      : "") +
      "From " + first.label + " to " + last.label + " the adopted plan " + planDirection + " by " +
      formatMoneyShort(Math.abs(planChange)) + " (" + planPercent.toFixed(0) + "%), from " +
      formatMoneyShort(first.total) + " to " + formatMoneyShort(last.total) + "."
  };
}

function getCipOverviewStats(projects){
  const currentProjects = (projects || []).filter(project => projectBudgetValue(project) > 0);
  const totalBudget = currentProjects.reduce((sum, project) => sum + projectBudgetValue(project), 0);
  function fundTotal(matches){
    return currentProjects.reduce((sum, project) => {
      const funding = String(project.funding || "").toLowerCase();
      return matches.some(match => funding.includes(match)) ? sum + projectBudgetValue(project) : sum;
    }, 0);
  }

  function departmentTotal(departmentMatches){
    return currentProjects.reduce((sum, project) => {
      const department = String(project.department_filter || "").toLowerCase();
      return departmentMatches.some(match => department.includes(match)) ? sum + projectBudgetValue(project) : sum;
    }, 0);
  }

  function grantTotal(departmentMatches){
    return currentProjects.reduce((sum, project) => {
      const funding = String(project.funding || "").toLowerCase();
      const department = String(project.department_filter || "").toLowerCase();

      return funding === "grant funded" && departmentMatches.some(match => department.includes(match))
        ? sum + projectBudgetValue(project)
        : sum;
    }, 0);
  }

  const fundCards = [
    {
      label: "Capital Projects Fund",
      value: fundTotal(["capital projects fund", "capital project"]),
      grantValue: grantTotal(["building construction", "administration", "public works"]),
      text: "County facilities, public infrastructure, and major improvements.",
      href: "cip-capital-projects.html"
    },
    {
      label: "Transportation Fund",
      value: fundTotal(["transportation"]),
      grantValue: 0,
      text: "Road, bridge, drainage, and mobility infrastructure.",
      href: "cip-transportation.html"
    },
    {
      label: "Tourist Development Fund",
      value: fundTotal(["tourist", "tourism"]),
      grantValue: grantTotal(["beach operations"]),
      text: "Beach operations, visitor infrastructure, and destination improvements.",
      href: "cip-tourist-development.html"
    },
    {
      label: "Sheriff Projects",
      value: departmentTotal(["sheriff"]),
      grantValue: grantTotal(["sheriff"]),
      text: "Public safety facilities, equipment, and law enforcement capital needs.",
      href: "cip-sheriff.html"
    }
  ];

  return {
    totalBudget,
    projectCount: currentProjects.length,
    fundCards
  };
}

function getFilterOptions(projects, key, preferredOrder){
  const seen = {};
  const options = [];

  projects.forEach(project => {
    const label = String(project[key] || "").trim();

    if(!label){
      return;
    }

    const value = normalizeFilterValue(label);

    if(seen[value]){
      return;
    }

    seen[value] = true;
    options.push({ label, value });
  });

  const order = preferredOrder.reduce((acc, item, index) => {
    acc[normalizeFilterValue(item)] = index;
    return acc;
  }, {});

  return options.sort((a, b) => {
    const aOrder = order[a.value] ?? 999;
    const bOrder = order[b.value] ?? 999;

    return aOrder - bOrder || a.label.localeCompare(b.label);
  });
}

function renderFilterButton(type, value, label){
  return `<button class="wc-project-filter ${filters[type] === value ? "active" : ""}" data-filter-type="${escapeHtml(type)}" data-filter="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
}

function getFilteredProjects(){
  const projects = getSearchableProjects();

  return projects.filter(project => {

    const department = normalizeFilterValue(project.department_filter || project.dept || project.department);
    const departmentLabel = normalizeFilterValue(project.dept || project.department);
    const target = String(project.target || "").toLowerCase();
    const targetYears = Array.isArray(project.target_years) ? project.target_years.join(" ").toLowerCase() : "";
    const funding = normalizeFilterValue(project.funding);

    const content = [
      project.title,
      project.description,
      project.dept,
      project.department_filter,
      project.category,
      project.category_label,
      project.budget,
      project.funding,
      project.revenue_source,
      project.target,
      project.district,
      project.status_text
    ].join(" ").toLowerCase();

    const searchTerm = filters.search.trim().toLowerCase();
    const matchesSearch =
      !searchTerm ||
      content.includes(searchTerm);

    const matchesDepartment =
      filters.department === "all" ||
      department.includes(filters.department) ||
      departmentLabel.includes(filters.department);

    const matchesYear =
      filters.year === "all" ||
      target.includes(filters.year) ||
      targetYears.includes(filters.year);

    const matchesFund =
      filters.fund === "all" ||
      (filters.fund === SHERIFF_PROJECTS_FUND_VALUE ? department === "sheriff" : funding.includes(filters.fund));

    const matchesRevenueSource =
      filters.revenueSource === "all" ||
      normalizeFilterValue(project.revenue_source) === filters.revenueSource;

    return (
      matchesSearch &&
      matchesDepartment &&
      matchesYear &&
      matchesFund &&
      matchesRevenueSource
    );
  });
}

// The card's department chip is a single nowrap pill, so the longest
// department name is shortened there. The filter buttons and the project
// detail page still use the full name.
const CIP_CARD_DEPARTMENT_LABELS = {
  "building construction and maintenance": "Building Construction"
};

function cardDepartmentLabel(departmentLabel){
  return CIP_CARD_DEPARTMENT_LABELS[String(departmentLabel || "").trim().toLowerCase()] || departmentLabel;
}

function renderProjectCard(project){
  const description = String(project.description || "");
  const statusClass = project.status_class || getStatusClass(project.status_text);
  const departmentLabel = project.dept || project.department || project.category_label || "Department";
  const staffDeliveryValue =
    project.in_house_engineering_value_formatted ||
    project.in_house_engineering_value ||
    "";
  // FY2025/FY2026 rows come from the historical work-plan supplement and
  // have no project detail page -- their cards stay unclickable rather than
  // sending people to an empty page. Budgeted-fund rows with no identified
  // project (e.g. Beach Renourishment) carry no slug and are handled the
  // same way.
  const isHistorical = String(project.slug || "").indexOf("historical-") === 0;
  const hasProjectPage = !isHistorical && Boolean(String(project.slug || "").trim());

  return `
    <article class="wc-project-card${hasProjectPage ? "" : " is-historical"}" data-department="${escapeHtml(departmentLabel)}" data-target="${escapeHtml(String(project.target || "").toLowerCase())}"${hasProjectPage ? ` data-project-url="${escapeHtml(buildProjectUrl(project))}" tabindex="0" role="link" aria-label="View details for ${escapeHtml(project.title)}"` : ""}>

      <div class="wc-project-card-top">
        <h3>${escapeHtml(project.title)}</h3>
        <span class="wc-project-category">${escapeHtml(cardDepartmentLabel(departmentLabel))}</span>
      </div>

      <div class="wc-project-description">
        ${escapeHtml(description)}
      </div>

      ${description.length > 180 ? `<button class="wc-project-read-more" type="button">Read More</button>` : ""}

      <div class="wc-project-metrics">

        <div class="wc-project-metric">
          <span>Project Budget</span>
          <strong>${escapeHtml(project.budget)}</strong>
        </div>

        <div class="wc-project-metric">
          <span>Funding Source</span>
          <strong>${escapeHtml(project.funding)}</strong>
        </div>

        ${project.revenue_source ? `<div class="wc-project-metric">
          <span>Revenue Source</span>
          <strong>${escapeHtml(project.revenue_source)}</strong>
        </div>` : ""}

        <div class="wc-project-metric">
          <span>Target Year</span>
          <strong>${escapeHtml(project.target)}</strong>
        </div>

      </div>

      <div class="wc-project-card-badges">

        <div class="wc-project-status ${escapeHtml(statusClass)}">
          ${escapeHtml(project.status_text)}
        </div>

        ${project.has_in_house_engineering ? `
          <div
            class="wc-project-card-badge"
            title="Estimated equivalent consultant engineering value delivered internally by County staff. Not included in total project budget."
            aria-label="In-house engineering savings${staffDeliveryValue ? `, ${escapeHtml(staffDeliveryValue)}` : ""}. Estimated equivalent consultant engineering value delivered internally by County staff. Not included in total project budget."
          >
            In-House Eng Savings${staffDeliveryValue ? ` · ${escapeHtml(staffDeliveryValue)}` : ""}
          </div>
        ` : ""}

      </div>

      ${hasProjectPage
        ? `<div class="wc-project-card-action">View Project</div>`
        : `<div class="wc-project-card-action is-static">${isHistorical ? "Past CIP &mdash; no project page" : "No project page"}</div>`}

    </article>
  `;
}

function getStatusClass(statusText){
  const status = String(statusText || "").toLowerCase();

  if(status.includes("construction")){
    return "wc-status-construction";
  }

  if(status.includes("design")){
    return "wc-status-design";
  }

  if(status.includes("complete")){
    return "wc-status-complete";
  }

  return "wc-status-planning";
}


function renderProjects(){
  if(!isStandaloneSearchPage && document.body && document.body.classList){
    document.body.classList.add("wc-cip-overview-page");
  }

  const allProjects = getSearchableProjects();
  const overviewStats = getCipOverviewStats(allProjects);
  const cipYearTotals = getCipYearTotals(allProjects);
  const cipTrend = describeCipTrend(cipYearTotals);
  const cipTrendMax = cipYearTotals.reduce((max, entry) => Math.max(max, entry.total), 0);
  // Largest FY 2027 commitments -- "major" here means the biggest budgeted
  // amounts in the current year, not a separate County designation.
  const majorProjectYear = "FY2027";
  const majorProjectYearTotal = (cipYearTotals.find(entry => entry.year === majorProjectYear) || {}).total || 0;
  const majorProjects = allProjects
    .filter(project => projectYearValue(project, majorProjectYear) > 0 && String(project.slug || "").indexOf("historical-") !== 0)
    .slice()
    .sort((a, b) => projectYearValue(b, majorProjectYear) - projectYearValue(a, majorProjectYear))
    .slice(0, 8);
  const filtered = getFilteredProjects();
  const visibleProjects = filtered.slice(0, visibleLimit);
  const departmentOptions = getFilterOptions(allProjects, "dept", [
    "Public Works/Engineering",
    "Beach Operations",
    "Sheriff",
    "Building Construction and Maintenance",
    "Administration",
    "Capital Projects"
  ]);
  const preferredFundOrder = [
    "Capital Projects Fund",
    "Transportation Fund",
    "Tourist Development Fund",
    "Grant Funded",
    "Sheriff Projects",
    "General Fund"
  ];
  const hasSheriffProjects = allProjects.some(project =>
    normalizeFilterValue(project.department_filter) === "sheriff"
  );
  const fundOptions = getFilterOptions(allProjects, "funding", preferredFundOrder)
    .filter(option => option.value !== normalizeFilterValue("Sheriff Fund"))
    // "Transportation & Public Works" is the FY2025/FY2026 work-plan
    // heading carried on historical rows, not a fund -- those projects are
    // reachable through the Public Works/Engineering department filter.
    .filter(option => option.value !== normalizeFilterValue("Transportation & Public Works"))
    .concat(hasSheriffProjects ? [{ label: "Sheriff Projects", value: SHERIFF_PROJECTS_FUND_VALUE }] : []);

  // Ordered largest-share-of-the-CIP first so the sources people ask about
  // lead the row; anything new falls in alphabetically behind them.
  const revenueSourceOptions = getFilterOptions(allProjects, "revenue_source", [
    "Property Taxes",
    "Local Option Fuel Tax",
    "Tourist Development Taxes",
    "State or Federal Funding"
  ]);

  const fundOrderIndex = preferredFundOrder.map(normalizeFilterValue);
  fundOptions.sort((a, b) => {
    const aOrder = fundOrderIndex.indexOf(a.value);
    const bOrder = fundOrderIndex.indexOf(b.value);

    return (aOrder === -1 ? 999 : aOrder) - (bOrder === -1 ? 999 : bOrder) || a.label.localeCompare(b.label);
  });
  const rows = [];

  for(let i = 0; i < visibleProjects.length; i += 3){
    rows.push(visibleProjects.slice(i, i + 3));
  }

  app.innerHTML = `
    <style>

      *{
        box-sizing:border-box;
      }

      body{
        margin:0;
        background:#ffffff;
        font-family:Arial, Helvetica, sans-serif;
      }

      /* Same content column as every other page (#content in style.css) so
         section headings line up with the breadcrumb and with the rest of
         the site instead of sitting on their own wider, offset grid. */
      body.wc-cip-overview-page #content{
        padding-bottom:0;
      }

      body.wc-cip-overview-page .page-nav{
        width:100%;
        max-width:100%;
        margin:12px auto 0 auto;
        padding:14px 20px 0 20px;
        border-top:1px solid rgba(36,52,77,0.10);
        box-sizing:border-box;
      }

      body.wc-cip-overview-page .page-nav a{
        min-height:34px;
        padding:7px 14px;
        font-size:12px;
      }

      .wc-cip-main-section{
        position:relative;
        width:100%;
        max-width:100%;
        margin:0;
        padding:0;
        box-sizing:border-box;
        background:#ffffff;
        font-family:Arial, Helvetica, sans-serif;
        overflow:visible;
      }

      .wc-cip-main-inner{
        width:100%;
        max-width:100%;
        margin:0;
        overflow:visible;
      }

      .wc-cip-sticky-nav-shell{
        position:sticky;
        top:0;
        z-index:1000;
        width:100%;
        max-width:100%;
        margin-left:auto;
        margin-right:auto;
        margin-bottom:12px;
        padding:7px 0 9px 0;
        background:transparent;
        border-bottom:0;
        box-shadow:none;
        box-sizing:border-box;
      }

      .wc-cip-sticky-nav-shell::after{
        content:"";
        position:absolute;
        left:50%;
        bottom:0;
        width:100vw;
        height:3px;
        transform:translateX(-50%);
        background:#006231;
        pointer-events:none;
      }

      .wc-cip-proxy-nav{
        display:flex;
        align-items:center;
        justify-content:center;
        flex-wrap:wrap;
        gap:0;
        width:100%;
        max-width:1180px;
        margin:0;
        padding:0 12px;
        background:transparent;
        backdrop-filter:blur(12px);
        -webkit-backdrop-filter:blur(12px);
        box-sizing:border-box;
        margin-left:auto;
        margin-right:auto;
      }

      .wc-cip-proxy-button,
      .wc-cip-proxy-link{
        position:relative;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        min-height:34px;
        margin:5px 2px;
        padding:0 12px;
        border:0;
        border-radius:999px;
        background:transparent;
        color:var(--text);
        font-family:Arial, Helvetica, sans-serif;
        font-size:11px;
        font-weight:800;
        letter-spacing:.05em;
        text-transform:uppercase;
        text-decoration:none;
        cursor:pointer;
        transition:
          background .22s ease,
          border-color .22s ease,
          color .22s ease,
          transform .22s ease;
      }

      .wc-cip-proxy-button::after,
      .wc-cip-proxy-link::after{
        display:none;
      }

      .wc-cip-proxy-button:hover,
      .wc-cip-proxy-link:hover{
        color:var(--green);
      }

      .wc-cip-proxy-button.is-active,
      .wc-cip-proxy-button:hover,
      .wc-cip-proxy-link:hover{
        background:#00623114;
        color:var(--green);
      }

      .wc-cip-proxy-button.is-active{
        background:#00623114;
        color:var(--green);
      }

      .wc-cip-proxy-link.wc-cip-proxy-search{
        margin-left:8px;
        padding:0 12px;
        background:#006231;
        color:#ffffff;
      }

      .wc-cip-proxy-link.wc-cip-proxy-search:hover{
        color:#ffffff;
        background:#004f28;
      }

      .wc-intro-section{
        position:relative;
        width:100vw;
        max-width:100vw;
        left:50%;
        margin-left:-50vw;
        margin-right:-50vw;
        padding:28px 20px 24px 20px;
        box-sizing:border-box;
        font-family:Arial, Helvetica, sans-serif;
        background:#ffffff;
      }

      #wc-cip-what-counts,
      #wc-project-search{
        scroll-margin-top:160px;
      }

      .wc-intro-inner{
        max-width:100%;
        width:100%;
        max-width:980px;
        padding:0 18px;
        box-sizing:border-box;
        margin:0 auto;
        text-align:left;
      }

      .wc-intro-inner span{
        display:block;
        margin-bottom:8px;
        color:var(--green);
        font-size:11px;
        font-weight:700;
        letter-spacing:.14em;
        text-transform:uppercase;
        text-align:center;
      }

      .wc-intro-inner h2{
        margin:0 0 10px 0;
        color:var(--text);
        font-size:30px;
        line-height:1.12;
        font-weight:700;
        text-align:center;
      }

      .wc-intro-inner h2::after{
        content:"";
        display:block;
        width:62px;
        height:3px;
        margin:10px auto 0 auto;
        border-radius:999px;
        background:linear-gradient(90deg,#006231 0%,#0b7741 100%);
      }

      .wc-intro-inner p{
        margin:0 0 12px 0;
        color:var(--text);
        font-size:14px;
        line-height:1.55;
        text-align:justify;
        text-justify:inter-word;
      }

      .wc-intro-inner p:last-child{
        margin-bottom:0;
      }

      .wc-intro-divider{
        width:100%;
        max-width:100%;
        height:1px;
        margin:22px auto 0 auto;
        background:linear-gradient(90deg, rgba(0,98,49,0) 0%, rgba(0,98,49,0.18) 20%, rgba(0,98,49,0.28) 50%, rgba(0,98,49,0.18) 80%, rgba(0,98,49,0) 100%);
      }

      .wc-cip-page-header{
        margin:0;
        font-family:Arial, Helvetica, sans-serif;
      }

      .wc-cip-page-header .page-intro{
        max-width:820px;
        text-align:left;
      }

      .wc-budget-strip-section{
        padding:8px 0 28px 0;
      }

      .wc-cip-feature-section,
      .wc-cip-info-section{
        width:100% !important;
        max-width:100% !important;
        padding:0 0 28px 0 !important;
        box-sizing:border-box !important;
        overflow-x:hidden !important;
        background:#ffffff;
        font-family:Arial, Helvetica, sans-serif;
      }

      .wc-cip-feature-grid,
      .wc-cip-info-grid{
        display:flex;
        flex-direction:row;
        align-items:stretch;
        gap:16px;
        width:100% !important;
        max-width:1180px !important;
        margin:0 auto !important;
        box-sizing:border-box !important;
        overflow:hidden !important;
      }

      .wc-cip-info-grid{
        gap:18px;
      }

      .wc-cip-feature-card{
        flex:1 1 0;
        min-width:0;
        display:grid;
        grid-template-columns:42% 58%;
        align-items:stretch;
        overflow:hidden;
        border-radius:16px;
        background:#ffffff;
        border:1px solid rgba(209,190,120,0.42);
        box-shadow:
          0 8px 20px rgba(0,98,49,0.07),
          0 3px 8px rgba(36,52,77,0.05);
        box-sizing:border-box;
      }

      .wc-cip-feature-image{
        min-height:220px;
        overflow:hidden;
      }

      .wc-cip-feature-image img{
        width:100%;
        height:100%;
        min-height:220px;
        object-fit:cover;
        display:block;
      }

      .wc-cip-feature-content{
        padding:22px;
        box-sizing:border-box;
        display:flex;
        flex-direction:column;
        justify-content:center;
      }

      .wc-cip-feature-content span,
      .wc-cip-label{
        display:block;
        margin-bottom:8px;
        color:var(--green);
        font-size:10px;
        font-weight:700;
        letter-spacing:.14em;
        text-transform:uppercase;
      }

      .wc-cip-feature-content h2,
      .wc-cip-content h2{
        margin:0 0 10px 0;
        color:var(--text);
        font-size:21px;
        line-height:1.15;
        font-weight:700;
      }

      .wc-cip-content h2{
        margin-bottom:12px;
        font-size:22px;
      }

      .wc-cip-feature-content h2::after,
      .wc-cip-content h2::after{
        content:"";
        display:block;
        width:54px;
        height:3px;
        margin:10px 0 0 0;
        border-radius:999px;
        background:linear-gradient(90deg,#006231 0%,#0b7741 100%);
      }

      .wc-cip-feature-content p,
      .wc-cip-content p{
        margin:0;
        color:var(--text);
        font-size:13px;
        line-height:1.55;
        text-align:left;
      }

      .wc-cip-content p{
        margin:0 0 12px 0;
        line-height:1.56;
      }

      .wc-cip-panel{
        flex:1 1 0;
        min-width:0;
        max-width:100%;
        box-sizing:border-box;
        background:#ffffff;
        border-radius:16px;
        overflow:hidden;
        border:1px solid rgba(209,190,120,0.35);
        box-shadow:
          0 9px 22px rgba(0,98,49,0.07),
          0 3px 9px rgba(36,52,77,0.05);
        transition:transform .28s ease, box-shadow .28s ease;
      }

      .wc-cip-panel:hover{
        transform:translateY(-2px);
        box-shadow:
          0 14px 28px rgba(0,98,49,0.10),
          0 6px 14px rgba(36,52,77,0.07);
      }

      .wc-cip-video{
        position:relative;
        width:100% !important;
        overflow:hidden;
        background:#000000;
      }

      .wc-cip-video iframe{
        display:block;
        width:100% !important;
        height:240px;
        border:0;
      }

      .wc-cip-content{
        padding:22px 22px 20px 22px;
        box-sizing:border-box;
      }

      .wc-cip-list{
        margin:14px 0 0 0;
        padding:0;
        list-style:none;
      }

      .wc-cip-list li{
        position:relative;
        padding:0 0 0 17px;
        margin:0 0 12px 0;
        color:var(--text);
        font-size:13px;
        line-height:1.5;
        text-align:left;
      }

      .wc-cip-list li:last-child{
        margin-bottom:0;
      }

      .wc-cip-list li::before{
        content:"";
        position:absolute;
        left:0;
        top:8px;
        width:8px;
        height:8px;
        border-radius:999px;
        background:linear-gradient(135deg,#006231 0%,#0b7741 100%);
        box-shadow:0 0 0 3px rgba(0,98,49,0.10);
      }

      .wc-cip-list strong{
        color:var(--text);
      }

      .wc-cip-story-hero{
        position:relative;
        min-height:520px;
        margin:0 0 24px;
        overflow:hidden;
        border-radius:30px;
        background:#10251d;
      }

      .wc-cip-story-hero img{
        width:100%;
        height:100%;
        min-height:520px;
        object-fit:cover;
        filter:saturate(.94) contrast(1.03);
      }

      .wc-cip-story-hero::after{
        content:"";
        position:absolute;
        inset:0;
        background:linear-gradient(90deg, rgba(0,31,20,.86) 0%, rgba(0,31,20,.54) 44%, rgba(0,31,20,.1) 100%);
      }

      .wc-cip-story-panel{
        position:absolute;
        left:clamp(24px, 5vw, 58px);
        bottom:clamp(24px, 5vw, 54px);
        z-index:1;
        width:min(640px, calc(100% - 48px));
        padding:30px;
        border:1px solid rgba(255,255,255,.24);
        border-radius:26px;
        background:rgba(255,255,255,.14);
        color:#ffffff;
        backdrop-filter:blur(14px);
      }

      .wc-cip-kicker{
        display:block;
        margin:0 0 10px;
        color:var(--green);
        font-size:12px;
        font-weight:900;
        letter-spacing:.16em;
        text-transform:uppercase;
      }

      .wc-cip-story-panel .wc-cip-kicker{
        color:#f1dc94;
      }

      .wc-cip-story-panel h1{
        margin:0 0 16px;
        color:#ffffff;
        font-family:Georgia, "Times New Roman", serif;
        font-size:clamp(42px, 6vw, 76px);
        line-height:.96;
        font-weight:500;
        letter-spacing:0;
      }

      .wc-cip-story-panel p{
        max-width:560px;
        margin:0;
        color:rgba(255,255,255,.88);
        font-size:17px;
        line-height:1.65;
      }

      .wc-cip-overview-metrics{
        display:grid;
        grid-template-columns:repeat(3, minmax(0,1fr));
        gap:1px;
        margin:0 0 72px;
        overflow:hidden;
        border:1px solid rgba(0,63,40,.12);
        border-radius:24px;
        background:rgba(0,63,40,.12);
      }

      .wc-cip-overview-metrics-two{
        grid-template-columns:repeat(2, minmax(0,1fr));
      }

      .wc-cip-overview-metric{
        padding:24px;
        background:#f7fbf7;
      }

      .wc-cip-overview-metric strong{
        display:block;
        color:var(--green);
        font-size:clamp(30px, 4vw, 46px);
        line-height:1;
      }

      .wc-cip-overview-metric span{
        display:block;
        margin-top:10px;
        color:var(--muted);
        font-size:12px;
        font-weight:900;
        letter-spacing:.08em;
        text-transform:uppercase;
      }

      .wc-cip-story-section{
        margin:0 0 76px;
      }

      .wc-cip-story-header{
        max-width:900px;
        margin:0 0 24px;
      }

      /* Matches the section headings used by the department, revenue, and
         personnel explorers so headings read the same across the site. */
      .wc-cip-story-header h2,
      .wc-cip-story-copy h2{
        margin:0 0 10px;
        color:var(--navy);
        font-size:clamp(2rem, 4vw, 2.75rem);
        line-height:1.12;
        font-weight:800;
      }

      .wc-cip-story-header p,
      .wc-cip-story-copy p{
        max-width:900px;
        margin:0 0 12px;
        color:var(--muted);
        font-size:15px;
        line-height:1.7;
      }

      .wc-cip-gfoa-section{
        display:grid;
        grid-template-columns:minmax(280px,.42fr) minmax(0,.58fr);
        gap:30px;
        align-items:start;
      }

      .wc-cip-gfoa-media{
        display:grid;
        gap:14px;
      }

      .wc-cip-gfoa-copy{
        padding-top:4px;
      }

      .wc-cip-gfoa-copy h3{
        margin:0 0 16px;
        color:var(--text);
        font-family:Georgia, "Times New Roman", serif;
        font-size:clamp(28px, 3vw, 42px);
        line-height:1.08;
        font-weight:500;
      }

      .wc-cip-gfoa-copy > p{
        max-width:720px;
        margin:0 0 26px;
        color:var(--muted);
        font-size:16px;
        line-height:1.75;
      }

      /* --- What is a capital project ------------------------------- */
      .wc-cip-definition-grid{
        display:grid;
        grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);
        gap:18px;
        align-items:start;
      }

      .wc-cip-definition-tests{
        padding:24px;
        border:1px solid rgba(0,63,40,.12);
        border-radius:20px;
        background:#f7fbf7;
      }

      .wc-cip-definition-tests h3{
        margin:0 0 16px;
        color:#003f28;
        font-size:17px;
        line-height:1.25;
      }

      .wc-cip-test-list{
        counter-reset:wc-cip-test;
        margin:0;
        padding:0;
        list-style:none;
      }

      .wc-cip-test-list li{
        position:relative;
        margin:0 0 14px;
        padding:0 0 0 40px;
        color:#4a5a6a;
        font-size:13.5px;
        line-height:1.55;
      }

      .wc-cip-test-list li:last-child{ margin-bottom:0; }

      .wc-cip-test-list li::before{
        counter-increment:wc-cip-test;
        content:counter(wc-cip-test);
        position:absolute;
        top:0;
        left:0;
        display:grid;
        width:26px;
        height:26px;
        border-radius:999px;
        background:var(--green);
        color:#fff;
        place-items:center;
        font-size:12px;
        font-weight:900;
      }

      .wc-cip-test-list strong{
        display:block;
        margin:2px 0 3px;
        color:#003f28;
        font-size:14px;
      }

      .wc-cip-definition-contrast{
        display:grid;
        gap:14px;
      }

      .wc-cip-definition-card{
        padding:20px;
        border:1px solid rgba(0,63,40,.12);
        border-radius:18px;
        background:#fff;
      }

      .wc-cip-definition-card > span{
        display:inline-block;
        margin:0 0 12px;
        padding:5px 11px;
        border-radius:999px;
        font-size:11px;
        font-weight:900;
        letter-spacing:.07em;
        text-transform:uppercase;
      }

      .wc-cip-definition-card.is-included > span{ background:#e8f3eb; color:#08663f; }
      .wc-cip-definition-card.is-excluded > span{ background:#f6eae8; color:#a3372a; }

      .wc-cip-definition-card ul{
        margin:0;
        padding:0;
        list-style:none;
      }

      .wc-cip-definition-card li{
        position:relative;
        margin:0 0 8px;
        padding:0 0 0 20px;
        color:#4a5a6a;
        font-size:13px;
        line-height:1.5;
      }

      .wc-cip-definition-card li:last-child{ margin-bottom:0; }

      .wc-cip-definition-card li::before{
        content:"";
        position:absolute;
        top:8px;
        left:0;
        width:8px;
        height:8px;
        border-radius:999px;
        background:var(--green);
      }

      .wc-cip-definition-card.is-excluded li::before{ background:#c0705f; }

      .wc-cip-section-note{
        margin:18px 0 0;
        color:#607184;
        font-size:12.5px;
        line-height:1.6;
      }

      .wc-cip-section-note a{ color:var(--green); font-weight:800; }

      /* --- How the level is determined ----------------------------- */
      .wc-cip-factor-grid{
        display:grid;
        grid-template-columns:repeat(3, minmax(0,1fr));
        gap:14px;
      }

      .wc-cip-factor-card{
        padding:20px;
        border:1px solid rgba(0,63,40,.12);
        border-radius:18px;
        background:#fff;
      }

      .wc-cip-factor-card h3{
        margin:0 0 9px;
        color:#003f28;
        font-size:16px;
        line-height:1.25;
      }

      .wc-cip-factor-card p{
        margin:0;
        color:#4a5a6a;
        font-size:13px;
        line-height:1.6;
      }

      .wc-cip-subhead{
        margin:34px 0 6px;
        color:var(--navy);
        font-size:1.15rem;
        font-weight:800;
      }

      .wc-cip-subhead-note{
        max-width:900px;
        margin:0 0 18px;
        color:var(--muted);
        font-size:15px;
        line-height:1.7;
      }

      .wc-cip-benefit-grid{
        display:grid;
        grid-template-columns:repeat(3, minmax(0,1fr));
        gap:14px;
      }

      .wc-cip-benefit-card{
        padding:20px;
        border:1px solid rgba(0,63,40,.12);
        border-radius:18px;
        background:#f7fbf7;
      }

      .wc-cip-benefit-card strong{
        display:block;
        margin:0 0 8px;
        color:var(--green);
        font-size:15px;
        line-height:1.25;
      }

      .wc-cip-benefit-card p{
        margin:0;
        color:#4a5a6a;
        font-size:13px;
        line-height:1.6;
      }

      /* --- Spending trend ------------------------------------------ */
      .wc-cip-trend-chart{
        display:grid;
        grid-auto-flow:column;
        grid-auto-columns:minmax(0,1fr);
        gap:10px;
        align-items:end;
        min-height:230px;
        padding:22px 18px 16px;
        border:1px solid rgba(0,63,40,.12);
        border-radius:20px;
        background:#f7fbf7;
      }

      .wc-cip-trend-column{
        display:flex;
        flex-direction:column;
        justify-content:flex-end;
        align-items:center;
        height:100%;
        gap:8px;
        min-width:0;
      }

      .wc-cip-trend-column b{
        color:#003f28;
        font-size:13px;
        font-weight:900;
        white-space:nowrap;
      }

      .wc-cip-trend-column i{
        display:block;
        width:100%;
        max-width:74px;
        border-radius:10px 10px 0 0;
        background:var(--green);
      }

      .wc-cip-trend-column.is-historical i{ background:#a9c3b4; }
      .wc-cip-trend-column.is-historical b{ color:#607184; }

      .wc-cip-trend-column span{
        color:#607184;
        font-size:12px;
        font-weight:800;
        white-space:nowrap;
      }

      .wc-cip-trend-legend{
        display:flex;
        flex-wrap:wrap;
        gap:8px 20px;
        margin-top:14px;
      }

      .wc-cip-trend-legend span{
        display:inline-flex;
        align-items:center;
        gap:8px;
        color:#4a5a6a;
        font-size:12.5px;
        font-weight:700;
      }

      .wc-cip-trend-legend span::before{
        content:"";
        width:12px;
        height:12px;
        border-radius:4px;
        background:var(--green);
      }

      .wc-cip-trend-legend span.is-historical::before{ background:#a9c3b4; }

      /* --- Major projects ------------------------------------------ */
      .wc-cip-major-list{
        margin:0;
        padding:0;
        list-style:none;
        display:grid;
        gap:10px;
      }

      .wc-cip-major-item{
        display:grid;
        grid-template-columns:auto minmax(0,1fr) auto;
        gap:16px;
        align-items:center;
        padding:16px 20px;
        border:1px solid rgba(0,63,40,.12);
        border-radius:16px;
        background:#fff;
        color:inherit;
        text-decoration:none;
      }

      a.wc-cip-major-item:hover,
      a.wc-cip-major-item:focus-visible{
        border-color:var(--green);
        box-shadow:0 6px 16px rgba(0,63,40,.08);
        transform:translateY(-1px);
      }

      .wc-cip-major-rank{
        display:grid;
        width:28px;
        height:28px;
        border-radius:999px;
        background:#e8f3eb;
        color:#08663f;
        place-items:center;
        font-size:12px;
        font-weight:900;
      }

      .wc-cip-major-body{ display:block; min-width:0; }

      .wc-cip-major-body strong{
        display:block;
        color:#003f28;
        font-size:15px;
        line-height:1.3;
      }

      .wc-cip-major-body small{
        display:block;
        margin-top:3px;
        color:#607184;
        font-size:12px;
        font-weight:700;
      }

      .wc-cip-major-item > b{
        color:var(--green);
        font-size:17px;
        font-weight:900;
        white-space:nowrap;
      }

      /* --- Financing panel ------------------------------------------ */
      .wc-cip-finance-panel{
        display:grid;
        grid-template-columns:minmax(0,1fr) minmax(0,1fr);
        gap:20px;
        align-items:start;
        padding:22px;
        border:1px solid rgba(0,63,40,.12);
        border-radius:20px;
        background:#f7fbf7;
      }

      .wc-cip-finance-media{ display:grid; gap:12px; }

      .wc-cip-finance-copy h3{
        margin:0 0 14px;
        color:var(--navy);
        font-size:1.05rem;
        font-weight:800;
      }

      @media(max-width:900px){
        .wc-cip-definition-grid,
        .wc-cip-finance-panel{ grid-template-columns:1fr; }
        .wc-cip-factor-grid,
        .wc-cip-benefit-grid{ grid-template-columns:repeat(2, minmax(0,1fr)); }
      }

      @media(max-width:650px){
        .wc-cip-factor-grid,
        .wc-cip-benefit-grid{ grid-template-columns:1fr; }
        .wc-cip-trend-chart{
          grid-auto-flow:row;
          grid-auto-columns:auto;
          align-items:stretch;
          min-height:0;
        }
        .wc-cip-trend-column{
          display:grid;
          grid-template-columns:64px minmax(0,1fr) auto;
          align-items:center;
          gap:10px;
          height:auto;
        }
        .wc-cip-trend-column{
          grid-template-columns:minmax(0,1fr) auto;
          padding:10px 0;
          border-bottom:1px solid rgba(0,63,40,.1);
        }
        .wc-cip-trend-column:last-child{ border-bottom:0; }
        .wc-cip-trend-column span{ order:-1; text-align:left; }
        /* bar heights don't translate to a stacked row without
           misrepresenting the values -- amounts carry it on small screens */
        .wc-cip-trend-column i{ display:none; }
        .wc-cip-major-item{ grid-template-columns:auto minmax(0,1fr); }
        .wc-cip-major-item > b{ grid-column:2; }
      }

      .wc-cip-element-grid{
        display:grid;
        grid-template-columns:repeat(2, minmax(0,1fr));
        gap:14px;
        margin:0 0 30px;
      }

      .wc-cip-element-card{
        min-height:178px;
        padding:20px;
        border:1px solid rgba(0,63,40,.12);
        border-radius:18px;
        background:#f7fbf7;
      }

      .wc-cip-element-card strong{
        display:block;
        margin:0 0 10px;
        color:var(--green);
        font-size:18px;
        line-height:1.2;
      }

      .wc-cip-element-card p{
        margin:0;
        color:var(--muted);
        font-size:14px;
        line-height:1.65;
      }

      .wc-cip-gfoa-video{
        position:relative;
        min-height:190px;
        overflow:hidden;
        border:1px solid rgba(0,63,40,.12);
        border-radius:18px;
        background:#07140f;
      }

      .wc-cip-gfoa-video iframe{
        display:block;
        width:100%;
        height:220px;
        border:0;
      }

      .wc-cip-finance-list{
        display:grid;
        grid-template-columns:repeat(3, minmax(0,1fr));
        gap:14px;
        margin:0;
        padding:0;
        list-style:none;
      }

      .wc-cip-finance-list li{
        padding:18px;
        border:1px solid rgba(0,63,40,.12);
        border-radius:18px;
        background:#ffffff;
        color:var(--muted);
        font-size:14px;
        line-height:1.6;
      }

      .wc-cip-finance-list strong{
        display:block;
        margin-bottom:4px;
        color:var(--green);
        font-size:13px;
        letter-spacing:.08em;
        text-transform:uppercase;
      }

      .wc-cip-fund-grid{
        display:grid;
        grid-template-columns:repeat(4, minmax(0,1fr));
        gap:14px;
      }

      .wc-cip-fund-card,
      .wc-cip-process-card,
      .wc-cip-link-card{
        border:1px solid rgba(23,32,51,.11);
        border-radius:24px;
        background:rgba(255,255,255,.9);
        box-shadow:0 14px 34px rgba(23,32,51,.08);
      }

      .wc-cip-fund-card{
        display:flex;
        flex-direction:column;
        min-height:230px;
        padding:22px;
        color:inherit;
        text-decoration:none;
      }

      .wc-cip-fund-card small{
        display:block;
        min-height:46px;
        color:var(--muted);
        font-size:12px;
        font-weight:900;
        letter-spacing:.08em;
        line-height:1.35;
        text-transform:uppercase;
      }

      .wc-cip-fund-card strong{
        display:block;
        margin-top:0;
        color:var(--green);
        font-size:clamp(28px, 3vw, 42px);
        line-height:1;
      }

      .wc-cip-fund-card em{
        display:block;
        margin-top:8px;
        color:var(--muted);
        font-size:12px;
        font-style:normal;
        font-weight:700;
      }

      .wc-cip-fund-card p{
        margin:16px 0 0;
        color:var(--muted);
        font-size:14px;
        line-height:1.55;
      }

      .wc-cip-fund-card span{
        margin-top:auto;
        padding-top:18px;
        color:var(--green);
        font-size:13px;
        font-weight:900;
      }

      .wc-cip-story-grid{
        display:grid;
        grid-template-columns:minmax(0, .95fr) minmax(0, 1.05fr);
        gap:28px;
        align-items:start;
      }

      .wc-cip-story-image{
        overflow:hidden;
        border-radius:26px;
      }

      .wc-cip-story-image img{
        width:100%;
        min-height:420px;
        object-fit:cover;
      }

      .wc-cip-process-grid{
        display:grid;
        grid-template-columns:repeat(4, minmax(0,1fr));
        gap:14px;
        margin-top:24px;
      }

      .wc-cip-process-card{
        padding:22px;
      }

      .wc-cip-process-card strong{
        display:flex;
        align-items:center;
        justify-content:center;
        width:34px;
        height:34px;
        margin-bottom:18px;
        border-radius:999px;
        background:#003f28;
        color:#ffffff;
        font-size:14px;
      }

      .wc-cip-process-card h3{
        margin:0 0 10px;
        color:var(--text);
        font-size:18px;
        line-height:1.2;
      }

      .wc-cip-process-card p{
        margin:0;
        color:var(--muted);
        font-size:14px;
        line-height:1.6;
      }

      .wc-cip-link-grid{
        display:grid;
        grid-template-columns:repeat(3, minmax(0,1fr));
        gap:14px;
      }

      .wc-cip-link-card{
        display:flex;
        flex-direction:column;
        min-height:170px;
        padding:24px;
        color:inherit;
        text-decoration:none;
      }

      .wc-cip-link-card h3{
        margin:0 0 10px;
        color:var(--text);
        font-size:20px;
      }

      .wc-cip-link-card p{
        margin:0;
        color:var(--muted);
        font-size:14px;
        line-height:1.6;
      }

      .wc-cip-link-card span{
        margin-top:auto;
        padding-top:18px;
        color:var(--green);
        font-size:13px;
        font-weight:900;
      }

      @media(max-width:1050px){
        .wc-cip-overview-metrics,
        .wc-cip-fund-grid,
        .wc-cip-process-grid,
        .wc-cip-link-grid{
          grid-template-columns:repeat(2, minmax(0,1fr));
        }

        .wc-cip-gfoa-section{
          grid-template-columns:1fr;
        }

        .wc-cip-gfoa-media{
          grid-template-columns:repeat(2, minmax(0,1fr));
        }

        .wc-cip-story-grid{
          grid-template-columns:1fr;
        }
      }

      @media(max-width:680px){
        .wc-cip-story-hero,
        .wc-cip-story-hero img{
          min-height:540px;
        }

        .wc-cip-story-panel{
          left:16px;
          bottom:16px;
          width:calc(100% - 32px);
          padding:22px;
          border-radius:22px;
        }

        .wc-cip-overview-metrics,
        .wc-cip-fund-grid,
        .wc-cip-process-grid,
        .wc-cip-link-grid,
        .wc-cip-element-grid,
        .wc-cip-finance-list,
        .wc-cip-gfoa-media{
          grid-template-columns:1fr;
        }

        .wc-cip-story-section{
          margin-bottom:54px;
        }

        .wc-cip-story-image img{
          min-height:280px;
        }

        .wc-cip-gfoa-video iframe{
          height:210px;
        }
      }

      .wc-project-index-section{
        position:relative;
        width:100vw;
        max-width:100vw;
        left:50%;
        margin-left:-50vw;
        margin-right:-50vw;
        padding:34px 24px;
        background:#ffffff;
        font-family:Arial, Helvetica, sans-serif;
        box-sizing:border-box;
      }

      .wc-project-index-inner{
        width:100%;
        max-width:1180px;
        margin:0 auto;
      }

      .wc-project-index-header{
        margin-bottom:22px;
        padding:28px;
        border:1px solid rgba(0,63,40,.12);
        border-radius:28px;
        background:#f7fbf7;
      }

      .wc-project-index-header .page-intro{
        max-width:760px;
      }

      .wc-project-search-stats{
        display:grid;
        grid-template-columns:repeat(3, minmax(0,1fr));
        gap:1px;
        margin-top:24px;
        overflow:hidden;
        border:1px solid rgba(0,63,40,.12);
        border-radius:20px;
        background:rgba(0,63,40,.12);
      }

      .wc-project-search-stat{
        padding:18px;
        background:#ffffff;
      }

      .wc-project-search-stat strong{
        display:block;
        color:var(--green);
        font-size:28px;
        line-height:1;
      }

      .wc-project-search-stat span{
        display:block;
        margin-top:8px;
        color:var(--muted);
        font-size:11px;
        font-weight:900;
        letter-spacing:.08em;
        text-transform:uppercase;
      }

      .wc-project-full-search-row{
        display:flex;
        justify-content:flex-start;
        margin:18px 0 26px 0;
      }

      .wc-project-full-search-link{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        min-height:42px;
        padding:0 18px;
        border-radius:999px;
        border:1px solid rgba(0,63,40,.18);
        background:#ffffff;
        color:var(--green);
        font-family:Arial, Helvetica, sans-serif;
        font-size:12px;
        font-weight:800;
        letter-spacing:.08em;
        text-transform:uppercase;
        text-decoration:none;
        box-shadow:none;
        transition:transform .22s ease, box-shadow .22s ease;
      }

      .wc-project-full-search-link:hover{
        transform:translateY(-2px);
        box-shadow:0 10px 20px rgba(23,32,51,.08);
      }

      .wc-project-toolbar{
        display:grid;
        gap:16px;
        margin-bottom:18px;
        padding:18px;
        background:#ffffff;
        border-radius:24px;
        border:1px solid rgba(23,32,51,.10);
        box-shadow:0 14px 34px rgba(23,32,51,.06);
      }

      .wc-project-search-wrap{
        position:relative;
        width:100%;
      }

      .wc-project-search{
        width:100% !important;
        height:58px !important;
        padding:0 18px 0 54px !important;
        text-indent:0 !important;
        border-radius:18px;
        border:1px solid rgba(0,63,40,.13);
        background:#f7fbf7;
        font-size:16px;
        color:var(--text);
        outline:none;
        box-sizing:border-box;
        transition:
          border-color .22s ease,
          box-shadow .22s ease,
          background .22s ease;
      }

      .wc-project-search::placeholder{
        color:var(--muted);
        opacity:1;
      }

      .wc-project-search:focus{
        border-color:var(--green);
        background:#ffffff;
        box-shadow:0 0 0 4px rgba(0,98,49,0.08);
      }

      .wc-project-search-icon{
        position:absolute !important;
        left:20px !important;
        top:50% !important;
        transform:translateY(-50%) !important;
        width:18px !important;
        height:18px !important;
        opacity:.55 !important;
        pointer-events:none !important;
        z-index:2 !important;
      }

      .wc-project-filter-group{
        display:grid;
        grid-template-columns:1fr;
        gap:12px;
        width:100%;
      }

      .wc-project-filter-set{
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        align-items:center;
        width:100%;
        padding-top:12px;
        border-top:1px solid rgba(23,32,51,.08);
      }

      .wc-project-filter-label{
        color:var(--muted);
        font-size:10px;
        font-weight:800;
        letter-spacing:.12em;
        text-transform:uppercase;
        margin-right:2px;
      }

      .wc-project-filter{
        min-height:36px;
        padding:0 13px;
        border-radius:999px;
        border:1px solid rgba(0,98,49,0.14);
        background:#ffffff;
        color:var(--text);
        font-size:12px;
        font-weight:800;
        cursor:pointer;
        transition:
          background .22s ease,
          color .22s ease,
          border-color .22s ease,
          transform .22s ease;
      }

      .wc-project-filter:hover{
        transform:translateY(-1px);
      }

      .wc-project-filter.active{
        background:#003f28;
        color:#ffffff;
        border-color:#003f28;
      }

      .wc-project-results-row{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin:0 0 14px 0;
        color:var(--muted);
        font-size:12px;
        font-weight:700;
      }

      .wc-project-grid{
        display:flex !important;
        flex-direction:column !important;
        gap:14px !important;
        width:100% !important;
        max-width:100% !important;
        margin:0 !important;
        padding:0 !important;
        box-sizing:border-box !important;
      }

      .wc-project-row{
        display:flex !important;
        flex-direction:row !important;
        align-items:stretch !important;
        justify-content:flex-start !important;
        gap:14px !important;
        width:100% !important;
        max-width:100% !important;
        margin:0 !important;
        padding:0 !important;
        box-sizing:border-box !important;
      }

      .wc-project-card{
        cursor:pointer;
        flex:0 0 calc((100% - 28px) / 3) !important;
        width:calc((100% - 28px) / 3) !important;
        max-width:calc((100% - 28px) / 3) !important;
        min-width:0 !important;
        box-sizing:border-box !important;
        position:relative;
        display:flex;
        flex-direction:column;
        align-self:stretch !important;
        gap:13px;
        padding:18px;
        background:#ffffff;
        border-radius:20px;
        border:1px solid rgba(23,32,51,.11);
        box-shadow:0 14px 34px rgba(23,32,51,.06);
        transition:
          transform .24s ease,
          box-shadow .24s ease,
          border-color .24s ease;
      }

      .wc-project-card:hover{
        transform:translateY(-2px);
        border-color:rgba(0,63,40,.22);
        box-shadow:0 18px 42px rgba(23,32,51,.09);
      }

      .wc-project-card-top{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:8px;
      }

      .wc-project-card h3{
        margin:0;
        color:var(--text);
        font-size:19px;
        line-height:1.24;
        font-weight:700;
      }

      .wc-project-category{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        padding:5px 8px;
        border-radius:999px;
        background:#f7fbf7;
        color:var(--green);
        font-size:9px;
        font-weight:700;
        letter-spacing:.08em;
        text-transform:uppercase;
        white-space:nowrap;
      }

      .wc-project-description{
        color:var(--muted);
        font-size:13px;
        line-height:1.6;
        position:relative;
      }

      .wc-project-card.has-overflow .wc-project-description{
        max-height:54px;
        overflow:hidden;
      }

      .wc-project-card.is-expanded .wc-project-description{
        max-height:none;
        overflow:visible;
      }

      .wc-project-card.has-overflow .wc-project-description::after{
        content:"";
        position:absolute;
        left:0;
        right:0;
        bottom:0;
        height:24px;
        background:linear-gradient(
          180deg,
          rgba(255,255,255,0) 0%,
          #ffffff 85%
        );
        pointer-events:none;
      }

      .wc-project-card.is-expanded .wc-project-description::after{
        display:none;
      }

      .wc-project-read-more{
        align-self:flex-start;
        margin-top:-6px;
        padding:0;
        border:0;
        background:transparent;
        color:var(--green);
        font-family:Arial, Helvetica, sans-serif;
        font-size:11px;
        font-weight:800;
        letter-spacing:.06em;
        text-transform:uppercase;
        cursor:pointer;
      }

      .wc-project-read-more:hover{
        text-decoration:underline;
      }

      .wc-project-metrics{
        display:grid;
        grid-template-columns:1fr;
        gap:8px;
        margin-top:auto;
        align-items:stretch;
      }

      .wc-project-metric{
        min-height:auto;
        padding:10px 0;
        border-radius:0;
        background:transparent;
        border:0;
        border-top:1px solid rgba(23,32,51,.08);
        display:flex;
        flex-direction:column;
        justify-content:flex-start;
        box-sizing:border-box;
      }

      .wc-project-metric span{
        display:block;
        margin-bottom:4px;
        color:var(--muted);
        font-size:9px;
        font-weight:700;
        letter-spacing:.10em;
        text-transform:uppercase;
      }

      .wc-project-metric strong{
        display:block;
        color:var(--text);
        font-size:13px;
        line-height:1.25;
        font-weight:700;
        word-break:break-word;
        overflow-wrap:anywhere;
      }

      .wc-project-metric:first-child strong{
        white-space:nowrap;
      }

      .wc-project-card-action{
        display:inline-flex;
        align-items:center;
        justify-content:flex-start;
        margin-top:2px;
        color:var(--green);
        font-size:12px;
        font-weight:900;
        letter-spacing:.08em;
        text-transform:uppercase;
      }

      .wc-project-card.is-historical{
        cursor:default;
      }

      .wc-project-card-action.is-static{
        color:#607184;
        letter-spacing:.06em;
      }

      .wc-project-card-action.is-static::after{
        display:none;
      }

      .wc-project-card-action::after{
        content:"";
        width:28px;
        height:1px;
        margin-left:10px;
        background:#003f28;
        transition:width .22s ease;
      }

      .wc-project-card:hover .wc-project-card-action::after{
        width:44px;
      }

      .wc-project-status{
        display:inline-flex;
        align-items:center;
        gap:8px;
        width:max-content;
        padding:7px 10px;
        border-radius:999px;
        font-size:10px;
        font-weight:700;
        letter-spacing:.06em;
        text-transform:uppercase;
      }

      .wc-project-status::before{
        content:"";
        width:8px;
        height:8px;
        border-radius:999px;
        background:currentColor;
      }

      .wc-project-card-badges{
        display:flex;
        flex-wrap:wrap;
        gap:7px;
        margin-top:-2px;
      }

      .wc-project-card-badge{
        display:inline-flex;
        align-items:center;
        gap:7px;
        width:max-content;
        padding:7px 9px;
        border-radius:999px;
        background:rgba(52,64,84,0.08);
        color:var(--text);
        border:1px solid rgba(52,64,84,0.16);
        font-size:10px;
        font-weight:800;
        letter-spacing:.04em;
        text-transform:uppercase;
      }

      .wc-status-planning{ background:rgba(209,190,120,0.18); color:#8b6d12; }
      .wc-status-design{ background:rgba(90,110,127,0.12); color:var(--muted); }
      .wc-status-construction{ background:rgba(0,98,49,0.12); color:var(--green); }
      .wc-status-complete{ background:rgba(52,64,84,0.10); color:var(--text); }

      .wc-project-empty{
        display:none;
        padding:24px 16px;
        text-align:center;
        color:var(--muted);
        font-size:13px;
      }

      .wc-project-load-more{
        display:none;
        margin:20px auto 0 auto;
        padding:11px 18px;
        border:0;
        border-radius:999px;
        background:linear-gradient(135deg,#006231 0%,#0b7741 100%);
        color:#ffffff;
        font-family:Arial, Helvetica, sans-serif;
        font-size:12px;
        font-weight:800;
        letter-spacing:.08em;
        text-transform:uppercase;
        cursor:pointer;
        box-shadow:0 10px 24px rgba(0,98,49,0.16);
        transition:transform .22s ease, box-shadow .22s ease;
      }

      .wc-project-load-more:hover{
        transform:translateY(-2px);
        box-shadow:0 14px 28px rgba(0,98,49,0.20);
      }

      @media(max-width:1100px){
        .wc-cip-feature-grid,
        .wc-cip-info-grid{
          flex-direction:column;
        }

        .wc-cip-feature-card,
        .wc-cip-panel{
          width:100%;
        }

        .wc-project-row{
          flex-wrap:wrap !important;
        }

        .wc-project-card{
          flex:0 0 calc((100% - 24px) / 2) !important;
          width:calc((100% - 24px) / 2) !important;
          max-width:calc((100% - 24px) / 2) !important;
        }
      }

      @media(max-width:760px){
        body.wc-cip-overview-page #content{
          padding:24px 18px 0;
        }

        .wc-cip-main-section{
          width:100% !important;
          max-width:100% !important;
          left:auto !important;
          margin-left:0 !important;
          margin-right:0 !important;
          padding:0 12px 0 12px;
        }

        .wc-cip-sticky-nav-shell{
          width:100% !important;
          max-width:100% !important;
          margin-left:auto !important;
          margin-right:auto !important;
          margin-bottom:14px;
          padding:0;
        }

        .wc-cip-proxy-nav{
          justify-content:flex-start;
          flex-wrap:nowrap;
          gap:0;
          margin:0;
          padding:0 8px;
          border-radius:0;
          overflow-x:auto;
          -webkit-overflow-scrolling:touch;
          scrollbar-width:none;
        }

        .wc-cip-proxy-nav::-webkit-scrollbar{
          display:none;
        }

        .wc-cip-proxy-button,
        .wc-cip-proxy-link{
          flex:0 0 auto;
          min-height:40px;
          padding:0 10px;
          font-size:10px;
          white-space:nowrap;
        }

        .wc-intro-section{
          width:100% !important;
          max-width:100% !important;
          left:auto !important;
          margin-left:0 !important;
          margin-right:0 !important;
          padding:24px 0 20px 0;
        }

        .wc-intro-inner{
          padding:0 12px;
        }

        .wc-intro-inner h2{
          font-size:26px;
        }

        .wc-intro-inner p{
          font-size:13px;
          line-height:1.5;
          text-align:left;
        }

        .wc-cip-feature-section,
        .wc-cip-info-section{
          padding:0 0 22px 0 !important;
        }

        .wc-cip-feature-card{
          display:block;
          grid-template-columns:1fr;
          border-radius:14px;
        }

        .wc-cip-feature-image,
        .wc-cip-feature-image img{
          min-height:170px;
        }

        .wc-cip-feature-content{
          padding:18px 16px;
        }

        .wc-cip-feature-content h2,
        .wc-cip-content h2{
          font-size:19px;
        }

        .wc-cip-feature-content p,
        .wc-cip-content p,
        .wc-cip-list li{
          font-size:12px;
          line-height:1.5;
        }

        .wc-cip-panel{
          border-radius:14px;
        }

        .wc-cip-video iframe{
          height:190px;
        }

        .wc-cip-content{
          padding:18px 16px 16px 16px;
        }

        .wc-project-index-section{
          width:100% !important;
          max-width:100% !important;
          left:auto !important;
          margin-left:0 !important;
          margin-right:0 !important;
          padding:24px 12px !important;
          overflow-x:hidden !important;
        }

        .wc-project-index-inner{
          width:100% !important;
          max-width:100% !important;
        }

        .wc-project-index-header{
          margin-bottom:18px;
          padding:22px;
          border-radius:22px;
        }

        .wc-project-search-stats{
          grid-template-columns:1fr;
          margin-top:18px;
        }

        .wc-project-full-search-row{
          margin:18px 0 20px 0;
        }

        .wc-project-full-search-link{
          width:100%;
          min-height:48px;
          padding:0 18px;
          font-size:13px;
        }

        .wc-project-toolbar{
          padding:14px !important;
          border-radius:20px;
          gap:10px;
        }

        .wc-project-search-wrap{
          flex:1 1 100%;
          min-width:0;
          width:100%;
        }

        .wc-project-search{
          height:52px !important;
          padding-left:48px !important;
          font-size:14px !important;
          border-radius:16px;
        }

        .wc-project-search-icon{
          left:16px !important;
          width:15px !important;
          height:15px !important;
        }

        .wc-project-filter-group{
          gap:9px;
        }

        .wc-project-filter-set{
          width:100%;
          gap:7px;
        }

        .wc-project-filter-label{
          width:100%;
          margin-bottom:2px;
          font-size:11px;
        }

        .wc-project-filter{
          height:34px;
          padding:0 10px;
          font-size:12px;
          flex:0 1 auto;
        }

        .wc-project-results-row{
          flex-direction:column;
          align-items:flex-start;
          gap:5px;
          margin-bottom:12px;
          font-size:12px;
        }

        .wc-project-grid{
          gap:12px !important;
        }

        .wc-project-row{
          flex-direction:column !important;
          gap:12px !important;
          width:100% !important;
        }

        .wc-project-card{
          flex:1 1 auto !important;
          width:100% !important;
          max-width:100% !important;
          min-width:0 !important;
          align-self:auto !important;
          padding:15px !important;
          border-radius:14px;
          gap:10px;
        }

        .wc-project-card:hover{
          transform:none;
        }

        .wc-project-card-top{
          flex-direction:column;
          gap:10px;
        }

        .wc-project-card h3{
          font-size:17px;
          line-height:1.22;
        }

        .wc-project-category{
          align-self:flex-start;
          white-space:normal;
          text-align:left;
          line-height:1.25;
        }

        .wc-project-description{
          font-size:12px;
          line-height:1.5;
        }

        .wc-project-card.has-overflow .wc-project-description{
          max-height:66px;
        }

        .wc-project-metrics{
          grid-template-columns:1fr;
          gap:10px;
        }

        .wc-project-metric{
          min-height:auto;
          padding:10px 0;
        }

        .wc-project-metric strong{
          font-size:13px;
          line-height:1.3;
        }

        .wc-project-status{
          width:100%;
          justify-content:center;
          text-align:center;
          padding:8px 10px;
          font-size:10px;
        }

        .wc-project-card-badge{
          width:100%;
          justify-content:center;
          text-align:center;
        }

        .wc-project-load-more{
          width:100%;
          padding:15px 18px;
          font-size:13px;
        }
      }

      @media(max-width:420px){
        .wc-cip-main-section{
          padding:10px 8px 0 8px;
        }

        .wc-cip-feature-grid,
        .wc-cip-info-grid{
          gap:14px;
        }

        .wc-cip-feature-image,
        .wc-cip-feature-image img{
          min-height:150px;
        }

        .wc-cip-feature-content,
        .wc-cip-content{
          padding:16px 14px 15px 14px;
        }

        .wc-cip-feature-content h2,
        .wc-cip-content h2{
          font-size:18px;
        }

        .wc-cip-video iframe{
          height:170px;
        }

        .wc-project-index-section{
          padding:22px 8px !important;
        }

        .wc-project-toolbar{
          padding:10px !important;
        }

        .wc-project-filter{
          flex:1 1 calc(50% - 8px);
          padding:0 8px;
          font-size:11px;
        }

        .wc-project-card{
          padding:14px !important;
        }

        .wc-project-card h3{
          font-size:16px;
        }
      }

      /* Dark mode: this page is built from hardcoded hex colors rather than
         the shared CSS variables (it's an inline style block, injected after
         style.css loads, so it would otherwise always win the cascade and
         force a white page regardless of theme). Text colors close to an
         existing variable's light-mode value were already substituted for
         var(--text)/var(--muted)/var(--green) above, which adapts them
         automatically; the white/light section and card backgrounds below
         still need an explicit dark surface, matching the dark card
         treatment used elsewhere on the site. Solid green buttons/badges and
         decorative gradients/underlines are intentionally left out -- they
         already have light text and read fine unchanged in both themes. */
      :root[data-theme="dark"] body,
      :root[data-theme="dark"] .wc-cip-main-section,
      :root[data-theme="dark"] .wc-intro-section,
      :root[data-theme="dark"] .wc-cip-feature-section,
      :root[data-theme="dark"] .wc-cip-info-section,
      :root[data-theme="dark"] .wc-project-index-section{
        background: var(--light);
      }

      :root[data-theme="dark"] .wc-cip-feature-card,
      :root[data-theme="dark"] .wc-cip-panel,
      :root[data-theme="dark"] .wc-cip-finance-list li,
      :root[data-theme="dark"] .wc-cip-fund-card,
      :root[data-theme="dark"] .wc-cip-process-card,
      :root[data-theme="dark"] .wc-cip-link-card,
      :root[data-theme="dark"] .wc-cip-overview-metric,
      :root[data-theme="dark"] .wc-cip-element-card,
      :root[data-theme="dark"] .wc-cip-definition-tests,
      :root[data-theme="dark"] .wc-cip-definition-card,
      :root[data-theme="dark"] .wc-cip-factor-card,
      :root[data-theme="dark"] .wc-cip-benefit-card,
      :root[data-theme="dark"] .wc-cip-trend-chart,
      :root[data-theme="dark"] .wc-cip-finance-panel,
      :root[data-theme="dark"] .wc-cip-major-item,
      :root[data-theme="dark"] .wc-project-index-header,
      :root[data-theme="dark"] .wc-project-search-stat,
      :root[data-theme="dark"] .wc-project-full-search-link,
      :root[data-theme="dark"] .wc-project-toolbar,
      :root[data-theme="dark"] .wc-project-search:focus,
      :root[data-theme="dark"] .wc-project-filter,
      :root[data-theme="dark"] .wc-project-card{
        background: rgba(14,28,22,.92);
        border-color: var(--border);
      }

      :root[data-theme="dark"] .wc-cip-definition-tests h3,
      :root[data-theme="dark"] .wc-cip-factor-card h3,
      :root[data-theme="dark"] .wc-cip-subhead,
      :root[data-theme="dark"] .wc-cip-major-body strong,
      :root[data-theme="dark"] .wc-cip-trend-column b{
        color: #e8f3eb;
      }

      :root[data-theme="dark"] body.wc-cip-overview-page .page-nav{
        border-top-color: var(--border);
      }
    </style>

    ${!isStandaloneSearchPage ? `
    <div class="wc-cip-page-header">
      <!-- nav.js builds the breadcrumb from .page-eyebrow + .page-title, and
           the page still needs an h1 -- kept for those, visually hidden so the
           page opens on the capital project definition. -->
      <div class="page-eyebrow wc-sr-only">Capital Projects</div>
      <h1 class="page-title wc-sr-only">Capital Improvement Plan</h1>
    </div>
    ` : ""}

    <section class="wc-cip-main-section">
      <div class="wc-cip-main-inner">
        ${!isStandaloneSearchPage ? `
        <section class="wc-cip-story-section" id="wc-cip-what-counts" aria-label="What is a capital project">
          <div class="wc-cip-story-header">
            <h2>What is a capital project?</h2>
            <p>Walton County defines a capital project as a significant, non-recurring expenditure for the construction, expansion, purchase, major repair, or replacement of buildings, utility systems, streets, infrastructure, or public property. Capital projects create or extend the life of a public asset; routine operating costs do not.</p>
          </div>
          <div class="wc-cip-definition-grid">
            <div class="wc-cip-definition-tests">
              <h3>A request is capital when it meets all four tests</h3>
              <ol class="wc-cip-test-list">
                <li><strong>Non-recurring</strong>A one-time or infrequent expenditure rather than an annual operating cost.</li>
                <li><strong>Significant cost</strong>Large enough to plan, schedule, and fund deliberately rather than absorb in a department&rsquo;s operating budget.</li>
                <li><strong>Long useful life</strong>The asset serves the public for years, well beyond the budget year that pays for it.</li>
                <li><strong>Creates or preserves an asset</strong>Builds, expands, replaces, or materially extends the life of County property.</li>
              </ol>
            </div>
            <div class="wc-cip-definition-contrast">
              <article class="wc-cip-definition-card is-included">
                <span>Counted as capital</span>
                <ul>
                  <li>Road, bridge, sidewalk, and drainage construction</li>
                  <li>New or expanded County buildings and facilities</li>
                  <li>Major renovations and system replacements</li>
                  <li>Land, rights-of-way, and easement purchases</li>
                  <li>Machinery, vehicles, and equipment above the capital threshold</li>
                </ul>
              </article>
              <article class="wc-cip-definition-card is-excluded">
                <span>Not capital</span>
                <ul>
                  <li>Routine maintenance and repairs</li>
                  <li>Operating supplies and consumables</li>
                  <li>Salaries and day-to-day service delivery</li>
                  <li>Studies with no resulting asset</li>
                  <li>Items below the capitalization threshold</li>
                </ul>
              </article>
            </div>
          </div>
          <p class="wc-cip-section-note">Equipment with a value of $5,000 or more and a useful life of at least one year is recorded on the General Property List and capitalized. See the <a href="summary-of-machinery-vehicles-and-equipment.html">Machinery, Vehicles &amp; Equipment Ledger</a> for those requests.</p>
        </section>

        <section class="wc-cip-story-section" id="wc-cip-elements" aria-label="What goes into a capital project">
          <div class="wc-cip-story-header">
            <h2>What goes into a capital project.</h2>
            <p>A capital project is more than construction. Each one combines property, physical work, professional services, and oversight, paid for through one or more sources of financing.</p>
          </div>
          <div class="wc-cip-element-grid">
            <article class="wc-cip-element-card">
              <strong>Land</strong>
              <p>Purchase of necessary property, including building acquisitions, rights-of-way, easements, and property needed to support future infrastructure and public facilities.</p>
            </article>
            <article class="wc-cip-element-card">
              <strong>Construction / Improvements</strong>
              <p>Expansions, renovations, major replacements, and mechanical or electrical installations, including site preparation and infrastructure such as sidewalks, streets, parking, drainage, and utility connections.</p>
            </article>
            <article class="wc-cip-element-card">
              <strong>Design / Professional Services</strong>
              <p>Plans, specifications, programming, surveying, engineering, development costs, permitting support, and environmental impact studies necessary for approved capital projects.</p>
            </article>
            <article class="wc-cip-element-card">
              <strong>Construction Engineering &amp; Inspection</strong>
              <p>Plan reviews, material testing, supervision, quality assurance, and compliance oversight that keep a project on specification through construction.</p>
            </article>
          </div>
          <div class="wc-cip-finance-panel">
            <div class="wc-cip-finance-copy">
              <h3>Sources of Financing</h3>
              <ul class="wc-cip-finance-list">
                <li><strong>Current Revenues</strong>The County primarily funds capital on a cash basis from available revenue streams, including resources legally restricted to specific purposes.</li>
                <li><strong>Grants</strong>Capital grants from federal, state, and regional agencies support eligible projects and carry local match, compliance, and reporting requirements.</li>
                <li><strong>Debt</strong>Where appropriate, the County issues debt for major projects using structures designed to manage cost and risk.</li>
              </ul>
            </div>
            <div class="wc-cip-finance-media">
              <div class="wc-cip-gfoa-video">
                <iframe src="https://www.youtube-nocookie.com/embed/2ha4PCBgw2Y?controls=1&amp;modestbranding=1&amp;rel=0&amp;playsinline=1" title="Capital Improvement Plan Elements" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe>
              </div>
              <div class="wc-cip-gfoa-video">
                <iframe src="https://www.youtube-nocookie.com/embed/UI4QSqOn7o0?controls=1&amp;modestbranding=1&amp;rel=0&amp;playsinline=1" title="Sources of Financing" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe>
              </div>
            </div>
          </div>
        </section>

        <section class="wc-cip-story-section" id="wc-cip-why-new-projects" aria-label="Why new capital projects are necessary">
          <div class="wc-cip-story-header">
            <h2>Why are new projects necessary?</h2>
            <p>Capital work is not optional spending that can simply be deferred. Walton County is one of the fastest-growing counties in Florida, and its infrastructure has to keep pace with the demand placed on it &mdash; while the assets already built continue to age.</p>
          </div>
          <div class="wc-cip-factor-grid">
            <article class="wc-cip-factor-card">
              <h3>Growth arrives before the infrastructure</h3>
              <p>New homes, businesses, and visitors add traffic, permitting activity, emergency calls, and demand on parks, beaches, and utilities. Florida&rsquo;s concurrency requirement is that the infrastructure supporting development be available as that development occurs, not years afterward.</p>
            </article>
            <article class="wc-cip-factor-card">
              <h3>Assets wear out</h3>
              <p>Roads, bridges, culverts, roofs, and mechanical systems all have a service life. Replacing them on schedule costs less than rebuilding them after failure, and deferring the work transfers a larger bill to a later year.</p>
            </article>
            <article class="wc-cip-factor-card">
              <h3>Deferral is more expensive</h3>
              <p>Construction costs, land prices, and rights-of-way generally rise over time. A project delayed is rarely a project made cheaper, and emergency repairs cost more than planned replacement.</p>
            </article>
            <article class="wc-cip-factor-card">
              <h3>Service levels have to be maintained</h3>
              <p>Response times, drainage capacity, beach access, and road conditions are the standards residents experience day to day. Holding those steady as the county grows requires adding capacity, not just maintaining what exists.</p>
            </article>
            <article class="wc-cip-factor-card">
              <h3>Growth helps pay for itself</h3>
              <p>Impact and mobility fees, plat fees, and tourist development taxes are collected specifically to fund the infrastructure that growth and tourism demand. Those dollars are restricted to that purpose and cannot be spent on general operations.</p>
            </article>
            <article class="wc-cip-factor-card">
              <h3>Outside funding is time-limited</h3>
              <p>State and federal awards come with deadlines and matching requirements. Having a designed, permitted project ready is what allows the County to capture that funding rather than pay the full cost locally.</p>
            </article>
          </div>

          <h3 class="wc-cip-subhead">What benefit will they provide?</h3>
          <p class="wc-cip-subhead-note">Capital spending is what turns revenue into something residents and visitors use every day. Each project is expected to deliver at least one of these.</p>
          <div class="wc-cip-benefit-grid">
            <article class="wc-cip-benefit-card">
              <strong>Safer travel</strong>
              <p>Turn lanes, signals, bridge replacements, sidewalks, and multi-use paths reduce conflict points and give people safer ways to move through the county on foot, by bike, and by car.</p>
            </article>
            <article class="wc-cip-benefit-card">
              <strong>Less flooding and storm damage</strong>
              <p>Drainage, stormwater, and beach and dune work protect homes, roads, and public property, and help the county recover faster after a storm.</p>
            </article>
            <article class="wc-cip-benefit-card">
              <strong>Faster emergency response</strong>
              <p>Fire stations, public safety facilities, and the roads connecting them shorten the distance between a call for help and the crew answering it.</p>
            </article>
            <article class="wc-cip-benefit-card">
              <strong>Capacity that keeps up with growth</strong>
              <p>Added road, facility, and utility capacity keeps service levels steady as population and visitation rise, instead of degrading as demand increases.</p>
            </article>
            <article class="wc-cip-benefit-card">
              <strong>Lower long-term cost</strong>
              <p>Replacing an asset on schedule avoids emergency repairs, extends the life of what the County already owns, and reduces the maintenance carried in the operating budget.</p>
            </article>
            <article class="wc-cip-benefit-card">
              <strong>Places people use</strong>
              <p>Beach access, parks, trails, libraries, and recreation facilities are the public spaces residents and visitors use most directly, and they support the tourism economy that funds much of this work.</p>
            </article>
          </div>
        </section>

        <section class="wc-cip-story-section" id="wc-cip-spending-level" aria-label="How the level of capital spending is determined">
          <div class="wc-cip-story-header">
            <h2>How is the level of capital spending determined?</h2>
            <p>Capital spending is not set by a target amount. It is built from the bottom up each year: departments identify needs, and the Office of Management and Budget tests how much of that can actually be paid for without straining operations or reserves.</p>
          </div>
          <div class="wc-cip-factor-grid">
            <article class="wc-cip-factor-card">
              <h3>Available cash</h3>
              <p>The County funds capital primarily on a pay-as-you-go basis from current revenues, so the level of spending is limited by what each fund can support in the year the work is scheduled.</p>
            </article>
            <article class="wc-cip-factor-card">
              <h3>Revenue restrictions</h3>
              <p>Much of the money is legally restricted. Fuel taxes must go to transportation, tourist development taxes to tourism-related purposes, impact and plat fees to the growth they offset. Restricted dollars cannot be redirected to an unrelated project.</p>
            </article>
            <article class="wc-cip-factor-card">
              <h3>Grant awards and match</h3>
              <p>State and federal awards raise what the County can deliver, but each carries a local match, compliance, and reporting obligation that has to be budgeted alongside the award.</p>
            </article>
            <article class="wc-cip-factor-card">
              <h3>Debt capacity</h3>
              <p>Debt is used sparingly and only where it fits County financial policy. Existing obligations are repaid from the half-cent sales tax rather than property taxes, which preserves capacity for future needs.</p>
            </article>
            <article class="wc-cip-factor-card">
              <h3>Project readiness</h3>
              <p>Design, permitting, right-of-way, and procurement all have to line up. A project is funded in the year it can realistically be delivered, which is why large efforts are phased across several years.</p>
            </article>
            <article class="wc-cip-factor-card">
              <h3>Operating impact</h3>
              <p>Every new facility, road, or vehicle adds ongoing cost to maintain, staff, and insure. That recurring impact is weighed before a project is added to the plan.</p>
            </article>
          </div>
        </section>

        ${cipYearTotals.length ? `
        <section class="wc-cip-story-section" id="wc-cip-trend" aria-label="Capital spending trend">
          <div class="wc-cip-story-header">
            <h2>Is capital spending going up or down?</h2>
            <p><strong>${escapeHtml(cipTrend.headline)}</strong> ${escapeHtml(cipTrend.detail)}</p>
          </div>
          <div class="wc-cip-trend-chart" role="img" aria-label="Planned capital by fiscal year: ${escapeHtml(cipYearTotals.map(entry => entry.label + " " + formatMoneyShort(entry.total)).join(", "))}">
            ${cipYearTotals.map(entry => `
              <div class="wc-cip-trend-column${entry.historical ? " is-historical" : ""}">
                <b>${escapeHtml(formatMoneyShort(entry.total))}</b>
                <i style="height:${cipTrendMax ? Math.max(4, Math.round((entry.total / cipTrendMax) * 100)) : 4}%"></i>
                <span>${escapeHtml(entry.label)}</span>
              </div>
            `).join("")}
          </div>
          <div class="wc-cip-trend-legend">
            <span class="is-historical">Prior work plans (FY 2025&ndash;FY 2026)</span>
            <span>Adopted five-year plan (FY 2027&ndash;FY 2031)</span>
          </div>
          <p class="wc-cip-section-note">FY 2025 and FY 2026 figures come from the County&rsquo;s earlier five-year work plans and are shown for context; they are not part of the current adopted plan. Later plan years are estimates that are re-evaluated every budget cycle, so out-year totals typically grow as projects are identified and scheduled.</p>
        </section>
        ` : ""}

        ${majorProjects.length ? `
        <section class="wc-cip-story-section" id="wc-cip-major-projects" aria-label="Major capital projects">
          <div class="wc-cip-story-header">
            <h2>The largest commitments in FY 2027.</h2>
            <p>The biggest capital projects budgeted for FY 2027. Together these account for ${escapeHtml(formatMoneyShort(majorProjects.reduce((sum, project) => sum + projectYearValue(project, majorProjectYear), 0)))} of the ${escapeHtml(formatMoneyShort(majorProjectYearTotal))} planned for the year.</p>
          </div>
          <ol class="wc-cip-major-list">
            ${majorProjects.map((project, index) => {
              const url = String(project.slug || "").trim() ? buildProjectUrl(project) : "";
              const inner = `
                <span class="wc-cip-major-rank">${index + 1}</span>
                <span class="wc-cip-major-body">
                  <strong>${escapeHtml(project.title)}</strong>
                  <small>${escapeHtml(project.funding || "Not listed")}${project.dept ? " &middot; " + escapeHtml(project.dept) : ""}</small>
                </span>
                <b>${escapeHtml(formatMoneyShort(projectYearValue(project, majorProjectYear)))}</b>
              `;
              return url
                ? `<li><a class="wc-cip-major-item" href="${escapeHtml(url)}">${inner}</a></li>`
                : `<li><span class="wc-cip-major-item is-static">${inner}</span></li>`;
            }).join("")}
          </ol>
        </section>
        ` : ""}

        <section class="wc-cip-story-section">
          <div class="wc-cip-story-header">
            <h2>How projects move into the capital plan.</h2>
          </div>
          <div class="wc-cip-process-grid">
            <article class="wc-cip-process-card">
              <strong>1</strong>
              <h3>Identify Need</h3>
              <p>Departments identify infrastructure, facility, equipment, mobility, and public service needs.</p>
            </article>
            <article class="wc-cip-process-card">
              <strong>2</strong>
              <h3>Evaluate Funding</h3>
              <p>OMB reviews available revenues, restrictions, grants, timing, and long-term financial impact.</p>
            </article>
            <article class="wc-cip-process-card">
              <strong>3</strong>
              <h3>Prioritize Projects</h3>
              <p>Projects are reviewed against community needs, operational priorities, readiness, and policy direction.</p>
            </article>
            <article class="wc-cip-process-card">
              <strong>4</strong>
              <h3>Adopt Budget</h3>
              <p>Appropriated projects become part of the annual budget, while the five-year CIP remains a planning guide.</p>
            </article>
          </div>
        </section>

        ` : ""}
      </div>
    </section>

    ${isStandaloneSearchPage ? `
    <section class="wc-project-index-section">
      <div class="wc-project-index-inner">

        <div class="wc-project-index-header" id="wc-project-search">
          <div class="page-eyebrow">Capital Projects</div>
          <h1 class="page-title">Project Search</h1>
          <p class="page-intro">Browse, search, and filter Walton County capital improvement projects by department and year. This project indexed is designed to help residents quickly locate projects relevant to their community.</p>
          <div class="wc-project-search-stats" aria-label="Capital project search summary">
            <div class="wc-project-search-stat">
              <strong>${escapeHtml(allProjects.length)}</strong>
              <span>Projects in Index</span>
            </div>
            <div class="wc-project-search-stat">
              <strong>${escapeHtml(formatMoneyShort(overviewStats.totalBudget))}</strong>
              <span>Planned Budget</span>
            </div>
            <div class="wc-project-search-stat">
              <strong>${escapeHtml(fundOptions.length)}</strong>
              <span>Funding Sources</span>
            </div>
          </div>
        </div>

        ${!isFullView ? `
          <div class="wc-project-full-search-row">
            <a class="wc-project-full-search-link" href="search.html">Open Full Project Search</a>
          </div>
        ` : ""}

        <div class="wc-project-toolbar">

          <div class="wc-project-search-wrap">
            <svg class="wc-project-search-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>

            <input
              type="text"
              class="wc-project-search"
              placeholder="Search projects, departments, locations, or funding sources..."
              value="${escapeHtml(filters.search)}"
            >
          </div>

          <div class="wc-project-filter-group">

            <div class="wc-project-filter-set" data-filter-type="department">
              <span class="wc-project-filter-label">Department</span>
              ${renderFilterButton("department", "all", "All")}
              ${departmentOptions.map(option => renderFilterButton("department", option.value, option.label)).join("")}
            </div>

            ${revenueSourceOptions.length ? `<div class="wc-project-filter-set" data-filter-type="revenueSource">
              <span class="wc-project-filter-label">Revenue Source</span>
              ${renderFilterButton("revenueSource", "all", "All")}
              ${revenueSourceOptions.map(option => renderFilterButton("revenueSource", option.value, option.label)).join("")}
            </div>` : ""}

            <div class="wc-project-filter-set" data-filter-type="year">
              <span class="wc-project-filter-label">Year</span>
              <button class="wc-project-filter ${filters.year === "all" ? "active" : ""}" data-filter-type="year" data-filter="all">All</button>
              <button class="wc-project-filter ${filters.year === "fy2025" ? "active" : ""}" data-filter-type="year" data-filter="fy2025">FY2025</button>
              <button class="wc-project-filter ${filters.year === "fy2026" ? "active" : ""}" data-filter-type="year" data-filter="fy2026">FY2026</button>
              <button class="wc-project-filter ${filters.year === "fy2027" ? "active" : ""}" data-filter-type="year" data-filter="fy2027">FY2027</button>
              <button class="wc-project-filter ${filters.year === "fy2028" ? "active" : ""}" data-filter-type="year" data-filter="fy2028">FY2028</button>
              <button class="wc-project-filter ${filters.year === "fy2029" ? "active" : ""}" data-filter-type="year" data-filter="fy2029">FY2029</button>
              <button class="wc-project-filter ${filters.year === "fy2030" ? "active" : ""}" data-filter-type="year" data-filter="fy2030">FY2030</button>
              <button class="wc-project-filter ${filters.year === "fy2031" ? "active" : ""}" data-filter-type="year" data-filter="fy2031">FY2031</button>
            </div>

          </div>

        </div>

        <div class="wc-project-results-row">
          <div class="wc-project-results-count">Showing ${visibleProjects.length} of ${filtered.length} projects</div>
          <div>Use search and filters to narrow the list.</div>
        </div>

        <div class="wc-project-grid">
          ${rows.map(row => `<div class="wc-project-row">${row.map(renderProjectCard).join("")}</div>`).join("")}
        </div>

        <div class="wc-project-empty" style="display:${filtered.length ? "none" : "block"};">
          No projects match your search criteria.
        </div>

        

      </div>
    </section>
    ` : ""}
  `;

  const searchField = document.querySelector(".wc-project-search");

  if(searchField){
    searchField.addEventListener("input", e => {
      // Keep the raw typed value (including spaces the user is still
      // typing) -- getFilteredProjects trims/lowercases its own copy for
      // matching. Trimming here would get force-written back into the
      // field below once the debounced re-render fires, silently eating
      // any trailing space the moment the user paused typing.
      filters.search = e.target.value;
      resetVisibleLimit();

      clearTimeout(window.wcProjectSearchTimer);

      window.wcProjectSearchTimer = setTimeout(() => {
        renderProjects();

        const refreshedSearchField = document.querySelector(".wc-project-search");

        if(refreshedSearchField){
          refreshedSearchField.focus();
          refreshedSearchField.value = filters.search;
          refreshedSearchField.setSelectionRange(filters.search.length, filters.search.length);
        }
      }, 120);
    });
  }

  document.querySelectorAll(".wc-project-filter")
    .forEach(button => {
      button.addEventListener("click", () => {
        const filterType = button.dataset.filterType;
        const filterValue = button.dataset.filter;

        filters[filterType] = filterValue;
        resetVisibleLimit();
        renderProjects();
      });
    });

  document.querySelectorAll(".wc-project-card").forEach(card => {
    const description = card.querySelector(".wc-project-description");

    if(!description){
      return;
    }

    description.style.maxHeight = "none";
    const fullDescriptionHeight = description.scrollHeight;
    description.style.maxHeight = "";

    if(fullDescriptionHeight > 78){
      card.classList.add("has-overflow");
    }else{
      card.classList.remove("has-overflow");
    }
  });

  document.querySelectorAll(".wc-project-card").forEach(card => {
    card.addEventListener("click", event => {
      if(event.target.closest(".wc-project-read-more")){
        return;
      }

      const projectUrl = card.dataset.projectUrl;

      if(projectUrl){
        window.location.href = projectUrl;
      }
    });

    card.addEventListener("keydown", event => {
      if(event.key !== "Enter" && event.key !== " "){
        return;
      }

      if(event.target.closest(".wc-project-read-more")){
        return;
      }

      event.preventDefault();

      const projectUrl = card.dataset.projectUrl;

      if(projectUrl){
        window.location.href = projectUrl;
      }
    });
  });

  document.querySelectorAll(".wc-project-read-more").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();

      const card = button.closest(".wc-project-card");

      if(!card){
        return;
      }

      card.classList.toggle("is-expanded");
      button.textContent = card.classList.contains("is-expanded") ? "Show Less" : "Read More";
    });
  });
}

function initProjects(){
  if(!app){
    return;
  }

  app.innerHTML = '<div class="wc-data-loading">Loading capital project data...</div>';

  const ready = window.wcCipProjectsReady || Promise.resolve(window.wcCipProjects || []);

  ready.then(() => {
    renderProjects();
  }).catch(error => {
    console.error("Walton CIP: failed to initialize project search", error);
    app.innerHTML = '<div class="wc-project-empty">Capital project data could not be loaded.</div>';
  });
}

initProjects();
