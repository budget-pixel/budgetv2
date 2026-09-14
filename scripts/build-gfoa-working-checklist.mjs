import { chromium } from "playwright";

const outPath = process.argv[2] || "output/pdf/gfoa-working-checklist.pdf";

const sections = [
  ["Community Priorities & Organizational Challenges", "20 pts", [
    ["What are the major organizational challenges?", "DONE", "Page 14 separates capacity, coordination, recurring-cost, revenue-risk, and emergency-readiness pressures."],
    ["What are the major community challenges?", "DONE", "Page 14 identifies growth and aging assets, seasonal coastal demand, and housing affordability and access."],
    ["How does the budget address those challenges?", "DONE", "Challenge-to-Result Plan links each pressure to a specific FY2027 response and funding signal."],
    ["Are results expected within the budget period?", "DONE", "Each response includes an expected FY2027 result and a defined review point."],
  ]],
  ["Value", "20 pts", [
    ["What is the public getting from government?", "DONE", "Public Value and Program & Service pages connect spending to services, benefits, contributors, and targets."],
    ["How much does government cost?", "DONE", "Budget in Brief, property-tax example, per-dollar allocations, program costs, and department costs are provided."],
  ]],
  ["Long-Term Outlook", "20 pts", [
    ["Impact on the long-term fiscal outlook?", "DONE", "Dedicated Long-Term Outlook chapter with fund forecasts through FY2031."],
    ["Impact on reserve levels?", "DONE", "Fund-balance trends, the informal $50M emergency objective, and policy status are disclosed."],
    ["Deferred expenses or unmet needs?", "DONE", "Deferral disclosure distinguishes funded work from needs subject to future prioritization."],
    ["New long-term spending obligations?", "DONE", "Recurring staffing, benefits, contracts, and asset-operating commitments are identified."],
    ["Prior-year trends and impact?", "DONE", "Historical results, year-over-year changes, and multi-year forecasts are included."],
  ]],
  ["Revenue Budget", "20 pts", [
    ["How much revenue is anticipated?", "DONE", "Revenue ledger and six-year trend show FY2027 resources by source."],
    ["Are sources diverse?", "DONE", "Revenue Portfolio identifies the twelve largest sources and concentration."],
    ["How much control does the County have?", "DONE", "Control, reliability, restriction, and trend are classified by major source."],
    ["Are revenues restricted for specific purposes?", "DONE", "Per-source restriction labels and fund context are provided."],
    ["How is the burden distributed?", "DONE", "Resident, visitor, user, business, and intergovernmental shares are explained."],
  ]],
  ["Personnel Budget", "15 pts", [
    ["How many total staff are budgeted?", "DONE", "1,515 FTE: 1,508 full-time and 7 part-time, with Board and Constitutional splits."],
    ["How did personnel cost change?", "DONE", "Personnel Ledger compares FY2026 and FY2027 cost by organization."],
    ["Where did staffing increase or decrease?", "DONE", "Net +15 FTE and office-level position changes are identified."],
    ["What are the major personnel cost drivers?", "DONE", "COLA, health-insurance, retirement, and position effects are separated."],
    ["Are workload and staffing pressures explained?", "DONE", "Turnover, hiring need, position justification, overtime, and service capacity are discussed."],
  ]],
  ["Department Budget", "15 pts", [
    ["What services does each department provide?", "DONE", "Department profiles identify purpose, primary services, goals, and challenges."],
    ["What are the costs for each department?", "DONE", "Personnel, contractual, operating, and capital composition is shown."],
    ["How is each department held accountable?", "DONE", "Historical measures, FY2027 targets, service-change notes, funding, contracts, and capital are provided."],
  ]],
  ["Program & Services Budget", "15 pts", [
    ["What are the major programs and services?", "DONE", "Eight Board-administered program groupings are defined; exclusions are explicit."],
    ["What does each program cost?", "DONE", "Amount, share, and personnel/contractual/operating/capital mix are shown."],
    ["Are program-level goals and results included?", "DONE", "Each program has a purpose, decision signal, and measurable FY2027 targets."],
    ["Are programs aligned with priorities and funding?", "DONE", "Priority, contributing offices, and funding-source descriptions are included."],
  ]],
  ["Capital Budget", "15 pts", [
    ["How is capital spending defined?", "DONE", "Capital Improvement Plan introduction defines the program and presentation."],
    ["What is the level of capital spending?", "DONE", "$43.8M funded FY2027 program reconciled to fund-specific ledgers."],
    ["How are projects prioritized?", "DONE", "Prioritization narrative and project decision information are provided."],
    ["How is capital funded?", "DONE", "Funding sources are shown by project and fund; grants and previously funded work are separated."],
    ["Is new, replacement, and rehabilitation work distinguished?", "DONE", "Project purpose and type are identified in the detailed presentation."],
    ["Are major projects and FY2027 timing shown?", "DONE", "Major projects include benefit, phase/timing, FY2027 amount, and future-funding context."],
  ]],
  ["Budget Process", "10 pts", [
    ["How is the budget developed?", "DONE", "Process phases explain request development, review, Board direction, hearings, and adoption."],
    ["Who is involved?", "DONE", "OMB, Administration, departments, Constitutional Officers, Board, and public roles are identified."],
    ["How are community priorities considered?", "DONE", "Strategic priorities are linked to request review and the FY2027 challenge-response plan."],
    ["When are decisions made?", "DONE", "Budget calendar and statutory hearing dates are included."],
    ["When and how can the public engage?", "DONE", "Four workshops, outreach channels, comment themes, decision effect, and hearing opportunities are documented."],
  ]],
  ["Budget Document - Material Type", "10 pts", [
    ["Is the publication organized with a clear table of contents?", "DONE", "Three-page contents, chapter dividers, page numbers, and PDF bookmarks are present."],
    ["Is the budget message prominent?", "DONE", "The transmittal letter appears at the front of the publication."],
    ["Are graphics and images effective?", "DONE", "Charts, allocation graphics, project cards, portraits, and visual summaries are used throughout."],
    ["Is the document available from the website?", "DONE", "The site includes an interactive full-budget viewer linked to the current PDF."],
    ["Does the PDF meet accessibility standards?", "PARTIAL", "Tagged PDF and document language are present; complete reading-order, contrast, alt-text, and assistive-technology validation remains."],
  ]],
];

