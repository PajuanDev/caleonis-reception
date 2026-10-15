import { qualifyPilotText } from "@/lib/pilot-qualification"
import type { FaqItem } from "@/lib/seo"
import type { Locale } from "@/i18n"

export const pricingFaqs: FaqItem[] = [
  {
    question: "How does Caléonis Receptionist paid pricing work?",
    answer:
      "Starter is €30/month or €288/year and includes 150 voice minutes each month. Pro is €100/month or €960/year and includes 500 voice minutes each month. Starter voice overage is €0.20/minute, Pro voice overage is €0.18/minute, and extra alert SMS segments and transfer attempts cost €0.02 each.",
  },
  {
    question: "Do spam calls or very short calls count toward usage?",
    answer:
      "No. Caléonis Receptionist excludes spam calls and calls under 10 seconds from usage, so wrong numbers, robocalls, instant hang-ups, and pocket dials do not count against your included voice minutes or paid-plan overages.",
  },
  {
    question: "Can I switch plans or cancel anytime?",
    answer:
      "Yes. You can upgrade, downgrade, or cancel your plan from billing settings. When you downgrade, you keep your current plan until the end of the billing period. There are no cancellation fees.",
  },
  {
    question: "Can I use Caléonis Receptionist for free?",
    answer:
      "Yes. Free includes 30 voice minutes, with no credit card. You can test your receptionist in your browser and, where a free trial is available, get a phone number free for 14 days. Choose Starter or Pro to keep your number after the trial.",
  },
  {
    question: "What AI receptionist features are available today?",
    answer:
      "Caléonis Receptionist can answer calls, capture caller details, answer business questions from your knowledge base, qualify leads, book appointments, route urgent callers, send email alerts when it takes a message, and support recordings, transcripts, Google Calendar, and conversations in the caller's language.",
  },
]

export const pricingFaqsFr: FaqItem[] = [
  {
    question:
      "Comment fonctionnent les forfaits payants Caléonis Receptionist ?",
    answer:
      "Starter coûte 30 €/mois ou 288 €/an et inclut 150 minutes vocales chaque mois. Pro coûte 100 €/mois ou 960 €/an et inclut 500 minutes vocales. Les dépassements vocaux sont de 0,20 €/min en Starter et 0,18 €/min en Pro; les SMS d’alerte et tentatives de transfert supplémentaires sont facturés 0,02 € par unité.",
  },
  {
    question:
      "Les appels indésirables ou très courts comptent-ils dans l’usage ?",
    answer:
      "Non. Caléonis Receptionist exclut les appels indésirables et les appels de moins de 10 secondes de l’usage, afin que les mauvais numéros, appels automatisés, raccrochages instantanés et appels accidentels ne consomment pas vos minutes incluses.",
  },
  {
    question: "Puis-je changer de forfait ou annuler à tout moment ?",
    answer:
      "Oui. Vous pouvez passer à un forfait supérieur, revenir à un forfait inférieur ou annuler depuis les réglages de facturation. Si vous changez de forfait, votre forfait actuel reste actif jusqu’à la fin de la période. Il n’y a pas de frais d’annulation.",
  },
  {
    question: "Puis-je utiliser Caléonis Receptionist gratuitement ?",
    answer:
      "Oui. Free inclut 30 minutes vocales, sans carte bancaire. Vous pouvez tester votre réceptionniste dans le navigateur et, là où l’essai gratuit est proposé, obtenir un numéro de téléphone gratuit pendant 14 jours. Choisissez Starter ou Pro pour garder votre numéro après l’essai.",
  },
  {
    question:
      "Quelles fonctionnalités de réceptionniste IA sont disponibles aujourd’hui ?",
    answer:
      "Caléonis Receptionist peut répondre aux appels, collecter les détails de l’appelant, répondre aux questions depuis votre base de connaissances, qualifier les prospects, planifier des rendez‑vous, transférer les urgences, envoyer une alerte par courriel quand il prend un message et prendre en charge les enregistrements, transcriptions, Google Calendar et conversations dans la langue de l’appelant.",
  },
]

export const getPricingFaqs = (locale: Locale): FaqItem[] => {
  const sourcePrefix =
    locale === "fr"
      ? "Catalogue source cible non activé : "
      : "Unactivated source target catalogue: "
  return (locale === "fr" ? pricingFaqsFr : pricingFaqs).map((faq) => ({
    ...faq,
    answer: sourcePrefix + qualifyPilotText(faq.answer, locale),
  }))
}
