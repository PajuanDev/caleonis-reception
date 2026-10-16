# Domaine unique : qualification supplémentaire de l'authentification

Base : PR #14, `50879208c721f0e9e719742c32c75c74e9d0f83c`. Ce lot ajoute des outils/tests de qualification isolée et ne change ni les pages, ni les API, ni les mécanismes CSRF/Better Auth déployés. Les PR sources et Railway restent intacts.

## Objectif

La recette précédente refusait volontairement les POST d'authentification depuis une origine gateway absente des trusted origins ; son cookie était créé directement sur Next. La nouvelle recette démarre DEUX serveurs loopback : Next interne et gateway visible par le navigateur. Cette origine gateway unique est configurée explicitement comme APP_BASE_URL et AUTH_TRUSTED_ORIGINS du NOUVEAU processus Next isolé. Origin est transmis sans réécriture. Les cookies ne sont ni copiés d'une session directe, ni injectés pour obtenir la connexion.

Le build Next est refait avec P1_SINGLE_HOST_STAGING=true et environnement certification pour activer /dashboard et aligner navigateur/serveur. Les anciens tests restent exécutés d'abord avec leur configuration ordinaire. Le domaine de production reste refusé par la garde existante.

## Portée prévue des tests

- FR desktop et EN mobile : entrée marketing/aide, login, signup, compte réellement créé, vérification OTP lue dans l'outbox locale, refus du login non vérifié, arrivée au début de l'onboarding.
- Un tenant synthétique explicitement préparé sert ensuite à tester /dashboard, logout, rejet du cookie révoqué, login par défaut, retour profond Messages et API Calls sans cache partagé.
- Les origines d'authentification étrangères, requêtes mutantes sans origine, accès API sans session et Host de production restent refusés.
- Captures et JSON de preuve sans mots de passe, tokens ni identifiants réels.

## Isolement

Le préflight refuse un hôte externe, base distante, clés/configurations de fournisseurs présentes, ports invalides, absence du marqueur loopback-disposable ou du mode certification. 29 tests Node du préflight ont été exécutés hors réseau dans le conteneur du chat. Syntaxe MJS/Bash et transpilation syntaxique TS contrôlées localement ; cela ne remplace pas typecheck, build et E2E complets de CI.

Aucun achat, SMS, appel, vrai email, réservation fournisseur, modification de clients, changement de visibilité, migration ou déploiement de production. Les nouveaux comptes de test sont supprimés après chaque parcours. Les traces Playwright de cette nouvelle suite sont désactivées pour ne pas archiver des valeurs de session réutilisables.

## Exécution

`bash scripts/e2e-local.sh` exécute les deux phases sur les conteneurs jetables existants. Une cible personnalisée après `--`, `--keep` ou `--skip-build` conserve le comportement historique et ne lance pas le second build. `scripts/e2e-single-host-auth.sh` exige les variables de la fixture isolée et ne doit pas être lancé contre des services réels.

Les résultats E2E/CI restent PENDING jusqu'à lecture du SHA exact exécuté. Le succès attendu ne prouve pas le libre-service payant : l'entreprise utilisée pour le dashboard est une fixture, les numéros/paiements et Google ne sont pas exercés. HTTPS Secure cookies, domaine de staging hébergé, callbacks réels, renvoi/transfert PSTN, performance et bascule de production restent distincts.

Sources techniques consultées : https://playwright.dev/docs/test-webserver ; https://nextjs.org/docs/app/guides/environment-variables ; code réel du dépôt (playwright.config.ts, single-host-staging.ts, proxy.ts, fixtures d'authentification, gateway). Les outils MCP Next et les docs installées ne sont pas disponibles dans le conteneur du chat ; aucun contrôle MCP n'est revendiqué. Pas de changement de code de page/route Next dans ce lot.
