# Livraison V1.1, V1.2 et V1.3

Base : `e8e23bae4955f64fa3f99cb525faad908439077e`, version admin/worker vérifiée en production le 15 octobre 2026. Branche isolée : `codex/receptionist-v1-parity-2026-10-15`, à empiler sur la branche de PR9. Aucun merge, déploiement Railway, migration, achat, appel, réservation, envoi ou changement DNS effectué par cette passe.

## Résultat consultable

- [Prévisualisation privée du site FR](https://caleonis-receptionist-v1-review.willgosse225.chatgpt.site/fr/).
- [Centre d'aide FR](https://caleonis-receptionist-v1-review.willgosse225.chatgpt.site/aide/).
- [Matrice de parité et Go/No-Go](parity-matrix.md).
- [Application et preuves ciblées](app-parity.md).
- [Adaptation des guides et limites des vérificateurs](docs-adaptation.md).
- [Relecture du site marketing](../../apps/landing/V1-LAUNCH-REVIEW.md).

L'aperçu contient le site et l'aide. Il ne déploie pas la version candidate du dashboard : les CTA ouvrent l'application existante. Il reste privé et noindex, avec les prix sur demande et une simple notice d'attente pour les textes juridiques non validés. Le site corporate n'a pas été remplacé. Le paquet statique est une copie du build vérifié ; le dépôt source du preview a pour commit `df533f234a1c270f606b6c0872207f2144dbfe6a`.

## Changements essentiels

Messages réapparaît toujours dans la sidebar d'origine. Une ligne Voice-only conserve l'inbox et affiche sa limite ; l'interface et l'API refusent l'envoi SMS sans numéro actif compatible. Les viewers restent en lecture seule, y compris sur les routes de réponse et de prise en charge humaine. Les brouillons survivent à un échec et aux changements de fil pendant un envoi.

Les surfaces tarifaires ne proposent plus les offres héritées lorsqu'aucun produit/intervalle commercial n'est configuré. L'affiliation est fermée par défaut, y compris les chemins d'attribution lors de la création d'espace et de l'onboarding. Les vrais comptes commerciaux conservent leur lecture de plan selon leurs permissions.

Le site réutilise Astro, ses composants et styles, avec les assets Caléonis présents dans le workspace. Accueil, fonctionnalités, tarifs, ressources et cinq métiers sont adaptés en FR/EN. Les contenus longs et textes hérités non relus restent dans les sources, mais leur sortie affiche une notice et ils sont exclus du sitemap de lancement. Les 51 guides couvrent 49 pages FR et deux synthèses EN ; documentation SaaS et développeur/self-host sont séparées. La licence MIT et le copyright LobbyStack contributors sont conservés. Les packages et moteurs internes n'ont pas été renommés.

## Qualification et reproduction

| Contrôle | Preuve locale |
| --- | --- |
| Tests ciblés application | 84 tests / 12 fichiers PASS après corrections des permissions et conditions commerciales |
| Lint application modifiée | 0 erreur ; trois avertissements hérités documentés dans le rapport app |
| Site | 85 tests PASS ; Astro check sans erreur, warning ou hint ; lint PASS ; 74 pages générées |
| SEO | 20 URLs de preview relues : canonical, hreflang, sitemap et noindex PASS |
| Aide native | Mintlify build validation PASS ; check:content PASS, 51 pages et 99 liens internes |
| Export site + aide | 125 HTML, 6 236 références locales, 137 cibles, aucune cible absente |
| Navigateur site + aide | 22 cas desktop 1440×1000 et mobile 390×844 PASS : menu, recherche d'aide, contrôles nommés, images et débordements |
| Types, lint et compilation globale | PASS dans la CI `f50075f`, y compris le build admin final, l'export de l'aide et ses liens |
| Tests globaux locaux | Lots interrompus pour laisser la fenêtre CPU à P0 ; un timeout worker sous charge et l'écart OpenAPI hérité ont été conservés dans les logs, sans les présenter comme PASS |
| Tests globaux CI | 2 107 PASS, 110 ignorés sur `f50075f` ; aucun test ignoré présenté comme exécuté |
| PostgreSQL/RLS | 113 tests PASS dans la CI Linux isolée ; aucun accès à une base de production depuis cette passe |
| Images Docker | Admin, worker et migrateur construits et scannés avec succès sur `f50075f` |
| Navigateur dashboard | Première CI : 12 PASS, 2 ignorés, 2 échecs. Les fixtures ont été corrigées ; résultat final à lire sur le HEAD de la PR |

La [CI de la branche](https://github.com/PajuanDev/caleonis-reception/actions?query=branch%3Acodex%2Freceptionist-v1-parity-2026-10-15) porte le statut courant du SHA proposé. La description de PR et le relevé de livraison final identifient le SHA et les résultats acquis. Les captures du dashboard doivent provenir des fixtures de cette CI, identifiées comme données de test. L'artefact de la première CI contient uniquement trois captures d'affiliation : aucune capture Messages n'en est déduite.

La fixture Playwright jetable active explicitement le programme d'affiliation hérité pour conserver son scénario de régression. Cela ne l'active pas en production ; les tests de routes vérifient séparément le défaut fermé et l'absence d'effets de bord.

La reprise des E2E corrige le nom accessible de la marque, utilise l'entrée de langue explicite `/calls?lng=fr` et des identités uniques à chaque tentative pour éviter le cooldown Redis laissé par une précédente vérification d'e-mail. Les attentes Voice-only, le composer désactivé et les contrôles d'isolation restent en place. Les captures d'échec sont désormais conservées pour distinguer un problème de fixture d'un défaut visible.

Sur Windows, `mint broken-links` émet quatre faux positifs sur les chemins imbriqués ; la cause séparateurs `\\` contre `/`, les cibles présentes et le contrôle indépendant sont documentés. La CI exécute aussi le vérificateur natif sur Linux. Le contrôle navigateur est un smoke d'accessibilité et de responsive, pas une certification WCAG exhaustive.

Commandes de revue : `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm docs:validate`, `pnpm --filter @lobbystack/docs check:content`, `pnpm --filter @lobbystack/landing seo:validate`. Pour exporter l'aide : `node scripts/build-help-preview.mjs apps/landing/dist/aide`, puis `node scripts/verify-v1-preview.mjs apps/landing/dist`. Le smoke navigateur accepte une URL locale et, si nécessaire, `PLAYWRIGHT_CHROMIUM_EXECUTABLE` vers un navigateur installé. Les machines locales partagées doivent exécuter les gros lots en séquence.

## Configuration de lancement

- `AFFILIATE_PROGRAM_ENABLED=false` par défaut. Activer uniquement après validation des conditions et circuits de paiement.
- `NEXT_PUBLIC_HELP_SITE_URL` : URL d'une aide publiée et accessible. Sans valeur valide, l'application renvoie vers l'accompagnement existant `/fr/essai`.
- `NEXT_PUBLIC_LANDING_SITE_URL` : URL marketing dédiée à choisir avant de réactiver les liens riches du dashboard public. Aucun domaine définitif n'a été inventé.
- `PUBLIC_SITE_URL` : origin canonique du site ; le build livré utilise l'origin du preview indépendant. L'indexation reste volontairement désactivée.

## Go / No-Go

GO pour relire la preview et préparer une démonstration encadrée des capacités prouvées. NO-GO pour annoncer une parité totale ou ouvrir sans réserve le service commercial. La session P0 reste propriétaire de la latence, de la durée OAuth Google, des textes légaux, de l'information/choix des appelants, des durées de conservation et de la qualification téléphonique de chaque entreprise. Les points d'activité SaaS et de TVA de l'exploitant restent à finaliser dans cette coordination.

Le numéro pilote reste Voice-only. SMS, transfert humain, paiements, affiliation, portabilité et traitements de santé ne doivent pas être annoncés activés sans preuve et accord spécifiques. Le rendez-vous Google TEST et les données P0 sont conservés. Les anciens enregistrements manquants et les prix individuels Twilio incomplets restent des limites distinctes, documentées dans la matrice.

La suite recommandée après cette livraison est P1.4 : offre, exploitation, support, suivi et paiements de test. Aucun chantier P2 n'est lancé.
