import type { LegalDocument } from "./types"
export const reviewDrafts = {
  privacy: {
    en: {
      updated: "Review draft dated 15 October 2026",
      h1: "Privacy - draft",
      intro:
        "French-operator draft for Caléonis Receptionist, a trading brand of EI MrManiac. This review publishes no final commitment or subscription offer.",
      notice: "Source US/Canadian clauses are not adopted as French rules.",
      sections: [
        {
          id: "scope",
          nav: "Operator and scope",
          title: "1. Operator and scope",
          blocks: [
            "Caléonis Receptionist is a trading brand operated by the sole proprietorship MrManiac. This draft covers the website, accounts and phone-reception pilot; business particulars and final terms require review before commercial launch.",
          ],
        },
        {
          id: "roles",
          nav: "Roles and responsibilities",
          title: "2. Roles and responsibilities",
          blocks: [
            "The customer defines the purpose of its reception service, instructions and authorised people. Controller and processor roles, and the data-processing agreement, must be specified contractually for the processing actually enabled.",
          ],
        },
        {
          id: "collect",
          nav: "Data processed",
          title: "3. Data processed",
          blocks: [
            "Depending on enabled features: account details, business settings, contact details voluntarily provided by callers, call metadata, transcripts, summaries and appointments. A recording is retained only when enabled. Review screenshots use synthetic data.",
          ],
        },
        {
          id: "use",
          nav: "Purposes",
          title: "4. Purposes",
          blocks: [
            "Data supports authorised reception instructions, call history, requested appointment creation and review by authorised people. This preview does not activate advertising or outreach uses.",
          ],
        },
        {
          id: "legal-bases",
          nav: "Legal bases",
          title: "5. Legal bases",
          blocks: [
            "The operator must document a legal basis for each processing activity before real use. The customer must define caller information and recording conditions appropriate to its business. This draft does not assert universal consent or completed compliance.",
          ],
        },
        {
          id: "ai",
          nav: "Conversation processing",
          title: "6. Conversation processing",
          blocks: [
            "Configured telephony and AI services may process audio and conversations to produce responses, transcripts and summaries. Applicable providers, regions, retention and contractual safeguards must be established in the approved subprocessor list.",
          ],
        },
        {
          id: "google-oauth-calendar",
          nav: "Google Calendar",
          title: "7. Google Calendar",
          blocks: [
            "An authorised user voluntarily connects Google Calendar, selects a calendar and may revoke access in Google settings. Granted access supports availability and requested bookings. Verify initial bookings in the calendar; durable OAuth remains to be qualified.",
          ],
        },
        {
          id: "sms",
          nav: "SMS and Messages",
          title: "8. SMS and Messages",
          blocks: [
            "The French pilot number is Voice-only: incoming and outgoing SMS is unavailable. A Messages page, notification template or target quota does not create that capability. Later activation requires compatible capacity and separate validation.",
          ],
        },
        {
          id: "share",
          nav: "Access and subprocessors",
          title: "9. Access and subprocessors",
          blocks: [
            "Account and call data is intended for authorised users and providers necessary for the configured service. Technical categories include telephony, AI, hosting, PostgreSQL, private storage and transactional email when enabled. The provider list and agreements must be finalised.",
          ],
        },
        {
          id: "cookies",
          nav: "Cookies and analytics",
          title: "10. Cookies and analytics",
          blocks: [
            "Analytics is subject to the recorded cookie preference. Application login uses its own session mechanisms. Future single-domain routing must be tested before any production change.",
          ],
        },
        {
          id: "transfers",
          nav: "Data transfers",
          title: "11. Data transfers",
          blocks: [
            "No general promise of French or EU data residency is made. Configured providers’ destinations and transfer mechanisms require verification before activation and documentation in contractual terms.",
          ],
        },
        {
          id: "retention",
          nav: "Retention and backups",
          title: "12. Retention and backups",
          blocks: [
            "Call, message, log and backup retention must be set for the pilot and communicated before use. Source-plan retention values do not establish Caléonis retention commitments. Erasure requests must consider authorised access and documented backup cycles.",
          ],
        },
        {
          id: "security",
          nav: "Security measures",
          title: "13. Security measures",
          blocks: [
            "Application access is controlled and enabled recordings remain private. Operational backups and monitoring are present. This is not an HDS, HIPAA, ISO or SOC certification. Real workflows involving health data must not be enabled in this review.",
          ],
        },
        {
          id: "rights",
          nav: "Rights and requests",
          title: "14. Rights and requests",
          blocks: [
            "The contact channel and process for access, correction, erasure, restriction and objection requests must be confirmed in the final notice. Callers should identify the business called so a request can be handled appropriately without publishing recordings or secrets.",
          ],
        },
        {
          id: "canada",
          nav: "Source Canadian-text exception",
          title: "15. Source Canadian-text exception",
          blocks: [
            "Canada- and Quebec-specific source provisions are not adopted as French commitments. Any applicability requires a separate assessment of customers and processing.",
          ],
        },
        {
          id: "gdpr",
          nav: "European framework to finalise",
          title: "16. European framework to finalise",
          blocks: [
            "The final notice must specify responsibilities, legal bases, recipients, transfers, retention and rights procedures under the applicable European framework. Mentioning GDPR is not evidence of audited compliance.",
          ],
        },
        {
          id: "us-states",
          nav: "Source US-text exception",
          title: "17. Source US-text exception",
          blocks: [
            "State-specific US source rules are not presented as a French company’s policy. They remain a distinct historical reference without unverified rights or certification promises.",
          ],
        },
        {
          id: "callers",
          nav: "Caller information",
          title: "18. Caller information",
          blocks: [
            "The business using the receptionist must inform callers about AI and enabled processing, and provide suitable human follow-up. A booking alone does not establish acceptance of a service, price or emergency request.",
          ],
        },
      ],
    },
    fr: {
      updated: "Projet de revue au 15 octobre 2026",
      h1: "Confidentialité - projet",
      intro:
        "Projet français pour Caléonis Receptionist, marque commerciale de l’EI MrManiac. Aucun engagement définitif ni souscription n’est publié par cette revue.",
      notice:
        "Les clauses US/Canada du socle ne sont pas importées comme règles françaises.",
      sections: [
        {
          id: "scope",
          nav: "Éditeur et périmètre",
          title: "1. Éditeur et périmètre",
          blocks: [
            "Caléonis Receptionist est une marque commerciale exploitée par l’entreprise individuelle MrManiac. Le présent projet couvre le site, les comptes et le pilote de réception téléphonique ; les informations d’établissement et le texte définitif doivent être validés avant ouverture commerciale.",
          ],
        },
        {
          id: "roles",
          nav: "Rôles et responsabilités",
          title: "2. Rôles et responsabilités",
          blocks: [
            "L’entreprise cliente définit les finalités de son accueil, les consignes et les personnes autorisées. Les rôles de responsable de traitement et de sous-traitant, ainsi que l’accord de sous-traitance, doivent être précisés contractuellement selon les traitements réellement activés.",
          ],
        },
        {
          id: "collect",
          nav: "Données traitées",
          title: "3. Données traitées",
          blocks: [
            "Selon les fonctions activées : compte, paramètres de l’entreprise, coordonnées volontairement fournies par l’appelant, métadonnées d’appel, transcription, résumé et rendez-vous. Un enregistrement n’est conservé que lorsqu’il est activé. Les captures de cette revue utilisent des données synthétiques.",
          ],
        },
        {
          id: "use",
          nav: "Utilisations",
          title: "4. Utilisations",
          blocks: [
            "Les données servent à exécuter les consignes d’accueil autorisées, conserver le suivi d’un appel, créer un rendez-vous demandé et permettre la revue par les personnes habilitées. Aucun usage publicitaire ou de prospection n’est activé par cette prévisualisation.",
          ],
        },
        {
          id: "legal-bases",
          nav: "Bases légales",
          title: "5. Bases légales",
          blocks: [
            "L’exploitant doit documenter la base légale de chaque traitement avant le pilote réel. L’entreprise cliente reste tenue de définir l’information des appelants et les conditions de l’enregistrement selon son activité. Ce projet n’annonce pas un consentement universel ni une conformité acquise.",
          ],
        },
        {
          id: "ai",
          nav: "Traitement de la conversation",
          title: "6. Traitement de la conversation",
          blocks: [
            "Les services de téléphonie et d’IA configurés peuvent traiter l’audio et les échanges pour produire les réponses, la transcription et le résumé. Les fournisseurs, régions, durées de conservation et garanties contractuelles applicables doivent être établis dans la liste des sous-traitants validée.",
          ],
        },
        {
          id: "google-oauth-calendar",
          nav: "Google Calendar",
          title: "7. Google Calendar",
          blocks: [
            "L’utilisateur autorisé connecte volontairement Google Calendar, choisit l’agenda et peut retirer l’autorisation dans les paramètres Google. Le service utilise les accès accordés pour les disponibilités et les rendez-vous demandés. Vérifiez chaque première réservation dans l’agenda ; la durabilité OAuth reste à qualifier.",
          ],
        },
        {
          id: "sms",
          nav: "SMS et Messages",
          title: "8. SMS et Messages",
          blocks: [
            "Le numéro pilote français est Voice-only : aucun SMS entrant ou sortant n’est disponible. L’existence d’une page Messages, d’un modèle de notification ou d’un quota cible ne crée pas cette capacité. Toute activation ultérieure demande une capacité compatible et une validation distincte.",
          ],
        },
        {
          id: "share",
          nav: "Accès et sous-traitants",
          title: "9. Accès et sous-traitants",
          blocks: [
            "Les données du compte et des appels sont destinées aux utilisateurs autorisés et aux fournisseurs effectivement nécessaires au service configuré. Les catégories techniques incluent téléphonie, IA, hébergement, PostgreSQL, stockage privé et envoi transactionnel lorsqu’il est activé. La liste et les contrats doivent être finalisés.",
          ],
        },
        {
          id: "cookies",
          nav: "Cookies et mesure d’audience",
          title: "10. Cookies et mesure d’audience",
          blocks: [
            "Les fonctions de mesure sont conditionnées au choix enregistré dans les préférences cookies. La connexion de l’application utilise ses propres mécanismes de session. Le routage futur sous un domaine unique doit être testé avant toute modification en production.",
          ],
        },
        {
          id: "transfers",
          nav: "Transferts de données",
          title: "11. Transferts de données",
          blocks: [
            "Aucune promesse générale de résidence en France ou dans l’Union européenne n’est faite. Les destinations et mécanismes de transfert des fournisseurs configurés doivent être vérifiés avant activation et documentés dans les engagements contractuels.",
          ],
        },
        {
          id: "retention",
          nav: "Conservation et sauvegardes",
          title: "12. Conservation et sauvegardes",
          blocks: [
            "Les durées applicables aux appels, messages, journaux et sauvegardes doivent être fixées pour le pilote et communiquées avant usage. Les valeurs héritées de forfaits source ne valent pas engagement de conservation Caléonis. Une demande d’effacement doit tenir compte des accès autorisés et des cycles de sauvegarde documentés.",
          ],
        },
        {
          id: "security",
          nav: "Mesures de sécurité",
          title: "13. Mesures de sécurité",
          blocks: [
            "Les accès applicatifs sont contrôlés ; les enregistrements activés restent privés. Le service comprend sauvegardes et monitoring opérationnels. Ce constat ne constitue aucune certification HDS, HIPAA, ISO ou SOC. Aucun scénario réel comportant des données de santé ne doit être activé dans cette revue.",
          ],
        },
        {
          id: "rights",
          nav: "Droits et demandes",
          title: "14. Droits et demandes",
          blocks: [
            "Le canal de contact et le processus de traitement des demandes d’accès, rectification, effacement, limitation et opposition doivent être confirmés dans la notice définitive. Un appelant doit identifier l’entreprise appelée pour permettre le traitement approprié de sa demande, sans publier d’enregistrement ou de secret.",
          ],
        },
        {
          id: "canada",
          nav: "Exception au texte canadien source",
          title: "15. Exception au texte canadien source",
          blocks: [
            "Les dispositions spécifiques au Canada et au Québec du document source ne sont pas reprises comme engagements français. Leur applicabilité éventuelle exige une analyse distincte selon la clientèle et les traitements.",
          ],
        },
        {
          id: "gdpr",
          nav: "Cadre européen à finaliser",
          title: "16. Cadre européen à finaliser",
          blocks: [
            "La notice définitive doit préciser les responsabilités, bases légales, destinataires, transferts, durées et modalités d’exercice des droits au regard du cadre européen applicable. La mention du RGPD ne vaut pas preuve d’une conformité auditée.",
          ],
        },
        {
          id: "us-states",
          nav: "Exception au texte américain source",
          title: "17. Exception au texte américain source",
          blocks: [
            "Les règles spécifiques aux États américains du document source ne sont pas présentées comme la politique d’une entreprise française. Elles restent une référence historique distincte, sans promesse de droit ou certification non vérifiée.",
          ],
        },
        {
          id: "callers",
          nav: "Information des appelants",
          title: "18. Information des appelants",
          blocks: [
            "L’entreprise qui utilise le réceptionniste doit informer ses appelants de l’usage de l’IA et des traitements activés, et prévoir un suivi humain adapté. Une prise de rendez-vous ne constitue pas, seule, une acceptation de prestation, de prix ou d’urgence.",
          ],
        },
      ],
    },
  },
  terms: {
    en: {
      updated: "Review draft dated 15 October 2026",
      h1: "Pilot terms - draft",
      intro:
        "French-operator draft for Caléonis Receptionist, a trading brand of EI MrManiac. This review publishes no final commitment or subscription offer.",
      notice: "Source US/Canadian clauses are not adopted as French rules.",
      sections: [
        {
          id: "agreement",
          nav: "Draft status",
          title: "1. Draft status",
          blocks: [
            "This document prepares French pilot terms; it is not final sales terms or an offer available for purchase. Pilot conditions must be expressly agreed with EI MrManiac before activation.",
          ],
        },
        {
          id: "definitions",
          nav: "Service and operator",
          title: "2. Service and operator",
          blocks: [
            "Caléonis Receptionist is the trading brand of the service operated by EI MrManiac. The customer defines its reception workflow; authorised users review calls and settings in the private app.",
          ],
        },
        {
          id: "service",
          nav: "Pilot scope",
          title: "3. Pilot scope",
          blocks: [
            "The qualified pilot covers a real incoming phone conversation, transcript, summary, private playback of an enabled recording and a verified Google booking. Each additional capability requires configuration-specific qualification.",
          ],
        },
        {
          id: "accounts",
          nav: "Account access",
          title: "4. Account access",
          blocks: [
            "Application access and account opening remain subject to authorised pilot activation. Customers must restrict invitations and permissions to authorised people and protect credentials.",
          ],
        },
        {
          id: "ai",
          nav: "AI responses",
          title: "5. AI responses",
          blocks: [
            "Responses must follow business-approved information and instructions. Customers must test routine cases and limits, review results and arrange a human callback when a request cannot be confirmed.",
          ],
        },
        {
          id: "emergencies",
          nav: "Emergencies and health",
          title: "6. Emergencies and health",
          blocks: [
            "The receptionist does not replace emergency services or healthcare professionals. HDS qualification has not been established. Medical and dental pages describe fictional administrative demonstrations without real health data, diagnosis or clinical triage.",
          ],
        },
        {
          id: "recording",
          nav: "Calls and recordings",
          title: "7. Calls and recordings",
          blocks: [
            "Caller information and recording configuration must be defined before real calls. Enabled recordings are private; access and sharing are limited to authorised people.",
          ],
        },
        {
          id: "telephony",
          nav: "French telephony",
          title: "8. French telephony",
          blocks: [
            "Number allocation depends on provider rights, capabilities and regulatory requirements. The sole proprietor’s allocated Voice-only pilot number is not an offer to sublease numbers to other businesses. Forwarding, portability and human transfers require separate validation.",
          ],
        },
        {
          id: "sms",
          nav: "Messages and SMS",
          title: "9. Messages and SMS",
          blocks: [
            "The Messages inbox remains accessible with capability safeguards. The French pilot number cannot send or receive SMS; no SMS confirmation, alert or reminder is included in the active service merely because a target quota exists.",
          ],
        },
        {
          id: "acceptable-use",
          nav: "Permitted use",
          title: "10. Permitted use",
          blocks: [
            "Use must respect caller rights and agreed instructions. This preview does not authorise outreach, automatic outbound calls, real health-data processing or additional capacity purchases.",
          ],
        },
        {
          id: "third-party",
          nav: "Connected services",
          title: "11. Connected services",
          blocks: [
            "Google Calendar, telephony, AI, email and hosting depend on actually configured services. Users must have the necessary rights to connect them. An integration visible in code is insufficient to establish activation or contractual availability.",
          ],
        },
        {
          id: "billing",
          nav: "EUR catalogue and billing",
          title: "12. EUR catalogue and billing",
          blocks: [
            "The review catalogue retains source numbers: Free €0, Starter €30/month or €288/year, Pro €100/month or €960/year, Enterprise custom. VAT, tax-inclusive/exclusive status, charges, overages, margins and terms require approval. This review cannot activate a payment or subscription.",
          ],
        },
        {
          id: "affiliate-program",
          nav: "Affiliate scheme not activated",
          title: "13. Affiliate scheme not activated",
          blocks: [
            "The affiliate page preserves source structure for review. No scheme, commission, discount, affiliate account or referral payout is activated or promised by Caléonis before specific approval.",
          ],
        },
        {
          id: "data",
          nav: "Customer data",
          title: "14. Customer data",
          blocks: [
            "Customers must have necessary rights to supplied information and documents. Responsibilities, subprocessors, retention, export and deletion must be specified in final terms and the privacy draft.",
          ],
        },
        {
          id: "retention",
          nav: "Retention and end of pilot",
          title: "15. Retention and end of pilot",
          blocks: [
            "Applicable retention and data return or deletion procedures must be agreed before real use. Backup cycles must be considered; immediate erasure of every copy is not guaranteed here.",
          ],
        },
        {
          id: "feedback",
          nav: "Feedback and improvements",
          title: "16. Feedback and improvements",
          blocks: [
            "Pilot feedback supports service improvement. Public use of a testimonial, name, customer logo or numerical result requires verifiable facts and necessary rights; invented testimonials are not reproduced.",
          ],
        },
        {
          id: "open-source",
          nav: "License and trademarks",
          title: "17. License and trademarks",
          blocks: [
            "The LobbyStack software and documentation foundation uses the MIT license, whose copyright and text are retained. The license does not transfer third-party trademarks; Caléonis Receptionist has a distinct identity. Asset exceptions are documented in the notices.",
          ],
        },
        {
          id: "self-hosted",
          nav: "Self-hosting",
          title: "18. Self-hosting",
          blocks: [
            "Self-hosting guides describe the technical foundation; an independent installation’s operator selects and manages providers, access, backups and updates. Their presence is not a contracted Enterprise offer or compliance certification.",
          ],
        },
      ],
    },
    fr: {
      updated: "Projet de revue au 15 octobre 2026",
      h1: "Conditions du pilote - projet",
      intro:
        "Projet français pour Caléonis Receptionist, marque commerciale de l’EI MrManiac. Aucun engagement définitif ni souscription n’est publié par cette revue.",
      notice:
        "Les clauses US/Canada du socle ne sont pas importées comme règles françaises.",
      sections: [
        {
          id: "agreement",
          nav: "Statut du projet",
          title: "1. Statut du projet",
          blocks: [
            "Ce document prépare les conditions françaises du pilote ; il ne forme pas des CGV définitives ni une offre souscriptible. Les conditions du pilote doivent être convenues explicitement avec EI MrManiac avant activation.",
          ],
        },
        {
          id: "definitions",
          nav: "Service et exploitant",
          title: "2. Service et exploitant",
          blocks: [
            "Caléonis Receptionist désigne la marque commerciale du service exploité par EI MrManiac. L’entreprise cliente définit son accueil ; les utilisateurs autorisés consultent les appels et paramètres dans l’application privée.",
          ],
        },
        {
          id: "service",
          nav: "Périmètre du pilote",
          title: "3. Périmètre du pilote",
          blocks: [
            "Le pilote qualifié couvre une conversation téléphonique entrante réelle, la transcription, le résumé, la lecture privée d’un enregistrement activé et une réservation Google vérifiée. Chaque extension de capacité exige une qualification adaptée à la configuration concernée.",
          ],
        },
        {
          id: "accounts",
          nav: "Compte et accès",
          title: "4. Compte et accès",
          blocks: [
            "L’accès à l’application et l’ouverture d’un compte restent soumis à l’activation autorisée du pilote. Le client doit limiter les invitations et droits aux personnes habilitées et protéger ses identifiants.",
          ],
        },
        {
          id: "ai",
          nav: "Réponses de l’IA",
          title: "5. Réponses de l’IA",
          blocks: [
            "Les réponses doivent reposer sur les informations et consignes validées par l’entreprise. Le client doit tester les cas courants et les limites, relire les résultats et prévoir un rappel humain lorsque la demande ne peut être confirmée.",
          ],
        },
        {
          id: "emergencies",
          nav: "Urgences et santé",
          title: "6. Urgences et santé",
          blocks: [
            "Le réceptionniste ne remplace pas un service d’urgence ni un professionnel de santé. Aucune qualification HDS n’est établie. Les pages de cabinets médicaux et dentaires décrivent des démonstrations administratives fictives, sans données de santé réelles, diagnostic ou triage clinique.",
          ],
        },
        {
          id: "recording",
          nav: "Appels et enregistrements",
          title: "7. Appels et enregistrements",
          blocks: [
            "L’information de l’appelant et la configuration de l’enregistrement doivent être définies avant les appels réels. Les enregistrements activés sont privés ; leur accès et leur partage sont limités aux personnes autorisées.",
          ],
        },
        {
          id: "telephony",
          nav: "Téléphonie française",
          title: "8. Téléphonie française",
          blocks: [
            "L’attribution d’un numéro dépend des droits, capacités et exigences réglementaires du fournisseur. Le numéro pilote Voice-only attribué à l’EI ne constitue pas une offre de sous-location à d’autres entreprises. Renvoi, portabilité et transferts humains demandent une validation distincte.",
          ],
        },
        {
          id: "sms",
          nav: "Messages et SMS",
          title: "9. Messages et SMS",
          blocks: [
            "La boîte Messages reste accessible avec ses protections de capacité. Le numéro français pilote ne permet ni envoi ni réception de SMS ; aucune confirmation, alerte ou rappel SMS n’est inclus dans le service actif du seul fait d’un quota cible.",
          ],
        },
        {
          id: "acceptable-use",
          nav: "Usage autorisé",
          title: "10. Usage autorisé",
          blocks: [
            "L’usage doit respecter les droits des appelants et les consignes convenues. Cette prévisualisation n’autorise aucun démarchage, appel sortant automatique, traitement réel de données de santé ou achat de capacité supplémentaire.",
          ],
        },
        {
          id: "third-party",
          nav: "Services connectés",
          title: "11. Services connectés",
          blocks: [
            "Google Calendar, téléphonie, IA, e-mail et hébergement dépendent des services réellement configurés. L’utilisateur doit disposer des droits nécessaires pour les connecter. Une intégration visible dans le code ne suffit pas à établir son activation ou sa disponibilité contractuelle.",
          ],
        },
        {
          id: "billing",
          nav: "Catalogue EUR et facturation",
          title: "12. Catalogue EUR et facturation",
          blocks: [
            "Le catalogue de revue reprend les nombres source : Free 0 €, Starter 30 €/mois ou 288 €/an, Pro 100 €/mois ou 960 €/an, Enterprise sur mesure. TVA, HT/TTC, frais, dépassements, marges et conditions restent à valider. Aucun paiement ni abonnement ne peut être activé depuis cette revue.",
          ],
        },
        {
          id: "affiliate-program",
          nav: "Affiliation non activée",
          title: "13. Affiliation non activée",
          blocks: [
            "La page d’affiliation conserve la structure source à des fins de revue. Aucun programme, commission, remise, compte affilié ou paiement de parrainage n’est activé ni promis par Caléonis avant validation spécifique.",
          ],
        },
        {
          id: "data",
          nav: "Données du client",
          title: "14. Données du client",
          blocks: [
            "Le client doit détenir les droits nécessaires sur les informations et documents qu’il fournit. Les responsabilités, sous-traitants, conservation, export et suppression doivent être précisés dans les engagements définitifs et le projet de confidentialité.",
          ],
        },
        {
          id: "retention",
          nav: "Conservation et fin du pilote",
          title: "15. Conservation et fin du pilote",
          blocks: [
            "Les durées applicables et le processus de restitution ou suppression sont à convenir avant usage réel. Les cycles de sauvegarde doivent être pris en compte ; aucune garantie d’effacement immédiat de toutes copies n’est annoncée ici.",
          ],
        },
        {
          id: "feedback",
          nav: "Retours et améliorations",
          title: "16. Retours et améliorations",
          blocks: [
            "Les retours du pilote servent à corriger le service. Toute utilisation publique d’un témoignage, nom, logo client ou résultat chiffré exige des faits vérifiables et les droits nécessaires ; aucun témoignage inventé n’est repris.",
          ],
        },
        {
          id: "open-source",
          nav: "Licence et marques",
          title: "17. Licence et marques",
          blocks: [
            "Le socle logiciel et documentaire LobbyStack est sous licence MIT, dont le copyright et le texte sont conservés. Cette licence ne transfère pas les marques tierces ; Caléonis Receptionist possède une identité distincte. Les exceptions d’assets sont documentées dans les attributions.",
          ],
        },
        {
          id: "self-hosted",
          nav: "Auto-hébergement",
          title: "18. Auto-hébergement",
          blocks: [
            "Les guides d’auto-hébergement décrivent le socle technique ; l’opérateur d’une installation autonome choisit et administre ses fournisseurs, accès, sauvegardes et mises à jour. Leur présence ne constitue pas une offre Enterprise contractée ni une certification de conformité.",
          ],
        },
      ],
    },
  },
} satisfies Record<"privacy" | "terms", Record<"en" | "fr", LegalDocument>>
