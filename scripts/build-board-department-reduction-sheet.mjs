import { readFileSync } from "node:fs";
import { chromium } from "playwright";

// Standalone supporting-documentation workpaper. The checked source snapshot
// preserves the site's deduplicated historical figures and reconciled FY 2027
// category amounts for individual Board offices and programs.
const source = JSON.parse(readFileSync(new URL("../data/board-department-reduction-fy2027.json", import.meta.url), "utf8"));
const capitalProjects = JSON.parse(readFileSync(new URL("../data/board-capital-projects-fy2027.json", import.meta.url), "utf8"));
const output = process.argv[2] || "output/pdf/board-department-reduction-sheet-fy2027.pdf";
const categories = ["Personnel", "Operating", "Capital"];
const actualYears = [2021, 2022, 2023, 2024, 2025];
const money = (value) => "$" + Math.round(value).toLocaleString("en-US");
const signedMoney = (value) => value < 0 ? `-${money(-value)}` : `+${money(value)}`;
const overallChange = (fy2026, fy2027) => {
  if (fy2026 === 0) return { label: "n/a", className: "change-flat" };
  const change = 100 * (fy2027 - fy2026) / fy2026;
  const magnitude = Math.abs(change) > 0 && Math.abs(change) < 0.05
    ? "<0.1" : Math.abs(change).toFixed(1);
  return {
    label: `${change > 0 ? "+" : change < 0 ? "-" : ""}${magnitude}%`,
    className: change > 0 ? "change-up" : change < 0 ? "change-down" : "change-flat"
  };
};
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);

for (const move of source.accountMoves || []) {
  const from = source.funds.find((fund) => fund.code === move.fromFund)?.departments.find((item) => item.name === move.office);
  const to = source.funds.find((fund) => fund.code === move.toFund)?.departments.find((item) => item.name === move.office);
  if (!from || !to || move.fromFund === move.toFund || categories.some((category) =>
    !Number.isInteger(move.fy2026Categories[category]) ||
    move.fy2026Categories[category] !== from.categories[category].fy2026 ||
    to.categories[category].fy2026 !== 0)) {
    throw new Error(`Invalid account move for ${move.office}.`);
  }
}
function accountMoveFor(fund, department, category) {
  if (!fund) return 0;
  return (source.accountMoves || []).reduce((sum, move) => {
    if (move.office !== department.name) return sum;
    if (fund.code === move.fromFund) return sum - move.fy2026Categories[category];
    if (fund.code === move.toFund) return sum + move.fy2026Categories[category];
    return sum;
  }, 0);
}
const adjustedChange = (department, fund, category) => {
  const pair = department.categories[category];
  return pair.fy2027 - pair.fy2026 - accountMoveFor(fund, department, category);
};

function summarize(department, fund = null) {
  const values = department.categories;
  const actuals = Object.fromEntries(actualYears.map((year) => [year,
    categories.reduce((sum, category) => sum + values[category].actuals[year], 0)]));
  const fy2026 = categories.reduce((sum, category) => sum + values[category].fy2026, 0);
  const fy2027 = categories.reduce((sum, category) => sum + values[category].fy2027, 0);
  const personnelOperatingReduction = ["Personnel", "Operating"]
    .reduce((sum, category) => sum + Math.max(0, -adjustedChange(department, fund, category)), 0);
  const capitalReduction = Math.max(0, -adjustedChange(department, fund, "Capital"));
  const increase = categories.reduce((sum, category) =>
    sum + Math.max(0, adjustedChange(department, fund, category)), 0);
  const accountMoves = categories.reduce((sum, category) => sum + accountMoveFor(fund, department, category), 0);
  if (increase - personnelOperatingReduction - capitalReduction + accountMoves !== fy2027 - fy2026) {
    throw new Error(`Increase, reduction, and account move columns do not reconcile for ${department.name}.`);
  }
  return { actuals, fy2026, fy2027, personnelOperatingReduction, capitalReduction, increase, accountMoves };
}

