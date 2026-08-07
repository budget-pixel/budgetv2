(function () {
  "use strict";

  // Generic "Download this page as a PNG" capability, reused across the
  // HB 1329 (F.S. 129.03(3)(f)) compliance documents. Unlike the TRIM
  // newspaper ad page's hand-drawn canvas (a fixed, print-ad-specific
  // layout), this captures whatever is actually rendered in the target
  // element via html2canvas, so the same script works on any page --
  // add a [data-png-export] button and it just works.
  var HTML2CANVAS_SRC = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
  var loadPromise = null;

  function loadHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve();
    if (loadPromise) return loadPromise;
    loadPromise = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = HTML2CANVAS_SRC;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error("Failed to load html2canvas")); };
      document.head.appendChild(script);
    });
    return loadPromise;
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function backgroundColorFor(target) {
    var color = getComputedStyle(target).backgroundColor;
    if (color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent") return color;
    return getComputedStyle(document.body).backgroundColor || "#ffffff";
  }

  function captureToPng(target, filename, button) {
    var originalText = button ? button.textContent : "";
    if (button) { button.disabled = true; button.textContent = "Preparing Image…"; }
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    return fontsReady.then(loadHtml2Canvas).then(function () {
      return window.html2canvas(target, {
        backgroundColor: backgroundColorFor(target),
        scale: Math.min(2, window.devicePixelRatio || 1.5),
        useCORS: true
      });
    }).then(function (canvas) {
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (!blob) { reject(new Error("Image creation failed")); return; }
          downloadBlob(blob, filename);
          resolve();
        }, "image/png");
      });
    }).then(function () {
      if (button) { button.disabled = false; button.textContent = originalText; }
    }).catch(function (error) {
      if (button) { button.disabled = false; button.textContent = originalText; }
      window.alert("The image could not be created. Please refresh the page and try again.");
      window.console.error(error);
    });
  }

  function initPagePngButtons() {
    document.querySelectorAll("[data-png-export]").forEach(function (button) {
      button.addEventListener("click", function () {
        var targetSelector = button.getAttribute("data-png-export-target") || "#content";
        var target = document.querySelector(targetSelector);
        if (!target) return;
        var filename = button.getAttribute("data-png-export-filename") || "Walton-County-Budget-Document.png";
        captureToPng(target, filename, button);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPagePngButtons);
  } else {
    initPagePngButtons();
  }
})();
