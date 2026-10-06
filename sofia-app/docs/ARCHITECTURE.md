# Architecture cible de SOFIA

SOFIA est un **AI Revenue Recovery & Booking System** pour instituts de beauté et cliniques esthétiques. Ce document décrit l'architecture finale visée par la V1 commercialisable. Les phases de construction sont détaillées dans [ROADMAP.md](./ROADMAP.md).

## 1. Vue d'ensemble

```
                    ┌──────────────────────────────────────────────────────────┐
  WhatsApp Cloud ──▶│  /api/webhooks/whatsapp   (signature Meta vérifiée)      │
  Instagram DM  ───▶│  /api/webhooks/instagram  (signature Meta vérifiée)      │
  Widget site   ───▶│  /api/widget/*            (clé publique + rate limit)    │
                    └───────────────┬──────────────────────────────────────────┘
                                    ▼
                         Channel Adapter (normalise le message)
                                    ▼
                         Conversation Service (lead, conversation, idempotence)
                                    ▼
             ┌──────────── handling_mode = HUMAN_ACTIVE ? ──── oui ──▶ Inbox (humain)
             │ non
             ▼
   AI Orchestrator : intention → contexte client → knowledge → règles métier
             │        → appel LLM (provider-agnostic) → tool calling validé
             ▼
   Réponse → Channel Adapter → client          Événements → logs, notifications, CRM

  Tableau de bord Next.js (dashboard, inbox, CRM, KB, analytics, réglages)
  Jobs planifiés (relances, rappels, no-show, réactivation) déclenchés par cron
  PostgreSQL (multi-tenant, Row-Level Security) · Email (SMTP) · Stripe (Phase 10)
```

## 2. Stack retenue

| Couche | Choix | Raison |
|---|---|---|
| Framework | Next.js 16.3 (App Router, Turbopack), React 19.2, TypeScript strict | Stack du site vitrine, server components, server actions, un seul déploiement |
| UI | Tailwind CSS 4, shadcn/ui (base Radix), lucide-react, sonner | Composants accessibles, code possédé par le projet donc personnalisable |
| Base de données | PostgreSQL 16+ | Robuste, Row-Level Security native, JSONB, prêt pour pgvector (RAG) |
| ORM | Drizzle ORM 0.45 + drizzle-kit | Typé, sans moteur binaire (démarrage rapide en serverless), SQL lisible, migrations SQL versionnées |
| Driver | `pg` (node-postgres) avec pool | Standard, compatible PgBouncer / Neon / Supabase |
| Validation | Zod 4 | Validation des formulaires, des webhooks, des sorties d'outils IA |
| Auth | Sessions en base maison (modèle Lucia/Copenhagen Book), argon2id | Contrôle total, multi-tenant natif, aucune dépendance SaaS, testable |
| Email | Nodemailer (SMTP : Brevo, Resend, SES, Mailpit en local) | Un seul adaptateur pour tous les fournisseurs européens |
| Tests | Vitest (unitaires + intégration sur vrai PostgreSQL), Playwright (E2E) | Rapides, proches de la production |
| Infra | Docker (sortie `standalone`), docker-compose (PostgreSQL + Mailpit), Vercel compatible | Staging et production identiques, hébergement UE possible |

## 3. Organisation du code

