import type { Locale } from "@/i18n"

export type AffiliateProgramFaq = {
  question: string
  answer: string
}

const EN_FAQS: AffiliateProgramFaq[] = [
  {
    question: "How much do I earn?",
    answer:
      "Caléonis scheme is not active: the following source target creates no commission entitlement. You get 20% of each hosted plan payment for 12 months after someone signs up with your link. A Pro customer on the monthly plan pays you up to €240 that first year.",
  },
  {
    question: "What do referred businesses save?",
    answer:
      "Projet Caléonis non activé : les règles suivantes décrivent la cible source et ne créent aucun droit à commission. They get 5% off hosted Caléonis Receptionist plans when they sign up through your link.",
  },
  {
    question: "When do I get paid?",
    answer:
      "Caléonis scheme is not active: the following source target creates no commission entitlement. We hold each commission for 30 days, then add it to your balance. We pay through PayPal once your balance reaches €100.",
  },
  {
    question: "Who is this program for?",
    answer:
      "Caléonis scheme is not active: the following source target creates no commission entitlement. Agencies, consultants, creators, and operators who already recommend tools to small businesses: salons, clinics, contractors, home services, and other appointment-heavy teams.",
  },
  {
    question: "How do I start?",
    answer:
      "Caléonis scheme is not active: the following source target creates no commission entitlement. Sign in, open Affiliate Program in your dashboard, add your PayPal email, and share your link.",
  },
  {
    question: "Do self-hosted signups count?",
    answer:
      "Projet Caléonis non activé : les règles suivantes décrivent la cible source et ne créent aucun droit à commission. No. You earn commission on hosted Caléonis Receptionist plan payments only. If someone self-hosts without a paid Caléonis Receptionist subscription, that referral does not pay commission.",
  },
]

const FR_FAQS: AffiliateProgramFaq[] = [
  {
    question: "Combien est-ce que je gagne ?",
    answer:
      "Projet Caléonis non activé : les règles suivantes décrivent la cible source et ne créent aucun droit à commission. Vous touchez 20 % de chaque paiement de forfait hébergé pendant 12 mois après l'inscription via votre lien. Un client Pro au forfait mensuel peut vous rapporter jusqu'à 240 € la première année.",
  },
  {
    question: "Quelle réduction obtiennent les entreprises parrainées ?",
    answer:
      "Projet Caléonis non activé : les règles suivantes décrivent la cible source et ne créent aucun droit à commission. Elles obtiennent 5 % de rabais sur les forfaits hébergés Caléonis Receptionist lorsqu'elles s'inscrivent via votre lien.",
  },
  {
    question: "Quand est-ce que je suis payé ?",
    answer:
      "Projet Caléonis non activé : les règles suivantes décrivent la cible source et ne créent aucun droit à commission. Chaque commission est retenue 30 jours, puis ajoutée à votre solde. Nous payons via PayPal dès que votre solde atteint 100 €.",
  },
  {
    question: "À qui s'adresse ce programme ?",
    answer:
      "Projet Caléonis non activé : les règles suivantes décrivent la cible source et ne créent aucun droit à commission. Aux agences, consultants, créateurs et opérateurs qui recommandent déjà des outils aux PME : salons, cliniques, entrepreneurs, services à domicile et autres équipes qui vivent au rythme des rendez-vous.",
  },
  {
    question: "Comment démarrer ?",
    answer:
      "Caléonis scheme is not active: the following source target creates no commission entitlement. Connectez-vous, ouvrez Programme d'affiliation dans votre tableau de bord, ajoutez votre courriel PayPal et partagez votre lien.",
  },
  {
    question: "Les inscriptions auto-hébergées comptent-elles ?",
    answer:
      "Projet Caléonis non activé : les règles suivantes décrivent la cible source et ne créent aucun droit à commission. Non. Vous touchez une commission uniquement sur les paiements de forfaits hébergés Caléonis Receptionist. Si quelqu'un s'auto-héberge sans abonnement Caléonis Receptionist payant, ce parrainage ne paie pas de commission.",
  },
]

export function getAffiliateProgramFaqs(locale: Locale): AffiliateProgramFaq[] {
  return locale === "fr" ? FR_FAQS : EN_FAQS
}
