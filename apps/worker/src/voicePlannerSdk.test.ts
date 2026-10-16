import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";

const wire = vi.hoisted(() => {
  const original = globalThis.fetch;
  const calls: Array<Record<string, unknown>> = [];
  const responses: Array<Record<string, unknown>> = [];
  // Installed before provider imports. No branch can forward to native fetch.
  globalThis.fetch = async (input, init) => {
    if (String(input) !== "https://api.openai.com/v1/responses" || init?.method !== "POST" || typeof init.body !== "string") throw Error("OFFLINE_EXACT_RESPONSES_ONLY");
    if (calls.length >= 3 || !responses.length) throw Error("OFFLINE_REQUEST_BOUND");
    calls.push(JSON.parse(init.body) as Record<string, unknown>);
    return new Response(JSON.stringify(responses.shift()), { status: 200, headers: { "content-type": "application/json" } });
  };
  return { original, calls, responses };
});
const domain = vi.hoisted(() => ({ findOpenings: vi.fn(), checkOpening: vi.fn(), bookForCaller: vi.fn(), snapshot: vi.fn(), recordProductEvent: vi.fn(async (..._args: unknown[]) => "fictional-event"),
  finishLiveCall: vi.fn(async () => false), markLiveCallMediaStarted: vi.fn(async () => undefined), saveLiveCallTurn: vi.fn(async () => undefined) }));
const sidebands = vi.hoisted(() => [] as Array<{ emit(name: string, event: unknown): void; sent: unknown[] }>);
vi.mock("@lobbystack/domain", () => ({ ...domain, getCachedBusinessSnapshot: domain.snapshot, LIVE_CALL_PROVIDER: "openai_live" }));
vi.mock("@lobbystack/jobs", () => ({ renewVoicePresenceGateway: vi.fn(async () => undefined), updateVoicePresence: vi.fn(async () => undefined) }));
vi.mock("openai", () => ({ default: class { live = { sessions: { hangup: async () => undefined } }; } }));
vi.mock("openai/resources/live/sideband/ws", async () => {
  const { EventEmitter } = await import("node:events");
  return { SidebandWS: class extends EventEmitter {
    sent: unknown[] = [];
    constructor() { super(); sidebands.push(this); }
    send(event: unknown) { this.sent.push(event); }
    close() {}
  } };
});

import { createAgentModel, createReceptionistAgent, describePlannerExecution } from "@lobbystack/agent-core";
import { demoSnapshot } from "@lobbystack/shared";
import { voicePlannerMediumEnabled } from "./voicePlannerPolicy";
import { createLiveCallHandler } from "./liveCalls";

const pilot = "8bceb812-e851-433d-90a8-7f4e467cd32c";
const startsAt = "2030-01-08T09:00:00.000Z";
const lookup = { serviceName: "Pilot callback", date: "2030-01-08", preferredTime: "10:00" };
const booking = { serviceName: "Pilot callback", startsAt, smsConsentGranted: false };
function response(output: object[], tier: string | null = "default") {
  return { id: "PRIVATE_RESPONSE_ID", created_at: 0, model: "gpt-6-luna", status: "completed", output,
    ...(tier ? { service_tier: tier } : {}),
    usage: { input_tokens: 100, output_tokens: 30, total_tokens: 130, input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: 20 } } };
}
function functionOutput(name: string, args: object, index: number) {
  return { type: "function_call", id: `PRIVATE_FUNCTION_${index}`, call_id: `PRIVATE_TOOL_${index}`, name, arguments: JSON.stringify(args), status: "completed" };
}
const textOutput = { type: "message", id: "PRIVATE_MESSAGE", role: "assistant", status: "completed", content: [{ type: "output_text", text: "Your callback is booked. No text will be sent.", annotations: [] }] };

beforeEach(() => {
  vi.stubEnv("OPENAI_BASE_URL", "https://api.openai.com/v1");
  vi.clearAllMocks();
  wire.calls.length = 0; wire.responses.length = 0;
  wire.responses.push(response([functionOutput("findAvailability", lookup, 1)]), response([functionOutput("bookAppointment", booking, 2)]), response([textOutput]));
  domain.findOpenings.mockResolvedValue({ ok: true, openings: [{ startsAt }] });
  domain.checkOpening.mockResolvedValue({ ok: true, available: true });
  domain.bookForCaller.mockResolvedValue({ ok: true, appointmentId: "PRIVATE_APPOINTMENT", startsAt, status: "confirmed" });
});
afterEach(() => vi.unstubAllEnvs());
afterAll(() => { globalThis.fetch = wire.original; });

