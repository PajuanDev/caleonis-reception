# Caléonis Receptionist V1 — reprise de la PR #10

État de revue du 15 octobre 2026. Branche PR #10 poursuivie depuis son HEAD `c054d96`, sans merge ni déploiement de production. Les changements de cette passe portent sur le marketing Astro et ses ressources ; la production PSTN, les données, le worker et les secrets ne sont pas modifiés.

## Sources et restauration effective

Le défaut majeur de la première livraison était le masque `ReviewNotice` : une page générique remplaçait les pages conservées et `getBlogPosts` retournait un tableau vide. Ce masque est supprimé ; chaque route restitue désormais son contenu propre.

La mise en page, les véritables composants et les dispositions proviennent du fork MIT, base `e8e23bae4955f64fa3f99cb525faad908439077e`. Le méga-menu Solutions, tous les métiers, le hero et son animation, les cartes de fonctionnalités, les sections de fonctionnement, les FAQ, les tarifs comparés et le footer sont rétablis. Aucune section Canaux, offre multi-agent, interface Agent Builder, P1.4 ou V2 n’a été introduite dans l’application.

Le dépôt public actuel a été identifié sur GitLab : <https://gitlab.com/lobbystack-group/lobbystack>, commit `46b217807cb251a6679a5e64b8142d2441ccecd3`, daté du 15 octobre 2026. Sa licence MIT et le copyright `Copyright (c) 2026 LobbyStack contributors` sont conservés. Il fournit **42 articles anglais et 42 français complets**, leurs illustrations, le changelog courant et les textes métiers actualisés. Les 84 articles restent intégraux ; seuls les liens de compte et le lien du dépôt public devenu obsolète sont adaptés. Les textes historiques sont explicitement attribués comme archives éditoriales source, sans présenter leurs anciennes comparaisons, prix ou promesses comme des engagements Caléonis.

L’inventaire public `docs/p1/public-source-inventory.json` contient **140 routes marketing FR/EN** : les 140 ont un fichier HTML spécifique et un H1 dans la compilation locale. Cela mesure la couverture de routes, pas une identité visuelle à 100 %. Le build comprend **158 pages HTML**, dont les ajouts Caléonis, les pages légales de projet et les pages de recherche/erreur. Les ressources `/aide` sont assemblées séparément par le processus racine et ne doivent pas être confondues avec la seule compilation Astro.

## Identité, droits et exceptions précises

Les composants, espaces, typographies et icônes Lucide sont conservés. Le logo Caléonis de la première PR remplace l’identité LobbyStack. Les liens vers le code public sont libellés « Source d’origine MIT » et ciblent le GitLab officiel ; le dépôt privé de l’exploitant n’est pas présenté comme un téléchargement public. L’icône de ce lien utilise Lucide CodeXml pour identifier le code sans suggérer un hébergement GitHub. Aucun support Discord ou compte LobbyStack n’est présenté comme support Caléonis.

`docs/p1/marketing-assets.json` contient les noms, tailles, SHA-256, références et licences : 22 illustrations neutres MIT réutilisées à l’identique, 41 ressources d’archives éditoriales, cinq nouveaux schémas SVG, deux captures réelles de l’app et les fichiers conservés sans usage. Les schémas SVG recréent les dispositions de cartes correspondantes lorsque l’original contient un logo source, une photo dont les droits distincts ne sont pas établis ou une confirmation SMS indisponible. Ce sont des diagrammes explicitement illustratifs, pas des captures fabriquées.

La capture de dashboard LobbyStack est remplacée provisoirement par la vraie capture Messages de Caléonis avec données synthétiques. Les vraies captures supplémentaires Home/Calls/Analytics doivent être intégrées depuis la CI navigateur isolée par le responsable de livraison. Le manifeste détaille chaque remplacement ; aucune parité pixel à pixel n’est affirmée pour ces exceptions.

Le texte MIT est servi dans `/third-party-notices.txt`. Les licences Lucide ISC et Feather MIT sont dans `/licenses/lucide-license.txt` ; la licence Geist SIL OFL 1.1, vérifiée auprès du dépôt officiel Vercel, figure dans `/licenses/geist-ofl.txt`. Les anciennes fontes General Sans sont conservées sans usage et sans prétendre établir leurs droits. Les marques présentes dans les couvertures d’archives demeurent des références éditoriales à leurs propriétaires.

## Périmètre pilote et catalogue

L’accueil PSTN, l’historique et une réservation Google ont été vérifiés dans les travaux P0. Les pages restituent le périmètre cible source, avec statut local explicite auprès des passages concernés : **aucun SMS sur le numéro français Voice-only**, transfert humain non qualifié, capacité de charge illimitée non qualifiée, intégrations externes soumises à configuration et vérification. Les pages médicales et dentaires imposent une démonstration administrative fictive sans données de santé réelles ; aucune qualification HDS, aucun diagnostic ni triage clinique n’est annoncé.

