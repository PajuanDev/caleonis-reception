import { renderMarkdownAlternate } from "@jdevalk/astro-seo-graph"
import { CONTENT_SIGNAL } from "@/lib/agent-discovery"

export const markdownResponse = ({
  markdown,
  canonical,
  title,
  description,
}: {
  markdown: string
  canonical: string
  title: string
  description: string
}) => {
  const locale = new URL(canonical).pathname.startsWith("/fr/") ? "fr" : "en"
  const safeCopy =
    locale === "fr"
      ? "# Caléonis Receptionist\n\nPilote accompagné : accueil vocal, suivi des appels et Google Calendar selon configuration. Tarifs et conditions sur demande. Numéro pilote Voice-only sans SMS ; transfert humain non présenté comme activé. Aucune qualification HDS établie. Les ressources héritées et conditions juridiques sont en cours de relecture.\n\n[Aide et limites](/fr/resources/) · [Fonctionnalités](/fr/features/) · [Demander un essai](https://receptionist.caleonis.com/signup)"
      : "# Caléonis Receptionist\n\nAssisted pilot: voice reception, call history and Google Calendar according to configuration. Pricing and terms on request. Voice-only pilot without SMS; human transfer is not advertised as enabled. HDS qualification is not established. Inherited resources and legal terms remain under review.\n\n[Help and limitations](/resources/) · [Features](/features/) · [Request a trial](https://receptionist.caleonis.com/signup)"
  const rendered = renderMarkdownAlternate({
    frontmatter: {
      title,
      description,
      canonical,
    },
    body: `${safeCopy}\n\n---\n\n${markdown}`,
  })

  return new Response(rendered.markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Content-Signal": CONTENT_SIGNAL,
      "X-Robots-Tag": "noindex, follow",
      "X-Markdown-Tokens": String(rendered.tokenCount),
      Link: `<${rendered.canonicalHref}>; rel="canonical"`,
    },
  })
}
