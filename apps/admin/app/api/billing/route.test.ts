import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({ select: vi.fn(), role: "business_owner", managedPilot: false }));
vi.mock("@lobbystack/db", () => ({
  billingAccounts: { businessId: "businessId" }, billingTransactions: { businessId: "businessId" },
  billingUsageEvents: { businessId: "businessId" }, billingUsageMonths: { businessId: "businessId" }, businesses: { id: "id" },
}));
vi.mock("@lobbystack/domain", () => ({
  requireBusinessMembership: async () => ({ role: mocks.role }),
  getKnowledgeStorageUsageBytes: async () => 0,
  billingAccess: (role: string, _account: unknown, configured: boolean) => ({ hasCheckoutAccess: role === "business_owner" && configured, hasBillingManagementAccess: role === "business_owner", hasCustomerPortalAccess: false }),
}));
vi.mock("@/lib/api-helpers", () => ({
  withOperatorTransaction: (_request: Request, callback: (context: unknown) => unknown) => callback({ session: { user: { id: "operator" } }, businessId: "business", tx: { select: mocks.select } }),
  asApiResponse: () => Response.json({ error: "Unexpected failure" }, { status: 500 }),
}));
vi.mock("@/lib/domain-context", () => ({ createDomainContext: () => ({}) }));

const providerKeys = ["POLAR_ACCESS_TOKEN", "POLAR_ORGANIZATION_ID", "POLAR_PRO_PRODUCT_ID", "POLAR_STARTER_MONTHLY_PRODUCT_ID", "POLAR_STARTER_ANNUAL_PRODUCT_ID", "POLAR_PRO_MONTHLY_PRODUCT_ID", "POLAR_PRO_ANNUAL_PRODUCT_ID"];
beforeEach(() => {
  vi.clearAllMocks();
  mocks.role = "business_owner";
  mocks.managedPilot = false;
  providerKeys.forEach(key => vi.stubEnv(key, ""));
  const query = (rows: unknown[]) => {
    const chain = { from: () => chain, where: () => chain, orderBy: () => chain, limit: async () => rows, then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve) };
    return chain;
  };
  mocks.select.mockReturnValueOnce(query([{ plan: "pro", subscriptionState: "active" }]))
    .mockReturnValueOnce(query([])).mockReturnValueOnce(query([])).mockReturnValueOnce(query([]))
    .mockReturnValueOnce(query([{ count: 0 }])).mockImplementation(() => query([{ managedPilot: mocks.managedPilot }]));
});
afterEach(() => vi.unstubAllEnvs());

async function billing() {
  const response = await GET(new Request("http://localhost/api/billing?businessId=business"));
  expect(response.status).toBe(200);
  return await response.json();
}

describe("commercial availability independent of billing permissions", () => {
  it("does not open checkout for a provider without a configured product interval", async () => {
    vi.stubEnv("POLAR_ACCESS_TOKEN", "test-provider");
    vi.stubEnv("POLAR_ORGANIZATION_ID", "test-organization");
    expect(await billing()).toMatchObject({ commercialTermsAvailable: false, checkoutAvailable: false, availableCheckoutPlans: [] });
  });

  it("keeps the paid plan visible to a read-only member without exposing checkout", async () => {
    mocks.role = "viewer";
    vi.stubEnv("POLAR_ACCESS_TOKEN", "test-provider");
    vi.stubEnv("POLAR_ORGANIZATION_ID", "test-organization");
    vi.stubEnv("POLAR_PRO_MONTHLY_PRODUCT_ID", "test-product");
    expect(await billing()).toMatchObject({ commercialTermsAvailable: true, checkoutAvailable: false, account: { plan: "pro" }, availableCheckoutPlans: [], availableCheckoutIntervals: { starter: [], pro: [] } });
  });

  it("keeps a managed pilot closed despite global provider and product configuration", async () => {
    mocks.managedPilot = true;
    vi.stubEnv("POLAR_ACCESS_TOKEN", "test-provider");
    vi.stubEnv("POLAR_ORGANIZATION_ID", "test-organization");
    vi.stubEnv("POLAR_PRO_PRODUCT_ID", "test-product");
    expect(await billing()).toMatchObject({ commercialTermsAvailable: false, checkoutAvailable: false, availableCheckoutPlans: [] });
  });

  it("exposes only the configured product interval to the administrator", async () => {
    vi.stubEnv("POLAR_ACCESS_TOKEN", "test-provider");
    vi.stubEnv("POLAR_ORGANIZATION_ID", "test-organization");
    vi.stubEnv("POLAR_STARTER_ANNUAL_PRODUCT_ID", "test-product");
    expect(await billing()).toMatchObject({ commercialTermsAvailable: true, checkoutAvailable: true, availableCheckoutPlans: ["starter"], availableCheckoutIntervals: { starter: ["annual"], pro: [] } });
  });
});
