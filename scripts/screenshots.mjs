// Dev helper: full-page screenshots of every page for visual QA.
// Usage: node scripts/screenshots.mjs <outDir> [baseUrl] [width]
import { chromium } from "@playwright/test";
import fs from "node:fs";

const out = process.argv[2] || "screenshots";
const base = process.argv[3] || "http://localhost:3100";
const width = Number(process.argv[4] || 1440);
fs.mkdirSync(out, { recursive: true });

const exe = fs.existsSync("/opt/pw-browsers/chromium") ? undefined : undefined;
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 860 : 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
page.on("console", (m) => { if (m.type() === "error" && !/tile|ERR_FAILED|net::/.test(m.text())) console.log("CONSOLE", m.text().slice(0, 200)); });
await page.route(/tile\.openstreetmap/, (r) => r.abort());

const pages = [
  ["home", "/", null],
  ["map", "/map?from=bus_north&to=health_centre&profile=wheelchair", async () => { await page.waitForSelector("#results-h", { timeout: 15000 }); await page.waitForTimeout(800); }],
  ["report", "/report", null],
  ["reports", "/reports", async () => { await page.waitForSelector("article", { timeout: 10000 }); }],
  ["dashboard", "/dashboard", async () => { await page.waitForSelector("text=Most reported", { timeout: 10000 }); await page.waitForTimeout(600); }],
  ["prefs", "/preferences", null],
  ["moderate", "/moderate", null],
];
for (const [name, url, fn] of pages) {
  await page.goto(base + url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  if (fn) await fn();
  await page.screenshot({ path: `${out}/${name}-${width}.png`, fullPage: true });
  console.log("shot", name);
}
await browser.close();
