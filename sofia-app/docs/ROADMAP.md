# Plan d'implémentation de SOFIA

Chaque phase se termine par le même contrôle : lint, typecheck, tests unitaires et d'intégration, build de production, tests E2E du parcours concerné, documentation mise à jour. Une phase n'est livrée que si ce contrôle est vert.

## Phase 1 — Architecture, base de données, authentification, design system

**Livré dans cette phase.** Application `sofia-app/` autonome (Next.js 16.3, TypeScript strict, Tailwind 4, shadcn/ui). Schéma PostgreSQL complet en 32 tables avec Row-Level Security forcée et auto-appliquée. Authentification complète : inscription (création de l'établissement et du compte propriétaire), connexion, déconnexion, mot de passe oublié, réinitialisation, vérification d'email, gestion des sessions actives, changement de mot de passe. Rôles OWNER / ADMIN / STAFF avec matrice de permissions, invitations d'équipe, changement de rôle, retrait de membre. Rate limiting, audit log, event log, logger structuré, chiffrement des secrets d'intégration, CSP par requête. Design system (tokens, typographie, composants), shell applicatif avec la sidebar du cahier des charges, pages des modules futurs explicitement marquées comme non disponibles. Établissement de démonstration « Maison Éclat » (profil, prestations, horaires, FAQ, équipe). Docker, docker-compose, CI GitHub Actions, tests unitaires, d'intégration et E2E.

**Critère de fin.** Un nouvel établissement peut s'inscrire, inviter son équipe, se connecter, récupérer son mot de passe ; un établissement ne peut lire aucune donnée d'un autre, vérifié par des tests sur une vraie base PostgreSQL.

## Phase 2 — Dashboard, CRM, leads, inbox

**Livré dans cette phase** (bilan détaillé dans [`PHASE-2.md`](PHASE-2.md)). CRM : fiche lead complète, pipeline à 12 étapes en tableau (recherche, filtres, tri, pagination côté serveur) et en Kanban (glisser-déposer, alternative clavier), notes, historique des étapes, assignation, doublons refusés. Inbox unifiée en trois colonnes avec filtres, prise de main et restitution à SOFIA (`AI_ACTIVE` ↔ `HUMAN_ACTIVE`) et réponse manuelle. Notifications in-app. Dashboard avec la carte « CA récupéré grâce à SOFIA », les 12 indicateurs du cahier des charges comparés à la période précédente, l'entonnoir de conversion, la performance par canal et quatre graphiques d'évolution. Onboarding en 10 étapes, avec l'établissement, les prestations et les horaires modifiables dès maintenant et une checklist calculée depuis les vraies données. Démonstration vivante de trois mois pour Maison Éclat.

**Ajouté en cours de phase, à ta demande :** l'import du fichier clients de l'institut (CSV, correspondance des colonnes automatique, vérification avant import, fusion avec les contacts existants, déclaration sur l'origine des données) et la page Réactivation, qui sépare les clientes jamais revenues et les clientes perdues selon le délai d'inactivité, avec qui peut être contactée et par quel canal. L'envoi des campagnes reste en Phase 8, sur ces segments.

## Phase 3 — AI Orchestrator et Knowledge Base

**Livré dans cette phase** (bilan détaillé dans [`PHASE-3.md`](PHASE-3.md)). Knowledge Base complète : FAQ (générales et par prestation), promotions datées, praticiens, fermetures exceptionnelles, documents découpés en passages et recherchés en plein texte, référent pour les questions médicales. Interface `LlmProvider` avec l'implémentation Anthropic (Claude Opus 5.5) et bascule automatique sur un second modèle Claude en cas d'indisponibilité. Prompt dynamique en trois couches mises en cache, outil de recherche en lecture seule, réponse au format imposé et vérifié (message, langue, intention parmi 12 catégories plus question médicale, niveau d'intention, action unique). Détection de la langue limitée aux langues de l'établissement, PT-PT strict. Garde-fous dans le code : aucun prix, numéro, email ou lien inventé n'est envoyé, escalade médicale toujours appliquée, aucune instruction prise dans un message de cliente. Traitement des conversations réelles prêt pour les canaux, actions appliquées par le code (transmission, demande de rendez-vous, désinscription). Banc de test : quinze scénarios, dont les cinq du prototype, rejoués contre le vrai modèle avec mesure de la variance (`npm run ai:bench`). Console « Tester SOFIA » dans l'interface.

**Écart avec le plan :** OpenAI n'est pas implémenté comme secours. Deux modèles Claude partagent le même format de réponse et les mêmes outils, donc le comportement mesuré par le banc de test reste valable en secours. L'interface permet d'ajouter OpenAI plus tard.

**À préparer de ton côté :** une clé API Anthropic sur un compte facturable, pour activer les réponses et lancer le banc de test.

## Phase 4 — Widget site web

Script `widget.js` intégrable en une ligne, iframe isolée, bouton flottant, interface premium, collecte nom / téléphone / email avec consentement, transfert vers WhatsApp. Clé publique par établissement, domaines autorisés, rate limiting par visiteur, protection anti-abus. Premier canal branché sur l'AI Orchestrator de la Phase 3 (chaque message reçu obtient sa réponse vérifiée), et activation de SOFIA par établissement, avec mise en pause à tout moment.

## Phase 5 — Adapter WhatsApp

WhatsApp Business Platform (Cloud API) officielle : connexion via Embedded Signup Meta, webhooks signés, idempotence, statuts d'envoi (envoyé, délivré, lu, échec), fenêtre de 24 heures, templates approuvés pour les relances, retries avec backoff, statut de canal visible et alerte admin en cas d'erreur. Mock complet pour les tests.

**À préparer de ton côté dès maintenant**, car les délais Meta se comptent en jours voire en semaines : un Meta Business Manager vérifié (justificatifs de l'entreprise), une app Meta de type Business, un numéro de téléphone dédié non utilisé dans l'application WhatsApp, et idéalement le statut de Tech Provider pour connecter les numéros de tes clientes.

## Phase 6 — Adapter Instagram

API Instagram Messaging officielle (compte professionnel relié à une page Facebook), webhooks signés, réponses automatiques, récupération du numéro WhatsApp en conversation, transfert humain. Même socle que WhatsApp, revue d'app Meta nécessaire pour les permissions de messagerie.

## Phase 7 — Rendez-vous

Agenda interne SOFIA (créneaux calculés à partir des horaires, durées, praticiens, fermetures et rendez-vous existants, sans double réservation), adapters Google Calendar et Calendly, création / annulation / déplacement par SOFIA et par l'équipe, confirmations et rappels, vue calendrier dans l'interface.

## Phase 8 — Automatisations, relances, no-show, réactivation

Moteur de jobs en base avec cron, lead recovery (délais configurables, 2 h / 24 h / 72 h par défaut), rappels 48 h / 24 h / quelques heures, flux no-show (statut, relance, nouvelle réservation), campagnes de réactivation construites sur les segments de la Phase 2 (segment, délai d'inactivité, message, canal, date d'envoi, suivi des réponses et des réservations). Respect strict du consentement et des politiques Meta : WhatsApp uniquement avec l'accord explicite de la cliente et un modèle de message approuvé hors fenêtre de 24 heures ; email et SMS aux clientes existantes pour des prestations analogues, avec refus possible à chaque message (article L34-5 du CPCE en France, article 13.º-A de la loi 41/2004 au Portugal) ; « STOP » appliqué immédiatement.

**Canaux décidés :** les clientes sans accord WhatsApp sont relancées par email et par SMS, les deux envoyés par Brevo. Un seul compte couvre les emails de l'application, les campagnes email et les SMS en France et au Portugal, et les serveurs de Brevo sont tous dans l'Union européenne. Les campagnes partent d'un sous-domaine d'envoi distinct de celui des emails de l'application, pour qu'une campagne signalée comme indésirable n'empêche jamais un email de mot de passe d'arriver. En France, chaque SMS promotionnel porte une mention de désinscription (« STOP au 36XXX ») et part entre 8 h et 21 h 30, comme le fixe la charte Business Messaging de l'af2m en vigueur depuis le 1er mars 2026 (qui autorise désormais le dimanche et les jours fériés) ; un manquement coûte jusqu'à 750 € par message au titre du CPCE. Les règles portugaises seront vérifiées au même niveau de détail avant d'ouvrir ce pays.

## Phase 9 — Analytics et revenus récupérés

Les KPI, graphiques et la comparaison de périodes du cahier des charges sont livrés dans le dashboard dès la Phase 2. Cette phase ajoute la page Analytics : plages de dates libres, analyses par prestation, par praticienne et par source, suivi des cohortes de leads, export des chiffres, rapport mensuel prêt à envoyer à l'institut. L'attribution automatique du chiffre d'affaires à chaque réservation de SOFIA (lead récupéré, rendez-vous généré, no-show récupéré, cliente réactivée) s'écrit au fil des phases 3, 7 et 8, au moment où chaque réservation est faite.

## Phase 10 — Facturation, Super Admin, sécurité, production

Stripe (Checkout, portail client, webhooks, plans STARTER / GROWTH / PRO, accès aux fonctionnalités selon le plan, période d'essai). Espace Super Admin BotFlow. Export et effacement RGPD, purge automatique selon la durée de conservation, double authentification (TOTP), second rôle base de données pour les opérations système, revue de sécurité, tests de charge, monitoring (Sentry ou équivalent), sauvegardes, procédure de mise en production et runbook d'incident.
