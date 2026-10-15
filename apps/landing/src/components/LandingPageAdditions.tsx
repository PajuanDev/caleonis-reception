import { APP_SIGNUP_URL } from "@/lib/app-links"
import { getCopy, localizeHref, type Locale } from "@/i18n"
import { ArrowRight, Check, History, Pencil } from "lucide-react"

const homeSectionsCopy = {
  en: {
    extension: {
      heading: "Turn missed calls into booked work",
      body: "Caléonis Receptionist records what callers need, books available appointments and keeps the context for a callback.",
    },
    extensionCards: [
      {
        title: "Turn unanswered calls into booked work",
        description:
          "Caléonis Receptionist answers when your team cannot, captures what the caller needs, and helps them book or request a callback.",
        cta: "See how it works",
        href: "#how-it-works",
        image: "/illustrations/missed-calls-booked-work-caleonis.svg",
        alt: "Incoming call answered and appointment confirmed for Tuesday at 3:00 PM",
        imageAspectClass: "aspect-[9/4]",
        imageScaleClass: "h-[155%] w-[155%]",
      },
      {
        title: "Give your team the details to call back",
        description:
          "Find the caller's details, message and reason for calling in one place, ready for your team's follow-up.",
        cta: "Prepare your call handling",
        href: "#control",
        image: "/illustrations/call-routing-team-caleonis.svg",
        alt: "Call summary with caller details and context for a human callback",
        imageAspectClass: "aspect-[9/4]",
        imageScaleClass: "h-full w-full object-cover object-[50%_44%]",
      },
    ],
    connected: {
      imageAlt:
        "Business knowledge sources connected to Caléonis Receptionist answer routing",
      heading: "Answers from everything your business knows",
      body: "Import your website, PDFs, documents, spreadsheets, service lists, policies, and FAQs so Caléonis Receptionist can answer with the same context your team uses every day.",
    },
    quality: {
      heading: "AI receptionist for teams who care about response quality",
      body: "Cover the phone without giving up the details, judgment, and follow through that customers notice.",
      learnMoreLabel: "Explore AI phone answering",
      learnMoreHref: "/solutions/ai-phone-answering/",
      toolCards: [
        {
          title: "A receptionist that picks up when you need it to",
          description:
            "Prepare a welcome for calls arriving on your configured pilot number, including when your team cannot pick up.",
          image: "/illustrations/call-capture-caleonis.svg",
          alt: "Incoming call routing to team members or Caléonis Receptionist when the team is unavailable",
          imageContainerClass: "bg-[#F4F4F2] aspect-[4/3]",
          imageClassName: "h-full w-full object-cover object-center",
          imageWidth: 2048,
          imageHeight: 2048,
        },
        {
          title: "Appointments booked without the back-and-forth",
          description:
            "Offer available times and keep the booking in Google Calendar and call history. Voice-only calls do not send SMS confirmations.",
          image: "/illustrations/booking-flow-caleonis.svg",
          alt: "Available times and a booking recorded in Google Calendar, with no SMS confirmation",
          imageContainerClass: "bg-[#F4F4F2] aspect-[4/3]",
          imageClassName: "h-full w-full object-cover object-center",
          imageWidth: 2048,
          imageHeight: 2048,
        },
        {
          title: "A clear message for a human callback",
          description:
            "Keep the caller's reason, contact details and conversation context for your team. Live transfer remains subject to qualification.",
          image: "/illustrations/human-handoff-caleonis.svg",
          alt: "Callback message with reason and caller details; live transfer requires qualification",
          imageContainerClass: "bg-[#F4F4F2] aspect-[4/3]",
          imageClassName: "h-full w-full object-cover object-center",
          imageWidth: 2048,
          imageHeight: 2048,
        },
      ],
    },
    workflow: {
      heading: "Prepare your AI receptionist step by step",
      body: "Set up your welcome, business information and calendar, then check the experience with your team before activation.",
      guideLabel: "Read the buyer guide",
      guideHref: "/blog/how-to-choose-an-ai-receptionist/",
      steps: [
        {
          title: "Connect your phone",
          description:
            "Confirm the number and call setup approved for your pilot before receiving calls.",
        },
        {
          title: "Add your knowledge",
          description:
            "Import your website, files, services, FAQs, hours, policies, and the details callers ask about most.",
        },
        {
          title: "Set the rules",
          description:
            "Choose the greeting, booking rules and information to capture for a callback.",
        },
        {
          title: "Check and activate",
          description:
            "Check a test call, its summary and any calendar booking, then agree activation with the operator.",
        },
      ],
    },
    control: {
      heading: "Keep control of every call",
      body: "Your team chooses the business information, booking rules and details needed to follow up after a call.",
      imageAlt:
        "Actual Caléonis Receptionist Voice-only Messages screen with fictional pilot data",
      cards: [
        {
          title: "Control what your AI receptionist can say",
          description:
            "Update services, pricing, policies, FAQs, and instructions whenever your business changes, without waiting on a developer.",
          icon: Pencil,
        },
        {
          title: "Review every call in one place",
          description:
            "See recordings, transcripts, summaries, caller details, bookings, and next steps without digging through voicemails or scattered notes.",
          icon: History,
        },
      ],
    },
    pricing: {
      heading: "Draft packages for growing call volumes.",
      body: "Compare the draft Free, Starter and Pro target packages. Pilot access, activation and French number allocation require separate approval.",
      badge: "Pro target",
      viewDetails: "View pricing details",
      note: "Draft catalogue. No subscription or payment here. Tax and French eligibility require approval.",
      plans: [
        {
          name: "Free",
          price: "€0",
          description:
            "Target: 30 voice minutes. No automatic free entitlement or French number allocation.",
        },
        {
          name: "Starter",
          price: "€30/mo",
          description:
            "150 voice minutes, 50 target alert SMS segments and 20 target transfers (not enabled on the pilot).",
        },
        {
          name: "Pro",
          price: "€100/mo",
          description:
            "500 voice minutes, 200 target alert SMS segments and 100 target transfers (not enabled on the pilot).",
        },
        {
          name: "Enterprise",
          price: "Custom",
          description:
            "Higher volume, multiple numbers, and self-hosting implementation support.",
        },
      ],
    },
    openSource: {
      heading: "Proudly open-source, self-hosted",
      body: "Run Caléonis Receptionist on your own servers and keep call recordings and customer data in your own infrastructure.",
      cta: "Upstream MIT source",
      selfHostedCta: "Self-Hosting Overview",
    },
  },
  fr: {
    extension: {
      heading: "Transformez les appels manqués en rendez‑vous",
      body: "Caléonis Receptionist note le besoin de l’appelant, réserve les créneaux disponibles et garde le contexte pour un rappel.",
    },
    extensionCards: [
      {
        title: "Transformez les appels sans réponse en rendez‑vous",
        description:
          "Caléonis Receptionist répond quand votre équipe ne peut pas décrocher, comprend le besoin de l’appelant et l’aide à réserver ou à demander un rappel.",
        cta: "Voir le fonctionnement",
        href: "#how-it-works",
        image: "/illustrations/missed-calls-booked-work-caleonis.svg",
        alt: "Appel entrant répondu et rendez‑vous confirmé pour mardi à 15 h",
        imageAspectClass: "aspect-[9/4]",
        imageScaleClass: "h-[155%] w-[155%]",
      },
      {
        title: "Préparez le rappel de la bonne personne",
        description:
          "Retrouvez les coordonnées, le message et le motif de l’appel au même endroit pour préparer le suivi de votre équipe.",
        cta: "Définir les règles",
        href: "#control",
        image: "/illustrations/call-routing-team-caleonis.svg",
        alt: "Résumé d’appel avec les coordonnées et le contexte utiles à un rappel humain",
        imageAspectClass: "aspect-[9/4]",
        imageScaleClass: "h-full w-full object-cover object-[50%_44%]",
      },
    ],
    connected: {
      imageAlt:
        "Sources de connaissances métier connectées à la réception téléphonique Caléonis Receptionist",
      heading: "Des réponses fondées sur ce que votre entreprise sait déjà",
      body: "Importez votre site, vos PDF, documents, feuilles de calcul, services, politiques et FAQ pour que Caléonis Receptionist réponde avec le même contexte que votre équipe.",
    },
    quality: {
      heading:
        "Un réceptionniste IA pour les équipes qui tiennent à la qualité des réponses",
      body: "Couvrez le téléphone sans perdre les détails, le jugement et le suivi que vos clients remarquent.",
      learnMoreLabel: "Découvrir la réponse téléphonique IA",
      learnMoreHref: "/solutions/ai-phone-answering/",
      toolCards: [
        {
          title: "Une réceptionniste qui décroche quand vous en avez besoin",
          description:
            "Préparez un accueil pour les appels reçus sur votre numéro pilote configuré, y compris quand votre équipe ne peut pas décrocher.",
          image: "/illustrations/call-capture-caleonis.svg",
          alt: "Routage d’appel entrant vers l’équipe ou Caléonis Receptionist quand l’équipe est indisponible",
          imageContainerClass: "bg-[#F4F4F2] aspect-[4/3]",
          imageClassName: "h-full w-full object-cover object-center",
          imageWidth: 2048,
          imageHeight: 2048,
        },
        {
          title: "Des rendez‑vous pris sans allers-retours",
          description:
            "Proposez les créneaux disponibles et retrouvez la réservation dans Google Calendar et l’historique. Aucun SMS de confirmation sur le pilote Voice-only.",
          image: "/illustrations/booking-flow-caleonis.svg",
          alt: "Créneaux disponibles et réservation enregistrée dans Google Calendar, sans SMS de confirmation",
          imageContainerClass: "bg-[#F4F4F2] aspect-[4/3]",
          imageClassName: "h-full w-full object-cover object-center",
          imageWidth: 2048,
          imageHeight: 2048,
        },
        {
          title: "Un message clair pour un rappel humain",
          description:
            "Gardez le motif, les coordonnées et le contexte de la conversation pour votre équipe. Le transfert en direct reste à qualifier.",
          image: "/illustrations/human-handoff-caleonis.svg",
          alt: "Message de rappel avec le motif et les coordonnées ; transfert en direct à qualifier",
          imageContainerClass: "bg-[#F4F4F2] aspect-[4/3]",
          imageClassName: "h-full w-full object-cover object-center",
          imageWidth: 2048,
          imageHeight: 2048,
        },
      ],
    },
    workflow: {
      heading: "Préparez votre réceptionniste IA pas à pas",
      body: "Configurez l’accueil, les informations métier et l’agenda, puis vérifiez l’expérience avec votre équipe avant activation.",
      guideLabel: "Lire le guide d'achat",
      guideHref: "/blog/how-to-choose-an-ai-receptionist/",
      steps: [
        {
          title: "Connectez votre téléphone",
          description:
            "Confirmez le numéro et le dispositif d’appel autorisés pour votre pilote avant de recevoir des appels.",
        },
        {
          title: "Ajoutez vos connaissances",
          description:
            "Importez votre site, vos fichiers, vos services, vos FAQ, vos horaires, vos politiques et les détails que les appelants demandent souvent.",
        },
        {
          title: "Définissez les règles",
          description:
            "Choisissez l’accueil, les règles de réservation et les informations utiles à un rappel.",
        },
        {
          title: "Vérifiez puis activez",
          description:
            "Vérifiez un appel de test, son résumé et la réservation éventuelle dans l’agenda, puis convenez de l’activation avec l’opérateur.",
        },
      ],
    },
    control: {
      heading: "Gardez le contrôle de chaque appel",
      body: "Votre équipe choisit les informations métier, les règles de réservation et les détails utiles au suivi après chaque appel.",
      imageAlt:
        "Vraie page Messages Voice-only Caléonis Receptionist avec données fictives du pilote",
      cards: [
        {
          title: "Contrôlez ce que votre réceptionniste IA peut dire",
          description:
            "Mettez à jour services, prix, politiques, FAQ et consignes dès que votre entreprise change, sans attendre un développeur.",
          icon: Pencil,
        },
        {
          title: "Revoyez chaque appel au même endroit",
          description:
            "Consultez enregistrements, transcriptions, résumés, appelants, rendez‑vous et prochaines étapes sans fouiller dans les messages vocaux.",
          icon: History,
        },
      ],
    },
    pricing: {
      heading:
        "Des forfaits projetés selon votre volume d’appels.",
      body: "Comparez les forfaits cibles Free, Starter et Pro. L’accès au pilote, son activation et l’attribution d’un numéro français exigent une validation distincte.",
      badge: "Cible Pro",
      viewDetails: "Voir le détail des tarifs",
      note: "Catalogue en projet. Aucune souscription ni paiement ici ; TVA et attribution FR à valider.",
      plans: [
        {
          name: "Free",
          price: "€0",
          description:
            "Cible : 30 minutes vocales. Aucun droit gratuit automatique ni numéro français attribué.",
        },
        {
          name: "Starter",
          price: "€30/mois",
          description:
            "150 minutes vocales, 50 segments SMS et 20 transferts cibles (indisponibles sur le pilote).",
        },
        {
          name: "Pro",
          price: "€100/mois",
          description:
            "500 minutes vocales, 200 segments SMS et 100 transferts cibles (indisponibles sur le pilote).",
        },
        {
          name: "Enterprise",
          price: "Sur mesure",
          description:
            "Volume supérieur, plusieurs numéros et accompagnement pour l’auto-hébergement.",
        },
      ],
    },
    openSource: {
      heading: "Open source, prêt pour l'auto-hébergement",
      body: "Hébergez Caléonis Receptionist sur vos propres serveurs et gardez les enregistrements d’appels et les données client dans votre infrastructure.",
      cta: "Source d’origine MIT",
      selfHostedCta: "Aperçu de l'auto-hébergement",
    },
  },
}

