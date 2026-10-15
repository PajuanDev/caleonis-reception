import { readFileSync } from "node:fs";

export type ReviewPlan = "free_cloud" | "starter" | "pro" | "enterprise";
export type ReviewInterval = "monthly" | "annual";
type Plan = {
  monthlyChargeCents: number | null;
  annualChargeCents: number | null;
  annualEffectiveMonthlyChargeCents: number | null;
  voiceMinutesIncludedMonthly: number | null;
  upstreamBusinessNumbers: number | null;
  franceSmsStatus: string;
  voiceOverageCentsPerMinute: number | null;
};
export type ReviewCatalogue = {
  schemaVersion: number;
  status: string;
  currency: string;
  taxTreatment: string;
  publicationEnabled: boolean;
  liveCheckoutEnabled: boolean;
  numberProvisioningEnabled: boolean;
  providerProductIds: Record<string, string>;
  plans: Record<ReviewPlan, Plan>;
  activationBlockers: string[];
};

/** Review tooling only: deliberately absent from runtime packages and exports. */
export function loadReviewCatalogue(): ReviewCatalogue {
  const catalogue = JSON.parse(readFileSync(new URL("../docs/p1/pricing-eur-review.json", import.meta.url), "utf8")) as ReviewCatalogue;
  validateReviewCatalogue(catalogue);
  return catalogue;
}

export function validateReviewCatalogue(catalogue: ReviewCatalogue): void {
  if (catalogue.schemaVersion !== 1 || catalogue.currency !== "EUR" || catalogue.status !== "DRAFT_REQUIRES_USER_VALIDATION") {
    throw new Error("Invalid EUR review catalogue.");
  }
  if (catalogue.liveCheckoutEnabled !== false || catalogue.publicationEnabled !== false || catalogue.numberProvisioningEnabled !== false || Object.keys(catalogue.providerProductIds).length !== 0) {
    throw new Error("Review catalogue cannot publish, provision or activate checkout.");
  }
  if (!catalogue.taxTreatment.startsWith("PENDING_") || catalogue.activationBlockers.length === 0) {
    throw new Error("A review must retain unresolved tax treatment and activation blockers.");
  }
  for (const plan of Object.values(catalogue.plans)) {
    for (const value of [plan.monthlyChargeCents, plan.annualChargeCents, plan.annualEffectiveMonthlyChargeCents]) {
      if (value !== null && (!Number.isSafeInteger(value) || value < 0)) throw new Error("Prices must be nonnegative integer EUR cents.");
    }
    if (plan.annualChargeCents !== null && plan.annualEffectiveMonthlyChargeCents !== null && plan.annualChargeCents !== 12 * plan.annualEffectiveMonthlyChargeCents) {
      throw new Error("Annual amount differs from 12 effective monthly prices.");
    }
    if (plan.franceSmsStatus !== "DISABLED_VOICE_ONLY") throw new Error("France Voice-only review cannot enable SMS.");
  }
}

export function reviewQuote(catalogue: ReviewCatalogue, plan: ReviewPlan, interval: ReviewInterval) {
  validateReviewCatalogue(catalogue);
  return {
    plan, interval, currency: "EUR" as const,
    amountCents: interval === "annual" ? catalogue.plans[plan].annualChargeCents : catalogue.plans[plan].monthlyChargeCents,
    taxTreatment: catalogue.taxTreatment,
    checkoutAllowed: false as const,
    publicationAllowed: false as const,
    numberProvisioningAllowed: false as const,
    blockers: [...catalogue.activationBlockers],
  };
}

/** Checks evidence supplied by a future sandbox export; never creates a checkout. */
export function reconcileSandboxProduct(catalogue: ReviewCatalogue, evidence: {
  environment: "sandbox" | "production";
  plan: "starter" | "pro";
  interval: ReviewInterval;
  currency: string;
  amountCents: number;
  recurrence: "month" | "year";
}) {
  const quote = reviewQuote(catalogue, evidence.plan, evidence.interval);
  const errors: string[] = [];
  if (evidence.environment !== "sandbox") errors.push("LIVE_PROVIDER_EVIDENCE_REJECTED");
  if (evidence.currency.toUpperCase() !== quote.currency) errors.push("PROVIDER_CURRENCY_NOT_EUR");
  if (evidence.amountCents !== quote.amountCents) errors.push("PROVIDER_AMOUNT_MISMATCH");
  if (evidence.recurrence !== (evidence.interval === "annual" ? "year" : "month")) errors.push("PROVIDER_INTERVAL_MISMATCH");
  return { sandboxProductMatches: errors.length === 0, errors, liveBillingAllowed: false as const, publicationAllowed: false as const };
}

export type MarginScenario = {
  netRevenueEur: number | null;
  eurPerUsd: number | null;
  finalTwilioCostUsd: number | null;
  gptLiveSessionMinutes: number | null;
  backendModelAndToolsCostUsd: number | null;
  infrastructureAllocationUsd: number | null;
  storageEmailMonitoringCostUsd: number | null;
  paymentFeesEur: number | null;
};

/** Explicit scenarios, not a claim of measured production margin. Unknowns never become zero. */
export function calculateMarginScenario(input: MarginScenario) {
  const missing = Object.entries(input).filter(([, value]) => value === null).map(([key]) => key);
  for (const [key, value] of Object.entries(input)) {
    if (value !== null && (!Number.isFinite(value) || value < 0 || (key === "eurPerUsd" && value === 0))) throw new Error(`Invalid margin input: ${key}`);
  }
  if (missing.length > 0) return { status: "PENDING" as const, missing, contributionEur: null, measuredProductionMargin: false as const };
  const providerCostsUsd = input.finalTwilioCostUsd! + input.gptLiveSessionMinutes! * 0.05 + input.backendModelAndToolsCostUsd! + input.infrastructureAllocationUsd! + input.storageEmailMonitoringCostUsd!;
  return {
    status: "SCENARIO_ONLY" as const, missing,
    contributionEur: input.netRevenueEur! - providerCostsUsd * input.eurPerUsd! - input.paymentFeesEur!,
    measuredProductionMargin: false as const,
  };
}
