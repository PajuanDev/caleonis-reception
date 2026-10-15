import type { Locale } from "@/i18n/config"

/** Launch-reviewed surfaces. Upstream pages remain in source until individually reviewed. */
export const launchSolutions = [
  {
    slug: "ai-receptionist-for-home-services",
    fr: "Artisans",
    en: "Tradespeople",
    frLead: "Gardez le fil des demandes pendant vos interventions.",
    enLead: "Keep track of enquiries while you work on site.",
    frQuestions: [
      "Quel service est demandé ?",
      "Dans quelle commune se situe l’intervention ?",
      "Quel numéro utiliser pour le rappel ?",
    ],
    enQuestions: [
      "Which service is needed?",
      "Where is the job located?",
      "Which number should your team call back?",
    ],
    frBoundary:
      "L’IA recueille une demande. Votre équipe confirme le devis, le délai et la faisabilité de l’intervention.",
    enBoundary:
      "The AI collects an enquiry. Your team confirms quotes, timing and whether the job can be accepted.",
  },
  {
    slug: "ai-receptionist-for-plumbers",
    fr: "Plombiers",
    en: "Plumbers",
    frLead: "Recevez une demande exploitable, même les mains occupées.",
    enLead: "Capture a useful enquiry when your hands are busy.",
    frQuestions: [
      "S’agit-il d’une fuite, d’une installation ou d’un entretien ?",
      "Quelle est l’adresse et comment joindre l’appelant ?",
      "Quel créneau de rappel lui convient ?",
    ],
    enQuestions: [
      "Is this a leak, installation or maintenance enquiry?",
      "What is the address and callback number?",
      "When would a callback suit the caller?",
    ],
    frBoundary:
      "Aucun diagnostic technique ni délai d’intervention garanti. Les situations dangereuses demandent une prise en charge humaine adaptée.",
    enBoundary:
      "No technical diagnosis or guaranteed response time. Dangerous situations require appropriate human assistance.",
  },
  {
    slug: "ai-receptionist-for-electricians",
    fr: "Électriciens",
    en: "Electricians",
    frLead: "Préparez vos rappels avec les informations utiles au chantier.",
    enLead: "Prepare callbacks with the details your team needs.",
    frQuestions: [
      "Quel est le type de demande ?",
      "Où se situe le chantier ?",
      "Qui rappeler et à quel moment ?",
    ],
    enQuestions: [
      "What kind of work is requested?",
      "Where is the site?",
      "Who should your team call and when?",
    ],
    frBoundary:
      "L’accueil ne fournit pas de consignes de manipulation électrique et ne remplace pas les services d’urgence.",
    enBoundary:
      "The receptionist does not provide electrical repair instructions or replace emergency services.",
  },
  {
    slug: "ai-receptionist-for-garages",
    fr: "Garages automobiles",
    en: "Auto repair shops",
    frLead: "Accueillez les demandes d’entretien sans interrompre l’atelier.",
    enLead: "Collect service enquiries without interrupting workshop work.",
    frQuestions: [
      "Quel véhicule et quel service sont concernés ?",
      "Quel numéro utiliser pour reprendre contact ?",
      "Quand l’appelant est-il disponible pour un rappel ?",
    ],
    enQuestions: [
      "Which vehicle and service is the enquiry about?",
      "What is the callback number?",
      "When is the caller available?",
    ],
    frBoundary:
      "Un créneau de rappel ne vaut pas acceptation d’une réparation. Prix, pièces et délais sont confirmés par le garage.",
    enBoundary:
      "A callback appointment is not acceptance of a repair job. Your shop confirms prices, parts and turnaround time.",
  },
  {
    slug: "ai-receptionist-for-medical-offices",
    fr: "Cabinets médicaux",
    en: "Medical offices",
    frLead:
      "Étudiez un accueil administratif dans un cadre strictement défini.",
    enLead: "Evaluate administrative reception within a clearly defined scope.",
    frQuestions: [
      "Horaires et coordonnées publics du cabinet",
      "Modalités administratives d’un rappel",
      "Consignes d’orientation préalablement validées par le cabinet",
    ],
    enQuestions: [
      "Public opening hours and office contact details",
      "Administrative callback arrangements",
      "Office-approved signposting instructions",
    ],
    frBoundary:
      "Qualification HDS non établie : aucun usage réel impliquant des données de santé ne doit être activé. Démonstration avec données fictives uniquement. Aucun diagnostic, conseil médical, triage clinique ni traitement des urgences.",
    enBoundary:
      "HDS qualification has not been established: do not enable real use involving health data. Demonstrations use fictional data only. No diagnosis, medical advice, clinical triage or emergency handling.",
  },
] as const

