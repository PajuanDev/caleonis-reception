import { createMarkdownEndpoint } from "@jdevalk/astro-seo-graph"
import { blogCanonicalSlug, getBlogPosts } from "@/lib/blog"
import { absoluteUrl } from "@/lib/seo"

export const getStaticPaths = async () => {
  const posts = await getBlogPosts("fr")

  return posts.map((post) => ({
    params: { slug: blogCanonicalSlug(post) },
  }))
}

export const GET = createMarkdownEndpoint({
  entries: () => getBlogPosts("fr"),
  cacheControl: "public, max-age=3600",
  mapper: (post, slug) =>
    blogCanonicalSlug(post) !== slug
      ? null
      : {
          frontmatter: {
            title: post.data.title,
            canonical: absoluteUrl(`/fr/blog/${blogCanonicalSlug(post)}/`),
            pubDate: post.data.pubDate,
            author: post.data.author,
            description: post.data.description,
            categories: post.data.category ? [post.data.category] : undefined,
          },
          body:
            "Editorial archive from the MIT-licensed LobbyStack source. Source prices, capabilities and legal references are historical, not an activated Caléonis offer. French pilot: Voice-only, no SMS; human transfers unqualified; no real health-data use.\n\n" +
            (post.body ?? ""),
        },
})
