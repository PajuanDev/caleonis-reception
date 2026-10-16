// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, expect, it } from "vitest";
import en from "../../public/locales/en/onboarding.json";
import fr from "../../public/locales/fr/onboarding.json";
import { OnboardingPlanComparison } from "./onboarding-plan-comparison";

afterEach(cleanup);

it.each(["en", "fr"] as const)("describes supported capabilities and EUR rates in %s", async (locale) => {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({ lng: locale, resources: { en: { onboarding: en, settings: {} }, fr: { onboarding: fr, settings: {} } } });
  const t = i18n.getFixedT(locale, "onboarding");
  render(<I18nextProvider i18n={i18n}><OnboardingPlanComparison t={t} /></I18nextProvider>);
  expect(screen.queryByText(/Outlook/)).toBeNull();
  expect(screen.getByText(/30 browser minutes|30 minutes dans le navigateur/)).toBeTruthy();
  const numbers = screen.getByText(t("plan.comparison.features.phoneNumbers")).closest("tr")!;
  expect(within(numbers).getAllByRole("cell")[1]?.textContent).toBe(t("plan.comparison.values.common.notIncluded"));
  expect(screen.queryByText(/AI SMS|SMS IA|Outbound|sortants|Missed-call|appels manqués|Multi-location|multisite/i)).toBeNull();
  for (const feature of ["confirmationTexts", "smsNotifications", "alertSms", "outboundCalls"]) {
    const row = screen.getByText(t(`plan.comparison.features.${feature}`)).closest("tr")!;
    expect(within(row).getAllByRole("cell")[1]?.textContent).toBe(t("plan.comparison.values.common.notIncluded"));
  }
  const retention = screen.getByText(t("plan.comparison.features.contentRetention")).closest("tr")!;
  const retentionCells = within(retention).getAllByRole("cell");
  expect(retentionCells[1]?.textContent).toBe(t("plan.comparison.values.data.contentRetention.free", { days: 30 }));
  expect(retentionCells[2]?.textContent).toBe(t("plan.comparison.values.data.contentRetention.paid", { days: 90 }));
  expect(retentionCells[3]?.textContent).toBe(t("plan.comparison.values.data.contentRetention.paid", { days: 90 }));
  expect(screen.getByRole("table").textContent).not.toContain("$");
  const voice = screen.getByText(t("plan.comparison.features.voiceMinutes")).closest("tr")!;
  const voiceCells = within(voice).getAllByRole("cell");
  expect(voiceCells[2]?.textContent?.replace(/\s/g, "")).toContain(locale === "fr" ? "0,20€HT/min" : "€0.20/minexcl.tax");
  expect(voiceCells[3]?.textContent?.replace(/\s/g, "")).toContain(locale === "fr" ? "0,18€HT/min" : "€0.18/minexcl.tax");
});
