import { randomUUID } from "node:crypto";

import { and, eq, inArray, sql } from "drizzle-orm";
import { Worker, type Job } from "bullmq";
import Redis from "ioredis";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { completeOutboxExecution, createDatabaseClient, outboxMessages, startOutboxExecution, type Database, type DatabaseTransaction } from "@lobbystack/db";
import { createQueue, createWorkerOptions, enqueueJob, jobIdFor, type JobEnvelope } from "@lobbystack/jobs";

import { OutboxDispatcher } from "./outboxDispatcher";
import { recoverOutboxDeliveries } from "./outboxRecovery";

const flag = process.env.LOBBYSTACK_OUTBOX_REDIS_RECOVERY_INTEGRATION;
if (flag !== undefined && flag !== "true" && flag !== "false") {
  throw new Error("LOBBYSTACK_OUTBOX_REDIS_RECOVERY_INTEGRATION must be true or false");
}
const enabled = flag === "true";
const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

// A production-looking URL is rejected before any PostgreSQL or Redis client is
// created. Do not fall back to DATABASE_URL, REDIS_URL, or environment files.
function integrationEnvironment(source: NodeJS.ProcessEnv): { postgresUrl: string; redisUrl: string } {
  if (source.NODE_ENV !== "test") throw new Error("Recovery integration requires NODE_ENV=test");
  const postgresUrl = source.LOBBYSTACK_RELIABILITY_TEST_DATABASE_URL;
  const redisUrl = source.REDIS_TEST_URL;
  if (!postgresUrl || !redisUrl) throw new Error("Recovery integration requires explicit PostgreSQL and Redis TEST URLs");
  for (const [value, kind] of [[postgresUrl, "postgres"], [redisUrl, "redis"]] as const) {
    const parsed = new URL(value);
    const protocols = kind === "postgres" ? ["postgres:", "postgresql:"] : ["redis:", "rediss:"];
    if (!protocols.includes(parsed.protocol) || !loopbackHosts.has(parsed.hostname) || parsed.search || parsed.hash) {
      throw new Error(`Recovery integration requires an unambiguous loopback ${kind} TEST URL`);
    }
    if (kind === "postgres" && !/test/i.test(decodeURIComponent(parsed.pathname.slice(1)))) {
      throw new Error("Recovery integration requires a PostgreSQL database named for TEST use");
    }
  }
  return { postgresUrl, redisUrl };
}

// The explicit CI flag makes absent/unsafe URLs a collection error, not a skip.
const environment = enabled ? integrationEnvironment(process.env) : undefined;

describe("outbox Redis integration safety boundaries", () => {
  const safe = { NODE_ENV: "test", LOBBYSTACK_RELIABILITY_TEST_DATABASE_URL: "postgres://postgres:fixture@127.0.0.1:5432/outbox_test", REDIS_TEST_URL: "redis://127.0.0.1:6379" };
  it("requires test mode and explicit test URLs instead of default provider URLs", () => {
    expect(() => integrationEnvironment({ ...safe, NODE_ENV: "production" })).toThrow("NODE_ENV=test");
    expect(() => integrationEnvironment({ NODE_ENV: "test", DATABASE_URL: safe.LOBBYSTACK_RELIABILITY_TEST_DATABASE_URL, REDIS_URL: safe.REDIS_TEST_URL })).toThrow("explicit");
  });
  it("rejects nonlocal PostgreSQL, a non-test database, and connection overrides", () => {
    for (const url of ["postgres://postgres:fixture@production.example/outbox_test", "postgres://postgres:fixture@127.0.0.1/lobbystack", `${safe.LOBBYSTACK_RELIABILITY_TEST_DATABASE_URL}?host=production.example`]) {
      expect(() => integrationEnvironment({ ...safe, LOBBYSTACK_RELIABILITY_TEST_DATABASE_URL: url })).toThrow();
    }
  });
  it("rejects nonlocal Redis and hostname or query disguises", () => {
    for (const url of ["redis://production.example:6379", "redis://127.0.0.1.production.example:6379", `${safe.REDIS_TEST_URL}?host=production.example`]) {
      expect(() => integrationEnvironment({ ...safe, REDIS_TEST_URL: url })).toThrow("loopback");
    }
  });
});

