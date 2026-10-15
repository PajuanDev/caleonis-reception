import type { Locale } from "@/i18n"
const steps = {
  fr: [
    [
      "Préparez l’accueil",
      "Renseignez l’entreprise, ses horaires, ses services et ce que l’IA peut confirmer.",
    ],
    [
      "Vérifiez les réponses",
      "Utilisez l’essai navigateur avec des demandes courantes et des cas où un rappel humain est préférable.",
    ],
    [
      "Connectez l’agenda",
      "Autorisez Google Calendar, choisissez le bon calendrier et vérifiez les créneaux et le fuseau horaire.",
    ],
    [
      "Validez le pilote",
      "Testez le numéro et les éventuels renvois avec votre opérateur, puis relisez appels et rendez-vous avant élargissement.",
    ],
  ],
  en: [
    [
      "Prepare your greeting",
      "Add your business, opening hours, services and what the AI is allowed to confirm.",
    ],
    [
      "Check the answers",
      "Use browser testing with routine enquiries and cases that should lead to a human callback.",
    ],
    [
      "Connect your calendar",
      "Authorise Google Calendar, choose the right calendar and check availability and time zone.",
    ],
    [
      "Validate the pilot",
      "Test the number and any forwarding with your carrier, then review calls and appointments before expanding.",
    ],
  ],
}
export function ProductExtensionSection({
  locale = "fr",
}: {
  locale?: Locale
}) {
  return (
    <section className="border-y border-border/60 bg-muted/20 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="section-heading">
          {locale === "fr"
            ? "Une continuité pour votre accueil"
            : "Continuity for your reception"}
        </h2>
        <p className="body-copy mt-5 max-w-3xl">
          {locale === "fr"
            ? "Quand vous ne pouvez pas décrocher, recueillir une demande claire aide votre équipe à reprendre la conversation. Caléonis centralise l’historique pour préparer ce suivi, sans promettre une intervention ou un résultat commercial."
            : "When you cannot answer, a clear enquiry helps your team resume the conversation. Caléonis keeps call history together to prepare that follow-up, without promising a service visit or a business outcome."}
        </p>
      </div>
    </section>
  )
}
export function LandingPageAdditions({ locale = "fr" }: { locale?: Locale }) {
  return (
    <section className="section-spacing" id="how-it-works">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="section-heading">
          {locale === "fr"
            ? "Un pilote préparé avec vous"
            : "A pilot prepared with you"}
        </h2>
        <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps[locale].map(([title, body], index) => (
            <li key={title} className="rounded-xl border border-border/70 p-6">
              <span className="text-sm text-muted-foreground">
                0{index + 1}
              </span>
              <h3 className="card-heading mt-4">{title}</h3>
              <p className="body-copy mt-4">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
