# Mettre SOFIA en ligne sur Vercel

Ce guide déploie l'application `sofia-app/` sur Vercel avec une base PostgreSQL managée en Europe. Le site vitrine à la racine du dépôt reste un projet séparé : les deux se déploient indépendamment depuis le même dépôt GitHub.

## Le choix d'architecture

Les fonctions de l'application tournent à Francfort (`fra1`, fixé dans `vercel.json`), et la base doit être dans la même région : chaque page du dashboard fait plusieurs requêtes à la base, et quelques millisecondes d'écart par requête deviennent vite une seconde d'attente si l'application et la base sont sur deux continents. Francfort est aussi un bon point de départ pour des clientes en France et au Portugal, et garde les données dans l'Union européenne, ce que le RGPD et tes clientes attendront.

Pour la base, Neon (région AWS Francfort, `aws-eu-central-1`) est le choix le plus simple : PostgreSQL standard, sauvegardes automatiques et restauration de la base à un instant précis. Supabase convient aussi ; si tu prends sa région de Paris (`eu-west-3`), remplace `fra1` par `cdg1` dans `vercel.json` pour garder l'application à côté de la base.

Une précaution importante : SOFIA est un outil commercial que tu factures à tes clientes, et le plan gratuit de Vercel (Hobby) est réservé à un usage non commercial. Il faut donc le plan Pro pour la production.

## 1. Créer la base

Crée un projet Neon en région Francfort. Neon fournit un rôle propriétaire du projet : ne l'utilise pas pour l'application, car il a des droits d'administration. Ouvre l'éditeur SQL de Neon et crée un rôle applicatif sans aucun privilège d'administration, puis une base qui lui appartient. C'est la condition pour que l'isolation entre établissements (Row-Level Security) s'applique réellement. Exécute ces trois lignes une par une, car la création d'une base doit s'exécuter seule :

```sql
create role sofia_app login password 'le-mot-de-passe-genere' nosuperuser nobypassrls nocreatedb nocreaterole;
grant sofia_app to current_user;
create database sofia owner sofia_app;
```

La deuxième ligne autorise ton rôle d'administration à créer une base au nom de `sofia_app` : depuis PostgreSQL 16, sans elle, la troisième échoue avec l'erreur « must be able to SET ROLE ». Elle ne donne aucun droit supplémentaire à l'application. Pour le mot de passe, génère une suite de lettres et de chiffres avec `openssl rand -hex 32` : Neon refuse les mots de passe trop faibles, et un caractère comme `@` ou `/` casserait l'adresse de connexion.

