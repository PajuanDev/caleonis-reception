import { createHash, randomUUID } from "node:crypto";
import { and, eq, inArray, like, sql } from "drizzle-orm";
import { Scrypt } from "lucia";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accounts, billingAccounts, billingCheckoutRequests, businessInvitations, businessMemberships, businesses, createDatabaseClient, users, verifications, withBusinessTransaction, type DatabaseClient } from "@lobbystack/db";
import { requireBusinessAdmin, requirePlatformAdmin } from "../authz";
import { acceptInvitation, canCreateAutonomousBusiness, listUserBusinesses } from "./tenancy";
import { previewPilotActivation, provisionPilotOwner, redeemPilotActivation, reissuePilotActivation, revokePilotActivation } from "./pilotActivation";
import { createBillingCheckoutRequest } from "./billing";

const testUrl = process.env.LOBBYSTACK_RELIABILITY_TEST_DATABASE_URL;
if (testUrl && (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1"].includes(new URL(testUrl).hostname) || !/test/i.test(new URL(testUrl).pathname))) throw new Error("Pilot integration tests require a dedicated local test database.");
let admin: DatabaseClient | undefined;
let auth: DatabaseClient | undefined;
let app: DatabaseClient | undefined;
const fixtures: Array<{ userId: string; businessId: string; token: string; expiresAt: Date }> = [];
beforeAll(async () => {
  if (!testUrl) return;
  admin = createDatabaseClient("lobbystack_migrator", { DATABASE_URL: process.env.LOBBYSTACK_PILOT_TEST_MIGRATOR_DATABASE_URL ?? testUrl });
  function scoped(role: "lobbystack_auth" | "lobbystack_app") {
    const explicit = process.env[role === "lobbystack_auth" ? "LOBBYSTACK_PILOT_TEST_AUTH_DATABASE_URL" : "LOBBYSTACK_PILOT_TEST_APP_DATABASE_URL"];
    if (explicit) {
      const checked = new URL(explicit); const base = new URL(testUrl!);
      if (checked.hostname !== base.hostname || checked.port !== base.port || checked.pathname !== base.pathname) throw new Error("Pilot role URLs must point to the same isolated test database.");
      return createDatabaseClient(role, { DATABASE_URL: explicit });
    }
    const url = new URL(testUrl!); url.searchParams.set("options", `-c role=${role}`); return createDatabaseClient(role, { DATABASE_URL: url.toString() });
  }
  auth = scoped("lobbystack_auth"); app = scoped("lobbystack_app");
});
afterAll(async () => {
  if (admin && fixtures.length) {
    const userIds = new Set(fixtures.map(fixture => fixture.userId));
    const tokens = await admin.db.select({ id: verifications.id, value: verifications.value }).from(verifications).where(like(verifications.identifier, "caleonis-pilot-activation:%"));
    const ids = tokens.filter(token => { try { return userIds.has((JSON.parse(token.value) as { userId: string }).userId); } catch { return false; } }).map(token => token.id);
    if (ids.length) await admin.db.delete(verifications).where(inArray(verifications.id, ids));
  }
  for (const fixture of fixtures) {
    await admin!.db.delete(verifications).where(eq(verifications.identifier, `caleonis-pilot-activation:${createHash("sha256").update(fixture.token).digest("hex")}`));
    await admin!.db.delete(businesses).where(eq(businesses.id, fixture.businessId));
    await admin!.db.delete(users).where(eq(users.id, fixture.userId));
  }
  await Promise.all([admin?.pool.end(), auth?.pool.end(), app?.pool.end()]);
}, 60_000);
async function provision() {
  const email = `${randomUUID()}@example.invalid`;
  const result = await provisionPilotOwner({ db: app!.db }, auth!.db, { email, name: "Pilot owner", businessName: `Pilot ${randomUUID()}`, timezone: "Europe/Paris", businessType: "other", locale: "fr" });
  fixtures.push(result); return { ...result, email };
}

describe.skipIf(!testUrl)("managed pilot access with PostgreSQL role isolation", () => {
  it("provisions three owners without credentials, tenant leakage, checkout or global admin", async () => {
    const pilots = await Promise.all([provision(), provision(), provision()]);
    for (const pilot of pilots) {
      const [user] = await auth!.db.select().from(users).where(eq(users.id, pilot.userId));
      expect(user).toMatchObject({ platformRole: "operator", emailVerified: false, passwordHash: null, activeBusinessId: pilot.businessId });
      expect(await auth!.db.select().from(accounts).where(eq(accounts.userId, pilot.userId))).toHaveLength(0);
      const ownBusinesses = await listUserBusinesses(app!.db, pilot.userId);
      expect(ownBusinesses).toHaveLength(1); expect(ownBusinesses[0]).toMatchObject({ businessId: pilot.businessId, role: "business_owner", onboardingStage: "complete" });
      const [business] = await admin!.db.select({ managedPilot: businesses.managedPilot, deploymentMode: businesses.deploymentMode }).from(businesses).where(eq(businesses.id, pilot.businessId));
      expect(business).toEqual({ managedPilot: true, deploymentMode: "cloud" });
      await withBusinessTransaction(app!.db, { userId: pilot.userId, businessId: pilot.businessId, actorType: "operator" }, async tx => {
        await requireBusinessAdmin(tx, { userId: pilot.userId, businessId: pilot.businessId });
        await expect(requirePlatformAdmin(tx, pilot.userId)).rejects.toThrow("Platform administrator");
        const other = pilots.find(p => p.businessId !== pilot.businessId)!;
        expect(await tx.select().from(businesses).where(eq(businesses.id, other.businessId))).toHaveLength(0);
      });
      const [secret] = await auth!.db.select().from(verifications).where(eq(verifications.identifier, `caleonis-pilot-activation:${createHash("sha256").update(pilot.token).digest("hex")}`));
      expect(secret!.value).not.toContain(pilot.token);
      expect(Math.round((pilot.expiresAt.getTime() - Date.now()) / 3600000)).toBe(48);
      await expect(createBillingCheckoutRequest({ db: app!.db }, { userId: pilot.userId, businessId: pilot.businessId, target: "pro", billingInterval: "monthly" })).rejects.toThrow("separate approval");
      expect(await admin!.db.select().from(billingAccounts).where(eq(billingAccounts.businessId, pilot.businessId))).toHaveLength(0);
      expect(await admin!.db.select().from(billingCheckoutRequests).where(eq(billingCheckoutRequests.businessId, pilot.businessId))).toHaveLength(0);
    }
  }, 60_000);

  it("allows exactly one concurrent activation, stores a login-compatible hash and rejects replay", async () => {
    const pilot = await provision();
    const passwordHash = `lobbystack-scrypt-v1:${await new Scrypt().hash("PilotPassword!42")}`;
    expect(await previewPilotActivation(auth!.db, pilot.token)).toMatchObject({ email: pilot.email });
    const results = await Promise.allSettled([1, 2].map(() => redeemPilotActivation(auth!.db, { token: pilot.token, passwordHash })));
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
    const [account] = await auth!.db.select().from(accounts).where(eq(accounts.userId, pilot.userId));
    expect(account).toMatchObject({ providerId: "credential", accountId: pilot.userId });
    expect(await new Scrypt().verify(account!.password!.replace("lobbystack-scrypt-v1:", ""), "PilotPassword!42")).toBe(true);
    const [user] = await auth!.db.select().from(users).where(eq(users.id, pilot.userId));
    expect(user!.emailVerified).toBe(true); expect(user!.platformRole).toBe("operator");
    expect(await previewPilotActivation(auth!.db, pilot.token)).toBeNull();
    await expect(redeemPilotActivation(auth!.db, { token: pilot.token, passwordHash })).rejects.toThrow("invalid or expired");
  }, 60_000);

  it("rejects expired activation without creating any password", async () => {
    const pilot = await provision();
    await auth!.db.update(verifications).set({ expiresAt: new Date(0) }).where(eq(verifications.identifier, `caleonis-pilot-activation:${createHash("sha256").update(pilot.token).digest("hex")}`));
    expect(await previewPilotActivation(auth!.db, pilot.token)).toBeNull();
    await expect(redeemPilotActivation(auth!.db, { token: pilot.token, passwordHash: "hash" })).rejects.toThrow("invalid or expired");
    expect(await auth!.db.select().from(accounts).where(eq(accounts.userId, pilot.userId))).toHaveLength(0);
  }, 60_000);

  it("binds existing invitations to the intended email and consumes them once under concurrency", async () => {
    const owner = await provision(); const invitee = await provision(); const wrong = await provision();
    const tokenHash = createHash("sha256").update(randomUUID()).digest("hex");
    await admin!.db.insert(businessInvitations).values({ businessId: owner.businessId, invitedByUserId: owner.userId, email: invitee.email.toUpperCase(), normalizedEmail: invitee.email, role: "scheduler", tokenHash, expiresAt: new Date(Date.now() + 60000) });
    await expect(acceptInvitation({ db: app!.db }, { userId: wrong.userId, tokenHash })).rejects.toThrow("invited email");
    expect(await admin!.db.select().from(businessMemberships).where(and(eq(businessMemberships.businessId, owner.businessId), eq(businessMemberships.userId, wrong.userId)))).toHaveLength(0);
    const results = await Promise.allSettled([1, 2].map(() => acceptInvitation({ db: app!.db }, { userId: invitee.userId, tokenHash })));
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const [invitation] = await admin!.db.select().from(businessInvitations).where(eq(businessInvitations.tokenHash, tokenHash));
    expect(invitation).toMatchObject({ status: "accepted", acceptedByUserId: invitee.userId });
    const [user] = await auth!.db.select().from(users).where(eq(users.id, invitee.userId));
    expect(user!.activeBusinessId).toBe(owner.businessId);
  }, 60_000);

  it("preserves an active owner's role when an older invitation carries a lower role", async () => {
    const owner = await provision();
    const tokenHash = createHash("sha256").update(randomUUID()).digest("hex");
    await admin!.db.insert(businessInvitations).values({ businessId: owner.businessId, invitedByUserId: owner.userId, email: owner.email, normalizedEmail: owner.email, role: "viewer", tokenHash, expiresAt: new Date(Date.now() + 60000) });
    expect(await acceptInvitation({ db: app!.db }, { userId: owner.userId, tokenHash })).toEqual({ businessId: owner.businessId, role: "business_owner" });
    const [membership] = await admin!.db.select().from(businessMemberships).where(and(eq(businessMemberships.businessId, owner.businessId), eq(businessMemberships.userId, owner.userId)));
    expect(membership!.role).toBe("business_owner");
  }, 60_000);

  it("reissues an expired link, invalidates its predecessor and never resets an active account", async () => {
    const pilot = await provision();
    await auth!.db.update(verifications).set({ expiresAt: new Date(0) }).where(eq(verifications.identifier, `caleonis-pilot-activation:${createHash("sha256").update(pilot.token).digest("hex")}`));
    const reissued = await reissuePilotActivation({ db: app!.db }, auth!.db, pilot.userId);
    expect(reissued.revokedCount).toBe(1);
    expect(await previewPilotActivation(auth!.db, pilot.token)).toBeNull();
    await expect(redeemPilotActivation(auth!.db, { token: pilot.token, passwordHash: "old" })).rejects.toThrow("invalid or expired");
    expect(await previewPilotActivation(auth!.db, reissued.token)).toMatchObject({ email: pilot.email });
    await redeemPilotActivation(auth!.db, { token: reissued.token, passwordHash: "chosen-first-password" });
    await expect(reissuePilotActivation({ db: app!.db }, auth!.db, pilot.userId)).rejects.toThrow("Active accounts");
    await expect(revokePilotActivation({ db: app!.db }, auth!.db, pilot.userId)).rejects.toThrow("Active accounts");
    const [account] = await auth!.db.select().from(accounts).where(eq(accounts.userId, pilot.userId));
    expect(account!.password).toBe("chosen-first-password");
  }, 60_000);

  it("revokes links without deleting the company or setting credentials, then allows a trusted reissue", async () => {
    const pilot = await provision();
    expect(await revokePilotActivation({ db: app!.db }, auth!.db, pilot.userId)).toEqual({ userId: pilot.userId, revokedCount: 1 });
    await expect(redeemPilotActivation(auth!.db, { token: pilot.token, passwordHash: "revoked" })).rejects.toThrow("invalid or expired");
    expect(await auth!.db.select().from(accounts).where(eq(accounts.userId, pilot.userId))).toHaveLength(0);
    expect(await listUserBusinesses(app!.db, pilot.userId)).toHaveLength(1);
    const reissued = await reissuePilotActivation({ db: app!.db }, auth!.db, pilot.userId);
    expect(reissued.revokedCount).toBe(0);
    expect(await previewPilotActivation(auth!.db, reissued.token)).toMatchObject({ email: pilot.email });
  }, 60_000);

  it("serializes concurrent reissues so only the newest token remains valid", async () => {
    const pilot = await provision();
    const results = await Promise.all([1, 2].map(() => reissuePilotActivation({ db: app!.db }, auth!.db, pilot.userId)));
    const previews = await Promise.all(results.map(result => previewPilotActivation(auth!.db, result.token)));
    expect(previews.filter(Boolean)).toHaveLength(1);
    expect(await previewPilotActivation(auth!.db, pilot.token)).toBeNull();
    const oldIndex = previews.findIndex(preview => !preview);
    await expect(redeemPilotActivation(auth!.db, { token: results[oldIndex]!.token, passwordHash: "stale" })).rejects.toThrow("invalid or expired");
    await redeemPilotActivation(auth!.db, { token: results[1 - oldIndex]!.token, passwordHash: "latest" });
  }, 60_000);

  it("serializes redemption against reissue without resetting credentials or deadlocking", async () => {
    const pilot = await provision();
    const results = await Promise.allSettled([
      redeemPilotActivation(auth!.db, { token: pilot.token, passwordHash: "first-chosen-password" }),
      reissuePilotActivation({ db: app!.db }, auth!.db, pilot.userId),
    ]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
    const credentials = await auth!.db.select().from(accounts).where(eq(accounts.userId, pilot.userId));
    if (credentials.length) expect(credentials[0]!.password).toBe("first-chosen-password");
    else {
      const reissued = results[1];
      expect(reissued!.status).toBe("fulfilled");
      if (reissued!.status === "fulfilled") expect(await previewPilotActivation(auth!.db, (reissued!.value as { token: string }).token)).not.toBeNull();
    }
  }, 60_000);

  it("blocks autonomous workspace creation for a managed pilot and permits a non-pilot under the real app role", async () => {
    const pilot = await provision();
    expect(await canCreateAutonomousBusiness({ db: app!.db }, pilot.userId)).toBe(false);
    // Test-only transition: trusted operator provisioning remains distinct from
    // the public API and the customer cannot write this boolean themselves.
    await admin!.db.update(businesses).set({ managedPilot: false }).where(eq(businesses.id, pilot.businessId));
    expect(await canCreateAutonomousBusiness({ db: app!.db }, pilot.userId)).toBe(true);
  }, 60_000);
});
