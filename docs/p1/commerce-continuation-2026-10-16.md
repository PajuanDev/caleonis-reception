# Reprise après interruption — finalisation des écrans EUR HT

Base relue sur GitHub : PR #16, `cbdaaeec14c25220d0f9f9c3278345f9eadfdcbe`, arbre `16c191fb1b71fb405103ff7e980cebcaab872bea`. La confirmation utilisateur indique que l'inscription et le code reçu fonctionnent après correction de l'adresse Gmail. Aucun paramètre d'authentification ni suppression Resend ne doit être modifié pour ce motif désormais résolu.

## Changements de ce lot

- Récapitulatif du forfait : catalogue EUR partagé, HT explicite pour Starter/Pro et montant annuel réellement facturé distingué de son équivalent mensuel.
- Choix de l'offre pendant l'onboarding : Free, Starter, Pro, Enterprise conservés, mêmes valeurs/quotas. La branche sans checkout conserve son accès gratuit existant, sans code promo ni appel au paiement.
- Comparatif : tarifs de dépassement voix, tentatives et segments issus du catalogue et affichés en EUR HT au lieu des anciennes traductions USD.
- Plafond : euros HT affichés, distinction abonnement/dépassements/taxes expliquée. Aucune modification d'un plafond existant ni de la politique serveur.
- Reçus : devise réelle transmise explicitement, jamais remplacée par EUR ni convertie. Une devise ou un montant invalide est signalé par une valeur absente, pas inventé.
- Les contrôles de disponibilité, permissions, erreurs, idempotence du retour de checkout, parcours Free et guards du pilote restent en place. Aucun nouveau prix fournisseur n'est activé.

Les composants conservent leur structure responsive, classes et sections ; certains blocs JSX sont uniquement reformattés. Les nouveaux libellés passent par les clés `billing.commercial.*` avec fallback FR/EN centralisé, comme le premier écran commercial de PR #16. Aucune nouvelle section de navigation ni réduction de gamme.

## Preuves et limites

Le dernier run du SHA parent est marqué failure lors de la reprise ; un ancien message PR mentionnant des contrôles intermédiaires réussis ne constitue pas une conclusion verte. Le résultat du nouveau SHA doit être vérifié séparément après sa publication. Aucune assertion de CI n'est désactivée dans ce lot.

Tests unitaires ciblés ajoutés au moteur de présentation pour les reçus USD/GBP/EUR, zéro, accumulation fractionnaire, absence de devise et distinction annuel/mensuel. Les tests existants continuent d'exécuter les parcours de facturation et onboarding ; pas de nouveau banc de tests exploratoire.

Restent indépendants : alignement final des pages de tarifs marketing et des textes historiques, produits/mètres Polar réels et coupons actifs, preuve des taxes et reçus fournisseur, parité métier complète, acquisition réglementaire de numéros européens, preuve SMS et bascule du domaine unique. Cette passe ne qualifie pas une fonctionnalité télécom simplement parce que le catalogue annonce sa capacité.

Aucun déploiement, migration, secret, achat, appel, SMS, email réel, changement de visibilité du dépôt ou invitation envoyé. Les emails FR/EN et la politique checkout déjà contenus dans PR #16 sont conservés.

Sources techniques : code actuel et catalogue du dépôt ; documentation officielle react-i18next useTranslation/interpolation et Polar sur le traitement des remises et taxes. Aucun serveur Next/MCP n'est actif dans le conteneur du chat ; la CI est utilisée pour la qualification intégrée. Aucun contrôle MCP n'est revendiqué.
