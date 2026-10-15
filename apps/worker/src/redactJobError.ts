import { redactOtelExceptionText } from "@lobbystack/telemetry/node";
import { ResendEmailDeliveryError } from "@lobbystack/providers";
import { UnrecoverableError } from "bullmq";
import { EmailDeliveryClaimReleaseError, EmailDeliveryClaimStateError, EmailDeliveryReceiptPersistenceError } from "./emailDeliveryReceipt";

// BullMQ persists a failed job's message and stack in Redis. Redact in place so
// the error keeps its class and name, which BullMQ uses to recognize
// UnrecoverableError, DelayedError, and similar control-flow errors.
export function redactJobError(error: unknown): unknown {
  if (error instanceof EmailDeliveryReceiptPersistenceError || error instanceof EmailDeliveryClaimReleaseError || error instanceof EmailDeliveryClaimStateError) return new UnrecoverableError(error.message);
  if (error instanceof ResendEmailDeliveryError && !error.retryable) {
    return new UnrecoverableError(error.uncertain ? "EMAIL_DELIVERY_UNCERTAIN_REQUIRES_REVIEW" : "EMAIL_DELIVERY_REJECTED_REQUIRES_REVIEW");
  }
  if (!(error instanceof Error)) return error;
  // Define own properties: DOMException (e.g. AbortSignal.timeout) exposes
  // `message` as a getter-only accessor, so plain assignment throws.
  Object.defineProperty(error, "message", { value: redactOtelExceptionText(error.message), writable: true, configurable: true });
  if (error.stack) Object.defineProperty(error, "stack", { value: error.stack.split("\n").slice(0, 30).map(redactOtelExceptionText).join("\n"), writable: true, configurable: true });
  return error;
}
