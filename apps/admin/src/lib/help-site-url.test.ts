import { afterEach, expect, it, vi } from "vitest";
import { helpSiteUrl } from "./help-site-url";

afterEach(() => vi.unstubAllEnvs());

it("uses the real pilot route until a help site is configured", () => {
  vi.stubEnv("NEXT_PUBLIC_HELP_SITE_URL", "");
  expect(helpSiteUrl()).toBe("/fr/essai");
});

it("accepts an explicit HTTP(S) help site without inventing article paths", () => {
  vi.stubEnv("NEXT_PUBLIC_HELP_SITE_URL", "https://help.example.invalid/aide/");
  expect(helpSiteUrl()).toBe("https://help.example.invalid/aide/");
});

it.each(["javascript:alert(1)", "broken url"])("falls back for invalid help configuration: %s", value => {
  vi.stubEnv("NEXT_PUBLIC_HELP_SITE_URL", value);
  expect(helpSiteUrl()).toBe("/fr/essai");
});
