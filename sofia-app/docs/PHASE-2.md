# Bilan de la Phase 2 — Dashboard, CRM, leads, inbox

La Phase 2 rend l'application vivante. Une équipe d'institut peut désormais suivre chaque contact dans un pipeline, importer son fichier clients pour préparer la relance des anciennes clientes, traiter ses conversations dans une inbox unique, être prévenue de ce qui compte, configurer son établissement et mesurer ce que SOFIA rapporte. SOFIA elle-même ne répond pas encore aux clientes : son moteur d'intelligence artificielle arrive en Phase 3, et les canaux WhatsApp, Instagram et site web en phases 4 à 6. L'application le dit à chaque endroit concerné, sans bouton factice.

## Ce qui est livré

**Le CRM.** Chaque contact a sa fiche : coordonnées, source, canal, prestation recherchée, valeur potentielle, consentement marketing avec son historique, notes de l'équipe, historique des étapes, conversations et rendez-vous avec le chiffre d'affaires attribué. Le pipeline suit les 12 étapes du cahier des charges, en tableau (recherche, filtres, tri, pagination côté serveur, pour rester rapide avec des milliers de contacts) ou en Kanban (glisser-déposer à la souris comme au doigt, avec un menu « Déplacer vers » pour le clavier). Les numéros sont enregistrés au format international : « 06 12 34 56 78 » et « +33 6 12 34 56 78 » sont reconnus comme le même contact, et un doublon est refusé avec le nom de la fiche existante. Seuls les propriétaires et administrateurs peuvent supprimer un contact.

**La relance des anciennes clientes à partir de leur fichier.** C'est la demande ajoutée en cours de route, et elle est en place côté données. L'institut exporte son fichier clients depuis son logiciel de caisse ou d'agenda et l'importe en quatre étapes : dépôt du fichier, correspondance des colonnes devinée automatiquement (intitulés français, portugais ou anglais), vérification avant import (lignes lues, contacts à créer, contacts existants à compléter, lignes écartées avec la raison), puis déclaration sur l'origine des données. Les fichiers Windows, les dates françaises comme « 03/02/2026 », les montants comme « 1 240,50 € » et les noms écrits « BERNARD Emma » sont compris. Une cliente déjà présente dans le CRM est complétée, jamais dupliquée. La page Réactivation sépare ensuite deux segments : les clientes **jamais revenues** (une seule visite) et les clientes **perdues** (plusieurs visites, puis plus rien), selon un délai d'inactivité de 60, 90, 120 ou 180 jours, avec ce que représente une visite de plus de chacune d'elles et, surtout, qui peut être contactée et comment. L'envoi des campagnes arrive en Phase 8, avec le moteur de relances : il s'appuiera directement sur ces segments.

**L'inbox unifiée.** Trois colonnes comme dans le cahier des charges : la liste des conversations (recherche, filtres non lues, humain requis, hot leads, rendez-vous à venir, no-show, à relancer, assignées à moi, et par canal), le fil de la conversation, et la fiche de la cliente avec ses rendez-vous, ses notes et les actions possibles. Un membre de l'équipe prend la main d'un clic : la conversation passe en mode humain, que SOFIA respectera dès qu'elle répondra (Phase 3), et on la lui rend d'un autre clic. Il faut avoir pris la main pour répondre, pour que SOFIA et l'équipe ne répondent jamais en même temps, et la fenêtre de 24 heures de WhatsApp est respectée. Dans l'établissement de démonstration, une réponse manuelle est enregistrée sans rien envoyer ; dans un vrai établissement, l'envoi attend la connexion du canal et l'écran l'indique.

**Les notifications.** Une cloche avec le nombre de notifications non lues, sur ordinateur et sur mobile : lead chaud, contact confié à un membre, import terminé. Les demandes d'intervention humaine et les nouveaux rendez-vous s'y ajouteront quand SOFIA répondra et réservera. Elle se met à jour toute seule chaque minute, et le nombre de conversations non lues s'affiche sur l'entrée Inbox du menu.

**Le dashboard.** Il répond d'abord à la question du cahier des charges, « combien d'argent SOFIA me fait-elle récupérer ? », avec la carte « CA récupéré grâce à SOFIA », son évolution et sa répartition entre rendez-vous générés, leads récupérés, no-shows récupérés et clientes réactivées. Suivent les 12 indicateurs demandés, chacun comparé à la période précédente de même longueur et accompagné de sa définition, l'entonnoir de conversion, la performance par canal et quatre graphiques d'évolution (conversations par jour, leads par semaine, rendez-vous par semaine, CA récupéré par mois). Les graphiques se lisent aussi au clavier et en tableau, et leurs couleurs ont été vérifiées pour les personnes daltoniennes ([`DATAVIZ.md`](DATAVIZ.md)).

