import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createBusiness: vi.fn(), autonomousCreation: vi.fn() }));
vi.mock("@lobbystack/domain", () => ({ createBusiness: mocks.createBusiness, canCreateAutonomousBusiness: mocks.autonomousCreation }));
vi.mock("@/lib/api-helpers", () => ({
  requireApiSession: async () => ({ user: { id: "user-1" } }),
  readJson: (request: Request) => request.json(),
  asApiResponse: () => Response.json({ error: "Unexpected failure" }, { status: 500 }),
}));
vi.mock("@/lib/domain-context", () => ({ createDomainContext: () => ({}) }));
import { POST } from "../../app/api/businesses/route";

beforeEach(() => { vi.clearAllMocks(); mocks.createBusiness.mockResolvedValue({ businessId: "business-1" }); mocks.autonomousCreation.mockResolvedValue(true); });

function request(extra: Record<string, unknown>) {
  return new Request("https://app.example.test/api/businesses", { method: "POST", body: JSON.stringify({ name: "Test", timezone: "UTC", businessType: "test", ...extra }) });
}

it.each(["", "   ", null, false, 123, {}, []])("rejects an invalid supplied slug %j before creation", async slug => {
  const response = await POST(request({ slug }));
  expect(response.status).toBe(400);
  expect(mocks.createBusiness).not.toHaveBeenCalled();
});

it("allows an omitted slug for server-side generation", async () => {
  expect((await POST(request({}))).status).toBe(201);
  expect(mocks.createBusiness.mock.calls[0]![1]).not.toHaveProperty("slug");
});

it("preserves a supplied nonempty slug", async () => {
  expect((await POST(request({ slug: "test" }))).status).toBe(201);
  expect(mocks.createBusiness).toHaveBeenCalledWith({}, expect.objectContaining({ slug: "test" }));
});

it("blocks a managed pilot from creating a second workspace before quota or checkout can be bypassed", async () => {
  mocks.autonomousCreation.mockResolvedValue(false);
  const response = await POST(request({ userId: "another-user", managedPilot: false }));
  expect(response.status).toBe(403);
  expect(mocks.autonomousCreation).toHaveBeenCalledWith({}, "user-1");
  expect(mocks.createBusiness).not.toHaveBeenCalled();
});

it("keeps autonomous workspace creation available to a non-pilot account", async () => {
  expect((await POST(request({}))).status).toBe(201);
  expect(mocks.autonomousCreation).toHaveBeenCalledWith({}, "user-1");
  expect(mocks.createBusiness).toHaveBeenCalledWith({}, expect.objectContaining({ userId: "user-1" }));
});
