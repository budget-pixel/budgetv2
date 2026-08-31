import { chromium } from "playwright";

const allDepartments = ["building-construction-and-maintenance","building-department","code-compliance","county-administration","eagle-springs-golf-and-recreation-center","eagle-springs-grill","emergency-management","engineering-department","environmental-resources","extension-office","geographic-info-systems","housing-and-urban-development","human-resources","libraries","mosquito-control","mossy-head-wastewater-treatment-facility","office-of-management-and-budget","office-of-the-county-attorney","planning","probation","public-works","purchasing","recreation","soil-conservation","solid-waste","tourism-administration","tourism-beach-operations","tourism-lifeguard-services-and-beach-safety","veteran-services"];
const departments = process.argv.length > 2 ? process.argv.slice(2) : allDepartments;
const browser = await chromium.launch({ headless: true });

for (const [index, department] of departments.entries()) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto(`http://127.0.0.1:8765/pages/${department}.html`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForFunction(() => document.querySelector(".statement-of-function") && document.querySelector(".wc-board-department-profile"), { timeout: 60000 });
  await page.evaluate(() => {
    document.body.classList.add("wc-book-use-source-tables");
    document.querySelectorAll("details").forEach((detail) => { detail.open = true; });
    const narrative = document.querySelector(".statement-of-function");
    const heading = narrative.querySelector("h2");
    const columns = document.createElement("div");
    columns.className = "wc-book-narrative-columns";
    [...narrative.childNodes].filter((node) => node !== heading).forEach((node) => columns.appendChild(node));
    narrative.appendChild(columns);
    const container = document.createElement("section");
    container.className = "wc-book-department-tables";
    const sources = [
      ["department-expense-table", "Detailed Expenditure Ledger", "", ["object name", "itemized description", "fy 2025 actual", "fy 2026 budget", "fy 2027 proposed"]],
      ["department-revenue-table", "Detailed Revenue Ledger", "", ["object name", "itemized description", "fy 2025 actual", "fy 2026 budget", "fy 2027 proposed"]],
      ["department-staffing-table", "Staffing and Personnel Table", "wc-book-staffing-table", ["position", "fy 2026 fte", "fy 2027 fte", "+/−", "salaries & wages", "total personnel cost"]]
    ];
    const normalize = (value) => value.replace(/\s+/g, " ").trim().toLowerCase();
    const cleanTable = (source, wantedHeaders) => {
      const table = document.createElement("table");
      table.className = "wc-book-clean-table";
      const sourceRows = [...source.rows];
      const headers = [...(sourceRows[0]?.cells || [])].map((cell) => normalize(cell.innerText));
      const indexes = wantedHeaders.map((wanted) => headers.findIndex((header) => header === wanted || header.includes(wanted))).filter((index) => index >= 0);
      const seen = new Set();
      for (const [rowIndex, sourceRow] of sourceRows.entries()) {
        const row = document.createElement("tr");
        const cells = [...sourceRow.cells];
        for (const index of indexes) {
          const sourceCell = cells[index];
          if (!sourceCell) continue;
          const cell = document.createElement(rowIndex === 0 || sourceCell.tagName === "TH" ? "th" : "td");
          cell.textContent = sourceCell.innerText.replace(/\s+/g, " ").trim() || "—";
          if (sourceCell.colSpan > 1 && !keepColumns) cell.colSpan = sourceCell.colSpan;
          row.appendChild(cell);
        }
        const signature = [...row.cells].map((cell) => normalize(cell.textContent)).join("|");
        if (!row.cells.length || (rowIndex > 0 && seen.has(signature))) continue;
        if (rowIndex > 0) seen.add(signature);
        (rowIndex === 0 ? table.createTHead() : (table.tBodies[0] || table.createTBody())).appendChild(row);
      }
      return table;
    };
    for (const [id, title, extraClass, wantedHeaders] of sources) {
      const mount = document.getElementById(id);
      if (!mount || !mount.querySelector("table")) continue;
      const candidates = [...mount.querySelectorAll("table")];
      const source = candidates.sort((a, b) => (b.rows.length * (b.rows[0]?.cells.length || 0)) - (a.rows.length * (a.rows[0]?.cells.length || 0)))[0];
      if (!source || source.rows.length < 2) continue;
      const section = document.createElement("section");
      section.className = `wc-book-department-table ${extraClass}`.trim();
      section.innerHTML = `<h2>${title}</h2>`;
      const table = cleanTable(source, wantedHeaders);
      if (!table.tHead?.rows[0]?.cells.length || !table.tBodies[0]?.rows.length) continue;
      section.appendChild(table);
      container.appendChild(section);
    }
    narrative.insertAdjacentElement("afterend", container);
  });
  await page.addStyleTag({ path: "assets/budget-book-print.css" });
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: `/private/tmp/table-dept-${department}.pdf`, format: "Letter", printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
  console.log(`${index + 1}/${departments.length} ${department}`);
  await page.close();
}

await browser.close();
