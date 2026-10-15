import { describe, expect, it, vi } from "vitest";

import { jobEnvelopeSchema, jobQueues, jobTypes } from "@lobbystack/contracts";

import { enqueueJob, createWorkerOptions, isKnownJobType, jobEnvelopeSchema as reexportedEnvelopeSchema, jobQueues as reexportedQueues, jobTypes as reexportedTypes, queueForJobType } from "./index";

const UUID_V5_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function createQueueStub(name = "default") {
  const add = vi.fn(async () => ({ id: "job" }));
  return { queue: { name, add } as never, add };
}

describe("job queue contracts", () => {
  it("re-exports the contract enums without redefining them", () => {
    expect(reexportedEnvelopeSchema).toBe(jobEnvelopeSchema);
    expect(reexportedQueues).toBe(jobQueues);
    expect(reexportedTypes).toBe(jobTypes);
  });

  it("routes every known job type to a declared queue", () => {
    expect(Object.keys(queueForJobType).sort()).toEqual([...jobTypes].sort());
    for (const type of jobTypes) {
      const queue = queueForJobType[type];
      expect(jobQueues).toContain(queue);
    }
  });

  it("recognizes only declared job types", () => {
    expect(isKnownJobType("email.send")).toBe(true);
    expect(isKnownJobType("not.a.job")).toBe(false);
  });

  it("uses queue-aware worker concurrency without opening a connection", () => {
    for (const [queue, expected] of [["bulk", 2], ["default", 8], ["critical", 8], ["maintenance", 8]] as const) {
      const options = createWorkerOptions(queue, { prefix: "test-prefix" });
      expect(options.concurrency).toBe(expected);
      expect(options.prefix).toBe("test-prefix");
      (options.connection as unknown as { disconnect: () => void }).disconnect();
    }
  });
});

describe("enqueueJob job ids", () => {
  it("derives a stable UUID job id from the type and idempotency key", async () => {
    const first = createQueueStub();
    const second = createQueueStub();

    const idA = await enqueueJob(first.queue, { type: "email.send", payload: { to: "a@example.com" }, idempotencyKey: "opaque-key" });
    const idB = await enqueueJob(second.queue, { type: "email.send", payload: { to: "b@example.com" }, idempotencyKey: "opaque-key" });

    expect(idA).toMatch(UUID_V5_PATTERN);
    expect(idA).toBe(idB);
    // The id depends on the type too, not just the key.
    const idC = await enqueueJob(first.queue, { type: "sms.send", payload: {}, idempotencyKey: "opaque-key" });
    expect(idC).not.toBe(idA);
  });

  it("sends a validated envelope and options to the queue", async () => {
    const { queue, add } = createQueueStub("critical");

    const jobId = await enqueueJob(queue, {
      type: "sms.send",
      businessId: "3f0f8c3e-1f3a-4a9a-8f3e-1f3a4a9a8f3e",
      payload: { notificationId: "notification-1" },
      trace: { traceparent: "00-abc-def-01" },
      idempotencyKey: "dispatch-key",
      delayMs: 60_000,
      attempts: 3,
    });

    expect(add).toHaveBeenCalledTimes(1);
    const [type, envelope, options] = add.mock.calls[0] as unknown as [string, unknown, { jobId: string; attempts: number; delay?: number; backoff: unknown }];
    expect(type).toBe("sms.send");
    expect(jobEnvelopeSchema.parse(envelope)).toMatchObject({
      jobId,
      type: "sms.send",
      queue: "critical",
      businessId: "3f0f8c3e-1f3a-4a9a-8f3e-1f3a4a9a8f3e",
      idempotencyKey: "dispatch-key",
      scheduled: true,
      trace: { traceparent: "00-abc-def-01" },
    });
    expect(options.jobId).toBe(jobId);
    expect(options.attempts).toBe(3);
    expect(options.delay).toBe(60_000);
    expect(options.backoff).toEqual({ type: "exponential", delay: 1000 });
  });

  it("defaults the business scope to null and omits delay for immediate jobs", async () => {
    const { queue, add } = createQueueStub();

    await enqueueJob(queue, { type: "email.send", payload: {}, idempotencyKey: "immediate" });

    const [, envelope, options] = add.mock.calls[0] as unknown as [string, unknown, { attempts: number; delay?: number }];
    expect(jobEnvelopeSchema.parse(envelope)).toMatchObject({ businessId: null, scheduled: false });
    expect(options.attempts).toBe(5);
    expect(options).not.toHaveProperty("delay");
  });

  it.each([[undefined, 12], [30, 12], [3, 3]])("bounds call pricing retries while leaving the job identity stable (%s)", async (attempts, expectedAttempts) => {
    const { queue, add } = createQueueStub("critical");
    const input = { type: "call.syncPrice" as const, payload: { callId: "call-1", providerCallStatus: "completed" }, idempotencyKey: "call:call-1:live-price" };
    const jobId = await enqueueJob(queue, { ...input, ...(attempts !== undefined ? { attempts } : {}) });
    const [, envelope, options] = add.mock.calls[0] as unknown as [string, unknown, { attempts: number; backoff: unknown; jobId: string }];
    expect(options).toMatchObject({ jobId, attempts: expectedAttempts, backoff: { type: "fixed", delay: 300_000 } });
    expect(envelope).toMatchObject({ idempotencyKey: input.idempotencyKey, scheduled: false });
    expect(await enqueueJob(queue, input)).toBe(jobId);
  });

  it("uses a new delivery job ID for a fenced replay while preserving business idempotency", async () => {
    const original = createQueueStub();
    const replay = createQueueStub();
    const input = { type: "email.send" as const, payload: {}, idempotencyKey: "stable-business-operation", outboxId: "00000000-0000-4000-8000-000000000001" };
    const originalId = await enqueueJob(original.queue, { ...input, outboxVersion: 0 });
    const replayId = await enqueueJob(replay.queue, { ...input, outboxVersion: 1 });
    expect(replayId).not.toBe(originalId);
    const [, originalEnvelope] = original.add.mock.calls[0] as unknown as [string, unknown];
    const [, replayEnvelope] = replay.add.mock.calls[0] as unknown as [string, unknown];
    expect(originalEnvelope).toMatchObject({ idempotencyKey: input.idempotencyKey, outboxVersion: 0 });
    expect(replayEnvelope).toMatchObject({ idempotencyKey: input.idempotencyKey, outboxVersion: 1 });
  });
});
