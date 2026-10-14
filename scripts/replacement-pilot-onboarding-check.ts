import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { readFile, unlink } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { eq } from "drizzle-orm";
import { accounts, businesses, createDatabaseClient, users, verifications } from "@lobbystack/db";
import { provisionPilotOwner } from "@lobbystack/domain";

function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
async function main() {
  const testUrl = process.env.LOBBYSTACK_PILOT_TEST_DATABASE_URL;
  assert(testUrl, "LOBBYSTACK_PILOT_TEST_DATABASE_URL is required.");
  const checked = new URL(testUrl);
  assert(["localhost", "127.0.0.1"].includes(checked.hostname) && /test/i.test(checked.pathname), "Dedicated test database required.");
  const base = process.env.ADMIN_BASE_URL ?? "http://127.0.0.1:13001";
  assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "HTTP smoke check requires a local admin server connected to the test database.");
  for (const roleName of ["DATABASE_URL", "LOBBYSTACK_AUTH_DATABASE_URL", "LOBBYSTACK_APP_DATABASE_URL"]) {
    const configured = process.env[roleName];
    if (configured) { const url = new URL(configured); assert(url.hostname === checked.hostname && url.port === checked.port && url.pathname === checked.pathname, `${roleName} must point to the isolated test database.`); }
  }
  const auth = createDatabaseClient("lobbystack_auth"); const app = createDatabaseClient("lobbystack_app");
  const cleanup = createDatabaseClient("lobbystack_migrator", { DATABASE_URL: testUrl });
  const fixtures: Array<{ userId: string; businessId: string; token: string; expiresAt: Date }> = [];
  const privateFiles: string[] = [];
  const password = `Pilot!42-${randomUUID()}`;
  const email = `${randomUUID()}@pilot-smoke.invalid`;
  async function post(path: string, body: unknown, cookie?: string) { return fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json", origin: base, ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body), redirect: "manual" }); }
  async function runOperatorCli(flag: "--reissue-user-id" | "--revoke-user-id", userId: string) {
    const tsxCli = createRequire(import.meta.url).resolve("tsx/cli");
    const { stdout } = await promisify(execFile)(process.execPath, [tsxCli, "--tsconfig", "scripts/tsconfig.json", "scripts/pilot-onboarding.ts", flag, userId, "--apply", "--contact-verified"], { env: { ...process.env, APP_BASE_URL: base }, cwd: process.cwd(), maxBuffer: 64 * 1024 });
    return JSON.parse(stdout) as { secretFile?: string; activationTokenHash?: string; revokedCount?: number };
  }
  try {
    for (const recipient of [email, `${randomUUID()}@pilot-smoke.invalid`]) fixtures.push(await provisionPilotOwner({ db: app.db }, auth.db, { email: recipient, name: "Pilot smoke", businessName: `Pilot smoke ${randomUUID()}`, timezone: "Europe/Paris", businessType: "other", locale: "fr" }));
    const first = fixtures[0]!; const other = fixtures[1]!;
    const reissued = await runOperatorCli("--reissue-user-id", first.userId);
    assert(reissued.secretFile && reissued.activationTokenHash && /^[0-9a-f]{64}$/.test(reissued.activationTokenHash), "Reissue CLI did not return a safe hash/private file.");
    const secretFile = resolve(reissued.secretFile);
    assert(secretFile.startsWith(`${resolve(process.cwd(), ".prospect-demos")}${sep}`), "Unexpected private file path.");
    privateFiles.push(secretFile);
    const stored = JSON.parse(await readFile(secretFile, "utf8")) as { activationUrl: string };
    const activationToken = new URLSearchParams(new URL(stored.activationUrl).hash.slice(1)).get("pilot");
    assert(activationToken && createHash("sha256").update(activationToken).digest("hex") === reissued.activationTokenHash, "Private link/hash mismatch.");
    assert((await post("/api/pilot/activate", { action: "activate", token: first.token, password })).status === 400, "Old activation link survived reissue.");
    const revoked = await runOperatorCli("--revoke-user-id", other.userId);
    assert(revoked.revokedCount === 1 && (await post("/api/pilot/activate", { action: "preview", token: other.token })).ok, "Operator revocation failed.");
    assert((await (await post("/api/pilot/activate", { action: "preview", token: other.token })).json() as { invitation: unknown }).invitation === null, "Revoked link remains usable.");
    assert((await auth.db.select().from(accounts).where(eq(accounts.userId, first.userId))).length === 0, "Provisioning created credentials before activation.");
    const preview = await post("/api/pilot/activate", { action: "preview", token: activationToken });
    assert(preview.ok && preview.headers.get("cache-control")?.includes("no-store"), "Private activation preview failed.");
    const activated = await post("/api/pilot/activate", { action: "activate", token: activationToken, password });
    assert(activated.ok, `Activation failed (${activated.status}).`);
    const replay = await post("/api/pilot/activate", { action: "activate", token: activationToken, password });
    assert(replay.status === 400, "Activation replay was accepted.");
    const signIn = await post("/api/auth/sign-in/email", { email, password });
    assert(signIn.ok, `Invited-owner login failed (${signIn.status}).`);
    const setCookies = signIn.headers.getSetCookie();
    const cookie = setCookies.map(value => value.split(";")[0]).join("; ");
    assert(cookie.includes("session_token="), "Login did not issue a session.");
    const additionalWorkspace = await post("/api/businesses", { name: "Quota bypass", timezone: "UTC", businessType: "other", managedPilot: false }, cookie);
    assert(additionalWorkspace.status === 403, "Managed pilot could create an additional unprotected workspace.");
    let activeResetDenied = false;
    try { await runOperatorCli("--reissue-user-id", first.userId); } catch { activeResetDenied = true; }
    assert(activeResetDenied, "Operator reissue permitted an active account reset.");
    const businessList = await fetch(`${base}/api/businesses`, { headers: { cookie } });
    const own = await businessList.json() as { businesses?: Array<{ businessId: string; role: string }> };
    assert(businessList.ok && own.businesses?.length === 1 && own.businesses[0]?.businessId === first.businessId && own.businesses[0]?.role === "business_owner", "Owner can see an unrelated tenant or has wrong permissions.");
    const denied = await fetch(`${base}/api/contacts?businessId=${other.businessId}`, { headers: { cookie } });
    assert(denied.status === 403, `Cross-tenant contacts access was not denied (${denied.status}).`);
    const authorityInjection = await fetch(`${base}/api/businesses?businessId=${first.businessId}`, { method: "PATCH", headers: { "content-type": "application/json", origin: base, cookie }, body: JSON.stringify({ name: "Injected", userId: other.userId, businessId: other.businessId, managedPilot: false }) });
    assert(authorityInjection.status === 400, "Business PATCH accepted injected authority or pilot flag.");
    const forbiddenPatch = await fetch(`${base}/api/businesses?businessId=${other.businessId}`, { method: "PATCH", headers: { "content-type": "application/json", origin: base, cookie }, body: JSON.stringify({ name: "Injected" }) });
    assert(forbiddenPatch.status === 403, "Authenticated business PATCH permitted cross-tenant writes.");
    const unauthenticatedPatch = await fetch(`${base}/api/businesses?businessId=${first.businessId}`, { method: "PATCH", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ name: "Injected" }) });
    assert(unauthenticatedPatch.status === 401, "Business PATCH accepted an unauthenticated request.");
    const billing = await fetch(`${base}/api/billing?businessId=${first.businessId}`, { headers: { cookie } });
    const billingData = await billing.json() as { checkoutAvailable?: boolean; permissions?: { hasCheckoutAccess?: boolean } };
    assert(billing.ok && billingData.checkoutAvailable === false && billingData.permissions?.hasCheckoutAccess === false, "Pilot UI exposed paid checkout.");
    const checkout = await post("/api/billing/checkout", { businessId: first.businessId, target: "pro", billingInterval: "monthly" }, cookie);
    assert(checkout.status === 403, "Pilot server permitted paid checkout.");
    const dashboard = await fetch(`${base}/`, { headers: { cookie }, redirect: "manual" });
    assert(dashboard.ok, `Pilot dashboard redirected or failed (${dashboard.status}).`);
    console.log(JSON.stringify({ operatorReissue: "PASS", oldLinkRefused: "PASS", operatorRevocation: "PASS", activeAccountResetDenied: "PASS", privateActivationPreview: "PASS", activation: "PASS", replayDenied: "PASS", actualPasswordLogin: "PASS", ownerDashboard: "PASS", additionalPilotWorkspaceDenied: "PASS", crossTenantAccessDenied: "PASS", payloadAuthorityInjectionDenied: "PASS", crossTenantBusinessWriteDenied: "PASS", unauthenticatedBusinessWriteDenied: "PASS", paidCheckoutClosed: "PASS", publicSignupUsed: false, realInvitationsSent: false, productionModified: false }));
  } finally {
    for (const fixture of fixtures) {
      await cleanup.db.delete(verifications).where(eq(verifications.identifier, `caleonis-pilot-activation:${createHash("sha256").update(fixture.token).digest("hex")}`));
      await cleanup.db.delete(businesses).where(eq(businesses.id, fixture.businessId));
      await cleanup.db.delete(users).where(eq(users.id, fixture.userId));
    }
    for (const file of privateFiles) await unlink(file);
    await Promise.all([auth.pool.end(), app.pool.end(), cleanup.pool.end()]);
  }
}
void main().catch(error => { console.error(error instanceof Error ? error.message : "Pilot smoke failed."); process.exitCode = 1; });
