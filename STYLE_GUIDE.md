# Walton County FY2027 Budget — Style Guide

Single reference for site and print-book styling. The CSS tokens named here live in `:root` at the top of `assets/style.css`; use the variable, not the raw value.

## Fonts
| Role | Font | Where |
|---|---|---|
| UI / body / data / buttons / navigation | Arial, Helvetica, sans-serif | Everything by default |
| Editorial display (`--font-editorial`) | Georgia, "Times New Roman", serif | Editorial titles and quotes. Working popup titles, department section titles, and all on-screen figures use Arial. |

Rule: data, navigation, controls and supporting copy are always Arial. Do not use Georgia for card titles, headline figures or buttons.

## Type scale (`--fs-*`)
| Token | Size | Use |
|---|---|---|
| `--fs-eyebrow` | 11px | Uppercase micro labels (Department Goal, Prior Year, FY27 Target, Personnel & Operating) |
| `--fs-small` | 12px | Notes, change labels, sub-lines |
| `--fs-row` | 13px | Table/list rows, row amounts, button text |
| `--fs-body` | 14px | Paragraphs, measure names, section titles (uppercase, 800, +.04em tracking) |
| `--fs-quote` | 17px | Editorial subheadings, including Tourism "Highlights" |
| `--fs-card-title` | 19px | Card titles (Expenditures / Revenue / Position Summary) |
| `--fs-figure` | 34px | Headline figure on a snapshot card (900 weight, -.03em) |
| `--fs-figure-md` | 26px | Figure on a department/revenue/workforce list card inside an explorer popup |
| `--fs-figure-lg` | 44px | Headline figure on the six explorer landing cards (all six identical) |
| `--fs-lede` | 16px | Intro lede / long-form intro copy |
| `--fs-page-title` | clamp(28px,3vw,38px) | Page H1 on the explorer landing (800) |

Weights: 400 body, 700 emphasis, 800 titles/labels, 900 figures and row amounts. Do not introduce sizes outside this scale; if a new role is needed, add a token here first.

### Minimum font sizes (screen)
Nothing on screen goes below these floors unless there is a specific, documented reason (say so in a CSS comment next to the rule):

| Floor | Applies to |
|---|---|
| **13px** (`--fs-row`) | Any sentence text: paragraphs, notes, footnotes, captions, explanations (e.g. the Who Pays "Illustrative homeowner contribution" note, chart notes) |
| **12px** (`--fs-small`) | Short in-table sub-notes, tags/badges, change pills, compact toggle buttons, table header labels |
| **11px** (`--fs-eyebrow`) | Uppercase micro labels only (kickers, column eyebrows) |

Never size text in `em` below these floors (e.g. `.78em` inside a 13px row is 10px). Print styles may go smaller.

## Color
| Token | Value | Use |
|---|---|---|
| `--green` | #006231 | Primary brand, buttons, links, card titles, bars |
| `--green2` | #0b7741 | Hover/secondary green |
| `--green-deep` | #003f28 | Selected tabs and filters, financial table headers, print-book brand green |
| `--gold` / `--gold2` | #d1be78 / #c2ac5f | Accents, rules, borders on callouts, QR frames |
| `--ink` (= `--navy`) | #172033 | Headings, figures, strong text |
| `--body-text` (= `--text`) | #24344d | Body copy |
| `--supporting-text` (= `--muted`) | #5a6e7f | Secondary text, labels |
| `--light` | #f4f7f5 | Card/page tint backgrounds |
| `--border` | #e0e8e4 | Hairlines and card borders |
| `--flag` | #b3261e | Decreases / negative indicators |
| (increase) | `--green` | Increases / positive indicators |

## Shape and elevation
| Token | Value | Use |
|---|---|---|
| `--radius-card` | 18px | Cards (`.wc-profile-snapshot-card`) |
| `--radius-inner` | 12px | Inner panels, callouts |
| `--radius-pill` | 999px | Buttons and badges |
| `--shadow-card` | 0 8px 24px rgba(23,32,51,.04) | Cards; keep shadows this subtle |

