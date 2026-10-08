import { writeFileSync } from "node:fs";

// Keep the reflowable reading edition and PDF on the same publication copy.
export async function capturePublicationHtml(page, outPath) {
  await page.evaluate(() => { document.documentElement.lang = "en"; });
  writeFileSync(outPath.replace(/\.pdf$/i, ".html"), await page.content());
}

export async function assertPublicationFits(page) {
  const failures = await page.evaluate(() => [...document.querySelectorAll("body > section")].flatMap(section => {
    const footer = section.querySelector("footer");
    if (!footer) return [];
    const limit = footer.getBoundingClientRect().top - 4;
    const content = section.querySelector(":scope > .content");
    const children = [...(content || section).children].filter(el => el !== footer && getComputedStyle(el).position !== "absolute");
    const bottom = Math.max(...children.map(el => el.getBoundingClientRect().bottom));
    return bottom > limit ? [`${section.querySelector("h1")?.textContent || "Page"}: ${Math.ceil(bottom-limit)}px into footer`] : [];
  }));
  if (failures.length) throw new Error(`Publication layout overflow: ${failures.join("; ")}`);
}
