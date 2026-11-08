// Capital project popup: a project link on a capital ledger (or the CIP
// overview) opens that project's page in the same centered dialog as the
// "Choose an office" picker and the Machinery asset record, instead of
// navigating away from the ledger. The project page itself loads in a
// frame with ?embed=project-popup, which nav.js renders without the site
// header. The backdrop is not a close control; use the X button or Escape.
(function () {
  "use strict";

  var modal = null;
  var lastTrigger = null;
  var savedScroll = null;

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement("div");
    modal.className = "wc-budget-detail-modal wc-project-popup-modal";
    modal.hidden = true;
    modal.innerHTML =
      '<div class="wc-budget-detail-backdrop" aria-hidden="true"></div>' +
      '<section class="wc-budget-detail-card" role="dialog" aria-modal="true" aria-labelledby="wc-project-popup-title">' +
        '<div class="wc-budget-detail-header">' +
          '<div class="wc-budget-detail-heading">' +
            '<p class="wc-budget-detail-kicker">Capital Project</p>' +
            '<h2 id="wc-project-popup-title">Project</h2>' +
          '</div>' +
          '<button type="button" class="wc-budget-detail-close" aria-label="Close project">&times;</button>' +
        '</div>' +
        '<div class="wc-project-popup-body"><iframe class="wc-project-popup-frame" title="Capital project detail"></iframe></div>' +
      '</section>';
    document.body.appendChild(modal);
    modal.querySelector(".wc-budget-detail-close").addEventListener("click", closeModal);
    modal.querySelector("iframe").addEventListener("load", function () {
      // Use the project's own heading as the popup title once it renders.
      var frame = this;
      var tries = 0;
      // Escape pressed while focus is inside the project frame still
      // closes the popup (unless the page handled it, e.g. its photo viewer).
      try {
        frame.contentDocument.addEventListener("keydown", function (event) {
          if (event.key !== "Escape") return;
          setTimeout(function () { if (!event.defaultPrevented && !frame.contentDocument.querySelector(".is-open[role=dialog], dialog[open]")) closeModal(); }, 0);
        });
      } catch (e) {}
      (function readTitle() {
        var heading = null;
        try { heading = frame.contentDocument && frame.contentDocument.querySelector(".wc-project-title, h1"); } catch (e) {}
        var text = heading && heading.textContent.trim();
        if (text) {
          modal.querySelector("#wc-project-popup-title").textContent = text;
        } else if (tries++ < 20) {
          setTimeout(readTitle, 150);
        }
      })();
    });
    return modal;
  }

  function openModal(href, label, trigger) {
    var m = ensureModal();
    var url = new URL(href, window.location.href);
    url.searchParams.set("embed", "project-popup");
    m.querySelector("#wc-project-popup-title").textContent = label || "Project";
    m.querySelector("iframe").src = url.href;
    lastTrigger = trigger || null;
    m.hidden = false;
    requestAnimationFrame(function () { m.classList.add("is-open"); });
    document.body.classList.add("wc-budget-detail-open");
    savedScroll = { html: document.documentElement.style.overflow };
    document.documentElement.style.overflow = "hidden";
    m.querySelector(".wc-budget-detail-close").focus({ preventScroll: true });
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.classList.remove("is-open");
    modal.hidden = true;
    modal.querySelector("iframe").src = "about:blank";
    if (!document.querySelector(".wc-budget-detail-modal:not(.wc-project-popup-modal):not([hidden])")) {
      document.body.classList.remove("wc-budget-detail-open");
    }
    if (savedScroll) document.documentElement.style.overflow = savedScroll.html;
    savedScroll = null;
    if (lastTrigger && typeof lastTrigger.focus === "function") lastTrigger.focus({ preventScroll: true });
    lastTrigger = null;
  }

  // Window capture phase, so the department popup's own link handler
  // (home-explorer-modal.js) never treats this as a page navigation.
  window.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest('a[href*="cip-project.html"]');
    if (!link || event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.target && link.target !== "_self") return;
    if (/\/cip-project\.html$/i.test(window.location.pathname)) return;
    event.preventDefault();
    event.stopPropagation();
    openModal(link.href, link.textContent.replace(/\s+/g, " ").trim(), link);
  }, true);

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && modal && !modal.hidden) closeModal();
  });
}());
