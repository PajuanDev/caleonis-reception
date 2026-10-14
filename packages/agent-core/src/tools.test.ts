import { demoSnapshot, type BookingMode, type BusinessContextSnapshot } from "@lobbystack/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ takeMessageForStaff: vi.fn() }));
vi.mock("@lobbystack/domain", () => ({ takeMessageForStaff: mocks.takeMessageForStaff }));

import { createReceptionistTools, type AgentToolContext } from "./tools";

function toolNames(overrides: Partial<AgentToolContext> & { bookingMode?: BookingMode; snapshot?: Partial<BusinessContextSnapshot> } = {}): string[] {
  const { bookingMode, snapshot, ...context } = overrides;
  return Object.keys(createReceptionistTools({
    domain: { db: {} as never },
    channel: "web_chat",
    ...context,
    snapshot: { ...demoSnapshot, ...snapshot, ...(bookingMode ? { bookingMode } : {}) },
  })).sort();
}

const callControl = { transfer: vi.fn(async () => true), hangup: vi.fn(async () => undefined) };

beforeEach(() => { vi.clearAllMocks(); });

describe("createReceptionistTools", () => {
  it("books directly by default", () => {
    expect(toolNames()).toEqual(["bookAppointment", "findAvailability", "getBusinessHours", "getBusinessServices", "searchKnowledge", "takeMessage"]);
  });

  it("takes requests instead of booking in request mode", () => {
    const names = toolNames({ bookingMode: "request" });
    expect(names).toContain("requestAppointment");
    expect(names).not.toContain("bookAppointment");
    expect(names).not.toContain("findAvailability");
  });

  it("offers no booking actions when booking is off", () => {
    const names = toolNames({ bookingMode: "off", channel: "voice", callerPhone: "+14165550100" });
    expect(names).toEqual(["getBusinessHours", "getBusinessServices", "searchKnowledge", "takeMessage"]);
  });

  it("offers appointment changes only when the call carries the caller's number", () => {
    expect(toolNames({ channel: "web_voice" })).not.toContain("cancelAppointment");
    expect(toolNames({ channel: "voice", callerPhone: "+14165550100" })).toEqual(expect.arrayContaining(["lookupAppointmentForChange", "verifyAppointmentForChange", "cancelAppointment", "rescheduleAppointment"]));
  });

  it("offers transfer and hang-up only on calls it can control", () => {
    expect(toolNames({ channel: "web_voice" })).not.toContain("transferCall");
    expect(toolNames({ channel: "voice", callControl })).toEqual(expect.arrayContaining(["transferCall", "endCall"]));
  });

  it("limits prospect demos to answering questions and taking messages", () => {
    expect(toolNames({ channel: "web_voice", intakeOnly: true, callControl })).toEqual(["endCall", "getBusinessHours", "getBusinessServices", "searchKnowledge", "takeMessage"]);
  });

  it("offers hang-up but not transfer on browser calls", () => {
    const names = toolNames({ channel: "web_voice", callControl: { hangup: vi.fn() } });
    expect(names).toContain("endCall");
    expect(names).not.toContain("transferCall");
  });

  it("refuses a transfer the rules don't allow", async () => {
    const tools = createReceptionistTools({
      domain: { db: {} as never },
      channel: "voice",
      callControl,
      snapshot: { ...demoSnapshot, transferPolicy: { mode: "on_request", transferNumber: "+14165550199" } },
    });
    const execute = tools.transferCall!.execute! as (input: object, options: object) => Promise<unknown>;
    await expect(execute({ callerRequested: false, urgent: false }, { toolCallId: "1", messages: [] })).resolves.toMatchObject({ ok: false });
    expect(callControl.transfer).not.toHaveBeenCalled();
    await expect(execute({ callerRequested: true, urgent: false }, { toolCallId: "2", messages: [] })).resolves.toMatchObject({ ok: true });
    expect(callControl.transfer).toHaveBeenCalledWith("+14165550199");
  });

  it("returns saved task evidence and preserves pending notification status", async () => {
    mocks.takeMessageForStaff.mockResolvedValue({ ok: true, inboxItemId: "task_1", status: "saved", notificationStatus: "queued" });
    const tools = createReceptionistTools({ domain: { db: {} as never }, snapshot: demoSnapshot, channel: "web_chat", conversationId: "visitor_thread" });
    const execute = tools.takeMessage!.execute! as (input: object, options: object) => Promise<unknown>;
    await expect(execute({ callerName: "Alice", callbackPhone: "+33612345678", message: "A quote please" }, { toolCallId: "1", messages: [] })).resolves.toMatchObject({ ok: true, inboxItemId: "task_1", notificationStatus: "queued" });
    expect(mocks.takeMessageForStaff).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ businessId: demoSnapshot.businessId, conversationId: "visitor_thread", channel: "web_chat" }));
  });

  it("reports storage failure without exposing errors or claiming a saved message", async () => {
    mocks.takeMessageForStaff.mockRejectedValue(new Error("database-password-secret"));
    const tools = createReceptionistTools({ domain: { db: {} as never }, snapshot: demoSnapshot, channel: "web_voice" });
    const execute = tools.takeMessage!.execute! as (input: object, options: object) => Promise<unknown>;
    const result = await execute({ message: "A quote please" }, { toolCallId: "1", messages: [] });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining("could not be saved") });
    expect(JSON.stringify(result)).not.toContain("database-password-secret");
  });

  it("distinguishes an appointment request from a confirmed booking", async () => {
    mocks.takeMessageForStaff.mockResolvedValue({ ok: true, inboxItemId: "task_2", status: "saved", notificationStatus: "not_requested" });
    const tools = createReceptionistTools({ domain: { db: {} as never }, snapshot: { ...demoSnapshot, bookingMode: "request" }, channel: "web_chat" });
    const execute = tools.requestAppointment!.execute! as (input: object, options: object) => Promise<unknown>;
    await expect(execute({ callerName: "Alice", callbackPhone: "+33612345678", serviceName: "Consultation", preferredTime: "Tomorrow morning" }, { toolCallId: "1", messages: [] })).resolves.toMatchObject({ ok: true, bookingStatus: "requested_not_confirmed" });
    mocks.takeMessageForStaff.mockRejectedValue(new Error("write failed"));
    await expect(execute({ callerName: "Alice", callbackPhone: "+33612345678", serviceName: "Consultation", preferredTime: "Tomorrow morning" }, { toolCallId: "2", messages: [] })).resolves.toMatchObject({ ok: false, reason: expect.stringContaining("It is not booked") });
  });
});
