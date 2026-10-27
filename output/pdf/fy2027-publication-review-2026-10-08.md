# FY 2027 budget book: publication review

Reviewed October 8, 2026. Source: `walton-county-fy2027-budget-book.pdf`, 135 pages, approximately 39.6 MB. Page references below are the current PDF's physical page numbers.

The chapter order and overall presentation work. The book moves from the Board's choices and community context into financial schedules, budget process, offices, services, staffing, capital, and reference material. The department pages now have a consistent reading order, with services and measures across the page. Keep that structure.

The publication cleanup has now been implemented. The revised book remains 135 pages; the transportation ledger spans pages 114–116, the reference cover is page 124, and the refreshed FAQ/glossary spans pages 125–132. A complete static reading edition is saved at `pages/full-budget-document.html` and linked from the book viewer.

**Two amounts still need owner confirmation before release:** the $3,000 Mosquito Control discrepancy below, and a $10,000 difference between the FY 2026 departmental account rollup ($327,935,088) and the confirmed countywide total ($327,945,088). Neither amount was invented or assigned to an account. The adopted countywide totals were preserved.

The findings below record the original review; the implementation status at the end explains what changed.

## Corrections before publication

| Pages | Finding | Recommended correction |
| --- | --- | --- |
| 4, 22, 27, 34 | The opening summary says property taxes are **$151.1M** and Public Safety is **$126.2M**. The current ledgers show **$151,592,125** for the County operating property-tax levy, **$153,019,062** including the mosquito district, and **$126,571,918** for Public Safety. | Use **$151.6M** and explicitly identify the County operating levy, or **$153.0M** if describing both levies. Use **$126.6M** for Public Safety. Keep the opening narrative tied to the same figures as the ledgers. |
| 23, 35, 52, 54 | The BCC office is **$12,935,889** on the office ledger and profile, but **$12,972,780** in the expenditure ledger and summary note: a **$36,891** difference. The page 23 note's stated components—$11,267,780 + $1,705,000 + $400,000—actually total **$13,372,780**, $400,000 above the total it claims. Page 52's $2,110,000 Capital & Other also exceeds its note's capital-plus-contingency components by $5,000. | Reconcile the BCC reporting scope and classification throughout, preserving the requested removal of Court Innovation salary from BCC personnel. Show capital and contingency once, identify the remaining $5,000, and update affected subtotals. Do not simply force the profile to the older total. |
| 35, 95, 111, 114, 120 | Public Works is **$27,826,000** on its profile and **$27,825,000** on the expenditure ledger. Its profile lists roadway infrastructure at **$4,501,000**, while the capital schedules use **$4,500,000**. Equipment is **$2,499,000**, making the scheduled capital total **$6,999,000**, versus $7,000,000 on the profile. The FY 2026 profile/ledger comparison also differs by $1,000. | Confirm the controlling appropriations, then correct the profile's capital amount, total, comparison, and funding reconciliation together. |
| 22, 38, 89 | The book uses **$1,426,937** for Mosquito Control. The County's October 1 adoption announcement reports **$1,429,937**. | Resolve the **$3,000** difference against the executed final budget resolution and account schedule. The announcement alone does not establish which account needs correction. [County adoption announcement](https://mywaltonfl.gov/m/newsflash/home/detail/3564). |
| 42 | Tourist Development Fund growth is shown as **15.9%**. The fund comparison is $58,965,950 versus $51,500,000, which is **14.5%**. The tax-revenue comparison elsewhere uses a different FY 2026 base and rounds to **16.0%**. | Use **14.5%** for fund-budget growth, or **16.0%** with an explicit tax-revenue label. A budgeted increase is not evidence of actual visitor or economic growth; replace this economic-condition card with a properly sourced indicator or move it to the financial discussion. |
| 61 | “Statutory & Other Agency Funding” labels the entire **$3,502,844** as Property Tax, but its detailed list includes **$254,887** of opioid settlement funding. | Separate the settlement amount or label the funding as a combination of property taxes and opioid settlement proceeds. Preserve the total while clarifying who pays. |
| 124–132 | The assembled FAQ and glossary retain outdated material despite several corrections already present in the website source. | Rebuild this section from corrected current copy, then inspect the assembled PDF rather than relying on a prior review report. Details follow. |
| 135 | The “Accessible web publication” link points to `/pages/full-budget-document.html`, which returned **HTTP 404** during this review. The visible County address is `mywaltonfl.gov`, but the hyperlink targets another County domain. | Link to the actual final publication and match the visible address to the hyperlink. Verify the replacement on the published site. |