export const reviewedPaths = new Set([
  "/aide/",
  "/",
  "/features/",
  "/pricing/",
  "/solutions/",
  "/resources/",
  ...launchSolutions.map((item) => `/solutions/${item.slug}/`),
])
export const baseLaunchPath = (path: string) => {
  const stripped = path.replace(/^\/fr(?=\/|$)/, "") || "/"
  return stripped.endsWith("/") ? stripped : `${stripped}/`
}
export const isReviewedPath = (path: string) =>
  reviewedPaths.has(baseLaunchPath(path))
export const launchCopy = {
  fr: {
    brand: "Caléonis Receptionist",
    cta: "Demander un essai",
    login: "Connexion",
    headline: "Votre accueil téléphonique, même quand vous êtes occupé.",
    intro:
      "Un seul réceptionniste IA pour votre entreprise. Il accueille les appels, recueille les demandes et peut créer un rendez-vous dans Google Calendar selon votre configuration.",
    note: "Ouverture pilote accompagnée · Tarifs et conditions sur demande",
    features: [
      {
        title: "Un accueil à votre image",
        body: "Définissez l’accueil, la voix, les horaires, les services et les consignes de votre entreprise.",
      },
      {
        title: "Des appels que vous pouvez relire",
        body: "Retrouvez l’historique, les coordonnées recueillies, la transcription et le résumé. L’enregistrement, lorsqu’il est activé, reste privé.",
      },
      {
        title: "Google Calendar connecté",
        body: "Après connexion et configuration, l’IA peut consulter les disponibilités et créer un rendez-vous pendant l’appel. Vérifiez les premiers rendez-vous dans votre agenda.",
      },
      {
        title: "Des informations que vous maîtrisez",
        body: "Ajoutez vos connaissances, services et règles. Testez les réponses avant d’orienter de vrais clients vers le numéro configuré.",
      },
      {
        title: "Un essai vocal dans le navigateur",
        body: "Évaluez l’accueil et les consignes dans l’application avant votre pilote téléphonique. L’accès dépend de l’activation du compte.",
      },
      {
        title: "Une prise de message structurée",
        body: "Recueillez le motif et les coordonnées pour préparer un rappel humain. Les notifications externes dépendent des intégrations réellement activées.",
      },
    ],
    faqs: [
      {
        question: "Le numéro pilote peut-il recevoir des SMS ?",
        answer:
          "Non. Le numéro français pilote est Voice-only : il sert aux appels vocaux. Une boîte Messages ne rend pas ce numéro compatible SMS. Toute messagerie exige une capacité et une configuration distinctes.",
      },
      {
        question: "Les transferts vers une personne sont-ils disponibles ?",
        answer:
          "Le transfert humain n’est pas présenté comme activé sur le pilote. Préparez un rappel à partir des informations recueillies tant qu’un transfert réel n’a pas été validé pour votre configuration.",
      },
      {
        question: "Le rendez-vous déclenche-t-il une prestation ?",
        answer:
          "Le sens du créneau dépend de vos consignes. Configurez explicitement les rappels, devis ou rendez-vous autorisés. Une réservation ne confirme pas à elle seule une prestation, un prix ou un délai.",
      },
      {
        question: "Quels tarifs et quotas s’appliquent ?",
        answer:
          "Les tarifs, limites, coûts de téléphonie et conditions du pilote sont sur demande. Aucun plan gratuit, quota ou prix public n’est arrêté sur cette prévisualisation.",
      },
      {
        question: "Puis-je l’utiliser pour des données de santé ?",
        answer:
          "Pas dans le cadre de cette prévisualisation : la qualification HDS n’est pas établie. Pour un cabinet médical, limitez l’évaluation à des scénarios administratifs fictifs sans données de santé.",
      },
      {
        question: "Sur quel logiciel repose Caléonis ?",
        answer:
          "Caléonis Receptionist reprend le socle LobbyStack sous licence MIT. La licence et le copyright LobbyStack contributors sont conservés. L’offre SaaS Caléonis a ses propres conditions et capacités activées.",
      },
    ],
  },
  en: {
    brand: "Caléonis Receptionist",
    cta: "Request a trial",
    login: "Log in",
    headline: "Your phone reception, even when you are busy.",
    intro:
      "One AI receptionist for your business. It answers calls, collects enquiries and can create Google Calendar appointments according to your configuration.",
    note: "Assisted pilot onboarding · Pricing and terms on request",
    features: [
      {
        title: "Your own greeting",
        body: "Set your business greeting, voice, opening hours, services and instructions.",
      },
      {
        title: "Calls you can review",
        body: "Review call history, collected contact details, transcripts and summaries. Recordings, when enabled, remain private.",
      },
      {
        title: "Connected Google Calendar",
        body: "Once connected and configured, the AI can check availability and create an appointment during the call. Verify initial bookings in your calendar.",
      },
      {
        title: "Knowledge you control",
        body: "Add business knowledge, services and rules. Test answers before directing real customers to the configured number.",
      },
      {
        title: "Browser voice testing",
        body: "Evaluate your greeting and instructions in the application before your phone pilot. Access depends on account activation.",
      },
      {
        title: "Structured message taking",
        body: "Collect the reason for calling and contact details to prepare a human callback. External notifications depend on the integrations actually enabled.",
      },
    ],
    faqs: [
      {
        question: "Can the pilot number receive SMS?",
        answer:
          "No. The French pilot number is Voice-only. A Messages inbox does not make that number SMS-capable. Messaging requires a separate capability and configuration.",
      },
      {
        question: "Are live transfers available?",
        answer:
          "Human transfers are not advertised as enabled on the pilot. Use the collected information for a callback until a real transfer has been verified for your configuration.",
      },
      {
        question: "Does a booking confirm a service?",
        answer:
          "That depends on your instructions. Explicitly define permitted callback, quote or appointment types. A booking alone does not confirm a service, price or response time.",
      },
      {
        question: "What are the prices and quotas?",
        answer:
          "Pricing, limits, telephony charges and pilot terms are available on request. This preview does not set a free plan, quota or public price.",
      },
      {
        question: "Can it process health data?",
        answer:
          "Not under this preview: HDS qualification has not been established. Medical-office evaluations must use fictional administrative scenarios without health data.",
      },
      {
        question: "What software is Caléonis based on?",
        answer:
          "Caléonis Receptionist uses the MIT-licensed LobbyStack foundation. The license and LobbyStack contributors copyright are retained. Caléonis SaaS has its own terms and enabled capabilities.",
      },
    ],
  },
} satisfies Record<Locale, unknown>

