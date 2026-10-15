# V1.3 — documentation complète FR/EN et parité auditable

État de la reprise du 15 octobre 2026, sur la PR #10 existante. La production qualifiée `e8e23bae4955f64fa3f99cb525faad908439077e` et le candidat `c054d96` sont conservés. Le chantier documentaire ne déploie rien, ne modifie aucun DNS/routage, n'achète aucun numéro et n'envoie aucun message externe.

## Résultat livré

| Périmètre | État | Détail |
| --- | --- | --- |
| Aide française | PASS couverture | 82 pages : 50 guides et 32 fiches API/événements. |
| Aide anglaise | PASS couverture | 83 pages : 50 guides, 32 fiches API/événements et l'ancienne entrée `/en/overview`. Chaque sujet dispose de son guide détaillé en anglais. |
| Routes publiques FR/EN observées | PASS couverture | 147 routes source sur 147 rendues, zéro manquante. Ce résultat décrit les routes et ne signifie pas 100 % de parité fonctionnelle ou visuelle. |
| Référence développeur | PASS contenu | 25 méthodes API et sept événements par langue ; paramètres, permissions, réponses et toutes les définitions de schéma référencées sont inclus. |
| Sources natives | PASS provenance | Le socle initial contient 41 MDX et un skill Markdown. La source MIT récente fournit les traductions françaises natives, les versions anglaises et le guide des pays. |
| Navigation | PASS | Hiérarchie et libellés courts repris du `docs.json` natif, sélecteur FR/EN, mêmes sujets par langue. Les guides de support ajoutés sont placés après les groupes du socle. |
| Aperçu statique | PASS rendu | 165 pages uniques, index FR et EN, style Almond, police Geist, icônes, ancres natives, table des matières, recherche plein texte, onglets, copie de code, thèmes et menu mobile. |

Le contenu français ne repose plus sur des réécritures abrégées et l'anglais n'est plus limité à deux résumés. Les pages natives conservent leurs étapes, tableaux, exemples, snippets et liens. Les différences de capacité ou de contrat sont remplacées par des procédures Caléonis précises et identifiées comme exceptions.

## Sources, licences et fichiers de preuve

La source native actuelle provient de `https://gitlab.com/lobbystack-group/lobbystack`, commit `46b217807cb251a6679a5e64b8142d2441ccecd3`, sous licence MIT, copyright 2026 LobbyStack contributors. Les notices du dépôt, `mintlify/NOTICE.md` et le `LICENSE` Mintlify de 2023 sont conservés. La police Geist est sous SIL Open Font License ; les icônes Lucide sont sous ISC. L'export embarque les notices locales correspondantes.

- [Inventaire page par page](docs-parity.json) : source, destination, SHA des sources et HTML, assets, headings/actions et exceptions explicites.
- [Inventaire API](docs-api-reference.json) : 25 opérations et sept événements, liés au SHA du document OpenAPI Caléonis.
- [Configuration native adaptée](../../mintlify/docs.json) et [sources/commandes](../../mintlify/README.md).
- Export de revue : `.tmp/v1-preview/aide/`, manifeste `export-manifest.json` et index plein texte `search-index.json`.
- Preuves UI locales : `.tmp/p1-reprise/docs-browser/result.json`, captures ordinateur/mobile. Les captures comparatives du navigateur Work sont consolidées séparément par la QA racine.

## Exceptions nécessaires et fonctions à qualifier