if (source.departments.length !== 39) throw new Error("Expected 39 individual Board offices and programs.");
const totals = source.departments.reduce((total, department) => {
  for (const category of categories) {
    const pair = department.categories[category];
    if (!pair || !Number.isInteger(pair.fy2026) || !Number.isInteger(pair.fy2027)) {
      throw new Error(`Missing whole-dollar category amount for ${department.name}: ${category}`);
    }
    for (const year of actualYears) {
      if (!Number.isInteger(pair.actuals?.[year])) {
        throw new Error(`Missing FY ${year} actual for ${department.name}: ${category}`);
      }
    }
  }
  const summary = summarize(department);
  for (const year of actualYears) total.actuals[year] += summary.actuals[year];
  for (const key of Object.keys(total)) if (key !== "actuals") total[key] += summary[key];
  return total;
}, { actuals: Object.fromEntries(actualYears.map((year) => [year, 0])), fy2026: 0, fy2027: 0,
  personnelOperatingReduction: 0, capitalReduction: 0, increase: 0, accountMoves: 0 });
if (totals.fy2026 !== source.controlTotals.fy2026 || totals.fy2027 !== source.controlTotals.fy2027) {
  throw new Error("Department totals do not match the source controls.");
}
if (totals.increase - totals.personnelOperatingReduction - totals.capitalReduction + totals.accountMoves !== totals.fy2027 - totals.fy2026) {
  throw new Error("All Board office increases and reductions do not reconcile to the budget change.");
}
if (source.funds?.[0]?.code !== "001" || source.funds[0].name !== "General Fund") {
  throw new Error("General Fund must be the first fund section.");
}
for (const department of source.departments) {
  for (const category of categories) {
    const acrossFunds = source.funds.map((fund) => fund.departments.find((item) => item.name === department.name)?.categories[category]);
    for (const field of ["fy2026", "fy2027"]) {
      if (acrossFunds.reduce((sum, pair) => sum + (pair?.[field] || 0), 0) !== department.categories[category][field]) {
        throw new Error(`Fund totals do not reconcile for ${department.name} ${category} ${field}.`);
      }
    }
    for (const year of actualYears) {
      if (acrossFunds.reduce((sum, pair) => sum + (pair?.actuals[year] || 0), 0) !== department.categories[category].actuals[year]) {
        throw new Error(`Fund actuals do not reconcile for ${department.name} ${category} FY ${year}.`);
      }
    }
  }
}
const machineryRows = source.funds.flatMap((fund) => fund.requestDetails?.machinery || []);
const addedFteRows = source.funds.flatMap((fund) => fund.requestDetails?.addedFte || []);
if (machineryRows.length !== 77 || machineryRows.reduce((sum, row) => sum + row.amount, 0) !== 7_120_300) {
  throw new Error("Funded machinery request detail does not match the FY 2027 machinery ledger.");
}
if (addedFteRows.length !== 10 || addedFteRows.reduce((sum, row) => sum + row.addedFte, 0) !== 17 ||
    addedFteRows.some((row) => /title change|transfer from/i.test(row.note || ""))) {
  throw new Error("New position detail includes a title change or transfer, or does not match the staffing snapshot.");
}
const capitalControls = { "300": 25_035_734, "101": 4_500_000, "111": 11_350_000 };
if (capitalProjects.funds.length !== 3) throw new Error("Expected three FY 2027 capital-project funds.");
for (const fund of capitalProjects.funds) {
  if (!capitalControls[fund.code] || !fund.projects.length ||
      fund.projects.some((project) => !project.name || !Number.isInteger(project.amount) || project.amount <= 0) ||
      fund.projects.reduce((sum, project) => sum + project.amount, 0) !== fund.fy2027Total ||
      fund.fy2027Total !== capitalControls[fund.code]) {
    throw new Error(`FY 2027 capital projects do not reconcile for fund ${fund.code}.`);
  }
}

