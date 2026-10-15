import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH } from "./route";
import { POST as recordClick } from "./click/route";

const mocks = vi.hoisted(() => ({ database: vi.fn(), transaction: vi.fn(), session: vi.fn(), recordClick: vi.fn() }));
vi.mock("@/lib/api-helpers", () => ({
  getAppDatabase: mocks.database,
  requireApiSession: mocks.session,
  readJson: (request: Request) => request.json(),
  asApiResponse: (error: unknown) => error instanceof Response ? error : Response.json({ error: "Request failed." }, { status: 500 }),
}));
vi.mock("@/lib/domain-context", () => ({ createDomainContext: () => ({}) }));
vi.mock("@lobbystack/domain", () => ({ recordAffiliateClick: mocks.recordClick }));
vi.mock("@lobbystack/db", () => ({ affiliateAttributions: {}, affiliateClicks: {}, affiliateCommissions: {}, affiliatePayoutItems: {}, affiliatePayoutRuns: {}, affiliateProfileStats: {}, affiliateProfiles: {}, withBusinessTransaction: mocks.transaction }));

beforeEach(() => {
  vi.stubEnv("AFFILIATE_PROGRAM_ENABLED", "");
  mocks.session.mockResolvedValue({ user: { id: "operator", email: "test@example.invalid" } });
  mocks.database.mockReturnValue({ db: {} });
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

function request(method = "GET") {
  return new Request("http://localhost/api/affiliate", { method, ...(method === "GET" ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify({ payoutEmail: "test@example.invalid", referralCode: "example" }) }) });
}

describe("unapproved affiliate program", () => {
  it("does not read or create a profile by default", async () => {
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "affiliate_program_unavailable" });
    expect(mocks.database).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("refuses payout edits and click tracking without side effects", async () => {
    expect((await PATCH(request("PATCH"))).status).toBe(503);
    expect((await recordClick(request("POST"))).status).toBe(503);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.recordClick).not.toHaveBeenCalled();
  });

  it("keeps authentication required while the program is closed", async () => {
    mocks.session.mockRejectedValueOnce(Response.json({ error: "Authentication required." }, { status: 401 }));
    expect((await GET(request())).status).toBe(401);
    expect(mocks.database).not.toHaveBeenCalled();
  });

  it("retains the original implementation behind explicit opt-in", async () => {
    vi.stubEnv("AFFILIATE_PROGRAM_ENABLED", "true");
    mocks.transaction.mockResolvedValueOnce({ profile: { id: "approved-profile" } });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ profile: { id: "approved-profile" } });
    expect(mocks.transaction).toHaveBeenCalledOnce();
  });
});
