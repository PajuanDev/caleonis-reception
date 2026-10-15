import { Button, buttonVariants } from "@/components/ui/button"
import { APP_SIGNUP_URL } from "@/lib/app-links"
import type { Locale } from "@/i18n"
import { cn } from "@/lib/utils"
import { getCloudPlanFactSheet } from "@lobbystack/shared/product-capabilities"
import { Check, Minus, ArrowRight } from "lucide-react"
import { Fragment, useLayoutEffect, useRef, useState } from "react"

/* ─────────────────────────── Data ─────────────────────────── */

const freePlanFacts = getCloudPlanFactSheet("free_cloud")
const freeVoiceMinutes = freePlanFacts.voiceMinutesIncluded ?? 0

type Tier = {
  name: string
  price: {
    monthly: string
    annual: string
  }
  period: string
  description: {
    monthly: string
    annual: string
  }
  cta: {
    monthly: string
    annual: string
  }
  ctaHref?: string
  ctaVariant: "default" | "outline"
  highlight: boolean
  highlights: Array<
    | string
    | {
        label: string
        sublabel: string
      }
  >
}

type BillingInterval = "monthly" | "annual"

const enterpriseContactHref = APP_SIGNUP_URL

const tiers: Tier[] = [
  {
    name: "Free",
    price: {
      monthly: "€0",
      annual: "€0",
    },
    period: "",
    description: {
      monthly: "Source: 14-day trial — French availability unapproved",
      annual: "Source: 14-day trial — French availability unapproved",
    },
    cta: {
      monthly: "Start free",
      annual: "Start free",
    },
    ctaVariant: "outline" as const,
    highlight: false,
    highlights: [
      `${freeVoiceMinutes} browser voice minutes included`,
      "Source: 1 number free for 14 days — not included in French pilot",
      "Source: 10 SMS segments, 2 transfers — not enabled in French pilot",
      "Community support",
    ],
  },
  {
    name: "Starter",
    price: {
      monthly: "€30",
      annual: "€24",
    },
    period: "/mo",
    description: {
      monthly: "Per month, billed monthly",
      annual: "Per month, billed annually",
    },
    cta: {
      monthly: "Start free",
      annual: "Start free",
    },
    ctaVariant: "outline" as const,
    highlight: false,
    highlights: [
      {
        label: "150 voice minutes included",
        sublabel: "Then €0.20/min",
      },
      "1 number — subject to lawful French allocation",
      "50 alert SMS segments — target, unavailable Voice-only",
      "Email support",
    ],
  },
  {
    name: "Pro",
    price: {
      monthly: "€100",
      annual: "€80",
    },
    period: "/mo",
    description: {
      monthly: "Per month, billed monthly",
      annual: "Per month, billed annually",
    },
    cta: {
      monthly: "Start free",
      annual: "Start free",
    },
    ctaVariant: "default" as const,
    highlight: true,
    highlights: [
      {
        label: "500 voice minutes included",
        sublabel: "Then €0.18/min",
      },
      "1 number — subject to lawful French allocation",
      "200 alert SMS segments — target, unavailable Voice-only",
      "Priority email support",
    ],
  },
  {
    name: "Enterprise",
    price: {
      monthly: "Custom",
      annual: "Custom",
    },
    period: "",
    description: {
      monthly: "For higher volume",
      annual: "For higher volume",
    },
    cta: {
      monthly: "Contact us",
      annual: "Contact us",
    },
    ctaHref: enterpriseContactHref,
    ctaVariant: "outline" as const,
    highlight: false,
    highlights: [
      "Multiple numbers — target, subject to approval",
      "Custom usage limits",
      "Dedicated implementation support",
    ],
  },
]

