// Same example and allocation base as the Property Tax Allocation chapter.
export const COUNTY_PROPERTY_TAX_ALLOCATION = 151592125;
export const EXAMPLE_COUNTY_TAX = (250000 - 51411) * 3.25 / 1000;

export function homeownerValueExample(allocation) {
  if (!(allocation > 0)) return "";
  const annual = EXAMPLE_COUNTY_TAX * allocation / COUNTY_PROPERTY_TAX_ALLOCATION;
  const amount = annual.toLocaleString("en-US", { style: "currency", currency: "USD" });
  return `<div class="payer-row"><b>Illustrative homeowner contribution</b><p class="payer-detail">${amount} of the example home's $645.41 annual County operating tax is allocated here.</p><p class="source-trace">$250,000 assessed home less $51,411 homestead exemption; $198,589 taxable at 3.2500 County mills. Allocated by property-tax share, not an average bill or full service cost. Excludes other taxing authorities. See Property Tax Allocation.</p></div>`;
}
