# Invitation privée de 1 à 3 entreprises pilotes

Ce parcours prépare un accès propriétaire limité à sa propre entreprise, sans inscription publique, fournisseur email, abonnement payant ou achat téléphonique. Le pilote définit son mot de passe après réception d'un lien privé. Le compte ne contient aucun identifiant de connexion avant activation.

## Préparation opérateur

Vérifier humainement l'identité du contact et son canal de remise privé. Préparer les informations de l'entreprise, les services, les horaires, la base de connaissances et les limites du pilote. Aucun lien ne doit être transmis à un autre destinataire que le contact vérifié.

Utiliser les connexions PostgreSQL dédiées `lobbystack_auth` et `lobbystack_app` (`LOBBYSTACK_AUTH_DATABASE_URL` et `LOBBYSTACK_APP_DATABASE_URL`, ou leurs mots de passe dérivés de `DATABASE_URL`). L'outil refuse les rôles privilégiés. `APP_BASE_URL` doit être l'adresse HTTPS du service.

La commande affiche d'abord une prévisualisation, sans écrire en base :

```powershell
pnpm exec tsx --tsconfig scripts/tsconfig.json scripts/pilot-onboarding.ts --email "contact@example.fr" --name "Contact pilote" --business-name "Entreprise pilote"
```

Ajouter `--apply --contact-verified` uniquement après vérification du contact. L'outil crée un compte **operator** et un rôle **business_owner** pour cette entreprise, sans rôle **platform_admin**. L'espace utilise le parcours pilote accompagné et ouvre les réglages existants, sans passage obligatoire par un achat de numéro ou un paiement. Le paramètre `--locale fr` est le défaut ; `--timezone Europe/Paris` est configurable.

Le résultat affiche uniquement les identifiants, l'expiration, le SHA256 du jeton et le chemin d'un fichier secret ignoré par Git dans `.prospect-demos/pilot-<userId>-<generation>.json`. Le hash ne permet pas d'utiliser le lien. Le lien d'activation reste dans ce fichier, jamais dans la sortie de la commande. Le fichier est créé exclusivement et protégé avant écriture : permissions POSIX 0600 ou ACL Windows limitée au compte opérateur. Vérifier également les accès au dossier privé avant la remise.

## Activation du pilote

Remettre au contact vérifié le champ `activationUrl` du fichier secret par son canal privé. Le secret est dans le fragment de l'URL, donc absent des requêtes HTTP et des journaux d'accès, et retiré de l'historique par l'écran. Ne pas publier ce lien ni l'ajouter aux preuves ou tickets de support.

Le lien expire après **48 heures**. Le pilote choisit et confirme son mot de passe ; une transaction unique consomme le lien, crée la première authentification par mot de passe et marque l'adresse vérifiée sur la base de la remise privée effectuée par l'opérateur. Ensuite il se connecte normalement. Aucun email n'est envoyé par ce parcours. Ce dispositif ne remplace pas la configuration ultérieure d'un service email pour les notifications et la récupération autonome des comptes.

Une deuxième activation, y compris concurrente, est refusée. Un lien expiré ne crée aucun mot de passe. Ce parcours refuse toute réinitialisation ou prise de contrôle d'un compte existant : utiliser le dispositif de récupération prévu pour celui-ci.

## Réémission et révocation opérateur

Pour un compte pilote encore **non activé**, revérifier l'identité et le canal privé du contact, puis prévisualiser une réémission :

```powershell
pnpm exec tsx --tsconfig scripts/tsconfig.json scripts/pilot-onboarding.ts --reissue-user-id "UUID-du-compte"
```

Ajouter `--apply --contact-verified` pour remplacer tous ses anciens liens, même expirés, par un nouveau lien valable 48 heures. La sortie contient son hash et le chemin d'un **nouveau** fichier privé ; les anciens fichiers restent conservés, mais leurs liens sont refusés. Reprendre le champ `activationUrl` du dernier fichier pour la remise privée. Le compte, l'entreprise et les réglages existants sont préservés.

