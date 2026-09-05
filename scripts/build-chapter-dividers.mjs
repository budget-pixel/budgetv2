import { chromium } from "playwright";

// Builds the two new chapter divider pages needed now that Constitutional
// Officers and Independent Agencies ("Other Agencies and Court-Related
// Functions") are their own top-level chapters instead of ledgers nested
// inside the Financial Plan chapter. Matches the exact divider style
// already used for the Departments and Services and Financial Plan
// chapters (dark green full-bleed, gold kicker, white serif h1, no
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
      <span class="kicker2">Budget Book Guide</span>
      <h1b>Constitutional<br/>Officers</h1b>
      <p>A statement of function, elected official, revenue sources, and budget summary for each of Walton County's five independently elected offices and the Board of County Commissioners.</p>
    </div>
  </section>
`;

const otherAgenciesDivider = `
  <section>
    <div class="divider">
      <span class="kicker2">Budget Book Guide</span>
      <h1b>Other Agencies and<br/>Court-Related Functions</h1b>
      <p>Budget, fund, and year-over-year change for the Courts, Health Department, and other independent and autonomous entities Walton County funds outside its own Board departments and Constitutional Officers.</p>
    </div>
  </section>
`;

// Retitled from "Financial Plan and Capital Program" now that capital is
// its own chapter -- description updated to match what actually remains
// in this chapter (no more capital investments/CIP).
const financialPlanDivider = `
  <section>
    <div class="divider">
      <span class="kicker2">Financial Plan</span>
      <h1b>Financial Plan</h1b>
      <p>Countywide revenues, expenditures, staffing, operating budgets, fund schedules, transfers, debt, and the long-term outlook.</p>
    </div>
  </section>
`;

const capitalBudgetDivider = `
  <section>
    <div class="divider">
      <span class="kicker2">Budget Book Guide</span>
      <h1b>Capital Budget</h1b>
      <p>The Capital Improvement Plan and the fund-specific ledgers that finance it &mdash; machinery, vehicles and equipment, transportation and infrastructure, tourist development, Sheriff facilities, recreation plat fees, and sidewalks.</p>
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
