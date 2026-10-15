# Bilan de la Phase 4 — Widget site web et activation de SOFIA

La Phase 4 donne à SOFIA son premier canal. Un établissement colle une ligne de code sur son site, et ses visiteuses peuvent écrire à SOFIA depuis n'importe quelle page. SOFIA répond avec le moteur et les garde-fous de la Phase 3, l'équipe reprend la conversation depuis l'inbox quand il le faut, et la visiteuse peut laisser ses coordonnées ou continuer sur WhatsApp. L'établissement active SOFIA quand sa fiche est prête, et la met en pause à tout moment.

## Ce qui est livré

**L'installation en une ligne.** La page Canaux → Site web affiche le code à coller sur le site, avec un bouton de copie et la marche à suivre pour WordPress (extension WPCode), Wix, Webflow et Shopify (champ « code personnalisé » de pied de page). Le code ne contient que la clé publique de l'établissement (`sof_…`), qui n'ouvre l'accès à aucune donnée. Les réglages se font sur la même page : widget allumé ou éteint, domaines autorisés (dix au plus, sous-domaines compris, et l'adresse collée est nettoyée, `https://www.institut.fr/contact` devient `institut.fr`), couleur de l'établissement, position du bouton, message d'accueil, bouton WhatsApp, et lien vers la politique de confidentialité de l'établissement. La couleur du texte posée sur la couleur choisie est calculée pour rester lisible : c'est celle qui offre le meilleur contraste, au sens des règles d'accessibilité WCAG. Un aperçu montre le vrai widget dans SOFIA, avant toute installation.

**Un statut qui dit vrai.** Le canal passe à « Connecté » seulement quand le widget s'est réellement chargé sur un domaine autorisé, et la page indique lequel (« Installé sur institut-eclat.fr »). Retirer ce domaine ou éteindre le widget fait revenir le statut en arrière. Aucun canal n'est affiché comme branché sans l'avoir été.

**La fenêtre de conversation.** Un bouton flottant ouvre la conversation dans un panneau, en plein écran sur mobile. La conversation tourne dans une iframe (une page de SOFIA affichée à l'intérieur du site) isolée du site qui l'accueille : le site ne peut pas lire la conversation, et la conversation ne peut ni lire le site ni le faire changer de page. Elle parle la langue du navigateur de la visiteuse parmi celles de l'établissement (français, portugais du Portugal, anglais), sinon la langue principale de l'établissement. Elle affiche en permanence que les réponses viennent d'une assistante virtuelle, comme l'exige l'AI Act européen pour un agent conversationnel, et une mention de confidentialité avec le lien de l'établissement. Une visiteuse qui revient sur le site retrouve sa conversation, et une pastille signale une réponse arrivée pendant que le panneau était fermé.

**Les coordonnées et WhatsApp.** Quand l'équipe doit répondre (SOFIA a transmis, une demande de rendez-vous a été faite, ou SOFIA n'est pas active), la fenêtre propose de laisser un prénom, un nom et un téléphone ou un email : « l'équipe vous répond même si vous quittez le site ». L'accord pour recevoir des offres est une case séparée, facultative et jamais pré-cochée. Les coordonnées complètent la fiche du contact, ou rejoignent la fiche existante si ce téléphone ou cet email est déjà connu, et le consentement est enregistré avec sa preuve. Le bouton « Continuer sur WhatsApp » ouvre WhatsApp vers le numéro de l'établissement, avec un premier message qui porte la référence de la conversation (« réf. W-3F9A2C ») : l'équipe sait d'où vient la cliente.

**SOFIA répond, l'équipe reprend.** Chaque message passe par l'AI Orchestrator de la Phase 3, avec les mêmes garde-fous : aucun prix, numéro ou lien inventé, escalade médicale systématique. La réponse est calculée juste après la réception du message ; la fenêtre affiche « SOFIA écrit… » puis la réponse dès qu'elle est prête. Une première conversation crée un contact (source « Site web ») et prévient l'équipe, avec la page d'où la visiteuse écrivait. Dans l'inbox, l'équipe filtre les conversations du site, prend la main, répond, et la visiteuse lit la réponse dans le widget, signée « Équipe » et le nom de l'établissement. L'équipe rend ensuite la conversation à SOFIA d'un clic.

**L'activation de SOFIA.** Un nouvel onglet Réglages → SOFIA, aussi accessible depuis l'étape 10 de la mise en route et depuis le statut de SOFIA en bas de la barre latérale, liste ce qu'il faut avant qu'elle parle à une cliente : une fiche d'établissement complète, au moins une prestation avec son prix, des horaires, et le moteur d'IA configuré. Tant qu'un point manque, l'activation est refusée et la page dit quoi corriger. Seuls les propriétaires et administrateurs activent, mettent en pause ou reprennent SOFIA, et chaque changement est tracé. En pause ou avant activation, le widget fonctionne quand même : les messages arrivent dans l'inbox, l'accueil vient de l'équipe et la fenêtre demande les coordonnées pour que l'équipe puisse répondre.

## La protection contre les abus

Le widget est ouvert à tout internet, donc il est protégé comme une porte d'entrée publique. La conversation ne s'affiche que sur les domaines autorisés : le navigateur lui-même refuse de l'afficher ailleurs (en-tête `frame-ancestors` construit à partir de la liste des domaines), et le script ne montre rien tant que SOFIA n'a pas confirmé le domaine. Chaque visiteuse reçoit un jeton aléatoire conservé dans son navigateur ; la base n'en garde que l'empreinte, si bien que personne ne peut, même avec une copie de la base, se faire passer pour une visiteuse et reprendre sa conversation dans le widget. Les messages ne sont acceptés que depuis la fenêtre de conversation de SOFIA, et un champ invisible piège les robots qui remplissent tous les champs. Les limites ci-dessous comptent par adresse IP sans jamais la conserver en clair ; seul l'envoi de coordonnées est tracé dans le journal d'audit avec l'adresse IP et le navigateur, comme toute action sensible dans SOFIA.

| Limite | Valeur |
|---|---|
| Nouvelles conversations par adresse IP | 10 par heure |
| Messages par adresse IP | 60 par heure |
| Messages par conversation | 8 par minute |
| Envois de coordonnées par adresse IP | 10 par heure |
| Réponses de SOFIA par établissement | 1 000 par jour |

La dernière limite borne le coût d'une attaque sur la facture du modèle. Au-delà, SOFIA se tait pour la journée, l'équipe est prévenue sur chaque nouvelle conversation et répond elle-même. Un établissement suspendu n'affiche plus rien.

## Comment c'est vérifié

| Contrôle | Résultat |
|---|---|
| Lint et TypeScript strict | Aucune erreur |
| Tests unitaires | 152 réussis, dont 11 nouveaux : nettoyage et contrôle des domaines, en-tête `frame-ancestors`, réglages et formulaire de coordonnées, langue de la visiteuse, textes complets dans les trois langues (portugais du Portugal vérifié), contraste des couleurs, script `widget.js` |
| Tests d'intégration sur PostgreSQL réel | 101 réussis, dont 12 nouveaux : statut « Connecté » vérifié, conversation avec l'équipe puis avec SOFIA, une réponse à la fois, reprise par l'équipe, coordonnées et fusion avec un contact existant, robots et passage sur WhatsApp, isolation entre établissements, limites anti-abus, budget quotidien de SOFIA, établissement suspendu, activation et pause avec les droits de l'équipe |
| Tests de bout en bout sur le build de production | 25 réussis, dont 3 nouveaux : installation sur un vrai site tiers, conversation avec SOFIA puis avec l'équipe depuis l'inbox, refus sur un site non autorisé, aperçu ; plus l'affichage mobile des nouvelles pages et du widget en plein écran |
| Revue visuelle | Écrans vérifiés sur ordinateur et mobile, sans défilement horizontal ni erreur dans la console du navigateur |

Le test de bout en bout principal reproduit une vraie installation : un faux site d'institut, sur son propre domaine, charge `widget.js` exactement comme le code d'installation ; une visiteuse demande à parler à l'équipe, laisse ses coordonnées, l'équipe répond depuis l'inbox et la visiteuse lit la réponse dans le widget. Les réponses de SOFIA y sont préparées à l'avance : les tests automatiques n'appellent jamais le vrai modèle.

## Ce qui n'est volontairement pas encore là

SOFIA ne peut pas être activée en production tant que la clé API Anthropic n'est pas configurée : le contrôle « Moteur d'IA configuré » l'empêche, et c'est voulu. D'ici là, le widget fonctionne déjà avec l'équipe seule. La fenêtre vérifie l'arrivée des réponses à intervalles réguliers, plus souvent quand une réponse est attendue ; c'est simple et robuste au volume de lancement, et une connexion poussée (le serveur envoie la réponse dès qu'elle est prête) se justifiera avec plus de trafic. Une conversation est liée au navigateur : sur un autre appareil, la visiteuse en commence une nouvelle. Le widget n'envoie ni photo ni fichier, et ne s'ouvre jamais tout seul. SOFIA ne propose pas de créneau : elle recueille une demande que l'équipe confirme, jusqu'à l'agenda de la Phase 7.

## Ce que tu dois faire

Toujours la clé API Anthropic, sur un compte facturable. Dès que je l'ai, je l'ajoute à Vercel, je lance le banc de test, et tu peux activer SOFIA sur ton établissement et installer le widget sur un premier site. Tout ce qui reste à faire de ton côté et tout ce qui est à optimiser ou à ajouter au projet est rassemblé dans [`BACKLOG.md`](BACKLOG.md).
