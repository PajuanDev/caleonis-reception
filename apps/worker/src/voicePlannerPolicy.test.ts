import { afterEach, describe, expect, it, vi } from "vitest";

import { knownVoicePlannerEffort, voicePlannerMediumEnabled } from "./voicePlannerPolicy";

const PILOT = "8bceb812-e851-433d-90a8-7f4e467cd32c";
const OTHER_BUSINESS = "8bceb812-e851-433d-90a8-7f4e467cd32d";
const MODEL = { provider: "openai.responses", modelId: "gpt-6-luna" };
const BASE_URL = "https://api.openai.com/v1";

function enabled(environment: Record<string, string | undefined> = {}): boolean {
  return voicePlannerMediumEnabled({ businessId: PILOT, channel: "voice", model: MODEL,
    environment: { VOICE_PLANNER_MEDIUM_BUSINESS_ID: PILOT, ...environment } });
}

afterEach(() => vi.unstubAllEnvs());

describe("knownVoicePlannerEffort attribution", () => {
  it("recognizes only the supported Responses model and unambiguous Global destination", () => {
    expect(knownVoicePlannerEffort(MODEL, {})).toBe("high");
    expect(knownVoicePlannerEffort(MODEL, { AI_CHAT_REASONING_EFFORT: "low" })).toBe("low");
    expect(knownVoicePlannerEffort(MODEL, { AI_CHAT_REASONING_EFFORT: "invalid" })).toBe("high");
    expect(knownVoicePlannerEffort({ ...MODEL, provider: "openai.chat" }, {})).toBeUndefined();
    expect(knownVoicePlannerEffort({ ...MODEL, provider: "compatible.chat" }, {})).toBeUndefined();
    expect(knownVoicePlannerEffort({ ...MODEL, modelId: "other-model" }, {})).toBeUndefined();
    expect(knownVoicePlannerEffort(MODEL, { AI_CHAT_BASE_URL: "https://eu.api.openai.com/v1" })).toBeUndefined();
    expect(knownVoicePlannerEffort(MODEL, { OPENAI_BASE_URL: "https://compatible.invalid/v1" })).toBeUndefined();
  });
});

