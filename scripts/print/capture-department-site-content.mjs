// Captures what each department page on the site shows for its goal,
// challenges, and services & performance, so the print department profiles
// (build-departments-and-services.mjs) print the same text and measures.
//
//   node scripts/print/capture-department-site-content.mjs [baseUrl]
//
// baseUrl defaults to the local preview server (http://127.0.0.1:5500).
// Writes scripts/data/department-site-content.json.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const base = (process.argv[2] || "http://127.0.0.1:5500").replace(/\/$/, "");

// Print profile name -> site page (with ?office= for offices that share a page).
const PAGES = [
  ["Building Construction and Maintenance", "building-construction-and-maintenance.html"],
  ["Building Department", "building-department.html"],
  ["Code Compliance", "code-compliance.html"],
  ["County Administration", "county-administration.html"],
  ["Eagle Springs Golf and Recreation Center", "eagle-springs-golf-and-recreation-center.html"],
  ["Eagle Springs Grill", "eagle-springs-grill.html"],
  ["Emergency Management", "emergency-management.html"],
  ["Engineering Department", "engineering-department.html"],
  ["Environmental Resources", "environmental-resources.html"],
  ["Extension Office", "extension-office.html"],
  ["Geographic Info Systems", "geographic-info-systems.html"],
  ["Housing & Urban Development", "housing-and-urban-development.html"],
  ["Human Resources", "human-resources.html"],
  ["Libraries", "libraries.html"],
  ["Mosquito Control", "mosquito-control.html"],
  ["Mossy Head Wastewater Treatment Facility", "mossy-head-wastewater-treatment-facility.html"],
  ["Office of Management and Budget", "office-of-management-and-budget.html"],
  ["Office of the County Attorney", "office-of-the-county-attorney.html"],
  ["Planning", "planning.html"],
  ["Probation", "probation.html"],
  ["Public Works", "public-works.html"],
  ["Purchasing", "purchasing.html"],
  ["Recreation", "recreation.html"],
  ["Soil Conservation", "soil-conservation.html"],
  ["Solid Waste", "solid-waste.html"],
  ["Veteran Services", "veteran-services.html"],
  ["Tourism Administration", "tourism-administration.html?office=tourism-administration"],
  ["Sales and Visitors Center", "tourism-administration.html?office=sales-and-visitor-center"],
  ["Communications", "tourism-administration.html?office=communications"],
  ["Marketing", "tourism-administration.html?office=marketing"],
  ["Beach Operations", "tourism-beach-operations.html?office=beach-operations"],
  ["Beach Tram", "tourism-beach-operations.html?office=beach-tram"]
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
const result = {};
for (const [name, path] of PAGES) {
  const url = `${base}/pages/${path}${path.includes("?") ? "&" : "?"}embed=department-popup`;
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector(".wc-dept-service-block, .wc-dept-goal-quote", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
  result[name] = await page.evaluate(() => {
    const text = (el) => (el ? el.innerText.replace(/\s+/g, " ").trim() : "");
    const goal = text(document.querySelector(".wc-dept-goal-quote:not(.wc-dept-challenge-quote) p"));
    const challenges = text(document.querySelector(".wc-dept-challenge-quote p"));
    const services = [...document.querySelectorAll(".wc-dept-service-block")].map((block) => {
      const measures = [];
      block.querySelectorAll("table.wc-dept-measure-table").forEach((table) => {
        const headers = [...table.querySelectorAll("thead th")].map((th) => text(th));
        table.querySelectorAll("tbody tr").forEach((tr) => {
          const rowHead = tr.querySelector("th[scope=row]");
          if (rowHead) {
            const cells = [...tr.querySelectorAll("td")].map((td) => text(td));
            const values = {};
            headers.slice(1).forEach((h, i) => { if (!/trend/i.test(h)) values[h] = cells[i] ?? ""; });
            measures.push({ name: text(rowHead), values, note: "" });
          } else if (measures.length) {
            const note = text(tr);
            if (note) measures[measures.length - 1].note = note;
          }
        });
      });
      return {
        title: text(block.querySelector(".wc-dept-service-head h2, .wc-dept-service-head h3, h2, h3")),
        description: text(block.querySelector(".wc-dept-service-head p")),
        measures
      };
    });
    return { goal, challenges, services };
  });
  const r = result[name];
  console.log(`${name}: goal ${r.goal ? "yes" : "MISSING"}, challenges ${r.challenges ? "yes" : "MISSING"}, ${r.services.length} services, ${r.services.reduce((n, s) => n + s.measures.length, 0)} measures`);
}
await browser.close();
writeFileSync(new URL("../data/department-site-content.json", import.meta.url), JSON.stringify(result, null, 2) + "\n");
console.log(`Wrote scripts/data/department-site-content.json (${Object.keys(result).length} profiles)`);
