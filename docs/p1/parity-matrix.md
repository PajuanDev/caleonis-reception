# Matrice de reprise auditable — PR #10

Le manifeste `exhaustive-parity-manifest.json` porte le relevé détaillé. La présence dans le build et les statuts HTTP mesurés sont séparés ; les captures source et candidat sont distinguées.

| Surface | Reprise | Qualification restante |
| --- | --- | --- |
| Marketing FR/EN | Composants Astro, menus, métiers, 84 articles complets, outils, recherche, changelog, footer et SEO | Revue visuelle et exceptions d’identité/capacités |
| Documentation FR/EN | Guides natifs complets, 32 références API par langue, search, ancres, snippets, onglets et navigation par langue | Captures Caléonis complémentaires et écarts réels du moteur |
| Assets | SHA source/candidat, licences MIT/ISC/OFL conservées ; illustrations marquées et portraits sans provenance remplacés | Exceptions détaillées dans les manifestes |
| Messages | Navigation permanente, Voice-only, permissions, brouillons, recherche et mobile conservés | Aucun SMS réel annoncé pour le numéro pilote |
| Auth et application | `/login`, `/signup`, alias `/dashboard` et destinations privées préparés sous garde staging | Déploiement combiné, OAuth/cookies/CSRF |
| Domaine unique | Gateway HTTP locale, API/callbacks/raw body/cookies/statuts/SSE testés | Autorisation production ; WebSocket explicitement non qualifié |
| Tarifs | Nombres source en EUR dans catalogue inactif ; activation implicite refusée | TVA/CGV, éligibilité numéro, coûts réels, produits EUR sandbox |
| Production | Santé en lecture seule et pages légales P0 préservées | Aucun nouveau test PSTN, e-mail, SMS ou paiement revendiqué |

**GO pour revue privée. NO-GO pour déclarer une parité commerciale totale, basculer la racine de production ou activer les offres. P1.4 et V2 ne démarrent pas avant qualification de cette reprise.**
