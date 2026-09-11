# Walton County FY2027 Tentative Budget — production and GFOA review

Review date: September 10, 2026. Reviewed local working copy; changes have not been deployed.

## Final verdicts

**TECHNICAL / PRODUCT: NOT READY TO SHIP as the complete public publication.** The website's core flows are substantially improved, but the linked PDF lacks meaningful semantic accessibility. Production privacy/data-access verification also requires sign-off before presenting this as a finished government publication.

**GFOA: PARTIAL GFOA READINESS — CONTENT GAPS REMAIN.** There is substantial supporting information and useful interactivity. The largest weakness is explaining the decisions, tradeoffs, expected service changes, and long-term consequences in a clear, approved budget story.

This is an independent readiness assessment, not an official GFOA score, compliance certification, or award prediction. PASS/PARTIAL below are the requested review classifications, not GFOA ratings.

### Important submission timing

This review uses the attached criteria updated **8/1/2025**, as requested. GFOA's current implementation guidance says applications under the revised framework begin in January 2027, with a choice of frameworks during 2027 and mandatory revised criteria starting in 2028. Confirm the intended submission date and framework with GFOA; the October 1, 2026 fiscal-year start alone does not settle that choice. [GFOA implementation guidance](https://www.gfoa.org/budget-award-2026), [revised criteria](https://www.gfoa.org/budget-award-2026-criteria).

## 1. Production changes made

- Added prominent FY2027 **tentative** status, fiscal-year dates, expenditure scope, and direct paths to changes, services, and participation on the explorer homepage.
- Corrected the description of the five independently elected constitutional offices versus the Board's placement in that explorer.
- Fixed footer search inside the actual opening popup, keyboard search selection, focus restoration, hidden search semantics, and recent-search behavior. Gave search a readable dark-green surface and visible selected/focused results.
- Added an exit from the opening explorer; improved background isolation and keyboard handling in search, explorer, and budget-detail overlays.
- Made wide ledger tables keyboard-focusable; improved footer, finance-card, and year-label contrast; removed forced logo text-spacing overrides.
- Added an expandable data table to department budget graphs using the same plotted values, and labeled the chart. Clarified that the occupational wage sidebar is a reference benchmark, not County employee pay.
- Added the County-confirmed FY2027 position mix of 1,508 full-time and 7 part-time positions to the workforce explanation. Reused the personnel ledger's historical-cost crosswalk for workforce comparisons.
- Corrected department operating-cost percentage denominators. Removed misleading capital-card shares that implied overlapping views could be added together; labeled the non-Sheriff capital scope and explained overlapping homepage views.
- Corrected program historical comparisons to use deduplicated accounting rows. Displayed actual supplied goals, measure names, and all contributing units rather than truncating the list. Restored existing Board-priority/department-measure exploration within the program page.
- Relabeled department-mapped program funding: it is not a verified user-fee cost-recovery rate or program subsidy. Disclosed that position-cost estimates include allocations to reconcile with department budgets.
- Removed the public-facing authoring checklist and its unused JavaScript. Changed FY2027–2031 capital-plan references from adopted to tentative.
- Added the user-confirmed record of four public workshops and no public engagement at those workshops, without inventing feedback or decisions attributed to feedback.
- Prevented missing primary revenue/expenditure data from producing apparently valid partial totals; independent-agency errors no longer become a ready state with zero-dollar budgets.
- Added transaction date/amount range validation, connection-error handling, stale-request protection, and spreadsheet-formula protection for downloaded text fields.
- Labeled the property calculator input and distinguished taxable value after exemptions from market value. Explicit manual values no longer depend on the parcel download; added an address no-match message.
- Corrected the calculator's old 3.519 rate to the published FY2027 tentative rate of 3.4347. Removed the misleading calculation that applied department budget-growth percentages to a resident's estimated tax; the result is now the County tax estimate allocated by proposed funding share. Removed the unsolicited dialog that interrupted typing on first focus.
- Added entry-page description, favicon, canonical and sharing metadata, plus return-to-County and prior-budget links.
- Updated the privacy notice to disclose the already-running Microsoft Clarity service and remove obsolete theme/guide preferences. This is a technical disclosure update, not legal approval.
- Applied compatible dependency security updates: npm reported **zero vulnerabilities** after the update.
- Expanded `npm test` from three syntax checks to a read-only validator covering **98 HTML pages, 130 JavaScript files/inline blocks, and local HTML resource targets**. Updated asset versions so returning browsers receive the changes.

