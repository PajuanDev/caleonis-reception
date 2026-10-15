import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MAX_RESEND_IDEMPOTENCY_AGE_MS, ResendEmailDeliveryError, ResendEmailProvider } from "./resend";

const receipt = "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794";
const config = { apiKey: "test-secret-api-key", from: "Service <contact@example.test>", replyTo: "support@example.test" };
const input = { template: "operator_alert" as const, to: "owner@example.test", subject: "Test", variables: { message: "Fixture content" }, idempotencyKey: "private-owner@example.test:stable-job", idempotencyCreatedAtMs: Date.now() };
afterEach(() => vi.unstubAllEnvs());

describe("Resend HTTPS email", () => {
  it("returns the provider receipt, uses stable private keys and does not retry internally", async () => {
    const request = vi.fn().mockImplementation(async () => Response.json({ id: receipt }));
    const provider = new ResendEmailProvider(config, request);
    await expect(provider.sendTemplate(input)).resolves.toEqual({ messageId: receipt });
    await provider.sendTemplate(input);
    expect(request).toHaveBeenCalledTimes(2);
    const [url, options] = request.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(options).toMatchObject({ method: "POST", redirect: "error", headers: { authorization: "Bearer test-secret-api-key", "idempotency-key": `email-${createHash("sha256").update(input.idempotencyKey).digest("hex")}` } });
    expect(options.headers["idempotency-key"]).not.toContain("owner");
    expect(request.mock.calls[1]![1].headers["idempotency-key"]).toBe(options.headers["idempotency-key"]);
    expect(JSON.parse(options.body)).toMatchObject({ from: config.from, to: [input.to], text: input.variables.message, reply_to: config.replyTo });
  });

  it("preserves escaped verification HTML and per-message reply destinations", async () => {
    const request = vi.fn().mockImplementation(async () => Response.json({ id: receipt }));
    const provider = new ResendEmailProvider(config, request);
    await provider.sendTemplate({ ...input, template: "verify_email", subject: "Verify <email>", variables: { code: "12<345" }, from: "Founder <founder@example.test>" });
    const body = JSON.parse(request.mock.calls[0]![1].body);
    expect(body.from).toBe("Founder <founder@example.test>");
    expect(body.reply_to).toBeUndefined();
    expect(body.html).toContain("<title>Verify &lt;email&gt;</title>");
    expect(body.html).toContain(">12&lt;345</p>");
  });

  it("requires an idempotency key and approved certification recipient before network access", async () => {
    const request = vi.fn();
    const provider = new ResendEmailProvider(config, request);
    await expect(provider.sendTemplate({ ...input, idempotencyKey: "" })).rejects.toMatchObject({ reason: "idempotency_required", retryable: false });
    vi.stubEnv("LOBBYSTACK_CERTIFICATION_MODE", "true");
    vi.stubEnv("LOBBYSTACK_CERTIFICATION_EMAILS", "approved@example.invalid");
    await expect(provider.sendTemplate(input)).rejects.toThrow("CERTIFICATION_RECIPIENT_BLOCKED");
    expect(request).not.toHaveBeenCalled();
  });

  it("refuses old, missing or future enqueue times before provider keys can expire", async () => {
    const request = vi.fn();
    const provider = new ResendEmailProvider(config, request);
    const { idempotencyCreatedAtMs: _timestamp, ...withoutTime } = input;
    for (const time of [Date.now() - MAX_RESEND_IDEMPOTENCY_AGE_MS, undefined, Date.now() + 120_000]) {
      await expect(provider.sendTemplate(time === undefined ? withoutTime : { ...input, idempotencyCreatedAtMs: time })).rejects.toMatchObject({ reason: "idempotency_window_expired", uncertain: true, retryable: false });
    }
    expect(request).not.toHaveBeenCalled();
  });

  it("treats a lost response as uncertain and drops all original transport details", async () => {
    const request = vi.fn().mockRejectedValue(new Error("test-secret-api-key owner@example.test private message"));
    const error = await new ResendEmailProvider(config, request).sendTemplate(input).catch(value => value);
    expect(error).toBeInstanceOf(ResendEmailDeliveryError);
    expect(error).toMatchObject({ uncertain: true, retryable: false, message: "RESEND_EMAIL_TRANSPORT_UNCERTAIN" });
    expect(String(error.stack)).not.toContain("test-secret-api-key");
    expect(String(error.stack)).not.toContain("owner@example.test");
    expect(request).toHaveBeenCalledOnce();
  });

  it.each([409, 500, 503])("stops for review after an uncertain HTTP %s result", async status => {
    const request = vi.fn().mockResolvedValue(new Response("private-provider-body", { status }));
    await expect(new ResendEmailProvider(config, request).sendTemplate(input)).rejects.toMatchObject({ uncertain: true, retryable: false, httpStatus: status });
    expect(request).toHaveBeenCalledOnce();
  });

  it.each([new Response("not-json", { status: 200 }), Response.json({ id: "invalid-private-receipt" })])("requires a valid provider receipt before reporting success", async response => {
    await expect(new ResendEmailProvider(config, vi.fn().mockResolvedValue(response)).sendTemplate(input)).rejects.toMatchObject({ reason: "response_uncertain", uncertain: true, retryable: false });
  });

  it("makes permanent rejections terminal but lets the worker retry an explicit rate limit with the same key", async () => {
    await expect(new ResendEmailProvider(config, vi.fn().mockResolvedValue(new Response("secret-provider-error", { status: 403 }))).sendTemplate(input)).rejects.toMatchObject({ reason: "rejected", retryable: false, uncertain: false, message: "RESEND_EMAIL_REJECTED_403" });
    await expect(new ResendEmailProvider(config, vi.fn().mockResolvedValue(new Response("", { status: 429 }))).sendTemplate(input)).rejects.toMatchObject({ reason: "rate_limited", retryable: true, uncertain: false });
  });
});
