import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt, inArray, like, sql } from "drizzle-orm";
import { accounts, businesses, users, verifications, withBusinessTransaction, type Database, type DatabaseTransaction } from "@lobbystack/db";
import { normalizeAuthEmail } from "@lobbystack/shared";
import type { DomainContext } from "./context";
import { createBusiness } from "./tenancy";
import { requireBusinessMembership } from "../authz";

const activationPrefix = "caleonis-pilot-activation:";
export const pilotActivationTtlHours = 48;
type Activation = { userId: string; email: string; businessId: string; businessName: string };

function identifier(token: string): string {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw invalidActivation();
  return `${activationPrefix}${createHash("sha256").update(token).digest("hex")}`;
}

function invalidActivation() {
  return Object.assign(new Error("Activation link is invalid or expired."), { status: 400 });
}

function decode(value: string): Activation {
  const parsed = JSON.parse(value) as Activation;
  if (!parsed.userId || !parsed.email || !parsed.businessId || !parsed.businessName) throw invalidActivation();
  return parsed;
}

/** Operator-only provisioning. The recipient must have been verified through a
 * trusted human channel before the activation link is delivered. No email or
 * login session is created. The account cannot sign in before activation. */
export async function provisionPilotOwner(context: DomainContext, authDb: Database, input: {
  email: string; name: string; businessName: string; timezone: string; businessType: string; locale: "fr" | "en";
}): Promise<{ userId: string; businessId: string; token: string; expiresAt: Date }> {
  const userId = randomUUID();
  const email = normalizeAuthEmail(input.email);
  await authDb.insert(users).values({ id: userId, email, normalizedEmail: email, name: input.name.trim(), emailVerified: false, platformRole: "operator", preferredLocale: input.locale });
  let businessId: string | undefined;
  try {
    const business = await createBusiness(context, { userId, name: input.businessName, timezone: input.timezone, businessType: input.businessType });
    businessId = business.businessId;
    // Managed pilots configure their receptionist in the existing dashboard.
    // Do not force them through a checkout or autonomous number-purchase flow.
    await withBusinessTransaction(context.db, { userId, businessId, actorType: "system" }, async tx => {
      await tx.update(businesses).set({ onboardingStage: "complete", managedPilot: true, defaultLocale: input.locale, updatedAt: new Date() }).where(eq(businesses.id, businessId!));
    });
    const result = await issuePilotActivation(authDb, { userId, email, businessId, businessName: input.businessName.trim() });
    return { userId, businessId, ...result };
  } catch (error) {
    // Compensation affects only the freshly created, inaccessible account.
    // Leave the user intact if workspace cleanup fails, allowing operator repair.
    if (businessId) await withBusinessTransaction(context.db, { userId, businessId, actorType: "system" }, async tx => {
      await tx.delete(businesses).where(eq(businesses.id, businessId!));
    });
    await authDb.delete(users).where(eq(users.id, userId));
    throw error;
  }
}

async function issuePilotActivation(authDb: Database | DatabaseTransaction, activation: Activation): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + pilotActivationTtlHours * 60 * 60 * 1000);
  await authDb.insert(verifications).values({ identifier: identifier(token), value: JSON.stringify(activation), expiresAt });
  return { token, expiresAt };
}

