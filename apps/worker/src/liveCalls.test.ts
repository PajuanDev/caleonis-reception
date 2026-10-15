import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";

import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  controllers: 0,
  controllerOptions: [] as Array<Record<string, (...args: never[]) => unknown>>,
  snapshot: vi.fn(),
  recordProductEvent: vi.fn(async (..._args: unknown[]) => "event_1"),
  finishLiveCall: vi.fn(async (..._args: unknown[]) => false),
  createReceptionistAgent: vi.fn((..._args: unknown[]) => ({})),
}));

vi.mock("@lobbystack/agent-core", () => ({
  createAgentModel: () => ({ provider: "openai.responses", modelId: "gpt-6-luna" }),
  createReceptionistAgent: mocks.createReceptionistAgent,
  LiveCallController: class {
    constructor(options: Record<string, (...args: never[]) => unknown>) {
      mocks.controllers += 1;
      mocks.controllerOptions.push(options);
    }
    start() {}
  },
}));
vi.mock("@lobbystack/domain", () => ({
  getCachedBusinessSnapshot: mocks.snapshot,
  finishLiveCall: mocks.finishLiveCall,
  LIVE_CALL_PROVIDER: "openai_live",
  recordProductEvent: mocks.recordProductEvent,
}));
vi.mock("@lobbystack/jobs", () => ({ renewVoicePresenceGateway: vi.fn(async () => undefined), updateVoicePresence: vi.fn(async () => undefined) }));
vi.mock("openai", () => ({ default: class {} }));

import { createLiveCallHandler, parseAttachRequest, providerSeconds } from "./liveCalls";

function attachRequest(body: Record<string, unknown>): IncomingMessage {
  return Object.assign(Readable.from([Buffer.from(JSON.stringify(body))]), { url: "/internal/live/attach", method: "POST", headers: { "x-internal-service-token": "token" } }) as unknown as IncomingMessage;
}

function response(): ServerResponse {
  return { writeHead: vi.fn(), end: vi.fn() } as unknown as ServerResponse;
}

afterEach(() => { vi.unstubAllEnvs(); });

describe("createLiveCallHandler", () => {
  it.each([
    { configured: undefined, channel: "voice", intakeOnly: false, enabled: false },
    { configured: "true", channel: "voice", intakeOnly: false, enabled: false },
    { configured: "8bceb812-e851-433d-90a8-7f4e467cd32c", channel: "voice", intakeOnly: false, enabled: true },
    { configured: "8bceb812-e851-433d-90a8-7f4e467cd32c", channel: "voice", intakeOnly: true, enabled: false },
    { configured: "8bceb812-e851-433d-90a8-7f4e467cd32c", channel: "web_voice", intakeOnly: false, enabled: false },
  ])("applies the server Medium decision only to the exact pilot: %j", async ({ configured, channel, intakeOnly, enabled }) => {
    vi.stubEnv("LIVE_PROTOTYPE_ENABLED", "true"); vi.stubEnv("INTERNAL_SERVICE_TOKEN", "token"); vi.stubEnv("OPENAI_API_KEY", "fictional-key");
    vi.stubEnv("VOICE_PLANNER_MEDIUM_BUSINESS_ID", configured);
    vi.stubEnv("AI_CHAT_MODEL", "gpt-6-luna"); vi.stubEnv("AI_CHAT_REASONING_EFFORT", "high"); vi.stubEnv("AI_CHAT_PROVIDER_NAME", "openai");
    vi.stubEnv("AI_CHAT_BASE_URL", "https://api.openai.com/v1"); vi.stubEnv("OPENAI_BASE_URL", "");
    const businessId = "8bceb812-e851-433d-90a8-7f4e467cd32c";
    mocks.snapshot.mockResolvedValue({ businessId, greeting: "Hi" });
    const handler = createLiveCallHandler({ domain: { db: {} as never } });
    await handler.handle(attachRequest({ sessionId: `medium-${channel}-${intakeOnly}`, businessId, callId: "fictional-call", channel, intakeOnly }), response());
    const args = mocks.createReceptionistAgent.mock.calls.at(-1)![0];
    if (enabled) expect(args).toMatchObject({ voicePlannerReasoningEffort: "medium" });
    else expect(args).not.toHaveProperty("voicePlannerReasoningEffort");
    expect(mocks.controllerOptions.at(-1)).toMatchObject({ requestedPlannerEffort: enabled ? "medium" : "high" });
  });
  it("opens one sideband when two attaches for a session overlap", async () => {
    const previousControllers = mocks.controllers;
    vi.stubEnv("LIVE_PROTOTYPE_ENABLED", "true");
    vi.stubEnv("INTERNAL_SERVICE_TOKEN", "token");
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    let release!: (value: unknown) => void;
    mocks.snapshot.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    const handler = createLiveCallHandler({ domain: { db: {} as never } });
    const body = { sessionId: "live_1", businessId: "biz_1", callId: "call_1", channel: "voice" };
    const first = handler.handle(attachRequest(body), response());
    const second = handler.handle(attachRequest(body), response());
    await new Promise((resolve) => setTimeout(resolve, 10));
    release({ businessId: "biz_1", greeting: "Hi" });
    await Promise.all([first, second]);
    expect(mocks.controllers - previousControllers).toBe(1);
    expect(handler.activeCalls()).toBe(1);
  });
});

