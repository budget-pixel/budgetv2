// One verified publication snapshot for the print fund ledger and outlook.
import fs from "node:fs";
import assert from "node:assert/strict";

export const snapshot = JSON.parse(fs.readFileSync(new URL("./data/fund-schedule-snapshot.json", import.meta.url), "utf8"));
export const schedules = snapshot.schedules;
export const consolidated = schedules[0];
export const currency = value => `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US")}`;
export const millions = value => `${value < 0 ? "&minus;" : ""}$${(Math.abs(value) / 1e6).toFixed(1)}M`;
export const values = (schedule, label) => schedule.rows[label] || schedule.headers.map(() => 0);
export const printRow = (schedule, label, displayedLabel = label) => [displayedLabel, ...values(schedule, label).slice(2, 8).map(currency)];
export const individualFunds = schedules.slice(1);
export const generalFund = individualFunds.find(s => s.name === "General Fund");
assert.ok(generalFund);
assert.equal(values(consolidated, "Total Expenditures")[6], 327945088);
assert.equal(individualFunds.reduce((sum, fund) => sum + values(fund, "Total Expenditures")[6], 0), 327945088);
for (const s of schedules) {
  for (const i of [6, 7, 8, 9]) {
    const change = values(s, "Total Revenue and Other Financial Sources")[i] - values(s, "Total Expenditures and Other Financial Uses")[i];
    assert.ok(Math.abs(change - values(s, "Change in Fund Balance")[i]) <= 2);
    assert.ok(Math.abs(values(s, "Beginning Fund Balance")[i] + change - values(s, "Estimated Ending Fund Balance")[i]) <= 2);
  }
}
