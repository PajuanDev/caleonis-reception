# Domaine unique — proposition de staging PR #10

État : **gateway HTTP locale concrète testée avec un Next simulé et des fichiers statiques ; qualification du vrai Next et bascule production PENDING**. Aucun changement DNS, Railway, proxy de production, callback fournisseur, cookie, webhook ou routage de `receptionist.caleonis.com` n'a été effectué.

## Architecture minimale proposée

Conserver Next et le worker actuels. Préparer les sorties statiques Astro marketing et aide, puis un petit gateway à règles explicites sur un **hôte de staging isolé**. Le marketing possède `/` (EN) et `/fr`, l'aide `/aide` (FR) et `/aide/en` (EN). Next possède `/login`, `/signup`, leurs variantes locales, `/dashboard`, toutes les URLs privées historiques, `/_next`, `/api`, les callbacks et les webhooks. Le gateway sert uniquement les fichiers/routes présents dans les manifestes du build. Une route inconnue retourne un vrai 404, une méthode non autorisée sur le statique un 405.

Ne pas configurer de fallback global vers un index marketing. Une route API inconnue reste chez Next et conserve le statut de Next ; un POST fournisseur ne doit jamais être acquitté par un document HTML en 200. Le classifieur pur `scripts/p1-routing-policy.ts` garde les tests de priorités. Le prototype exécutable `scripts/p1-single-host-gateway.mjs` sert les fichiers exacts inventoriés ; tous les autres chemins vont vers Next, sans décoder/réécrire la cible proxy, suivre les redirects, parser le corps, réessayer une requête ou produire un fallback marketing. Ces scripts ne sont importés par aucun code déployé.

## Répétition HTTP locale implémentée

Le listener est fixé à `127.0.0.1`. L'upstream accepte seulement HTTP sur `127.0.0.1`, `[::1]` ou `localhost` (ce dernier est épinglé à `127.0.0.1`) ; tout domaine externe, credentials, chemin/query dans l'origine ou autre protocole est refusé avant connexion. L'inventaire statique ignore les symlinks, fichiers cachés et extensions sources ; les traversées brutes/encodées, doubles encodages et séparateurs ambigus sont refusés. Les routes Next réservées priment même sur un fichier Astro homonyme `/api/status` ou `/login`. Les statuts, Location, CSP, cookies multiples et corps bruts sont préservés ; seuls les en-têtes hop-by-hop sont retirés. Les streams sont pipés avec backpressure, sans accumulation du corps ni buffering SSE. Le timeout est un délai d'inactivité de l'upstream de cinq minutes pour cette répétition locale, pas une durée maximale de session qualifiée.

Le Host entrant doit correspondre au hostname loopback et au port effectivement lié ; un Host de production renvoie 421. Les en-têtes Forwarded/X-Forwarded fournis par le client sont retirés et les valeurs contrôlées recalculées depuis le socket et le Host validé. `Origin` n'est jamais remplacé : Next conserve ses contrôles CSRF et CORS. Le prototype n'ajoute pas de CORS permissif et ajoute `X-Robots-Tag: noindex, nofollow` à toutes les réponses locales. Aucune réécriture de domaine/path de cookie n'est réalisée.

Commandes, depuis la racine du dépôt :

```text
node --test scripts/p1-single-host-gateway.test.mjs
node scripts/p1-single-host-gateway.mjs --next-origin http://127.0.0.1:3000 --marketing-dir apps/landing/dist --port 4380
```

La seconde commande suppose un Next local isolé déjà lancé. Elle n'est pas lancée contre un Next branché aux services de production dans cette passe. Un répertoire d'aide séparé, avec `index.html` à sa racine, peut être monté sous `/aide` par `--help-dir chemin` ; sinon les pages `/aide` présentes dans le build marketing sont inventoriées avec lui. Ctrl+C ferme la gateway. Aucun paramètre de bind public ou de cible distante n'est proposé.

**9 tests HTTP réels réussis**, avec Next simulé lié au loopback et dossiers statiques temporaires : routes marketing/aide/assets/HEAD ; vrais 404 Next ; auth/callback avec query opaque et redirect 307 ; deux Set-Cookie distincts ; 401/403 et CSP ; POST binaire signé sans changement d'octet ; OPTIONS/PUT/PATCH/DELETE ; refus de traversal et de Host injecté ; Origin conservé ; première frame SSE reçue avant la fin de réponse upstream. Les tests n'appellent aucun service externe. Les WebSocket/upgrades ne sont pas implémentés et renvoient explicitement **501** ; leur compatibilité reste PENDING.