const tiersFr: Tier[] = [
  {
    name: "Free",
    price: {
      monthly: "€0",
      annual: "€0",
    },
    period: "",
    description: {
      monthly: "Source : essai 14 jours — non approuvé en France",
      annual: "Source : essai 14 jours — non approuvé en France",
    },
    cta: {
      monthly: "Commencer gratuitement",
      annual: "Commencer gratuitement",
    },
    ctaVariant: "outline" as const,
    highlight: false,
    highlights: [
      `${freeVoiceMinutes} minutes vocales dans le navigateur`,
      "Source : 1 numéro gratuit 14 jours — non inclus sur le pilote FR",
      "Source : 10 SMS, 2 transferts — indisponibles sur le pilote FR",
      "Support communautaire",
    ],
  },
  {
    name: "Starter",
    price: {
      monthly: "€30",
      annual: "€24",
    },
    period: "/mois",
    description: {
      monthly: "Par mois, facturé mensuellement",
      annual: "Par mois, facturé annuellement",
    },
    cta: {
      monthly: "Commencer gratuitement",
      annual: "Commencer gratuitement",
    },
    ctaVariant: "outline" as const,
    highlight: false,
    highlights: [
      {
        label: "150 minutes vocales incluses",
        sublabel: "Puis 0,20 €/min",
      },
      "1 numéro — attribution FR conforme à valider",
      "50 segments SMS — cible, indisponible Voice-only",
      "Support par courriel",
    ],
  },
  {
    name: "Pro",
    price: {
      monthly: "€100",
      annual: "€80",
    },
    period: "/mois",
    description: {
      monthly: "Par mois, facturé mensuellement",
      annual: "Par mois, facturé annuellement",
    },
    cta: {
      monthly: "Commencer gratuitement",
      annual: "Commencer gratuitement",
    },
    ctaVariant: "default" as const,
    highlight: true,
    highlights: [
      {
        label: "500 minutes vocales incluses",
        sublabel: "Puis 0,18 €/min",
      },
      "1 numéro — attribution FR conforme à valider",
      "200 segments SMS — cible, indisponible Voice-only",
      "Support prioritaire par courriel",
    ],
  },
  {
    name: "Enterprise",
    price: {
      monthly: "Sur mesure",
      annual: "Sur mesure",
    },
    period: "",
    description: {
      monthly: "Pour les volumes élevés",
      annual: "Pour les volumes élevés",
    },
    cta: {
      monthly: "Nous contacter",
      annual: "Nous contacter",
    },
    ctaHref: enterpriseContactHref,
    ctaVariant: "outline" as const,
    highlight: false,
    highlights: [
      "Plusieurs numéros — cible à valider",
      "Limites d'utilisation sur mesure",
      "Accompagnement dédié à l’implémentation",
    ],
  },
]

const tiersByLocale = {
  en: tiers,
  fr: tiersFr,
} satisfies Record<Locale, Tier[]>

/* ─── Comparison table data ─── */

type ComparisonValue =
  | string
  | boolean
  | {
      included: string
      then?: string
    }

type ComparisonRow = {
  feature: string
  free: ComparisonValue
  starter?: ComparisonValue
  pro: ComparisonValue
  enterprise: ComparisonValue
}

type ComparisonGroup = {
  category: string
  rows: ComparisonRow[]
}

