# Mettre SOFIA en ligne sur Vercel

Ce guide déploie l'application `sofia-app/` sur Vercel avec une base PostgreSQL managée en Europe. Le site vitrine à la racine du dépôt reste un projet séparé : les deux se déploient indépendamment depuis le même dépôt GitHub.

## Le choix d'architecture

Les fonctions de l'application tournent à Francfort (`fra1`, fixé dans `vercel.json`), et la base doit être dans la même région : chaque page du dashboard fait plusieurs requêtes à la base, et quelques millisecondes d'écart par requête deviennent vite une seconde d'attente si l'application et la base sont sur deux continents. Francfort est aussi un bon point de départ pour des clientes en France et au Portugal, et garde les données dans l'Union européenne, ce que le RGPD et tes clientes attendront.

Pour la base, Neon (région AWS Francfort, `aws-eu-central-1`) est le choix le plus simple : PostgreSQL standard, sauvegardes automatiques, et des « branches » de base pour les prévisualisations. Supabase convient aussi ; si tu prends sa région de Paris (`eu-west-3`), remplace `fra1` par `cdg1` dans `vercel.json` pour garder l'application à côté de la base.

Une précaution importante : SOFIA est un outil commercial que tu factures à tes clientes, et le plan gratuit de Vercel (Hobby) est réservé à un usage non commercial. Il faut donc le plan Pro pour la production.

## 1. Créer la base

Crée un projet Neon en région Francfort. Neon fournit un rôle propriétaire du projet : ne l'utilise pas pour l'application, car il a des droits d'administration. Ouvre l'éditeur SQL de Neon et crée un rôle applicatif sans aucun privilège d'administration, puis une base qui lui appartient. C'est la condition pour que l'isolation entre établissements (Row-Level Security) s'applique réellement :

```sql
create role sofia_app login password 'un-mot-de-passe-long-et-aleatoire' nosuperuser nobypassrls nocreatedb nocreaterole;
create database sofia owner sofia_app;
```

Neon donne deux adresses pour cette base. L'adresse « poolée » (son nom d'hôte contient `-pooler`) passe par un répartiteur de connexions et convient aux fonctions de Vercel, qui ouvrent beaucoup de connexions courtes : c'est elle qui servira de `DATABASE_URL`, sous la forme `postgres://sofia_app:…@ep-xxx-pooler.eu-central-1.aws.neon.tech/sofia?sslmode=require`. L'adresse directe (sans `-pooler`) sert aux migrations. `/api/health` vérifie au démarrage que le rôle ne contourne pas l'isolation, et le signale sinon.

Utilise une base distincte par environnement : une pour la production, une (ou une branche Neon) pour les prévisualisations. Un déploiement de prévisualisation ne doit jamais pouvoir lire ni modifier les données de vrais instituts.

## 2. Créer le projet Vercel

Dans Vercel, importe le dépôt GitHub `botflow-ia`, puis indique `sofia-app` comme **Root Directory**. Vercel détecte Next.js tout seul ; la commande de build par défaut (`npm run build`) convient, le build ne demande aucune variable d'environnement.

Renseigne ensuite les variables d'environnement, séparément pour **Production** et **Preview** :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | L'adresse poolée du rôle `sofia_app` (la base de production pour Production, l'autre pour Preview) |
| `DATABASE_POOL_MAX` | `5` : chaque instance garde peu de connexions, le répartiteur de Neon fait le reste |
| `APP_URL` | `https://app.botflow-ia.fr` en production (l'adresse publique, en https) |
| `APP_ENV` | `production` pour Production, `staging` pour Preview |
| `ENCRYPTION_KEY` | Générée une fois avec `openssl rand -base64 32`, et sauvegardée hors de Vercel |
| `EMAIL_TRANSPORT` | `smtp` |
| `SMTP_URL` | L'URL SMTP du fournisseur d'emails (Brevo, Resend, Postmark…) |
| `EMAIL_FROM` | Par exemple `SOFIA <notifications@botflow-ia.fr>` |
| `SIGNUP_ENABLED` | `false` tant que tu crées toi-même les comptes de tes clientes, `true` pour l'inscription libre |
| `HEALTHCHECK_TOKEN` | Une valeur aléatoire, pour lire le détail de `/api/health` |

La liste complète, avec les valeurs par défaut, est dans `.env.example`. Une variable invalide est signalée dans les journaux de Vercel dès le démarrage, et l'application refuse alors de servir les pages plutôt que de fonctionner à moitié.

## 3. Créer les tables avant le premier trafic

Les migrations doivent tourner avant qu'une nouvelle version reçoive du trafic. Depuis ton poste, avec l'adresse directe de la base concernée :

```bash
cd sofia-app
DATABASE_URL="postgres://sofia_app:…@ep-xxx.eu-central-1.aws.neon.tech/sofia?sslmode=require" npm run db:migrate
```

La commande crée les tables, applique l'isolation entre établissements et refuse de se terminer si une table reste sans protection. Pour une démonstration commerciale, tu peux ensuite créer Maison Éclat dans une base à part avec `SEED_DEMO_PASSWORD=… npm run db:seed` ; ne le fais jamais dans la base de production de tes clientes.

Pour la suite, le plus sûr est d'automatiser : une étape de la CI GitHub lance `npm run db:migrate` sur la base de production au moment où la branche principale est fusionnée, puis Vercel déploie. Tant qu'une migration ne fait qu'ajouter des tables ou des colonnes, comme celles de la Phase 2, la version précédente continue de fonctionner pendant les quelques secondes de bascule ; une migration qui renomme ou supprime quelque chose se fait en deux déploiements.

## 4. Brancher le domaine

Dans le projet Vercel, ajoute le domaine `app.botflow-ia.fr`. Vercel indique l'enregistrement à créer chez ton registrar : un `CNAME` de `app` vers la cible fournie par Vercel. Le certificat https est créé et renouvelé automatiquement. Le site vitrine garde le domaine principal, l'application vit sur son sous-domaine.

## 5. Les emails

Les emails de mot de passe oublié, de vérification d'adresse et d'invitation partent du domaine de `EMAIL_FROM`. Déclare chez ton fournisseur d'emails un sous-domaine d'envoi dédié (par exemple `notifications.botflow-ia.fr`) et ajoute les enregistrements SPF, DKIM et DMARC qu'il te donne. Sans eux, ces emails arrivent en spam, et un email de réinitialisation qui n'arrive pas est une panne pour ta cliente.

## 6. Vérifier

Après le premier déploiement, ouvre `https://app.botflow-ia.fr/api/health` : la réponse doit être `{"status":"ok"}`. Avec l'en-tête `Authorization: Bearer <HEALTHCHECK_TOKEN>`, la réponse détaille la base, l'isolation et l'envoi d'emails. Branche ensuite cette adresse sur un moniteur de disponibilité (UptimeRobot, Better Stack…) pour être prévenu avant tes clientes.

## Ce qui viendra avec les phases suivantes

Les relances automatiques, rappels et campagnes (Phase 8) s'appuieront sur une tâche planifiée qui appelle l'application chaque minute ; elle se configurera avec les Cron Jobs de Vercel (ou n8n). Les webhooks de WhatsApp et d'Instagram (phases 5 et 6) demanderont l'adresse publique en https de l'application, que ce déploiement fournit déjà.
