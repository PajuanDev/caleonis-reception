import { billingPlanCatalog, type BillingInterval, type BillingPlanSlug } from "@lobbystack/shared";

/** Prices are commercial EUR/HT, never a conversion of historical transactions. */
export function formatOfferMoney(cents: number, locale = "en"): string {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error("Invalid catalogue amount.");
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(cents / 100);
}

/** Provider receipts keep their own currency and amount. No EUR fallback or FX. */
export function formatRecordedMoney(cents: number, currency: string, locale = "en"): string {
  if (!Number.isFinite(cents) || !/^[a-z]{3}$/i.test(currency)) return "—";
  return new Intl.NumberFormat(locale, { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(cents / 100);
}

export const billingCommercialCopy = {
  fr: {
    excludingTax: "HT",
    month: "/mois",
    custom: "Sur devis",
    taxNotice: "Prix hors taxes. La TVA applicable est ajoutée lors du paiement, selon les informations de facturation.",
    monthlyDescription: "{{amount}} HT facturés chaque mois. Taxes applicables en supplément.",
    annualDescription: "{{amount}} HT facturés une fois par an, soit {{equivalent}} HT par mois. Taxes applicables en supplément.",
    capAmountLabel: "Plafond des dépassements mensuels (EUR HT)",
    capTaxNotice: "Le plafond concerne les dépassements hors taxes, pas l’abonnement. La TVA applicable peut s’ajouter au montant facturé.",
    capabilitiesNotice: "Numéro dédié, SMS et transferts selon les capacités du numéro et les conditions d’activation du pays.",
    perMinute: "Puis {{amount}} HT/min",
    perAttempt: "Puis {{amount}} HT/tentative",
    perSegment: "Puis {{amount}} HT/segment",
  },
  en: {
    excludingTax: "excl. tax",
    month: "/month",
    custom: "Custom",
    taxNotice: "Prices exclude tax. Applicable tax is added at checkout based on your billing details.",
    monthlyDescription: "{{amount}} billed monthly, excluding applicable tax.",
    annualDescription: "{{amount}} billed annually, equivalent to {{equivalent}} per month, excluding applicable tax.",
    capAmountLabel: "Monthly overage cap (EUR excluding tax)",
    capTaxNotice: "This cap covers overages before tax, not the subscription. Applicable tax may increase the invoiced amount.",
    capabilitiesNotice: "Dedicated numbers, SMS and transfers depend on the number’s capabilities and country activation requirements.",
    perMinute: "Then {{amount}}/min excl. tax",
    perAttempt: "Then {{amount}}/attempt excl. tax",
    perSegment: "Then {{amount}}/segment excl. tax",
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