const rows = sections.map(([title, pts, items]) => `
  <div class="section"><div class="section-title"><b>${title}</b><span>${pts}</span></div>
  ${items.map(([q,s,n]) => `<div class="row"><div>${q}</div><strong class="${s.toLowerCase()}">${s}</strong><div>${n}</div></div>`).join("")}</div>`).join("");

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>GFOA Working Checklist</title><style>
@page{size:17in 11in;margin:0}*{box-sizing:border-box}html,body{margin:0}body{font-family:Arial,Helvetica,sans-serif;color:#173229;background:#fff}.page{width:17in;height:11in;padding:.36in .48in .35in;position:relative;overflow:hidden}header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #d1be78;padding-bottom:.11in;margin-bottom:.11in}h1{margin:0;color:#003f28;font:800 21pt/1.05 Georgia,serif}header p{margin:.04in 0 0;color:#586a61;font-size:7.5pt}.summary{display:flex;gap:.08in}.pill{min-width:1.23in;padding:.08in .11in;border-radius:8px;background:#003f28;text-align:center}.pill b{display:block;color:#fff;font:900 15pt/1 Georgia,serif}.pill span{display:block;margin-top:.025in;color:#e7c95f;font-size:5.5pt;font-weight:900;text-transform:uppercase;letter-spacing:.04em}.pill.warn{background:#f7f1dc;border:1px solid #d1be78}.pill.warn b{color:#9a6b00}.pill.warn span{color:#6b5a24}.grid{display:grid;grid-template-columns:1fr 1fr;gap:.105in .18in}.section{break-inside:avoid}.section-title{height:.25in;display:flex;align-items:center;justify-content:space-between;padding:0 .09in;background:#eaf1ed;border-top:2px solid #006231;color:#003f28;font-size:7.65pt}.section-title span{color:#68786f;font-size:6.6pt;font-weight:900}.row{display:grid;grid-template-columns:2.55in .58in 1fr;gap:.08in;align-items:center;min-height:.285in;padding:.03in .08in;border-bottom:1px solid #dfe7e2;font-size:6.65pt;line-height:1.2}.row>div:first-child{font-weight:700}.row strong{font-size:6.05pt;text-align:center}.done{color:#08763d}.partial{color:#a66f00}.foot{position:absolute;left:.48in;right:.48in;bottom:.17in;display:flex;justify-content:space-between;color:#68786f;font-size:5.7pt}.foot b{color:#003f28}.legend{margin-top:.09in;padding:.085in .11in;border-left:4px solid #d1be78;background:#faf8f0;color:#53665d;font-size:6.4pt}.legend b{color:#003f28}
</style></head><body><section class="page"><header><div><h1>GFOA Distinguished Budget Presentation Award - Working Checklist</h1><p>FY2027 Tentative Budget | Updated September 13, 2026 | Internal readiness tool - not for publication</p></div><div class="summary"><div class="pill"><b>43</b><span>Items Supported</span></div><div class="pill warn"><b>1</b><span>Verification Item</span></div><div class="pill"><b>150</b><span>Content Points Addressed</span></div></div></header><main class="grid">${rows}</main><div class="legend"><b>Current assessment:</b> All substantive content categories are supported. “Done” means the current publication contains responsive content; it does not guarantee an award score. The remaining partial item requires formal accessibility testing beyond the presence of PDF tags and language metadata.</div><div class="foot"><span>Walton County Office of Management and Budget</span><b>Working review - verify against the final submitted publication and selected GFOA framework</b></div></section></body></html>`;

const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:2040,height:1320}});
await page.setContent(html,{waitUntil:"networkidle"});
await page.pdf({path:outPath,width:"17in",height:"11in",printBackground:true,preferCSSPageSize:true,tagged:true,outline:true});
await browser.close();
console.log(`Wrote ${outPath}`);
