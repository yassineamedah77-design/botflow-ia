# Audit technique du repository `botflow-ia`

Date : 2 octobre 2026 · Périmètre : branche `claude/tender-noether-8tr3kc` avant le démarrage de SOFIA.

## Ce que contient le repository

Le repository ne contient pas encore de SaaS. Il regroupe trois projets indépendants.

| Dossier | Nature | Stack | État |
|---|---|---|---|
| racine (`src/`, `public/`) | Site vitrine **botflow-ia.fr** : landing FR/PT/EN, 8 pages services SEO, blog, cas d'usage, pages légales, calculateur | Next.js 16.2.4, React 19.2.4, Tailwind CSS 4, framer-motion, three.js, cobe | En production sur Vercel (redirection apex → www, IndexNow après build). ~7 100 lignes TS/TSX, 34 routes statiques. |
| `agentic-academy/` | Landing statique BotFlow Academy + funnel de candidature | HTML/CSS/JS vanilla, fonctions serverless Vercel (`api/lead.js`, scoring vers Airtable), tests `node:test` | Projet Vercel séparé (`academy.botflow-ia.fr`). |
| `sofia/` | Prototype de SOFIA pour n8n | Prompt système (FR / PT-PT / EN), parser de marqueurs `[[BOOKING]]` `[[ESCALADE]]` `[[OPTOUT]]`, fixtures « Clínica Lumina », conversations de test | Matériau de conception, non exécuté dans ce repo. |

## Base de données, authentification, backend

Aucune base de données, aucun ORM, aucune authentification, aucun multi-tenant. Le seul backend est la route `/api/lead` du site vitrine, qui relaie un formulaire vers un webhook n8n (ou FormSubmit en secours), sans rate limiting et en journalisant le lead complet dans les logs Vercel (point RGPD à corriger côté vitrine : ne pas logguer les données personnelles en clair).

## Qualité et erreurs existantes

| Vérification | Résultat |
|---|---|
| `tsc --noEmit` (racine) | 0 erreur |
| `next build` (racine) | OK, 34 routes |
| `npm run lint` (racine) | **26 erreurs, 1 avertissement** : 16 × `react/no-unescaped-entities` (apostrophes dans le JSX), 7 × `no-require-imports` (les fichiers JS d'`agentic-academy/` et de `sofia/` sont lintés par la config racine), 3 × `react-hooks/purity` (`Math.random()` pendant le rendu dans `neural-orb.tsx`), 1 variable inutilisée |
| Tests | Aucun test pour le site vitrine. Tests unitaires présents pour l'academy uniquement |
| CI | Aucune (pas de `.github/workflows`) |
| Docker / `.env.example` | Absents |

Le `tsconfig.json` racine inclut `**/*.ts` : tout nouveau sous-projet serait typé avec la configuration du site vitrine et casserait son build. Il faut donc l'exclure explicitement, ce qui est fait en Phase 1 pour `sofia-app/`.

## Ce qui est réutilisable pour SOFIA

Le travail le plus précieux est dans `sofia/`. Le prompt système contient des règles métier solides (ne jamais inventer prix, horaires ou disponibilités ; escalade médicale prioritaire mais réponse à la partie autorisée des messages mixtes ; lexique PT-PT strict ; refus des tentatives d'injection) et le parser n8n applique la bonne philosophie de sécurité : le prompt demande, le code garantit. Ces règles seront portées dans l'AI Orchestrator en Phase 3, où le mécanisme de marqueurs texte sera remplacé par du *tool calling* (appel d'outils structurés, validés par schéma), plus fiable.

La landing décrit aussi le positionnement commercial (FR/PT, cliniques et instituts, WhatsApp/Instagram, no-show, réactivation) qui a servi de référence pour le vocabulaire de l'interface.

## Risques relevés

Le site vitrine annonce des connexions avec Planity, Treatwell, Zolmi, Booksy, Phorest et Doctolib Pro. Plusieurs de ces outils n'ont pas d'API publique ouverte. SOFIA appliquant la règle « pas de fausses fonctionnalités », il faudra soit obtenir des accès partenaires, soit aligner le discours commercial sur les intégrations réellement livrées (agenda SOFIA, Google Calendar, Calendly en V1).

## Décision structurante

SOFIA est développée comme une application autonome dans `sofia-app/`, avec son propre `package.json`, sa propre base de données et son propre projet Vercel (Root Directory = `sofia-app`). Le site vitrine reste intact : seules ses configurations TypeScript et ESLint excluent désormais `sofia-app/`, et son build a été revérifié.
