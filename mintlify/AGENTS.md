# Instructions du centre d’aide Caléonis Receptionist

Ce répertoire adapte les guides LobbyStack à Caléonis Receptionist, conformément à la demande de l’utilisateur. L’attribution et la licence MIT du socle restent conservées.

## Structure

- Pages MDX avec frontmatter YAML ; configuration dans `docs.json`.
- Aide SaaS en français en priorité.
- Guides développeurs et auto-hébergement séparés du produit géré.
- Aide française complète à la racine et miroir anglais complet dans `en/` ; ne pas remplacer un guide par un résumé.
- Conserver toutes les routes de référence API générées depuis le contrat OpenAPI Caléonis, paramètres et schémas inclus.
- Reprendre la structure native FR/EN du socle MIT ; consigner précisément tout écart de capacité du runtime.

## Rédaction

- Adressez-vous au lecteur avec « vous ».
- Utilisez les noms français de l’interface et des étapes concrètes.
- Distinguez code présent, activation et parcours testé.
- Un seul agent par entreprise, sans nouvelle rubrique Canaux ou Agent Builder.
- Aucune promesse SMS sur un numéro Voice-only, de transfert, d’OAuth durable, de portabilité, de notifications, de prix ou d’affiliation sans preuve.
- Aucun usage médical qualifié ou HDS annoncé.
- Conservez les identifiants internes, clés, variables et noms de packages attendus par le runtime.

## Vérifier

Exécutez `pnpm docs:validate` et `pnpm docs:broken-links`. Vérifiez aussi l’export statique, ses liens et son affichage mobile/desktop.

Ne publiez pas d’informations internes, de secrets ou de données clients. Ne configurez pas de domaine ou de publication automatique sans validation.
