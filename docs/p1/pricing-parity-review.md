# Revue tarifs EUR — PR #10, V1.1 à V1.3

État au 15 octobre 2026 : **DRAFT / PENDING validation commerciale**. Le catalogue JSON de cette revue est désactivé, sans identifiant produit de paiement. Il n'est importé par aucun code d'application. Aucun tarif actif, abonnement, achat, quota en production ou produit Polar n'a été modifié.

## Matrice à valider

La demande conserve les nombres de la tarification publique en changeant USD en EUR ; ce n'est pas une conversion de change. Les montants ci-dessous restent des montants de revue : **qualification HT/TTC non décidée**.

| Offre | Mensuel EUR | Annuel EUR à payer | Équivalent mensuel annuel | Minutes/mois | Voix supplémentaire | Transferts/mois source | SMS alerte/mois source | Numéro source |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Free | 0 € | — | — | 30 | aucun dépassement | 2 source | 10 source | essai source 14 jours, non attribuable automatiquement chez Caléonis |
| Starter | 30 € | 288 € | 24 € | 150 | 0,20 €/min | 20 | 50 | 1 dédié, sous conditions |
| Pro | 100 € | 960 € | 80 € | 500 | 0,18 €/min | 100 | 200 | 1 dédié, sous conditions |
| Enterprise | sur devis | sur devis | — | sur devis | sur devis | sur devis | sur devis | selon contrat |

Le supplément source des deux offres payantes est 0,02 par tentative de transfert ou segment SMS d'alerte. Cette ligne ne rend pas les SMS disponibles sur le pilote français Voice-only. Source numérique consultée : [tarifs LobbyStack EN](https://lobbystack.com/pricing/). La [documentation des forfaits](https://docs.lobbystack.com/billing/plans) précise une recharge mensuelle des quotas même en annuel, sans report des minutes. Ces règles doivent être vérifiées sur les produits de facturation avant tout lancement Caléonis.

## Divergences à conserver explicitement

Les pages **EN et FR actuelles**, relues par HTTP direct, promettent Free avec numéro pendant 14 jours, dix segments SMS et deux transferts. Le cache EN renvoyé par la recherche web était plus ancien (sans numéro et avec conservation illimitée) ; il n'est pas retenu comme dernier état du site. La documentation publique présente encore un essai navigateur sans numéro. Le site actuel annonce 30 jours de conservation en Free et 90 jours sur les offres payantes. La reprise Caléonis ne reprend pas une promesse d'essai PSTN non vérifiée en France. Le timestamp et le SHA256 de l'observation HTTP sont consignés dans `pricing-public-observation.json` ; le site FR est [accessible ici](https://lobbystack.com/fr/pricing/).

Les limites de connaissances affichées sur les sites sont 1/5/20 MB ; la documentation et `packages/shared/src/billing.ts` utilisent 25/100/500 MiB. Le catalogue de revue enregistre les deux valeurs, sans modifier les quotas. Le runtime Free conserve aussi des compteurs de dix SMS et deux transferts : un compteur ne confère aucun droit d'attribution de numéro et ne lève pas le blocage Voice-only. Le module partagé conserve `self_host` hors facturation hébergée ; aucune nouvelle offre commerciale autohébergée n'est activée. L'add-on `ai_sms` existant (500 cents/mois, 1900 cents de mise en service, 3 cents/segment) reste hors proposition française et n'est pas publié.

## Facturation effective : ce que le code prouve

Le chemin réel est `POST /api/billing/checkout` → `createBillingCheckoutRequest()` → outbox `billing.createCheckout` → `apps/worker/src/handlers.ts` → `PolarBillingProvider.createCheckout()`. Le worker sélectionne `POLAR_{STARTER|PRO}_{MONTHLY|ANNUAL}_PRODUCT_ID` ; le fournisseur envoie uniquement le `productId` à Polar. Le montant et la devise facturés sont donc ceux du produit fournisseur. Le code local ne prouve pas qu'un produit actuellement configuré est en EUR. Les transactions lisent la devise reçue du webhook ; l'interface des forfaits a encore USD par défaut. Un changement de symbole ne suffit pas.

La protection existante des pilotes gérés refuse un checkout avec `managed_pilot_checkout_disabled`. Elle est conservée. Les scripts de cette revue ne créent ni produit ni checkout et n'utilisent aucun jeton fournisseur.

Avant activation : exporter les quatre produits **sandbox** et leurs tarifs/mètres ; vérifier EUR, cents exacts, cadence mensuelle/annuelle, prix des dépassements, renouvellement, remise annuelle de 20 %, annulation, éventuel prorata, plafond, TVA, reçu/facture et webhook. `reconcileSandboxProduct()` vérifie devise, montant, cadence et environnement sur un export fourni. Même une concordance sandbox retourne toujours `liveBillingAllowed: false`. La structure du catalogue rejette les flags d'activation et l'injection de product IDs.

