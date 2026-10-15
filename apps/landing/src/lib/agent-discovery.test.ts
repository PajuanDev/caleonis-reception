import { describe, expect, it } from "vitest"
import {
  featuresMarkdown,
  pricingMarkdown,
  markdownAlternatePath,
  mcpServerCard,
  openApiDocument,
} from "./agent-discovery"
describe("private preview discovery", () => {
  it("advertises reviewed Markdown routes only", () => {
    expect(markdownAlternatePath("/fr/features/")).toBe("/fr/features.md")
    expect(markdownAlternatePath("/pricing/")).toBe("/pricing.md")
    expect(markdownAlternatePath("/about/")).toBeUndefined()
    expect(
      markdownAlternatePath("/blog/ai-receptionist-savings/")
    ).toBeUndefined()
  })
  it("does not publish inherited plans or unsupported capabilities", () => {
    expect(pricingMarkdown).toContain("on request")
    expect(featuresMarkdown).toContain("Voice-only")
    expect(featuresMarkdown).toContain("no SMS")
    expect(featuresMarkdown).toContain(
      "Human transfer not advertised as enabled"
    )
    expect(featuresMarkdown).toContain("No established HDS qualification")
    expect(featuresMarkdown + pricingMarkdown).not.toMatch(
      /\$30|\$100|30 browser voice minutes|unlimited concurrent/
    )
  })
  it("does not advertise an operational SaaS API or WebMCP tools", () => {
    expect(mcpServerCard.capabilities.tools).toHaveLength(0)
    expect(Object.keys(openApiDocument.paths)).toEqual(["/api/status"])
    expect(openApiDocument.info.description).toContain(
      "not the operational SaaS API"
    )
  })
})
