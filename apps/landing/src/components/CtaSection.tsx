import { ArrowRight } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { APP_SIGNUP_URL } from "@/lib/app-links"
import { launchCopy } from "@/lib/launch-content"
import { cn } from "@/lib/utils"
import type { Locale } from "@/i18n"
export function CtaSection({ locale = "fr" }: { locale?: Locale }) {
  const copy = launchCopy[locale]
  return (
    <section className="flex min-h-80 items-center py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="section-heading">
          {locale === "fr"
            ? "Testons votre parcours d’appel"
            : "Test your own call workflow"}
        </h2>
        <p className="section-intro">
          {locale === "fr"
            ? "Préparez vos horaires, vos services et un scénario de rappel. Un pilote accompagné permet de vérifier ce qui convient à votre activité."
            : "Prepare your opening hours, services and a callback scenario. An assisted pilot helps verify what fits your business."}
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
        <p className="fine-print mt-4">{copy.note}</p>
      </div>
    </section>
  )
}
