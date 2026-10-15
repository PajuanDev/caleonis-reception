import { demoSnapshot } from "@lobbystack/shared";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";

const domain = vi.hoisted(() => ({ findOpenings: vi.fn(), checkOpening: vi.fn(), bookForCaller: vi.fn() }));
vi.mock("@lobbystack/domain", () => ({ ...domain }));

import { createReceptionistAgent } from "./agent";
import { voiceBookingReply } from "./voiceBookingReply";

type GenerateResult = Awaited<ReturnType<MockLanguageModelV4["doGenerate"]>>;
const startsAt = "2030-01-08T09:00:00.000Z";
const snapshot = { ...demoSnapshot, timezone: "Europe/Paris", bookingMode: "instant" as const };
const opening = { ok: true, serviceName: "Pilot callback", timezone: snapshot.timezone, date: "2030-01-08", openings: [{ startsAt }] };
const booked = { ok: true, appointmentId: "appointment-internal-id", serviceName: "Pilot callback", startsAt, status: "confirmed", calendar: "internal", notificationStatus: "queued_not_delivered", contactPhone: "PRIVATE_PHONE_MUST_NOT_REACH_COMMENTARY", contactName: "PRIVATE_NAME" };
const lookupInput = { serviceName: "Pilot callback", date: "2030-01-08", preferredTime: "10:00" };
const bookingInput = { serviceName: "Pilot callback", startsAt, smsConsentGranted: false };
const usage = { inputTokens: { total: 50, noCache: 50, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 20, text: 20, reasoning: undefined } };
function toolCall(name: string, input: object, id = "tool-1") { return { type: "tool-call" as const, toolCallId: id, toolName: name, input: JSON.stringify(input) }; }
function toolStep(content: GenerateResult["content"]): GenerateResult { return { content, finishReason: { unified: "tool-calls", raw: undefined }, usage, warnings: [] }; }
const spoken: GenerateResult = { content: [{ type: "text", text: "Normal model reply." }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] };
function agent(responses: GenerateResult[], channel: "voice" | "web_chat" = "voice", callerPhone: string | undefined = "+33155550100", directVoiceReplies = true) {
  const model = new MockLanguageModelV4({ doGenerate: responses });
  const receptionist = createReceptionistAgent({ model, context: { domain: { db: {} as never }, snapshot, channel, directVoiceReplies, ...(callerPhone ? { callerPhone } : {}) } });
  return { model, receptionist };
}
beforeEach(() => {
  vi.clearAllMocks();
  domain.findOpenings.mockResolvedValue(opening);
  domain.checkOpening.mockResolvedValue({ ok: true, available: true });
  domain.bookForCaller.mockResolvedValue(booked);
});

