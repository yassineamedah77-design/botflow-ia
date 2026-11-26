# Bilan de la Phase 5 — WhatsApp

La Phase 5 branche SOFIA sur WhatsApp, le canal que les clientes des instituts utilisent le plus. Un établissement connecte son numéro WhatsApp Business, et chaque message qu'une cliente y envoie arrive dans l'inbox. SOFIA répond sur WhatsApp avec le moteur et les garde-fous des phases 3 et 4, et l'équipe reprend la conversation quand il le faut. Tout passe par l'API officielle de Meta (la WhatsApp Business Platform, en version Cloud API) : aucune solution non officielle, qui ferait bannir le numéro.

## Ce qui est livré

**La connexion d'un numéro, vérifiée.** La page Canaux → WhatsApp demande trois valeurs copiées depuis le WhatsApp Manager de Meta : l'identifiant du numéro, celui du compte WhatsApp Business, et un jeton d'accès permanent. Ce jeton est une clé d'accès créée pour un « utilisateur système », un compte technique de l'entreprise chez Meta, qui n'expire pas. Avant d'afficher « Connecté », SOFIA vérifie auprès de Meta que le jeton est accepté, que le numéro existe et qu'il appartient bien à ce compte, puis abonne l'app de BotFlow aux messages de ce compte. Chaque refus est expliqué en clair : jeton expiré ou incomplet, numéro introuvable, autorisations manquantes. Le jeton est chiffré dans la base et ne s'affiche plus jamais. Un même numéro ne peut pas être connecté à deux établissements, et un établissement de démonstration ne peut pas être relié à un vrai numéro. La page affiche ensuite le numéro, le nom vu par les clientes et la note de qualité que Meta donne au numéro (elle baisse quand des clientes bloquent ou signalent des messages). La déconnexion efface le jeton et libère le numéro.

**Les messages des clientes.** Un premier message crée la fiche de la cliente (source WhatsApp, avec son numéro et le nom de son profil WhatsApp) et ouvre la conversation dans l'inbox. Si le numéro est déjà connu de l'établissement, par exemple importé de son fichier clients, la conversation rejoint la fiche existante sans écraser ce que l'équipe y a saisi. L'équipe est prévenue à chaque nouvelle conversation.

**Les réponses de SOFIA.** Quand SOFIA est active et que l'équipe n'a pas pris la main, elle répond sur WhatsApp. Les clientes écrivent souvent en plusieurs messages courts : SOFIA attend deux secondes et demie, puis répond une seule fois à l'ensemble, plutôt qu'à chaque morceau. Les messages vocaux, photos sans légende, documents et positions ne sont jamais envoyés à SOFIA, qui ne lit que du texte : ils apparaissent dans l'inbox (« Message vocal reçu ») et l'équipe est prévenue.

**Les statuts d'envoi.** Chaque message envoyé suit le parcours que Meta rapporte : envoyé, remis, lu. Un statut arrivé en retard ne fait jamais reculer un message (un « remis » reçu après un « lu » est ignoré). Si WhatsApp n'a pas pu remettre un message, il passe en échec avec la raison, la conversation est marquée « humain requis » et l'équipe est prévenue.

**La fenêtre de 24 heures.** WhatsApp n'autorise une réponse libre que dans les 24 heures qui suivent le dernier message de la cliente. L'inbox le respecte : au-delà, la réponse de l'équipe est refusée avec l'explication, avant même d'appeler Meta. L'envoi des modèles de messages approuvés par Meta, les seuls autorisés hors fenêtre, est prêt dans le code et servira aux relances de la Phase 8.

**L'équipe répond depuis l'inbox.** Comme pour le widget, l'équipe prend la conversation, répond, et la cliente reçoit la réponse sur WhatsApp depuis le numéro de l'établissement.

## Ce qui protège ce canal

