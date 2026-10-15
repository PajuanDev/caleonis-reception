import { chromium } from "playwright";
import { access, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const base = process.argv[2] ?? "http://127.0.0.1:4325";
const output = resolve(process.argv[3] ?? ".tmp/p1-qa/browser");
await mkdir(output, { recursive: true });
let executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
if (!executablePath) {
  try { await access(chromium.executablePath()); }
  catch { throw new Error("Install the matching Playwright Chromium, or set PLAYWRIGHT_CHROMIUM_EXECUTABLE to an existing local browser."); }
}
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const pages = ["/fr/", "/", "/fr/features/", "/fr/pricing/", "/fr/solutions/", "/fr/solutions/ai-receptionist-for-medical-offices/", "/fr/resources/", "/aide/", "/aide/dashboard/messages/", "/aide/support/availability/", "/aide/support/troubleshooting/"];
const report = [];
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, locale: "fr-FR", reducedMotion: "reduce" });
    // This review must work without provider calls, trackers, or a customer account.
    await context.route("**/*", (route) => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    for (const path of pages) {
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const response = await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      // Product captures below the fold are intentionally lazy-loaded. Visit
      // them as a reader would before checking whether the images decoded.
      for (const lazyImage of await page.locator('img[loading="lazy"]').all()) {
        await lazyImage.scrollIntoViewIfNeeded();
        await lazyImage.evaluate(image => image.decode().catch(() => undefined));
      }
      await page.evaluate(() => scrollTo(0, 0));
      const layout = await page.evaluate(() => ({
        h1: document.querySelectorAll("h1").length,
        main: document.querySelectorAll("main").length,
        overflow: document.documentElement.scrollWidth > innerWidth + 2,
        brokenImages: [...document.images].filter((image) => !image.complete || !image.naturalWidth).map((image) => image.getAttribute("src")),
        unlabeledControls: [...document.querySelectorAll("button,input:not([type=hidden])")].filter((element) => !element.textContent?.trim() && !element.getAttribute("aria-label") && !element.getAttribute("aria-labelledby") && !element.getAttribute("placeholder") && !element.id).map((element) => element.tagName),
      }));
      if (path === "/fr/" && viewport.width < 500) {
        const menu = page.getByRole("button", { name: "Menu de navigation", exact: true });
        if (await menu.count()) {
          await menu.click();
          const visibleLinks = await page.getByRole("link", { name: "Fonctionnalités", exact: true }).count();
          if (!visibleLinks) errors.push("Mobile navigation did not expose its links");
          await menu.click();
        }
      }
      if (path === "/aide/") {
        const allGuides = await page.locator("nav a").count();
        await page.getByRole("searchbox").fill("Messages");
        if (!await page.getByRole("link", { name: "Utiliser Messages", exact: true }).isVisible()) errors.push("Help search hid the matching Messages guide");
        if (await page.getByRole("link", { name: "Préparer votre premier appel", exact: true }).isVisible()) errors.push("Help search left an unrelated guide visible");
        await page.getByRole("searchbox").fill("aucun-guide-xyz");
        if (await page.locator("nav a:visible").count()) errors.push("Help search left guides visible for an unmatched query");
        await page.getByRole("searchbox").fill("");
        if (await page.locator("nav a:visible").count() !== allGuides) errors.push("Clearing help search did not restore every guide");
      }
      const screenshot = `${path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home-en"}-${viewport.width}.png`;
      await page.screenshot({ path: join(output, screenshot), fullPage: true, animations: "disabled" });
      const passed = response?.ok() && layout.h1 === 1 && layout.main === 1 && !layout.overflow && !layout.brokenImages.length && !layout.unlabeledControls.length && !errors.length;
      report.push({ path, viewport: viewport.width, status: response?.status(), ...layout, errors, screenshot, result: passed ? "PASS" : "FAIL" });
      await page.close();
    }
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(join(output, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ cases: report.length, passed: report.filter((entry) => entry.result === "PASS").length, failures: report.filter((entry) => entry.result === "FAIL") }, null, 2));
if (report.some((entry) => entry.result === "FAIL")) process.exitCode = 1;
