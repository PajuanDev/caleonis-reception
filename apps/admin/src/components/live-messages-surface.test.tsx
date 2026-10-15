// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveMessagesSurface } from "./live-messages-surface";
import { createRecordedBrowserTelemetry } from "@/lib/telemetry-testing";

const telemetryRef = vi.hoisted(() => ({ current: null as ReturnType<typeof createRecordedBrowserTelemetry> | null }));
vi.mock("@/components/product-analytics", () => ({ useTelemetry: () => telemetryRef.current!.telemetry }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "en" }, t: (key: string) => key }) }));
vi.mock("@/lib/realtime-query", () => ({ subscribeRealtimeQuery: () => () => {} }));

const clients: QueryClient[] = [];
beforeEach(() => {
  telemetryRef.current = createRecordedBrowserTelemetry();
  vi.stubGlobal("localStorage", { getItem: () => "en", setItem: vi.fn() });
  vi.stubGlobal("EventSource", class { addEventListener() {} close() {} });
});
afterEach(() => { cleanup(); clients.forEach((client) => client.clear()); clients.length = 0; vi.unstubAllGlobals(); vi.clearAllMocks(); });

function setup({ sms = true, channel = "sms", role = "business_owner", empty = false, numbersError = false, messagesError = false, sendError = false, reply, extraThread = false }: { sms?: boolean; channel?: "sms" | "web_chat"; role?: string; empty?: boolean; numbersError?: boolean; messagesError?: boolean; sendError?: boolean; reply?: Promise<Response>; extraThread?: boolean } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  clients.push(client);
  client.setQueryData(["businesses"], { businesses: [{ businessId: "business", active: true, role }] });
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).startsWith("/api/phone-numbers")) return numbersError ? Response.json({}, { status: 503 }) : Response.json({ phoneNumbers: [{ status: "active", voiceEnabled: true, smsEnabled: sms, reclaimScheduledAt: null }] });
    if (String(url).startsWith("/api/messages") && init?.method === "POST") return reply ?? Response.json({}, { status: sendError ? 503 : 201 });
    if (String(url).startsWith("/api/messages")) return messagesError ? Response.json({}, { status: 503 }) : Response.json({ messages: empty ? [] : [{ id: "m1", conversationId: "conversation-1", contactName: "Ada Caller", contactPhone: "+14155550100", visitorName: null, visitorEmail: null, channel, automationState: "ai_active", body: "Hello there", direction: "inbound", status: "delivered", createdAt: "2026-09-01T12:00:00Z" }, ...(extraThread ? [{ id: "m2", conversationId: "conversation-2", contactName: "Grace Caller", contactPhone: "+14155550101", visitorName: null, visitorEmail: null, channel, automationState: "ai_active", body: "Another request", direction: "inbound", status: "delivered", createdAt: "2026-09-01T12:05:00Z" }] : [])] });
    return Response.json({});
  });
  vi.stubGlobal("fetch", fetchMock);
  render(<QueryClientProvider client={client}><LiveMessagesSurface /></QueryClientProvider>);
  return { fetchMock, client };
}

