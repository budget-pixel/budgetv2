import { chromium } from "playwright";
import QRCode from "qrcode";

// Builds the FY 2027 Budget Book's "Financial Policies" section as its own
// two-page PDF -- meant to be inserted right after "Budget Calendar" and
// before "Statistical & Supplemental Information," alongside the book's
// other Budget Process content. Shares the header/footer/kicker/h1 system
// build-budget-process.mjs uses. Content is drawn from the live site's
// pages/financial-policies.html (objectives and adopted policy summaries).

const OBJECTIVES = [
  ["Fiscal Responsibility", "Promote prudent fiscal planning and support the long-term financial health of Walton County through responsible management of public resources."],
  ["Long-Term Financial Planning", "Provide clear direction to County staff in managing the County's finances, developing and adopting budgets, and ensuring the efficient and effective delivery of public services."],
  ["Legal Compliance & Governance", "Ensure compliance with applicable Florida Statutes, County ordinances, and recognized best practices established by the Government Finance Officers Association (GFOA)."],
  ["Transparency & Accountability", "Promote transparency, accountability, and consistency in financial decision-making and budgeting practices."],
  ["Service Delivery", "Support sustainable service delivery while preserving the County's financial stability for future generations."]
];

const POLICIES = [
  ["Fund Balance Policy", "Establishes guidelines for maintaining adequate fund balances to support financial stability, liquidity, emergency preparedness, investment-grade credit ratings, and long-term fiscal sustainability.", "https://www.co.walton.fl.us/DocumentCenter/View/9811/Fund-Balance-Policy-Resolution"],
  ["Budget Policy", "Provides the framework for preparing, adopting, and administering a balanced budget in accordance with Florida law, promoting long-term planning and fiscal accountability.", "https://www.co.walton.fl.us/DocumentCenter/View/9817/Budget-Policy-Per-Florida-Statutes-Chapters-129-and-200"],
  ["Cash Handling Policy", "Establishes internal controls and accountability measures for the receipt, safeguarding, deposit, and management of County funds.", "https://www.co.walton.fl.us/DocumentCenter/View/9813/Cash-Handling-Policy"],
  ["Grants Administration", "Provides guidance for the administration, monitoring, and reporting of grant-funded activities to ensure compliance and maximize the effective use of external funding.", "https://www.co.walton.fl.us/DocumentCenter/View/40346/Grants-Administration-Handbook"],
  ["Budget Transfers and Amendments", "Establishes procedures for budget transfers and amendments in accordance with Florida Statutes, ensuring transparency and appropriate authorization of budget changes.", "https://www.co.walton.fl.us/DocumentCenter/View/9812"],
  ["Capital Asset Policy", "Provides standards for the acquisition, capitalization, inventory, maintenance, and disposal of County assets.", "https://www.co.walton.fl.us/DocumentCenter/View/40294/Capital-Asset-Policy"],
  ["Anti-Fraud and Whistleblower Policies", "Promote ethical conduct and accountability by establishing procedures for reporting suspected fraud, waste, abuse, or misconduct.", "https://www.co.walton.fl.us/DocumentCenter/View/11655"],
  ["Investment Policy", "Establishes guidelines for investing County funds with emphasis on safety, liquidity, diversification, and yield while preserving principal.", "https://www.co.walton.fl.us/DocumentCenter/View/9816"],
  ["Indirect Administrative Cost Allocation Policy", "Provides a methodology for allocating indirect administrative costs among County programs, ensuring equitable cost recovery.", "https://www.co.walton.fl.us/DocumentCenter/View/40347/Indirect-Administrative-Cost-Allocation-Policy"]
];
const POLICY_QRS = await Promise.all(POLICIES.map(([, , url]) => QRCode.toDataURL(url, { margin: 1, width: 140, color: { dark: "#003f28", light: "#ffffff" } })));

