import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@lobbystack/db";
const mocks = vi.hoisted(() => ({ claim: vi.fn(), complete: vi.fn(), quarantine: vi.fn(), prepare: vi.fn(), enqueue: vi.fn() }));
vi.mock("@lobbystack/db", () => ({ claimOutboxRecoveryBatch: mocks.claim, completeOutboxExecution: mocks.complete, quarantineOutboxExecution: mocks.quarantine, prepareOutboxReplay: mocks.prepare }));
vi.mock("@lobbystack/jobs", async (importOriginal) => ({ ...(await importOriginal<typeof import("@lobbystack/jobs")>()), enqueueJob: mocks.enqueue }));
import { recoverOutboxDeliveries } from "./outboxRecovery";

describe("PostgreSQL outbox recovery after Redis loss", () => {
  const db = {} as Database;
  const row = { id: "00000000-0000-4000-8000-000000000001", topic: "email.send", businessId: null, payload: { message: "opaque" }, dedupeKey: "stable", traceparent: null, tracestate: null, executionStartedAt: null, deliveryVersion: 0 };
  beforeEach(() => vi.resetAllMocks());
  it("replays a missing queued job that never started with its original receipt and idempotency key", async () => {
    mocks.claim.mockResolvedValue([row]);
    mocks.prepare.mockResolvedValue({ state: "replay", row: { ...row, deliveryVersion: 1 } });
    const queue = { getJob: vi.fn().mockResolvedValue(undefined) };
    expect(await recoverOutboxDeliveries(db, new Map([["default", queue as never]]))).toEqual({ replayed: 1, quarantined: 0, acknowledged: 0 });
    expect(mocks.enqueue).toHaveBeenCalledWith(queue, expect.objectContaining({ outboxId: row.id, outboxVersion: 1, idempotencyKey: row.dedupeKey, payload: row.payload }));
    expect(mocks.quarantine).not.toHaveBeenCalled();
  });
  it("quarantines an ambiguous external side effect after Redis lost an active job", async () => {
    mocks.claim.mockResolvedValue([{ ...row, executionStartedAt: new Date() }]);
    mocks.prepare.mockResolvedValue({ state: "quarantined" });
    await recoverOutboxDeliveries(db, new Map([["default", { getJob: vi.fn().mockResolvedValue(undefined) } as never]]));
    expect(mocks.prepare).toHaveBeenCalledWith(db, row.id, row.dedupeKey, 0);
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
  it("leaves active/waiting/delayed jobs alone and persists terminal failure", async () => {
    for (const state of ["active", "waiting", "delayed", "failed"]) {
      mocks.claim.mockResolvedValue([row]);
      await recoverOutboxDeliveries(db, new Map([["default", { getJob: vi.fn().mockResolvedValue({ getState: vi.fn().mockResolvedValue(state) }) } as never]]));
    }
    expect(mocks.enqueue).not.toHaveBeenCalled();
    expect(mocks.quarantine).toHaveBeenCalledExactlyOnceWith(db, row.id, "QUEUE_TERMINAL_FAILURE", 0);
  });
  it("acknowledges a completed queue job without replay", async () => {
    mocks.claim.mockResolvedValue([row]);
    await recoverOutboxDeliveries(db, new Map([["default", { getJob: vi.fn().mockResolvedValue({ getState: vi.fn().mockResolvedValue("completed") }) } as never]]));
    expect(mocks.complete).toHaveBeenCalledWith(db, row.id, row.dedupeKey, 0);
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
  it("does not interpret a Redis outage as a lost job", async () => {
    mocks.claim.mockResolvedValue([row]);
    await expect(recoverOutboxDeliveries(db, new Map([["default", { getJob: vi.fn().mockRejectedValue(new Error("redis unavailable")) } as never]]))).rejects.toThrow("redis unavailable");
    expect(mocks.enqueue).not.toHaveBeenCalled();
    expect(mocks.quarantine).not.toHaveBeenCalled();
  });
  it("rechecks the durable receipt when the original starts after claim but before missing-job detection", async () => {
    mocks.claim.mockResolvedValue([row]);
    let originalStarted = false;
    const queue = { getJob: vi.fn(async () => { originalStarted = true; return undefined; }) };
    mocks.prepare.mockImplementation(async () => ({ state: originalStarted ? "quarantined" : "replay" }));
    expect(await recoverOutboxDeliveries(db, new Map([["default", queue as never]]))).toMatchObject({ quarantined: 1, replayed: 0 });
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
});
