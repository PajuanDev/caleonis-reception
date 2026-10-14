import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ access: vi.fn(), rate: vi.fn(), snapshot: vi.fn(), chatBilling: vi.fn(), voiceBilling: vi.fn(), register: vi.fn(), touch: vi.fn() }));
vi.mock("@lobbystack/domain", () => ({ getCachedBusinessSnapshot: mocks.snapshot, getWebVoiceBillingAllowance: mocks.voiceBilling, getWidgetChatAllowance: mocks.chatBilling, registerWidgetVisitor: mocks.register }));
vi.mock("@/lib/domain-context", () => ({ createWorkerDomainContext: () => ({ db: {} }) }));
vi.mock("@/lib/widget-access", () => ({ resolveWidgetSessionAccess: mocks.access }));
vi.mock("@/lib/widget-keys", () => ({ requestIpHash: () => undefined, touchWidgetKeyLastUsed: mocks.touch }));
vi.mock("@/lib/widget-policy", () => ({ enforceWidgetRateLimits: mocks.rate }));

import { GET } from "./route";

const request = () => new Request("https://admin.test/api/widget/config");

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("WEB_WIDGET_VOICE_WITHOUT_PHONE_ENABLED", "");
  mocks.access.mockResolvedValue({ ok: true, session: { businessId: "biz_1", widgetKeyId: "key_1", businessName: "Acme", businessSlug: "acme", defaultLocale: "fr", origin: "https://client.example", config: {} } });
  mocks.rate.mockResolvedValue({ allowed: true });
  mocks.snapshot.mockResolvedValue({ greeting: "Bonjour", contactChannels: {} });
  mocks.chatBilling.mockResolvedValue({ allowed: true, plan: "trial" });
  mocks.voiceBilling.mockResolvedValue({ allowed: true });
});

afterEach(() => { vi.unstubAllEnvs(); });

describe("GET /api/widget/config voice availability", () => {
  it("keeps widget voice disabled without a number by default", async () => {
    await expect((await GET(request())).json()).resolves.toMatchObject({ voiceEnabled: false, snapshotPresent: true });
  });

  it.each(["false", "1", "TRUE", " true "])("does not enable numberless voice with %s", async (value) => {
    vi.stubEnv("WEB_WIDGET_VOICE_WITHOUT_PHONE_ENABLED", value);
    await expect((await GET(request())).json()).resolves.toMatchObject({ voiceEnabled: false });
  });

  it("enables numberless widget voice only with the explicit opt-in", async () => {
    vi.stubEnv("WEB_WIDGET_VOICE_WITHOUT_PHONE_ENABLED", "true");
    await expect((await GET(request())).json()).resolves.toMatchObject({ voiceEnabled: true, billing: { voiceAllowed: true } });
  });

  it("keeps voice available for a business with a phone number", async () => {
    mocks.snapshot.mockResolvedValue({ contactChannels: { phoneNumber: "+33123456789" } });
    await expect((await GET(request())).json()).resolves.toMatchObject({ voiceEnabled: true });
  });

  it("does not advertise voice without a snapshot even with the opt-in", async () => {
    vi.stubEnv("WEB_WIDGET_VOICE_WITHOUT_PHONE_ENABLED", "true");
    mocks.snapshot.mockResolvedValue(null);
    await expect((await GET(request())).json()).resolves.toMatchObject({ voiceEnabled: false, snapshotPresent: false });
  });

  it("retains the billing denial when numberless voice is enabled", async () => {
    vi.stubEnv("WEB_WIDGET_VOICE_WITHOUT_PHONE_ENABLED", "true");
    mocks.voiceBilling.mockResolvedValue({ allowed: false });
    await expect((await GET(request())).json()).resolves.toMatchObject({ voiceEnabled: true, billing: { voiceAllowed: false } });
  });

  it.each([401, 403])("returns access denials before loading config with %s", async (status) => {
    vi.stubEnv("WEB_WIDGET_VOICE_WITHOUT_PHONE_ENABLED", "true");
    mocks.access.mockResolvedValue({ ok: false, response: Response.json({ code: "widget_session_invalid" }, { status }) });
    expect((await GET(request())).status).toBe(status);
    expect(mocks.rate).not.toHaveBeenCalled();
    expect(mocks.snapshot).not.toHaveBeenCalled();
  });

  it("retains rate limits with the opt-in", async () => {
    vi.stubEnv("WEB_WIDGET_VOICE_WITHOUT_PHONE_ENABLED", "true");
    mocks.rate.mockResolvedValue({ allowed: false, status: 429, code: "widget_rate_limited" });
    expect((await GET(request())).status).toBe(429);
    expect(mocks.snapshot).not.toHaveBeenCalled();
  });
});