describe("live call latency telemetry", () => {
  async function startCall() {
    vi.stubEnv("LIVE_PROTOTYPE_ENABLED", "true");
    vi.stubEnv("INTERNAL_SERVICE_TOKEN", "token");
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    mocks.snapshot.mockResolvedValue({ businessId: "biz_1", greeting: "Hi" });
    mocks.recordProductEvent.mockClear();
    const handler = createLiveCallHandler({ domain: { db: {} as never } });
    await handler.handle(attachRequest({ sessionId: "live_2", businessId: "biz_1", callId: "call_2", channel: "web_voice", conversationId: "conv_2", callerPhone: "+14165550100" }), response());
    return mocks.controllerOptions.at(-1)!;
  }

  const delegation = { delegationId: "del_1", offsetMs: 4_000, transcriptWaitMs: 12, agentMs: 1_800, totalMs: 1_812, tools: ["getBusinessHours", "getBusinessHours"], answer: "We're open until 5.", failed: false };

  it("records voice.delegation_completed with timings and tool names only", async () => {
    const options = await startCall();
    options.onDelegation!(delegation as never);

    expect(mocks.recordProductEvent).toHaveBeenCalledWith({ db: {} }, {
      name: "voice.delegation_completed",
      businessId: "biz_1",
      distinctId: "system:business:biz_1",
      actorType: "worker",
      properties: { callId: "call_2", channel: "web_voice", provider: "openai_live", conversationId: "conv_2", agentMs: 1_800, totalMs: 1_812, tools: ["getBusinessHours"], toolCount: 2, failed: false },
    });
    expect(JSON.stringify(mocks.recordProductEvent.mock.calls)).not.toMatch(/open until|4165550100/);
  });

  it("persists and logs numerical execution without the answer or caller data", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    try {
      const options = await startCall();
      const execution = { modelSteps: 2, modelMs: 120, toolMs: 30, requestedEffort: "high", inputTokens: 60, outputTokens: 20, totalTokens: 80, cachedInputTokens: null, reasoningTokens: null, estimatedCostUsd: null,
        steps: [{ modelMs: 80, toolMs: 30, actualTier: "default", inputTokens: 30, outputTokens: 10, totalTokens: 40, cachedInputTokens: null, reasoningTokens: null },
          { modelMs: 40, toolMs: 0, actualTier: null, inputTokens: 30, outputTokens: 10, totalTokens: 40, cachedInputTokens: null, reasoningTokens: null }] };
      options.onDelegation!({ ...delegation, execution } as never);
      expect(mocks.recordProductEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ name: "voice.delegation_completed", properties: expect.objectContaining({ execution }) }));
      expect(JSON.parse(info.mock.calls.at(-1)![0] as string)).toMatchObject({ event: "live.delegation", execution });
      expect(JSON.stringify(info.mock.calls)).not.toMatch(/open until|4165550100/);
    } finally { info.mockRestore(); }
  });

  it("records one voice.call_latency_recorded summary when the call closes", async () => {
    mocks.finishLiveCall.mockResolvedValueOnce(true);
    const options = await startCall();
    options.onClose!({
      sessionId: "live_2",
      durationMs: 60_000,
      delegations: [delegation, { ...delegation, delegationId: "del_2", totalMs: 3_000, failed: true }, { ...delegation, delegationId: "del_3", totalMs: 900 }],
      latency: { firstSpeechMs: 1_100, greetedFirst: true, answerGapsMs: [700, 400, 2_500, 900], speechSource: "audio" },
    } as never);
    await vi.waitFor(() => expect(mocks.finishLiveCall).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mocks.recordProductEvent).toHaveBeenCalledWith({ db: {} }, expect.objectContaining({
      name: "voice.call_latency_recorded",
      businessId: "biz_1",
      properties: {
        callId: "call_2",
        channel: "web_voice",
        provider: "openai_live",
        conversationId: "conv_2",
        greetingMs: 1_100,
        firstSpeechMs: 1_100,
        greetedFirst: true,
        speechTimingSource: "audio",
        answerCount: 4,
        answerP50Ms: 700,
        answerP90Ms: 2_500,
        answerMaxMs: 2_500,
        delegationCount: 3,
        delegationFailedCount: 1,
        delegationP50TotalMs: 1_812,
        delegationMaxTotalMs: 3_000,
        durationMs: 60_000,
      },
    }));
  });

  it("skips the latency summary when a late re-attach finds the call already finished", async () => {
    mocks.finishLiveCall.mockResolvedValueOnce(false);
    const options = await startCall();
    options.onClose!({ sessionId: "live_2", durationMs: 1_000, delegations: [] } as never);
    await vi.waitFor(() => expect(mocks.finishLiveCall).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mocks.recordProductEvent).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ name: "voice.call_latency_recorded" }));
  });

  it("never lets a telemetry failure reach the call", async () => {
    mocks.finishLiveCall.mockResolvedValueOnce(true);
    const options = await startCall();
    mocks.recordProductEvent.mockRejectedValueOnce(new Error("database unavailable"));
    mocks.recordProductEvent.mockImplementationOnce(() => { throw new Error("database unavailable"); });
    expect(() => options.onDelegation!(delegation as never)).not.toThrow();
    expect(() => options.onClose!({ sessionId: "live_2", durationMs: 1_000, delegations: [] } as never)).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});

describe("providerSeconds", () => {
  it("uses the seconds OpenAI reported", () => {
    expect(providerSeconds({ billedSeconds: 42, durationMs: 41_000 }, "web_voice")).toBe(42);
    expect(providerSeconds({ billedSeconds: 15, durationMs: 800 }, "web_voice")).toBe(15);
  });

  it("assumes OpenAI's 15-second WebRTC minimum when the report never arrived", () => {
    expect(providerSeconds({ durationMs: 5_472 }, "web_voice")).toBe(15);
    expect(providerSeconds({ durationMs: 90_000 }, "web_voice")).toBe(90);
  });

  it("uses the measured length for a phone call without a report", () => {
    expect(providerSeconds({ durationMs: 5_472 }, "voice")).toBe(5.472);
  });
});

describe("parseAttachRequest", () => {
  it("keeps only the fields the worker trusts", () => {
    expect(parseAttachRequest(JSON.stringify({ sessionId: "live_1", businessId: "biz_1", callId: "call_1", channel: "web_voice", intakeOnly: "yes", maxDurationMs: -1 })))
      .toEqual({ sessionId: "live_1", businessId: "biz_1", callId: "call_1", channel: "web_voice" });
  });
});