Pour invalider les liens sans en créer un nouveau :

```powershell
pnpm exec tsx --tsconfig scripts/tsconfig.json scripts/pilot-onboarding.ts --revoke-user-id "UUID-du-compte" --apply --contact-verified
```

Cette action ne supprime pas le compte ou les données de l'entreprise et ne définit aucun mot de passe. Une réémission ultérieure reste possible. Les deux commandes refusent les comptes déjà activés, dotés d'une authentification existante ou ne relevant pas d'un pilote géré propriétaire de son espace. Elles ne sont pas exposées dans une API publique.

Un même verrou PostgreSQL par compte protège activation, réémission et révocation : deux réémissions concurrentes laissent un seul lien valide ; une activation concurrente gagne avant la réémission, ou l'ancien lien devient invalide. Le mot de passe d'un compte actif n'est jamais remplacé par ces opérations.

## Validation avant remise

- Connexion réelle du propriétaire à son espace et vérification des services, FAQ et horaires.
- Essai voix avec stockage du contact/message ou du rendez-vous, puis lecture dans l'espace approprié.
- Contrôle de l'isolement avec un second compte pilote : aucune donnée de l'autre entreprise accessible.
- Activation email ou canal de notification explicitement convenu ; ne pas promettre d'envoi si aucun prestataire n'est configuré.
- Validation humaine des textes contractuels et de confidentialité ; information IA/enregistrement au début de l'appel.
- Téléphonie réelle et renvoi restent une validation séparée ; l'activation du compte ne les déclare pas fonctionnels.

Les entreprises pilotes portent un indicateur `managed_pilot` séparé, que les formulaires et API clients ne peuvent pas modifier. Le paiement autonome est masqué et la création de checkout est refusée côté serveur. Il faut une validation commerciale distincte avant de retirer ce statut dans un changement opérateur contrôlé.

Tout compte membre d'une entreprise pilote gérée est aussi empêché de créer un espace autonome supplémentaire, sur la base de ses memberships réelles. Il ne peut ainsi multiplier les quotas ou ouvrir un checkout en créant un second espace sans l'indicateur pilote. Le provisioning opérateur reste un parcours distinct pour les entreprises explicitement retenues.

Les limites commerciales et de consommation restent celles du service existant : sans abonnement, le forfait `free_cloud` offre **30 minutes de voix par mois et par entreprise**, **25 Mio de connaissances** et **aucun numéro dédié**. Le pilote accompagné conserve ces plafonds ; il ne devient pas un forfait illimité. Avant remise à une entreprise ayant déjà consommé ces 30 minutes, définir et valider une allocation pilote contrôlée plutôt que supprimer les garde-fous. Aucune telle allocation supplémentaire n'est activée par cet outil.

Le parcours ne crée aucun abonnement fournisseur ni facturation client. Le statut d'onboarding `complete` signifie accès au tableau de bord dans un accompagnement opérateur ; il ne certifie pas les appels, connaissances, consentements ou notifications tant qu'ils n'ont pas été testés.

## Preuves automatiques

`pilotActivation.integration.test.ts` vérifie les rôles PostgreSQL, trois entreprises isolées, l'absence de mot de passe avant activation, le secret haché, l'expiration, l'activation concurrente unique, l'interdiction de récupérer l'invitation d'une autre adresse, la révocation/réémission, l'interdiction de réinitialiser un compte actif et les courses entre opérations. Les tests utilisent une base dédiée nommée `test` et les rôles propres à celle-ci. Aucune remise d'invitation ou email réel n'est faite par les tests.

`replacement-pilot-onboarding-check.ts` exerce également les commandes opérateur réelles et le serveur HTTP : connexion avec mot de passe, tableau de bord, refus des écritures entre entreprises et rejet d'identifiants ou du statut pilote injectés dans le JSON. Les fichiers secrets temporaires et les comptes fictifs sont supprimés après ce contrôle.