## 2. GFOA scorecard

| GFOA Category | Status | Evidence in Site | Gap | Recommended Action |
|---|---|---|---|---|
| Community Priorities / Challenges | PARTIAL | Program page now exposes existing Board priorities and linked department goals, measures, and targets; department challenge narratives exist. | No concise, approved countywide explanation connecting the largest FY2027 challenges to specific funded responses, choices, and expected improvement. | **CONTENT NEEDED:** executive budget story and challenge → response → cost → result relationships. **UI FIX completed:** expose existing priority detail. |
| Value | PARTIAL | Department service descriptions, program costs, public benefits in capital narratives, and personalized County property-tax estimate. | Activity measures do not consistently explain service quality, community benefit, or what changes for the resident. No consistently supported unit-cost/service-value comparisons. | **CONTENT NEEDED:** plain-language benefit and outcome statements; denominators and scope for any requested unit-cost measures. Do not divide countywide cost by households without an approved basis. |
| Long-Term Outlook | PARTIAL | Forecast through FY2031, fund schedules, revenue/expense assumptions, debt and policy links; tourist-development and transfer-supported fund distinctions. | Forecast balances are not clearly tested against an approved reserve threshold; “stable” labels are not a policy-sufficiency finding. Deferred work, lifecycle costs, and current choices' consequences are incomplete. | **CONTENT NEEDED / DATA FIX:** approved reserve basis and minimums, commitments and deferrals, and interpretation of each material trend. Reconcile beginning balances and restrictions. |
| Revenue Budget | PARTIAL | $345.2M countywide revenue view; top 12 sources cover about 89%; full ledger, prior-year comparisons, restrictions/control/recurrence badges, assumptions and burden explanations. | Staff approval/provenance for every classification, visitor-share assumption, and forecast normalization is not established. Tax-base classes are not interchangeable with residents versus visitors. | **CONTENT NEEDED:** source-specific estimate methods, approved assumptions, restrictions, one-time decisions, and burden methodology. **DATA FIX:** resolve source-to-department funding reconciliation. |
| Personnel Budget | PARTIAL | Workforce total of 1,515 FTE, 1,508 full-time and 7 part-time positions, and approximately $164.2M; department positions, changes, salary/benefit comparisons. | Position model has 33 department discrepancies before allocation adjustments. Explanations of additions, reductions, vacancies, and cost drivers remain uneven. | **DATA FIX / CONTENT NEEDED:** position-cost reconciliation and explanations of additions, reductions, vacancies, and cost drivers. |
| Department Budget | PARTIAL | Functions, goals, services, historical measures/FY27 targets, cost and revenue snapshots, staffing and ledger/graph drilldowns; reviewed Planning, Attorney, Sheriff and tourism profiles. | Coverage and authority vary; activity counts are not always outcomes. Accountability owners, reporting cadence, and explicit service-level changes are not consistently provided. Financial parity exceptions remain. | **CONTENT NEEDED:** department sign-off on responsibilities, service changes, goals, measure definitions, target basis, and result owner. **DATA FIX:** funding and personnel exceptions. |
| Program / Services Budget | PARTIAL | Eight service areas, $345.2M total, 67 contributing units, 65 measures, cost composition and mapped funding; goals and priorities are now accessible. | Groups are broad service areas rather than independently costed programs. Revenue mapping does not establish fee recovery; service-level forecasts and fee policies remain incomplete. | **CONTENT NEEDED / DATA FIX:** approved program boundaries, actual attributable revenues, allocation method, subsidy/fee policy, service-level choices, and program outcomes. |
| Capital Budget | PARTIAL | Definition and threshold, multiyear plan, project search, fund/equipment ledgers, project purposes and funding. | $71.3M project plan and $51.3M non-Sheriff capital appropriations are different scopes without a complete bridge; overlapping equipment/fund views. Project-level ranking rationale, operating impacts, and reliable timing/status remain uneven. | **DATA FIX:** reconcile CIP, appropriations, grants, officer capital, equipment and carryforward. **CONTENT NEEDED:** project owner, priority rationale, status/dates, new/replacement/rehabilitation classification and recurring operating costs. |
| Budget Process | PARTIAL | Four phases, roles, budget calendar, meeting links, contact path, and truthful workshop-participation statement. | Calendar expressly describes estimated dates, not verified meeting notices. No concise decision/tradeoff record showing how priorities affected final recommendations. | **CONTENT NEEDED / EXTERNAL INTEGRATION:** four actual workshop links/dates, verified hearing notices and participation instructions, major decisions, and confirmation of public-input record. |
| Budget Website / Dashboard | PARTIAL | Main County publication page links this site; searchable and interactive; major layouts and flows tested; return-to-County and historic-budget links added. | Publication-level PDF accessibility; update date/cadence and release ownership; multilingual support absent; real assistive-technology/cross-browser and production controls still need verification. | **UI FIX / CONTENT NEEDED / EXTERNAL INTEGRATION:** finish publication remediation, publish trustworthy update metadata, approve maintenance/accessibility/privacy workflow, and complete release verification. |

