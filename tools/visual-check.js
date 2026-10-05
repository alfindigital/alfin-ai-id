// Visual regression check — pakai playwright-core + Chrome sistem (tanpa
// download browser). Screenshot ke shots/ (gitignored) + assert layout.
// Jalankan: npm run test:visual
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE || "https://alfin.ai.id";
const shots = path.join(__dirname, "..", "shots");
fs.mkdirSync(shots, { recursive: true });

const CASES = [
  { name: "mobile", width: 375, height: 812, expectCols: 2 },
  { name: "tablet", width: 768, height: 800, expectCols: 3 },
  { name: "desktop", width: 1280, height: 900, expectCols: 4 },
];

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));

  let fail = 0;
  for (const c of CASES) {
    await page.setViewportSize({ width: c.width, height: c.height });
    await page.goto(BASE, { waitUntil: "networkidle" });
    const m = await page.evaluate(() => {
      const ul = document.querySelector(".links");
      return {
        cols: getComputedStyle(ul).gridTemplateColumns.split(" ").length,
        scrollW: document.scrollingElement.scrollWidth,
        innerW: innerWidth,
      };
    });
    const overflow = m.scrollW > m.innerW;
    const okCols = m.cols === c.expectCols;
    console.log(
      `${okCols && !overflow ? "ok  " : "FAIL"} ${c.name} ${c.width}px → ${m.cols} kolom${overflow ? " + OVERFLOW" : ""}`,
    );
    if (!okCols || overflow) fail++;
    await page.screenshot({ path: path.join(shots, `${c.name}.png`), fullPage: true });
  }

  // toggle tema flip + persist
  await page.setViewportSize({ width: 1280, height: 900 });
  const t = await page.evaluate(() => {
    const before = document.documentElement.dataset.theme;
    document.getElementById("themeBtn").click();
    return { before, after: document.documentElement.dataset.theme, ls: localStorage.getItem("theme") };
  });
  const flipOk = t.before !== t.after && t.ls === t.after;
  console.log(`${flipOk ? "ok  " : "FAIL"} theme toggle ${t.before}→${t.after} (ls=${t.ls})`);
  if (!flipOk) fail++;
  await page.screenshot({ path: path.join(shots, "desktop-alt-theme.png"), fullPage: true });

  const realErrors = errors.filter((e) => !e.includes("cloudflareinsights"));
  console.log(realErrors.length ? `FAIL console errors:\n${realErrors.join("\n")}` : "ok  console bersih");
  if (realErrors.length) fail++;

  await browser.close();
  console.log(fail === 0 ? "\nSEMUA HIJAU" : `\n${fail} GAGAL`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error("VISUAL CHECK ERROR:", e.message);
  process.exit(1);
});
