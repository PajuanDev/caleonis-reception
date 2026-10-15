import { describe, expect, it, vi } from "vitest";
import { ResendEmailDeliveryError } from "@lobbystack/providers";
import { UnrecoverableError } from "bullmq";
import { EmailDeliveryClaimReleaseError, EmailDeliveryReceiptPersistenceError, persistEmailReceipt, releaseEmailClaimAfterError } from "./emailDeliveryReceipt";
import { redactJobError } from "./redactJobError";

describe("email delivery persistence", () => {
  it.each(["missing", "throw"])("retains the receipt and stops retries when persistence is %s", async mode => {
    const receipt = "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794";
    const persist = mode === "missing" ? vi.fn().mockResolvedValue(false) : vi.fn().mockRejectedValue(new Error("private DB text"));
    const error = await persistEmailReceipt(receipt, persist).catch(value => value);
    expect(error).toBeInstanceOf(EmailDeliveryReceiptPersistenceError);
    expect(redactJobError(error)).toBeInstanceOf(UnrecoverableError);
    expect((error as Error).message).toBe(`EMAIL_DELIVERY_RECEIPT_NOT_PERSISTED:${receipt}`);
    expect(persist).toHaveBeenCalledOnce();
  });

  it("fingerprints arbitrary SMTP receipts without retaining private text", () => {
    const error = new EmailDeliveryReceiptPersistenceError("private@example.test");
    expect(error.message).toMatch(/^EMAIL_DELIVERY_RECEIPT_NOT_PERSISTED:sha256-[a-f0-9]{64}$/);
    expect(error.message).not.toContain("private");
  });

  it("allows an explicit rate-limit retry only after the claim is released", async () => {
    await expect(releaseEmailClaimAfterError(new ResendEmailDeliveryError("rate_limited", 429), vi.fn().mockResolvedValue(true))).resolves.toBeUndefined();
    for (const release of [vi.fn().mockResolvedValue(false), vi.fn().mockRejectedValue(new Error("DB unavailable"))]) {
      const error = await releaseEmailClaimAfterError(new ResendEmailDeliveryError("rate_limited", 429), release).catch(value => value);
      expect(error).toBeInstanceOf(EmailDeliveryClaimReleaseError);
      expect(redactJobError(error)).toBeInstanceOf(UnrecoverableError);
    }
  });

  it.each(["transport_uncertain", "rejected"] as const)("preserves %s provider decisions after a failed release", async reason => {
    await expect(releaseEmailClaimAfterError(new ResendEmailDeliveryError(reason), vi.fn().mockRejectedValue(new Error("DB unavailable")))).resolves.toBeUndefined();
  });

  it("preserves existing cleanup failure behavior for other providers", async () => {
    const cleanupError = new Error("SMTP cleanup failure");
    await expect(releaseEmailClaimAfterError(new Error("SMTP failure"), vi.fn().mockRejectedValue(cleanupError))).rejects.toBe(cleanupError);
  });
});
