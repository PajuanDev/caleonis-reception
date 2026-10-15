# Centre d’aide Caléonis Receptionist

Sources MDX complètes en français et en anglais. La navigation reprend la hiérarchie native du socle MIT : démarrage, général, agent, gestion, API, assistants IA, référence API et auto-hébergement. Les guides supplémentaires de support et de confiance sont à la fin ; chaque locale dispose des mêmes sujets.

Aucun domaine d’aide public ni branche de publication automatique n’est configuré par cette passe. Ne connectez pas cette branche à une publication de production sans validation.

## Prévisualiser et vérifier

Depuis la racine du dépôt :

```bash
pnpm docs:dev:no-open
pnpm docs:validate
pnpm docs:broken-links
node mintlify/check-content.mjs
node scripts/build-help-preview.mjs
```

Le port de l’aperçu est indiqué par la commande. Utilisez un port distinct de l’application si nécessaire.

Le script `scripts/build-help-preview.mjs` prépare aussi un aperçu statique sous `/aide/`, à intégrer au preview isolé du site marketing. Il conserve navigation par langue, ancres natives, table des matières, recherche plein texte, onglets, copie des extraits, thème et menu mobile. Il ne requiert ni achat Mintlify ni publication SaaS. Les actions login/signup pointent vers l'application existante.

Le CLI Mintlify épinglé peut annoncer à tort des liens internes imbriqués manquants sur Windows. Ne remplacez pas ces pages pour masquer le résultat. `check-content.mjs` vérifie indépendamment schéma de configuration, toutes les entrées de navigation, liens, images, miroirs FR/EN, les 147 routes publiques observées et les contrats/schémas complets des 25 opérations API par locale. Le contrat HTTP du site et le contrôle navigateur restent nécessaires.

## Contenu et validation

- Le socle initial comporte 41 MDX et un skill Markdown. La source MIT récente `46b2178` fournit les traductions françaises natives et le guide supplémentaire des pays.
- Le candidat fournit 82 pages FR et 83 EN : 50 guides FR, 50 guides EN plus l'ancienne entrée `/en/overview`, et 32 fiches d'opérations/événements API par langue.
- Les 147 routes FR/EN annoncées par le sitemap public sont rendues. Ce compte décrit la couverture des routes, pas une qualification fonctionnelle ou visuelle à 100 %.
- Les fiches API incluent les 25 méthodes et les sept événements, tous paramètres, réponses et définitions de schéma référencées. Le contrat Caléonis prévaut lorsqu'il diffère de l'amont récent.
- La navigation reste centrée sur un agent par entreprise.
- Les plans sont sur demande ; Voice-only n’offre pas de SMS.
- Les transferts, le renouvellement Google et les autres parcours non qualifiés restent identifiés.
- Les guides développeurs conservent les noms internes de packages et variables.
- Les deux captures Messages réelles avec données fictives sont réutilisées. Les captures historiques ne sont pas utilisées comme preuves de l’interface Caléonis ; Home, Calls et Analytics attendent des captures authentiques qualifiées.
- Les logos Caléonis reprennent les actifs locaux fournis par l’opérateur.
- `LICENSE` conserve la notice Mintlify ; `NOTICE.md` et la page `attributions.mdx` conservent l’attribution LobbyStack MIT.

Les textes de confidentialité sont des guides d’usage. Ils ne constituent pas des CGV ni une notice légale finale approuvée.

L'inventaire page-à-page, les SHA d'assets et les exceptions sont dans `docs/p1/docs-parity.json`. Pour reconstituer les sources, préparer le clone MIT de lecture seule dans `.tmp/lobbystack-public-upstream`, puis exécuter `python scripts/p1-restore-docs.py` et `python scripts/p1-docs-reference.py`. Ces scripts ne déploient rien et n'appellent aucun fournisseur. Après l'export, `python scripts/p1-docs-manifest.py` met à jour l'inventaire. Le test `node scripts/p1-docs-browser-check.mjs http://127.0.0.1:4167` vérifie l'interface sur un serveur statique local déjà lancé.
