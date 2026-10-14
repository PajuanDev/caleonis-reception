import { expect, it } from "vitest";

import { localizeMarketingHref } from "./marketing-site-url";

it("points legal links at the existing operator notices", () => {
  expect(localizeMarketingHref("en", "/terms")).toBe("https://www.caleonis.com/mentions-legales/");
  expect(localizeMarketingHref("fr", "/terms")).toBe("https://www.caleonis.com/mentions-legales/");
  expect(localizeMarketingHref("en", "/privacy")).toBe("https://www.caleonis.com/confidentialite/");
  expect(localizeMarketingHref("fr", "/privacy")).toBe("https://www.caleonis.com/confidentialite/");
});

it("leaves external and untranslated targets alone when the locale is English", () => {
  expect(localizeMarketingHref("en", "mailto:support@lobbystack.com")).toBe("mailto:support@lobbystack.com");
  expect(localizeMarketingHref("en", "#pricing")).toBe("#pricing");
  expect(localizeMarketingHref("en", "/status")).toBe("https://caleonis.com/status/");
});