describe("voicePlannerMediumEnabled", () => {
  it("is off unless the server flag selects the exact personal pilot", () => {
    expect(voicePlannerMediumEnabled({ businessId: PILOT, channel: "voice", model: MODEL, environment: {} })).toBe(false);
    expect(enabled()).toBe(true);
  });

  it.each([undefined, "", " ", "true", "1", "*", "all", OTHER_BUSINESS, `${PILOT},${OTHER_BUSINESS}`,
    JSON.stringify([PILOT]), ` ${PILOT}`, `${PILOT} `, PILOT.toUpperCase()])("rejects an inexact allowlist value %j", value => {
    expect(enabled({ VOICE_PLANNER_MEDIUM_BUSINESS_ID: value })).toBe(false);
  });

  it.each([OTHER_BUSINESS, "", "*", ` ${PILOT}`, PILOT.toUpperCase()])("rejects another request business %j", businessId => {
    expect(voicePlannerMediumEnabled({ businessId, channel: "voice", model: MODEL,
      environment: { VOICE_PLANNER_MEDIUM_BUSINESS_ID: PILOT } })).toBe(false);
  });

  it.each(["web_voice", "web_chat", "chat", "sms", "Voice", " voice", "voice ", ""])("rejects non-PSTN channel %j", channel => {
    expect(voicePlannerMediumEnabled({ businessId: PILOT, channel, model: MODEL,
      environment: { VOICE_PLANNER_MEDIUM_BUSINESS_ID: PILOT } })).toBe(false);
  });

  it("keeps intake-only calls off and permits an explicit false", () => {
    expect(voicePlannerMediumEnabled({ businessId: PILOT, channel: "voice", intakeOnly: true, model: MODEL,
      environment: { VOICE_PLANNER_MEDIUM_BUSINESS_ID: PILOT } })).toBe(false);
    expect(voicePlannerMediumEnabled({ businessId: PILOT, channel: "voice", intakeOnly: false, model: MODEL,
      environment: { VOICE_PLANNER_MEDIUM_BUSINESS_ID: PILOT } })).toBe(true);
  });

  it.each([
    { provider: "openai.chat", modelId: "gpt-6-luna" },
    { provider: "openai", modelId: "gpt-6-luna" },
    { provider: "other.responses", modelId: "gpt-6-luna" },
    { provider: "openai.responses ", modelId: "gpt-6-luna" },
    { provider: "openai.responses", modelId: "gpt-6-sol" },
    { provider: "openai.responses", modelId: "gpt-6-luna-2026-10-15" },
    { provider: "openai.responses", modelId: " gpt-6-luna" },
  ])("rejects actual model mismatch %j", model => {
    expect(voicePlannerMediumEnabled({ businessId: PILOT, channel: "voice", model,
      environment: { VOICE_PLANNER_MEDIUM_BUSINESS_ID: PILOT } })).toBe(false);
  });

  it.each([
    { AI_CHAT_MODEL: "gpt-6-sol" }, { AI_CHAT_MODEL: "GPT-6-LUNA" },
    { AI_CHAT_PROVIDER_NAME: "other" }, { AI_CHAT_PROVIDER_NAME: "OpenAI" },
    { AI_CHAT_REASONING_EFFORT: "low" }, { AI_CHAT_REASONING_EFFORT: "medium" },
    { AI_CHAT_REASONING_EFFORT: "minimal" }, { AI_CHAT_REASONING_EFFORT: "none" },
    { AI_CHAT_REASONING_EFFORT: "xhigh" }, { AI_CHAT_REASONING_EFFORT: "invalid" },
  ])("rejects a changed baseline environment %j", environment => {
    expect(enabled(environment)).toBe(false);
  });

  it("uses the existing trimmed baseline defaults for omitted or blank model settings", () => {
    expect(enabled({ AI_CHAT_MODEL: " gpt-6-luna ", AI_CHAT_PROVIDER_NAME: " openai ", AI_CHAT_REASONING_EFFORT: " high " })).toBe(true);
    expect(enabled({ AI_CHAT_MODEL: " ", AI_CHAT_PROVIDER_NAME: "", AI_CHAT_REASONING_EFFORT: undefined })).toBe(true);
  });

  it.each([undefined, "", " ", BASE_URL, `${BASE_URL}/`, ` ${BASE_URL}/// `])("accepts normalized global endpoint %j", value => {
    expect(enabled({ AI_CHAT_BASE_URL: value })).toBe(true);
    expect(enabled({ OPENAI_BASE_URL: value })).toBe(true);
  });

  const rejectedEndpoints = [
    "https://eu.api.openai.com/v1", "https://api.openai.com.evil.test/v1",
    "https://api.openai.com@evil.test/v1", "https://evil.test@api.openai.com/v1",
    "http://api.openai.com/v1", "https://api.openai.com:443/v1", "https://API.OPENAI.COM/v1",
    "https://api.openai.com/v1?region=eu", "https://api.openai.com/v1/?region=eu",
    "https://api.openai.com/v1#global", "https://api.openai.com/v1/../v1",
    "https://api.openai.com/v1/responses", "https://api.openai.com/v10", "/", "true",
  ];

  it.each(rejectedEndpoints)("rejects chat endpoint %j", value => {
    expect(enabled({ AI_CHAT_BASE_URL: value })).toBe(false);
  });

  it.each(rejectedEndpoints)("rejects an ambiguous ambient SDK endpoint %j", value => {
    expect(enabled({ AI_CHAT_BASE_URL: BASE_URL, OPENAI_BASE_URL: value })).toBe(false);
  });

  it("checks both endpoint settings independently", () => {
    expect(enabled({ AI_CHAT_BASE_URL: "https://eu.api.openai.com/v1", OPENAI_BASE_URL: BASE_URL })).toBe(false);
    expect(enabled({ AI_CHAT_BASE_URL: BASE_URL, OPENAI_BASE_URL: "https://eu.api.openai.com/v1" })).toBe(false);
    expect(enabled({ AI_CHAT_BASE_URL: ` ${BASE_URL}/// `, OPENAI_BASE_URL: ` ${BASE_URL}// ` })).toBe(true);
  });

  it("reads the server environment at call time when no environment is injected", () => {
    for (const key of ["AI_CHAT_MODEL", "AI_CHAT_PROVIDER_NAME", "AI_CHAT_REASONING_EFFORT", "AI_CHAT_BASE_URL", "OPENAI_BASE_URL"]) vi.stubEnv(key, "");
    vi.stubEnv("VOICE_PLANNER_MEDIUM_BUSINESS_ID", "");
    expect(voicePlannerMediumEnabled({ businessId: PILOT, channel: "voice", model: MODEL })).toBe(false);
    vi.stubEnv("VOICE_PLANNER_MEDIUM_BUSINESS_ID", PILOT);
    expect(voicePlannerMediumEnabled({ businessId: PILOT, channel: "voice", model: MODEL })).toBe(true);
    vi.stubEnv("OPENAI_BASE_URL", "https://eu.api.openai.com/v1");
    expect(voicePlannerMediumEnabled({ businessId: PILOT, channel: "voice", model: MODEL })).toBe(false);
    expect(enabled()).toBe(true);
  });
});