const comparisonGroupsEn: ComparisonGroup[] = [
  {
    category: "Usage & limits",
    rows: [
      {
        feature: "Voice minutes",
        free: { included: `${freeVoiceMinutes} browser minutes` },
        starter: { included: "150 included", then: "then €0.20/min" },
        pro: { included: "500 included", then: "then €0.18/min" },
        enterprise: "Custom",
      },
      {
        feature: "Transfer attempts — unqualified pilot",
        free: "2 source; pilot unavailable",
        starter: { included: "20 included", then: "then €0.02/attempt" },
        pro: { included: "100 included", then: "then €0.02/attempt" },
        enterprise: "Custom",
      },
      {
        feature: "Alert SMS segments — unavailable Voice-only",
        free: "10 source; unavailable Voice-only",
        starter: { included: "50 included", then: "then €0.02/segment" },
        pro: { included: "200 included", then: "then €0.02/segment" },
        enterprise: "Custom",
      },
      {
        feature: "Knowledge base",
        free: "1 MB",
        starter: "5 MB",
        pro: "20 MB",
        enterprise: "Custom",
      },
      {
        feature: "Phone numbers — French allocation unapproved",
        free: "14 days source; not included FR",
        starter: "1 dedicated",
        pro: "1 dedicated",
        enterprise: "Multiple",
      },
    ],
  },
  {
    category: "Core receptionist",
    rows: [
      {
        feature: "24/7 call answering",
        free: "Browser testing",
        pro: true,
        enterprise: true,
      },
      {
        feature: "Caller details and message capture",
        free: true,
        pro: true,
        enterprise: true,
      },
      {
        feature: "Knowledge base answers",
        free: true,
        pro: true,
        enterprise: true,
      },
      {
        feature: "Plain-language workflows",
        free: true,
        pro: true,
        enterprise: true,
      },
      {
        feature: "Spam filtering",
        free: true,
        pro: true,
        enterprise: true,
      },
      {
        feature: "Calls under 10s excluded from billing",
        free: true,
        pro: true,
        enterprise: true,
      },
      {
        feature: "Unlimited concurrent calls",
        free: true,
        pro: true,
        enterprise: true,
      },
      {
        feature: "Answers in the caller's language",
        free: true,
        pro: true,
        enterprise: true,
      },
    ],
  },
  {
    category: "Booking",
    rows: [
      {
        feature: "Appointment booking",
        free: "Unlimited source target — no Caléonis commitment",
        pro: "Unlimited source target — no Caléonis commitment",
        enterprise: "Unlimited source target — no Caléonis commitment",
      },
      {
        feature: "Appointment confirmation texts",
        free: false,
        pro: true,
        enterprise: true,
      },
      {
        feature: "Google Calendar integration",
        free: true,
        pro: true,
        enterprise: true,
      },
    ],
  },
  {
    category: "Routing & transfers",
    rows: [
      {
        feature: "Urgent call handoff",
        free: false,
        pro: true,
        enterprise: true,
      },
      {
        feature: "Call transfers",
        free: false,
        pro: true,
        enterprise: true,
      },
      {
        feature: "After-hours answering",
        free: false,
        pro: true,
        enterprise: true,
      },
    ],
  },
  {
    category: "Notifications & messaging",
    rows: [
      {
        feature: "Email notifications",
        free: true,
        pro: true,
        enterprise: true,
      },
      {
        feature: "SMS notifications",
        free: false,
        pro: true,
        enterprise: true,
      },
    ],
  },
  {
    category: "Data & dashboard",
    rows: [
      {
        feature: "Call summaries and transcripts",
        free: "Unlimited source target — no Caléonis commitment",
        pro: "Unlimited source target — no Caléonis commitment",
        enterprise: "Unlimited source target — no Caléonis commitment",
      },
      {
        feature: "Call history and recordings",
        free: "30 days source target — Caléonis retention pending",
        starter: "90 days source target — Caléonis retention pending",
        pro: "90 days source target — Caléonis retention pending",
        enterprise: "Custom source target — pending",
      },
      {
        feature: "Caller profiles and notes",
        free: true,
        pro: true,
        enterprise: true,
      },
      {
        feature: "Contacts",
        free: "Unlimited source target — no Caléonis commitment",
        pro: "Unlimited source target — no Caléonis commitment",
        enterprise: "Unlimited source target — no Caléonis commitment",
      },
      {
        feature: "Website knowledge import",
        free: true,
        pro: true,
        enterprise: true,
      },
    ],
  },
  {
    category: "Deployment & support",
    rows: [
      {
        feature: "Hosting",
        free: "Managed cloud",
        pro: "Managed cloud",
        enterprise: "Managed cloud",
      },
      {
        feature: "Usage-based overages",
        free: false,
        pro: true,
        enterprise: true,
      },
      {
        feature: "Support",
        free: "Community",
        starter: "Email",
        pro: "Priority email",
        enterprise: "Dedicated implementation",
      },
    ],
  },
]

