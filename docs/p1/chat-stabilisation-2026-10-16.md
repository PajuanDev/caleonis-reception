# Reprise dans le chat : stabilisation et intégration P0 / V1

Date : 16 octobre 2026. Branche isolée : `chat/receptionist-v1-stabilisation-2026-10-16`. PR #14 empilée sur la PR #10. Aucune promotion en production dans ce lot.

## Références vérifiées

- PR #10 : `88fa32424977d5c90d26344100547fc9062c1a6b`, base commune `e8e23bae4955f64fa3f99cb525faad908439077e`.
- P0 application : `47a4917c8110bd573a6e04a7f9dc434a952cbe09`, pages du pilote personnel approuvées.
- P0 worker : `eea43e5a08afec4d5532ddfbe370f0dd76e81153`, incluant les pages P0 et les mesures de délégation / opt-in medium réservé au pilote.
- Première correction du test : `347bf6f9b1055ee91adb0f70b6b7dc94d70d4238`.
- État Railway lu : sept services en SUCCESS, aucun changement préparé, aucune écriture Railway effectuée. Un statut de déploiement ne constitue pas un nouveau test d'appel, d'agenda ou de sauvegarde.

## Cause de l'échec CI et correctif

Le contrôle `single-host-gateway.e2e.ts` imposait 404 à toutes les méthodes sur une API absente, alors que `apps/admin/proxy.ts` vérifie d'abord l'origine CSRF pour POST/PUT/PATCH/DELETE. Sans Origin valide, le résultat attendu est 403 avec `CSRF origin validation failed.`. Le test de JSON invalide oubliait également cette origine et n'atteignait pas son parseur.

Le test conserve les contrôles stricts de statut et de corps : quinze sondes comparent Next direct et proxifié. GET/HEAD/OPTIONS sans Origin restent en 404 ; les méthodes mutantes sans Origin ou avec une origine étrangère doivent répondre 403 exact ; celles portant l'origine Next autorisée de la fixture isolée doivent atteindre 404. La requête de JSON invalide utilise cette seule origine de test pour atteindre 400. L'authentification via une origine gateway non autorisée reste explicitement refusée. Aucun proxy, CORS, trusted origin ou mécanisme d'authentification de production n'est affaibli.

## Intégration vérifiée par objets Git

Le rapprochement utilise la base commune ci-dessus, pas un remplacement aveugle de l'application par une ancienne branche.

| Zone | Base commune = candidat PR #10 | Version P0 retenue |
|---|---|---|
| Arbre `packages` | `ac52c7c667d01e86e178bdb83810c6d5791130cb` | `a1905d67b38540c022e22e933b2daffdd96f58d0` |
| Arbre `apps/worker` | `6116762dc8ce48005a43ae00c2841e575efd4619` | `fbc25eb8ab6e0435e6722deba80ec7a05088aea7` |
| `docs/voice/runtime.md` | `62a6c2a60fe88f16aaa5719263f3efb2fc049bb7` | `1540111e8c22f955ec663fe7d413a07b81469f02` |

Les trois pages légales sont déjà strictement identiques dans le candidat et P0 : `pilote.html` = `e0900190924abd3ab6313b3a324fd01c4ffe65f4`, `conditions-pilote.html` = `db0380a5f754c3bb42bb6e163ad42047befb1aba`, `confidentialite-pilote.html` = `7342fa5ecb722754be3fc7cb47170c4bfc31ff7c`. Elles ne sont pas réécrites.

Le seul fichier commun modifié de part et d'autre, `.env.example`, conserve tous les ajouts V1 et ses fins de ligne. Trois lignes P0 sont ajoutées après `AI_CHAT_REASONING_EFFORT=`. Le nouveau blob vérifié vaut `f2c9e6578af6e3a5054dfd8b7a99aa6df6668e54`. `VOICE_PLANNER_MEDIUM_BUSINESS_ID` reste vide : aucune activation pilote, aucun changement des variables d'environnement réelles.

L'intégration conserve les deux historiques via un commit à deux parents. Les branches PR #6 à #13 et `main` ne sont ni déplacées ni fusionnées ; seule la branche isolée de cette PR reçoit les changements. Aucune migration de schéma ou dépendance n'est ajoutée.

## Validation et limites

- Vérification des objets Git, des différences P0 et de la politique CSRF : effectuée.
- CI complète du candidat intégré : à vérifier sur le SHA exact après publication. Ne pas réutiliser un PASS d'un SHA antérieur.
- Stack complète locale : non exécutée dans le conteneur de ce chat, sans Docker ni accès réseau. La CI dispose de sa stack isolée PostgreSQL/Redis/Next/Playwright.
- Parité visuelle, OAuth derrière le domaine unique, téléphonie du nouveau build et disponibilité française Voix+SMS : non requalifiées par ce lot.
- Les manifestes de parité présents dans la PR #10 ne doivent pas être confondus avec une preuve de validation finale ; le rapport final annoncé reste à compléter.
- Le proxy expérimental et `/dashboard` restent limités au staging selon leurs gardes existants. Aucune bascule de `receptionist.caleonis.com`.
- Aucun achat, dépôt réglementaire, appel, SMS, email, paiement ni accès aux contenus clients. Les produits EUR et achats de numéros ne sont pas activés.

## Suite après CI verte

Conserver la preuve CI du SHA intégré ; contrôler les écarts visuels restants et les manifestes ; répéter le routage unifié en staging avec auth et callbacks ; puis préparer un lot séparé pour la sélection de capacités Voix/SMS et les dossiers de numérotation européens. L'autorisation technique d'une API ou l'exemple d'un autre SaaS n'établit pas à lui seul les droits contractuels applicables au compte Caléonis. Aucun second fournisseur n'est introduit.