export function launchSeo(locale: Locale, path: string) {
  const base =
    baseLaunchPath(path) === "/aide/" ? "/resources/" : baseLaunchPath(path)
  const solution = launchSolutions.find(
    (item) => base === `/solutions/${item.slug}/`
  )
  const labels =
    locale === "fr"
      ? {
          "/": "Accueil téléphonique IA",
          "/features/": "Fonctionnalités",
          "/pricing/": "Tarifs sur demande",
          "/solutions/": "Solutions par métier",
          "/resources/": "Aide et ressources",
        }
      : {
          "/": "AI phone reception",
          "/features/": "Features",
          "/pricing/": "Pricing on request",
          "/solutions/": "Solutions by industry",
          "/resources/": "Help and resources",
        }
  const label =
    solution?.[locale] ??
    (labels as Record<string, string>)[base] ??
    (locale === "fr" ? "Contenu en cours de relecture" : "Content under review")
  const descriptions: Record<string, string> =
    locale === "fr"
      ? {
          "/": "Un réceptionniste IA pour accueillir vos appels, recueillir les demandes et organiser les rappels. Découvrez le pilote accompagné Caléonis Receptionist.",
          "/features/":
            "Accueil vocal, historique, transcriptions, résumés et Google Calendar : découvrez les fonctions et limites du pilote Caléonis Receptionist.",
          "/pricing/":
            "Prix, téléphonie, quotas et accompagnement sur demande. Préparez votre pilote Caléonis Receptionist avec des conditions définies avant activation.",
          "/solutions/":
            "Explorez les parcours Caléonis Receptionist pour artisans, plombiers, électriciens et garages, ainsi que le cadre d’évaluation administrative des cabinets.",
          "/resources/":
            "Démarrage, Google Calendar, appels, Voice-only, consentement et dépannage : les guides Caléonis Receptionist pour préparer votre pilote.",
        }
      : {
          "/": "An AI receptionist to answer business calls, collect enquiries and prepare callbacks. Explore the assisted Caléonis Receptionist pilot.",
          "/features/":
            "Voice reception, call history, transcripts, summaries and Google Calendar: explore the capabilities and limits of the Caléonis Receptionist pilot.",
          "/pricing/":
            "Pricing, telephony, quotas and onboarding on request. Prepare your Caléonis Receptionist pilot with terms defined before activation.",
          "/solutions/":
            "Explore Caléonis Receptionist workflows for tradespeople, plumbers, electricians and garages, plus administrative medical-office evaluation boundaries.",
          "/resources/":
            "Getting started, Google Calendar, calls, Voice-only numbers, consent and troubleshooting: Caléonis Receptionist guides for your pilot.",
        }
  return {
    title: `${label} | Caléonis Receptionist`,
    description: solution
      ? (locale === "fr" ? solution.frLead : solution.enLead) +
        " " +
        launchCopy[locale].note
      : (descriptions[base] ?? launchCopy[locale].intro),
  }
}
