import { afterEach, describe, expect, it, vi } from "vitest";
import { appAuthenticationReturnTo, appHomePath } from "./app-home";
import { singleHostStagingBuildEnabled } from "../../single-host-staging";

afterEach(() => vi.unstubAllEnvs());

describe("isolated single-host staging gate", () => {
  it("leaves the default app root and explicitly rejects production deployment targets", () => {
    expect(singleHostStagingBuildEnabled({})).toBe(false);
    expect(singleHostStagingBuildEnabled({ P1_SINGLE_HOST_STAGING: "true", RAILWAY_ENVIRONMENT_NAME: "production" })).toBe(false);
    expect(singleHostStagingBuildEnabled({ P1_SINGLE_HOST_STAGING: "true", RAILWAY_ENVIRONMENT_NAME: "staging", APP_BASE_URL: "https://receptionist.caleonis.com" })).toBe(false);
    expect(singleHostStagingBuildEnabled({ P1_SINGLE_HOST_STAGING: "true", RAILWAY_ENVIRONMENT_NAME: "staging", APP_BASE_URL: "broken" })).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_P1_SINGLE_HOST_STAGING", "false");
    expect(appHomePath()).toBe("/");
    expect(appAuthenticationReturnTo(null)).toBe("/");
  });
  it("enables a staging host only when explicitly requested", () => {
    expect(singleHostStagingBuildEnabled({ P1_SINGLE_HOST_STAGING: "true", RAILWAY_ENVIRONMENT_NAME: "staging", APP_BASE_URL: "https://receptionist-staging.example.invalid" })).toBe(true);
    expect(singleHostStagingBuildEnabled({ RAILWAY_ENVIRONMENT_NAME: "staging", APP_BASE_URL: "https://receptionist-staging.example.invalid" })).toBe(false);
  });
  it("rejects equivalent production FQDNs with trailing dots, mixed case or an explicit port", () => {
    for (const origin of ["https://receptionist.caleonis.com.", "https://RECEPTIONIST.CALEONIS.COM.:8443", "http://receptionist.caleonis.com..:3000"]) {
      expect(singleHostStagingBuildEnabled({ P1_SINGLE_HOST_STAGING: "true", RAILWAY_ENVIRONMENT_NAME: "staging", APP_BASE_URL: origin })).toBe(false);
    }
  });
  it("moves missing, root and unsafe auth returns to the staged dashboard while preserving deep links", () => {
    vi.stubEnv("NEXT_PUBLIC_P1_SINGLE_HOST_STAGING", "true");
    expect(appHomePath()).toBe("/dashboard");
    expect(appAuthenticationReturnTo(null)).toBe("/dashboard");
    expect(appAuthenticationReturnTo("/?checkout=success#usage")).toBe("/dashboard?checkout=success#usage");
    expect(appAuthenticationReturnTo("https://foreign.example")).toBe("/dashboard");
    expect(appAuthenticationReturnTo("//foreign.example")).toBe("/dashboard");
    expect(appAuthenticationReturnTo("/settings/phone-number?businessId=example")).toBe("/settings/phone-number?businessId=example");
  });
});
