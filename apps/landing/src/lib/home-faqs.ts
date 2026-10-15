import { qualifyPilotText } from "@/lib/pilot-qualification"
import type { FaqItem } from "@/lib/seo"
import type { Locale } from "@/i18n"

export const homeFaqs: FaqItem[] = [
  {
    question: "Can I customize my AI receptionist's greeting and tone?",
    answer:
      "Yes. Caléonis Receptionist lets you customize the greeting, tone, business instructions, and call handling rules so your AI receptionist sounds aligned with your brand.",
  },
  {
    question: "What happens when a caller asks something unusual?",
    answer:
      "You define the fallback behavior. Caléonis Receptionist can take a message for your team or transfer the caller to a person.",
  },
  {
    question:
      "Can Caléonis Receptionist book appointments directly into my calendar?",
    answer:
      "Yes. Caléonis Receptionist can check availability, offer appointment times, book the appointment, and send confirmation details to the caller.",
  },
  {
    question: "Can the AI receptionist send a call summary to my phone?",
    answer:
      "Not after every call. Caléonis Receptionist saves a summary of each call in your dashboard. When it takes a message, it sends your team an email alert, and on paid plans you can also turn on SMS alerts.",
  },
  {
    question: "What types of calls should still go to a human?",
    answer:
      "Caléonis Receptionist is a strong fit for routine questions, bookings, intake, and lead qualification. Complex negotiations, sensitive situations, urgent cases, and specialized troubleshooting can be transferred to your team.",
  },
  {
    question: "Is Caléonis Receptionist open source?",
    answer:
      "Yes. Caléonis Receptionist is an open-source AI receptionist. You can use Caléonis Receptionist Cloud for a hosted setup or self-host the stack when you want more control over infrastructure and customer data.",
  },
  {
    question: "How much does an AI receptionist cost?",
    answer:
      "The draft EUR catalogue targets Free at €0 with 30 minutes, Starter at €30/month or €288/year for 150 minutes, and Pro at €100/month or €960/year for 500 minutes. No free entitlement, number, purchase or subscription is activated on the French pilot by this catalogue. VAT and final terms require approval.",
  },
  {
    question:
      "How is Caléonis Receptionist different from a call tree or voicemail?",
    answer:
      "A call tree pushes callers through rigid menus, and voicemail asks them to wait for a callback. Caléonis Receptionist answers naturally, uses your business knowledge, can book appointments during the call, and saves a summary of each call for your team instead of a raw message.",
  },
]

export const homeFaqsFr: FaqItem[] = [
  {
    question:
      "Puis-je personnaliser l'accueil et le ton de mon réceptionniste IA ?",
    answer:
      "Oui. Caléonis Receptionist vous permet de personnaliser l'accueil, le ton, les consignes métier et les règles de traitement des appels afin que votre réceptionniste IA reste alignée avec votre marque.",
  },
  {
    question:
      "Que se passe-t-il si un appelant demande quelque chose d'inhabituel ?",
    answer:
      "Vous définissez le comportement de secours. Caléonis Receptionist peut prendre un message pour votre équipe ou transférer l'appelant à une personne.",
  },
  {
    question:
      "Caléonis Receptionist peut-il planifier directement dans mon calendrier ?",
    answer:
      "Oui. Caléonis Receptionist peut vérifier les disponibilités, proposer des créneaux, planifier le rendez‑vous et envoyer les détails de confirmation à l'appelant.",
  },
  {
    question: "Le réceptionniste IA peut-il m'envoyer un résumé d'appel ?",
    answer:
      "Pas après chaque appel. Caléonis Receptionist enregistre un résumé de chaque appel dans le tableau de bord. Quand il prend un message, il envoie une alerte par courriel à votre équipe, et sur les forfaits payants, vous pouvez aussi activer les alertes SMS.",
  },
  {
    question: "Quels appels doivent encore revenir à une personne ?",
    answer:
      "Caléonis Receptionist convient très bien aux questions courantes, prises de rendez‑vous, collectes d'information et qualifications de prospects. Les négociations complexes, situations sensibles, cas urgents et dépannages spécialisés peuvent être transférés à votre équipe.",
  },
  {
    question: "Caléonis Receptionist est-il open source ?",
    answer:
      "Oui. Caléonis Receptionist est un réceptionniste IA open source. Vous pouvez utiliser Caléonis Receptionist Cloud pour une mise en place hébergée ou auto-héberger la pile quand vous voulez plus de contrôle sur l'infrastructure et les données clients.",
  },
  {
    question: "Combien coûte un réceptionniste IA ?",
    answer:
      "Le catalogue EUR en projet cible Free à 0 € pour 30 minutes, Starter à 30 €/mois ou 288 €/an pour 150 minutes, et Pro à 100 €/mois ou 960 €/an pour 500 minutes. Ce catalogue n’active aucun droit gratuit, numéro, achat ni abonnement sur le pilote français. TVA et conditions finales restent à valider.",
  },
  {
    question:
      "En quoi Caléonis Receptionist diffère-t-il d'un menu téléphonique ou d'une messagerie vocale ?",
    answer:
      "Un menu téléphonique impose des choix rigides, et la messagerie vocale demande à l'appelant d'attendre un rappel. Caléonis Receptionist répond naturellement, utilise vos connaissances d'entreprise, peut réserver pendant l'appel et enregistre pour votre équipe un résumé de chaque appel au lieu d'un simple message brut.",
  },
]

export const getHomeFaqs = (locale: Locale): FaqItem[] => {
  return (locale === "fr" ? homeFaqsFr : homeFaqs).map((faq) => ({
    ...faq,
    answer: qualifyPilotText(faq.answer, locale),
  }))
}