Une exécution supplémentaire a servi le vrai build local `apps/landing/dist` (633 entrées de routage/fichiers à cet instant) derrière cette gateway avec un Next simulé : `/`, `/fr`, `/fr/pricing`, `/aide` retournent 200 HTML ; `/api/never-existing-p1-route` garde le 404 JSON de Next. Horodatage, statuts et SHA256 des réponses : `docs/p1/domain-gateway-local-evidence.json`. Les serveurs ont ensuite été arrêtés. Ce smoke n'est pas une qualification du contenu complet de l'aide ni du runtime Next réel.

## Préparation app réellement implémentée

La nouvelle page physique `(dashboard)/dashboard/page.tsx` utilise le même composant `LiveOverviewSurface` et le même layout privé (session, onboarding, permissions). La page déclenche `notFound()` lorsque la répétition de staging n'est pas activée. AuthCard, GuestAuthCard et le lien Home utilisent un helper commun : `/dashboard` pour le staging activé, `/` dans le cas habituel ; les liens profonds `/calls`, `/messages`, `/settings/...` sont préservés. Un retour legacy `/?query#anchor` est remappé vers `/dashboard?query#anchor` en staging.

L'opt-in de build est `P1_SINGLE_HOST_STAGING=true`. Il faut aussi un nom d'environnement explicite parmi `development`, `test`, `staging`, `preview`, `certification`, lu dans `RAILWAY_ENVIRONMENT_NAME`, sinon `P1_SINGLE_HOST_ENVIRONMENT`, sinon `NODE_ENV`. Le hostname `receptionist.caleonis.com` est explicitement refusé même si le flag est fourni. `next.config.ts` dérive `NEXT_PUBLIC_P1_SINGLE_HOST_STAGING` ; une modification exige un **rebuild** pour aligner navigateur et serveur. Les sorties de fin d'onboarding et du guide de configuration passent aussi par ce helper ; une visite d'une ancienne étape après achèvement rejoint le dashboard de staging. Aucun flag n'a été activé sur un service.

Exemple de build isolé : `P1_SINGLE_HOST_STAGING=true`, `P1_SINGLE_HOST_ENVIRONMENT=staging`, `APP_BASE_URL=https://receptionist-review.example.invalid`. Utiliser un vrai hôte staging contrôlé au moment de l'exécution, sans remplacer l'URL de production. La préparation app ne suffit pas à tester une gateway ou à autoriser une bascule du root.

## Conflits de chemins connus

| Chemin | Propriétaire proposé | Vérification nécessaire |
|---|---|---|
| `/` | Astro | historique Home privé pris en charge par `/dashboard` en staging |
| `/fr`, routes marketing EN/FR exactes | Astro | canonicals, hreflang, 404 réels, assets build |
| `/aide`, `/aide/en`, guides et assets exacts | aide statique | liens relatifs, ancres, recherche, pas de fallback générique |
| `/login`, `/signup`, `/fr/login`, `/en/login` | Next | redirects locaux existants préservés ; inscription selon autorisations actuelles |
| `/demo`, `/fr/demo`, `/essai`, liens à jeton | Next | sessions démo et jetons non exposés au cache statique |
| `/api/*` | Next exclusivement | Astro contient `/api/status`, qui ne doit pas écraser cette règle |
| `/api/calendar/google/callback`, `/api/auth/*` | Next | query/code/state/cookies inchangés |
| `/api/webhooks/{twilio,openai,polar,resend}` | Next | octets bruts et signature inchangés, aucun redirect |
| `/.well-known/*`, `/oauth/*`, `/api/mcp`, `/api/v1/*` | Next | issuer et métadonnées cohérents avec hôte externe |
| `/_next/*`, `/embed.js`, `/embed/*`, `/locales/*`, `/brand/*` | Next en priorité | manifests assets et règles CSP/iframe existantes |
| `/affiliate-program` / `/affiliate` | marketing / Next privé | ne pas confondre affiliation publique et compte opérateur |
| `/docs/api` / `/api/*` | documentation marketing / Next | les exemples documentaires ne remplacent pas l'API |

Toute collision favicon, `/brand` ou nom d'image doit être rapportée avant publication. Préférer les assets hashés `/_astro/` et des chemins d'aide sous `/aide/...` ; ne pas renommer aveuglément les assets Next immuables déjà référencés.

## Qualification staging requise avant toute autorisation de root

