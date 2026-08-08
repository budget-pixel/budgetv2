/* Shared data layer for the Independent Agencies Explorer and Ledger pages.
   Both pages need the exact same entity list, alias matching, and
   budget/fund enrichment -- kept here once so they can't drift apart.
   Exposes window.WCIndependentAgencies for reuse on either page. */
(function(){
  var SECTION = "Autonomous Entities";
  var FALLBACK_ENTITIES = [
    ["Circuit Court", "circuit-court.html"],
    ["County Court", "county-court.html"],
    ["Court Technology & Innovations", "court-technology-and-innovations.html"],
    ["Guardian Ad Litem", "guardian-ad-litem.html"],
    ["Medical Examiner", "medical-examiner.html"],
    ["Non-Profit Funding Program", "non-profit-funding-program.html"],
    ["Public Defender", "public-defender.html"],
    ["South Walton Fire & State Control", "south-walton-fire-and-state-control.html"],
    ["State Attorney", "state-attorney.html"],
    ["Statutory & Other Agency Funding", "statutory-and-other-agency-funding.html"],
    ["E911 Fund", "e911-fund.html"],
    ["Municipal Service Benefit Unit Fund", "municipal-service-benefit-unit-fund.html"],
    ["Walton County Health Department", "walton-county-health-department.html"]
  ];
  var ALIAS_MAP = {
    "court technology and innovations": [
      "court technology innovations",
      "court technology court administration",
      "court technology state attorney",
      "court technology public defender",
      "court technology",
      "court innovations"
    ],
    "south walton fire and state control": ["south walton fire", "state fire"],
    "statutory and other agency funding": [
      "statutory and other agency fund",
      "statutory other agency funding",
      "statutory other agency fund",
      "statutory and other",
      "statutory other"
    ],
    "e911 fund": ["e911", "e 911"],
    "municipal service benefit unit fund": ["municipal service benefit unit", "msbu", "msbu fund"]
  };

  function normalize(value){
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function aliasesFor(name){
    var key = normalize(name);
    return [key].concat(ALIAS_MAP[key] || []);
  }

  function rowMatches(row, name){
    var dept = normalize(row && row.Dept_Name);
    return aliasesFor(name).indexOf(dept) !== -1;
  }

  function fundCodeForRow(row){
    return String((row && row.Dept_Code) || "").trim().slice(0, 3);
  }

  function fundCodesForItem(budgetRows){
    var codes = [];
    budgetRows.forEach(function(row){
      // Skip rows with no FY2027 budget of their own (e.g. a legacy-fund
      // placeholder kept only so historical actuals stay visible -- see
      // DEPT_CODE_ACTUALS_ALIASES' comment in budget-data.js), so the
      // fund shown stays in sync with the FY2027 budget figure shown.
      if(!(Number(row.FY2027_Proposed) || 0)) return;
      var code = fundCodeForRow(row);
      if(code && codes.indexOf(code) === -1) codes.push(code);
    });
    return codes;
  }

  function fundLabelForItem(codes, fundsByCode){
    if(!codes.length) return "Not listed";
    return codes
      .map(function(code){
        var fund = fundsByCode[code];
        return fund && fund.Fund_Name ? fund.Fund_Name : code;
      })
      .sort()
      .join(", ");
  }

  function expenditureRowsForItem(rows, item){
    if(normalize(item.name) === "statutory and other agency funding"){
      return rows.filter(function(row){
        return String(row && row.Note || "").trim() === "Statutory & Other";
      });
    }
    return rows.filter(function(row){
      return rowMatches(row, item.name);
    });
  }

  // Prior-year (FY2026_Original_Budget) totals need the deduped expense
  // rows -- some entities split one Dept_Code across multiple
  // display-only Dept_Names (e.g. Court Technology & Innovations' several
  // sub-programs) that each carry the *same* full original-budget total
  // for a shared account (see applyOriginalBudgetToRows in budget-data.js),
  // so summing the raw rows would double-count it once per Dept_Name
  // sharing it. Statutory & Other's Note-based filter doesn't apply to
  // deduped rows (Note isn't part of their merge key), so it keeps using
  // the raw rows -- its many recipients already sit on distinct
  // Project_Codes, which are part of that grain, so they don't collapse.
  function priorBudgetRowsForItem(dedupedRows, rawRows, item){
    if(normalize(item.name) === "statutory and other agency funding"){
      return rawRows.filter(function(row){
        return String(row && row.Note || "").trim() === "Statutory & Other";
      });
    }
    return dedupedRows.filter(function(row){
      return rowMatches(row, item.name);
    });
  }

  function buildBaseItems(){
    var pages = Array.isArray(window.wcBudgetPages) ? window.wcBudgetPages : [];
    var localHrefByTitle = {};
    FALLBACK_ENTITIES.forEach(function(item){
      localHrefByTitle[normalize(item[0])] = item[1];
    });
    var items = pages
      .filter(function(page){
        return page &&
          page.section === SECTION &&
          page.title !== "Constitutional Officers";
      })
      .map(function(page){
        return { name:page.title, href:localHrefByTitle[normalize(page.title)] || page.href };
      });

    if(!items.length){
      items = FALLBACK_ENTITIES.map(function(item){
        return { name:item[0], href:item[1] };
      });
    }

    var seen = {};
    return items
      .filter(function(item){
        var key = normalize(item.name);
        if(seen[key]) return false;
        seen[key] = true;
        return true;
      })
      .sort(function(a, b){ return a.name.localeCompare(b.name); });
  }

  function costBreakdownForRows(rows){
    var personnel = 0, capital = 0, total = 0;
    rows.forEach(function(row){
      var amount = Number(row.FY2027_Proposed) || 0;
      total += amount;
      var type = String(row.Object_Type || "").toLowerCase();
      if(type.indexOf("personnel") >= 0) personnel += amount;
      else if(type.indexOf("capital") >= 0) capital += amount;
    });
    return { personnel:personnel, capital:capital, operating:total - personnel - capital, total:total };
  }

  function enrichItems(baseItems, data){
    var expenditures = Array.isArray(data && data.expenditures) ? data.expenditures : [];
    var dedupedExpenditures = Array.isArray(data && data.dedupedExpenseRows) ? data.dedupedExpenseRows : expenditures;
    var staffing = Array.isArray(data && data.staffing) ? data.staffing : [];
    var funds = Array.isArray(data && data.funds) ? data.funds : [];
    var fundsByCode = {};
    funds.forEach(function(fund){
      if(fund && fund.Fund_Code) fundsByCode[fund.Fund_Code] = fund;
    });

    return baseItems.map(function(item){
      var budgetRows = expenditureRowsForItem(expenditures, item);
      var breakdown = costBreakdownForRows(budgetRows);
      var priorBudget = priorBudgetRowsForItem(dedupedExpenditures, expenditures, item).reduce(function(sum, row){
        return sum + (Number(row.FY2026_Original_Budget) || 0);
      }, 0);
      var fte = staffing.reduce(function(sum, row){
        return rowMatches(row, item.name) ? sum + (Number(row["2027"]) || 0) : sum;
      }, 0);
      var priorFte = staffing.reduce(function(sum, row){
        return rowMatches(row, item.name) ? sum + (Number(row["2026"]) || 0) : sum;
      }, 0);
      var fundCodes = fundCodesForItem(budgetRows);

      return {
        status:"ready",
        name:item.name,
        href:item.href,
        budget:breakdown.total,
        priorBudget:priorBudget,
        personnel:breakdown.personnel,
        operating:breakdown.operating,
        capital:breakdown.capital,
        fte:fte,
        priorFte:priorFte,
        fund:fundLabelForItem(fundCodes, fundsByCode),
        fundCodes:fundCodes
      };
    });
  }

  function loadingItems(baseItems){
    return baseItems.map(function(item){
      return {
        status:"loading",
        name:item.name,
        href:item.href,
        budget:0,
        priorBudget:0,
        personnel:0,
        operating:0,
        capital:0,
        fte:0,
        priorFte:0,
        fund:"Loading"
      };
    });
  }

  function fallbackItems(baseItems){
    return baseItems.map(function(item){
      return {
        status:"ready",
        name:item.name,
        href:item.href,
        budget:0,
        priorBudget:0,
        personnel:0,
        operating:0,
        capital:0,
        fte:0,
        priorFte:0,
        fund:"Not listed"
      };
    });
  }

  // onLoading fires immediately with skeleton rows (so the page has
  // something to paint before the network round trip finishes); the
  // returned promise resolves with the real, enriched items.
  function load(onLoading){
    var baseItems = buildBaseItems();
    if(typeof onLoading === "function") onLoading(loadingItems(baseItems));

    if(!(window.WCBudgetData && typeof window.WCBudgetData.loadBudgetData === "function")){
      return Promise.resolve(fallbackItems(baseItems));
    }
    return window.WCBudgetData.loadBudgetData()
      .then(function(data){ return enrichItems(baseItems, data); })
      .catch(function(){ return fallbackItems(baseItems); });
  }

  window.WCIndependentAgencies = { load:load };
})();
