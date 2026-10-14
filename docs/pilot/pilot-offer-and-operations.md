# P1 indépendant — offre pilote, coûts et exploitation

Préparation du 14 octobre 2026 pour **1 à 3 entreprises**. Document exploitable à valider ; aucun prix activé, checkout, achat, publication de widget ou changement DNS effectué. La téléphonie réelle et les intégrations externes restent soumises à la qualification P0. Aucun chantier P2 n'est lancé par ce document.

## Offre proposée à valider

**Pilote accompagné pendant 30 jours : 99 € par entreprise**, régime de TVA à confirmer avec l'exploitant EI MrManiac. Installation initiale, configuration d'une réceptionniste, recette de prise de messages et agenda interne, deux points de suivi inclus. Aucune reconduction automatique. Le bon de commande définit le début du pilote après réception des prérequis ; aucune facturation réelle n'est autorisée par ce projet.

Ce prix est une proposition commerciale, indépendante des plans techniques du fork. Le compte reste `managedPilot` sur le régime technique sans abonnement ; le checkout est bloqué côté domaine et interface. Toute extension payante, facture, numéro ou changement fournisseur exige une autorisation distincte. Le pilote ne promet ni permanence humaine 24 h/24, ni appel téléphonique disponible avant test PSTN réel.

| Limite actuellement portée par le code `free_cloud` | Périmètre exact du pilote |
| --- | --- |
| Voix : 1 800 secondes | **30 minutes par mois calendaire UTC et par entreprise**, partagées entre canaux voix facturables ; ce n'est pas 30 minutes par utilisateur |
| Chat IA : 5 unités | Le compteur réserve une unité par conversation (`chat:<conversationId>`), malgré son nom interne « tokens » ; **ne pas vendre du chat illimité** |
| Connaissances : 25 MiB | Éviter les gros documents ; sélectionner les FAQ réellement utiles |
| Numéros inclus : 0 | Téléphonie exclue du prix tant que le montage et le coût ne sont pas acceptés |
| Dépassements facturables : faux | Pas d'augmentation automatique de quota ; expliquer le refus de service quand le quota est épuisé |
| Catalogue SMS : 10 segments, transferts : 2 tentatives | Capacités de catalogue non promises dans le pilote, aucun fournisseur réel testé/autorisé ici |

La période contractuelle de 30 jours peut traverser deux mois : vérifier les bornes de la période affichée dans le tableau de bord, puis les inscrire dans le bon de commande. Ne pas annoncer un quota glissant ni modifier la facturation pour le simuler. Les démos prospect explicitement non facturables ont leurs propres protections d'accès/rate limit ; elles ne doivent pas devenir un contournement du quota pilote.

## Capacités qualifiées et dépendances

| Capacité | État et preuve |
| --- | --- |
| Accès entreprise sans administration globale | PASS en base isolée : propriétaire du seul locataire, plateforme `operator`, invitation privée à usage unique ; réception finale du déploiement à confirmer |
| Contacts, message enregistré, isolation et rollback | PASS PostgreSQL avec rôle runtime, tests d'injection inter-tenant et de collision de numéro |
| Rendez-vous interne et protection contre double réservation | PASS PostgreSQL ; aucune réservation Google n'est présumée |
| Consentement Web avant micro, refus et audit | PASS tests API/hook + navigateur local ; audit réel en base isolée |
| Rôles sur édition entreprise et FAQ | Correctifs d'autorité serveur + régressions API ; contrôler leur déploiement avant invitation de vrais clients |
| Voix Web live, audio S3 et résumé | Fonctionnels dans la version production précédente selon les preuves du chantier ; nouvelle version à retester après déploiement |
| Notification email reçue, OAuth Google et événement externe | BLOCKED pour la recette fournisseur réelle ; tâche en attente ≠ livraison |
| PSTN français, renvoi et annonce/refus audible | BLOCKED dossier/réglementation/achat autorisé/appel réel |
| Textes légaux et durées effectives | BLOCKED validation humaine et preuve des sweeps/copies fournisseurs ; le test reste fictif avant réception |
| Sauvegardes programmées et reprise des jobs | Code et tests du chantier P0 ; utiliser les preuves/health du déploiement, pas ce document, pour déclarer la production opérationnelle |

