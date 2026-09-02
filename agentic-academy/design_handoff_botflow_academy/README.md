# Handoff : BotFlow.IA Academy — Landing page (mise en ligne)

## Objectif
Mettre **en ligne** la landing page de *BotFlow.IA Academy* (programme freelance en automatisation IA / n8n / Claude Code). L'objectif de la page : convertir un visiteur en réservation d'**appel découverte de 30 min** (Calendly), puis vente de l'une des deux offres.

> **Domaine cible prévu** : `https://academy.botflow-ia.fr/` (présent dans les balises `<link rel="canonical">` et Open Graph). À confirmer / créer côté DNS.

## Nature des fichiers
`index.html` est un **site statique complet, autonome et prêt à déployer** — pas une simple maquette à reconstruire. C'est du HTML/CSS/JS vanilla, sans build, sans dépendance npm. Il peut être mis en ligne **tel quel** sur n'importe quel hébergement statique.

Si tu intègres plutôt cette page dans un codebase existant (Next.js, Astro, etc.), traite alors `index.html` comme **référence de design haute-fidélité** (couleurs, typo, espacements et interactions définitifs) et recrée-la avec les patterns du projet. Sinon, déploie-la directement.

## Pile technique
- **HTML / CSS / JS vanilla** — aucun framework, aucune étape de build.
- **Polices** : Google Fonts `Geist` (400–700) + `Instrument Serif` (italique), chargées via CDN `fonts.googleapis.com`.
- **Calendly** : widget popup chargé via CDN `assets.calendly.com` (`widget.css` + `widget.js`).
- **Aucun asset local** (pas d'images à héberger) — tout est en CDN ou dessiné en CSS/SVG inline.

## Déploiement — options (du plus simple au plus complet)

### Option A — Hébergement statique (recommandé)
Le repo ne contient qu'un `index.html`. Déploiement direct :

- **Netlify** : glisser-déposer le dossier, ou `netlify deploy --prod --dir=.`
- **Vercel** : `vercel --prod` (framework preset = *Other / static*).
- **Cloudflare Pages** : connecter le repo, build command vide, output dir = `/`.
- **GitHub Pages** : pousser sur `main`, activer Pages sur la racine.

Aucune commande de build n'est nécessaire (`build` = vide, `output` = racine).

### Option B — Domaine personnalisé
1. Pointer `academy.botflow-ia.fr` (enregistrement `CNAME` ou `A`) vers l'hébergeur choisi.
2. Activer le HTTPS automatique (Let's Encrypt sur Netlify/Vercel/Cloudflare).
3. Vérifier que l'URL canonique (`<link rel="canonical">`) correspond bien au domaine final.

## À faire / vérifier avant la mise en ligne (checklist)

1. ✅ **Page « Mentions légales »** — créée : `mentions-legales.html` (même charte que le site). Le footer pointe désormais vers `mentions-legales.html`. ⚠️ **Reste à compléter** par l'éditeur : identité légale (raison sociale, statut, SIRET/NIF, adresse), e-mail de contact et coordonnées de l'hébergeur — repérés par des badges « à compléter » dans la page.
2. ✅ **Lien Calendly** — confirmé. URL : `https://calendly.com/yass_automat-ia/new-meeting` (thème : fond `#0b0d0a`, texte `#f5f5f0`, accent `#7afca5`, + UTM `botflow-academy`). Événement **bien configuré sur 30 minutes**.
3. **Liens sociaux** (corrects au moment de la remise, à reconfirmer) :
   - Instagram : `https://www.instagram.com/yass.automat/`
   - LinkedIn : `https://www.linkedin.com/in/yassine-amedah-395143318`
4. ✅ **Métadonnées SEO / partage** — titre, description, Open Graph + Twitter Card renseignés. **Image `og:image` ajoutée** : `og-image.png` (1200×630, générée à partir du logo). ⚠️ L'URL absolue de l'image dans les balises est `https://academy.botflow-ia.fr/og-image.png` — à ajuster si le domaine final diffère.
5. ✅ **Favicon** — ajouté : `favicon.svg` (le logo réseau de la marque), référencé via `<link rel="icon">` + `apple-touch-icon`.
6. **Analytics** (optionnel) — aucun script de suivi présent ; ajouter Plausible/GA si souhaité (penser au bandeau cookies le cas échéant).

## Contenu / paramètres modifiables (points d'entrée dans `index.html`)
- **Couleurs** : variables CSS dans `:root` (`--bg`, `--fg`, `--accent: #7fe3a1`, `--accent-2: #7afca5`, …).
- **Lien Calendly** : constante `CAL` dans le `<script>` en bas de page (un seul endroit, réutilisé par tous les boutons `[data-cal]`).
- **Offres & prix** : section `#offres` — *Autonome* 490 € et *Coaching 1:1* 1 490 €, **paiement unique** uniquement.
- **Curriculum** : section `#curriculum` — **9 modules** (le n°09 « Mindset & posture de freelance »).
- **Section « Tout ce qui est inclus »** : schéma de workflow type n8n (déclencheur *Appel découverte 30 min* → systèmes inclus → *Garantie résultat*), tracé en SVG par JS (`buildWires()`).

## Comportements / interactions notables (présents dans le fichier, à préserver)
- Animations d'apparition au scroll (`IntersectionObserver`, classe `.reveal`).
- Fond ASCII animé (canvas) dans le hero et la section finale.
- Bille verte brillante qui suit le curseur (`.cursor-orb`, pointeurs fins uniquement).
- Marquee interactif, cartes magnétiques (tilt + reflet), terminal Claude Code auto-typé.
- Schéma workflow n8n recalculé au resize / chargement des polices.
- Respect de `prefers-reduced-motion` (animations désactivées) — **ne pas casser ce garde-fou**.
- Tout est **responsive** (breakpoints à 880px et 560px) ; le schéma workflow scrolle horizontalement sur mobile.

## Fichiers du bundle
- `index.html` — le site complet, prêt à déployer.
- `mentions-legales.html` — page mentions légales (identité de l'éditeur à compléter).
- `favicon.svg` — favicon (logo de la marque).
- `og-image.png` — image de partage social (1200×630).
- `README.md` — ce document.
