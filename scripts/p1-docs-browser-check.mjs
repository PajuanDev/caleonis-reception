import assert from "node:assert/strict";
import { access, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Real local review UI: full-text search, locale-preserving navigation,
// disclosure tabs, private preview metadata, mobile drawer and overflow.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "package.json"));
const { chromium } = require("playwright");
const base = process.argv[2] ?? "http://127.0.0.1:4167";
const output = join(root, ".tmp/p1-reprise/docs-browser");
await mkdir(output, { recursive: true });
let executablePath;
for (const path of [process.env.DOCS_CHROMIUM_PATH, chromium.executablePath(), "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].filter(Boolean)) {
  try { await access(path); executablePath = path; break; } catch {}
}
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
const page = await context.newPage();
page.setDefaultTimeout(15_000);
page.setDefaultNavigationTimeout(15_000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const checks = [];
try {
  await page.goto(base + "/aide/en/introduction/", { waitUntil: "networkidle" });
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex,nofollow");
  assert.match(await page.locator('link[rel="canonical"]').getAttribute("href"), /^https:\/\/receptionist\.caleonis\.com\/aide\/en\/introduction\/$/);
  assert.equal(await page.locator("nav").getByRole("link", { name: "Accueil", exact: true }).count(), 0);
  await page.locator("[data-search]").click();
  await page.locator("#search-input").fill("idempotency_key_reused");
  const hit = page.locator('#search-results a[href="/aide/en/api/requests/"]');
  await hit.waitFor();
  await hit.click();
  await page.waitForURL("**/aide/en/api/requests/");
  checks.push("English full-text body search reaches Requests and errors");
  await page.selectOption("#language", "/aide/api/requests/");
  await page.waitForURL("**/aide/api/requests/");
  assert.equal(await page.locator("html").getAttribute("lang"), "fr");
  checks.push("Locale selector preserves the guide");
  await page.goto(base + "/aide/api/webhooks/", { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "API", exact: true }).click();
  await page.locator('[role="tabpanel"]:visible').getByText("POST /webhooks", { exact: true }).waitFor();
  checks.push("Webhook Dashboard/API tabs expose the selected content");
  await page.goto(base + "/aide/ai/connect-other-clients/", { waitUntil: "networkidle" });
  await page.locator('article a[href*="connect-claude/#"]').click();
  const fragment = decodeURIComponent(new URL(page.url()).hash.slice(1));
  assert(await page.locator(`[id="${fragment}"]`).count(), "Source anchor must resolve");
  checks.push("Native French Unicode anchor resolves");
  await page.goto(base + "/aide/en/introduction/", { waitUntil: "networkidle" });
  await page.screenshot({ path: join(output, "introduction-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/aide/dashboard/messages/", { waitUntil: "networkidle" });
  await page.locator(".menu").click();
  assert.equal(await page.locator(".menu").getAttribute("aria-expanded"), "true");
  await page.locator(".backdrop").click({ position: { x: 370, y: 400 } });
  assert.equal(await page.locator(".menu").getAttribute("aria-expanded"), "false");
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Mobile page must not overflow horizontally");
  await page.screenshot({ path: join(output, "messages-mobile.png"), fullPage: true });
  checks.push("Mobile drawer, backdrop, real Messages image and no horizontal overflow");
  await page.locator(".menu").click();
  await page.locator('[data-theme-value="dark"]').click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  checks.push("Theme control works");
  assert.deepEqual(errors, []);
  const result = { status: "PASS", checks, browserErrors: errors, screenshots: ["introduction-desktop.png", "messages-mobile.png"], note: "Local Playwright regression screenshots; the Work source/candidate capture audit is maintained separately." };
  await writeFile(join(output, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await page.screenshot({ path: join(output, "failure.png"), fullPage: true }).catch(() => {});
  await writeFile(join(output, "failure.json"), JSON.stringify({ message: error.message, browserErrors: errors, viewport: page.viewportSize(), searchButton: await page.locator("[data-search]").boundingBox().catch(() => null) }, null, 2));
  throw error;
} finally { await browser.close(); }