No major category was marked NOT APPLICABLE: there was no defensible basis to exclude it. Several individual aspects pass (FY/status visibility, available drilldowns, official-site link, and tested responsive layouts), but none justifies declaring an entire category complete.

## 3. Staff content requests

The companion `gfoa-staff-content-requests.md` contains ready-to-send requests. The highest-priority requests are: the executive budget message; position-cost reconciliation; department outcome ownership; reserve policy/forecast interpretation; and verified public hearing information.

## 4. Website-specific review

| Area | Assessment |
|---|---|
| Discoverability | **PASS for existence of official path; PARTIAL for prominence.** County website → Departments → OMB → Budget Publications → “2027 Tentative Budget” reaches the correct domain. The County page still describes OpenGov, which should be updated by its webmaster. The local explorer now links back to the County and prior budgets. [Official publication page](https://www.mywaltonfl.gov/260/Budget-Publications). |
| Interactivity | **PASS for useful available controls.** Search, revenue details, program detail, workforce links, capital search, forecast fund schedules and transaction filters provide useful access. A collection of controls does not replace a plain-language budget message. |
| Drilldown | **PASS in tested representative journeys.** Entry → search → Planning → graph; revenue → property taxes → calculator; programs → service detail; workforce → department; forecast → fund schedule. Individual records and every popup permutation were not exhaustively tested. |
| Public engagement | **PARTIAL.** Roles, calendar, meeting resources and contact are available. User reports four workshops without public engagement; that is disclosed accurately. Verify notices and direct recording links. The existing News Flash path is not proof of a budget-specific subscription. |
| Mobile accessibility | **PASS for tested major layouts, with follow-up validation.** 390px phone, 768px tablet, 1366px laptop and 1920px desktop scans found no document-level horizontal overflow. Tables can scroll horizontally. A 640×450 effective viewport exercised search/chart reflow representative of a laptop at 200% zoom; not a substitute for real browser zoom/device testing. |
| Disability accessibility | **PARTIAL.** Automated WCAG A/AA checks and representative keyboard interactions improved; department graph data tables added. Automated passes do not establish screen-reader usability. PDF semantic structure remains inadequate. Complete VoiceOver/NVDA, focus-order, nested-dialog, video-caption and cross-browser tests. |
| Multilingual availability | **MISSING.** No supported multilingual budget experience was established. Treat as an opportunity based on community needs, with qualified translation and maintenance—not automatic machine translation added without approval. |
| Timeliness | **PARTIAL.** Fiscal year and tentative status are visible; historical years are reachable externally. A trustworthy publication/update timestamp, amendment log and refresh responsibility are not exposed. A fetch time or today's date is not an approved “last updated” date. |

## 5. Remaining launch blockers — separate from GFOA narrative gaps

### Publication/data blockers

1. **PDF accessibility is not complete.** Structural inspection found `/Marked true`, language `en-US`, a Document and 132 Sect tags, but no heading, paragraph, table, or figure structure and no alternative text. Cover text is not extractable. The presence of a tag tree does not make this a properly tagged publication. Remediate in the source/export workflow and verify reading order and table semantics in an accessible PDF checker and screen reader. The PDF filename is not evidence of award or accessibility readiness.
2. **Resolve or explain model exceptions before claiming reconciled detail.** The app's department expense/revenue audit flags Solid Waste ($57,701,564 versus $40,701,564) and Tax Collector ($8,500,000 versus $4,449,400). These may involve financing or scope differences—not proof of an unbalanced legal budget. The personnel model flags 33 pre-allocation discrepancies; largest is Public Works, approximately $341,568. Staff must approve source rows and allocations, not merely force equality.

County confirmation received after the initial review: the 1,508 full-time / 7 part-time figures are supported, and the intentionally overlapping overview budget views and scope explanation are approved. Neither is a remaining blocker.

### External release verification

- County IT/privacy owner must confirm the public-only Supabase permissions, deployed migration state, data publication/redaction review, analytics/Clarity consent and masking configuration, retention and privacy notice. The review did not probe private tables or certify backend access controls.
- Test the deployed HTTPS/custom-domain site after release, including search, data feeds, PDFs, external links, mobile browsers and assistive technology. Local tests do not establish that production is serving these changes.
- Verify actual public-hearing dates and notices before residents rely on the calendar. The current planning-date caveat is helpful but not a substitute for official notice.

### GFOA gaps that are not themselves software blockers

The executive story; quantified challenge responses; verified program service-level choices; outcome definitions; reserve-policy interpretation; capital lifecycle consequences; source assumptions and visitor-burden methodology; and multilingual content. These require government content/approval. They should not be fabricated to fill an award checklist.

## 6. Verification record and limits

- **86 page/layout visits** across 32 major routes and four viewport sizes. Mobile/laptop runs used automated WCAG 2 A/AA and 2.1 AA tags (PDF viewer excluded from automated checks). The completed scan had no detected violations on scanned states, no uncaught application errors, no failed requests, and no page-level horizontal overflow. Subsequent targeted interaction tests covered later changes.
- **14 representative interaction scenarios** across phone and laptop, plus actual root “Begin” → footer keyboard search → Planning → graph/data-table flows and reduced-effective-viewport checks. Search restored focus; Escape closed the graph without closing the parent department. Test scripts were corrected when selectors or page readiness—not product behavior—caused early failures.
- Fault injection blocked primary Google Sheet requests in a fresh session. The page displayed an unavailable/degraded state without fabricated zero totals or uncaught errors.
- `npm test`: 98 HTML pages, 130 script files/inline blocks, literal local HTML resource links passed. `git diff --check` passed. Compatible npm audit fix reported zero vulnerabilities.
- Type checking: no TypeScript project configured. Dedicated lint: not configured. Production build: not applicable to this static HTML/JS site; no bundler/build script exists. The static validator is not a substitute for a type system or comprehensive unit tests.
- Embedded-media/headless warnings remain: fullscreen-attribute redundancy, video-provider postMessage-origin warnings, unavailable graphics adapters and PDF canvas readback advice. No evidence from these runs establishes a production playback failure; validate real-device video separately.
- Screenshots were captured and representative mobile/desktop states visually inspected. This was not a line-by-line certification of all 98 pages, every project, every financial record, all external links, or all chart hover states. No load/stress test, penetration test, screen-reader certification, or production deployment occurred.
- Large PDF/media/parcel resources and third-party dependencies remain performance risks on slow connections. Cold-data, throttled-network and real-device performance budgets should be part of release acceptance; no invented Lighthouse score is provided.

## 7. Worthwhile post-launch improvements

1. A short approved “three decisions in this budget” introduction with dollars and expected resident benefit.
2. A genuine mutually exclusive “where spending goes” chart using OMB's approved scope, while preserving alternative explorer views.
3. Project status/timing/lifecycle cards with owners and update cadence.
4. Service outcome comparisons and carefully defined unit costs where data supports them.
5. Qualified translations for priority resident journeys; accessible video transcripts/captions.
6. Smaller on-demand parcel lookups and lazily loaded media; performance budgets on slower phones.
7. Automated release regression tests for nested popups, financial invariants, failed feeds and accessibility; a named maintainer and amendment log.

### Reference notes

The Florida Department of State publishes the proposed amendment's exemption changes; the County-specific financial effect and budget response still require an approved local model. [Official proposal](https://constitutionalinitiatives.dos.fl.gov/Home/InitDetail?account=10&seqnum=110).

The Clarity disclosure update describes the service already found in the site's scripts; Microsoft recommends disclosing heatmaps/session replay and linking its privacy statement. Legal/consent approval remains with the County. [Microsoft disclosure guidance](https://learn.microsoft.com/en-us/clarity/setup-and-installation/privacy-disclosure).
