import { createHash } from "node:crypto";
import { ResendEmailDeliveryError } from "@lobbystack/providers";

export class EmailDeliveryClaimStateError extends Error {
  constructor() {
    super("EMAIL_DELIVERY_CLAIM_STATE_REQUIRES_REVIEW");
    this.name = "EmailDeliveryClaimStateError";
  }
}

export class EmailDeliveryClaimReleaseError extends Error {
  constructor() {
    super("EMAIL_DELIVERY_RELEASE_STATE_REQUIRES_REVIEW");
    this.name = "EmailDeliveryClaimReleaseError";
  }
}

export class EmailDeliveryReceiptPersistenceError extends Error {
  constructor(providerMessageId: string) {
    // Resend IDs are safe opaque references for reconciliation. For other
    // transports retain a fingerprint, never an arbitrary provider string.
    const reference = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(providerMessageId)
      ? providerMessageId : `sha256-${createHash("sha256").update(providerMessageId).digest("hex")}`;
    super(`EMAIL_DELIVERY_RECEIPT_NOT_PERSISTED:${reference}`);
    this.name = "EmailDeliveryReceiptPersistenceError";
  }
}

export async function persistEmailReceipt(providerMessageId: string, persist: () => Promise<boolean>): Promise<void> {
  try {
    if (!await persist()) throw new Error("Receipt row was not updated.");
  } catch {
    throw new EmailDeliveryReceiptPersistenceError(providerMessageId);
  }
}

export async function releaseEmailClaimAfterError(error: unknown, release: () => Promise<unknown>): Promise<void> {
  try {
    const released = await release();
    if (error instanceof ResendEmailDeliveryError && error.retryable && released !== true) throw new EmailDeliveryClaimReleaseError();
  } catch (cleanupError) {
    if (!(error instanceof ResendEmailDeliveryError)) throw cleanupError;
    // A retry is safe only after restoring the claim. Otherwise a later claim
    // can return false and incorrectly acknowledge an unsent notification.
    if (error.retryable) throw new EmailDeliveryClaimReleaseError();
    // Preserve the original terminal/uncertain provider error for review.
  }
}
