import type { Locale } from "@/i18n/config"
import type { SeoLandingPage } from "./seo-landing-pages"

/** Describe the inherited target without advertising unqualified pilot capabilities. */
export function qualifyPilotText(text: string, locale: Locale): string {
  const fr = locale === "fr"
  const notes: string[] = []
  if (/\bSMS\b|\btextos?\b|\btexts?\b|text messages|rappel la veille/i.test(text) && !/Voice-only.*(?:indisponible|unavailable)|(?:indisponible|unavailable).*Voice-only/i.test(text)) notes.push(fr ? "SMS indisponibles sur le numéro pilote français Voice-only." : "SMS is unavailable on the French Voice-only pilot number.")
  if (/transf[eè]|handoff/i.test(text) && !/non qualifi|unqualified|qualification|à qualifier/i.test(text)) notes.push(fr ? "Transfert humain à qualifier ; le pilote prépare un rappel à partir du message." : "Human transfer requires qualification; the pilot prepares a callback from the message.")
  if (/illimit|unlimited|as many calls/i.test(text) && !/à qualifier|not qualified|aucun engagement|no .*commitment/i.test(text)) notes.push(fr ? "Aucune capacité illimitée n’est qualifiée pour Caléonis." : "Unlimited capacity has not been qualified for Caléonis.")
  if (/Free plan|free plan|forfait gratuit|gratuitement|starts free|commence gratuitement|no setup|mise en service/i.test(text) && !/draft|projet|non activ|unactivated|à valider/i.test(text)) notes.push(fr ? "Catalogue EUR en projet, sans droit gratuit, frais ou souscription activés ; conditions à valider." : "EUR draft catalogue: no free entitlement, fee or subscription is activated; terms require approval.")
  if (/email alert|sends? .*notification|envoie une alerte|notify.*instantly/i.test(text) && !/configuration|à qualifier/i.test(text)) notes.push(fr ? "Les notifications externes dépendent d’une configuration et d’une qualification distinctes." : "External notifications require separate configuration and qualification.")
  if (!notes.length) return text
  // Keep the full product statement within an explicit, unactivated target scope.
  return `${notes.join(" ")} ${fr ? "Fonction cible, non activée dans le pilote :" : "Target capability, not enabled in the pilot:"} ${text}`
}

export function qualifyPilotLabel(text: string, locale: Locale): string {
  if (/indisponible|unavailable|à qualifier|qualification/i.test(text)) return text
  if (/\bSMS\b|confirmation texts|notification texts/i.test(text)) return `${text} · ${locale === "fr" ? "indisponible Voice-only" : "unavailable Voice-only"}`
  if (/transf[eè]|handoff|unlimited|illimit/i.test(text)) return `${text} · ${locale === "fr" ? "à qualifier pour Caléonis" : "requires Caléonis qualification"}`
  return text
}

export function qualifyPilotMetadata(text: string, locale: Locale, topic: string): string {
  if (!/\bSMS\b|\btexts?\b|transf[eè]|handoff|illimit|unlimited|free plan|starts free|gratuit|dollar|US or Canadian|américain|canadien/i.test(text)) return text
  return locale === "fr"
    ? `${topic.replace(/\s*\|.*$/, "")} : accueil vocal et suivi selon configuration. Catalogue EUR en projet ; SMS indisponibles Voice-only, transferts à qualifier.`
    : `${topic.replace(/\s*\|.*$/, "")}: voice reception and call history according to configuration. Draft EUR catalogue; no Voice-only SMS, transfers require qualification.`
}

function medicalText(text: string, locale: Locale, context = ""): string {
  const fr = locale === "fr"
  const probe = `${context} ${text}`
  if (/pain|swelling|bleeding|trauma|douleur|gonflement|saignement|sympt[oô]me|triage|diagnos/i.test(probe)) return fr
    ? "Démonstration administrative fictive uniquement. Caléonis ne réalise aucun diagnostic ni triage clinique, ne recueille pas de symptômes et ne prend pas en charge une urgence médicale. Qualification HDS non établie : aucun usage réel de données de santé ne doit être activé."
    : "Fictional administrative demonstration only. Caléonis does not diagnose, perform clinical triage, collect symptoms or handle medical emergencies. HDS qualification has not been established: do not enable real health-data processing."
  if (/HIPAA|HDS|patient data|données.*patient|données de santé|securely|conformit/i.test(probe)) return fr
    ? "Qualification HDS non établie. Aucune conformité HIPAA ou autre certification n’est revendiquée. L’auto-hébergement ne suffit pas à établir une qualification. Utilisez seulement des données administratives fictives, sans données de santé réelles ; les durées de conservation Caléonis sont à valider."
    : "HDS qualification has not been established. No HIPAA compliance or other certification is claimed. Self-hosting alone does not establish qualification. Use fictional administrative data only, without real health data; Caléonis retention periods require approval."
  if (/\bSMS\b|\btexts?\b|\btextos?\b|rappel la veille|reminder/i.test(probe)) return fr
    ? "Le numéro français pilote est Voice-only : aucun SMS de confirmation ni de rappel. Une démonstration de réservation se limite à un créneau administratif fictif dans Google Calendar, contrôlé par l’opérateur."
    : "The French pilot number is Voice-only: no SMS confirmations or reminders. A booking demonstration is limited to a fictional administrative slot in Google Calendar, checked by the operator."
  if (/new patient|nouveaux? patients?|insurance details|assureur|assurance|reason for the visit|motif de la visite/i.test(probe)) return fr
    ? "Pour cette revue, limitez le scénario aux horaires, coordonnées publiques et à un rappel administratif avec données fictives. N’activez ni collecte d’assurance, ni motif de consultation, ni dossier ou réservation de patient réel."
    : "For this review, limit the scenario to opening hours, public contact information and an administrative callback using fictional data. Do not enable insurance collection, consultation reasons or real patient records or bookings."
  return qualifyPilotText(text, locale)
}

export function qualifyPilotPage(page: SeoLandingPage, locale: Locale): SeoLandingPage {
  const medical = /dental|medical/.test(page.path)
  const adapt = (text: string) => medical ? medicalText(text, locale) : qualifyPilotText(text, locale)
  const clinical = locale === "fr" ? "Scénario administratif fictif ; qualification HDS non établie. Aucun usage de données de santé réelles." : "Fictional administrative scenario; HDS qualification has not been established. No real health-data use."
  return { ...page,
    description: medical ? `${page.eyebrow} : ${clinical}` : qualifyPilotMetadata(page.description, locale, page.eyebrow),
    intro: medical ? `${clinical} ${adapt(page.intro)}` : adapt(page.intro),
    proofPoints: page.proofPoints.map(adapt),
    sections: page.sections.map((section) => ({ ...section, body: adapt(section.body), points: section.points.map(adapt) })),
    faqs: page.faqs.map((faq) => ({ ...faq, answer: medical ? medicalText(faq.answer, locale, faq.question) : adapt(faq.answer) })),
  }
}
