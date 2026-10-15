# Caléonis Receptionist — marketing preview review

Base: isolated P1 branch from production e8e23bae. No application, worker, database, Railway source, DNS, payments or production deployment is changed by this landing pass.

## Reviewed and implemented

- French and English home, features, pricing on request, solutions index and resources.
- Five business workflows in both languages: tradespeople, plumbers, electricians, auto repair shops and medical-office administrative evaluation.
- Shared Astro layout, existing Geist/Tailwind/shadcn design tokens, hero/features/workflow/FAQ/CTA composition and responsive navigation retained and adapted.
- One receptionist per business; no channels category, multi-agent product, Agent Builder or V2 channel offering.
- Every trial CTA targets `https://receptionist.caleonis.com/fr/essai`; login targets the Caléonis application.
- Voice-only explicitly distinguished from SMS; human transfer is not marketed as enabled. Notifications, API, teams, forwarding and other account capabilities require separate verification.
- Medical pages explicitly prohibit real health-data workflows until suitability is established. No HDS, diagnosis, clinical triage or emergency-handling claim.
- Prices, quotas and plans remain on request. No free minutes, paid plans, revenue guarantees, active affiliation or payment collection advertised.
- `/fr/confidentialite/` contains a draft waiting notice only, with operator identity. It is linked from the home and footer and does not claim to provide a final Google OAuth privacy policy.
- Operator: William Fabrice Gosse, sole proprietor trading as MrManiac. Caléonis Receptionist is a service brand, not an asserted incorporated company.

## Inherited surfaces held back

The upstream long-tail solution, blog, comparison, affiliate, calculator, changelog, API marketing and legal files remain in source. Unreviewed HTML is rendered through a shared review notice, is noindex and is excluded from the reviewed-route sitemap. Inherited blog bodies are excluded from generated article routes, RSS and schema endpoints. Markdown and discovery endpoints expose reviewed pilot limits rather than inherited prices or operational API promises. The former marketing WebMCP script is disabled.

This is not a claim that the entire inherited editorial library has been rebranded and fact-checked. Individual long-tail pages must be reviewed before adding them to `reviewedPaths`.

## Hosting, SEO and tracking

- Dedicated private preview origin: `https://caleonis-receptionist-v1-review.willgosse225.chatgpt.site`, overridable with `PUBLIC_SITE_URL` before build. This is not a final marketing domain decision.
- All HTML is noindex; robots disallows crawling and static host headers also request noindex. Canonical and reciprocal FR/EN hreflang are generated for reviewed pages.
- Sitemap contains only reviewed core/solution routes and acts as a private preview route manifest. The full help export at `/aide/` is attached by the root delivery process after the landing build; the source includes a working resources fallback.
- Structured data identifies the correct operator and does not contain a paid or free offer. Social images are generated for reviewed pages with Caléonis branding.
- No IndexNow submission from this preview. PostHog requires the existing explicit enable flag and project key; its default host no longer points at LobbyStack's collector. No provider was configured by this pass.
- Live voice demonstration to the production application is not embedded in marketing preview. The trial opens in the application.

## Assets and attribution

The MIT license and `Copyright (c) 2026 LobbyStack contributors` are retained in the repository and `/third-party-notices.txt`. The Caléonis logo is taken from the user's existing corporate source at `audit-twilio/vercel-corporate-source/brand-assets/caleonis-logo-on-light.svg`, with a Receptionist text suffix. Its provenance is recorded; final campaign rights review remains with the operator. Upstream illustrations, third-party logos and product screenshots are retained in source but are not used on the reviewed pages. The Features page includes real French desktop/mobile Messages captures from the isolated browser fixture on `207dc2c`, explicitly labelled synthetic data. Their source, dimensions and SHA256 hashes are recorded in `docs/p1/screenshots.json`. No fabricated product screenshot is included.

## Validation

- Landing unit suite: 85 tests passed across 14 files. Assertions now verify the approved trial domain, reviewed discovery scope, absent commercial offers, operator identity, medical limitation and Voice-only distinction.
- `astro check`: 240 files, 0 errors, 0 warnings, 0 hints.
- Landing lint passed.
- Static build: 74 HTML pages including review notices; Astro H1, links, alt text and metadata length checks passed. Duplicate metadata on generic noindex review notices is expected.
- Final sitemap/link/SEO validation and full help export are run before delivery; root performs independent desktop/mobile browser QA and preview publication.

## Launch decisions still required

Final legal/privacy text including Google connection disclosures; approved pricing and quotas; final marketing/help domain; supported capabilities per account; recording information and retention policy; verification of production changes with P0; final brand and third-party rights review. Real PSTN calls, bookings, transfers, SMS, emails and payments are not exercised by this marketing build.
