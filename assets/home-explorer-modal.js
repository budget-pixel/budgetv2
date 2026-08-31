(function () {
  "use strict";

  var EXPLORERS = {
    revenue: { title: "Revenue Budget Explorer" },
    personnel: { title: "Personnel Budget Explorer" },
    departments: { title: "Department Budget Explorer" },
    capital: { title: "Capital Budget Explorer" },
    constitutional: { title: "Constitutional Officers Budget Explorer" },
    independent: { title: "Independent Agencies Budget Explorer" }
  };

  var activeCard = null;
  var modal = null;
  var modalBody = null;
  var modalTitle = null;
  var departmentModal = null;
  var departmentFrame = null;
  var departmentTrigger = null;
  var lockedPageScrollY = 0;
  var savedBodyStyles = null;

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
        return '<a href="' + escapeHtml(card.href) + '"><div class="wc-revenue-card-head"><div class="wc-revenue-card-head-main"><strong>' + escapeHtml(card.title) + '</strong><b class="wc-revenue-card-amount">' + escapeHtml(compactCurrency(card.amount)) + '</b><small class="wc-revenue-card-share">' + share.toFixed(1) + '% of capital budget</small></div>' +
          (card.badge ? '<div class="wc-revenue-card-badge-stack"><span class="wc-personnel-dept-fte-badge">' + escapeHtml(card.badge) + '</span></div>' : '') +
          '</div></a>';
      }).join("");
      modalBody.innerHTML = '<section class="wc-department-explorer"><div class="wc-department-explorer-head"><div><h2>Capital Budget Explorer</h2><p>Explore Walton County&rsquo;s capital improvement plan, fund ledgers, machinery and equipment, and searchable project detail.</p><p>Select a ledger below to review projects, funding sources, and budgeted investment.</p></div><aside class="wc-revenue-total-budget"><div class="wc-revenue-total-primary"><span>Total capital budget</span><strong>' + escapeHtml(formatCurrency(total)) + '</strong><small class="wc-revenue-total-change ' + (total >= prior ? 'is-increase' : 'is-decrease') + '">' + (total >= prior ? "+" : "−") + escapeHtml(compactCurrency(Math.abs(total - prior))) + '</small><div class="wc-revenue-view-actions"><a class="wc-revenue-ledger-trigger" href="pages/capital-improvement-plan.html#wc-cip-what-counts">What is a Capital Project?</a><a class="wc-revenue-ledger-trigger" href="pages/search.html">Project Search</a></div></div></aside></div><div class="wc-department-budget-cards">' + cardHtml + '</div></section>';
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
      modalBody.innerHTML = '<section class="wc-department-explorer wc-independent-agencies-explorer"><div class="wc-department-explorer-head"><div><h2>Independent Agencies Budget Explorer</h2><p>Walton County budgets a combined ' + escapeHtml(compactCurrency(total)) + ' across ' + items.length + ' independent and autonomous entities' + (totalFte ? ', employing ' + escapeHtml(totalFte) + ' FTE' : '') + '. Select an entity to review its budget, staffing, and service information.</p><p class="wc-revenue-concentration-summary"><strong>' + (countywide ? Math.round(total / countywide * 100) : 0) + '%</strong> of the total expenditure budget is independent agency funding.</p></div><aside class="wc-revenue-total-budget"><div class="wc-revenue-total-primary"><span>Total Independent Agencies Budget</span><strong>' + escapeHtml(formatCurrency(total)) + '</strong><small class="wc-revenue-total-change ' + (change > 0 ? 'is-increase' : change < 0 ? 'is-decrease' : '') + '">' + (change >= 0 ? "+" : "−") + escapeHtml(compactCurrency(Math.abs(change))) + ' (' + (pct === null ? 'No FY 2026 base' : (pct >= 0 ? "+" : "−") + Math.abs(pct).toFixed(1) + '%') + ')</small><div class="wc-revenue-view-actions"><a class="wc-revenue-ledger-trigger" href="pages/independent-agencies-ledger.html">View Independent Agencies Ledger</a></div></div></aside></div><div class="wc-department-budget-cards">' + cards + '</div></section>';
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
        '<iframe class="wc-home-department-modal-frame" title="Code Compliance department page"></iframe>' +
      '</section>';
    document.body.appendChild(departmentModal);
    departmentFrame = departmentModal.querySelector("iframe");
    departmentFrame.addEventListener("load", function () {
      try {
        var embeddedDocument = departmentFrame.contentDocument;
        embeddedDocument.documentElement.classList.add("wc-embedded-department");
        var embeddedStyle = embeddedDocument.createElement("style");
        embeddedStyle.textContent = 'nav#nav-menu,footer[role="contentinfo"],.wc-breadcrumb{display:none!important}' +
          '#layout{display:block!important;min-height:100vh!important}' +
          '#content{width:min(1380px,100%)!important;max-width:none!important;margin:0 auto!important;padding:44px 28px 28px!important}' +
          '#content>.page-eyebrow,#content>.page-title{display:none!important}' +
          '.wc-dept-function-services--with-video>.wc-dept-supporting-media{margin-top:8px!important}';
        embeddedDocument.head.appendChild(embeddedStyle);
      } catch (error) {
        // The query-string class in the embedded page remains the fallback.
      }
      if (!departmentModal.hidden) {
        window.requestAnimationFrame(function () { departmentModal.classList.remove("is-loading"); });
      }
    });
    departmentModal.addEventListener("click", function (event) {
      if (event.target.closest("[data-department-popup-close]")) closeDepartmentModal();
    });
    return departmentModal;
  }

  function openDepartmentModal(href, title, trigger) {
    ensureDepartmentModal();
    departmentTrigger = trigger;
    var openedWithoutExplorer = modal.hidden;
    var url = new URL(href, window.location.href);
    var departmentTitle = /\/environmental-resources\.html$/i.test(url.pathname) || String(title).toLowerCase() === "environmental services"
      ? "Environmental Resources"
      : title || "Department";
    var waveVideo = departmentModal.querySelector(".wc-home-department-modal-wave");
    url.searchParams.set("embed", "department-popup");
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
    departmentModal.classList.add("is-loading");
    departmentFrame.src = url.href;
    departmentModal.hidden = false;
    modal.classList.add("is-department-popup-open");
    departmentModal.querySelector(".wc-home-department-modal-close").focus();
  }

  function closeDepartmentModal() {
    if (!departmentModal || departmentModal.hidden) return;
    var openedWithoutExplorer = departmentModal.dataset.standalone === "true";
    departmentModal.hidden = true;
    departmentModal.classList.remove("is-loading");
    var waveVideo = departmentModal.querySelector(".wc-home-department-modal-wave");
    if (waveVideo) {
      waveVideo.pause();
      waveVideo.currentTime = 0;
    }
    departmentFrame.src = "about:blank";
    modal.classList.remove("is-department-popup-open");
    departmentModal.removeAttribute("data-standalone");
    if (openedWithoutExplorer) unlockBackgroundPage();
    if (departmentTrigger && document.contains(departmentTrigger)) departmentTrigger.focus();
    departmentTrigger = null;
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    closeDepartmentModal();
    modal.hidden = true;
    modalBody.innerHTML = "";
    unlockBackgroundPage();
    if (activeCard) activeCard.focus();
    activeCard = null;
  }

  function openModal(type, card) {
    var config = EXPLORERS[type];
    if (!config) return;
    activeCard = card;
    modalTitle.textContent = config.title;
    modal.hidden = false;
    lockBackgroundPage();
    modal.scrollTop = 0;
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
    modal.innerHTML = '<div class="wc-home-explorer-modal-panel"><header class="wc-home-explorer-modal-head"><div class="wc-home-explorer-modal-heading"><h2 id="wcHomeExplorerModalTitle"></h2></div><button type="button" class="wc-home-explorer-modal-close" aria-label="Close explorer">&times;</button></header><div class="wc-home-explorer-modal-body"></div></div>';
    document.body.appendChild(modal);
    modalBody = modal.querySelector(".wc-home-explorer-modal-body");
    modalTitle = modal.querySelector("#wcHomeExplorerModalTitle");

    new MutationObserver(function () { prefixPageLinks(modalBody); }).observe(modalBody, { childList: true, subtree: true });
    document.addEventListener("click", function (event) {
      var link = event.target.closest('a[href]');
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
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

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
