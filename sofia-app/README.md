# SOFIA — AI Revenue Recovery & Booking System

SOFIA est l'assistante IA de BotFlow IA pour les instituts de beauté et cliniques esthétiques : elle répond aux demandes sur WhatsApp, Instagram et le site web, qualifie les leads, réserve les rendez-vous, relance, réduit les no-shows et mesure le chiffre d'affaires récupéré.

Ce dossier contient l'application SaaS multi-établissements. Elle est indépendante du site vitrine situé à la racine du dépôt (dépendances, configuration et déploiement séparés).

Deux phases sont livrées. La **Phase 1** pose l'architecture, la base de données avec isolation stricte entre établissements, l'authentification, les rôles, l'équipe et le design system ([`docs/PHASE-1.md`](docs/PHASE-1.md)). La **Phase 2** apporte le CRM et son pipeline, l'import du fichier clients et la réactivation des anciennes clientes, l'inbox unifiée avec prise de main, les notifications, le dashboard du chiffre d'affaires récupéré et l'onboarding en 10 étapes ([`docs/PHASE-2.md`](docs/PHASE-2.md)). L'architecture cible est dans [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), le plan des phases suivantes dans [`docs/ROADMAP.md`](docs/ROADMAP.md), la mise en ligne sur Vercel dans [`docs/VERCEL.md`](docs/VERCEL.md).

## Prérequis

Node.js 22 (20.9 minimum), npm, et PostgreSQL 16 (15 minimum). Si PostgreSQL n'est pas installé sur ta machine, Docker suffit : le fichier `docker-compose.yml` fournit PostgreSQL et Mailpit (une fausse boîte mail locale qui affiche les emails envoyés par l'application).

## Démarrage en local

```bash
cd sofia-app
npm install
npm run setup:env    # crée .env.local avec une clé de chiffrement générée
docker compose up -d # PostgreSQL + Mailpit (sauter si tu as ton propre PostgreSQL)
npm run db:migrate   # crée les 32 tables et applique l'isolation entre établissements
npm run db:seed      # crée « Maison Éclat », avec trois mois d'activité de démonstration
npm run dev
```

L'application tourne sur http://localhost:3000.

Avec ton propre PostgreSQL au lieu de Docker, renseigne `DATABASE_ADMIN_URL` dans `.env.local` (une connexion administrateur, par exemple l'utilisateur `postgres`) puis remplace `npm run db:migrate` par `npm run db:setup -- --with-test`. Ce script crée le rôle applicatif `sofia` sans privilège d'administration, les bases de développement, de test et de test de bout en bout, puis applique les migrations. Si le port 5432 est déjà utilisé par un PostgreSQL local, c'est cette seconde voie qu'il faut prendre.

En développement, les emails (vérification d'adresse, mot de passe oublié, invitations) sont affichés dans le terminal avec leurs liens. Pour les voir comme une vraie cliente, mets `EMAIL_TRANSPORT=smtp` et `SMTP_URL=smtp://localhost:1025` dans `.env.local`, puis ouvre Mailpit sur http://localhost:8025.

## Comptes de démonstration

| Rôle | Email | Ce qu'il voit |
|---|---|---|
| Propriétaire | `camille@maison-eclat.example` | Tout, y compris la facturation |
| Administrateur | `ines@maison-eclat.example` | Équipe, canaux, réglages, sans la facturation |
| Équipe | `lea@maison-eclat.example` | Le travail quotidien, sans la gestion de l'équipe ni les réglages |

Le mot de passe de développement est `Eclat-Demo-2026`. En production, le seed exige la variable `SEED_DEMO_PASSWORD` et n'utilise jamais ce mot de passe par défaut.

Maison Éclat est un établissement de démonstration : trois mois de leads, de conversations, de rendez-vous et de chiffre d'affaires attribué, plus un fichier de 260 clientes importé pour la page Réactivation. Tout y est fictif (numéros de la plage réservée à la fiction par l'ARCEP, emails en `example.com`), l'écran l'indique, et une réponse envoyée depuis l'inbox y est enregistrée sans partir nulle part. `npm run db:seed -- --reset` la recrée avec des dates recalées sur le jour même.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` puis `npm start` | Build et serveur de production |
| `npm run lint` | Analyse statique (ESLint) |
| `npm run typecheck` | Vérification des types TypeScript |
| `npm run test:unit` | Tests unitaires, sans base de données |
| `npm run test:integration` | Tests d'intégration sur un vrai PostgreSQL (`sofia_test`) |
| `npm run test:e2e` | Tests de bout en bout dans un navigateur, sur le build de production (`sofia_e2e`) |
| `npm run check` | Lint, types, tests unitaires et d'intégration en une commande |
| `npm run db:generate` | Génère une migration SQL après une modification du schéma |
| `npm run db:migrate` | Applique les migrations et vérifie l'isolation entre établissements |
| `npm run db:seed` | Crée Maison Éclat (`-- --reset` pour la recréer) |
| `npm run db:setup` | Crée le rôle et les bases avec un compte administrateur PostgreSQL |
| `npm run db:studio` | Explorateur visuel de la base (Drizzle Studio) |

## Tests

Les tests unitaires couvrent les permissions, la validation des formulaires, la lecture des fichiers clients, la cryptographie et les helpers. Les tests d'intégration tournent sur une vraie base PostgreSQL, avec le même rôle sans privilège que la production : c'est la seule façon de prouver que l'isolation entre établissements tient réellement. La base `sofia_test` est entièrement reconstruite à chaque lancement. Les tests de bout en bout pilotent un vrai navigateur sur le build de production : inscription et mise en route, vérification d'email, mot de passe oublié, invitation d'un membre, droits par rôle, CRM et Kanban, import d'un fichier clients, prise de main dans l'inbox, dashboard, notifications, en-têtes de sécurité et affichage mobile. Ils lisent les emails écrits sur disque pour suivre les vrais liens.

Avant le premier lancement des tests de bout en bout, installe le navigateur avec `npx playwright install chromium`. Les noms des bases de test peuvent être changés avec `TEST_DATABASE_URL` et `E2E_DATABASE_URL` ; par sécurité, seules les bases dont le nom finit par `_test` ou `_e2e` peuvent être effacées par les tests.

La CI GitHub (`.github/workflows/sofia-ci.yml` à la racine du dépôt) rejoue tout cela à chaque pull request qui touche `sofia-app/`, ainsi que le build de l'image Docker.

## Organisation du code

| Dossier | Contenu |
|---|---|
| `src/app` | Pages et actions serveur (App Router de Next.js) : `(auth)` pour les pages publiques, `(app)` pour l'application connectée, `onboarding` pour la mise en route, `api` pour la santé, l'import de fichiers et les notifications |
| `src/components` | Interface : composants de base (`ui`), shell, formulaires, écrans métier |
| `src/lib` | Code partagé client et serveur : rôles et permissions, validation, formatage |
| `src/server` | Code exclusivement serveur : base de données, authentification, services métier, emails, sécurité, journaux |
| `drizzle` | Migrations SQL versionnées |
| `scripts` | Migration, seed, création de la base, préparation des tests |
| `tests` | Tests unitaires, d'intégration et de bout en bout |
| `docs` | Audit, architecture, plan des phases, bilans des phases, graphiques, mise en ligne sur Vercel |

Trois règles structurent le code. Toute lecture ou écriture de données d'un établissement passe par `withTenant(organizationId, …)`, qui active l'isolation PostgreSQL (Row-Level Security) : une requête oubliée ou mal filtrée ne renvoie rien plutôt que les données d'un autre établissement. Les composants d'interface n'importent jamais `@/server/*`, et ESLint le vérifie. Enfin, aucune fonctionnalité n'est simulée : un module pas encore construit est affiché comme tel, et un canal non connecté apparaît comme non connecté.

Pour faire évoluer le schéma, modifie `src/server/db/schema`, lance `npm run db:generate`, relis le SQL produit dans `drizzle/`, puis `npm run db:migrate`. Toute nouvelle table qui porte une colonne `organization_id` reçoit automatiquement la politique d'isolation, et la migration refuse de se terminer si une table d'établissement reste sans protection.

## Déploiement

La configuration passe uniquement par des variables d'environnement, toutes documentées dans `.env.example`. Une configuration invalide est signalée dans les journaux dès le démarrage et l'application refuse alors de servir les pages. En production (`APP_ENV=production`), une URL en https et un envoi d'emails réel par SMTP sont obligatoires, parce qu'un mot de passe oublié ou une invitation qui n'arrive jamais est une panne. Avant chaque mise en production, `npm run db:migrate` (ou `node scripts/migrate.cjs` dans l'image Docker) doit tourner avant que la nouvelle version ne reçoive du trafic.