const comparisonGroupsFr: ComparisonGroup[] = [
  {
    category: "Usage et limites",
    rows: [
      {
        feature: "Minutes vocales",
        free: { included: `${freeVoiceMinutes} minutes dans le navigateur` },
        starter: { included: "150 incluses", then: "puis 0,20 €/min" },
        pro: { included: "500 incluses", then: "puis 0,18 €/min" },
        enterprise: "Sur mesure",
      },
      {
        feature: "Tentatives de transfert — pilote non qualifié",
        free: "2 source ; indisponibles pilote",
        starter: { included: "20 incluses", then: "puis 0,02 €/tentative" },
        pro: { included: "100 incluses", then: "puis 0,02 €/tentative" },
        enterprise: "Sur mesure",
      },
      {
        feature: "Segments SMS — indisponibles Voice-only",
        free: "10 source ; indisponibles Voice-only",
        starter: { included: "50 inclus", then: "puis 0,02 €/segment" },
        pro: { included: "200 inclus", then: "puis 0,02 €/segment" },
        enterprise: "Sur mesure",
      },
      {
        feature: "Base de connaissances",
        free: "1 Mo",
        starter: "5 Mo",
        pro: "20 Mo",
        enterprise: "Sur mesure",
      },
      {
        feature: "Numéros — attribution FR à valider",
        free: "14 jours source ; non inclus FR",
        starter: "1 dédié",
        pro: "1 dédié",
        enterprise: "Plusieurs",
      },
    ],
  },
  {
    category: "Réceptionniste IA",
    rows: [
      {
        feature: "Réponse aux appels 24/7",
        free: "Tests dans le navigateur",
        pro: true,
        enterprise: true,
      },
      {
        feature: "Collecte des détails et messages",
        free: true,
        pro: true,
        enterprise: true,
      },
      {
        feature: "Réponses depuis la base de connaissances",
        free: true,
        pro: true,
        enterprise: true,
      },
      {
        feature: "Consignes en langage naturel",
        free: true,
        pro: true,
        enterprise: true,
      },
      {
        feature: "Filtrage du spam",
        free: true,
        pro: true,
        enterprise: true,
      },
      {
        feature: "Appels de moins de 10 s exclus de la facturation",
        free: true,
        pro: true,
        enterprise: true,
      },
      {
        feature: "Appels simultanés illimités",
        free: true,
        pro: true,
        enterprise: true,
      },
      {
        feature: "Répond dans la langue de l'appelant",
        free: true,
        pro: true,
        enterprise: true,
      },
    ],
  },
  {
    category: "Rendez-vous",
    rows: [
      {
        feature: "Prise de rendez‑vous",
        free: "Illimitée cible source — aucun engagement Caléonis",
        pro: "Illimitée cible source — aucun engagement Caléonis",
        enterprise: "Illimitée cible source — aucun engagement Caléonis",
      },
      {
        feature: "SMS de confirmation de rendez‑vous",
        free: false,
        pro: true,
        enterprise: true,
      },
      {
        feature: "Intégration Google Calendar",
        free: true,
        pro: true,
        enterprise: true,
      },
    ],
  },
  {
    category: "Routage et transferts",
    rows: [
      {
        feature: "Transfert des appels urgents",
        free: false,
        pro: true,
        enterprise: true,
      },
      {
        feature: "Transferts d'appel",
        free: false,
        pro: true,
        enterprise: true,
      },
      {
        feature: "Réponse hors horaires",
        free: false,
        pro: true,
        enterprise: true,
      },
    ],
  },
  {
    category: "Notifications et messagerie",
    rows: [
      {
        feature: "Notifications par courriel",
        free: true,
        pro: true,
        enterprise: true,
      },
      {
        feature: "Notifications SMS",
        free: false,
        pro: true,
        enterprise: true,
      },
    ],
  },
  {
    category: "Données et tableau de bord",
    rows: [
      {
        feature: "Résumés et transcriptions d’appels",
        free: "Illimités cible source — aucun engagement Caléonis",
        pro: "Illimités cible source — aucun engagement Caléonis",
        enterprise: "Illimités cible source — aucun engagement Caléonis",
      },
      {
        feature: "Historique et enregistrements d'appels",
        free: "30 jours cible source — conservation Caléonis à valider",
        starter: "90 jours cible source — conservation Caléonis à valider",
        pro: "90 jours cible source — conservation Caléonis à valider",
        enterprise: "Cible sur mesure — à valider",
      },
      {
        feature: "Profils et notes d'appelants",
        free: true,
        pro: true,
        enterprise: true,
      },
      {
        feature: "Contacts",
        free: "Illimités cible source — aucun engagement Caléonis",
        pro: "Illimités cible source — aucun engagement Caléonis",
        enterprise: "Illimités cible source — aucun engagement Caléonis",
      },
      {
        feature: "Import de connaissances depuis le site web",
        free: true,
        pro: true,
        enterprise: true,
      },
    ],
  },
  {
    category: "Hébergement et support",
    rows: [
      {
        feature: "Hébergement",
        free: "Cloud géré",
        pro: "Cloud géré",
        enterprise: "Cloud géré",
      },
      {
        feature: "Dépassements à l’usage",
        free: false,
        pro: true,
        enterprise: true,
      },
      {
        feature: "Support",
        free: "Communauté",
        starter: "Courriel",
        pro: "Courriel prioritaire",
        enterprise: "Implémentation dédiée",
      },
    ],
  },
]