const reduction = (value) => value > 0 ? money(value) : '<span class="zero">$0</span>';
const increase = (value) => value > 0 ? money(value) : '<span class="zero">$0</span>';
const accountMove = (value) => value > 0 ? `+${money(value)}` : value < 0 ? `-${money(-value)}` : '<span class="zero">$0</span>';
const overallChangeCell = (summary) => {
  const change = overallChange(summary.fy2026, summary.fy2027);
  return `<div class="overall-change ${change.className}">${change.label}</div>`;
};
function inlineRequests(fund, department, category) {
  const detail = fund.requestDetails || { addedFte: [], machinery: [] };
  const items = category === "Personnel"
    ? detail.addedFte.filter((item) => item.department === department.name)
    : category === "Capital"
      ? detail.machinery.filter((item) => item.department === department.name)
      : [];
  if (!items.length) return "";
  const title = category === "Personnel"
    ? "New position equivalents • estimated FY 2027 cost"
    : "Individual funded machinery requests • FY 2027 amount";
  return `<div class="inline-head">${title}</div>${items.map((item) => {
    const description = category === "Personnel" ? item.position :
      item.description + (item.replacementAsset ? ` (asset #${item.replacementAsset})` : "");
    return `<div class="grid-row inline-request">
      <div class="inline-office">${item.office === department.name ? "" : escapeHtml(item.office)}</div>
      <div class="inline-description">${escapeHtml(description)}${category === "Personnel" ? ` <span class="inline-fte">(+${item.addedFte} FTE)</span>` : ""}${item.note ? `<small>${escapeHtml(item.note)}</small>` : ""}</div>
      <div class="inline-amount">${money(category === "Personnel" ? item.estimatedCost : item.amount)}</div>
    </div>`;
  }).join("")}`;
}
function departmentBlock(department, fund) {
  const summary = summarize(department, fund);
  const move = (source.accountMoves || []).find((item) => item.office === department.name &&
    (item.fromFund === fund.code || item.toFund === fund.code));
  const officeAcrossFunds = move ? source.departments.find((item) => item.name === department.name) : null;
  const acrossFundsSummary = officeAcrossFunds ? summarize(officeAcrossFunds) : null;
  const moveNote = move ? `<div class="account-move-note">Account ${escapeHtml(move.fromAccount)} moved from General Fund to account ${escapeHtml(move.toAccount)} in Transportation Fund. Across both funds, the office changed ${signedMoney(acrossFundsSummary.fy2027 - acrossFundsSummary.fy2026)} (${overallChange(acrossFundsSummary.fy2026, acrossFundsSummary.fy2027).label}), entirely in personnel.</div>` : "";
  const rows = categories
    .filter((category) => {
      const pair = department.categories[category];
      return pair.fy2026 !== 0 || pair.fy2027 !== 0 ||
        actualYears.some((year) => pair.actuals[year] !== 0);
    })
    .map((category) => {
      const pair = department.categories[category];
      const change = adjustedChange(department, fund, category);
      return `<div class="grid-row detail">
        <div class="label">${escapeHtml(category)}</div>
        ${actualYears.map((year) => `<div>${money(pair.actuals[year])}</div>`).join("")}
        <div>${money(pair.fy2026)}</div><div>${money(pair.fy2027)}</div>
        <div class="cut">${category === "Personnel" || category === "Operating" ? reduction(Math.max(0, -change)) : reduction(0)}</div>
        <div class="cut">${category === "Capital" ? reduction(Math.max(0, -change)) : reduction(0)}</div>
        <div class="increase">${increase(Math.max(0, change))}</div>
        <div class="account-move">${accountMove(accountMoveFor(fund, department, category))}</div>
        <div></div>
      </div>${inlineRequests(fund, department, category)}`;
    }).join("");
  return `<div class="department">
    <div class="grid-row department-total">
      <div class="label">${escapeHtml(department.name)}</div>
      ${actualYears.map((year) => `<div>${money(summary.actuals[year])}</div>`).join("")}
      <div>${money(summary.fy2026)}</div><div>${money(summary.fy2027)}</div>
      <div class="cut">${reduction(summary.personnelOperatingReduction)}</div>
      <div class="cut">${reduction(summary.capitalReduction)}</div>
      <div class="increase">${increase(summary.increase)}</div>
      <div class="account-move">${accountMove(summary.accountMoves)}</div>
      ${move ? '<div class="overall-change change-flat">moved</div>' : overallChangeCell(summary)}
    </div>
    ${rows}
    ${moveNote}
  </div>`;
}

const columns = `<div class="grid-row columns">
  <div class="label">Board office / category</div>
  ${actualYears.map((year) => `<div>FY ${year}<br>actual</div>`).join("")}
  <div>FY 2026<br>budget</div><div>FY 2027<br>budget</div>
  <div>Personnel +<br>operating reduced</div><div>Capital<br>reduced</div><div>Increases</div><div>Account<br>moves</div><div>Overall<br>change %</div>