Neon affiche deux adresses de connexion (bouton « Connect ») : garde leur nom d'hôte, et remplace le rôle, le mot de passe et la base par `sofia_app`, ton mot de passe et `sofia`. L'adresse « poolée » (son nom d'hôte contient `-pooler`) passe par un répartiteur de connexions et convient aux fonctions de Vercel, qui ouvrent beaucoup de connexions courtes : c'est elle qui servira de `DATABASE_URL`, sous la forme `postgres://sofia_app:…@ep-xxx-pooler.eu-central-1.aws.neon.tech/sofia?sslmode=require`. L'adresse directe (sans `-pooler`) sert aux migrations. `/api/health` vérifie au démarrage que le rôle ne contourne pas l'isolation, et le signale sinon.

Utilise une base et un rôle distincts par environnement : pour les prévisualisations, répète les trois lignes avec d'autres noms, par exemple `sofia_preview_app` et `sofia_preview`. Un déploiement de prévisualisation ne doit jamais pouvoir lire ni modifier les données de vrais instituts : avec son propre rôle, il n'a accès à aucune table de la base de production, même si son adresse de connexion était modifiée. Pour la même raison, ne lui donne pas une branche Neon de la base de production, qui en copierait les données.

## 2. Créer le projet Vercel

Dans Vercel, importe le dépôt GitHub `botflow-ia` dans un projet nommé `sofia-saas` (ton compte a déjà un projet `sofia-app`, l'ancien portail déployé à la main, qu'il ne faut pas écraser), puis indique `sofia-app` comme **Root Directory** et Node.js 22 dans les réglages du projet, la version de la CI. Vercel détecte Next.js tout seul. La commande de build est fixée par `vercel.json` : elle crée ou met à jour les tables (`npm run db:migrate`), puis construit l'application (étape 3). Les variables de base de données doivent donc être renseignées avant le premier déploiement.

Renseigne ensuite les variables d'environnement, séparément pour **Production** et **Preview** :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | L'adresse poolée : celle de `sofia_app` et `sofia` pour Production, celle du rôle et de la base de prévisualisation pour Preview |
| `DATABASE_MIGRATION_URL` | L'adresse directe (sans `-pooler`) du même rôle et de la même base, utilisée par les migrations au moment du build |
| `DATABASE_POOL_MAX` | `5` : chaque instance garde peu de connexions, le répartiteur de Neon fait le reste |
| `APP_URL` | `https://sofia.botflow-ia.fr` en production (l'adresse publique, en https) ; pour Preview, l'adresse de la branche (`https://sofia-saas-git-…vercel.app`) |
| `APP_ENV` | `production` pour Production, `staging` pour Preview |
| `ENCRYPTION_KEY` | Générée une fois avec `openssl rand -base64 32`, et sauvegardée hors de Vercel |
| `EMAIL_TRANSPORT` | `smtp` |
| `SMTP_URL` | L'URL SMTP de Brevo (voir l'étape 5) |
| `EMAIL_FROM` | Une adresse du sous-domaine d'envoi, par exemple `SOFIA <sofia@mail.botflow-ia.fr>` |
| `SIGNUP_ENABLED` | `true` au lancement : l'inscription est aujourd'hui le seul moyen de créer un établissement, le tien comme ceux de tes clientes. Avec `false`, seules les invitations dans un établissement existant restent possibles |
| `HEALTHCHECK_TOKEN` | Une valeur aléatoire, pour lire le détail de `/api/health` |

La liste complète, avec les valeurs par défaut, est dans `.env.example`. Une variable invalide est signalée dans les journaux de Vercel dès le démarrage, et l'application refuse alors de servir les pages plutôt que de fonctionner à moitié.

## 3. Les tables se créent à chaque déploiement

Les migrations doivent tourner avant qu'une nouvelle version reçoive du trafic, et c'est la commande de build de Vercel qui s'en charge : elle lance `npm run db:migrate` avec `DATABASE_MIGRATION_URL`, puis construit l'application. La commande crée les tables, applique l'isolation entre établissements et refuse de se terminer si une table reste sans protection. Si elle échoue, le déploiement échoue avec elle et la version en ligne continue de servir. Une prévisualisation migre sa propre base, la production la sienne.

Tant qu'une migration ne fait qu'ajouter des tables ou des colonnes, comme celles de la Phase 2, la version précédente continue de fonctionner pendant les quelques secondes de bascule ; une migration qui renomme ou supprime quelque chose se fait en deux déploiements. La même commande reste utilisable depuis un poste, avec l'adresse directe de la base concernée :

```bash
cd sofia-app
DATABASE_MIGRATION_URL="postgres://sofia_app:…@ep-xxx.eu-central-1.aws.neon.tech/sofia?sslmode=require" npm run db:migrate
```

Pour une démonstration commerciale, tu peux créer Maison Éclat dans une base à part avec `SEED_DEMO_PASSWORD=… npm run db:seed` ; ne le fais jamais dans la base de production de tes clientes.

## 4. Brancher le domaine

Dans le projet Vercel, ajoute le domaine `sofia.botflow-ia.fr`. Vercel indique l'enregistrement à créer chez Infomaniak, qui gère le DNS de `botflow-ia.fr` : un `CNAME` de `sofia` vers la cible fournie par Vercel. Le certificat https est créé et renouvelé automatiquement. Le site vitrine garde le domaine principal, `app.botflow-ia.fr` reste à l'ancien portail tant que SOFIA ne le remplace pas, et la plateforme vit sur son propre sous-domaine.

## 5. Les emails, avec Brevo

Les emails de mot de passe oublié, de vérification d'adresse et d'invitation partent de l'adresse `EMAIL_FROM`, par Brevo. Brevo est retenu pour SOFIA parce qu'un seul compte couvre les emails de l'application, puis les campagnes email et les SMS de relance de la Phase 8, en France comme au Portugal, et que ses serveurs sont tous dans l'Union européenne.

Dans Brevo, ajoute le sous-domaine d'envoi réservé à l'application, `mail.botflow-ia.fr`, dans « Expéditeurs, domaines et IP dédiées ». Brevo affiche alors les lignes DNS à créer chez Infomaniak, qui gère le DNS de `botflow-ia.fr` : un code de vérification (TXT), deux enregistrements DKIM (CNAME `brevo1._domainkey` et `brevo2._domainkey`) et un enregistrement DMARC (TXT `_dmarc`). Ces lignes prouvent à Gmail ou Outlook que l'email vient bien de toi ; sans elles, les emails arrivent en spam, et un email de réinitialisation qui n'arrive pas est une panne pour ta cliente.

Pour `SMTP_URL`, Brevo donne un identifiant SMTP et une clé SMTP (menu « SMTP & API », onglet SMTP) ; la clé SMTP n'est pas ton mot de passe Brevo. L'identifiant est une adresse email : son `@` s'écrit `%40` dans l'URL, qui prend la forme `smtp://identifiant%40smtp-brevo.com:CLE-SMTP@smtp-relay.brevo.com:587`.

Garde ce sous-domaine pour les emails de l'application uniquement. Les campagnes de réactivation de la Phase 8 partiront d'un autre sous-domaine du même compte Brevo, et la prospection commerciale à froid ne doit jamais partir de `botflow-ia.fr` : une campagne signalée comme indésirable abîmerait la réputation des emails dont tes clientes ont besoin.

## 6. Vérifier

Après le premier déploiement, ouvre `https://sofia.botflow-ia.fr/api/health` : la réponse doit être `{"status":"ok"}`. Avec l'en-tête `Authorization: Bearer <HEALTHCHECK_TOKEN>`, la réponse détaille la base, l'isolation et l'envoi d'emails. Branche ensuite cette adresse sur un moniteur de disponibilité (UptimeRobot, Better Stack…) pour être prévenu avant tes clientes.

## Ce qui viendra avec les phases suivantes

Les relances automatiques, rappels et campagnes (Phase 8) s'appuieront sur une tâche planifiée qui appelle l'application chaque minute ; elle se configurera avec les Cron Jobs de Vercel (ou n8n). Les webhooks de WhatsApp et d'Instagram (phases 5 et 6) demanderont l'adresse publique en https de l'application, que ce déploiement fournit déjà.