async function lockPilotAccount(tx: DatabaseTransaction, userId: string): Promise<void> {
  // Redemption, reissue and revocation take this same lock BEFORE deleting any
  // token row. Row-locking tokens first can deadlock against concurrent reissue.
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`caleonis-pilot:${userId}`}, 0))`);
}

function inactivePilotRequired() {
  return Object.assign(new Error("Only an unactivated managed pilot can have its activation link changed. Active accounts must use password recovery."), { status: 409 });
}

async function inactivePilot(tx: DatabaseTransaction, context: DomainContext, userId: string): Promise<Activation> {
  const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1).for("update");
  if (!user || user.emailVerified || user.passwordHash || user.platformRole !== "operator" || !user.activeBusinessId) throw inactivePilotRequired();
  const credential = await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId)).limit(1);
  if (credential.length) throw inactivePilotRequired();
  const business = await withBusinessTransaction(context.db, { userId, businessId: user.activeBusinessId, actorType: "operator" }, async businessTx => {
    await requireBusinessMembership(businessTx, { userId, businessId: user.activeBusinessId!, minimumRole: "business_owner" });
    const [row] = await businessTx.select({ name: businesses.name, managedPilot: businesses.managedPilot }).from(businesses).where(eq(businesses.id, user.activeBusinessId!)).limit(1);
    if (!row?.managedPilot) throw inactivePilotRequired();
    return row;
  });
  return { userId, email: normalizeAuthEmail(user.email), businessId: user.activeBusinessId, businessName: business.name };
}

async function removePilotTokens(tx: DatabaseTransaction, userId: string): Promise<number> {
  const candidates = await tx.select({ id: verifications.id, value: verifications.value }).from(verifications).where(like(verifications.identifier, `${activationPrefix}%`));
  const ids = candidates.filter(row => {
    try { return decode(row.value).userId === userId; } catch { return false; }
  }).map(row => row.id);
  if (!ids.length) return 0;
  await tx.delete(verifications).where(inArray(verifications.id, ids));
  return ids.length;
}

/** Trusted operator action only: refresh access to an unactivated pilot after
 * rechecking the contact. Concurrent reissues leave exactly one usable link. */
export async function reissuePilotActivation(context: DomainContext, authDb: Database, userId: string): Promise<{ userId: string; businessId: string; email: string; token: string; expiresAt: Date; revokedCount: number }> {
  return authDb.transaction(async tx => {
    await lockPilotAccount(tx, userId);
    const activation = await inactivePilot(tx, context, userId);
    const revokedCount = await removePilotTokens(tx, userId);
    const issued = await issuePilotActivation(tx, activation);
    return { userId, businessId: activation.businessId, email: activation.email, revokedCount, ...issued };
  });
}

/** Revokes pending/expired links without creating credentials or deleting the
 * account or its company data. A later trusted reissue remains possible. */
export async function revokePilotActivation(context: DomainContext, authDb: Database, userId: string): Promise<{ userId: string; revokedCount: number }> {
  return authDb.transaction(async tx => {
    await lockPilotAccount(tx, userId);
    await inactivePilot(tx, context, userId);
    return { userId, revokedCount: await removePilotTokens(tx, userId) };
  });
}

export async function previewPilotActivation(authDb: Database, token: string): Promise<{ businessName: string; email: string; expiresAt: Date } | null> {
  let tokenIdentifier: string;
  try { tokenIdentifier = identifier(token); } catch { return null; }
  const [row] = await authDb.select().from(verifications).where(and(eq(verifications.identifier, tokenIdentifier), gt(verifications.expiresAt, sql`now()`))).limit(1);
  if (!row) return null;
  const activation = decode(row.value);
  return { businessName: activation.businessName, email: activation.email, expiresAt: row.expiresAt };
}

/** Atomically consume the token and set the first password. A rollback restores
 * the token if account creation fails; existing credentials are never replaced. */
export async function redeemPilotActivation(authDb: Database, input: { token: string; passwordHash: string }): Promise<{ email: string }> {
  const tokenIdentifier = identifier(input.token);
  return authDb.transaction(async tx => {
    const [candidate] = await tx.select({ value: verifications.value }).from(verifications).where(eq(verifications.identifier, tokenIdentifier)).limit(1);
    if (!candidate) throw invalidActivation();
    const candidateActivation = decode(candidate.value);
    await lockPilotAccount(tx, candidateActivation.userId);
    const [row] = await tx.delete(verifications).where(and(eq(verifications.identifier, tokenIdentifier), gt(verifications.expiresAt, sql`now()`))).returning();
    if (!row) throw invalidActivation();
    const activation = decode(row.value);
    const [user] = await tx.select().from(users).where(eq(users.id, activation.userId)).limit(1).for("update");
    if (!user || normalizeAuthEmail(user.email) !== activation.email || user.emailVerified || user.platformRole !== "operator" || user.activeBusinessId !== activation.businessId) throw invalidActivation();
    const existing = await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, user.id)).limit(1);
    if (existing.length) throw invalidActivation();
    await tx.insert(accounts).values({ userId: user.id, accountId: user.id, providerId: "credential", password: input.passwordHash });
    await tx.update(users).set({ emailVerified: true, passwordHash: input.passwordHash, passwordAlgorithm: "lobbystack-scrypt-v1", updatedAt: new Date() }).where(eq(users.id, user.id));
    return { email: user.email };
  });
}
