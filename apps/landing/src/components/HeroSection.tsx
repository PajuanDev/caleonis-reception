import { buttonVariants } from "@/components/ui/button"
import { APP_SIGNUP_URL } from "@/lib/app-links"
import { cn } from "@/lib/utils"
import { getCopy, type Locale } from "@/i18n"
import { ArrowRight } from "lucide-react"
import type { ReactNode } from "react"

type HeroSectionProps = {
  children?: ReactNode
  locale?: Locale
}

const heroCopy = {
  en: {
    h1Start: "Caléonis Receptionist turns",
    h1Emphasis: "missed calls",
    h1End: "into booked work.",
    body: "Caléonis Receptionist is an AI receptionist for small businesses. It answers your phone, books appointments into your calendar, and records the details your team needs for a callback. Use it for every call, or only when you're busy.",
    pricing:
      "Pilot access subject to approval. Draft packages from €30/month; no purchase in this preview.",
  },
  fr: {
    h1Start: "Caléonis Receptionist transforme",
    h1Emphasis: "appels manqués",
    h1End: "en rendez‑vous.",
    body: "Caléonis Receptionist est un réceptionniste IA pour les petites entreprises. Il répond au téléphone, planifie les rendez‑vous dans votre calendrier et recueille les informations pour un rappel humain. Activez-le pour tous vos appels ou seulement quand vous êtes occupé.",
    pricing:
      "Accès pilote sur validation. Catalogue projeté dès 30 €/mois ; aucune souscription dans cette prévisualisation.",
  },
} satisfies Record<Locale, Record<string, string>>

export function HeroSection({ children, locale = "en" }: HeroSectionProps) {
  const copy = getCopy(locale)
  const localCopy = heroCopy[locale]

  return (
    <section
      className="relative grid min-h-[calc(100svh-4rem)] items-center overflow-hidden"
      id="hero"
    >
      <div className="mx-auto w-full max-w-7xl px-6 pt-14 pb-10 md:pt-10 md:pb-20 lg:pt-12 lg:pb-24">
        <div className="grid min-w-0 items-center gap-6 md:gap-12 xl:grid-cols-2 xl:gap-16">
          <div className="max-w-3xl min-w-0 text-left">
            <h1 className="animate-fade-up display-heading">
              {locale === "fr" ? (
                <>
                  {localCopy.h1Start} les{" "}
                  <span className="underline decoration-2 underline-offset-4">
                    {localCopy.h1Emphasis}
                  </span>{" "}
                  {localCopy.h1End}
                </>
              ) : (
                <>
                  {localCopy.h1Start}{" "}
                  <span className="underline decoration-2 underline-offset-4">
                    {localCopy.h1Emphasis}
                  </span>{" "}
                  {localCopy.h1End}
                </>
              )}
            </h1>

            <p className="animate-fade-up body-copy stagger-2 mt-6 max-w-[65ch] md:text-lg">
              {localCopy.body}
            </p>

            <div className="animate-fade-up stagger-3 mt-8 flex items-center gap-4">
              <a
                href={APP_SIGNUP_URL}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-11 w-full max-w-80 rounded-full px-16 text-sm md:w-96 md:max-w-none"
                )}
                data-ph-signup-cta
                data-ph-capture-attribute-section="hero"
                data-ph-capture-attribute-action="try_for_free"
                data-ph-capture-attribute-destination={APP_SIGNUP_URL}
              >
                {copy.common.tryFree}
                <ArrowRight className="ml-1 size-4 transition-transform duration-200 ease-(--ease-out) group-hover/button:translate-x-0.5" />
              </a>
            </div>

            {/* Micro-copy */}
            <p className="animate-fade-up fine-print stagger-4 mt-5">
              {localCopy.pricing}
            </p>
          </div>

          <div className="animate-fade-up stagger-5 mx-auto flex w-full max-w-[22rem] min-w-0 justify-center md:max-w-[30rem] xl:max-w-none xl:justify-end">
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}