| Sujet | Traitement du candidat |
| --- | --- |
| Images de l'application | Les deux captures Messages réelles, données fictives, remplacent l'illustration historique. Les anciennes images Home, Calls, Messages et Analytics restent en Git pour provenance mais ne sont pas exportées comme captures Caléonis. Les nouvelles captures Home/Calls/Analytics authentiques attendent la collecte CI. La vue EN précise lorsque la capture est en français. |
| Résumé d'entreprise | Le résumé manuel est rétabli dans la nouvelle interface candidate et utilise le backend existant. La génération automatique et la réécriture IA de l'amont récent ne sont pas implémentées ni simulées. |
| Horaires et langues | Les nouveaux contrôles amont d'extraction automatique, plages multiples/fermetures sur la page IA et six langues de repli supplémentaires ne sont pas présentés comme disponibles. Le sélecteur Caléonis reste FR/EN. Les champs API existants sont documentés selon leur contrat réel. |
| Messages et SMS | Messages est documenté intégralement. Le numéro pilote Voice-only ne reçoit ni n'envoie de SMS. Le consentement ne débloque pas cette capacité. Aucun reçu ou envoi n'est déduit d'une réservation. |
| Google | Une réservation de test est qualifiée ; renouvellement OAuth durable et état Testing restent une qualification distincte. Annulation et déplacement demandent leurs propres contrôles de bout en bout. |
| Transfert et rappels | Le transfert humain reste à qualifier. Le repli est une tâche de suivi ; aucune demande de rappel n'initie un appel sortant automatique. |
| Numéros français | Les catalogues US/Canada, gratuités, récupération automatique et conditions de portabilité amont ne constituent pas une offre française. Titulaire légal, justificatifs, attribution et éventuelle sous-location doivent être validés. |
| Offre et facturation | La demande de mêmes montants numériques en EUR reste soumise au catalogue approuvé, aux quotas/dépassements, taxes, marge et devise réelle du prestataire. Pas de prix contractuel ni charge réelle activés par l'aide. Aucun programme d'affiliation Caléonis non approuvé n'est annoncé. |
| API et webhooks | Le runtime Caléonis prévaut sur l'amont récent. `POST /webhooks` est idempotent dans notre version ; la restriction amont récente par portée d'événement n'est pas déclarée active. L'intégration et la livraison des alertes exigent leurs propres preuves. |
| Clients MCP | Transport, outils, scopes, exemples et workflows sont complets. Les menus/offres tiers ne sont pas garantis ; les extraits OpenAI sont liés à la référence officielle. Aucun nouveau système multi-agents ni Agent Builder. |
| Hébergement de l'aide | Mintlify reste la source/configuration canonique. L'aperçu statique ne simule ni console API « Try It » exécutant des appels, ni recherche IA cloud Mintlify. La recherche documentaire plein texte fonctionne localement. |
| Médical et juridique | Accueil administratif sans données de santé ; aucune qualification HDS ou garantie médicale. Les guides ne remplacent pas des CGV, une politique de confidentialité ou une présentation fiscale approuvées. |

## Vérifications exécutées

| Contrôle | Résultat |
| --- | --- |
| `node mintlify/check-content.mjs` | PASS : schéma Mintlify installé, 165 métadonnées/pages/entrées, 413 liens internes, quatre références d'images, miroirs FR/EN, 147 routes publiques et contrats complets des 25 méthodes par langue. |
| `node scripts/build-help-preview.mjs` | PASS : compilation réelle des 165 MDX vers HTML, recherche et assets embarqués, aucun import de service de production. |
| `python scripts/p1-docs-manifest.py` | PASS : 147 routes publiques rendues, zéro manquante, SHA d'assets et exceptions enregistrés. Les statuts HTTP sont consolidés par le contrat indépendant du site, pas inventés par ce script hors réseau. |
| `pnpm docs:validate` | PASS : exit 0, « build validation passed », journal `.tmp/p1-reprise/docs-validate.log`. |
| `pnpm docs:broken-links` | EXCEPTION outil Windows : exit 1 sur des cibles imbriquées existantes. La comparaison des chemins Windows de `@mintlify/link-rot` conserve des antislashs tandis que les URLs utilisent des slashs. Les vérifications physiques, de rendu et HTTP indépendantes restent nécessaires et ne sont pas remplacées par un faux PASS du CLI. |
| `node scripts/p1-docs-browser-check.mjs` | PASS : recherche d'un terme présent dans le corps, navigation vers le résultat, changement de langue conservant le guide, onglets Webhooks, ancre française Unicode, menu mobile/fermeture, absence de débordement horizontal et thème sombre. Zéro erreur navigateur. |
| QA Work page par page | PENDING consolidation par la racine : ne pas confondre couverture rendue et ressemblance visuelle qualifiée. |
| Appels, achats, paiements ou notifications externes | Aucun déclenché par ces contrôles documentaires. |

## Reproduire et préparer la publication

Préparer le clone de lecture seule MIT dans `.tmp/lobbystack-public-upstream`, puis lancer dans l'ordre `python scripts/p1-restore-docs.py`, `python scripts/p1-docs-reference.py`, `node mintlify/check-content.mjs`, `node scripts/build-help-preview.mjs` et `python scripts/p1-docs-manifest.py`. Le test navigateur utilise un serveur statique local déjà démarré ; aucune clé API ni donnée client n'est requise.

Avant publication, intégrer les captures applicatives authentiques lorsqu'elles sont qualifiées, consolider les comparatifs Work, relire les preuves P0 Google et valider l'architecture du domaine unique avec rollback. L'approbation du routage, des conditions commerciales et de la publication de production reste distincte. Aucune V1.4 n'est engagée par cette reprise.
