import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Database } from "@lobbystack/db";
import type { JobEnvelope } from "@lobbystack/contracts";

const mocks = vi.hoisted(() => ({ claimOutboxBatch: vi.fn(), markOutboxPublished: vi.fn(), markOutboxFailed: vi.fn() }));
vi.mock("@lobbystack/db", () => mocks);
vi.mock("@lobbystack/telemetry/node", () => ({
  getMeter: () => ({ createCounter: () => ({ add: vi.fn() }), createHistogram: () => ({ record: vi.fn() }) }),
  redactOtelExceptionText: (value: string) => value,
}));

// Keep the real @lobbystack/jobs enqueueJob: this exercises the durable
// publisher through to the actual BullMQ options, without opening Redis.
import { OutboxDispatcher } from "./outboxDispatcher";

describe("durable publisher pricing retry policy", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.markOutboxPublished.mockResolvedValue(true);
  });

  it.each([
    ["call.syncPrice", "critical", 12, "fixed", 300_000],
    ["sms.syncPrice", "critical", 5, "exponential", 1000],
    ["email.send", "default", 5, "exponential", 1000],
  ] as const)("publishes %s with its bounded policy and unchanged durable identity", async (topic, queueName, attempts, backoffType, delay) => {
    const row = { id: "00000000-0000-4000-8000-000000000001", topic, businessId: "00000000-0000-4000-8000-000000000002", aggregateType: "call", aggregateId: "00000000-0000-4000-8000-000000000003", dedupeKey: "same-business-operation", payload: { callId: "00000000-0000-4000-8000-000000000003", providerCallStatus: "completed" }, lockedBy: "dispatcher:fixture", lockedAt: new Date(), createdAt: new Date(), attempts: 1, deliveryTracked: true, deliveryVersion: 0 };
    mocks.claimOutboxBatch.mockResolvedValue([row]);
    const add = vi.fn(async () => ({ id: "queue-fixture" }));
    const queue = { name: queueName, add } as never;
    const database = {} as Database;
    const dispatcher = new OutboxDispatcher(database, new Map([[queueName, queue]]), { trackExecution: true });
    await dispatcher.dispatchOnce();
    await dispatcher.dispatchOnce();
    expect(add).toHaveBeenCalledTimes(2);
    const [firstType, firstEnvelope, firstOptions] = add.mock.calls[0] as unknown as [string, JobEnvelope, { attempts: number; backoff: unknown; jobId: string }];
    const [, secondEnvelope, secondOptions] = add.mock.calls[1] as unknown as [string, JobEnvelope, { jobId: string }];
    expect(firstType).toBe(topic);
    expect(firstOptions).toMatchObject({ attempts, backoff: { type: backoffType, delay } });
    expect(firstEnvelope).toMatchObject({ businessId: row.businessId, idempotencyKey: row.dedupeKey, outboxId: row.id, outboxVersion: 0 });
    expect(secondEnvelope).toEqual(firstEnvelope);
    expect(secondOptions.jobId).toBe(firstOptions.jobId);
    expect(mocks.markOutboxPublished).toHaveBeenCalledWith(database, row);
    expect(mocks.markOutboxFailed).not.toHaveBeenCalled();
  });
});
