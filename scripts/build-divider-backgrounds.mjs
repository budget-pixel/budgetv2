import { chromium } from "playwright";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const imageDir = path.join(repoRoot, "assets/images/page-images");

// Each printed chapter gets its own photograph. The overlay is flattened
// into an opaque JPEG so Preview, Acrobat, PDF.js, and printed output all
// reproduce the same green treatment without transparency artifacts.
const backgrounds = [
  ["divider-bg-our-county.jpg", "overview-cultural-heritage.jpg", "center 70%"],
  ["divider-bg-financial.jpg", "opengov-defuniak-lake-aerial.jpg", "center 58%"],
  ["divider-bg-budget-process.jpg", "board-budget-image.png", "center 65%"],
  ["divider-bg-constitutional.jpg", "opengov-defuniak-water-tower.jpg", "center 60%"],
  ["divider-bg-other-agencies.jpg", "overview-walton-waterway.png", "center 65%"],
  ["divider-bg-program-services.jpg", "overview-beach-community.png", "center 55%"],
  ["divider-bg-departments.jpg", "overview-county-districts.jpg", "center 62%"],
  ["divider-bg-workforce.jpg", "opengov-workforce-grayton.jpg", "center 55%"],
  ["divider-bg-capital.jpg", "cip-bridge-construction.jpg", "center 62%"],
  ["divider-bg-glossary.jpg", "overview-defuniak-historic-map.jpg", "center 63%"]
];

const mimeFor = (name) => path.extname(name).toLowerCase() === ".png" ? "image/png" : "image/jpeg";
const browser = await chromium.launch({ headless: true });

for (const [outputName, sourceName, position] of backgrounds) {
  const page = await browser.newPage({ viewport: { width: 1275, height: 1650 }, deviceScaleFactor: 1 });
  const source = readFileSync(path.join(imageDir, sourceName)).toString("base64");
  await page.setContent(`<!doctype html><html><head><style>
    *{box-sizing:border-box}
    html,body{margin:0;width:1275px;height:1650px;overflow:hidden;background:#003f28}
    img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${position}}
    .wash{position:absolute;inset:0;background:linear-gradient(to bottom,
      rgba(0,63,40,.985) 0%,
      rgba(0,63,40,.975) 30%,
      rgba(0,63,40,.92) 46%,
      rgba(0,63,40,.78) 59%,
      rgba(0,63,40,.54) 72%,
      rgba(0,63,40,.32) 87%,
      rgba(0,63,40,.20) 100%)}
  </style></head><body><img src="data:${mimeFor(sourceName)};base64,${source}" alt=""><div class="wash"></div></body></html>`);
  await page.screenshot({ path: path.join(imageDir, outputName), type: "jpeg", quality: 96 });
  await page.close();
  console.log(`Wrote ${outputName} from ${sourceName}`);
}

await browser.close();
