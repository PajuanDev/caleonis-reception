# Centre d’aide Caléonis Receptionist

Sources MDX du centre d’aide, en français en priorité. La navigation sépare l’aide SaaS, la documentation développeur et deux guides de synthèse en anglais.

Aucun domaine d’aide public ni branche de publication automatique n’est configuré par cette passe. Ne connectez pas cette branche à une publication de production sans validation.

## Prévisualiser et vérifier

Depuis la racine du dépôt :

```bash
pnpm docs:dev:no-open
pnpm docs:validate
pnpm docs:broken-links
```

Le port de l’aperçu est indiqué par la commande. Utilisez un port distinct de l’application si nécessaire.

Le script `scripts/build-help-preview.mjs` prépare aussi un aperçu statique sous `/aide/`, à intégrer au preview isolé du site marketing. Il ne requiert ni achat Mintlify ni publication SaaS.

## Contenu et validation

- Les 41 guides hérités sont adaptés ; aucun remplacement global de marque ne définit la disponibilité.
- La navigation reste centrée sur un agent par entreprise.
- Les plans sont sur demande ; Voice-only n’offre pas de SMS.
- Les transferts, le renouvellement Google et les autres parcours non qualifiés restent identifiés.
- Les guides développeurs conservent les noms internes de packages et variables.
- Les captures historiques ne sont pas utilisées comme preuves de l’interface Caléonis.
- Les logos Caléonis reprennent les actifs locaux fournis par l’opérateur.
- `LICENSE` conserve la notice Mintlify ; `NOTICE.md` et la page `attributions.mdx` conservent l’attribution LobbyStack MIT.

Les textes de confidentialité sont des guides d’usage. Ils ne constituent pas des CGV ni une notice légale finale approuvée.
