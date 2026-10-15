# Reprise de la PR #10 — V1.1 / V1.2 / V1.3

La preview initiale masquait des pages du fork et réduisait la documentation anglaise. La reprise rétablit les composants, routes et contenus complets sous Caléonis Receptionist. **P1.4 et V2 restent fermées tant que cette revue n’est pas qualifiée.**

## Sources et continuité

La branche existante `codex/receptionist-v1-parity-2026-10-15` conserve `c054d96dd1d67c2ab57e8b6cacaa041b929bca36` et les ancêtres des PR #6 à #9. Source publique complémentaire : GitLab officiel `lobbystack-group/lobbystack`, commit MIT `46b217807cb251a6679a5e64b8142d2441ccecd3`. Les notices MIT et copyright LobbyStack contributors restent conservées. Aucun merge de PR ni réécriture forcée de branche.

Le contrôle en lecture seule du service existant a trouvé la version admin `47a4917c8110bd573a6e04a7f9dc434a952cbe09`, PostgreSQL et stockage prêts. Ses trois pages légales pilote approuvées sont reprises à l’identique. La reprise ne modifie ni service de production, ni DNS, données clients ou paiements et ne lance aucun appel ou message fournisseur.

## Résultat de revue

- Véritable Astro : dispositions, menus, composants, typographie, illustrations neutres autorisées et 84 articles FR/EN complets avec attribution d’archive. Toutes les routes marketing FR/EN du sitemap public contrôlé ont une page spécifique.
- Aide native complète FR/EN avec références API issues du contrat réel Caléonis, navigation hiérarchique, recherche plein texte, ancres, snippets et illustrations autorisées.
- Messages et protections Voice-only conservés. Préparation `/dashboard` et retours auth opt-in staging, désactivée sur le domaine et l’environnement de production.
- Gateway HTTP locale testée : API/auth/anciens chemins privés, corps bruts, cookies multiples, statuts et SSE. Cela ne qualifie pas OAuth/PSTN sur un déploiement combiné.
- Catalogue de revue désactivé : Free 0 €, Starter 30 €/mois ou 288 €/an, Pro 100 €/mois ou 960 €/an. TVA/CGV, éligibilité, marge réelle et produits de paiement restent à valider.

## Preuves et exceptions

`exhaustive-parity-manifest.json` contient routes, présence du build, statuts HTTP réellement observés, liens/actions, assets, captures et écarts. `public-source-inventory.json` est le relevé horodaté des sitemaps/pages publiques. Rapports complémentaires : `marketing-restoration-report.md`, `marketing-assets.json`, `docs-parity.json`, `app-settings-parity.md`, `pricing-parity-review.md`, `domain-single-host-review.md`.

La couverture de routes ne certifie pas la parité fonctionnelle ou visuelle. Les exceptions comprennent les marques d’origine dans les images, portraits tiers sans provenance distincte, archives éditoriales attribuées, clauses US/CA, SMS incompatibles Voice-only, transferts non qualifiés, tarifs non activés et nouvelles fonctions amont absentes du moteur conservé.

Les résultats finaux, SHA livré, version de preview, tests et captures sont consignés dans `reprise-qualification.json` après exécution. Preview privée et noindex sur chatgpt.site ; les CTA ouvrent l’application existante. Domaine final imposé : `https://receptionist.caleonis.com/`, `/login`, `/signup`, `/fr`, `/aide` et `/dashboard`, sous réserve de répétition staging et d’autorisation humaine avant changement de production.
