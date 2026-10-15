"use client";

import { useTranslation } from "react-i18next";
import { helpSiteUrl } from "@/lib/help-site-url";

export function BillingPilotNotice() {
  const { t } = useTranslation("settings");
  return <div className="flex flex-col items-start gap-3 text-sm"><p className="font-medium">{t("billing.availability.title")}</p><p className="text-muted-foreground">{t("billing.availability.description")}</p><a className="font-medium underline underline-offset-4" href={helpSiteUrl()}>{t("billing.availability.help")}</a></div>;
}