async function generate(input: { businessId?: string; channel?: "voice" | "web_voice" | "web_chat"; configured?: string | undefined; intakeOnly?: boolean } = {}) {
  const businessId = input.businessId ?? pilot;
  const channel = input.channel ?? "voice";
  const environment = { OPENAI_API_KEY: "fictional-key-not-a-credential", AI_CHAT_BASE_URL: "https://api.openai.com/v1", VOICE_PLANNER_MEDIUM_BUSINESS_ID: input.configured };
  const model = createAgentModel(environment)!;
  const admitted = voicePlannerMediumEnabled({ businessId, channel, model: typeof model === "object" ? { provider: model.provider, modelId: model.modelId } : { provider: "", modelId: "" },
    ...(input.intakeOnly !== undefined ? { intakeOnly: input.intakeOnly } : {}), environment });
  const receptionist = createReceptionistAgent({ model,
    ...(admitted ? { voicePlannerReasoningEffort: "medium" } : {}),
    context: { domain: { db: {} as never }, snapshot: { ...demoSnapshot, businessId, timezone: "Europe/Paris", bookingMode: "instant" }, channel,
      callerPhone: "+33155550100", ...(input.intakeOnly !== undefined ? { intakeOnly: input.intakeOnly } : {}) },
  });
  const result = await receptionist.generate({ prompt: "Book the fictional callback on January 8 at 10 if available. I refuse SMS." });
  return { result, admitted, execution: describePlannerExecution(result.steps, admitted ? "medium" : "high") };
}

