import { randomUUID } from "node:crypto";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { businesses, businessMemberships, createDatabaseClient, users } from "@lobbystack/db";
import { completeSignupEmailVerification, isolateAuthRateLimit } from "./fixtures/email-verification";

type Gateway = { origin: string; close(): Promise<void> };
const root = fileURLToPath(new URL("../../..", import.meta.url));
const rootOrigin = "https://receptionist.caleonis.com";

function loopback(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(url.hostname) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("The gateway rehearsal requires a literal HTTP loopback origin.");
  }
  return url;
}

async function removeTemporaryFixture(directory: string): Promise<void> {
  if (dirname(resolve(directory)) !== resolve(tmpdir()) || !basename(directory).startsWith("p1-single-host-e2e-")) throw new Error("Refusing unsafe fixture cleanup.");
  await rm(directory, { recursive: true, force: true });
}

test("real Next preserves sessions and legacy routes behind the local static gateway", async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(180_000);
  if (process.env.E2E_SINGLE_HOST_GATEWAY_REHEARSAL !== "loopback-disposable") throw new Error("Run this test through scripts/e2e-local.sh with its disposable stack.");
  const direct = loopback(baseURL ?? "");
  const databaseUrl = new URL(process.env.REPLACEMENT_E2E_DATABASE_URL ?? "");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(databaseUrl.hostname)) throw new Error("An isolated loopback E2E database is required.");
  const database = createDatabaseClient("lobbystack_migrator", { DATABASE_URL: databaseUrl.toString() });
  const temporary = await mkdtemp(join(tmpdir(), "p1-single-host-e2e-"));
  const marketing = join(temporary, "marketing");
  const email = `gateway-${randomUUID()}@example.invalid`;
  const password = "Gateway-Isolated-Fixture-123!";
  const businessId = randomUUID();
  const context = await browser.newContext({ locale: "en", serviceWorkers: "block" });
  const blockedExternalHosts = new Set<string>();
  let gateway: Gateway | undefined;
  try {
    await cp(join(root, "apps/landing/dist"), marketing, { recursive: true });
    // This dynamic import runs a Node-only test tool, not a Next application module.
    const gatewayModule = await import(pathToFileURL(join(root, "scripts/p1-single-host-gateway.mjs")).href) as {
      startLocalSingleHostGateway(options: { nextOrigin: string; marketingDir: string }): Promise<Gateway>;
    };
    gateway = await gatewayModule.startLocalSingleHostGateway({ nextOrigin: direct.origin, marketingDir: marketing });
    const gatewayURL = new URL(gateway.origin);
    // Cookies are scoped by hostname, so both loopback ports use the hostname
    // of the existing Next fixture. The gateway still binds only 127.0.0.1.
    gatewayURL.hostname = direct.hostname;
    const origin = gatewayURL.origin;
    let rebasedFiles = 0;
    for (const file of await readdir(marketing, { recursive: true })) {
      // Hydrated navigation bundles must use the same temporary origin as the
      // HTML. Layout, content and route paths are otherwise unchanged.
      if (!/\.(?:html|m?js|json)$/.test(file)) continue;
      const filename = join(marketing, file);
      const html = await readFile(filename, "utf8");
      if (!html.includes(rootOrigin)) continue;
      await writeFile(filename, html.replaceAll(rootOrigin, origin));
      rebasedFiles += 1;
    }
    expect(rebasedFiles).toBeGreaterThan(0);
    await context.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (![direct.origin, origin].includes(url.origin) && ["http:", "https:"].includes(url.protocol)) {
        blockedExternalHosts.add(url.hostname);
        await route.abort("blockedbyclient");
        return;
      }
      await route.continue();
    });
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await isolateAuthRateLimit(page, email, testInfo);
    for (const route of ["/", "/fr/", "/aide/"]) {
      const response = await page.goto(`${origin}${route}`);
      expect(response?.status()).toBe(200);
      expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
      await expect(page.locator("h1").first()).toBeVisible();
      const login = page.locator(`a[href="${origin}/login"]`).first();
      await expect(login).toBeAttached();
      // The docs topbar and desktop marketing header expose the same auth target.
      await login.click();
      await expect(page).toHaveURL(new RegExp(`^${origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/(?:en|fr)/login`));
      await expect(page.locator('input[type="email"]')).toBeVisible();
    }

    const redirected = await context.request.get(`${origin}/login?lng=en&returnTo=%2Fcalls`, { maxRedirects: 0 });
    expect(redirected.status()).toBe(308);
    const location = new URL(redirected.headers().location!, origin);
    expect(location.origin).toBe(origin);
    expect(location.pathname).toBe("/en/login");
    expect(location.searchParams.get("returnTo")).toBe("/calls");

    // Keep the real gateway Origin. It is intentionally absent from the current
    // Next fixture's trustedOrigins: a successful login here would hide a CSRF
    // regression. A separate staging config is required before enabling it.
    const rejected = await context.request.post(`${origin}/api/auth/sign-in/email`, {
      maxRedirects: 0, headers: { Origin: origin, "Sec-Fetch-Site": "same-origin" }, data: { email, password },
    });
    expect(rejected.status()).toBe(403);
    expect((await rejected.json() as { code?: string }).code).toBe("INVALID_ORIGIN");

    // Create the disposable account through the already trusted Next origin.
    // Verification reads only the local outbox, and no provider worker runs.
    await page.goto(`${direct.origin}/en/signup?returnTo=%2Fcalls`);
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    const signup = page.waitForResponse(response => response.url().endsWith("/api/auth/sign-up/email") && response.request().method() === "POST");
    await page.locator('button[type="submit"]').click();
    expect((await signup).ok()).toBe(true);
    await completeSignupEmailVerification(page, email, password);
    const owner = (await database.db.select({ id: users.id }).from(users).where(eq(users.normalizedEmail, email)).limit(1))[0];
    if (!owner) throw new Error("The fixture HTTP server and isolated database disagree.");
    await database.db.transaction(async tx => {
      await tx.insert(businesses).values({ id: businessId, slug: `gateway-${businessId}`, name: "Gateway isolated test", timezone: "UTC", defaultLocale: "en", businessType: "service_company", deploymentMode: "self_hosted_standard", onboardingStage: "complete" });
      await tx.insert(businessMemberships).values({ businessId, userId: owner.id, role: "business_owner", status: "active" });
      await tx.update(users).set({ activeBusinessId: businessId }).where(eq(users.id, owner.id));
    });
    const sessionCookies = (await context.cookies(origin)).filter(cookie => cookie.name.includes("session_token"));
    expect(sessionCookies.length).toBeGreaterThan(0);
    for (const cookie of sessionCookies) {
      expect(cookie.httpOnly).toBe(true);
      expect(cookie.path).toBe("/");
      expect(cookie.secure).toBe(false); // The explicit disposable HTTP fixture.
    }
    const inactiveDashboard = await context.request.get(`${direct.origin}/dashboard`, { maxRedirects: 0 });
    expect(inactiveDashboard.status()).toBe(404);
    const callsLoaded = page.waitForResponse(response => new URL(response.url()).pathname === "/api/calls" && response.request().method() === "GET");
    await page.goto(`${origin}/calls?lng=en`);
    expect((await callsLoaded).status()).toBe(200);
    await expect(page.locator("#dashboard-main-content").getByRole("heading", { name: "Calls", exact: true })).toBeVisible();
    await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("p1-gateway-calls-en-1440.png"), fullPage: true, animations: "disabled" });

    const directCalls = await context.request.get(`${direct.origin}/api/calls?limit=50`, { maxRedirects: 0 });
    const proxiedCalls = await context.request.get(`${origin}/api/calls?limit=50`, { maxRedirects: 0 });
    expect(proxiedCalls.status()).toBe(directCalls.status());
    expect(proxiedCalls.status()).toBe(200);
    expect(await proxiedCalls.json()).toEqual(await directCalls.json());
    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
      const path = "/api/p1-never-existing-gateway-route?opaque=%2Fkeep%2Braw";
      const options = { method, maxRedirects: 0, ...(method === "GET" ? {} : { data: "raw=one%2Btwo&line=%0A" }) };
      const upstream = await context.request.fetch(`${direct.origin}${path}`, options);
      const proxied = await context.request.fetch(`${origin}${path}`, options);
      expect(proxied.status()).toBe(upstream.status());
      expect(proxied.status()).toBe(404);
      expect(proxied.headers()["content-type"]).toBe(upstream.headers()["content-type"]);
    }
    const missing = await context.request.get(`${origin}/p1-never-existing-public-route`, { maxRedirects: 0 });
    expect(missing.status()).toBe(404);
    const invalidBody = "{\n  invalid-json";
    const malformedDirect = await context.request.post(`${direct.origin}/api/businesses`, { maxRedirects: 0, headers: { "content-type": "application/json" }, data: invalidBody });
    const malformedProxy = await context.request.post(`${origin}/api/businesses`, { maxRedirects: 0, headers: { "content-type": "application/json" }, data: invalidBody });
    expect(malformedProxy.status()).toBe(malformedDirect.status());
    expect(malformedProxy.status()).toBe(400);
    expect(await malformedProxy.json()).toEqual(await malformedDirect.json());

    const evidence = {
      status: "PARTIAL_QUALIFIED_REAL_NEXT_LOCAL_ONLY", directOrigin: direct.origin, gatewayOrigin: origin,
      marketingAndHelp: "Real builds copied to temporary directory; only receptionist.caleonis.com origin rebased to loopback in HTML/navigation bundles/JSON for consistent links, never published.",
      rebasedFiles, sessionAndLegacyCalls: "PASS with cookie created by direct Next signup + local OTP",
      apiGetAndMethodsAnd404: "PASS", originGuard: { status: rejected.status(), preserved: true },
      authRedirect: { status: redirected.status(), location: redirected.headers().location, xRobotsTag: redirected.headers()["x-robots-tag"] },
      nextApiResponse: { status: proxiedCalls.status(), contentType: proxiedCalls.headers()["content-type"], cacheControl: proxiedCalls.headers()["cache-control"], xRobotsTag: proxiedCalls.headers()["x-robots-tag"] },
      pending: ["Login/signup POST through gateway require separately approved Next staging trusted origin.", "appHome staging flag remains false; /dashboard and default post-login root mapping are not qualified.", "Real Google OAuth/provider signatures/voice/WS remain outside this isolated fixture."],
      cookieAttributes: sessionCookies.map(({ name, domain, path, httpOnly, secure, sameSite }) => ({ name, domain, path, httpOnly, secure, sameSite })),
      blockedExternalHosts: [...blockedExternalHosts], productionChanged: false,
    };
    await testInfo.attach("single-host gateway — real isolated Next evidence", { body: JSON.stringify(evidence, null, 2), contentType: "application/json" });
    await writeFile(testInfo.outputPath("p1-gateway-real-next-evidence.json"), JSON.stringify(evidence, null, 2));
    console.log("P1_GATEWAY_REAL_NEXT_EVIDENCE", JSON.stringify(evidence));
  } finally {
    await context.close().catch(() => undefined);
    await gateway?.close();
    await database.db.delete(businesses).where(eq(businesses.id, businessId));
    await database.db.execute(sql`delete from public.outbox_messages where aggregate_id in (select id from public.users where normalized_email = ${email})`);
    await database.db.execute(sql`delete from public.verifications where identifier = ${`email-verification-otp-${email}`}`);
    await database.db.delete(users).where(eq(users.normalizedEmail, email));
    await database.pool.end();
    await removeTemporaryFixture(temporary);
  }
});
