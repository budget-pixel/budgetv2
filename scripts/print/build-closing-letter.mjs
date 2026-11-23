import { capturePublicationHtml } from "./publication-print.mjs";
import { chromium } from "playwright";
import QRCode from "qrcode";

// Builds the closing "Thank you for reading" letter (the page just before the
// back cover). Uses the same header, footer, kicker and title system as the
// transmittal letter so the book opens and closes with matching letters.

const URL_EXPLORER = "https://final2027.budget-waltoncountyfl.com/";
const PAGE_NUMBER = process.argv[3] || "142";
const qrSvg = await QRCode.toString(URL_EXPLORER, { type: "svg", margin: 0, color: { dark: "#003f28", light: "#ffffff" } });

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Thank You for Reading</title>
<style>
  @page{ size:letter portrait; margin:0; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ font-family:Arial, Helvetica, sans-serif; color:#173229; }
  section{ position:relative; width:8.5in; height:11in; padding:.56in .62in .5in; background:#fff; overflow:hidden; }
  header{ display:flex; justify-content:space-between; padding-bottom:9px; border-bottom:1px solid #63736b; color:#53665d; font-size:8pt; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
  header em{ font-style:normal; }
  .kicker{ display:block; margin-top:.3in; color:#b89521; font-size:8pt; font-weight:900; letter-spacing:.14em; text-transform:uppercase; }
  h1{ margin:8px 0 0; color:#003f28; font:800 30pt/1.05 Georgia, "Times New Roman", serif; letter-spacing:-.025em; }
  .rule{ width:1.1in; height:3px; margin:.18in 0 .34in; background:#d1be78; border-radius:2px; }
  .letter{ max-width:6.1in; }
  .letter p{ margin:0 0 .16in; color:#33453c; font:11.5pt/1.62 Georgia, "Times New Roman", serif; }
  .letter .salutation{ color:#003f28; font-weight:700; }
  .signoff{ margin-top:.3in; }
  .signoff p{ margin:0; }
  .signoff .closing{ color:#33453c; font:11.5pt/1.4 Georgia, serif; }
  .signoff .name{ margin-top:.12in; color:#003f28; font:italic 700 17pt/1.1 Georgia, serif; }
  .signoff .title{ margin-top:4px; color:#68786f; font-size:8.6pt; font-weight:800; letter-spacing:.05em; text-transform:uppercase; }
  .online{ position:absolute; left:.62in; right:.62in; bottom:.95in; display:flex; gap:.32in; align-items:center; padding:.28in .3in; border:1px solid #e4ebe7; border-radius:12px; background:#f9f8f2; }
  .qr{ flex:0 0 1.25in; width:1.25in; height:1.25in; padding:.08in; background:#fff; border:1px solid #e4ebe7; border-radius:8px; }
  .qr svg{ display:block; width:100%; height:100%; }
  .online-text{ flex:1 1 auto; min-width:0; }
  .online-kicker{ margin:0 0 4px; color:#b89521; font-size:7.6pt; font-weight:900; letter-spacing:.12em; text-transform:uppercase; }
  .online h2{ margin:0 0 .08in; color:#003f28; font:700 15pt/1.2 Georgia, serif; }
  .online ul{ margin:0 0 .1in; padding-left:16px; color:#33453c; font-size:9.5pt; line-height:1.5; }
  .online li::marker{ color:#b89521; }
  .online a{ color:#003f28; font-size:9.5pt; font-weight:800; text-decoration:none; border-bottom:1px solid #d1be78; }
  footer{ position:absolute; left:.62in; right:.62in; bottom:.3in; display:flex; justify-content:space-between; border-top:1px solid #cbd8d1; padding-top:7px; color:#68786f; font-size:7.5pt; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
</style></head>
<body>
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">A Letter to Our Readers</small>
    <h1>Thank you for reading</h1>
    <div class="rule"></div>

    <div class="letter">
      <p class="salutation">Dear reader,</p>
      <p>Thank you for taking the time to review Walton County&rsquo;s FY 2027 budget. Whether you came looking for a road project in your neighborhood or wanted to understand where your property taxes go, we appreciate your interest in how the County uses public funds.</p>
      <p>If you would like to look more closely at a service or project, visit the online budget. There you can explore a department&rsquo;s budget line by line, see how spending has changed over time, and find the funding set aside for individual capital projects.</p>
      <p>We hope this book and its online companion help you find answers and take part in conversations about the services that matter to you.</p>
      <div class="signoff">
        <p class="closing">Sincerely,</p>
        <p class="name">Office of Management and Budget</p>
        <p class="title">Walton County Board of County Commissioners</p>
      </div>
    </div>

    <div class="online">
      <div class="qr" role="img" aria-label="QR code linking to the FY 2027 online budget">${qrSvg}</div>
      <div class="online-text">
        <p class="online-kicker">Explore the Budget Online</p>
        <h2>Fiscal Year 2027 Online Budget</h2>
        <ul>
          <li>Department budgets line by line</li>
          <li>Spending trends across fiscal years</li>
          <li>Funding for individual capital projects</li>
        </ul>
        <a href="${URL_EXPLORER}">final2027.budget-waltoncountyfl.com</a>
      </div>
    </div>

    <footer><span>FY 2027 Final Budget</span><b>${PAGE_NUMBER}</b></footer>
  </section>
</body></html>`;

const outPath = process.argv[2] || "/private/tmp/budget-book-closing-letter.pdf";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await capturePublicationHtml(page, outPath);
await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, tagged: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await browser.close();
console.log("Wrote " + outPath);
