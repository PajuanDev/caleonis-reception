import { afterEach, describe, expect, it, vi } from "vitest";
import { requireOnboardingStage } from "./onboarding-route";

const domain = vi.hoisted(() => ({
  getState: vi.fn(), canVisit: vi.fn().mockReturnValue(false),
  resolveRoute: vi.fn().mockReturnValue("/"),
  getSession: vi.fn().mockResolvedValue({ user: { id: "operator" } }),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: (target: string) => { throw new Error(`Redirect:${target}`); } }));
vi.mock("@lobbystack/domain", () => ({ getActiveOnboardingState: domain.getState, canVisitOnboardingStage: domain.canVisit, resolveOnboardingRoute: domain.resolveRoute }));
vi.mock("./auth", () => ({ getSession: domain.getSession }));
vi.mock("./api-helpers", () => ({ getAppDatabase: () => ({ db: {} }) }));

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("onboarding completion route during single-host rehearsal", () => {
  it.each([["true", "/dashboard"], ["false", "/"]])("maps completed onboarding for stage flag %s", async (flag, destination) => {
    vi.stubEnv("NEXT_PUBLIC_P1_SINGLE_HOST_STAGING", flag);
    domain.getState.mockResolvedValue({ stage: "complete", businessId: "business" });
    domain.resolveRoute.mockReturnValue("/");
    await expect(requireOnboardingStage("/onboarding/attribution")).rejects.toThrow(`Redirect:${destination}`);
  });
  it("keeps incomplete onboarding on its existing private route", async () => {
    vi.stubEnv("NEXT_PUBLIC_P1_SINGLE_HOST_STAGING", "true");
    domain.getState.mockResolvedValue({ stage: "attribution", businessId: "business" });
    domain.resolveRoute.mockReturnValue("/onboarding/attribution");
    await expect(requireOnboardingStage("/onboarding/plan")).rejects.toThrow("Redirect:/onboarding/attribution");
  });
});
