import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ preview: vi.fn(), redeem: vi.fn(), hash: vi.fn(), role: vi.fn(), db: {} }));
vi.mock("@lobbystack/db", () => ({ assertDatabaseRole: mocks.role }));
vi.mock("@lobbystack/domain", () => ({ previewPilotActivation: mocks.preview, redeemPilotActivation: mocks.redeem }));
vi.mock("./databases", () => ({ getDatabase: () => ({ db: mocks.db }) }));
vi.mock("./password", async original => ({ ...await original<typeof import("./password")>(), hashReplacementPassword: mocks.hash }));
import { POST } from "../../app/api/pilot/activate/route";
const token = "A".repeat(43);
function request(body: unknown, origin = "https://app.example.test") { return new Request("https://app.example.test/api/pilot/activate", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) }); }
beforeEach(() => { vi.stubEnv("APP_BASE_URL", "https://app.example.test"); vi.clearAllMocks(); mocks.preview.mockResolvedValue({ email: "pilot@example.test", businessName: "Pilot" }); mocks.redeem.mockResolvedValue({ email: "pilot@example.test" }); mocks.hash.mockResolvedValue("safe-hash"); });
it("rejects cross-origin activation before touching the database or password", async () => {
  expect((await POST(request({ action: "activate", token, password: "Secure!42" }, "https://other.example"))).status).toBe(403);
  expect(mocks.role).not.toHaveBeenCalled(); expect(mocks.hash).not.toHaveBeenCalled();
});
it("previews only with the secret token and prevents caching", async () => {
  const response = await POST(request({ action: "preview", token }));
  expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({ invitation: { email: "pilot@example.test", businessName: "Pilot" } });
});
it("rejects weak passwords and invalid tokens without hashing", async () => {
  expect((await POST(request({ action: "activate", token, password: "weak" }))).status).toBe(400);
  expect(mocks.hash).not.toHaveBeenCalled();
  mocks.preview.mockResolvedValue(null);
  expect((await POST(request({ action: "activate", token, password: "Secure!42" }))).status).toBe(400);
  expect(mocks.hash).not.toHaveBeenCalled();
});
it("hashes the chosen password and calls the atomic redemption without signing up", async () => {
  const response = await POST(request({ action: "activate", token, password: "Secure!42" }));
  expect(response.status).toBe(200);
  expect(mocks.redeem).toHaveBeenCalledWith(mocks.db, { token, passwordHash: "safe-hash" });
  expect(response.headers.has("set-cookie")).toBe(false);
});
it("fails closed on a replay rejected by the transaction and hides infrastructure errors", async () => {
  mocks.redeem.mockRejectedValueOnce(Object.assign(new Error("expired"), { status: 400 }));
  expect((await POST(request({ action: "activate", token, password: "Secure!42" }))).status).toBe(400);
  mocks.preview.mockRejectedValueOnce(new Error("secret db url"));
  const response = await POST(request({ action: "preview", token }));
  expect(response.status).toBe(503); expect(JSON.stringify(await response.json())).not.toContain("secret");
});
