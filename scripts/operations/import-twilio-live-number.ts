import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import type { DatabaseClient, DatabaseTransaction } from "@lobbystack/db";

/**
 * Imports an ALREADY PURCHASED French local Voice number. Never buys a number.
 * Dry-run is the default. Run with the worker and dispatcher role credentials:
 * pnpm exec tsx --tsconfig tsconfig.base.json scripts/operations/import-twilio-live-number.ts \
 *   --business-id <uuid> --number +33... --phone-sid PN... --trunk-sid TK... [--apply]
 * Secrets belong only in the environment. --apply changes routing and the database.
 * After any timeout or commit error, reread Twilio AND database state with a
 * dry-run before resuming. A lost response can hide a completed association or
 * commit; the progress flags below cannot prove that nothing changed remotely.
 */
type Options = { businessId: string; number: string; phoneSid: string; trunkSid: string; apply: boolean };
type OwnedNumber = { sid: string; accountSid: string; number: string; trunkSid: string | null; voice: boolean; sms: boolean };
type TwilioSdk = {
  incomingPhoneNumbers(sid: string): { fetch(): Promise<unknown> };
  trunking: { v1: { trunks(sid: string): {
    fetch(): Promise<unknown>;
    phoneNumbers: { create(input: { phoneNumberSid: string }): Promise<unknown> };
  } } };
};

class OperationError extends Error {}

function requireValue(value: string | undefined, name: string, pattern?: RegExp): string {
  if (!value || (pattern && !pattern.test(value))) throw new OperationError(`${name} is missing or invalid.`);
  return value;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new OperationError("Unexpected Twilio response.");
  return value as Record<string, unknown>;
}

function ownedNumber(value: unknown, options: Options, accountSid: string): OwnedNumber {
  const number = record(value);
  const capabilities = record(number.capabilities);
  const voice = (capabilities.voice ?? capabilities.VOICE) === true;
  const sms = (capabilities.sms ?? capabilities.SMS) === true;
  if (number.sid !== options.phoneSid || number.accountSid !== accountSid || number.phoneNumber !== options.number) {
    throw new OperationError("Twilio ownership, Phone SID or number does not match the explicit request.");
  }
  if (!voice) throw new OperationError("The owned number does not support Voice.");
  const trunkSid = typeof number.trunkSid === "string" && number.trunkSid ? number.trunkSid : null;
  if (trunkSid && trunkSid !== options.trunkSid) throw new OperationError("The number already routes to another trunk. Review that routing manually.");
  return { sid: options.phoneSid, accountSid, number: options.number, trunkSid, voice, sms };
}