1. Exécuter la gateway **isolée** avec le build complet d'aide et le vrai Next de staging ; comparer statut/Location/body hash des routes Next à un accès direct Next. Le contrat HTTP simulé passe, mais il faut encore vérifier auth réelle, configuration et dépendances de cette instance isolée.
2. Préserver Host/Forwarded et `X-Forwarded-Proto` via une liste de proxies de confiance ; conserver l'hôte externe pour auth, webhooks signés et OAuth. Éviter de forger une origine autorisée ou d'ajouter un CORS global. Rejouer des fixtures signées sans lancer un appel, un email ou une réservation réels.
3. Tester login, logout, récupération de mot de passe, invitation, onboarding et retour profond. Vérifier `Set-Cookie`, Secure, HttpOnly, SameSite, Path `/`, scope de domaine et protection CSRF. Les cookies marketing ne doivent ni écraser ceux d'auth ni provoquer un cache partagé des pages privées. Ne pas changer le nom ou le secret des cookies.
4. Effectuer Google OAuth en sandbox avec redirect URI staging séparée, vérifier state usage unique, callback et retour `/settings`; répéter les parcours API, widget, appels existants et enregistrements privés. Conserver `GOOGLE_REDIRECT_URI` de production inchangé.
5. Préserver les réponses streamées/SSE et upgrades utilisés ; tester `no-transform`, absence de buffering, timeout adapté aux appels, abort et webhooks. Aucune mise en cache de `/api`, des jetons, callbacks ou pages privées. Conserver les en-têtes CSP, iframe et sécurité existants par propriétaire ; pas de CSP globale incompatible avec le widget.
6. Staging : contrôle d'accès + `X-Robots-Tag: noindex, nofollow` sur toutes les surfaces et robots cohérent. Production future : marketing/aide indexables, auth/app/API non indexables ; un seul sitemap marketing localisé, canonicals pointant vers le domaine final. Les erreurs 404 restent 404.
7. Recueillir captures desktop/mobile et résultats nav marketing → login → app, locale FR/EN, recherche aide, pages manquantes et erreurs assets. Requalifier PSTN/Google avec le propriétaire avant une éventuelle bascule ; ne pas déclencher d'effets clients dans les tests automatisés.

## Plan de retour à préparer avant le cutover

Archiver l'identifiant et l'image du déploiement Next actuel, ses variables **sans les exposer**, son mapping de domaine, certificats, upstreams et métriques de référence. Conserver l'ancien service joignable et ses sauvegardes validées. La première répétition utilise un hôte staging sans changement DNS de production. Après autorisation explicite seulement, appliquer un mapping de domaine/path routing contrôlé ; surveiller 5xx/404 inattendus, latence, sign-in, webhooks rejetés et disponibilité PSTN. Déclencher retour immédiat au mapping/service Next précédent sur régression auth, callback, API ou voix ; ne pas migrer la base ni tourner les secrets pendant ce cutover. Le flag Next de staging impose un rebuild : garder l'image d'origine prête, ne pas compter sur un simple changement de variable pour revenir.

## Preuves et limites

PASS : 46 tests déterministes pricing/routing ; 55 tests ciblés app/auth/sidebar/helper/onboarding/setup ; 9 tests HTTP de gateway locale avec Next simulé ; smoke du vrai build statique avec statuts/hashes. Typecheck admin et scripts dédiés réussi. Lint ciblé : zéro erreur ; un avertissement `autoFocus` existant dans AuthCard. Le classifieur protège les namespaces, méthodes, queries et erreurs ; le gate refuse explicitement la production. La sidebar conserve Messages et toutes les URLs privées existantes. Build global et qualification du vrai Next doivent être reportés par leurs résultats réels dans la livraison globale. La suite `.test.mjs` a une commande Node dédiée ; le glob Vitest `.test.ts` ne la lance pas automatiquement.

Les outils `nextjs_docs`, `nextjs_index`, `nextjs_call` ne sont pas exposés dans cette session. Les guides de la version installée `apps/admin/node_modules/next/dist/docs/` ont été lus (rewrites, variables d'environnement) avant les modifications, ainsi que `apps/admin/AGENTS.md`. Aucune validation MCP `get_routes/get_errors` n'est revendiquée.

**PENDING** : gateway avec vrai Next et aide complète isolés ; OAuth réel, session/cookies/CSRF sur Next, webhooks fournisseurs sandbox, streaming réel et besoin d'upgrade/WebSocket ; collisions d'assets exhaustives ; déploiement staging durable et preuve de retour opérationnel. Le contrat HTTP est désormais exercé concrètement en local ; le domaine unique en production n'est pas livré et la parité fonctionnelle ne peut pas être déclarée complète.