**L'onboarding en 10 étapes.** Une nouvelle inscription arrive sur la mise en route au lieu d'un dashboard vide. L'établissement, les prestations (avec leurs vrais prix et durées) et les horaires se renseignent dès maintenant, et la Knowledge Base renvoie vers ces écrans pour les modifier. Le calendrier, WhatsApp, Instagram, le widget, le test et l'activation affichent ce qu'il faudra préparer et la phase où ils arrivent. La checklist se coche à partir de la configuration réelle, jamais à la main.

**Une démonstration vivante.** Maison Éclat a maintenant trois mois d'activité : environ 175 leads entrants, 200 conversations, 1 400 messages, 130 rendez-vous et 190 relances automatiques enregistrées, plus 260 clientes importées depuis un fichier et une campagne de réactivation. La croissance d'un mois sur l'autre reste crédible, pour qu'une démonstration commerciale ne ressemble pas à des chiffres inventés. Tout est fictif : les numéros viennent de la plage que l'ARCEP réserve à la fiction (06 39 98…), les emails sont en `example.com`, et l'écran affiche « Établissement de démonstration ».

## Les règles de calcul qui comptent pour toi

Le CA récupéré ne compte que les rendez-vous **honorés**, à la date où la cliente est venue. Un rendez-vous réservé mais pas encore honoré est affiché à part, comme montant « en attente ». Un rendez-vous n'est compté qu'une fois, sous sa raison la plus précise (un no-show récupéré n'est pas aussi compté comme rendez-vous généré). Une prestation sans prix renseigné ne produit aucun montant : SOFIA ne présente jamais comme revenu ce qui n'a pas été configuré ou confirmé, comme l'exige le cahier des charges.

Le taux de conversion d'une période se mesure à la fin de cette période. Sans cette règle, un mois en cours (dont les leads n'ont eu que quelques jours pour réserver) serait comparé à un mois terminé, et afficherait une baisse qui n'existe pas.

## Comment c'est vérifié

| Vérification | Résultat |
|---|---|
| Lint (ESLint) et types (TypeScript strict) | Aucune erreur |
| Tests unitaires | 62 tests, dont la lecture des fichiers clients (encodages, dates, montants, noms, doublons) |
| Tests d'intégration sur PostgreSQL réel | 74 tests. Nouveaux : CRM, import et segments de réactivation, notifications, inbox et prise de main, onboarding, et les 12 indicateurs du dashboard recalculés sur des faits écrits à la main (ce qui compte, ce qui ne compte pas). L'isolation entre établissements couvre les nouvelles tables |
| Tests de bout en bout (navigateur, build de production) | 18 parcours, dont 7 nouveaux : création d'un contact et doublon refusé, Kanban, import d'un fichier et réactivation, prise de main dans l'inbox, dashboard, notifications, mise en route |
| Revue visuelle | Chaque écran sur ordinateur et sur mobile, sans défilement horizontal ni erreur dans la console du navigateur |
| Build de production | Réussi, sans variable d'environnement nécessaire au build |

## Ce qui n'est volontairement pas encore là

SOFIA ne répond pas encore aux clientes (Phase 3), et aucun canal n'est connecté (phases 4 à 6). Pour un vrai établissement, les indicateurs liés aux conversations et aux réservations de SOFIA restent donc à zéro jusque-là ; l'import du fichier clients, le CRM et l'onboarding sont utiles dès aujourd'hui. Les rendez-vous se gèrent dans le module de la Phase 7, les relances automatiques et l'envoi des campagnes de réactivation en Phase 8. La FAQ, les promotions et les documents de la Knowledge Base arrivent avec l'IA en Phase 3. Les fichiers Excel (`.xlsx`) ne sont pas lus directement : l'écran d'import explique comment les enregistrer en CSV, ce que tous les logiciels de caisse et d'agenda savent faire. Le mode sombre n'existe pas encore.

## Points d'attention avant de relancer de vraies clientes

Relancer d'anciennes clientes est de la prospection commerciale, encadrée par la loi. Sur WhatsApp, Meta exige l'accord explicite de la personne et un modèle de message approuvé pour écrire hors d'une conversation en cours. Par email ou SMS, une cliente existante peut être relancée pour des prestations analogues à celles qu'elle a déjà achetées, à condition qu'elle ait pu refuser au moment de la collecte et qu'elle puisse refuser à chaque message : c'est l'article L34-5 du Code des postes et des communications électroniques en France, et l'article 13.º-A de la loi 41/2004 au Portugal. Une demande d'arrêt (« STOP ») est appliquée immédiatement et n'est jamais annulée par l'équipe. La page Réactivation sépare déjà ces cas.

L'institut reste responsable de son fichier clients au sens du RGPD, et BotFlow IA en est le sous-traitant : la déclaration demandée avant chaque import en garde la trace (qui, quand, quel fichier, quelle base légale), mais elle ne remplace pas l'accord de traitement des données (DPA) à signer avec chaque cliente, déjà signalé en Phase 1.

## Suite

La Phase 3 branche le moteur d'intelligence artificielle : SOFIA répond à partir de la Knowledge Base (enrichie de la FAQ et des documents), classe les intentions, détecte la langue, passe la main à l'équipe sur les questions médicales, et se teste dans une console avant d'être activée.
