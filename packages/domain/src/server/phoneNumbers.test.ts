import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ withBusinessTransaction: vi.fn(), enqueueOutbox: vi.fn() }));

vi.mock("@lobbystack/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@lobbystack/db")>()),
  withBusinessTransaction: mocks.withBusinessTransaction,
  enqueueOutbox: mocks.enqueueOutbox,
}));

import { reserveOnboardingNumberClaim, reserveReplacementNumberClaim } from "./phoneNumbers";

const context = { db: {} as never };
const claimTokenSecret = "phone-claim-test-secret";
const input = { userId: "operator-1", businessId: "business-1", claimTokenSecret, idempotencyKey: "claim-1" };

function offer(purpose: "onboarding" | "replacement") {
  const payload = Buffer.from(JSON.stringify({
    v: 1, purpose, businessId: input.businessId, userId: input.userId,
    e164: "+14165550199", countryCode: "CA", kind: "local",
    capabilities: { sms: true, voice: true }, selection: { countryCode: "CA", kind: "local" },
    exp: Date.now() + 60_000,
  })).toString("base64url");
  return `${payload}.${createHmac("sha256", claimTokenSecret).update(payload).digest("base64url")}`;
}

afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });

describe.each([
  ["onboarding", reserveOnboardingNumberClaim],
  ["replacement", reserveReplacementNumberClaim],
] as const)("%s number purchase authorization", (purpose, reserve) => {
  it.each([undefined, "false", "TRUE", "1", " true "])("refuses a valid offer before reserving or queuing an order when the flag is %s", async value => {
    vi.stubEnv("PHONE_NUMBER_PURCHASE_ENABLED", value);
    await expect(reserve(context, { ...input, claimToken: offer(purpose) })).rejects.toMatchObject({
      status: 409, code: "phone_number_purchase_disabled", message: expect.stringContaining("Phone number purchases are temporarily unavailable"),
    });
    expect(mocks.withBusinessTransaction).not.toHaveBeenCalled();
    expect(mocks.enqueueOutbox).not.toHaveBeenCalled();
  });

  it("continues to the protected reservation only after explicit opt-in", async () => {
    vi.stubEnv("PHONE_NUMBER_PURCHASE_ENABLED", "true");
    mocks.withBusinessTransaction.mockResolvedValueOnce("reserved-claim");
    await expect(reserve(context, { ...input, claimToken: offer(purpose) })).resolves.toBe("reserved-claim");
    expect(mocks.withBusinessTransaction).toHaveBeenCalledWith(context.db, expect.objectContaining({ userId: input.userId, businessId: input.businessId, actorType: "operator" }), expect.any(Function));
  });

  it("keeps offer ownership checks when purchases are enabled", async () => {
    vi.stubEnv("PHONE_NUMBER_PURCHASE_ENABLED", "true");
    await expect(reserve(context, { ...input, businessId: "another-business", claimToken: offer(purpose) })).rejects.toThrow("does not belong");
    expect(mocks.withBusinessTransaction).not.toHaveBeenCalled();
  });
});
