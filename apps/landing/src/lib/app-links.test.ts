import { describe, expect, it } from "vitest"
import { buildSignupUrl } from "./app-links"

describe("calculator signup links", () => {
  it.each(["en", "fr"] as const)("routes %s visitors to the approved French trial and preserves source", (locale) => {
    const url = new URL(buildSignupUrl(locale, "calculator"))
    expect(url.origin).toBe("https://receptionist.caleonis.com")
    expect(url.pathname).toBe("/fr/essai")
    expect(url.searchParams.get("source")).toBe("calculator")
  })
})
