import { UnrecoverableError } from "bullmq";
import { describe, expect, it } from "vitest";
import { ResendEmailDeliveryError, ResendEmailProvider } from "@lobbystack/providers";

import { redactJobError } from "./redactJobError";

describe("redactJobError", () => {
  it("stops automatic BullMQ retries when the real email provider loses its response", async () => {
    const provider = new ResendEmailProvider({ apiKey: "fixture-secret", from: "service@example.test" }, async () => { throw new Error("private-provider-body"); });
    const error = await provider.sendTemplate({ template: "operator_alert", to: "owner@example.test", subject: "Test", variables: {}, idempotencyKey: "stable-fixture", idempotencyCreatedAtMs: Date.now() }).catch(value => value);
    const terminal = redactJobError(error);
    expect(terminal).toBeInstanceOf(UnrecoverableError);
    expect((terminal as Error).message).toBe("EMAIL_DELIVERY_UNCERTAIN_REQUIRES_REVIEW");
    expect(String((terminal as Error).stack)).not.toContain("private-provider-body");
  });
  it("keeps explicit rate limits retryable while making provider rejections terminal", () => {
    const limited = new ResendEmailDeliveryError("rate_limited", 429);
    expect(redactJobError(limited)).toBe(limited);
    expect(redactJobError(new ResendEmailDeliveryError("rejected", 403))).toBeInstanceOf(UnrecoverableError);
  });
  it("drops Drizzle query parameters from the message and stack BullMQ stores", () => {
    const error = new Error("Failed query: insert into \"calendar_connections\" values ($1, $2)\nparams: biz-1,encrypted-access-token");
    expect(redactJobError(error)).toBe(error);
    expect(error.message).toContain("params: [omitted]");
    expect(error.message).not.toContain("encrypted-access-token");
    expect(error.stack).not.toContain("encrypted-access-token");
    expect(error.stack).toContain("redactJobError.test.ts");
  });

  it("keeps the error class so BullMQ still treats it as unrecoverable", () => {
    const error = new UnrecoverableError("Contact owner@example.com is invalid.");
    const redacted = redactJobError(error);
    expect(redacted).toBeInstanceOf(UnrecoverableError);
    expect((redacted as Error).name).toBe("UnrecoverableError");
    expect((redacted as Error).message).toBe("Contact [redacted-email] is invalid.");
  });

  it("redacts a DOMException timeout without replacing it", () => {
    const error = new DOMException("Timed out calling owner@example.com", "TimeoutError");
    expect(redactJobError(error)).toBe(error);
    expect(error.name).toBe("TimeoutError");
    expect(error.message).toBe("Timed out calling [redacted-email]");
  });
});
