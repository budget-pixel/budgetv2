(function(){
  var STYLE_ID = "wc-split-logo-styles";

  function assetPath(path){
    return (window.location.pathname.indexOf("/pages/") !== -1 ? "../" : "") + path;
  }

  function injectStyles(){
    if(document.getElementById(STYLE_ID)){
      return;
    }

    var logoUrl = assetPath("assets/images/page-images/walton-county-logo-no-background.png");
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .wc-split-brand,
      .wc-split-brand *{
        -webkit-text-size-adjust:100% !important;
        text-size-adjust:100% !important;
      }

      .wc-split-brand{
        display:flex !important;
        align-items:center !important;
        justify-content:flex-start !important;
        gap:14px !important;
        width:auto !important;
        min-width:max-content !important;
        height:58px !important;
        flex:0 0 auto !important;
        overflow:visible !important;
        font-family:Arial, Helvetica, sans-serif !important;
        text-decoration:none !important;
        color:inherit !important;
      }

      .wc-split-brand-text{
        display:flex !important;
        flex-direction:column !important;
        justify-content:center !important;
        align-items:flex-start !important;
        gap:0 !important;
      }

      .wc-split-brand-top{
        display:block !important;
        color:#006231 !important;
        font-family:Arial, Helvetica, sans-serif !important;
        font-size:22px !important;
        line-height:1 !important;
        font-weight:800 !important;
        letter-spacing:.06em !important;
        text-transform:uppercase !important;
        white-space:nowrap !important;
      }

      .wc-split-brand-bottom{
        display:block !important;
        margin-top:3px !important;
        color:#000000 !important;
        font-family:Arial, Helvetica, sans-serif !important;
        font-size:10.588235px !important;
        line-height:9px !important;
        font-weight:800 !important;
        letter-spacing:.15em !important;
        text-transform:uppercase !important;
        white-space:nowrap !important;
      }

      .wc-split-brand-seal,
      .wc-seal-mark{
        position:static !important;
        display:block !important;
        width:50px !important;
        height:50px !important;
        flex:0 0 50px !important;
        border-radius:999px !important;
        background:#ffffff url("${logoUrl}") center center / 46px 46px no-repeat !important;
        border:3px solid #d1be78 !important;
        box-sizing:border-box !important;
        transform:none !important;
        z-index:2 !important;
        cursor:pointer !important;
        text-decoration:none !important;
      }

      /* One publication-header variant shared by the video home screen and
         the embedded explorer. Individual surfaces may change only the two
         color variables; typography, spacing, and seal geometry stay here. */
      .wc-split-brand.wc-split-brand--publication{
        height:52px !important;
      }
      .wc-split-brand.wc-split-brand--publication .wc-split-brand-top{
        color:var(--wc-publication-brand-top,#ffffff) !important;
        font-size:24px !important;
        font-weight:800 !important;
      }
      .wc-split-brand.wc-split-brand--publication .wc-split-brand-bottom{
        color:var(--wc-publication-brand-bottom,rgba(255,255,255,.82)) !important;
        font-weight:800 !important;
      }
      .wc-split-brand.wc-split-brand--publication .wc-split-brand-seal,
      .wc-split-brand.wc-split-brand--publication .wc-seal-mark{
        width:46px !important;
        height:46px !important;
        flex-basis:46px !important;
        background-size:42px 42px !important;
      }
    `;

    document.head.appendChild(style);
  }

  function getHtml(linkHref, linkLabel){
    var sealTag = linkHref ? "a" : "span";
    var hrefAttr = linkHref ? ' href="' + linkHref + '"' : "";
    var ariaAttr = linkLabel ? ' aria-label="' + linkLabel + '"' : ' aria-hidden="true"';

    return `
      <div class="wc-split-brand">
        <${sealTag} class="wc-split-brand-seal wc-seal-mark"${hrefAttr}${ariaAttr}></${sealTag}>
        <div class="wc-split-brand-text">
          <div class="wc-split-brand-top">Walton County</div>
          <div class="wc-split-brand-bottom">Board of County Commissioners</div>
        </div>
      </div>
    `;
  }

  function equalizeBrandTextWidth(block){
    var top = block.querySelector(".wc-split-brand-top");
    var bottom = block.querySelector(".wc-split-brand-bottom");
    if(!top || !bottom){
      return;
    }
    top.style.removeProperty("letter-spacing");
    var topWidth = top.getBoundingClientRect().width;
    var bottomWidth = bottom.getBoundingClientRect().width;
    if(!topWidth || !bottomWidth){
      return;
    }
    var gaps = Math.max((top.textContent || "").length - 1, 1);
    var baseSpacing = parseFloat(getComputedStyle(top).letterSpacing) || 0;
    var nextSpacing = baseSpacing + (bottomWidth - topWidth) / gaps;
    top.style.setProperty("letter-spacing", nextSpacing + "px", "important");
  }

  function equalizeAll(root){
    (root || document).querySelectorAll(".wc-split-brand-text").forEach(equalizeBrandTextWidth);
  }

  function scheduleEqualize(root){
    window.requestAnimationFrame(function(){
      equalizeAll(root);
    });
  }

  function bindAutoEqualize(){
    if(window.__waltonSplitLogoAutoEqualizeBound){
      return;
    }
    window.__waltonSplitLogoAutoEqualizeBound = true;

    if(document.readyState === "loading"){
      document.addEventListener("DOMContentLoaded", function(){
        scheduleEqualize();
      });
    }else{
      scheduleEqualize();
    }

    window.addEventListener("load", function(){
      scheduleEqualize();
    });
    window.addEventListener("resize", function(){
      scheduleEqualize();
    }, { passive:true });

    if(document.fonts && document.fonts.ready){
      document.fonts.ready.then(function(){
        scheduleEqualize();
      });
    }
  }

  window.WaltonSplitLogo = {
    injectStyles: injectStyles,
    getHtml: getHtml,
    equalizeAll: equalizeAll,
    scheduleEqualize: scheduleEqualize
  };

  injectStyles();
  bindAutoEqualize();
})();
