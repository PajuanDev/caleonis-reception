# Dossier juridique pilote — Caléonis Receptionist

Version de travail du 14 octobre 2026. **DRAFT — validation humaine requise. Aucun texte publié, signé ni déclaré juridiquement validé.**

Exploitant : **William Fabrice GOSSE, entrepreneur individuel (EI), nom commercial MrManiac**, SIREN **929 183 986**, SIRET du siège **929 183 986 00017**, **10 rue Courbet, 59100 Roubaix, France**. Contact public existant : **contact@caleonis.com**. Caléonis Receptionist est la marque de service ; ne pas présenter Caléonis comme une société immatriculée distincte.

Ces identifiants et l'adresse concordent entre l'avis de situation INSEE du 14 octobre 2026, l'attestation RNE officielle INPI téléchargée et vérifiée en privé, et l'[Annuaire des entreprises — fiche de l'EI](https://annuaire-entreprises.data.gouv.fr/entreprise/william-gosse-mrmaniac-929183986). Le contact provient des mentions du site existantes. Le PDF RNE original, daté du 15 octobre 2026 en France, reste hors Git ; aucune donnée de naissance ni d'accès n'est reproduite ici. Ces documents d'identité ne sont pas présentés comme un certificat de conformité juridique du service.

Documents préparés : [contrat B2B pilote](./contrat-pilote-fr.md), [notice de confidentialité](./confidentialite-service-fr.md), [annonce IA et enregistrement](./information-appelant-fr.md). Les champs `[À COMPLÉTER]` sont bloquants avant signature ou publication.

## Validation à obtenir avant données de clients

- Faire confirmer par l'exploitant les informations EI/RNE déjà renseignées, l'usage du contact public pour la confidentialité/support, le régime de TVA et le signataire client. Le code APE statistique actuel 45.20A figure dans le dossier INSEE ; l'adéquation des activités déclarées au SaaS doit être vérifiée, sans effectuer de formalité au nom de l'exploitant sans son accord.
- Faire valider contrat, annexe de sous-traitance et information par l'exploitant et un conseil adapté au service. Consigner la version, la date, le validateur et les éventuelles réserves.
- Inventorier les entités contractuelles, régions, DPA et mécanismes de transfert de Railway, OpenAI, Twilio et du fournisseur email réellement utilisé. Ne pas annoncer « données exclusivement UE » ou « aucun entraînement » sans preuve contractuelle et technique.
- Fixer les durées dans le contrat **et** la configuration : messages, transcriptions, WAV/S3, données chez les fournisseurs et sauvegardes. Une durée écrite ne prouve pas un effacement opérationnel.
- Tester information avant collecte, refus, retrait et canal humain de remplacement. Un prompt de consentement n'arrête pas l'enregistrement à lui seul.
- Vérifier les cookies/traceurs effectivement actifs et le régime applicable à chaque type. Aucun script marketing supplémentaire n'est autorisé par ce dossier.
- Vérifier le montage téléphonique France, le titulaire du numéro et les restrictions du fournisseur ; aucune sous-attribution/location d'un numéro n'est présumée permise.

## Points techniques connus au 14 octobre 2026

Les configurations GPT-Live dans `packages/agent-core/src/live/session.ts` définissent actuellement `store: true`. La salutation provient du snapshot de l'entreprise et est émise par le contrôleur d'appel. **La présence effective de l'annonce IA, le consentement lorsqu'il est choisi comme base de l'enregistrement, l'arrêt de collecte en cas de refus et l'effacement chez les fournisseurs doivent être vérifiés avant un pilote utilisant des données réelles.** L'essai vocal fonctionnel ne vaut pas preuve de ces contrôles.

Les sauvegardes, rôles et filtres de locataire doivent être rapprochés des preuves d'exploitation. Ces documents définissent la cible contractuelle ; ils ne certifient pas la production.

L'audit du code et des variables actuellement déployés confirme une rétention de contenu déjà active : un nouveau pilote géré, créé en mode cloud sans abonnement payant, relève du plan `free_cloud`, avec 30 jours pour les corps/messages multimédias, les transcriptions et les WAV. Le sweep horaire et les jobs de suppression S3 existent ; leurs tests ne constituent pas une preuve de purge réelle de production. Les expirations anciennes nulles ne sont pas rattrapées. Les résumés de conversations/sessions, contacts, rendez-vous et métadonnées restent hors de ce sweep : leurs durées et leur effacement doivent être définis et qualifiés avant des données réelles. Ne pas promettre que toutes les données disparaissent à 30 jours.

Le stockage GPT-Live `store: true` conserve une copie fournisseur pendant 30 jours ; aucun endpoint public de suppression anticipée de ces sessions n'est documenté. Supprimer un WAV S3 ne supprime pas cette copie. Les sept dernières générations chiffrées sont protégées, avec une grâce supérieure à sept jours pour les blobs devenus sans référence : la politique de sauvegarde ne constitue pas un délai global d'effacement de sept jours. Les copies manuelles privées n'ont pas d'expiration automatique. Aucun de ces constats n'autorise une purge supplémentaire.

## Sources officielles consultées

- [CNIL — qualification et contrats de sous-traitance](https://www.cnil.fr/fr/qualification-juridique-sous-traitance).
- [CNIL — guide du sous-traitant et clauses à adapter](https://www.cnil.fr/sites/default/files/atoms/files/rgpd-guide_sous-traitant-cnil.pdf).
- [CNIL — information, proportionnalité et enregistrement des appels](https://cnil.fr/fr/lecoute-et-lenregistrement-des-appels-sur-le-lieu-de-travail). Le cadre « travail » doit être adapté au contexte d'un accueil automatisé ; ne pas transposer ses durées comme une autorisation générale.
- [CNIL — droits des personnes](https://www.cnil.fr/fr/passer-laction/les-droits-des-personnes-sur-leurs-donnees).
- [CNIL — sauvegardes, sécurité et tests de reprise](https://www.cnil.fr/sites/cnil/files/2024-03/cnil_guide_securite_personnelle_2024.pdf).
- [CNIL — analyse d'impact des transferts](https://www.cnil.fr/fr/analyse-dimpact-des-transferts-des-donnees-la-cnil-publie-la-version-finale-de-son-guide-aitd).
- [Règlement IA (UE) 2024/1689, article 50](https://eur-lex.europa.eu/legal-content/FR/TXT/PDF/?uri=OJ%3AL_202401689).

Ces sources soutiennent les points de contrôle ; elles ne constituent pas une validation individuelle du produit.