| Protection | Comment |
|---|---|
| Messages authentiques | Chaque envoi de Meta est signé avec la clé secrète de l'app (`META_APP_SECRET`) ; une signature absente ou fausse est refusée avant de lire le contenu |
| Abonnement du webhook | Meta vérifie l'adresse avec un jeton que seuls toi et SOFIA connaissez (`WHATSAPP_WEBHOOK_VERIFY_TOKEN`) |
| Messages rejoués | Meta renvoie un message quand il n'est pas sûr de l'avoir livré : SOFIA le reconnaît à son identifiant et l'ignore |
| Isolation entre établissements | Un message est rattaché à l'établissement par le numéro qui l'a reçu ; tout le reste se fait dans l'espace protégé de cet établissement |
| Meta saturé ou indisponible | Deux nouvelles tentatives, après une demi-seconde puis une seconde et demie, puis abandon et alerte |
| Jeton refusé par Meta | Le canal passe en « Erreur », l'équipe est prévenue une seule fois, plus rien n'est envoyé jusqu'à la reconnexion |
| Coût du modèle | Au plus 1 000 réponses de SOFIA par jour et par établissement sur WhatsApp ; au-delà, l'équipe répond |
| Tentatives de connexion | Dix par heure et par établissement |

## Comment c'est vérifié

| Contrôle | Résultat |
|---|---|
| Lint et TypeScript strict | Aucune erreur |
| Tests unitaires | 164 réussis, dont 9 nouveaux : signature des envois de Meta, lecture des messages (texte, boutons, légendes, vocaux, positions), statuts et erreurs, contenus inconnus ignorés sans erreur, nouvelles tentatives et abandon, formulaire de connexion |
| Tests d'intégration sur PostgreSQL réel | 121 réussis, dont 12 nouveaux, contre un serveur Meta simulé : connexion refusée puis vérifiée, jeton chiffré, numéro déjà pris, vérification de l'abonnement, envois non signés refusés, fiche et conversation créées, message rejoué ignoré, cliente déjà connue, réponse de SOFIA envoyée puis lue, rafale de messages avec une seule réponse, vocal envoyé à l'équipe, échec de remise signalé, fenêtre de 24 heures, isolation entre établissements, jeton refusé puis déconnexion et reconnexion ailleurs |
| Tests de bout en bout sur le build de production | 25 réussis, dont la page WhatsApp (refus pour un établissement de démonstration) et la mise en route mise à jour |
| Revue visuelle | Page WhatsApp vérifiée sur ordinateur et sur mobile, sans défilement horizontal ni erreur dans la console du navigateur |

Les tests n'appellent jamais Meta : un faux serveur Graph, l'API de Meta par laquelle passe WhatsApp, rejoue ses réponses, y compris ses erreurs.

## Ce qui n'est volontairement pas encore là

La connexion par l'Embedded Signup de Meta, où la cliente connecte son numéro en trois clics sans manipuler de jeton, demande le statut de Tech Provider. Le formulaire actuel convient pour ton propre numéro et tes premières clientes, que tu peux accompagner. SOFIA n'affiche pas encore les médias reçus et ne transcrit pas les messages vocaux : c'est la première amélioration à prévoir, le vocal étant très courant, surtout au Portugal. L'écran d'envoi des modèles de messages arrive avec les relances de la Phase 8. Comme sur le widget, SOFIA ne propose pas de créneau avant l'agenda de la Phase 7.

## Ce que tu dois faire

Une fois pour toutes, dans ton app Meta (developers.facebook.com, app de type Business avec le produit WhatsApp) :

| Étape | Où | Ce que tu fais |
|---|---|---|
| 1 | Paramètres de l'app → Général | Copie la « Clé secrète de l'app » |
| 2 | Vercel, projet `sofia-saas`, Settings → Environment Variables, Production | Ajoute `META_APP_SECRET` (la clé de l'étape 1) et `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (une valeur longue et aléatoire, par exemple obtenue avec `openssl rand -hex 24`), en cochant « Sensitive », puis relance le dernier déploiement |
| 3 | App Meta → WhatsApp → Configuration → Webhook | URL de rappel `https://sofia.botflow-ia.fr/api/webhooks/whatsapp`, jeton de vérification identique à celui de Vercel, puis abonne le champ `messages` |
| 4 | Paramètres de l'entreprise Meta → Utilisateurs système | Crée un utilisateur système administrateur, donne-lui l'accès à ton compte WhatsApp Business, et génère un jeton sans expiration avec `whatsapp_business_messaging` et `whatsapp_business_management` |
| 5 | SOFIA → Canaux → WhatsApp | Colle l'identifiant du numéro, celui du compte et le jeton : le statut doit passer à « Connecté » |

Commence par ton propre numéro professionnel, avec SOFIA activée sur ton établissement, pendant une semaine, avant celui d'une cliente. Garde le jeton uniquement dans SOFIA : si tu dois le recopier, génère-en un nouveau plutôt que de le stocker ailleurs.
