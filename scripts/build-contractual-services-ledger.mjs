import { chromium } from "playwright";

const sourceUrl = process.argv[2] || "http://127.0.0.1:8765/pages/summary-of-contractual-services.html";
const outPath = process.argv[3] || "/private/tmp/budget-book-contractual-services.pdf";
const startPage = Number(process.argv[4] || 195);

const browser = await chromium.launch({ headless: true });
const source = await browser.newPage();
await source.goto(sourceUrl, { waitUntil: "networkidle", timeout: 120000 });
await source.waitForFunction(() => document.querySelectorAll("#contractual-services-summary table").length === 2, null, { timeout: 120000 });

const data = await source.evaluate(() => {
  const tables = Array.from(document.querySelectorAll("#contractual-services-summary table"));
  const read = (table) => Array.from(table.tBodies[0].rows).map((row) => ({
    kind: row.classList.contains("wc-table-group-row") ? "group" : row.classList.contains("wc-table-subtotal-row") ? "subtotal" : row.classList.contains("wc-table-total-row") ? "total" : "item",
    cells: Array.from(row.cells).map((cell) => cell.innerText.trim())
  }));
  return {
    metrics: Array.from(document.querySelectorAll(".wc-contract-ledger-metrics article")).map((card) => ({
      label: card.querySelector("span")?.innerText.trim() || "",
      value: card.querySelector("strong")?.innerText.trim() || "",
      note: card.querySelector("small")?.innerText.trim() || ""
    })),
    department: read(tables[0]),
    capital: read(tables[1])
  };
});
await source.close();

function splitRows(rows, target) {
  let split = Math.min(target, rows.length - 1);
  while (split > target - 5 && rows[split]?.kind !== "group") split -= 1;
  if (split <= target - 5) split = target;
  while (rows[split]?.kind === "subtotal" || rows[split - 1]?.kind === "group") split -= 1;
  return [rows.slice(0, split), rows.slice(split)];
}

const [departmentA, departmentB] = splitRows(data.department, 24);
const [capitalA, capitalB] = splitRows(data.capital, 31);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

function tableRows(rows, capital) {
  const cols = capital ? 4 : 5;
  return rows.map((row) => {
    if (row.kind === "group") return `<tr class="group"><td colspan="${cols}">${esc(row.cells[0])}</td></tr>`;
    if (row.kind === "subtotal" || row.kind === "total") {
      const label = row.cells[0] || "Total";
      const amount = row.cells.find((cell) => /^\$/.test(cell)) || "";
      return `<tr class="${row.kind}"><td colspan="2">${esc(label)}</td><td class="num">${esc(amount)}</td><td colspan="${cols - 3}"></td></tr>`;
    }
    if (capital) return `<tr><td>${esc(row.cells[0])}</td><td>${esc(row.cells[1])}</td><td class="num">${esc(row.cells[2])}</td><td>${esc(row.cells[3])}</td></tr>`;
    return `<tr><td>${esc(row.cells[0])}</td><td>${esc(row.cells[1])}</td><td class="num">${esc(row.cells[2])}</td><td>${esc(row.cells[3])}</td><td>${esc(row.cells[4])}</td></tr>`;
  }).join("");
}

function ledgerTable(rows, capital) {
  const head = capital
    ? `<tr><th>Department</th><th>Service</th><th class="num">FY 2027</th><th>Procurement Status</th></tr>`
    : `<tr><th>Department</th><th>Service</th><th class="num">FY 2027</th><th>Procurement Status</th><th>Current Provider</th></tr>`;
  return `<table class="${capital ? "capital-table" : ""}"><thead>${head}</thead><tbody>${tableRows(rows, capital)}</tbody></table>`;
}

