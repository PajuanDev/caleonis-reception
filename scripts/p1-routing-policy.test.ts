import { describe, expect, it } from "vitest";
import { classifySingleHostRequest, type RouteInventory } from "./p1-routing-policy";

const inventory: RouteInventory = {
  marketing: new Set(["/", "/fr", "/pricing", "/fr/pricing", "/api/status"]),
  help: new Set(["/aide", "/aide/en", "/aide/billing/plans", "/aide/en/billing/plans"]),
  marketingAssets: new Set(["/_astro/index.abc.css", "/illustrations/reception.webp"]),
  helpAssets: new Set(["/aide/images/calls.webp"]),
};

describe("single host isolated classifier", () => {
  it.each([
    ["/api/webhooks/twilio/status?CallSid=example", "POST"],
    ["/api/webhooks/openai/live", "POST"], ["/api/webhooks/resend", "POST"],
    ["/api/auth/callback/google?state=example&code=example", "GET"],
    ["/api/calendar/google/callback?state=example", "GET"],
    ["/api/unknown-provider-route", "POST"], ["/api/status", "GET"],
    ["/.well-known/oauth-authorization-server", "GET"],
    ["/oauth/consent", "GET"], ["/api/widget/chat", "POST"],
    ["/embed.js", "GET"], ["/embed/widget-key", "GET"],
    ["/_next/static/chunks/example.js", "GET"],
    ["/calls/call-id", "GET"], ["/messages", "GET"],
    ["/settings/phone-number", "GET"], ["/dashboard", "GET"],
    ["/fr/login?returnTo=%2Fcalls", "GET"], ["/login", "GET"],
    ["/signup", "GET"], ["/en/reset-password/token", "GET"],
  ])("preserves application target and exact raw query: %s", (target, method) => {
    expect(classifySingleHostRequest(target, method, inventory)).toMatchObject({ target: "next", upstreamPath: target, status: "UPSTREAM_STATUS" });
  });

  it.each([["/", "marketing"], ["/fr/", "marketing"], ["/fr/pricing", "marketing"], ["/aide", "help"], ["/aide/en/billing/plans", "help"], ["/aide/images/calls.webp", "help"], ["/_astro/index.abc.css", "marketing"]])("serves only a built static route or asset: %s", (target, expected) => {
    expect(classifySingleHostRequest(target, "GET", inventory).target).toBe(expected);
  });

  it.each(["/missing", "/aide/missing", "/illustrations/missing.webp", "/apix/webhook", "/fr/api/unknown"])("never turns missing route %s into generic 200", target => {
    expect(classifySingleHostRequest(target, "GET", inventory)).toMatchObject({ target: "reject", status: 404 });
  });

  it.each(["//foreign.example", "/aide/../api/auth", "/aide/%2fapi/auth", "/aide/%252fapi/auth", "/aide\\api", "/aide/#fragment"])("rejects normalization-ambiguous target %s", target => {
    expect(classifySingleHostRequest(target, "GET", inventory)).toMatchObject({ target: "reject", status: 400 });
  });

  it("refuses state-changing static routes without blocking provider POSTs", () => {
    expect(classifySingleHostRequest("/fr/pricing", "POST", inventory).status).toBe(405);
    expect(classifySingleHostRequest("/aide", "DELETE", inventory).status).toBe(405);
    expect(classifySingleHostRequest("/api/webhooks/twilio/status", "POST", inventory).target).toBe("next");
  });
});
