"use client";

import { PhoneCall, ShieldCheck, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import Link from "next/link";

import { AuraVoiceDemo } from "@/components/web-voice/AuraVoiceDemo";
import { localizePublicPath } from "@/lib/locale-path";
import { resolveLocale } from "@/lib/locale";

export function PublicReceptionDemo() {
  const { t, i18n } = useTranslation("common");
  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col px-6 py-10 lg:px-10">
        <header className="flex items-center justify-between">
          <Link href={localizePublicPath("/essai", resolveLocale(i18n.resolvedLanguage, i18n.language))} className="text-lg font-semibold tracking-tight">
            Caléonis <span className="font-medium text-muted-foreground">Receptionist</span>
          </Link>
          <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
            {t("publicDemo.badge")}
          </span>
        </header>

        <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.05fr_.95fr] lg:py-16">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1.5 text-sm">
              <Sparkles className="size-4" />
              {t("publicDemo.eyebrow")}
            </div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              {t("publicDemo.title")}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              {t("publicDemo.description")}
            </p>

            <div className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-xl border p-4">
                <PhoneCall className="mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="font-medium">{t("publicDemo.requestTitle")}</p>
                  <p className="mt-1 text-muted-foreground">{t("publicDemo.requestDescription")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border p-4">
                <ShieldCheck className="mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="font-medium">{t("publicDemo.aiTitle")}</p>
                  <p className="mt-1 text-muted-foreground">{t("publicDemo.aiDescription")}</p>
                </div>
              </div>
            </div>

            <p className="mt-8 text-sm text-muted-foreground">
              {t("publicDemo.examples")}
            </p>
          </div>

          <div className="mx-auto w-full max-w-[32rem]">
            <div className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
              <p className="text-center text-sm font-medium">{t("publicDemo.start")}</p>
              <p className="mt-1 text-center text-xs text-muted-foreground">{t("publicDemo.microphone")}</p>
              <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
                {t("publicDemo.recordingNotice")}
              </p>
              <AuraVoiceDemo
                auraTone="light"
                businessSlug="caleonis-reception-public-demo"
                className="mt-4 w-full"
                widgetId="lobbystack-landing"
              />
            </div>
          </div>
        </section>

        <footer className="pb-2 text-center text-xs text-muted-foreground">
          {t("publicDemo.footer")}
        </footer>
      </div>
    </main>
  );
}
