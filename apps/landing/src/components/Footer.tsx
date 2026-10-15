import { GithubIcon } from "@/components/GithubIcon"
import { Separator } from "@/components/ui/separator"
import { localizeHref, localizePath, type Locale } from "@/lib/i18n"

const footerCopy = {
  en: {
    product: "Product",
    features: "Features",
    howItWorks: "How it Works",
    pricing: "Pricing",
    resources: "Resources",
    helpCenter: "Help Center",
    blog: "Blog",
    calculator: "Missed Call Calculator",
    affiliateProgram: "Affiliate Program",
    company: "Company",
    about: "About",
    contact: "Contact",
    privacy: "Privacy Policy",
    cookiePolicy: "Cookie Policy",
    terms: "Terms of Service",
    rights: "All rights reserved.",
    privacyShort: "Privacy",
    cookiePolicyShort: "Cookie Policy",
    termsShort: "Terms",
    cookiePreferences: "Cookie preferences",
  },
  fr: {
    product: "Produit",
    features: "Fonctionnalités",
    howItWorks: "Fonctionnement",
    pricing: "Tarifs",
    resources: "Ressources",
    helpCenter: "Centre d'aide",
    blog: "Blog",
    calculator: "Calculateur d'appels manqués",
    affiliateProgram: "Programme d'affiliation",
    company: "Entreprise",
    about: "À propos",
    contact: "Contact",
    privacy: "Politique de confidentialité",
    cookiePolicy: "Politique relative aux cookies",
    terms: "Conditions d'utilisation",
    rights: "Tous droits réservés.",
    privacyShort: "Confidentialité",
    cookiePolicyShort: "Cookies",
    termsShort: "Conditions",
    cookiePreferences: "Préférences cookies",
  },
} satisfies Record<Locale, Record<string, string>>

const footerSections = (locale: Locale) => {
  const copy = footerCopy[locale]

  return [
    {
      title: copy.product,
      links: [
        { label: copy.features, href: "/features/" },
        { label: copy.howItWorks, href: "/#how-it-works" },
        { label: copy.pricing, href: "/pricing/" },
      ],
    },
    {
      title: copy.resources,
      links: [
        {
          label: copy.helpCenter,
          href: locale === "fr" ? "/aide/" : "/aide/en/",
        },
        { label: copy.blog, href: "/blog/" },
        {
          label: copy.calculator,
          href: "/missed-call-revenue-calculator/",
        },
        {
          label: copy.affiliateProgram,
          href: "/affiliate-program/",
        },
        {
          label: locale === "fr" ? "Source d’origine MIT" : "Upstream MIT source",
          href: "https://gitlab.com/lobbystack-group/lobbystack",
        },
      ],
    },
    {
      title: copy.company,
      links: [
        { label: copy.about, href: "/about/" },
        { label: copy.contact, href: "mailto:contact@caleonis.com" },
        { label: copy.privacy, href: "/privacy/" },
        { label: copy.cookiePolicy, href: "/cookie-policy/" },
        { label: copy.terms, href: "/terms/" },
      ],
    },
  ]
}

type FooterProps = {
  locale?: Locale
}

export function Footer({ locale = "en" }: FooterProps) {
  const copy = footerCopy[locale]

  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-7xl px-6 pt-16">
        <div className="mb-12 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <a
            href={localizePath(locale, "/")}
            className="flex items-center rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <img
              src="/caleonis-logo.svg"
              alt="Caléonis Receptionist"
              width={155}
              height={43}
              decoding="async"
              className="h-7 w-auto"
            />
          </a>

          <div className="flex items-center gap-4">
            <a
              href="https://gitlab.com/lobbystack-group/lobbystack"
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label={locale === "fr" ? "Source d’origine MIT" : "Upstream MIT source"}
              data-ph-capture-attribute-section="footer_social"
              data-ph-capture-attribute-action="view_github"
              data-ph-capture-attribute-destination="https://gitlab.com/lobbystack-group/lobbystack"
            >
              <GithubIcon className="size-5" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {footerSections(locale).map((section) => (
            <div key={section.title}>
              <p className="mb-4 text-xs font-semibold text-muted-foreground">
                {section.title}
              </p>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={localizeHref(locale, link.href)}
                      data-ph-capture-attribute-section="footer"
                      data-ph-capture-attribute-action="navigate"
                      data-ph-capture-attribute-destination={link.href}
                      data-ph-capture-attribute-label={link.label}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-8" />

      <div className="mx-auto max-w-7xl px-6 pb-8">
        <div className="flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground md:flex-row">
          <p>
            © {new Date().getFullYear()} Caléonis Receptionist. {copy.rights}
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <button
              type="button"
              data-cookie-preferences-trigger
              className="hover:text-foreground"
            >
              {copy.cookiePreferences}
            </button>
            <a
              href={localizePath(locale, "/privacy/")}
              className="hover:text-foreground"
            >
              {copy.privacyShort}
            </a>
            <a
              href={localizePath(locale, "/cookie-policy/")}
              className="hover:text-foreground"
            >
              {copy.cookiePolicyShort}
            </a>
            <a
              href={localizePath(locale, "/terms/")}
              className="hover:text-foreground"
            >
              {copy.termsShort}
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