const comparisonGroupsByLocale = {
  en: comparisonGroupsEn,
  fr: comparisonGroupsFr,
} satisfies Record<Locale, ComparisonGroup[]>

/* ─────────────────────────── Components ─────────────────────────── */

function ComparisonCell({
  includedLabel,
  notIncludedLabel,
  value,
}: {
  includedLabel: string
  notIncludedLabel: string
  value: ComparisonValue
}) {
  if (typeof value === "boolean") {
    return value ? (
      <span className="inline-flex items-center justify-center">
        <Check
          className="mx-auto size-4 text-foreground/60"
          aria-hidden="true"
        />
        <span className="sr-only">{includedLabel}</span>
      </span>
    ) : (
      <span className="inline-flex items-center justify-center">
        <Minus
          className="mx-auto size-4 text-muted-foreground/30"
          aria-hidden="true"
        />
        <span className="sr-only">{notIncludedLabel}</span>
      </span>
    )
  }

  if (typeof value === "string") {
    return (
      <span
        className={
          value === "-" ? "text-muted-foreground/40" : "text-muted-foreground"
        }
      >
        {value}
      </span>
    )
  }

  return (
    <span className="inline-flex flex-col gap-0.5 leading-tight">
      <span className="font-medium text-foreground">{value.included}</span>
      {value.then && (
        <span className="text-xs text-muted-foreground">{value.then}</span>
      )}
    </span>
  )
}

type PricingSectionProps = {
  locale?: Locale
}

const pricingSectionCopy = {
  en: {
    heading: "Plans for businesses of every size",
    intro:
      "Compare the draft Free, Starter and Pro target packages. Pilot access and every commercial entitlement require approval.",
    monthly: "Monthly",
    annual: "Annual",
    save: "Save 20%",
    compareHeading: "Compare plans in detail",
    compareIntro:
      "Source Free: 30 minutes and a 14-day number trial. French number allocation is not included or approved. Starter/Pro target quotas below remain draft.",
    billingLabel: "Billing interval",
    tableLabel: "Plan comparison table",
    caption:
      "Feature comparison across Free, Starter, Pro, and Enterprise plans.",
    feature: "Feature",
    included: "Included",
    notIncluded: "Not included",
  },
  fr: {
    heading: "Des forfaits pour entreprises de toute taille",
    intro:
      "Comparez les forfaits cibles Free, Starter et Pro. L’accès au pilote et chaque droit commercial exigent une validation.",
    monthly: "Mensuel",
    annual: "Annuel",
    save: "Économisez 20 %",
    compareHeading: "Comparer les forfaits en détail",
    compareIntro:
      "Free source : 30 minutes et essai de numéro 14 jours. Attribution française non incluse et non approuvée. Les quotas Starter/Pro ci-dessous restent en projet.",
    billingLabel: "Intervalle de facturation",
    tableLabel: "Tableau de comparaison des forfaits",
    caption:
      "Comparaison des fonctionnalités entre les forfaits Free, Starter, Pro et Enterprise.",
    feature: "Fonctionnalité",
    included: "Inclus",
    notIncluded: "Non inclus",
  },
} satisfies Record<Locale, Record<string, string>>

