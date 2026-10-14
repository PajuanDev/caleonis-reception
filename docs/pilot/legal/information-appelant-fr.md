# Information des appelants et visiteurs — textes à valider

Projet du 14 octobre 2026. Adapter à l'entreprise et aux réglages effectifs. **Ne pas publier une annonce de refus ou d'arrêt d'enregistrement sans avoir testé la fonction correspondante.**

## Annonce IA

« Bonjour, vous êtes chez [ENTREPRISE]. Je suis son assistant d'accueil par intelligence artificielle. Je peux répondre à vos questions et transmettre un message à l'équipe. »

Ce texte doit être dit dès le début de l'interaction. La transparence sur l'interaction IA est prévue à l'article 50 du [règlement (UE) 2024/1689](https://eur-lex.europa.eu/legal-content/FR/TXT/PDF/?uri=OJ%3AL_202401689).

## Variante enregistrement sur consentement, uniquement après contrôle technique

« Pour [FINALITÉ PRÉCISE], [ENTREPRISE] souhaite enregistrer et transcrire cet échange pendant [DURÉE]. Acceptez-vous l'enregistrement ? Vous pouvez le refuser et joindre l'équipe via [CANAL HUMAIN VÉRIFIÉ]. Les informations sur vos droits sont disponibles sur [PAGE CONFIDENTIALITÉ VALIDÉE]. »

L'acceptation doit être libre, spécifique et documentée. En cas de refus, arrêter la collecte concernée et proposer le canal humain effectivement disponible ; ne pas demander une justification. Le retrait doit produire un résultat contrôlé. Si la session commence à stocker avant la réponse, le texte n'est pas une preuve de consentement préalable et ce parcours doit être corrigé.

## Variante avec une autre base légale validée

« Cet échange est [TRANSCRIT / ENREGISTRÉ SELON LA CONFIGURATION] pour [FINALITÉ], sous la responsabilité de [ENTREPRISE], pendant [DURÉE]. Vous pouvez [MODALITÉ D'OPPOSITION APPLICABLE] ou joindre l'équipe via [CANAL HUMAIN]. Consultez [PAGE] pour les détails et vos droits. »

Ne pas utiliser « en poursuivant l'appel vous consentez » comme preuve générique de consentement. Le choix de la base légale, la proportionnalité, les destinataires et la durée doivent être validés pour ce service. La [fiche CNIL sur les appels](https://cnil.fr/fr/lecoute-et-lenregistrement-des-appels-sur-le-lieu-de-travail) décrit notamment une information orale au début de l'échange et un accès à l'information complète ; son contexte de travail ne valide pas automatiquement l'enregistrement systématique d'un assistant IA.

## Texte avant démarrage du widget voix

« Vous allez parler à l'assistant IA de [ENTREPRISE]. Votre voix sera traitée pour répondre à votre demande. [SI ACTIVÉ : L'échange sera enregistré et transcrit pour FINALITÉ, pendant DURÉE.] [LIEN vers la notice validée]. »

Si l'enregistrement repose sur le consentement, afficher un choix distinct avant de démarrer la session : « J'accepte l'enregistrement » / « Contacter l'équipe ». Le bouton d'essai ou l'autorisation navigateur d'utiliser le micro ne remplacent pas ce consentement.

## Preuves à joindre au pilote

- Capture de la notice avant démarrage du widget et écoute de l'annonce initiale réelle.
- Test d'acceptation, test de refus et test de retrait ; état du stockage OpenAI et S3 vérifié pour chaque cas.
- Journal minimal de la version de notice, date, locataire, canal et décision, sans recopier la conversation dans les journaux.
- Effacement d'un enregistrement test sur S3, de sa transcription et des copies fournisseurs ; cycle des sauvegardes documenté.
- Canal humain de remplacement joignable et message d'échec d'action sans promesse de rappel garanti.

Validation humaine : nom, date, version et réserves `[À COMPLÉTER]`.
