# BotFlow.IA Academy — Landing page

Page de vente statique pour **BotFlow.IA Academy** (formation freelance en automatisation IA).

**Domaine cible** : `https://academy.botflow-ia.fr/`

## Fichiers

| Fichier | Description |
|---------|-------------|
| `index.html` | Site complet, autonome, deployable tel quel |
| `mentions-legales.html` | Mentions legales (auto-entrepreneur FR) |
| `favicon.svg` | Favicon SVG (logo reseau) |
| `og-image.png` | Image de partage social 1200x630 |

## Pile technique

- **HTML / CSS / JS vanilla** — aucun framework, aucun build
- **Google Fonts** : Geist (400-700) + Instrument Serif (italic)
- **Calendly** : widget popup via CDN `assets.calendly.com`
- Aucun asset local a heberger — tout est CDN ou inline SVG/CSS

## Deploiement

### Option 1 — Vercel (recommande)

```bash
cd agentic-academy
vercel --prod
```

Framework preset : **Other** (static). Build command : vide. Output directory : `.`

### Option 2 — Netlify

```bash
cd agentic-academy
netlify deploy --prod --dir=.
```

Ou glisser-deposer le dossier dans le dashboard Netlify.

### Option 3 — Cloudflare Pages

Connecter le repo, build command vide, output directory : `agentic-academy/`.

### Option 4 — GitHub Pages

Pousser sur `main`, activer Pages sur le dossier `agentic-academy/` (ou deplacer les fichiers a la racine d'un repo dedie).

## Configuration du domaine

1. **DNS** : Ajouter un enregistrement `CNAME` pour `academy` pointant vers l'hebergeur :
   - Vercel : `cname.vercel-dns.com`
   - Netlify : `<site-name>.netlify.app`
   - Cloudflare Pages : `<project>.pages.dev`
2. **HTTPS** : Automatique (Let's Encrypt) sur Vercel / Netlify / Cloudflare
3. **Verifier** que `academy.botflow-ia.fr` est ajoute comme domaine custom dans le dashboard de l'hebergeur

## Checklist avant mise en ligne

- [ ] **SIRET** : remplir dans `mentions-legales.html` (chercher `a completer`)
- [ ] **Adresse postale** : remplir dans `mentions-legales.html`
- [ ] **DNS** : creer l'enregistrement CNAME `academy.botflow-ia.fr`
- [ ] **Domaine custom** : ajouter dans le dashboard hebergeur + HTTPS actif
- [ ] **Calendly** : verifier que l'evenement `yass_automat-ia/new-meeting` est actif et configure sur 30 min
- [ ] **Liens sociaux** : confirmer Instagram (`@yass.automat`) et LinkedIn
- [ ] **og:image** : partager l'URL sur WhatsApp/Telegram pour verifier l'apercu
- [ ] **Analytics** (optionnel) : ajouter Plausible ou GA si souhaite (+ bandeau cookies si GA)

## Points d'entree pour modifications

- **Couleurs** : variables CSS `:root` dans `index.html` (`--bg`, `--accent`, etc.)
- **Lien Calendly** : constante `CAL` dans le `<script>` en bas de `index.html`
- **Offres & prix** : section `#offres` — Autonome 490 EUR / Coaching 1:1 1 490 EUR
- **Curriculum** : section `#curriculum` — 9 modules
- **Hebergeur mentions legales** : pre-rempli Vercel, a changer si autre choix
