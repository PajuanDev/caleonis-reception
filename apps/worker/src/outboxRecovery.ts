import { claimOutboxRecoveryBatch, completeOutboxExecution, prepareOutboxReplay, quarantineOutboxExecution, type Database } from "@lobbystack/db";
import { enqueueJob, isKnownJobType, jobIdFor, queueForJobType, type createQueue } from "@lobbystack/jobs";

// A missing job is replayable only if the DB proves it never started. Once a
// handler started, an external side effect may have succeeded before a crash.
// Quarantine that ambiguity instead of silently losing it or charging twice.
export async function recoverOutboxDeliveries(db: Database, queues: Map<string, ReturnType<typeof createQueue>>): Promise<{ replayed: number; quarantined: number; acknowledged: number }> {
  const result = { replayed: 0, quarantined: 0, acknowledged: 0 };
  for (const row of await claimOutboxRecoveryBatch(db)) {
    if (!isKnownJobType(row.topic)) continue;
    const queue = queues.get(queueForJobType[row.topic]);
    if (!queue) continue;
    const job = await queue.getJob(jobIdFor(row.topic, row.dedupeKey, row.deliveryVersion));
    if (!job) {
      const prepared = await prepareOutboxReplay(db, row.id, row.dedupeKey, row.deliveryVersion);
      if (prepared.state === "quarantined") {
        result.quarantined += 1;
      } else if (prepared.state === "replay") {
        await enqueueJob(queue, { type: row.topic, businessId: row.businessId ?? undefined, payload: row.payload, trace: { ...(row.traceparent ? { traceparent: row.traceparent } : {}), ...(row.tracestate ? { tracestate: row.tracestate } : {}) }, idempotencyKey: row.dedupeKey, outboxId: row.id, outboxVersion: prepared.row.deliveryVersion });
        result.replayed += 1;
      }
    } else {
      const state = await job.getState();
      if (state === "completed") {
        await completeOutboxExecution(db, row.id, row.dedupeKey, row.deliveryVersion);
        result.acknowledged += 1;
      } else if (state === "failed") {
        await quarantineOutboxExecution(db, row.id, "QUEUE_TERMINAL_FAILURE", row.deliveryVersion);
        result.quarantined += 1;
      }
    }
  }
  return result;
}
