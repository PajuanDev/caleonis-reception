"use client";

import { useTranslation } from "react-i18next";
import { billingPlanCatalog } from "@lobbystack/shared";
import { formatOfferMoney } from "@/lib/billing-presentation";

/** Paid-plan highlight shared by onboarding and upgrade, using real quotas. */
export function BillingVoiceAllowance({ plan }: { plan: "starter" | "pro" }) {
  const { t, i18n } = useTranslation("settings");
  const locale = i18n?.resolvedLanguage ?? i18n?.language ?? "en";
  const fr = locale.toLowerCase().startsWith("fr");
  const catalog = billingPlanCatalog[plan];
  return <>{t("billing.commercial.voiceAllowance", {
    defaultValue: fr ? "{{minutes}} minutes vocales incluses\nPuis {{rate}} HT/min" : "{{minutes}} voice minutes included\nThen {{rate}}/min excl. tax",
    minutes: catalog.voiceSecondsIncluded / 60,
    rate: formatOfferMoney(catalog.voiceOverageRatePerMinuteCents, locale),
  })}</>;
}