describe.skipIf(!enabled)("outbox recovery with real BullMQ, Redis, and PostgreSQL dispatcher receipts", () => {
  let admin: ReturnType<typeof createDatabaseClient>;
  let dispatcherDb: Database;
  let queue: ReturnType<typeof createQueue> | undefined;
  let prefix = "";
  let aggregateType = "";
  const fixtureIds: string[] = [];
  const workers: Array<{ worker: Worker<JobEnvelope>; run: Promise<void> }> = [];

  beforeAll(async () => {
    // Read-only connectivity preflight precedes all test queue/data creation.
    const probe = new Redis(environment!.redisUrl, { lazyConnect: true, connectTimeout: 2000, maxRetriesPerRequest: 1, retryStrategy: () => null });
    probe.on("error", () => undefined);
    try {
      await probe.connect();
      expect(await probe.ping()).toBe("PONG");
    } finally {
      probe.disconnect();
    }
    admin = createDatabaseClient("lobbystack_migrator", { DATABASE_URL: environment!.postgresUrl });
    expect((await admin.pool.query<{ name: string }>("select current_database() as name")).rows[0]?.name).toMatch(/test/i);
    // Fixtures use the isolated admin connection. The code under test always
    // executes with the actual dispatcher role and normal dispatcher RLS context.
    dispatcherDb = {
      transaction: (run: (tx: DatabaseTransaction) => Promise<unknown>) => admin.db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL ROLE lobbystack_dispatcher`);
        return await run(tx);
      }),
    } as Database;
    await dispatcherDb.transaction(async (tx) => {
      const effective = await tx.execute(sql`select current_user as role`);
      expect(effective.rows[0]).toMatchObject({ role: "lobbystack_dispatcher" });
    });
  }, 15_000);

  beforeEach(async () => {
    // Dispatcher/recovery APIs claim global batches. Refuse to run alongside
    // another test's publishable rows instead of touching unrelated fixtures.
    const existing = await admin.pool.query<{ count: string }>(`
      select count(*)::text as count from public.outbox_messages
      where dead_lettered_at is null and (
        (published_at is null and available_at <= now()) or
        (delivery_tracked and completed_at is null and published_at <= now() - interval '1 minute'
          and (recovery_checked_at is null or recovery_checked_at <= now() - interval '1 minute'))
      )
    `);
    expect(existing.rows[0]?.count, "The TEST database must have no unrelated claimable outbox fixtures").toBe("0");
    const id = randomUUID();
    prefix = `outbox-recovery-test-${id}`;
    aggregateType = `outbox_redis_test_${id}`;
    queue = createQueue("default", { url: environment!.redisUrl, prefix });
    await queue.waitUntilReady();
  }, 15_000);

  afterEach(async () => {
    try {
      for (const { worker, run } of workers.splice(0)) {
        const client = await worker.client;
        await worker.close();
        await run;
        client.disconnect();
      }
      if (queue) {
        const client = await queue.client;
        try {
          await loseOnlyTestQueue();
          let cursor = "0";
          const remainingKeys: string[] = [];
          do {
            const result = await client.scan(cursor, { MATCH: `${prefix}:*`, COUNT: 100 });
            cursor = result[0];
            remainingKeys.push(...result[1]);
          } while (cursor !== "0");
          expect(remainingKeys).toEqual([]);
        } finally {
          await queue.close();
          client.disconnect();
          queue = undefined;
        }
      }
    } finally {
      if (fixtureIds.length) {
        const ids = fixtureIds.splice(0);
        await admin.db.delete(outboxMessages).where(and(inArray(outboxMessages.id, ids), eq(outboxMessages.aggregateType, aggregateType)));
        expect((await admin.db.select({ id: outboxMessages.id }).from(outboxMessages).where(inArray(outboxMessages.id, ids))).length).toBe(0);
      }
    }
  }, 15_000);

  afterAll(async () => {
    await admin?.pool.end();
  });

  async function loseOnlyTestQueue(): Promise<void> {
    if (!queue || queue.name !== "default" || queue.opts.prefix !== prefix || !/^outbox-recovery-test-[0-9a-f-]{36}$/.test(prefix)) {
      throw new Error("Refusing to remove a queue outside this generated TEST namespace");
    }
    // Deliberately lose this queue, including its job hashes. Never FLUSH Redis.
    await queue.obliterate({ force: true });
  }

  async function publishedFixture() {
    const id = randomUUID();
    const dedupeKey = `${aggregateType}:${id}`;
    fixtureIds.push(id);
    await admin.db.insert(outboxMessages).values({ id, dedupeKey, topic: "snapshot.refresh", aggregateType, payload: { integrationFixture: id } });
    expect(await new OutboxDispatcher(dispatcherDb, new Map([["default", queue!]]), { trackExecution: true }).dispatchOnce()).toBe(1);
    const stored = await receipt(id);
    expect(stored).toMatchObject({ deliveryTracked: true, deliveryVersion: 0, executionStartedAt: null, completedAt: null });
    expect(stored.publishedAt).not.toBeNull();
    const jobId = jobIdFor("snapshot.refresh", dedupeKey);
    expect(await queue!.getJob(jobId)).toBeDefined();
    return { id, dedupeKey, jobId };
  }

  async function ageReceipt(id: string): Promise<void> {
    await admin.db.update(outboxMessages).set({ publishedAt: new Date("2000-01-01T00:00:00Z"), recoveryCheckedAt: null })
      .where(and(eq(outboxMessages.id, id), eq(outboxMessages.aggregateType, aggregateType)));
  }

  async function receipt(id: string) {
    const rows = await admin.db.select().from(outboxMessages).where(and(eq(outboxMessages.id, id), eq(outboxMessages.aggregateType, aggregateType)));
    expect(rows).toHaveLength(1);
    return rows[0]!;
  }

  async function consume(processor: (job: Job<JobEnvelope>) => Promise<unknown>): Promise<void> {
    // This bounded provider-free processor exercises the same public receipt
    // boundary as index.ts. Importing index.ts would boot all real providers.
    const worker = new Worker<JobEnvelope>("default", processor, createWorkerOptions("default", { url: environment!.redisUrl, prefix, concurrency: 1, autorun: false }));
    worker.on("error", () => undefined);
    const run = worker.run();
    workers.push({ worker, run });
    await worker.waitUntilReady();
  }

  async function completedJob(id: string): Promise<Job<JobEnvelope>> {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const job = await queue!.getJob(id);
      if (job && await job.getState() === "completed") return job;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error("The TEST consumer did not complete its BullMQ job");
  }

  it("replays a genuinely missing never-started job, keeps its business key, and fences the stale original", async () => {
    const row = await publishedFixture();
    await loseOnlyTestQueue();
    expect(await queue!.getJob(row.jobId)).toBeUndefined();
    expect((await receipt(row.id)).executionStartedAt).toBeNull();
    await ageReceipt(row.id);
    expect(await recoverOutboxDeliveries(dispatcherDb, new Map([["default", queue!]]))).toEqual({ replayed: 1, quarantined: 0, acknowledged: 0 });
    const replayId = jobIdFor("snapshot.refresh", row.dedupeKey, 1);
    expect(replayId).not.toBe(row.jobId);
    expect((await queue!.getJob(replayId))?.data).toMatchObject({ outboxId: row.id, outboxVersion: 1, idempotencyKey: row.dedupeKey });
    expect((await receipt(row.id)).deliveryVersion).toBe(1);
    expect(await startOutboxExecution(dispatcherDb, row.id, row.dedupeKey, 0)).toBe(false);
    await completeOutboxExecution(dispatcherDb, row.id, row.dedupeKey, 0);
    expect((await receipt(row.id)).completedAt).toBeNull();
    // A late original really returns to Redis after recovery reserved version 1.
    await enqueueJob(queue!, { type: "snapshot.refresh", payload: {}, idempotencyKey: row.dedupeKey, outboxId: row.id, outboxVersion: 0 });
    const effects: number[] = [];
    await consume(async (job) => {
      if (!await startOutboxExecution(dispatcherDb, job.data.outboxId!, job.data.idempotencyKey, job.data.outboxVersion)) return { status: "skipped" };
      effects.push(job.data.outboxVersion!);
      await completeOutboxExecution(dispatcherDb, job.data.outboxId!, job.data.idempotencyKey, job.data.outboxVersion);
      return { status: "completed" };
    });
    expect((await completedJob(replayId)).returnvalue).toEqual({ status: "completed" });
    expect((await completedJob(row.jobId)).returnvalue).toEqual({ status: "skipped" });
    expect(effects).toEqual([1]);
    expect((await receipt(row.id)).completedAt).not.toBeNull();
  }, 25_000);

  it("quarantines a missing job with a durable start receipt instead of replaying its uncertain effect", async () => {
    const row = await publishedFixture();
    // This receipt is the real production boundary written before a provider
    // call. Simulate the crash after that boundary, without calling a provider.
    expect(await startOutboxExecution(dispatcherDb, row.id, row.dedupeKey, 0)).toBe(true);
    await loseOnlyTestQueue();
    expect(await queue!.getJob(row.jobId)).toBeUndefined();
    await ageReceipt(row.id);
    expect(await recoverOutboxDeliveries(dispatcherDb, new Map([["default", queue!]]))).toEqual({ replayed: 0, quarantined: 1, acknowledged: 0 });
    const stored = await receipt(row.id);
    expect(stored).toMatchObject({ deliveryVersion: 0, completedAt: null, lastError: "REDIS_LOSS_AFTER_EXECUTION_STARTED" });
    expect(stored.executionStartedAt).not.toBeNull();
    expect(stored.deadLetteredAt).not.toBeNull();
    expect(await queue!.getJob(jobIdFor("snapshot.refresh", row.dedupeKey, 1))).toBeUndefined();
    expect(await queue!.getWaitingCount()).toBe(0);
    expect(await startOutboxExecution(dispatcherDb, row.id, row.dedupeKey, 0)).toBe(false);
  }, 25_000);

  it("acknowledges a real completed BullMQ job and suppresses it after later Redis loss", async () => {
    const row = await publishedFixture();
    let effects = 0;
    await consume(async (job) => {
      if (!await startOutboxExecution(dispatcherDb, job.data.outboxId!, job.data.idempotencyKey, job.data.outboxVersion)) return { status: "skipped" };
      effects += 1;
      // Leave the PG acknowledgement absent to exercise recovery's completed
      // queue branch; the effect is only this local counter.
      return { status: "completed" };
    });
    expect((await completedJob(row.jobId)).returnvalue).toEqual({ status: "completed" });
    expect((await receipt(row.id)).completedAt).toBeNull();
    await ageReceipt(row.id);
    expect(await recoverOutboxDeliveries(dispatcherDb, new Map([["default", queue!]]))).toEqual({ replayed: 0, quarantined: 0, acknowledged: 1 });
    expect((await receipt(row.id)).completedAt).not.toBeNull();
    const { worker, run } = workers.pop()!;
    const client = await worker.client;
    await worker.close();
    await run;
    client.disconnect();
    await loseOnlyTestQueue();
    expect(await queue!.getJob(row.jobId)).toBeUndefined();
    await ageReceipt(row.id);
    expect(await recoverOutboxDeliveries(dispatcherDb, new Map([["default", queue!]]))).toEqual({ replayed: 0, quarantined: 0, acknowledged: 0 });
    expect(await startOutboxExecution(dispatcherDb, row.id, row.dedupeKey, 0)).toBe(false);
    expect(effects).toBe(1);
    expect(await queue!.getWaitingCount()).toBe(0);
  }, 25_000);
});
