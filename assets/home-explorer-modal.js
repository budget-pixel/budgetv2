(function () {
  "use strict";

  var EXPLORERS = {
    revenue: { title: "Revenue Budget" },
    personnel: { title: "Workforce Budget" },
    departments: { title: "Board Department Budgets" },
    capital: { title: "Capital Budget" },
    constitutional: { title: "Constitutional Officers Budget" },
    independent: { title: "Other Agencies and Court-Related Functions Budget" }
  };

  // Every page listed in the Ledger Directory (pages/budget-overview.html's
  // own hubList) -- these popups get a "Back to Ledger Directory" button in
  // the department-modal header since each page's own in-content back link
  // is hidden inside the iframe (see #content>.wc-page-title-row above).
  var LEDGER_DIRECTORY_PAGES = new Set([
    "consolidated-financial-schedules.html", "debt-overview.html", "fund-financial-schedules.html",
    "summary-of-interfund-transfers.html", "summary-of-budget-changes-and-adjustments.html",
    "financial-forecast.html", "revenue-ledger.html", "summary-of-expenses.html",
    "summary-of-property-tax-allocations.html", "department-ledger.html", "constitutional-ledger.html",
    "independent-agencies-ledger.html", "personnel-ledger.html", "summary-of-contractual-services.html",
    "cip-capital-projects.html", "cip-tourist-development.html", "cip-sheriff.html",
    "recreation-plat-fee-fund.html", "sidewalk-fund.html", "summary-of-machinery-vehicles-and-equipment.html"
  ]);
  var LEDGER_DIRECTORY_HREF = "pages/budget-overview.html";

  var activeCard = null;
  var activeExplorerType = "";
  var modal = null;
  var modalBody = null;
  var modalTitle = null;
  var departmentModal = null;
  var departmentFrame = null;
  var openedFromLedgerDirectory = false;
  var departmentTrigger = null;
  // Set when a utility page (Glossary & FAQ, Accessibility, ...) is opened
  // from a page that is already showing in the popup, so closing the utility
  // page returns to that page instead of dismissing the whole popup.
  var departmentReturnTo = null;
  var departmentFrameAwaitingInitialLoad = false;
  var departmentNavigationStack = [];
  var lockedPageScrollY = 0;
  var savedBodyStyles = null;
  var backgroundElements = [];
  var capitalSearchOutsideClickHandler = null;
  var departmentPanelResizeObserver = null;
  var departmentModalOpenedAt = 0;
  var explorerModalOpenedAt = 0;
  var explorerUtilityPanelResizeObserver = null;
  // How long the popup stays at its small opening size before it's allowed
  // to grow -- deliberate, so the reveal reads as a consistent flourish
  // rather than something that only happens to appear on slow-loading pages.
  function popupRevealDelay(){
    return window.matchMedia('(max-width:700px), (prefers-reduced-motion:reduce)').matches ? 0 : 400;
  }

  function playBackgroundVideo(video){
    if(window.matchMedia('(max-width:700px), (prefers-reduced-motion:reduce)').matches || navigator.connection?.saveData) return Promise.resolve();
    var source = video.querySelector('source[data-src]');
    if(source && !source.hasAttribute('src')){ source.src = source.dataset.src; video.load(); }
    return video.play() || Promise.resolve();
  }

  var chartLibraryPromise = null;
  function loadExplorerCharts(){
    if(window.Chart) return Promise.resolve();
    if(chartLibraryPromise) return chartLibraryPromise;
    chartLibraryPromise = new Promise(function(resolve, reject){
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js';
      script.onload = resolve;
      script.onerror = function(){ script.remove(); chartLibraryPromise = null; reject(new Error('Chart library could not load')); };
      document.head.appendChild(script);
    });
    return chartLibraryPromise;
  }

  // Sizes the department popup to the loaded page's actual content height
  // (capped at the viewport) instead of always opening at near-full
  // height -- a short page like State Attorney or Public Defender no
  // longer leaves a block of empty space below its footer. Utility pages
  // (Glossary, Transaction Search, Accessibility, Privacy) skip this (see
  // the is-utility-page bailout below) and keep the popup's full-height
  // panel, since some of them (Privacy in particular) are long enough to
  // want it rather than a shrink-to-fit box.
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
    // Popups other than the landing page hide that footer (nav.js
    // wc-popup-no-footer), so fall back to the lowest bottom edge among the
    // body's visible children.
    // getBoundingClientRect() is relative to the frame's current scroll
    // position, so add that back -- otherwise re-measuring a page the reader
    // has scrolled down makes it look short enough to "fit" and locks its
    // scrolling (html.wc-popup-fits).
    var scrolled = doc.defaultView ? (doc.defaultView.scrollY || doc.documentElement.scrollTop || 0) : 0;
    var contentHeight = 0;
    var footer = doc.querySelector('footer[role="contentinfo"]');
    if (footer && footer.getBoundingClientRect().height > 0) {
      contentHeight = Math.ceil(footer.getBoundingClientRect().bottom + scrolled);
    } else if (doc.getElementById("layout") && doc.getElementById("layout").getBoundingClientRect().height > 0) {
      contentHeight = Math.ceil(doc.getElementById("layout").getBoundingClientRect().bottom + scrolled);
    } else if (doc.body) {
      Array.prototype.forEach.call(doc.body.children, function (child) {
        var rect = child.getBoundingClientRect();
        if (rect.height > 0) contentHeight = Math.max(contentHeight, Math.ceil(rect.bottom + scrolled));
      });
    }
    if (!contentHeight) contentHeight = doc.documentElement.scrollHeight;
    var maxHeight = (window.visualViewport ? window.visualViewport.height : window.innerHeight) - 36;
    var desired = Math.min(maxHeight, Math.max(320, Math.ceil(contentHeight + headHeight)));
    panel.style.height = desired + "px";
    // When the whole page fits inside the popup, turn off its scrolling so
    // the content doesn't drift a few pixels under a wheel or trackpad
    // gesture (see html.wc-popup-fits in style.css). Long pages keep
    // scrolling normally.
    doc.documentElement.classList.toggle("wc-popup-fits", Math.ceil(contentHeight + headHeight) <= maxHeight);
  }

  // Watches an iframe's loaded document for size changes (budget data
  // loading in asynchronously can grow or shrink it after "load" fires)
  // and re-measures. Returns the observer so the caller can disconnect it
  // later; also does a few cheap timed re-checks as a fallback for
  // anything a ResizeObserver doesn't happen to catch (web fonts, images
  // without explicit dimensions).
  function watchIframePopupHeight(frame, measure) {
    var observer = null;
    var classObserver = null;
    try {
      var doc = frame.contentDocument;
      if (doc && doc.body && typeof ResizeObserver === "function") {
        observer = new ResizeObserver(function () { measure(); });
        observer.observe(doc.body);
      }
      // Opening a ledger uses a fixed-position overlay inside the iframe,
      // so it does not necessarily change body dimensions and therefore
      // may not wake the ResizeObserver above. Watch the body's modal-open
      // class as well so the outer department popup can expand immediately.
      if (doc && doc.body && typeof MutationObserver === "function") {
        classObserver = new MutationObserver(function () { measure(); });
        classObserver.observe(doc.body, { attributes: true, attributeFilter: ["class"] });
      }
    } catch (watchError) {
      // Cross-origin or unsupported -- the timed re-checks below still run.
    }
    measure();
    [50, 200, 500, 1000].forEach(function (delay) { window.setTimeout(measure, delay); });
    return {
      disconnect: function () {
        if (observer) observer.disconnect();
        if (classObserver) classObserver.disconnect();
      }
    };
  }

  // Ledger/detail panels are fixed overlays inside the department page's
  // iframe, so on their own they can never be wider than the department
  // popup. While one is open, stretch the iframe over the whole window
  // (transparent) and pin the page's body to the rectangle the iframe used
  // to occupy: the department popup looks unchanged and blurs behind the
  // detail panel, which now spans the full window.
  var DETAIL_LAYER_CSS =
    'html.wc-detail-layer{overflow:hidden!important;background:linear-gradient(transparent,transparent)!important}' +
    'html.wc-detail-layer body{position:fixed!important;left:var(--wc-layer-left)!important;right:auto!important;top:var(--wc-layer-top)!important;width:var(--wc-layer-width)!important;height:var(--wc-layer-height)!important;margin:0!important;overflow:hidden!important;border-radius:0 0 21px 21px}';
  var departmentDetailLayerScroll = 0;

  function syncDepartmentDetailLayer(detailOpen) {
    var doc = null;
    try { doc = departmentFrame.contentDocument; } catch (error) { doc = null; }
    var root = doc && doc.documentElement;
    var pinned = !!(root && root.classList.contains("wc-detail-layer"));
    var isUtilityOrBook = departmentModal.classList.contains("is-utility-page") || departmentModal.classList.contains("is-budget-book");
    if (!detailOpen || isUtilityOrBook || !root || !doc.body) {
      departmentModal.classList.remove("is-detail-layer");
      if (pinned) {
        root.classList.remove("wc-detail-layer");
        doc.body.scrollTop = 0;
        if (doc.defaultView) doc.defaultView.scrollTo(0, departmentDetailLayerScroll);
      }
      return;
    }
    var panel = departmentModal.querySelector(".wc-home-department-modal-panel");
    var head = departmentModal.querySelector(".wc-home-department-modal-head");
    var panelRect = panel.getBoundingClientRect();
    var top = head ? head.getBoundingClientRect().bottom : panelRect.top + panel.clientTop;
    root.style.setProperty("--wc-layer-left", (panelRect.left + panel.clientLeft) + "px");
    root.style.setProperty("--wc-layer-top", top + "px");
    root.style.setProperty("--wc-layer-width", panel.clientWidth + "px");
    root.style.setProperty("--wc-layer-height", Math.max(0, panelRect.top + panel.clientTop + panel.clientHeight - top) + "px");
    if (pinned) return;
    if (!doc.getElementById("wcDetailLayerStyle")) {
      var style = doc.createElement("style");
      style.id = "wcDetailLayerStyle";
      style.textContent = DETAIL_LAYER_CSS;
      doc.head.appendChild(style);
    }
    // The page's own scroll lock (lockBudgetDetailBackgroundScroll in
    // budget-data.js) has already moved its scroll offset into body.top.
    departmentDetailLayerScroll = Math.max(0, -parseFloat(doc.body.style.top) || 0) || (doc.scrollingElement || root).scrollTop;
    root.classList.add("wc-detail-layer");
    departmentModal.classList.add("is-detail-layer");
    doc.body.scrollTop = departmentDetailLayerScroll;
  }

  // Calls done once the frame's page has gone 150ms without DOM changes
  // (or after 2s at most), i.e. once its scripts have drawn the page.
  function waitForFrameToSettle(frame, done) {
    var doc = null;
    try { doc = frame.contentDocument; } catch (error) {}
    if (!doc || !doc.body || typeof MutationObserver !== "function") { done(); return; }
    var finished = false;
    var quietTimer = null;
    var observer = new MutationObserver(restart);
    var capTimer = window.setTimeout(finish, 2000);
    function finish() {
      if (finished) return;
      finished = true;
      observer.disconnect();
      window.clearTimeout(quietTimer);
      window.clearTimeout(capTimer);
      done();
    }
    function restart() {
      window.clearTimeout(quietTimer);
      quietTimer = window.setTimeout(finish, 150);
    }
    observer.observe(doc.body, { childList: true, subtree: true });
    restart();
  }

  function updateDepartmentModalHeight() {
    if (!departmentModal || !departmentFrame || departmentModal.hidden) return;
    var panel = departmentModal.querySelector(".wc-home-department-modal-panel");
    var detailOpen = false;
    try { detailOpen = departmentFrame.contentDocument.body.classList.contains('wc-budget-detail-open'); } catch (error) {}
    departmentModal.classList.toggle('is-detail-open', detailOpen);
    syncDepartmentDetailLayer(detailOpen);
    // The budget book always wants the full available height for its own
    // page-flip sizing (see the is-budget-book CSS) rather than shrinking
    // to fit its iframe's measured content height like a normal department
    // page.
    var isUtilityOrBook = departmentModal.classList.contains("is-utility-page") || departmentModal.classList.contains("is-budget-book");
    if (isUtilityOrBook) {
      sizeIframePopupPanel(panel, departmentFrame, departmentModal.querySelector(".wc-home-department-modal-head"), true);
      return;
    }
    // While a ledger/detail panel is open the department page is pinned in
    // place (see syncDepartmentDetailLayer), so hold the popup at its
    // current size rather than re-measuring the pinned page.
    if (detailOpen) return;
    // Hold at the small opening size (set in openDepartmentModal) until the
    // minimum reveal time has passed -- even a page whose content is fully
    // ready well before that keeps the deliberate small-then-grow motion
    // instead of jumping straight to full size.
    var elapsed = Date.now() - departmentModalOpenedAt;
    if (elapsed < popupRevealDelay()) {
      window.setTimeout(updateDepartmentModalHeight, popupRevealDelay() - elapsed);
      return;
    }
    sizeIframePopupPanel(panel, departmentFrame, departmentModal.querySelector(".wc-home-department-modal-head"), false);
  }

  function updateExplorerUtilityModalHeight() {
    if (!modal || modal.hidden) return;
    var utilityFrame = modalBody.querySelector(".wc-home-explorer-utility-frame");
    if (!utilityFrame) return;
    var panel = modal.querySelector(".wc-home-explorer-modal-panel");
    sizeIframePopupPanel(panel, utilityFrame, modal.querySelector(".wc-home-explorer-modal-head"), true);
  }

  window.addEventListener("resize", function () {
    updateDepartmentModalHeight();
    updateExplorerUtilityModalHeight();
  });

  function lockBackgroundPage() {
    if (isMobilePages()) return;
    if (savedBodyStyles) return;
    backgroundElements = Array.from(document.body.children).filter(function(el){
      return el !== modal && el !== departmentModal && !el.inert && !/^(SCRIPT|STYLE|LINK)$/.test(el.tagName);
    });
    backgroundElements.forEach(function(el){ el.inert = true; });
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
    backgroundElements.forEach(function(el){ el.inert = false; });
    backgroundElements = [];
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
      var activeTransportationProjects = projects.filter(function (project) {
        if (!project || project.is_legacy_in_house_engineering_row) return false;
        var funding = String(project.funding || "").trim().toLowerCase();
        if (["transportation fund", "capital projects fund", "general fund"].indexOf(funding) === -1) return false;
        if (String(project.department_filter || "").trim().toLowerCase() === "sheriff") return false;
        return (project.funding_by_year || []).some(function (year) {
          return year.year === "FY2027" && (Number(year.amount_value) || 0) > 0;
        });
      });
      var activeProjects = activeTransportationProjects.length;
      // Match the card to the Transportation and Infrastructure ledger's
      // actual FY2027 project schedule. Adding whole accounting funds here
      // pulled unrelated capital rows into the callout and produced $27.2M,
      // even though the linked ledger totals $24,545,734.
      var transportationInfrastructureTotal = activeTransportationProjects.reduce(function (sum, project) {
        var amount = (project.funding_by_year || []).filter(function (year) {
          return year.year === "FY2027";
        }).reduce(function (yearSum, year) {
          return yearSum + (Number(year.amount_value) || 0);
        }, 0);
        return sum + amount;
      }, 0);
      var hasFy2027Funding = function (project) {
        return (project.funding_by_year || []).some(function (year) {
          return year.year === "FY2027" && (Number(year.amount_value) || 0) > 0;
        });
      };
      var projectBadge = function (count) {
        return count + (count === 1 ? " FY 2027 project" : " FY 2027 projects");
      };
      // Tourist Development: the ledger's main FY2027 table only -- the
      // projects it breaks out as budgeted elsewhere (see the
      // budgetedElsewhereTitles list in cip-tourist-development.html) are
      // not new FY2027 Tourist Development Fund spending.
      var touristBudgetedElsewhere = ["us 331 bridge lighting", "boardwalk dune walkover repair/replacement", "deer lake path realignment", "dune allen hardscaping project", "miramar beach parking facility", "multi-use path - 30a rebuild 395 to eastern lake", "multi-use path - 30a rebuild 83 to 393", "santa rosa beach performing arts park", "transit program gulfview & blue mountain", "walton dunes beach access"];
      var touristProjects = projects.filter(function (project) {
        if (!project || project.is_legacy_in_house_engineering_row) return false;
        if (String(project.funding || "").trim().toLowerCase() !== "tourist development fund") return false;
        var title = String(project.title || "").toLowerCase();
        if (touristBudgetedElsewhere.some(function (fragment) { return title.indexOf(fragment) !== -1; })) return false;
        return hasFy2027Funding(project);
      });
      var sheriffProjects = projects.filter(function (project) {
        return project && !project.is_legacy_in_house_engineering_row &&
          String(project.department_filter || "").trim().toLowerCase() === "sheriff" &&
          String(project.funding || "").trim().toLowerCase() === "capital projects fund";
      });
      var sheriffFy2027Count = sheriffProjects.filter(hasFy2027Funding).length;
      var cards = [
        { title: "Transportation and Infrastructure Capital Ledger", href: "pages/cip-capital-projects.html", amount: transportationInfrastructureTotal, badge: projectBadge(activeProjects) },
        { title: "Tourist Development Fund Capital Ledger", href: "pages/cip-tourist-development.html", amount: byFund["111"] || 0, badge: projectBadge(touristProjects.length) },
        { title: "Sheriff Capital Project Ledger", href: "pages/cip-sheriff.html", amount: sheriffProjects.reduce(function (sum, project) {
          return sum + (project.funding_by_year || []).filter(function (year) {
            return year.year === "FY2027";
          }).reduce(function (yearSum, year) { return yearSum + (Number(year.amount_value) || 0); }, 0);
        }, 0), badge: projectBadge(sheriffFy2027Count) },
        { title: "Machinery, Vehicles, & Equipment Ledger", href: "pages/summary-of-machinery-vehicles-and-equipment.html", amount: machinery, badge: machineryRows.length + " items" },
        { title: "Recreation Plat Fee Fund Capital Ledger", href: "pages/recreation-plat-fee-fund.html", amount: byFund["114"] || 0 },
        { title: "Sidewalk Fund Capital Ledger", href: "pages/sidewalk-fund.html", amount: byFund["115"] || 0 }
      ];
      var cardHtml = cards.map(function (card) {
        var scope = card.href.indexOf('cip-sheriff') !== -1 ? 'Capital Projects Fund projects; included in County capital outlay' : card.href.indexOf('machinery') !== -1 ? 'Equipment schedule; overlaps fund capital budgets' : 'Capital-outlay appropriations in the selected funds';
        return '<a href="' + escapeHtml(card.href) + '" data-explorer-popup-trigger="' + escapeHtml(card.title) + '"><div class="wc-revenue-card-head"><div class="wc-revenue-card-head-main"><strong>' + escapeHtml(card.title) + '</strong><b class="wc-revenue-card-amount">' + escapeHtml(compactCurrency(card.amount)) + '</b><small class="wc-revenue-card-share">' + scope + '</small></div>' +
          (card.badge ? '<div class="wc-revenue-card-badge-stack"><span class="wc-personnel-dept-fte-badge">' + escapeHtml(card.badge) + '</span></div>' : '') +
          '</div></a>';
      }).join("");
      modalBody.innerHTML = '<section class="wc-department-explorer"><div class="wc-department-explorer-head"><div><h2>Capital Budget</h2><p>Find a capital project or choose a ledger to explore infrastructure, facilities, machinery, and equipment. Ledgers can cover overlapping scopes, so their totals should not be added together.</p>' +
          '<div class="wc-capital-head-tools">' +
          '<div class="wc-home-search-input-wrap wc-capital-head-search">' +
            '<form class="wc-home-search-form" data-capital-project-search-form role="search" aria-label="Search capital projects">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6.15 6.15a7.5 7.5 0 0 0 10.5 10.5Z"></path></svg>' +
              '<label class="wc-sr-only" for="wcCapitalProjectSearchInput">Search capital projects</label>' +
              '<input id="wcCapitalProjectSearchInput" name="q" type="search" placeholder="Search capital projects by name, department, or fund" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="wcCapitalSearchDropdown" aria-autocomplete="list">' +
              '<button type="submit">Search</button>' +
            '</form>' +
            '<div id="wcCapitalSearchDropdown" class="wc-home-search-dropdown" role="listbox" aria-label="Matching capital projects" hidden></div>' +
          '</div>' +
          '<button type="button" class="wc-capital-about-button" data-capital-about-open>About capital projects</button>' +
          '</div></div><aside class="wc-revenue-total-budget"><div class="wc-revenue-total-primary"><span>County capital outlay</span><strong>' + escapeHtml(formatCurrency(total)) + '</strong><small class="wc-revenue-total-change ' + (total >= prior ? 'is-increase' : 'is-decrease') + '">' + (total >= prior ? "+" : "−") + escapeHtml(compactCurrency(Math.abs(total - prior))) + '</small></div></aside></div>' +
        '<div class="wc-department-budget-cards">' + cardHtml + '</div>' +
        '<section class="wc-capital-search-results" data-capital-search-results hidden>' +
          '<div class="wc-capital-search-results-head"><h3 data-capital-search-results-title>Search results</h3><button type="button" class="wc-capital-search-clear" data-capital-search-clear>Clear search</button></div>' +
          '<div class="wc-department-budget-cards" data-capital-search-results-list></div>' +
        '</section></section>';
      // "About capital projects" opens in the centered info popup (the same
      // dialog as the office picker and asset record) instead of expanding
      // in place.
      var capitalAboutButton = modalBody.querySelector('[data-capital-about-open]');
      if (capitalAboutButton) {
        capitalAboutButton.addEventListener('click', function () {
          if (window.WCBudgetData && typeof window.WCBudgetData.openInfoPopupPage === 'function') {
            window.WCBudgetData.openInfoPopupPage('pages/capital-improvement-plan.html', 'About Capital Projects', 'Capital Budget', capitalAboutButton);
          }
        });
      }
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
      modalBody.innerHTML = '<section class="wc-department-explorer wc-independent-agencies-explorer"><div class="wc-department-explorer-head"><div><h2>Other Agencies and Court-Related Functions Budget</h2><p>Walton County budgets a combined ' + escapeHtml(compactCurrency(total)) + ' across ' + items.length + ' independent and autonomous entities' + (totalFte ? ', employing ' + escapeHtml(totalFte) + ' FTE' : '') + '. Select an entity to review its budget, staffing, and service information.</p><p class="wc-revenue-concentration-summary"><strong>' + (countywide ? Math.round(total / countywide * 100) : 0) + '%</strong> of the total expenditure budget is independent agency funding.</p></div><aside class="wc-revenue-total-budget"><div class="wc-revenue-total-primary"><span>Total Independent Agencies Budget</span><strong>' + escapeHtml(formatCurrency(total)) + '</strong><small class="wc-revenue-total-change ' + (change > 0 ? 'is-increase' : change < 0 ? 'is-decrease' : '') + '">' + (change >= 0 ? "+" : "−") + escapeHtml(compactCurrency(Math.abs(change))) + ' (' + (pct === null ? 'No FY 2026 base' : (pct >= 0 ? "+" : "−") + Math.abs(pct).toFixed(1) + '%') + ')</small><div class="wc-revenue-view-actions"><a class="wc-revenue-ledger-trigger wc-ledger-card-button" href="pages/independent-agencies-ledger.html" data-explorer-popup-trigger="Other Agencies and Court-Related Functions Ledger">View Other Agencies Ledger</a></div></div></aside></div><div class="wc-department-budget-cards">' + cards + '</div></section>';
    }).catch(function () {
      modalBody.innerHTML = '<div class="wc-data-error">Independent agency data could not be loaded.</div>';
    });
  }

  function renderExplorer(type) {
    loading();
    if (!window.WCBudgetData) return;
    if (type === "revenue") {
      modalBody.innerHTML = '<section id="revenue-source-concentration" aria-label="Revenue Budget Explorer"></section><section id="revenue-peer-comparison" class="wc-revenue-peer-section" hidden aria-labelledby="revenue-peer-title"><button type="button" class="wc-revenue-peer-close">Close Revenue Comparison</button><div class="wc-revenue-peer-card"><div class="wc-revenue-peer-head"><div><span>Florida peer benchmark</span><h2 id="revenue-peer-title">How does Walton County compare?</h2><p>FY 2024 actual county-government revenue per resident provides a consistent comparison across regional and tourism-oriented peers.</p></div><label>Compare by<select id="revenue-peer-metric"></select></label></div><div class="wc-revenue-peer-chart-wrap"><canvas id="revenue-peer-chart"></canvas></div><div id="revenue-peer-insight" class="wc-revenue-peer-insight" aria-live="polite"></div><p class="wc-revenue-peer-source">Source: Florida Office of Economic and Demographic Research, FY 2024 county Annual Financial Report data.</p></div></section><section id="revenue-budget-questions" hidden></section>';
      var revenueMount = modalBody.querySelector('#revenue-source-concentration');
      loadExplorerCharts().catch(function(error){ console.warn(error.message); }).then(function(){
        if(!modal.hidden && revenueMount.isConnected) window.WCBudgetData.renderRevenueBudgetQuestions();
      });
    } else if (type === "personnel") {
      modalBody.innerHTML = '<section id="personnel-explorer" aria-label="Workforce Budget Explorer"></section><section id="personnel-budget-questions" hidden></section>';
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

  function updateDepartmentBackButton() {
    if (!departmentModal) return;
    var button = departmentModal.querySelector('[data-department-popup-back]');
    var previous = departmentNavigationStack[departmentNavigationStack.length - 1] || departmentReturnTo;
    var labels = { departments:'Departments', constitutional:'Constitutional Officers', capital:'Capital Budget', independent:'Other Agencies and Court-Related Functions', personnel:'Workforce Budget', revenue:'Revenue Budget' };
    var label = previous ? previous.title : (modal && !modal.hidden ? labels[activeExplorerType] : '') || 'Budget explorer';
    button.hidden = departmentModal.classList.contains('is-budget-book');
    button.textContent = '\u2190 Back';
    button.title = 'Back to ' + label;
    button.setAttribute('aria-label', 'Back to ' + label);
  }

  function ensureDepartmentModal() {
    if (departmentModal) return departmentModal;
    departmentModal = document.createElement("div");
    departmentModal.className = "wc-home-department-modal";
    departmentModal.hidden = true;
    departmentModal.setAttribute("role", "dialog");
    departmentModal.setAttribute("aria-modal", "true");
    departmentModal.setAttribute("aria-labelledby", "wcHomeDepartmentModalTitle");
    departmentModal.innerHTML = '<video class="wc-home-department-modal-wave" muted loop playsinline preload="none" aria-hidden="true"><source data-src="assets/images/page-images/grok-video-a964bba7-boomerang-loop.mp4" type="video/mp4"></video>' +
      // The backdrop (over the background video) is not a close control:
      // a stray click there should not drop the reader back to the main
      // popup. The X button and Escape still close the department popup.
      '<div class="wc-home-department-modal-backdrop" aria-hidden="true"></div>' +
      '<section class="wc-home-department-modal-panel">' +
        '<header class="wc-home-department-modal-head wc-popup-header">' +
        '<button type="button" class="wc-home-department-modal-back" data-department-popup-back hidden>&larr; Back</button>' +
        '<span class="wc-home-department-modal-seal wc-seal-mark" aria-hidden="true"></span>' +
        // The page shows its own large title, so the header names the
        // section the page belongs to; the page title stays in the h2
        // (screen readers, Back labels) but is visually hidden.
        '<div class="wc-home-department-modal-context" aria-hidden="true"><strong data-department-popup-section></strong><span>Walton County FY 2027 Budget</span></div>' +
        '<h2 id="wcHomeDepartmentModalTitle" class="wc-sr-only">Code Compliance</h2>' +
        '<div class="wc-nav-search-bar-wrap"><form class="wc-nav-search-bar-form" role="search" aria-label="Search the Budget"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6.15 6.15a7.5 7.5 0 0 0 10.5 10.5Z"></path></svg><label class="wc-sr-only" for="wcDepartmentModalSearch">Search the Walton County budget</label><input id="wcDepartmentModalSearch" type="search" placeholder="Search the budget site" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="wcDepartmentModalSearchDropdown" aria-autocomplete="list"><button type="submit">Search</button></form><div id="wcDepartmentModalSearchDropdown" class="wc-nav-search-bar-dropdown" role="listbox" aria-label="Search suggestions" hidden></div></div>' +
        '<button type="button" class="wc-home-department-modal-close" data-department-popup-close aria-label="Close Code Compliance">&times;</button></header>' +
        '<iframe class="wc-home-department-modal-frame" aria-label="Code Compliance department page" allow="fullscreen" allowfullscreen></iframe>' +
      '</section>';
    document.body.appendChild(departmentModal);
    if (window.WCBudgetNav && typeof window.WCBudgetNav.initNavSearchBar === "function") {
      window.WCBudgetNav.initNavSearchBar(departmentModal.querySelector(".wc-nav-search-bar-wrap"));
    }
    departmentFrame = departmentModal.querySelector("iframe");
    departmentModal.querySelector("[data-department-popup-back]").addEventListener("click", function () {
      var target = departmentNavigationStack.pop();
      // A page opened from an Info Popup (e.g. TRIM ads from Supporting
      // Documentation) goes back by reopening that Info Popup.
      if (!target && departmentReturnTo && typeof departmentReturnTo.reopen === "function") {
        var reopen = departmentReturnTo.reopen;
        closeDepartmentModal();
        reopen();
        return;
      }
      if (!target) {
        // A scripted iframe navigation can bypass the link listener that
        // records an explicit return target. Closing is safer than sending
        // the iframe into its initial blank history entry.
        // An office opened from a "Choose an office" picker goes back to the
        // department list, so close that picker along with this popup.
        var officePicker = departmentTrigger && departmentTrigger.closest ? departmentTrigger.closest(".wc-budget-detail-modal") : null;
        dismissDepartmentModal();
        var officePickerClose = officePicker && !officePicker.hidden ? officePicker.querySelector("[data-budget-detail-close]") : null;
        if (officePickerClose) officePickerClose.click();
        return;
      }
      var targetUrl = new URL(target.href, window.location.href);
      targetUrl.searchParams.set("embed", "department-popup");
      departmentModal.querySelector("#wcHomeDepartmentModalTitle").textContent = target.title;
      departmentModal.querySelector(".wc-home-department-modal-close").setAttribute("aria-label", "Close " + target.title);
      departmentFrame.setAttribute("aria-label", target.title + " budget page");
      updateDepartmentBackButton();
      departmentModal.classList.add("is-loading");
      departmentModalOpenedAt = Date.now();
      departmentFrameAwaitingInitialLoad = true;
      if (departmentPanelResizeObserver) {
        departmentPanelResizeObserver.disconnect();
        departmentPanelResizeObserver = null;
      }
      syncDepartmentSeal(targetUrl);
      departmentFrame.src = targetUrl.href;
      syncPopupUrlState(targetUrl);
    });
    departmentFrame.addEventListener("load", function () {
      try {
        var loadedUrl = new URL(departmentFrame.contentWindow.location.href);
        if (loadedUrl.protocol !== "about:") syncDepartmentSeal(loadedUrl);
      } catch (sealError) {}
      syncDepartmentSection();
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
      // closeDepartmentModal() blanks this iframe's src to tear it down,
      // which still fires this same 'load' event a moment later -- without
      // this guard, that fires the follow-on-navigation branch below (wrong
      // title, and syncPopupUrlState writing a bogus "?popup=blank" over
      // the removal closeDepartmentModal just made).
      if (departmentFrame.src === "about:blank" || departmentModal.hidden) return;
        var isFollowOnNavigation = !departmentFrameAwaitingInitialLoad;
        departmentFrameAwaitingInitialLoad = false;
      try {
        var embeddedDocument = departmentFrame.contentDocument;
        var isTransactionDetail = /\/transactions\.html$/i.test(embeddedDocument.location.pathname);
        departmentModal.classList.toggle('is-transaction-detail', isTransactionDetail);
        if (isTransactionDetail) departmentModal.querySelector('#wcHomeDepartmentModalTitle').textContent = 'Transactions';
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
            '#content{width:min(1380px,100%)!important;max-width:none!important;margin:0 auto!important;padding:30px 28px 28px!important}' +
            '#content.wc-transaction-page{padding-top:16px!important}' +
            // Every page shows its own eyebrow and large title (the site
            // heading standard); only its in-page back link is hidden, since
            // the popup header has its own Back button.
            '#content>.wc-page-title-row>.wc-asset-back{display:none!important}' +
            '.wc-budget-process-back{display:none!important}' +
            '[data-constitutional-ledger-close]{display:none!important}' +
            '.wc-dept-function-services--with-video>.wc-dept-supporting-media{margin-top:-34px!important}');
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
            departmentFrame.setAttribute("aria-label", derivedTitle + " budget page");
          }
          // A same-iframe link click (handled below, or a plain in-page
          // link this handler doesn't specially intercept) lands here too.
          // Follow-on links normally record an explicit return target in
          // departmentNavigationStack. Show the shared Back control for
          // those pages instead of relying on the iframe's browser history.
          updateDepartmentBackButton();
          // Keep the address bar's ?popup= in sync with wherever this
          // in-popup navigation actually landed, so a refresh reopens here
          // rather than back at the page this popup originally opened to.
          if (loadedUrl) syncPopupUrlState(loadedUrl);
        }
        // Any link inside this popup that points back at index.html (the
        // CIP hero's "Back to Capital Projects"/"Search Projects", a
        // project's "Back to Project Search"/"Back to Capital Explorer",
        // etc.) would otherwise navigate this iframe TO index.html -- which
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
          // The header's Ledger Directory return control belongs only to
          // pages reached by selecting a ledger inside that directory. A
          // ledger opened from an explorer, search result, direct URL, or
          // another page must not inherit the control merely because its
          // filename also happens to be listed in the directory.
          var currentEmbeddedFilename = "";
          try { currentEmbeddedFilename = new URL(embeddedDocument.location.href).pathname.split("/").pop(); }
          catch (currentEmbeddedUrlError) {}
          var resolvedFilename = resolvedUrl.pathname.split("/").pop();
          openedFromLedgerDirectory = currentEmbeddedFilename === "budget-overview.html" && LEDGER_DIRECTORY_PAGES.has(resolvedFilename);
          if (/\/(?:transaction-search|glossary-acronyms-and-frequently-asked-questions|accessibility|privacy)\.html$/i.test(resolvedUrl.pathname)) {
            event.preventDefault();
            var returnTo = departmentReturnTo;
            if (!returnTo) {
              var returnUrl = new URL(embeddedDocument.location.href);
              returnUrl.searchParams.delete("embed");
              returnTo = { href: returnUrl.href, title: departmentModal.querySelector("#wcHomeDepartmentModalTitle").textContent };
            }
            var utilityTitle = link.querySelector('strong');
            openDepartmentModal(resolvedUrl.href, utilityTitle ? utilityTitle.textContent.trim() : link.textContent.trim(), departmentTrigger, returnTo);
            return;
          }
          // The budget book supplies its own transparent, chromeless layout
          // (see isBudgetBook above), which only gets applied when the popup
          // is opened fresh through openDepartmentModal -- a plain in-page
          // link to it (e.g. a "View in Print Budget" reference from a
          // supporting-documentation card) would otherwise just navigate
          // this iframe directly, landing on budget-book.html without its
          // ?embed=department-popup flag and showing that page's full
          // standalone header/controls nested inside this popup's own.
          if (/\/budget-book\.html$/i.test(resolvedUrl.pathname)) {
            event.preventDefault();
            openDepartmentModal(resolvedUrl.href, "Full Budget Document", departmentTrigger);
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
          // Only this site's own index/search pages close the popup; an
          // outside link whose path also ends in index.html (the county
          // ArcGIS map app) must open normally in its new tab.
          if (resolvedUrl.origin !== window.location.origin || !/\/(search|index)\.html$/i.test(resolvedUrl.pathname)) {
            // Ordinary same-site links navigate this iframe directly. Hide
            // it before navigation so the destination's legacy nav cannot
            // flash for a frame while the load handler installs the popup-
            // only chrome rules. External, new-tab, download, and same-page
            // anchor links keep their normal behavior.
            var currentEmbeddedUrl;
            try { currentEmbeddedUrl = new URL(embeddedDocument.location.href); }
            catch (currentUrlError) { currentEmbeddedUrl = null; }
            var isSamePageAnchor = currentEmbeddedUrl && resolvedUrl.pathname === currentEmbeddedUrl.pathname && resolvedUrl.search === currentEmbeddedUrl.search && resolvedUrl.hash;
            if (resolvedUrl.origin === window.location.origin && /\.html$/i.test(resolvedUrl.pathname) && !isSamePageAnchor && !link.hasAttribute("download") && (!link.target || link.target === "_self")) {
              var currentReturnUrl = currentEmbeddedUrl ? new URL(currentEmbeddedUrl.href) : null;
              if (currentReturnUrl) currentReturnUrl.searchParams.delete("embed");
              // A link to a page already in the Back history (an in-page
              // "Back to ..." link) rewinds to it instead of stacking, so
              // the popup's Back never cycles through earlier pages again.
              var destinationKey = new URL(resolvedUrl.href);
              destinationKey.searchParams.delete("embed");
              destinationKey.hash = "";
              var existingIndex = -1;
              departmentNavigationStack.forEach(function (entry, index) {
                try {
                  var entryUrl = new URL(entry.href, window.location.href);
                  entryUrl.searchParams.delete("embed");
                  entryUrl.hash = "";
                  if (entryUrl.pathname === destinationKey.pathname && entryUrl.search === destinationKey.search) existingIndex = index;
                } catch (entryError) {}
              });
              if (existingIndex !== -1) {
                departmentNavigationStack.length = existingIndex;
              } else {
                departmentNavigationStack.push({
                  href: currentReturnUrl ? currentReturnUrl.href : embeddedDocument.location.href,
                  title: departmentModal.querySelector("#wcHomeDepartmentModalTitle").textContent || "Budget Page"
                });
              }
              updateDepartmentBackButton();
              departmentModal.classList.add("is-loading");
              var navigatingPanel = departmentModal.querySelector(".wc-home-department-modal-panel");
              if (navigatingPanel) navigatingPanel.style.height = popupRevealDelay() ? "360px" : "";
              departmentModalOpenedAt = Date.now();
              if (departmentPanelResizeObserver) {
                departmentPanelResizeObserver.disconnect();
                departmentPanelResizeObserver = null;
              }
            }
            return;
          }
          event.preventDefault();
          var linkedExplorerType = resolvedUrl.searchParams.get("explorer");
          if (linkedExplorerType && EXPLORERS[linkedExplorerType]) {
            var explorerReturnTrigger = departmentTrigger;
            closeDepartmentModal();
            openModal(linkedExplorerType, explorerReturnTrigger);
            return;
          }
          closeDepartmentModal();
        }, true);
      } catch (error) {
        // The query-string class in the embedded page remains the fallback.
      }
      if (!departmentModal.hidden) {
        var isUtilityOrBookLoad = departmentModal.classList.contains("is-utility-page") || departmentModal.classList.contains("is-budget-book");
        // Keep the "Loading budget page…" overlay up for the same minimum
        // reveal window as the height grow (see popupRevealDelay()) so the
        // content reveal and the size grow happen together as one motion,
        // rather than the real (still small, internally-scrolled) page
        // flashing into view before the box has grown to show it properly.
        // The frame's load event can fire before the page has finished
        // building itself from the budget data (tabs, ledgers), so also
        // wait for its content to settle before revealing it.
        var revealLoadedPage = function () {
          var loadingRemoveDelay = isUtilityOrBookLoad ? 0 : Math.max(0, popupRevealDelay() - (Date.now() - departmentModalOpenedAt));
          window.setTimeout(function () {
            window.requestAnimationFrame(function () { departmentModal.classList.remove("is-loading"); });
          }, loadingRemoveDelay);
        };
        if (isUtilityOrBookLoad) revealLoadedPage();
        else waitForFrameToSettle(departmentFrame, revealLoadedPage);
      }
      if (departmentPanelResizeObserver) {
        departmentPanelResizeObserver.disconnect();
        departmentPanelResizeObserver = null;
      }
      departmentPanelResizeObserver = watchIframePopupHeight(departmentFrame, updateDepartmentModalHeight);
      // Loading the nested page can return focus to this document's body
      // after the opener has already focused the Close button. Restore it
      // only when focus has fallen out of the dialog, never over a user's
      // deliberate move to another control or into the embedded page.
      window.setTimeout(function () {
        if (departmentModal.hidden || (document.activeElement !== document.body && document.activeElement !== document.documentElement)) return;
        if (departmentModal.classList.contains("is-budget-book")) departmentFrame.focus({ preventScroll: true });
        else departmentModal.querySelector(".wc-home-department-modal-close").focus({ preventScroll: true });
      }, 1200);
    });
    departmentModal.addEventListener("click", function (event) {
      if (event.target.closest("[data-department-popup-close]")) dismissDepartmentModal();
    });
    return departmentModal;
  }

  var UTILITY_POPUP_PAGE_PATTERN = /\/(accessibility|privacy|transaction-search|glossary-acronyms-and-frequently-asked-questions|supporting-budget-documentation)\.html$/i;

  // Keeps the homepage's own address bar's ?popup= param pointed at whatever
  // page this popup is currently showing, so refreshing the browser (or
  // sharing/bookmarking the link) reopens the same popup on the same page
  // instead of landing back on the plain homepage. Called both when a popup
  // is first opened and again on every same-iframe follow-on navigation
  // inside it, including an explicit return through the popup Back button.
  function syncPopupUrlState(targetUrl) {
    try {
      var query = new URLSearchParams(targetUrl.search);
      query.delete("embed");
      var queryString = query.toString();
      var popupValue = targetUrl.pathname.replace(/^.*(\/pages\/)/, "$1").replace(/^\//, "") + (queryString ? "?" + queryString : "");
      var stateUrl = new URL(window.location.href);
      stateUrl.searchParams.set("popup", popupValue);
      history.replaceState(history.state, "", stateUrl.href);
    } catch (error) {}
  }

  // Every budget page opened in this popup carries the county seal beside
  // its title; utility pages (Glossary, Privacy, ...) and the page-turn
  // budget book do not.
  function syncDepartmentSeal(url) {
    if (!departmentModal) return;
    var path = String(url && url.pathname || "");
    var showSeal = !!path && !UTILITY_POPUP_PAGE_PATTERN.test(path) && !/\/budget-book\.html$/i.test(path);
    departmentModal.classList.toggle("is-board-department", showSeal);
  }

  // Header label: the loaded page's own section eyebrow (e.g. "Departments",
  // "Financial Overview"), falling back to the page list's section.
  function syncDepartmentSection() {
    if (!departmentModal) return;
    var label = departmentModal.querySelector("[data-department-popup-section]");
    if (!label) return;
    var section = "";
    try {
      var doc = departmentFrame.contentDocument;
      var eyebrow = doc && doc.querySelector("#content .page-eyebrow");
      section = eyebrow ? eyebrow.textContent.trim() : "";
      if (!section && doc) {
        var file = doc.location.pathname.split("/").pop();
        var page = (window.wcBudgetPages || []).find(function (item) {
          try { return new URL(item.href, window.location.href).pathname.split("/").pop() === file; } catch (e) { return false; }
        });
        section = page ? page.section : "";
      }
    } catch (error) {}
    label.textContent = section || "Budget";
  }

  // Phones get plain pages instead of popups (same rule as nav.js).
  function isMobilePages() {
    try { return window.top === window.self && window.matchMedia("(max-width: 760px)").matches; }
    catch (error) { return false; }
  }

  function goToPage(href) {
    var target = new URL(href, window.location.href);
    target.searchParams.delete("embed");
    window.location.href = target.href;
  }

  function openDepartmentModal(href, title, trigger, returnTo) {
    if (isMobilePages()) { goToPage(href); return; }
    // A native modal <dialog> (e.g. a Revenue explorer source popup) sits in
    // the browser's top layer and makes everything beneath it inert, so a
    // page popup opened from a link inside it would be unreachable. Close
    // it first; the page popup then opens over the explorer as usual.
    Array.prototype.forEach.call(document.querySelectorAll("dialog[open]"), function (openDialog) {
      if (typeof openDialog.close === "function") openDialog.close();
    });
    ensureDepartmentModal();
    departmentNavigationStack = [];
    departmentTrigger = trigger;
    departmentReturnTo = returnTo || null;
    var openedWithoutExplorer = modal.hidden;
    var url = new URL(href, window.location.href);
    // Every explicit popup open begins a new navigation path. Only a later
    // click made from inside budget-overview.html can opt into the return
    // button for the resulting ledger page.
    openedFromLedgerDirectory = false;
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
      var playPromise = playBackgroundVideo(waveVideo);
      if (playPromise && typeof playPromise.catch === "function") playPromise.catch(function () {});
    }
    departmentModal.querySelector("#wcHomeDepartmentModalTitle").textContent = departmentTitle;
    departmentModal.querySelector(".wc-home-department-modal-close").setAttribute("aria-label", "Close " + departmentTitle);
    updateDepartmentBackButton();
    departmentFrame.setAttribute("aria-label", departmentTitle + " budget page");
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
    // like Budget Adjustments naturally gets. See the matching
    // popupRevealDelay() gate in updateDepartmentModalHeight.
    var panelToReset = departmentModal.querySelector(".wc-home-department-modal-panel");
    if (panelToReset && popupRevealDelay() && !isUtilityPage && !isBudgetBook) panelToReset.style.height = "360px";
    else if (panelToReset) panelToReset.style.height = "";
    departmentModalOpenedAt = Date.now();
    departmentFrameAwaitingInitialLoad = true;
    syncDepartmentSeal(url);
    departmentFrame.src = url.href;
    syncPopupUrlState(url);
    departmentModal.hidden = false;
    // A detail popup open underneath (e.g. a "Choose an office" picker)
    // marks the rest of the page inert, including this popup while it was
    // hidden; it opens on top, so it must stay interactive.
    departmentModal.inert = false;
    modal.inert = true;
    modal.classList.add("is-department-popup-open");
    // The budget book hides this popup's own header (it supplies its own
    // close control), so the header's close button isn't focusable there.
    if (isBudgetBook) departmentFrame.focus();
    else departmentModal.querySelector(".wc-home-department-modal-close").focus();
  }

  // The popup's own close controls (X, Escape): step back to the
  // page a utility page was opened from when there is one, otherwise close.
  function dismissDepartmentModal() {
    if (departmentReturnTo && departmentModal && !departmentModal.hidden && typeof departmentReturnTo.reopen !== "function") {
      var returnTo = departmentReturnTo;
      openDepartmentModal(returnTo.href, returnTo.title, departmentTrigger);
      return;
    }
    closeDepartmentModal();
  }

  function closeDepartmentModal() {
    if (!departmentModal || departmentModal.hidden) return;
    departmentModal.classList.remove("is-detail-open", "is-detail-layer");
    var fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
    if (fullscreenElement === departmentModal) {
      var exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
      if (exitFullscreen) {
        var exitPromise = exitFullscreen.call(document);
        if (exitPromise && typeof exitPromise.catch === "function") exitPromise.catch(function () {});
      }
    }
    departmentReturnTo = null;
    departmentNavigationStack = [];
    var openedWithoutExplorer = departmentModal.dataset.standalone === "true";
    departmentModal.hidden = true;
    if(modal) modal.inert = false;
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
    openedFromLedgerDirectory = false;
    modal.classList.remove("is-department-popup-open");
    // Drop ?popup= now that nothing is open -- otherwise a refresh right
    // after closing would reopen the popup the user just dismissed.
    try {
      var stateUrlAfterClose = new URL(window.location.href);
      if (stateUrlAfterClose.searchParams.has("popup")) {
        stateUrlAfterClose.searchParams.delete("popup");
        history.replaceState(history.state, "", stateUrlAfterClose.href);
      }
    } catch (error) {}
    if (!openedWithoutExplorer) {
      var explorerWave = modal.querySelector(".wc-home-explorer-modal-wave");
      if (explorerWave) {
        var playPromise = playBackgroundVideo(explorerWave);
        if (playPromise && typeof playPromise.catch === "function") playPromise.catch(function () {});
      }
    }
    departmentModal.removeAttribute("data-standalone");
    if (openedWithoutExplorer) unlockBackgroundPage();
    if (departmentTrigger && document.contains(departmentTrigger)) departmentTrigger.focus();
    departmentTrigger = null;
  }

  // The explorer popup's own close controls (X, Escape): when a
  // footer page (Glossary & FAQ, Accessibility, ...) is showing, go back to
  // the explorer it was opened from instead of closing the whole popup.
  function dismissModal() {
    if (isMobilePages() && modal && !modal.hidden) {
      window.location.href = window.location.pathname;
      return;
    }
    if (modal && !modal.hidden && modal.classList.contains("is-utility-page") && EXPLORERS[activeExplorerType]) {
      openModal(activeExplorerType, activeCard);
      return;
    }
    closeModal();
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    closeDepartmentModal();
    modal.hidden = true;
    modal.classList.remove("is-utility-page");
    modal.classList.remove("is-loading");
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
    activeExplorerType = type;
    modal.classList.remove("is-utility-page");
    // The Capital Budget explorer has its own project search under its
    // intro, so its header doesn't also show the general budget search.
    modal.classList.toggle("is-capital-explorer", type === "capital");
    var panelToUnsize = modal.querySelector(".wc-home-explorer-modal-panel");
    if (panelToUnsize) panelToUnsize.style.height = "";
    if (explorerUtilityPanelResizeObserver) {
      explorerUtilityPanelResizeObserver.disconnect();
      explorerUtilityPanelResizeObserver = null;
    }
    modalTitle.textContent = config.title;
    modal.querySelector(".wc-home-explorer-modal-close").setAttribute("aria-label", "Close explorer");
    modal.hidden = false;
    document.documentElement.classList.toggle("wc-mobile-explorer-view", isMobilePages());
    if (isMobilePages()) window.scrollTo(0, 0);
    lockBackgroundPage();
    // The panel now sizes to its own content instead of always filling the
    // viewport, so content scrolls inside modalBody rather than the outer
    // modal -- reset that instead of the (no longer scrollable) outer element.
    if (modalBody) modalBody.scrollTop = 0;
    var explorerWave = modal.querySelector(".wc-home-explorer-modal-wave");
    if (explorerWave) {
      explorerWave.defaultPlaybackRate = 0.25;
      explorerWave.playbackRate = 0.25;
      var playPromise = playBackgroundVideo(explorerWave);
      if (playPromise && typeof playPromise.catch === "function") playPromise.catch(function () {});
    }
    if (!isMobilePages()) modal.querySelector(".wc-home-explorer-modal-close").focus();
    // Open small and grow -- the same deliberate reveal the department/
    // org-chart/GFOA-award popups use (see popupRevealDelay()), so every
    // popup in the explorer reads as one consistent motion instead of the
    // big summary explorers (Department Budget, Constitutional Officers
    // Budget, etc.) snapping straight to full height.
    modal.classList.add("is-loading");
    explorerModalOpenedAt = Date.now();
    var openedAt = explorerModalOpenedAt;
    renderExplorer(type);
    window.setTimeout(function () {
      if (modal.hidden || explorerModalOpenedAt !== openedAt) return;
      window.requestAnimationFrame(function () { modal.classList.remove("is-loading"); });
    }, popupRevealDelay());
  }

  function init() {
    modal = document.createElement("div");
    modal.className = "wc-home-explorer-modal";
    modal.hidden = true;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "wcHomeExplorerModalTitle");
    modal.innerHTML = '<video class="wc-home-explorer-modal-wave" muted loop playsinline preload="none" aria-hidden="true"><source data-src="assets/images/page-images/grok-video-a964bba7-boomerang-loop.mp4" type="video/mp4"></video>' +
      '<div class="wc-home-explorer-modal-backdrop" aria-hidden="true"></div>' +
      '<div class="wc-home-explorer-modal-panel"><header class="wc-home-explorer-modal-head wc-popup-header"><div class="wc-home-explorer-modal-heading"><span class="wc-home-explorer-modal-seal wc-seal-mark" aria-hidden="true"></span><h2 id="wcHomeExplorerModalTitle"></h2></div>' +
        '<div class="wc-nav-search-bar-wrap"><form class="wc-nav-search-bar-form" role="search" aria-label="Search the Budget"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6.15 6.15a7.5 7.5 0 0 0 10.5 10.5Z"></path></svg><label class="wc-sr-only" for="wcExplorerModalSearch">Search the Walton County budget</label><input id="wcExplorerModalSearch" type="search" placeholder="Search the budget site" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="wcExplorerModalSearchDropdown" aria-autocomplete="list"><button type="submit">Search</button></form><div id="wcExplorerModalSearchDropdown" class="wc-nav-search-bar-dropdown" role="listbox" aria-label="Search suggestions" hidden></div></div>' +
        '<button type="button" class="wc-home-explorer-modal-close" aria-label="Close explorer">&times;</button></header><div class="wc-home-explorer-modal-body"></div>' +
      '<footer class="wc-home-explorer-modal-footer"><details class="wc-explorer-more-info" open><summary>More information</summary><nav aria-label="Explorer footer links"><button type="button" data-explorer-footer-action="glossary">Glossary &amp; FAQ</button><button type="button" data-explorer-footer-action="documentation">Supporting Documentation</button><button type="button" data-explorer-footer-action="transactions">Transaction Search</button><button type="button" data-explorer-footer-action="accessibility">Accessibility</button><button type="button" data-explorer-footer-action="privacy">Privacy</button></nav></details></footer></div>';
    document.body.appendChild(modal);
    var footerDisclosure = modal.querySelector('.wc-explorer-more-info');
    var phoneLayout = window.matchMedia('(max-width:700px)');
    function syncFooterDisclosure(){ footerDisclosure.open = !phoneLayout.matches; }
    syncFooterDisclosure();
    phoneLayout.addEventListener('change', syncFooterDisclosure);

    modalBody = modal.querySelector(".wc-home-explorer-modal-body");
    modalTitle = modal.querySelector("#wcHomeExplorerModalTitle");
    if (window.WCBudgetNav && typeof window.WCBudgetNav.initNavSearchBar === "function") {
      window.WCBudgetNav.initNavSearchBar(modal.querySelector(".wc-nav-search-bar-wrap"));
    }

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
      // Board department cards open their Info Popup (budget-data.js); the
      // full page opens from that popup's own button.
      if (link.hasAttribute("data-dept-info-card")) return;
      var inDepartmentExplorer = modalBody.contains(link) && link.closest(".wc-department-budget-cards");
      var inOfficePicker = link.closest(".wc-budget-detail-modal .wc-department-office-picker-list");
      var inSearchResults = link.closest(".wc-home-search-result,.wc-nav-search-result,.wc-nav-search-bar-result");
      if(inSearchResults && window.WaltonBudgetGlobalSearch) window.WaltonBudgetGlobalSearch.close();
      if(inSearchResults && /\/pages\/[^/]+\.html$/.test(new URL(link.href, window.location.href).pathname)){
        event.preventDefault();
        openDepartmentModal(link.href, (link.querySelector("strong") || link).textContent.trim(), link);
        return;
      }
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
      // A single-office link (e.g. tourism-administration.html?office=marketing)
      // is titled by the office named on the link rather than the whole page.
      if (url.searchParams.get("office") && link.textContent.trim()) departmentTitle = link.textContent.trim();
      openDepartmentModal(departmentHref.href, departmentTitle, link);
    }, true);
    modal.querySelector(".wc-home-explorer-modal-close").addEventListener("click", dismissModal);
    modal.querySelector(".wc-home-explorer-modal-footer").addEventListener("click", function (event) {
      var actionButton = event.target.closest("[data-explorer-footer-action]");
      if (!actionButton) return;
      var action = actionButton.dataset.explorerFooterAction;
      var pageAction = {
        glossary: { href: "pages/glossary-acronyms-and-frequently-asked-questions.html", title: "Glossary, Acronyms & FAQ" },
        documentation: { href: "pages/supporting-budget-documentation.html", title: "Supporting Budget Documentation" },
        transactions: { href: "pages/transaction-search.html", title: "Transaction Search" },
        accessibility: { href: "pages/accessibility.html", title: "Accessibility Statement" },
        privacy: { href: "pages/privacy.html", title: "Privacy Statement" }
      }[action];
      if (pageAction && isMobilePages()) { goToPage(pageAction.href); return; }
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
        modalBody.innerHTML = '<iframe class="wc-home-explorer-utility-frame" aria-label="' + escapeHtml(pageAction.title) + '"></iframe>';
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
      }
    });
    document.addEventListener("keydown", function (event) {
      if (modal.hidden && (!departmentModal || departmentModal.hidden)) return;
      var nestedDialog = modal.querySelector("dialog[open]");
      if (event.key === "Escape") {
        if (departmentModal && !departmentModal.hidden) {
          dismissDepartmentModal();
          return;
        }
        if (nestedDialog) return;
        dismissModal();
        return;
      }
      if (departmentModal && !departmentModal.hidden && event.key === "Tab") {
        var popupFocusable = Array.prototype.slice.call(departmentModal.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),iframe,[tabindex]:not([tabindex="-1"])'))
          .filter(function (element) { return !element.hidden && !element.closest('[hidden],[inert]') && element.getClientRects().length > 0; });
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
        if (isMobilePages()) return;
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
    var requestedPopup = "";
    try { requestedPopup = new URLSearchParams(window.location.search).get("popup") || ""; } catch (error) { requestedPopup = ""; }
    if (requestedPopup) {
      try {
        var popupUrl = new URL(requestedPopup, window.location.href);
        var isLocalPopupPage = popupUrl.origin === window.location.origin && /\/pages\/[^/]+\.html$/i.test(popupUrl.pathname);
        if (isLocalPopupPage) {
          var popupFilename = popupUrl.pathname.split("/").pop();
          var popupCatalogItem = (window.wcBudgetPages || []).find(function (item) {
            try { return new URL(item.href, window.location.href).pathname.split("/").pop() === popupFilename; }
            catch (error) { return false; }
          });
          var popupTitle = popupCatalogItem && popupCatalogItem.title
            ? popupCatalogItem.title
            : popupFilename.replace(/\.html$/i, "").replace(/-/g, " ").replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
          openDepartmentModal(popupUrl.href, popupTitle, document.body);
        }
      } catch (error) {}
    }
  }

  // Lets embedded pages use the homepage shell for controls that live outside
  // their iframe. Search first dismisses either popup layer so the global
  // search panel is visible and accessible, then opens it from the main page.
  function openGlobalSearch() {
    if (modal && !modal.hidden) closeModal();
    else closeDepartmentModal();
    window.setTimeout(function () {
      if (typeof window.openWaltonBudgetSearch === "function") {
        window.openWaltonBudgetSearch();
      } else {
        window.location.href = "pages/search.html";
      }
    }, 0);
  }

  // The budget book is rendered inside this modal's iframe. Fullscreening the
  // iframe document leaves the surrounding viewer behind in some browsers, so
  // let the embedded toolbar fullscreen the complete modal instead.
  function toggleDepartmentFullscreen() {
    if (!departmentModal || departmentModal.hidden) return false;
    var fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
    if (fullscreenElement) {
      var exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
      if (exitFullscreen) exitFullscreen.call(document);
      return true;
    }
    var requestFullscreen = departmentModal.requestFullscreen || departmentModal.webkitRequestFullscreen;
    if (!requestFullscreen) return false;
    requestFullscreen.call(departmentModal);
    return true;
  }

  function syncDepartmentFullscreen() {
    if (!departmentModal) return;
    var isFullscreen = (document.fullscreenElement || document.webkitFullscreenElement) === departmentModal;
    departmentModal.classList.toggle("is-native-fullscreen", isFullscreen);
    try {
      var frameWindow = departmentFrame && departmentFrame.contentWindow;
      var frameBody = departmentFrame && departmentFrame.contentDocument && departmentFrame.contentDocument.body;
      if (frameBody) frameBody.classList.toggle("wc-book-is-fullscreen", isFullscreen);
      var fullscreenButton = frameBody && frameBody.querySelector("#budgetBookEmbedFullscreen");
      if (fullscreenButton) {
        var fullscreenLabel = isFullscreen ? "Exit fullscreen" : "Enter fullscreen";
        fullscreenButton.setAttribute("aria-label", fullscreenLabel);
        fullscreenButton.setAttribute("title", fullscreenLabel);
        var fullscreenPath = fullscreenButton.querySelector("path");
        if (fullscreenPath) fullscreenPath.setAttribute("d", isFullscreen
          ? "M9 4v5H4M15 4v5h5M4 15h5v5M20 15h-5v5"
          : "M9 4H4v5M15 4h5v5M4 15v5h5M20 15v5h-5");
      }
      if (frameWindow) frameWindow.dispatchEvent(new frameWindow.Event("resize"));
    } catch (fullscreenSyncError) {}
  }

  document.addEventListener("fullscreenchange", syncDepartmentFullscreen);
  document.addEventListener("webkitfullscreenchange", syncDepartmentFullscreen);

  // The budget book's own iframe-embedded close (X) button uses this API too.
  // openDepartmentModal is exposed so nav.js's own footer utility-popup
  // dialog (a separate, simpler modal that doesn't know about the budget
  // book's transparent chrome) can hand off a click on a budget-book.html
  // link to this department-popup system instead of just navigating its
  // own iframe in place.
  window.WCHomeExplorer = {
    closeDepartmentModal: closeDepartmentModal,
    openDepartmentModal: openDepartmentModal,
    openGlobalSearch: openGlobalSearch,
    toggleDepartmentFullscreen: toggleDepartmentFullscreen
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