describe("verified PSTN booking handoff through the real SDK loop", () => {
  it("skips one model rewrite only when the planner marks a verified lookup complete", async () => {
    const { model, receptionist } = agent([toolStep([toolCall("findAvailability", { ...lookupInput, finishVoiceReply: true })]), spoken]);
    const result = await receptionist.generate({ prompt: "What times are available on January 8?" });
    expect(model.doGenerateCalls).toHaveLength(1);
    expect(voiceBookingReply(result.steps, snapshot.timezone)).toContain('"availableLocalTimes":["2030-01-08 10:00"]');
    expect(domain.bookForCaller).not.toHaveBeenCalled();
  });

  it("keeps lookup then booking in the loop until all requested work is complete", async () => {
    const { model, receptionist } = agent([
      toolStep([toolCall("findAvailability", { ...lookupInput, finishVoiceReply: false })]),
      toolStep([toolCall("bookAppointment", { ...bookingInput, finishVoiceReply: true }, "tool-2")]), spoken,
    ]);
    const result = await receptionist.generate({ prompt: "Book the January 8 callback at 10, if available. I do not want a text." });
    expect(model.doGenerateCalls).toHaveLength(2);
    expect(domain.findOpenings).toHaveBeenCalledOnce();
    expect(domain.checkOpening).toHaveBeenCalledOnce();
    expect(domain.bookForCaller).toHaveBeenCalledExactlyOnceWith(expect.anything(), expect.objectContaining({ smsConsentGranted: false, channel: "voice", contactPhone: "+33155550100" }));
    const reply = voiceBookingReply(result.steps, snapshot.timezone)!;
    expect(reply).toContain('"confirmedLocalTime":"2030-01-08 10:00"');
    expect(reply).toContain("Text/email delivery and Google Calendar completion are not confirmed");
    expect(reply).not.toMatch(/PRIVATE|appointment-internal-id|33155550100/);
    expect(reply.length).toBeLessThan(1200);
  });

  it("preserves the existing model reply when the optional hint is absent", async () => {
    const { model, receptionist } = agent([toolStep([toolCall("findAvailability", lookupInput)]), spoken]);
    const result = await receptionist.generate({ prompt: "What times are available?" });
    expect(model.doGenerateCalls).toHaveLength(2);
    expect(result.text).toBe("Normal model reply.");
    expect(voiceBookingReply(result.steps, snapshot.timezone)).toBeUndefined();
  });

  it("removes only the rewrite generation in a paired booking comparison", async () => {
    const counts = [];
    const writes = [];
    for (const enabled of [false, true]) {
      const { model, receptionist } = agent([
        toolStep([toolCall("findAvailability", { ...lookupInput, finishVoiceReply: false })]),
        toolStep([toolCall("bookAppointment", { ...bookingInput, finishVoiceReply: true }, "tool-2")]), spoken,
      ], "voice", "+33155550100", enabled);
      const result = await receptionist.generate({ prompt: "Book January 8 at 10 if available; no SMS." });
      counts.push(model.doGenerateCalls.length);
      writes.push(domain.bookForCaller.mock.calls.at(-1));
      expect(Boolean(voiceBookingReply(result.steps, snapshot.timezone))).toBe(enabled);
    }
    expect(counts).toEqual([3, 2]);
    expect(writes[1]).toEqual(writes[0]);
    expect(domain.bookForCaller).toHaveBeenCalledTimes(2);
    expect(domain.checkOpening).toHaveBeenCalledTimes(2);
  });

  it.each([
    { ok: false, reason: "No staff available." },
    { ...opening, openings: [] },
    { ...opening, timezone: "America/Toronto" },
    { ...opening, date: "2030-01-09" },
    { ...opening, openings: [{ startsAt: "not-a-date" }] },
    { ...opening, serviceName: "x".repeat(2000) },
    { ...opening, date: "2030-01-09", openings: [{ startsAt: "2030-01-09T09:00:00.000Z" }] },
    { ...opening, serviceName: "<".repeat(160) },
  ])("keeps empty, failed or incoherent lookup results in the normal loop", async (output) => {
    domain.findOpenings.mockResolvedValue(output);
    const { model, receptionist } = agent([toolStep([toolCall("findAvailability", { ...lookupInput, finishVoiceReply: true })]), spoken]);
    const result = await receptionist.generate({ prompt: "Find availability." });
    expect(model.doGenerateCalls).toHaveLength(2);
    expect(result.text).toBe("Normal model reply.");
  });

  it("does not stop or claim success when a tool throws", async () => {
    domain.findOpenings.mockRejectedValue(new Error("TOOL_UNAVAILABLE"));
    const { model, receptionist } = agent([toolStep([toolCall("findAvailability", { ...lookupInput, finishVoiceReply: true })]), spoken]);
    const result = await receptionist.generate({ prompt: "Find availability." });
    expect(model.doGenerateCalls).toHaveLength(2);
    expect(result.text).toBe("Normal model reply.");
  });

  it("continues after multiple tool calls in the same step", async () => {
    const { model, receptionist } = agent([toolStep([
      toolCall("findAvailability", { ...lookupInput, finishVoiceReply: true }), toolCall("getBusinessHours", {}, "tool-2"),
    ]), spoken]);
    const result = await receptionist.generate({ prompt: "Check hours and availability." });
    expect(model.doGenerateCalls).toHaveLength(2);
    expect(result.text).toBe("Normal model reply.");
  });

  it("does not grant booking permission or a missing caller identity through the hint", async () => {
    const { model, receptionist } = agent([toolStep([toolCall("bookAppointment", { ...bookingInput, finishVoiceReply: true })]), spoken], "voice", "");
    const result = await receptionist.generate({ prompt: "Book it." });
    expect(model.doGenerateCalls).toHaveLength(2);
    expect(domain.checkOpening).not.toHaveBeenCalled();
    expect(domain.bookForCaller).not.toHaveBeenCalled();
    expect(result.text).toBe("Normal model reply.");
  });

  it("keeps booking failures in the normal loop without a confirmed handoff", async () => {
    domain.bookForCaller.mockResolvedValue({ ok: false, reason: "That time is no longer available." });
    const { model, receptionist } = agent([toolStep([toolCall("bookAppointment", { ...bookingInput, finishVoiceReply: true })]), spoken]);
    const result = await receptionist.generate({ prompt: "Book it." });
    expect(model.doGenerateCalls).toHaveLength(2);
    expect(result.text).toBe("Normal model reply.");
  });

  it("does not confirm a receipt for a different requested appointment time", async () => {
    domain.bookForCaller.mockResolvedValue({ ...booked, startsAt: "2030-01-08T10:00:00.000Z" });
    const { model, receptionist } = agent([toolStep([toolCall("bookAppointment", { ...bookingInput, finishVoiceReply: true })]), spoken]);
    const result = await receptionist.generate({ prompt: "Book January 8 at 10 in Paris." });
    expect(model.doGenerateCalls).toHaveLength(2);
    expect(result.text).toBe("Normal model reply.");
    expect(voiceBookingReply(result.steps, snapshot.timezone)).toBeUndefined();
  });

  it("leaves website chat on its existing full generation path", async () => {
    const { model, receptionist } = agent([toolStep([toolCall("findAvailability", { ...lookupInput, finishVoiceReply: true })]), spoken], "web_chat");
    const result = await receptionist.generate({ prompt: "Find availability." });
    expect(model.doGenerateCalls).toHaveLength(2);
    expect(result.text).toBe("Normal model reply.");
  });

  it("requires a consumer that explicitly supports verified voice replies", async () => {
    const { model, receptionist } = agent([toolStep([toolCall("findAvailability", { ...lookupInput, finishVoiceReply: true })]), spoken], "voice", "+33155550100", false);
    const result = await receptionist.generate({ prompt: "Find availability." });
    expect(model.doGenerateCalls).toHaveLength(2);
    expect(result.text).toBe("Normal model reply.");
  });
});
