(function () {
  "use strict";

  var EXPLORERS = {
    revenue: { title: "Revenue Budget" },
    personnel: { title: "Personnel Budget" },
    departments: { title: "Department Budget" },
    capital: { title: "Capital Budget" },
    constitutional: { title: "Constitutional Officers Budget" },
    independent: { title: "Independent Agencies Budget" }
  };

  var activeCard = null;
  var modal = null;
  var modalBody = null;
  var modalTitle = null;
  var departmentModal = null;
  var departmentFrame = null;
  var departmentTrigger = null;
  var departmentFrameAwaitingInitialLoad = false;
  var lockedPageScrollY = 0;
  var savedBodyStyles = null;
  var capitalSearchOutsideClickHandler = null;
  var departmentPanelResizeObserver = null;
  var departmentModalOpenedAt = 0;
  // How long the popup stays at its small opening size before it's allowed
  // to grow -- deliberate, so the reveal reads as a consistent flourish
  // rather than something that only happens to appear on slow-loading pages.
  var MIN_POPUP_REVEAL_MS = 900;

  // Sizes the department popup to the loaded page's actual content height
  // (capped at the viewport) instead of always opening at near-full
  // height -- a short page like State Attorney or Public Defender no
  // longer leaves a block of empty space below its footer. Utility pages
  // (Glossary, Transaction Search, Accessibility, Privacy) deliberately
  // stay full-screen instead (see the is-utility-page bailout below) --
  // they're meant to feel like standalone pages, not a compact card, and
  // some of them (Privacy in particular) are long enough to want the full
  // viewport rather than a shrink-to-fit box.
  function sizeIframePopupPanel(panel, frame, headEl, isUtilityPage) {
    if (!panel || !frame || isUtilityPage || window.innerWidth <= 700) {
      if (panel) panel.style.height = "";
      return;
    }
    var doc;
    try { doc = frame.contentDocument; } catch (accessError) { doc = null; }
    if (!doc || !doc.documentElement) return;
    var headHeight = headEl ? headEl.getBoundingClientRect().height : 0;
    // documentElement/body scrollHeight can stay pinned near the viewport
    // height even once the class-based CSS override trims #layout's own
    // min-height, because that reset only wins the cascade for #layout
    // itself -- some other ancestor in the chain (or the iframe's own
    // scrolling box) can still report the larger figure. Measuring the
    // actual bottom edge of the last visible element (the sitewide footer,
    // always moved to the end of <body> by nav.js) sidesteps that: it
    // reflects exactly where rendered content stops, not how tall the
    // document's layout boxes claim to be.
    var lastVisible = doc.querySelector('footer[role="contentinfo"]') || doc.body;
    var contentHeight = lastVisible ? Math.ceil(lastVisible.getBoundingClientRect().bottom) : doc.documentElement.scrollHeight;
    var maxHeight = (window.visualViewport ? window.visualViewport.height : window.innerHeight) - 36;
    var desired = Math.min(maxHeight, Math.max(320, Math.ceil(contentHeight + headHeight)));
    panel.style.height = desired + "px";
  }

  // Watches an iframe's loaded document for size changes (budget data
  // loading in asynchronously can grow or shrink it after "load" fires)
  // and re-measures. Returns the observer so the caller can disconnect it
  // later; also does a few cheap timed re-checks as a fallback for
  // anything a ResizeObserver doesn't happen to catch (web fonts, images
  // without explicit dimensions).
  function watchIframePopupHeight(frame, measure) {
    var observer = null;
    try {
      var doc = frame.contentDocument;
      if (doc && doc.body && typeof ResizeObserver === "function") {
        observer = new ResizeObserver(function () { measure(); });
        observer.observe(doc.body);
      }
    } catch (watchError) {
      // Cross-origin or unsupported -- the timed re-checks below still run.
    }
    measure();
    [50, 200, 500, 1000].forEach(function (delay) { window.setTimeout(measure, delay); });
    return observer;
  }

  function updateDepartmentModalHeight() {
    if (!departmentModal || !departmentFrame || departmentModal.hidden) return;
    var panel = departmentModal.querySelector(".wc-home-department-modal-panel");
    // The budget book always wants the full available height for its own
    // page-flip sizing (see the is-budget-book CSS) rather than shrinking
    // to fit its iframe's measured content height like a normal department
    // page.
    var isUtilityOrBook = departmentModal.classList.contains("is-utility-page") || departmentModal.classList.contains("is-budget-book");
    if (isUtilityOrBook) {
      sizeIframePopupPanel(panel, departmentFrame, departmentModal.querySelector(".wc-home-department-modal-head"), true);
      return;
    }
    // Hold at the small opening size (set in openDepartmentModal) until the
    // minimum reveal time has passed -- even a page whose content is fully
    // ready well before that keeps the deliberate small-then-grow motion
    // instead of jumping straight to full size.
    var elapsed = Date.now() - departmentModalOpenedAt;
    if (elapsed < MIN_POPUP_REVEAL_MS) {
      window.setTimeout(updateDepartmentModalHeight, MIN_POPUP_REVEAL_MS - elapsed);
      return;
    }
    sizeIframePopupPanel(panel, departmentFrame, departmentModal.querySelector(".wc-home-department-modal-head"), false);
  }

  window.addEventListener("resize", function () {
    updateDepartmentModalHeight();
  });

  function lockBackgroundPage() {
    if (savedBodyStyles) return;
    lockedPageScrollY = window.scrollY || window.pageYOffset || 0;
    savedBodyStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      overflow: document.body.style.overflow
    };
    document.body.style.position = "fixed";
    document.body.style.top = "-" + lockedPageScrollY + "px";
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("wc-home-explorer-open");
    document.body.classList.add("wc-home-explorer-open");
  }

  function unlockBackgroundPage() {
    if (!savedBodyStyles) return;
    document.documentElement.classList.remove("wc-home-explorer-open");
    document.body.classList.remove("wc-home-explorer-open");
    document.body.style.position = savedBodyStyles.position;
    document.body.style.top = savedBodyStyles.top;
    document.body.style.left = savedBodyStyles.left;
    document.body.style.right = savedBodyStyles.right;
    document.body.style.width = savedBodyStyles.width;
    document.body.style.overflow = savedBodyStyles.overflow;
    savedBodyStyles = null;
    window.scrollTo(0, lockedPageScrollY);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function compactCurrency(value) {
    var amount = Number(value) || 0;
    var absolute = Math.abs(amount);
    var sign = amount < 0 ? "−" : "";
    if (absolute >= 1000000000) return sign + "$" + (absolute / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
    if (absolute >= 1000000) return sign + "$" + (absolute / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (absolute >= 1000) return sign + "$" + Math.round(absolute / 1000).toLocaleString("en-US") + "K";
    return sign + "$" + Math.round(absolute).toLocaleString("en-US");
  }

  function formatCurrency(value) {
    if (window.WCBudgetData && window.WCBudgetData.formatCurrency) return window.WCBudgetData.formatCurrency(value);
    return "$" + Math.round(Number(value) || 0).toLocaleString("en-US");
  }

  function changeHtml(current, prior) {
    var change = current - prior;
    var percent = prior ? change / Math.abs(prior) * 100 : null;
    return '<div class="wc-revenue-snapshot-change' + (change < 0 ? ' is-down' : '') + '"><div class="wc-revenue-comparison"><span>Compared to Prior Year</span><div><strong>' +
      (change >= 0 ? "+" : "−") + escapeHtml(compactCurrency(Math.abs(change))) + '</strong><em>' +
      (percent === null ? "No FY 2026 base" : (percent >= 0 ? "+" : "−") + Math.abs(percent).toFixed(1) + "%") +
      '</em></div></div></div>';
  }

  function loading() {
    modalBody.innerHTML = '<div class="wc-data-loading"><span class="wc-loading-dots" aria-label="Loading explorer"><span></span><span></span><span></span></span></div>';
  }

  function prefixPageLinks(root) {
    root.querySelectorAll("a[href]").forEach(function (link) {
      var href = link.getAttribute("href") || "";
      if (!href || /^(?:[a-z]+:|#|\/|pages\/)/i.test(href)) return;
      link.setAttribute("href", "pages/" + href.replace(/^\.\//, ""));
    });
  }

  function pageHref(href) {
    var value = String(href || "");
    if (!value || /^(?:[a-z]+:|#|\/|pages\/)/i.test(value)) return value;
    return "pages/" + value.replace(/^(?:\.\/|\.\.\/pages\/)/, "");
  }

  function fundCode(row) {
    return String(row && row.Dept_Code || "").trim().slice(0, 3);
  }

  function renderCapitalExplorer() {
    loading();
    var budgetReady = window.WCBudgetData && window.WCBudgetData.loadBudgetData
      ? window.WCBudgetData.loadBudgetData()
      : Promise.reject(new Error("Budget data unavailable"));
    var projectsReady = window.wcCipProjectsReady || Promise.resolve(window.wcCipProjects || []);
    Promise.all([budgetReady, projectsReady]).then(function (results) {
      var data = results[0];
      var projects = Array.isArray(results[1]) ? results[1] : [];
      var capitalRows = (data.expenditures || []).filter(function (row) {
        return String(row.Object_Type || "").trim().toLowerCase() === "capital outlay" && fundCode(row) !== "107";
      });
      var total = capitalRows.reduce(function (sum, row) { return sum + (Number(row.FY2027_Proposed) || 0); }, 0);
      var prior = capitalRows.reduce(function (sum, row) { return sum + (Number(row.FY2026_Original_Budget || row.FY2026_Budget) || 0); }, 0);
      var byFund = {};
      capitalRows.forEach(function (row) {
        var code = fundCode(row);
        byFund[code] = (byFund[code] || 0) + (Number(row.FY2027_Proposed) || 0);
      });
      var machineryRows = data.machinery || [];
      var machinery = machineryRows.reduce(function (sum, row) { return sum + (Number(row.Amount) || 0); }, 0);
      var activeProjects = projects.filter(function (project) {
        if (!project || project.is_legacy_in_house_engineering_row) return false;
        var funding = String(project.funding || "").trim().toLowerCase();
        if (["transportation fund", "capital projects fund", "general fund"].indexOf(funding) === -1) return false;
        if (String(project.department_filter || "").trim().toLowerCase() === "sheriff") return false;
        return (project.funding_by_year || []).some(function (year) {
          return year.year === "FY2027" && (Number(year.amount_value) || 0) > 0;
        });
      }).length;
      var cards = [
        { title: "Transportation and Infrastructure Capital Ledger", href: "pages/cip-capital-projects.html", amount: (byFund["101"] || 0) + (byFund["300"] || 0) + (byFund["001"] || 0), badge: activeProjects + " active projects" },
        { title: "Tourist Development Fund Capital Ledger", href: "pages/cip-tourist-development.html", amount: byFund["111"] || 0 },
        { title: "Sheriff Capital Project Ledger", href: "pages/cip-sheriff.html", amount: (data.expenditures || []).filter(function (row) { return String(row.Object_Type || "").trim().toLowerCase() === "capital outlay" && fundCode(row) === "107"; }).reduce(function (sum, row) { return sum + (Number(row.FY2027_Proposed) || 0); }, 0) },
        { title: "Machinery, Vehicles, & Equipment Ledger", href: "pages/summary-of-machinery-vehicles-and-equipment.html", amount: machinery, badge: machineryRows.length + " items" },
        { title: "Recreation Plat Fee Fund Capital Ledger", href: "pages/recreation-plat-fee-fund.html", amount: byFund["114"] || 0 },
        { title: "Sidewalk Fund Capital Ledger", href: "pages/sidewalk-fund.html", amount: byFund["115"] || 0 }
      ];
      var cardHtml = cards.map(function (card) {
        var share = total ? card.amount / total * 100 : 0;
        return '<a href="' + escapeHtml(card.href) + '" data-explorer-popup-trigger="' + escapeHtml(card.title) + '"><div class="wc-revenue-card-head"><div class="wc-revenue-card-head-main"><strong>' + escapeHtml(card.title) + '</strong><b class="wc-revenue-card-amount">' + escapeHtml(compactCurrency(card.amount)) + '</b><small class="wc-revenue-card-share">' + share.toFixed(1) + '% of capital budget</small></div>' +
          (card.badge ? '<div class="wc-revenue-card-badge-stack"><span class="wc-personnel-dept-fte-badge">' + escapeHtml(card.badge) + '</span></div>' : '') +
          '</div></a>';
      }).join("");
      modalBody.innerHTML = '<section class="wc-department-explorer"><div class="wc-department-explorer-head"><div><h2>Capital Budget</h2><p>Explore Walton County&rsquo;s capital improvement plan, fund ledgers, machinery and equipment, and searchable project detail.</p><p>Select a ledger below to review projects, funding sources, and budgeted investment.</p></div><aside class="wc-revenue-total-budget"><div class="wc-revenue-total-primary"><span>Total capital budget</span><strong>' + escapeHtml(formatCurrency(total)) + '</strong><small class="wc-revenue-total-change ' + (total >= prior ? 'is-increase' : 'is-decrease') + '">' + (total >= prior ? "+" : "−") + escapeHtml(compactCurrency(Math.abs(total - prior))) + '</small></div></aside></div>' +
        '<section class="wc-capital-what-counts" aria-labelledby="wcCapitalWhatCountsTitle">' +
          '<div class="wc-capital-what-counts-head"><h3 id="wcCapitalWhatCountsTitle">What is a capital project?</h3><p>Walton County defines a capital project as a significant, non-recurring expenditure for the construction, expansion, purchase, major repair, or replacement of buildings, utility systems, streets, infrastructure, or public property. Capital projects create or extend the life of a public asset; routine operating costs do not.</p></div>' +
          '<div class="wc-capital-what-counts-grid">' +
            '<article class="wc-capital-what-counts-card is-included"><span>Counted as capital</span><ul>' +
              '<li>Road, bridge, sidewalk, and drainage construction</li>' +
              '<li>New or expanded County buildings and facilities</li>' +
              '<li>Major renovations and system replacements</li>' +
              '<li>Land, rights-of-way, and easement purchases</li>' +
              '<li>Machinery, vehicles, and equipment above the capital threshold</li>' +
            '</ul></article>' +
            '<article class="wc-capital-what-counts-card is-excluded"><span>Not capital</span><ul>' +
              '<li>Routine maintenance and repairs</li>' +
              '<li>Operating supplies and consumables</li>' +
              '<li>Salaries and day-to-day service delivery</li>' +
              '<li>Studies with no resulting asset</li>' +
              '<li>Items below the capitalization threshold</li>' +
            '</ul></article>' +
          '</div>' +
          '<p class="wc-capital-what-counts-note"><a href="pages/capital-improvement-plan.html#wc-cip-what-counts" data-explorer-popup-trigger="Capital Improvement Plan">Read the full explanation</a> &mdash; including the four tests for what qualifies, how projects are financed, and what counts toward the capitalization threshold.</p>' +
        '</section>' +
        '<section class="wc-home-search wc-capital-project-search" aria-labelledby="wcCapitalSearchTitle">' +
          '<div><h2 id="wcCapitalSearchTitle">Search Capital Projects</h2><p>Find a specific capital project by name, department, or fund.</p></div>' +
          '<div class="wc-home-search-input-wrap">' +
            '<form class="wc-home-search-form" data-capital-project-search-form role="search">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6.15 6.15a7.5 7.5 0 0 0 10.5 10.5Z"></path></svg>' +
              '<label class="wc-sr-only" for="wcCapitalProjectSearchInput">Search capital projects</label>' +
              '<input id="wcCapitalProjectSearchInput" name="q" type="search" placeholder="What project are you looking for?" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="wcCapitalSearchDropdown" aria-autocomplete="list">' +
              '<button type="submit">Search</button>' +
            '</form>' +
            '<div id="wcCapitalSearchDropdown" class="wc-home-search-dropdown" role="listbox" aria-label="Matching capital projects" hidden></div>' +
          '</div>' +
        '</section>' +
        '<div class="wc-department-budget-cards">' + cardHtml + '</div>' +
        '<section class="wc-capital-search-results" data-capital-search-results hidden>' +
          '<div class="wc-capital-search-results-head"><h3 data-capital-search-results-title>Search results</h3><button type="button" class="wc-capital-search-clear" data-capital-search-clear>Clear search</button></div>' +
          '<div class="wc-department-budget-cards" data-capital-search-results-list></div>' +
        '</section></section>';
      var capitalSearchForm = modalBody.querySelector('[data-capital-project-search-form]');
      var capitalSearchInput = capitalSearchForm ? capitalSearchForm.querySelector('input[name="q"]') : null;
      var capitalSearchDropdown = modalBody.querySelector('#wcCapitalSearchDropdown');
      var capitalSearchResultsSection = modalBody.querySelector('[data-capital-search-results]');
      var capitalSearchResultsTitle = modalBody.querySelector('[data-capital-search-results-title]');
      var capitalSearchResultsList = modalBody.querySelector('[data-capital-search-results-list]');
      var capitalSearchActiveIndex = -1;

      // Synthesized placeholder rows (a whole fund's single-line capital
      // outlay with no individual project of its own -- see
      // placeholderFundProjects in cip-projects-data.js) have no slug and
      // so no project page to open; shown as plain, non-clickable entries
      // instead of a link that goes nowhere useful.
      function capitalSearchResultCardHtml(project) {
        var subtitle = project.department || project.dept || project.funding || '';
        var budget = project.budget || (project.budget_value ? formatCurrency(project.budget_value) : '');
        var inner = '<div class="wc-revenue-card-head"><div class="wc-revenue-card-head-main"><strong>' + escapeHtml(project.title) + '</strong>' +
          (budget ? '<b class="wc-revenue-card-amount">' + escapeHtml(budget) + '</b>' : '') +
          (subtitle ? '<small class="wc-revenue-card-share">' + escapeHtml(subtitle) + '</small>' : '') +
          '</div></div>';
        return project.slug
          ? '<a href="#" data-capital-search-result-open>' + inner + '</a>'
          : '<div class="wc-capital-search-result-static">' + inner + '</div>';
      }

      function capitalSearchOpenProject(project) {
        if (!project.slug) return;
        var url = new URL('pages/cip-project.html', window.location.href);
        url.searchParams.set('project', project.slug);
        openDepartmentModal(url.href, project.title || 'Capital Project', capitalSearchForm);
      }

      function capitalSearchMatchesFor(query) {
        var normalizedQuery = String(query || '').trim().toLowerCase();
        if (!normalizedQuery) return [];
        return projects.map(function (project, index) {
          if (!project || !project.title) return null;
          var title = String(project.title).toLowerCase();
          var haystack = [project.title, project.department, project.dept, project.funding, project.category].filter(Boolean).join(' ').toLowerCase();
          if (haystack.indexOf(normalizedQuery) === -1) return null;
          var rank = title === normalizedQuery ? 0 : title.indexOf(normalizedQuery) === 0 ? 1 : title.indexOf(normalizedQuery) !== -1 ? 2 : 3;
          return { project: project, rank: rank, index: index };
        }).filter(Boolean).sort(function (a, b) {
          return a.rank - b.rank || a.index - b.index;
        }).map(function (entry) { return entry.project; });
      }

      // The dropdown is a quick top-8 jump list while typing; submitting
      // shows the full matching set inline, right under the ledger cards,
      // instead of sending anyone to a separate full-page search.
      function capitalSearchSubmitQuery() {
        var query = String((capitalSearchInput && capitalSearchInput.value) || '').trim();
        if (!capitalSearchResultsSection || !capitalSearchResultsList) return;
        if (!query) {
          capitalSearchResultsSection.hidden = true;
          capitalSearchResultsList.innerHTML = '';
          return;
        }
        var matches = capitalSearchMatchesFor(query);
        if (capitalSearchResultsTitle) {
          capitalSearchResultsTitle.textContent = matches.length
            ? matches.length + ' project' + (matches.length === 1 ? '' : 's') + ' matching “' + query + '”'
            : 'No projects matching “' + query + '”';
        }
        capitalSearchResultsList.innerHTML = matches.length
          ? matches.map(capitalSearchResultCardHtml).join('')
          : '<p class="wc-data-empty">Try a different project name, department, or fund.</p>';
        capitalSearchResultsList.querySelectorAll('[data-capital-search-result-open]').forEach(function (link, i) {
          link.addEventListener('click', function (event) {
            event.preventDefault();
            capitalSearchOpenProject(matches[i]);
          });
        });
        capitalSearchResultsSection.hidden = false;
        capitalSearchResultsSection.scrollIntoView({ block: 'start' });
      }

      var capitalSearchClearButton = modalBody.querySelector('[data-capital-search-clear]');
      if (capitalSearchClearButton) {
        capitalSearchClearButton.addEventListener('click', function () {
          if (capitalSearchInput) capitalSearchInput.value = '';
          if (capitalSearchResultsSection) capitalSearchResultsSection.hidden = true;
          if (capitalSearchResultsList) capitalSearchResultsList.innerHTML = '';
          if (capitalSearchInput) capitalSearchInput.focus();
        });
      }

      function capitalSearchResultLinks() {
        return capitalSearchDropdown ? Array.prototype.slice.call(capitalSearchDropdown.querySelectorAll('.wc-home-search-result')) : [];
      }

      function capitalSearchHideDropdown() {
        if (!capitalSearchDropdown) return;
        capitalSearchDropdown.hidden = true;
        capitalSearchDropdown.innerHTML = '';
        capitalSearchActiveIndex = -1;
        if (capitalSearchInput) capitalSearchInput.setAttribute('aria-expanded', 'false');
      }

      function capitalSearchSetActive(index) {
        var links = capitalSearchResultLinks();
        capitalSearchActiveIndex = links.length ? (index + links.length) % links.length : -1;
        links.forEach(function (link, i) {
          var active = i === capitalSearchActiveIndex;
          link.classList.toggle('is-active', active);
          link.setAttribute('aria-selected', active ? 'true' : 'false');
          if (active) link.scrollIntoView({ block: 'nearest' });
        });
      }

      function capitalSearchRenderDropdown(query) {
        if (!capitalSearchDropdown) return;
        if (!String(query || '').trim()) {
          capitalSearchHideDropdown();
          return;
        }
        // Only projects with their own page make sense as a quick jump --
        // placeholder fund rows with no page still show up once the user
        // submits, in the full inline results list below.
        var matches = capitalSearchMatchesFor(query).filter(function (project) { return project.slug; }).slice(0, 8);

        capitalSearchActiveIndex = -1;
        if (!matches.length) {
          capitalSearchDropdown.innerHTML = '<div class="wc-home-search-empty">No matching projects found.</div>';
          capitalSearchDropdown.hidden = false;
          if (capitalSearchInput) capitalSearchInput.setAttribute('aria-expanded', 'true');
          return;
        }
        capitalSearchDropdown.innerHTML = matches.map(function (project, i) {
          var subtitle = project.department || project.dept || project.funding || '';
          return '<a class="wc-home-search-result" role="option" aria-selected="false" href="#" data-capital-search-index="' + i + '">' +
            '<strong>' + escapeHtml(project.title) + '</strong>' +
            (subtitle ? '<span>' + escapeHtml(subtitle) + '</span>' : '') +
            '</a>';
        }).join('');
        capitalSearchDropdown.hidden = false;
        if (capitalSearchInput) capitalSearchInput.setAttribute('aria-expanded', 'true');
        capitalSearchDropdown.querySelectorAll('.wc-home-search-result').forEach(function (link, i) {
          link.addEventListener('click', function (event) {
            event.preventDefault();
            capitalSearchOpenProject(matches[i]);
            capitalSearchHideDropdown();
          });
        });
      }

      if (capitalSearchForm && capitalSearchInput) {
        capitalSearchInput.addEventListener('input', function () {
          capitalSearchRenderDropdown(capitalSearchInput.value);
        });
        capitalSearchInput.addEventListener('focus', function () {
          capitalSearchRenderDropdown(capitalSearchInput.value);
        });
        capitalSearchInput.addEventListener('keydown', function (event) {
          var links = capitalSearchResultLinks();
          if (event.key === 'Escape') {
            capitalSearchHideDropdown();
            return;
          }
          if (event.key === 'ArrowDown') {
            if (!links.length) return;
            event.preventDefault();
            capitalSearchSetActive(capitalSearchActiveIndex + 1);
          } else if (event.key === 'ArrowUp') {
            if (!links.length) return;
            event.preventDefault();
            capitalSearchSetActive(capitalSearchActiveIndex - 1);
          } else if (event.key === 'Enter' && capitalSearchActiveIndex !== -1 && links[capitalSearchActiveIndex]) {
            event.preventDefault();
            links[capitalSearchActiveIndex].click();
          }
        });
        if (capitalSearchOutsideClickHandler) document.removeEventListener('click', capitalSearchOutsideClickHandler);
        capitalSearchOutsideClickHandler = function (event) {
          if (!capitalSearchForm.contains(event.target) && (!capitalSearchDropdown || !capitalSearchDropdown.contains(event.target))) {
            capitalSearchHideDropdown();
          }
        };
        document.addEventListener('click', capitalSearchOutsideClickHandler);
        capitalSearchForm.addEventListener('submit', function (event) {
          event.preventDefault();
          capitalSearchHideDropdown();
          capitalSearchSubmitQuery();
        });
      }
    }).catch(function () {
      modalBody.innerHTML = '<div class="wc-data-error">Capital explorer data could not be loaded.</div>';
    });
  }

  function renderIndependentExplorer() {
    loading();
    if (!(window.WCIndependentAgencies && window.WCIndependentAgencies.load)) {
      modalBody.innerHTML = '<div class="wc-data-error">Independent agency data could not be loaded.</div>';
      return;
    }
    Promise.all([
      window.WCIndependentAgencies.load(),
      window.WCBudgetData.loadBudgetData().then(window.WCBudgetData.totalCountywideExpenditureBudget)
    ]).then(function (results) {
      var items = results[0] || [];
      var countywide = results[1] || 0;
      var total = items.reduce(function (sum, item) { return sum + (item.budget || 0); }, 0);
      var prior = items.reduce(function (sum, item) { return sum + (item.priorBudget || 0); }, 0);
      var totalFte = items.reduce(function (sum, item) { return sum + (item.fte || 0); }, 0);
      var cards = items.map(function (item) {
        return '<a href="' + escapeHtml(pageHref(item.href)) + '"><div class="wc-revenue-card-head"><div class="wc-revenue-card-head-main"><strong>' + escapeHtml(item.name) + '</strong><b class="wc-revenue-card-amount">' + escapeHtml(compactCurrency(item.budget)) + '</b><small class="wc-revenue-card-share">' + escapeHtml(item.fund || "") + '</small></div>' +
          (item.fte ? '<div class="wc-revenue-card-badge-stack"><span class="wc-personnel-dept-fte-badge">' + escapeHtml(item.fte) + ' FTE</span></div>' : '') +
          '</div>' + changeHtml(item.budget || 0, item.priorBudget || 0) + '</a>';
      }).join("");
      var change = total - prior;
      var pct = prior ? change / Math.abs(prior) * 100 : null;
      modalBody.innerHTML = '<section class="wc-department-explorer wc-independent-agencies-explorer"><div class="wc-department-explorer-head"><div><h2>Independent Agencies Budget</h2><p>Walton County budgets a combined ' + escapeHtml(compactCurrency(total)) + ' across ' + items.length + ' independent and autonomous entities' + (totalFte ? ', employing ' + escapeHtml(totalFte) + ' FTE' : '') + '. Select an entity to review its budget, staffing, and service information.</p><p class="wc-revenue-concentration-summary"><strong>' + (countywide ? Math.round(total / countywide * 100) : 0) + '%</strong> of the total expenditure budget is independent agency funding.</p></div><aside class="wc-revenue-total-budget"><div class="wc-revenue-total-primary"><span>Total Independent Agencies Budget</span><strong>' + escapeHtml(formatCurrency(total)) + '</strong><small class="wc-revenue-total-change ' + (change > 0 ? 'is-increase' : change < 0 ? 'is-decrease' : '') + '">' + (change >= 0 ? "+" : "−") + escapeHtml(compactCurrency(Math.abs(change))) + ' (' + (pct === null ? 'No FY 2026 base' : (pct >= 0 ? "+" : "−") + Math.abs(pct).toFixed(1) + '%') + ')</small><div class="wc-revenue-view-actions"><a class="wc-revenue-ledger-trigger" href="pages/independent-agencies-ledger.html" data-explorer-popup-trigger="Independent Agencies Ledger">View Independent Agencies Ledger</a></div></div></aside></div><div class="wc-department-budget-cards">' + cards + '</div></section>';
    }).catch(function () {
      modalBody.innerHTML = '<div class="wc-data-error">Independent agency data could not be loaded.</div>';
    });
  }

  function renderExplorer(type) {
    loading();
    if (!window.WCBudgetData) return;
    if (type === "revenue") {
      modalBody.innerHTML = '<section id="revenue-source-concentration" aria-label="Revenue Budget Explorer"></section><section id="revenue-peer-comparison" class="wc-revenue-peer-section" hidden aria-labelledby="revenue-peer-title"><button type="button" class="wc-revenue-peer-close">Close Revenue Comparison</button><div class="wc-revenue-peer-card"><div class="wc-revenue-peer-head"><div><span>Florida peer benchmark</span><h2 id="revenue-peer-title">How does Walton County compare?</h2><p>FY 2024 actual county-government revenue per resident provides a consistent comparison across regional and tourism-oriented peers.</p></div><label>Compare by<select id="revenue-peer-metric"></select></label></div><div class="wc-revenue-peer-chart-wrap"><canvas id="revenue-peer-chart"></canvas></div><div id="revenue-peer-insight" class="wc-revenue-peer-insight" aria-live="polite"></div><p class="wc-revenue-peer-source">Source: Florida Office of Economic and Demographic Research, FY 2024 county Annual Financial Report data.</p></div></section><section id="revenue-budget-questions" hidden></section>';
      window.WCBudgetData.renderRevenueBudgetQuestions();
    } else if (type === "personnel") {
      modalBody.innerHTML = '<section id="personnel-explorer" aria-label="Personnel Budget Explorer"></section><section id="personnel-budget-questions" hidden></section>';
      window.WCBudgetData.renderPersonnelBudgetQuestions();
    } else if (type === "departments") {
      modalBody.innerHTML = '<section id="department-budget-explorer" aria-label="Department Operating Budget Explorer"></section>';
      window.WCBudgetData.initDepartmentBudgetPage();
    } else if (type === "constitutional") {
      modalBody.innerHTML = '<section id="constitutional-budget-explorer" aria-label="Constitutional Officers Budget Explorer"></section>';
      window.WCBudgetData.initConstitutionalOfficersBudgetPage();
    } else if (type === "capital") {
      renderCapitalExplorer();
    } else if (type === "independent") {
      renderIndependentExplorer();
    }
  }

  function ensureDepartmentModal() {
    if (departmentModal) return departmentModal;
    departmentModal = document.createElement("div");
    departmentModal.className = "wc-home-department-modal";
    departmentModal.hidden = true;
    departmentModal.setAttribute("role", "dialog");
    departmentModal.setAttribute("aria-modal", "true");
    departmentModal.setAttribute("aria-labelledby", "wcHomeDepartmentModalTitle");
    departmentModal.innerHTML = '<video class="wc-home-department-modal-wave" muted loop playsinline preload="metadata" aria-hidden="true"><source src="assets/images/page-images/grok-video-a964bba7-boomerang-loop.mp4" type="video/mp4"></video>' +
      '<div class="wc-home-department-modal-backdrop" data-department-popup-close></div>' +
      '<section class="wc-home-department-modal-panel">' +
        '<header class="wc-home-department-modal-head"><h2 id="wcHomeDepartmentModalTitle">Code Compliance</h2>' +
        '<button type="button" class="wc-home-department-modal-close" data-department-popup-close aria-label="Close Code Compliance">&times;</button></header>' +
        '<iframe class="wc-home-department-modal-frame" title="Code Compliance department page" allow="fullscreen" allowfullscreen></iframe>' +
      '</section>';
    document.body.appendChild(departmentModal);
    departmentFrame = departmentModal.querySelector("iframe");
    departmentFrame.addEventListener("load", function () {
      // openDepartmentModal already set the modal's title from the trigger
      // that opened it (an explorer card's label, an "Environmental
      // Resources" override, etc.), so leave that alone on this first load.
      // But a plain in-page link clicked inside the popup (e.g. Overview of
      // Walton County's "View Board of County Commissioners" link) just
      // navigates this same iframe like any other link -- with nothing
      // re-opening the modal, that load would otherwise leave the header
      // showing the popup's original title over a totally different page.
      // Re-derive the title from whatever page just loaded instead, except
      // on this very first load where the caller's title should win.
      var isFollowOnNavigation = !departmentFrameAwaitingInitialLoad;
      departmentFrameAwaitingInitialLoad = false;
      try {
        var embeddedDocument = departmentFrame.contentDocument;
        embeddedDocument.documentElement.classList.add("wc-embedded-department");
        // Utility/legal pages (Glossary, Accessibility, Privacy, Transaction
        // Search) opened here already carry wc-embedded-utility -- set by
        // their own inline <script> from the ?embed=utility-popup this
        // modal now requests for them -- which hides their footer via
        // style.css. Leave that alone; only department pages get their
        // footer force-shown below (they want the sitewide search footer
        // inside the popup, these standalone statements don't).
        var isUtilityEmbed = embeddedDocument.documentElement.classList.contains("wc-embedded-utility");
        // The budget book supplies its own full-bleed, transparent layout
        // (see budget-book-viewer.css) and its own chrome -- none of the
        // generic department-page popup adjustments below apply to it, and
        // forcing its #content to a centered max-width column (meant for a
        // normal text/table page) fought with that page's own margin:0
        // full-bleed rules, leaving the book boxed into one side of the
        // popup instead of filling it. The sitewide search footer that the
        // rule below force-shows for ordinary department pages is likewise
        // wrong here -- it belongs to that page's own content area, not the
        // page-flip viewer.
        var isBudgetBookEmbed = departmentModal.classList.contains("is-budget-book");
        var embeddedStyle = embeddedDocument.createElement("style");
        embeddedStyle.textContent = isBudgetBookEmbed
          ? 'nav#nav-menu,.wc-breadcrumb,footer[role="contentinfo"]{display:none!important}'
          : ('nav#nav-menu,.wc-breadcrumb{display:none!important}' +
            (isUtilityEmbed ? '' : 'footer[role="contentinfo"]{display:block!important}') +
            '#layout{display:block!important;min-height:0!important}' +
            '#content{width:min(1380px,100%)!important;max-width:none!important;margin:0 auto!important;padding:44px 28px 28px!important}' +
            '#content>.page-eyebrow,#content>.page-title,#content>.wc-page-title-row{display:none!important}' +
            '[data-constitutional-ledger-close]{display:none!important}' +
            '.wc-dept-function-services--with-video>.wc-dept-supporting-media{margin-top:8px!important}');
        embeddedDocument.head.appendChild(embeddedStyle);
        if (isFollowOnNavigation) {
          var headingEl = embeddedDocument.querySelector(".page-title");
          var derivedTitle = headingEl ? headingEl.textContent.trim() : "";
          if (!derivedTitle) derivedTitle = (embeddedDocument.title || "").split(/[—-]/)[0].trim();
          var loadedUrl;
          try { loadedUrl = new URL(embeddedDocument.location.href); } catch (loadedUrlError) { loadedUrl = null; }
          if (loadedUrl && /\/environmental-resources\.html$/i.test(loadedUrl.pathname)) derivedTitle = "Environmental Resources";
          if (derivedTitle) {
            var titleEl = departmentModal.querySelector("#wcHomeDepartmentModalTitle");
            var closeButtonEl = departmentModal.querySelector(".wc-home-department-modal-close");
            if (titleEl) titleEl.textContent = derivedTitle;
            if (closeButtonEl) closeButtonEl.setAttribute("aria-label", "Close " + derivedTitle);
            departmentFrame.title = derivedTitle + " budget page";
          }
        }
        // Any link inside this popup that points back at home.html (the
        // CIP hero's "Back to Capital Projects"/"Search Projects", a
        // project's "Back to Project Search"/"Back to Capital Explorer",
        // etc.) would otherwise navigate this iframe TO home.html -- which
        // boots up a whole second copy of the site's own popup system
        // nested inside this one, stacking shell inside shell every time
        // (see screenshot). None of these links need a real navigation:
        // the explorer they're pointing back at is already open one level
        // up, so just close this popup to reveal it instead.
        embeddedDocument.addEventListener("click", function (event) {
          var link = event.target.closest("a[href]");
          if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          var resolvedUrl;
          try {
            resolvedUrl = new URL(link.href, embeddedDocument.location.href);
          } catch (urlError) {
            return;
          }
          if (/\/(?:transaction-search|glossary-acronyms-and-frequently-asked-questions|accessibility|privacy)\.html$/i.test(resolvedUrl.pathname)) {
            event.preventDefault();
            openDepartmentModal(resolvedUrl.href, link.textContent.trim(), departmentTrigger);
            return;
          }
          // A department/officer/agency link clicked from inside an
          // already-open popup (e.g. a name in the Property Tax Allocation
          // Ledger's table) would otherwise navigate this same iframe to
          // that page directly -- it "works" in the sense of loading, but
          // silently drops the popup chrome/title along the way instead of
          // opening like every other department link on the site does.
          // Reopens through the same singleton popup instead (replacing
          // this content, not nesting a new one).
          var linkedFilename = resolvedUrl.pathname.split("/").pop();
          var linkedPage = (window.wcBudgetPages || []).find(function (item) {
            var isDepartmentPage = item.section === "Departments" && item.title !== "Departments";
            var isConstitutionalPage = item.section === "Constitutional Officers" && item.title !== "Constitutional Officers";
            var isIndependentAgencyPage = item.section === "Autonomous Entities";
            if (!isDepartmentPage && !isConstitutionalPage && !isIndependentAgencyPage) return false;
            try { return new URL(item.href, window.location.href).pathname.split("/").pop() === linkedFilename; }
            catch (linkedPageError) { return false; }
          });
          if (linkedPage) {
            event.preventDefault();
            var linkedTitle = linkedFilename === "environmental-resources.html" ? "Environmental Resources" : linkedPage.title;
            openDepartmentModal(resolvedUrl.href, linkedTitle, departmentTrigger);
            return;
          }
          if (!/\/(search|home)\.html$/i.test(resolvedUrl.pathname)) return;
          event.preventDefault();
          closeDepartmentModal();
        }, true);
      } catch (error) {
        // The query-string class in the embedded page remains the fallback.
      }
      if (!departmentModal.hidden) {
        var isUtilityOrBookLoad = departmentModal.classList.contains("is-utility-page") || departmentModal.classList.contains("is-budget-book");
        // Keep the "Loading budget page…" overlay up for the same minimum
        // reveal window as the height grow (see MIN_POPUP_REVEAL_MS) so the
        // content reveal and the size grow happen together as one motion,
        // rather than the real (still small, internally-scrolled) page
        // flashing into view before the box has grown to show it properly.
        var loadingRemoveDelay = isUtilityOrBookLoad ? 0 : Math.max(0, MIN_POPUP_REVEAL_MS - (Date.now() - departmentModalOpenedAt));
        window.setTimeout(function () {
          window.requestAnimationFrame(function () { departmentModal.classList.remove("is-loading"); });
        }, loadingRemoveDelay);
      }
      if (departmentPanelResizeObserver) {
        departmentPanelResizeObserver.disconnect();
        departmentPanelResizeObserver = null;
      }
      departmentPanelResizeObserver = watchIframePopupHeight(departmentFrame, updateDepartmentModalHeight);
    });
    departmentModal.addEventListener("click", function (event) {
      if (event.target.closest("[data-department-popup-close]")) closeDepartmentModal();
    });
    return departmentModal;
  }

  var UTILITY_POPUP_PAGE_PATTERN = /\/(accessibility|privacy|transaction-search|glossary-acronyms-and-frequently-asked-questions)\.html$/i;

  function openDepartmentModal(href, title, trigger) {
    ensureDepartmentModal();
    departmentTrigger = trigger;
    var openedWithoutExplorer = modal.hidden;
    var url = new URL(href, window.location.href);
    var departmentTitle = /\/environmental-resources\.html$/i.test(url.pathname) || String(title).toLowerCase() === "environmental services"
      ? "Environmental Resources"
      : title || "Department";
    var waveVideo = departmentModal.querySelector(".wc-home-department-modal-wave");
    // Glossary/Accessibility/Privacy/Transaction Search are standalone
    // legal/utility pages, not department pages -- they already know how to
    // render themselves chromeless via ?embed=utility-popup (see their own
    // inline <script>, and html.wc-embedded-utility in style.css), the same
    // markup nav.js's own footer dialog uses for them. Tag them the same
    // way here so the load handler below can skip forcing this popup's own
    // "Still looking for something?" search footer onto them -- without
    // this they render their own full site footer (nav.js runs inside the
    // iframe too), complete with its own dormant wave-video utility dialog
    // sitting right under the two-paragraph statement: a second wave shell
    // nested inside this one's, and a stray footer-shaped box under the text.
    var isUtilityPage = UTILITY_POPUP_PAGE_PATTERN.test(url.pathname);
    var isBudgetBook = /\/budget-book\.html$/i.test(url.pathname);
    url.searchParams.set("embed", isUtilityPage ? "utility-popup" : "department-popup");
    departmentModal.classList.toggle("is-utility-page", isUtilityPage);
    // The interactive budget book supplies its own minimal, transparent
    // chrome (page-turn arrows, page indicator, download/fullscreen/close)
    // so the wave video shows through -- this popup's own opaque header
    // and panel background would otherwise sit on top of it.
    departmentModal.classList.toggle("is-budget-book", isBudgetBook);
    if (waveVideo) {
      waveVideo.defaultPlaybackRate = 0.25;
      waveVideo.playbackRate = 0.25;
      var playPromise = waveVideo.play();
      if (playPromise && typeof playPromise.catch === "function") playPromise.catch(function () {});
    }
    departmentModal.querySelector("#wcHomeDepartmentModalTitle").textContent = departmentTitle;
    departmentModal.querySelector(".wc-home-department-modal-close").setAttribute("aria-label", "Close " + departmentTitle);
    departmentFrame.title = departmentTitle + " budget page";
    departmentModal.dataset.standalone = openedWithoutExplorer ? "true" : "false";
    if (openedWithoutExplorer) lockBackgroundPage();
    if (!openedWithoutExplorer) {
      var explorerWave = modal.querySelector(".wc-home-explorer-modal-wave");
      if (explorerWave) explorerWave.pause();
    }
    departmentModal.classList.add("is-loading");
    // Open small and grow -- deliberately, not just incidentally: even a
    // static page with no async data step (Overview of Walton County, Org
    // Chart, GFOA Award) should still open at this small "loading" size
    // and visibly expand a beat later, the same reveal a data-driven page
    // like Budget Change Summary naturally gets. See the matching
    // MIN_POPUP_REVEAL_MS gate in updateDepartmentModalHeight.
    var panelToReset = departmentModal.querySelector(".wc-home-department-modal-panel");
    if (panelToReset && !isUtilityPage && !isBudgetBook) panelToReset.style.height = "360px";
    else if (panelToReset) panelToReset.style.height = "";
    departmentModalOpenedAt = Date.now();
    departmentFrameAwaitingInitialLoad = true;
    departmentFrame.src = url.href;
    departmentModal.hidden = false;
    modal.classList.add("is-department-popup-open");
    // The budget book hides this popup's own header (it supplies its own
    // close control), so the header's close button isn't focusable there.
    if (isBudgetBook) departmentFrame.focus();
    else departmentModal.querySelector(".wc-home-department-modal-close").focus();
  }

  function closeDepartmentModal() {
    if (!departmentModal || departmentModal.hidden) return;
    var openedWithoutExplorer = departmentModal.dataset.standalone === "true";
    departmentModal.hidden = true;
    departmentModal.classList.remove("is-loading");
    if (departmentPanelResizeObserver) {
      departmentPanelResizeObserver.disconnect();
      departmentPanelResizeObserver = null;
    }
    var waveVideo = departmentModal.querySelector(".wc-home-department-modal-wave");
    if (waveVideo) {
      waveVideo.pause();
      waveVideo.currentTime = 0;
    }
    departmentFrame.src = "about:blank";
    modal.classList.remove("is-department-popup-open");
    if (!openedWithoutExplorer) {
      var explorerWave = modal.querySelector(".wc-home-explorer-modal-wave");
      if (explorerWave) {
        var playPromise = explorerWave.play();
        if (playPromise && typeof playPromise.catch === "function") playPromise.catch(function () {});
      }
    }
    departmentModal.removeAttribute("data-standalone");
    if (openedWithoutExplorer) unlockBackgroundPage();
    if (departmentTrigger && document.contains(departmentTrigger)) departmentTrigger.focus();
    departmentTrigger = null;
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    closeDepartmentModal();
    modal.hidden = true;
    modal.classList.remove("is-utility-page");
    // Utility pages are the only ones that ever set an inline height on the
    // panel (see sizeIframePopupPanel) -- clear it so the next regular
    // explorer opened isn't stuck at a stale utility-page height.
    var panelToClear = modal.querySelector(".wc-home-explorer-modal-panel");
    if (panelToClear) panelToClear.style.height = "";
    if (explorerUtilityPanelResizeObserver) {
      explorerUtilityPanelResizeObserver.disconnect();
      explorerUtilityPanelResizeObserver = null;
    }
    var explorerWave = modal.querySelector(".wc-home-explorer-modal-wave");
    if (explorerWave) {
      explorerWave.pause();
      explorerWave.currentTime = 0;
    }
    modalBody.innerHTML = "";
    unlockBackgroundPage();
    if (activeCard) activeCard.focus();
    activeCard = null;
  }

  function openModal(type, card) {
    var config = EXPLORERS[type];
    if (!config) return;
    activeCard = card;
    modal.classList.remove("is-utility-page");
    modalTitle.textContent = config.title;
    modal.querySelector(".wc-home-explorer-modal-close").setAttribute("aria-label", "Close explorer");
    modal.hidden = false;
    lockBackgroundPage();
    // The panel now sizes to its own content instead of always filling the
    // viewport, so content scrolls inside modalBody rather than the outer
    // modal -- reset that instead of the (no longer scrollable) outer element.
    if (modalBody) modalBody.scrollTop = 0;
    var explorerWave = modal.querySelector(".wc-home-explorer-modal-wave");
    if (explorerWave) {
      explorerWave.defaultPlaybackRate = 0.25;
      explorerWave.playbackRate = 0.25;
      var playPromise = explorerWave.play();
      if (playPromise && typeof playPromise.catch === "function") playPromise.catch(function () {});
    }
    modal.querySelector(".wc-home-explorer-modal-close").focus();
    renderExplorer(type);
  }

  function init() {
    modal = document.createElement("div");
    modal.className = "wc-home-explorer-modal";
    modal.hidden = true;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "wcHomeExplorerModalTitle");
    modal.innerHTML = '<video class="wc-home-explorer-modal-wave" muted loop playsinline preload="metadata" aria-hidden="true"><source src="assets/images/page-images/grok-video-a964bba7-boomerang-loop.mp4" type="video/mp4"></video>' +
      '<div class="wc-home-explorer-modal-backdrop" aria-hidden="true"></div>' +
      '<div class="wc-home-explorer-modal-panel"><header class="wc-home-explorer-modal-head"><div class="wc-home-explorer-modal-heading"><h2 id="wcHomeExplorerModalTitle"></h2></div><button type="button" class="wc-home-explorer-modal-close" aria-label="Close explorer">&times;</button></header><div class="wc-home-explorer-modal-body"></div>' +
      '<footer class="wc-home-explorer-modal-footer"><div><strong>Still looking for something?</strong><span>Search departments, budgets, personnel, funds, publications, and county information.</span><button type="button" data-explorer-footer-action="search" aria-label="Search the Budget"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6.15 6.15a7.5 7.5 0 0 0 10.5 10.5Z"></path></svg></button></div><nav aria-label="Explorer footer links"><button type="button" data-explorer-footer-action="transactions">Transaction Search</button><button type="button" data-explorer-footer-action="glossary">Glossary &amp; FAQ</button><button type="button" data-explorer-footer-action="documentation">Supporting Documentation</button><button type="button" data-explorer-footer-action="contact">Contact Budget Office</button><button type="button" data-explorer-footer-action="accessibility">Accessibility</button><button type="button" data-explorer-footer-action="privacy">Privacy</button></nav></footer></div>';
    document.body.appendChild(modal);
    modalBody = modal.querySelector(".wc-home-explorer-modal-body");
    modalTitle = modal.querySelector("#wcHomeExplorerModalTitle");

    new MutationObserver(function () { prefixPageLinks(modalBody); }).observe(modalBody, { childList: true, subtree: true });
    document.addEventListener("click", function (event) {
      var link = event.target.closest('a[href]');
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var explorerPopupTitle = link.getAttribute("data-explorer-popup-trigger");
      if (explorerPopupTitle) {
        event.preventDefault();
        var explorerPopupUrl = new URL(link.href, window.location.href);
        openDepartmentModal(explorerPopupUrl.href, explorerPopupTitle, link);
        return;
      }
      var inDepartmentExplorer = modalBody.contains(link) && link.closest(".wc-department-budget-cards");
      var inOfficePicker = link.closest(".wc-budget-detail-modal .wc-department-office-picker-list");
      var inSearchResults = link.closest(".wc-home-search-result,.wc-nav-search-result");
      if (!inDepartmentExplorer && !inOfficePicker && !inSearchResults) return;
      var url = new URL(link.href, window.location.href);
      var filename = url.pathname.split("/").pop();
      var resultTitleElement = inSearchResults ? link.querySelector("strong") : null;
      var resultTitle = resultTitleElement ? resultTitleElement.textContent.trim().toLowerCase() : "";
      var popupPages = (window.wcBudgetPages || []).filter(function (item) {
        var isDepartmentPage = item.section === "Departments" && item.title !== "Departments";
        var isConstitutionalPage = item.section === "Constitutional Officers" && item.title !== "Constitutional Officers";
        var isIndependentAgencyPage = item.section === "Autonomous Entities";
        return isDepartmentPage || isConstitutionalPage || isIndependentAgencyPage;
      });
      var page = popupPages.find(function (item) {
        try { return new URL(item.href, window.location.href).pathname.split("/").pop() === filename; }
        catch (error) { return false; }
      }) || popupPages.find(function (item) {
        return resultTitle && String(item.title || "").trim().toLowerCase() === resultTitle;
      });
      if (!page) return;
      event.preventDefault();
      // Search results can retain a legacy/external URL even though their
      // catalog entry has a canonical local page. Prefer that catalog URL
      // once the result has been identified by its displayed title.
      try {
        var canonicalFilename = new URL(page.href, window.location.href).pathname.split("/").pop();
        if (/\.html$/i.test(canonicalFilename)) filename = canonicalFilename;
      } catch (error) {}
      // Explorer cards and office-picker choices can be emitted as bare
      // filenames. Resolve every popup page through /pages/ consistently.
      var departmentHref = new URL("pages/" + filename, window.location.href);
      departmentHref.search = url.search;
      departmentHref.hash = url.hash;
      var departmentTitle = filename === "environmental-resources.html" ? "Environmental Resources" : page.title;
      openDepartmentModal(departmentHref.href, departmentTitle, link);
    }, true);
    modal.querySelector(".wc-home-explorer-modal-close").addEventListener("click", closeModal);
    modal.querySelector(".wc-home-explorer-modal-footer").addEventListener("click", function (event) {
      var actionButton = event.target.closest("[data-explorer-footer-action]");
      if (!actionButton) return;
      var action = actionButton.dataset.explorerFooterAction;
      var pageAction = {
        transactions: { href: "pages/transaction-search.html", title: "Transaction Search" },
        glossary: { href: "pages/glossary-acronyms-and-frequently-asked-questions.html", title: "Glossary, Acronyms & FAQ" },
        documentation: { href: "pages/supporting-budget-documentation.html", title: "Supporting Budget Documentation" },
        accessibility: { href: "pages/accessibility.html", title: "Accessibility Statement" },
        privacy: { href: "pages/privacy.html", title: "Privacy Statement" }
      }[action];
      if (pageAction) {
        var utilityUrl = new URL(pageAction.href, window.location.href);
        utilityUrl.searchParams.set("embed", "utility-popup");
        modal.classList.add("is-utility-page");
        modalTitle.textContent = pageAction.title;
        // Reset to auto/unsized before the new page loads -- otherwise this
        // popup would start out pinned to whatever height a previously
        // opened utility page had settled on.
        var utilityPanelToReset = modal.querySelector(".wc-home-explorer-modal-panel");
        if (utilityPanelToReset) utilityPanelToReset.style.height = "";
        modalBody.innerHTML = '<iframe class="wc-home-explorer-utility-frame" title="' + escapeHtml(pageAction.title) + '"></iframe>';
        var utilityFrame = modalBody.querySelector(".wc-home-explorer-utility-frame");
        if (explorerUtilityPanelResizeObserver) {
          explorerUtilityPanelResizeObserver.disconnect();
          explorerUtilityPanelResizeObserver = null;
        }
        utilityFrame.addEventListener("load", function () {
          try {
            utilityFrame.contentDocument.documentElement.classList.add("wc-embedded-utility");
          } catch (error) {}
          explorerUtilityPanelResizeObserver = watchIframePopupHeight(utilityFrame, updateExplorerUtilityModalHeight);
        });
        utilityFrame.src = utilityUrl.href;
        modal.querySelector(".wc-home-explorer-modal-close").setAttribute("aria-label", "Close " + pageAction.title);
        modal.querySelector(".wc-home-explorer-modal-close").focus();
        return;
      }
      var sourceFooter = document.querySelector('body > footer[role="contentinfo"]');
      if (!sourceFooter) return;
      var sourceControl = action === "search" ? sourceFooter.querySelector(".wc-footer-search-icon-button")
        : action === "contact" ? sourceFooter.querySelector(".wc-footer-contact-button")
        : null;
      if (sourceControl) sourceControl.click();
    });
    modal.addEventListener("click", function (event) { if (event.target === modal) closeModal(); });
    document.addEventListener("keydown", function (event) {
      if (modal.hidden && (!departmentModal || departmentModal.hidden)) return;
      var nestedDialog = modal.querySelector("dialog[open]");
      if (event.key === "Escape") {
        if (departmentModal && !departmentModal.hidden) {
          closeDepartmentModal();
          return;
        }
        if (nestedDialog) return;
        closeModal();
        return;
      }
      if (departmentModal && !departmentModal.hidden && event.key === "Tab") {
        var popupFocusable = Array.prototype.slice.call(departmentModal.querySelectorAll('button:not([disabled]),iframe,[tabindex]:not([tabindex="-1"])'));
        var popupFirst = popupFocusable[0];
        var popupLast = popupFocusable[popupFocusable.length - 1];
        if (event.shiftKey && document.activeElement === popupFirst) {
          event.preventDefault();
          popupLast.focus();
        } else if (!event.shiftKey && document.activeElement === popupLast) {
          event.preventDefault();
          popupFirst.focus();
        }
        return;
      }
      if (nestedDialog) return;
      if (event.key !== "Tab") return;
      var focusable = Array.prototype.slice.call(modal.querySelectorAll('a[href],button:not([disabled]),select,input,[tabindex]:not([tabindex="-1"])'))
        .filter(function (element) { return !element.hidden && element.offsetParent !== null; });
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    document.querySelectorAll("[data-home-explorer]").forEach(function (card) {
      card.addEventListener("click", function (event) {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        openModal(card.dataset.homeExplorer, card);
      });
    });
    var requestedExplorer = "";
    try { requestedExplorer = new URLSearchParams(window.location.search).get("explorer") || ""; } catch (error) { requestedExplorer = ""; }
    if (EXPLORERS[requestedExplorer]) {
      var requestedCard = document.querySelector('[data-home-explorer="' + requestedExplorer + '"]');
      if (requestedCard) openModal(requestedExplorer, requestedCard);
    }
  }

  // Lets the budget book's own iframe-embedded close (X) button -- shown in
  // place of this popup's header/close button when is-budget-book is set --
  // close the popup from inside the same-origin iframe.
  window.WCHomeExplorer = { closeDepartmentModal: closeDepartmentModal };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
