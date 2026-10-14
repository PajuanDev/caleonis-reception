import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), update: vi.fn(), context: {} }));
vi.mock("@lobbystack/domain", () => ({ updateBusiness: mocks.update, createBusiness: vi.fn(), attributeBusiness: vi.fn(), listUserBusinesses: vi.fn() }));
vi.mock("./domain-context", () => ({ createDomainContext: () => mocks.context }));
vi.mock("./api-helpers", () => ({
  requireApiSession: mocks.session,
  readJson: (request: Request) => request.json(),
  businessIdFromRequest: (request: Request) => new URL(request.url).searchParams.get("businessId"),
  getAppDatabase: vi.fn(),
  asApiResponse: (error: unknown) => Response.json({ error: "Request failed." }, { status: error instanceof Response ? error.status : 500 }),
}));
import { PATCH } from "../../app/api/businesses/route";
function request(body: unknown) { return new Request("https://app.example.test/api/businesses?businessId=tenant-from-request", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }
beforeEach(() => { vi.clearAllMocks(); mocks.session.mockResolvedValue({ user: { id: "user-from-session" } }); });
it.each([
  { name: "Changed", userId: "another-owner" },
  { name: "Changed", businessId: "another-tenant" },
  { name: "Changed", managedPilot: false },
  { name: "Changed", platformRole: "platform_admin" },
])("rejects injected authority or operator-only fields %j", async body => {
  expect((await PATCH(request(body))).status).toBe(400);
  expect(mocks.update).not.toHaveBeenCalled();
});
it("passes only editable data with the authenticated user and requested workspace", async () => {
  expect((await PATCH(request({ name: " Clinic ", defaultLocale: "fr", websiteUrl: null }))).status).toBe(200);
  expect(mocks.update).toHaveBeenCalledWith(mocks.context, { name: "Clinic", defaultLocale: "fr", websiteUrl: null, userId: "user-from-session", businessId: "tenant-from-request" });
});
it("requires an authenticated session before allowing any business update", async () => {
  mocks.session.mockRejectedValue(new Response("Unauthorized", { status: 401 }));
  expect((await PATCH(request({ name: "Clinic" }))).status).toBe(401);
  expect(mocks.update).not.toHaveBeenCalled();
});
