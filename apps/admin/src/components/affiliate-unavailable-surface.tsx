"use client";

import { useTranslation } from "react-i18next";
import { PageSurface } from "@/components/page-surface";
import { helpSiteUrl } from "@/lib/help-site-url";

export function AffiliateUnavailableSurface() {
  const { t } = useTranslation("affiliate");
  return <PageSurface title={t("availability.title")} description={t("availability.description")}><div className="rounded-xl border p-6 text-sm text-muted-foreground"><p>{t("availability.notice")}</p><a className="mt-4 inline-block font-medium text-foreground underline underline-offset-4" href={helpSiteUrl()}>{t("availability.help")}</a></div></PageSurface>;
}
