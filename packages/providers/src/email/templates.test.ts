import { describe, expect, it } from "vitest";
import { renderTemplate, type TemplateName } from "./templates";

const templates: TemplateName[] = ["verify_email", "password_reset", "existing_account", "invitation", "operator_alert", "feedback_submission", "onboarding_followup"];
describe("transactional branding and language", () => {
  for (const locale of ["fr", "en"]) for (const template of templates) it(`${template} uses Caléonis in ${locale}`, () => {
    const result = renderTemplate(template, "Fixture", { locale, code: "123456", url: "https://example.invalid/signed?token=abc%2B123", signInUrl: "https://example.invalid/login", resetUrl: "https://example.invalid/reset", senderName: "William", businessName: "Fixture" });
    expect(result.text).toContain("Caléonis Receptionist");
    expect(result.text).not.toContain("LobbyStack");
    if (result.html) {
      expect(result.html).toContain(`<html lang="${locale}">`);
      expect(result.html).not.toMatch(/LobbyStack|<svg|<img|<script/i);
    }
  });
  it("does not rewrite user-provided content, signed links or sender identities", () => {
    const message = "Customer text mentions LobbyStack; keep it verbatim.";
    expect(renderTemplate("operator_alert", "Subject", { message, locale: "fr" }).text).toBe(message);
    expect(renderTemplate("feedback_submission", "Subject", { body: message }).text).toBe(message);
    const url = "https://example.invalid/confirm?email=test%2Bqa%40example.invalid&token=a%2Fb%2Bc";
    expect(renderTemplate("verify_email", "Verify", { url, locale: "fr" }).text.endsWith(url)).toBe(true);
  });
  it("normalizes regional languages and retains the historical English fallback", () => {
    expect(renderTemplate("verify_email", "Fixture", { code: "123456", locale: "fr-CA" }).html).toContain('<html lang="fr">');
    expect(renderTemplate("verify_email", "Fixture", { code: "123456", locale: "de" }).html).toContain('<html lang="en">');
  });
});
