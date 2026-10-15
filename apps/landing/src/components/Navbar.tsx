import { Menu, X, ChevronDown, ArrowRight } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { APP_LOGIN_URL, APP_SIGNUP_URL } from "@/lib/app-links"
import { launchCopy, launchSolutions } from "@/lib/launch-content"
import { localizePath, type Locale } from "@/i18n"
import { cn } from "@/lib/utils"
export function Navbar({ locale = "fr" }: { locale?: Locale }) {
  const copy = launchCopy[locale]
  const links = [
    {
      path: "/features/",
      label: locale === "fr" ? "Fonctionnalités" : "Features",
    },
    { path: "/pricing/", label: locale === "fr" ? "Tarifs" : "Pricing" },
    {
      path: "/resources/",
      label: locale === "fr" ? "Ressources" : "Resources",
    },
  ]
  return (
    <header className="site-header sticky top-0 z-50 w-full border-b border-border/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
        <a
          href={localizePath(locale, "/")}
          className="flex min-w-0 items-center rounded-md focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img
            src="/caleonis-logo.svg"
            width="220"
            height="40"
            alt="Caléonis Receptionist"
            className="h-8 w-auto max-w-52"
          />
        </a>
        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label={
            locale === "fr" ? "Navigation principale" : "Main navigation"
          }
        >
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
              Solutions
              <ChevronDown className="size-4" aria-hidden="true" />
            </summary>
            <div className="nav-popover absolute top-full left-0 min-w-64 rounded-xl border border-border bg-popover p-2 shadow-lg">
              <a
                className="block rounded-md px-3 py-3 text-sm hover:bg-muted"
                href={localizePath(locale, "/solutions/")}
              >
                {locale === "fr" ? "Tous les métiers" : "All industries"}
              </a>
              {launchSolutions.map((item) => (
                <a
                  key={item.slug}
                  className="block rounded-md px-3 py-3 text-sm hover:bg-muted"
                  href={localizePath(locale, `/solutions/${item.slug}/`)}
                >
                  {item[locale]}
                </a>
              ))}
            </div>
          </details>
          {links.map((item) => (
            <a
              key={item.path}
              className="rounded-full px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              href={localizePath(locale, item.path)}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <a
            className="rounded-md px-2 py-2 text-sm hover:underline"
            href={locale === "fr" ? "/" : "/fr/"}
            lang={locale === "fr" ? "en" : "fr"}
            aria-label={
              locale === "fr" ? "English version" : "Version française"
            }
          >
            {locale === "fr" ? "EN" : "FR"}
          </a>
          <a
            href={APP_LOGIN_URL}
            className="rounded-full px-3 py-2 text-sm hover:bg-muted"
          >
            {copy.login}
          </a>
          <a
            href={APP_SIGNUP_URL}
            className={cn(buttonVariants(), "rounded-full")}
            data-ph-signup-cta
          >
            {copy.cta}
          </a>
        </div>
        <details className="group/mobile lg:hidden">
          <summary
            className="flex size-11 cursor-pointer list-none items-center justify-center rounded-md focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={
              locale === "fr" ? "Menu de navigation" : "Navigation menu"
            }
          >
            <Menu
              className="size-5 group-open/mobile:hidden"
              aria-hidden="true"
            />
            <X
              className="hidden size-5 group-open/mobile:block"
              aria-hidden="true"
            />
          </summary>
          <nav
            className="mobile-menu-sheet fixed inset-x-0 top-16 max-h-[calc(100svh-4rem)] overflow-y-auto border-t border-border bg-background p-6 shadow-lg"
            aria-label={
              locale === "fr" ? "Navigation mobile" : "Mobile navigation"
            }
          >
            <a
              className="block rounded-md px-3 py-3 font-medium hover:bg-muted"
              href={localizePath(locale, "/solutions/")}
            >
              Solutions
            </a>
            {launchSolutions.map((item) => (
              <a
                key={item.slug}
                className="block rounded-md px-6 py-3 text-sm hover:bg-muted"
                href={localizePath(locale, `/solutions/${item.slug}/`)}
              >
                {item[locale]}
              </a>
            ))}
            {links.map((item) => (
              <a
                key={item.path}
                className="block rounded-md px-3 py-3 font-medium hover:bg-muted"
                href={localizePath(locale, item.path)}
              >
                {item.label}
              </a>
            ))}
            <a
              className="block px-3 py-3"
              href={locale === "fr" ? "/" : "/fr/"}
            >
              {locale === "fr" ? "English" : "Français"}
            </a>
            <a
              href={APP_LOGIN_URL}
              className="mt-4 block rounded-full border border-border px-4 py-3 text-center"
            >
              {copy.login}
            </a>
            <a
              href={APP_SIGNUP_URL}
              className={cn(buttonVariants(), "mt-3 flex rounded-full")}
              data-ph-signup-cta
            >
              {copy.cta}
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </a>
          </nav>
        </details>
      </div>
    </header>
  )
}