## France, TVA et conditions

L'exploitant demandé est **EI MrManiac**, sous la marque commerciale Caléonis Receptionist. Le régime TVA effectif de cette EI n'a pas été établi par cette passe. Aucune mention « TVA non applicable », aucun prix HT/TTC final, taux personnel ou numéro TVA n'est inventé. Le régime applicable change les obligations de facturation : [Service Public Entreprendre — TVA](https://entreprendre.service-public.gouv.fr/vosdroits/F23566). Il faut aussi préciser le vendeur contractuel/merchant of record si Polar collecte, les frais de paiement, les coordonnées/SIREN réels et les CGV correspondantes.

Le numéro pilote est Voice-only : SMS AI, alertes SMS et confirmations SMS restent indisponibles ; Messages reste visible avec ses protections. Les transferts doivent être qualifiés sur la vraie chaîne PSTN avant de les annoncer comme inclus et opérationnels. L'attribution d'un numéro tiers dépend de l'éligibilité et des justificatifs de l'utilisateur final ; le numéro de l'EI ne prouve pas une autorisation de sous-location à toute entreprise. Vérification des documents contractuels Twilio/end-user et du montage de fourniture encore **PENDING** ; référence de départ : [exigences réglementaires France Twilio](https://www.twilio.com/en-us/guidelines/fr/regulatory).

## Marge : calcul disponible, marge réelle non établie

Le moteur du dépôt reste `gpt-live-1`. Le coût officiel de session est **0,05 USD/min**, décompté à la seconde ; modèle backend et outils s'ajoutent. Source : [OpenAI Docs — Pricing, GPT-Live sessions](https://developers.openai.com/api/docs/pricing). À pleine consommation, la session seule coûte donc 7,50 USD en Starter et 25 USD en Pro, avant téléphonie, backend et infrastructure.

La [page Voice France Twilio](https://www.twilio.com/en-us/voice/pricing/fr) affiche notamment 0,0100 USD/min reçu et 1,35 USD/mois pour un numéro local, mais **la production utilise Elastic SIP trunking**. Ces tarifs Programmable Voice ne sont pas substitués au relevé de coût réel du trunk, ni cumulés aveuglément avec d'autres jambes. Les pages publiques SIP France n'ont pas fourni de tarif exploitable durant cette passe. Relever le prix final des appels/trunks dans les événements de coûts existants, le forfait réel du numéro et les frais d'éventuels transferts. Les tentatives, segments, secondes et durées transférées sont des unités distinctes.

Les [prix Railway](https://docs.railway.com/pricing/plans) distinguent abonnement et consommation avec crédit inclus (Pro : 20 USD/mois). Allouer la facture réellement payée entre clients : ne pas additionner deux fois abonnement et consommation incluse. Ajouter PostgreSQL, Redis, stockage S3, sauvegardes, observabilité et Resend selon les factures et l'usage attribués.

Le calculateur pur `calculateMarginScenario()` utilise : revenu net EUR réellement conservé après qualification fiscale + coût final Twilio USD + minutes GPT-Live × 0,05 USD + backend/outils USD + allocation infrastructure USD + stockage/email/monitoring USD, convertis avec **un taux EUR/USD explicite**, puis frais de paiement EUR. Une inconnue produit `PENDING`, jamais zéro implicite. Les appels exclus de l'usage commercial peuvent coûter au fournisseur : coûts fournisseurs et minutes facturées au client doivent être mesurés séparément. Une simulation n'est pas une marge observée.

## Validation et décisions restantes

PASS : parité numérique runtime ↔ catalogue de revue pour montants/minutes/dépassement voix ; annuel non confondu avec équivalent mensuel ; test de devise réelle sur preuve produit ; refus activation implicite ; absence d'import runtime ; absence de marge calculée avec données manquantes. Tests déterministes exécutés avec les tests de routage : **46 réussis**.

PENDING : chiffres EUR finaux, HT/TTC/régime TVA/CGV, export sandbox produits et mètres, reçus/factures sandbox, coûts finaux et change, marge observée, droit d'attribution aux clients, qualification transferts, approbation humaine distincte de publication des prix et facturation réelle. Ces points empêchent une déclaration de parité commerciale à 100 %.

Commande : `pnpm exec vitest run --config scripts/vitest.config.ts scripts/p1-pricing-review.test.ts scripts/p1-routing-policy.test.ts`.
