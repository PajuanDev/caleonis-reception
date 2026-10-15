import { launchSeo, reviewedPaths } from "@/lib/launch-content"
import { absoluteUrl, ogImagePath } from "@/lib/seo"
export type PublicPage = {
  path: string
  title: string
  description: string
  markdown?: string
}
export const publicPages: PublicPage[] = [...reviewedPaths]
  .filter((path) => path !== "/aide/")
  .flatMap((path) =>
    ["fr", "en"].map((locale) => {
      const localizedPath =
        locale === "fr" ? (path === "/" ? "/fr/" : `/fr${path}`) : path
      return { path: localizedPath, ...launchSeo(locale as "fr" | "en", path) }
    })
  )
export const pageByPath = (path: string) =>
  publicPages.find((page) => page.path === path)
export const ogEntries = publicPages.map((page) => ({
  slug: page.path === "/" ? "index" : page.path.replace(/^\/|\/$/g, ""),
  title: page.title,
  description: page.description,
  canonical: absoluteUrl(page.path),
  image: ogImagePath(page.path),
}))