const header = () => `<header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>`;
const footer = (page) => `<footer><span>FY 2027 Annual Budget</span><b>${page}</b></footer>`;
const metrics = data.metrics.map((item) => `<div class="stat-card"><b>${esc(item.value)}</b><span>${esc(item.label)}${item.note ? " &middot; " + esc(item.note) : ""}</span></div>`).join("");

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Contractual Services Ledger</title><style>
@page{size:letter portrait;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#173229}section{position:relative;width:8.5in;height:11in;padding:.56in .62in .5in;background:#fff;page-break-after:always;overflow:hidden}section:last-child{page-break-after:auto}
header{display:flex;justify-content:space-between;padding-bottom:9px;border-bottom:1px solid #63736b;color:#53665d;font-size:8pt;font-weight:800;letter-spacing:.08em;text-transform:uppercase}header em{font-style:normal}.kicker{display:block;margin-top:.22in;color:#b89521;font-size:8pt;font-weight:900;letter-spacing:.14em;text-transform:uppercase}h1{margin:8px 0 .08in;color:#003f28;font:800 22pt/1.05 Georgia,"Times New Roman",serif;letter-spacing:-.02em}h2{margin:.14in 0 .06in;color:#003f28;font:800 11pt/1.2 Georgia,serif;padding-bottom:.05in;border-bottom:2px solid #d1be78}.intro{max-width:7.3in;margin:0 0 .18in;color:#33453c;font-size:8.8pt;line-height:1.42}
.stat-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:.12in;margin:0 0 .18in}.stat-card{padding:.12in .1in;border-radius:10px;background:#003f28;text-align:center}.stat-card b{display:block;color:#fff;font:800 13pt/1.1 Georgia,serif}.stat-card span{display:block;margin-top:.03in;color:#e7c95f;font-size:6.1pt;font-weight:800;letter-spacing:.02em;text-transform:uppercase;line-height:1.25}
.section-label{display:flex;align-items:end;justify-content:space-between;gap:.2in;margin:.02in 0 .09in;border-bottom:none}.section-label h2{margin:0;padding-bottom:0;border-bottom:none}.section-label p{max-width:4.8in;margin:0;color:#68786f;font-size:7.3pt;line-height:1.35;text-align:right}.continuation{margin:.17in 0 .1in;color:#b89521;font-size:7.3pt;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:6.55pt;line-height:1.15}thead{display:table-header-group}th{padding:4px 5px;background:#003f28;color:#fff;border-bottom:2px solid #d1be78;font-size:6.3pt;text-align:left;letter-spacing:.015em}td{padding:3px 5px;border-bottom:1px solid #dce5e0;vertical-align:top}tbody tr:nth-child(even):not(.group):not(.subtotal):not(.total) td{background:#f7f9f8}th:nth-child(1){width:17%}th:nth-child(2){width:40%}th:nth-child(3){width:10%}th:nth-child(4){width:15%}th:nth-child(5){width:18%}.capital-table th:nth-child(1){width:20%}.capital-table th:nth-child(2){width:50%}.capital-table th:nth-child(3){width:13%}.capital-table th:nth-child(4){width:17%}.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.group td{padding:5px 5px 3px;background:#f4f6f4;color:#003f28;border-top:1px solid #003f28;font-size:6.5pt;font-weight:900;letter-spacing:.075em;text-transform:uppercase}.subtotal td{background:none;font-weight:800;border-top:1px solid #d1be78;color:#003f28}.total td{background:none;color:#003f28;font-weight:800;border:0;border-top:1.5px solid #003f28;padding-top:4px}
.editorial-note{display:grid;grid-template-columns:1.2in 1fr;gap:.2in;margin:.13in 0 .16in;padding:.12in .15in;border-left:4px solid #d1be78;background:#f9f8f2}.editorial-note strong{color:#003f28;font:800 9pt/1.2 Georgia,serif}.editorial-note p{margin:0;color:#44574e;font-size:7.4pt;line-height:1.4}footer{position:absolute;left:.62in;right:.62in;bottom:.3in;display:flex;justify-content:space-between;border-top:1px solid #cbd8d1;padding-top:7px;color:#68786f;font-size:7.5pt;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.dense-table table{font-size:5.75pt;line-height:1.1}.dense-table th{padding:3px 4px;font-size:5.8pt}.dense-table td{padding:2px 4px}.dense-table .group td{padding:4px 4px 2px;font-size:5.9pt}
</style></head><body>
<section>${header()}<small class="kicker">Budget Ledgers</small><h1>Contractual Services</h1><p class="intro">A transparent view of services the County plans to purchase from outside organizations during Fiscal Year 2027.</p><div class="stat-strip">${metrics}</div><div class="section-label"><h2>Department Services</h2><p>Operating services procured by departments, including professional, maintenance, technology, and specialized support.</p></div>${ledgerTable(departmentA)}${footer(startPage)}</section>
<section class="dense-table">${header()}<div class="continuation">Contractual Services / Department Services</div>${ledgerTable(departmentB)}${footer(startPage + 1)}</section>
<section>${header()}<small class="kicker">Capital Improvement Plan</small><h1>Anticipated Procurements</h1><p class="intro">FY 2027-funded capital projects expected to require outside engineering, design, inspection, or construction services. Individual scopes remain subject to procurement.</p>${ledgerTable(capitalA, true)}${footer(startPage + 2)}</section>
<section>${header()}<div class="continuation">Anticipated Procurements / Capital Projects</div>${ledgerTable(capitalB, true)}<div class="editorial-note"><strong>Planning estimate</strong><p>Capital amounts identify FY 2027 project funding potentially available for contracted work. They do not represent an awarded vendor contract.</p></div>${footer(startPage + 3)}</section>
</body></html>`;

const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log(`Wrote ${outPath}`);
