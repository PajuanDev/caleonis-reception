import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { eq, sql } from "drizzle-orm";
import { businesses, businessMemberships, createDatabaseClient, users } from "@lobbystack/db";
import { completeSignupEmailVerification, isolateAuthRateLimit } from "../e2e/fixtures/email-verification";

async function signOut(page: Page): Promise<void> {
  const status = await page.evaluate(async () => (await fetch("/api/auth/sign-out", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status);
  expect(status).toBe(200);
}
async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  const response = page.waitForResponse(response => new URL(response.url()).pathname === "/api/auth/sign-in/email" && response.request().method() === "POST");
  await page.locator('button[type="submit"]').click();
  expect((await response).status()).toBe(200);
}

for (const locale of ["fr", "en"] as const) {
  test(`real ${locale} signup, verification, login and logout through the trusted gateway`, async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(180000);
    const origin = baseURL!;
    const databaseUrl = process.env.REPLACEMENT_E2E_DATABASE_URL;
    if (!databaseUrl || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(databaseUrl).hostname)) throw new Error("Disposable database required.");
    const database = createDatabaseClient("lobbystack_migrator", { DATABASE_URL: databaseUrl });
    const email = `single-host-${randomUUID()}@example.invalid`;
    const password = `Fixture-${randomUUID()}!`;
    const businessId = randomUUID();
    const context = await browser.newContext({ locale: locale === "fr" ? "fr-FR" : "en-US", viewport: locale === "fr" ? { width: 1440, height: 1000 } : { width: 390, height: 844 }, serviceWorkers: "block" });
    const blockedExternalHosts = new Set<string>();
    await context.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (["http:", "https:"].includes(url.protocol) && url.origin !== origin) { blockedExternalHosts.add(url.hostname); await route.abort("blockedbyclient"); return; }
      await route.continue();
    });
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      await isolateAuthRateLimit(page, email, testInfo);
      // Use the actual responsive entry points: marketing login on desktop,
      // and the visible trial/signup CTA in the mobile docs topbar.
      const entry = await page.goto(`${origin}${locale === "fr" ? "/fr/" : "/aide/en/"}`);
      expect(entry?.status()).toBe(200);
      expect(entry?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
      if (locale === "en") {
        // The narrow docs header intentionally keeps only the primary CTA.
        // Follow it normally, then use the existing signup-to-login link.
        await page.locator(`.toplinks a.primary[href="${origin}/signup"]`).click();
        await expect(page).toHaveURL(new RegExp(`/${locale}/signup`));
        await page.locator(`a[href^="/${locale}/login"]`).click();
      } else {
        await page.locator(`a[href="${origin}/login"]`).filter({ visible: true }).first().click();
      }
      await expect(page).toHaveURL(new RegExp(`/${locale}/login`));
      await page.locator(`a[href^="/${locale}/signup"]`).click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/signup`));
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').fill(password);
      const signedUp = page.waitForResponse(response => new URL(response.url()).pathname === "/api/auth/sign-up/email" && response.request().method() === "POST");
      await page.locator('button[type="submit"]').click();
      expect((await signedUp).ok()).toBe(true);
      await completeSignupEmailVerification(page, email, password);
      await expect(page).toHaveURL(/\/onboarding\//);

      // Dashboard tests use an explicitly prepared tenant, not a claim that
      // paid onboarding or telephone provisioning has already been exercised.
      const owner = (await database.db.select({ id: users.id }).from(users).where(eq(users.normalizedEmail, email)).limit(1))[0];
      if (!owner) throw new Error("The local signup did not persist its user.");
      await database.db.transaction(async tx => {
        await tx.insert(businesses).values({ id: businessId, slug: `auth-fixture-${businessId}`, name: "Single-host isolated fixture", timezone: "UTC", defaultLocale: locale, businessType: "service_company", deploymentMode: "self_hosted_standard", onboardingStage: "complete" });
        await tx.insert(businessMemberships).values({ businessId, userId: owner.id, role: "business_owner", status: "active" });
        await tx.update(users).set({ activeBusinessId: businessId }).where(eq(users.id, owner.id));
      });
      await page.goto(`${origin}/dashboard?lng=${locale}`);
      await expect(page.locator("#dashboard-main-content")).toBeVisible();
      const session = (await context.cookies(origin)).find(cookie => cookie.name.includes("session_token"));
      expect(session).toBeTruthy();
      expect(session!.httpOnly).toBe(true);
      expect(session!.path).toBe("/");
      expect(session!.sameSite).toBe("Lax");
      expect(session!.secure).toBe(false); // Explicit HTTP loopback, not HTTPS production proof.
      await page.screenshot({ path: testInfo.outputPath(`auth-dashboard-${locale}.png`), fullPage: true, animations: "disabled" });
      await signOut(page);
      const replay = await context.request.get(`${origin}/api/auth/get-session`, { headers: { Cookie: `${session!.name}=${session!.value}` } });
      expect(replay.status()).toBe(200);
      expect(await replay.json()).toBeNull();
      await page.goto(`${origin}/dashboard`);
      await expect(page).toHaveURL(new RegExp(`/${locale}/login`));
      await signIn(page, email, password);
      await expect(page).toHaveURL(new RegExp("/dashboard(?:[?#]|$)"));
      await expect(page.locator("#dashboard-main-content")).toBeVisible();

      await signOut(page);
      await page.goto(`${origin}/${locale}/login?returnTo=${encodeURIComponent(`/messages?lng=${locale}`)}`);
      await signIn(page, email, password);
      await expect(page).toHaveURL(`${origin}/messages?lng=${locale}`);
      await expect(page.locator("#dashboard-main-content")).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`auth-messages-${locale}.png`), fullPage: true, animations: "disabled" });
      const calls = await context.request.get(`${origin}/api/calls?limit=1`);
      expect(calls.status()).toBe(200);
      expect(calls.headers()["cache-control"]).toContain("no-store");
      expect(calls.headers()["x-robots-tag"]).toBe("noindex, nofollow");
      expect(blockedExternalHosts.size).toBe(0);
      const evidence = { status: "PASS_LOCAL_TRUSTED_AUTH", locale, signupAndVerificationViaGateway: true, unverifiedSignInRefused: true, freshAccountReachedOnboarding: true, dashboardTenant: "explicitly seeded synthetic tenant", loginDefaultDashboard: true, deepReturnMessages: true, revokedSessionRejected: true, cookieAttributes: { httpOnly: session!.httpOnly, secure: session!.secure, sameSite: session!.sameSite, path: session!.path }, blockedExternalHosts: [...blockedExternalHosts], productionChanged: false, pending: ["Full business onboarding and paid phone provisioning", "HTTPS Secure cookies in hosted staging", "Live Google OAuth, Twilio, OpenAI and payment callbacks", "Production routing rollout"] };
      await writeFile(testInfo.outputPath("p1-gateway-real-next-evidence.json"), JSON.stringify(evidence, null, 2));
      console.log("P1_TRUSTED_AUTH_EVIDENCE", JSON.stringify(evidence));
    } finally {
      await context.close().catch(() => undefined);
      await database.db.delete(businesses).where(eq(businesses.id, businessId));
      await database.db.execute(sql`delete from public.outbox_messages where aggregate_id in (select id from public.users where normalized_email = ${email})`);
      await database.db.execute(sql`delete from public.verifications where identifier = ${`email-verification-otp-${email}`}`);
      await database.db.delete(users).where(eq(users.normalizedEmail, email));
      await database.pool.end();
    }
  });
}

test("trusted gateway does not admit foreign auth or unsafe API origins", async ({ request, baseURL }) => {
  const origin = baseURL!;
  const auth = await request.post(`${origin}/api/auth/sign-in/email`, { headers: { Origin: "https://untrusted.example.invalid", "Sec-Fetch-Site": "cross-site" }, data: { email: "unused@example.invalid", password: "NotARealAccount-123!" } });
  expect(auth.status()).toBe(403);
  expect((await auth.json() as { code: string }).code).toBe("INVALID_ORIGIN");
  for (const headers of [{}, { Origin: "https://untrusted.example.invalid" }]) {
    const rejected = await request.post(`${origin}/api/p1-no-such-route`, { headers, data: {} });
    expect(rejected.status()).toBe(403);
    expect(await rejected.json()).toEqual({ error: "CSRF origin validation failed." });
  }
  const allowed = await request.post(`${origin}/api/p1-no-such-route`, { headers: { Origin: origin }, data: {} });
  expect(allowed.status()).toBe(404);
  const privateResponse = await request.get(`${origin}/api/calls`);
  expect(privateResponse.status()).toBe(401);
  const spoof = await request.get(`${origin}/fr/`, { headers: { Host: "receptionist.caleonis.com" } });
  expect(spoof.status()).toBe(421);
});