describe("pilot reasoning through the actual SDK with a closed preimport fetch", () => {
  it("sends Medium and persists real SDK measurements through handler, controller and domain telemetry", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.stubEnv("LIVE_PROTOTYPE_ENABLED", "true"); vi.stubEnv("INTERNAL_SERVICE_TOKEN", "fictional-token");
    vi.stubEnv("OPENAI_API_KEY", "fictional-key"); vi.stubEnv("AI_CHAT_API_KEY", "fictional-key");
    vi.stubEnv("VOICE_PLANNER_MEDIUM_BUSINESS_ID", pilot); vi.stubEnv("AI_CHAT_MODEL", "gpt-6-luna");
    vi.stubEnv("AI_CHAT_REASONING_EFFORT", "high"); vi.stubEnv("AI_CHAT_PROVIDER_NAME", "openai");
    vi.stubEnv("AI_CHAT_BASE_URL", "https://api.openai.com/v1"); vi.stubEnv("OPENAI_BASE_URL", "https://api.openai.com/v1");
    domain.snapshot.mockResolvedValue({ ...demoSnapshot, businessId: pilot, bookingMode: "instant", timezone: "Europe/Paris" });
    const handler = createLiveCallHandler({ domain: { db: {} as never } });
    try {
      const request = Object.assign(Readable.from([Buffer.from(JSON.stringify({ sessionId: "fictional-session", businessId: pilot, callId: "fictional-call", channel: "voice", callerPhone: "+33155550100" }))]),
        { url: "/internal/live/attach", method: "POST", headers: { "x-internal-service-token": "fictional-token" } }) as unknown as IncomingMessage;
      await handler.handle(request, { writeHead: vi.fn(), end: vi.fn() } as unknown as ServerResponse);
      const socket = sidebands.at(-1)!;
      socket.emit("session.input_transcript.delta", { delta: "Fictional callback request without SMS.", end_ms: 1000 });
      socket.emit("session.delegation.created", { delegation: { id: "fictional-delegation" }, offset_ms: 900 });
      await vi.waitFor(() => expect(domain.recordProductEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        name: "voice.delegation_completed", properties: expect.objectContaining({ execution: expect.objectContaining({ requestedEffort: "medium", modelSteps: 3, inputTokens: 300, estimatedCostUsd: null }) }),
      })));
      expect(wire.calls).toHaveLength(3);
      expect(wire.calls.every(body => (body.reasoning as { effort: string }).effort === "medium" && body.store === false)).toBe(true);
      const event = domain.recordProductEvent.mock.calls.find((row: unknown[]) => (row[1] as { name: string }).name === "voice.delegation_completed")!;
      const properties = (event[1] as { properties: { execution: ReturnType<typeof describePlannerExecution> } }).properties;
      expect(properties.execution.modelMs).toBeGreaterThanOrEqual(0);
      expect(properties.execution.toolMs).toBeGreaterThanOrEqual(0);
      expect(properties.execution.steps.map(step => step.actualTier)).toEqual(["default", "default", "default"]);
      expect(JSON.stringify(properties.execution)).not.toMatch(/PRIVATE_|Fictional callback|33155550100|booked|providerMetadata|toolExecutionMs/);
      expect(domain.checkOpening).toHaveBeenCalledOnce();
      expect(domain.bookForCaller).toHaveBeenCalledExactlyOnceWith(expect.anything(), expect.objectContaining({ smsConsentGranted: false }));
    } finally { await handler.closeAll(); info.mockRestore(); vi.unstubAllEnvs(); }
  });
  it("keeps lookup, booking and final answer under medium, with every domain check and SMS refusal", async () => {
    const { result, admitted, execution } = await generate({ configured: pilot });
    expect(admitted).toBe(true);
    expect(wire.calls).toHaveLength(3);
    for (const body of wire.calls) {
      expect(body).toMatchObject({ model: "gpt-6-luna", reasoning: { effort: "medium" }, store: false });
      expect(body).not.toHaveProperty("service_tier");
      expect(JSON.stringify(body.tools)).not.toContain("finishVoiceReply");
    }
    expect(domain.findOpenings).toHaveBeenCalledOnce();
    expect(domain.checkOpening).toHaveBeenCalledOnce();
    expect(domain.bookForCaller).toHaveBeenCalledExactlyOnceWith(expect.anything(), expect.objectContaining({ businessId: pilot, startsAt, channel: "voice", smsConsentGranted: false }));
    expect(result.steps).toHaveLength(3);
    expect(result.text).toBe(textOutput.content[0]!.text);
    expect(execution).toMatchObject({ modelSteps: 3, requestedEffort: "medium", inputTokens: 300, outputTokens: 90, totalTokens: 390, reasoningTokens: 60, estimatedCostUsd: null });
    expect(execution.modelMs).toBeGreaterThanOrEqual(0);
    expect(execution.toolMs).toBeGreaterThanOrEqual(0);
    expect(execution.steps.map(step => step.actualTier)).toEqual(["default", "default", "default"]);
    expect(JSON.stringify(execution)).not.toMatch(/PRIVATE_|33155550100|booked|Pilot callback|providerMetadata|toolExecutionMs/);
  });

  it.each([
    { configured: undefined },
    { configured: "true" },
    { configured: `${pilot},other` },
    { configured: pilot, businessId: "other" },
    { configured: pilot, channel: "web_voice" as const },
    { configured: pilot, channel: "web_chat" as const },
  ])("keeps the full high/store:false loop outside the admitted pilot: %j", async input => {
    const { admitted, execution } = await generate(input);
    expect(admitted).toBe(false);
    expect(wire.calls).toHaveLength(3);
    expect(wire.calls.every(body => (body.reasoning as { effort: string }).effort === "high" && body.store === false)).toBe(true);
    expect(execution.requestedEffort).toBe("high");
    expect(domain.checkOpening).toHaveBeenCalledOnce();
    expect(domain.bookForCaller).toHaveBeenCalledOnce();
  });

  it("records missing or unrecognized actual tiers as unknown without Standard pricing", async () => {
    wire.responses.splice(0, 3, response([functionOutput("findAvailability", lookup, 1)], null), response([functionOutput("bookAppointment", booking, 2)], "not-a-tier"), response([textOutput], "default"));
    const { execution } = await generate({ configured: pilot });
    expect(execution.steps.map(step => step.actualTier)).toEqual([null, null, "default"]);
    expect(execution.estimatedCostUsd).toBeNull();
  });

  it("does not mutate the shared high model when one agent opts into Medium", async () => {
    wire.responses.splice(0, 3, response([textOutput]), response([textOutput]));
    const model = createAgentModel({ OPENAI_API_KEY: "fictional-key-not-a-credential" })!;
    for (const medium of [true, false]) {
      const receptionist = createReceptionistAgent({ model, ...(medium ? { voicePlannerReasoningEffort: "medium" } : {}),
        context: { domain: { db: {} as never }, snapshot: demoSnapshot, channel: medium ? "voice" : "web_chat" } });
      await receptionist.generate({ prompt: "Fictional request without any external action." });
    }
    expect(wire.calls.map(body => (body.reasoning as { effort: string }).effort)).toEqual(["medium", "high"]);
    expect(wire.calls.every(body => body.store === false)).toBe(true);
  });
});
