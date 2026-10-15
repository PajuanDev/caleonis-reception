import {
  ArrowRightLeft,
  CalendarCheck,
  ClipboardList,
  Phone,
} from "lucide-react"
import type { Locale } from "@/i18n"

const featureGridCopy = {
  en: {
    headingStart: "Answer calls and book appointments",
    headingEmphasis: "while you work",
    intro:
      "Answer questions, collect caller details, book available appointments and prepare the next step for your team.",
    imageAlt:
      "Caléonis Receptionist: voice reception, appointment booking, caller details and callback preparation",
    features: [
      {
        title: "Answers your calls",
        description:
          "Welcome callers on your configured pilot number, answer from your business information and keep the details your team needs to follow up.",
        icon: Phone,
      },
      {
        title: "Books appointments",
        description:
          "With Google Calendar connected, offer available times and record the appointment in your calendar and call history. No SMS is sent on the Voice-only pilot.",
        icon: CalendarCheck,
      },
      {
        title: "Collects caller details",
        description:
          "Caléonis Receptionist collects names, contact info, service needs, timing, and next steps so your team can follow up with context.",
        icon: ClipboardList,
      },
      {
        title: "Prepares a human callback",
        description:
          "Keep a clear message, the caller's details and their reason for calling so your team can call back. Live transfer requires separate qualification.",
        icon: ArrowRightLeft,
      },
    ],
  },
  fr: {
    headingStart: "Répondez aux appels et planifiez les rendez‑vous",
    headingEmphasis: "pendant que vous travaillez",
    intro:
      "Répondez aux questions, collectez les informations utiles, réservez les créneaux disponibles et préparez le suivi de votre équipe.",
    imageAlt:
      "Caléonis Receptionist : accueil vocal, rendez‑vous, coordonnées et préparation des rappels",
    features: [
      {
        title: "Répond à vos appels",
        description:
          "Accueillez les appelants sur votre numéro pilote configuré, répondez à partir des informations de votre entreprise et gardez les détails utiles au suivi.",
        icon: Phone,
      },
      {
        title: "Planifie les rendez‑vous",
        description:
          "Avec Google Calendar connecté, proposez les créneaux disponibles et retrouvez le rendez‑vous dans l’agenda et l’historique. Aucun SMS n’est envoyé sur le pilote Voice-only.",
        icon: CalendarCheck,
      },
      {
        title: "Collecte les bonnes informations",
        description:
          "Caléonis Receptionist note le nom, les coordonnées, le besoin, le délai et la prochaine étape pour que votre équipe reprenne avec le contexte.",
        icon: ClipboardList,
      },
      {
        title: "Prépare un rappel humain",
        description:
          "Gardez un message clair, les coordonnées et le motif de l’appel pour que votre équipe puisse rappeler. Le transfert en direct reste à qualifier.",
        icon: ArrowRightLeft,
      },
    ],
  },
} satisfies Record<
  Locale,
  {
    headingStart: string
    headingEmphasis: string
    intro: string
    imageAlt: string
    features: Array<{
      title: string
      description: string
      icon: typeof Phone
    }>
  }
>

type FeatureGridProps = {
  locale?: Locale
}

export function FeatureGrid({ locale = "en" }: FeatureGridProps) {
  const copy = featureGridCopy[locale]

  return (
    <section className="section-spacing" id="features">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section heading, centered */}
        <div className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
          <h2 className="section-heading">
            {copy.headingStart}{" "}
            <span className="underline decoration-2 underline-offset-4">
              {copy.headingEmphasis}
            </span>
          </h2>
          <p className="section-intro mx-auto">{copy.intro}</p>
        </div>

        {/* Bento layout: 4 features around a central image */}
        <div className="grid grid-cols-1 gap-y-10 md:grid-cols-[minmax(220px,0.95fr)_minmax(0,2.05fr)_minmax(220px,0.95fr)] md:gap-x-10 lg:gap-x-12">
          {/* ── Left column: features 1 & 2 ── */}
          <div className="flex flex-col gap-12 md:gap-16 md:self-stretch md:py-6">
            {copy.features.slice(0, 2).map((f) => (
              <div key={f.title}>
                <div className="flex items-center gap-2">
                  <f.icon className="size-[18px] shrink-0 text-foreground/80" />
                  <h3 className="font-heading text-lg font-medium tracking-tight text-foreground">
                    {f.title}
                  </h3>
                </div>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>

          {/* ── Center: illustration ── */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-[480px] overflow-hidden rounded-[1.35rem] bg-[#F4F4F2]">
              <img
                src="/illustrations/capabilities-network.webp"
                alt={copy.imageAlt}
                width={1024}
                height={1024}
                className="aspect-square w-full"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>

          {/* ── Right column: features 3 & 4 ── */}
          <div className="flex flex-col gap-12 md:gap-16 md:self-stretch md:py-6">
            {copy.features.slice(2, 4).map((f) => (
              <div key={f.title}>
                <div className="flex items-center gap-2">
                  <f.icon className="size-[18px] shrink-0 text-foreground/80" />
                  <h3 className="font-heading text-lg font-medium tracking-tight text-foreground">
                    {f.title}
                  </h3>
                </div>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
