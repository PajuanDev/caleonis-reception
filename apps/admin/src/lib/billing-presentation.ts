import { billingPlanCatalog, type BillingInterval, type BillingPlanSlug } from "@lobbystack/shared";

/** Prices are commercial EUR/HT, never a conversion of historical transactions. */
export function formatOfferMoney(cents: number, locale = "en"): string {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error("Invalid catalogue amount.");
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(cents / 100);
}

export const billingCommercialCopy = {
  fr: {
    excludingTax: "HT",
    month: "/mois",
    custom: "Sur devis",
    taxNotice: "Prix hors taxes. La TVA applicable est ajoutée lors du paiement, selon les informations de facturation.",
    monthlyDescription: "{{amount}} HT facturés chaque mois. Taxes applicables en supplément.",
    annualDescription: "{{amount}} HT facturés une fois par an, soit {{equivalent}} HT par mois. Taxes applicables en supplément.",
  },
  en: {
    excludingTax: "excl. tax",
    month: "/month",
    custom: "Custom",
    taxNotice: "Prices exclude tax. Applicable tax is added at checkout based on your billing details.",
    monthlyDescription: "{{amount}} billed monthly, excluding applicable tax.",
    annualDescription: "{{amount}} billed annually, equivalent to {{equivalent}} per month, excluding applicable tax.",
  },
} as const;

export function commercialCopy(locale: string) {
  return billingCommercialCopy[locale.toLowerCase().split(/[-_]/)[0] === "fr" ? "fr" : "en"];
}

export function offerAmounts(plan: BillingPlanSlug, interval: BillingInterval) {
  const catalog = billingPlanCatalog[plan];
  return {
    monthlyEquivalentCents: interval === "annual" ? catalog.annualEffectiveMonthlyChargeCents : catalog.monthlyChargeCents,
    invoiceCents: interval === "annual" ? catalog.annualChargeCents : catalog.monthlyChargeCents,
  };
}
