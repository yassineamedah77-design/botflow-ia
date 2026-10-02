# Plan d'implémentation de SOFIA

Chaque phase se termine par le même contrôle : lint, typecheck, tests unitaires et d'intégration, build de production, tests E2E du parcours concerné, documentation mise à jour. Une phase n'est livrée que si ce contrôle est vert.

## Phase 1 — Architecture, base de données, authentification, design system

**Livré dans cette phase.** Application `sofia-app/` autonome (Next.js 16.3, TypeScript strict, Tailwind 4, shadcn/ui). Schéma PostgreSQL complet en 32 tables avec Row-Level Security forcée et auto-appliquée. Authentification complète : inscription (création de l'établissement et du compte propriétaire), connexion, déconnexion, mot de passe oublié, réinitialisation, vérification d'email, gestion des sessions actives, changement de mot de passe. Rôles OWNER / ADMIN / STAFF avec matrice de permissions, invitations d'équipe, changement de rôle, retrait de membre. Rate limiting, audit log, event log, logger structuré, chiffrement des secrets d'intégration, CSP par requête. Design system (tokens, typographie, composants), shell applicatif avec la sidebar du cahier des charges, pages des modules futurs explicitement marquées comme non disponibles. Établissement de démonstration « Maison Éclat » (profil, prestations, horaires, FAQ, équipe). Docker, docker-compose, CI GitHub Actions, tests unitaires, d'intégration et E2E.

**Critère de fin.** Un nouvel établissement peut s'inscrire, inviter son équipe, se connecter, récupérer son mot de passe ; un établissement ne peut lire aucune donnée d'un autre, vérifié par des tests sur une vraie base PostgreSQL.

## Phase 2 — Dashboard, CRM, leads, inbox

Onboarding en 10 étapes avec checklist calculée depuis les vraies données. CRM : fiche lead complète, pipeline à 12 étapes en vue Kanban (glisser-déposer) et en vue tableau (tri, filtres, pagination côté serveur), notes, historique de statut, assignation. Inbox unifiée trois colonnes (conversations, fil actif, fiche client + actions), filtres canal / non lu / hot leads / RDV à venir / no-show / à relancer / humain requis, prise de main et restitution à SOFIA (`AI_ACTIVE` ↔ `HUMAN_ACTIVE`), réponse manuelle. Dashboard premium avec la carte « CA récupéré grâce à SOFIA ». Notifications in-app. Seed de démonstration complet (conversations, leads, rendez-vous, statistiques) pour un dashboard vivant.

## Phase 3 — AI Orchestrator et Knowledge Base

Knowledge Base CRUD : institut, prestations (prix, durée, préparation, contre-indications, FAQ), FAQ générales, promotions, praticiens, horaires et fermetures. Interface `LlmProvider` avec implémentations Anthropic et OpenAI et bascule automatique. Prompt dynamique en couches, outils typés et validés, classification d'intention (12 catégories + question médicale) et niveau d'intention, détection de langue (FR / PT-PT / EN) limitée aux langues autorisées par l'établissement, garde-fous (aucune invention, escalade médicale, anti-injection). Banc de test : jeu de conversations rejoué contre le vrai modèle avec mesure de la variance, en reprenant les scénarios du prototype `sofia/test-conversations.md`. Console « Tester SOFIA » dans l'interface.

**À préparer de ton côté :** une clé API Anthropic (et OpenAI en secours) sur un compte facturable.

## Phase 4 — Widget site web

Script `widget.js` intégrable en une ligne, iframe isolée, bouton flottant, interface premium, collecte nom / téléphone / email avec consentement, transfert vers WhatsApp. Clé publique par établissement, domaines autorisés, rate limiting par visiteur, protection anti-abus.

## Phase 5 — Adapter WhatsApp

WhatsApp Business Platform (Cloud API) officielle : connexion via Embedded Signup Meta, webhooks signés, idempotence, statuts d'envoi (envoyé, délivré, lu, échec), fenêtre de 24 heures, templates approuvés pour les relances, retries avec backoff, statut de canal visible et alerte admin en cas d'erreur. Mock complet pour les tests.

**À préparer de ton côté dès maintenant**, car les délais Meta se comptent en jours voire en semaines : un Meta Business Manager vérifié (justificatifs de l'entreprise), une app Meta de type Business, un numéro de téléphone dédié non utilisé dans l'application WhatsApp, et idéalement le statut de Tech Provider pour connecter les numéros de tes clientes.

## Phase 6 — Adapter Instagram

API Instagram Messaging officielle (compte professionnel relié à une page Facebook), webhooks signés, réponses automatiques, récupération du numéro WhatsApp en conversation, transfert humain. Même socle que WhatsApp, revue d'app Meta nécessaire pour les permissions de messagerie.

## Phase 7 — Rendez-vous

Agenda interne SOFIA (créneaux calculés à partir des horaires, durées, praticiens, fermetures et rendez-vous existants, sans double réservation), adapters Google Calendar et Calendly, création / annulation / déplacement par SOFIA et par l'équipe, confirmations et rappels, vue calendrier dans l'interface.

## Phase 8 — Automatisations, relances, no-show, réactivation

Moteur de jobs en base avec cron, lead recovery (délais configurables, 2 h / 24 h / 72 h par défaut), rappels 48 h / 24 h / quelques heures, flux no-show (statut, relance, nouvelle réservation), campagnes de réactivation (segment, délai d'inactivité 60 / 90 / 120 jours, message, canal, date d'envoi), respect strict du consentement et des politiques Meta (templates hors fenêtre de 24 heures, opt-out immédiat).

## Phase 9 — Analytics et revenus récupérés

Attribution du chiffre d'affaires (lead récupéré, rendez-vous généré, no-show récupéré, cliente réactivée) avec statut estimé / confirmé, tous les KPI du cahier des charges (leads entrants et qualifiés, RDV générés et confirmés, no-shows et récupérations, CA généré et récupéré, taux de conversion, temps de réponse moyen), graphiques (conversations par jour, leads par semaine, RDV, conversions, CA récupéré, performance par canal), comparaison de périodes.

## Phase 10 — Facturation, Super Admin, sécurité, production

Stripe (Checkout, portail client, webhooks, plans STARTER / GROWTH / PRO, accès aux fonctionnalités selon le plan, période d'essai). Espace Super Admin BotFlow. Export et effacement RGPD, purge automatique selon la durée de conservation, double authentification (TOTP), second rôle base de données pour les opérations système, revue de sécurité, tests de charge, monitoring (Sentry ou équivalent), sauvegardes, procédure de mise en production et runbook d'incident.
