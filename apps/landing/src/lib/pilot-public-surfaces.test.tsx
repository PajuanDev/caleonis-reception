import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { IncludedOnEveryPlan } from "@/components/features/IncludedOnEveryPlan"
import { FeatureGrid } from "@/components/FeatureGrid"
import { LandingPageAdditions, ProductExtensionSection } from "@/components/LandingPageAdditions"
import { CtaSection } from "@/components/CtaSection"
import { PricingSection } from "@/components/PricingSection"
import { Hero as PhoneHero } from "@/components/solutions/ai-phone-answering/SectionsPart1"
import { Hero as SchedulerHero } from "@/components/solutions/ai-appointment-scheduler/SectionsPart1"
import { getHomeFaqs } from "./home-faqs"
import { launchCopy } from "./launch-content"
import { ogEntries } from "./pages"
import { qualifyPilotPage, qualifyPilotMetadata, qualifyPilotText } from "./pilot-qualification"
import { seoLandingPageByPath } from "./seo-landing-pages"

const plain = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")

describe("public pilot claims at their actual rendering paths", () => {
  it.each(["fr", "en"] as const)("retains complete %s product copy inside an explicit target scope, without adding upstream implementation prose", (locale) => {
    const original = locale === "fr"
      ? "Caléonis Receptionist envoie des SMS et transfère les appels."
      : "Caléonis Receptionist sends SMS and transfers calls."
    const result = qualifyPilotText(original, locale)
    expect(result).toContain(original)
    expect(result).toMatch(/Fonction cible, non activée dans le pilote :|Target capability, not enabled in the pilot:/)
    expect(result).toMatch(/SMS indisponibles|SMS is unavailable/)
    expect(result).toMatch(/Transfert humain à qualifier|Human transfer requires qualification/)
    expect(result).not.toMatch(/LobbyStack|source target|périmètre cible source|upstream foundation/i)
  })

  it.each(["fr", "en"] as const)("renders SMS as unavailable and transfers as pending in the %s inclusion grid", (locale) => {
    const html = renderToStaticMarkup(<IncludedOnEveryPlan locale={locale} />)
    const rows = [...html.matchAll(/<div[^>]+data-pilot-feature-state="([^"]+)"[^>]*>([\s\S]*?)<\/div>/g)]
    const sms = rows.filter((row) => /SMS|texts/i.test(plain(row[2]!)))
    const transfers = rows.filter((row) => /transf/i.test(plain(row[2]!)))
    expect(sms.length).toBeGreaterThanOrEqual(2)
    expect(sms.every((row) => row[1] === "unavailable")).toBe(true)
    expect(sms.every((row) => /Voice-only/.test(plain(row[2]!)))).toBe(true)
    expect(transfers.length).toBeGreaterThan(0)
    expect(transfers.every((row) => row[1] === "pending")).toBe(true)
  })

  it.each(["fr", "en"] as const)("renders the %s EUR catalogue with source-target retention, without an unlimited retention promise", (locale) => {
    const html = renderToStaticMarkup(<PricingSection locale={locale} />)
    const text = plain(html)
    expect(text).toMatch(/€30|30 €/)
    expect(text).toMatch(/€100|100 €/)
    expect(text).toContain("288")
    expect(text).toContain("960")
    expect(text).not.toMatch(/\$\d|\d\s*\$/)
    const row = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].find((match) => /Call history and recordings|Historique et enregistrements/.test(plain(match[1]!)))
    expect(row).toBeDefined()
    expect(plain(row![1]!)).toMatch(/30 (?:days|jours)/)
    expect(plain(row![1]!)).toMatch(/90 (?:days|jours)/)
    expect(plain(row![1]!)).not.toMatch(/unlimited|illimit/i)
    expect(plain(row![1]!)).toMatch(/pending|à valider/)
    const smsRow = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].find((match) => /Appointment confirmation texts|SMS de confirmation/.test(plain(match[1]!)))
    expect(smsRow).toBeDefined()
    expect(plain(smsRow![1]!)).toMatch(/Unavailable Voice-only|Indisponible Voice-only/)
    expect(plain(smsRow![1]!)).not.toMatch(/(?:^|\s)(?:Included|Inclus)(?:$|\s)/)

  })

  it.each(["fr", "en"] as const)("keeps the %s homepage FAQ prices as a draft, with no automatic Free or French-number entitlement", (locale) => {
    const answer = getHomeFaqs(locale).find((faq) => /coûte|cost/.test(faq.question))!.answer
    expect(answer).toMatch(/EUR|€/)
    expect(answer).toMatch(/draft|projet/)
    expect(answer).not.toMatch(/starts free|commence gratuitement|US or Canadian|américain ou canadien|\$\d|\d\s*\$/)
    expect(answer).toMatch(/No free entitlement|aucun droit gratuit/)
  })

  it("does not leave old Free CTAs or SMS promises in bespoke page heroes", () => {
    const text = plain(renderToStaticMarkup(<><PhoneHero /><SchedulerHero /></>))
    expect(text).not.toMatch(/Try for free|No credit card required|Sends confirmation texts|Transfers urgent calls/)
    expect(text).toContain("Voice-only")
    expect(text).toMatch(/Human transfers require qualification|direct transfers remain unqualified/)
  })

  it("does not advertise clinical triage, real health-data intake or certification in dental answers", () => {
    const source = seoLandingPageByPath("/solutions/ai-receptionist-for-dental-offices/")!
    const page = qualifyPilotPage(source, "en")
    expect(page.description).toContain("No real health-data use")
    const symptomAnswer = page.faqs.find((faq) => /emergency/.test(faq.question))!.answer
    expect(symptomAnswer).toContain("does not diagnose")
    expect(symptomAnswer).toContain("do not enable real health-data processing")
    expect(symptomAnswer).not.toContain("ask about pain level")
    const secureAnswer = page.faqs.find((faq) => /securely/.test(faq.question))!.answer
    expect(secureAnswer).toContain("No HIPAA compliance")
  })

  it("keeps the exact upstream copyright in the served resources FAQ", () => {
    expect(launchCopy.fr.faqs.at(-1)!.answer).toContain("LobbyStack contributors")
    expect(launchCopy.en.faqs.at(-1)!.answer).toContain("LobbyStack contributors")
  })

  it("qualifies SEO descriptions without copying a US-number or USD offer", () => {
    const description = qualifyPilotMetadata("A free plan with a US or Canadian number, transfers and SMS from $30.", "en", "Phone reception")
    expect(description).toContain("Draft EUR catalogue")
    expect(description).not.toMatch(/\$|US or Canadian|free plan/)
  })

  it("renders qualified bilingual descriptions inside the generated social images", () => {
    const english = ogEntries.find((entry) => entry.slug === "features")!.description
    const french = ogEntries.find((entry) => entry.slug === "fr/features")!.description
    expect(english).toContain("Draft EUR catalogue")
    expect(english).toContain("transfers require qualification")
    expect(french).toContain("Catalogue EUR en projet")
    expect(french).toContain("SMS indisponibles Voice-only")
    expect([english, french].join(" ")).not.toMatch(/\$|US or Canadian|free plan|forfait gratuit/)
  })

  it.each(["fr", "en"] as const)("keeps the %s homepage cards concise, with callbacks and internal booking instead of unsupported promises", (locale) => {
    const html = renderToStaticMarkup(<><FeatureGrid locale={locale} /><ProductExtensionSection locale={locale} /><LandingPageAdditions locale={locale} /><CtaSection locale={locale} /></>)
    const text = plain(html)
    expect(text).not.toMatch(/Référence du périmètre cible source|Source target reference|le socle source LobbyStack|the upstream LobbyStack foundation/)
    expect(text).not.toMatch(/Transfère quand|Transfers when needed|transfère l’appel|texts the caller|envoyez les informations de suivi|annulation possible|Cancel anytime/)
    expect(text).toMatch(/Prépare un rappel humain|Prepares a human callback/)
    expect(text).toContain("Google Calendar")
    expect(text).toContain("Voice-only")
    expect(text).toMatch(/transfert en direct reste à qualifier|Live transfer requires separate qualification/)
    expect(text).toMatch(/Conditions convenues avant activation|Pilot terms agreed before activation/)
    expect((html.match(/id="workflow"/g) ?? []).length).toBe(1)
    expect((html.match(/id="phone-tools"/g) ?? []).length).toBe(1)
  })
})
