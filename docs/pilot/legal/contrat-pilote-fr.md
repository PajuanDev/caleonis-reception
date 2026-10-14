# Convention B2B pilote — Caléonis Receptionist

**Projet du 14 octobre 2026 — à compléter et valider avant signature.**

Entre **William Fabrice GOSSE**, entrepreneur individuel (EI), exerçant sous le nom commercial **MrManiac**, SIREN **929 183 986**, SIRET **929 183 986 00017**, adresse **10 rue Courbet, 59100 Roubaix, France**, contact **contact@caleonis.com**, ci-après le Prestataire ; et `[identité, immatriculation, adresse et signataire du Client À COMPLÉTER]`, ci-après le Client. Les références de vérification de l'identité du Prestataire figurent dans le [dossier de validation](./README.md).

## 1. Service et périmètre

Le Prestataire fournit au Client un espace entreprise protégé Caléonis Receptionist pour l'accueil par assistant IA, les réponses fondées sur les informations validées du Client, la prise de messages, les contacts et l'agenda interne. Les fonctions téléphoniques et intégrations externes ne sont incluses que si elles figurent dans la fiche d'activation signée et si leur test de réception a réussi.

Le pilote concerne une entreprise par espace ; sa durée est `[À COMPLÉTER]`, du `[date]` au `[date]`. La fiche d'activation précise utilisateurs et rôles, site/origines autorisées, horaires, services, FAQ, annonce d'accueil, consentement/enregistrement, transfert vers une personne, numéros détenus par le Client et limites d'usage.

L'IA peut se tromper. Le Client contrôle les consignes et les informations métier, vérifie les demandes importantes et dispose d'un canal humain de secours `[À COMPLÉTER]`. Le service n'est pas un dispositif d'urgence ; une urgence est orientée vers les services appropriés et n'est pas traitée comme un message de suivi ordinaire. Aucune décision engageant juridiquement le Client ou présentant un effet important pour une personne ne doit être entièrement automatisée pendant le pilote.

## 2. Prix, quotas et autorisations

Prix du pilote, devise, TVA applicable, quotas voix/chat/stockage et plafonds fournisseurs : `[À COMPLÉTER dans le bon de commande]`. Aucune facturation réelle, reconduction payante, achat de numéro, consommation supplémentaire au-delà du plafond ni changement de plan fournisseur n'est déclenché par la seule signature de ce projet. Tout engagement financier requiert le bon de commande accepté et l'autorisation opérationnelle appropriée.

La fourniture d'un numéro français, son titulaire et les coûts téléphoniques font l'objet d'un accord distinct conforme aux règles du fournisseur. Le renvoi du numéro existant du Client est testé avec lui. SIP/BYOC ou portabilité impliquent l'éligibilité et la validation des opérateurs ; aucun délai instantané n'est promis.

## 3. Exploitation, réception et fin du pilote

Réception : accès de l'utilisateur entreprise, test d'isolement des locataires, prise de message visible, rendez-vous interne, annonce IA/enregistrement, refus et restauration testée. Une notification en attente n'est pas considérée envoyée ; une demande de rendez-vous n'est pas une réservation confirmée. Les résultats et les blocages figurent dans le procès-verbal du pilote.

Contact public support : **contact@caleonis.com** ; horaires et délai cible de réponse : `[À COMPLÉTER ET ACCEPTER]`. L'objectif de disponibilité, le délai de reprise et la perte de données maximale sont ceux du procès-verbal accepté ; aucune garantie 24 h/24 ni absence de perte n'est présumée. Le Prestataire informe le Client d'un incident significatif et applique le plan de reprise vérifié.

Chaque partie peut arrêter le pilote sur notification écrite. Le Client choisit la restitution ou la suppression des données ; format, délai et cycle d'expiration des sauvegardes : `[À COMPLÉTER]`. Les données légalement nécessaires sont isolées et conservées pour la seule durée applicable. Le Prestataire confirme les opérations effectuées et les exceptions documentées.

Le Client conserve ses contenus et données. Le Prestataire conserve ses droits sur sa marque et ses développements, sous réserve des licences des composants tiers. Aucune exclusivité ni cession générale des données du Client n'est prévue. Les clauses de responsabilité, assurance, droit applicable et règlement des différends sont `[À COMPLÉTER ET VALIDER]` ; aucune renonciation générale aux droits obligatoires n'est prévue.

## Annexe A — traitement pour le compte du Client

Le Client détermine les finalités de son accueil et est responsable de ce traitement ; le Prestataire agit comme sous-traitant pour ces données. Objet : réception, transcription, classement, transmission de messages et gestion de rendez-vous, durant le pilote et sa clôture. Personnes : appelants, visiteurs, contacts et utilisateurs autorisés. Données : identité fournie, coordonnées, conversation, horaires, rendez-vous, audio si autorisé, métadonnées techniques. Aucune donnée sensible n'est volontairement demandée pendant le pilote. Toute extension fait l'objet d'instructions documentées.

Le Prestataire traite uniquement sur instructions documentées, alerte sur une instruction apparemment illicite, impose la confidentialité aux personnes autorisées, assiste le Client pour les droits, les risques et les incidents, et fournit les éléments permettant l'audit. Le Client autorise les sous-traitants listés en annexe B ; les ajouts font l'objet d'une information préalable et d'une procédure d'objection `[À COMPLÉTER]`. Les obligations pertinentes sont répercutées. [Cadre et clauses CNIL](https://www.cnil.fr/sites/default/files/atoms/files/rgpd-guide_sous-traitant-cnil.pdf).

Mesures à joindre au procès-verbal : droits minimaux et isolation des entreprises, secrets protégés, accès restreints aux objets audio, chiffrement des transports et sauvegardes, journalisation sans secrets, sauvegardes et restauration contrôlées. Le délai contractuel d'alerte du Prestataire après connaissance d'une violation est `[À COMPLÉTER]`. Il transmet les faits connus puis leurs mises à jour ; le Client décide des notifications réglementaires. [Guide sécurité CNIL](https://www.cnil.fr/fr/guide-de-la-securite-des-donnees-personnelles).

Durées contractuelles par catégorie : `[messages]`, `[transcriptions]`, `[audio]`, `[contacts/rendez-vous]`, `[journaux]`, `[sauvegardes]` ; paramètres et preuves d'effacement en annexe. Le Client choisit la base légale et l'information des appelants ; lorsque le consentement est requis, le refus et le retrait doivent être opérationnels. [CNIL — enregistrement des appels](https://cnil.fr/fr/lecoute-et-lenregistrement-des-appels-sur-le-lieu-de-travail).

## Annexe B — prestataires et transferts à valider

| Prestataire prévu | Fonction | Entité / région / DPA / transfert |
| --- | --- | --- |
| Railway | Hébergement, PostgreSQL, Redis et stockage S3 | `[À VÉRIFIER]` |
| OpenAI | Traitement IA et voix, éventuel stockage fournisseur | `[À VÉRIFIER]` |
| Twilio, si activé | Téléphonie et éventuels SMS | `[À VÉRIFIER]` |
| Fournisseur email, si disponible | Notifications transactionnelles | `[À IDENTIFIER ET VÉRIFIER]` |

Les transferts et garanties sont contrôlés pour chaque entité et traitement ; une localisation serveur ne suffit pas à caractériser tous les accès. Une analyse est jointe lorsque le mécanisme choisi l'exige. [CNIL — analyse d'impact des transferts](https://www.cnil.fr/fr/analyse-dimpact-des-transferts-des-donnees-la-cnil-publie-la-version-finale-de-son-guide-aitd).

Signatures, version approuvée et date : `[À COMPLÉTER]`.
