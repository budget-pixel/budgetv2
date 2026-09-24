import { chromium } from "playwright";

const outPath = process.argv[2] || "/private/tmp/budget-book-self-insurance-fund.pdf";
const pageNumber = Number(process.argv[3] || 102);

const annualBudget = 22_926_947;
const currentReserve = 3_668_000;
const requiredDays = 60;
const currentDays = 74;
const requiredReserve = currentReserve * requiredDays / currentDays;
const requirementPosition = requiredDays / currentDays * 100;

const money = (value) => `$${Math.round(value).toLocaleString("en-US")}`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Self-Insurance Fund</title><style>
@page{size:letter portrait;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#173229}.page{position:relative;width:8.5in;height:11in;padding:.56in .62in .5in;background:#fff;overflow:hidden}header{display:flex;justify-content:space-between;padding-bottom:9px;border-bottom:1px solid #63736b;color:#53665d;font-size:8pt;font-weight:800;letter-spacing:.08em;text-transform:uppercase}header em{font-style:normal}.kicker{display:block;margin-top:.24in;color:#b89521;font-size:8pt;font-weight:900;letter-spacing:.14em;text-transform:uppercase}h1{margin:8px 0 .07in;color:#003f28;font:800 24pt/1.05 Georgia,"Times New Roman",serif;letter-spacing:-.02em}.intro{max-width:7.1in;margin:0;color:#33453c;font-size:9pt;line-height:1.45}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.12in;margin:.2in 0}.stat{min-height:.88in;padding:.14in .1in;border-radius:11px;background:#003f28;text-align:center}.stat b{display:block;color:#fff;font:800 16pt/1.05 Georgia,serif}.stat span{display:block;margin-top:.06in;color:#e7c95f;font-size:6.5pt;font-weight:900;letter-spacing:.05em;text-transform:uppercase;line-height:1.25}.reserve{padding:.2in;border:1px solid #d8e1dc;border-radius:13px;background:#f4f8f5}.reserve-head{display:flex;justify-content:space-between;align-items:end;gap:.2in}.reserve h2,.section h2{margin:0;color:#003f28;font:800 13pt/1.15 Georgia,serif}.reserve-head p{margin:0;color:#52665c;font-size:7.4pt}.track{position:relative;height:.3in;margin:.18in 0 .08in;border-radius:20px;background:#dce5e0;overflow:visible}.current{height:100%;width:100%;border-radius:20px;background:#006b3c}.target{position:absolute;top:-5px;left:${requirementPosition.toFixed(1)}%;width:3px;height:calc(100% + 10px);background:#d1a928}.target:after{content:'60-day requirement';position:absolute;left:5px;top:-18px;white-space:nowrap;color:#8b6b06;font-size:6.5pt;font-weight:900;text-transform:uppercase}.track-labels{display:flex;justify-content:space-between;color:#52665c;font-size:7pt}.track-labels b{color:#003f28}.callout{display:grid;grid-template-columns:1.65in 1fr;gap:.18in;align-items:center;margin-top:.16in;padding:.13in .16in;border-left:4px solid #d1be78;background:#fff}.callout strong{color:#003f28;font:800 15pt/1 Georgia,serif}.callout span{color:#41564c;font-size:8pt;line-height:1.4}.grid{display:grid;grid-template-columns:1fr 1fr;gap:.18in;margin-top:.2in}.section{padding:.18in;border-top:2px solid #d1be78;background:#fbfcfb}.section p{margin:.07in 0 .12in;color:#52665c;font-size:7.5pt;line-height:1.4}.row{display:grid;grid-template-columns:1fr auto;gap:.12in;padding:.075in 0;border-bottom:1px solid #dfe7e2;font-size:7.7pt}.row:last-child{border-bottom:0}.row b{color:#003f28}.total{margin-top:.05in;padding-top:.09in!important;border-top:1px solid #003f28!important;font-weight:900}.why{margin-top:.18in;padding:.17in .2in;border-radius:12px;background:#f6f4eb}.why h2{margin:0 0 .08in;color:#003f28;font:800 12pt/1.15 Georgia,serif}.why ul{display:grid;grid-template-columns:repeat(3,1fr);gap:.18in;margin:0;padding:0;list-style:none}.why li{padding-left:.13in;border-left:3px solid #d1be78;color:#33453c;font-size:7.5pt;line-height:1.4}.note{margin:.13in 0 0;color:#68786f;font-size:6.5pt;line-height:1.4;font-style:italic}footer{position:absolute;left:.62in;right:.62in;bottom:.3in;display:flex;justify-content:space-between;border-top:1px solid #cbd8d1;padding-top:7px;color:#68786f;font-size:7.5pt;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
</style></head><body><section class="page">
<header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
<small class="kicker">Workforce Budget</small><h1>Self-Insurance Fund</h1>
<p class="intro">Walton County uses an internal service fund to finance employee and retiree health benefits. Contributions are collected in the fund and used to pay health claims and plan-administration costs. The required reserve is 60 days of projected claims; the current allocation provides approximately 74 days of coverage.</p>
<div class="stats">
  <div class="stat"><b>$22.9M</b><span>FY2027 Fund Budget</span></div>
  <div class="stat"><b>60 days</b><span>Required Reserve</span></div>
  <div class="stat"><b>$3.668M</b><span>Current Reserve Allocation</span></div>
  <div class="stat"><b>${currentDays.toFixed(0)} days</b><span>Current Coverage</span></div>
</div>
<div class="reserve"><div class="reserve-head"><h2>Reserve Position</h2></div>
  <div class="track"><div class="current"></div><div class="target"></div></div>
  <div class="track-labels"><span>Current <b>${money(currentReserve)}</b></span><span>Required <b>${money(requiredReserve)}</b></span></div>
  <div class="callout"><strong>Above requirement</strong><span>The current $3,668,000 allocation provides approximately ${currentDays.toFixed(0)} days of projected-claims coverage, exceeding the ${requiredDays}-day requirement by about ${money(currentReserve-requiredReserve)}.</span></div>
</div>
<div class="grid">
  <div class="section"><h2>How the Fund Is Financed</h2><p>Employer, employee, retiree, and COBRA health contributions support the plan.</p>
    <div class="row"><span>Employee Health Fees</span><b>$22,331,947</b></div><div class="row"><span>Retiree Health Fees</span><b>$500,000</b></div><div class="row"><span>COBRA Health Fees</span><b>$50,000</b></div><div class="row"><span>Interest</span><b>$45,000</b></div><div class="row total"><span>Total FY2027 Revenue</span><b>$22,926,947</b></div>
  </div>
  <div class="section"><h2>How the Fund Is Used</h2><p>The budget supports claims, administration, and other costs of the self-funded plan.</p>
    <div class="row"><span>Health Insurance Claims</span><b>$20,626,947</b></div><div class="row"><span>Administrative Plan Fees</span><b>$2,300,000</b></div><div class="row total"><span>Total FY2027 Expenditures</span><b>$22,926,947</b></div>
  </div>
</div>
<div class="why"><h2>How Self-Insurance Protects Taxpayers</h2><ul><li>The County pays actual health claims and administrative fees rather than transferring all claims risk and insurer pricing into a fixed premium.</li><li>The reserve absorbs uneven claim timing and short-term volatility, reducing pressure for abrupt contribution increases after a high-claim period.</li><li>Transparent claims and fee experience gives the County a stronger basis for managing plan design, vendors, and future funding.</li></ul></div>
<footer><span>FY 2027 Final Budget</span><b>${pageNumber}</b></footer>
</section></body></html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, tagged: true, outline: true });
await browser.close();
console.log(`Wrote ${outPath}`);
