import { describe, expect, it } from "vitest";
import { authEmailSubject } from "./auth-email-copy";

describe("authentication email subjects", () => {
  for (const purpose of ["verification", "verification_code", "password_reset", "email_change", "existing_account"] as const) {
    it(`${purpose} is localized and branded`, () => {
      expect(authEmailSubject(purpose, "fr")).toContain("Caléonis Receptionist");
      expect(authEmailSubject(purpose, "en")).toContain("Caléonis Receptionist");
      expect(authEmailSubject(purpose, "fr")).not.toBe(authEmailSubject(purpose, "en"));
      expect(authEmailSubject(purpose, "fr-FR")).toBe(authEmailSubject(purpose, "fr"));
      expect(authEmailSubject(purpose, null)).toBe(authEmailSubject(purpose, "en"));
    });
  }
});