</div>`;

function summarizeDepartments(departments, fund) {
  const total = departments.reduce((total, department) => {
    const summary = summarize(department, fund);
    for (const year of actualYears) total.actuals[year] += summary.actuals[year];
    for (const key of Object.keys(total)) if (key !== "actuals") total[key] += summary[key];
    return total;
  }, { actuals: Object.fromEntries(actualYears.map((year) => [year, 0])), fy2026: 0, fy2027: 0,
    personnelOperatingReduction: 0, capitalReduction: 0, increase: 0, accountMoves: 0 });
  if (total.increase - total.personnelOperatingReduction - total.capitalReduction + total.accountMoves !== total.fy2027 - total.fy2026) {
    throw new Error("Fund increases and reductions do not reconcile to the budget change.");
  }
  return total;
}
function totalRow(label, summary, className = "grand-total") {
  return `<div class="grid-row ${className}">
    <div class="label">${escapeHtml(label)}</div>
    ${actualYears.map((year) => `<div>${money(summary.actuals[year])}</div>`).join("")}
    <div>${money(summary.fy2026)}</div><div>${money(summary.fy2027)}</div>
    <div class="cut">${reduction(summary.personnelOperatingReduction)}</div><div class="cut">${reduction(summary.capitalReduction)}</div>
    <div class="increase">${increase(summary.increase)}</div>
    <div class="account-move">${accountMove(summary.accountMoves)}</div>
    ${overallChangeCell(summary)}
  </div>`;
}
function departmentWeight(fund, department) {
  const detail = fund.requestDetails || { addedFte: [], machinery: [] };
  const count = detail.addedFte.filter((item) => item.department === department.name).length +
    detail.machinery.filter((item) => item.department === department.name).length;
  return 4 + count * .75 + (count ? 1 : 0);
}
const pageGroups = [];
for (const fund of source.funds) {
  const summary = summarizeDepartments(fund.departments, fund);
  const firstPageIndex = pageGroups.length;
  let group = [];
  let weight = 0;
  for (const department of fund.departments) {
    const nextWeight = departmentWeight(fund, department);
    const limit = 19;
    if (group.length && weight + nextWeight > limit) {
      pageGroups.push({ fund, group, first: pageGroups.length === firstPageIndex, last: false, summary });
      group = [];
      weight = 0;
    }
    group.push(department);
    weight += nextWeight;
  }
  if (group.length) pageGroups.push({ fund, group, first: pageGroups.length === firstPageIndex, last: true, summary });
}
const capitalByCode = Object.fromEntries(capitalProjects.funds.map((fund) => [fund.code, fund]));
const capitalPageGroups = [
  [{ fund: capitalByCode["300"], projects: capitalByCode["300"].projects.slice(0, 16), continued: false, showTotal: false }],
  [
    { fund: capitalByCode["300"], projects: capitalByCode["300"].projects.slice(16), continued: true, showTotal: true },
    { fund: capitalByCode["101"], projects: capitalByCode["101"].projects, continued: false, showTotal: true },
    { fund: capitalByCode["111"], projects: capitalByCode["111"].projects, continued: false, showTotal: true }
  ]
];
const totalPages = pageGroups.length + capitalPageGroups.length;
const officePages = pageGroups.map(({ fund, group, first, last, summary }, index) => `<section class="page">
  <header><span>Walton County, Florida</span><span>Fiscal Year 2027</span></header>
  <div class="eyebrow">Board Department Reduction Sheet</div>
  <h1>Board Department Reduction Sheet${first ? "" : ' <small>(continued)</small>'}</h1>
  <h2 class="fund-heading">${escapeHtml(fund.name)}</h2>
  <div class="sheet">${columns}${group.map((department) => departmentBlock(department, fund)).join("")}</div>
  ${last ? totalRow(`${fund.name} total`, summary) : ""}
  ${index === pageGroups.length - 1 ? `<div class="consolidated-heading">All funds • consolidated Board comparison</div>${totalRow("All Board offices", totals, "consolidated-total")}` : ""}
  <footer><span>Supporting Budget Documentation | ${escapeHtml(fund.name)}</span><b>${index + 1} / ${totalPages}</b></footer>
