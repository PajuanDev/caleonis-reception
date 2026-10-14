import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ session: vi.fn(), update: vi.fn(), remove: vi.fn() }));
vi.mock("@lobbystack/domain", () => ({ updateKnowledgeSnippet: mocks.update, deleteKnowledgeSnippet: mocks.remove }));
vi.mock("@/lib/domain-context", () => ({ createDomainContext: () => ({ db: {} }) }));
vi.mock("@/lib/api-helpers", () => ({
  requireApiSession: mocks.session,
  businessIdFromRequest: (request: Request) => new URL(request.url).searchParams.get("businessId"),
  readJson: (request: Request) => request.json(),
  asApiResponse: (error: { status?: number }) => NextResponse.json({ error: "Request failed" }, { status: error.status ?? 500 }),
}));
import { DELETE, PATCH } from "./route";

const params = { params: Promise.resolve({ snippetId: "path-snippet" }) };
function patch(body: unknown) {
  return PATCH(new Request("https://receptionist.example/api/knowledge/snippets/path-snippet?businessId=query-business", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), params);
}
beforeEach(() => { vi.clearAllMocks(); mocks.session.mockResolvedValue({ user: { id: "session-user" } }); });

describe("knowledge snippet authority", () => {
  it("keeps the session, requested business and path identity despite injected JSON authority", async () => {
    expect((await patch({ title: "Valid edit", userId: "victim-user", businessId: "victim-business", snippetId: "victim-snippet", actorType: "system", managedPilot: false, id: "ui-local-id" })).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.anything(), { title: "Valid edit", userId: "session-user", businessId: "query-business", snippetId: "path-snippet" });
  });
  it("keeps supported dashboard partial updates", async () => {
    expect((await patch({ id: "ui-local-id", tags: [], active: false, priority: 0 })).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.anything(), { tags: [], active: false, priority: 0, userId: "session-user", businessId: "query-business", snippetId: "path-snippet" });
  });
  it.each([{}, [], null, { userId: "victim-user" }, { title: " " }, { active: "true" }, { tags: [2] }, { priority: 0.5 }])("rejects invalid or authority-only edits %j before mutation", async (body) => {
    expect((await patch(body)).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("requires authentication before mutation", async () => {
    mocks.session.mockRejectedValue(Object.assign(new Error("Unauthorized"), { status: 401 }));
    expect((await patch({ title: "Edit" })).status).toBe(401);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("keeps deletion bound to the authenticated caller and path", async () => {
    expect((await DELETE(new Request("https://receptionist.example/api/knowledge/snippets/path-snippet?businessId=query-business", { method: "DELETE" }), params)).status).toBe(200);
    expect(mocks.remove).toHaveBeenCalledWith(expect.anything(), { userId: "session-user", businessId: "query-business", snippetId: "path-snippet" });
  });
});