```
sofia-app/
├── src/
│   ├── app/                    Routes Next.js : pages, server actions, route handlers
│   │   ├── (auth)/             login, signup, forgot/reset password, invitations, vérification email
│   │   ├── (app)/              application authentifiée (sidebar)
│   │   └── api/                health, webhooks (Phase 5-6), widget (Phase 4), cron (Phase 8)
│   ├── components/             ui/ (design system), app/ (shell), auth/, …
│   ├── lib/                    utilitaires partagés client/serveur (formatage, constantes)
│   ├── server/                 tout le backend, marqué `server-only`
│   │   ├── db/                 client, schéma Drizzle, contextes tenant/système
│   │   ├── auth/               mots de passe, sessions, jetons, permissions, DAL
│   │   ├── services/           logique métier par domaine (organisations, membres…)
│   │   ├── email/              transports + templates
│   │   ├── observability/      logger structuré, audit log, event log
│   │   ├── security/           rate limiting, chiffrement, contexte de requête
│   │   ├── ai/                 (Phase 3) orchestrateur, providers, outils, prompts
│   │   ├── channels/           (Phases 4-6) adapters website / WhatsApp / Instagram + mocks
│   │   ├── calendar/           (Phase 7) adapters agenda interne / Google / Calendly
│   │   └── jobs/               (Phase 8) file de jobs en base + workers
│   └── proxy.ts                CSP par requête + redirection optimiste vers /login
├── drizzle/                    migrations SQL (générées + RLS)
├── scripts/                    migrate, seed, db-setup, setup-env
├── tests/                      unit/, integration/, e2e/
└── docs/
```

Les règles de dépendance sont simples. Une page ou une server action ne fait que trois choses : valider l'entrée (Zod), obtenir le contexte d'autorisation (`requireTenant()` / `requirePermission()`), appeler un service. Un service reçoit un contexte tenant et une transaction, et ne lit jamais les cookies. Seul `server/` touche la base et les variables d'environnement. Un composant client ne peut pas importer `server/` (le package `server-only` fait échouer le build si cela arrive).

## 4. Multi-tenant et isolation des données

Chaque établissement est une `organization`. Toute table métier porte une colonne `organization_id`. L'isolation repose sur **deux barrières indépendantes**.

La première est applicative : chaque service filtre explicitement par `organization_id` et l'impose à l'insertion.

La seconde est dans PostgreSQL, avec la **Row-Level Security** (RLS : des règles que la base applique elle-même à chaque ligne lue ou écrite, même si le code oublie un filtre). Une fonction `app_ensure_tenant_rls()` active et *force* la RLS sur toute table qui possède une colonne `organization_id`, et y crée la policy `tenant_isolation`. Elle est rejouée automatiquement après chaque migration, donc une nouvelle table est protégée sans que personne n'ait à y penser, et un test d'intégration échoue si une table y échappe.

```sql
-- Policy appliquée à chaque table tenant
USING      ((SELECT app_bypass_rls()) OR organization_id = (SELECT app_current_org_id()))
WITH CHECK ((SELECT app_bypass_rls()) OR organization_id = (SELECT app_current_org_id()))
```

Le code accède à la base par deux portes seulement. `withTenant(orgId, fn)` ouvre une transaction et fixe `app.current_org_id` pour sa durée : toute requête n'y voit que les lignes de cet établissement. `withSystem(fn)` fixe `app.bypass_rls` pour les rares opérations transverses légitimes (authentification, routage des webhooks entrants, cron, super admin) ; chaque usage est volontaire et localisé. Une requête faite hors de ces deux portes ne voit **aucune** ligne tenant : le système échoue fermé.

Condition de production : le rôle PostgreSQL de l'application ne doit être ni superuser ni `BYPASSRLS`. L'endpoint `/api/health` et le démarrage du serveur vérifient ce point et le signalent en erreur s'il n'est pas respecté. Durcissement prévu en Phase 10 : un second rôle dédié aux opérations système, pour que la RLS résiste même à une injection SQL.

## 5. Modèle de données

Le schéma complet est créé dès la Phase 1 (32 tables), pour que chaque phase construise sur une fondation stable. Les migrations Drizzle le feront évoluer.