Référence des contrôles et réserves : [qualification des actions P0](./actions-qualification.md) et [dossier légal](./legal/README.md).

## Coûts : tarifs officiels et variables à mesurer

Tarifs consultés le 14 octobre 2026, exprimés en USD sauf mention différente. Les taxes, crédits, change et suppléments de contrat ne sont pas supposés connus.

| Poste | Base de calcul | Source |
| --- | --- | --- |
| GPT-Live 1 | **0,05 USD/min**, facturation à la seconde ; délégation modèle/outils séparée | [OpenAI GPT-Live 1](https://developers.openai.com/api/docs/models/gpt-live-1) |
| GPT-6 Luna Standard, contexte court | **0,10 USD / million de tokens entrants**, **0,50 USD / million sortants** ; compter les tokens de raisonnement facturés | [OpenAI GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna) |
| Railway | RAM **10 USD/Go/mois**, CPU **20 USD/vCPU/mois**, egress **0,05 USD/Go**, volume **0,15 USD/Go/mois** ; minimum Hobby 5 USD ou Pro 20 USD imputé à la consommation, pas ajouté une seconde fois | [Railway pricing](https://docs.railway.com/pricing) |
| Bucket Railway | **0,015 USD/Go-mois**, accumulation de l'ensemble du workspace arrondie au Go-mois supérieur ; opérations S3 et egress du bucket gratuits, upload depuis le worker soumis à l'egress du service | [Railway bucket billing](https://docs.railway.com/storage-buckets/billing) |
| Twilio Elastic SIP France, seulement si activé | Entrant local **0,006 USD/min**, numéro indicatif **1,35 USD/mois** ; titulaire/conformité et devis final encore à valider | [Twilio Elastic SIP France](https://www.twilio.com/en-us/sip-trunking/pricing/fr) |
| Autres postes | Volume réellement facturé, CPU/RAM des captures, snapshots, email, ingestion/embeddings, frais de paiement, temps de support, taxes et change : **inconnus tant que non mesurés/contractualisés** | Factures et métriques des services effectivement utilisés |

Ne pas appliquer au trunk le prix Programmable Voice d'un autre parcours. Ne pas inclure les options Twilio enregistrement/stockage si elles ne sont pas activées : l'audio du parcours actuel vient d'OpenAI/S3. Un transfert téléphonique peut ajouter un deuxième segment d'appel et doit être chiffré séparément.

Formule voix Web par entreprise, hors hébergement et autres postes :

`C_USD = 0,05 × minutes + 0,10 × tokens_input / 1 000 000 + 0,50 × tokens_output / 1 000 000`.

Exemple **hypothétique**, non mesuré : 30 minutes, 1 million de tokens entrants, 100 000 sortants au total, résumés compris → **1,50 + 0,10 + 0,05 = 1,65 USD**. Trois entreprises dans ce même scénario → **4,95 USD**, hors hébergement/stockage/support. Si le modèle, le tier, le contexte ou les tokens réels diffèrent, recalculer. Les remises de cache ne sont pas supposées acquises. Ne pas inventer un coût nul lorsque le compteur du fournisseur est absent.

Pour un futur numéro SIP français accepté : `1,35 + 30 × 0,006 = 1,53 USD` de référence numéro/entrant, soit **3,18 USD** avec l'exemple IA ci-dessus, hors transferts/renvoi opérateur, taxes et autres frais. Ceci n'est ni une autorisation d'achat, ni un prix commercial du numéro, ni une preuve de droit à le sous-attribuer.

### Sensibilité du prix proposé

Hypothèses de gestion pour comparer, **pas une facture ni un taux de change actuel** : prix 99 €/pilote, conversion de simulation 0,95 €/USD, 2 h de préparation/support à 30 €/h = 60 € par entreprise ; coût IA de l'exemple 1,65 USD. `H` désigne le coût mensuel partagé complet à renseigner depuis Railway/S3. Les autres coûts inconnus restent à ajouter.

| H partagé | Pilotes | IA + part H par entreprise, en € | Contribution après 60 € de travail | Part du prix restant |
| --- | ---: | ---: | ---: | ---: |
| 20 USD | 1 | 20,57 | 18,43 | 18,6 % |
| 20 USD | 3 | 7,90 | 31,10 | 31,4 % |
| 60 USD | 1 | 58,57 | -19,57 | -19,8 % |
| 60 USD | 3 | 20,57 | 18,43 | 18,6 % |
| 120 USD | 3 | 39,57 | -0,57 | -0,6 % |

Ce sont des contributions illustratives avant frais supplémentaires, fiscalité et marge d'incident. Un pilote accompagné n'est rentable que si le temps humain et l'infrastructure restent maîtrisés. Relever le prix, réduire l'accompagnement ou revoir le périmètre après mesure ; ne pas promettre une marge de 90 % sur la seule dépense IA.

## Sauvegardes : amélioration validée et limites avant ouverture

Le format **v2** garde un dump PostgreSQL et un manifeste chiffré par génération. Les objets S3 sont compressés avec gzip avant chiffrement et stockés une seule fois par contenu et clé de récupération ; une génération suivante réutilise les mêmes blobs après vérification de leur empreinte chiffrée. **Les WAV originaux sont conservés sans transformation.** La restauration vérifie le chiffrement, limite la décompression, puis contrôle taille et SHA256 des octets originaux. Les sauvegardes v1 restent lisibles. Les correspondances vers les clés d'objets source sont dans le manifeste chiffré, jamais dans le reçu en clair ; seule une clé publique SPKI est admise sur le serveur.

Le plafond de stockage est **512 MiB au maximum**, pour tout le préfixe généré : contrôles de tentative, blobs et métadonnées, dumps, manifestes et reçus. Tous les uploads du scheduler suivent ce budget sous verrou PostgreSQL ; sa réserve de contrôle de 64 KiB est incluse dans le plafond. Le garde-fou de volume source reste distinct : **256 MiB bruts par défaut, configurable jusqu'à 1 GiB**, **64 MiB par fichier/dump** et **1 000 objets**. L'opérateur prépare une limite source de 1 GiB pour le déploiement ; vérifier la valeur réellement active avant l'ouvrir aux pilotes. Cela n'augmente pas le plafond de stockage de 512 MiB. Au plafond, la nouvelle capture échoue et les copies conservées restent présentes ; la fraîcheur de reprise ne doit plus être déclarée PASS.

Le code protège les **sept dernières générations complètes**. Les anciennes générations de plus de sept jours ne sont supprimables qu'avec l'opt-in approuvé. Un blob partagé reste conservé tant qu'un reçu retenu le référence ; ensuite une nouvelle période de grâce de sept jours commence. Une nouvelle référence remet ce délai à zéro. Les anciennes copies v1 et les sauvegardes manuelles restent à inventorier. L'effacement éventuel de ces copies n'est pas une suppression des originaux de production.

**Mesures réelles du 14 octobre, sur les sept objets archivés :** **53 395 508 octets** source compressés en **27 573 339 octets** avant enveloppes, soit environ **48,4 % de réduction**. La première génération v2 a écrit **27 643 352 octets** ; la seconde a réutilisé les sept blobs et ajouté **523 008 octets**, pour un total de **28 166 360 octets** (26,86 MiB). Les huit fichiers de chaque génération ont été déchiffrés et vérifiés, et une restauration PostgreSQL isolée est documentée dans le [runbook de durabilité](../operations/pilot-durability.md). Ces résultats valident le corpus du test ; ils ne prouvent pas encore un cycle du scheduler en production ni le taux de compression de nouveaux appels.

La preuve locale `urgent-demo-audit/widget-call-persistence-evidence.json` associe le dernier appel à **127 secondes fournisseur** et **12 230 444 octets WAV** (le WAV de 14 956 844 octets correspond à un autre appel de 155 secondes). Il donne environ **5,51 MiB/min bruts**. À ce format, 30 minutes cumulées représentent **165 MiB par entreprise**, 90 minutes pour trois entreprises **496 MiB bruts**, avant DB et corpus existant. Avec le ratio de compression mesuré, ces 90 minutes correspondraient à environ **256 MiB de nouveaux blobs** : **projection**, pas capacité garantie. Les sept générations ne multiplient plus par sept les mêmes fichiers inchangés. La garde source par défaut de 256 MiB resterait toutefois bloquante avant gzip ; la configuration active et la taille de chaque fichier doivent être vérifiées. Le Web utilise cinq minutes par appel par défaut, à confirmer avec `WEB_CALL_MAX_DURATION_MS` ; aucun appel unique de 30 minutes n'est annoncé comme sauvegardable sous le plafond de 64 MiB.

Avant usage réel : relever taille DB+objets bruts, empreinte de tout le préfixe généré, anciennes copies, croissance par minute et espace restant ; rapprocher ces chiffres des quotas vendus. Le quota de 3 × 30 minutes ne garantit pas une capacité de sauvegarde durable sur plusieurs semaines : rétention, nouveaux fichiers et compression changent le volume. Au seuil de surveillance proposé de 50 % (256 MiB sauvegardes cumulées), préparer un choix chiffré de capacité ou de conservation ; à 80 %, ne pas étendre le volume pilote sans décision. Pour `BACKUP_BLOB_METADATA_MISSING`, appliquer la réparation hors ligne vérifiée du runbook : ne pas écraser aveuglément le blob. Aucun plafond payant n'est relevé et aucun audio n'est supprimé par cette préparation.

Exploitation : vérifier quotidiennement les routes worker `/health/live`, `/health/ready` et `/health/backup` via le réseau/canal autorisé. La santé des sauvegardes exige un succès de moins de **26 heures** sans erreur ; conserver le reçu, ses empreintes et un test de restauration isolé. Le scheduler vise une nouvelle copie toutes les 24 h, contrôlé toutes les 15 min, avec un intervalle minimum de 6 h entre tentatives. Aucune garantie RPO/RTO n'est vendue avant un cycle réussi avec un volume représentatif.

## Installation accompagnée et réception

1. **Avant création** : choisir 1 à 3 entreprises, vérifier identité du propriétaire et canal privé, définir périmètre/contact humain, signer la version humaine validée des conditions et durées. Ne pas envoyer de données réelles dans l'essai non qualifié.
2. **Compte** : provisionner en preview puis appliquer après contrôle ; remettre le lien privé via le canal convenu. Le secret est en fragment URL, a une durée de 48 h et un seul usage. Aucun mot de passe n'est choisi par l'opérateur à la place du client ; le client l'établit à l'activation. Révoquer/réémettre une invitation uniquement après nouveau contrôle du destinataire.
3. **Entreprise** : confirmer nom commercial, fuseau Europe/Paris, propriétaire/admin/scheduler/viewer, services et durées, horaires/fermetures, 10 à 20 FAQ prioritaires et consigne de remontée à une personne.
4. **Agent** : publier le snapshot contrôlé. Tester une question connue, inconnue, fermeture, demande de message avec callback et demande de rendez-vous ; vérifier la différence demande/confirmation et absence de promesse de livraison.
5. **Données** : vérifier que le message/contact/rendez-vous apparaît dans le bon espace et qu'un deuxième pilote ne peut pas le lire. Contrôler lecture autorisée S3, consentement et refus Web, politique de conservation effective et dernier reçu de sauvegarde.
6. **Canaux externes** : email, Google et téléphone ne sont cochés PASS qu'après un résultat réel. Pour PSTN, conserver preuve d'appel entrant puis renvoi et information initiale audible, avec un numéro légalement utilisable. Sinon la fiche porte BLOCKED et le pilote reste Web limité.
7. **Procès-verbal** : noter version/commit et déploiement, locataire, cas testés, identifiants techniques non sensibles, résultat et réserves, quota restant et moyen d'arrêt. Le Client reçoit seulement son accès et sa documentation, pas les secrets d'exploitation.

## Widget corporate préparé, sans activation

Source statique disponible inspectée : `audit-twilio/vercel-corporate-source/public/index.html` et pages `solutions/`, `contact/`, `mentions-legales/`, `confidentialite/`. Le site est distinct de l'app SaaS. Le loader du dépôt attend `data-widget-key` et `data-base-url`. Aucune clé effective n'est copiée et aucune page corporate n'est modifiée ici.

Origines candidates exactes : **https://caleonis.com** et **https://www.caleonis.com**. La copie de l'accueil disponible référence encore `caleonis-corporate.vercel.app`, tandis que `audit-twilio/legal-staged-mentions.html` référence `www.caleonis.com` : ces copies ne suffisent pas à établir l'origine publique actuelle. Vérifier la redirection effective avant de n'autoriser que les origines nécessaires. Éviter `*`, les URLs avec chemin et les previews non approuvées. Créer, ultérieurement, une clé distincte du locataire commercial Caléonis pour le corporate ; ne pas réutiliser la clé d'une entreprise pilote.

Fragment prêt à compléter dans une version locale/revue, près de la fin du `body` :

```html
<script
  src="https://receptionist.caleonis.com/embed.js"
  data-base-url="https://receptionist.caleonis.com"
  data-widget-key="REMPLACER_PAR_LA_CLE_PUBLIQUE_DU_LOCATAIRE_CORPORATE"
  data-locale="fr"
  data-position="bottom-right"
  data-color="#0f766e"
  defer>
</script>
```

Le placeholder est intentionnel : la clé n'est créée qu'après la qualification et l'autorisation de mise en ligne applicables. En recette protégée : valider iframe, chat, choix d'enregistrement, refus sans micro, voix si opt-in disponible, origines refusées, mobile, CSP et quota. Rollback : retirer le fragment et désactiver la clé concernée ; le reste du site et les clients restent indépendants. Préparer un lien de démo prospect révocable et limité depuis le dashboard, plutôt que diffuser un lien secret dans des analytics ou une page indexable.

## Exploitation et support pendant le pilote

- **Chaque jour** : santé admin/worker et stockage, backup frais, reprises/outbox/dead letters, erreurs d'actions, minutes/chat/stockage consommés, coûts réellement remontés et volume WAV. Les reçus et alertes sont vérifiés par l'opérateur tant qu'aucune notification d'incident externe n'a été reçue en test.
- **Échec action** : vérifier tâche/agenda avant retry ; l'assistant doit annoncer « non effectué » si le backend échoue. Ne pas rejouer aveuglément un email, achat, paiement ou SMS.
- **Incident** : limiter le canal défaillant, informer le contact pilote par le moyen autorisé, préserver les preuves sans contenu de conversation dans les logs, puis restaurer sur environnement isolé avant toute migration/restauration destructive de production approuvée.
- **Support proposé à valider** : contact@caleonis.com, jours ouvrés 09 h–18 h Europe/Paris, prise en charge cible sous un jour ouvré. Aucune astreinte 24 h/24 promise ; prévoir le numéro humain réel du Client pour les demandes urgentes.
- **Clôture** : export demandé, bilan des messages/rendez-vous utiles et des échecs, coûts et temps humain, décision explicite de poursuite ou arrêt, traitement des données/copies selon la convention. Ni reconduction payante ni rétention effacée sans accord/conditions validées.

Décisions à faire approuver sur une version concrète : prix et régime TVA, entreprises/destinataires, textes/durées, fenêtre de support, coûts plafonnés, capacité de sauvegarde représentative, fournisseurs activés et publication du widget. Les tests et documents ci-dessus restent consultables en attendant ces décisions.
