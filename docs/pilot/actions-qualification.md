# P0 — qualification actions et information voix

État du 14 octobre 2026 : code préparé sur la branche pilote contrôlée ; les preuves ci-dessous concernent le code local et une base PostgreSQL dédiée restaurée. Elles ne remplacent pas le contrôle du déploiement final ni un appel téléphonique réel.

## Réalisé

- Prise de message : contact, note opérateur, tâche inbox et notifications sont dans une transaction du locataire. Un échec de stockage ne laisse pas un contact/note/alerte partiellement validé. La voix confirme le résultat `ok`, jamais une opération non exécutée.
- Contact : identité connue préservée, callback d'un contact anonyme enrichi, numéro déclaré via widget jamais relié à l'historique d'une autre personne. Une collision d'unicité conserve le numéro de rappel dans la tâche et ne détruit pas le message.
- Demande de rendez-vous distincte d'une réservation confirmée. Le rendez-vous confirmé est enregistré dans l'agenda interne ; l'outil précise que les notifications sont en attente et ne prouve pas un événement Google Calendar.
- Agent et modèle voix : consignes communes interdisant les promesses d'email/SMS/rappel/transfert/réservation sans résultat fournisseur ou outil correspondant.
- Voix Web : accord explicite à chaque appel avant `getUserMedia`; refus sans microphone ni création de session, chat conservé dans le widget. L'API refuse un accord absent, faux, converti en chaîne ou une version obsolète. La version et la décision acceptée sont enregistrées avec l'appel dans l'audit du locataire.
- Textes juridiques et annonce IA/enregistrement : [dossier de validation humaine](./legal/README.md). Ils restent en projet.

## Preuves PASS

| Contrôle | Résultat |
| --- | --- |
| Agent instructions et outils (tests sans fournisseur) | 15 tests PASS |
| Domaine : actions et lifecycle Live existant | 19 tests PASS |
| API session Web et hook avant microphone | 27 tests PASS |
| API modification FAQ : identité serveur et tentative d'injection JSON | 12 tests PASS |
| PostgreSQL final : actions, audit consentement, contacts, rollback, déduplication et agenda backfill interne | **11/11 tests PASS**, 2 fichiers, 150,79 s ; fixtures annulées après chaque scénario |
| Typecheck domaine et agent | PASS |
| Typecheck admin | PASS |
| Landing : vérification Astro | 222 fichiers, 0 erreur / 0 avertissement |
| Navigateur local `/fr/essai` | Modal avant micro, focus refus, refus → état au repos PASS |
| Next MCP après interaction | `configErrors: []`, `sessionErrors: []` |

Fichiers de tests reproductibles : `packages/domain/src/server/receptionistActions.integration.test.ts`, `packages/domain/src/server/calendar.integration.test.ts`, `apps/admin/app/api/voice/live/session/route.test.ts`, `apps/admin/src/components/web-voice/useWebVoiceCall.test.tsx`. Les intégrations exigent une URL explicitement locale vers une base nommée test ; elles ne lisent jamais une URL production. Avec un tunnel distant, utiliser un timeout de 60 secondes et éviter le parallélisme des fichiers.

Captures de QA conservées hors du dépôt dans `C:\Users\willg\Documents\ChatGPT\Caleonis Hub\pilot-execution\consent-before-microphone.png` et `consent-refused-no-call.png`. Aucune clé fournisseur ni session facturable n'a été utilisée pour cette QA.

## BLOCKED / validations encore nécessaires

- Réception et lecture d'un email réel : aucune émission autorisée par cette passe de tests. Une ligne de notification `pending` et un outbox ne constituent pas une livraison.
- OAuth Google Calendar et création/lecture d'un événement dans le compte du Client : non testés sur un fournisseur réel. Le test de backfill porte sur la base et les tâches.
- PSTN français, annonce initiale réellement audible, refus de l'enregistrement et renvoi : non validés sans numéro/appel réel et montage réglementaire autorisé.
- Conservation/effacement effectifs sur S3, PostgreSQL, sauvegardes et copies OpenAI : paramètres et sweeps à vérifier avec les preuves d'exploitation. La notice UI ne promet pas une suppression app à 30/90 jours non vérifiée.
- Contrat, notice complète, durées, prestataires et transfert de données : validation humaine requise. L'essai UI reste réservé aux informations fictives avant cette qualification.

La notice indique la disponibilité des enregistrements stockés chez le fournisseur pendant 30 jours, conforme à la [documentation officielle GPT-Live sur les sessions stockées](https://developers.openai.com/api/docs/guides/live-conversations). Ce délai d'accès n'est pas annoncé comme preuve d'effacement de toutes les copies. Le stockage `store: true` existant est conservé ; le refus Web empêche la session entière. Un arrêt d'échange n'est pas une preuve d'effacement des copies déjà collectées.