describe("messages telemetry", () => {
  it("records thread_opened with the conversation and channel when a thread is selected", async () => {
    setup();
    await userEvent.click(await screen.findByRole("button", { name: /Ada Caller/ }));
    telemetryRef.current!.expectEvent("web.messages.thread_opened", { businessId: "business", conversationId: "conversation-1", channel: "sms" });
  });

  it("records reply_sent after the operator message is accepted", async () => {
    const { fetchMock } = setup();
    await userEvent.click(await screen.findByRole("button", { name: /Ada Caller/ }));
    await userEvent.type(screen.getByPlaceholderText("page.composerPlaceholderSms"), "On my way");
    await userEvent.click(screen.getByRole("button", { name: "page.send" }));
    await waitFor(() => telemetryRef.current!.expectEvent("web.messages.reply_sent", { businessId: "business", conversationId: "conversation-1", channel: "sms" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/messages?businessId=business", expect.objectContaining({ method: "POST" }));
  });
});

describe("Voice-only and workspace boundaries", () => {
  it.each(["sms", "web_chat"] as const)("keeps %s replies and human handoff read-only for viewers", async channel => {
    const { fetchMock } = setup({ channel, role: "viewer" });
    await userEvent.click(await screen.findByRole("button", { name: /Ada Caller/ }));
    expect((screen.getByRole("textbox", { name: "page.composerLabel" }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "page.send" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("page.readOnly")).toBeTruthy();
    if (channel === "web_chat") expect((screen.getByRole("button", { name: "page.takeOver" }) as HTMLButtonElement).disabled).toBe(true);
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST" || init?.method === "PATCH")).toBe(false);
  });

  it("preserves a new thread's draft after an earlier thread's send completes", async () => {
    let accept!: (response: Response) => void;
    setup({ extraThread: true, reply: new Promise(resolve => { accept = resolve; }) });
    await userEvent.click(await screen.findByRole("button", { name: /Ada Caller/ }));
    await userEvent.type(screen.getByRole("textbox", { name: "page.composerLabel" }), "Reply to Ada");
    await userEvent.click(screen.getByRole("button", { name: "page.send" }));
    await userEvent.click(screen.getByRole("button", { name: /Grace Caller/ }));
    await userEvent.type(screen.getByRole("textbox", { name: "page.composerLabel" }), "Private draft for Grace");
    await act(async () => accept(Response.json({}, { status: 201 })));
    await waitFor(() => telemetryRef.current!.expectEvent("web.messages.reply_sent", { businessId: "business", conversationId: "conversation-1", channel: "sms" }));
    expect(screen.getByDisplayValue("Private draft for Grace")).toBeTruthy();
  });
  it("preserves a replacement draft when returning to a thread before its earlier send completes", async () => {
    let accept!: (response: Response) => void;
    setup({ extraThread: true, reply: new Promise(resolve => { accept = resolve; }) });
    await userEvent.click(await screen.findByRole("button", { name: /Ada Caller/ }));
    await userEvent.type(screen.getByRole("textbox", { name: "page.composerLabel" }), "First reply to Ada");
    await userEvent.click(screen.getByRole("button", { name: "page.send" }));
    await userEvent.click(screen.getByRole("button", { name: /Grace Caller/ }));
    await userEvent.click(screen.getByRole("button", { name: /Ada Caller/ }));
    await userEvent.type(screen.getByRole("textbox", { name: "page.composerLabel" }), "New draft for Ada");
    await act(async () => accept(Response.json({}, { status: 201 })));
    await waitFor(() => telemetryRef.current!.expectEvent("web.messages.reply_sent", { businessId: "business", conversationId: "conversation-1", channel: "sms" }));
    expect(screen.getByDisplayValue("New draft for Ada")).toBeTruthy();
  });
  it("keeps the inbox readable but prevents SMS replies with a Voice-only number", async () => {
    const { fetchMock } = setup({ sms: false });
    expect(await screen.findByText("page.voiceOnlyTitle")).toBeTruthy();
    expect(screen.getByRole("link", { name: "page.phoneSettings" }).getAttribute("href")).toBe("/settings/phone-number");
    await userEvent.click(await screen.findByRole("button", { name: /Ada Caller/ }));
    expect((screen.getByRole("textbox", { name: "page.composerLabel" }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "page.send" }) as HTMLButtonElement).disabled).toBe(true);
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("allows an existing web chat reply independently of the number's SMS capabilities", async () => {
    const { fetchMock } = setup({ sms: false, channel: "web_chat" });
    await userEvent.click(await screen.findByRole("button", { name: /Ada Caller/ }));
    await userEvent.type(screen.getByRole("textbox", { name: "page.composerLabel" }), "A web reply");
    await userEvent.click(screen.getByRole("button", { name: "page.send" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/messages?businessId=business", expect.objectContaining({ method: "POST", body: JSON.stringify({ conversationId: "conversation-1", body: "A web reply", channel: "web_chat" }) })));
  });

  it("fails closed for SMS when capability lookup is unavailable", async () => {
    setup({ numbersError: true });
    await userEvent.click(await screen.findByRole("button", { name: /Ada Caller/ }));
    await waitFor(() => expect(screen.getAllByText("page.smsUnavailable").length).toBeGreaterThan(0));
    expect((screen.getByRole("textbox", { name: "page.composerLabel" }) as HTMLInputElement).disabled).toBe(true);
  });

  it("provides an explicit empty state for the Voice-only inbox", async () => {
    setup({ sms: false, empty: true });
    expect(await screen.findByText("page.emptyTitle")).toBeTruthy();
    expect(await screen.findByText("page.voiceOnlyTitle")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "page.filterSms" }));
    expect(screen.getAllByText("page.voiceOnlyDescription").length).toBe(2);
  });

  it("clears a selected conversation and draft on a workspace switch and scopes reads", async () => {
    const { client, fetchMock } = setup();
    await userEvent.click(await screen.findByRole("button", { name: /Ada Caller/ }));
    await userEvent.type(screen.getByRole("textbox", { name: "page.composerLabel" }), "Private draft");
    client.setQueryData(["businesses"], { businesses: [{ businessId: "other-workspace", active: true, role: "business_owner" }] });
    await waitFor(() => expect(screen.queryByDisplayValue("Private draft")).toBeNull());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/messages?businessId=other-workspace", expect.anything()));
    expect(screen.queryByRole("textbox", { name: "page.composerLabel" })).toBeNull();
  });

  it("shows load and send failures instead of silently dropping operator feedback", async () => {
    const { fetchMock } = setup({ sendError: true });
    await userEvent.click(await screen.findByRole("button", { name: /Ada Caller/ }));
    await userEvent.type(screen.getByRole("textbox", { name: "page.composerLabel" }), "Keep my draft");
    await userEvent.click(screen.getByRole("button", { name: "page.send" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "page.sendFailed");
    expect(screen.getByDisplayValue("Keep my draft")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("/api/messages?businessId=business", expect.objectContaining({ method: "POST" }));
  });

  it("offers a retry when the inbox cannot be loaded", async () => {
    setup({ messagesError: true });
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("page.loadFailed"));
    expect(screen.getByRole("button", { name: "page.retry" })).toBeTruthy();
  });
});
