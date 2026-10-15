# Paramètres agent — delta de parité PR #10

Comparaison du socle Caléonis `e8e23bae` / PR #10 `c054d96` avec le source public upstream `46b217807cb251a6679a5e64b8142d2441ccecd3`. Le composant de paramètres, son API, le schéma et les primitives de langues n'ont pas changé entre les deux commits Caléonis cités : les écarts ci-dessous sont présents dans le socle conservé, et ne résultent pas d'une suppression de contrôles pendant cette reprise.

## Résumé manuel restauré dans le candidat

Le véritable `Item` et dialogue de résumé de `apps/admin/src/components/live-agent-basic-settings-surface.tsx` upstream ont été réemployés : emplacement après l'accueil, styles de ligne, bouton Modifier, dialogue, zone de texte et actions Annuler/Enregistrer. Les seules adaptations fonctionnelles portent sur le backend disponible : sauvegarde manuelle, libellés FR/EN, plafond de 2 000 caractères, accessibilité de la zone de texte et état en attente. Les commandes et animations de réécriture IA ne sont pas proposées.

La lecture utilise le `profile.summary` déjà renvoyé par `GET /api/agent`. Une action explicite sur Enregistrer envoie seulement `{ businessId, summary }` au `PATCH /api/agent` existant, après suppression des espaces aux extrémités. Ouvrir, taper et annuler ne créent aucune écriture. Une erreur conserve le brouillon pour un nouvel essai volontaire ; une sauvegarde en attente bloque les doublons et la fermeture du dialogue. Le changement d'espace ferme le brouillon. L'accès lecteur ne permet pas la modification. Les paramètres d'accueil, numéro/transfert, réservation et vérification restent desservis par leurs chemins existants.

L'API existante exige le rôle administrateur métier, valide le texte, persiste `receptionist_profiles.summary` et émet `snapshot.refresh`. La génération du snapshot conserve ce champ, puis le prompt vocal existant l'utilise comme `Business summary`. Cette restauration n'ajoute aucune migration, tâche IA, fournisseur, modèle ni modification de moteur. La prise en compte reste liée au mécanisme de snapshots existant ; elle n'affirme pas une modification à chaud des appels déjà ouverts.

**État : restauré dans le code candidat ; 23 tests ciblés réussis, lint sans erreur ni avertissement et typecheck admin réussi.** Le déploiement et les captures de la nouvelle ligne doivent être qualifiés dans la livraison globale ; aucune modification de production n'est effectuée par cette passe.

## Écarts upstream encore explicites

| Capacité upstream actuelle | Backend Caléonis conservé | État honnête pour l'interface et les guides | Effort / risque |
|---|---|---|---|
| Résumé manuel | Champ, GET/PATCH, snapshot et prompt déjà présents | Restauré ; édition manuelle jusqu'à 2 000 caractères | Faible : UI et tests ciblés, sans migration |
| Résumé généré / « Réécrire avec l'IA » | Pas de `summarySource`, fingerprint, date de génération, `summaryRegenerateStatus` ni job `business.generateSummary` | EXCEPTION / PENDING ; ne pas proposer de bouton ni affirmer une génération automatique | Extension backend : provenance, état durable, source de connaissances, outbox/worker, erreurs/coût, protection des saisies opérateur ; risque d'écrasement sans ces garanties |
| Éditeur horaires opérateur | Lecture `GET /api/catalog`, domaine d'écriture existant mais pas de `/api/hours` opérateur | EXCEPTION / PENDING pour l'écran d'édition ; la lecture métier des horaires déjà configurés existe | Moyen : route opérateur autorisée, validation, UI, rafraîchissement snapshot et tests de réservation |
| Plusieurs plages le même jour | Table unique `(business_id, day_of_week)` ; domaine refuse explicitement une deuxième plage | EXCEPTION / PENDING ; ne pas afficher un contrôle multi-plages prétendument enregistrable | Migration + domaines/API/seed upserts et tests PostgreSQL ; risque sur disponibilité, pause déjeuner et transferts. Certains calculs métier itèrent déjà plusieurs fenêtres, mais la persistance les interdit |
| Fermetures datées modifiables | Table `closures`, snapshot, disponibilité et outils de lecture présents ; pas de CRUD opérateur | EXCEPTION / PENDING pour l'édition dans les paramètres ; ne pas documenter des boutons inexistants | Moyen : endpoint/domain autorisé, conversion fuseau/DST, validation dates/chevauchements, transaction et snapshot ; risque sur créneaux réservables |
| 8 langues de repli configurables | Types et API de configuration limités à `en`/`fr` ; snapshot ramène les autres valeurs à `en` | Seulement EN/FR configurables ; adaptation conversationnelle à la langue de l'appelant distincte, déjà demandée par le prompt | Extension transversale : contrats, validation, greetings, snapshot, widget, notifications et tests. Ajouter seulement six options UI produirait une fausse configuration |

Les langues de configuration upstream sont `en`, `fr`, `es`, `sr`, `de`, `pt`, `it`, `nl`. Elles sont distinctes des langues d'interface (`en`, `fr`, `es`, `sr`). La capacité du modèle à suivre un appelant ne prouve pas que ces huit valeurs sont enregistrables et prises en compte comme défauts dans Caléonis.

Le source upstream de `/api/hours` dépend aussi de champs nouveaux comme `hoursSource` et `staffId`. Son import brut ne fonctionne pas avec le schéma conservé. De même, copier le sélecteur de devise upstream ferait référence à un champ métier absent et ne configurerait pas la facturation EUR. Ces éléments nécessitent une reprise backend qualifiée, même en conservant le modèle actuel ; ils ne sont pas simulés pour donner une fausse impression de parité.

## Vérification ciblée

La suite `live-agent-summary.test.tsx` exerce le vrai composant et le dialogue : lecture/cancel sans écriture, sauvegarde explicite du seul résumé, garde en attente/doublons, persistance après relecture, erreur puis nouvel essai, saisie vide, valeur dépassant 2 000 caractères, limite exacte acceptée, lecteur sans modification et télémétrie après succès réel du chemin UI. Les suites existantes d'accueil/transfert/réservation et de l'API agent sont relancées avec elle.

Commandes :

```text
pnpm --filter @lobbystack/admin exec vitest run src/components/live-agent-summary.test.tsx src/components/live-agent-basic-settings-surface.test.ts src/components/live-agent-settings-telemetry.test.tsx app/api/agent/route.test.ts
pnpm --filter @lobbystack/admin exec eslint src/components/live-agent-basic-settings-surface.tsx src/components/live-agent-summary.test.tsx
pnpm --filter @lobbystack/admin typecheck
```

Résultats de cette passe : **4 fichiers de tests, 23 tests réussis** (dont cinq parcours du résumé manuel), lint ciblé réussi sans diagnostic et typecheck admin réussi. Aucun test ne déclenche de service IA ou d'écriture externe. Ce delta ne certifie ni la parité complète des paramètres, ni les fonctionnalités signalées en exception.
