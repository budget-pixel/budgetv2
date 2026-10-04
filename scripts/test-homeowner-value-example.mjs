import assert from "node:assert/strict";
import { homeownerValueExample, EXAMPLE_COUNTY_TAX } from "./homeowner-value-example.mjs";
import { individualFunds, values } from "./fund-schedule-data.mjs";

assert.equal(EXAMPLE_COUNTY_TAX.toFixed(2), "645.41");
assert.ok(homeownerValueExample(98004256).includes("$417.26"));
assert.ok(homeownerValueExample(4672553).includes("$19.89"));
assert.equal(homeownerValueExample(0), "");
const sheriff = individualFunds.find(schedule => /Sheriff/.test(schedule.name));
assert.equal(values(sheriff, "Total Revenues")[7], 11521972);
assert.equal(values(sheriff, "Other Financial Sources")[7], 98004256 + 460000);
assert.equal(values(sheriff, "Change in Fund Balance")[7], -4130000);
assert.equal(98004256 + 460000 + 11521972 + 4130000, 114116228);
console.log("Homeowner example and Sheriff funding reconciliation passed.");
