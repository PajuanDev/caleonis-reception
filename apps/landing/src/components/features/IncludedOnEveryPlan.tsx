import { Check, Clock3, Minus } from "lucide-react"
import { getCopy, localizeHref, type Locale } from "@/i18n"

const includedCopy = {
  en: {
    headingStart: "Answer telephone calls with",
    headingEmphasis: "Starter or Pro",
    intro:
      "Source target catalogue shown for review. This grid does not activate free usage, a number, SMS or a paid plan on the French pilot.",
    label: "Source target features — current Caléonis pilot state",
    features: [
      "Call answering",
      "Plain-language workflows",
      "Appointment booking",
      "Appointment confirmation texts",
      "Call recordings",
      "Transfers",
      "Call summaries",
      "Email notifications",
      "SMS notifications",
      "Spam filtering",
      "Calls under 10 seconds excluded",
      "Unlimited concurrent calls",
      "Knowledge base",
      "Dashboard and call history",
    ],
  },
  fr: {
    headingStart: "Recevez des appels téléphoniques avec",
    headingEmphasis: "Starter ou Pro",
    intro:
      "Catalogue cible source présenté en revue. Cette grille n’active aucun usage gratuit, numéro, SMS ni forfait payant sur le pilote français.",
    label: "Fonctions cibles source — état actuel du pilote Caléonis",
    features: [
      "Réponse aux appels",
      "Consignes en langage naturel",
      "Prise de rendez‑vous",
      "SMS de confirmation",
      "Enregistrements d’appels",
      "Transferts",
      "Résumés d’appels",
      "Notifications par courriel",
      "Notifications SMS",
      "Filtrage du spam",
      "Appels de moins de 10 secondes exclus",
      "Appels simultanés illimités",
      "Base de connaissances",
      "Tableau de bord et historique d’appels",
    ],
  },
} satisfies Record<
  Locale,
  {
    headingStart: string
    headingEmphasis: string
    intro: string
    label: string
    features: string[]
  }
>

type IncludedOnEveryPlanProps = {
  locale?: Locale
}

export function IncludedOnEveryPlan({
  locale = "en",
}: IncludedOnEveryPlanProps) {
  const copy = includedCopy[locale]
  const common = getCopy(locale).common

  return (
    <section className="section-spacing" id="included">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section intro */}
        <div className="mb-12 max-w-3xl md:mb-16">
          <h2 className="section-heading">
            {copy.headingStart}{" "}
            <span className="underline decoration-2 underline-offset-4">
              {copy.headingEmphasis}
            </span>
          </h2>
          <p className="section-intro">{copy.intro}</p>
        </div>

        {/* Checkmark card */}
        <div className="rounded-2xl border border-border/70 bg-background p-8 md:p-10">
          <p className="mb-6 text-xs font-medium tracking-wide text-muted-foreground">
            {copy.label}
          </p>

          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {copy.features.map((feature) => {
              const sms = /SMS|texts/i.test(feature)
              const pending = /transf|unlimited|illimit|notification/i.test(feature)
              const Icon = sms ? Minus : pending ? Clock3 : Check
              const state = sms
                ? locale === "fr" ? "indisponible sur le numéro Voice-only" : "unavailable on the Voice-only number"
                : pending ? locale === "fr" ? "à qualifier selon la configuration Caléonis" : "requires Caléonis configuration-specific qualification"
                : locale === "fr" ? "selon la configuration autorisée" : "subject to authorised configuration"
              return (
                <div key={feature} className="flex items-center gap-2.5 text-sm text-foreground" data-pilot-feature-state={sms ? "unavailable" : pending ? "pending" : "configured"}>
                  <Icon className="size-4 shrink-0 text-foreground/50" aria-hidden="true" />
                  <span>{feature} · {state}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8">
          <a
            href={localizeHref(locale, "/pricing/")}
            data-ph-capture-attribute-section="included_every_plan"
            data-ph-capture-attribute-action="view_pricing"
            data-ph-capture-attribute-destination="/pricing/"
            className="inline-flex h-11 items-center justify-center rounded-full border border-border/70 bg-background px-7 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {common.viewPricing}
          </a>
        </div>
      </div>
    </section>
  )
}