| Domaine | Tables | Rôle |
|---|---|---|
| Identité | `users`, `sessions`, `auth_tokens`, `rate_limit_buckets` | Comptes, sessions hashées, jetons de reset / vérification, rate limiting |
| Tenancy | `organizations`, `memberships`, `invitations` | Établissement, rôle de chaque membre, invitations d'équipe |
| Contexte SOFIA | `business_profiles`, `business_hours`, `business_closures`, `services`, `practitioners`, `practitioner_services`, `faqs`, `promotions`, `knowledge_documents` | Tout ce que SOFIA a le droit de dire. Un prix `NULL` signifie « non configuré » : SOFIA ne le donne pas |
| Canaux | `integrations` | Statut réel de WhatsApp, Instagram, widget, Google Calendar, Calendly ; identifiants chiffrés |
| CRM | `leads`, `lead_notes`, `lead_status_changes`, `consent_records` | Fiche contact, pipeline à 12 étapes, historique, preuves de consentement |
| Conversations | `conversations`, `messages` | Inbox unifiée, mode `AI_ACTIVE` / `HUMAN_ACTIVE`, idempotence des webhooks, fenêtre WhatsApp 24 h |
| Rendez-vous | `appointments` | Créneau, prestation, prix figé au moment de la réservation, statut no-show |
| Automatisations | `automations`, `followups`, `campaigns`, `campaign_recipients` | Délais configurables, relances planifiées, campagnes de réactivation |
| Revenus | `revenue_attributions` | `revenue_source`, `amount`, `attribution_type`, `attributed_at`, statut `ESTIMATED` / `CONFIRMED` |
| Observabilité | `audit_logs`, `event_logs`, `notifications` | Qui a fait quoi, événements techniques diagnostiquables, alertes équipe |

Conventions : identifiants UUID, montants en centimes entiers, dates `timestamptz`, enums PostgreSQL pour les états métier, colonnes en `snake_case`.

## 6. Authentification, sessions et rôles

La session est un jeton aléatoire de 256 bits stocké dans un cookie `httpOnly`, `secure`, `SameSite=Lax` (préfixe `__Host-` en production). La base ne stocke que son empreinte SHA-256 : une fuite de la table `sessions` ne permet pas d'usurper une session. Durée de 30 jours, prolongée à l'usage, révocable individuellement ou globalement (page « Mon compte »). Les mots de passe sont hashés en **argon2id** (paramètres OWASP).

Les protections intégrées couvrent le rate limiting en base (connexion, inscription, mot de passe oublié), un message d'erreur identique que l'email existe ou non, un temps de réponse égalisé, des jetons de reset à usage unique valables une heure avec révocation de toutes les sessions après changement de mot de passe, et des liens d'email qui exigent un clic de confirmation (les scanners anti-spam qui ouvrent les liens ne peuvent pas consommer un jeton).

| Permission | OWNER | ADMIN | STAFF |
|---|:-:|:-:|:-:|
| Inbox, leads, rendez-vous (lecture/écriture), prise de main d'une conversation | ✓ | ✓ | ✓ |
| Knowledge base (écriture), automatisations, campagnes, canaux, activation de SOFIA | ✓ | ✓ | — |
| Équipe (inviter, changer un rôle, retirer) | ✓ | ✓ (sauf propriétaires) | — |
| Export / effacement RGPD, journal d'audit | ✓ | ✓ | — |
| Facturation, suppression de l'établissement | ✓ | — | — |

La matrice vit dans `src/server/auth/permissions.ts`, testée unitairement. Le rôle plateforme `is_platform_admin` (équipe BotFlow) est distinct des rôles d'établissement et ouvre l'espace Super Admin (Phase 10).

## 7. Architecture IA

L'AI Orchestrator (Phase 3) suit le flux du cahier des charges : intention → contexte client → récupération de connaissances → règles métier → LLM → tool calling → réponse.

Le fournisseur de LLM est abstrait derrière une interface `LlmProvider` (`generate`, `classify`, support des outils). Les implémentations prévues sont Anthropic Claude et OpenAI, sélectionnées par variable d'environnement, avec bascule automatique sur le second en cas d'indisponibilité. Aucune clé n'est jamais exposée au navigateur.

