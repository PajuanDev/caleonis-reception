# V1.3 — documentation et support

Date : 15 octobre 2026. Base de travail : production qualifiée e8e23bae4955f64fa3f99cb525faad908439077e. Aucun accès en écriture à la production, aucun déploiement Railway, aucun achat ou envoi externe n’a été réalisé pour cette adaptation.

## Livraison

- **FIXED** — Les 41 guides MDX hérités ont été réécrits en français pour Caléonis Receptionist. Le guide Markdown MCP historique devient une page MDX au même slug pour éviter un doublon de route.
- **FIXED** — Six guides de support ajoutés : capacités, dépannage, FAQ, renvoi, enregistrements et confidentialité ; page d’attributions ajoutée.
- **PASS** — 51 pages MDX : 49 FR et 2 synthèses EN. L’anglais intégral n’est pas livré et n’est pas annoncé.
- **FIXED** — Navigation en trois onglets : aide SaaS en français, développeurs, English. Un seul agent métier par entreprise.
- **FIXED** — Logos, icônes, favicon et métadonnées Caléonis ; domaine d’API et liens applicatifs vers receptionist.caleonis.com.
- **FIXED** — Offres et quotas sur demande. Aucun tarif, programme d’affiliation, numéro inclus ou délai opérateur inventé.
- **FIXED** — Distinction appels / Messages / SMS / prise de message vocale. Voice-only reste explicitement sans SMS. Le widget existant est décrit comme restreint pour de nouvelles activations.
- **FIXED** — Transfert humain, durabilité OAuth, changements de rendez-vous, API et webhooks restent séparés de leur qualification E2E. Les notifications ne sont jamais déduites d’une réservation.
- **FIXED** — Google : état Testing sept jours daté du 15 octobre et correction P0 à requalifier, sans promesse durable.
- **FIXED** — Cabinets médicaux : accueil administratif sans données de santé, aucune qualification HDS annoncée.
- **PASS** — Notice MIT LobbyStack contributors conservée dans le dépôt, copie documentaire NOTICE.md, page d’attributions ; notice Mintlify LICENSE conservée. Les packages et variables internes ne sont pas renommés.
- **PASS** — Aucun nouveau média tiers. Les logos reprennent les actifs Caléonis locaux fournis ; aucune ancienne capture LobbyStack n’est affichée comme capture Caléonis.

## Références utilisées pour l’exactitude

Lecture seule de product-capabilities.ts, routes d’API, surfaces d’intégrations/notifications/équipe, configuration widget, modèle et logique de réservation, conversations, API publique et MCP. Les faits historiques d’appels et de booking viennent de la qualification pilote communiquée par la session racine ; ces appels n’ont pas été répétés par cette passe.

Les guides self-hosting sont séparés des parcours SaaS. Ils n’invitent jamais à changer les sources ou paramètres de production Caléonis.

## Vérifications réalisées

| Vérification | Résultat | Preuve |
| --- | --- | --- |
| Schéma de configuration Mintlify installé | PASS | node mintlify/check-content.mjs |
| Navigation et fichiers MDX | PASS | 51 entrées, 51 pages, aucune absente ni doublon |
| Liens internes des contenus | PASS | 99 références, zéro cible absente avec résolution filesystem indépendante |
| Marques / liens de produit hérités | PASS | Aucun domaine app/docs/lobbystack.com dans les guides ou la configuration publiable |
| Export réel MDX vers HTML | PASS | node scripts/build-help-preview.mjs : 51 guides, 52 fichiers HTML avec index racine |
| Cibles internes de l’export | PASS | Contrôle des liens /aide/ dans les 52 HTML, aucune cible absente |
| Build documentaire Mintlify strict | PASS | pnpm docs:validate, exit 0, « build validation passed » |
| Mintlify broken-links | FAIL outil Windows | 4 faux positifs documentés ci-dessous ; ne pas présenter ce contrôle comme PASS |
| Whitespace diff | PASS | git diff --check -- mintlify : aucun diagnostic de whitespace ; avertissements de conversion CRLF seulement |
| Responsive et clavier du preview | Délégué à QA racine | L’export fournit viewport mobile, grille responsive, recherche locale, focus et lien d’évitement. Le contrôle navigateur final est consolidé par la racine. |
| E2E externes / nouveau numéro / notifications | NOT_TESTED | Aucun effet externe nécessaire ou autorisé dans le chantier documentaire. |

### Limite du vérificateur de liens Mintlify sous Windows

La commande pnpm docs:broken-links finit exit 1 avec quatre liens vers :
- agent/ai-settings/overview ;
- agent/ai-settings/appointment-changes.

Les quatre fichiers émetteurs sont agent/overview, agent/ai-settings/overview, dashboard/appointments et getting-started/account-setup. Les deux fichiers cibles existent, sont dans la navigation, passent le build Mintlify et sont rendus dans l’export.

Le code installé @mintlify/link-rot/dist/graph.js compare parsedFilePath.dir issu du système de fichiers Windows (agent\\ai-settings) à parsedPath.dir issu de l’URL (agent/ai-settings). La comparaison des répertoires imbriqués ne normalise pas ce séparateur ; les routes à deux segments ne déclenchent pas ce faux positif. Aucun lien public n’a été altéré pour contourner cet outil.

Le contrôle indépendant reproductible est disponible :
```bash
pnpm --filter @lobbystack/docs check:content
```

Il utilise le schéma Mintlify réellement installé, contrôle les métadonnées, le domaine d’API, les assets, la couverture de navigation et les cibles physiques des liens. Il ne prétend pas remplacer la vérification des destinations externes ou des parcours métier.

## Avant publication

- Relire les preuves P0 Google après la correction de configuration OAuth ; ajuster la note datée si nécessaire.
- Consolider la QA visuelle desktop/mobile et navigation de la racine.
- Valider l’URL dédiée de l’aide et remplacer les renvois contextuels configurables de l’application si nécessaire.
- Garder les textes de confidentialité/enregistrements comme guides d’utilisation ; ne pas les publier comme CGV ou notices légales finales validées.
- Ne pas ouvrir des capacités marketing non activées aux clients.
- Conserver la référence technique OpenAPI en anglais clairement identifiée ; une traduction intégrale EN de l’aide reste un enrichissement ultérieur.

Aucun blocage documentaire n’exige d’achat, de DNS ou de modification de la production. La publication du site et les qualifications métier restent coordonnées par la session racine.
