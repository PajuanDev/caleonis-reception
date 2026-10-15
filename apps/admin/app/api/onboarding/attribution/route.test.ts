import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({ submit: vi.fn() }));
vi.mock("@lobbystack/domain", () => ({ submitOnboardingAttribution: mocks.submit }));
vi.mock("@/lib/domain-context", () => ({ createDomainContext: () => ({}) }));
vi.mock("@/lib/api-helpers", () => ({
  requireApiSession: async () => ({ user: { id: "operator" } }),
  businessIdFromRequest: (request: Request) => new URL(request.url).searchParams.get("businessId"),
  readJson: (request: Request) => request.json(),
  asApiResponse: () => Response.json({ error: "Unexpected failure" }, { status: 500 }),
}));

beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("AFFILIATE_PROGRAM_ENABLED", ""); });
afterEach(() => vi.unstubAllEnvs());

function request() {
  return new Request("http://localhost/api/onboarding/attribution?businessId=business", { method: "POST", body: JSON.stringify({ source: "search", referralCode: "referral-from-cookie" }) });
}

describe("onboarding affiliate attribution gate", () => {
  it("completes onboarding without attributing a stored referral while the program is closed", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(mocks.submit).toHaveBeenCalledWith({}, { userId: "operator", businessId: "business", source: "search", referralCode: null });
  });

  it("retains attribution only after the program is explicitly enabled", async () => {
    vi.stubEnv("AFFILIATE_PROGRAM_ENABLED", "true");
    expect((await POST(request())).status).toBe(200);
    expect(mocks.submit).toHaveBeenCalledWith({}, expect.objectContaining({ referralCode: "referral-from-cookie" }));
  });
});
