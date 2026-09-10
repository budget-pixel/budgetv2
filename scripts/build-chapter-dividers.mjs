import { chromium } from "playwright";

// Builds the chapter divider pages the flattened base book doesn't carry
// on its own -- Constitutional Officers, Other Agencies and Court-Related
// Functions, Financial Plan, Capital Budget, and now Our County, Financial
// Overview, Budget Process, and Workforce Plan too, so every chapter opens
// the same way Departments and Services already does. Same divider style
// throughout (dark green full-bleed, gold kicker, white serif h1, no
// footer/page number, consistent with a chapter's opening page).

const css = `
  @page{ size:letter portrait; margin:0; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ font-family:Arial, Helvetica, sans-serif; }
  section{ position:relative; width:8.5in; height:11in; background:#003f28; }
  .divider{ display:flex; flex-direction:column; justify-content:center; align-items:flex-start; height:100%; padding:0 .8in; }
  .divider .kicker2{ color:#b89521; font-size:11pt; font-weight:900; letter-spacing:.18em; text-transform:uppercase; margin-bottom:.15in; }
  .divider h1b{ color:#ffffff; font:800 46pt/1.05 Georgia, "Times New Roman", serif; margin:0 0 .3in; }
  .divider p{ color:#cfe0d7; font-size:11pt; line-height:1.6; max-width:5in; }
`;

const constitutionalOfficersDivider = `
  <section>
    <div class="divider">
      <span class="kicker2">Budget Book</span>
      <h1b>Constitutional<br/>Officers</h1b>
      <p>A statement of function, elected official, revenue sources, and budget summary for each of Walton County's five independently elected offices and the Board of County Commissioners.</p>
    </div>
  </section>
`;

const otherAgenciesDivider = `
  <section>
    <div class="divider">
      <span class="kicker2">Budget Book</span>
      <h1b>Other Agencies and<br/>Court-Related Functions</h1b>
      <p>Budget, fund, and year-over-year change for the Courts, Health Department, and other independent and autonomous entities Walton County funds outside its own Board departments and Constitutional Officers.</p>
    </div>
  </section>
`;

// Description updated again now that Consolidated Budget, Revenue
// Portfolio, Revenue, Expenditure, Fund Financial, Interfund Transfer, and
// Debt ledgers all moved up into the Financial Overview subsection -- this
// chapter now covers just contractual services and the long-term outlook.
const financialPlanDivider = `
  <section>
    <div class="divider">
      <span class="kicker2">Financial Plan</span>
      <h1b>Financial Plan</h1b>
      <p>Countywide contractual services spending and the long-term financial outlook.</p>
    </div>
  </section>
`;

const capitalBudgetDivider = `
  <section>
    <div class="divider">
      <span class="kicker2">Budget Book</span>
      <h1b>Capital Budget</h1b>
      <p>The Capital Improvement Plan and the fund-specific ledgers that finance it &mdash; machinery, vehicles and equipment, transportation and infrastructure, tourist development, Sheriff facilities, recreation plat fees, and sidewalks.</p>
    </div>
  </section>
`;

// Four more dividers, same treatment, for the front-matter chapters that
// previously had no divider of their own (unlike Constitutional Officers/
// Departments and Services/Financial Plan/Capital Budget above).
const ourCountyDivider = `
  <section>
    <div class="divider">
      <span class="kicker2">Budget Book</span>
      <h1b>Our<br/>County</h1b>
      <p>A look at Walton County's people, geography, and governance &mdash; the organizational structure, strategic priorities, and community context behind the FY2027 budget.</p>
    </div>
  </section>
`;

const financialOverviewDivider = `
  <section>
    <div class="divider">
      <span class="kicker2">Budget Book</span>
      <h1b>Financial<br/>Overview</h1b>
      <p>A one-page look at the whole budget, the year-over-year change by department and fund, how a resident's property tax dollar is allocated, and the countywide revenue, expenditure, fund, transfer, and debt ledgers behind it.</p>
    </div>
  </section>
`;

const budgetProcessDivider = `
  <section>
    <div class="divider">
      <span class="kicker2">Budget Book</span>
      <h1b>Budget<br/>Process</h1b>
      <p>How a department request becomes Walton County's FY2027 tentative spending plan, and the key dates residents can follow before final adoption.</p>
    </div>
  </section>
`;

const workforcePlanDivider = `
  <section>
    <div class="divider">
      <span class="kicker2">Budget Book</span>
      <h1b>Workforce<br/>Budget</h1b>
      <p>Personnel cost and capacity across Walton County government &mdash; the number and mix of positions, and the cost of maintaining the existing workforce.</p>
    </div>
  </section>
`;

// Promoted from a subsection inside Capital Budget to its own closing
// chapter, same divider treatment as everything else.
const glossaryDivider = `
  <section>
    <div class="divider">
      <span class="kicker2">Budget Book</span>
      <h1b>Glossary, Statistical, and<br/>Supplemental Information</h1b>
      <p>Statistical context, the county's largest taxpayers, and a glossary of budget terms, acronyms, and frequently asked questions.</p>
    </div>
  </section>
`;

async function render(html, outPath) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`, { waitUntil: "networkidle" });
  await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
  await browser.close();
  console.log("Wrote " + outPath);
}

await render(constitutionalOfficersDivider, process.argv[2] || "/private/tmp/divider-constitutional-officers.pdf");
await render(otherAgenciesDivider, process.argv[3] || "/private/tmp/divider-other-agencies.pdf");
await render(financialPlanDivider, process.argv[4] || "/private/tmp/divider-financial-plan.pdf");
await render(capitalBudgetDivider, process.argv[5] || "/private/tmp/divider-capital-budget.pdf");
await render(ourCountyDivider, process.argv[6] || "/private/tmp/divider-our-county.pdf");
await render(financialOverviewDivider, process.argv[7] || "/private/tmp/divider-financial-overview.pdf");
await render(budgetProcessDivider, process.argv[8] || "/private/tmp/divider-budget-process.pdf");
await render(workforcePlanDivider, process.argv[9] || "/private/tmp/divider-workforce-plan.pdf");
await render(glossaryDivider, process.argv[10] || "/private/tmp/divider-glossary.pdf");