export function PricingSection({ locale = "en" }: PricingSectionProps) {
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("annual")
  const tabRefs = useRef<Record<BillingInterval, HTMLButtonElement | null>>({
    monthly: null,
    annual: null,
  })
  // Measured position of the selected tab. Until hydration measures it, the
  // selected tab paints its own background so the server HTML still shows state.
  const [thumb, setThumb] = useState<{ x: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const tab = tabRefs.current[billingInterval]
    if (!tab) return

    const measure = () =>
      setThumb({ x: tab.offsetLeft, width: tab.offsetWidth })
    measure()

    // Watch every tab: a late font swap can resize the one before this tab
    // and shift it without changing its own size.
    const observer = new ResizeObserver(measure)
    Object.values(tabRefs.current).forEach(
      (node) => node && observer.observe(node)
    )
    return () => observer.disconnect()
  }, [billingInterval])
  const copy = pricingSectionCopy[locale]
  const localizedTiers = tiersByLocale[locale].map((tier) => ({
    ...tier,
    ctaHref: APP_SIGNUP_URL,
    cta: {
      monthly: locale === "fr" ? "Examiner le projet" : "Review draft",
      annual: locale === "fr" ? "Examiner le projet" : "Review draft",
    },
  }))
  const localizedComparisonGroups = comparisonGroupsByLocale[locale].map((group) => ({
    ...group,
    rows: group.rows.map((row) => {
      const smsCapability = /confirmation texts|SMS de confirmation|SMS notifications|Notifications SMS/i.test(row.feature)
      const transferCapability = /urgent call handoff|call transfers|transfert des appels|transferts d'appel/i.test(row.feature)
      const unlimitedCapacity = /unlimited concurrent|appels simultanés illimités/i.test(row.feature)
      const phoneAllocation = /phone numbers|numéros/i.test(row.feature)
      const pendingExternal = /email notifications|notifications par courriel/i.test(row.feature)
      const state = smsCapability
        ? locale === "fr" ? "Indisponible Voice-only" : "Unavailable Voice-only"
        : transferCapability || unlimitedCapacity || pendingExternal
          ? locale === "fr" ? "À qualifier pour Caléonis" : "Requires Caléonis qualification"
          : undefined
      const feature = /indisponible|unavailable|non qualifi|unqualified|à valider/i.test(row.feature)
        ? row.feature
        : smsCapability ? `${row.feature} — ${locale === "fr" ? "indisponible Voice-only" : "unavailable Voice-only"}`
          : transferCapability || unlimitedCapacity ? `${row.feature} — ${locale === "fr" ? "à qualifier" : "requires qualification"}`
          : row.feature
      return {
        ...row,
        feature,
        ...(state ? {free: state, starter: state, pro: state, enterprise: state} : {}),
        ...(phoneAllocation ? {starter: locale === "fr" ? "1 cible — attribution FR à valider" : "1 target — French allocation unapproved", pro: locale === "fr" ? "1 cible — attribution FR à valider" : "1 target — French allocation unapproved", enterprise: locale === "fr" ? "Plusieurs cibles — à valider" : "Multiple targets — approval required"} : {}),
      }
    }),
  }))

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-4xl px-6 pt-16 pb-8 text-center md:pt-20 md:pb-10 lg:pb-12">
          <h1 className="animate-fade-up display-heading-compact stagger-1">
            {copy.heading}
          </h1>
          <p className="animate-fade-up body-copy stagger-2 mx-auto mt-5 max-w-[60ch] md:text-lg">
            {copy.intro}
          </p>
        </div>
      </section>

      <aside className="mx-auto max-w-7xl px-6" data-pricing-draft>
        <p className="rounded-xl border border-border/70 bg-muted/25 p-5 text-sm leading-relaxed">
          {locale === "fr"
            ? "PROJET NON SOUSCRIPTIBLE — mêmes nombres que le catalogue source, libellés en EUR, sans conversion de change. Free 0 €, Starter 30 €/mois ou 288 €/an, Pro 100 €/mois ou 960 €/an. TVA, statut HT/TTC, marge, attribution des numéros et CGV restent à valider avant toute vente. Les quotas ci-dessous décrivent le catalogue cible ; ils n’activent aucun droit ni débit. SMS indisponibles sur le pilote français Voice-only ; transferts non qualifiés."
            : "DRAFT — NO PURCHASE AVAILABLE. Source catalogue numbers displayed in EUR, without currency conversion. Free €0, Starter €30/month or €288/year, Pro €100/month or €960/year. VAT, tax-inclusive/exclusive status, margin, number allocation and terms require approval before sale. Quotas below describe the target catalogue and do not activate entitlements or payments. SMS is unavailable on the French Voice-only pilot; transfers remain unqualified."}
        </p>
      </aside>
      {/* ── Tier cards ── */}
      <section className="mx-auto max-w-7xl px-6 pt-8 pb-8 md:pt-10 md:pb-10 lg:pt-12 lg:pb-12">
        <div className="animate-fade-up stagger-3 mb-8 flex justify-center">
          <div
            aria-label={copy.billingLabel}
            className="relative inline-flex rounded-full border border-border bg-input/30 p-1"
            role="tablist"
          >
            {thumb && (
              <span
                aria-hidden="true"
                className="absolute top-1 bottom-1 left-0 rounded-full bg-background shadow-sm transition-[translate,width] duration-250 ease-(--ease-out) motion-reduce:transition-none"
                style={{ translate: `${thumb.x}px 0`, width: thumb.width }}
              />
            )}
            {(["monthly", "annual"] as const).map((interval) => (
              <Button
                aria-selected={billingInterval === interval}
                className={cn(
                  "relative h-9 rounded-full border-transparent bg-transparent px-4 hover:bg-transparent",
                  billingInterval === interval
                    ? cn(
                        "text-foreground",
                        !thumb && "bg-background shadow-sm hover:bg-background"
                      )
                    : "text-muted-foreground hover:text-foreground"
                )}
                key={interval}
                ref={(node) => {
                  tabRefs.current[interval] = node
                }}
                onClick={() => setBillingInterval(interval)}
                role="tab"
                size="sm"
                type="button"
                variant="outline"
              >
                {interval === "monthly" ? copy.monthly : copy.annual}
                {interval === "annual" ? (
                  <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    {copy.save}
                  </span>
                ) : null}
              </Button>
            ))}
          </div>
        </div>

        <div className="animate-fade-up stagger-3 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {localizedTiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex min-w-0 flex-col rounded-2xl border bg-background p-6 ${
                tier.highlight
                  ? "border-foreground/20 ring-1 ring-foreground/10"
                  : "border-border/60"
              }`}
            >
              {/* Tier header */}
              <div className="mb-6">
                <h2 className="font-heading text-lg font-medium tracking-[-0.03em]">
                  {tier.name}
                </h2>
                <div className="mt-3 flex items-baseline gap-1">
                  <span
                    key={tier.price[billingInterval]}
                    className="swap-in font-heading text-4xl font-medium tracking-[-0.05em] tabular-nums"
                  >
                    {tier.price[billingInterval]}
                  </span>
                  {tier.period && (
                    <span className="text-sm text-muted-foreground">
                      {tier.period}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {tier.description[billingInterval]}
                </p>
              </div>

              {/* Action */}
              <a
                href={tier.ctaHref ?? APP_SIGNUP_URL}
                className={cn(
                  buttonVariants({ variant: tier.ctaVariant }),
                  "mb-6 h-11 w-full min-w-0 rounded-full px-4 text-[0.8125rem] sm:text-sm"
                )}
                data-ph-signup-cta={tier.ctaHref ? undefined : true}
                data-ph-capture-attribute-section="pricing_plan"
                data-ph-capture-attribute-action="pricing_cta"
                data-ph-capture-attribute-destination={
                  tier.ctaHref ?? APP_SIGNUP_URL
                }
                data-ph-capture-attribute-plan={tier.name}
                data-ph-capture-attribute-billing-interval={billingInterval}
                data-ph-capture-attribute-label={tier.cta[billingInterval]}
              >
                <span className="min-w-0">{tier.cta[billingInterval]}</span>
                <ArrowRight className="size-4 shrink-0 transition-transform duration-200 ease-(--ease-out) group-hover/button:translate-x-0.5" />
              </a>

              {/* Key highlights only */}
              <div className="flex-1 border-t border-border/50 pt-5">
                <ul className="flex flex-col gap-2.5">
                  {tier.highlights.map((item) => {
                    const label = typeof item === "string" ? item : item.label
                    const sublabel =
                      typeof item === "string" ? null : item.sublabel
                    return (
                      <li
                        key={label}
                        className="flex items-start gap-2.5 text-sm"
                      >
                        <Check
                          className="mt-0.5 size-3.5 shrink-0 text-foreground/60"
                          aria-hidden="true"
                        />
                        <span>
                          {label}
                          {sublabel ? (
                            <span className="block text-muted-foreground">
                              {sublabel}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature comparison table ── */}
      <section className="bg-background" id="compare">
        <div className="mx-auto max-w-5xl px-6 pt-10 pb-12 md:pt-12 md:pb-14 lg:pt-14 lg:pb-16">
          <h2 className="mb-4 text-center font-heading text-2xl leading-tight font-medium tracking-[-0.04em] md:text-3xl">
            {copy.compareHeading}
          </h2>
          <p className="mx-auto mb-12 max-w-lg text-center text-sm leading-relaxed text-muted-foreground">
            {copy.compareIntro}
          </p>

          <div
            className="overflow-x-auto"
            role="region"
            aria-label={copy.tableLabel}
            tabIndex={0}
          >
            <table className="w-full min-w-[860px] text-sm">
              <caption className="sr-only">{copy.caption}</caption>
              {/* Sticky header */}
              <thead>
                <tr className="border-b border-border/60">
                  <th
                    scope="col"
                    className="py-4 pr-8 text-left text-xs font-medium text-muted-foreground"
                  >
                    {copy.feature}
                  </th>
                  <th
                    scope="col"
                    className="w-[150px] px-4 py-4 text-center font-heading text-base font-medium tracking-[-0.03em] text-foreground"
                  >
                    Free
                  </th>
                  <th
                    scope="col"
                    className="w-[150px] px-4 py-4 text-center font-heading text-base font-medium tracking-[-0.03em] text-foreground"
                  >
                    Starter
                  </th>
                  <th
                    scope="col"
                    className="w-[150px] rounded-t-xl bg-muted/60 px-4 py-4 text-center font-heading text-base font-medium tracking-[-0.03em] text-foreground"
                  >
                    Pro
                  </th>
                  <th
                    scope="col"
                    className="w-[150px] px-4 py-4 text-center font-heading text-base font-medium tracking-[-0.03em] text-foreground"
                  >
                    Enterprise
                  </th>
                </tr>
              </thead>

              <tbody>
                {localizedComparisonGroups.map((group) => (
                  <Fragment key={group.category}>
                    {/* Category header row */}
                    <tr>
                      <td
                        colSpan={5}
                        className="pt-8 pb-3 text-xs font-medium tracking-wide text-muted-foreground"
                      >
                        {group.category}
                      </td>
                    </tr>

                    {/* Feature rows */}
                    {group.rows.map((row) => (
                      <tr
                        key={row.feature}
                        className="border-b border-border/40 last:border-0"
                      >
                        <th
                          scope="row"
                          className="py-3 pr-8 text-left font-medium text-foreground"
                        >
                          {row.feature}
                        </th>
                        {(
                          [
                            row.free,
                            row.starter ?? row.pro,
                            row.pro,
                            row.enterprise,
                          ] as ComparisonValue[]
                        ).map((value, i) => (
                          <td
                            key={i}
                            className={cn(
                              "px-4 py-3 text-center",
                              i === 2 && "bg-muted/60"
                            )}
                          >
                            <ComparisonCell
                              includedLabel={copy.included}
                              notIncludedLabel={copy.notIncluded}
                              value={value}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  )
}