async function bounded<T>(promise: Promise<T>, label: string, milliseconds = 10_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new OperationError(`${label} timed out.`)), milliseconds);
    })]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const { values } = parseArgs({ args: argv, options: {
    "business-id": { type: "string" }, number: { type: "string" },
    "phone-sid": { type: "string" }, "trunk-sid": { type: "string" },
    apply: { type: "boolean" }, help: { type: "boolean" },
  } });
  if (values.help) {
    console.log("Import an already purchased French Voice number; dry-run by default. Required: --business-id UUID --number +33... --phone-sid PN... --trunk-sid TK... . Add --apply only after approving purchase and routing. Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, matching TWILIO_SIP_TRUNK_SID, worker/dispatcher DB credentials, and REDIS_URL for --apply. Never purchases or releases a number.");
    return;
  }
  const options: Options = {
    businessId: requireValue(values["business-id"], "--business-id", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).toLowerCase(),
    number: requireValue(values.number, "--number (French local E.164)", /^\+33[1-59]\d{8}$/),
    phoneSid: requireValue(values["phone-sid"], "--phone-sid", /^PN[0-9a-f]{32}$/i),
    trunkSid: requireValue(values["trunk-sid"], "--trunk-sid", /^TK[0-9a-f]{32}$/i),
    apply: values.apply ?? false,
  };
  const accountSid = requireValue(process.env.TWILIO_ACCOUNT_SID?.trim(), "TWILIO_ACCOUNT_SID", /^AC[0-9a-f]{32}$/i);
  const authToken = requireValue(process.env.TWILIO_AUTH_TOKEN?.trim(), "TWILIO_AUTH_TOKEN");
  if (process.env.TWILIO_SIP_TRUNK_SID?.trim() !== options.trunkSid) {
    throw new OperationError("--trunk-sid must match the worker's TWILIO_SIP_TRUNK_SID.");
  }
  if (options.apply) requireValue(process.env.REDIS_URL?.trim(), "REDIS_URL");

  // Resolve Twilio from its existing workspace dependency; no root dependency change.
  const makeTwilio = createRequire(new URL("../../packages/providers/package.json", import.meta.url))("twilio") as
    (sid: string, token: string, config: { timeout: number; autoRetry: boolean }) => TwilioSdk;
  const twilio = makeTwilio(accountSid, authToken, { timeout: 10_000, autoRetry: false });
  let worker: DatabaseClient | undefined;
  let dispatcher: DatabaseClient | undefined;
  let redis: ReturnType<typeof import("@lobbystack/jobs")["createRedisConnection"]> | undefined;
  let stage = "read-only provider verification";
  let trunkChanged = false;
  let databaseCommitted = false;
  try {
    const owned = ownedNumber(await twilio.incomingPhoneNumbers(options.phoneSid).fetch(), options, accountSid);
    const trunk = record(await twilio.trunking.v1.trunks(options.trunkSid).fetch());
    if (trunk.sid !== options.trunkSid || trunk.accountSid !== accountSid || trunk.secure !== true) {
      throw new OperationError("The requested trunk must belong to this account and have Secure Trunking enabled.");
    }
    const { assertDatabaseRole, businesses, createDatabaseClient, phoneNumbers, withBusinessTransaction, withDispatcherTransaction } = await import("@lobbystack/db");
    const { and, eq, ne, or, sql } = await import("drizzle-orm");
    worker = createDatabaseClient("lobbystack_worker");
    dispatcher = createDatabaseClient("lobbystack_dispatcher");
    stage = "read-only database preflight";
    // Enforce least-privilege roles even when NODE_ENV is not production.
    await assertDatabaseRole(worker, { ...process.env, NODE_ENV: "production" });
    await assertDatabaseRole(dispatcher, { ...process.env, NODE_ENV: "production" });
    const businessList = await withDispatcherTransaction(dispatcher.db, async (tx) => tx.select({ id: businesses.id }).from(businesses));
    if (!businessList.some((business) => business.id === options.businessId)) throw new OperationError("The explicit business does not exist in this database.");

    // RLS hides other tenants' inactive numbers from a single business context.
    // Inspect each known tenant using the worker role; never use a superuser.
    for (const business of businessList) {
      await withBusinessTransaction(worker.db, { businessId: business.id, actorType: "worker" }, async (tx) => {
        const collisions = await tx.select().from(phoneNumbers).where(or(eq(phoneNumbers.e164, options.number), eq(phoneNumbers.providerPhoneId, options.phoneSid)));
        for (const row of collisions) {
          if (row.businessId !== options.businessId) throw new OperationError("The E.164 number or Phone SID belongs to another business, including inactive records.");
          if (row.e164 !== options.number || (row.providerPhoneId && row.providerPhoneId !== options.phoneSid)) throw new OperationError("Existing E.164 and Phone SID mapping does not match.");
          if (row.status !== "active" || row.reclaimScheduledAt || row.reclaimReason) throw new OperationError("The existing number is inactive or scheduled for reclamation.");
        }
      });
    }

    const inspectBusiness = async (tx: DatabaseTransaction) => {
      const [business] = await tx.select({ id: businesses.id, name: businesses.name, status: businesses.status }).from(businesses).where(eq(businesses.id, options.businessId)).for("update");
      if (!business || business.status !== "active") throw new OperationError("The target business must be active.");
      const [existing] = await tx.select().from(phoneNumbers).where(eq(phoneNumbers.e164, options.number)).for("update");
      if (existing && (existing.status !== "active" || existing.reclaimScheduledAt || existing.reclaimReason || (existing.providerPhoneId && existing.providerPhoneId !== options.phoneSid))) throw new OperationError("The existing number changed or cannot be safely imported.");
      // Snapshot selection includes every active Voice number, even one whose
      // reclamation is scheduled. Refuse all such alternatives before import.
      const [otherVoice] = await tx.select({ id: phoneNumbers.id }).from(phoneNumbers).where(and(eq(phoneNumbers.businessId, options.businessId), eq(phoneNumbers.status, "active"), eq(phoneNumbers.voiceEnabled, true), ne(phoneNumbers.e164, options.number))).limit(1);
      if (otherVoice) throw new OperationError("The business already has another active Voice number, including a number scheduled for reclamation. Review which number the snapshot should use.");
      const resolved = await tx.execute<{ business_id: string | null }>(sql`select app.resolve_business_by_phone(${options.number}) as business_id`);
      if (resolved.rows[0]?.business_id && resolved.rows[0].business_id !== options.businessId) throw new OperationError("Dialed-number routing belongs to another business.");
      return { business, existing };
    };
    const plan = await withBusinessTransaction(worker.db, { businessId: options.businessId, actorType: "worker" }, inspectBusiness);
    console.log(JSON.stringify({ mode: options.apply ? "apply" : "dry-run", businessId: options.businessId, businessName: plan.business.name, number: options.number, phoneSid: options.phoneSid, trunkSid: options.trunkSid, capabilities: { voice: owned.voice, sms: owned.sms }, databaseAction: plan.existing ? "update" : "insert", attachToTrunk: !owned.trunkSid, publishSnapshot: true }));
    if (!options.apply) return;

    const { assertCertificationOperationAllowed } = await import("@lobbystack/shared");
    assertCertificationOperationAllowed();
    const { createRedisConnection } = await import("@lobbystack/jobs");
    redis = createRedisConnection();
    stage = "read-only snapshot cache preflight";
    await bounded(redis.ping(), "Redis preflight", 5_000);
    const { refreshBusinessSnapshot, loadLatestBusinessSnapshot, snapshotCacheKey, serializeSnapshot, SNAPSHOT_CACHE_TTL_SECONDS } = await import("@lobbystack/domain");
    stage = "number registration and trunk association";
    const registered = await withBusinessTransaction(worker.db, { businessId: options.businessId, actorType: "worker" }, async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`twilio-live-import:${options.number}`}, 0))`);
      const { existing } = await inspectBusiness(tx);
      // Check live ownership/routing again immediately before writing anything.
      const current = ownedNumber(await twilio.incomingPhoneNumbers(options.phoneSid).fetch(), options, accountSid);
      const patch = {
        providerPhoneId: options.phoneSid, status: "active", voiceEnabled: current.voice, smsEnabled: current.sms,
        voiceWebhookStatus: "synced", voiceWebhookTargetUrl: `sip-trunk:${options.trunkSid}`,
        voiceWebhookLastSyncedAt: new Date(), voiceWebhookLastError: null, updatedAt: new Date(),
        ...(!current.sms ? { smsWebhookStatus: null, smsWebhookTargetUrl: null, smsWebhookLastSyncedAt: null, smsWebhookLastError: null } : {}),
      };
      // Unique indexes reject concurrent or hidden collisions before trunk routing changes.
      const [row] = existing
        ? await tx.update(phoneNumbers).set(patch).where(eq(phoneNumbers.id, existing.id)).returning({ id: phoneNumbers.id })
        : await tx.insert(phoneNumbers).values({ ...patch, businessId: options.businessId, e164: options.number }).returning({ id: phoneNumbers.id });
      if (!row) throw new OperationError("Number registration did not return a row.");
      if (!current.trunkSid) {
        await twilio.trunking.v1.trunks(options.trunkSid).phoneNumbers.create({ phoneNumberSid: options.phoneSid });
        trunkChanged = true;
      }
      const verified = ownedNumber(await twilio.incomingPhoneNumbers(options.phoneSid).fetch(), options, accountSid);
      if (verified.trunkSid !== options.trunkSid) throw new OperationError("Twilio did not confirm the intended trunk association.");
      return { phoneNumberId: row.id, sms: current.sms };
    }, { maxRetries: 0 }); // Never replay a transaction containing an external mutation.
    databaseCommitted = true;
    stage = "snapshot publication";
    const context = { db: worker.db };
    const version = await refreshBusinessSnapshot(context, { businessId: options.businessId });
    const snapshot = await loadLatestBusinessSnapshot(context, { businessId: options.businessId });
    if (!snapshot || snapshot.businessId !== options.businessId || snapshot.version !== version || snapshot.contactChannels.phoneNumber !== options.number || (!registered.sms && snapshot.contactChannels.smsNumber === options.number)) {
      throw new OperationError("Published snapshot does not match the imported Voice/SMS capabilities.");
    }
    stage = "snapshot cache publication";
    await bounded(redis.set(snapshotCacheKey(options.businessId), serializeSnapshot(snapshot), "EX", SNAPSHOT_CACHE_TTL_SECONDS), "Snapshot cache publication", 5_000);
    console.log(JSON.stringify({ status: "imported_and_snapshot_published", businessId: options.businessId, phoneNumberId: registered.phoneNumberId, number: options.number, snapshotVersion: version, realCallTestRequired: true }));
  } catch (error) {
    // Provider/DB errors can contain credential-bearing connection strings.
    const rawCode = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    const safeCode = /^[A-Z0-9]{5}$/.test(rawCode) ? ` (code ${rawCode})` : "";
    const detail = error instanceof OperationError ? error.message : `Provider or database operation failed${safeCode}; verify access and connectivity in the protected environment.`;
    throw new OperationError(`${stage}: ${detail} Confirmed association response received: ${trunkChanged}; confirmed database commit response received: ${databaseCommitted}. A timeout or lost commit response can leave either remote state changed despite a false flag. No automatic number release or routing rollback was attempted. Before resuming, you MUST rerun the dry-run and reread both Twilio association and database registration; resolve any inconsistent state first.`);
  } finally {
    redis?.disconnect();
    await Promise.allSettled([worker?.pool.end(), dispatcher?.pool.end()]);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  void main().catch((error: unknown) => {
    console.error(error instanceof OperationError ? error.message : "Invalid command or operation failed. See --help. Secrets were not printed.");
    process.exitCode = 1;
  });
}
