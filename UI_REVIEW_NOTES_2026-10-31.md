# Budget program UI review — October 31, 2026

## Review method and coverage

Explored the local site at `http://127.0.0.1:8767/` with browser automation, clicking controls and inspecting screenshots. A direct desktop computer-use tool was not available in this chat. No application code was changed for this review.

Reviewed desktop at 1440 × 960 and phone at 390 × 960: entry page, main explorer, search suggestions, all six budget explorers, search-to-department navigation, Building Department snapshots, budget lines, prior-year comparisons, and personnel detail. Screenshots and raw observations are in `tmp/ui-review-2026-10-31/`. Findings are from the local version; no production performance or user study was conducted.

## Highest priority

### 1. Escape in search dismisses the entire explorer

**Observed behavior:** On desktop, enter “road” in the main search and press Escape while suggestions are visible. The full Budget Explorer closes and the entry screen returns. This interrupts the search task.

**Recommendation:** Let the search consume Escape first and close its suggestions. A subsequent Escape may dismiss the enclosing popup when no search or inner dialog is active.

**Acceptance check:** Search → Escape leaves the explorer open, preserves the query, and returns focus to the search field.

### 2. Department snapshot buttons are too small; one label visibly overflows

**Observed behavior:** On Building Department at phone size, “View Revenue Budget Ledger” extends beyond its button. The button is approximately 138 pixels wide while its content needs 146 pixels. Snapshot action buttons are 32 pixels tall; small information buttons are about 14 × 14 pixels.

**Recommendation:** Stack longer actions or allow their labels to wrap, and use a consistent touch area of at least 44 pixels. Increase the hit area around information icons without making the icon itself visually large. Use a primary ledger action and quieter secondary actions rather than giving every action the same emphasis.

**Evidence:** [Phone snapshot](/Users/devonpeyton/Documents/GitHub/budgetv2/tmp/ui-review-2026-10-31/390-department-snapshot.png).

**Acceptance check:** Every label fits at 320 and 390 pixels, actions remain distinguishable, and tapping does not require precise placement.

### 3. Annual changes have unclear comparison scopes

**Observed behavior:** Building Department’s mobile highlights show a $4,000,000 budget and a change of −$200,000. The Expenditures Summary on the same page shows $4M and −$35K (0.9%). The visible labels do not explain why the changes differ.

**Recommendation:** Verify the calculation scopes and comparison baselines before changing the design or figures. If both figures are intentional, explicitly label what each compares; otherwise use one consistent calculation. This review does not establish which calculation is correct.

**Evidence:** [Both figures on the phone page](/Users/devonpeyton/Documents/GitHub/budgetv2/tmp/ui-review-2026-10-31/390-department-top.png).

**Acceptance check:** A resident can understand the comparison period and any exclusions without opening a technical explanation.

## Next improvements

### 4. Capital project search is buried under explanation

**Observed behavior:** The phone Capital explorer opens with introductory paragraphs, the headline total, a definition, and lengthy “counted as capital / not capital” lists before the project search and ledger choices. The first phone screen contains no project search field.

**Recommendation:** Lead with the total, project search, and ledger choices. Put the definition and examples behind an “About capital projects” disclosure while retaining the detailed explanation link.

**Evidence:** [Phone Capital explorer](/Users/devonpeyton/Documents/GitHub/budgetv2/tmp/ui-review-2026-10-31/390-capital.png), [desktop view showing the sequence](/Users/devonpeyton/Documents/GitHub/budgetv2/tmp/ui-review-2026-10-31/1440-capital.png).

### 5. Workforce introduction delays the useful information

**Observed behavior:** At phone size, several paragraphs explaining FTE and salary/benefit categories appear before the total and actions. Department cards are below the first screen.

**Recommendation:** Start with workforce count, personnel budget, and the ledger action. Move the FTE definition and detailed inclusions into a short expandable explanation. Retain the distinction between positions and full-time equivalents.

**Evidence:** [Phone Workforce explorer](/Users/devonpeyton/Documents/GitHub/budgetv2/tmp/ui-review-2026-10-31/390-personnel.png).

### 6. Section headings can land behind the fixed department header

**Observed behavior:** When moving the department snapshot into view, its heading can sit partly under the fixed outer header. The usable content area is smaller on a phone because the back control, page title, and search occupy multiple rows.

**Recommendation:** Add scroll offsets based on the actual header height, plus a small visual gap. Apply the same behavior to section jumps, fragment links, and scripted scrolling. Keep header controls stationary as requested.

**Evidence:** [Snapshot heading near the header](/Users/devonpeyton/Documents/GitHub/budgetv2/tmp/ui-review-2026-10-31/390-department-snapshot.png).

### 7. Historical comparisons open at the oldest years

**Observed behavior:** “View Prior Years” on the phone budget ledger starts with FY 2020 and FY 2021. The FY 2026 and FY 2027 columns require horizontal scrolling, even though they are the most relevant immediate comparison. The swipe hint helps, but the comparison still takes effort.

**Recommendation:** Default to FY 2026 versus FY 2027, with a year selector for older history. Keep the position/object label visible during horizontal scrolling. Preserve access to transaction links and all historical figures.

**Evidence:** [Phone budget history](/Users/devonpeyton/Documents/GitHub/budgetv2/tmp/ui-review-2026-10-31/390-budget-history.png).

### 8. Personnel detail prioritizes a wide table over the phone user's main questions

**Observed behavior:** Personnel detail combines position names, two FTE years, change, salary, benefits, and total cost. The desktop view is readable, but the phone layout requires horizontal movement to connect a position with its cost. Its optional-column controls are visually small.

**Recommendation:** On phones, lead with position name, FY 2027 FTE, and total budgeted cost. Offer salary/benefit details and historical FTE as expandable content or a comparison mode. Keep the full ledger available on desktop.

**Evidence:** [Personnel detail on desktop](/Users/devonpeyton/Documents/GitHub/budgetv2/tmp/ui-review-2026-10-31/1440-personnel-ledger.png), [phone personnel detail](/Users/devonpeyton/Documents/GitHub/budgetv2/tmp/ui-review-2026-10-31/390-personnel-ledger.png).

### 9. Revenue instructions describe a desktop-only gesture

**Observed behavior:** The Revenue explorer tells phone users to “Hover over a badge.”

**Recommendation:** Use “Select a badge for details” and verify equivalent tap and keyboard behavior. Keep explanations available without relying solely on hover.

**Evidence:** [Phone Revenue explorer](/Users/devonpeyton/Documents/GitHub/budgetv2/tmp/ui-review-2026-10-31/390-revenue.png).

## Suggested implementation order

1. Fix search Escape behavior and clipped/tiny department controls.
2. Clarify the annual-change baselines.
3. Bring Capital and Workforce actions above long explanations.
4. Correct section-jump offsets.
5. Improve phone comparison and personnel detail layouts.
6. Update interaction instructions and badge accessibility.

## What is working well

- The six explorer screens had no horizontal page overflow at the two reviewed sizes.
- Search suggestions for “road” returned relevant Engineering, Public Works, and transportation ledger entries.
- The shared popup search and close controls are visually consistent.
- Current-year budget cards make long descriptions readable on phones.
- The collapsible information footer preserves more screen space on phones.
- No uncaught JavaScript errors were recorded during the six-explorer pass. This is not a full accessibility or functional audit.