const sharedCss = `
  @page{ size:letter portrait; margin:0; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ font-family:Arial, Helvetica, sans-serif; color:#173229; }
  section{
    position:relative;
    width:8.5in;
    height:11in;
    padding:.56in .62in .5in;
    background:#ffffff;
    overflow:hidden;
  }
  header{
    display:flex;
    justify-content:space-between;
    padding-bottom:9px;
    border-bottom:1px solid #63736b;
    color:#53665d;
    font-size:8pt;
    font-weight:800;
    letter-spacing:.08em;
    text-transform:uppercase;
  }
  header em{ font-style:normal; }
  .kicker{
    display:block;
    margin-top:.28in;
    color:#b89521;
    font-size:8pt;
    font-weight:900;
    letter-spacing:.14em;
    text-transform:uppercase;
  }
  h1{
    margin:8px 0 .1in;
    color:#003f28;
    font:800 22pt/1.05 Georgia, "Times New Roman", serif;
    letter-spacing:-.02em;
  }
  p.intro{
    max-width:7.3in;
    margin:0 0 .3in;
    color:#33453c;
    font-size:9.3pt;
    line-height:1.55;
  }
  h2{
    margin:0 0 .16in;
    color:#003f28;
    font:800 12.5pt/1.2 Georgia, serif;
  }
  h2 span{
    display:block;
    margin-bottom:.04in;
    color:#b89521;
    font-size:7.6pt;
    font-weight:900;
    letter-spacing:.1em;
    text-transform:uppercase;
  }
  .objective-grid{
    display:grid;
    grid-template-columns:repeat(5,1fr);
    gap:.14in;
  }
  .objective-card{
    padding:.16in .14in;
    border-top:4px solid #0b7741;
    border-radius:0 0 10px 10px;
    background:#fbfcfa;
    box-shadow:0 4px 12px rgba(0,0,0,.04);
  }
  .objective-card h3{
    margin:0 0 .08in;
    color:#003f28;
    font-size:9.4pt;
    font-weight:800;
    line-height:1.25;
  }
  .objective-card p{
    margin:0;
    color:#33453c;
    font-size:7.6pt;
    line-height:1.4;
  }
  .policy-note{
    margin:.3in 0 0;
    padding:.18in .22in;
    border:1px solid #d1be78;
    border-radius:12px;
    background:#f9f8f2;
  }
  .policy-note h3{
    margin:0 0 .06in;
    color:#003f28;
    font:800 10.5pt/1.2 Georgia, serif;
  }
  .policy-note p{
    margin:0;
    color:#33453c;
    font-size:8.6pt;
    line-height:1.45;
  }
  .policy-grid{
    display:grid;
    grid-template-columns:repeat(2,1fr);
    gap:.16in .3in;
  }
  .policy-card{
    display:flex;
    align-items:center;
    gap:.16in;
    padding:.16in .18in;
    border:1px solid #e4ebe7;
    border-radius:12px;
  }
  .policy-card-body{ flex:1; }
  .policy-card h3{
    margin:0 0 .07in;
    color:#003f28;
    font-size:9.6pt;
    font-weight:800;
  }
  .policy-card p{
    margin:0 0 .06in;
    color:#33453c;
    font-size:8.2pt;
    line-height:1.42;
  }
  .policy-card-qr{
    flex:0 0 auto;
    text-align:center;
  }
  .policy-card-qr img{
    display:block;
    width:.66in;
    height:.66in;
    border-radius:4px;
    background:#fff;
  }
  .policy-card-qr span{
    display:block;
    margin-top:.03in;
    color:#68786f;
    font-size:5.8pt;
    font-weight:800;
    letter-spacing:.02em;
    text-transform:uppercase;
  }
  footer{
    position:absolute;
    left:.62in;
    right:.62in;
    bottom:.3in;
    display:flex;
    justify-content:space-between;
    border-top:1px solid #cbd8d1;
    padding-top:7px;
    color:#68786f;
    font-size:7.5pt;
    font-weight:800;
    letter-spacing:.08em;
    text-transform:uppercase;
  }
`;

const pageHeader = () => `<header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>`;

const page1 = `
  <section>
    ${pageHeader()}
    <small class="kicker">Financial Structure, Policies, and Process</small>
    <h1>Financial Policies</h1>
    <p class="intro">Walton County&rsquo;s Financial Policies establish the framework for sound fiscal management and responsible stewardship of public resources. They guide the Board of County Commissioners in evaluating current operations, planning for future needs, and making informed financial decisions that support the County&rsquo;s strategic objectives &mdash; promoting long-term financial stability, transparency, accountability, and consistency in budgeting practices.</p>

    <h2><span>Objectives</span>What the Policies Are Meant to Achieve</h2>
    <div class="objective-grid">
      ${OBJECTIVES.map(([title, desc]) => `<div class="objective-card"><h3>${title}</h3><p>${desc}</p></div>`).join("")}
    </div>

    <div class="policy-note">
      <h3>Adopted by the Board of County Commissioners</h3>
      <p>Each policy summarized on the following page has been formally adopted by the Board and is administered by the Office of Management and Budget. Full policy documents are available from Walton County at co.walton.fl.us.</p>
    </div>

    <footer><span>FY 2027 Annual Budget</span><b>PAGE_A</b></footer>
  </section>
`;

const page2 = `
  <section>
    ${pageHeader()}
    <small class="kicker">Financial Structure, Policies, and Process</small>
    <h1>Summary of Financial Policies</h1>
    <p class="intro">Nine adopted policies govern how Walton County safeguards, invests, allocates, and reports on public funds.</p>

    <div class="policy-grid">
      ${POLICIES.map(([title, desc], i) => `<div class="policy-card"><div class="policy-card-body"><h3>${title}</h3><p>${desc}</p></div><div class="policy-card-qr"><img src="${POLICY_QRS[i]}" alt="QR code linking to the ${title} document"><span>Scan to View</span></div></div>`).join("")}
    </div>

    <footer><span>FY 2027 Annual Budget</span><b>PAGE_B</b></footer>
  </section>
`;

const startPage = Number(process.argv[3] || 22);
const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Financial Policies</title>
<style>${sharedCss}</style></head>
<body>${page1.replace("PAGE_A", startPage)}${page2.replace("PAGE_B", startPage + 1)}</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-financial-policies.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
