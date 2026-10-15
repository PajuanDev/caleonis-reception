import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST, PATCH } from "./route";

const mocks = vi.hoisted(() => ({ select: vi.fn(), append: vi.fn(), automate: vi.fn(), authorize: vi.fn() }));
vi.mock("@lobbystack/domain", () => ({ appendMessage: mocks.append, setAutomationState: mocks.automate }));
vi.mock("@/lib/domain-context", () => ({ createDomainContext: () => ({}) }));
vi.mock("@/lib/api-helpers", () => ({
  businessIdFromRequest: (request: Request) => new URL(request.url).searchParams.get("businessId"),
  readJson: (request: Request) => request.json(),
  withOperatorTransaction: mocks.authorize,
  jsonError: (error: string, status: number, code: string) => Response.json({ error, code }, { status }),
  asApiResponse: (error: unknown) => error instanceof Response ? error : Response.json({ error: "Request failed." }, { status: 500 }),
}));
vi.mock("@lobbystack/db", () => ({ contacts: {}, messages: {}, widgetVisitors: {}, conversations: { id: "id", businessId: "businessId", channel: "channel" }, phoneNumbers: { id: "phone-id", businessId: "business-id", status: "status", smsEnabled: "sms-enabled", reclaimScheduledAt: "reclaim-at" } }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.authorize.mockImplementation((_request, callback) => callback({ businessId: "business", session: { user: { id: "operator" } }, tx: { select: mocks.select } }));
  mocks.append.mockResolvedValue("accepted-message");
});
function rows(value: unknown[]) { return { from: () => ({ where: () => ({ limit: async () => value }) }) }; }
function request(channel: string = "sms") { return new Request("http://localhost/api/messages?businessId=business", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversationId: "conversation", body: "A reply", channel }) }); }

describe("operator message delivery gates", () => {
  it.each(["POST", "PATCH"])("requires scheduler role for %s before any mutation", async method => {
    mocks.authorize.mockImplementationOnce((_request, _callback, options) => {
      expect(options).toEqual({ minimumRole: "scheduler" });
      throw Response.json({ code: "forbidden" }, { status: 403 });
    });
    const input = method === "POST" ? request() : new Request("http://localhost/api/messages?businessId=business", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversationId: "conversation", automationState: "human_handoff" }) });
    const response = await (method === "POST" ? POST(input) : PATCH(input));
    expect(response.status).toBe(403);
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.append).not.toHaveBeenCalled();
    expect(mocks.automate).not.toHaveBeenCalled();
  });
  it("refuses SMS before persistence or enqueue when no active SMS sender exists", async () => {
    mocks.select.mockReturnValueOnce(rows([{ channel: "sms" }])).mockReturnValueOnce(rows([]));
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "sms_unavailable" });
    expect(mocks.append).not.toHaveBeenCalled();
  });

  it("uses the actual conversation channel and rejects a forged web-chat bypass", async () => {
    mocks.select.mockReturnValueOnce(rows([{ channel: "sms" }]));
    const response = await POST(request("web_chat"));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "message_channel_mismatch" });
    expect(mocks.append).not.toHaveBeenCalled();
  });

  it("does not deliver or inspect senders after tenant authorization fails", async () => {
    mocks.authorize.mockRejectedValueOnce(Response.json({ code: "forbidden" }, { status: 403 }));
    expect((await POST(request())).status).toBe(403);
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.append).not.toHaveBeenCalled();
  });

  it("refuses conversations outside the selected workspace", async () => {
    mocks.select.mockReturnValueOnce(rows([]));
    expect((await POST(request())).status).toBe(404);
    expect(mocks.append).not.toHaveBeenCalled();
  });

  it.each(["web_chat", "dashboard"])("preserves %s replies without requiring a phone number", async channel => {
    mocks.select.mockReturnValueOnce(rows([{ channel: "web_chat" }]));
    expect((await POST(request(channel))).status).toBe(201);
    expect(mocks.select).toHaveBeenCalledOnce();
    expect(mocks.append).toHaveBeenCalledWith({}, expect.objectContaining({ userId: "operator", businessId: "business", conversationId: "conversation", channel }));
  });

  it("retains SMS delivery only with an active SMS-capable sender", async () => {
    mocks.select.mockReturnValueOnce(rows([{ channel: "sms" }])).mockReturnValueOnce(rows([{ id: "sms-number" }]));
    expect((await POST(request())).status).toBe(201);
    expect(mocks.append).toHaveBeenCalledWith({}, expect.objectContaining({ channel: "sms" }));
  });
});