**Sur Vercel**, avec une base PostgreSQL managée en région européenne : le pas-à-pas complet (base Neon à Francfort, rôle sans privilège, variables, migrations, domaine, emails) est dans [`docs/VERCEL.md`](docs/VERCEL.md). `vercel.json` place les fonctions à Francfort, à côté de la base. Utilise une base distincte par environnement, pour qu'un déploiement de prévisualisation ne touche jamais aux données de production.

**Avec Docker**, sur n'importe quel serveur (Scaleway, OVH, Hetzner, Fly.io, Railway…), derrière un reverse proxy qui gère le https (Caddy, Traefik, nginx) :

```bash
docker build -t sofia sofia-app
docker run --rm --env-file .env.production sofia node scripts/migrate.cjs
docker run -d --restart unless-stopped -p 3000:3000 --env-file .env.production sofia
```

L'image tourne avec un utilisateur sans privilège, ne contient aucun secret et expose un healthcheck. Pour essayer la stack complète en local (PostgreSQL, Mailpit et l'image de production) :

```bash
cd sofia-app
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)" > .env   # clé stable entre deux redémarrages
docker compose --profile app up -d --build                 # http://localhost:3000
docker compose --profile app run --rm --no-deps app node scripts/seed.cjs
```

Avant d'ouvrir l'application à de vrais établissements, vérifie les points suivants. Le rôle PostgreSQL de l'application ne doit être ni superuser ni `BYPASSRLS`, sinon l'isolation ne s'applique pas ; `/api/health` le contrôle, et renvoie le détail avec l'en-tête `Authorization: Bearer $HEALTHCHECK_TOKEN`. La clé `ENCRYPTION_KEY` doit être générée une fois (`openssl rand -base64 32`) et sauvegardée hors du serveur, car la perdre rend illisibles les identifiants de canaux chiffrés. Les sauvegardes automatiques de la base doivent être activées. Enfin, le domaine d'envoi des emails doit avoir ses enregistrements SPF, DKIM et DMARC configurés chez le fournisseur SMTP (Brevo, Resend, Postmark, Amazon SES…) : sans eux, les emails de mot de passe et d'invitation finissent en spam. Si plusieurs instances tournent en parallèle hors Vercel, elles doivent partager la même `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`.

## Surveillance

`GET /api/health` répond 200 quand l'application peut servir des requêtes et 503 quand la base est inaccessible ; il convient à un moniteur de disponibilité (UptimeRobot, Better Stack…). Les journaux sont écrits en JSON sur la sortie standard, avec les mots de passe, jetons et cookies masqués automatiquement. Les actions sensibles (connexion, changement de rôle, invitation, retrait d'un membre…) sont tracées dans la table `audit_logs`.
