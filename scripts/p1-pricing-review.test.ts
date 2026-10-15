import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { billingPlanCatalog } from "../packages/shared/src/billing";
import { calculateMarginScenario, loadReviewCatalogue, reconcileSandboxProduct, reviewQuote, validateReviewCatalogue } from "./p1-pricing-review";

describe("EUR catalogue review without activation", () => {
  it("keeps the same numeric recurring prices, minutes and voice overages as runtime", () => {
    const catalogue = loadReviewCatalogue();
    for (const slug of ["free_cloud", "starter", "pro", "enterprise"] as const) {
      const candidate = catalogue.plans[slug];
      const runtime = billingPlanCatalog[slug];
      expect(candidate.monthlyChargeCents).toBe(runtime.monthlyChargeCents);
      expect(candidate.annualChargeCents).toBe(runtime.annualChargeCents);
      expect(candidate.voiceMinutesIncludedMonthly).toBe(runtime.voiceSecondsIncluded === null ? null : runtime.voiceSecondsIncluded / 60);
      expect(candidate.voiceOverageCentsPerMinute).toBe(runtime.voiceOverageRatePerMinuteCents);
      for (const interval of ["monthly", "annual"] as const) expect(reviewQuote(catalogue, slug, interval)).toMatchObject({ currency: "EUR", checkoutAllowed: false, publicationAllowed: false, numberProvisioningAllowed: false });
    }
    expect(reviewQuote(catalogue, "starter", "annual").amountCents).toBe(28800);
    expect(reviewQuote(catalogue, "pro", "annual").amountCents).toBe(96000);
  });

  it("rejects activation by a mutated flag or injected provider product", () => {
    for (const mutation of [{ liveCheckoutEnabled: true }, { publicationEnabled: true }, { numberProvisioningEnabled: true }, { providerProductIds: { starter: "live-product" } }]) {
      expect(() => validateReviewCatalogue({ ...loadReviewCatalogue(), ...mutation })).toThrow("cannot publish");
    }
  });

  it("checks provider currency, numeric cents, recurrence and sandbox environment independently", () => {
    const catalogue = loadReviewCatalogue();
    const evidence = { environment: "sandbox", plan: "starter", interval: "annual", currency: "eur", amountCents: 28800, recurrence: "year" } as const;
    expect(reconcileSandboxProduct(catalogue, evidence)).toEqual({ sandboxProductMatches: true, errors: [], liveBillingAllowed: false, publicationAllowed: false });
    expect(reconcileSandboxProduct(catalogue, { ...evidence, currency: "USD" }).errors).toContain("PROVIDER_CURRENCY_NOT_EUR");
    expect(reconcileSandboxProduct(catalogue, { ...evidence, amountCents: 2400 }).errors).toContain("PROVIDER_AMOUNT_MISMATCH");
    expect(reconcileSandboxProduct(catalogue, { ...evidence, recurrence: "month" }).errors).toContain("PROVIDER_INTERVAL_MISMATCH");
    expect(reconcileSandboxProduct(catalogue, { ...evidence, environment: "production" }).errors).toContain("LIVE_PROVIDER_EVIDENCE_REJECTED");
  });

  it("does not allow the review catalogue or scripts to enter app/runtime source", () => {
    const root = resolve(import.meta.dirname, "..");
    const visit = (directory: string): void => {
      for (const item of readdirSync(directory, { withFileTypes: true })) {
        if (["node_modules", ".next", "dist", ".astro", ".git"].includes(item.name)) continue;
        const filename = resolve(directory, item.name);
        if (item.isDirectory()) visit(filename);
        else if (/\.(?:tsx?|mjs|js|astro)$/.test(item.name)) expect(readFileSync(filename, "utf8"), filename).not.toMatch(/(?:from\s*["'][^"']*|import\s*\(\s*["'][^"']*|require\s*\(\s*["'][^"']*)(?:p1-pricing-review|pricing-eur-review)/);
      }
    };
    visit(resolve(root, "apps"));
    visit(resolve(root, "packages"));
  });
});

describe("margin evidence", () => {
  const scenario = { netRevenueEur: 24, eurPerUsd: 1, finalTwilioCostUsd: 2, gptLiveSessionMinutes: 150, backendModelAndToolsCostUsd: 1, infrastructureAllocationUsd: 2, storageEmailMonitoringCostUsd: 0.5, paymentFeesEur: 1 };
  it("charges GPT-Live and backend separately and recognizes a negative scenario", () => {
    expect(calculateMarginScenario(scenario)).toMatchObject({ contributionEur: 10, measuredProductionMargin: false });
    expect(calculateMarginScenario({ ...scenario, netRevenueEur: 5 }).contributionEur).toBe(-9);
  });
  it("refuses to calculate a margin when FX, VAT-adjusted revenue or provider bills are unknown", () => {
    expect(calculateMarginScenario({ ...scenario, eurPerUsd: null, netRevenueEur: null, finalTwilioCostUsd: null })).toMatchObject({ status: "PENDING", contributionEur: null, missing: ["netRevenueEur", "eurPerUsd", "finalTwilioCostUsd"] });
    expect(() => calculateMarginScenario({ ...scenario, eurPerUsd: 0 })).toThrow("Invalid margin input");
    expect(() => calculateMarginScenario({ ...scenario, finalTwilioCostUsd: -1 })).toThrow("Invalid margin input");
  });
});
