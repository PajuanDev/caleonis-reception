import type { FaqItem } from "@/lib/seo"
import type { Locale } from "@/i18n"

export const homeFaqs: FaqItem[] = [
  {
    question: "Can I customize my AI receptionist's greeting and tone?",
    answer:
      "Yes. Caleonis Reception lets you customize the greeting, tone, business instructions, and call handling rules so your AI receptionist sounds aligned with your brand.",
  },
  {
    question: "What happens when a caller asks something unusual?",
    answer:
      "You define the fallback behavior. Caleonis Reception can take a message for your team or transfer the caller to a person.",
  },
  {
    question: "Can Caleonis Reception book appointments directly into my calendar?",
    answer:
      "Yes. Caleonis Reception can check availability, offer appointment times, book the appointment, and send confirmation details to the caller.",
  },
  {
    question: "Can the AI receptionist send a call summary to my phone?",
    answer:
      "Yes. Caleonis Reception emails you after each call with the caller's details, reason for calling, outcome, and next step. On paid plans, you can also turn on SMS alerts.",
  },
  {
    question: "What types of calls should still go to a human?",
    answer:
      "Caleonis Reception is a strong fit for routine questions, bookings, intake, and lead qualification. Complex negotiations, sensitive situations, urgent cases, and specialized troubleshooting can be transferred to your team.",
  },
  {
    question: "Is Caleonis Reception open source?",
    answer:
      "Yes. Caleonis Reception is an open-source AI receptionist. You can use Caleonis Reception Cloud for a hosted setup or self-host the stack when you want more control over infrastructure and customer data.",
  },
  {
    question: "How much does an AI receptionist cost?",
    answer:
      "Caleonis Reception starts free with 30 voice minutes per month for browser test calls. Paid plans begin at $30 per month for Starter and $100 per month for Pro, with usage-based overages. Enterprise pricing is available for higher volume and self-hosted support.",
  },
  {
    question: "How is Caleonis Reception different from a call tree or voicemail?",
    answer:
      "A call tree pushes callers through rigid menus, and voicemail asks them to wait for a callback. Caleonis Reception answers naturally, uses your business knowledge, can book appointments during the call, and sends your team a summary with context instead of a raw message.",
  },
]

export const homeFaqsFr: FaqItem[] = [
  {
    question:
      "Puis-je personnaliser l'accueil et le ton de mon réceptionniste IA ?",
    answer:
      "Oui. Caleonis Reception vous permet de personnaliser l'accueil, le ton, les consignes métier et les règles de traitement des appels afin que votre réceptionniste IA reste alignée avec votre marque.",
  },
  {
    question:
      "Que se passe-t-il si un appelant demande quelque chose d'inhabituel ?",
    answer:
      "Vous définissez le comportement de secours. Caleonis Reception peut prendre un message pour votre équipe ou transférer l'appelant à une personne.",
  },
  {
    question: "Caleonis Reception peut-il planifier directement dans mon calendrier ?",
    answer:
      "Oui. Caleonis Reception peut vérifier les disponibilités, proposer des créneaux, planifier le rendez‑vous et envoyer les détails de confirmation à l'appelant.",
  },
  {
    question: "Le réceptionniste IA peut-il m'envoyer un résumé d'appel ?",
    answer:
      "Oui. Caleonis Reception vous envoie un courriel après chaque appel avec les coordonnées de l'appelant, le motif, le résultat et la prochaine étape. Sur les forfaits payants, vous pouvez aussi activer les alertes SMS.",
  },
  {
    question: "Quels appels doivent encore revenir à une personne ?",
    answer:
      "Caleonis Reception convient très bien aux questions courantes, prises de rendez‑vous, collectes d'information et qualifications de prospects. Les négociations complexes, situations sensibles, cas urgents et dépannages spécialisés peuvent être transférés à votre équipe.",
  },
  {
    question: "Caleonis Reception est-il open source ?",
    answer:
      "Oui. Caleonis Reception est un réceptionniste IA open source. Vous pouvez utiliser Caleonis Reception Cloud pour une mise en place hébergée ou auto-héberger la pile quand vous voulez plus de contrôle sur l'infrastructure et les données clients.",
  },
  {
    question: "Combien coûte un réceptionniste IA ?",
    answer:
      "Caleonis Reception commence gratuitement avec 30 minutes vocales par mois pour des appels de test dans le navigateur. Les forfaits payants démarrent à 30 $/mois pour Starter et 100 $/mois pour Pro, avec des dépassements à l'usage. Enterprise est disponible pour les volumes plus élevés et l'accompagnement à l'auto-hébergement.",
  },
  {
    question:
      "En quoi Caleonis Reception diffère-t-il d'un menu téléphonique ou d'une messagerie vocale ?",
    answer:
      "Un menu téléphonique impose des choix rigides, et la messagerie vocale demande à l'appelant d'attendre un rappel. Caleonis Reception répond naturellement, utilise vos connaissances d'entreprise, peut réserver pendant l'appel et envoie à votre équipe un résumé avec contexte au lieu d'un simple message brut.",
  },
]

export const getHomeFaqs = (locale: Locale): FaqItem[] =>
  locale === "fr" ? homeFaqsFr : homeFaqs
