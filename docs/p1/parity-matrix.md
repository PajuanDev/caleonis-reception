# Caléonis Receptionist V1 — matrice de parité et qualification

Établie le 15 octobre 2026. Base vérifiée : `e8e23bae4955f64fa3f99cb525faad908439077e`, déployée avec succès sur les services Railway admin et worker. Cette passe n'utilise ni ne modifie les données de production.

La présence de code, d'une route ou d'un test ne prouve pas l'activation d'une capacité chez un client. **PASS** désigne une preuve dans le périmètre indiqué ; **FIXED** un changement P1 à qualifier ; **BLOCKED** une dépendance d'activation ou de validation ; **NOT_TESTED** l'absence de preuve E2E de cette passe. Aucune équivalence commerciale intégrale n'est revendiquée.

## Références

- Site de référence consulté : [accueil LobbyStack](https://lobbystack.com/) et [fonctionnalités](https://lobbystack.com/features/), 15 octobre 2026. Le site vivant peut annoncer davantage que le fork figé ; une promesse sur ce site ne suffit pas à conclure que le fork la contient.
- Guides de référence : [index public de l'aide](https://docs.lobbystack.com/llms.txt).
- Référence UI figée dans le dépôt : `98df89901f1dca22b8c96ccf9509a8cd549f2eb9`, `docs/validation/admin-ui-parity.json`. L'inventaire historique exclut les captures de Messages et Widget ; il ne certifie donc pas ces écrans.
- Preuves P0 personnelles préexistantes, relues sans rejouer les opérations : `../pstn-completion-2026-10-15/resultat-pilote-pour-william.txt` et `second-personal-call-root-acceptance-current.json` dans le workspace parent. Elles ne sont pas des tests E2E P1 et ne contiennent pas de certification médicale.
- Licence : [MIT](../../LICENSE), copyright « LobbyStack contributors », inchangée. Les noms de packages internes restent inchangés.

## Application : annoncé / implémenté / activé / preuve

| Parcours V1 | Implémentation du fork, preuve de code | Activation pilote connue | Preuve et statut avant vérifications finales P1 |
| --- | --- | --- | --- |
| Navigation du dashboard | `apps/admin/src/components/dashboard-shell.tsx`, locales `nav.json` | Pages existantes ; Messages masqué hors de sa propre route | **FIXED** : suppression du masquage lié au pathname ; aucun nouveau groupe Canaux ni système multi-agents |
| Messages / inbox | `/messages`, `live-messages-surface.tsx`, `/api/messages`, `conversations.ts` | Conversations SMS et web_chat présentes dans le modèle ; utilisation dépend du canal | **FIXED** : entrée permanente, état Voice-only ; E2E de lecture/réponse à qualifier |
| SMS entrant/sortant manuel | `sms.ts`, webhook Twilio SMS, `smsConsent.test.ts` | **Non activé** pour le numéro pilote Voice-only | **BLOCKED** pour un SMS réel : émetteur compatible et consentement requis ; aucun envoi de cette passe |
| Réponses IA par SMS | Manifeste `replacement-parity.json` : `billing.ai_sms` explicitement exclu | Non disponible | **BLOCKED** : ne pas présenter comme V1 activée ; conserver la distinction avec réponse humaine |
| Appels téléphoniques entrants | `apps/worker/src`, `packages/agent-core`, webhook OpenAI Live | Numéro français pilote +33 9 73 92 11 52 | **PASS P0 hérité**, deux appels personnels ; aucun nouvel appel payant P1 |
| Voix depuis navigateur | `web-voice/useWebVoiceCall.ts`, `/api/voice/live/session` et tests | Configurée historiquement, soumise consentement et disponibilité provider | **NOT_TESTED P1** avec vrai micro/provider ; tests de politique et route disponibles |
| Transcription et résumé | Détail `/calls/[callId]`, persistance voix et jobs | Deux appels personnels P0 documentés | **PASS P0 hérité** ; aucun contenu d'un tiers lu ou publié |
| Enregistrement privé | Détail appel, contrôle d'accès stockage et consentement web | Lecture personnelle confirmée P0 ; stockage S3 préservé | **PASS P0 hérité** dans son périmètre ; cinq anciens WAV absents restent ouverts |
| Contacts et historique | `/contacts`, `contacts.ts`, `contacts-pagination.e2e.ts` | UI et isolation tenant dans le code | **NOT_TESTED P1 réel** ; tests automatisés du fork à exécuter |
| Google Calendar : disponibilité / réservation | `booking.ts`, `calendar.ts`, provider Google, tests | Agenda TEST connecté ; rendez-vous personnel vocal confirmé chez Google | **PASS P0 hérité** pour réservation TEST ; aucune nouvelle réservation P1 |
| Connexion Google durable | OAuth Google start/callback et stockage chiffré | Projet Google en Testing au dernier relevé P0, durée de consentement à traiter | **BLOCKED** qualification durable ; session P0 propriétaire de ce travail |
| Déplacer / annuler un rendez-vous | `appointmentChanges.ts`, outils agent et audits | Politiques de vérification configurables | **NOT_TESTED P1 fournisseur réel** ; ne pas confondre réservation validée et changements validés |
| Transfert vers humain | Outil `transferCall`, politique snapshot, provider téléphonie | Trunk pilote `disable-all`, cible/consentement non qualifiés | **BLOCKED** : aucun transfert fonctionnel commercial revendiqué |
| Règles de comportement | `/agent/rules`, `rules.ts`, snapshot de publication | Paramètres du pilote publiés P0 | **NOT_TESTED P1 conversation réelle** ; conserver le moteur et les garde-fous P0 |
| Connaissances : texte et documents | `/agent/knowledge`, `knowledge.ts`, recherche et réindexation | Sources pilote existantes | **NOT_TESTED P1 ingestion réelle** ; tests lifecycle disponibles |
| Import du site web | Import knowledge et contrôles URL/crawl | Dépend du provider et des limites configurées | **NOT_TESTED P1 provider réel** ; pas de collecte tierce supplémentaire |
| Services et créneaux | `/agent/services`, booking et snapshot | Un service de rappel devis de 15 min qualifié P0 | **PASS P0 hérité** pour ce service ; catalogue d'un prospect à vérifier séparément |
| Voix / accueil / langue | Paramètres IA et snapshot, worker Live | Accueil MrManiac entendu au second appel P0 | **PASS P0 hérité** pour cet accueil ; aucun nombre de langues ni latence garantis |
| Widget chat | `/settings/widget`, `/embed/[key]`, `/api/widget/*`, tests clés/politique/chat | Clés créées désactivées ; domaine autorisé et activation nécessaires | **NOT_TESTED P1 provider réel** ; pas de nouvel accès public automatique |
| Widget voix | Widget et politiques de voix web | Dépend de la clé, du consentement et de la config Live | **NOT_TESTED P1 réel** ; aucune promesse d'activation par défaut |
| Équipe et invitations | `/settings/team`, `/api/team`, autorisation opérateur | Rôles et invitations dans le fork | **NOT_TESTED P1 e-mail réel** ; aucune invitation envoyée par cette passe |
| Numéro et renvoi entrant | `/settings/phone-number`, `phoneNumbers.ts` | Numéro unique Voice-only approuvé Twilio | **PASS P0** sur raccordement pilote ; renvoi depuis opérateur client **NOT_TESTED** |
| Achat / remplacement de numéro | Recherche et claim du fork filtrent historiquement voix + SMS | Parcours français Voice-only manuel P0 | **BLOCKED** libre-service FR tant que parcours réglementaire/ownership non qualifié ; aucun achat P1 |
| Intégrations | `/integrations`, Google et chemins API existants | Google TEST seulement prouvé de bout en bout dans le contexte | **NOT_TESTED** autres fournisseurs ; aucune intégration supplémentaire supposée |
| Analytics | `/analytics`, `analytics.ts`, `usage.ts` et tests | Données réelles pilote présentes | **NOT_TESTED P1 données prod** ; estimations d'usage ne sont pas facture fournisseur |
| Coûts et reçu Twilio | Correctif PR9 `call.syncPrice` borné et espacé | Déployé P0 ; prix individuels encore absents au dernier relevé | **PASS P0** mécanisme et compte agrégé ; ne pas transformer l'absence en zéro |
| Facturation / plans | `/settings/plan`, `billing.ts`, accès checkout/portal conditionnels | Aucun tarif Caléonis approuvé ici | **BLOCKED** commercial : prix sur demande, aucun paiement réel ni abonnement créé |
| Affiliation | Route `/affiliate`, domaine et intégrations historiques | Offre Caléonis non validée | **BLOCKED** activation commerciale ; pas de promesse ni de lien d'inscription marketing |
| API et webhooks | `/api/v1/*`, clés, scopes, `publicApi/*.test.ts` et intégration | Nécessitent clés/scopes et endpoint test contrôlé | **NOT_TESTED P1 destination réelle** ; aucun webhook externe envoyé |
| E-mail / alertes opérateur | Outbox et Resend HTTPS PR8, préférences/consentement | E-mail personnel livré/reçu P0 ; choix SMS refusé respecté | **PASS P0 ciblé** ; notifications de réservation non présumées automatiques |
| Appels sortants / relances automatiques | Promesses du site upstream vivant ne suffisent pas à établir la présence du chemin dans cette base | Aucun appel automatique déclenché par le rendez-vous TEST | **NOT_TESTED / NON PROMIS** ; ne pas ajouter de V2 pour combler une promesse marketing |
| Multi-tenant / données privées | Transactions opérateur, rôles PG/RLS, tests `operator-auth.e2e.ts` et fiabilité | Protections P0 préservées | Tests locaux/CI à relire sur SHA P1 ; aucune certification déduite de la simple présence des fichiers |
| Secteur médical | Contenus marketing et documentation d'usage administratif uniquement | Aucune qualification HDS fournie | **BLOCKED** données de santé/garanties médicales ; pas de diagnostic ni d'urgences médicales automatisées |

## Site et aide

Les pages cœur FR/EN du site Astro réutilisent les composants et styles existants. Les anciens articles, comparatifs et textes juridiques ne deviennent pas validés par un remplacement de marque : les éléments non relus doivent rester en source et hors publication commerciale. Les captures doivent provenir de l'application, avec données de démonstration identifiées. Aucune capture artificielle ou capture contenant des données personnelles de prospects n'est admise.

L'aide `mintlify/` est distincte des notes internes `docs/`. Les guides SaaS décrivent une seule IA pour l'entreprise ; les pages développeur/self-host décrivent des composants disponibles dans le dépôt sans promettre leur activation sur le SaaS. L'URL d'aide dans l'application est configurable, car aucun domaine d'aide définitif n'est approuvé.

## Critères de lancement des premiers prospects

- **Go pour une démonstration encadrée** seulement sur les capacités prouvées, avec limites visibles et données fictives ou expressément autorisées.
- **No-Go pour lancement commercial autonome** tant que conditions légales EI, information/choix d'enregistrement, conservation et sous-traitants ne sont pas validés ; clauses Québec et promesses de suppression irréversible héritées à ne pas reprendre comme droit applicable validé.
- Qualifier OAuth Google durable, latence et anomalies historiques d'enregistrements avec la session P0.
- Pour chaque entreprise : montage/ownership téléphonique, renvoi opérateur, accueil, services, horaires, permissions, scénario de secours et consentements à valider.
- Exécuter sur le SHA candidat les contrôles de types, lint, compilation, suites automatisées, isolation PG/RLS et parcours navigateur. Documenter séparément tout test ignoré ou dépendant d'un provider réel.
- Vérifier Messages depuis Accueil et Appels sur desktop/mobile ; Voice-only conserve l'inbox sans bouton d'envoi SMS exploitable.
- Site et aide : liens internes FR/EN, navigation/footer, robots/canonical/hreflang, pages ressources, contenu médical administratif, absence de prix inventés, et lecture responsive.
- Ne publier le domaine dédié, les textes légaux ou les offres qu'après choix explicite de l'exploitant. Prévisualisation privée isolée autorisée ; aucun DNS ni service Railway modifié par P1.

Après livraison P1.1–P1.3, la passe recommandée est **P1.4 commercialisation / suivi d'exploitation / paiements** : finaliser offre et responsabilités, rattacher les preuves P0, approuver tarifs/quotas, qualifier un paiement de test, définir support et surveillance. Cette recommandation ne lance ni P1.4 ni P2.
