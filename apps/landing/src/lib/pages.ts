import { getRouteSeo, localeFromPath, localizePath } from "@/i18n"
import { qualifyPilotMetadata } from "@/lib/pilot-qualification"
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  absoluteUrl,
  ogImagePath,
} from "@/lib/seo"
import { seoLandingPages } from "@/lib/seo-landing-pages"

export type PublicPage = {
  path: string
  title: string
  description: string
  markdown?: string
}

const basePublicPages: PublicPage[] = [
  {
    path: "/",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    markdown: "/index.md",
  },
  {
    path: "/features/",
    title: "AI Receptionist Features for Calls, Booking, and Alerts",
    description:
      "Explore Caléonis Receptionist AI receptionist features for phone answering, appointment booking, call transfers, lead qualification, owner alerts, and call summaries.",
    markdown: "/features.md",
  },
  {
    path: "/pricing/",
    title: "AI Receptionist Pricing for Small Businesses",
    description:
      "Compare Caléonis Receptionist AI receptionist pricing for Free, Starter, Pro, and Enterprise plans, including voice minutes, annual billing, SMS alerts, and overage rates.",
    markdown: "/pricing.md",
  },
  {
    path: "/blog/",
    title: "AI Receptionist Blog and Product Updates",
    description:
      "Read Caléonis Receptionist product updates and practical guides about AI receptionists, phone answering, appointment booking, and small-business call automation.",
    markdown: "/blog.md",
  },
  {
    path: "/changelog/",
    title: "Caléonis Receptionist Changelog",
    description:
      "Follow Caléonis Receptionist product updates, new AI receptionist features, integrations, and improvements for small businesses.",
    markdown: "/changelog.md",
  },
  {
    path: "/docs/api/",
    title: "Caléonis Receptionist Public API Documentation",
    description:
      "Machine-readable discovery resources for agents and integrators visiting Caléonis Receptionist.",
    markdown: "/docs/api.md",
  },
  {
    path: "/missed-call-revenue-calculator/",
    title: "Missed Call Revenue Calculator for Contractors",
    description:
      "Estimate weekly, monthly, and annual revenue at risk from missed contractor calls and see how much a 24/7 AI receptionist could recover.",
    markdown: "/missed-call-revenue-calculator/index.md",
  },
  // Add all SEO landing pages (company and solution) from the data file
  ...seoLandingPages.map((page) => ({
    path: page.path,
    title: page.title,
    description: page.description,
    markdown: `${page.path.slice(0, -1)}.md`,
  })),
]

export const publicPages: PublicPage[] = basePublicPages.flatMap((page) => [
  page,
  {
    ...page,
    path: localizePath("fr", page.path),
    ...getRouteSeo({ locale: "fr", path: page.path }),
  },
])

export const pageByPath = (path: string) =>
  publicPages.find((page) => page.path === path)

export const ogEntries = publicPages.map((page) => ({
  slug: page.path === "/" ? "index" : page.path.replace(/^\/|\/$/g, ""),
  title: page.title,
  description: qualifyPilotMetadata(page.description, localeFromPath(page.path), page.title),
  canonical: absoluteUrl(page.path),
  image: ogImagePath(page.path),
}))
