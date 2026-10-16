import { afterEach, describe, expect, it, vi } from "vitest";
import { SmtpEmailProvider } from "./smtp";

afterEach(() => vi.unstubAllEnvs());
const config = { host: "localhost", port: 1025, secure: false, username: "", password: "", from: "no-reply@example.test" };

describe("SMTP delivery", () => {
  it("blocks unapproved certification recipients before SMTP delivery", async () => {
    vi.stubEnv("LOBBYSTACK_CERTIFICATION_MODE", "true");
    vi.stubEnv("LOBBYSTACK_CERTIFICATION_EMAILS", "approved@example.invalid");
    const sendMail = vi.fn().mockResolvedValue({ messageId: "fixture" });
    const provider = new SmtpEmailProvider(config, { sendMail } as never);
    await expect(provider.sendTemplate({ template: "operator_alert", to: "other@example.invalid", subject: "Test", variables: {} })).rejects.toThrow("CERTIFICATION_RECIPIENT_BLOCKED");
    expect(sendMail).not.toHaveBeenCalled();
    await provider.sendTemplate({ template: "operator_alert", to: "approved@example.invalid", subject: "Test", variables: {} });
    expect(sendMail).toHaveBeenCalledOnce();
  });
  it("keeps the founder follow-up plain text and preserves sender and reply-to", async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: "provider-id" });
    const provider = new SmtpEmailProvider({ ...config, replyTo: "support@example.test" }, { sendMail } as never);
    await provider.sendTemplate({ template: "onboarding_followup", to: "owner@example.test", from: "William <founder@example.test>", subject: "How did you like Caléonis Receptionist?", variables: { locale: "en", firstName: "Sam", businessName: "Acme", senderName: "William" } });
    const sent = sendMail.mock.calls[0]?.[0];
    expect(sent.from).toBe("William <founder@example.test>");
    expect(sent.replyTo).toBeUndefined();
    expect(sent.html).toBeUndefined();
    expect(sent.text).toMatch(/^Hi Sam,\n/);
    expect(sent.text).toContain("I'm William, the founder of Caléonis Receptionist. You set up a receptionist for Acme yesterday.");
    expect(sent.text).toContain("3. Do you plan to use it for real, with your own phone number?");
    expect(sent.text).toContain("You can reply to this email, and two lines would be plenty!\n\nThanks again,\nWilliam\nFounder, Caléonis Receptionist");
    await provider.sendTemplate({ template: "onboarding_followup", to: "owner@example.test", subject: "Votre avis", variables: { locale: "fr", firstName: "", businessName: "Entreprise", senderName: "William" } });
    const french = sendMail.mock.calls[1]?.[0];
    expect(french.from).toBe(config.from);
    expect(french.replyTo).toBe("support@example.test");
    expect(french.text).toMatch(/^Bonjour,\n/);
    expect(french.text).toContain("une réceptionniste pour Entreprise hier");
  });
  it("sends reset codes and preserves previously issued signed links", async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: "provider-id" });
    const provider = new SmtpEmailProvider(config, { sendMail } as never);
    await provider.sendTemplate({ template: "password_reset", to: "recipient@example.test", subject: "Reset", variables: { code: "123456" } });
    expect(sendMail.mock.calls[0]?.[0].text).toBe("Your Caléonis Receptionist password reset code is: 123456. It expires in 10 minutes.");
    await provider.sendTemplate({ template: "password_reset", to: "recipient@example.test", subject: "Reset", variables: { url: "https://example.test/reset?token=signed%2Bvalue" } });
    expect(sendMail.mock.calls[1]?.[0].text).toContain("using this link: https://example.test/reset?token=signed%2Bvalue");
  });
  it("sends localized verification HTML and preserves email-change links", async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: "provider-id" });
    const provider = new SmtpEmailProvider(config, { sendMail } as never);
    await provider.sendTemplate({ template: "verify_email", to: "recipient@example.test", subject: "Verify", variables: { code: "123456" } });
    expect(sendMail.mock.calls[0]?.[0].text).toBe("Your Caléonis Receptionist email verification code is: 123456. It expires in 10 minutes.");
    expect(sendMail.mock.calls[0]?.[0].html).toContain("Caléonis Receptionist");
    expect(sendMail.mock.calls[0]?.[0].html).not.toContain("<svg");
    expect(sendMail.mock.calls[0]?.[0].html).toContain("Verify your email address");
    expect(sendMail.mock.calls[0]?.[0].html).toContain(">123456</p>");
    await provider.sendTemplate({ template: "verify_email", to: "recipient@example.test", subject: "Verify", variables: { url: "https://example.test/verify" } });
    expect(sendMail.mock.calls[1]?.[0].text).toContain("using this link: https://example.test/verify");
    expect(sendMail.mock.calls[1]?.[0].html).toBeUndefined();
    await provider.sendTemplate({ template: "verify_email", to: "recipient@example.test", subject: "Vérifiez votre email", variables: { locale: "fr", code: "654321" } });
    expect(sendMail.mock.calls[2]?.[0].html).toContain('<html lang="fr">');
    expect(sendMail.mock.calls[2]?.[0].text).toContain("Votre code de vérification Caléonis Receptionist");
  });
  it("escapes verification email content before rendering branded HTML", async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: "provider-id" });
    const provider = new SmtpEmailProvider(config, { sendMail } as never);
    await provider.sendTemplate({ template: "verify_email", to: "recipient@example.test", subject: "Verify <email>", variables: { code: "12<345" } });
    const html = sendMail.mock.calls[0]?.[0].html;
    expect(html).toContain("<title>Verify &lt;email&gt;</title>");
    expect(html).toContain(">12&lt;345</p>");
    expect(html).not.toContain(">12<345</p>");
  });
  it("uses the same stable privacy-safe Message-ID for retries", async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: "provider-id" });
    const provider = new SmtpEmailProvider(config, { sendMail } as never);
    const input = { template: "verify_email" as const, to: "recipient@example.test", subject: "Verify", variables: { url: "https://example.test/verify" }, idempotencyKey: "auth-email:stable" };
    await provider.sendTemplate(input);
    await provider.sendTemplate(input);
    const first = sendMail.mock.calls[0]?.[0].messageId;
    expect(first).toBe(sendMail.mock.calls[1]?.[0].messageId);
    expect(first).not.toContain("recipient");
  });
});
