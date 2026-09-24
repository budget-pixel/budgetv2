# Print budget accuracy review — September 24, 2026

The corrected print book remains 128 pages. Changes are in the source builders and shared glossary, so future builds retain them.

## Completed

- Balanced Budget now cites **s. 129.01(2)(c)**. The checklist's proposed (2)(b) is an older numbering; (2)(c) is the balanced-budget provision in the current published statute. Corrected 200.65 to s. 200.065.
- Annual January 1 assessment replaces biennial reappraisal language; assessed value is distinguished from market and taxable value.
- Homestead definitions and both print examples use the 2026 non-school maximum of $51,411 ($25,000 plus $26,411). A $250,000 assessed home has $198,589 taxable value and $645.41 county operating tax at 3.2500 mills. The allocation example was recalculated.
- Removed the repealed annual intangible tax from current shared-revenue examples; identified GASB, Department of Veterans Affairs, and Municipal Services Benefit Unit correctly.
- Budget Message now identifies this book's OMB Chief Financial Officer as presenter/signatory without assigning a general statutory authorship requirement.
- Pages 9, 38, and 126 use BEBR's **90,547 population estimate, April 1, 2025**. Growth is 20.2% from the 2020 Census count. Remaining socioeconomic figures are labeled as 2018–2022 ACS; $101,823 is explicitly a median in 2022 dollars.
- Concurrency wording distinguishes the four statewide services from optional additional local facilities, with a citation to s. 163.3180.
- Transportation projects are sorted numerically before pagination. The separate grant project remains separate. The $3 million Holiday Shores project consistently says Phase IIA, matching the capital ledger; this is internal reconciliation, not independent engineering certification.
- Taxpayer values match the **2025** table on printed p. 155 of the FY2025 ACFR. Added the tax-roll year and source. The combined percentage is recalculated as $932,394,393 / $46,564,251,989 = **2.00%**; summing rounded row percentages had produced 2.01%. The ACFR's own total percentage (1.64%) is also inconsistent with these amounts.
- Corrected Blue Cover to **15 Blue Cove Drive Partners LLC**, supported by Florida Division of Corporations record M23000012649.

## Outstanding source verification

The Property Appraiser website returned a browser verification challenge, so direct roll verification was not completed. Do not treat the taxpayer-name review as closed:

- The FY2024 ACFR lists San Destin Hilton, LTD and San Destin Hotel LLC, matching the existing budget names.
- The FY2025 ACFR switches the suffixes to San Destin Hilton LLC and San Destin Hotel, LTD. Retained the existing names and explicitly flagged this in the print source note instead of guessing.
- Blue Cove's legal entity spelling is verified in Sunbiz, but its linkage to the $59,389,315 roll entry still needs direct Property Appraiser confirmation.

## Sources

- https://www.flsenate.gov/Laws/Statutes/2025/129.01
- https://www.flsenate.gov/Laws/Statutes/2025/163.3180
- https://leg.state.fl.us/Statutes/index.cfm?App_mode=Display_Statute&URL=0100-0199/0192/0192.html
- https://floridarevenue.com/property/Documents/2026NALexempt.pdf
- https://floridarevenue.com/taxes/tips/documents/TIP_07C02-01.pdf
- https://gars.gasb.org/
- https://www.bebr.ufl.edu/wp-content/uploads/2025/12/estimates_2025.pdf (Tables 2–3)
- Local ACS provenance: assets/census-data.json, 2022 vintage.
- https://waltonclerkfl.gov/vertical/sites/%7BA6BED226-E1BB-4A16-9632-BB8E6515F4E0%7D/uploads/Annual_Comprehensive_Financial_Report_Walton_County_Florida_FY2025_ACFR_with_Constitutionals%281%29.pdf (printed p. 155)
- https://waltonclerk.com/vertical/sites/%7BA6BED226-E1BB-4A16-9632-BB8E6515F4E0%7D/uploads/Walton_County_BCC__with_Tabs_and_Constitutionals.pdf (printed p. 157)
- https://search.sunbiz.org/Inquiry/corporationsearch/SearchResults?inquiryType=EntityName&searchTerm=15+BLUE+COVE+DRIVE+HOLDINGS+LLC

## Validation

All affected chapters rebuilt and assembled successfully. The final PDF has 128 pages; content checks confirm removal of the obsolete statute, assessment, GAAP, and average-income wording. Visual review covers the changed pages and repaginated glossary. `git diff --check` passed. The site check reports an existing missing target, `full-budget-document.html`, linked from `pages/budget-book.html`; those files were not changed in this review.

## Figures reconciliation checklist

- Property-tax allocation now uses the p.29 shares on p.60: Sheriff 65 cents, Capital 11 cents, Clerk 5 cents, and the remaining displayed recipients totaling $1.00.
- Sheriff FY2026 is labeled as the amended fund budget; its personnel and operating increases are offset by lower capital funding within an unchanged total budget. The Fund Highlight is corrected from +2.7% to 0.0%, consistent with both the County fund presentation ($114,116,228 each year) and the Sheriff's certification ($114,369,181 each year, including $252,953 of court services budgeted outside the Sheriff Fund).
- BCC totals now carry a scope note: $11.086M operating base, $12.391M including capital but excluding contingency, and $12.791M office total including both.
- Department profile totals were aligned to the expenditure source for Building Construction and Maintenance ($8.912M), Planning ($7.048M), Libraries ($2.156M), and County Administration (+$40K).
- Independent-agency figures identify their scope: $6.93M General Fund comparison set, $8.05M property-tax allocation, $8.70M net-expenditure reconciliation, and $9.20M comprehensive ledger before E911 duplication and other reconciliation exclusions.
- Constitutional-officer pages distinguish the six-office 847-FTE scope from the Personnel Ledger's 848 FTE, which adds one Circuit Court County position. The Board is identified as a governing office in this presentation.
- Revenue Strategy is labeled as an economic/planning regrouping; the Revenue Ledger is identified as the controlling Uniform Accounting System classification.
- Public Safety uses $126.2M consistently.
- Department staffing pages now show the underlying office changes and explicit rollups.
- FY2026 ending and FY2027 beginning fund balances are labeled as estimates prepared at different points in the budget cycle.
- The $53.5M accounting-classification capital total is crosswalked to the $43.8M funded CIP scope.
- Constitutional-office household equivalents now use the same 31,491 occupied housing units cited in the statistical profile and are distinguished from the illustrative property-tax bill.
- The adopted Fund Balance Policy is distinguished from the informal $50M management objective.
- Debt terminology distinguishes the Small County Surtax infrastructure portion from the separate state-shared Half-Cent program.
- Tourist Development Tax trend is shown as Up.
- The Long-Term Outlook no longer says the printed Fund Financial Ledger contains FY2028-FY2029 projections.
- The Personnel Ledger explains that Tax Collector personnel falls $212K while operating funding rises $812K, producing a $600K total-budget increase.
