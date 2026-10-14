import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { createDatabaseClient, type Database, type DatabaseTransaction } from "./client";
import { claimOutboxBatch, claimOutboxRecoveryBatch, completeOutboxExecution, prepareOutboxReplay, quarantineOutboxExecution, startOutboxExecution } from "./outbox";
import { outboxMessages } from "./schema";

const testUrl = process.env.LOBBYSTACK_RELIABILITY_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname) || !/test/i.test(url.pathname)) throw new Error("Outbox tests require an explicit local isolated test database");
}
const admin = testUrl ? createDatabaseClient("lobbystack_migrator", { DATABASE_URL: testUrl }) : undefined;
const dispatcher = {
  transaction: (run: (tx: DatabaseTransaction) => Promise<unknown>) => admin!.db.transaction(async (tx) => { await tx.execute(sql`SET LOCAL ROLE lobbystack_dispatcher`); return await run(tx); }),
} as Database;
const fixtureIds: string[] = [];
async function fixture(overrides: Partial<typeof outboxMessages.$inferInsert> = {}) {
  const id = randomUUID();
  fixtureIds.push(id);
  const dedupeKey = `pilot-outbox-recovery-test:${id}`;
  await admin!.db.insert(outboxMessages).values({ id, dedupeKey, topic: "snapshot.refresh", aggregateType: "recovery_test", payload: {}, deliveryTracked: true, publishedAt: new Date("2000-01-01T00:00:00Z"), ...overrides });
  return { id, dedupeKey };
}
afterAll(async () => {
  if (admin && fixtureIds.length) await admin.db.delete(outboxMessages).where(and(inArray(outboxMessages.id, fixtureIds), eq(outboxMessages.aggregateType, "recovery_test")));
  await admin?.pool.end();
});

describe.skipIf(!testUrl)("outbox execution receipts under the dispatcher PostgreSQL role", () => {
  it("tracks first claims while retaining legacy retry provenance and tracked retry receipts", async () => {
    const pending = { publishedAt: null, availableAt: new Date("0001-01-01T00:00:00Z") };
    const fresh = await fixture({ ...pending, attempts: 0, deliveryTracked: false });
    const legacy = await fixture({ ...pending, attempts: 1, deliveryTracked: false });
    const tracked = await fixture({ ...pending, attempts: 1, deliveryTracked: true });
    const claims = new Map((await claimOutboxBatch(dispatcher, { dispatcherId: "receipt-rollout-test", limit: 3, trackExecution: true })).map((row) => [row.id, row]));
    expect(claims.get(fresh.id)).toMatchObject({ attempts: 1, deliveryTracked: true });
    expect(claims.get(legacy.id)).toMatchObject({ attempts: 2, deliveryTracked: false });
    expect(claims.get(tracked.id)).toMatchObject({ attempts: 2, deliveryTracked: true });
    expect(await startOutboxExecution(dispatcher, legacy.id, legacy.dedupeKey)).toBe(false);
    await admin!.db.update(outboxMessages).set({ lockedAt: null, lockedBy: null }).where(eq(outboxMessages.id, tracked.id));
    const disabledClaim = (await claimOutboxBatch(dispatcher, { dispatcherId: "receipt-disabled-test", limit: 1, trackExecution: false }))[0];
    expect(disabledClaim).toMatchObject({ id: tracked.id, attempts: 3, deliveryTracked: true });
  });
  it("starts once per queued attempt and suppresses completed or mismatched jobs", async () => {
    const row = await fixture();
    expect(await startOutboxExecution(dispatcher, row.id, "wrong-key")).toBe(false);
    expect(await startOutboxExecution(dispatcher, row.id, row.dedupeKey)).toBe(true);
    await completeOutboxExecution(dispatcher, row.id, row.dedupeKey);
    expect(await startOutboxExecution(dispatcher, row.id, row.dedupeKey)).toBe(false);
    const stored = (await admin!.db.select().from(outboxMessages).where(eq(outboxMessages.id, row.id)))[0]!;
    expect(stored.executionStartedAt).not.toBeNull();
    expect(stored.completedAt).not.toBeNull();
  });
  it("does not replay legacy published messages and never claims a batch twice within the recovery lease", async () => {
    const legacy = await fixture({ deliveryTracked: false });
    const pending = await fixture();
    const first = await claimOutboxRecoveryBatch(dispatcher);
    expect(first.some((row) => row.id === pending.id)).toBe(true);
    expect(first.some((row) => row.id === legacy.id)).toBe(false);
    const second = await claimOutboxRecoveryBatch(dispatcher);
    expect(second.some((row) => row.id === pending.id)).toBe(false);
  });
  it("quarantines uncertain delivery and allows an authoritative completion to clear the quarantine", async () => {
    const row = await fixture();
    await startOutboxExecution(dispatcher, row.id, row.dedupeKey);
    await quarantineOutboxExecution(dispatcher, row.id, "REDIS_LOSS_AFTER_EXECUTION_STARTED");
    expect(await startOutboxExecution(dispatcher, row.id, row.dedupeKey)).toBe(false);
    await completeOutboxExecution(dispatcher, row.id, row.dedupeKey);
    const stored = (await admin!.db.select().from(outboxMessages).where(eq(outboxMessages.id, row.id)))[0]!;
    expect(stored.completedAt).not.toBeNull();
    expect(stored.deadLetteredAt).toBeNull();
    await quarantineOutboxExecution(dispatcher, row.id, "QUEUE_TERMINAL_FAILURE");
    expect((await admin!.db.select().from(outboxMessages).where(eq(outboxMessages.id, row.id)))[0]!.deadLetteredAt).toBeNull();
  });
  it("fences the original after a replay reservation and never replays a now-started original", async () => {
    const replayable = await fixture();
    const prepared = await prepareOutboxReplay(dispatcher, replayable.id, replayable.dedupeKey, 0);
    expect(prepared.state).toBe("replay");
    expect(await startOutboxExecution(dispatcher, replayable.id, replayable.dedupeKey, 0)).toBe(false);
    expect(await startOutboxExecution(dispatcher, replayable.id, replayable.dedupeKey, 1)).toBe(true);
    await completeOutboxExecution(dispatcher, replayable.id, replayable.dedupeKey, 0);
    expect((await admin!.db.select().from(outboxMessages).where(eq(outboxMessages.id, replayable.id)))[0]!.completedAt).toBeNull();
    const started = await fixture();
    await startOutboxExecution(dispatcher, started.id, started.dedupeKey, 0);
    expect(await prepareOutboxReplay(dispatcher, started.id, started.dedupeKey, 0)).toEqual({ state: "quarantined" });
  });
});
