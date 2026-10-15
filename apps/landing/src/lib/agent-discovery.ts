import { createHash } from "node:crypto"
import { absoluteUrl, SITE_URL } from "@/lib/seo"
export const CONTENT_SIGNAL = "ai-train=no, search=yes, ai-input=yes"
export const AGENT_LINKS = ['</llms.txt>; rel="describedby"; type="text/plain"']
export const AGENT_LINK_HEADER = AGENT_LINKS.join(", ")
export const DISCOVERY_API_ANCHOR = absoluteUrl("/api")
export const markdownAlternatePath = (pathname: string) => {
  const map: Record<string, string> = {
    "/": "/index.md",
    "/features/": "/features.md",
    "/pricing/": "/pricing.md",
    "/fr/": "/fr/index.md",
    "/fr/features/": "/fr/features.md",
    "/fr/pricing/": "/fr/pricing.md",
  }
  return map[pathname.endsWith("/") ? pathname : `${pathname}/`]
}
export const apiCatalog = {
  linkset: [
    {
      anchor: DISCOVERY_API_ANCHOR,
      "service-desc": [
        {
          href: absoluteUrl("/openapi.json"),
          type: "application/vnd.oai.openapi+json",
          title: "Caléonis preview metadata — no operational SaaS API",
        },
      ],
    },
  ],
}
export const publicStatus = {
  status: "preview",
  service: "Caléonis Receptionist marketing preview",
  documentation: absoluteUrl("/fr/resources/"),
}
export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Caléonis Receptionist preview metadata",
    version: "1.0.0-preview",
    description:
      "Static marketing metadata only. This is not the operational SaaS API and does not expose calls, bookings, contacts or webhooks.",
  },
  servers: [{ url: SITE_URL }],
  paths: {
    "/api/status": {
      get: {
        summary: "Preview status",
        operationId: "getPreviewStatus",
        responses: { "200": { description: "Marketing preview status" } },
      },
    },
  },
}
export const mcpServerCard = {
  schemaVersion: "0.1.0",
  serverInfo: { name: "caleonis-preview", version: "1.0.0-preview" },
  capabilities: {
    tools: [],
    resources: [
      {
        uri: absoluteUrl("/llms.txt"),
        name: "Caléonis reviewed pilot scope",
        mimeType: "text/plain",
      },
    ],
    prompts: [],
  },
}
export const lobbystackDiscoverySkill = `# Caléonis Receptionist preview\n\nRead ${absoluteUrl("/llms.txt")} for the reviewed pilot scope. Prices and terms are on request. Do not infer operational API access or capabilities from the upstream LobbyStack source. Attribution: ${absoluteUrl("/third-party-notices.txt")}.`
export const agentSkillsIndex = {
  $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
  skills: [
    {
      name: "caleonis-preview",
      type: "skill-md",
      description: "Reviewed Caléonis pilot scope",
      url: absoluteUrl(
        "/.well-known/agent-skills/lobbystack-discovery/SKILL.md"
      ),
      digest: `sha256:${createHash("sha256").update(lobbystackDiscoverySkill).digest("hex")}`,
    },
  ],
}
export const homepageMarkdown =
  "# Caléonis Receptionist\n\nAssisted voice receptionist pilot. Pricing and conditions on request. Voice-only pilot, no SMS. Human transfer not advertised as enabled. No established HDS qualification."
export const featuresMarkdown = homepageMarkdown
export const pricingMarkdown =
  "# Caléonis Receptionist pricing\n\nPricing, limits and pilot terms are on request. No paid subscription or public quota is offered in this preview."
export const affiliateProgramMarkdown = (locale: "en" | "fr") =>
  locale === "fr"
    ? "# Caléonis Receptionist\n\nAucun programme d’affiliation n’est proposé dans cette prévisualisation."
    : "# Caléonis Receptionist\n\nNo affiliate programme is offered in this preview."
export const calculatorMarkdown =
  "# Caléonis Receptionist\n\nThe inherited calculator remains under review. No revenue or savings guarantee is offered."