Le prompt est assemblé dynamiquement par établissement, en couches : système (identité « SOFIA, l'assistante virtuelle de [Établissement] », ton, interdits), contexte business, contexte client, historique, connaissances, outils disponibles, règles métier. Les règles éprouvées du prototype `sofia/` sont reprises : ne jamais inventer prix, horaires, disponibilités ou promotions, escalade médicale prioritaire, réponse à la partie autorisée des messages mixtes, PT-PT strict, ne jamais dire « en tant qu'intelligence artificielle ».

Les actions passent exclusivement par des outils typés (`get_services`, `get_available_slots`, `create_appointment`, `handoff_to_human`…). Chaque appel est validé par un schéma Zod puis exécuté par le code avec les droits du tenant : le modèle propose, le code décide. C'est la défense principale contre l'injection de prompt, complétée par l'isolation du contenu client dans le prompt et le refus de toute instruction venant d'un message entrant.

Le RAG (recherche sémantique dans les documents) est préparé : la table `knowledge_documents` existe, les chunks et embeddings (pgvector) arriveront quand le volume de documents le justifiera.

## 8. Canaux

Chaque canal implémente la même interface `ChannelAdapter` : vérifier et parser un webhook entrant, envoyer un message, rapporter son statut. Un adaptateur *mock* existe pour chaque canal afin de tester toute la chaîne sans compte Meta.

WhatsApp utilise exclusivement la **WhatsApp Business Platform (Cloud API)** officielle de Meta, avec vérification de signature `X-Hub-Signature-256`, idempotence par identifiant de message, et respect de la fenêtre de 24 heures (au-delà, seuls des templates approuvés peuvent être envoyés). Instagram utilise l'API Messaging officielle de Meta avec les mêmes garanties. Le widget site est un script léger (`widget.js`) identifié par la clé publique unique de l'établissement (`organizations.widget_public_id`), qui ouvre une iframe servie par SOFIA.

Un canal n'est affiché `CONNECTED` que si la connexion a été réellement établie et vérifiée ; sinon l'interface affiche `NOT CONNECTED` et ce qui manque.

## 9. Rendez-vous

Un adaptateur `CalendarProvider` (agenda interne SOFIA, Google Calendar, Calendly, puis outils métiers si un accès partenaire est obtenu) expose `getAvailableSlots`, `createEvent`, `cancelEvent`. SOFIA ne propose que des créneaux renvoyés par l'adaptateur, jamais un créneau calculé de mémoire. Le prix de la prestation est figé dans le rendez-vous au moment de la réservation, ce qui fonde le calcul du chiffre d'affaires.

## 10. Automatisations et jobs

Les relances (lead recovery 2 h / 24 h / 72 h), rappels (48 h / 24 h / quelques heures), récupération des no-shows et campagnes de réactivation sont des lignes `followups` planifiées en base. Un endpoint `/api/cron/tick` protégé par secret, appelé chaque minute (Vercel Cron, n8n ou cron système), traite les lignes échues avec verrouillage `FOR UPDATE SKIP LOCKED`, tentatives limitées et backoff. Les délais sont configurables par établissement (`automations.config`). Aucun message marketing n'est envoyé à un contact sans consentement ou ayant demandé l'arrêt.

## 11. Chiffre d'affaires récupéré

Chaque rendez-vous attribuable à SOFIA crée une ligne `revenue_attributions` typée (`LEAD_RECOVERED`, `APPOINTMENT_GENERATED`, `NO_SHOW_RECOVERED`, `CLIENT_REACTIVATED`) avec sa source, son montant et sa date. Elle reste `ESTIMATED` tant que le rendez-vous n'a pas eu lieu, devient `CONFIRMED` quand il est honoré, `CANCELLED` sinon. Le dashboard sépare clairement le CA confirmé du CA estimé, et n'attribue rien quand le prix de la prestation n'est pas configuré. Une contrainte d'unicité empêche de compter deux fois le même rendez-vous.

## 12. Notifications

Les événements métier (nouveau lead, lead chaud, demande humaine, nouveau RDV, annulation, no-show, erreur d'intégration, campagne terminée) créent des notifications in-app par destinataire, et un email selon les préférences. L'architecture est extensible (push, Slack) via un dispatcher unique.

## 13. Observabilité et erreurs

Trois niveaux de traces coexistent. Le logger structuré JSON (stdout) masque automatiquement mots de passe, jetons et secrets. L'**audit log** en base trace qui a fait quoi (connexion, invitation, changement de rôle, export…), pour la sécurité et le RGPD. L'**event log** en base trace les événements techniques (`MESSAGE_RECEIVED`, `AI_RESPONSE`, `INTEGRATION_ERROR`…) avec niveau, durée et identifiant de corrélation, pour diagnostiquer un problème de bout en bout.

Aucune erreur silencieuse : un échec d'envoi WhatsApp, d'appel LLM ou de calendrier est loggué, retenté, rendu visible sur la conversation ou le canal concerné, et notifié aux administrateurs. `/api/health` expose l'état de la base, de la RLS et du transport email pour le monitoring.

## 14. Sécurité

En-têtes de sécurité stricts (HSTS, `nosniff`, `frame-ancestors 'none'`, Permissions-Policy) et Content-Security-Policy avec *nonce* par requête générée dans `proxy.ts`. Server actions protégées par la vérification d'origine de Next.js et par une ré-autorisation systématique dans chaque action. Rate limiting en base sur les points sensibles. Chiffrement AES-256-GCM des identifiants d'intégration (`ENCRYPTION_KEY`, format versionné pour la rotation). Vérification de signature de tous les webhooks. Secrets uniquement en variables d'environnement, validées au démarrage.

## 15. RGPD

Consentement marketing explicite par contact avec historique de preuve (`consent_records`), opt-out immédiat (mot-clé STOP), export et effacement des données d'un contact (Phase 10, permissions déjà définies), durée de conservation configurable par établissement (`lead_retention_days`, 3 ans par défaut, recommandation CNIL pour les prospects), audit log. SOFIA ne pose jamais de diagnostic : toute question médicale est transférée à un humain. Hébergement en Union européenne recommandé (Vercel région `fra1` / `cdg1`, base Neon ou Supabase en région UE).

## 16. Facturation

Plans `STARTER` (SOFIA Web), `GROWTH` (Web + WhatsApp + Instagram), `PRO` (tous les canaux + automatisations + réactivation + analytics), stockés sur l'organisation. L'intégration Stripe (Checkout, Customer Portal, webhooks) arrive en Phase 10 ; les fonctionnalités se brancheront sur le plan via un contrôle d'accès centralisé.

## 17. Super Admin

Espace séparé `/admin` réservé aux comptes `is_platform_admin` : organisations, utilisateurs, MRR, volumes de conversations et messages, erreurs, état des intégrations, consommation IA, désactivation de SOFIA par établissement, consultation des logs. Toute action est auditée.

## 18. Environnements

| Environnement | Base | Email | Usage |
|---|---|---|---|
| Local | PostgreSQL (docker-compose ou local) | Mailpit (SMTP local, interface sur :8025) ou console | Développement |
| Test / CI | PostgreSQL éphémère | Fichiers (`.mail-outbox/`) | Vitest, Playwright |
| Staging | Base dédiée UE | SMTP réel, domaine de test | Recette avant mise en production |
| Production | Base managée UE, rôle sans `BYPASSRLS` | SMTP réel, domaine authentifié (SPF, DKIM, DMARC) | Clients |

Toutes les variables sont documentées dans `.env.example` et validées par Zod au démarrage. L'image Docker utilise la sortie `standalone` de Next.js.
