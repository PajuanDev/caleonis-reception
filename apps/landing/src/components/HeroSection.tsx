import type { ReactNode } from "react"
import {
  ArrowRight,
  PhoneCall,
  ClipboardList,
  CalendarCheck,
} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { APP_SIGNUP_URL } from "@/lib/app-links"
import { cn } from "@/lib/utils"
import { launchCopy } from "@/lib/launch-content"
import type { Locale } from "@/i18n"
export function HeroSection({
  children,
  locale = "fr",
}: {
  children?: ReactNode
  locale?: Locale
}) {
  const copy = launchCopy[locale]
  return (
    <section
      className="relative grid min-h-[calc(100svh-4rem)] items-center overflow-hidden"
      id="hero"
    >
      <div className="mx-auto w-full max-w-7xl px-6 py-16 md:py-24">
        <div className="grid min-w-0 items-center gap-12 xl:grid-cols-2 xl:gap-16">
          <div className="max-w-3xl min-w-0">
            <h1 className="display-heading">{copy.headline}</h1>
            <p className="body-copy mt-6 max-w-[65ch] md:text-lg">
              {copy.intro}
            </p>
            <a
              href={APP_SIGNUP_URL}
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-8 rounded-full px-8"
              )}
              data-ph-signup-cta
            >
              {copy.cta}
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </a>
            <p className="fine-print mt-5">{copy.note}</p>
          </div>
          <div className="rounded-2xl border border-border bg-muted/25 p-8 md:p-12">
            {children ?? (
              <>
                <h2 className="text-2xl font-medium">
                  {locale === "fr"
                    ? "De l’appel au suivi"
                    : "From call to follow-up"}
                </h2>
                <ol className="mt-8 space-y-8">
                  {[PhoneCall, ClipboardList, CalendarCheck].map((Icon, i) => (
                    <li key={i} className="flex gap-4">
                      <Icon
                        className="mt-1 size-5 shrink-0"
                        aria-hidden="true"
                      />
                      <p className="body-copy">
                        {
                          (locale === "fr"
                            ? [
                                "L’appelant échange avec l’accueil configuré pour votre entreprise.",
                                "Le besoin et les coordonnées sont recueillis pour votre équipe.",
                                "Un rendez-vous autorisé peut être créé dans votre agenda connecté.",
                              ]
                            : [
                                "The caller speaks with your configured business receptionist.",
                                "The enquiry and contact details are captured for your team.",
                                "An authorised appointment can be created in your connected calendar.",
                              ])[i]
                        }
                      </p>
                    </li>
                  ))}
                </ol>
                <p className="fine-print mt-8">
                  {locale === "fr"
                    ? "Parcours présenté à titre explicatif. L’essai s’effectue dans l’application."
                    : "An explanation of the workflow. The trial takes place in the application."}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