### FAQ and glossary corrections

- **Page 124:** One mill applies to **taxable value**, not assessed value before exemptions. Replace the $50,000 exemption/$650 example with the book's existing **$51,411 exemption, $198,589 taxable value, and $645.41 County operating tax** example. The standard additional non-school exemption for the 2026 roll is $26,411; together with the first $25,000 this gives $51,411 for an eligible example home. [Florida Department of Revenue, 2026 adjustment](https://floridarevenue.com/property/Documents/cpi_homestead_exemption.pdf).
- **Page 126:** Correct the balanced-budget citation to **s. 129.01(2)(c), Florida Statutes**. The website source currently uses the right section but still the wrong paragraph, `(2)(b)`. [2026 Florida Statutes](https://www.flsenate.gov/Laws/Statutes/2026/129.01).
- **Page 126:** Rewrite Assessed Valuation to distinguish just/market, assessed, and taxable values. Remove the claim that all property is reassessed every two years and that assessed value must approach 100% of market value. Assessment caps and exemptions are central to residents' understanding of their bills.
- **Pages 126–130:** Review legacy accounting terms such as Agency Funds, Expendable Trust Funds, account groups, and the description of NCGA as the primary accounting authority. Use current County financial-report terminology and short definitions appropriate to this budget.
- **Page 130:** MSBU means **Municipal Service Benefit Unit**, not Benefit District.
- **Page 131:** Remove annual intangible personal property tax from the examples of current state-shared revenue. That annual tax was repealed effective January 1, 2007; other forms of intangible tax were not all repealed. [Florida Department of Revenue repeal notice](https://floridarevenue.com/taxes/tips/documents/TIP_07C02-01.pdf).
- **Page 131:** Replace the blanket 15-year local-option sales-tax description with the description of Walton's actual levy and applicable authority. Avoid presenting a generic duration as a universal rule.
- **Page 132:** Use **U.S. Department of Veterans Affairs** for VA.
- **Pages 126–127:** Align Budget Document/Budget Message responsibility with the County's actual CFO-led process described at the beginning of the book.

## Changes that would make the book more useful

### Explain the total change, then the service effect

The green department cards are useful, but several “Primary change” statements describe a single increase even when the overall budget declines. For example:

- **Extension, page 75:** Total decreases $43,391, but the primary-change note only mentions the $40,000 truck increase.
- **Purchasing, page 96:** Total decreases $112,296, but the note only mentions a $64,000 increase in publications, subscriptions, and memberships.
- **Beach Operations, page 101:** “Other purchased services” is an accounting category; residents need to know what service that appropriation buys.

Use a short explanation of the main net drivers and their practical effect. Retain specific funded purchases. Confirm service explanations with the responsible office; do not infer service cuts from a lower appropriation or promise an outcome the data do not establish.

### Make the funding scope clear

**Solid Waste, page 91**, shows $40,701,564 of fund resources next to a $23,119,567 operating profile. The Fund Financial Ledger and transfer schedule explain the broader use of the fund, but a reader on this page cannot readily reconcile it. By contrast, Public Works' funding rows total $27,825,000, agreeing with its expenditure-ledger total and further highlighting the $1,000 profile discrepancy.

Distinguish “Department funding” from “Fund resources,” and show or briefly identify the transfer/other-use amount when broader fund figures are retained. This explanation is more helpful than repeating generic descriptions beneath every revenue row. Do not assume every funding list must equal an office appropriation when its scope is legitimately fundwide.

### Remove internal editorial language, keep necessary scope notes

The following still read like preparation notes:

| Page | Wording to tighten | Reader-facing treatment |
| --- | --- | --- |
| 3 | The schedules do not assign the fund-balance draw between one-time projects and recurring services. | Remove this sentence, consistent with the earlier requested removal. Keep the amount used and the implication for future flexibility. |
| 43 | The current book has no historical forecast-accuracy series. | Remove. Retain verified forecast assumptions and risks. Confirm the promised OMB variance-reporting process before publishing it as a County commitment. |
| 67 | Permit and inspection counts do not establish faster review or independently measured accuracy. | Use a simple label that these are workload measures. |
| 72 | The budgeted drawdown is not a certification of compliance. | Keep the restriction and statutory explanation; remove the defensive certification sentence. |
| 89 | The annual report does not give an inspection count. | Remove from the workload narrative. Identify the source and status of the 9,600 comparison separately so an annual-report citation does not imply support for a figure absent from that report. |
| 98–99 | Performance is reported with Tourism Administration's measures. | Tourism Administration's page currently has no performance measures. Remove this unsupported cross-reference. Use “Core Services” with concise responsibilities, or add a reference only if approved measures actually exist. Do not restore tourism jobs as office performance measures. |

Keep useful notes about partial-year results, repeat visits/trips, statutory restrictions, and the difference between an appropriation and a full project cost. Those prevent residents from misreading the numbers.

### Make performance comparisons accurate and easy to read

- **Page 80:** The probation measure says “per calendar year,” while its 2025 result is identified as fiscal-year data. Align the title and periods or explicitly identify the change in basis.
- **Page 83:** “REPORT RESULT” for pool attendance does not identify a year or reporting period. Name the period supported by the annual report.
- **Page 89:** Consolidate the repeated treatment-acreage caveat into one note.
- Label historical figures as actual only where confirmed. Retain FY 2026 as a projection until the office supplies a completed-year result; FY 2026 has now ended.
- Explain major target changes only when the department can support the reason. For example, the Code Compliance target drops from 11,000 projected cases to 8,000; do not manufacture an explanation or reintroduce an internal note about missing data.

### Improve printed readability without another department redesign

Visual review found no obvious major page collisions. However, measured text sizes on several dense schedules are approximately **6–7 points**, including parts of pages 18, 70, 95, 104–105, and 114–115. These are small at actual letter size, especially funding explanations and capital-project descriptions.

Shorten repeated generic text, enlarge table descriptions and footnotes, and split a dense schedule where needed. Aim for roughly 9-point table text and larger body text where the layout allows. This is a readability recommendation, not an accessibility certification. Keep the full-width services/performance layout and the factual budget detail.

### Small navigation and consistency fixes

- **Page 20:** “Four totals that mean different things” introduces only three cards. Change to **“Key budget totals”** or **“Three totals that mean different things.”** Restore the missing printed page number.
- **Pages 23 and 31:** When the group includes BCC, use **“Constitutional Officers and Board Office”** consistently.
- **Page 15:** The “36.8% since 2010” growth statement needs an end year. Check its original period against the later BEBR 2025 estimate; avoid implying an older growth calculation runs through 2025.
- Move the PDF bookmark for **FY 2027 Response, page 16**, into the Our County group instead of leaving it at the end of the bookmark list.
- Make each department QR code/“View Online” label clickable in the PDF. The department QR labels currently have no corresponding web-link annotations. Provide a readable URL alternative for paper users where practical.
- Preserve the standardized footnote treatment when making these changes.

## Checks that passed and limits of this review

All 135 pages were rendered and visually screened; text, key cross-chapter totals, bookmarks, links, and representative dense pages were examined in detail.

The headline arithmetic reconciles:

- $323,964,332 current-year resources + $21,259,176 fund-balance use = **$345,223,508 net expenditure budget**.
- $345,223,508 net expenditure budget + $143,663,984 internal transfers = **$488,887,492 gross schedules**.
- The 15 fund rows on page 38 sum to **$431,812,854 beginning balance** and **$410,553,678 ending balance**, a **$21,259,176** decrease; their individual beginning-plus-sources-minus-uses calculations reconcile.
- Scheduled FY 2027 debt service is **$2,581,997**: $2,313,077 principal + $268,920 interest.
- The FY 2027 officer and Board office personnel rows on page 105 sum to **$104,428,668**; adding Board department personnel costs of $59,751,103 gives the **$164,179,771** total on page 104.

These checks do not independently validate every account against the accounting system, lender documents, or each performance measure against departmental records. In particular, BCC, Public Works, and Mosquito Control need the reconciliations described above.

## Final release checks

1. Resolve the controlling figures and carry each correction through the narrative, schedules, profiles, totals, and website.
2. Rebuild the FAQ/glossary and verify the corrected text actually appears in the assembled final PDF. The current PDF still contains older wording than its website source.
3. Recheck page numbers, table of contents, bookmarks, cross-references, links, and QR destinations after any pagination changes.
4. Provide a tagged PDF with verified reading order and table structure, or a verified accessible equivalent publication. The reviewed PDF has no accessibility tag structure, and its advertised web alternative currently returns 404.
5. Update the public release label and link. The [County Budget Publications page](https://www.mywaltonfl.gov/260/Budget-Publications) still lists “2027 Tentative Budget” as of this review.
6. Print representative pages at actual size, including 18, 95, 105, and 114–115, and confirm the text remains comfortable to read.

The highest-value next pass is reconciliation and final copy cleanup, followed by readability and access fixes. A broad redesign is unnecessary.


## Implementation and verification — October 8, 2026

- Corrected the opening County operating property-tax figure to $151.6M and Public Safety to $126.6M.
- Reclassified the existing $36,891 Court Innovations personnel appropriation from BCC to Court Innovations without changing account codes or dollar amounts. BCC now reconciles to $12,935,889 throughout; its $5,000 of grants is identified.
- Restored unchanged Health Department, State Fire, Guardian ad Litem, and Daughette MSBU rows in the budget-change comparison. Corrected the site's MSBU category. FY 2027 group subtotals now sum to $345,223,508 in both print and site.
- Corrected Public Works to $27,825,000, comprising $6,999,000 in capital. All department prior-year profile totals now use the deduplicated FY 2026 account schedule, avoiding repeated historical rows.
- Rewrote primary changes using net budget drivers, clarified Solid Waste's department-versus-fund scope, removed internal editorial wording, and aligned reporting-period labels.
- Corrected the agency funding label for opioid settlement proceeds and separated the Human Services amount from the CRA line.
- Rebuilt all 112 glossary terms and the FAQs from the corrected source. Updated the homestead example, statute paragraph, accounting terminology, and agency names.
- Increased dense ledger and department text, spread transportation projects over three pages, and shortened repeated tourism-project funding/status labels while retaining amounts, benefits, delivery stages, and operating effects.
- Updated contents, page references, sorted bookmarks, department destinations, page 20 numbering, and clickable QR captions. Removed unsupported claims that the brief was distributed at hearings or that this edition had already been submitted for an award.
- Added a complete responsive reading edition with real financial/performance tables, glossary definition lists, keyboard-accessible table scrolling, and a textual organization-chart explanation. The PDF back-cover reading link now has a corresponding local publication page. The County-address hyperlink matches its visible text.

Verification: all 135 pages rendered and screened; enlarged dense pages inspected separately; all rebuilt content clears its footer; site syntax/resource checks passed; static-budget browser checks passed for 12 pages; corrected BCC and comparison subtotals verified in the local rendered site. The reading edition passes the automated WCAG A/AA checks used here and has no page-wide overflow at 390px width. Automated checks do not constitute an accessibility certification; the assembled PDF remains untagged, with the reading edition providing the structured alternative.

The site and document have not been published. Verify deployed reading/PDF links after release, and have the County's Budget Publications listing updated from tentative to final through the authorized publishing process.

## General Fund opening-balance update — October 8, 2026

At the user's direction, FY 2027 uses the FY 2025 audited unassigned General Fund balance of $58,393,573 as its opening assumption in place of $81,910,494 total fund balance. The planned draw remains $8,047,270, leaving $50,346,303 on this basis. FY 2028 and later projections roll forward from the revised base. Other funds, revenue, spending, transfers, and historical columns remain unchanged.

The fund ledger, reserve page, long-term outlook, static site schedules, newspaper-format summary, and Forecast Explorer identify this basis. Countywide opening/ending balances therefore become $408,295,933 / $387,036,757 for FY 2027; these combine General Fund unassigned balance with other funds' total balances and are not total governmental fund balance.