Les grilles et tableaux affichent l’état réel du pilote dans chaque cellule : SMS indisponibles, transferts et charge à qualifier, attribution des numéros à valider. Les durées 30 jours Free / 90 jours payants sont des cibles source, sans engagement de conservation Caléonis ; aucune rétention illimitée n’est promise. Les FAQ et CTA ne créent aucun droit gratuit ou numéro d’essai français. Les prix de concurrents éventuellement cités conservent explicitement leur unité USD ; seuls les nombres du catalogue Caléonis sont libellés en EUR.

La grille et la bascule mensuel/annuel sont restaurées en **EUR**, avec les mêmes nombres source : Free 0 €, Starter 30 €/mois ou 288 €/an (24 €/mois équivalents), Pro 100 €/mois ou 960 €/an (80 €/mois équivalents), Enterprise sur mesure. Minutes cibles : 30/150/500 ; dépassements payants 0,20 €/0,18 € ; quotas SMS et transferts conservés comme cibles source non activées. Le source public actuel inclut un numéro d’essai 14 jours, 10 SMS et deux transferts sur Free ; ces droits ne sont **pas inclus ni autorisés sur le pilote français**. Le stockage cible actuel est 1/5/20 Mo. La matrice commerciale détaillée et les conflits source/runtime figurent dans `docs/p1/pricing-eur-review.json`.

Le catalogue porte un avertissement « PROJET NON SOUSCRIPTIBLE ». TVA, statut HT/TTC, marge, attribution conforme des numéros et CGV restent à valider. Aucun checkout, paiement, abonnement, commission ou nouveau droit n’est activé. La page d’affiliation conserve ses sections complètes comme modèle cible non activé.

## Domaine, authentification et confidentialité

L’architecture finale visée est `https://receptionist.caleonis.com/` pour le marketing, `/fr/` pour la version française, `/aide/` pour l’aide et `/login` / `/signup` pour l’application. Tous les CTA de compte ciblent ce domaine et ces deux chemins. La création de compte demeure contrôlée par l’application. La démo vocale conserve son apparence source mais ouvre la connexion si aucun slug de démo Caléonis n’est explicitement configuré ; aucun identifiant ou endpoint LobbyStack n’est utilisé par défaut.

Les hosts localhost, 127.0.0.1 et *.chatgpt.site bloquent la télémétrie même si une ancienne clé et un flag d’activation sont présents. La démo vocale ne démarre ni session ni accès microphone au montage ; sur ces hosts elle ouvre la connexion même si un ancien slug était configuré. Quatre tests couvrent le blocage analytics et dix tests de rendu couvrent les prix, cellules de capacité, conservation, FAQ Free, périmètre médical, attribution et métadonnées.

Le défaut `PUBLIC_SITE_URL` reste celui de la prévisualisation isolée ; la publication finale doit définir l’origine du domaine unique après validation du routage. Aucun DNS, reverse proxy, callback OAuth, cookie, webhook ou route API de production n’est modifié ici. Le plan de routage et les essais d’intégration sont livrés séparément par la passe racine.

Les pages Confidentialité et Conditions gardent le vrai gabarit de navigation mais servent des projets propres à l’EI MrManiac. Les clauses US/Canada héritées sont conservées dans le code pour provenance et ne sont pas présentées comme des règles françaises. L’alias `/fr/confidentialite/` affiche le projet de confidentialité, avec canonique `/fr/privacy/`, et reste hors sitemap. Les textes définitifs, engagements de traitement et durées applicables demandent validation avant ouverture commerciale.

## Vérifications locales

- **PASS** : lint landing.
- **PASS** : `astro check`, 245 fichiers, zéro erreur et zéro avertissement. Le hint d’import React inutilisé du nouveau test a été corrigé.
- **PASS** : 102 tests unitaires dans 15 fichiers, dont des tests de vrai rendu des prix, états de capacité et rétention, et des tests de blocage analytics sur tous les hosts de prévisualisation.
- **PASS** : build Astro précédent, 158 pages ; Pagefind indexe ces 158 pages. La compilation finale après les correctifs de capacité est réalisée une seule fois par la livraison racine avant les captures.
- **PASS** : les 140 routes marketing observées sur le public ont chacune leur HTML spécifique et leur H1.
- **PASS** : 84/84 articles complets vérifiés contre le source MIT actuel, hors adaptations de liens documentées.
- **PENDING** : assemblage de l’aide, audit complet des ancres/liens/ressources, e2e de navigation et rapports de captures desktop/mobile, publication de la prévisualisation et vérifications globales, réalisés dans la livraison racine.
- **EXCEPTION** : les titres SEO conservent les libellés source avec la marque Caléonis plus longue ; certains dépassent les recommandations de longueur. Cette observation ne constitue pas une 404 ni une absence de contenu.

La revue V1.1/V1.2/V1.3 reste le préalable à toute V1.4. Une couverture de routes complète ne qualifie pas seule les capacités du SaaS, la conformité contractuelle ni une parité visuelle totale.
