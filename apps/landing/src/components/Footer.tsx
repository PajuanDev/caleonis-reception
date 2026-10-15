import { Separator } from "@/components/ui/separator"
import { localizePath, type Locale } from "@/i18n"
export function Footer({ locale = "fr" }: { locale?: Locale }) {
  const sections =
    locale === "fr"
      ? [
          [
            "Produit",
            [
              ["Fonctionnalités", "/features/"],
              ["Solutions", "/solutions/"],
              ["Tarifs sur demande", "/pricing/"],
            ],
          ],
          [
            "Ressources",
            [
              ["Aide et limites du pilote", "/resources/"],
              ["Centre d’aide", "/aide/"],
              ["Confidentialité SaaS et Google — projet", "/confidentialite/"],
              ["Conditions — en préparation", "/terms/"],
            ],
          ],
        ]
      : [
          [
            "Product",
            [
              ["Features", "/features/"],
              ["Solutions", "/solutions/"],
              ["Pricing on request", "/pricing/"],
            ],
          ],
          [
            "Resources",
            [
              ["Pilot help and limitations", "/resources/"],
              ["Help centre (French)", "/aide/"],
              ["Privacy — under review", "/privacy/"],
              ["Terms — under review", "/terms/"],
            ],
          ],
        ]
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-7xl px-6 pt-16">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <a href={localizePath(locale, "/")}>
              <img
                src="/caleonis-logo.svg"
                width="220"
                height="40"
                alt="Caléonis Receptionist"
                className="h-8 w-auto"
              />
            </a>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {locale === "fr"
                ? "Marque de service exploitée par William Fabrice Gosse, entrepreneur individuel, sous le nom commercial MrManiac."
                : "A service brand operated by William Fabrice Gosse, sole proprietor, under the MrManiac trade name."}
            </p>
          </div>
          {sections.map(([title, links]) => (
            <div key={String(title)}>
              <p className="mb-4 text-xs font-semibold text-muted-foreground">
                {String(title)}
              </p>
              <ul className="space-y-3">
                {(links as string[][]).map(([label, path]) => (
                  <li key={path}>
                    <a
                      className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                      href={
                        path === "/aide/" ? path : localizePath(locale, path)
                      }
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Separator className="my-8" />
        <div className="flex flex-col gap-4 pb-8 text-xs leading-relaxed text-muted-foreground md:flex-row md:justify-between">
          <p>
            © {new Date().getFullYear()} Caléonis Receptionist · MrManiac
            <br />
            {locale === "fr"
              ? "Socle LobbyStack sous licence MIT, copyright LobbyStack contributors conservé."
              : "Built on LobbyStack under the MIT license; LobbyStack contributors copyright retained."}{" "}
            <a
              href="/third-party-notices.txt"
              className="underline underline-offset-4"
            >
              {locale === "fr"
                ? "Attribution et licence"
                : "Attribution and license"}
            </a>
          </p>
          <button
            type="button"
            data-cookie-preferences-trigger
            className="self-start underline underline-offset-4"
          >
            {locale === "fr" ? "Préférences cookies" : "Cookie preferences"}
          </button>
        </div>
      </div>
    </footer>
  )
}
