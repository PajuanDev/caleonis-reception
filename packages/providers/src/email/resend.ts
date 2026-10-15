import { createHash } from "node:crypto";

import { assertCertificationRecipient } from "@lobbystack/shared";
import { renderTemplate, type EmailTemplateInput } from "./smtp";

type FailureReason = "configuration" | "idempotency_required" | "idempotency_window_expired" | "transport_uncertain" | "response_uncertain" | "rejected" | "rate_limited";
export const MAX_RESEND_IDEMPOTENCY_AGE_MS = 23 * 60 * 60_000;

/** Never carry a provider body, address, token, or original transport error. */
export class ResendEmailDeliveryError extends Error {
  readonly uncertain: boolean;
  readonly retryable: boolean;

  constructor(readonly reason: FailureReason, readonly httpStatus?: number) {
    super(`RESEND_EMAIL_${reason.toUpperCase()}${httpStatus ? `_${httpStatus}` : ""}`);
    this.name = "ResendEmailDeliveryError";
    this.uncertain = reason === "transport_uncertain" || reason === "response_uncertain" || reason === "idempotency_window_expired";
    this.retryable = reason === "rate_limited";
  }
}

export type ResendEmailConfig = { apiKey: string; from: string; replyTo?: string };
type EmailFetch = (url: string, init: RequestInit) => Promise<Response>;

export class ResendEmailProvider {
  constructor(private readonly config: ResendEmailConfig, private readonly request: EmailFetch = fetch) {
    if (!config.apiKey.trim() || !config.from.trim()) throw new ResendEmailDeliveryError("configuration");
  }

  async sendTemplate(input: EmailTemplateInput): Promise<{ messageId: string }> {
    assertCertificationRecipient("email", input.to);
    // Provider keys expire after 24 hours. Unknown outcomes must therefore stop
    // in the worker for review, rather than relying on indefinite deduplication.
    if (!input.idempotencyKey?.trim()) throw new ResendEmailDeliveryError("idempotency_required");
    const queuedAt = input.idempotencyCreatedAtMs;
    if (queuedAt === undefined || !Number.isFinite(queuedAt) || queuedAt <= 0 || queuedAt > Date.now() + 60_000 || Date.now() - queuedAt >= MAX_RESEND_IDEMPOTENCY_AGE_MS) throw new ResendEmailDeliveryError("idempotency_window_expired");
    const digest = createHash("sha256").update(input.idempotencyKey).digest("hex");
    const email = renderTemplate(input.template, input.subject, input.variables);
    const replyTo = input.from ? input.replyTo : input.replyTo ?? this.config.replyTo;
    let response: Response;
    try {
      response = await this.request("https://api.resend.com/emails", {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
        headers: {
          authorization: `Bearer ${this.config.apiKey}`,
          "content-type": "application/json",
          "idempotency-key": `email-${digest}`,
        },
        body: JSON.stringify({
          from: input.from ?? this.config.from,
          to: [input.to],
          subject: input.subject,
          text: email.text,
          ...(email.html ? { html: email.html } : {}),
          ...(replyTo ? { reply_to: replyTo } : {}),
          headers: { "Message-ID": `<${digest}@mail.lobbystack.internal>` },
        }),
      });
    } catch {
      throw new ResendEmailDeliveryError("transport_uncertain");
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      if (response.status === 429) throw new ResendEmailDeliveryError("rate_limited", response.status);
      if (response.status >= 500 || response.status === 409) throw new ResendEmailDeliveryError("response_uncertain", response.status);
      throw new ResendEmailDeliveryError("rejected", response.status);
    }
    let payload: unknown;
    try { payload = await response.json(); } catch { throw new ResendEmailDeliveryError("response_uncertain"); }
    const id = typeof payload === "object" && payload !== null && "id" in payload ? payload.id : undefined;
    if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new ResendEmailDeliveryError("response_uncertain");
    return { messageId: id };
  }
}