</section>`).join("");
const projectPages = capitalPageGroups.map((sections, index) => `<section class="page">
  <header><span>Walton County, Florida</span><span>Fiscal Year 2027</span></header>
  <div class="eyebrow">Board Department Reduction Sheet</div>
  <h1>FY 2027 Capital Projects${index ? ' <small>(continued)</small>' : ""}</h1>
  ${sections.map(({ fund, projects, continued, showTotal }) => `<div class="project-fund">
    <h2 class="fund-heading">${escapeHtml(fund.name)}${continued ? ' <small>(continued)</small>' : ""}</h2>
    <div class="project-columns"><span>Funded FY 2027 project</span><span>Program</span><span>FY 2027 amount</span></div>
    ${projects.map((project) => `<div class="project-row"><span>${escapeHtml(project.name)}</span><span>${escapeHtml(project.program)}</span><b>${money(project.amount)}</b></div>`).join("")}
    ${showTotal ? `<div class="project-total"><span>${escapeHtml(fund.name)} total</span><b>${money(fund.fy2027Total)}</b></div>` : ""}
  </div>`).join("")}
  <footer><span>Supporting Budget Documentation | FY 2027 Capital Projects</span><b>${pageGroups.length + index + 1} / ${totalPages}</b></footer>
</section>`).join("");
const pages = officePages + projectPages;

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Board Department Reduction Sheet</title>
<style>
@page{size:letter landscape;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;color:#173229}
.page{position:relative;width:11in;height:8.5in;padding:.36in .25in .35in;background:#fff;overflow:hidden;break-after:page}
header{display:flex;justify-content:space-between;padding-bottom:9px;border-bottom:1px solid #63736b;color:#53665d;font-size:8pt;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.eyebrow{margin-top:.14in;color:#b89521;font-size:7.5pt;font-weight:900;letter-spacing:.14em;text-transform:uppercase}
h1{margin:5px 0 .07in;color:#003f28;font:800 19pt/1.08 Georgia,"Times New Roman",serif;letter-spacing:-.02em}
h1 small{color:#68786f;font:400 9pt Arial,Helvetica,sans-serif;letter-spacing:0}
.fund-heading{margin:0 0 .12in;color:#003f28;font:800 12pt/1.1 Arial,Helvetica,sans-serif}
.sheet{border-top:2px solid #d1be78}
.grid-row{display:grid;grid-template-columns:1.58in repeat(5,.61in) .78in .78in .78in .70in .75in .82in .70in;gap:.04in;align-items:center}
.grid-row>div:not(.label){text-align:right;font-variant-numeric:tabular-nums}
.columns{padding:.06in 0;border-bottom:1px solid #003f28;color:#64756c;font-size:6pt;font-weight:800;line-height:1.15;text-transform:uppercase}
.department{break-inside:avoid}
.department-total{margin-top:.1in;padding:.07in .04in;border-left:3px solid #003f28;border-bottom:1px solid #aec7b9;background:#eef5f0;color:#003f28;font-size:6.65pt;font-weight:800}
.department-total .label{font-size:7.1pt}
.detail{min-height:.21in;padding:.04in .04in;border-bottom:1px solid #e9efeb;color:#33453c;font-size:6.6pt}
.detail .label{padding-left:.15in}
.inline-head{margin:.025in 0 0 .15in;padding:.035in .05in;background:#f3f7f4;color:#003f28;font-size:6.5pt;font-weight:800}
.inline-request{min-height:.13in;padding:.012in .04in;border-bottom:1px solid #edf1ee;color:#42554a;font-size:6.1pt;line-height:1.05}
.inline-office{grid-column:1;color:#66786d;font-size:6pt;text-align:left!important}
.inline-description{grid-column:2 / 8;text-align:left!important}
.inline-description small{display:block;margin-top:1px;color:#68786f;font-size:5.7pt}
.inline-fte,.inline-amount{font-weight:700}
.inline-amount{grid-column:8;text-align:right;white-space:nowrap}
.cut{color:#a24b1e;font-weight:800}
.increase{color:#167145;font-weight:800}
.account-move{color:#456b92;font-weight:800}
.account-move-note{margin:.035in 0 .02in .16in;color:#456b92;font-size:6.5pt;line-height:1.2}
.zero{color:#68786f!important}
.detail .cut{font-weight:700}
.overall-change{text-align:right;white-space:nowrap;font-size:6.7pt;font-weight:800}
.change-up{color:#167145}
.change-down{color:#a24b1e}
.change-flat{color:#68786f}
.grand-total{margin-top:.14in;padding:.08in .04in;border-top:2px solid #003f28;border-bottom:1.5px solid #003f28;color:#003f28;font-size:6.85pt;font-weight:800}
.consolidated-heading{margin-top:.15in;color:#003f28;font-size:8pt;font-weight:800}
.consolidated-total{margin-top:.06in;padding:.08in .04in;border-top:1.5px solid #003f28;border-bottom:1.5px solid #003f28;color:#003f28;font-size:6.85pt;font-weight:800}
.project-fund{margin-top:.18in}
.project-fund .fund-heading{margin-bottom:.08in}
.project-fund .fund-heading small{color:#68786f;font-size:8pt;font-weight:400}
.project-columns,.project-row{display:grid;grid-template-columns:minmax(0,1fr) 2.2in 1.25in;gap:.1in;align-items:center}
.project-columns{padding:.08in .08in;border-top:2px solid #d1be78;border-bottom:1px solid #003f28;color:#64756c;font-size:7pt;font-weight:800;text-transform:uppercase}
.project-columns span:last-child,.project-row b{text-align:right}
.project-row{min-height:.26in;padding:.045in .08in;border-bottom:1px solid #e9efeb;color:#33453c;font-size:7.2pt;line-height:1.15}
.project-row span:nth-child(2){color:#64756c;font-size:6.9pt}
.project-row b{color:#003f28;font-weight:800;white-space:nowrap}
.project-total{display:flex;justify-content:space-between;margin-top:.06in;padding:.09in .08in;border-top:2px solid #003f28;border-bottom:1px solid #003f28;color:#003f28;font-size:7.6pt;font-weight:800}
footer{position:absolute;left:.25in;right:.25in;bottom:.18in;display:flex;justify-content:space-between;border-top:1px solid #cbd8d1;padding-top:6px;color:#68786f;font-size:6.9pt;font-weight:800;letter-spacing:.07em;text-transform:uppercase}
</style></head><body>${pages}</body></html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: output, format: "Letter", printBackground: true, preferCSSPageSize: true,
  margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log(`Wrote ${output} (${totalPages} pages)`);