## Spacing
`--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 · `--space-6` 24 · `--space-8` 32 · `--space-10` 40 · `--space-16` 64 (px). Card padding is 22px.

## Components
- **Button** (`.wc-profile-snapshot-sheet`): green pill, white 13px/800 Arial, min-height 48px. All action buttons in a card are equal height.
- **Snapshot card**: 19px title, 34px figure, optional 11px uppercase label directly under the figure, change line beneath (green up, `--flag` down), rows at 13px with 12px sub-lines, buttons last.
- **Section title**: 14px uppercase Arial 800, gold left bar.
- **Department Goal and Challenge**: no box; goal and challenge side by side with a 1px divider; labels use the shared section title style (14px uppercase Arial with a gold left rule). Descriptions use 14px Arial. Stacks on phones; a goal alone spans full width.
- **Core Services & Performance**: one full-width block per service with no surrounding box (14px uppercase Arial title with a gold left rule, 14px description), 32px between services, then one measure table: Measure (44%), 2022–2025, FY27 Target (14%, light green). 12px uppercase headers, 13px/700 measure names, 14px/800 tabular figures right-aligned, "—" for unreported years, context notes as 13px italic rows under their measure. On phones the measure column is pinned and the years scroll.
- **QR codes**: rounded square (radius 8–12px), never circular — circular masks clip the corner finder patterns and the code will not scan. Always link to `https://final2027.budget-waltoncountyfl.com/...`.

- **Explorer landing page**: the four large cards carry their own one-line description under the title (no separate intro list). Shortcut links (Ledger Directory etc.) are plain icon + text links, not pills. Revenue and Workforce are slim single-row cards: title left, 26px figure and change on the right, round arrow button. The print budget button is gold, top-right beside the heading.
- **Explorer landing card** (`.wc-explorer-card`, all six): 19px/800 title, 44px/900 green figure, 14px/800 green sub-line (no separate "Total …" label or tagline; the title already names the figure), then one full-width green pill button (13px/800, min-height 44px, white text, darker green on hover). Desktop only (>=761px); mobile keeps its own 14px/44px touch sizing.
- **Popup header** (`header.wc-popup-header`, used by the landing popup, every explorer popup and every department popup): one search pill (48px high, 16px input, 14px/800 green Search button) and one 44px round close button. The popup title is 19px/800 (`--fs-card-title`) and the back button is 13px/800 (`--fs-row`), 44px high on desktop to match the close button. These rules live once in `assets/style.css`; don't add per-popup overrides. The landing popup's close button is positioned by `index.html`, so its header keeps 92px of right padding.
- **Names** (use the same label on the site, search, nav, and print): Board Department Budgets, Constitutional Officers Budget, Capital Budget, Other Agencies and Court-Related Functions Budget (print chapter title; "Explore Other Agencies and Courts" on the button), Revenue Budget, Workforce Budget, Budget Adjustments, Budget Process.

## Print book (PDF)
Same brand: Georgia for headings and large figures, Arial for body; deep green `#003f28`, gold `#d1be78`/`#b89521`. Chapter dividers use a solid #003f28 top fading into the photo. Pages must not overflow (content stays above the footer at ~96% of page height).

## Explorer popups
Department, constitutional officer, capital, other agencies, revenue and workforce popups share the same tokens: 34px popup total, 26px list-card figure, 19px section/summary figures, 14px intro/card names, 13px buttons and rows, 12px sub-lines/shares, 11px uppercase labels and badges. No 850 weights or fractional sizes.

Explorer popup header: the left column holds the 14px intro (`--text` color), then the total call-outs (11px/800 `--muted` uppercase label, 19px/800 green figure, 12px/700 `--muted` share), then the "% of the total expenditure budget" line (14px `--text`, 19px/800 green percent). The right column holds the 34px/900 total, its change and the ledger buttons.

## Scope notes
The explorer landing (`assets/home-landing.css`, desktop block at the end), the explorer-popup blocks and the department-page block in `assets/style.css` ("Department page type scale") applies the scale via `main:has(.wc-profile-snapshot-card)`. The ledger popups, the Who Pays table, and the constitutional officer / independent agency pages still use their own sizes and should be migrated to the `--fs-*` tokens.
