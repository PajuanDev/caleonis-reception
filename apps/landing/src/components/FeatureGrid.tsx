import type { Locale } from "@/i18n"
import { launchCopy } from "@/lib/launch-content"
export function FeatureGrid({ locale = "fr" }: { locale?: Locale }) {
  const copy = launchCopy[locale]
  return (
    <section className="section-spacing" id="features">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h2 className="section-heading">
            {locale === "fr"
              ? "Un seul accueil, les informations au bon endroit"
              : "One receptionist, your information in one place"}
          </h2>
          <p className="section-intro">
            {locale === "fr"
              ? "Configurez votre entreprise, testez les réponses et gardez la main sur les suites à donner."
              : "Configure your business, test answers and stay in control of the next steps."}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {copy.features.map((item) => (
            <article
              key={item.title}
              className="rounded-xl border border-border/70 p-6"
            >
              <h3 className="card-heading">{item.title}</h3>
              <p className="body-copy mt-4">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
