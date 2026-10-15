import { describe, expect, it } from "vitest"
import { isReviewedPath, launchCopy, launchSolutions } from "./launch-content"
import {
  organizationJsonLd,
  productJsonLd,
  softwareApplicationJsonLd,
} from "./seo"
describe("Caléonis launch claims", () => {
  it.each([
    "/blog/",
    "/fr/terms/",
    "/affiliate-program/",
    "/fr/solutions/ai-receptionist-for-dental-offices/",
  ])(
    "keeps inherited or legal content out of reviewed publication: %s",
    (path) => {
      expect(isReviewedPath(path)).toBe(false)
    }
  )
  it("includes the requested businesses and states the health-data restriction", () => {
    const medical = launchSolutions.find(
      (item) => item.slug === "ai-receptionist-for-medical-offices"
    )!
    expect(medical.frBoundary).toContain("Qualification HDS non établie")
    expect(medical.frBoundary).toContain("données fictives uniquement")
    expect(
      launchSolutions.some(
        (item) => item.slug === "ai-receptionist-for-garages"
      )
    ).toBe(true)
    expect(isReviewedPath("/fr/solutions/ai-receptionist-for-plumbers/")).toBe(
      true
    )
  })
  it("does not turn the pilot into public free or paid offers in structured data", () => {
    for (const data of [productJsonLd(), softwareApplicationJsonLd()]) {
      expect(data).not.toHaveProperty("offers")
      expect(data).not.toHaveProperty("isAccessibleForFree")
    }
    const operator = organizationJsonLd()
    expect(operator.legalName).toBe("William Fabrice Gosse")
    expect(operator.alternateName).toBe("MrManiac")
  })
  it("keeps the SMS limitation explicit in both languages", () => {
    expect(launchCopy.fr.faqs[0].answer).toContain("Voice-only")
    expect(launchCopy.en.faqs[0].answer).toContain("Voice-only")
  })
})
