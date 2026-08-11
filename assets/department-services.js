(function(){
  "use strict";

  var SERVICES = {
    "building construction and maintenance":[
      ["Build and renew county facilities","Plans and delivers construction, renovation, and major repair projects for county buildings."],
      ["Maintain public buildings","Keeps county facilities safe, functional, and available for the people who use them."],
      ["Manage facility systems","Coordinates building systems, preventive maintenance, and service requests across county operations."]
    ],
    "building department":[
      ["Review building plans","Checks proposed construction for compliance with applicable building and safety requirements."],
      ["Issue permits","Processes permits that authorize eligible construction, alteration, and related work."],
      ["Inspect construction","Verifies permitted work at required stages before completion or occupancy."]
    ],
    "code compliance":[
      ["Respond to code concerns","Receives and investigates reported conditions that may violate county codes."],
      ["Resolve property violations","Works with property owners to correct documented violations and restore compliance."],
      ["Support neighborhood standards","Conducts field activity and case follow-up that protect community health, safety, and appearance."]
    ],
    "county administration":[
      ["Carry out Board direction","Coordinates implementation of policies and decisions adopted by the Board of County Commissioners."],
      ["Coordinate county operations","Aligns departments, priorities, and executive decisions across Board-controlled government."],
      ["Support public accountability","Provides executive oversight, issue resolution, and communication about county operations."]
    ],
    "eagle springs golf and recreation center":[
      ["Operate the golf course","Provides and maintains the public golf experience at Eagle Springs."],
      ["Maintain recreation grounds","Cares for the course, grounds, equipment, and supporting recreation assets."],
      ["Host community recreation","Provides access, programming, and gathering opportunities at the recreation center."]
    ],
    "eagle springs grill":[
      ["Provide food service","Prepares and serves food and beverages for Eagle Springs patrons and guests."],
      ["Support events and outings","Provides hospitality support for golf, recreation, and community events."],
      ["Operate the grill","Manages daily customer service, supplies, food safety, and point-of-sale activity."]
    ],
    "emergency management":[
      ["Prepare for emergencies","Develops plans, training, and coordination arrangements before disasters occur."],
      ["Coordinate emergency response","Connects agencies, information, and resources during an emergency activation."],
      ["Support community recovery","Coordinates recovery information, assistance, and continuity after an emergency."]
    ],
    "engineering department":[
      ["Design public infrastructure","Develops and reviews plans for roads, drainage, and other county infrastructure."],
      ["Manage infrastructure projects","Coordinates engineering work from scope and permitting through construction."],
      ["Review development impacts","Evaluates technical plans and infrastructure requirements associated with development."]
    ],
    "environmental resources":[
      ["Protect natural resources","Supports stewardship of waterways, habitat, and environmentally sensitive county resources."],
      ["Manage environmental projects","Plans and coordinates restoration, monitoring, and resource-management initiatives."],
      ["Provide environmental review","Supplies technical review and guidance for county projects and environmental responsibilities."]
    ],
    "extension office":[
      ["Share research-based education","Connects residents with practical information from the University of Florida extension system."],
      ["Support agriculture and landscapes","Provides education and assistance for farms, gardens, natural resources, and pest management."],
      ["Develop youth and families","Offers 4-H and community learning opportunities that build skills and leadership."]
    ],
    "geographic info systems":[
      ["Maintain county map data","Creates and maintains geographic information used across county operations."],
      ["Provide public mapping","Makes location-based county information available through maps and online tools."],
      ["Support location decisions","Provides spatial analysis for planning, infrastructure, emergency response, and service delivery."]
    ],
    "housing and urban development":[
      ["Support housing stability","Administers eligible housing assistance and improvement activities for residents."],
      ["Manage community-development funding","Coordinates grants and programs intended to improve housing and community conditions."],
      ["Connect residents with resources","Provides program information, eligibility guidance, and application support."]
    ],
    "human resources":[
      ["Recruit and support employees","Coordinates hiring, onboarding, employee records, and workplace support."],
      ["Administer pay and benefits","Manages compensation, benefits, classification, and related personnel processes."],
      ["Guide workforce policy","Supports performance, training, employee relations, and compliance with employment requirements."]
    ],
    "libraries":[
      ["Provide books and information","Connects residents with collections, research help, technology, and digital resources."],
      ["Support learning at every age","Offers literacy, educational, and cultural programs for children, adults, and families."],
      ["Provide welcoming public spaces","Maintains accessible places for reading, study, connection, and community activity."]
    ],
    "mosquito control":[
      ["Monitor mosquito activity","Uses surveillance and field information to identify mosquito populations and conditions."],
      ["Reduce mosquito populations","Applies appropriate treatment and source-control practices in the service area."],
      ["Respond to resident concerns","Investigates service requests and provides information about mosquito prevention."]
    ],
    "mossy head wastewater treatment facility":[
      ["Treat wastewater","Operates treatment processes that protect public health and the environment."],
      ["Maintain the treatment system","Inspects, repairs, and maintains facility equipment and supporting infrastructure."],
      ["Monitor regulatory compliance","Tests, documents, and reports treatment performance under applicable requirements."]
    ],
    "office of management and budget":[
      ["Build the annual budget","Coordinates department requests, revenue estimates, balancing, and the tentative county budget."],
      ["Monitor public spending","Tracks budget performance and supports amendments throughout the fiscal year."],
      ["Explain financial decisions","Produces schedules, forecasts, analysis, and public budget information for decision-making."]
    ],
    "office of the county attorney":[
      ["Advise county government","Provides legal counsel to the Board and Board-controlled departments."],
      ["Prepare and review legal documents","Reviews ordinances, resolutions, agreements, contracts, and other county instruments."],
      ["Represent the county","Manages litigation, claims, hearings, and other legal proceedings involving the county."]
    ],
    "planning":[
      ["Guide long-range growth","Maintains planning policies that shape future land use and community development."],
      ["Review development proposals","Evaluates applications for consistency with county plans and land-development requirements."],
      ["Support public land-use decisions","Provides analysis, public-process support, and recommendations for planning decisions."]
    ],
    "probation":[
      ["Supervise court-ordered probation","Monitors people assigned to county probation under court requirements."],
      ["Track compliance","Documents reporting, conditions, payments, and other obligations established by the court."],
      ["Report to the court","Provides compliance information and case updates needed for judicial decisions."]
    ],
    "public works":[
      ["Maintain roads and rights-of-way","Repairs and maintains county roads, shoulders, signs, and related transportation assets."],
      ["Manage drainage and storm impacts","Maintains drainage systems and responds to conditions affecting travel and property."],
      ["Deliver transportation improvements","Coordinates paving, resurfacing, bridge, and other road improvement work."]
    ],
    "purchasing":[
      ["Run fair solicitations","Coordinates competitive purchasing processes for county goods, services, and construction."],
      ["Support county purchasing","Helps departments obtain needed resources under adopted rules and contracts."],
      ["Maintain procurement records","Documents awards, contracts, vendor information, and purchasing compliance."]
    ],
    "recreation":[
      ["Operate parks and recreation facilities","Maintains public parks, fields, courts, and supporting amenities."],
      ["Provide recreation programs","Coordinates activities, leagues, and opportunities for residents of different ages."],
      ["Support community use","Schedules facilities and helps residents access safe places to play and gather."]
    ],
    "soil conservation":[
      ["Support conservation planning","Provides local assistance for soil, water, and natural-resource conservation practices."],
      ["Connect landowners with technical help","Links agricultural and rural property needs with conservation information and partners."],
      ["Promote resource stewardship","Supports education and cooperative projects that protect working lands and water resources."]
    ],
    "solid waste":[
      ["Provide waste collection and disposal support","Coordinates county solid-waste services and disposal operations."],
      ["Operate waste facilities","Maintains transfer, convenience, recycling, and related solid-waste sites and equipment."],
      ["Reduce improper disposal","Supports recycling, public information, and responsible handling of eligible materials."]
    ],
    "tourism administration":[
      ["Promote Walton County destinations","Coordinates marketing and communications funded for eligible tourism purposes."],
      ["Support visitors and tourism partners","Provides visitor information, sales support, and destination services."],
      ["Administer tourism resources","Manages eligible Tourist Development Tax activities, contracts, planning, and accountability."]
    ],
    "tourism beach operations":[
      ["Maintain public beach access","Supports cleanliness, amenities, and daily operations at county beach locations."],
      ["Protect and restore beaches","Coordinates eligible renourishment, shoreline, and beach-preservation work."],
      ["Move visitors to the beach","Operates eligible transportation and tram activities that support beach access."]
    ],
    "tourism lifeguard services and beach safety":[
      ["Provide lifeguard coverage","Supports trained lifeguard presence at designated beach locations."],
      ["Respond to beach emergencies","Coordinates rescue and public-safety response when beachgoers need help."],
      ["Promote safer beach use","Provides warning, education, and operational support for changing beach conditions."]
    ],
    "veteran services":[
      ["Help veterans navigate benefits","Provides information and assistance with eligible federal, state, and local benefits."],
      ["Prepare and track claims","Assists veterans and families with applications, evidence, and claim follow-up."],
      ["Connect families with support","Refers veterans, dependents, and survivors to appropriate services and resources."]
    ]
  };

  var CHALLENGE_GROUPS = [
    {
      departments:["building construction and maintenance","engineering department","public works","solid waste","mossy head wastewater treatment facility","recreation","eagle springs golf and recreation center"],
      text:"Keeping pace with growth while maintaining aging assets, managing construction costs, and scheduling work with limited staff and equipment."
    },
    {
      departments:["building department","code compliance","planning","environmental resources","mosquito control"],
      text:"Responding to growing workloads while providing timely service, maintaining consistent enforcement, and adapting to changing regulatory and environmental conditions."
    },
    {
      departments:["emergency management","tourism lifeguard services and beach safety"],
      text:"Maintaining year-round readiness for unpredictable events, seasonal demand, severe weather, and competition for trained personnel and specialized equipment."
    },
    {
      departments:["extension office","housing and urban development","libraries","soil conservation","veteran services","probation"],
      text:"Meeting changing community needs while managing caseloads, maintaining public access, and delivering reliable service with limited staffing and program capacity."
    },
    {
      departments:["county administration","human resources","office of management and budget","office of the county attorney","purchasing","geographic info systems"],
      text:"Supporting a growing organization while recruiting and retaining skilled staff, modernizing systems, meeting compliance requirements, and responding to competing priorities."
    },
    {
      departments:["tourism administration","tourism beach operations"],
      text:"Balancing seasonal visitor demand and community impacts while protecting natural assets and using legally restricted tourism revenues for eligible purposes."
    },
    {
      departments:["eagle springs grill"],
      text:"Maintaining dependable customer service while managing food, supply, labor, and operating costs that can change quickly."
    }
  ];

  function challengeFor(key){
    for(var i=0;i<CHALLENGE_GROUPS.length;i++){
      if(CHALLENGE_GROUPS[i].departments.indexOf(key)!==-1) return CHALLENGE_GROUPS[i].text;
    }
    return "Maintaining reliable service while responding to growth, changing workloads, staffing capacity, rising costs, and evolving operational requirements.";
  }

  function normalize(value){
    return String(value||"").toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g," ").trim();
  }

  // SERVICES/CHALLENGE_GROUPS/SNAPSHOT_CAREER_STATS above are keyed by the
  // department name this data was originally written against -- a couple
  // of our own pages' actual <h1 class="page-title"> text (see render's
  // `key` below) differs slightly (a page named for the office rather
  // than the underlying department, or vice versa), which would otherwise
  // make render() bail out silently at "if(!services) return;" with the
  // page left unenhanced. Canonicalize those specific known variants here
  // rather than duplicating every data table under a second key.
  var DEPARTMENT_KEY_ALIASES={
    "county administration offices":"county administration",
    "environmental services":"environmental resources"
  };
  function canonicalDepartmentKey(key){
    return DEPARTMENT_KEY_ALIASES[key]||key;
  }

  function escapeHtml(value){
    return String(value===undefined||value===null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function money(value){return (Number(value)||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});}
  function compactMoney(value){
    var amount=Number(value)||0;
    var abs=Math.abs(amount);
    var sign=amount<0?'-':'';
    if(abs>=1000000) return sign+'$'+(abs/1000000).toLocaleString('en-US',{maximumFractionDigits:1})+'M';
    if(abs>=1000) return sign+'$'+Math.round(abs/1000).toLocaleString('en-US')+'K';
    return money(amount);
  }
  function sum(rows,field){return (rows||[]).reduce(function(total,row){return total+(Number(row[field])||0);},0);}

  // --- Trial-page adaptation (not in the reference repo) -----------------
  // In the reference site, nav.js itself wraps the four standard
  // department mounts (#department-expense-table etc.) in question-led
  // <details class="wc-department-question"> disclosures before this
  // script runs, and groups them in a <section class="wc-department-
  // questions">. This repo's assets/nav.js intentionally is NOT modified
  // for this one-page trial, so it never creates that structure. Without
  // it, configureExistingQuestion() below would find nothing to configure
  // and the "Citizen questions" accordion (cost-in-context calculators,
  // who-pays sheet, accountability copy, etc.) would end up empty. This
  // helper reproduces just that wrapping step, scoped to this file, so the
  // rest of department-services.js -- ported unchanged from the reference
  // repo -- gets the DOM shape it expects. Idempotent (checks for an
  // existing .wc-department-question ancestor) so it's safe to call from
  // every render() retry.
  var DEPARTMENT_QUESTION_COPY={
    'department-expense-table':['What does this service cost?','Complete FY 2027 cost by category, with history and account-level detail'],
    'department-revenue-table':['How is this service funded?','Funding sources, including whether property taxes support this department'],
    'department-performance-table':['How will we know the service is working?','Goals, measures, prior results, and FY 2027 targets'],
    'department-staffing-table':['Who does the work?','Authorized positions, staffing changes, and personnel detail']
  };
  // Our repo's own arrangeDepartmentFinancialDashboard() (assets/
  // budget-data.js) always groups #department-expense-table etc. into a
  // <section class="wc-department-financial-grid"> -- the reference
  // repo's version of that function skips building this grid whenever a
  // mount already sits inside .wc-department-question (because nav.js
  // wraps mounts before that function ever runs there). Since our nav.js
  // isn't being touched, this grid gets built first on this page too;
  // unwrap it before applying the disclosure wrapping below so the
  // resulting "Citizen questions" group ends up a direct, unnested
  // section under main#content instead of trapped inside a stray
  // 2-column grid wrapper built for a layout this feature replaces.
  function unwrapDepartmentFinancialGrid(){
    var grid=document.querySelector('.wc-department-financial-grid');
    if(!grid||!grid.parentNode) return;
    while(grid.firstChild) grid.parentNode.insertBefore(grid.firstChild,grid);
    grid.parentNode.removeChild(grid);
  }
  function ensureDepartmentQuestionDisclosures(){
    unwrapDepartmentFinancialGrid();
    Object.keys(DEPARTMENT_QUESTION_COPY).forEach(function(id){
      var mount=document.getElementById(id);
      if(!mount||mount.closest('.wc-department-question')) return;
      var copy=DEPARTMENT_QUESTION_COPY[id];
      var details=document.createElement('details');
      details.className='wc-simple-disclosure wc-department-question';
      var summary=document.createElement('summary');
      var summaryCopy=document.createElement('span');
      summaryCopy.className='wc-simple-disclosure-summary';
      summaryCopy.textContent=copy[0];
      var note=document.createElement('small');
      note.textContent=copy[1];
      summaryCopy.appendChild(note);
      summary.appendChild(summaryCopy);
      var body=document.createElement('div');
      body.className='wc-simple-disclosure-body';
      mount.parentNode.insertBefore(details,mount);
      details.appendChild(summary);
      details.appendChild(body);
      body.appendChild(mount);
    });
    var orderedQuestionIds=['department-expense-table','department-revenue-table','department-performance-table','department-staffing-table'];
    var orderedQuestions=orderedQuestionIds.map(function(id){
      var mount=document.getElementById(id);
      return mount?mount.closest('.wc-department-question'):null;
    }).filter(Boolean);
    if(orderedQuestions.length){
      var questionGroup=orderedQuestions[0].closest('.wc-department-questions');
      if(!questionGroup){
        questionGroup=document.createElement('section');
        questionGroup.className='wc-department-questions';
        questionGroup.setAttribute('aria-label','Department budget questions');
        orderedQuestions[0].parentNode.insertBefore(questionGroup,orderedQuestions[0]);
      }
      orderedQuestions.forEach(function(question){questionGroup.appendChild(question);});
    }
  }
  // --- end trial-page adaptation ------------------------------------------

  // Department Snapshot's "View Budget Graph": Personnel/Operating/Capital
  // spending by fiscal year, for whatever years this department actually
  // has data in (see renderSnapshotChart's leading-zero trim below). Same
  // FY2020-FY2027 column set used everywhere else on the site
  // (BUDGET_LINE_PRIOR_YEAR_COLUMNS in budget-data.js), duplicated here
  // since department-services.js runs in its own scope and only needs the
  // field/label pairs, not the rest of that module's machinery.
  var SNAPSHOT_CHART_YEARS=[
    {field:'FY2020_Actual',label:'2020'},
    {field:'FY2021_Actual',label:'2021'},
    {field:'FY2022_Actual',label:'2022'},
    {field:'FY2023_Actual',label:'2023'},
    {field:'FY2024_Actual',label:'2024'},
    {field:'FY2025_Actual',label:'2025'},
    {field:'FY2026_Original_Budget',label:'2026'},
    {field:'FY2027_Proposed',label:'2027'}
  ];
  var SNAPSHOT_CHART_CATEGORIES=[
    {label:'Personnel Services',type:'Personnel Services',color:'#0b7741'},
    {label:'Operating Expenditures',type:'Operating Expenditures',color:'#c2ac5f'},
    {label:'Capital Outlay',type:'Capital Outlay',color:'#24344d'}
  ];
  // "Did you know" career-wage sidebar on the Budget Graph. Every figure
  // here is a real, currently-published Florida BLS Occupational
  // Employment & Wage Statistics estimate (accessed via O*NET Online,
  // which sources directly from BLS OEWS) for one occupation broadly
  // relevant to that department's work -- not an extrapolation or a
  // future-year projection, since BLS doesn't publish one. Departments
  // without a verified entry here simply don't get the sidebar, rather
  // than showing a guessed figure.
  // displayLabel is the generic, relatable term shown in the sentence
  // ("Emergency Management staff"); occupation is the specific BLS/O*NET
  // title the wage figure actually reflects, kept in the source citation
  // so the generic phrasing never disconnects from what was measured.
  var SNAPSHOT_CAREER_STATS={
    'emergency management':{displayLabel:'Emergency Management staff',occupation:'Emergency Management Directors',wage:99020,socCode:'11-9161'},
    'human resources':{displayLabel:'Human Resources staff',occupation:'Human Resources Specialists',wage:66410,socCode:'13-1071'},
    'building department':{displayLabel:'Building Department staff',occupation:'Construction and Building Inspectors',wage:68170,socCode:'47-4011'},
    'engineering department':{displayLabel:'Engineering staff',occupation:'Civil Engineers',wage:98570,socCode:'17-2051'},
    'libraries':{displayLabel:'Library staff',occupation:'Librarians and Media Collections Specialists',wage:67060,socCode:'25-4022'},
    'office of management and budget':{displayLabel:'Budget Office staff',occupation:'Budget Analysts',wage:84170,socCode:'13-2031'},
    'office of the county attorney':{displayLabel:"County Attorney's Office staff",occupation:'Lawyers',wage:133180,socCode:'23-1011'},
    'public works':{displayLabel:'Public Works staff',occupation:'Highway Maintenance Workers',wage:42210,socCode:'47-4051'},
    'solid waste':{displayLabel:'Solid Waste staff',occupation:'Refuse and Recyclable Material Collectors',wage:47820,socCode:'53-7081'},
    'county administration':{displayLabel:'County Administration staff',occupation:'General and Operations Managers',wage:101580,socCode:'11-1021'},
    'purchasing':{displayLabel:'Purchasing staff',occupation:'Purchasing Agents',wage:72850,socCode:'13-1023'},
    'planning':{displayLabel:'Planning staff',occupation:'Urban and Regional Planners',wage:80720,socCode:'19-3051'}
  };
  var CHART_JS_SRC='https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js';
  var chartJsLoadPromise=null;
  function ensureChartJs(){
    if(typeof window.Chart!=='undefined') return Promise.resolve();
    if(chartJsLoadPromise) return chartJsLoadPromise;
    chartJsLoadPromise=new Promise(function(resolve,reject){
      var existing=document.getElementById('wc-snapshot-chartjs');
      if(existing){
        existing.addEventListener('load',function(){resolve();});
        existing.addEventListener('error',function(){reject(new Error('Failed to load Chart.js'));});
        return;
      }
      var script=document.createElement('script');
      script.id='wc-snapshot-chartjs';
      script.src=CHART_JS_SRC;
      script.onload=function(){resolve();};
      script.onerror=function(){reject(new Error('Failed to load Chart.js'));};
      document.head.appendChild(script);
    });
    return chartJsLoadPromise;
  }
  function bindSnapshotBudgetGraph(button,expenses,staffing,deptKey,deptLabel){
    button.addEventListener('click',function(){
      if(!window.WCBudgetData||typeof window.WCBudgetData.openBudgetDetailPanel!=='function') return;
      var canvasId='wc-snapshot-chart-'+Math.random().toString(36).slice(2);
      var chartHtml='<div class="wc-snapshot-chart-wrap"><canvas id="'+canvasId+'"></canvas></div>'+
        '<div class="wc-snapshot-chart-legend" id="'+canvasId+'-legend"></div>'+
        '<p class="wc-snapshot-chart-fte-note"><span class="wc-snapshot-chart-fte-marker"></span> A triangle on Personnel Services marks a year where authorized FTE grew &mdash; that year&rsquo;s cost increase includes added positions, not just pay or benefit changes. FTE-by-year detail is available for FY 2025&ndash;FY 2027 only.</p>'+
        '<p class="wc-snapshot-chart-note">Personnel, operating, and capital spending by fiscal year. Earlier years are actuals, FY 2026 is the adopted budget, and FY 2027 is the tentative budget.</p>';
      var careerStat=SNAPSHOT_CAREER_STATS[deptKey];
      var careerHtml=careerStat?(
        '<aside class="wc-snapshot-career-fact">'+
          '<p class="wc-snapshot-career-fact-lead">In Florida, <strong>'+escapeHtml(careerStat.displayLabel)+'</strong> currently earn an average of <strong>'+money(careerStat.wage)+'</strong> a year.</p>'+
          '<p class="wc-snapshot-career-fact-source">Based on '+escapeHtml(careerStat.occupation)+' wages. Source: U.S. Bureau of Labor Statistics, Occupational Employment &amp; Wage Statistics (Florida), via <a href="https://www.onetonline.org/link/localwages/'+encodeURIComponent(careerStat.socCode)+'.00?st=FL" target="_blank" rel="noopener noreferrer">O*NET OnLine</a>.</p>'+
        '</aside>'
      ):'';
      var html=careerHtml?'<div class="wc-snapshot-chart-layout"><div class="wc-snapshot-chart-main">'+chartHtml+'</div>'+careerHtml+'</div>':chartHtml;
      var body=window.WCBudgetData.openBudgetDetailPanel(button,{title:'Budget Graph',kicker:deptLabel,bodyClassName:'wc-snapshot-chart-body',html:html});
      ensureChartJs().then(function(){
        renderSnapshotChart(document.getElementById(canvasId),document.getElementById(canvasId+'-legend'),expenses,staffing);
      }).catch(function(){
        if(body) body.insertAdjacentHTML('beforeend','<p class="wc-data-error">Unable to load the chart.</p>');
      });
    });
  }
  function bindSnapshotWhoPaysSheet(button,html,departmentLabel){
    button.addEventListener('click',function(){
      if(!window.WCBudgetData||typeof window.WCBudgetData.openBudgetDetailPanel!=='function') return;
      // No bodyClassName here (unlike the reference repo's wc-who-pays-sheet-
      // body, which capped this table's width at 1120px, narrower than
      // every other snapshot popup) -- matches the Operating Budget Ledger
      // and every other popup's full modal width.
      window.WCBudgetData.openBudgetDetailPanel(button,{title:'Who Pays Ledger',kicker:departmentLabel||'',html:html||'<div class="wc-data-empty">No dedicated funding sources are listed for this department.</div>'});
    });
  }
  // "View Personnel Ledger" on the Position Summary card: rather than
  // duplicating the ledger's own popup content through openBudgetDetailPanel
  // (like the other snapshot buttons do), this just clicks the real
  // "Staffing and Cost by Position" trigger that budget-data.js already
  // rendered inside #department-staffing-table -- that mount gets
  // physically relocated into this same Department Snapshot section later
  // in render() (see the staffingMount/snapshot.appendChild below), so its
  // trigger is on-page and clickable by the time a user could actually
  // click this button. Reusing the real trigger (instead of re-deriving
  // the detail HTML here) keeps this button, the inline trigger, and the
  // shared budget-detail modal's aria-expanded state all in sync through
  // budget-data.js's own single delegated click handler.
  function bindSnapshotPersonnelLedgerTrigger(button){
    button.addEventListener('click',function(){
      var mount=document.getElementById('department-staffing-table');
      var trigger=mount&&mount.querySelector('.wc-view-budget-lines-toggle[data-target]');
      if(trigger){trigger.click();return;}
      if(mount) mount.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }
  function bindSnapshotRevenueSheet(button,mount,departmentLabel){
    button.addEventListener('click',function(){
      if(!window.WCBudgetData||typeof window.WCBudgetData.openBudgetDetailPanel!=='function') return;
      var detail=mount&&mount.querySelector('.wc-budget-lines-detail');
      var html=detail?detail.innerHTML:'<div class="wc-data-empty">No revenue budget detail is available for this department.</div>';
      window.WCBudgetData.openBudgetDetailPanel(button,{title:'Revenue Budget Ledger',kicker:departmentLabel||'',html:html});
    });
  }
  function bindSnapshotOperatingBudgetSheet(button,mount,departmentLabel){
    button.addEventListener('click',function(){
      if(!window.WCBudgetData||typeof window.WCBudgetData.openBudgetDetailPanel!=='function') return;
      var detail=mount&&mount.querySelector('.wc-budget-lines-detail');
      var html='<div class="wc-data-empty">No operating budget detail is available for this department.</div>';
      if(detail){
        var operatingDetail=detail.cloneNode(true);
        retainBudgetRows(operatingDetail,function(category){return category==='personnel services'||category==='operating expenditures';});
        addBudgetTotals(operatingDetail);
        html=operatingDetail.innerHTML;
      }
      window.WCBudgetData.openBudgetDetailPanel(button,{title:'Operating Budget Ledger',kicker:departmentLabel||'',html:html});
    });
  }
  function bindSnapshotInformationSheet(button,sheetTitle,html,departmentLabel,bodyClassName){
    button.addEventListener('click',function(){
      if(!window.WCBudgetData||typeof window.WCBudgetData.openBudgetDetailPanel!=='function') return;
      window.WCBudgetData.openBudgetDetailPanel(button,{title:sheetTitle,kicker:departmentLabel||'',bodyClassName:bodyClassName||'',html:html});
    });
  }
  // Personnel Services can grow either because pay/benefits went up for
  // the same headcount, or because the department added positions -- the
  // dollar figure alone can't tell those apart. Staffing rows only carry
  // FTE for 2024-2027 (unlike expense rows, which go back to 2020), so
  // the FTE-vs-cost marker below can only ever cover the FY2025-FY2027
  // transitions; earlier years render as plain, unmarked points.
  function personnelFteByYear(staffing){
    var map={};
    [2024,2025,2026,2027].forEach(function(year){
      map[year]=(staffing||[]).reduce(function(total,row){return total+(Number(row[year])||0);},0);
    });
    return map;
  }
  function renderSnapshotChart(canvas,legendEl,expenses,staffing){
    if(!canvas||typeof window.Chart==='undefined') return;
    var existingChart=window.Chart.getChart(canvas);
    if(existingChart) existingChart.destroy();
    var years=SNAPSHOT_CHART_YEARS;
    var firstNonZero=years.length-1;
    for(var i=0;i<years.length;i++){
      var total=SNAPSHOT_CHART_CATEGORIES.reduce(function(catSum,cat){
        return catSum+expenses.filter(function(row){return row.Object_Type===cat.type;}).reduce(function(rowSum,row){return rowSum+(Number(row[years[i].field])||0);},0);
      },0);
      if(total!==0){firstNonZero=i;break;}
    }
    var trimmedYears=years.slice(firstNonZero);
    var fteByYear=personnelFteByYear(staffing);
    var datasets=SNAPSHOT_CHART_CATEGORIES.map(function(cat){
      var rows=expenses.filter(function(row){return row.Object_Type===cat.type;});
      var dataset={
        label:cat.label,
        data:trimmedYears.map(function(y){return rows.reduce(function(total,row){return total+(Number(row[y.field])||0);},0);}),
        borderColor:cat.color,
        backgroundColor:cat.color,
        baseColor:cat.color,
        tension:0.3,
        baseRadius:3,
        baseHoverRadius:5,
        pointRadius:3,
        pointHoverRadius:5,
        borderWidth:2.5
      };
      if(cat.type==='Personnel Services'){
        var fteState=trimmedYears.map(function(y){
          var year=Number(y.label);
          var current=fteByYear[year];
          var prior=fteByYear[year-1];
          if(current===undefined||prior===undefined) return 'unknown';
          var delta=current-prior;
          if(delta>0.001) return 'up';
          if(delta<-0.001) return 'down';
          return 'flat';
        });
        var baseRadius=fteState.map(function(state){return state==='up'?7:3;});
        var baseHoverRadius=fteState.map(function(state){return state==='up'?9:5;});
        dataset.fteState=fteState;
        dataset.baseRadius=baseRadius;
        dataset.baseHoverRadius=baseHoverRadius;
        dataset.pointRadius=baseRadius;
        dataset.pointHoverRadius=baseHoverRadius;
        dataset.pointStyle=fteState.map(function(state){return state==='up'?'triangle':'circle';});
        dataset.pointBackgroundColor=fteState.map(function(state){return state==='up'?'#d1be78':cat.color;});
        dataset.pointBorderColor=fteState.map(function(state){return state==='up'?'#8a6d1f':cat.color;});
      }
      return dataset;
    }).filter(function(dataset){return dataset.data.some(function(value){return value!==0;});});
    var wrap=canvas.closest('.wc-snapshot-chart-wrap');
    if(!datasets.length){
      if(wrap) wrap.outerHTML='<p class="wc-data-empty">No historical spending data is available for this department.</p>';
      return;
    }
    var chart=new window.Chart(canvas,{
      type:'line',
      data:{labels:trimmedYears.map(function(y){return y.label;}),datasets:datasets},
      options:{
        responsive:true,
        maintainAspectRatio:false,
        interaction:{mode:'nearest',intersect:false},
        plugins:{
          legend:{display:false},
          tooltip:{callbacks:{label:function(context){
            var lines=[context.dataset.label+': '+money(context.parsed.y)];
            var state=context.dataset.fteState&&context.dataset.fteState[context.dataIndex];
            if(state==='up') lines.push('Includes additional FTE(s) added that year');
            else if(state==='down') lines.push('FTE count decreased that year');
            else if(state==='flat') lines.push('No FTE change -- reflects pay/benefits, not new positions');
            return lines;
          }}}
        },
        scales:{y:{ticks:{callback:function(value){return compactMoney(value);}}}}
      }
    });
    if(legendEl){
      var isolatedIndex=-1;
      function applyIsolation(){
        chart.data.datasets.forEach(function(dataset,index){
          var isDimmed=isolatedIndex!==-1&&index!==isolatedIndex;
          dataset.borderColor=isDimmed?hexToRgba(dataset.baseColor,0.15):dataset.baseColor;
          dataset.backgroundColor=dataset.borderColor;
          dataset.borderWidth=isDimmed?1.5:2.5;
          dataset.pointRadius=isDimmed?0:dataset.baseRadius;
          dataset.pointHoverRadius=isDimmed?0:dataset.baseHoverRadius;
        });
        chart.update();
        legendEl.querySelectorAll('.wc-snapshot-chart-legend-item').forEach(function(item,index){
          item.classList.toggle('is-active',index===isolatedIndex);
          item.classList.toggle('is-dimmed',isolatedIndex!==-1&&index!==isolatedIndex);
        });
      }
      legendEl.innerHTML=datasets.map(function(dataset,index){return '<button type="button" class="wc-snapshot-chart-legend-item" data-legend-index="'+index+'"><i style="background:'+dataset.borderColor+'"></i>'+escapeHtml(dataset.label)+'</button>';}).join('');
      legendEl.querySelectorAll('.wc-snapshot-chart-legend-item').forEach(function(item,index){
        item.addEventListener('click',function(){
          isolatedIndex=isolatedIndex===index?-1:index;
          applyIsolation();
        });
      });
    }
  }
  function hexToRgba(hex,alpha){
    var normalized=hex.replace('#','');
    var r=parseInt(normalized.substring(0,2),16);
    var g=parseInt(normalized.substring(2,4),16);
    var b=parseInt(normalized.substring(4,6),16);
    return 'rgba('+r+','+g+','+b+','+alpha+')';
  }

  var QUESTION_ICONS={
    cost:'<circle cx="12" cy="12" r="9"/><path d="M15 8.5c-.6-.9-1.6-1.5-3-1.5-1.7 0-3 1-3 2.5s1.3 2.5 3 2.5 3 1 3 2.5-1.3 2.5-3 2.5c-1.4 0-2.4-.6-3-1.5M12 5v14"/>',
    capital:'<path d="M4 21V8h16v13M2 21h20M7 8V4h10v4M8 13h3M13 13h3M8 17h3M13 17h3"/>',
    contracts:'<path d="M7 3h10v4H7zM5 7h14v14H5zM8 12h8M8 16h5M9 5h6"/>',
    funding:'<path d="M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M3 18h18M2 7l10-4 10 4v3H2z"/>',
    services:'<path d="M9 5h6M9 3h6v4H9zM7 5H5v16h14V5h-2M8 12l2 2 5-5M8 18h8"/>',
    added:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    collaborate:'<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-4 2-7 5-7s5 3 5 7M13 15c1-1.2 2.3-1.8 4-1.8 2.7 0 4.5 2.7 4.5 6.8M11 10l3-1"/>',
    accountable:'<path d="M4 18l5-5 4 3 7-9M15 7h5v5"/>',
    staffing:'<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-4 2.5-7 6-7s6 3 6 7M14 14c3.5 0 6 2.3 6 6"/>',
    changing:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',
    challenges:'<path d="M12 3 2.5 20h19zM12 9v5M12 18h.01"/>',
    snapshot:'<path d="M3 10h18M5 10V20M9 10V20M15 10V20M19 10V20M3 20h18M2 7l10-4 10 4v3H2z"/>'
  };
  function icon(nameOrPath){var content=QUESTION_ICONS[nameOrPath]||'<path d="'+escapeHtml(nameOrPath)+'"/>';return '<span class="wc-profile-question-icon" aria-hidden="true"><svg viewBox="0 0 24 24">'+content+'</svg></span>';}
  function question(label,body,path,className){
    var details=document.createElement('details');
    details.className='wc-simple-disclosure wc-department-question wc-profile-question'+(className?' '+className:'');
    details.innerHTML='<summary>'+icon(path||'M5 12h14M12 5v14')+'<span class="wc-simple-disclosure-summary"><b>'+escapeHtml(label)+'</b></span></summary><div class="wc-simple-disclosure-body">'+body+'</div>';
    return details;
  }
  function configureExistingQuestion(id,label,path){
    var mount=document.getElementById(id);
    var details=mount&&mount.closest('.wc-department-question');
    if(!details) return null;
    details.classList.add('wc-profile-question');
    var summary=details.querySelector(':scope>summary');
    if(summary) summary.innerHTML=icon(path)+'<span class="wc-simple-disclosure-summary"><b>'+escapeHtml(label)+'</b></span>';
    return details;
  }
  document.addEventListener('click',function(event){
    var button=event.target.closest('.wc-profile-fund-prior-toggle');
    if(!button) return;
    var sheet=button.closest('.wc-profile-fund-sheet-wrap');
    if(!sheet) return;
    var expanded=button.getAttribute('aria-expanded')==='true';
    button.setAttribute('aria-expanded',String(!expanded));
    button.textContent=expanded?'View Prior Years':'Hide Prior Years';
    sheet.classList.toggle('show-prior-years',!expanded);
  });
  function financeStat(label,amount,prior,total){
    var change=amount-prior;
    var pct=prior?change/prior*100:0;
    var pctText=prior?(pct>0?'+':'')+pct.toFixed(1)+'%':amount?'New':'0.0%';
    var direction=change>0?'Increasing':change<0?'Decreasing':'Unchanged';
    var trendClass=change>0?'is-up':change===0?'is-flat':'is-down';
    return '<article class="wc-profile-finance-stat"><span>'+escapeHtml(label)+'</span><div class="wc-profile-finance-main"><strong>'+money(amount)+'</strong><div class="wc-profile-finance-change '+trendClass+'"><em>'+direction+'</em>'+(change?(change>0?'+':'−')+money(Math.abs(change)):'$0')+'</div><div class="wc-profile-finance-percent '+trendClass+'">'+pctText+'</div></div><small>'+(total?((amount/total)*100).toFixed(1):'0.0')+'% of total</small></article>';
  }
  function costContextValue(label,value,id,explanation){
    return '<div><div class="wc-profile-context-label"><span>'+escapeHtml(label)+'</span><span class="wc-profile-context-tooltip"><button type="button" aria-label="How '+escapeHtml(label.toLowerCase())+' is calculated" aria-describedby="'+id+'">i</button><span class="wc-profile-context-tooltip-text" id="'+id+'" role="tooltip">'+escapeHtml(explanation)+'</span></span></div><strong>'+value+'</strong></div>';
  }
  var SNAPSHOT_TOOLTIPS={
    'Personnel Services':'Covers employee compensation and benefits, including salaries, overtime, weekend and holiday pay, seasonal workers, FICA, Florida Retirement System (FRS) contributions, health insurance, workers’ compensation, life insurance, and paid leave buybacks.',
    'Operating Expenditures':'Covers the day-to-day costs of providing County services, including utilities, fuel, maintenance, software, office supplies, communications, training, and other routine operating expenses. Contractual services and internal service charges are shown as their own lines below.',
    'Contractual Services':'Covers payments made under an identified contract or service agreement, such as professional services, engineering, legal, auditing, IT services, and other outside vendor services.',
    'Internal Service Charges':'Covers charges billed to this fund by an internal service fund -- for example fleet maintenance, information technology, or self-insurance -- for services it provides countywide.',
    'Capital Outlay':'Covers major investments in long-term County assets, including vehicles, machinery and equipment, technology systems, buildings, facility improvements, roads, drainage, parks, and other infrastructure projects.',
    'General Government Taxes':'Ad valorem, tourist development, sales surtax, fuel taxes, and other locally levied taxes.',
    'Intergovernmental Revenues':'Grants, shared revenues, and payments received from federal, state, or other governmental sources.',
    'Charges for Services':'Fees charged for specific County services provided to residents, businesses, or other users.',
    'Permits Fees and Special Assessments':'Revenue from permits, licenses, regulatory fees, and special assessments.',
    'Permits, Fees, and Special Assessments':'Revenue from permits, licenses, regulatory fees, and special assessments.',
    'Miscellaneous Revenue':'Interest earnings, reimbursements, donations, and other revenue not classified elsewhere.',
    'Other Sources':'Transfers in, accumulated resources, debt proceeds, and other non-recurring funding sources.',
    'Judgments, Fines and Forfeits':'Revenue from judgments, fines, penalties, and forfeitures.'
  };
  function snapshotTooltip(label){var message=SNAPSHOT_TOOLTIPS[label];return message?'<button type="button" class="wc-budget-line-tooltip-anchor" aria-label="'+escapeHtml(label)+' information" data-wc-tooltip="'+escapeHtml(message)+'">i</button>':'';}
  function bindSnapshotTooltips(container){
    container.querySelectorAll('.wc-budget-line-tooltip-anchor').forEach(function(anchor){
      if(anchor.getAttribute('data-wc-tooltip-bound')==='true') return;
      function show(){var bubble=document.querySelector('.wc-budget-line-tooltip-bubble');if(!bubble){bubble=document.createElement('div');bubble.className='wc-budget-line-tooltip-bubble';bubble.setAttribute('role','tooltip');document.body.appendChild(bubble);}bubble.textContent=anchor.getAttribute('data-wc-tooltip')||'';bubble.classList.add('is-visible');var rect=anchor.getBoundingClientRect();var width=window.innerWidth<=600?Math.max(220,window.innerWidth-32):Math.min(320,window.innerWidth-32);var left=Math.max(16,Math.min(rect.left+rect.width/2-width/2,window.innerWidth-width-16));bubble.style.setProperty('width',width+'px','important');bubble.style.setProperty('left',left+'px','important');bubble.style.setProperty('top',(rect.bottom+8)+'px','important');if(rect.bottom+8+bubble.offsetHeight>window.innerHeight-16) bubble.style.setProperty('top',Math.max(16,rect.top-bubble.offsetHeight-8)+'px','important');}
      function hide(){var bubble=document.querySelector('.wc-budget-line-tooltip-bubble');if(bubble) bubble.classList.remove('is-visible');}
      anchor.addEventListener('mouseenter',show);anchor.addEventListener('focus',show);anchor.addEventListener('mouseleave',hide);anchor.addEventListener('blur',hide);anchor.setAttribute('data-wc-tooltip-bound','true');
    });
  }
  function departmentFundingBuckets(rows){
    var buckets={};
    function add(label,amount,explanation){
      if(!buckets[label]) buckets[label]={label:label,amount:0,explanation:explanation};
      buckets[label].amount+=Math.abs(Number(amount)||0);
    }
    (rows||[]).forEach(function(row){
      var name=String(row.Revenue_Name||'');
      var type=String(row.Revenue_Type||'');
      var amount=row.FY2027_Proposed;
      if(/ad valorem taxes/i.test(name)) return;
      if(/tourist development|tdc public safety/i.test(name)) add('Visitor-funded revenue',amount,'Tourist Development Tax and related reimbursements are supported by taxes collected from short-term lodging stays.');
      else if(/local government 1\/2 cent sales tax|discretionary sales surtax/i.test(name)) add('Sales-tax revenue',amount,'Assigned local sales-tax revenue. Sales taxes are paid through taxable purchases made by residents and visitors.');
      else if(/fuel tax/i.test(name)) add('Fuel-tax revenue',amount,'Constitutional, county, municipal, voted, or local-option fuel taxes assigned to this department.');
      else if(/permits fees|charges for services|fines and forfeits/i.test(type)||/fees?|charges?|fines?|rentals?/i.test(name)) add('Fees and service charges',amount,'Fees, permits, fines, rentals, or service charges paid by users of a regulated activity or County service.');
      else if(/grant/i.test(name)) add('Grant funding',amount,'State or federal grant revenue assigned to this department.');
      else if(/interfund group transfer|balance brought forward/i.test(name)||/other sources/i.test(type)) add('Transfers and prior resources',amount,'Transfers from another County fund or accumulated resources carried forward for an authorized use.');
      else if(/indirect administrative fees/i.test(name)) add('Internal administrative fees',amount,'Charges allocated to other County funds for central administrative support.');
      else if(/intergovernmental revenues/i.test(type)) add('State and shared revenue',amount,'State-shared or other intergovernmental revenue assigned to this department.');
      else add('Other non-property revenue',amount,'Other assigned revenue that does not come from ad valorem property taxes.');
    });
    return Object.keys(buckets).map(function(label){return buckets[label];}).filter(function(item){return item.amount>0;}).sort(function(a,b){return b.amount-a.amount;});
  }
  function departmentFeePayerCopy(key){
    if(key==='code compliance') return {label:'Permit, compliance, and fine revenue',payer:'Paid by property owners, businesses, permit applicants, and others using a regulated activity or resolving a code case.'};
    if(key==='building department') return {label:'Building permit and service fees',payer:'Paid by applicants, property owners, contractors, and developers receiving building review, permitting, or inspection services.'};
    if(key==='eagle springs golf and recreation center') return {label:'Golf and recreation user revenue',payer:'Paid by golfers, event participants, renters, and other people who choose to use the facility.'};
    if(key==='eagle springs grill') return {label:'Food, beverage, and customer revenue',payer:'Paid by grill customers and event patrons through their purchases.'};
    if(key==='recreation') return {label:'Program, rental, and user fees',payer:'Paid by participants and people reserving or using fee-supported recreation programs and facilities.'};
    if(key==='libraries') return {label:'Library service charges',payer:'Paid only by users incurring the applicable charge; ordinary library access is not allocated evenly as a household fee.'};
    return {label:'Fees and charges for this department',payer:'Paid by the residents, businesses, applicants, customers, or other users receiving the specific fee-supported service.'};
  }
  function fundingPayerSummary(rows,key){
    var householdCount=34362;
    function totalWhere(test){return (rows||[]).reduce(function(total,row){return test(String(row.Revenue_Name||''),String(row.Revenue_Type||''),row)?total+Math.abs(Number(row.FY2027_Proposed)||0):total;},0);}
    var sheriffPropertyTransfer=key==='sheriff'||key==='sheriff s office';
    var isSheriffE911=function(name,type,row){return sheriffPropertyTransfer&&/interfund group transfer/i.test(name)&&/e911/i.test(String(row&&row.Note||''));};
    var isPropertyTax=function(name,type,row){return /ad valorem taxes/i.test(name)||(sheriffPropertyTransfer&&/interfund group transfer/i.test(name)&&!isSheriffE911(name,type,row)&&/property tax/i.test(String(row&&row.Note||'')));};
    var isTouristTax=function(name){return /tourist development|tdc public safety/i.test(name);};
    var isSalesTax=function(name){return /local government 1\/2 cent sales tax|discretionary sales surtax|local option sales tax/i.test(name);};
    var isIndirectAdmin=function(name){return /indirect administrative fees/i.test(name);};
    var isFee=function(name,type){return !isIndirectAdmin(name)&&(/permits fees|charges for services|fines and forfeits/i.test(type)||/fees?|charges?|fines?|rentals?|admissions?|sales revenue|pro shop|food|beverage/i.test(name));};
    var isFuelTax=function(name){return /fuel tax/i.test(name);};
    var isStateFederal=function(name,type){return !/tourist development|tdc public safety|fuel tax|local government 1\/2 cent sales tax|discretionary sales surtax|local option sales tax|fees?|charges?|fines?|rentals?/i.test(name)&&(/grant|state revenue share|state shared/i.test(name)||/intergovernmental revenues/i.test(type));};
    var isInternalFunding=function(name,type,row){return !isPropertyTax(name,type,row)&&!isSheriffE911(name,type,row)&&!isIndirectAdmin(name)&&(/interfund group transfer|balance brought forward/i.test(name)||/other sources/i.test(type));};
    var propertyTax=totalWhere(isPropertyTax);
    var touristTax=totalWhere(isTouristTax);
    var salesTax=totalWhere(isSalesTax);
    var fees=totalWhere(isFee);
    var fuelTax=totalWhere(isFuelTax);
    var stateFederal=totalWhere(isStateFederal);
    var sheriffE911=totalWhere(isSheriffE911);
    var indirectAdmin=totalWhere(isIndirectAdmin);
    var internalFunding=totalWhere(isInternalFunding);
    var totalRevenue=(rows||[]).reduce(function(total,row){return total+Math.abs(Number(row.FY2027_Proposed)||0);},0);
    var otherFunding=Math.max(0,totalRevenue-propertyTax-touristTax-salesTax-fees-fuelTax-stateFederal-sheriffE911-indirectAdmin-internalFunding);
    var payerRows=[];
    function precise(value){return Number(value||0).toLocaleString('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2});}
    function addPayer(payer,source,amount,impact,explanation){payerRows.push({payer:payer,source:source,amount:amount,impact:impact,explanation:explanation});}
    if(propertyTax){
      var propertyTaxSource=sheriffPropertyTransfer?'Ad valorem property taxes and property-tax transfer':'Ad valorem property taxes';
      var residentialPropertyTax=propertyTax*.879;
      var commercialPropertyTax=propertyTax-residentialPropertyTax;
      var residentialAnnual=residentialPropertyTax/householdCount;
      addPayer('Residential property owners',propertyTaxSource,residentialPropertyTax,precise(residentialAnnual)+' per household annually ('+precise(residentialAnnual/12)+' monthly)','Estimated using residential property’s 87.9% share of Walton County real-property just value. This is a value-based planning proxy, not an audited allocation or an individual household tax bill.');
      addPayer('Commercial and other property owners',propertyTaxSource,commercialPropertyTax,'Estimated 12.1% commercial and other-property share','Combines commercial and industrial property with government, institutional, agricultural, vacant-acreage, and other real-property classifications. This is a value-based planning proxy, not a direct measure of taxes collected by sector.');
    }
    if(salesTax){
      var nonResidentShare=salesTax*.68;
      var residentShare=salesTax-nonResidentShare;
      var residentHouseholdAnnual=residentShare/householdCount;
      addPayer('Non-residents','Sales-tax revenue',nonResidentShare,'Estimated 68% non-resident share',"Walton County's visitor study found visitors account for 68% of retail spending. That share is used as a planning estimate, not an audited allocation of this specific sales-tax account.");
      addPayer('Residents','Sales-tax revenue',residentShare,precise(residentHouseholdAnnual)+' per household annually ('+precise(residentHouseholdAnnual/12)+' monthly)','The estimated 32% resident share is divided by 34,362 Walton County households. This household equivalent is a planning estimate, not an audited allocation or an individual household tax bill.');
    }
    if(touristTax){addPayer('Overnight visitors','Tourist Development Tax and reimbursements',touristTax,'Primarily paid by visitors and other non-residents','Tourist Development Tax is charged on eligible short-term lodging in Walton County.');}
    if(fees&&key==='eagle springs golf and recreation center'){
      var membershipFees=totalWhere(function(name){return /membership fees/i.test(name);});
      var greenFees=totalWhere(function(name){return /green fees/i.test(name);});
      var cartFees=totalWhere(function(name){return /cart fees/i.test(name);});
      var proShopSales=totalWhere(function(name){return /pro shop sales/i.test(name);});
      var golfNonTaxable=totalWhere(function(name){return /golf course non-taxable/i.test(name);});
      var poolEntryFees=totalWhere(function(name){return /pool entry fees/i.test(name);});
      var identifiedGolfFees=membershipFees+greenFees+cartFees+proShopSales+golfNonTaxable+poolEntryFees;
      if(membershipFees) addPayer('Golf members','Membership fees',membershipFees,'Paid through annual or recurring memberships','Membership revenue is paid by customers choosing ongoing access to eligible golf-course services.');
      if(greenFees) addPayer('Golfers','Green fees',greenFees,'Paid when a round of golf is played','Green fees are paid directly by golfers using the course.');
      if(cartFees) addPayer('Golf-cart users','Cart fees',cartFees,'Paid when a golf cart is rented','Cart revenue is paid by customers choosing or requiring cart use during play.');
      if(proShopSales) addPayer('Pro shop customers','Pro shop sales',proShopSales,'Paid through merchandise and related purchases','This revenue comes from voluntary purchases made at the golf-course pro shop.');
      if(golfNonTaxable) addPayer('Other golf-course customers','Other non-taxable golf-course revenue',golfNonTaxable,'Paid through applicable golf-course transactions','This line records eligible golf-course customer revenue classified as non-taxable in the budget records.');
      if(poolEntryFees) addPayer('Pool visitors','Pool entry fees',poolEntryFees,'Paid when the pool is used','Pool entry revenue is paid by customers choosing to use the facility.');
      if(fees>identifiedGolfFees) addPayer('Other facility users','Other golf and recreation charges',fees-identifiedGolfFees,'Paid when the related activity or service is used','This amount includes remaining user-supported facility revenue not shown separately above.');
    }else if(fees&&sheriffPropertyTransfer){
      var ambulanceFees=totalWhere(function(name){return /ambulance fees/i.test(name);});
      var prisonerHousing=totalWhere(function(name){return /housing prisoners/i.test(name);});
      var prisonerWorkDetail=totalWhere(function(name){return /prisoner work detail/i.test(name);});
      var msbuFees=totalWhere(function(name){return /msbu fees/i.test(name);});
      var animalShelterFees=totalWhere(function(name){return /animal shelter fees/i.test(name);});
      var civilProcessFees=totalWhere(function(name){return /civil process fees/i.test(name);});
      var identifiedSheriffFees=ambulanceFees+prisonerHousing+prisonerWorkDetail+msbuFees+animalShelterFees+civilProcessFees;
      if(ambulanceFees) addPayer('Patients and insurers','Ambulance fees',ambulanceFees,'Paid when emergency medical transport is provided','Collections may be paid by patients, private insurers, Medicare, Medicaid, or other responsible coverage sources.');
      if(prisonerHousing) addPayer('Governments and agencies housing prisoners','Housing prisoners revenue',prisonerHousing,'Paid for detention space and related services','Revenue is received when another government or responsible agency pays Walton County to house prisoners.');
      if(msbuFees) addPayer('Property owners in the applicable benefit area','MSBU fees',msbuFees,'Paid through the Municipal Services Benefit Unit','These assessments support services provided to property within the designated benefit area rather than being allocated equally countywide.');
      if(prisonerWorkDetail) addPayer('Organizations using prisoner work details','Prisoner work detail charges',prisonerWorkDetail,'Paid when an eligible work detail is used','The charge is paid by the organization receiving the authorized work-detail service.');
      if(animalShelterFees) addPayer('Animal-shelter customers','Animal shelter fees',animalShelterFees,'Paid when a fee-supported shelter service is used','These charges are paid by customers receiving the applicable shelter or animal-service transaction.');
      if(civilProcessFees) addPayer('People and organizations requesting civil process','Civil process fees',civilProcessFees,'Paid when legal documents are served or processed','The requesting party pays the applicable statutory or service charge for civil-process work.');
      if(fees>identifiedSheriffFees) addPayer('Other service users','Other Sheriff service charges',fees-identifiedSheriffFees,'Paid when the related service is used','This amount includes remaining fee-supported Sheriff services not shown separately above.');
    }else if(fees){
      var feeCopy=departmentFeePayerCopy(key);
      var feeGroups=[];
      (rows||[]).filter(function(row){return (Number(row.FY2027_Proposed)||0)!==0&&isFee(String(row.Revenue_Name||''),String(row.Revenue_Type||''),row);}).forEach(function(row){
        var feeName=String(row.Revenue_Name||feeCopy.label).trim()||feeCopy.label;
        var feeGroup=feeGroups.find(function(item){return item.name===feeName;});
        if(!feeGroup){feeGroup={name:feeName,amount:0,note:''};feeGroups.push(feeGroup);}
        feeGroup.amount+=Math.abs(Number(row.FY2027_Proposed)||0);
        if(!feeGroup.note&&String(row.Note||'').trim()) feeGroup.note=String(row.Note).trim();
      });
      feeGroups.sort(function(a,b){return b.amount-a.amount;}).forEach(function(item){
        var payer='Service users';
        var impact='Paid when the related service or activity is used';
        if(/entry|admission/i.test(item.name)){payer='Facility visitors';impact='Paid when entering or using the facility';}
        else if(/permit/i.test(item.name)){payer='Permit applicants';impact='Paid when applying for the related permit';}
        else if(/fine|forfeit/i.test(item.name)){payer='People or businesses assessed the charge';impact='Paid when the applicable fine or forfeiture is assessed';}
        else if(/rental|lease/i.test(item.name)){payer='Renters and lessees';impact='Paid when County property or equipment is rented';}
        else if(/library/i.test(item.name)){payer='Library users incurring the charge';impact='Paid only when the applicable library charge occurs';}
        addPayer(payer,item.name,item.amount,impact,item.note||feeCopy.payer);
      });
    }
    if(fuelTax){addPayer('Fuel purchasers','Fuel-tax revenue',fuelTax,'Paid by residents and non-residents purchasing taxable fuel','Fuel-tax support follows fuel purchases rather than being allocated evenly to Walton County households.');}
    if(stateFederal){addPayer('State and federal taxpayers','State, federal, and shared public revenue',stateFederal,'Supported through broader government collections','These dollars come through grants or shared-government revenue instead of a department-specific bill to Walton County households.');}
    if(sheriffE911){addPayer('Phone-service customers','Dedicated E911 support',sheriffE911,'Transferred from the E911 Fund','This support comes from dedicated 911 service charges collected through eligible phone services, not from the Sheriff’s property-tax transfer.');}
    if(indirectAdmin){addPayer('County funds receiving administrative support','General Fund administrative cost allocation',indirectAdmin,'Allocated from the Tourist Development, Building, Mosquito Control, and Solid Waste funds','Indirect Administrative Fees reimburse the General Fund for countywide administrative support provided to these funds. They are an internal cost allocation—not a fee charged to an individual service user.');}
    if(internalFunding){addPayer('Other County funding sources','Transfers, internal charges, and prior resources',internalFunding,'Allocated from another County funding source','These resources carry the payer mix of the originating fund rather than creating a separate department charge.');}
    if(otherFunding){addPayer('Other funding sources','Other assigned funding',otherFunding,'Reimbursements, earnings, or other public resources','This amount is not presented as an equal charge to every Walton County household.');}
    var sources=[];
    if(salesTax) sources.push('The non-resident estimate uses the <a href="https://www.waltoncountyfltourism.com/userfiles/Walton_County_Tourism_2025_Annual_Visitor_Tracking_Report_2.pdf" target="_blank" rel="noopener noreferrer">Walton County Tourism 2025 Annual Visitor Tracking Report</a> finding that visitors account for 68% of retail spending.');
    if(propertyTax) sources.push('Property-tax sector estimates use the <a href="https://floridarevenue.com/property/Documents/2024_County_Profiles.pdf" target="_blank" rel="noopener noreferrer">Florida Department of Revenue&rsquo;s 2024 Walton County Property Tax Overview</a>: 87.9% residential and 12.1% commercial/industrial and other real-property just value. Household equivalents use 34,362 households from U.S. Census Bureau statistics.');
    if(!payerRows.length) return '';
    return '<div class="wc-data-table-scroll wc-profile-who-pays-sheet"><table class="wc-data-table"><thead><tr><th>Who Pays</th><th>Funding Source</th><th class="wc-num">Amount</th><th>Estimated Impact</th><th>How to Read This</th></tr></thead><tbody>'+payerRows.map(function(item){return '<tr><td><strong>'+escapeHtml(item.payer)+'</strong></td><td>'+escapeHtml(item.source)+'</td><td class="wc-num"><strong>'+money(item.amount)+'</strong></td><td>'+escapeHtml(item.impact)+'</td><td>'+escapeHtml(item.explanation)+'</td></tr>';}).join('')+'<tr class="wc-table-total-row"><td colspan="2"><strong>Total Department Revenue</strong></td><td class="wc-num"><strong>'+money(totalRevenue)+'</strong></td><td colspan="2"></td></tr></tbody></table></div>'+(sources.length?'<p class="wc-profile-payer-source">'+sources.join(' ')+'</p>':'');
  }
  function retainBudgetRows(root,allowed){
    root.querySelectorAll('tbody tr').forEach(function(row){
      if(row.classList.contains('wc-table-total-row')){row.remove();return;}
      var cell=row.querySelector('.wc-category-column')||row.cells[0];
      var category=normalize(cell&&cell.textContent);
      if(row.classList.contains('wc-table-subtotal-row')) category=category.replace(/\s+subtotal$/,'');
      if(!allowed(category)) row.remove();
    });
  }
  function addBudgetTotals(root){
    root.querySelectorAll('table').forEach(function(table){
      var body=table.tBodies[0],headers=Array.prototype.slice.call(table.querySelectorAll('thead th'));
      if(!body||!headers.length) return;
      var firstNumber=headers.findIndex(function(header){return header.classList.contains('wc-num');});
      if(firstNumber<0) firstNumber=1;
      var rows=Array.prototype.slice.call(body.rows).filter(function(row){return !row.classList.contains('wc-table-total-row')&&!row.classList.contains('wc-table-subtotal-row');});
      var detailRows=rows.filter(function(row){return row.classList.contains('wc-budget-line-detail-row');});
      var summaryRows=rows.filter(function(row){return row.classList.contains('wc-budget-line-summary-row');});
      function cellAmount(cell){var text=String(cell&&cell.textContent||'').trim();var negative=/^\(.*\)$/.test(text)||text.charAt(0)==='-';var value=Number(text.replace(/[^0-9.]/g,''))||0;return negative?-value:value;}
      var totals=headers.slice(firstNumber).map(function(header,offset){
        var sourceRows=header.classList.contains('wc-prior-year')&&summaryRows.length?summaryRows:(detailRows.length?detailRows:rows);
        return sourceRows.reduce(function(total,row){return total+cellAmount(row.cells[firstNumber+offset]);},0);
      });
      var tr=document.createElement('tr');
      tr.className='wc-table-total-row';
      var labelCells=headers.slice(0,firstNumber).map(function(header,index){
        var className=header&&header.className?header.className:'';
        return '<td'+(className?' class="'+escapeHtml(className)+'"':'')+(index===2?' data-wc-mobile-label="Total"':'')+'>'+(index===0?'Total':'')+'</td>';
      }).join('');
      tr.innerHTML=labelCells+totals.map(function(total,index){
        var header=headers[firstNumber+index];
        return '<td class="'+escapeHtml(header&&header.className?header.className:'wc-num')+'">'+money(total)+'</td>';
      }).join('');
      body.appendChild(tr);
    });
  }
  function enhanceFinanceSheets(expenseQuestion,revenueQuestion,capitalQuestion,attempt){
    attempt=attempt||0;
    var expenseMount=document.getElementById('department-expense-table');
    var button=expenseMount&&expenseMount.querySelector('.wc-view-budget-lines-toggle');
    var detail=button&&document.getElementById(button.dataset.target);
    if(!expenseMount||!button||!detail){if(attempt<40) window.setTimeout(function(){enhanceFinanceSheets(expenseQuestion,revenueQuestion,capitalQuestion,attempt+1);},75);return;}
    if(expenseMount.dataset.profileEnhanced==='true') return;
    expenseMount.dataset.profileEnhanced='true';expenseMount.classList.add('wc-profile-finance-enhanced');
    var fullDetail=detail.cloneNode(true);fullDetail.id=detail.id+'-full';fullDetail.hidden=true;
    button.dataset.closedLabel='View Operating Budget Ledger';button.dataset.openLabel='Hide Operating Budget Ledger';button.textContent='View Operating Budget Ledger';
    var capitalDetail=detail.cloneNode(true);capitalDetail.id=detail.id+'-capital';capitalDetail.hidden=true;
    retainBudgetRows(detail,function(category){return category==='personnel services'||category==='operating expenditures';});
    retainBudgetRows(capitalDetail,function(category){return category==='capital outlay';});
    capitalDetail.querySelectorAll('.wc-budget-line-zero-current').forEach(function(row){row.classList.remove('wc-budget-line-zero-current');});
    addBudgetTotals(detail);addBudgetTotals(capitalDetail);
    var expenseBody=expenseQuestion&&expenseQuestion.querySelector('.wc-simple-disclosure-body');
    if(expenseBody){
      var fullFooter=document.createElement('div');
      fullFooter.className='wc-finance-card-footer wc-profile-full-budget-footer';
      fullFooter.innerHTML='<button type="button" class="wc-view-budget-lines-toggle" data-profile-full-budget-toggle data-target="'+fullDetail.id+'" data-closed-label="View Full Budget Ledger" data-open-label="Hide Full Budget Ledger" aria-expanded="false">View Full Budget Ledger</button>';
      expenseBody.appendChild(fullFooter);expenseBody.appendChild(fullDetail);
    }
    var changeLinks=document.querySelector('[data-profile-change-sheet-links]');
    if(changeLinks){
      changeLinks.innerHTML='<button type="button" class="wc-view-budget-lines-toggle" data-target="'+escapeHtml(detail.id)+'" data-closed-label="View Operating Budget Ledger" data-open-label="Hide Operating Budget Ledger" aria-expanded="false">View Operating Budget Ledger</button><button type="button" class="wc-view-budget-lines-toggle" data-target="'+escapeHtml(capitalDetail.id)+'" data-closed-label="View Capital Budget Ledger" data-open-label="Hide Capital Budget Ledger" aria-expanded="false">View Capital Budget Ledger</button>';
      changeLinks.insertAdjacentElement('afterend',capitalDetail);
    }
    var revenueMount=document.getElementById('department-revenue-table');
    if(revenueMount){revenueMount.classList.add('wc-profile-finance-enhanced');var revenueButton=revenueMount.querySelector('.wc-view-budget-lines-toggle');if(revenueButton){revenueButton.dataset.closedLabel='View Revenue Ledger';revenueButton.dataset.openLabel='Hide Revenue Ledger';revenueButton.textContent='View Revenue Ledger';}}
    var utilityMount=document.getElementById('department-building-construction-tables');
    if(utilityMount&&utilityMount.textContent.trim()){
      utilityMount.classList.add('wc-profile-finance-enhanced');
      var utilityButton=utilityMount.querySelector('.wc-view-budget-lines-toggle');
      if(utilityButton){utilityButton.dataset.closedLabel='View Utilities Ledger';utilityButton.dataset.openLabel='Hide Utilities Ledger';utilityButton.textContent='View Utilities Ledger';}
    }
    document.querySelectorAll('.wc-profile-questions .wc-data-updated-note').forEach(function(note){note.remove();});
  }
  function renderPerformanceProfile(rows,attempt){
    attempt=attempt||0;
    var mount=document.getElementById('department-performance-table');
    if(!mount) return;
    if(!mount.textContent.trim()&&attempt<40){window.setTimeout(function(){renderPerformanceProfile(rows,attempt+1);},75);return;}
    if(!rows.length){mount.hidden=false;mount.innerHTML='<p class="wc-profile-no-measures">No department performance measures were supplied in the published budget data.</p>';return;}
    var goals=rows.map(function(row){return row.Goal||'';}).filter(function(goal,index,all){return goal&&all.indexOf(goal)===index;});
    var history=[['2022','Actual_2022'],['2023','Actual_2023'],['2024','Actual_2024'],['2025','Actual_2025'],['Current projection','Projected_2026']];
    mount.hidden=false;
    mount.innerHTML=(goals.length===1?'<div class="wc-profile-performance-goal"><span>Department goal</span><strong>'+escapeHtml(goals[0])+'</strong></div>':'')+'<div class="wc-profile-performance-list">'+rows.map(function(row){
      var values=history.filter(function(item){return row[item[1]]!==''&&row[item[1]]!=null;}).map(function(item){return '<span>'+escapeHtml(item[0])+': <b>'+escapeHtml(row[item[1]])+'</b></span>';}).join('');
      return '<article class="wc-profile-performance-item"><div><h3>'+escapeHtml(row.Measure||'Performance measure')+'</h3></div><div class="wc-profile-performance-target"><span>Proposed target</span><strong>'+escapeHtml(row.Projected_2027||'Not listed')+'</strong></div>'+((row.Objective||values)?'<details class="wc-profile-performance-history"><summary>View context and history +</summary><div>'+(row.Objective?'<p><span>Objective</span>'+escapeHtml(row.Objective)+'</p>':'')+(values?'<div class="wc-profile-performance-values">'+values+'</div>':'')+'</div></details>':'')+'</article>';
    }).join('')+'</div>';
  }

  function renderIndependentOfficeSnapshot(title,attempt){
    attempt=attempt||0;
    if(document.querySelector('.wc-board-department-profile')) return;
    var expenseMount=document.getElementById('department-expense-table');
    var revenueMount=document.getElementById('department-revenue-table');
    var staffingMount=document.getElementById('department-staffing-table');
    if((!expenseMount||!expenseMount.querySelector('.wc-finance-card'))&&attempt<60){window.setTimeout(function(){renderIndependentOfficeSnapshot(title,attempt+1);},80);return;}

    var expenses=window.WCBudgetData.getDepartmentExpenses(title.textContent.trim())||[];
    var revenues=window.WCBudgetData.getDepartmentRevenues(title.textContent.trim())||[];
    var staffing=window.WCBudgetData.getDepartmentStaffing(title.textContent.trim())||[];
    function amountFromText(value){var text=String(value||'').replace(/[^0-9.\-]/g,'');return Number(text)||0;}
    function rowsFromCard(mount){
      return Array.prototype.map.call(mount?mount.querySelectorAll('.wc-finance-card-row'):[],function(row){
        var name=row.querySelector('.wc-finance-card-row-head strong');
        var amount=row.querySelector('.wc-finance-card-amount');
        var change=row.querySelector('.wc-finance-card-change');
        return {label:name?name.childNodes[0].textContent.trim():'Budget category',amount:amountFromText(amount&&amount.textContent),change:change?change.textContent.trim():''};
      }).filter(function(item){return item.amount!==0;});
    }
    function deltaRow(label,amount,total,change,isOneTime){
      var share=total?Math.max(0,amount/total*100):0;
      var match=String(change||'').match(/([+\-−])?\$([0-9,]+)/);
      var delta='';
      if(match){var sign=match[1]==='-'||match[1]==='−'?-1:1;var value=(Number(match[2].replace(/,/g,''))||0)*sign;delta='<span class="wc-profile-snapshot-delta '+(value>0?'is-up':value<0?'is-down':'is-flat')+'">'+(value>0?'+':value<0?'−':'')+compactMoney(Math.abs(value))+'</span>';}
      return '<div class="wc-profile-snapshot-row"><div class="wc-profile-snapshot-row-main"><span class="wc-profile-snapshot-row-name">'+escapeHtml(label)+'</span><i class="wc-profile-snapshot-row-track'+(isOneTime?' is-one-time':'')+'" aria-hidden="true"><b style="width:'+Math.min(100,share).toFixed(1)+'%"></b></i></div><strong class="wc-profile-snapshot-row-amount">'+compactMoney(amount)+'</strong>'+delta+'</div>';
    }
    var expenseGroups=[
      {label:'Personnel Services',amount:sum(expenses.filter(function(row){return row.Object_Type==='Personnel Services';}),'FY2027_Proposed'),prior:sum(expenses.filter(function(row){return row.Object_Type==='Personnel Services';}),'FY2026_Original_Budget')},
      {label:'Operating Expenditures',amount:sum(expenses.filter(function(row){return row.Object_Type==='Operating Expenditures';}),'FY2027_Proposed'),prior:sum(expenses.filter(function(row){return row.Object_Type==='Operating Expenditures';}),'FY2026_Original_Budget')},
      {label:'Capital Outlay',amount:sum(expenses.filter(function(row){return row.Object_Type==='Capital Outlay';}),'FY2027_Proposed'),prior:sum(expenses.filter(function(row){return row.Object_Type==='Capital Outlay';}),'FY2026_Original_Budget')}
    ].filter(function(item){return item.amount!==0||item.prior!==0;});
    if(!expenseGroups.length) expenseGroups=rowsFromCard(expenseMount).slice(0,4);
    var budget=expenseGroups.reduce(function(total,item){return total+item.amount;},0);
    var priorBudget=expenseGroups.reduce(function(total,item){return total+(item.prior||0);},0);
    var budgetChange=budget-priorBudget;
    var revenueGroups=[];
    revenues.forEach(function(row){var label=row.Revenue_Type||row.Revenue_Name||'Other Revenue';var item=revenueGroups.find(function(entry){return entry.label===label;});if(!item){item={label:label,amount:0};revenueGroups.push(item);}item.amount+=Math.abs(Number(row.FY2027_Proposed)||0);});
    revenueGroups=revenueGroups.filter(function(item){return item.amount>0;}).sort(function(a,b){return b.amount-a.amount;}).slice(0,4);
    if(!revenueGroups.length) revenueGroups=rowsFromCard(revenueMount).slice(0,4);
    var revenueTotal=revenueGroups.reduce(function(total,item){return total+item.amount;},0);
    var independentWhoPaysHtml=fundingPayerSummary(revenues,normalize(title.textContent));
    var fte=sum(staffing,'2027');var priorFte=sum(staffing,'2026');var fteChange=fte-priorFte;
    if(!staffing.length&&staffingMount){var staffingTotal=staffingMount.querySelector('.wc-finance-card-total');fte=amountFromText(staffingTotal&&staffingTotal.textContent);priorFte=fte;fteChange=0;}

    var snapshot=document.createElement('section');
    snapshot.className='wc-profile-snapshot wc-board-department-profile wc-independent-office-snapshot';
    snapshot.innerHTML='<div class="wc-profile-snapshot-label"><h2 class="wc-profile-section-title">Department Snapshot</h2></div><div class="wc-profile-snapshot-grid">'+
      '<article class="wc-profile-snapshot-card"><span class="wc-profile-snapshot-kicker">Expenditures Summary</span><div class="wc-profile-snapshot-total"><strong>'+compactMoney(budget)+'</strong>'+(priorBudget?'<small class="'+(budgetChange>0?'is-up':budgetChange<0?'is-down':'')+'">'+(budgetChange===0?'Unchanged':(budgetChange>0?'+':'−')+compactMoney(Math.abs(budgetChange))+' ('+Math.abs(budgetChange/priorBudget*100).toFixed(1)+'%)')+'</small>':'')+'</div><div class="wc-profile-snapshot-table">'+expenseGroups.map(function(item){return deltaRow(item.label,item.amount,budget,'',item.label==='Capital Outlay');}).join('')+'</div><button type="button" class="wc-profile-snapshot-sheet" data-independent-sheet="expense">View Full Budget Sheet</button></article>'+
      '<article class="wc-profile-snapshot-card"><span class="wc-profile-snapshot-kicker">Revenue Summary</span><div class="wc-profile-snapshot-total"><strong>'+compactMoney(revenueTotal)+'</strong></div><div class="wc-profile-snapshot-table">'+(revenueGroups.length?revenueGroups.map(function(item){return deltaRow(item.label,item.amount,revenueTotal);}).join(''):'<p>No dedicated revenue is listed.</p>')+'</div><div class="wc-profile-snapshot-actions"><button type="button" class="wc-profile-snapshot-sheet" data-independent-who-pays>View Who Pays</button><button type="button" class="wc-profile-snapshot-sheet" data-independent-sheet="revenue">View Revenue Budget Sheet</button></div></article>'+
      '<article class="wc-profile-snapshot-card wc-profile-snapshot-staffing"><span class="wc-profile-snapshot-kicker">Position Summary</span><div class="wc-profile-snapshot-total"><strong>'+fte.toLocaleString('en-US',{maximumFractionDigits:2})+'</strong><small class="'+(fteChange>0?'is-up':fteChange<0?'is-down':'')+'">'+(fteChange===0?'Unchanged':(fteChange>0?'+':'−')+Math.abs(fteChange).toLocaleString('en-US',{maximumFractionDigits:2})+' FTE')+'</small></div><p class="wc-profile-snapshot-fte-label">Authorized full-time equivalent positions</p><div class="wc-profile-snapshot-fte-compare"><div><span>Prior year</span><strong>'+priorFte.toLocaleString('en-US',{maximumFractionDigits:2})+' FTE</strong></div><i aria-hidden="true">&rarr;</i><div><span>Proposed</span><strong>'+fte.toLocaleString('en-US',{maximumFractionDigits:2})+' FTE</strong></div></div><button type="button" class="wc-profile-snapshot-sheet" data-independent-sheet="staffing">View Personnel Sheet</button></article></div>';
    var narrative=document.getElementById('department-narrative');
    if(narrative) narrative.insertAdjacentElement('afterend',snapshot);else title.insertAdjacentElement('afterend',snapshot);
    var oldGrid=document.querySelector('.wc-department-financial-grid');if(oldGrid) oldGrid.classList.add('wc-independent-source-grid');
    [expenseMount,revenueMount,staffingMount].forEach(function(mount){if(mount) mount.classList.add('wc-independent-source-grid');});
    snapshot.querySelectorAll('[data-independent-sheet]').forEach(function(button){button.addEventListener('click',function(){var type=button.getAttribute('data-independent-sheet');var mount=type==='expense'?expenseMount:type==='revenue'?revenueMount:staffingMount;var detail=mount&&mount.querySelector('.wc-budget-lines-detail');var html=detail?detail.innerHTML:(mount?mount.innerHTML:'<p>No detail is available.</p>');var label=type==='expense'?'Budget Sheet':type==='revenue'?'Revenue Budget Sheet':'Personnel Sheet';window.WCBudgetData.openBudgetDetailPanel(button,{title:label,kicker:title.textContent.trim(),html:html});});});
    var independentWhoPaysButton=snapshot.querySelector('[data-independent-who-pays]');
    if(independentWhoPaysButton) bindSnapshotWhoPaysSheet(independentWhoPaysButton,independentWhoPaysHtml,title.textContent.trim());
  }

  function render(){
    var eyebrow=document.querySelector('.page-eyebrow');
    var title=document.querySelector('.page-title');
    if(!eyebrow||!title) return;
    var section=normalize(eyebrow.textContent);
    if(section==='constitutional officers'||section==='autonomous entities'){
      renderIndependentOfficeSnapshot(title,0);
      return;
    }
    if(section!=='departments') return;
    if(!window.__wcDepartmentServiceDataReady&&window.WCBudgetData&&typeof window.WCBudgetData.loadBudgetData==='function'){
      if(window.__wcDepartmentServiceDataPending) return;
      window.__wcDepartmentServiceDataPending=true;
      window.WCBudgetData.loadBudgetData().then(function(data){
        window.__wcDepartmentServiceData=data;
        window.__wcDepartmentServiceDataReady=true;
        render();
      }).catch(function(){
        window.__wcDepartmentServiceDataReady=true;
        render();
      });
      return;
    }
    var key=canonicalDepartmentKey(normalize(title.textContent));
    var services=SERVICES[key];
    if(!services) return;
    ensureDepartmentQuestionDisclosures();
    var challenge=challengeFor(key);
    if(document.querySelector('.wc-board-department-profile')){
      document.body.classList.remove('wc-board-department-loading');
      var existingMain=document.querySelector('main#content');
      if(existingMain) existingMain.removeAttribute('aria-busy');
      return;
    }

    var narrative=document.getElementById('department-narrative');
    var functionSection=narrative&&narrative.querySelector('.statement-of-function');
    if(narrative&&!functionSection&&narrative.querySelector('.wc-data-loading')){
      window.setTimeout(render,80);
      return;
    }
    if(!functionSection&&narrative){
      var existingNarrativeNodes=Array.prototype.slice.call(narrative.childNodes);
      functionSection=document.createElement('section');
      functionSection.className='statement-of-function content-section';
      functionSection.innerHTML='<h2>Function and Services</h2>';
      narrative.innerHTML='';
      existingNarrativeNodes.forEach(function(node){functionSection.appendChild(node);});
      narrative.appendChild(functionSection);
    }
    if(!functionSection) return;
    functionSection.classList.add('wc-dept-function-services');
    var functionHeading=functionSection.querySelector('h2');
    if(functionHeading){
      functionHeading.textContent='Statement of Function';
      functionHeading.id='wc-dept-function-services-title';
    }
    var mediaWrapper=narrative&&narrative.parentElement;
    var supportingMedia=[];
    if(mediaWrapper){
      Array.prototype.forEach.call(mediaWrapper.children,function(child){
        if(child===narrative) return false;
        if(child.matches&&child.matches('.wc-video-frame,.extension-video-frame,.mosquito-video-frame,.libraries-video-frame,.wc-omb-award-top,.wc-plaque-card,figure,a[class*="iframe-link"]')) supportingMedia.push(child);
      });
    }
    document.querySelectorAll('main#content > a.environmental-iframe-link,main#content > a.public-works-iframe-link,main#content > a.lifeguard-iframe-link,main#content > .recreation-parks-section').forEach(function(item){
      if(supportingMedia.indexOf(item)===-1) supportingMedia.push(item);
    });
    if(supportingMedia.length&&functionHeading){
      functionSection.classList.add('wc-dept-function-services--with-video','wc-dept-video-right');
      if(mediaWrapper) mediaWrapper.classList.add('wc-dept-statement-flow');
      var profileContent=document.querySelector('main#content');
      if(profileContent){
        profileContent.classList.add('wc-dept-has-top-media');
        var titleStyles=window.getComputedStyle(title);
        var titleLineHeight=parseFloat(titleStyles.lineHeight);
        if(!titleLineHeight) titleLineHeight=parseFloat(titleStyles.fontSize)*1.12;
        var wrappedTitleOffset=Math.max(0,title.getBoundingClientRect().height-titleLineHeight);
        profileContent.style.setProperty('--wc-title-wrap-offset',wrappedTitleOffset.toFixed(1)+'px');
      }
      var mediaRail=document.createElement('aside');
      mediaRail.className='wc-dept-supporting-media';
      // .wc-plaque-card (our repo's award class) deliberately does NOT
      // trigger the narrower --award sizing below -- unlike the reference
      // repo's .wc-omb-award-top, this one should render at its standard,
      // un-shrunk size (see .wc-plaque-inner's own base rules) while still
      // being wrapped into the media rail alongside the Statement of
      // Function text.
      if(supportingMedia.some(function(item){return item.classList&&item.classList.contains('wc-omb-award-top');})){
        mediaRail.classList.add('wc-dept-supporting-media--award');
        if(profileContent) profileContent.classList.add('wc-dept-has-top-award');
      }
      mediaRail.setAttribute('aria-label','Department media and resources');
      supportingMedia.forEach(function(item){mediaRail.appendChild(item);});
      functionHeading.insertAdjacentElement('afterend',mediaRail);
    }
    var servicesListHtml='<p class="wc-profile-section-title wc-dept-services-label">County Services</p><ul class="wc-dept-services-list">'+services.map(function(service){return '<li><strong>'+escapeHtml(service[0])+':</strong> '+escapeHtml(service[1])+'</li>';}).join('')+'</ul><p class="wc-profile-service-note"><strong>No new services are being added.</strong> The budget continues the department&rsquo;s existing responsibilities. This list may not include all the services provided by the department, but is intended to provide citizens with an understandable list of core services provided by this department.</p>';
    functionSection.insertAdjacentHTML('beforeend',servicesListHtml);

    var expenses=window.WCBudgetData.getDepartmentExpenses(title.textContent.trim())||[];
    var revenues=window.WCBudgetData.getDepartmentRevenues(title.textContent.trim())||[];
    var staffing=window.WCBudgetData.getDepartmentStaffing(title.textContent.trim())||[];
    var performanceRows=window.WCBudgetData.getDepartmentPerformanceMeasures(title.textContent.trim())||[];
    var budget=sum(expenses,'FY2027_Proposed');
    var priorBudget=sum(expenses,'FY2026_Original_Budget');
    var budgetChange=budget-priorBudget;
    var fte=sum(staffing,'2027');
    var priorFte=sum(staffing,'2026');
    var fteChange=fte-priorFte;
    // Delta-table row: category name + track bar on the left, the FY2027
    // amount right-aligned, and (when a comparison is available) a solid
    // colored pill carrying just the dollar change -- no "Recurring YoY
    // Change" prose baked into a 9px caption. renderedChange (when present)
    // comes from this department's own Expenditure Summary card and is
    // authoritative for shared/split accounts (see the Code Compliance
    // Street/Beach handling below), so it wins over a plain amount-prior
    // subtraction when both are available.
    function snapshotDeltaFromRenderedChange(renderedChange){
      var match=renderedChange.text.match(/([+\-−])?\$([0-9,]+)/);
      if(!match) return null;
      var parsed=Number(match[2].replace(/,/g,''))||0;
      return (match[1]==='-'||match[1]==='−')?-parsed:parsed;
    }
    function snapshotDeltaRow(label,amount,total,prior,isOneTime,sublines,renderedChange){
      var share=total?Math.max(0,amount/total*100):0;
      var delta=renderedChange?snapshotDeltaFromRenderedChange(renderedChange):(prior?amount-prior:null);
      var pill='';
      if(delta===null){
        pill='';
      }else if(delta===0){
        pill='<span class="wc-profile-snapshot-delta is-flat">$0</span>';
      }else{
        pill='<span class="wc-profile-snapshot-delta '+(delta>0?'is-up':'is-down')+'">'+(delta>0?'+':'−')+compactMoney(Math.abs(delta))+'</span>';
      }
      var sublinesHtml=sublines&&sublines.length?'<div class="wc-finance-card-sublines">'+sublines.map(function(item){return '<div class="wc-finance-card-subline"><span>'+escapeHtml(item.label)+'</span><strong>'+compactMoney(item.amount)+'</strong></div>';}).join('')+'</div>':'';
      return '<div class="wc-profile-snapshot-row"><div class="wc-profile-snapshot-row-main"><span class="wc-budget-line-tooltip-label wc-profile-snapshot-row-name">'+escapeHtml(label)+snapshotTooltip(label)+'</span><i class="wc-profile-snapshot-row-track'+(isOneTime?' is-one-time':'')+'" aria-hidden="true"><b style="width:'+Math.min(100,share).toFixed(1)+'%"></b></i>'+sublinesHtml+'</div><strong class="wc-profile-snapshot-row-amount">'+compactMoney(amount)+'</strong>'+pill+'</div>';
    }
    // Internal Service Charges (Object_Code 549006 -- what a fund pays an
    // internal service fund, e.g. fleet/IT/insurance, for services it
    // consumes) and Contractual Services (the same Contract_Status signal
    // used by the "View Contractual Services" popup and the countywide
    // Summary of Contractual Services page -- see
    // buildContractualServicesRowsFromExpenditures's own comment on why
    // object code alone can't identify a contract) both get pulled out of
    // Operating Expenditures into their own summary rows here, rather than
    // staying folded into one lump Operating figure.
    var isInternalServiceChargeRow=function(row){return String(row.Object_Code||'').trim()==='549006';};
    var isContractualServiceRow=function(row){return row.Object_Type==='Operating Expenditures'&&String(row.Contract_Status||'').trim()!==''&&!isInternalServiceChargeRow(row);};
    var isPlainOperatingRow=function(row){return row.Object_Type==='Operating Expenditures'&&!isContractualServiceRow(row)&&!isInternalServiceChargeRow(row);};
    var snapshotExpenseGroups=[
      {label:'Personnel Services',amount:sum(expenses.filter(function(row){return row.Object_Type==='Personnel Services';}),'FY2027_Proposed'),prior:sum(expenses.filter(function(row){return row.Object_Type==='Personnel Services';}),'FY2026_Original_Budget')},
      {label:'Operating Expenditures',amount:sum(expenses.filter(isPlainOperatingRow),'FY2027_Proposed'),prior:sum(expenses.filter(isPlainOperatingRow),'FY2026_Original_Budget')},
      {label:'Contractual Services',amount:sum(expenses.filter(isContractualServiceRow),'FY2027_Proposed'),prior:sum(expenses.filter(isContractualServiceRow),'FY2026_Original_Budget')},
      {label:'Internal Service Charges',amount:sum(expenses.filter(isInternalServiceChargeRow),'FY2027_Proposed'),prior:sum(expenses.filter(isInternalServiceChargeRow),'FY2026_Original_Budget')},
      {label:'Capital Outlay',amount:sum(expenses.filter(function(row){return row.Object_Type==='Capital Outlay';}),'FY2027_Proposed'),prior:sum(expenses.filter(function(row){return row.Object_Type==='Capital Outlay';}),'FY2026_Original_Budget')}
    ].filter(function(item){return item.amount!==0||item.prior!==0;});
    var originalExpenseRows=document.querySelectorAll('#department-expense-table .wc-finance-card-row');
    snapshotExpenseGroups.forEach(function(item){
      var originalRow=Array.prototype.find.call(originalExpenseRows,function(row){var labelNode=row.querySelector('.wc-budget-line-tooltip-label');var labelText=labelNode&&labelNode.childNodes.length?labelNode.childNodes[0].textContent:labelNode&&labelNode.textContent;return normalize(labelText)===normalize(item.label);});
      var originalChange=originalRow&&originalRow.querySelector('.wc-finance-card-change');
      if(originalChange)item.renderedChange={text:originalChange.textContent.trim(),className:originalChange.classList.contains('wc-finance-card-change-up')?'is-up':originalChange.classList.contains('wc-finance-card-change-down')?'is-down':'is-flat'};
    });
    if(key==='code compliance'){
      var codePersonnel=snapshotExpenseGroups.find(function(item){return item.label==='Personnel Services';});
      if(codePersonnel){var codeSides={};expenses.filter(function(row){return row.Object_Type==='Personnel Services';}).forEach(function(row){var deptName=normalize(row.Dept_Name);var side=deptName==='code compliance beach'?'Beach':'Street';codeSides[side]=(codeSides[side]||0)+(Number(row.FY2027_Proposed)||0);});codePersonnel.sublines=Object.keys(codeSides).map(function(side){return {label:side,amount:codeSides[side]};}).filter(function(item){return item.amount!==0;});}
      if(snapshotExpenseGroups.length&&snapshotExpenseGroups.every(function(item){return item.renderedChange;})){
        budgetChange=snapshotExpenseGroups.reduce(function(total,item){var match=item.renderedChange.text.match(/([+\-−])?\$([0-9,]+)/);if(!match)return total;var amount=Number(match[2].replace(/,/g,''))||0;return total+(match[1]==='-'||match[1]==='−'?-amount:amount);},0);
        priorBudget=budget-budgetChange;
      }
    }
    var changesByObject={};
    expenses.forEach(function(row){
      var code=String(row.Object_Code||'').trim();
      var name=row.Object_Name||'Budget line';
      var type=row.Object_Type||'';
      var changeKey=code||normalize(type+' '+name);
      if(!changesByObject[changeKey]) changesByObject[changeKey]={code:code,name:name,type:type,prior:0,current:0,diff:0};
      changesByObject[changeKey].prior+=Number(row.FY2026_Original_Budget)||0;
      changesByObject[changeKey].current+=Number(row.FY2027_Proposed)||0;
    });
    var changes=Object.keys(changesByObject).map(function(changeKey){var item=changesByObject[changeKey];item.diff=item.current-item.prior;return item;}).filter(function(item){return item.diff!==0&&!/salar(?:y|ies)/i.test(item.name);}).sort(function(a,b){return Math.abs(b.diff)-Math.abs(a.diff);}).slice(0,3);
    if(!functionSection.querySelector('.wc-profile-change-grid')){
      var changeCopy='No new services are being added this year. The department budget is '+(budgetChange>0?'increasing':budgetChange<0?'decreasing':'remaining level')+(budgetChange!==0?' by '+money(Math.abs(budgetChange))+(priorBudget?' ('+Math.abs(budgetChange/priorBudget*100).toFixed(1)+'%)':''):'')+'.';
      function renderedChangeAmount(item){
        var match=item.renderedChange&&item.renderedChange.text.match(/([+\-−])?\$([0-9,]+)/);
        if(!match) return 0;
        var amount=Number(match[2].replace(/,/g,''))||0;
        return (match[1]==='-'||match[1]==='−')?-amount:amount;
      }
      var personnelGroup=snapshotExpenseGroups.find(function(item){return item.label==='Personnel Services';});
      var isPersonnelDriven=false;
      if(key==='code compliance'){
        var rankedCategories=snapshotExpenseGroups.filter(function(item){return item.renderedChange;}).map(function(item){return {label:item.label,amount:renderedChangeAmount(item)};}).sort(function(a,b){return Math.abs(b.amount)-Math.abs(a.amount);});
        var topCategory=rankedCategories[0];
        if(topCategory&&topCategory.amount!==0){
          isPersonnelDriven=topCategory.label==='Personnel Services';
          if(!isPersonnelDriven) changeCopy+=' The primary change is '+topCategory.label+' '+(topCategory.amount>0?'increasing':'decreasing')+' by '+money(Math.abs(topCategory.amount))+'.';
        }
      }else{
        var personnelDiff=personnelGroup?(personnelGroup.amount-(personnelGroup.prior||0)):0;
        var topLineItem=changes[0];
        isPersonnelDriven=personnelDiff!==0&&Math.abs(personnelDiff)>=Math.abs(topLineItem?topLineItem.diff:0);
        if(!isPersonnelDriven&&topLineItem) changeCopy+=' The primary change is '+topLineItem.name+' '+(topLineItem.diff>0?'increasing':'decreasing')+' by '+money(Math.abs(topLineItem.diff))+'.';
      }
      if(isPersonnelDriven) changeCopy+=' The primary change can be attributed to the additional staffing requested, needed to keep pace with growing service demand across the county.';
      var changeGrid=document.createElement('div');
      changeGrid.className='wc-profile-change-grid';
      changeGrid.innerHTML=
        '<div class="wc-profile-change-card is-changing"><p class="wc-profile-change-card-label"><i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8M21 7v6h-6"/></svg></i>Changing</p><p>'+escapeHtml(changeCopy)+'</p></div>'+
        '<div class="wc-profile-change-card is-challenge"><p class="wc-profile-change-card-label"><i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 2.5 20h19zM12 9v5M12 18h.01"/></svg></i>Challenges</p><p>'+escapeHtml(challenge)+'</p></div>';
      functionSection.appendChild(changeGrid);
    }
    var snapshotRevenueGroups=[];
    revenues.forEach(function(row){var label=row.Revenue_Type||row.Revenue_Name||'Other Revenue';var item=snapshotRevenueGroups.find(function(groupItem){return groupItem.label===label;});if(!item){item={label:label,amount:0};snapshotRevenueGroups.push(item);}item.amount+=Math.abs(Number(row.FY2027_Proposed)||0);});
    snapshotRevenueGroups=snapshotRevenueGroups.filter(function(item){return item.amount>0;}).sort(function(a,b){return b.amount-a.amount;}).slice(0,3);
    var snapshotRevenueTotal=revenues.reduce(function(total,row){return total+Math.abs(Number(row.FY2027_Proposed)||0);},0);
    var whoPaysSheetHtml=fundingPayerSummary(revenues,key);
    // Position-level detail behind the Staffing/FTE card's single FTE
    // change number: any position whose authorized count grew from
    // FY2026 to FY2027 is a specific, named request the reader can see
    // instead of just the net change.
    var requestedPositions=staffing.filter(function(row){return (Number(row['2027'])||0)-(Number(row['2026'])||0)>0;}).map(function(row){return {name:row.Position_Name||'Position',delta:(Number(row['2027'])||0)-(Number(row['2026'])||0)};}).sort(function(a,b){return b.delta-a.delta;});
    var requestedPositionsHtml=requestedPositions.length?'<div class="wc-profile-snapshot-fte-requests"><span class="wc-profile-snapshot-fte-requests-title">Additional FTE requested</span><ul>'+requestedPositions.map(function(item){return '<li><span>'+escapeHtml(item.name)+'</span><strong>+'+item.delta.toLocaleString('en-US',{maximumFractionDigits:2})+' FTE</strong></li>';}).join('')+'</ul></div>':'';
    var snapshot=document.createElement('section');
    snapshot.className='wc-profile-snapshot wc-board-department-profile';
    snapshot.innerHTML='<div class="wc-profile-snapshot-label"><h2 class="wc-profile-section-title">Department Snapshot</h2></div><div class="wc-profile-snapshot-grid">'+
      '<article class="wc-profile-snapshot-card"><span class="wc-profile-snapshot-kicker">Expenditures Summary</span><div class="wc-profile-snapshot-total"><strong>'+compactMoney(budget)+'</strong><small class="'+(budgetChange>0?'is-up':budgetChange<0?'is-down':'')+'">'+(budgetChange===0?'Unchanged':(budgetChange>0?'+':'−')+compactMoney(Math.abs(budgetChange))+(priorBudget?' ('+Math.abs(budgetChange/priorBudget*100).toFixed(1)+'%)':''))+'</small></div><div class="wc-profile-snapshot-table">'+snapshotExpenseGroups.map(function(item){return snapshotDeltaRow(item.label,item.amount,budget,null,item.label==='Capital Outlay',item.sublines,null);}).join('')+'</div>'+(snapshotExpenseGroups.some(function(item){return item.label==='Capital Outlay';})?'<div class="wc-profile-snapshot-legend"><span><i></i>Recurring</span><span><i class="is-one-time"></i>One-time</span></div>':'')+'<div class="wc-profile-snapshot-actions"><button type="button" class="wc-profile-snapshot-sheet" data-profile-operating-budget-sheet-trigger>View Operating Ledger</button><button type="button" class="wc-profile-snapshot-sheet" data-profile-graph-trigger>View Budget Graph</button><button type="button" class="wc-profile-snapshot-sheet" data-profile-capital-trigger>View Capital Investments</button><button type="button" class="wc-profile-snapshot-sheet" data-profile-contracts-trigger>View Contractual Services</button></div></article>'+
      '<article class="wc-profile-snapshot-card"><span class="wc-profile-snapshot-kicker">Revenue Summary</span><div class="wc-profile-snapshot-total"><strong>'+compactMoney(snapshotRevenueTotal)+'</strong></div><div class="wc-profile-snapshot-table">'+(snapshotRevenueGroups.length?snapshotRevenueGroups.map(function(item){return snapshotDeltaRow(item.label,item.amount,snapshotRevenueTotal);}).join(''):'<p>No dedicated revenue is listed.</p>')+'</div><div class="wc-profile-snapshot-actions"><button type="button" class="wc-profile-snapshot-sheet" data-profile-who-pays-trigger>View Who Pays</button><button type="button" class="wc-profile-snapshot-sheet" data-profile-revenue-sheet-trigger>View Revenue Budget Ledger</button></div></article>'+
      '<article class="wc-profile-snapshot-card wc-profile-snapshot-staffing"><span class="wc-profile-snapshot-kicker">Position Summary</span><div class="wc-profile-snapshot-total"><strong>'+fte.toLocaleString('en-US',{maximumFractionDigits:2})+'</strong><small class="'+(fteChange>0?'is-up':fteChange<0?'is-down':'')+'">'+(fteChange===0?'Unchanged':(fteChange>0?'+':'−')+Math.abs(fteChange).toLocaleString('en-US',{maximumFractionDigits:2})+' FTE')+'</small></div><p class="wc-profile-snapshot-fte-label">Authorized full-time equivalent positions</p><div class="wc-profile-snapshot-fte-compare"><div><span>Prior year</span><strong>'+priorFte.toLocaleString('en-US',{maximumFractionDigits:2})+' FTE</strong></div><i aria-hidden="true">&rarr;</i><div><span>Proposed</span><strong>'+fte.toLocaleString('en-US',{maximumFractionDigits:2})+' FTE</strong></div></div>'+requestedPositionsHtml+'<div class="wc-profile-snapshot-actions"><button type="button" class="wc-profile-snapshot-sheet" data-profile-personnel-ledger-trigger>View Personnel Ledger</button></div></article>'+
      '</div>';
    var mainContent=document.querySelector('main#content');
    functionSection.insertAdjacentElement('afterend',snapshot);
    bindSnapshotTooltips(snapshot);
    var graphButton=snapshot.querySelector('[data-profile-graph-trigger]');
    if(graphButton) bindSnapshotBudgetGraph(graphButton,expenses,staffing,key,title.textContent.trim());
    var whoPaysButton=snapshot.querySelector('[data-profile-who-pays-trigger]');
    if(whoPaysButton) bindSnapshotWhoPaysSheet(whoPaysButton,whoPaysSheetHtml,title.textContent.trim());
    var personnelLedgerButton=snapshot.querySelector('[data-profile-personnel-ledger-trigger]');
    if(personnelLedgerButton) bindSnapshotPersonnelLedgerTrigger(personnelLedgerButton);
    var snapshotRevenueSheetButton=snapshot.querySelector('[data-profile-revenue-sheet-trigger]');
    if(snapshotRevenueSheetButton) bindSnapshotRevenueSheet(snapshotRevenueSheetButton,document.getElementById('department-revenue-table'),title.textContent.trim());

    var expenseQuestion=configureExistingQuestion('department-expense-table','What does this department cost?','cost');
    var snapshotBudgetSheetButton=snapshot.querySelector('[data-profile-operating-budget-sheet-trigger]');
    if(snapshotBudgetSheetButton) bindSnapshotOperatingBudgetSheet(snapshotBudgetSheetButton,document.getElementById('department-expense-table'),title.textContent.trim());
    var revenueQuestion=configureExistingQuestion('department-revenue-table','Who pays for this department?','funding');
    var performanceQuestion=configureExistingQuestion('department-performance-table','How is this department held accountable?','accountable');
    var staffingMount=document.getElementById('department-staffing-table');
    var staffingQuestion=staffingMount&&staffingMount.closest('.wc-department-question');
    if(staffingMount){staffingMount.classList.add('wc-profile-snapshot-personnel-source');snapshot.appendChild(staffingMount);}
    if(staffingQuestion) staffingQuestion.remove();
    var revenueMount=document.getElementById('department-revenue-table');
    if(revenueMount){revenueMount.classList.add('wc-profile-snapshot-personnel-source');snapshot.appendChild(revenueMount);}
    if(revenueQuestion) revenueQuestion.remove();
    var group=expenseQuestion&&expenseQuestion.closest('.wc-department-questions');
    if(!group){group=document.createElement('section');group.className='wc-department-questions';snapshot.insertAdjacentElement('afterend',group);}
    group.classList.add('wc-profile-questions');
    group.setAttribute('aria-label','Citizen questions');
    if(!group.querySelector(':scope>.wc-profile-section-title')) group.insertAdjacentHTML('afterbegin','<h2 class="wc-profile-section-title">Citizen questions</h2>');
    var expenseMount=document.getElementById('department-expense-table');
    if(expenseMount){expenseMount.classList.add('wc-profile-snapshot-personnel-source');snapshot.appendChild(expenseMount);}
    if(expenseQuestion) expenseQuestion.remove();

    var isBuildingConstruction=key==='building construction and maintenance';
    var recurringSpecs=[
      {label:'Personnel',predicate:function(row){return row.Object_Type==='Personnel Services';}},
      {label:'Operating',predicate:function(row){return row.Object_Type==='Operating Expenditures'&&(!isBuildingConstruction||String(row.Object_Code||'').trim()!=='543000');}}
    ];
    if(isBuildingConstruction) recurringSpecs.push({label:'Utilities',predicate:function(row){return String(row.Object_Code||'').trim()==='543000';}});
    var recurringGroups=recurringSpecs.map(function(spec){var rows=expenses.filter(spec.predicate);return {label:spec.label,amount:sum(rows,'FY2027_Proposed'),prior:sum(rows,'FY2026_Original_Budget')};});
    var recurringTotal=recurringGroups.reduce(function(total,item){return total+item.amount;},0);
    var expenseBody=expenseQuestion&&expenseQuestion.querySelector('.wc-simple-disclosure-body');
    if(expenseBody){
      var householdCount=34362;
      var monthlyOperating=recurringTotal/12;
      var annualHousehold=householdCount?recurringTotal/householdCount:0;
      var monthlyHousehold=annualHousehold/12;
      function preciseMoney(value){return Number(value||0).toLocaleString('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2});}
      var contextHtml;
      if(key==='code compliance'){
        var feeRevenue=sum(revenues.filter(function(row){return /permits fees|charges for services|fines and forfeits/i.test(String(row.Revenue_Type||''));}),'FY2027_Proposed');
        var visitorRevenue=sum(revenues.filter(function(row){return /tdc public safety reimbursements/i.test(String(row.Revenue_Name||''));}),'FY2027_Proposed');
        var propertyTaxRevenue=sum(revenues.filter(function(row){return /ad valorem taxes/i.test(String(row.Revenue_Name||''));}),'FY2027_Proposed');
        var propertyTaxHousehold=householdCount?propertyTaxRevenue/householdCount:0;
        contextHtml='<section class="wc-profile-cost-context"><h3>Putting the cost in context</h3><div class="wc-profile-context-grid">'+
          costContextValue('Annual operating cost',money(recurringTotal),'wcAnnualOperatingTip','Personnel and operating expenditures are added together. One-time capital outlay is excluded.')+
          costContextValue('Fees and fines',money(feeRevenue),'wcCodeFeesTip','Proposed permit fees, service charges, code-enforcement fees, and ordinance fines assigned to Code Compliance are added together. These revenues are paid by the people or businesses using a regulated activity or receiving the related service—not evenly by every household.')+
          costContextValue('Visitor-funded reimbursement',money(visitorRevenue),'wcCodeVisitorTip','Tourist Development Tax public-safety reimbursement budgeted for Code Compliance. Tourist Development Tax is collected from short-term lodging stays and is therefore visitor-funded.')+
          costContextValue('Property-tax support per household',preciseMoney(propertyTaxHousehold),'wcCodeHouseholdTip','The '+money(propertyTaxRevenue)+' in proposed ad valorem revenue assigned to Code Compliance is divided by 34,362 Walton County households. This is a cost equivalent, not an individual household tax bill.')+
          '</div><p>Code Compliance is funded primarily through permits, service charges, fines, and visitor-funded Tourist Development Tax reimbursement. The household figure therefore uses only the department’s proposed property-tax support—not its entire operating budget.</p></section>';
      }else{
        var assignedPropertyTax=sum(revenues.filter(function(row){return /ad valorem taxes/i.test(String(row.Revenue_Name||''));}),'FY2027_Proposed');
        var fundingBuckets=departmentFundingBuckets(revenues);
        var nonPropertySupport=fundingBuckets.reduce(function(total,item){return total+item.amount;},0);
        var listedRevenue=assignedPropertyTax+nonPropertySupport;
        var mixedFunding=nonPropertySupport>0&&(!listedRevenue||nonPropertySupport/listedRevenue>=.05);
        if(mixedFunding){
          var primaryFunding=fundingBuckets[0];
          var propertyTaxHousehold=householdCount?assignedPropertyTax/householdCount:0;
          contextHtml='<section class="wc-profile-cost-context"><h3>Putting the cost in context</h3><div class="wc-profile-context-grid">'+
            costContextValue('Annual operating cost',money(recurringTotal),'wcAnnualOperatingTip','Personnel, operating, and any separately displayed recurring utility costs are added together. One-time capital outlay is excluded.')+
            costContextValue(primaryFunding.label,money(primaryFunding.amount),'wcPrimaryFundingTip',primaryFunding.explanation)+
            costContextValue('Assigned property-tax support',money(assignedPropertyTax),'wcPropertyTaxSupportTip',assignedPropertyTax?'Ad valorem property-tax revenue assigned to this department in the proposed budget. Other funding sources are not included in this amount.':'No ad valorem property-tax revenue is assigned directly to this department in the proposed budget.')+
            costContextValue('Property-tax support per household',preciseMoney(propertyTaxHousehold),'wcPropertyHouseholdTip','Assigned property-tax support is divided by 34,362 Walton County households. This is a cost equivalent, not an estimate of an individual household tax bill.')+
            '</div></section>';
        }else{
          contextHtml='<section class="wc-profile-cost-context"><h3>Putting the cost in context</h3><div class="wc-profile-context-grid">'+
            costContextValue('Annual operating cost',money(recurringTotal),'wcAnnualOperatingTip','Personnel, operating, and any separately displayed recurring utility costs are added together. One-time capital outlay is excluded.')+
            costContextValue('Monthly countywide cost',money(monthlyOperating),'wcMonthlyOperatingTip','The annual operating cost of '+money(recurringTotal)+' is divided by 12 months.')+
            costContextValue('Annual per household',preciseMoney(annualHousehold),'wcAnnualHouseholdTip','The annual operating cost is divided by 34,362 Walton County households. This is a cost equivalent, not an estimate of an individual household tax bill.')+
            costContextValue('Monthly per household',preciseMoney(monthlyHousehold),'wcMonthlyHouseholdTip','The annual household cost equivalent of '+preciseMoney(annualHousehold)+' is divided by 12 months.')+
            '</div><p>Household equivalents use 34,362 Walton County households from U.S. Census Bureau statistics. They describe the scale of the department budget and do not represent a bill sent to each household.</p></section>';
        }
      }
      expenseBody.insertAdjacentHTML('afterbegin','<div class="wc-profile-finance-overview">'+recurringGroups.map(function(item){return financeStat(item.label,item.amount,item.prior,recurringTotal);}).join('')+'</div>'+contextHtml);
      if(isBuildingConstruction){
        var utilityMount=document.getElementById('department-building-construction-tables');
        if(utilityMount){utilityMount.classList.add('wc-profile-utility-sheet');expenseBody.appendChild(utilityMount);}
      }
    }

    var capitalRows=expenses.filter(function(row){return row.Object_Type==='Capital Outlay'&&(Number(row.FY2027_Proposed)||0)!==0;});
    var capital=sum(capitalRows,'FY2027_Proposed');
    var capitalItems=capitalRows.length?'<div class="wc-data-table-scroll wc-profile-capital-items"><table class="wc-data-table wc-profile-capital-table"><thead><tr><th>Category</th><th>Item</th><th>Reference</th><th class="wc-num">Proposed</th></tr></thead><tbody>'+capitalRows.map(function(row){
      var description=row.Note||row.Project_Name||row.Object_Name||'Capital investment';
      var category=row.ME_Type||row.Object_Name||'Capital outlay';
      var details=[];
      if(row.Project_Name&&row.Project_Name!==description) details.push(row.Project_Name);
      if(row.Project_Code) details.push('Project '+row.Project_Code);
      if(row.BCC_Replacement) details.push('Replaces asset '+row.BCC_Replacement);
      return '<tr><td>'+escapeHtml(category)+'</td><td>'+escapeHtml(description)+'</td><td>'+(details.length?details.map(escapeHtml).join(' &middot; '):'&mdash;')+'</td><td class="wc-num">'+money(row.FY2027_Proposed)+'</td></tr>';
    }).join('')+'<tr class="wc-table-total-row"><td colspan="3">Total</td><td class="wc-num">'+money(capital)+'</td></tr></tbody></table></div>':'<p class="wc-profile-finance-note">No capital outlay is proposed for this department.</p>';
    var capitalButton=snapshot.querySelector('[data-profile-capital-trigger]');
    if(capitalButton) bindSnapshotInformationSheet(capitalButton,'Capital Investments',capitalItems,title.textContent.trim(),'wc-capital-sheet-body');
    var contracts=expenses.filter(function(row){return String(row.Contract_Status||'').trim()&&(Number(row.FY2027_Proposed)||0)!==0;});
    var contractTotal=sum(contracts,'FY2027_Proposed');
    var contractSheetHtml=contracts.length?'<div class="wc-data-table-scroll wc-profile-contract-sheet"><table class="wc-data-table"><thead><tr><th>Service</th><th>Provider</th><th>Contract / Agreement</th><th>Status</th><th class="wc-num">Proposed</th></tr></thead><tbody>'+contracts.map(function(row){
      var description=row.Note||row.Project_Name||row.Object_Name||'Contractual service';
      var contractLabel=row.Contract_No||'Agreement';
      var contractCell=row.Contract_Link?'<a href="'+escapeHtml(row.Contract_Link)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(contractLabel)+' <span aria-hidden="true">&rarr;</span></a>':escapeHtml(row.Contract_No||'Not provided');
      return '<tr><td>'+escapeHtml(description)+'</td><td>'+escapeHtml(row.Vendor||'Not listed')+'</td><td>'+contractCell+'</td><td>'+escapeHtml(row.Contract_Status||'Not listed')+'</td><td class="wc-num">'+money(row.FY2027_Proposed)+'</td></tr>';
    }).join('')+'<tr class="wc-table-total-row"><td colspan="4">Total</td><td class="wc-num">'+money(contractTotal)+'</td></tr></tbody></table></div>':'<p class="wc-profile-finance-note">No contractual services are identified for this department.</p>';
    var contractsButton=snapshot.querySelector('[data-profile-contracts-trigger]');
    if(contractsButton) bindSnapshotInformationSheet(contractsButton,'Contractual Services',contractSheetHtml,title.textContent.trim(),'wc-contract-sheet-body');
    if(performanceQuestion){
      var performanceBody=performanceQuestion.querySelector('.wc-simple-disclosure-body');
      if(performanceBody) performanceBody.insertAdjacentHTML('afterbegin','<dl class="wc-profile-accountability"><div><dt>Oversight and review</dt><dd>Work is reviewed through Board oversight, budget monitoring, adopted policies, public meetings, and financial reporting.</dd></div><div><dt>Countywide coordination</dt><dd>The department coordinates with other County functions when its work requires shared staff, systems, purchasing, legal, technology, or capital support.</dd></div><div><dt>Measurable results</dt><dd>'+(performanceRows.length?'Published measures include prior results and proposed targets so progress can be evaluated over time.':'No department performance measures were supplied in the published budget data.')+'</dd></div></dl>');
      group.appendChild(performanceQuestion);
    }
    enhanceFinanceSheets(expenseQuestion,null,null);
    renderPerformanceProfile(performanceRows);
    if(key==='libraries'){
      var libraryWebsite=document.querySelector('main#content > a.libraries-iframe-link');
      if(libraryWebsite) document.querySelector('main#content').appendChild(libraryWebsite);
    }
    document.body.classList.remove('wc-board-department-loading');
    var profileMain=document.querySelector('main#content');
    if(profileMain) profileMain.removeAttribute('aria-busy');
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){setTimeout(render,0);},{once:true});
  else setTimeout(render,0);
})();
