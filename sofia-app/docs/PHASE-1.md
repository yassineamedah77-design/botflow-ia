# Bilan de la Phase 1 — Architecture, base de données, authentification, design system

La Phase 1 pose la fondation sur laquelle les neuf phases suivantes vont construire. Elle ne contient encore aucune fonction d'IA ni aucun canal de messagerie, et l'application le dit clairement à l'écran : les modules à venir sont marqués « Bientôt », les canaux sont affichés « Non connecté » et le bouton de connexion est désactivé. Ce qui est livré fonctionne réellement, de bout en bout, sur une vraie base PostgreSQL.

## Ce qui est livré

**Une base de données complète et cloisonnée.** Les 32 tables de l'architecture cible existent dès maintenant (établissements, équipe, contexte métier, CRM, conversations, rendez-vous, automatisations, attribution du chiffre d'affaires, journaux), pour que chaque phase ajoute des fonctionnalités sans refaire les fondations. Chaque table qui appartient à un établissement est protégée par la Row-Level Security de PostgreSQL : c'est la base elle-même, et non le code de l'application, qui garantit qu'un établissement ne voit jamais les données d'un autre. Si une requête oublie de préciser l'établissement, elle ne renvoie rien au lieu de tout renvoyer. La migration refuse de se terminer si une table reste sans protection, et `/api/health` vérifie au démarrage que le rôle de connexion ne contourne pas ce mécanisme.

**Une authentification complète.** Inscription avec création de l'établissement et du compte propriétaire, connexion, déconnexion, mot de passe oublié, réinitialisation, vérification de l'adresse email, changement de mot de passe, liste des sessions actives avec déconnexion à distance. Les mots de passe sont hachés avec Argon2id (l'algorithme recommandé aujourd'hui). Les sessions et les liens envoyés par email ne sont jamais stockés en clair, et un lien ne sert qu'une fois. Les tentatives de connexion, d'inscription et de réinitialisation sont limitées par email et par adresse IP pour bloquer les attaques par force brute. Les liens reçus par email demandent un clic de confirmation, pour que les antivirus de messagerie qui ouvrent les liens automatiquement ne les consomment pas à la place de la cliente.

**Les rôles et l'équipe.** Trois rôles (Propriétaire, Administrateur, Équipe) avec une matrice de permissions vérifiée côté serveur à chaque action, quelle que soit l'interface. Invitation par email avec lien personnel valable 7 jours, renvoi et annulation d'invitation, acceptation par une personne qui a déjà un compte ou qui en crée un, changement de rôle, retrait d'un membre. Un établissement garde toujours au moins un propriétaire. Chaque action sensible est tracée dans le journal d'audit.

**La sécurité de la plateforme.** Content Security Policy avec un jeton unique par requête (elle bloque l'exécution de scripts injectés), protection contre l'intégration de l'application dans un autre site, HSTS, cookies `HttpOnly` et `SameSite`, redirections après connexion limitées à l'application, chiffrement AES-256-GCM prêt pour les identifiants des canaux, journaux JSON qui masquent automatiquement mots de passe, jetons et cookies.

**Le design system et le shell.** Palette noir profond, blanc cassé et beige avec un orange réservé à SOFIA, typographies Inter et DM Sans, composants accessibles (navigation au clavier, lecteurs d'écran, réduction des animations respectée). La sidebar suit le cahier des charges, avec la checklist de configuration sur le dashboard, la Knowledge Base en lecture sur les vraies données, les réglages de l'établissement, l'équipe, le compte et la facturation. Le tout fonctionne sur mobile avec un menu en tiroir, sans défilement horizontal.

**L'établissement de démonstration « Maison Éclat ».** Trois comptes (un par rôle), un profil complet, 11 prestations dont 2 « sur consultation », 3 praticiens, des horaires, des FAQ et une promotion. C'est la base des démonstrations commerciales et des tests.

**L'outillage de production.** Image Docker multi-étapes avec un utilisateur sans privilège et un healthcheck, `docker-compose.yml` (PostgreSQL, Mailpit et l'application), script de création de la base, CI GitHub Actions (lint, types, tests, build, tests de bout en bout, image Docker).

## Comment c'est vérifié

| Vérification | Résultat |
|---|---|
| Lint (ESLint) et types (TypeScript strict) | Aucune erreur |
| Tests unitaires | 48 tests : permissions, validation, cryptographie, helpers |
| Tests d'intégration sur PostgreSQL réel | 51 tests, dont 10 dédiés à l'isolation entre établissements (lecture, modification, suppression et insertion croisées refusées, aucune fuite de contexte d'une requête à l'autre) |
| Tests de bout en bout (navigateur, build de production) | 11 parcours : inscription jusqu'à la récupération du mot de passe, invitation et retrait d'un membre, droits par rôle, en-têtes de sécurité, mobile |
| Image Docker | Construite et lancée : migration, seed, connexion et dashboard dans le navigateur, healthcheck « healthy », emails reçus dans Mailpit |
| Build de production | Aucune variable d'environnement nécessaire au build, aucune erreur dans la console du navigateur |

## Ce qui n'est volontairement pas encore là

L'IA, les canaux WhatsApp, Instagram et le widget, l'inbox, le CRM, les rendez-vous, les relances, la réactivation et les analytics arrivent dans les phases 2 à 9, dans l'ordre de [`ROADMAP.md`](ROADMAP.md). La facturation affiche la formule de l'établissement mais le paiement en ligne (Stripe) arrive en Phase 10 ; d'ici là, la formule est gérée à la main par BotFlow IA. L'espace super admin (support, suspension d'un établissement) a sa permission et son champ en base mais pas encore d'écran. La double authentification, l'export et l'effacement des données d'un contact (droits RGPD) et le second rôle PostgreSQL réservé aux opérations système sont prévus en Phase 10.

## Points d'attention

L'audit des dépendances ne signale aucune vulnérabilité dans ce qui part en production. Il en signale 4 de gravité modérée dans les outils de développement : une ancienne version d'esbuild embarquée par drizzle-kit, dont la faille ne concerne que son serveur de développement, que le projet n'utilise pas. La CI n'a pas encore tourné sur GitHub : elle a été rejouée en local étape par étape (création de la base sur un PostgreSQL vierge, tests, build, image Docker), et sa première exécution réelle aura lieu sur la pull request.

## À préparer avant de vendre SOFIA

Ces points ne sont pas du code, mais ils conditionnent la mise en vente. Il faut des CGU et CGV spécifiques au SaaS, une politique de confidentialité, et surtout un accord de traitement des données (DPA, article 28 du RGPD) : SOFIA traite les données des clientes de tes clientes, ce qui fait de BotFlow IA un sous-traitant au sens du RGPD. Un avocat ou un modèle validé (CNIL, syndicat professionnel) est recommandé. Côté Meta, la vérification du Business Manager et l'obtention d'un numéro WhatsApp dédié prennent des jours, parfois des semaines : mieux vaut les lancer maintenant pour ne pas bloquer la Phase 5. Enfin, le site vitrine annonce des connexions avec Planity, Treatwell, Booksy ou Doctolib Pro, dont plusieurs n'ont pas d'API publique ouverte : tant qu'un accès partenaire n'est pas obtenu et l'intégration construite, il vaut mieux ne pas les promettre à un prospect.

## Suite

La Phase 2 rend l'application vivante : onboarding guidé en 10 étapes, CRM avec pipeline à 12 étapes (Kanban et tableau), inbox unifiée avec prise de main humaine, dashboard avec la carte « CA récupéré grâce à SOFIA » et données de démonstration complètes.
