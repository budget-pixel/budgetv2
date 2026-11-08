/* Walton County census publication: saved local figures and narratives.
   Updated only by an explicit publication edit; no live Census embeds. */
(function () {
  "use strict";

  const CENSUS_DATA_JSON_URL = "../assets/census-data.json";
  const CENSUS_NARRATIVES_CSV_URL =
    "../assets/static-data/census-narratives.csv?v=df2b444e5f";

  // One block per row in the Census narrative publication. Each block pairs the
  // saved census figures with that row's narrative.
  // `fallback` is shown verbatim (no placeholder substitution) if either
  // census-data.json or the narrative sheet fails to load.
  const CENSUS_TOPIC_SECTIONS = [
    {
      sheetTitle: "population",
      title: "Age and Sex",
      fallback: "Walton County has experienced significant population growth over the past decade, driven largely by new residents relocating from other parts of the United States. The county's age profile reflects its appeal as a retirement and vacation destination, with a median age that trends somewhat older than the state of Florida as a whole."
    },
    {
      sheetTitle: "Income",
      title: "Income and Earnings",
      fallback: "Household income in Walton County varies by household type, with married-couple families typically reporting higher earnings than the county's overall median. Compared to the rest of Florida and neighboring Okaloosa County, Walton County's household income figures reflect its mix of year-round residents and a strong tourism-driven local economy."
    },
    {
      sheetTitle: "Education",
      title: "Educational Attainment & School Enrollment",
      fallback: "A majority of Walton County residents age 25 and older have completed high school, with a meaningful share holding an associate, bachelor's, or graduate degree. School enrollment spans kindergarten through graduate study, reflecting the county's range of educational institutions and programs."
    },
    {
      sheetTitle: "Employment",
      title: "Class of Worker",
      fallback: "Most working residents of Walton County are employed by private companies, with smaller shares self-employed, working for nonprofit organizations, or employed by local, state, or federal government. This employment mix is broadly similar to patterns seen statewide and in neighboring Okaloosa County."
    },
    {
      sheetTitle: "Housing",
      title: "Housing",
      fallback: "Walton County's housing stock spans a wide range of values, from entry-level homes to higher-end coastal properties. The county's homeownership rate and housing inventory reflect both its year-round resident population and its role as a popular vacation and second-home destination."
    },
    {
      sheetTitle: "Business and Economy",
      title: "Industry",
      fallback: "Walton County's economy is supported by a diverse mix of industries, including professional services, health care and education, retail, hospitality, and construction. This diversity helps the local economy remain resilient across different sectors and seasons."
    }
  ];

  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function sanitizeUrl(url) {
    const trimmed = String(url || "").trim();
    return /^(https?:|mailto:)/i.test(trimmed) ? trimmed : "";
  }

  function normalizeTitle(value) {
    return String(value || "").trim().toLowerCase();
  }

  function splitIntoParagraphs(text) {
    if (!text) return [];
    const normalized = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    return normalized
      .split(/\n\s*\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  // Minimal CSV parser (handles quoted fields/commas), mirroring the one in
  // assets/budget-data.js. Kept self-contained so this module has no load
  // order dependency on budget-data.js.
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
          if (src[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
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
    if (field.length || row.length) { row.push(field); rows.push(row); }
    if (!rows.length) return [];

    const headers = rows[0].map((h) => h.trim());
    return rows
      .slice(1)
      .filter((r) => r.some((cell) => String(cell || "").trim() !== ""))
      .map((r) => {
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = r[idx] !== undefined ? r[idx] : ""; });
        return obj;
      });
  }

  // Response cache + one retry + stale-cache fallback -- CENSUS_DATA_JSON_URL
  // above is a same-origin static file (fast, reliably cached by the
  // browser already) but this CSV comes from a published static publication dataset,
  // which is slow enough and unreliable enough on its own to need this.
  const CENSUS_FETCH_CACHE_TTL_MS = 5 * 60 * 1000;

  function censusFetchCacheKey(url) {
    return "wcFetchCache:" + url;
  }

  function readCensusFetchCache(url) {
    try {
      const raw = sessionStorage.getItem(censusFetchCacheKey(url));
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function writeCensusFetchCache(url, text) {
    try {
      sessionStorage.setItem(censusFetchCacheKey(url), JSON.stringify({ text: text, savedAt: Date.now() }));
    } catch (err) {
      // sessionStorage can throw (private browsing, quota) -- caching is optional.
    }
  }

  function fetchCSV(url) {
    const cached = readCensusFetchCache(url);
    if (cached && Date.now() - cached.savedAt < CENSUS_FETCH_CACHE_TTL_MS) {
      return Promise.resolve(parseCSV(cached.text));
    }
    function fetchOnce() {
      return fetch(url, { cache: "no-store" }).then((res) => {
        if (!res.ok) throw new Error("Request failed with status " + res.status);
        return res.text();
      });
    }
    function attempt(retriesLeft) {
      return fetchOnce().catch((err) => (retriesLeft > 0 ? attempt(retriesLeft - 1) : Promise.reject(err)));
    }
    return attempt(1)
      .then((text) => {
        writeCensusFetchCache(url, text);
        return parseCSV(text);
      })
      .catch((err) => {
        if (cached) return parseCSV(cached.text);
        throw err;
      });
  }

  function fetchJSON(url) {
    return fetch(url, { cache: "no-store" }).then((res) => {
      if (!res.ok) throw new Error("Request failed with status " + res.status);
      return res.json();
    });
  }

  // Single pass over the template text: escapes plain text, converts
  // **bold** and [text](url) markdown, and substitutes {{placeholder}}
  // tokens with their value from `values` (or a visible warning if that
  // key has no data).
  function formatCensusNarrative(template, values) {
    const text = String(template === undefined || template === null ? "" : template);
    const pattern = /\*\*(.+?)\*\*|\[([^[\]]+)\]\(([^()\s]+)\)|\{\{(\w+)\}\}/gs;
    let result = "";
    let lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      result += escapeHtml(text.slice(lastIndex, match.index));
      if (match[1] !== undefined) {
        result += "<strong>" + escapeHtml(match[1]) + "</strong>";
      } else if (match[4] !== undefined) {
        const key = match[4];
        const value = values ? values[key] : undefined;
        result += (value === undefined || value === null)
          ? '<span class="wc-census-missing" title="No Census value available for {{' + escapeHtml(key) + '}}">[data unavailable]</span>'
          : escapeHtml(String(value));
      } else {
        const linkText = escapeHtml(match[2]);
        const safeUrl = sanitizeUrl(match[3]);
        result += safeUrl
          ? '<a href="' + escapeHtml(safeUrl) + '" target="_blank" rel="noopener noreferrer">' + linkText + "</a>"
          : linkText;
      }
      lastIndex = pattern.lastIndex;
    }
    result += escapeHtml(text.slice(lastIndex));
    return result;
  }

  // Bar charts drawn from the saved Census figures (census-data.json), in
  // place of the live data.census.gov widgets the page used to embed. Each
  // bar is [label, value key, highlight?]; Walton County bars are green,
  // comparison areas are muted.
  const CENSUS_CHARTS = {
    population: [
      { title: "Population", bars: [["2010 Census", "population2010", true], ["2020 Census", "population2020", true]] },
      { title: "Median age", unit: " yrs", bars: [["Walton County", "waltonMedianAge", true], ["Florida", "floridaMedianAge"], ["Okaloosa County", "okaloosaMedianAge"]] },
      { title: "Veterans, share of adults", unit: "%", bars: [["Walton County", "waltonVeteranPct", true], ["Florida", "floridaVeteranPct"], ["Okaloosa County", "okaloosaVeteranPct"]] }
    ],
    Income: [
      { title: "Median income by household type, Walton County", bars: [["All households", "waltonMedianHouseholdIncome", true], ["Families", "waltonFamilyIncome", true], ["Married-couple families", "waltonMarriedCoupleIncome", true], ["Nonfamily households", "waltonNonfamilyIncome", true]] },
      { title: "Median household income", bars: [["Walton County", "waltonMedianHouseholdIncome", true], ["Florida", "floridaMedianHouseholdIncome"], ["Okaloosa County", "okaloosaMedianHouseholdIncome"]] }
    ],
    Education: [
      { title: "Highest education, adults 25 and older", unit: "%", bars: [["High school graduate", "waltonHsPct", true], ["Some college", "waltonSomeCollegePct", true], ["Associate degree", "waltonAssociatePct", true], ["Bachelor's degree", "waltonBachelorPct", true], ["Graduate or professional degree", "waltonGraduatePct", true]] },
      { title: "Bachelor's degree or higher", unit: "%", bars: [["Walton County", "waltonBachelorOrHigherPct", true], ["Florida", "floridaBachelorOrHigherPct"], ["Okaloosa County", "okaloosaBachelorOrHigherPct"]] },
      { title: "School enrollment", unit: "%", bars: [["Kindergarten to 12th grade", "waltonK12Pct", true], ["College, undergraduate", "waltonUndergradPct", true], ["Graduate or professional school", "waltonGraduateEnrollPct", true]] }
    ],
    Employment: [
      { title: "Class of worker, Walton County", unit: "%", bars: [["Private company workers", "privateWorkerPct", true], ["Government workers", "governmentWorkerPct", true], ["Self-employed, incorporated", "incorporatedSelfEmpPct", true], ["Self-employed, not incorporated", "unincorporatedSelfEmpPct", true], ["Nonprofit workers", "nonprofitWorkerPct", true]] },
      { title: "Government workers", unit: "%", bars: [["Walton County", "governmentWorkerPct", true], ["Florida", "floridaGovernmentWorkerPct"], ["Okaloosa County", "okaloosaGovernmentPct"]] }
    ],
    Housing: [
      { title: "Value of owner-occupied homes", unit: "%", bars: [["Less than $50,000", "housingUnder50kPct", true], ["$50,000 to $99,999", "housing50to100kPct", true], ["$100,000 to $149,999", "housing100to150kPct", true], ["$150,000 to $199,999", "housing150to200kPct", true], ["$200,000 to $299,999", "housing200to300kPct", true], ["$300,000 to $499,999", "housing300to500kPct", true], ["$500,000 to $999,999", "housing500to1mPct", true], ["$1,000,000 or more", "housingOver1mPct", true]] },
      { title: "Housing units", bars: [["Occupied", "occupiedUnits", true], ["Vacant (incl. seasonal)", "vacantUnits", true]] },
      { title: "Homeownership rate", unit: "%", bars: [["Walton County", "homeownershipRate", true], ["Florida", "floridaHomeownershipRate"], ["Okaloosa County", "okaloosaHomeownershipRate"]] }
    ],
    "Business and Economy": [
      { title: "Employment by industry, Walton County", unit: "%", sort: true, bars: [["Professional services", "professionalServicesPct", true], ["Arts, entertainment &amp; hospitality", "hospitalityPct", true], ["Education &amp; health care", "healthEducationPct", true], ["Construction", "constructionPct", true], ["Retail trade", "retailPct", true], ["Finance &amp; real estate", "financeRealEstatePct", true], ["Public administration", "publicAdministrationPct", true], ["Transportation", "transportationPct", true], ["Other services", "otherServicesPct", true], ["Manufacturing", "manufacturingPct", true]] }
    ]
  };

  function censusNumber(value) {
    const n = parseFloat(String(value === undefined || value === null ? "" : value).replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  function renderCensusChart(chart, values) {
    let bars = chart.bars.map(([label, key, highlight]) => ({ label, raw: values[key], value: censusNumber(values[key]), highlight: !!highlight }))
      .filter((bar) => bar.value !== null);
    if (!bars.length) return "";
    if (chart.sort) bars = bars.slice().sort((x, y) => y.value - x.value);
    const max = Math.max.apply(null, bars.map((bar) => bar.value)) || 1;
    return '<figure class="wc-census-chart"><figcaption>' + chart.title + '</figcaption><div class="wc-census-bars">' +
      bars.map((bar) => {
        const text = escapeHtml(String(bar.raw)) + (chart.unit && String(bar.raw).indexOf(chart.unit.trim()) === -1 ? chart.unit : "");
        return '<div class="wc-census-bar' + (bar.highlight ? "" : " is-comparison") + '"><span class="wc-census-bar-label">' + bar.label + '</span>' +
          '<span class="wc-census-bar-track"><i style="width:' + (bar.value / max * 100).toFixed(1) + '%"></i></span>' +
          '<b>' + text + '</b></div>';
      }).join("") + '</div></figure>';
  }

  function renderSavedCensusSummary(section, values) {
    const charts = (CENSUS_CHARTS[section.sheetTitle] || []).map((chart) => renderCensusChart(chart, values)).join("");
    return charts ? '<div class="wc-census-viz-card"><div class="wc-census-charts">' + charts + '</div></div>' : "";
  }

  function renderCensusSections(container, sections, narrativeRows, censusValues, metadata, dataLoadFailed) {
    const lastUpdatedLabel = metadata && metadata.lastUpdated ? metadata.lastUpdated : "unavailable";

    container.innerHTML = sections.map((section, index) => {
      const row = narrativeRows.find((r) => normalizeTitle(r.Title) === normalizeTitle(section.sheetTitle));
      const template = row && row["Narrative Template"];
      const useFallback = dataLoadFailed || !template;

      const narrativeHtml = useFallback
        ? splitIntoParagraphs(section.fallback).map((p) => "<p>" + escapeHtml(p) + "</p>").join("")
        : splitIntoParagraphs(template).map((p) => "<p>" + formatCensusNarrative(p, censusValues) + "</p>").join("");

      const sourceNote = useFallback
        ? '<p class="wc-census-source"><em>Source: U.S. Census Bureau. Narrative shown is a default summary; published figures are temporarily unavailable.</em></p>'
        : '<p class="wc-census-source"><em>Source: U.S. Census Bureau, ACS 5-Year Estimates. Data current as of ' + escapeHtml(lastUpdatedLabel) + ".</em></p>";

      const vizCardHtml =
        renderSavedCensusSummary(section, censusValues);
      const narrativeCardHtml =
        '<div class="wc-census-narrative-card">' +
        "<h2>" + escapeHtml(section.title) + "</h2>" +
        narrativeHtml + sourceNote +
        "</div>";

      return (
        '<section class="wc-census-topic-block">' +
        narrativeCardHtml + vizCardHtml +
        "</section>"
      );
    }).join("");
  }

  function initCensusNarrativesPage() {
    const container = document.getElementById("census-statistics-section");
    if (!container) return;

    container.innerHTML = '<div class="wc-data-loading">Loading Census data...</div>';

    Promise.allSettled([fetchJSON(CENSUS_DATA_JSON_URL), fetchCSV(CENSUS_NARRATIVES_CSV_URL)])
      .then(([jsonResult, csvResult]) => {
        const dataLoadFailed = jsonResult.status !== "fulfilled";
        if (dataLoadFailed) console.error("CensusNarratives: failed to load census-data.json", jsonResult.reason);
        if (csvResult.status !== "fulfilled") console.error("CensusNarratives: failed to load Census narrative publication", csvResult.reason);

        const censusData = dataLoadFailed ? { metadata: {}, values: {} } : jsonResult.value;
        const narrativeRows = csvResult.status === "fulfilled" ? csvResult.value : [];

        renderCensusSections(container, CENSUS_TOPIC_SECTIONS, narrativeRows, censusData.values || {}, censusData.metadata || {}, dataLoadFailed);
      });
  }

  document.addEventListener("DOMContentLoaded", initCensusNarrativesPage);

  window.WCCensusNarratives = {
    initCensusNarrativesPage,
    formatCensusNarrative
  };
})();