type LocalizedProps = {
  locale?: Locale
}

export function ProductExtensionSection({ locale = "en" }: LocalizedProps) {
  const sectionCopy = homeSectionsCopy[locale]

  return (
    <section className="px-0 pt-0 pb-12 md:pb-16 lg:pb-20" id="missed-calls">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 max-w-3xl">
          <h2 className="section-heading">{sectionCopy.extension.heading}</h2>
          <p className="section-intro mt-4">
            {sectionCopy.extension.body}
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {sectionCopy.extensionCards.map((card) => (
            <article
              key={card.title}
              className="overflow-hidden rounded-[1.35rem] border border-border/70 bg-background"
            >
              <div
                className={`relative overflow-hidden bg-[#F4F4F2] ${card.imageAspectClass ?? "aspect-[9/4]"}`}
              >
                <img
                  src={card.image}
                  alt={card.alt}
                  width={1200}
                  height={800}
                  className={
                    card.imageScaleClass?.includes("object-cover")
                      ? card.imageScaleClass
                      : `absolute top-1/2 left-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 object-contain ${card.imageScaleClass ?? "h-[155%] w-[155%]"}`
                  }
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="p-8 md:p-10">
                <h3 className="card-heading">{card.title}</h3>
                <p className="body-copy mt-5">
                  {card.description}
                </p>
                <div className="mt-6">
                  <a
                    href={card.href}
                    className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline decoration-1 underline-offset-4 transition-colors hover:text-foreground/80"
                  >
                    {card.cta}
                    <ArrowRight className="size-3.5" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function ConnectedReceptionistSection({ locale = "en" }: LocalizedProps) {
  const copy = getCopy(locale)
  const sectionCopy = homeSectionsCopy[locale].connected

  return (
    <section className="section-spacing" id="how-it-works">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid overflow-hidden rounded-[1.35rem] border border-border/70 bg-background lg:grid-cols-[1.18fr_0.82fr]">
          <div className="min-h-[360px] overflow-hidden border-b border-border/70 bg-[#F4F4F2] md:min-h-[460px] lg:border-r lg:border-b-0">
            <img
              src="/illustrations/business-knowledge.webp"
              alt={sectionCopy.imageAlt}
              width={1536}
              height={1024}
              className="h-full min-h-[360px] w-full object-cover object-center md:min-h-[460px]"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="flex flex-col justify-center p-8 md:p-12 lg:p-16">
            <h2 className="section-heading">{sectionCopy.heading}</h2>
            <p className="section-intro">{sectionCopy.body}</p>
            <div className="mt-8">
              <a
                href={APP_SIGNUP_URL}
                data-ph-signup-cta
                data-ph-capture-attribute-section="how_it_works"
                data-ph-capture-attribute-action="try_for_free"
                data-ph-capture-attribute-destination={APP_SIGNUP_URL}
                className="inline-flex h-11 items-center justify-center gap-3 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
              >
                {copy.common.tryFree}
                <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function QualityToolsSection({ locale = "en" }: LocalizedProps) {
  const sectionCopy = homeSectionsCopy[locale].quality

  return (
    <section className="section-spacing" id="phone-tools">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          <h2 className="section-heading">{sectionCopy.heading}</h2>
          <p className="section-intro">{sectionCopy.body}</p>
          <p className="mt-4">
            <a
              href={localizeHref(locale, sectionCopy.learnMoreHref)}
              className="text-sm font-medium text-foreground underline decoration-1 underline-offset-4 transition-colors hover:text-foreground/80"
            >
              {sectionCopy.learnMoreLabel}
              <ArrowRight className="ml-1 inline size-3.5" />
            </a>
          </p>
        </div>

        <div className="mt-16 flex flex-col gap-16 md:gap-24">
          {sectionCopy.toolCards.map((card, index) => (
            <article
              key={card.title}
              className={`flex flex-col items-center gap-8 md:gap-12 lg:gap-16 ${
                index % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"
              }`}
            >
              <div
                className={`w-full flex-1 overflow-hidden rounded-[1.35rem] border border-border/70 ${card.imageContainerClass ?? "bg-muted"}`}
              >
                <img
                  src={card.image}
                  alt={card.alt}
                  width={card.imageWidth ?? 1200}
                  height={card.imageHeight ?? 800}
                  className={
                    card.imageClassName ?? "h-auto w-full object-cover"
                  }
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="w-full flex-1 md:py-8">
                <h3 className="card-heading md:text-3xl">{card.title}</h3>
                <p className="body-copy mt-5 max-w-[65ch] md:text-lg">
                  {card.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function WorkflowSection({ locale = "en" }: LocalizedProps) {
  const sectionCopy = homeSectionsCopy[locale].workflow

  return (
    <section className="section-spacing" id="workflow">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          <h2 className="section-heading">{sectionCopy.heading}</h2>
          <p className="section-intro">{sectionCopy.body}</p>
          <p className="mt-4">
            <a
              href={localizeHref(locale, sectionCopy.guideHref)}
              className="text-sm font-medium text-foreground underline decoration-1 underline-offset-4 transition-colors hover:text-foreground/80"
            >
              {sectionCopy.guideLabel}
              <ArrowRight className="ml-1 inline size-3.5" />
            </a>
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 border-y border-border/70 md:grid-cols-2 lg:grid-cols-4">
          {sectionCopy.steps.map((step, index) => (
            <article
              key={step.title}
              className="border-b border-border/70 py-8 last:border-b-0 md:px-8 lg:border-b-0 lg:border-l lg:first:border-l-0 md:[&:nth-child(2n)]:border-l lg:[&:nth-child(2n)]:border-l"
            >
              <div className="font-mono text-sm font-medium text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </div>
              <h3 className="mt-6 font-heading text-xl leading-tight font-medium tracking-[-0.03em]">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-[0.9375rem]">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function ControlOwnershipSection({ locale = "en" }: LocalizedProps) {
  const sectionCopy = homeSectionsCopy[locale].control

  return (
    <section className="section-spacing" id="control">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="section-heading">{sectionCopy.heading}</h2>
          <p className="section-intro mx-auto">{sectionCopy.body}</p>
        </div>

        <div className="mt-14 overflow-hidden rounded-[1.35rem] border border-border/70 bg-background">
          <img
            src="/screenshots/messages-voice-only-fr-desktop.png"
            alt={sectionCopy.imageAlt}
            width={3020}
            height={1898}
            className="w-full"
            loading="lazy"
            decoding="async"
          />
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {sectionCopy.cards.map((card) => {
            const Icon = card.icon
            return (
              <article
                key={card.title}
                className="flex min-h-[260px] flex-col rounded-[1.35rem] border border-border/70 bg-background p-8 md:p-10"
              >
                <div className="flex size-12 items-center justify-center rounded-xl border border-border/70 bg-background shadow-sm">
                  <Icon
                    className="size-5 text-foreground/80"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-8">
                  <h3 className="card-heading">{card.title}</h3>
                  <p className="body-copy mt-5">
                    {card.description}
                  </p>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function PricingPreviewSection({ locale = "en" }: LocalizedProps) {
  const sectionCopy = homeSectionsCopy[locale].pricing

  return (
    <section className="section-spacing" id="pricing-preview">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          <h2 className="section-heading">{sectionCopy.heading}</h2>
          <p className="section-intro">{sectionCopy.body}</p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {sectionCopy.plans.map((plan) => {
            const isPro = plan.name === "Pro"
            return (
              <article
                key={plan.name}
                className={`flex min-h-[310px] flex-col rounded-[1.35rem] p-8 ${
                  isPro
                    ? "border-2 border-foreground bg-background shadow-sm"
                    : "border border-border/70 bg-background"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="card-heading">{plan.name}</h3>
                    {isPro && (
                      <span className="inline-flex rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background">
                        {sectionCopy.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-4 font-heading text-4xl font-medium tracking-[-0.05em] tabular-nums">
                    {plan.price}
                  </p>
                  <p className="body-copy mt-5">{plan.description}</p>
                  <Check
                    className={`mt-6 size-5 ${isPro ? "text-foreground" : "text-foreground/70"}`}
                    aria-hidden="true"
                  />
                </div>
              </article>
            )
          })}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href={localizeHref(locale, "/pricing/")}
            data-ph-capture-attribute-section="pricing_preview"
            data-ph-capture-attribute-action="view_pricing"
            data-ph-capture-attribute-destination="/pricing/"
            className="inline-flex h-11 items-center justify-center gap-3 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            {sectionCopy.viewDetails}
            <ArrowRight className="size-4" />
          </a>
          <p className="text-sm text-muted-foreground">{sectionCopy.note}</p>
        </div>
      </div>
    </section>
  )
}

function OpenSourceSection({ locale = "en" }: LocalizedProps) {
  const sectionCopy = homeSectionsCopy[locale].openSource

  return (
    <section className="section-spacing" id="open-source">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="section-heading">{sectionCopy.heading}</h2>
          <p className="section-intro mx-auto">{sectionCopy.body}</p>
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:flex-wrap">
          <a
            href="https://gitlab.com/lobbystack-group/lobbystack"
            target="_blank"
            rel="noopener noreferrer"
            data-ph-capture-attribute-section="open_source"
            data-ph-capture-attribute-action="view_github"
            data-ph-capture-attribute-destination="https://gitlab.com/lobbystack-group/lobbystack"
            className="inline-flex h-11 items-center justify-center gap-3 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            {sectionCopy.cta}
            <ArrowRight className="size-4" />
          </a>
          <a
            href={localizeHref(
              locale,
              "/solutions/self-hosted-ai-receptionist/"
            )}
            data-ph-capture-attribute-section="open_source"
            data-ph-capture-attribute-action="view_self_hosted_solution"
            data-ph-capture-attribute-destination="/solutions/self-hosted-ai-receptionist/"
            className="inline-flex h-11 items-center justify-center gap-3 rounded-full border border-border/70 bg-background px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {sectionCopy.selfHostedCta}
            <ArrowRight className="size-4" />
          </a>
        </div>
      </div>
    </section>
  )
}

export function LandingPageAdditions({ locale = "en" }: LocalizedProps) {
  return (
    <>
      <ConnectedReceptionistSection locale={locale} />
      <QualityToolsSection locale={locale} />
      <WorkflowSection locale={locale} />
      <ControlOwnershipSection locale={locale} />
      <PricingPreviewSection locale={locale} />
      <OpenSourceSection locale={locale} />
    </>
  )
}
