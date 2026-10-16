# Livraison commerciale — 16 octobre 2026

## Décisions utilisateur

Priorité à la livraison du produit sur le domaine prévu ; fin des recherches exploratoires de numéros et des nouveaux bancs de test exhaustifs. Les contrôles existants de sécurité, compilation, isolation et paiement ne sont pas désactivés. La recette étendue sera faite avec le propriétaire et des testeurs invités après le déploiement accessible. Pas de claim « tout fonctionne » avant preuve.

Starter : **30 EUR HT / mois**, taxes applicables ajoutées, jamais prélevées à l'intérieur des 30 EUR. La politique s'applique également aux autres prix numériques déjà retenus : Starter annuel 288 EUR HT (24 EUR HT/mois équivalents), Pro 100 EUR HT/mois, Pro annuel 960 EUR HT. Ce sont des prix commerciaux et non une conversion de change. Les frais de paiement/IA/téléphonie restent des coûts, pas une garantie de revenu net de 30 EUR.

## Code livré

L'adaptateur Polar vérifie le vrai produit avant de créer le checkout : bonne organisation, produit actif, cadence exacte, prix fixe du catalogue, devise EUR et `tax_behavior=exclusive` explicite sur tous les prix actifs. Le réglage Polar par défaut `location` n'est pas accepté, puisqu'il peut extraire la TVA du prix européen. Les prix metered compatibles sont conservés ; leurs tarifs, plafonds et unités devront être rapprochés avant activation, pas remplacés par un prix ad hoc qui les supprimerait.

Le checkout conserve la clé d'idempotence et l'identité de l'entreprise. Il demande l'adresse de facturation, indique un acheteur professionnel, désactive un essai additionnel implicite et ouvre le champ de code natif seulement pour Starter mensuel. Aucune remise ni attribution Starter n'est calculée dans le navigateur. Les webhooks signés existants restent l'autorité pour l'abonnement. La réponse fournisseur est vérifiée avant de rendre son URL au client.

La préparation d'une offre testeur retourne une remise Polar de 100 %, `duration=once`, restreinte au produit Starter mensuel et à une utilisation par client. Nombre total d'utilisations et expiration obligatoires. Cette préparation ne publie aucun code. Les codes réels devront être aléatoires, privés et remis uniquement aux personnes invitées ; aucun code universel exploitable n'est commité dans ce dépôt public.

## Règles de l'offre testeur

Un mois d'abonnement Starter offert, pas une année, pas une remise permanente. Conservation des quotas Starter. Le renouvellement normal est 30 EUR HT + taxes applicables ; il doit être explicitement présenté avec sa date et ses conditions d'annulation avant l'accord du testeur. Pas de débit silencieux. Avant une invitation réelle, configurer le plafond de dépassement du compte testeur à zéro : les consommations facturées en fin de période pourraient sinon apparaître après la facture initiale gratuite. Les achats supplémentaires, add-ons et frais téléphoniques exceptionnels ne sont pas offerts automatiquement.

## Activation manquante

Le worker Railway inspecté ne contient pas de variables Polar. Aucun plugin Polar n'a été trouvé dans les outils de cette conversation. Il faut donc connecter/configurer le compte de paiement avant de publier le coupon ou d'encaisser. Conserver les secrets dans Railway, pas dans le chat ni GitHub. Renseigner les IDs exacts des produits et organisation, token, webhook signé et environnement sur les services concernés. Ne jamais recycler un produit USD ou TTC en prétendant qu'il est EUR HT.

La fiscalité est calculée par le vendeur effectif/Merchant of Record sur les coordonnées et identifiants fiscaux valides du client. Ne pas imposer 20 % à tous les pays, ni inventer un statut TVA pour l'EI MrManiac. Un exemple à 20 % donne 30 + 6 = 36 EUR ; une exonération/autoliquidation n'est appliquée que si elle est réellement applicable. Avec une remise totale, les taxes sont calculées après remise, pas sur les 30 EUR initiaux.

## Téléphonie et publication

Twilio conservé. Les captures utilisateur montrent un numéro actuel Voice et des résultats Voice ; le rapport API indique séparément des candidats Voix+SMS, sans révéler leur famille. Aucun achat ni remplacement n'est lancé dans ce lot. Le produit expose les capacités réellement activées, sans inventer les SMS du numéro actuel.

La V1 cible reste parité LobbyStack + Caléonis propriétaire + libre-service. Le domaine unique et ses protections déjà qualifiés ne sont pas abandonnés. Les secrets de paiement, capacité SMS, dossiers clients, droits de distribution, OAuth durable et conditions légales restent des préalables d'activation, pas des cases cochées parce qu'un autre SaaS y est arrivé.

## Sources techniques consultées

- https://polar.sh/docs/features/tax-inclusive-pricing
- https://polar.sh/docs/features/discounts
- https://polar.sh/docs/features/checkout/session
- https://polar.sh/docs/api-reference/checkouts/create-checkout-session
- https://polar.sh/docs/api-reference/discounts/create-discount

Pas de nouvelle migration, d'authentification affaiblie, de secret lu ou modifié, d'envoi d'invitation ni de paiement réel par ce lot. Validation locale : 34 cas purs de politique exécutés hors réseau. La CI de la branche fournit la validation intégrée, à lire sur le SHA exact.
