import { afterEach, describe, expect, it, vi } from "vitest";
import { ResendEmailProvider, SmtpEmailProvider } from "@lobbystack/providers";
import { createEmailProvider } from "./emailProvider";

afterEach(() => vi.restoreAllMocks());

describe("worker email transport selection", () => {
  it("keeps SMTP as the default", () => {
    expect(createEmailProvider({ SMTP_HOST: "localhost", EMAIL_FROM: "Service <service@example.test>" })).toBeInstanceOf(SmtpEmailProvider);
  });
  it("selects HTTPS only when explicitly configured", () => {
    expect(createEmailProvider({ EMAIL_PROVIDER: "resend", RESEND_API_KEY: "fixture-key", EMAIL_FROM: "service@example.test" })).toBeInstanceOf(ResendEmailProvider);
  });
  it("does not fall back to SMTP for an incomplete or invalid HTTPS configuration", () => {
    expect(() => createEmailProvider({ EMAIL_PROVIDER: "resend", SMTP_HOST: "localhost" })).toThrow("RESEND_API_KEY and EMAIL_FROM");
    expect(() => createEmailProvider({ EMAIL_PROVIDER: "unknown", SMTP_HOST: "localhost" })).toThrow("smtp or resend");
  });
  it("retains the disabled default when no SMTP host is set", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(createEmailProvider({})).toBeUndefined();
    expect(warning).toHaveBeenCalledOnce();
  });
});
